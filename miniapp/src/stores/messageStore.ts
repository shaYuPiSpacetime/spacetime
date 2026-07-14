import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { createInitialMessageState } from '../mocks/message/fixtures'
import type {
  ChatMessage,
  CreateWhisperInput,
  MessageMockState,
  OfficialChannelType,
  WhisperDirection,
  WhisperRecord,
  WhisperState,
} from '../types/message'

let clientMessageSequence = 0
let whisperSequence = 0

interface SendTextOptions {
  shouldFail?: boolean
  replyToClientMsgId?: string
}

export interface MessageStoreActions {
  reset: () => void
  sendText: (conversationNo: string, content: string, options?: SendTextOptions) => ChatMessage
  retryMessage: (conversationNo: string, clientMsgId: string) => ChatMessage
  markConversationRead: (conversationNo: string) => void
  hideWhisper: (whisperNo: string) => void
  batchHideWhispers: (direction: WhisperDirection) => void
  createWhisper: (input: CreateWhisperInput, idempotencyKey: string) => WhisperRecord
  replyWhisper: (whisperNo: string) => WhisperRecord
  ignoreWhisper: (whisperNo: string) => WhisperRecord
  cancelWhisper: (whisperNo: string) => WhisperRecord
  markChannelRead: (channel: OfficialChannelType) => void
}

export type MessageStore = MessageMockState & MessageStoreActions
export type MessageStoreHook = UseBoundStore<StoreApi<MessageStore>>

function nowIso(): string {
  return new Date().toISOString()
}

function totalUnread(summary: Omit<MessageMockState['unread'], 'totalCount'>): number {
  return (
    summary.whisperCount +
    summary.privateMessageCount +
    summary.likedCount +
    summary.assistantCount +
    summary.systemCount
  )
}

