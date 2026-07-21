import type { TabKey } from '@/components/AppTabBar'

type ActiveTabListener = (key: TabKey) => void

let activeTabKey: TabKey = 'index'
const listeners = new Set<ActiveTabListener>()

export function getActiveTabKey() {
  return activeTabKey
}

/**
 * 自定义 TabBar 会被各个 Tab 页面分别缓存，点亮态必须跨实例同步。
 */
export function setActiveTabKey(key: TabKey) {
  if (activeTabKey === key) return
  activeTabKey = key
  listeners.forEach(listener => listener(key))
}

export function subscribeActiveTabKey(listener: ActiveTabListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
