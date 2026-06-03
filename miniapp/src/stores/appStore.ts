import { create } from 'zustand'

interface AppState {
  /** 全局 loading */
  loading: boolean
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  loading: false,
  setLoading: (loading) => set({ loading })
}))
