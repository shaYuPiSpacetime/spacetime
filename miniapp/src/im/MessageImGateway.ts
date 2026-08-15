import type {
  ChatMessage,
  ImCredentials,
  TimConversationSnapshot,
} from '../types/message'

export interface SendTextOptions {
  shouldFail?: boolean
  replyToClientMsgId?: string
}

export interface MessageHistoryPage {
  list: ChatMessage[]
  nextCursor?: string
  isCompleted: boolean
}

export type MessageImEventType =
  | 'ready'
  | 'not_ready'
  | 'message_received'
  | 'conversation_updated'
  | 'kicked_out'

export interface MessageImEvent {
  type: MessageImEventType
  messages?: ChatMessage[]
}

/** 页面只能依赖标准化网关，不接触腾讯原始消息对象。 */
export interface MessageImGateway {
  initialize(credentials: ImCredentials): Promise<void>
  isReady(): boolean
  listConversations(): Promise<TimConversationSnapshot[]>
  listHistory(timConversationId: string, cursor?: string): Promise<MessageHistoryPage>
  sendText(
    timConversationId: string,
    content: string,
    options?: SendTextOptions,
  ): Promise<ChatMessage>
  retry(timConversationId: string, clientMsgId: string): Promise<ChatMessage>
  markRead(timConversationId: string): Promise<void>
  onEvent(listener: (event: MessageImEvent) => void): () => void
  logout(): Promise<void>
}
