import { useMessageStore } from '../stores/messageStore'
import { get, post, request } from './request'
import { normalizeConversationStatus } from '../domain/messageRuntime'
import type {
  AssistantMessageItem,
  AssistantMessagePage,
  ImCredentials,
  MessageConversationBlockResult,
  MessageConversationDetail,
  MessageConversationItem,
  MessageConversationPage,
  MessageConversationReadResult,
  MessageHomeResponse,
  MessageReadBatchResult,
  MessageUnreadSummary,
  MessageWhisperDetail,
  MessageWhisperPage,
  SystemMessageItem,
  SystemMessagePage,
  WhisperCreateResponse,
  WhisperDirection,
  WhisperPrecheckResponse,
  WhisperReplyResponse,
} from '../types/message'

export interface WhisperPrecheckCommand {
  targetUserNo: string
  sourcePostNo?: string
  scene?: 'community_post' | 'profile' | 'recommendation' | 'message_home'
}

export interface WhisperCreateCommand extends WhisperPrecheckCommand {
  content: string
  quoteToken: string
}

export interface WhisperReplyCommand {
  requestId: string
  content: string
}

/** 兼容社区动态页面的既有类型名，字段已切换为真实报价契约。 */
export type RealWhisperPrecheckResult = WhisperPrecheckResponse

export const MESSAGE_REPORT_REASON_CODES = [
  'avatar_mismatch',
  'false_profile',
  'contact_disclosure',
  'marriage_agency',
  'spam_ad',
  'fraud',
  'harassment',
  'other',
] as const

export type MessageReportReasonCode = (typeof MESSAGE_REPORT_REASON_CODES)[number]

export interface MessageReportInput {
  clientReportId: string
  targetType: 'message' | 'conversation' | 'whisper'
  targetBizNo: string
  timConversationId?: string
  timMessageId?: string
  timMsgKey?: string
  reasonCode: MessageReportReasonCode
  extraText?: string
  sourceType?: string
  conversationNo?: string
  whisperNo?: string
  messageNo?: string
}

export interface MessageReportResult {
  reportNo: string
  status: string
  snapshotStatus: string | null
  createdTime: string | null
}

export interface MessageService {
  getImCredentials(): Promise<ImCredentials>
  getHome(): Promise<MessageHomeResponse>
  getUnreadSummary(): Promise<MessageUnreadSummary>
  listConversations(cursor?: string, size?: number): Promise<MessageConversationPage>
  getConversation(conversationNo: string): Promise<MessageConversationDetail>
  markConversationRead(
    conversationNo: string,
    lastMessageNo: string,
    timMessageId?: string,
    timMsgKey?: string,
  ): Promise<MessageConversationReadResult>
  blockConversation(
    conversationNo: string,
    sourceScene?: string,
  ): Promise<MessageConversationBlockResult>
  listWhispers(
    direction: WhisperDirection,
    cursor?: string,
    size?: number,
  ): Promise<MessageWhisperPage>
  getWhisper(whisperNo: string): Promise<MessageWhisperDetail>
  precheckWhisper(input: WhisperPrecheckCommand): Promise<WhisperPrecheckResponse>
  createWhisper(
    input: WhisperCreateCommand,
    idempotencyKey: string,
  ): Promise<WhisperCreateResponse>
  replyWhisper(
    whisperNo: string,
    input: WhisperReplyCommand,
    idempotencyKey: string,
  ): Promise<WhisperReplyResponse>
  readWhispers(whisperNos: string[]): Promise<MessageReadBatchResult>
  listAssistantMessages(cursor?: string, size?: number): Promise<AssistantMessagePage>
  readAssistantMessages(messageNos: string[]): Promise<MessageReadBatchResult>
  listSystemMessages(cursor?: string, size?: number): Promise<SystemMessagePage>
  readSystemMessages(noticeNos: string[]): Promise<MessageReadBatchResult>
  report(input: MessageReportInput): Promise<MessageReportResult>
}

