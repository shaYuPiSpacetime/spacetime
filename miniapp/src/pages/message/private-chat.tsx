import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { resolveMessageError } from '@/domain/messageRuntime'
import { messageImGateway, mockMessageImGateway } from '@/im'
import { messageRuntime } from '@/im/messageRuntime'
import { messageService, mockMessageService } from '@/services/message'
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

export default function PrivateChatPage() {
  const router = useRouter()
  const isMockScene = Boolean(router.params.mockScene)
  const conversationNo = router.params.conversationNo || 'conversation-lin'
  const service = isMockScene ? mockMessageService : messageService
  const gateway = isMockScene ? mockMessageImGateway : messageImGateway
  const [detail, setDetail] = useState<MessageConversationDetail>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyCursor, setHistoryCursor] = useState<string>()
  const [historyCompleted, setHistoryCompleted] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [retryTarget, setRetryTarget] = useState<ChatMessage>()
  const [showActions, setShowActions] = useState(false)
  const [messageReportTarget, setMessageReportTarget] = useState<ChatMessage>()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const readAckKey = useRef('')

  const timConversationId = isMockScene
    ? conversationNo
    : detail?.timConversationId || ''

  const acknowledgeRendered = useCallback(
    async (rendered: ChatMessage[]) => {
      if (!detail || !timConversationId || rendered.length === 0) return
      const lastIncoming = [...rendered].reverse().find(item => item.direction === 'incoming')
      const lastMessageNo = lastIncoming?.messageNo || lastIncoming?.timMessageId
      if (!lastMessageNo) return
      const ackKey = `${conversationNo}:${lastMessageNo}`
      if (readAckKey.current === ackKey) return
      try {
        await gateway.markRead(timConversationId)
        await service.markConversationRead(
          conversationNo,
          lastMessageNo,
          lastIncoming?.timMessageId,
          lastIncoming?.timMsgKey,
        )
        readAckKey.current = ackKey
        if (!isMockScene) await messageRuntime.refreshUnread()
      } catch (error) {
        // 平台确认失败时保留后端未读真值，不在页面本地清零。
        setErrorMessage(error instanceof Error ? error.message : '已读状态同步失败')
      }
    },
    [conversationNo, detail, gateway, isMockScene, service, timConversationId],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      if (!isMockScene) await messageRuntime.onForeground()
      if (isMockScene && !gateway.isReady()) await gateway.initialize(await service.getImCredentials())
      const nextDetail = await service.getConversation(conversationNo)
      setDetail(nextDetail)
      const gatewayId = isMockScene ? conversationNo : nextDetail.timConversationId
      const page = await gateway.listHistory(gatewayId)
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
  }, [acknowledgeRendered, conversationNo, gateway, isMockScene, service])

  useEffect(() => {
    void load()
    return gateway.onEvent(event => {
      if (!event.messages?.length) return
      const relevant = event.messages.filter(
        item => item.conversationNo === timConversationId || item.conversationNo === conversationNo,
      )
      if (!relevant.length) return
      setMessages(current => {
        const next = upsertMessages(current, relevant)
        setTimeout(() => void acknowledgeRendered(next), 0)
        return next
      })
    })
  }, [conversationNo, gateway, timConversationId])

  useDidShow(() => {
    if (!isMockScene) void load()
  })

  const loadEarlier = async () => {
    if (!timConversationId || historyCompleted || !historyCursor || loading) return
    setLoading(true)
    try {
      const page = await gateway.listHistory(timConversationId, historyCursor)
      setMessages(current => upsertMessages(page.list, current))
      setHistoryCursor(page.nextCursor)
      setHistoryCompleted(page.isCompleted)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '历史消息加载失败')
    } finally {
      setLoading(false)
    }
  }

  const canSend = Boolean(detail?.canSend && gateway.isReady())

  const send = async () => {
    const value = inputValue.trim()
    if (!value || !timConversationId) return
    if (!canSend) {
      await Taro.showToast({ title: detail?.sendBlockedReason || '当前会话暂不可发送', icon: 'none' })
      return
    }
    setInputValue('')
    const message = await gateway.sendText(timConversationId, value)
    setMessages(current => upsertMessages(current, [message]))
    if (message.sendStatus === 'failed') setRetryTarget(message)
  }

  const retry = async () => {
    if (!retryTarget || !timConversationId) return
    try {
      const retried = await gateway.retry(timConversationId, retryTarget.clientMsgId)
      setMessages(current => upsertMessages(current, [retried]))
      setRetryTarget(undefined)
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '重发失败', icon: 'none' })
    }
  }

  const openReport = (blocked = false, message?: ChatMessage) => {
    const clientReportId = createClientReportId()
    const targetType = message ? 'message' : 'conversation'
    const targetBizNo = message?.messageNo || message?.timMessageId || conversationNo
    setShowActions(false)
    setMessageReportTarget(undefined)
    void Taro.navigateTo({
      url: `/pages/message/report?targetType=${targetType}&targetBizNo=${encodeURIComponent(targetBizNo)}&conversationNo=${encodeURIComponent(conversationNo)}&messageNo=${encodeURIComponent(message?.messageNo || '')}&timConversationId=${encodeURIComponent(detail?.timConversationId || '')}&timMessageId=${encodeURIComponent(message?.timMessageId || '')}&timMsgKey=${encodeURIComponent(message?.timMsgKey || '')}&clientReportId=${clientReportId}${blocked ? '&blocked=1' : ''}${isMockScene ? '&mockScene=report-form' : ''}`,
    })
  }

  const blockAndReport = async () => {
    setShowActions(false)
    try {
      const result = await service.blockConversation(conversationNo, 'private_chat')
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
        {!detail?.canSend && detail?.sendBlockedReason ? <Text className="chat-reply-label">{detail.sendBlockedReason}</Text> : null}
        <Input className="chat-input" value={inputValue} disabled={!canSend} maxlength={500} adjustPosition cursorSpacing={12} onInput={event => setInputValue(event.detail.value)} onConfirm={() => void send()} />
        <View className={`chat-send-button${canSend ? '' : ' chat-send-button--disabled'}`} onClick={() => void send()}><Text>发送</Text></View>
      </View>

      {showActions ? (
        <View className="message-sheet-mask" onClick={() => setShowActions(false)}>
          <View className="message-action-sheet" onClick={event => event.stopPropagation()}>
            <View className="message-action-sheet-item" onClick={() => openReport(false)}><Text>举报</Text></View>
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
