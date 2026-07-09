import { PropsWithChildren } from 'react'
import { useRef } from 'react'
import Taro, { useDidShow, useLaunch } from '@tarojs/taro'
import { useAuthStore } from './stores/authStore'
import { MOCK_ENABLED, TOKEN_KEY } from './constants/config'

import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  const { checkLogin } = useAuthStore()
  const loginRedirectingRef = useRef(false)

  useLaunch(() => {
    checkLogin()
  })

  useDidShow(() => {
    if (MOCK_ENABLED) return
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
