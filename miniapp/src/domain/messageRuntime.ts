import type {
  ConversationStatus,
} from '../types/message'

export type MessageErrorAction =
  | 'restrict'
  | 'refresh_relation'
  | 'protect'
  | 'read_only'
  | 'open_existing'
  | 'countdown'
  | 'recharge'
  | 'retry_same_key'
  | 'remove_and_refresh'
  | 'refresh'
  | 'poll'
  | 'compensating'
  | 'rate_limit'
  | 'stop_retry'
  | 'reprecheck'
  | 'unavailable'
  | 'im_read_only'
  | 'retry'

export interface MessageErrorResolution {
  code?: number
  action: MessageErrorAction
  message: string
  retryable: boolean
}

export interface KeyedSingleFlight {
  run<T>(key: string, task: () => Promise<T>): Promise<T>
}

/** 为外部消息能力设置可恢复的等待上限，避免第三方 Promise 无限占用页面状态。 */
export function withMessageTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), Math.max(1, timeoutMs))
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

type MessageGatewayReadyProbe = {
  isReady(): boolean
  onEvent(listener: (event: { type: string }) => void): () => void
}

/** LiteChat 登录 Promise 可能早于 SDK_READY 完成，历史消息必须等到真正就绪后再拉取。 */
export function waitForMessageGatewayReady(
  gateway: MessageGatewayReadyProbe,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<void> {
  if (gateway.isReady()) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    let settled = false
    let unsubscribe = () => undefined
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsubscribe()
      if (error) reject(error)
      else resolve()
    }
    const timer = setTimeout(
      () => finish(new Error(timeoutMessage)),
      Math.max(1, timeoutMs),
    )
    const subscribed = gateway.onEvent(event => {
      if (event.type === 'ready' || gateway.isReady()) finish()
      else if (event.type === 'kicked_out') finish(new Error('私信登录已失效，请重新进入'))
    })
    unsubscribe = subscribed
    if (settled) unsubscribe()
    else if (gateway.isReady()) finish()
  })
}

const ERROR_ACTIONS: Record<number, Omit<MessageErrorResolution, 'code'>> = {
  30001: { action: 'restrict', message: '当前账号暂不可使用消息功能', retryable: false },
  30002: { action: 'refresh_relation', message: '当前关系状态不允许发送', retryable: false },
  30003: { action: 'protect', message: '当前处于女性保护期，暂不可发送', retryable: false },
  30004: { action: 'read_only', message: '当前会话已失效', retryable: false },
  30005: { action: 'open_existing', message: '已有待处理的悄悄话', retryable: false },
  30006: { action: 'countdown', message: '悄悄话正在冷却中', retryable: false },
  30007: { action: 'recharge', message: '可用次数或千寻币不足', retryable: false },
  30008: { action: 'retry_same_key', message: '消息发送失败，请重试', retryable: true },
  30009: { action: 'remove_and_refresh', message: '消息已不存在', retryable: false },
  30010: { action: 'refresh', message: '消息模板已更新，请刷新', retryable: true },
  30011: { action: 'refresh', message: '悄悄话申请已结束', retryable: false },
  30012: { action: 'poll', message: '支付或补偿处理中', retryable: true },
  30013: { action: 'compensating', message: '退款处理中', retryable: true },
  30014: { action: 'refresh', message: '状态已变化，请刷新', retryable: false },
  30015: { action: 'read_only', message: '平台暂时关闭发送功能', retryable: true },
  30019: { action: 'rate_limit', message: '操作频繁，请稍后重试', retryable: true },
  30020: { action: 'stop_retry', message: '请求参数与既有操作冲突，请刷新', retryable: false },
  30021: { action: 'reprecheck', message: '报价已变化，请重新确认', retryable: false },
  30022: { action: 'unavailable', message: '当前内容不可举报', retryable: false },
  30023: { action: 'im_read_only', message: '私信服务暂不可用，已进入只读模式', retryable: true },
  30024: { action: 'unavailable', message: '消息读取服务暂不可用', retryable: true },
}

const SAFE_MINIAPP_PAGES = new Set([
  '/pages/profile/index',
  '/pages/verification/my-certification',
  '/pages/settings/index',
  '/pages/settings/announcements',
  '/pages/membership/index',
  '/pages/coins/index',
  '/pages/community/index',
  '/pages/chat/index',
])

