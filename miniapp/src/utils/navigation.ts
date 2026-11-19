import { switchMainTab } from '@/custom-tab-bar/tabHost'
import Taro from '@tarojs/taro'

export const PROFILE_EDIT_FALLBACK_URL = '/pages/profile/edit'

export const TAB_ROUTES = new Set([
  '/pages/index/index',
  '/pages/recommend/index',
  '/pages/community/index',
  '/pages/chat/index',
  '/pages/profile/index',
])

let pendingNavigation: { source: string; task: Promise<void> } | null = null

function currentPageKey() {
  const pages = Taro.getCurrentPages()
  return pages.length + '/' + (pages[pages.length - 1]?.route || '')
}

/** 页面已打开或导航尚未落地时，重复点击不再新增页面栈。 */
function isCurrentDestination(url: string) {
  const pages = Taro.getCurrentPages()
  const page = pages[pages.length - 1]
  const [route, query = ''] = url.replace(/^\//, '').split('?')
  if (!page || page.route !== route) return false
  return query.split('&').filter(Boolean).every(part => {
    const [key, value = ''] = part.split('=')
    return String(page.options?.[decodeURIComponent(key)] ?? '') === decodeURIComponent(value)
  })
}

/** 普通入栈失败（例如页面栈已满）时，降级为替换当前页。 */
export async function navigateToOrRedirect(url: string) {
  const source = currentPageKey()
  if (pendingNavigation?.source === source) return pendingNavigation.task
  if (isCurrentDestination(url)) return
  const task = (async () => {
    try {
      await Taro.navigateTo({ url })
    } catch {
      if (currentPageKey() === source) await Taro.redirectTo({ url })
    }
  })()
  pendingNavigation = { source, task }
  try {
    await task
  } finally {
    if (pendingNavigation?.task === task) pendingNavigation = null
  }
}

export async function navigateBackOrRedirect(fallbackUrl = PROFILE_EDIT_FALLBACK_URL) {
  const pages = Taro.getCurrentPages()
  if (pages.length > 1) {
    let fallbackTask: Promise<unknown> | null = null
    const fallback = () => {
      if (!fallbackTask) fallbackTask = Promise.resolve(Taro.redirectTo({ url: fallbackUrl }))
      return fallbackTask
    }
    try {
      const backResult = Taro.navigateBack({
        delta: 1,
        fail: () => { void fallback() },
      })
      await Promise.resolve(backResult)
    } catch {
      await fallback()
    }
    return
  }
  await Taro.redirectTo({ url: fallbackUrl })
}

/** 返回上一页；分享单页或返回失败时进入指定底部页面。 */
export async function navigateBackOrSwitchTab(fallbackUrl: string) {
  if (Taro.getCurrentPages().length > 1) {
    try { await Taro.navigateBack(); return } catch { /* 页面栈已变化时继续兜底。 */ }
  }
  try { await switchMainTab({ url: fallbackUrl }) }
  catch { await Taro.reLaunch({ url: fallbackUrl }) }
}
