import MatchPopupHost from '@/components/MatchPopupHost'
import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import { navigateToOrRedirect } from '@/utils/navigation'
import Taro, { useDidHide, useDidShow, useRouter } from '@tarojs/taro'
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
  resolvePrivateChatScrollIntent,
  waitForMessageGatewayReady,
  withMessageTimeout,
} from '@/domain/messageRuntime'
import {
  mergePrivateChatMessages,
  readPrivateChatSession,
  writePrivateChatSession,
} from '@/domain/privateChatSession'
import { createWhisperIdempotencyCache, resolveWhisperErrorMessage } from '@/domain/whisperRuntime'
import { loadMessageImGateway } from '@/im/loadMessageImGateway'
import type { MessageImEvent, MessageImGateway } from '@/im/MessageImGateway'
import { messageService, mockMessageService } from '@/services/message'
import { messagePlatformRuntime } from '@/services/messagePlatformRuntime'
import { useMessageRuntimeStore } from '@/stores/messageRuntimeStore'
import { useAuthStore } from '@/stores/authStore'
import type { ChatMessage, MessageConversationDetail } from '@/types/message'
import { DotsButton, MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

function messageMergeKey(message: ChatMessage): string {
  return message.messageNo || message.timMessageId || message.timMsgKey || message.clientMsgId
}

function messageAnchorId(message: ChatMessage): string {
  const stable = messageMergeKey(message).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)
  return `chat-message-${stable}`
}

function createClientReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const DETAIL_TIMEOUT_MS = 8_000
const CONNECTION_TIMEOUT_MS = 25_000
const HISTORY_TIMEOUT_MS = 10_000
const SEND_TIMEOUT_MS = 15_000
const INITIAL_TIM_BUDGET_MS = 180

type PrivateChatHistoryPage = {
  list: ChatMessage[]
  nextCursor: string | null
  hasMore: boolean
}

type TimHistoryLoadResult = {
  page?: { list: ChatMessage[] }
  error?: unknown
}

