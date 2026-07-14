import type { StoreApi, UseBoundStore } from 'zustand'
import type { MessageStore } from '../stores/messageStore'
import { useMessageStore } from '../stores/messageStore'
import type { ChatMessage } from '../types/message'
import type { MessageImGateway, SendMessageOptions } from './MessageImGateway'

type MessageStoreAccessor = Pick<UseBoundStore<StoreApi<MessageStore>>, 'getState'>

/** 使用统一 Mock Store 的 IM 网关实现。 */
export class MockMessageImGateway implements MessageImGateway {
  constructor(private readonly store: MessageStoreAccessor = useMessageStore) {}

  async listHistory(conversationNo: string): Promise<ChatMessage[]> {
    return [...(this.store.getState().messagesByConversation[conversationNo] || [])]
  }

  async sendText(
    conversationNo: string,
    content: string,
    options: SendMessageOptions = {}
  ): Promise<ChatMessage> {
    return this.store.getState().sendText(conversationNo, content, options)
  }

  async retry(conversationNo: string, clientMsgId: string): Promise<ChatMessage> {
    return this.store.getState().retryMessage(conversationNo, clientMsgId)
  }

  async markRead(conversationNo: string): Promise<void> {
    this.store.getState().markConversationRead(conversationNo)
  }
}
