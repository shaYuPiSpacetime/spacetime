import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/authStore'
import { loginByWechatPhone } from '@/services/auth'
import { usePrd01Store } from '@/stores/prd01Store'

/**
 * 微信登录 hook
 * 封装 wx.login → 后端换 token → 写入 store 的完整流程
 */
export function useAuth() {
  const { isLoggedIn, setLogin, logout } = useAuthStore()
  const copy = usePrd01Store(state => state.copy)

  /** 执行微信授权手机号登录 */
  const login = async (phoneCode: string, agreeProtocol: boolean): Promise<void> => {
    try {
      const { code: loginCode } = await Taro.login()
      const loginData = await loginByWechatPhone({ loginCode, phoneCode, agreeProtocol })
      setLogin(
        loginData.token,
        loginData.userId,
        loginData.nickname || '',
        loginData.avatar || '',
        {
          openid: loginData.openid,
          phone: loginData.phone,
          maskedPhone: loginData.maskedPhone,
          accessStatus: loginData.accessStatus,
        }
      )
    } catch (error) {
      const title = error instanceof Error ? error.message : copy('error_provider_unavailable')
      if (title) Taro.showToast({ title, icon: 'none' })
    }
  }

  return { isLoggedIn, login, logout }
}