function waitForInitialBudget<T>(promise: Promise<T>): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), INITIAL_TIM_BUDGET_MS)),
  ])
}

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
  const targetUserId = router.params.targetUserId || ''
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [createdConversationNo, setCreatedConversationNo] = useState('')
  const [navigationMessage, setNavigationMessage] = useState('')
  const [inputFocused, setInputFocused] = useState(true)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const idempotencyCache = useRef(createWhisperIdempotencyCache()).current

  const dismissKeyboard = () => {
    setInputFocused(false)
    setKeyboardHeight(0)
    void Taro.hideKeyboard()
  }

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
      <MatchPopupHost />
      <MessageNav title={nickname} avatarUrl={avatar} onProfileClick={targetUserId ? () => void navigateToOrRedirect(`/pages/heart/user?targetUserId=${encodeURIComponent(targetUserId)}&sourceScene=profile`) : undefined} />
      <ScrollView scrollY className="private-chat-scroll" style={{ height: keyboardHeight > 0 ? `calc(100vh - 137px - ${keyboardHeight}px)` : undefined }} showScrollbar={false} onClick={dismissKeyboard}>
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
      <View className="chat-input-bar" style={{ bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined, paddingBottom: keyboardHeight > 0 ? '5px' : undefined }}>
        <Input
          className="chat-input"
          value={inputValue}
          disabled={sending || Boolean(createdConversationNo)}
          maxlength={500}
          placeholder="输入回复内容"
          adjustPosition={false}
          holdKeyboard
          confirmHold
          cursorSpacing={12}
          focus={inputFocused}
          onFocus={event => { setInputFocused(true); setKeyboardHeight(event.detail.height || 0) }}
          onBlur={() => { setInputFocused(false); setKeyboardHeight(0) }}
          onKeyboardHeightChange={event => setKeyboardHeight(Math.max(0, event.detail.height))}
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
  const sessionUserId = String(useAuthStore(state => state.userId) || '')
  const markConversationRead = useMessageRuntimeStore(state => state.markConversationRead)
  const service = isMockScene ? mockMessageService : messageService
  const initialSessionRef = useRef(readPrivateChatSession(sessionUserId, conversationNo))
  const initialSession = initialSessionRef.current
  const stateSessionKeyRef = useRef(`${sessionUserId}:${conversationNo}`)
  const [detail, setDetail] = useState<MessageConversationDetail | undefined>(initialSession?.detail)
  const [messages, setMessages] = useState<ChatMessage[]>(initialSession?.messages || [])
  const [historyCursor, setHistoryCursor] = useState<string | undefined>(initialSession?.historyCursor)
  const [historyCompleted, setHistoryCompleted] = useState(initialSession?.historyCompleted || false)
  const [scrollTarget, setScrollTarget] = useState<string | undefined>(
    initialSession?.messages.length ? 'chat-bottom-a' : undefined,
  )
  const [inputValue, setInputValue] = useState('')
  const [retryTarget, setRetryTarget] = useState<ChatMessage>()
  const [showActions, setShowActions] = useState(false)
  const [messageReportTarget, setMessageReportTarget] = useState<ChatMessage>()
  const [initialLoading, setInitialLoading] = useState(!initialSession?.initialLoaded)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyAnchorId, setHistoryAnchorId] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const readAckKey = useRef('')
  const messagesRef = useRef<ChatMessage[]>(initialSession?.messages || [])
  const scrollTargetRef = useRef<'chat-bottom-a' | 'chat-bottom-b'>(
    initialSession?.messages.length ? 'chat-bottom-a' : 'chat-bottom-b',
  )
  const mountedRef = useRef(true)
  const hasCompletedInitialShowRef = useRef(false)
  const pageVisibleRef = useRef(true)
  const nearBottomRef = useRef(initialSession?.nearBottom ?? true)
  const scrollSnapshotRef = useRef({
    scrollTop: initialSession?.scrollTop || 0,
    scrollHeight: initialSession?.scrollHeight || 0,
  })
  const previousKeyboardHeightRef = useRef(0)
  const loadVersionRef = useRef(0)
  const timConversationIdRef = useRef(isMockScene ? conversationNo : '')
  const gatewayRef = useRef<MessageImGateway>()
  const gatewayPromiseRef = useRef<Promise<MessageImGateway>>()
  const connectionPromiseRef = useRef<Promise<MessageImGateway>>()
  const sendInFlightRef = useRef(false)
  const unsubscribeGatewayRef = useRef<() => void>()
  const gatewayEventHandlerRef = useRef<(event: MessageImEvent) => void>(() => undefined)
  const loadSingleFlight = useRef(createKeyedSingleFlight()).current

  const dismissKeyboard = () => {
    setInputFocused(false)
    setKeyboardHeight(0)
    void Taro.hideKeyboard()
  }

  const timConversationId = isMockScene
    ? conversationNo
    : detail?.timConversationId || ''

  const requestScrollToLatest = useCallback(() => {
    const current = scrollTargetRef.current
    const target = current === 'chat-bottom-a' ? 'chat-bottom-b' : 'chat-bottom-a'
    scrollTargetRef.current = target
    // 与消息列表在同一批 React 更新里提交滚动目标，避免正文先出现在顶部再跳到底部。
    setScrollTarget(target)
    nearBottomRef.current = true
  }, [])

  useEffect(() => {
    const wasOpen = previousKeyboardHeightRef.current > 0
    const isOpen = keyboardHeight > 0
    previousKeyboardHeightRef.current = keyboardHeight
    if (
      !wasOpen
      && isOpen
      && messagesRef.current.length > 0
      && resolvePrivateChatScrollIntent('keyboard_open') === 'latest'
    ) requestScrollToLatest()
  }, [keyboardHeight, requestScrollToLatest])

  useEffect(() => {
    if (stateSessionKeyRef.current !== `${sessionUserId}:${conversationNo}`) return
    messagesRef.current = messages
    writePrivateChatSession(sessionUserId, conversationNo, {
      detail,
      messages,
      historyCursor,
      historyCompleted,
      initialLoaded: !initialLoading,
      scrollTop: scrollSnapshotRef.current.scrollTop,
      scrollHeight: scrollSnapshotRef.current.scrollHeight,
      nearBottom: nearBottomRef.current,
    })
  }, [conversationNo, detail, historyCompleted, historyCursor, initialLoading, messages, sessionUserId])

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
      markConversationRead(conversationNo, cursor.lastMessageNo || lastIncoming.messageNo || lastIncoming.timMessageId)
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
    [conversationNo, isMockScene, markConversationRead, service],
  )

  gatewayEventHandlerRef.current = event => {
    if (!event.messages?.length) return
    const currentTimConversationId = timConversationIdRef.current
    const relevant = event.messages.filter(
      item => item.conversationNo === currentTimConversationId || item.conversationNo === conversationNo,
    )
    if (!relevant.length) return
    const hasIncoming = relevant.some(item => item.direction === 'incoming')
    if (hasIncoming) {
      setDetail(current => current?.femaleProtection?.appliesToCurrentUser
        ? {
            ...current,
            canSend: true,
            sendBlockedReason: null,
            femaleProtection: {
              ...current.femaleProtection,
              waitingForFemaleReply: false,
            },
          }
        : current)
    }
    const next = mergePrivateChatMessages(messagesRef.current, relevant)
    if (next === messagesRef.current) return
    messagesRef.current = next
    setMessages(next)
    setTimeout(() => void acknowledgeRendered(next), 0)
    if (
      hasIncoming
      && pageVisibleRef.current
      && resolvePrivateChatScrollIntent('incoming', nearBottomRef.current) === 'latest'
    ) Taro.nextTick(requestScrollToLatest)
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

  const commitInitialSnapshot = useCallback((
    nextDetail: MessageConversationDetail | undefined,
    localPage: PrivateChatHistoryPage | undefined,
    nextMessages: ChatMessage[],
  ) => {
    const cached = readPrivateChatSession(sessionUserId, conversationNo)
    const nextHistoryCursor = localPage
      ? localPage.nextCursor || undefined
      : cached?.historyCursor
    const nextHistoryCompleted = localPage
      ? !localPage.hasMore
      : cached?.historyCompleted || false
    messagesRef.current = nextMessages
    setDetail(nextDetail)
    setMessages(nextMessages)
    setHistoryCursor(nextHistoryCursor)
    setHistoryCompleted(nextHistoryCompleted)
    if (nextMessages.length > 0
      && resolvePrivateChatScrollIntent('initial') === 'latest') requestScrollToLatest()
    setInitialLoading(false)
    writePrivateChatSession(sessionUserId, conversationNo, {
      detail: nextDetail,
      messages: nextMessages,
      historyCursor: nextHistoryCursor,
      historyCompleted: nextHistoryCompleted,
      initialLoaded: true,
      scrollTop: scrollSnapshotRef.current.scrollTop,
      scrollHeight: scrollSnapshotRef.current.scrollHeight,
      nearBottom: true,
    })
  }, [conversationNo, requestScrollToLatest, sessionUserId])

  const load = useCallback(
    () => loadSingleFlight.run(conversationNo, async () => {
      const version = ++loadVersionRef.current
      const isCurrentLoad = () => mountedRef.current && version === loadVersionRef.current
      const cached = readPrivateChatSession(sessionUserId, conversationNo)
      if (!cached?.initialLoaded) setInitialLoading(true)
      setErrorMessage('')
      const localHistoryPromise = withMessageTimeout(
        service.listConversationMessages(conversationNo, undefined, 30),
        HISTORY_TIMEOUT_MS,
        '本地聊天记录加载超时',
      ).then(
        page => ({ page, error: undefined }),
        error => ({ page: undefined, error }),
      )
      const gatewayPromise = ensureConnected().then(
        gateway => ({ gateway, error: undefined }),
        error => ({ gateway: undefined, error }),
      )
      const detailPromise = withMessageTimeout(
        service.getConversation(conversationNo),
        DETAIL_TIMEOUT_MS,
        '会话加载超时，请重试',
      ).then(
        nextDetail => ({ detail: nextDetail, error: undefined }),
        error => ({ detail: undefined, error }),
      )

      const [localHistory, detailResult] = await Promise.all([localHistoryPromise, detailPromise])
      if (!isCurrentLoad()) return

      const nextDetail = detailResult.detail || cached?.detail
      const gatewayId = nextDetail
        ? (isMockScene ? conversationNo : nextDetail.timConversationId)
        : ''
      timConversationIdRef.current = nextDetail?.canEnterConversation && gatewayId ? gatewayId : ''

      let nextMessages = mergePrivateChatMessages(
        cached?.messages || messagesRef.current,
        localHistory.page?.list || [],
      )
      let timHistoryPromise: Promise<TimHistoryLoadResult> | undefined
      if (nextDetail?.canEnterConversation && gatewayId) {
        timHistoryPromise = gatewayPromise.then(async connected => {
          if (!connected.gateway) throw connected.error
          const page = await withMessageTimeout(
            connected.gateway.listHistory(gatewayId),
            HISTORY_TIMEOUT_MS,
            '聊天记录加载超时，请重试',
          )
          return { page }
        }).catch(error => ({ error }))
      }

      const initialTim = timHistoryPromise
        ? await waitForInitialBudget(timHistoryPromise)
        : undefined
      if (!isCurrentLoad()) return
      if (initialTim?.page) {
        nextMessages = mergePrivateChatMessages(nextMessages, initialTim.page.list)
      }

      commitInitialSnapshot(nextDetail, localHistory.page, nextMessages)
      setTimeout(() => void acknowledgeRendered(nextMessages), 0)

      const blockingError = detailResult.error || (!localHistory.page ? localHistory.error : undefined)
      if (blockingError) setErrorMessage(resolveMessageError(blockingError).message)

      if (timHistoryPromise && !initialTim) {
        void timHistoryPromise.then(result => {
          if (!isCurrentLoad() || !result.page) return
          const supplemented = mergePrivateChatMessages(messagesRef.current, result.page.list)
          if (supplemented === messagesRef.current) return
          messagesRef.current = supplemented
          setMessages(supplemented)
          void acknowledgeRendered(supplemented)
          if (
            pageVisibleRef.current
            && resolvePrivateChatScrollIntent('supplement', nearBottomRef.current) === 'latest'
          ) Taro.nextTick(requestScrollToLatest)
        })
      }
    }),
    [acknowledgeRendered, commitInitialSnapshot, conversationNo, ensureConnected, isMockScene, loadSingleFlight, requestScrollToLatest, service, sessionUserId],
  )

  useEffect(() => {
    const cached = readPrivateChatSession(sessionUserId, conversationNo)
    stateSessionKeyRef.current = `${sessionUserId}:${conversationNo}`
    loadVersionRef.current += 1
    readAckKey.current = ''
    messagesRef.current = cached?.messages || []
    setDetail(cached?.detail)
    setMessages(cached?.messages || [])
    setHistoryCursor(cached?.historyCursor)
    setHistoryCompleted(cached?.historyCompleted || false)
    setInitialLoading(!cached?.initialLoaded)
    setHistoryAnchorId('')
    if (cached?.messages.length) {
      scrollTargetRef.current = 'chat-bottom-a'
      setScrollTarget('chat-bottom-a')
    } else {
      scrollTargetRef.current = 'chat-bottom-b'
      setScrollTarget(undefined)
    }
    timConversationIdRef.current = isMockScene ? conversationNo : ''
  }, [conversationNo, isMockScene, sessionUserId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => () => {
    mountedRef.current = false
    loadVersionRef.current += 1
    unsubscribeGatewayRef.current?.()
    unsubscribeGatewayRef.current = undefined
  }, [])

  const refreshPreservingPosition = useCallback(async () => {
    if (isMockScene) return
    try {
      const detailResult = await service.getConversation(conversationNo)
      if (!mountedRef.current) return
      setDetail(detailResult)
      timConversationIdRef.current = detailResult.timConversationId || ''
      writePrivateChatSession(sessionUserId, conversationNo, { detail: detailResult })
      void messagePlatformRuntime.refreshUnread()
    } catch {
      // 页面恢复刷新失败时保留当前画面，不用错误层打断用户阅读。
    }
  }, [conversationNo, isMockScene, service, sessionUserId])

  useDidHide(() => {
    pageVisibleRef.current = false
    writePrivateChatSession(sessionUserId, conversationNo, {
      scrollTop: scrollSnapshotRef.current.scrollTop,
      scrollHeight: scrollSnapshotRef.current.scrollHeight,
      nearBottom: nearBottomRef.current,
    })
  })

  useDidShow(() => {
    pageVisibleRef.current = true
    if (!hasCompletedInitialShowRef.current) {
      hasCompletedInitialShowRef.current = true
      return
    }
    if (resolvePrivateChatScrollIntent('resume') === 'preserve') {
      void refreshPreservingPosition()
    }
  })

  const loadEarlier = async () => {
    if (historyCompleted || !historyCursor
      || initialLoading || historyLoading) return
    const anchor = messagesRef.current[0]
    setHistoryLoading(true)
    try {
      const page = await withMessageTimeout(
        service.listConversationMessages(conversationNo, historyCursor, 30),
        HISTORY_TIMEOUT_MS,
        '聊天记录加载超时，请重试',
      )
      const next = mergePrivateChatMessages(page.list, messagesRef.current)
      messagesRef.current = next
      setMessages(next)
      setHistoryCursor(page.nextCursor || undefined)
      setHistoryCompleted(!page.hasMore)
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
    if (sendInFlightRef.current) return
    if (!detail || !timConversationId) {
      await Taro.showToast({ title: '会话正在加载，请稍后发送', icon: 'none' })
      return
    }
    if (!canSend) {
      await Taro.showToast({ title: resolveConversationSendBlockedReason(detail?.sendBlockedReason), icon: 'none' })
      return
    }
    const previousDetail = detail
    const protectionApplies = Boolean(detail.femaleProtection?.appliesToCurrentUser)
    sendInFlightRef.current = true
    if (protectionApplies) {
      setDetail(current => current ? {
        ...current,
        canSend: false,
        sendBlockedReason: 'female_reply_pending',
        femaleProtection: current.femaleProtection ? {
          ...current.femaleProtection,
          waitingForFemaleReply: true,
        } : null,
      } : current)
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
      const next = mergePrivateChatMessages(messagesRef.current, [message])
      messagesRef.current = next
      setMessages(next)
      requestScrollToLatest()
      if (message.sendStatus === 'failed') {
        setRetryTarget(message)
        if (protectionApplies) setDetail(previousDetail)
      }
    } catch (error) {
      if (protectionApplies) {
        setDetail(current => current?.femaleProtection?.waitingForFemaleReply
          ? previousDetail
          : current)
      }
      setInputValue(current => current || value)
      const resolved = resolveMessageError(error)
      setErrorMessage(resolved.message)
      await Taro.showToast({ title: resolved.message, icon: 'none' })
    } finally {
      sendInFlightRef.current = false
    }
  }

  const retry = async () => {
    if (!retryTarget || !timConversationId) return
    try {
      const gateway = await ensureConnected()
      const retried = await gateway.retry(timConversationId, retryTarget.clientMsgId)
      const next = mergePrivateChatMessages(messagesRef.current, [retried])
      messagesRef.current = next
      setMessages(next)
      if (retried.sendStatus !== 'failed') {
        setDetail(current => current?.femaleProtection?.appliesToCurrentUser
          ? {
              ...current,
              canSend: false,
              sendBlockedReason: 'female_reply_pending',
              femaleProtection: {
                ...current.femaleProtection,
                waitingForFemaleReply: true,
              },
            }
          : current)
      }
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
          const next = mergePrivateChatMessages(messagesRef.current, [retried])
          messagesRef.current = next
          setMessages(next)
          if (retried.sendStatus !== 'failed' && recoveredDetail.femaleProtection?.appliesToCurrentUser) {
            setDetail({
              ...recoveredDetail,
              canSend: false,
              sendBlockedReason: 'female_reply_pending',
              femaleProtection: {
                ...recoveredDetail.femaleProtection,
                waitingForFemaleReply: true,
              },
            })
          }
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
    const reportSourceType = message ? 'message' : 'private_chat'
    const reportTargetId = message?.messageNo
      || message?.timMessageId
      || message?.timMsgKey
      || conversationNo
    setShowActions(false)
    setMessageReportTarget(undefined)
    void Taro.navigateTo({
      url: `/pages/message/report?sourceType=${reportSourceType}&targetId=${encodeURIComponent(reportTargetId)}&conversationNo=${encodeURIComponent(conversationNo)}&messageNo=${encodeURIComponent(message?.messageNo || '')}&timConversationId=${encodeURIComponent(detail?.reportContext?.timConversationId || detail?.timConversationId || '')}&timMessageId=${encodeURIComponent(message?.timMessageId || '')}&timMsgKey=${encodeURIComponent(message?.timMsgKey || '')}&clientReportId=${clientReportId}${blocked ? '&blocked=1' : ''}${isMockScene ? '&mockScene=report-form' : ''}`,
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
      <MatchPopupHost />
      <MessageNav
        title={detail?.peerUser.nickname || '私信'}
        avatarUrl={detail?.peerUser.avatarUrl || MESSAGE_AVATAR}
        onProfileClick={detail?.peerUser.profileAvailable ? () => void navigateToOrRedirect(`/pages/heart/user?targetUserId=${encodeURIComponent(detail.peerUser.userId)}&sourceScene=profile`) : undefined}
        rightContent={<DotsButton onClick={() => setShowActions(true)} />}
      />
      <ScrollView
        scrollY
        scrollAnchoring
        className="private-chat-scroll"
        style={{ height: keyboardHeight > 0 ? `calc(100vh - 137px - ${keyboardHeight}px)` : undefined }}
        showScrollbar={false}
        scrollIntoView={scrollTarget}
        onScroll={event => {
          const windowHeight = Taro.getWindowInfo().windowHeight
          const visibleHeight = Math.max(1, windowHeight - 137 - keyboardHeight)
          scrollSnapshotRef.current = {
            scrollTop: event.detail.scrollTop,
            scrollHeight: event.detail.scrollHeight,
          }
          nearBottomRef.current = event.detail.scrollHeight
            - event.detail.scrollTop
            - visibleHeight <= 96
          writePrivateChatSession(sessionUserId, conversationNo, {
            scrollTop: event.detail.scrollTop,
            scrollHeight: event.detail.scrollHeight,
            nearBottom: nearBottomRef.current,
          })
        }}
        onScrollToLower={() => { nearBottomRef.current = true }}
        onScrollToUpper={() => {
          nearBottomRef.current = false
          void loadEarlier()
        }}
        onClick={dismissKeyboard}
      >
        {initialLoading && messages.length === 0 ? (
          <View className="private-chat-skeleton">
            <View className="private-chat-skeleton-card" />
            <View className="private-chat-skeleton-row" />
            <View className="private-chat-skeleton-row private-chat-skeleton-row--right" />
          </View>
        ) : null}
        <View className="private-chat-content">
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
                  {message.direction !== 'outgoing' ? <Image className="chat-avatar" src={detail?.peerUser.avatarUrl || MESSAGE_AVATAR} mode="aspectFill" onClick={() => { if (detail?.peerUser.profileAvailable) void navigateToOrRedirect(`/pages/heart/user?targetUserId=${encodeURIComponent(detail.peerUser.userId)}&sourceScene=profile`) }} /> : null}
                  {message.sendStatus === 'failed' ? <View className="chat-failed" onClick={() => setRetryTarget(message)}><Text>!</Text></View> : null}
                  <View
                    className={`chat-bubble chat-bubble--${message.direction === 'outgoing' ? 'outgoing' : 'incoming'}`}
                    onLongPress={() => {
                      if (message.direction === 'incoming') setMessageReportTarget(message)
                    }}
                  >
                    <Text className="chat-bubble-text">{message.content}</Text>
                  </View>
                  {message.direction === 'outgoing' ? <Image className="chat-avatar" src={detail?.selfAvatarUrl || MESSAGE_AVATAR} mode="aspectFill" onClick={() => { const selfUserId = useAuthStore.getState().userId; if (selfUserId) void navigateToOrRedirect(`/pages/heart/user?targetUserId=${selfUserId}&sourceScene=profile`) }} /> : null}
                </View>
              </View>
            )
          })}
          {!initialLoading && messages.length === 0 ? <Text className="message-empty-copy">暂无聊天记录</Text> : null}
        </View>
        <View id="chat-bottom-a" className="chat-bottom-anchor" />
        <View id="chat-bottom-b" className="chat-bottom-anchor" />
        </View>
      </ScrollView>

      <View
        className="chat-input-bar"
        style={{ bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined, paddingBottom: keyboardHeight > 0 ? '5px' : undefined }}
      >
        {!detail?.canSend && detail?.sendBlockedReason ? <Text className="chat-reply-label">{resolveConversationSendBlockedReason(detail.sendBlockedReason)}</Text> : null}
        <Input className="chat-input" value={inputValue} disabled={Boolean(detail && !detail.canEnterConversation)} maxlength={500} adjustPosition={false} holdKeyboard cursorSpacing={12} confirmType="send" confirmHold focus={inputFocused} onFocus={event => { setInputFocused(true); setKeyboardHeight(event.detail.height || 0) }} onBlur={() => { setInputFocused(false); setKeyboardHeight(0) }} onKeyboardHeightChange={event => setKeyboardHeight(Math.max(0, event.detail.height))} onInput={event => setInputValue(event.detail.value)} onConfirm={() => void send()} />
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
