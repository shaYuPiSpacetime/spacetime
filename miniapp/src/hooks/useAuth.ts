import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/authStore'
import { loginByWechatPhone } from '@/services/auth'

/**
 * 微信登录 hook
 * 封装 wx.login → 后端换 token → 写入 store 的完整流程
 */
export function useAuth() {
  const { isLoggedIn, setLogin, logout } = useAuthStore()

  /** 执行微信授权手机号登录 */
  const login = async (phoneCode: string): Promise<void> => {
    try {
      const { code: loginCode } = await Taro.login()
      const loginData = await loginByWechatPhone({ loginCode, phoneCode })
      setLogin(
        loginData.token,
        loginData.userId,
        loginData.nickname || '',
        loginData.avatar || '',
        {
          openid: loginData.openid,
          phone: loginData.phone,
          maskedPhone: loginData.maskedPhone,
        }
      )
    } catch {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    }
  }

  return { isLoggedIn, login, logout }
}
