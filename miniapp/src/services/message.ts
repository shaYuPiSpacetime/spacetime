import { useMessageStore } from '../stores/messageStore'
import { request } from './request'
import type {
  ConversationState,
  ConversationSummary,
  CreateWhisperInput,
  MessageHome,
  OfficialChannelMessage,
  OfficialChannelType,
  UnreadSummary,
  WhisperDirection,
  WhisperRecord,
} from '../types/message'

export interface WhisperPrecheckResult {
  allowed: boolean
  contentMaxLength: number
  costCoins: number
  balanceCoins: number
  reason?: 'INSUFFICIENT_COINS' | 'NOT_CERTIFIED' | 'ALREADY_PENDING'
}

export interface WhisperPrecheckCommand {
  targetUserNo: string
  sourcePostNo?: string
  scene: 'community_post' | 'profile' | 'recommendation' | 'message_home'
}

export interface RealWhisperPrecheckResult {
  allowed: boolean
  reasonCode?: string
  reasonText?: string
  contentMaxLength: number
  coinAmount: number
  free: boolean
  coinBalance: number
  freeWhisperRemain: number
  targetUserNo: string
  targetNickname?: string
  targetAvatarUrl?: string
}

export interface WhisperCreateCommand extends WhisperPrecheckCommand {
  content: string
}

export interface WhisperCreateResult {
  whisperNo: string
  status: string
  targetUserNo: string
  content: string
  coinCost: number
  coinBalance: number
  charged: boolean
  paymentMethod: 'coin' | 'free_quota'
  createTime?: string
  expireTime?: string
}

/** 动态详情等真实业务入口使用后端预检查，费用只取运行时商业化配置。 */
export function precheckWhisper(input: WhisperPrecheckCommand): Promise<RealWhisperPrecheckResult> {
  return request<RealWhisperPrecheckResult>({
    url: '/miniapp/message/whispers/precheck',
    method: 'POST',
    data: { ...input },
  })
}

/** 创建悄悄话；幂等键由一次弹层会话生成并在重试时复用。 */
export function createWhisper(
  input: WhisperCreateCommand,
  idempotencyKey: string,
): Promise<WhisperCreateResult> {
  return request<WhisperCreateResult>({
    url: '/miniapp/message/whispers',
    method: 'POST',
    data: { ...input },
    header: { 'Idempotency-Key': idempotencyKey },
  })
}

export const MESSAGE_REPORT_REASON_CODES = [
  'AVATAR_MISMATCH',
  'FALSE_PROFILE',
  'CONTACT_DISCLOSURE',
  'MARRIAGE_AGENCY',
  'SPAM_AD',
  'FRAUD',
  'HARASSMENT',
  'OTHER',
] as const

export type MessageReportReasonCode = (typeof MESSAGE_REPORT_REASON_CODES)[number]

export interface MessageReportInput {
  targetType: 'conversation' | 'whisper' | 'channel_message'
  targetNo: string
  reasonCode: MessageReportReasonCode
  description?: string
  evidenceUrls?: string[]
}

/** 页面使用的统一服务契约；Mock 与未来真实接口实现保持相同签名。 */
export interface MessageService {
  getHome(): Promise<MessageHome>
  getUnreadSummary(): Promise<UnreadSummary>
  listConversations(): Promise<ConversationSummary[]>
  getConversationState(conversationNo: string): Promise<ConversationState>
  listWhispers(direction?: WhisperDirection): Promise<WhisperRecord[]>
  getWhisper(whisperNo: string): Promise<WhisperRecord>
  precheckWhisper(receiverUserNo: string): Promise<WhisperPrecheckResult>
  createWhisper(input: CreateWhisperInput, idempotencyKey: string): Promise<WhisperRecord>
  replyWhisper(whisperNo: string): Promise<WhisperRecord>
  ignoreWhisper(whisperNo: string): Promise<WhisperRecord>
  cancelWhisper(whisperNo: string): Promise<WhisperRecord>
  hideWhisper(whisperNo: string): Promise<void>
  batchHideWhispers(direction: WhisperDirection): Promise<void>
  listChannelMessages(channel: OfficialChannelType): Promise<OfficialChannelMessage[]>
  markChannelRead(channel: OfficialChannelType): Promise<void>
  report(input: MessageReportInput): Promise<{ reportNo: string }>
}

