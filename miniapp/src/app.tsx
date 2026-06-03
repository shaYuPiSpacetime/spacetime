import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { useAuthStore } from './stores/authStore'

import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  const { checkLogin } = useAuthStore()

  useLaunch(() => {
    // 小程序启动时检查登录态
    checkLogin()
  })

  return children
}

export default App
