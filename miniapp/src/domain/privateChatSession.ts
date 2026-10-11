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
export const PENDING_MESSAGE_GRACE_MS = 30_000

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

function parseTimMsgKeyOrder(value?: string): { sequence?: number; random?: number } {
  const parts = String(value || '').split('_')
  if (parts.length < 2) return {}
  const sequence = Number(parts[0])
  const random = Number(parts[1])
  return {
    sequence: Number.isFinite(sequence) ? sequence : undefined,
    random: Number.isFinite(random) ? random : undefined,
  }
}

function resolvedSequence(message: ChatMessage): number | undefined {
  return Number.isFinite(message.providerSequence)
    ? message.providerSequence
    : parseTimMsgKeyOrder(message.timMsgKey).sequence
}

function resolvedRandom(message: ChatMessage): number | undefined {
  return Number.isFinite(message.providerRandom)
    ? message.providerRandom
    : parseTimMsgKeyOrder(message.timMsgKey).random
}

function numericIdentity(value: string): number | undefined {
  const match = value.match(/(\d+)$/)
  if (!match) return undefined
  const result = Number(match[1])
  return Number.isFinite(result) ? result : undefined
}

/** TIM 时间仅精确到秒；相同时间必须继续使用服务端顺序号稳定排序。 */
function compareMessages(left: ChatMessage, right: ChatMessage): number {
  const leftTime = Date.parse(left.sentAt)
  const rightTime = Date.parse(right.sentAt)
  const timeOrder = Number.isFinite(leftTime) && Number.isFinite(rightTime)
    ? leftTime - rightTime
    : left.sentAt.localeCompare(right.sentAt)
  if (timeOrder !== 0) return timeOrder
  const sequenceOrder = compareOptionalNumber(resolvedSequence(left), resolvedSequence(right))
  if (sequenceOrder !== 0) return sequenceOrder
  const randomOrder = compareOptionalNumber(resolvedRandom(left), resolvedRandom(right))
  if (randomOrder !== 0) return randomOrder
  const leftIdentity = messageIdentity(left)
  const rightIdentity = messageIdentity(right)
  const leftNumber = numericIdentity(leftIdentity)
  const rightNumber = numericIdentity(rightIdentity)
  if (leftNumber !== undefined && rightNumber !== undefined && leftNumber !== rightNumber) {
    return leftNumber - rightNumber
  }
  return leftIdentity.localeCompare(rightIdentity)
}

function messageIdentity(message: ChatMessage): string {
  return message.timMsgKey || message.timMessageId || message.messageNo || message.clientMsgId
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

/**
 * 用已确认的远端快照校准本地发送队列。发送中的消息必须保留一个确认宽限期，
 * 超过宽限期仍不在远端时转为 failed，避免永久气泡又不静默丢消息。
 */
export function reconcilePrivateChatMessages(
  current: ChatMessage[],
  remote: ChatMessage[],
  now = Date.now(),
  graceMs = PENDING_MESSAGE_GRACE_MS,
): ChatMessage[] {
  const merged = mergePrivateChatMessages(current, remote)
  if (merged.length === 0) return merged
  let changed = false
  const next = merged.map(message => {
    if (message.sendStatus !== 'sending' || remote.some(remoteMessage => hasSameIdentity(message, remoteMessage))) return message
    const sentAt = Date.parse(message.sentAt)
    if (!Number.isFinite(sentAt) || now - sentAt < graceMs) return message
    changed = true
    return { ...message, sendStatus: 'failed' as const }
  })
  if (!changed) return merged
  return next
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
