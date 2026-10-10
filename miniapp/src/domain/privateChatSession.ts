import type { ChatMessage, MessageConversationDetail } from '@/types/message'

export interface PrivateChatSessionSnapshot {
  detail?: MessageConversationDetail
  messages: ChatMessage[]
  historyCursor?: string
  historyCompleted: boolean
  timHistoryCursor?: string
  timHistoryCompleted: boolean
  initialLoaded: boolean
  scrollTop: number
  scrollHeight: number
  nearBottom: boolean
}

const sessions = new Map<string, PrivateChatSessionSnapshot>()
const MAX_SESSION_COUNT = 12

function sessionKey(userId: string, conversationNo: string): string {
  return `${String(userId || '')}:${String(conversationNo || '')}`
}

function hasSameIdentity(left: ChatMessage, right: ChatMessage): boolean {
  return Boolean(
    (left.messageNo && right.messageNo && left.messageNo === right.messageNo)
    || (left.timMessageId && right.timMessageId && left.timMessageId === right.timMessageId)
    || (left.timMsgKey && right.timMsgKey && left.timMsgKey === right.timMsgKey)
    || (left.clientMsgId && right.clientMsgId && left.clientMsgId === right.clientMsgId)
  )
}

function mergeMessage(previous: ChatMessage, incoming: ChatMessage): ChatMessage {
  return {
    ...previous,
    ...incoming,
    messageNo: incoming.messageNo || previous.messageNo,
    clientMsgId: incoming.clientMsgId || previous.clientMsgId,
    timMessageId: incoming.timMessageId || previous.timMessageId,
    timMsgKey: incoming.timMsgKey || previous.timMsgKey,
    ...(incoming.providerSequence !== undefined || previous.providerSequence !== undefined
      ? { providerSequence: incoming.providerSequence ?? previous.providerSequence }
      : {}),
    ...(incoming.providerRandom !== undefined || previous.providerRandom !== undefined
      ? { providerRandom: incoming.providerRandom ?? previous.providerRandom }
      : {}),
    sentAt: previous.clientMsgId && previous.clientMsgId === incoming.clientMsgId
      ? previous.sentAt
      : incoming.sentAt || previous.sentAt,
  }
}

function compareOptionalNumber(left?: number, right?: number): number {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0
  return Number(left) - Number(right)
}

/** TIM 时间仅精确到秒；相同时间必须继续使用服务端顺序号稳定排序。 */
function compareMessages(left: ChatMessage, right: ChatMessage): number {
  const timeOrder = left.sentAt.localeCompare(right.sentAt)
  if (timeOrder !== 0) return timeOrder
  const sequenceOrder = compareOptionalNumber(left.providerSequence, right.providerSequence)
  if (sequenceOrder !== 0) return sequenceOrder
  const randomOrder = compareOptionalNumber(left.providerRandom, right.providerRandom)
  if (randomOrder !== 0) return randomOrder
  // 平台持久化历史没有 TIM sequence，保留 DAO 已确认的返回顺序。
  return 0
}

function hasSameMessageValue(left: ChatMessage, right: ChatMessage): boolean {
  const keys = Object.keys(left) as Array<keyof ChatMessage>
  const rightKeys = Object.keys(right) as Array<keyof ChatMessage>
  if (keys.length !== rightKeys.length) return false
  return keys.every(key => left[key] === right[key])
}

/**
 * 合并平台持久化历史与 TIM 近期消息。没有语义变化时保留原数组引用，
 * 避免 React 重渲染和 ScrollView 重算布局。
 */
export function mergePrivateChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  if (incoming.length === 0) return current

  let changed = false
  const merged = [...current]
  incoming.forEach(item => {
    const index = merged.findIndex(currentItem => hasSameIdentity(currentItem, item))
    if (index < 0) {
      merged.push(item)
      changed = true
      return
    }
    const next = mergeMessage(merged[index], item)
    if (!hasSameMessageValue(merged[index], next)) {
      merged[index] = next
      changed = true
    }
  })
  if (!changed) return current

  merged.sort(compareMessages)
  if (
    merged.length === current.length
    && merged.every((item, index) => hasSameMessageValue(item, current[index]))
  ) return current
  return merged
}

export function readPrivateChatSession(
  userId: string,
  conversationNo: string,
): PrivateChatSessionSnapshot | undefined {
  if (!conversationNo) return undefined
  return sessions.get(sessionKey(userId, conversationNo))
}

export function writePrivateChatSession(
  userId: string,
  conversationNo: string,
  patch: Partial<PrivateChatSessionSnapshot>,
): PrivateChatSessionSnapshot {
  const key = sessionKey(userId, conversationNo)
  const current = sessions.get(key)
  const next: PrivateChatSessionSnapshot = {
    detail: current?.detail,
    messages: current?.messages || [],
    historyCursor: current?.historyCursor,
    historyCompleted: current?.historyCompleted || false,
    timHistoryCursor: current?.timHistoryCursor,
    timHistoryCompleted: current?.timHistoryCompleted || false,
    initialLoaded: current?.initialLoaded || false,
    scrollTop: current?.scrollTop || 0,
    scrollHeight: current?.scrollHeight || 0,
    nearBottom: current?.nearBottom ?? true,
    ...patch,
  }
  sessions.delete(key)
  sessions.set(key, next)
  while (sessions.size > MAX_SESSION_COUNT) {
    const oldestKey = sessions.keys().next().value as string | undefined
    if (!oldestKey) break
    sessions.delete(oldestKey)
  }
  return next
}

export function clearPrivateChatSession(userId: string, conversationNo: string): void {
  sessions.delete(sessionKey(userId, conversationNo))
}
