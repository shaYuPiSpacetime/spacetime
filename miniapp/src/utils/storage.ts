import Taro from '@tarojs/taro'

/** 本地存储工具 */
export const storage = {
  get<T>(key: string): T | null {
    try {
      return Taro.getStorageSync(key) as T
    } catch {
      return null
    }
  },

  set(key: string, value: unknown): void {
    Taro.setStorageSync(key, value)
  },

  remove(key: string): void {
    Taro.removeStorageSync(key)
  },

  clear(): void {
    Taro.clearStorageSync()
  }
}
