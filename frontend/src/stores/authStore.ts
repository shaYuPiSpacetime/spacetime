import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import request, { setSessionExpiredHandler } from '@/api/request';
import { useMenuStore } from '@/stores/menuStore';

interface AuthState {
  token: string | null;
  user: { nickname: string; avatar?: string; permissions: string[] } | null;
  login: (account: string, password: string) => Promise<void>;
  refreshPermissions: () => Promise<void>;
  clearSession: () => void;
  logout: () => void;
}

/** 认证状态管理，使用 persist 持久化到 localStorage */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: async (account: string, password: string) => {
        const res = await request.post('/admin/login', { account, password });
        useMenuStore.getState().clear();
        localStorage.setItem('token', res.data.token);
        set({ token: res.data.token, user: res.data });
      },
      refreshPermissions: async () => {
        const token = get().token;
        if (!token) return;
        const res = await request.get('/admin/permissions', { headers: { 'X-Auth-Token': token } });
        const permissions = Array.isArray(res.data) ? res.data : [];
        // 旧会话的迟到响应不能覆盖重新登录后的权限。
        if (get().token === token && get().user) {
          set((state) => ({ user: { ...state.user!, permissions } }));
        }
      },
      clearSession: () => {
        set({ token: null, user: null });
        localStorage.removeItem('token');
        localStorage.removeItem('auth');
        useMenuStore.getState().clear();
      },
      logout: () => {
        const token = get().token;
        get().clearSession();
        if (token) {
          void request.post('/admin/logout', undefined, {
            headers: { 'X-Auth-Token': token },
          }).catch(() => {});
        }
      },
    }),
    {
      name: 'auth',
      merge: (persisted, current) => {
        const saved = persisted as Partial<AuthState> | undefined;
        // 修复旧版仅删除 token、遗留 auth 的状态，避免登录页再次跳回后台。
        if (typeof saved?.token === 'string' && saved.token
          && saved.token === localStorage.getItem('token') && saved.user) {
          return { ...current, token: saved.token, user: saved.user };
        }
        localStorage.removeItem('token');
        localStorage.removeItem('auth');
        return { ...current, token: null, user: null };
      },
    }
  )
);

setSessionExpiredHandler((expiredToken) => {
  const session = useAuthStore.getState();
  // 第一个 401 清理后其余请求自然忽略，也不会让旧请求误踢新会话。
  if (session.token === expiredToken) session.clearSession();
  // AuthGuard 订阅 token 后软跳转到登录页，无需刷新整个浏览器页面。
});
