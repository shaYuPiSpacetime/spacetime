import { useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import AppTabBar, { type TabKey } from '@/components/AppTabBar'

/** Tab 路径映射 — 从当前页面路径推导激活的 Tab */
const PATH_TO_TAB: Record<string, TabKey> = {
  'pages/index/index': 'index',
  'pages/community/index': 'community',
  'pages/assessment/index': 'assessment',
  'pages/chat/index': 'chat',
  'pages/profile/index': 'profile',
}

/**
 * Taro 自定义 TabBar 入口（自动被框架加载，无需手动引入）
 *
 * 通过 useDidShow 监听页面切换，从当前路由推导激活的 Tab 并交给 AppTabBar 渲染。
 * 注意：自定义 TabBar 必须以 Class Component 或普通 FC 导出，
 * Taro 构建时会自动在 app.config 注入 custom-tab-bar 组件路径。
 */
export default function CustomTabBar() {
  const [activeKey, setActiveKey] = useState<TabKey>('index')

  /** 根据当前页面路径推导激活 Tab */
  const updateActiveTab = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 0) {
      const route: string | undefined = pages[pages.length - 1]?.route
      if (route) {
        const key = PATH_TO_TAB[route]
        if (key) setActiveKey(key)
      }
    }
  }

  // 初始化时获取当前 Tab
  useEffect(() => {
    updateActiveTab()
  }, [])

  // 页面显示时同步 Tab 状态
  useDidShow(() => {
    updateActiveTab()
  })

  return <AppTabBar active={activeKey} />
}