function updateWhisperState(
  state: MessageStore,
  whisperNo: string,
  nextState: WhisperState
): WhisperRecord {
  const record = state.whispers.find(item => item.whisperNo === whisperNo)
  if (!record) {
    throw new Error('悄悄话不存在')
  }
  return { ...record, state: nextState }
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  ...createInitialMessageState(),

  reset: () => {
    clientMessageSequence = 0
    whisperSequence = 0
    set(createInitialMessageState())
  },

  sendText: (conversationNo, content, options = {}) => {
    const normalizedContent = content.trim()
    if (!normalizedContent) {
      throw new Error('消息内容不能为空')
    }
    if (!get().conversations.some(item => item.conversationNo === conversationNo)) {
      throw new Error('会话不存在')
    }

    clientMessageSequence += 1
    const clientMsgId = `client-local-${Date.now()}-${clientMessageSequence}`
    const message: ChatMessage = {
      messageNo: `mock-${clientMsgId}`,
      clientMsgId,
      conversationNo,
      senderUserNo: 'current-user',
      direction: 'outgoing',
      type: 'text',
      content: normalizedContent,
      sentAt: nowIso(),
      timeText: '刚刚',
      sendStatus: options.shouldFail ? 'failed' : 'sent',
      replyToClientMsgId: options.replyToClientMsgId,
    }

    set(state => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationNo]: [...(state.messagesByConversation[conversationNo] || []), message],
      },
      conversations: state.conversations.map(item =>
        item.conversationNo === conversationNo
          ? {
              ...item,
              lastMessagePreview: normalizedContent,
              lastMessageAt: message.sentAt,
              timeText: '刚刚',
            }
          : item
      ),
    }))
    return message
  },

  retryMessage: (conversationNo, clientMsgId) => {
    const existing = (get().messagesByConversation[conversationNo] || []).find(
      item => item.clientMsgId === clientMsgId
    )
    if (!existing) {
      throw new Error('待重发消息不存在')
    }
    if (existing.sendStatus !== 'failed') {
      return existing
    }

    const retried: ChatMessage = {
      ...existing,
      messageNo: `mock-retry-${clientMsgId}`,
      sendStatus: 'sent',
      sentAt: nowIso(),
      timeText: '刚刚',
    }
    set(state => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationNo]: (state.messagesByConversation[conversationNo] || []).map(item =>
          item.clientMsgId === clientMsgId ? retried : item
        ),
      },
    }))
    return retried
  },

  markConversationRead: conversationNo => {
    set(state => {
      const conversations = state.conversations.map(item =>
        item.conversationNo === conversationNo ? { ...item, unreadCount: 0 } : item
      )
      const privateMessageCount = conversations.reduce((sum, item) => sum + item.unreadCount, 0)
      const unreadWithoutTotal = {
        whisperCount: state.unread.whisperCount,
        privateMessageCount,
        likedCount: state.unread.likedCount,
        assistantCount: state.unread.assistantCount,
        systemCount: state.unread.systemCount,
      }
      return {
        conversations,
        home: {
          ...state.home,
          privateEntry: { ...state.home.privateEntry, unreadCount: privateMessageCount },
          rows: state.home.rows.map(item =>
            item.conversationNo === conversationNo ? { ...item, unreadCount: 0 } : item
          ),
        },
        unread: { ...unreadWithoutTotal, totalCount: totalUnread(unreadWithoutTotal) },
      }
    })
  },

  hideWhisper: whisperNo => {
    set(state => ({
      whispers: state.whispers.map(item =>
        item.whisperNo === whisperNo ? { ...item, visible: false } : item
      ),
    }))
  },

  batchHideWhispers: direction => {
    set(state => ({
      whispers: state.whispers.map(item =>
        item.direction === direction ? { ...item, visible: false } : item
      ),
    }))
  },

  createWhisper: (input, idempotencyKey) => {
    const state = get()
    if (!idempotencyKey.trim()) {
      throw new Error('Idempotency-Key 不能为空')
    }
    const existedWhisperNo = state.idempotencyWhisperNos[idempotencyKey]
    if (existedWhisperNo) {
      const existed = state.whispers.find(item => item.whisperNo === existedWhisperNo)
      if (existed) return existed
    }

    const normalizedContent = input.content.trim()
    if (!normalizedContent) {
      throw new Error('悄悄话内容不能为空')
    }
    if (normalizedContent.length > state.contentMaxLength) {
      throw new Error(`悄悄话内容不能超过 ${state.contentMaxLength} 字`)
    }

    whisperSequence += 1
    const createdAt = nowIso()
    const whisperNo = `whisper-local-${Date.now()}-${whisperSequence}`
    const receiver = state.conversations.find(item => item.peerUserNo === input.receiverUserNo)
    const record: WhisperRecord = {
      whisperNo,
      direction: 'sent',
      state: 'pending',
      visible: true,
      applicantUserNo: 'current-user',
      applicantNickname: '我',
      applicantAvatarUrl: '',
      receiverUserNo: input.receiverUserNo,
      receiverNickname: receiver?.peerNickname || '对方',
      receiverAvatarUrl: receiver?.peerAvatarUrl || '',
      content: normalizedContent,
      createdAt,
      timeText: '刚刚',
      costCoins: input.costCoins,
      timeline: [
        {
          id: `timeline-${whisperNo}`,
          type: 'created',
          title: '已申请认识对方',
          description: '等待对方回复',
          occurredAt: createdAt,
          timeText: '刚刚',
          completed: true,
        },
      ],
    }

    set(current => ({
      whispers: [record, ...current.whispers],
      idempotencyWhisperNos: { ...current.idempotencyWhisperNos, [idempotencyKey]: whisperNo },
    }))
    return record
  },

  replyWhisper: whisperNo => {
    const updated = updateWhisperState(get(), whisperNo, 'replied')
    set(state => ({
      whispers: state.whispers.map(item => (item.whisperNo === whisperNo ? updated : item)),
    }))
    return updated
  },

  ignoreWhisper: whisperNo => {
    const updated = updateWhisperState(get(), whisperNo, 'ignored')
    set(state => ({
      whispers: state.whispers.map(item => (item.whisperNo === whisperNo ? updated : item)),
    }))
    return updated
  },

  cancelWhisper: whisperNo => {
    const updated = updateWhisperState(get(), whisperNo, 'cancelled')
    set(state => ({
      whispers: state.whispers.map(item => (item.whisperNo === whisperNo ? updated : item)),
    }))
    return updated
  },

  markChannelRead: channel => {
    set(state => {
      const channels = {
        ...state.channels,
        [channel]: state.channels[channel].map(item => ({ ...item, read: true })),
      }
      const unreadWithoutTotal = {
        whisperCount: state.unread.whisperCount,
        privateMessageCount: state.unread.privateMessageCount,
        likedCount: state.unread.likedCount,
        assistantCount: channel === 'assistant' ? 0 : state.unread.assistantCount,
        systemCount: channel === 'system' ? 0 : state.unread.systemCount,
      }
      return {
        channels,
        home: {
          ...state.home,
          rows: state.home.rows.map(item =>
            item.type === channel ? { ...item, unreadCount: 0 } : item
          ),
        },
        unread: { ...unreadWithoutTotal, totalCount: totalUnread(unreadWithoutTotal) },
      }
    })
  },
}))
