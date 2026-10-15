import Taro from '@tarojs/taro'
import { getMessageAuthSessionVersion } from '../domain/messageLifecycle'

const PRIVATE_CHAT_ROUTE = 'pages/message/private-chat'
const openingTasks = new Map<string, Promise<void>>()

/** 同会话只复用已有页面；会话解析前的认证代次用于丢弃旧账号响应。 */
export async function openPrivateChat(
  conversationNo: string,
  sessionVersion = getMessageAuthSessionVersion(),
): Promise<void> {
  if (!conversationNo || sessionVersion !== getMessageAuthSessionVersion()) return
  const key = `${sessionVersion}:${conversationNo}`
  const existing = openingTasks.get(key)
  if (existing) return existing

  const task = (async () => {
    const pages = Taro.getCurrentPages()
    for (let index = pages.length - 1; index >= 0; index -= 1) {
      const page = pages[index]
      if (String(page.route || '').replace(/^\/+/, '') !== PRIVATE_CHAT_ROUTE
        || String(page.options?.conversationNo || '') !== conversationNo) continue
      const delta = pages.length - 1 - index
      if (delta > 0) await Taro.navigateBack({ delta })
      return
    }
    await Taro.navigateTo({ url: `/${PRIVATE_CHAT_ROUTE}?conversationNo=${encodeURIComponent(conversationNo)}` })
  })()
  openingTasks.set(key, task)
  try {
    await task
  } finally {
    if (openingTasks.get(key) === task) openingTasks.delete(key)
  }
}