function asStringId(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function normalizeConversation(item: MessageConversationItem): MessageConversationItem {
  return {
    ...item,
    conversationNo: asStringId(item.conversationNo),
    timConversationId: asStringId(item.timConversationId),
    conversationStatus: normalizeConversationStatus(item.conversationStatus),
    peerUser: { ...item.peerUser, userId: asStringId(item.peerUser?.userId) },
  }
}

export class RealMessageService implements MessageService {
  getImCredentials(): Promise<ImCredentials> {
    return get<ImCredentials>('/miniapp/im/credentials')
  }

  async getHome(): Promise<MessageHomeResponse> {
    const result = await get<MessageHomeResponse>('/miniapp/message/home')
    return {
      ...result,
      accessMode: result.accessMode === 'normal' ? 'normal' : 'restricted',
      recentConversationBindings: (result.recentConversationBindings || []).map(normalizeConversation),
    }
  }

  getUnreadSummary(): Promise<MessageUnreadSummary> {
    return get<MessageUnreadSummary>('/miniapp/message/unread-summary')
  }

  async listConversations(cursor?: string, size = 20): Promise<MessageConversationPage> {
    const result = await get<MessageConversationPage>('/miniapp/message/conversations', {
      cursor,
      size: Math.min(50, Math.max(1, size)),
    })
    return { ...result, list: (result.list || []).map(normalizeConversation) }
  }

  async getConversation(conversationNo: string): Promise<MessageConversationDetail> {
    const result = await get<MessageConversationDetail>(
      `/miniapp/message/conversations/${encodeURIComponent(conversationNo)}`,
    )
    return { ...result, ...normalizeConversation(result) }
  }

  markConversationRead(
    conversationNo: string,
    lastMessageNo: string,
    timMessageId?: string,
    timMsgKey?: string,
  ): Promise<MessageConversationReadResult> {
    return post<MessageConversationReadResult>(
      `/miniapp/message/conversations/${encodeURIComponent(conversationNo)}/read`,
      { lastMessageNo, timMessageId, timMsgKey },
    )
  }

  blockConversation(
    conversationNo: string,
    sourceScene = 'private_chat',
  ): Promise<MessageConversationBlockResult> {
    return post<MessageConversationBlockResult>(
      `/miniapp/message/conversations/${encodeURIComponent(conversationNo)}/block`,
      { sourceScene },
    )
  }

  listWhispers(
    direction: WhisperDirection,
    cursor?: string,
    size = 20,
  ): Promise<MessageWhisperPage> {
    return get<MessageWhisperPage>('/miniapp/message/whispers', {
      direction,
      cursor,
      size: Math.min(50, Math.max(1, size)),
    })
  }

  getWhisper(whisperNo: string): Promise<MessageWhisperDetail> {
    return get<MessageWhisperDetail>(
      `/miniapp/message/whispers/${encodeURIComponent(whisperNo)}`,
    )
  }

  precheckWhisper(input: WhisperPrecheckCommand): Promise<WhisperPrecheckResponse> {
    return post<WhisperPrecheckResponse>('/miniapp/message/whispers/precheck', { ...input })
  }

  createWhisper(
    input: WhisperCreateCommand,
    idempotencyKey: string,
  ): Promise<WhisperCreateResponse> {
    return request<WhisperCreateResponse>({
      url: '/miniapp/message/whispers',
      method: 'POST',
      data: { ...input },
      header: { 'Idempotency-Key': idempotencyKey },
    })
  }

  replyWhisper(
    whisperNo: string,
    input: WhisperReplyCommand,
    idempotencyKey: string,
  ): Promise<WhisperReplyResponse> {
    return request<WhisperReplyResponse>({
      url: `/miniapp/message/whispers/${encodeURIComponent(whisperNo)}/reply`,
      method: 'POST',
      data: { ...input },
      header: { 'Idempotency-Key': idempotencyKey },
    })
  }

  readWhispers(whisperNos: string[]): Promise<MessageReadBatchResult> {
    return post<MessageReadBatchResult>('/miniapp/message/whispers/read-batch', { whisperNos })
  }

  listAssistantMessages(cursor?: string, size = 20): Promise<AssistantMessagePage> {
    return get<AssistantMessagePage>('/miniapp/message/assistant/messages', { cursor, size })
  }

  readAssistantMessages(messageNos: string[]): Promise<MessageReadBatchResult> {
    return post<MessageReadBatchResult>('/miniapp/message/assistant/messages/read-batch', {
      messageNos,
    })
  }

  listSystemMessages(cursor?: string, size = 20): Promise<SystemMessagePage> {
    return get<SystemMessagePage>('/miniapp/message/system-messages', { cursor, size })
  }

  readSystemMessages(noticeNos: string[]): Promise<MessageReadBatchResult> {
    return post<MessageReadBatchResult>('/miniapp/message/system-messages/read-batch', { noticeNos })
  }

  report(input: MessageReportInput): Promise<MessageReportResult> {
    return post<MessageReportResult>('/miniapp/community/reports', { ...input })
  }
}

function mockUnread(): MessageUnreadSummary {
  const unread = useMessageStore.getState().unread
  const privateUnreadCount = unread.privateMessageCount
  const whisperUnreadCount = unread.whisperCount
  const assistantUnreadCount = unread.assistantCount
  const systemUnreadCount = unread.systemCount
  return {
    privateUnreadCount,
    whisperUnreadCount,
    assistantUnreadCount,
    systemUnreadCount,
    platformUnreadCount: whisperUnreadCount + assistantUnreadCount + systemUnreadCount,
    messageUnreadCount:
      privateUnreadCount + whisperUnreadCount + assistantUnreadCount + systemUnreadCount,
    snapshotTime: new Date().toISOString(),
  }
}

function mockConversation(item: ReturnType<typeof useMessageStore.getState>['conversations'][number]) {
  return {
    conversationNo: item.conversationNo,
    timConversationId: `C2C_${item.peerUserNo}`,
    conversationStatus: item.state === 'active' ? ('active' as const) : ('invalid' as const),
    peerUser: {
      userId: item.peerUserNo,
      nickname: item.peerNickname,
      avatarUrl: item.peerAvatarUrl,
      profileAvailable: true,
    },
    canEnterConversation: item.state === 'active',
    canSend: item.state === 'active',
    sendBlockedReason: item.state === 'active' ? null : '当前会话已失效',
    lastBusinessActivityTime: item.lastMessageAt,
  }
}

function mockWhisper(item: ReturnType<typeof useMessageStore.getState>['whispers'][number]) {
  const status =
    item.state === 'pending' || item.state === 'replied' || item.state === 'expired'
      ? item.state
      : ('invalid' as const)
  const peer = item.direction === 'received'
    ? {
        userId: item.applicantUserNo,
        nickname: item.applicantNickname,
        avatarUrl: item.applicantAvatarUrl,
        profileAvailable: true,
      }
    : {
        userId: item.receiverUserNo,
        nickname: item.receiverNickname,
        avatarUrl: item.receiverAvatarUrl,
        profileAvailable: true,
      }
  return {
    whisperNo: item.whisperNo,
    direction: item.direction,
    status,
    displayStatus: status === 'pending' ? '等待回复' : '申请已结束',
    peerUser: peer,
    timConversationId: `C2C_${peer.userId}`,
    requestTimMessageId: `mock-tim-${item.whisperNo}`,
    requestTimMsgKey: `mock-key-${item.whisperNo}`,
    payType: item.costCoins > 0 ? 'coin' : 'free',
    createdTime: item.createdAt,
    expireTime: null,
    canReply: item.direction === 'received' && status === 'pending',
    unread: item.direction === 'received' && status === 'pending',
  }
}

/** 设计验收场景使用的内存 Provider；真实运行不得自动回退到此实现。 */
export class MockMessageService implements MessageService {
  async getImCredentials(): Promise<ImCredentials> {
    return { sdkAppId: 0, imUserId: 'mock-user', userSig: 'mock-only', expireAt: '2099-01-01 00:00:00', protocolVersion: 1 }
  }

  async getHome(): Promise<MessageHomeResponse> {
    const state = useMessageStore.getState()
    return {
      accessMode: 'normal',
      restrictionPrompt: null,
      platformUnreadSummary: mockUnread(),
      fixedEntries: [
        { entryType: 'whisper', title: '悄悄话', lastMessagePreview: '有个小秘密想告诉你', unreadCount: state.unread.whisperCount, enabled: true },
        { entryType: 'assistant', title: '官方小助手', lastMessagePreview: state.home.rows.find(item => item.type === 'assistant')?.preview || '', unreadCount: state.unread.assistantCount, enabled: true },
        { entryType: 'system', title: '系统消息', lastMessagePreview: state.home.rows.find(item => item.type === 'system')?.preview || '', unreadCount: state.unread.systemCount, enabled: true },
      ],
      recentConversationBindings: state.conversations.map(mockConversation),
      recentConversationLimit: 3,
      hasMoreConversations: state.conversations.length > 3,
    }
  }

  async getUnreadSummary(): Promise<MessageUnreadSummary> {
    return mockUnread()
  }

  async listConversations(_cursor?: string, size = 20): Promise<MessageConversationPage> {
    const list = useMessageStore.getState().conversations.slice(0, size).map(mockConversation)
    return { list, nextCursor: null, hasMore: false }
  }

  async getConversation(conversationNo: string): Promise<MessageConversationDetail> {
    const item = useMessageStore.getState().conversations.find(row => row.conversationNo === conversationNo)
    if (!item) throw new Error('会话不存在')
    return {
      ...mockConversation(item),
      femaleProtection: null,
      safetyActions: ['report_user', 'block', 'block_and_report'],
    }
  }

  async markConversationRead(conversationNo: string, lastMessageNo: string) {
    useMessageStore.getState().markConversationRead(conversationNo)
    return { conversationNo, lastReadMessageNo: lastMessageNo, unreadCount: 0, readAt: new Date().toISOString() }
  }

  async blockConversation(conversationNo: string) {
    return { conversationNo, conversationStatus: 'blocked' as const, blockNo: `mock-block-${Date.now()}`, canSend: false }
  }

  async listWhispers(direction: WhisperDirection, _cursor?: string, size = 20): Promise<MessageWhisperPage> {
    const list = useMessageStore.getState().whispers
      .filter(item => item.direction === direction && item.visible && item.state === 'pending')
      .slice(0, size)
      .map(mockWhisper)
    return { list, nextCursor: null, hasMore: false }
  }

  async getWhisper(whisperNo: string): Promise<MessageWhisperDetail> {
    const item = useMessageStore.getState().whispers.find(row => row.whisperNo === whisperNo)
    if (!item) throw new Error('悄悄话不存在')
    const mapped = mockWhisper(item)
    return {
      whisperNo: mapped.whisperNo,
      direction: mapped.direction,
      status: mapped.status,
      displayStatus: mapped.displayStatus,
      peerUser: mapped.peerUser,
      content: item.content,
      contentAvailable: Boolean(item.content),
      requestMessageNo: `mock-message-${item.whisperNo}`,
      createdTime: mapped.createdTime,
      expireTime: mapped.expireTime,
      processedTime: null,
      remainingSeconds: null,
      conversationNo: null,
      actions: {
        canReply: mapped.canReply,
        canDelete: mapped.direction === 'received',
        canReportWhisperContent: Boolean(item.content),
        canReportPeerUser: true,
        canReverseApply: false,
        canEnterConversation: false,
        canOpenProfile: true,
      },
    }
  }

  async precheckWhisper(input: WhisperPrecheckCommand): Promise<WhisperPrecheckResponse> {
    return {
      canSend: true, allowed: true, reasonCode: null, reasonText: null, contentMaxLength: 60,
      payType: 'coin', coinAmount: 100, free: false, coinBalance: 520, freeWhisperRemain: 0,
      quoteToken: `mock-quote-${input.targetUserNo}`, quoteExpireTime: '2099-01-01 00:00:00',
      whisperExpireDays: 7, cooldownDays: 3, confirmText: '确认发送悄悄话',
      targetUserNo: input.targetUserNo, targetNickname: '对方', targetAvatarUrl: null,
    }
  }

  async createWhisper(input: WhisperCreateCommand, idempotencyKey: string): Promise<WhisperCreateResponse> {
    const record = useMessageStore.getState().createWhisper({ receiverUserNo: input.targetUserNo, content: input.content, costCoins: 100 }, idempotencyKey)
    return { whisperNo: record.whisperNo, sendStatus: 'sent', whisperStatus: 'pending', paymentStatus: 'paid', targetUserNo: input.targetUserNo, payType: 'coin', coinAmount: 100, coinBalance: 420, charged: true, createdTime: record.createdAt }
  }

  async replyWhisper(whisperNo: string): Promise<WhisperReplyResponse> {
    useMessageStore.getState().replyWhisper(whisperNo)
    return { whisperNo, status: 'replied', matchNo: `mock-match-${whisperNo}`, conversationNo: 'conversation-lin', replyMessageNo: `mock-reply-${whisperNo}`, replyTimMessageId: null, replyTimMsgKey: null, repliedTime: new Date().toISOString() }
  }

  async readWhispers(whisperNos: string[]): Promise<MessageReadBatchResult> {
    return { acceptedNos: whisperNos, updatedCount: whisperNos.length, platformUnreadSummary: mockUnread() }
  }

  async listAssistantMessages(): Promise<AssistantMessagePage> {
    const list: AssistantMessageItem[] = useMessageStore.getState().channels.assistant.map(item => ({ assistantMessageNo: item.messageNo, topicCode: 'mock', title: item.title, content: item.content, actionType: item.actionType || null, actionValue: item.actionUrl || null, readStatus: item.read ? 'read' : 'unread', createdTime: item.sentAt }))
    return { list, nextCursor: null, hasMore: false }
  }

  async readAssistantMessages(messageNos: string[]): Promise<MessageReadBatchResult> {
    useMessageStore.getState().markChannelRead('assistant')
    return { acceptedNos: messageNos, updatedCount: messageNos.length, platformUnreadSummary: mockUnread() }
  }

  async listSystemMessages(): Promise<SystemMessagePage> {
    const list: SystemMessageItem[] = useMessageStore.getState().channels.system.map(item => ({ noticeNo: item.messageNo, notificationType: 'mock', bizType: 'mock', title: item.title, content: item.content, readStatus: item.read ? 'read' : 'unread', jumpType: item.actionType === 'navigate' ? 'miniapp_page' : 'none', jumpValue: item.actionUrl || null, createdTime: item.sentAt }))
    return { list, nextCursor: null, hasMore: false, readAck: { noticeNos: list.filter(item => item.readStatus === 'unread').map(item => item.noticeNo) } }
  }

  async readSystemMessages(noticeNos: string[]): Promise<MessageReadBatchResult> {
    useMessageStore.getState().markChannelRead('system')
    return { acceptedNos: noticeNos, updatedCount: noticeNos.length, platformUnreadSummary: mockUnread() }
  }

  async report(input: MessageReportInput): Promise<MessageReportResult> {
    if (!input.clientReportId || !input.targetBizNo) throw new Error('举报目标不能为空')
    if (!MESSAGE_REPORT_REASON_CODES.includes(input.reasonCode)) throw new Error('请选择举报原因')
    if (Array.from(input.extraText || '').length > 400) throw new Error('举报描述不能超过 400 字')
    return { reportNo: `report-mock-${Date.now()}`, status: 'PENDING', snapshotStatus: 'complete', createdTime: new Date().toISOString() }
  }
}

export type MessageProvider = 'mock' | 'real'

export function createMessageService(provider: MessageProvider = 'real'): MessageService {
  return provider === 'mock' ? new MockMessageService() : new RealMessageService()
}

const configuredProvider =
  typeof process !== 'undefined' && process.env.MINIAPP_MESSAGE_PROVIDER === 'mock'
    ? 'mock'
    : 'real'

export const messageService = createMessageService(configuredProvider)
export const mockMessageService = createMessageService('mock')

/** 动态详情等真实业务入口继续复用的便捷函数。 */
export function precheckWhisper(input: WhisperPrecheckCommand): Promise<WhisperPrecheckResponse> {
  return messageService.precheckWhisper(input)
}

/** 创建悄悄话时，页面必须复用预检查返回的 quoteToken。 */
export function createWhisper(
  input: WhisperCreateCommand,
  idempotencyKey: string,
): Promise<WhisperCreateResponse> {
  return messageService.createWhisper(input, idempotencyKey)
}

/** 从平台有效会话白名单解析用户对应的业务会话号，禁止用 matchNo 冒充 conversationNo。 */
export async function findConversationByPeerUserId(
  peerUserId: string | number,
  service: MessageService = messageService,
): Promise<MessageConversationItem | undefined> {
  let cursor: string | undefined
  for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
    const page = await service.listConversations(cursor, 50)
    const matched = page.list.find(item => item.peerUser.userId === String(peerUserId))
    if (matched || !page.hasMore || !page.nextCursor) return matched
    cursor = page.nextCursor
  }
  return undefined
}
