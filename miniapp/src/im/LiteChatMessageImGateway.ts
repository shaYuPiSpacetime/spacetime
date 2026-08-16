import TencentCloudChat, {
  type Conversation as TencentConversation,
  type Message as TencentMessage,
} from '@tencentcloud/lite-chat/basic'
import {
  normalizeTimC2CConversationId,
  resolveTimC2CTargetUserId,
} from '../domain/messageRuntime'
import type { ChatMessage, ImCredentials, TimConversationSnapshot } from '../types/message'
import type {
  MessageHistoryPage,
  MessageImEvent,
  MessageImGateway,
  SendTextOptions,
} from './MessageImGateway'

type ChatSdk = ReturnType<typeof TencentCloudChat.create>

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeCustomPayload(message: TencentMessage) {
  const cloud = parseJsonObject(message.cloudCustomData)
  const data = parseJsonObject(message.payload?.data)
  return { ...cloud, ...data }
}

function normalizeMessage(message: TencentMessage): ChatMessage {
  const custom = normalizeCustomPayload(message)
  const customType = textOf(custom.messageType)
  const type =
    message.type === TencentCloudChat.TYPES.MSG_TEXT
      ? 'text'
      : customType === 'whisper_request'
        ? 'whisper'
        : customType === 'whisper_reply'
          ? 'whisper_reply'
          : 'system_tip'
  const content =
    type === 'text' ? textOf(message.payload?.text) : textOf(custom.content || message.payload?.description)
  const messageNo = textOf(custom.messageNo) || message.ID
  return {
    messageNo,
    clientMsgId: message.ID,
    conversationNo: message.conversationID,
    senderUserNo: message.from,
    direction: message.flow === 'out' ? 'outgoing' : 'incoming',
    type,
    content,
    sentAt: new Date(message.time * 1000).toISOString(),
    timeText: '',
    sendStatus:
      message.status === 'fail' ? 'failed' : message.status === 'unSend' ? 'sending' : 'sent',
    timMessageId: message.ID,
    timMsgKey: textOf((message as TencentMessage & { key?: string }).key) || message.ID,
  }
}

function conversationPreview(conversation: TencentConversation): string {
  const last = conversation.lastMessage || {}
  if (typeof last.messageForShow === 'string') return last.messageForShow
  if (typeof last.payload?.text === 'string') return last.payload.text
  return ''
}

/** 腾讯 LiteChat V4 标准适配器；原始 SDK 消息只保存在本实例内存用于失败重发。 */
export class LiteChatMessageImGateway implements MessageImGateway {
  private chat?: ChatSdk
  private sdkAppId?: number
  private currentUserId?: string
  private ready = false
  private rawMessages = new Map<string, TencentMessage>()
  private listeners = new Set<(event: MessageImEvent) => void>()
  private initializing?: Promise<void>

  initialize(credentials: ImCredentials): Promise<void> {
    if (
      this.chat &&
      this.sdkAppId === credentials.sdkAppId &&
      this.currentUserId === credentials.imUserId &&
      this.ready
    ) {
      return Promise.resolve()
    }

    if (this.initializing) return this.initializing

    const initializing = this.initializeInternal(credentials)
    this.initializing = initializing
    const clearInitializing = () => {
      if (this.initializing === initializing) this.initializing = undefined
    }
    void initializing.then(clearInitializing, clearInitializing)
    return initializing
  }

  private async initializeInternal(credentials: ImCredentials): Promise<void> {
    if (this.chat) await this.logout()
    this.sdkAppId = Number(credentials.sdkAppId)
    this.currentUserId = credentials.imUserId
    this.chat = TencentCloudChat.create({ SDKAppID: this.sdkAppId })
    this.attachEvents(this.chat)
    await this.chat.login({ userID: credentials.imUserId, userSig: credentials.userSig })
  }

  isReady(): boolean {
    return this.ready
  }

  async listConversations(): Promise<TimConversationSnapshot[]> {
    const chat = this.requireChat()
    const result = await chat.getConversationList()
    const list = (result?.data?.conversationList || []) as TencentConversation[]
    return list
      .filter(item => item.type === TencentCloudChat.TYPES.CONV_C2C)
      .map(item => ({
        timConversationId: item.conversationID,
        lastMessagePreview: conversationPreview(item),
        lastMessageAt: item.lastMessage?.lastTime
          ? new Date(Number(item.lastMessage.lastTime) * 1000).toISOString()
          : null,
        unreadCount: Number(item.unreadCount || 0),
      }))
  }

