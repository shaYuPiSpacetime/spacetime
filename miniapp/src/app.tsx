import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { useAuthStore } from './stores/authStore'

import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  const { checkLogin } = useAuthStore()

  useLaunch(() => {
    checkLogin()
  })

  // TODO: 未登录跳登录页逻辑暂时注释，启动页改为我的页面后待重新设计
  // useDidShow(() => {
  //   if (MOCK_ENABLED) return
  //   const token = Taro.getStorageSync(TOKEN_KEY)
  //   if (token) {
  //     loginRedirectingRef.current = false
  //     checkLogin()
  //     return
  //   }
  //
  //   const pages = Taro.getCurrentPages()
  //   const currentRoute = pages[pages.length - 1]?.route || ''
  //   if (currentRoute.startsWith('pages/login/')) return
  //   if (loginRedirectingRef.current) return
  //
  //   loginRedirectingRef.current = true
  //   setTimeout(() => {
  //     Taro.reLaunch({ url: '/pages/login/index' }).catch(() => {
  //       loginRedirectingRef.current = false
  //     })
  //   }, 0)
  // })

  return children
}

export default App
