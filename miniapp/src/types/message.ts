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
export type ChatMessageType =
  | 'text'
  | 'whisper'
  | 'whisper_reply'
  | 'system_tip'
  | 'match_notice'
  | 'system_notice'

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
  timMessageId?: string
  timMsgKey?: string
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

/** 以下类型严格对应 PRD-03 mobile-api-handoff 的真实移动端契约。 */
export type MessageAccessMode = 'normal' | 'restricted'
export type ConversationStatus = 'active' | 'blocked' | 'invalid'
export type ApiWhisperStatus = 'pending' | 'replied' | 'expired' | 'invalid'
export type ApiReadStatus = 'read' | 'unread'
export type WhisperBucket = 'pending' | 'processed'

export interface MessageUnreadSummary {
  privateUnreadCount: number
  whisperUnreadCount: number
  assistantUnreadCount: number
  systemUnreadCount: number
  messageUnreadCount: number
  snapshotTime: string
}

export interface MessagePeerUser {
  userId: string
  nickname: string | null
  avatarUrl: string | null
  profileAvailable: boolean
}

export interface MessageLastMessage {
  messageNo: string
  messageType: 'text' | 'whisper' | 'whisper_reply' | 'system_tip' | string
  direction: 'incoming' | 'outgoing'
  preview: string | null
  messageTime: string
  sendStatus: 'queued' | 'sent' | 'failed' | string
}

export interface MessageConversationItem {
  conversationNo: string
  peerUser: MessagePeerUser
  unreadCount: number
  lastMessage?: MessageLastMessage | null
}

export interface MessageConversationPage {
  list: MessageConversationItem[]
  nextCursor: string | null
  hasMore: boolean
}

export interface MessageFemaleProtection {
  enabled: boolean
  waitingForFemaleFirstMessage: boolean
  protectionUntil: string | null
}

export interface MessageReportContext {
  sourceType: 'private_chat'
  conversationNo: string
  timConversationId: string | null
}

export interface MessageConversationDetail {
  conversationNo: string
  timConversationId: string | null
  conversationStatus: ConversationStatus
  accessMode: 'normal' | 'safety_readonly'
  peerUser: MessagePeerUser
  canEnterConversation: boolean
  canSend: boolean
  sendBlockedReason: string | null
  canReportChat: boolean
  reportContext: MessageReportContext | null
  femaleProtection: MessageFemaleProtection | null
  safetyActions: string[]
}

export interface MessageWhisperSummary {
  pendingCount: number
  recentAvatarUrls: string[]
}

export interface MessageLikesMeSummary {
  totalCount: number
  newCount: number
  latestAvatarUrl: string | null
  latestLikedTime: string | null
  latestDisplayStatus: 'clear' | 'blur' | null
}

export interface MessageChannelSummary {
  unreadCount: number
  latestPreview: string | null
  latestTime: string | null
}

export interface MessageHomeResponse {
  accessMode: MessageAccessMode
  restrictionPrompt: string | null
  unreadSummary: MessageUnreadSummary
  whisperSummary: MessageWhisperSummary
  likesMeSummary: MessageLikesMeSummary
  assistantSummary: MessageChannelSummary
  systemSummary: MessageChannelSummary
  conversationPage: MessageConversationPage
}

export interface MessageConversationReadResult {
  conversationNo: string
  lastReadMessageNo: string
  unreadCount: number
  readAt: string
}

export interface MessageConversationBlockResult {
  conversationNo: string
  conversationStatus: ConversationStatus
  blockNo: string
  canSend: boolean
}

export interface MessageWhisperItem {
  whisperNo: string
  direction: WhisperDirection
  status: ApiWhisperStatus
  displayStatus: string
  peerUser: MessagePeerUser
  payType: string | null
  createdTime: string
  expireTime: string | null
  canReply: boolean
  unread: boolean | null
}

export interface MessageWhisperPage {
  direction: WhisperDirection
  bucket: WhisperBucket
  totalCount: number
  list: MessageWhisperItem[]
  nextCursor: string | null
  hasMore: boolean
}

export interface WhisperHideResult {
  whisperNo?: string | null
  bucket: WhisperBucket
  hiddenCount: number
  hiddenTime: string
}

export interface MessageWhisperActions {
  canReply: boolean
  canDelete: boolean
  canReportWhisperContent: boolean
  canReportPeerUser: boolean
  canReverseApply: boolean
  canEnterConversation: boolean
  canOpenProfile: boolean
}

export interface MessageWhisperDetail {
  whisperNo: string
  direction: WhisperDirection
  status: ApiWhisperStatus
  displayStatus: string
  peerUser: MessagePeerUser
  content: string | null
  contentAvailable: boolean
  requestMessageNo: string | null
  createdTime: string
  expireTime: string | null
  processedTime: string | null
  remainingSeconds: number | null
  conversationNo: string | null
  actions: MessageWhisperActions
}

export interface WhisperPrecheckResponse {
  canSend: boolean
  reasonCode: string | null
  reasonText: string | null
  contentMaxLength: number
  payType: string
  coinAmount: number
  free: boolean
  coinBalance: number
  freeWhisperRemain: number
  quoteToken: string | null
  quoteExpireTime: string | null
  whisperExpireDays: number
  cooldownDays: number
  confirmText: string
  targetUserNo: string
  targetNickname: string | null
}

export interface WhisperCreateResponse {
  whisperNo: string
  sendStatus: 'sending' | 'sent' | 'failed'
  whisperStatus: ApiWhisperStatus | null
  paymentStatus: 'paid' | 'refunding' | 'refunded'
  targetUserNo: string
  payType: 'vip_free' | 'coin'
  coinAmount: number
  coinBalance: number
  charged: boolean
  createdTime: string
  expireTime: string
}

export interface WhisperReplyResponse {
  whisperNo: string
  status: ApiWhisperStatus
  matchNo: string
  conversationNo: string
  replyMessageNo: string
  repliedTime: string
}

export interface MessageReadBatchResult {
  acceptedNos: string[]
  updatedCount: number
  platformUnreadSummary: MessageUnreadSummary
}

export interface AssistantMessageItem {
  assistantMessageNo: string
  topicCode: string
  title: string
  content: string
  actionType: string | null
  actionValue: string | null
  readStatus: ApiReadStatus
  createdTime: string
}

export interface AssistantMessagePage {
  list: AssistantMessageItem[]
  nextCursor: string | null
  hasMore: boolean
}

export interface SystemMessageItem {
  noticeNo: string
  notificationType: string
  bizType: string
  title: string
  content: string
  readStatus: ApiReadStatus
  jumpType: string | null
  jumpValue: string | null
  createdTime: string
}

export interface SystemMessagePage {
  list: SystemMessageItem[]
  nextCursor: string | null
  hasMore: boolean
  readAck: { noticeNos: string[] }
}

export interface ImCredentials {
  sdkAppId: number
  imUserId: string
  userSig: string
  expireAt: string
  protocolVersion: number
}

export interface TimConversationSnapshot {
  timConversationId: string
  lastMessagePreview: string
  lastMessageAt: string | null
  unreadCount: number
}
