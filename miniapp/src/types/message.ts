/** 消息首页入口类型。 */
export type MessageHomeEntryType =
  | 'whisper'
  | 'private'
  | 'liked'
  | 'assistant'
  | 'system'
  | 'conversation'

/** 消息首页双入口卡片。 */
export interface MessageHomeEntry {
  type: Extract<MessageHomeEntryType, 'whisper' | 'private'>
  title: string
  subtitle: string
  unreadCount: number
  avatarUrls: string[]
}

/** 消息首页普通行。 */
export interface MessageHomeRow {
  id: string
  type: Exclude<MessageHomeEntryType, 'whisper' | 'private'>
  title: string
  preview: string
  timeText: string
  unreadCount: number
  avatarUrl?: string
  conversationNo?: string
}

/** 消息首页聚合数据。 */
export interface MessageHome {
  whisperEntry: MessageHomeEntry
  privateEntry: MessageHomeEntry
  rows: MessageHomeRow[]
}

/** 私信会话状态。 */
export type ConversationState = 'active' | 'expired' | 'cancelled' | 'blocked'

/** 私信会话摘要。 */
export interface ConversationSummary {
  conversationNo: string
  peerUserNo: string
  peerNickname: string
  peerAvatarUrl: string
  lastMessagePreview: string
  lastMessageAt: string
  timeText: string
  unreadCount: number
  state: ConversationState
}

/** 私信发送状态。 */
export type MessageSendStatus = 'sending' | 'sent' | 'failed' | 'received'

/** 私信消息类型。 */
export type ChatMessageType = 'text' | 'match_notice' | 'system_notice'

/** 私信消息。 */
export interface ChatMessage {
  messageNo: string
  clientMsgId: string
  conversationNo: string
  senderUserNo: string
  direction: 'incoming' | 'outgoing' | 'system'
  type: ChatMessageType
  content: string
  sentAt: string
  timeText: string
  sendStatus: MessageSendStatus
  replyToClientMsgId?: string
}

/** 悄悄话列表方向。 */
export type WhisperDirection = 'received' | 'sent'

/** 悄悄话业务状态；列表可见性与此状态相互独立。 */
export type WhisperState = 'pending' | 'replied' | 'matched' | 'ignored' | 'expired' | 'cancelled'

/** 悄悄话时间线节点。 */
export interface WhisperTimelineNode {
  id: string
  type: 'created' | 'replied' | 'matched' | 'expired' | 'cancelled'
  title: string
  description?: string
  occurredAt: string
  timeText: string
  completed: boolean
}

/** 悄悄话记录。 */
export interface WhisperRecord {
  whisperNo: string
  direction: WhisperDirection
  state: WhisperState
  visible: boolean
  applicantUserNo: string
  applicantNickname: string
  applicantAvatarUrl: string
  receiverUserNo: string
  receiverNickname: string
  receiverAvatarUrl: string
  content: string
  createdAt: string
  timeText: string
  costCoins: number
  timeline: WhisperTimelineNode[]
}

/** 官方频道。 */
export type OfficialChannelType = 'assistant' | 'system'

/** 官方频道消息。 */
export interface OfficialChannelMessage {
  messageNo: string
  channel: OfficialChannelType
  title: string
  content: string
  actionText?: string
  actionType?: 'customer_service' | 'community_rules' | 'navigate'
  actionUrl?: string
  sentAt: string
  dateText: string
  read: boolean
}

/** 消息模块未读聚合。 */
export interface UnreadSummary {
  totalCount: number
  whisperCount: number
  privateMessageCount: number
  likedCount: number
  assistantCount: number
  systemCount: number
}

/** 创建悄悄话参数。 */
export interface CreateWhisperInput {
  receiverUserNo: string
  content: string
  costCoins: number
}

/** 消息模块 Mock 状态快照。 */
export interface MessageMockState {
  home: MessageHome
  conversations: ConversationSummary[]
  messagesByConversation: Record<string, ChatMessage[]>
  whispers: WhisperRecord[]
  channels: Record<OfficialChannelType, OfficialChannelMessage[]>
  unread: UnreadSummary
  contentMaxLength: number
  idempotencyWhisperNos: Record<string, string>
}
