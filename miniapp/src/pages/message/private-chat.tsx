import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  createKeyedSingleFlight,
  formatPrivateChatTime,
  isReadCursorNotFoundError,
  isTimAccountMissingError,
  resolveConversationReadCursor,
  resolveConversationSendBlockedReason,
  resolveMessageError,
  waitForMessageGatewayReady,
  withMessageTimeout,
} from '@/domain/messageRuntime'
import { createWhisperIdempotencyCache, resolveWhisperErrorMessage } from '@/domain/whisperRuntime'
import { loadMessageImGateway } from '@/im/loadMessageImGateway'
import type { MessageImEvent, MessageImGateway } from '@/im/MessageImGateway'
import { messageService, mockMessageService } from '@/services/message'
import { messagePlatformRuntime } from '@/services/messagePlatformRuntime'
import type { ChatMessage, MessageConversationDetail } from '@/types/message'
import { DotsButton, MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

function messageMergeKey(message: ChatMessage): string {
  return message.messageNo || message.timMessageId || message.clientMsgId
}

function isSameMessage(left: ChatMessage, right: ChatMessage): boolean {
  return Boolean(
    (left.messageNo && right.messageNo && left.messageNo === right.messageNo)
    || (left.timMessageId && right.timMessageId && left.timMessageId === right.timMessageId)
    || (left.clientMsgId && right.clientMsgId && left.clientMsgId === right.clientMsgId),
  )
}

function messageAnchorId(message: ChatMessage): string {
  const stable = messageMergeKey(message).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)
  return `chat-message-${stable}`
}

function upsertMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const merged = [...current]
  incoming.forEach(item => {
    const index = merged.findIndex(currentItem => isSameMessage(currentItem, item))
    if (index >= 0) {
      const previous = merged[index]
      merged[index] = {
        ...previous,
        ...item,
        // 并发请求可能乱序返回，保留本地点击发送时刻，避免气泡因回执先后而跳位。
        sentAt: previous.clientMsgId === item.clientMsgId ? previous.sentAt : item.sentAt,
      }
    } else merged.push(item)
  })
  return merged.sort((left, right) => left.sentAt.localeCompare(right.sentAt))
}

function createClientReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const DETAIL_TIMEOUT_MS = 8_000
const CONNECTION_TIMEOUT_MS = 25_000
const HISTORY_TIMEOUT_MS = 10_000
const SEND_TIMEOUT_MS = 15_000

export default function PrivateChatPage() {
  const router = useRouter()
  const pendingWhisperNo = router.params.pendingWhisperNo || ''
  if (pendingWhisperNo) {
    return <PendingWhisperChat pendingWhisperNo={pendingWhisperNo} />
  }
  return <EstablishedPrivateChatPage />
}

