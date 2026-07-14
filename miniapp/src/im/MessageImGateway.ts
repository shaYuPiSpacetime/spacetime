import type { ChatMessage } from '../types/message'

export interface SendMessageOptions {
  shouldFail?: boolean
  replyToClientMsgId?: string
}

/** 页面只依赖此网关，后续 LiteChat 接入不改变页面领域模型。 */
export interface MessageImGateway {
  listHistory(conversationNo: string): Promise<ChatMessage[]>
  sendText(
    conversationNo: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<ChatMessage>
  retry(conversationNo: string, clientMsgId: string): Promise<ChatMessage>
  markRead(conversationNo: string): Promise<void>
}
