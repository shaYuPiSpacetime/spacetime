import { useMessageStore } from '../stores/messageStore'
import { get, post, request } from './request'
import { normalizeConversationStatus } from '../domain/messageRuntime'
import {
  buildWhisperCreatePayload,
  buildWhisperPrecheckPayload,
  type WhisperSourceScene,
} from '../domain/whisperRuntime'
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
  WhisperBucket,
  WhisperDirection,
  WhisperHideResult,
  WhisperPrecheckResponse,
  WhisperReplyResponse,
} from '../types/message'

export interface WhisperPrecheckCommand {
  targetUserNo: string
  sourceScene: WhisperSourceScene
  sourceBizNo?: string
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

export const MESSAGE_REPORT_REASON_CODES: ReadonlyArray<string> = [
  'avatar_mismatch',
  'false_profile',
  'contact_disclosure',
  'marriage_agency',
  'spam_ad',
  'fraud',
  'harassment',
  'other',
] as const

export type MessageReportReasonCode = string

export interface CommunityReportReason {
  code: string
  label: string
  sort: number
}

export interface CommunityReportConfig {
  reportEntryEnabled: boolean
  reportReasons: CommunityReportReason[]
}

export interface MessageReportInput {
  clientReportId: string
  targetType: 'chat'
  targetId: string
  timConversationId?: string
  timMessageId?: string
  timMsgKey?: string
  reasonCode: MessageReportReasonCode
  extraText?: string
  evidenceImageUrls?: string[]
  sourceType: 'private_chat' | 'whisper'
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
    bucket: WhisperBucket,
    cursor?: string,
    size?: number,
  ): Promise<MessageWhisperPage>
  getWhisper(whisperNo: string): Promise<MessageWhisperDetail>
  hideWhisper(whisperNo: string): Promise<WhisperHideResult>
  hideReceivedWhispers(bucket: WhisperBucket): Promise<WhisperHideResult>
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
  getCommunityReportConfig(): Promise<CommunityReportConfig>
  report(input: MessageReportInput): Promise<MessageReportResult>
}

