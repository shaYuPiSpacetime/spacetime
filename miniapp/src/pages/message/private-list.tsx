import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { mergeConversationBindings } from '@/domain/messageRuntime'
import { messageImGateway, mockMessageImGateway } from '@/im'
import { messageRuntime } from '@/im/messageRuntime'
import { messageService, mockMessageService } from '@/services/message'
import type { MessageConversationView } from '@/types/message'
import { MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

function formatDate(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`
}

export default function PrivateListPage() {
  const router = useRouter()
  const isMockScene = Boolean(router.params.mockScene)
  const [conversations, setConversations] = useState<MessageConversationView[]>([])
  const [cursor, setCursor] = useState<string>()
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const load = async (append = false) => {
    if (loading) return
    setLoading(true)
    setErrorMessage('')
    try {
      const service = isMockScene ? mockMessageService : messageService
      const gateway = isMockScene ? mockMessageImGateway : messageImGateway
      if (!isMockScene) await messageRuntime.onForeground()
      if (isMockScene && !gateway.isReady()) await gateway.initialize(await service.getImCredentials())
      const page = await service.listConversations(append ? cursor : undefined, 20)
      const timConversations = gateway.isReady() ? await gateway.listConversations() : []
      const merged = mergeConversationBindings(page.list, timConversations)
      setConversations(current => (append ? [...current, ...merged] : merged))
      setCursor(page.nextCursor || undefined)
      setHasMore(page.hasMore)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '私信列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(false)
  }, [isMockScene])

  useDidShow(() => {
    if (!isMockScene) void load(false)
  })

  return (
    <View className="message-page private-list-page">
      <MessageNav title="私信" center />
      <ScrollView
        scrollY
        className="private-list-scroll"
        showScrollbar={false}
        onScrollToLower={() => {
          if (hasMore) void load(true)
        }}
      >
        {conversations.map(row => (
          <View
            className="private-list-row"
            key={row.conversationNo}
            onClick={() =>
              void Taro.navigateTo({
                url: `/pages/message/private-chat?conversationNo=${encodeURIComponent(row.conversationNo)}${isMockScene ? '&mockScene=private-chat-default' : ''}`,
              })
            }
          >
            <View style={{ position: 'relative' }}>
              <Image className="private-list-avatar" src={row.peerUser.avatarUrl || MESSAGE_AVATAR} mode="aspectFill" />
              {row.platformUnreadCount ? <Text className="message-unread">{row.platformUnreadCount > 99 ? '99+' : row.platformUnreadCount}</Text> : null}
            </View>
            <View className="private-list-copy">
              <Text className="private-list-name">{row.peerUser.nickname || '用户已注销'}</Text>
              <Text className="private-list-preview">{row.lastMessagePreview || '点击进入会话'}</Text>
            </View>
            <Text className="private-list-time">{formatDate(row.lastMessageAt)}</Text>
          </View>
        ))}
        {!loading && conversations.length === 0 && !errorMessage ? <Text className="message-empty-copy">暂无私信</Text> : null}
        {loading ? <Text className="message-empty-copy">加载中...</Text> : null}
        {errorMessage ? <Text className="message-empty-copy" onClick={() => void load(false)}>{errorMessage}，点击重试</Text> : null}
      </ScrollView>
    </View>
  )
}
