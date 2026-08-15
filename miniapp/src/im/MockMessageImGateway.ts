import type { MessageStoreHook } from '../stores/messageStore'
import { useMessageStore } from '../stores/messageStore'
import type { ChatMessage, ImCredentials, TimConversationSnapshot } from '../types/message'
import type {
  MessageHistoryPage,
  MessageImEvent,
  MessageImGateway,
  SendTextOptions,
} from './MessageImGateway'

/** 仅用于设计验收场景的内存 IM 网关。 */
export class MockMessageImGateway implements MessageImGateway {
  private ready = false
  private listeners = new Set<(event: MessageImEvent) => void>()

  constructor(private readonly store: MessageStoreHook = useMessageStore) {}

  async initialize(_credentials: ImCredentials): Promise<void> {
    this.ready = true
    this.emit({ type: 'ready' })
  }

  isReady(): boolean {
    return this.ready
  }

  async listConversations(): Promise<TimConversationSnapshot[]> {
    return this.store.getState().conversations.map(item => ({
      timConversationId: `C2C_${item.peerUserNo}`,
      lastMessagePreview: item.lastMessagePreview,
      lastMessageAt: item.lastMessageAt,
      unreadCount: item.unreadCount,
    }))
  }

  async listHistory(conversationNo: string): Promise<MessageHistoryPage> {
    const resolvedConversationNo = this.resolveConversationNo(conversationNo)
    return {
      list: this.store.getState().messagesByConversation[resolvedConversationNo] || [],
      isCompleted: true,
    }
  }

  async sendText(
    conversationNo: string,
    content: string,
    options: SendTextOptions = {},
  ): Promise<ChatMessage> {
    const message = this.store
      .getState()
      .sendText(this.resolveConversationNo(conversationNo), content, options)
    this.emit({ type: 'conversation_updated', messages: [message] })
    return message
  }

  async retry(conversationNo: string, clientMsgId: string): Promise<ChatMessage> {
    const message = this.store
      .getState()
      .retryMessage(this.resolveConversationNo(conversationNo), clientMsgId)
    this.emit({ type: 'conversation_updated', messages: [message] })
    return message
  }

  async markRead(conversationNo: string): Promise<void> {
    this.store.getState().markConversationRead(this.resolveConversationNo(conversationNo))
    this.emit({ type: 'conversation_updated' })
  }

  onEvent(listener: (event: MessageImEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async logout(): Promise<void> {
    this.ready = false
    this.emit({ type: 'not_ready' })
  }

  private emit(event: MessageImEvent) {
    this.listeners.forEach(listener => listener(event))
  }

  private resolveConversationNo(value: string): string {
    if (!value.startsWith('C2C_')) return value
    const peerUserNo = value.slice(4)
    return (
      this.store.getState().conversations.find(item => item.peerUserNo === peerUserNo)
        ?.conversationNo || value
    )
  }
}
