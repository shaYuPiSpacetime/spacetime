import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import request from '@/api/request';

interface AuthState {
  token: string | null;
  user: { nickname: string; avatar?: string; permissions: string[] } | null;
  login: (account: string, password: string) => Promise<void>;
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
      logout: () => {
        set({ token: null, user: null });
        localStorage.removeItem('token');
        request.post('/admin/logout').catch(() => {});
      },
    }),
    { name: 'auth' }
  )
);
