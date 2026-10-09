import Taro from '@tarojs/taro'

export const PROFILE_EDIT_FALLBACK_URL = '/pages/profile/edit'

let navigationTask: Promise<void> | null = null

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
  if (navigationTask) return navigationTask
  if (isCurrentDestination(url)) return
  const task = (async () => {
    try {
      await Taro.navigateTo({ url })
    } catch {
      await Taro.redirectTo({ url })
    }
  })()
  navigationTask = task
  try {
    await task
  } finally {
    if (navigationTask === task) navigationTask = null
  }
}

export async function navigateBackOrRedirect(fallbackUrl = PROFILE_EDIT_FALLBACK_URL) {
  const pages = Taro.getCurrentPages()
  if (pages.length > 1) {
    try {
      await Taro.navigateBack({ delta: 1 })
    } catch {
      await Taro.redirectTo({ url: fallbackUrl })
    }
    return
  }
  await Taro.redirectTo({ url: fallbackUrl })
}
