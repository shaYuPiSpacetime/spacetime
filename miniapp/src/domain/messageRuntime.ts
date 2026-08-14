import type {
  ConversationStatus,
  MessageConversationItem,
  MessageConversationView,
  TimConversationSnapshot,
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

export function mergeConversationBindings(
  bindings: MessageConversationItem[],
  timConversations: TimConversationSnapshot[],
): MessageConversationView[] {
  const byTimId = new Map(timConversations.map(item => [item.timConversationId, item]))
  return bindings
    .filter(item => item.canEnterConversation && normalizeConversationStatus(item.conversationStatus) === 'active')
    .map(item => {
      const tim = byTimId.get(item.timConversationId)
      return {
        ...item,
        conversationStatus: normalizeConversationStatus(item.conversationStatus),
        lastMessagePreview: tim?.lastMessagePreview || '',
        lastMessageAt: tim?.lastMessageAt || item.lastBusinessActivityTime,
        platformUnreadCount: tim?.unreadCount,
      }
    })
    .sort((left, right) => (right.lastMessageAt || '').localeCompare(left.lastMessageAt || ''))
}