function PendingWhisperChat({ pendingWhisperNo }: { pendingWhisperNo: string }) {
  const router = useRouter()
  const isMockScene = Boolean(router.params.mockScene)
  const service = isMockScene ? mockMessageService : messageService
  const nickname = router.params.nickname ? decodeURIComponent(router.params.nickname) : '私信'
  const avatar = router.params.avatar ? decodeURIComponent(router.params.avatar) : MESSAGE_AVATAR
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [createdConversationNo, setCreatedConversationNo] = useState('')
  const [navigationMessage, setNavigationMessage] = useState('')
  const idempotencyCache = useRef(createWhisperIdempotencyCache()).current

  const enterCreatedConversation = async (conversationNo: string) => {
    if (!isMockScene) await messagePlatformRuntime.onForeground()
    await Taro.redirectTo({
      url: `/pages/message/private-chat?conversationNo=${encodeURIComponent(conversationNo)}${isMockScene ? '&mockScene=private-chat-default' : ''}`,
    })
  }

  const handleCreatedConversationNavigationFailure = () => {
    const message = '回复已发送，请点击“进入私信”继续'
    setNavigationMessage(message)
    void Taro.showToast({ title: message, icon: 'none' })
  }

  const retryEnterCreatedConversation = async () => {
    if (!createdConversationNo || sending) return
    setSending(true)
    setNavigationMessage('')
    try {
      await enterCreatedConversation(createdConversationNo)
    } catch {
      handleCreatedConversationNavigationFailure()
      setSending(false)
    }
  }

  const send = async () => {
    const content = inputValue.trim()
    if (!content || sending || createdConversationNo) return
    setSending(true)
    setErrorMessage('')
    setNavigationMessage('')
    let conversationNo = ''
    try {
      const requestId = idempotencyCache.get(`reply:${pendingWhisperNo}`, content)
      const result = await service.replyWhisper(
        pendingWhisperNo,
        { requestId, content },
        requestId,
      )
      if (!result.conversationNo) throw new Error('私信会话创建失败，请稍后重试')
      conversationNo = result.conversationNo
    } catch (error) {
      const message = resolveWhisperErrorMessage(error, '回复失败，请稍后重试')
      setErrorMessage(message)
      void Taro.showToast({ title: message, icon: 'none' })
      setSending(false)
      return
    }

    idempotencyCache.clear()
    setInputValue('')
    setCreatedConversationNo(conversationNo)
    try {
      await enterCreatedConversation(conversationNo)
    } catch {
      handleCreatedConversationNavigationFailure()
      setSending(false)
    }
  }

  return (
    <View className="message-page message-page--gray private-chat-page">
      <MessageNav title={nickname} avatarUrl={avatar} />
      <ScrollView scrollY className="private-chat-scroll" showScrollbar={false}>
        <View className="chat-safety-card">
          <View className="chat-match-banner">
            <Image className="chat-match-deco chat-match-deco--left" src={miniappOssIcons.messageChatSafetyDecoLeft} mode="aspectFit" />
            <Text>回复后双方将开启私信</Text>
            <Image className="chat-match-deco chat-match-deco--right" src={miniappOssIcons.messageChatSafetyDecoRight} mode="aspectFit" />
          </View>
          <Text className="chat-safety-title">聊天小贴士</Text>
          <Text className="chat-safety-line">建议相互信任后，再交换联系方式</Text>
          <Text className="chat-safety-line">警惕金钱往来，遇到骚扰请及时举报</Text>
        </View>
        {errorMessage ? <Text className="message-inline-error">{errorMessage}</Text> : null}
        <Text className="message-empty-copy">
          {navigationMessage || '输入第一条回复，发送后即可开始聊天'}
        </Text>
      </ScrollView>
      <View className="chat-input-bar">
        <Input
          className="chat-input"
          value={inputValue}
          disabled={sending || Boolean(createdConversationNo)}
          maxlength={500}
          placeholder="输入回复内容"
          adjustPosition
          cursorSpacing={12}
          focus
          onInput={event => setInputValue(event.detail.value)}
          onConfirm={() => void send()}
        />
        <View
          role="button"
          aria-label={createdConversationNo ? '进入私信' : '发送回复'}
          aria-disabled={sending || (!createdConversationNo && !inputValue.trim())}
          className={`chat-send-button${(createdConversationNo || inputValue.trim()) && !sending ? '' : ' chat-send-button--disabled'}`}
          onClick={() => void (createdConversationNo ? retryEnterCreatedConversation() : send())}
          style={{ minHeight: '44px' }}
        >
          <Text>{sending ? '发送中' : createdConversationNo ? '进入私信' : '发送'}</Text>
        </View>
      </View>
    </View>
  )
}

