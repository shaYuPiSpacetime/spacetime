import { create } from 'zustand';
import { getRouters, type RouterVO } from '@/api/menu';

interface MenuState {
  menuTree: RouterVO[];
  loading: boolean;
  fetchRouters: () => Promise<void>;
  clear: () => void;
}

export const useMenuStore = create<MenuState>()((set) => ({
  menuTree: [],
  loading: false,
  fetchRouters: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    set({ loading: true });
    try {
      const res = await getRouters();
      if (localStorage.getItem('token') === token) {
        set({ menuTree: (res as any).data ?? [] });
      }
    } finally {
      if (localStorage.getItem('token') === token) set({ loading: false });
    }
  },
  clear: () => set({ menuTree: [], loading: false }),
}));
