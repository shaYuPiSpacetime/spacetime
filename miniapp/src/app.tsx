import { PropsWithChildren, useRef } from 'react'
import Taro, { useDidShow, useLaunch } from '@tarojs/taro'
import { useAuthStore } from './stores/authStore'
import { usePrd01Store } from './stores/prd01Store'
import { DEV_FIXED_LOGIN, MOCK_ENABLED, TOKEN_KEY } from './constants/config'

import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  const { setLogin, checkLogin } = useAuthStore()
  const bootstrapPrd01 = usePrd01Store(state => state.bootstrap)
  const loginRedirectingRef = useRef(false)

  useLaunch(() => {
    void bootstrapPrd01().catch(() => {
      // 登录页和资料页会展示动态配置加载失败状态并提供重试。
    })
    // 本地开发：注入固定登录态，跳过微信授权
    if (DEV_FIXED_LOGIN.enabled) {
      setLogin(
        DEV_FIXED_LOGIN.token,
        DEV_FIXED_LOGIN.userId,
        '',
        '',
        { phone: DEV_FIXED_LOGIN.phone, maskedPhone: DEV_FIXED_LOGIN.maskedPhone },
      )
      return
    }

    checkLogin()
  })

  useDidShow(() => {
    if (MOCK_ENABLED) return
    if (DEV_FIXED_LOGIN.enabled) {
      const token = Taro.getStorageSync(TOKEN_KEY)
      if (token !== DEV_FIXED_LOGIN.token) {
        setLogin(
          DEV_FIXED_LOGIN.token,
          DEV_FIXED_LOGIN.userId,
          '',
          '',
          { phone: DEV_FIXED_LOGIN.phone, maskedPhone: DEV_FIXED_LOGIN.maskedPhone },
        )
      }
      loginRedirectingRef.current = false
      return
    }
    const token = Taro.getStorageSync(TOKEN_KEY)
    if (token) {
      loginRedirectingRef.current = false
      checkLogin()
      return
    }

    const pages = Taro.getCurrentPages()
    const currentRoute = pages[pages.length - 1]?.route || ''
    if (currentRoute.startsWith('pages/login/')) return
    if (loginRedirectingRef.current) return

    loginRedirectingRef.current = true
    setTimeout(() => {
      Taro.reLaunch({ url: '/pages/login/index' }).catch(() => {
        loginRedirectingRef.current = false
      })
    }, 0)
  })

  return children
}

export default App
