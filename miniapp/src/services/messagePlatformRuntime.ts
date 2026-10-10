import { resolveMessageError } from '../domain/messageRuntime'
import { getApiErrorCode } from './request'
import { messageService } from './message'
import { useMessageRuntimeStore } from '../stores/messageRuntimeStore'

const DEFAULT_UNREAD_REFRESH_INTERVAL_MS = 3_000

/**
 * 主包只负责平台消息首页和未读真值，不加载 LiteChat SDK。
 * LiteChat 登录、事件和历史只在消息分包页面启动。
 */
export class MessagePlatformRuntime {
  private unreadTimer?: ReturnType<typeof setInterval>
  private unreadRefreshPromise?: Promise<void>
  private foreground = false
  private generation = 0

  constructor(private readonly unreadRefreshIntervalMs = DEFAULT_UNREAD_REFRESH_INTERVAL_MS) {}

  async onForeground(): Promise<void> {
    this.foreground = true
    const store = useMessageRuntimeStore.getState()
    store.setLoading(true)
    try {
      const home = await messageService.getHome()
      store.applyHome(home)
      if (home.accessMode === 'restricted') {
        this.stopUnreadPolling()
        store.clear('restricted', home.restrictionPrompt || '当前账号暂不可使用消息功能')
      } else {
        this.startUnreadPolling()
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

  async refreshUnread(): Promise<void> {
    if (this.unreadRefreshPromise) return this.unreadRefreshPromise
    const request = this.refreshUnreadInternal(this.generation)
    this.unreadRefreshPromise = request
    try {
      await request
    } finally {
      if (this.unreadRefreshPromise === request) this.unreadRefreshPromise = undefined
    }
  }

  /** 应用退到后台时只停轮询，保留当前角标，避免恢复前出现闪烁。 */
  onBackground(): void {
    this.foreground = false
    this.stopUnreadPolling()
  }

  stop(): void {
    this.onBackground()
    this.generation += 1
    this.unreadRefreshPromise = undefined
    useMessageRuntimeStore.getState().clear()
  }

  private async refreshUnreadInternal(generation: number): Promise<void> {
    try {
      const summary = await messageService.getUnreadSummary()
      if (generation !== this.generation) return
      useMessageRuntimeStore.getState().applyUnread(summary)
    } catch (error) {
      if (generation !== this.generation) return
      const resolved = resolveMessageError({
        code: getApiErrorCode(error),
        message: error instanceof Error ? error.message : undefined,
      })
      useMessageRuntimeStore.getState().setError(resolved.message)
    }
  }

  private startUnreadPolling(): void {
    if (!this.foreground || this.unreadTimer) return
    this.unreadTimer = setInterval(() => {
      void this.refreshUnread()
    }, this.unreadRefreshIntervalMs)
  }

  private stopUnreadPolling(): void {
    if (this.unreadTimer) clearInterval(this.unreadTimer)
    this.unreadTimer = undefined
  }
}

export const messagePlatformRuntime = new MessagePlatformRuntime()
