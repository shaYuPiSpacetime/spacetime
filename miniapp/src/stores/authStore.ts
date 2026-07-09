import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { TOKEN_KEY, USER_INFO_KEY } from '@/constants/config'

interface AuthState {
  token: string
  userId: number | null
  nickname: string
  avatar: string
  openid: string
  phone: string
  maskedPhone: string
  isLoggedIn: boolean

  setLogin: (
    token: string,
    userId: number,
    nickname: string,
    avatar: string,
    extra?: { openid?: string; phone?: string; maskedPhone?: string }
  ) => void
  logout: () => void
  checkLogin: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: '',
  userId: null,
  nickname: '',
  avatar: '',
  openid: '',
  phone: '',
  maskedPhone: '',
  isLoggedIn: false,

  /** 保存登录信息 */
  setLogin: (token, userId, nickname, avatar, extra = {}) => {
    const userInfo = {
      userId,
      nickname,
      avatar,
      openid: extra.openid || '',
      phone: extra.phone || '',
      maskedPhone: extra.maskedPhone || '',
    }
    Taro.setStorageSync(TOKEN_KEY, token)
    Taro.setStorageSync(USER_INFO_KEY, userInfo)
    set({ token, ...userInfo, isLoggedIn: true })
  },

  /** 退出登录 */
  logout: () => {
    Taro.removeStorageSync(TOKEN_KEY)
    Taro.removeStorageSync(USER_INFO_KEY)
    set({ token: '', userId: null, nickname: '', avatar: '', openid: '', phone: '', maskedPhone: '', isLoggedIn: false })
  },

  /** 检查本地登录态 */
  checkLogin: () => {
    const token = Taro.getStorageSync(TOKEN_KEY) || ''
    if (token) {
      const userInfo = Taro.getStorageSync(USER_INFO_KEY)
      if (userInfo) {
        set({ token, ...userInfo, isLoggedIn: true })
      }
    }
  }
}))
