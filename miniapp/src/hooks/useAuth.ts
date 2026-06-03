import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/authStore'
import { loginByCode } from '@/services/auth'

/**
 * 微信登录 hook
 * 封装 wx.login → 后端换 token → 写入 store 的完整流程
 */
export function useAuth() {
  const { isLoggedIn, setLogin, logout } = useAuthStore()

  /** 执行微信登录 */
  const login = async (): Promise<void> => {
    try {
      const { code } = await Taro.login()
      const loginData = await loginByCode(code)
      setLogin(loginData.token, loginData.userId, loginData.nickname, loginData.avatar)
    } catch {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    }
  }

  return { isLoggedIn, login, logout }
}
