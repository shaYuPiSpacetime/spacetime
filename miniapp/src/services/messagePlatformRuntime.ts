import { resolveMessageError } from '../domain/messageRuntime'
import { getApiErrorCode } from './request'
import { messageService } from './message'
import { useMessageRuntimeStore } from '../stores/messageRuntimeStore'

/**
 * 主包只负责平台消息首页和未读真值，不加载 LiteChat SDK。
 * LiteChat 登录、事件和历史只在消息分包页面启动。
 */
class MessagePlatformRuntime {
  async onForeground(): Promise<void> {
    const store = useMessageRuntimeStore.getState()
    store.setLoading(true)
    try {
      const home = await messageService.getHome()
      store.applyHome(home)
      if (home.accessMode === 'restricted') {
        store.clear('restricted', home.restrictionPrompt || '当前账号暂不可使用消息功能')
      }
    } catch (error) {
      const resolved = resolveMessageError({
        code: getApiErrorCode(error),
        message: error instanceof Error ? error.message : undefined,
      })
      if (resolved.action === 'restrict') {
        store.clear('restricted', resolved.message)
      } else {
        store.setError(resolved.message)
      }
    } finally {
      useMessageRuntimeStore.getState().setLoading(false)
    }
  }

  stop(): void {
    useMessageRuntimeStore.getState().clear()
  }
}

export const messagePlatformRuntime = new MessagePlatformRuntime()
