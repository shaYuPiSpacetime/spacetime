import { useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import AppTabBar, { releaseTabSwitch, type TabKey } from '@/components/AppTabBar'
import { getActiveTabKey, setActiveTabKey, subscribeActiveTabKey } from './tabState'
import { getRouteTab } from './tabHost'

function getCurrentRoute() {
  const pages = Taro.getCurrentPages()
  return pages.length > 0 ? pages[pages.length - 1]?.route ?? '' : ''
}

function resolveInitialActiveKey() {
  return getRouteTab(getCurrentRoute()) ?? getActiveTabKey()
}

/**
 * Taro 自定义 TabBar 入口（自动被框架加载，无需手动引入）
 *
 * 通过 useDidShow 监听页面切换，从当前路由推导激活的 Tab 并交给 AppTabBar 渲染。
 * 注意：自定义 TabBar 必须以 Class Component 或普通 FC 导出，
 * Taro 构建时会自动在 app.config 注入 custom-tab-bar 组件路径。
 */
export default function CustomTabBar() {
  const [activeKey, setActiveKey] = useState<TabKey>(resolveInitialActiveKey)

  /** 根据当前页面路径推导激活 Tab */
  const updateActiveTab = () => {
    const route = getCurrentRoute()
    if (route) {
      const key = getRouteTab(route)
      if (key) {
        setActiveTabKey(key)
        setActiveKey(key)
      }
    }
  }

  const handleActiveChange = (key: TabKey) => {
    setActiveTabKey(key)
  }

  // 各 Tab 页面会缓存自己的自定义 TabBar 实例，必须订阅同一份点亮态。
  useEffect(() => {
    const unsubscribe = subscribeActiveTabKey(setActiveKey)
    updateActiveTab()
    return unsubscribe
  }, [])

  // 页面显示时同步 Tab 状态
  useDidShow(() => {
    updateActiveTab()
    releaseTabSwitch()
  })

  return <AppTabBar active={activeKey} onActiveChange={handleActiveChange} />
}

// 微信将自定义底栏单独作为组件加载，让它也能使用应用的按压样式。
CustomTabBar.options = { styleIsolation: 'apply-shared' }