function EstablishedPrivateChatPage() {
  const router = useRouter()
  const isMockScene = Boolean(router.params.mockScene)
  const conversationNo = router.params.conversationNo || 'conversation-lin'
  const service = isMockScene ? mockMessageService : messageService
  const [detail, setDetail] = useState<MessageConversationDetail>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyCursor, setHistoryCursor] = useState<string>()
  const [historyCompleted, setHistoryCompleted] = useState(false)
  const [scrollTarget, setScrollTarget] = useState<string>()
  const [inputValue, setInputValue] = useState('')
  const [retryTarget, setRetryTarget] = useState<ChatMessage>()
  const [showActions, setShowActions] = useState(false)
  const [messageReportTarget, setMessageReportTarget] = useState<ChatMessage>()
  const [initialLoading, setInitialLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyAnchorId, setHistoryAnchorId] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const readAckKey = useRef('')
  const messagesRef = useRef<ChatMessage[]>([])
  const initialPositionedRef = useRef(false)
  const timConversationIdRef = useRef(isMockScene ? conversationNo : '')
  const gatewayRef = useRef<MessageImGateway>()
  const gatewayPromiseRef = useRef<Promise<MessageImGateway>>()
  const connectionPromiseRef = useRef<Promise<MessageImGateway>>()
  const unsubscribeGatewayRef = useRef<() => void>()
  const gatewayEventHandlerRef = useRef<(event: MessageImEvent) => void>(() => undefined)
  const loadSingleFlight = useRef(createKeyedSingleFlight()).current

  const timConversationId = isMockScene
    ? conversationNo
    : detail?.timConversationId || ''

  const requestScrollToLatest = useCallback(() => {
    // 历史消息先渲染，再切换已存在的底部锚点；重复进入同一会话也需要更新 scroll-into-view。
    Taro.nextTick(() => {
      setScrollTarget(current => current === 'chat-bottom-a' ? 'chat-bottom-b' : 'chat-bottom-a')
    })
  }, [])

  useEffect(() => {
    if (keyboardHeight > 0 && messages.length > 0) requestScrollToLatest()
  }, [keyboardHeight, messages.length, requestScrollToLatest])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (!historyAnchorId) return
    Taro.nextTick(() => setScrollTarget(historyAnchorId))
  }, [historyAnchorId])

  const acknowledgeRendered = useCallback(
    async (rendered: ChatMessage[]) => {
      const gatewayId = timConversationIdRef.current
      const gateway = gatewayRef.current
      if (!gateway || !gatewayId || rendered.length === 0) return
      const lastIncoming = [...rendered].reverse().find(item => item.direction === 'incoming')
      if (!lastIncoming) return
      const cursor = resolveConversationReadCursor(lastIncoming)
      if (!cursor.lastMessageNo && !cursor.timMessageId && !cursor.timMsgKey) return
      const ackKey = `${conversationNo}:${lastIncoming.messageNo || lastIncoming.timMessageId}`
      if (readAckKey.current === ackKey) return
      try {
        const [, platformRead] = await Promise.allSettled([
          gateway.markRead(gatewayId),
          service.markConversationRead(
            conversationNo,
            cursor.lastMessageNo,
            cursor.timMessageId,
            cursor.timMsgKey,
          ),
        ])
        if (platformRead.status === 'rejected') {
          if (!isReadCursorNotFoundError(platformRead.reason)) throw platformRead.reason
          // 历史 TIM 消息可能属于旧平台会话，或新消息尚未归档；TIM 已读回调会推进后端水位。
          // 本次不清本地未读，也不把此后台同步竞争显示成聊天故障。
        }
        readAckKey.current = ackKey
        if (!isMockScene) await messagePlatformRuntime.refreshUnread()
      } catch (error) {
        // 平台确认失败时保留后端未读真值，不在页面本地清零。
        setErrorMessage(error instanceof Error ? error.message : '已读状态同步失败')
      }
    },
    [conversationNo, isMockScene, service],
  )

  gatewayEventHandlerRef.current = event => {
    if (!event.messages?.length) return
    const currentTimConversationId = timConversationIdRef.current
    const relevant = event.messages.filter(
      item => item.conversationNo === currentTimConversationId || item.conversationNo === conversationNo,
    )
    if (!relevant.length) return
    setMessages(current => {
      const next = upsertMessages(current, relevant)
      setTimeout(() => void acknowledgeRendered(next), 0)
      return next
    })
  }

  const getGateway = useCallback(async (): Promise<MessageImGateway> => {
    if (gatewayRef.current) return gatewayRef.current
    if (!gatewayPromiseRef.current) {
      const gatewayPromise = loadMessageImGateway(isMockScene)
        .then(gateway => {
          gatewayRef.current = gateway
          unsubscribeGatewayRef.current?.()
          unsubscribeGatewayRef.current = gateway.onEvent(event => {
            gatewayEventHandlerRef.current(event)
          })
          return gateway
        })
        .catch(error => {
          if (gatewayPromiseRef.current === gatewayPromise) gatewayPromiseRef.current = undefined
          throw error
        })
      gatewayPromiseRef.current = gatewayPromise
    }
    return gatewayPromiseRef.current
  }, [isMockScene])

  const ensureConnected = useCallback(async (): Promise<MessageImGateway> => {
    const existing = gatewayRef.current
    if (existing?.isReady()) return existing
    if (connectionPromiseRef.current) return connectionPromiseRef.current

    const connect = (async () => {
      const gateway = await withMessageTimeout(
        getGateway(),
        CONNECTION_TIMEOUT_MS,
        '私信组件加载超时，请重试',
      )
      if (!gateway.isReady()) {
        const credentials = await withMessageTimeout(
          service.getImCredentials(),
          DETAIL_TIMEOUT_MS,
          '私信凭证获取超时，请重试',
        )
        await withMessageTimeout(
          gateway.initialize(credentials),
          CONNECTION_TIMEOUT_MS,
          '私信连接超时，请重试',
        )
        await waitForMessageGatewayReady(
          gateway,
          CONNECTION_TIMEOUT_MS,
          '私信连接超时，请重试',
        )
      }
      return gateway
    })()
    connectionPromiseRef.current = connect
    const clearConnection = () => {
      if (connectionPromiseRef.current === connect) connectionPromiseRef.current = undefined
    }
    void connect.then(clearConnection, clearConnection)
    return connect
  }, [getGateway, service])

  const load = useCallback(
    () => loadSingleFlight.run(conversationNo, async () => {
      if (!initialPositionedRef.current) setInitialLoading(true)
      setErrorMessage('')
      try {
        const [nextDetail, gateway] = await Promise.all([
          withMessageTimeout(
            service.getConversation(conversationNo),
            DETAIL_TIMEOUT_MS,
            '会话加载超时，请重试',
          ),
          ensureConnected(),
        ])
        const gatewayId = isMockScene ? conversationNo : nextDetail.timConversationId
        setDetail(nextDetail)
        if (!nextDetail.canEnterConversation || !gatewayId) {
          timConversationIdRef.current = ''
          setMessages([])
          setHistoryCursor(undefined)
          setHistoryCompleted(true)
          initialPositionedRef.current = true
          setInitialLoading(false)
          return
        }
        timConversationIdRef.current = gatewayId
        const page = await withMessageTimeout(
          gateway.listHistory(gatewayId),
          HISTORY_TIMEOUT_MS,
          '聊天记录加载超时，请重试',
        )
        setMessages(current => upsertMessages(current, page.list))
        messagesRef.current = upsertMessages(messagesRef.current, page.list)
        setHistoryCursor(page.nextCursor)
        setHistoryCompleted(page.isCompleted)
        if (page.list.length > 0) {
          requestScrollToLatest()
          setTimeout(() => {
            initialPositionedRef.current = true
            setInitialLoading(false)
          }, 80)
        } else {
          initialPositionedRef.current = true
          setInitialLoading(false)
        }
        setTimeout(() => void acknowledgeRendered(page.list), 0)
      } catch (error) {
        const resolved = resolveMessageError(error)
        setErrorMessage(resolved.message)
        initialPositionedRef.current = true
        setInitialLoading(false)
      }
    }),
    [acknowledgeRendered, conversationNo, ensureConnected, isMockScene, loadSingleFlight, requestScrollToLatest, service],
  )

  useEffect(() => {
    readAckKey.current = ''
    initialPositionedRef.current = false
    setInitialLoading(true)
    setHistoryAnchorId('')
    timConversationIdRef.current = isMockScene ? conversationNo : ''
  }, [conversationNo, isMockScene])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => () => {
    unsubscribeGatewayRef.current?.()
    unsubscribeGatewayRef.current = undefined
  }, [])

  useDidShow(() => {
    if (!isMockScene) void load()
  })

  const loadEarlier = async () => {
    if (!timConversationId || historyCompleted || !historyCursor
      || initialLoading || historyLoading) return
    const anchor = messagesRef.current[0]
    setHistoryLoading(true)
    try {
      const gateway = await ensureConnected()
      const page = await withMessageTimeout(
        gateway.listHistory(timConversationId, historyCursor),
        HISTORY_TIMEOUT_MS,
        '聊天记录加载超时，请重试',
      )
      setMessages(current => {
        const next = upsertMessages(page.list, current)
        messagesRef.current = next
        return next
      })
      setHistoryCursor(page.nextCursor)
      setHistoryCompleted(page.isCompleted)
      if (anchor) setHistoryAnchorId(messageAnchorId(anchor))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '历史消息加载失败')
    } finally {
      setHistoryLoading(false)
    }
  }

  const canSend = Boolean(detail?.canSend)

  const send = async () => {
    const value = inputValue.trim()
    if (!value) return
    if (!detail || !timConversationId) {
      await Taro.showToast({ title: '会话正在加载，请稍后发送', icon: 'none' })
      return
    }
    if (!canSend) {
      await Taro.showToast({ title: resolveConversationSendBlockedReason(detail?.sendBlockedReason), icon: 'none' })
      return
    }
    setInputValue('')
    setErrorMessage('')
    try {
      const gateway = await ensureConnected()
      const message = await withMessageTimeout(
        gateway.sendText(timConversationId, value),
        SEND_TIMEOUT_MS,
        '消息发送超时，请稍后确认发送结果',
      )
      setMessages(current => upsertMessages(current, [message]))
      requestScrollToLatest()
      if (message.sendStatus === 'failed') setRetryTarget(message)
    } catch (error) {
      const resolved = resolveMessageError(error)
      setErrorMessage(resolved.message)
      await Taro.showToast({ title: resolved.message, icon: 'none' })
    }
  }

  const retry = async () => {
    if (!retryTarget || !timConversationId) return
    try {
      const gateway = await ensureConnected()
      const retried = await gateway.retry(timConversationId, retryTarget.clientMsgId)
      setMessages(current => upsertMessages(current, [retried]))
      setRetryTarget(undefined)
    } catch (error) {
      if (!isMockScene && isTimAccountMissingError(error)) {
        try {
          const recoveredDetail = await service.getConversation(conversationNo)
          const recoveredTimConversationId = recoveredDetail.timConversationId
          if (!recoveredTimConversationId) throw new Error('TIM 会话标识缺失')
          setDetail(recoveredDetail)
          timConversationIdRef.current = recoveredTimConversationId
          const gateway = await ensureConnected()
          const retried = await gateway.retry(
            recoveredTimConversationId,
            retryTarget.clientMsgId,
          )
          setMessages(current => upsertMessages(current, [retried]))
          setRetryTarget(undefined)
          return
        } catch {
          await Taro.showToast({ title: '私信账号同步失败，请重新进入会话', icon: 'none' })
          return
        }
      }
      await Taro.showToast({ title: '消息重发失败，请稍后重试', icon: 'none' })
    }
  }

  const openReport = (blocked = false, message?: ChatMessage) => {
    const clientReportId = createClientReportId()
    setShowActions(false)
    setMessageReportTarget(undefined)
    void Taro.navigateTo({
      url: `/pages/message/report?sourceType=private_chat&targetId=${encodeURIComponent(conversationNo)}&conversationNo=${encodeURIComponent(conversationNo)}&messageNo=${encodeURIComponent(message?.messageNo || '')}&timConversationId=${encodeURIComponent(detail?.reportContext?.timConversationId || detail?.timConversationId || '')}&timMessageId=${encodeURIComponent(message?.timMessageId || '')}&timMsgKey=${encodeURIComponent(message?.timMsgKey || '')}&clientReportId=${clientReportId}${blocked ? '&blocked=1' : ''}${isMockScene ? '&mockScene=report-form' : ''}`,
    })
  }

  const blockAndReport = async () => {
    setShowActions(false)
    try {
      const result = await service.blockConversation(conversationNo, 'chat_menu')
      setDetail(current => current ? { ...current, conversationStatus: result.conversationStatus, canSend: false, sendBlockedReason: '你已拉黑对方' } : current)
      openReport(true)
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '拉黑失败', icon: 'none' })
    }
  }

  return (
    <View className="message-page message-page--gray private-chat-page">
      <MessageNav
        title={detail?.peerUser.nickname || '私信'}
        avatarUrl={detail?.peerUser.avatarUrl || MESSAGE_AVATAR}
        rightContent={<DotsButton onClick={() => setShowActions(true)} />}
      />
      <ScrollView
        scrollY
        scrollAnchoring
        className="private-chat-scroll"
        style={{ height: keyboardHeight > 0 ? `calc(100vh - 137px - ${keyboardHeight}px)` : undefined }}
        showScrollbar={false}
        scrollIntoView={scrollTarget}
        onScrollToUpper={() => void loadEarlier()}
      >
        {initialLoading ? (
          <View className="private-chat-skeleton">
            <View className="private-chat-skeleton-card" />
            <View className="private-chat-skeleton-row" />
            <View className="private-chat-skeleton-row private-chat-skeleton-row--right" />
          </View>
        ) : null}
        <View className={`private-chat-content${initialLoading ? ' private-chat-content--preparing' : ''}`}>
        <View className="chat-history-loading">
          {historyLoading ? <Text>正在加载历史消息...</Text> : null}
        </View>
        <View className="chat-safety-card">
          <View className="chat-match-banner">
            <Image className="chat-match-deco chat-match-deco--left" src={miniappOssIcons.messageChatSafetyDecoLeft} mode="aspectFit" />
            <Text>配对成功开启聊天</Text>
            <Image className="chat-match-deco chat-match-deco--right" src={miniappOssIcons.messageChatSafetyDecoRight} mode="aspectFit" />
          </View>
          <Text className="chat-safety-title">聊天小贴士</Text>
          <Text className="chat-safety-line">1. 建议相互信任后，再交换联系方式</Text>
          <Text className="chat-safety-line">2. 警惕金钱往来，拒绝赌博/彩票/投资邀约</Text>
          <Text className="chat-safety-line">3. 遇到骚扰直接拉黑并举报，成家立业为你保驾护航</Text>
        </View>
        {errorMessage ? <Text className="message-inline-error" onClick={() => void load()}>{errorMessage}，点击重试</Text> : null}
        <View className="chat-messages">
          {messages.map((message, index) => {
            const time = formatPrivateChatTime(message.sentAt, messages[index - 1]?.sentAt)
            return (
              <View id={messageAnchorId(message)} className="chat-message-item" key={messageMergeKey(message)}>
                {time ? <Text className="chat-message-time">{time}</Text> : null}
                <View className={`chat-row chat-row--${message.direction === 'outgoing' ? 'outgoing' : 'incoming'}`}>
                  {message.direction !== 'outgoing' ? <Image className="chat-avatar" src={detail?.peerUser.avatarUrl || MESSAGE_AVATAR} mode="aspectFill" /> : null}
                  {message.sendStatus === 'failed' ? <View className="chat-failed" onClick={() => setRetryTarget(message)}><Text>!</Text></View> : null}
                  <View
                    className={`chat-bubble chat-bubble--${message.direction === 'outgoing' ? 'outgoing' : 'incoming'}`}
                    onLongPress={() => {
                      if (message.direction === 'incoming') setMessageReportTarget(message)
                    }}
                  >
                    <Text>{message.content}</Text>
                  </View>
                  {message.direction === 'outgoing' ? <Image className="chat-avatar" src={MESSAGE_AVATAR} mode="aspectFill" /> : null}
                </View>
              </View>
            )
          })}
          {!initialLoading && messages.length === 0 ? <Text className="message-empty-copy">暂无聊天记录</Text> : null}
        </View>
        <View id="chat-bottom-a" />
        <View id="chat-bottom-b" />
        </View>
      </ScrollView>

      <View
        className="chat-input-bar"
        style={{ bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined, paddingBottom: keyboardHeight > 0 ? '5px' : undefined }}
      >
        {!detail?.canSend && detail?.sendBlockedReason ? <Text className="chat-reply-label">{resolveConversationSendBlockedReason(detail.sendBlockedReason)}</Text> : null}
        <Input className="chat-input" value={inputValue} disabled={Boolean(detail && !detail.canSend)} maxlength={500} adjustPosition={false} holdKeyboard cursorSpacing={12} confirmType="send" confirmHold focus={inputFocused} onFocus={event => { setInputFocused(true); setKeyboardHeight(event.detail.height || 0); requestScrollToLatest() }} onBlur={() => { setInputFocused(false); setKeyboardHeight(0) }} onKeyboardHeightChange={event => setKeyboardHeight(Math.max(0, event.detail.height))} onInput={event => setInputValue(event.detail.value)} onConfirm={() => void send()} />
        <View className={`chat-send-button${canSend ? '' : ' chat-send-button--disabled'}`} onClick={() => void send()}><Text>发送</Text></View>
      </View>

      {showActions ? (
        <View className="message-sheet-mask" onClick={() => setShowActions(false)}>
          <View className="message-action-sheet" onClick={event => event.stopPropagation()}>
            {detail?.canReportChat ? <View className="message-action-sheet-item" onClick={() => openReport(false)}><Text>举报</Text></View> : null}
            {detail?.safetyActions.includes('block_and_report') ? <View className="message-action-sheet-item message-action-sheet-item--danger" onClick={() => void blockAndReport()}><Text>拉黑并举报</Text></View> : null}
            <View className="message-action-sheet-gap" />
            <View className="message-action-sheet-item" onClick={() => setShowActions(false)}><Text>取消</Text></View>
          </View>
        </View>
      ) : null}

      {messageReportTarget ? (
        <View className="message-sheet-mask" onClick={() => setMessageReportTarget(undefined)}>
          <View className="message-action-sheet" onClick={event => event.stopPropagation()}>
            <View className="message-action-sheet-item message-action-sheet-item--danger" onClick={() => openReport(false, messageReportTarget)}><Text>举报这条消息</Text></View>
            <View className="message-action-sheet-gap" />
            <View className="message-action-sheet-item" onClick={() => setMessageReportTarget(undefined)}><Text>取消</Text></View>
          </View>
        </View>
      ) : null}

      {retryTarget ? (
        <View className="chat-dialog-mask">
          <View className="chat-retry-dialog">
            <Text className="chat-dialog-title">温馨提示</Text>
            <Text className="chat-dialog-copy">重发该消息?</Text>
            <View className="chat-dialog-actions">
              <View className="chat-dialog-button" onClick={() => setRetryTarget(undefined)}><Text>取消</Text></View>
              <View className="chat-dialog-button chat-dialog-button--primary" onClick={() => void retry()}><Text>重新发送</Text></View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}
