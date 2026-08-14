import { PropsWithChildren, useRef } from 'react'
import Taro, { useDidHide, useDidShow, useLaunch } from '@tarojs/taro'
import { useAuthStore } from './stores/authStore'
import { usePrd01Store } from './stores/prd01Store'
import { DEV_FIXED_LOGIN, MOCK_ENABLED, TOKEN_KEY, USER_INFO_KEY } from './constants/config'
import { capturePromotionSource } from './services/promotionAttribution'
import { messagePlatformRuntime } from './services/messagePlatformRuntime'
import { MESSAGE_RUNTIME_BACKGROUND_EVENT } from './domain/messageLifecycle'

import './app.scss'

function getDevFixedLoginExtra() {
  const cached = Taro.getStorageSync(USER_INFO_KEY) || {}
  return {
    phone: DEV_FIXED_LOGIN.phone,
    maskedPhone: DEV_FIXED_LOGIN.maskedPhone,
    accessStatus: cached.userId === DEV_FIXED_LOGIN.userId ? cached.accessStatus : undefined,
  }
}

function captureEntryPromotionSource(query?: Record<string, unknown>) {
  const persistForRegistration = !DEV_FIXED_LOGIN.enabled && !Taro.getStorageSync(TOKEN_KEY)
  void capturePromotionSource(query, persistForRegistration).catch(() => {
    // 推广归因失败不能阻断小程序启动或正常登录。
  })
}

function App({ children }: PropsWithChildren<object>) {
  const { setLogin, checkLogin } = useAuthStore()
  const bootstrapPrd01 = usePrd01Store(state => state.bootstrap)
  const loginRedirectingRef = useRef(false)

  useLaunch((options) => {
    captureEntryPromotionSource(options.query)

    // 本地开发：注入固定登录态，跳过微信授权
    if (DEV_FIXED_LOGIN.enabled) {
      setLogin(
        DEV_FIXED_LOGIN.token,
        DEV_FIXED_LOGIN.userId,
        '',
        '',
        getDevFixedLoginExtra(),
      )
    } else {
      checkLogin()
    }

    void bootstrapPrd01().catch(() => {
      // 登录页和资料页会展示动态配置加载失败状态并提供重试。
    })
  })

  useDidShow((options) => {
    captureEntryPromotionSource(options?.query)

    if (MOCK_ENABLED) return
    if (DEV_FIXED_LOGIN.enabled) {
      const token = Taro.getStorageSync(TOKEN_KEY)
      if (token !== DEV_FIXED_LOGIN.token) {
        setLogin(
          DEV_FIXED_LOGIN.token,
          DEV_FIXED_LOGIN.userId,
          '',
          '',
          getDevFixedLoginExtra(),
        )
      }
      loginRedirectingRef.current = false
      void messagePlatformRuntime.onForeground()
      return
    }
    const token = Taro.getStorageSync(TOKEN_KEY)
    if (token) {
      loginRedirectingRef.current = false
      checkLogin()
      void messagePlatformRuntime.onForeground()
      return
    }

    const pages = Taro.getCurrentPages()
    const currentRoute = pages[pages.length - 1]?.route || ''
    if (currentRoute.startsWith('pages/login/')) return
    if (loginRedirectingRef.current) return

    loginRedirectingRef.current = true
    messagePlatformRuntime.stop()
    setTimeout(() => {
      Taro.reLaunch({ url: '/pages/login/index' }).catch(() => {
        loginRedirectingRef.current = false
      })
    }, 0)
  })

  useDidHide(() => {
    Taro.eventCenter.trigger(MESSAGE_RUNTIME_BACKGROUND_EVENT)
  })

  return children
}

export default App
