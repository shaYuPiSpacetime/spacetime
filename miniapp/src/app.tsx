import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { useAuthStore } from './stores/authStore'
import { TOKEN_KEY } from './constants/config'

import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  const { checkLogin } = useAuthStore()

  useLaunch(() => {
    // 小程序启动时检查本地登录态
    const token = Taro.getStorageSync(TOKEN_KEY)
    if (!token) {
      // 未登录 → 跳转登录页
      Taro.reLaunch({ url: '/pages/login/index' })
    } else {
      // 已登录 → 恢复登录态到 store
      checkLogin()
    }
  })

  return children
}

export default App