export function formatMessageBadge(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return ''
  return count > 99 ? '99+' : String(Math.floor(count))
}

export function normalizeConversationStatus(value: unknown): ConversationStatus {
  return value === 'active' || value === 'blocked' || value === 'invalid' ? value : 'invalid'
}

export function isSupportedMessageProtocol(version: unknown): boolean {
  return version === 1
}

export function isSafeSystemJump(type: unknown, value?: unknown): boolean {
  if (type === null || type === undefined || type === '' || type === 'none') return true
  if (type !== 'miniapp_page' || typeof value !== 'string') return false
  const page = value.split('?')[0]
  return SAFE_MINIAPP_PAGES.has(page)
}

export function resolveMessageError(error: unknown): MessageErrorResolution {
  const candidate = error as { code?: unknown; message?: unknown }
  const code = typeof candidate?.code === 'number' ? candidate.code : undefined
  const resolution = code === undefined ? undefined : ERROR_ACTIONS[code]
  if (resolution) return { code, ...resolution }
  return {
    code,
    action: 'retry',
    message:
      typeof candidate?.message === 'string' && candidate.message.trim()
        ? candidate.message
        : '网络开小差了，请稍后重试',
    retryable: true,
  }
}

/** 识别腾讯云 TIM 返回的账号不存在错误，不解析或记录错误中的具体 UserID。 */
export function isTimAccountMissingError(error: unknown): boolean {
  const candidate = error as {
    code?: unknown
    message?: unknown
    error?: { code?: unknown }
    data?: { code?: unknown }
  }
  const directCodes = [candidate?.code, candidate?.error?.code, candidate?.data?.code]
  if (directCodes.some(code =>
    (typeof code === 'number' && code === 20003)
    || (typeof code === 'string' && code.trim() === '20003')
  )) return true

  const message =
    typeof candidate?.message === 'string'
      ? candidate.message
      : typeof error === 'string'
        ? error
        : ''
  return /(?:^|[{,\s])["']?code["']?\s*[:=]\s*20003(?:\D|$)/i.test(message)
}

/**
 * LiteChat 单聊会话号固定为 `C2C${userID}`。
 * 兼容历史错误值 `C2C_tu_*`，避免继续把不存在的 `_tu_*` 当作接收方。
 */
export function normalizeTimC2CConversationId(value: unknown): string {
  if (typeof value !== 'string') throw new Error('TIM 单聊会话标识无效')
  const normalized = value.trim()
  if (!normalized.startsWith('C2C')) throw new Error('TIM 单聊会话标识无效')

  let targetUserId = normalized.slice(3)
  if (targetUserId.startsWith('_tu_')) targetUserId = targetUserId.slice(1)
  if (!targetUserId.startsWith('tu_')) throw new Error('TIM 单聊会话标识无效')
  return `C2C${targetUserId}`
}

export function resolveTimC2CTargetUserId(timConversationId: unknown): string {
  return normalizeTimC2CConversationId(timConversationId).slice(3)
}

export function resolveConversationSendBlockedReason(reason?: string | null): string {
  if (reason === 'female_protection') return '等待女方先发消息后即可聊天'
  if (reason === 'conversation_invalid') return '当前会话已失效，仅可查看历史消息'
  return reason?.trim() || '当前会话暂不可发送'
}

/** 合并同一业务键的并发请求；请求结束后允许下一次主动刷新。 */
export function createKeyedSingleFlight(): KeyedSingleFlight {
  let activeKey: string | undefined
  let activePromise: Promise<unknown> | undefined

  return {
    run<T>(key: string, task: () => Promise<T>): Promise<T> {
      if (activeKey === key && activePromise) return activePromise as Promise<T>

      let promise: Promise<T>
      try {
        promise = Promise.resolve(task())
      } catch (error) {
        promise = Promise.reject(error)
      }
      activeKey = key
      activePromise = promise

      const clear = () => {
        if (activePromise !== promise) return
        activeKey = undefined
        activePromise = undefined
      }
      void promise.then(clear, clear)
      return promise
    },
  }
}
