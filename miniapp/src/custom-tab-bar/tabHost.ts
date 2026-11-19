import Taro from '@tarojs/taro'
import type { TabKey } from '@/components/AppTabBar'

export type TabPanel = Exclude<TabKey, 'kindred'>

const nativeTabs: Record<string, TabPanel> = {
  'pages/index/index': 'index',
  'pages/community/index': 'community',
  'pages/recommend/index': 'recommend',
  'pages/chat/index': 'chat',
  'pages/profile/index': 'profile',
}

interface TabHost {
  selected: () => TabKey
  select: (key: TabKey) => void
}

const hosts = new Map<string, TabHost>()
const pending = new Map<string, { key: TabKey }>()

export function registerTabHost(route: string, host: TabHost) {
  hosts.set(route, host)
  return () => {
    if (hosts.get(route) === host) hosts.delete(route)
  }
}

export function getRouteTab(route: string) {
  return pending.get(route)?.key ?? hosts.get(route)?.selected() ?? nativeTabs[route]
}

export function takeRequestedTab(route: string) {
  const request = pending.get(route)
  pending.delete(route)
  return request?.key
}

/** 从已打开的底栏页面切换时，保留同一微信页面及底栏。 */
export function selectHostedTab(route: string, key: TabKey) {
  const host = hosts.get(route)
  if (!host) return false
  host.select(key)
  return true
}

/** 详情页返回指定栏目时，先交给原来的宿主页，再按微信语义清理详情页栈。 */
export function switchMainTab(options: Taro.switchTab.Option, requestedKey?: TabKey) {
  const target = options.url.replace(/^\//, '')
  const key = requestedKey ?? nativeTabs[target]
  if (!key || Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return Taro.switchTab(options)
  const pages = Taro.getCurrentPages()
  const current = pages[pages.length - 1]?.route
  if (current && selectHostedTab(current, key)) {
    const result = { errMsg: 'switchTab:ok' }
    options.success?.(result)
    options.complete?.(result)
    return Promise.resolve(result)
  }
  const route = pages.find(page => page.route && hosts.has(page.route))?.route || target
  const request = { key }
  pending.set(route, request)
  return Taro.switchTab({
    ...options,
    url: '/' + route,
    fail: error => {
      if (pending.get(route) === request) pending.delete(route)
      options.fail?.(error)
    },
  })
}
