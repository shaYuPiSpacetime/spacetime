import Taro from '@tarojs/taro'
import { isSupportedMessageProtocol, resolveMessageError } from '../domain/messageRuntime'
import { MESSAGE_RUNTIME_BACKGROUND_EVENT } from '../domain/messageLifecycle'
import { messageService } from '../services/message'
import { getApiErrorCode } from '../services/request'
import { useMessageRuntimeStore } from '../stores/messageRuntimeStore'
import type { ImCredentials } from '../types/message'
import { messageImGateway } from './index'
import type { MessageImEvent } from './MessageImGateway'

const CREDENTIAL_REFRESH_WINDOW_SECONDS = 10 * 60
const UNREAD_REFRESH_THROTTLE_MS = 500

function expireAtMillis(expireAt: string): number {
  const normalized = expireAt.includes('T') ? expireAt : expireAt.replace(' ', 'T')
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? timestamp : 0
}

class MessageRuntime {
  private credentials?: ImCredentials
  private unsubscribe?: () => void
  private unreadTimer?: ReturnType<typeof setTimeout>
  private started = false
  private lifecycleListening = false

  async start(): Promise<void> {
    if (!this.unsubscribe) this.unsubscribe = messageImGateway.onEvent(this.handleImEvent)
    if (!this.lifecycleListening) {
      Taro.eventCenter.on(MESSAGE_RUNTIME_BACKGROUND_EVENT, this.onBackground)
      this.lifecycleListening = true
    }
    this.started = true
    await this.refreshHomeAndConnection()
  }

  async onForeground(): Promise<void> {
    if (!this.started) return this.start()
    await this.refreshHomeAndConnection()
  }

  onBackground = (): void => {
    if (this.unreadTimer) clearTimeout(this.unreadTimer)
    this.unreadTimer = undefined
  }

  async stop(): Promise<void> {
    this.started = false
    this.credentials = undefined
    if (this.unreadTimer) clearTimeout(this.unreadTimer)
    this.unreadTimer = undefined
    this.unsubscribe?.()
    this.unsubscribe = undefined
    if (this.lifecycleListening) {
      Taro.eventCenter.off(MESSAGE_RUNTIME_BACKGROUND_EVENT, this.onBackground)
      this.lifecycleListening = false
    }
    await messageImGateway.logout()
    useMessageRuntimeStore.getState().clear()
  }

  scheduleUnreadRefresh(): void {
    if (!this.started || this.unreadTimer) return
    this.unreadTimer = setTimeout(() => {
      this.unreadTimer = undefined
      void this.refreshUnread()
    }, UNREAD_REFRESH_THROTTLE_MS)
  }

  async refreshUnread(): Promise<void> {
    if (!this.started || useMessageRuntimeStore.getState().accessMode === 'restricted') return
    try {
      const summary = await messageService.getUnreadSummary()
      useMessageRuntimeStore.getState().applyUnread(summary)
    } catch (error) {
      const resolved = resolveMessageError({
        code: getApiErrorCode(error),
        message: error instanceof Error ? error.message : undefined,
      })
      useMessageRuntimeStore.getState().setError(resolved.message)
    }
  }

  private refreshHomeAndConnection = async () => {
    const store = useMessageRuntimeStore.getState()
    store.setLoading(true)
    try {
      const home = await messageService.getHome()
      store.applyHome(home)
      if (home.accessMode === 'restricted') {
        this.credentials = undefined
        await messageImGateway.logout()
        store.clear('restricted', home.restrictionPrompt || '当前账号暂不可使用消息功能')
        return
      }
      await this.ensureImConnected()
    } catch (error) {
      const code = getApiErrorCode(error)
      const resolved = resolveMessageError({
        code,
        message: error instanceof Error ? error.message : undefined,
      })
      if (resolved.action === 'restrict') {
        this.credentials = undefined
        await messageImGateway.logout()
        store.clear('restricted', resolved.message)
      } else {
        store.setError(resolved.message)
      }
    } finally {
      useMessageRuntimeStore.getState().setLoading(false)
    }
  }

  private async ensureImConnected() {
    const now = Date.now()
    const cachedValid =
      this.credentials &&
      expireAtMillis(this.credentials.expireAt) - now > CREDENTIAL_REFRESH_WINDOW_SECONDS * 1000
    if (cachedValid && messageImGateway.isReady()) {
      useMessageRuntimeStore.getState().setImState(true, false)
      return
    }

    try {
      const credentials = await messageService.getImCredentials()
      if (!isSupportedMessageProtocol(credentials.protocolVersion)) {
        this.credentials = undefined
        await messageImGateway.logout()
        useMessageRuntimeStore.getState().setImState(false, true)
        useMessageRuntimeStore.getState().setError('消息协议已升级，请重新进入消息页')
        return
      }
      this.credentials = credentials
      await messageImGateway.initialize(credentials)
      useMessageRuntimeStore.getState().setImState(messageImGateway.isReady(), false)
    } catch (error) {
      if (getApiErrorCode(error) === 30023 && cachedValid) return
      useMessageRuntimeStore.getState().setImState(false, true)
      const resolved = resolveMessageError({
        code: getApiErrorCode(error),
        message: error instanceof Error ? error.message : undefined,
      })
      useMessageRuntimeStore.getState().setError(resolved.message)
    }
  }

  private handleImEvent = (event: MessageImEvent) => {
    if (event.type === 'ready') {
      useMessageRuntimeStore.getState().setImState(true, false)
      this.scheduleUnreadRefresh()
      return
    }
    if (event.type === 'not_ready' || event.type === 'kicked_out') {
      useMessageRuntimeStore.getState().setImState(false, true)
      if (event.type === 'kicked_out') void this.ensureImConnected()
      return
    }
    // MESSAGE_RECEIVED 与 CONVERSATION_LIST_UPDATED 都只触发后端未读真值刷新。
    this.scheduleUnreadRefresh()
  }
}

export const messageRuntime = new MessageRuntime()
