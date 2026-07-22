import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import request from '@/api/request';

interface AuthState {
  token: string | null;
  user: { nickname: string; avatar?: string; permissions: string[] } | null;
  login: (account: string, password: string) => Promise<void>;
  refreshPermissions: () => Promise<void>;
  logout: () => void;
}

/** 认证状态管理，使用 persist 持久化到 localStorage */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (account: string, password: string) => {
        const res = await request.post('/admin/login', { account, password });
        set({ token: res.data.token, user: res.data });
        localStorage.setItem('token', res.data.token);
      },
      refreshPermissions: async () => {
        const res = await request.get('/admin/permissions');
        const permissions = Array.isArray(res.data) ? res.data : [];
        set((state) => state.user
          ? { user: { ...state.user, permissions } }
          : {});
      },
      logout: () => {
        const token = localStorage.getItem('token');
        const logoutRequest = request.post('/admin/logout', undefined, {
          headers: token ? { 'X-Auth-Token': token } : undefined,
        });
        set({ token: null, user: null });
        localStorage.removeItem('token');
        logoutRequest.catch(() => {});
      },
    }),
    { name: 'auth' }
  )
);
