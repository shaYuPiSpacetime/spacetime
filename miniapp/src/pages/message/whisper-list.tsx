import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { messageRuntime } from '@/im/messageRuntime'
import { messageService, mockMessageService } from '@/services/message'
import type { MessageWhisperItem, WhisperDirection } from '@/types/message'
import { MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

export default function WhisperListPage() {
  const router = useRouter()
  const isMockScene = Boolean(router.params.mockScene)
  const service = isMockScene ? mockMessageService : messageService
  const [direction, setDirection] = useState<WhisperDirection>(
    router.params.mockScene === 'whisper-sent' ? 'sent' : 'received',
  )
  const [records, setRecords] = useState<MessageWhisperItem[]>([])
  const [cursor, setCursor] = useState<string>()
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const acknowledgedNos = useRef(new Set<string>())

  const acknowledgeRendered = async (items: MessageWhisperItem[]) => {
    const whisperNos = items
      .filter(item => item.direction === 'received' && item.unread)
      .map(item => item.whisperNo)
      .filter(no => !acknowledgedNos.current.has(no))
    if (!whisperNos.length) return
    try {
      const result = await service.readWhispers(whisperNos)
      result.acceptedNos.forEach(no => acknowledgedNos.current.add(no))
      setRecords(current =>
        current.map(item =>
          result.acceptedNos.includes(item.whisperNo) ? { ...item, unread: false } : item,
        ),
      )
      if (!isMockScene) await messageRuntime.refreshUnread()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '悄悄话已读同步失败')
    }
  }

  const load = async (append = false) => {
    if (loading) return
    setLoading(true)
    setErrorMessage('')
    try {
      const page = await service.listWhispers(direction, append ? cursor : undefined, 20)
      const next = append ? [...records, ...page.list] : page.list
      setRecords(next)
      setCursor(page.nextCursor || undefined)
      setHasMore(page.hasMore)
      setTimeout(() => void acknowledgeRendered(next), 0)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '悄悄话列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    acknowledgedNos.current.clear()
    void load(false)
  }, [direction, isMockScene])

  useDidShow(() => {
    if (!isMockScene) void load(false)
  })

  const openDetail = (item: MessageWhisperItem) => {
    void Taro.navigateTo({
      url: `/pages/message/whisper-detail?whisperNo=${encodeURIComponent(item.whisperNo)}${isMockScene ? '&mockScene=whisper-compose' : ''}`,
    })
  }

  return (
    <View className="message-page whisper-list-page">
      <MessageNav>
        <View className="whisper-tabs">
          <View className={direction === 'received' ? 'whisper-tab whisper-tab--active' : 'whisper-tab'} onClick={() => setDirection('received')}><Text>申请我的</Text></View>
          <View className={direction === 'sent' ? 'whisper-tab whisper-tab--active' : 'whisper-tab'} onClick={() => setDirection('sent')}><Text>我申请的</Text></View>
        </View>
      </MessageNav>
      <ScrollView
        scrollY
        className="whisper-scroll"
        showScrollbar={false}
        onScrollToLower={() => {
          if (hasMore) void load(true)
        }}
      >
        <View className="whisper-section-title whisper-section-title--first">
          <Text>{direction === 'received' ? `待回复(${records.length})` : `等待回复(${records.length})`}</Text>
        </View>
        <View className="whisper-card-list">
          {records.map(item => (
            <View className="whisper-card-shell" key={item.whisperNo}>
              <View className="whisper-card" onClick={() => openDetail(item)}>
                <Image className="whisper-card-avatar" src={item.peerUser.avatarUrl || MESSAGE_AVATAR} mode="aspectFill" />
                <Text className="whisper-card-name">{item.peerUser.nickname || '用户已注销'}</Text>
                {item.canReply ? <Text className="whisper-card-action">回复</Text> : <Text className="whisper-card-status">{item.displayStatus}</Text>}
                {item.unread ? <View className="whisper-unread-dot" /> : null}
              </View>
            </View>
          ))}
        </View>
        {!loading && records.length === 0 && !errorMessage ? <Text className="message-empty-copy">暂无待处理悄悄话</Text> : null}
        {loading ? <Text className="message-empty-copy">加载中...</Text> : null}
        {errorMessage ? <Text className="message-empty-copy" onClick={() => void load(false)}>{errorMessage}，点击重试</Text> : null}
      </ScrollView>
    </View>
  )
}