/** Mock Provider 完全由内存 Zustand 状态驱动，重新启动即恢复夹具。 */
export class MockMessageService implements MessageService {
  async getHome(): Promise<MessageHome> {
    return useMessageStore.getState().home
  }

  async getUnreadSummary(): Promise<UnreadSummary> {
    return useMessageStore.getState().unread
  }

  async listConversations(): Promise<ConversationSummary[]> {
    return useMessageStore.getState().conversations
  }

  async getConversationState(conversationNo: string): Promise<ConversationState> {
    const conversation = useMessageStore
      .getState()
      .conversations.find(item => item.conversationNo === conversationNo)
    if (!conversation) throw new Error('会话不存在')
    return conversation.state
  }

  async listWhispers(direction?: WhisperDirection): Promise<WhisperRecord[]> {
    return useMessageStore
      .getState()
      .whispers.filter(item => item.visible && (!direction || item.direction === direction))
  }

  async getWhisper(whisperNo: string): Promise<WhisperRecord> {
    const record = useMessageStore.getState().whispers.find(item => item.whisperNo === whisperNo)
    if (!record) throw new Error('悄悄话不存在')
    return record
  }

  async precheckWhisper(_receiverUserNo: string): Promise<WhisperPrecheckResult> {
    return {
      allowed: true,
      contentMaxLength: useMessageStore.getState().contentMaxLength,
      costCoins: 100,
      balanceCoins: 520,
    }
  }

  async createWhisper(input: CreateWhisperInput, idempotencyKey: string): Promise<WhisperRecord> {
    return useMessageStore.getState().createWhisper(input, idempotencyKey)
  }

  async replyWhisper(whisperNo: string): Promise<WhisperRecord> {
    return useMessageStore.getState().replyWhisper(whisperNo)
  }

  async ignoreWhisper(whisperNo: string): Promise<WhisperRecord> {
    return useMessageStore.getState().ignoreWhisper(whisperNo)
  }

  async cancelWhisper(whisperNo: string): Promise<WhisperRecord> {
    return useMessageStore.getState().cancelWhisper(whisperNo)
  }

  async hideWhisper(whisperNo: string): Promise<void> {
    useMessageStore.getState().hideWhisper(whisperNo)
  }

  async batchHideWhispers(direction: WhisperDirection): Promise<void> {
    useMessageStore.getState().batchHideWhispers(direction)
  }

  async listChannelMessages(channel: OfficialChannelType): Promise<OfficialChannelMessage[]> {
    return useMessageStore.getState().channels[channel]
  }

  async markChannelRead(channel: OfficialChannelType): Promise<void> {
    useMessageStore.getState().markChannelRead(channel)
  }

  async report(input: MessageReportInput): Promise<{ reportNo: string }> {
    if (!input.targetNo.trim()) throw new Error('举报目标不能为空')
    if (!MESSAGE_REPORT_REASON_CODES.includes(input.reasonCode)) throw new Error('请选择举报原因')
    if (Array.from(input.description || '').length > 400) throw new Error('举报描述不能超过 400 字')
    return { reportNo: `report-mock-${Date.now()}` }
  }
}

export type MessageProvider = 'mock' | 'real'

/** 真实 Provider 未在本轮实现，避免页面在误配置时静默使用错误数据源。 */
export function createMessageService(provider: MessageProvider = 'mock'): MessageService {
  if (provider === 'real') {
    throw new Error('消息真实 Provider 尚未接入，请将 MINIAPP_MESSAGE_PROVIDER 配置为 mock')
  }
  return new MockMessageService()
}

const configuredProvider =
  typeof process !== 'undefined' && process.env.MINIAPP_MESSAGE_PROVIDER === 'real'
    ? 'real'
    : 'mock'

export const messageService = createMessageService(configuredProvider)
