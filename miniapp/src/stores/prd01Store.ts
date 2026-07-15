import { create } from 'zustand'
import { createCopyReader, createPrd01Loader } from '@/domain/prd01Runtime'
import { prd01Api } from '@/services/prd01'
import type {
  DictOption,
  Prd01Config,
  ProfileOptionKey,
  ProfileOptions,
  RegionOption,
} from '@/types/prd01'
import { getErrorMessage } from '@/utils/errorMessage'

const loader = createPrd01Loader(prd01Api)

interface Prd01State {
  config?: Prd01Config
  profileOptions?: ProfileOptions
  loading: boolean
  error?: string
  bootstrap: (force?: boolean) => Promise<void>
  retry: () => Promise<void>
  copy: (copyKey: string) => string
  options: (key: ProfileOptionKey) => DictOption[]
  optionLabel: (key: ProfileOptionKey, code?: string) => string
  locations: (parentCode?: string, force?: boolean) => Promise<RegionOption[]>
  clear: () => void
}

export const usePrd01Store = create<Prd01State>((set, get) => ({
  loading: false,
  copy: createCopyReader(),

  bootstrap: async (force = false) => {
    set({ loading: true, error: undefined })
    try {
      const snapshot = await loader.bootstrap(force)
      set({
        config: snapshot.config,
        profileOptions: snapshot.profileOptions,
        copy: createCopyReader(snapshot.config.copywriting),
        loading: false,
      })
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, '运行时配置加载失败，请稍后重试'),
      })
      throw error
    }
  },

  retry: () => get().bootstrap(true),

  options: key => {
    const rows = get().profileOptions?.[key]
    return Array.isArray(rows) ? rows : []
  },

  optionLabel: (key, code) => {
    if (!code) return ''
    return get().options(key).find(item => item.code === code)?.label || ''
  },

  locations: (parentCode, force = false) => loader.locations(parentCode, force),

  clear: () => {
    loader.clear()
    set({
      config: undefined,
      profileOptions: undefined,
      copy: createCopyReader(),
      loading: false,
      error: undefined,
    })
  },
}))