function asStringId(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function normalizePeerUser(item: MessageConversationItem['peerUser']) {
  return { ...item, userId: asStringId(item?.userId) }
}

function normalizeConversationItem(item: MessageConversationItem): MessageConversationItem {
  return {
    ...item,
    conversationNo: asStringId(item.conversationNo),
    peerUser: normalizePeerUser(item.peerUser),
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
      conversationPage: {
        ...result.conversationPage,
        list: (result.conversationPage?.list || []).map(normalizeConversationItem),
      },
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
    return { ...result, list: (result.list || []).map(normalizeConversationItem) }
  }

  async getConversation(conversationNo: string): Promise<MessageConversationDetail> {
    const result = await get<MessageConversationDetail>(
      `/miniapp/message/conversations/${encodeURIComponent(conversationNo)}`,
    )
    return {
      ...result,
      conversationNo: asStringId(result.conversationNo),
      timConversationId: result.timConversationId ? asStringId(result.timConversationId) : null,
      conversationStatus: normalizeConversationStatus(result.conversationStatus),
      accessMode: result.accessMode === 'normal' ? 'normal' : 'safety_readonly',
      peerUser: normalizePeerUser(result.peerUser),
    }
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
    sourceScene = 'chat_menu',
  ): Promise<MessageConversationBlockResult> {
    return post<MessageConversationBlockResult>(
      `/miniapp/message/conversations/${encodeURIComponent(conversationNo)}/block`,
      { sourceScene },
    )
  }

  listWhispers(
    direction: WhisperDirection,
    bucket: WhisperBucket,
    cursor?: string,
    size = 20,
  ): Promise<MessageWhisperPage> {
    return get<MessageWhisperPage>('/miniapp/message/whispers', {
      direction,
      bucket,
      cursor,
      size: Math.min(20, Math.max(1, size)),
    })
  }

  getWhisper(whisperNo: string): Promise<MessageWhisperDetail> {
    return get<MessageWhisperDetail>(
      `/miniapp/message/whispers/${encodeURIComponent(whisperNo)}`,
    )
  }

  hideWhisper(whisperNo: string): Promise<WhisperHideResult> {
    return request<WhisperHideResult>({
      url: `/miniapp/message/whispers/${encodeURIComponent(whisperNo)}`,
      method: 'DELETE',
    })
  }

  hideReceivedWhispers(bucket: WhisperBucket): Promise<WhisperHideResult> {
    return post<WhisperHideResult>('/miniapp/message/whispers/received/hide-all', { bucket })
  }

  precheckWhisper(input: WhisperPrecheckCommand): Promise<WhisperPrecheckResponse> {
    return post<WhisperPrecheckResponse>('/miniapp/message/whispers/precheck', {
      ...buildWhisperPrecheckPayload(input),
    })
  }

  createWhisper(
    input: WhisperCreateCommand,
    idempotencyKey: string,
  ): Promise<WhisperCreateResponse> {
    return request<WhisperCreateResponse>({
      url: '/miniapp/message/whispers',
      method: 'POST',
      data: { ...buildWhisperCreatePayload(input) },
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

  getCommunityReportConfig(): Promise<CommunityReportConfig> {
    return get<CommunityReportConfig>('/miniapp/community/config')
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
    messageUnreadCount:
      privateUnreadCount + whisperUnreadCount + assistantUnreadCount + systemUnreadCount,
    snapshotTime: new Date().toISOString(),
  }
}

function mockConversationItem(item: ReturnType<typeof useMessageStore.getState>['conversations'][number]): MessageConversationItem {
  return {
    conversationNo: item.conversationNo,
    peerUser: {
      userId: item.peerUserNo,
      nickname: item.peerNickname,
      avatarUrl: item.peerAvatarUrl,
      profileAvailable: true,
    },
    unreadCount: item.unreadCount,
    lastMessage: {
      messageNo: `mock-last-${item.conversationNo}`,
      messageType: 'text',
      direction: 'incoming',
      preview: item.lastMessagePreview,
      messageTime: item.lastMessageAt,
      sendStatus: 'sent',
    },
  }
}

function mockConversationDetail(item: ReturnType<typeof useMessageStore.getState>['conversations'][number]): MessageConversationDetail {
  const active = item.state === 'active'
  return {
    conversationNo: item.conversationNo,
    timConversationId: `C2Ctu_mock_${item.peerUserNo.replace(/[^a-zA-Z0-9_]/g, '_')}`,
    conversationStatus: active ? 'active' : 'invalid',
    accessMode: active ? 'normal' : 'safety_readonly',
    peerUser: mockConversationItem(item).peerUser,
    canEnterConversation: true,
    canSend: active,
    sendBlockedReason: active ? null : 'conversation_invalid',
    canReportChat: true,
    reportContext: {
      sourceType: 'private_chat',
      conversationNo: item.conversationNo,
      timConversationId: `C2Ctu_mock_${item.peerUserNo.replace(/[^a-zA-Z0-9_]/g, '_')}`,
    },
    femaleProtection: null,
    safetyActions: active
      ? ['report_chat', 'block', 'block_and_report']
      : ['report_chat'],
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
    const pendingWhispers = state.whispers.filter(
      item => item.direction === 'received' && item.visible && item.state === 'pending',
    )
    const assistant = state.channels.assistant[0]
    const system = state.channels.system[0]
    return {
      accessMode: 'normal',
      restrictionPrompt: null,
      unreadSummary: mockUnread(),
      whisperSummary: {
        pendingCount: pendingWhispers.length,
        recentAvatarUrls: pendingWhispers.slice(0, 3).map(item => item.applicantAvatarUrl),
      },
      likesMeSummary: {
        totalCount: state.unread.likedCount,
        newCount: state.unread.likedCount,
        latestAvatarUrl: null,
        latestLikedTime: null,
        latestDisplayStatus: 'blur',
      },
      assistantSummary: {
        unreadCount: state.unread.assistantCount,
        latestPreview: assistant?.content || null,
        latestTime: assistant?.sentAt || null,
      },
      systemSummary: {
        unreadCount: state.unread.systemCount,
        latestPreview: system?.content || null,
        latestTime: system?.sentAt || null,
      },
      conversationPage: {
        list: state.conversations.map(mockConversationItem),
        nextCursor: null,
        hasMore: false,
      },
    }
  }

  async getUnreadSummary(): Promise<MessageUnreadSummary> {
    return mockUnread()
  }

  async listConversations(_cursor?: string, size = 20): Promise<MessageConversationPage> {
    const list = useMessageStore.getState().conversations.slice(0, size).map(mockConversationItem)
    return { list, nextCursor: null, hasMore: false }
  }

  async getConversation(conversationNo: string): Promise<MessageConversationDetail> {
    const item = useMessageStore.getState().conversations.find(row => row.conversationNo === conversationNo)
    if (!item) throw new Error('会话不存在')
    return mockConversationDetail(item)
  }

  async markConversationRead(conversationNo: string, lastMessageNo: string) {
    useMessageStore.getState().markConversationRead(conversationNo)
    return { conversationNo, lastReadMessageNo: lastMessageNo, unreadCount: 0, readAt: new Date().toISOString() }
  }

  async blockConversation(conversationNo: string) {
    return { conversationNo, conversationStatus: 'blocked' as const, blockNo: `mock-block-${Date.now()}`, canSend: false }
  }

  async listWhispers(
    direction: WhisperDirection,
    bucket: WhisperBucket,
    _cursor?: string,
    size = 20,
  ): Promise<MessageWhisperPage> {
    const list = useMessageStore.getState().whispers
      .filter(item => item.direction === direction && item.visible)
      .filter(item => bucket === 'pending' ? item.state === 'pending' : item.state !== 'pending')
      .slice(0, size)
      .map(mockWhisper)
    return { direction, bucket, totalCount: list.length, list, nextCursor: null, hasMore: false }
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

  async hideWhisper(whisperNo: string): Promise<WhisperHideResult> {
    const item = useMessageStore.getState().whispers.find(row => row.whisperNo === whisperNo)
    if (!item || item.direction !== 'received') throw new Error('无权删除该悄悄话')
    useMessageStore.getState().hideWhisper(whisperNo)
    return {
      whisperNo,
      bucket: item.state === 'pending' ? 'pending' : 'processed',
      hiddenCount: 1,
      hiddenTime: new Date().toISOString(),
    }
  }

  async hideReceivedWhispers(bucket: WhisperBucket): Promise<WhisperHideResult> {
    let hiddenCount = 0
    useMessageStore.setState(state => ({
      whispers: state.whispers.map(item => {
        const sameBucket = bucket === 'pending' ? item.state === 'pending' : item.state !== 'pending'
        if (item.direction !== 'received' || !item.visible || !sameBucket) return item
        hiddenCount += 1
        return { ...item, visible: false }
      }),
    }))
    return {
      whisperNo: null,
      bucket,
      hiddenCount,
      hiddenTime: new Date().toISOString(),
    }
  }

  async precheckWhisper(input: WhisperPrecheckCommand): Promise<WhisperPrecheckResponse> {
    return {
      canSend: true, reasonCode: null, reasonText: null, contentMaxLength: 60,
      payType: 'coin', coinAmount: 100, free: false, coinBalance: 520, freeWhisperRemain: 0,
      quoteToken: `mock-quote-${input.targetUserNo}`, quoteExpireTime: '2099-01-01 00:00:00',
      whisperExpireDays: 7, cooldownDays: 3, confirmText: '确认发送悄悄话',
      targetUserNo: input.targetUserNo, targetNickname: '对方',
    }
  }

  async createWhisper(input: WhisperCreateCommand, idempotencyKey: string): Promise<WhisperCreateResponse> {
    const record = useMessageStore.getState().createWhisper({ receiverUserNo: input.targetUserNo, content: input.content, costCoins: 100 }, idempotencyKey)
    return {
      whisperNo: record.whisperNo,
      sendStatus: 'sent',
      whisperStatus: 'pending',
      paymentStatus: 'paid',
      targetUserNo: input.targetUserNo,
      payType: 'coin',
      coinAmount: 100,
      coinBalance: 420,
      charged: true,
      createdTime: record.createdAt,
      expireTime: '2099-01-08 00:00:00',
    }
  }

  async replyWhisper(whisperNo: string): Promise<WhisperReplyResponse> {
    useMessageStore.getState().replyWhisper(whisperNo)
    return { whisperNo, status: 'replied', matchNo: `mock-match-${whisperNo}`, conversationNo: 'conversation-lin', replyMessageNo: `mock-reply-${whisperNo}`, repliedTime: new Date().toISOString() }
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

  async getCommunityReportConfig(): Promise<CommunityReportConfig> {
    return {
      reportEntryEnabled: true,
      reportReasons: MESSAGE_REPORT_REASON_CODES.map((code, index) => ({
        code,
        label: [
          '头像非本人或无法看清正脸',
          '内容乱填/虚假资料',
          '资料透露联系方式',
          '婚托、饭托、酒托等',
          '垃圾营销广告',
          '虚假中奖消息、诈骗等',
          '聊天内容不适/骚扰',
          '其他',
        ][index],
        sort: (index + 1) * 10,
      })),
    }
  }

  async report(input: MessageReportInput): Promise<MessageReportResult> {
    if (!input.clientReportId || !input.targetId) throw new Error('举报目标不能为空')
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