  async listHistory(timConversationId: string, cursor?: string): Promise<MessageHistoryPage> {
    const result = await this.requireChat().getMessageList({
      conversationID: normalizeTimC2CConversationId(timConversationId),
      nextReqMessageID: cursor,
    })
    const rawList = (result?.data?.messageList || []) as TencentMessage[]
    rawList.forEach(message => this.rawMessages.set(message.ID, message))
    return {
      list: rawList.filter(item => !item.isDeleted && !item.isRevoked).map(normalizeMessage),
      nextCursor: result?.data?.nextReqMessageID || undefined,
      isCompleted: Boolean(result?.data?.isCompleted),
    }
  }

  async sendText(
    timConversationId: string,
    content: string,
    _options: SendTextOptions = {},
  ): Promise<ChatMessage> {
    const normalized = content.trim()
    if (!normalized) throw new Error('消息内容不能为空')
    const chat = this.requireReadyChat()
    const message = chat.createTextMessage({
      to: resolveTimC2CTargetUserId(timConversationId),
      conversationType: TencentCloudChat.TYPES.CONV_C2C,
      payload: { text: normalized },
    })
    this.rawMessages.set(message.ID, message)
    this.emit({ type: 'conversation_updated', messages: [normalizeMessage(message)] })
    try {
      const result = await chat.sendMessage(message, {
        messageControlInfo: { excludedFromContentModeration: true },
      })
      const sent = (result?.data?.message || message) as TencentMessage
      this.rawMessages.set(sent.ID, sent)
      return normalizeMessage(sent)
    } catch {
      return normalizeMessage({ ...message, status: 'fail' })
    }
  }

  async retry(timConversationId: string, clientMsgId: string): Promise<ChatMessage> {
    const raw = this.rawMessages.get(clientMsgId)
    if (!raw) throw new Error('待重发消息已失效，请重新输入')
    const chat = this.requireReadyChat()
    const targetUserId = resolveTimC2CTargetUserId(timConversationId)
    const mustRecreate = raw.to !== targetUserId
    const candidate = mustRecreate
      ? chat.createTextMessage({
          to: targetUserId,
          conversationType: TencentCloudChat.TYPES.CONV_C2C,
          payload: { text: textOf(raw.payload?.text) },
        })
      : raw
    this.rawMessages.set(clientMsgId, candidate)
    const options = { messageControlInfo: { excludedFromContentModeration: true } }
    const result = mustRecreate
      ? await chat.sendMessage(candidate, options)
      : await chat.resendMessage(candidate, options)
    const sent = (result?.data?.message || candidate) as TencentMessage
    this.rawMessages.set(sent.ID, sent)
    const normalized = normalizeMessage(sent)
    return mustRecreate ? { ...normalized, clientMsgId } : normalized
  }

  async markRead(timConversationId: string): Promise<void> {
    await this.requireReadyChat().setMessageRead({
      conversationID: normalizeTimC2CConversationId(timConversationId),
    })
  }

  onEvent(listener: (event: MessageImEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async logout(): Promise<void> {
    const chat = this.chat
    this.ready = false
    this.rawMessages.clear()
    this.chat = undefined
    this.currentUserId = undefined
    if (chat) await chat.logout().catch(() => undefined)
  }

  private attachEvents(chat: ChatSdk) {
    chat.on(TencentCloudChat.EVENT.SDK_READY, () => {
      this.ready = true
      this.emit({ type: 'ready' })
    })
    chat.on(TencentCloudChat.EVENT.SDK_NOT_READY, () => {
      this.ready = false
      this.emit({ type: 'not_ready' })
    })
    chat.on(TencentCloudChat.EVENT.KICKED_OUT, () => {
      this.ready = false
      this.emit({ type: 'kicked_out' })
    })
    chat.on(TencentCloudChat.EVENT.MESSAGE_RECEIVED, event => {
      const rawList = (event?.data || []) as TencentMessage[]
      rawList.forEach(message => this.rawMessages.set(message.ID, message))
      this.emit({ type: 'message_received', messages: rawList.map(normalizeMessage) })
    })
    chat.on(TencentCloudChat.EVENT.CONVERSATION_LIST_UPDATED, () => {
      this.emit({ type: 'conversation_updated' })
    })
  }

  private emit(event: MessageImEvent) {
    this.listeners.forEach(listener => listener(event))
  }

  private requireChat(): ChatSdk {
    if (!this.chat) throw new Error('私信服务尚未初始化')
    return this.chat
  }

  private requireReadyChat(): ChatSdk {
    const chat = this.requireChat()
    if (!this.ready) throw new Error('私信服务连接中，请稍后重试')
    return chat
  }
}
