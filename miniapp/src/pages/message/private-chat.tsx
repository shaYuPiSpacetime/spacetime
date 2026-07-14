import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { messageImGateway } from '@/im'
import type { ChatMessage } from '@/types/message'
import { MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

const CONVERSATION_NO = 'conversation-lin'

export default function PrivateChatPage() {
  const router = useRouter()
  const scene = router.params.mockScene || 'private-chat-default'
  const conversationNo = router.params.conversationNo || CONVERSATION_NO
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState(
    scene.includes('input') || scene.includes('reply') || scene.includes('retry') ? '我是' : ''
  )
  const [replyTo, setReplyTo] = useState<ChatMessage>()
  const [retryTarget, setRetryTarget] = useState<ChatMessage>()
  const seeded = useRef(false)
  const visibleOutgoingMessages = messages.filter(item => item.direction === 'outgoing').slice(-2)

  const refresh = () => messageImGateway.listHistory(conversationNo).then(setMessages)

  useEffect(() => {
    void messageImGateway.markRead(conversationNo)
    void refresh().then(async () => {
      if (seeded.current) return
      seeded.current = true
      if (scene === 'private-chat-reply') {
        await messageImGateway.sendText(conversationNo, '可以啊，很高兴认识你')
        await messageImGateway.sendText(conversationNo, '可以啊，很高兴认识你', {
          shouldFail: true,
        })
      }
      if (scene === 'private-chat-retry') {
        const failed = await messageImGateway.sendText(conversationNo, '可以啊，很高兴认识你', {
          shouldFail: true,
        })
        setRetryTarget(failed)
      }
      await refresh()
    })
  }, [conversationNo, scene])

  const send = async () => {
    const value = inputValue.trim()
    if (!value) return
    const message = await messageImGateway.sendText(conversationNo, value, {
      shouldFail: value.includes('失败'),
      replyToClientMsgId: replyTo?.clientMsgId,
    })
    setInputValue('')
    setReplyTo(undefined)
    if (message.sendStatus === 'failed') setRetryTarget(message)
    await refresh()
  }

  const retry = async () => {
    if (!retryTarget) return
    await messageImGateway.retry(conversationNo, retryTarget.clientMsgId)
    setRetryTarget(undefined)
    await refresh()
  }

  return (
    <View className="message-page message-page--gray private-chat-page">
      <MessageNav title="一只筱脑虎" avatarUrl={MESSAGE_AVATAR} />
      <ScrollView
        scrollY
        className="private-chat-scroll"
        showScrollbar={false}
        scrollIntoView="chat-bottom"
      >
        <Text className="private-chat-date">2026年05月12日 23:04</Text>
        <View className="chat-safety-card">
          <View className="chat-match-banner">
            <Image
              className="chat-match-deco chat-match-deco--left"
              src={miniappOssIcons.messageChatSafetyDecoLeft}
              mode="aspectFit"
            />
            <Text>配对成功开启聊天</Text>
            <Image
              className="chat-match-deco chat-match-deco--right"
              src={miniappOssIcons.messageChatSafetyDecoRight}
              mode="aspectFit"
            />
          </View>
          <Text className="chat-safety-title">聊天小贴士</Text>
          <Text className="chat-safety-line">1. 建议相互信任后，再交换联系方式</Text>
          <Text className="chat-safety-line">2. 警惕金钱往来，拒绝赌博/彩票/投资邀约</Text>
          <Text className="chat-safety-line">3. 遇到骚扰直接拉黑并举报，成家立业为你保驾护航</Text>
        </View>

        <View className="chat-messages">
          <View
            className="chat-row chat-row--incoming"
            onClick={() => setReplyTo(messages.find(item => item.direction === 'incoming'))}
          >
            <Image className="chat-avatar" src={MESSAGE_AVATAR} mode="aspectFill" />
            <View className="chat-bubble chat-bubble--incoming">
              <Text>你好，可以认识一下吗？</Text>
            </View>
          </View>
          {(scene.includes('reply') || scene.includes('retry') ? visibleOutgoingMessages : []).map(
            message => (
              <View className="chat-row chat-row--outgoing" key={message.clientMsgId}>
                {message.sendStatus === 'failed' ? (
                  <View className="chat-failed" onClick={() => setRetryTarget(message)}>
                    <Text>!</Text>
                  </View>
                ) : null}
                <View className="chat-bubble chat-bubble--outgoing">
                  <Text>{message.content}</Text>
                </View>
                <Image className="chat-avatar" src={MESSAGE_AVATAR} mode="aspectFill" />
              </View>
            )
          )}
        </View>
        <View id="chat-bottom" />
      </ScrollView>

      <View className="chat-input-bar">
        {replyTo ? <Text className="chat-reply-label">回复：{replyTo.content}</Text> : null}
        <Input
          className="chat-input"
          value={inputValue}
          focus={scene === 'private-chat-input'}
          adjustPosition
          cursorSpacing={12}
          onInput={event => setInputValue(event.detail.value)}
          onConfirm={() => void send()}
        />
        <View className="chat-send-button" onClick={() => void send()}>
          <Text>发送</Text>
        </View>
      </View>

      {retryTarget ? (
        <View className="chat-dialog-mask">
          <View className="chat-retry-dialog">
            <Text className="chat-dialog-title">温馨提示</Text>
            <Text className="chat-dialog-copy">重发该消息?</Text>
            <View className="chat-dialog-actions">
              <View className="chat-dialog-button" onClick={() => setRetryTarget(undefined)}>
                <Text>取消</Text>
              </View>
              <View
                className="chat-dialog-button chat-dialog-button--primary"
                onClick={() => void retry()}
              >
                <Text>重新发送</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}
