import { PropsWithChildren, useRef } from 'react'
import Taro, { useDidHide, useDidShow, useLaunch } from '@tarojs/taro'
import { useAuthStore } from './stores/authStore'
import { usePrd01Store } from './stores/prd01Store'
import { DEV_FIXED_LOGIN, MOCK_ENABLED, TOKEN_KEY, USER_INFO_KEY } from './constants/config'
import { capturePromotionSource } from './services/promotionAttribution'
import { messagePlatformRuntime } from './services/messagePlatformRuntime'
import { MESSAGE_RUNTIME_BACKGROUND_EVENT } from './domain/messageLifecycle'
import { PENDING_SHARE_ROUTE_KEY, resolvePendingShareRoute } from './domain/pendingShareRoute'
import { isPublicReadingRoute } from './domain/publicReadingRoute'

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

function rememberPendingShareRoute(path?: string, query?: Record<string, unknown>) {
  const target = resolvePendingShareRoute(path, query)
  if (!target) return
  try {
    Taro.setStorageSync(PENDING_SHARE_ROUTE_KEY, target)
  } catch {
    // 本地存储失败不阻断登录；登录后仍可从分享卡片重新进入。
  }
}

function App({ children }: PropsWithChildren<object>) {
  const { setLogin, checkLogin } = useAuthStore()
  const bootstrapPrd01 = usePrd01Store(state => state.bootstrap)
  const loginRedirectingRef = useRef(false)
  const legacyShareRedirectingRef = useRef(false)

  useLaunch((options) => {
    captureEntryPromotionSource(options.query)
    if (!DEV_FIXED_LOGIN.enabled && !Taro.getStorageSync(TOKEN_KEY)) {
      rememberPendingShareRoute(options.path, options.query)
    }

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
      const legacyTarget = String(options?.path || '').replace(/^\//, '').split('?')[0] === 'pages/index/index'
        ? resolvePendingShareRoute(options?.path, options?.query) : null
      if (legacyTarget && !legacyShareRedirectingRef.current) {
        legacyShareRedirectingRef.current = true
        // 旧卡片可能唤醒已缓存的首页，统一从应用入口导航到该动态详情。
        setTimeout(() => {
          void Taro.reLaunch({ url: legacyTarget }).catch(() => { void Taro.showToast({ title: '动态打开失败，请重新打开分享卡片', icon: 'none' }) }).finally(() => { legacyShareRedirectingRef.current = false })
        }, 0)
      }
      return
    }

    const pages = Taro.getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const currentRoute = currentPage?.route || ''
    const entryTarget = resolvePendingShareRoute(options?.path, options?.query)
    if (entryTarget) rememberPendingShareRoute(options?.path, options?.query)
    else rememberPendingShareRoute(currentRoute, currentPage?.options)
    const sharedProfile = entryTarget || resolvePendingShareRoute(currentRoute, currentPage?.options)
    if (sharedProfile?.startsWith('/pages/heart/user?')) {
      checkLogin()
      loginRedirectingRef.current = false
      messagePlatformRuntime.stop()
      return
    }
    if (isPublicReadingRoute(currentRoute || options?.path)) {
      loginRedirectingRef.current = false
      messagePlatformRuntime.stop()
      return
    }
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
    messagePlatformRuntime.onBackground()
    Taro.eventCenter.trigger(MESSAGE_RUNTIME_BACKGROUND_EVENT)
  })

  return children
}

export default App
