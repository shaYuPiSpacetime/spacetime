import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  createKeyedSingleFlight,
  isTimAccountMissingError,
  resolveConversationSendBlockedReason,
  resolveMessageError,
  withMessageTimeout,
} from '@/domain/messageRuntime'
import { loadMessageImGateway } from '@/im/loadMessageImGateway'
import type { MessageImEvent, MessageImGateway } from '@/im/MessageImGateway'
import { messageService, mockMessageService } from '@/services/message'
import { messagePlatformRuntime } from '@/services/messagePlatformRuntime'
import type { ChatMessage, MessageConversationDetail } from '@/types/message'
import { DotsButton, MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

function upsertMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byKey = new Map(current.map(item => [item.clientMsgId, item]))
  incoming.forEach(item => byKey.set(item.clientMsgId, item))
  return [...byKey.values()].sort((left, right) => left.sentAt.localeCompare(right.sentAt))
}

function createClientReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const DETAIL_TIMEOUT_MS = 8_000
const CONNECTION_TIMEOUT_MS = 12_000
const HISTORY_TIMEOUT_MS = 10_000
const SEND_TIMEOUT_MS = 15_000

type ConnectionState = 'idle' | 'connecting' | 'ready' | 'error'

export default function PrivateChatPage() {
  const router = useRouter()
  const isMockScene = Boolean(router.params.mockScene)
  const conversationNo = router.params.conversationNo || 'conversation-lin'
  const service = isMockScene ? mockMessageService : messageService
  const [detail, setDetail] = useState<MessageConversationDetail>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyCursor, setHistoryCursor] = useState<string>()
  const [historyCompleted, setHistoryCompleted] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [retryTarget, setRetryTarget] = useState<ChatMessage>()
  const [showActions, setShowActions] = useState(false)
  const [messageReportTarget, setMessageReportTarget] = useState<ChatMessage>()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const readAckKey = useRef('')
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

  const acknowledgeRendered = useCallback(
    async (rendered: ChatMessage[]) => {
      const gatewayId = timConversationIdRef.current
      const gateway = gatewayRef.current
      if (!gateway || !gatewayId || rendered.length === 0) return
      const lastIncoming = [...rendered].reverse().find(item => item.direction === 'incoming')
      const lastMessageNo = lastIncoming?.messageNo || lastIncoming?.timMessageId
      if (!lastMessageNo) return
      const ackKey = `${conversationNo}:${lastMessageNo}`
      if (readAckKey.current === ackKey) return
      try {
        await gateway.markRead(gatewayId)
        await service.markConversationRead(
          conversationNo,
          lastMessageNo,
          lastIncoming?.timMessageId,
          lastIncoming?.timMsgKey,
        )
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
    if (event.type === 'ready') setConnectionState('ready')
    if (event.type === 'not_ready' || event.type === 'kicked_out') {
      setConnectionState('error')
    }
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
    if (existing?.isReady()) {
      setConnectionState('ready')
      return existing
    }
    if (connectionPromiseRef.current) return connectionPromiseRef.current

    setConnectionState('connecting')
    const connect = (async () => {
      try {
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
        }
        if (!gateway.isReady()) throw new Error('私信仍在连接，请稍后重试')
        setConnectionState('ready')
        return gateway
      } catch (error) {
        setConnectionState('error')
        throw error
      }
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
      setLoading(true)
      setErrorMessage('')
      try {
        const nextDetail = await withMessageTimeout(
          service.getConversation(conversationNo),
          DETAIL_TIMEOUT_MS,
          '会话加载超时，请重试',
        )
        const gatewayId = isMockScene ? conversationNo : nextDetail.timConversationId
        setDetail(nextDetail)
        if (!nextDetail.canEnterConversation || !gatewayId) {
          timConversationIdRef.current = ''
          setMessages([])
          setHistoryCursor(undefined)
          setHistoryCompleted(true)
          setConnectionState('idle')
          return
        }
        timConversationIdRef.current = gatewayId
        // 先把会话壳、导航和输入区交给渲染线程，再异步下载与初始化 TIM。
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        const gateway = await ensureConnected()
        const page = await withMessageTimeout(
          gateway.listHistory(gatewayId),
          HISTORY_TIMEOUT_MS,
          '聊天记录加载超时，请重试',
        )
        setMessages(page.list)
        setHistoryCursor(page.nextCursor)
        setHistoryCompleted(page.isCompleted)
        setTimeout(() => void acknowledgeRendered(page.list), 0)
      } catch (error) {
        const resolved = resolveMessageError(error)
        setErrorMessage(resolved.message)
      } finally {
        setLoading(false)
      }
    }),
    [acknowledgeRendered, conversationNo, ensureConnected, isMockScene, loadSingleFlight, service],
  )

  useEffect(() => {
    readAckKey.current = ''
    timConversationIdRef.current = isMockScene ? conversationNo : ''
    setConnectionState('idle')
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
    if (!timConversationId || historyCompleted || !historyCursor || loading) return
    setLoading(true)
    try {
      const gateway = await ensureConnected()
      const page = await withMessageTimeout(
        gateway.listHistory(timConversationId, historyCursor),
        HISTORY_TIMEOUT_MS,
        '聊天记录加载超时，请重试',
      )
      setMessages(current => upsertMessages(page.list, current))
      setHistoryCursor(page.nextCursor)
      setHistoryCompleted(page.isCompleted)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '历史消息加载失败')
    } finally {
      setLoading(false)
    }
  }

  const canSend = Boolean(detail?.canSend)

  const send = async () => {
    const value = inputValue.trim()
    if (!value || sending) return
    if (!detail || !timConversationId) {
      await Taro.showToast({ title: '会话正在加载，请稍后发送', icon: 'none' })
      return
    }
    if (!canSend) {
      await Taro.showToast({ title: resolveConversationSendBlockedReason(detail?.sendBlockedReason), icon: 'none' })
      return
    }
    setSending(true)
    try {
      const gateway = await ensureConnected()
      const message = await withMessageTimeout(
        gateway.sendText(timConversationId, value),
        SEND_TIMEOUT_MS,
        '消息发送超时，请稍后确认发送结果',
      )
      setInputValue('')
      setMessages(current => upsertMessages(current, [message]))
      if (message.sendStatus === 'failed') setRetryTarget(message)
    } catch (error) {
      setInputValue(value)
      const resolved = resolveMessageError(error)
      setErrorMessage(resolved.message)
      await Taro.showToast({ title: resolved.message, icon: 'none' })
    } finally {
      setSending(false)
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
        className="private-chat-scroll"
        showScrollbar={false}
        scrollIntoView="chat-bottom"
        onScrollToUpper={() => void loadEarlier()}
      >
        {loading ? <Text className="message-empty-copy">加载中...</Text> : null}
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
          {messages.map(message => (
            <View className={`chat-row chat-row--${message.direction === 'outgoing' ? 'outgoing' : 'incoming'}`} key={message.clientMsgId}>
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
          ))}
          {!loading && messages.length === 0 ? <Text className="message-empty-copy">暂无聊天记录</Text> : null}
        </View>
        <View id="chat-bottom" />
      </ScrollView>

      <View className="chat-input-bar">
        {!detail?.canSend && detail?.sendBlockedReason ? <Text className="chat-reply-label">{resolveConversationSendBlockedReason(detail.sendBlockedReason)}</Text> : null}
        {detail?.canSend && connectionState !== 'ready' ? <Text className="chat-connection-state">{connectionState === 'error' ? '连接失败，发送时重试' : '私信连接中，可先输入'}</Text> : null}
        <Input className="chat-input" value={inputValue} disabled={Boolean(detail && !detail.canSend) || sending} maxlength={500} adjustPosition cursorSpacing={12} onInput={event => setInputValue(event.detail.value)} onConfirm={() => void send()} />
        <View className={`chat-send-button${canSend && !sending ? '' : ' chat-send-button--disabled'}`} onClick={() => void send()}><Text>{sending ? '发送中' : '发送'}</Text></View>
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
