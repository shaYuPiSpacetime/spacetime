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
    set({ loading: true });
    try {
      const res = await getRouters();
      set({ menuTree: (res as any).data ?? [] });
    } finally {
      set({ loading: false });
    }
  },
  clear: () => set({ menuTree: [] }),
}));
