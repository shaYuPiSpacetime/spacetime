import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { messageService, mockMessageService } from '@/services/message'
import { messagePlatformRuntime } from '@/services/messagePlatformRuntime'
import type {
  MessageWhisperItem,
  MessageWhisperPage,
  WhisperBucket,
  WhisperDirection,
} from '@/types/message'
import { MESSAGE_AVATAR, MessageNav } from './shared'
import './message.scss'

interface WhisperSectionState {
  list: MessageWhisperItem[]
  totalCount: number
  cursor?: string
  hasMore: boolean
  loading: boolean
  errorMessage: string
}

function emptySection(): WhisperSectionState {
  return { list: [], totalCount: 0, hasMore: false, loading: false, errorMessage: '' }
}

function emptySections(): Record<WhisperBucket, WhisperSectionState> {
  return { pending: emptySection(), processed: emptySection() }
}

function mergePage(
  current: WhisperSectionState,
  page: MessageWhisperPage,
  append: boolean,
): WhisperSectionState {
  const list = append
    ? [...new Map([...current.list, ...page.list].map(item => [item.whisperNo, item])).values()]
    : page.list
  return {
    list,
    totalCount: page.totalCount,
    cursor: page.nextCursor || undefined,
    hasMore: page.hasMore,
    loading: false,
    errorMessage: '',
  }
}

export default function WhisperListPage() {
  const router = useRouter()
  const isMockScene = Boolean(router.params.mockScene)
  const service = isMockScene ? mockMessageService : messageService
  const [direction, setDirection] = useState<WhisperDirection>(
    router.params.mockScene === 'whisper-sent' ? 'sent' : 'received',
  )
  const [sections, setSections] = useState<Record<WhisperBucket, WhisperSectionState>>(emptySections)
  const [swipedNo, setSwipedNo] = useState('')
  const acknowledgedNos = useRef(new Set<string>())
  const loadingKeys = useRef(new Set<string>())
  const touchStartX = useRef(0)
  const directionRef = useRef(direction)

  const acknowledgeRendered = async (items: MessageWhisperItem[]) => {
    const whisperNos = items
      .filter(item => item.direction === 'received' && item.unread)
      .map(item => item.whisperNo)
      .filter(no => !acknowledgedNos.current.has(no))
    if (!whisperNos.length) return
    try {
      const result = await service.readWhispers(whisperNos)
      result.acceptedNos.forEach(no => acknowledgedNos.current.add(no))
      setSections(current => ({
        ...current,
        pending: {
          ...current.pending,
          list: current.pending.list.map(item =>
            result.acceptedNos.includes(item.whisperNo) ? { ...item, unread: false } : item,
          ),
        },
      }))
      if (!isMockScene) await messagePlatformRuntime.onForeground()
    } catch (error) {
      setSections(current => ({
        ...current,
        pending: {
          ...current.pending,
          errorMessage: error instanceof Error ? error.message : '悄悄话已读同步失败',
        },
      }))
    }
  }

  const loadSection = async (
    requestedDirection: WhisperDirection,
    bucket: WhisperBucket,
    append = false,
    cursor?: string,
  ) => {
    const key = `${requestedDirection}:${bucket}`
    if (loadingKeys.current.has(key)) return
    loadingKeys.current.add(key)
    setSections(current => ({
      ...current,
      [bucket]: { ...current[bucket], loading: true, errorMessage: '' },
    }))
    try {
      const page = await service.listWhispers(requestedDirection, bucket, append ? cursor : undefined, 20)
      if (directionRef.current !== requestedDirection) return
      setSections(current => ({
        ...current,
        [bucket]: mergePage(current[bucket], page, append),
      }))
      if (requestedDirection === 'received' && bucket === 'pending') {
        setTimeout(() => void acknowledgeRendered(page.list), 0)
      }
    } catch (error) {
      if (directionRef.current !== requestedDirection) return
      setSections(current => ({
        ...current,
        [bucket]: {
          ...current[bucket],
          loading: false,
          errorMessage: error instanceof Error ? error.message : '悄悄话列表加载失败',
        },
      }))
    } finally {
      loadingKeys.current.delete(key)
    }
  }

  const refresh = (requestedDirection = direction) => {
    if (requestedDirection === 'received') {
      void Promise.all([
        loadSection('received', 'pending'),
        loadSection('received', 'processed'),
      ])
      return
    }
    void loadSection('sent', 'pending')
  }

  useEffect(() => {
    directionRef.current = direction
    acknowledgedNos.current.clear()
    setSwipedNo('')
    setSections(emptySections())
    refresh(direction)
  }, [direction, isMockScene])

  useDidShow(() => {
    if (!isMockScene) refresh(directionRef.current)
  })

  const openDetail = (item: MessageWhisperItem) => {
    if (swipedNo === item.whisperNo) {
      setSwipedNo('')
      return
    }
    void Taro.navigateTo({
      url: `/pages/message/whisper-detail?whisperNo=${encodeURIComponent(item.whisperNo)}${isMockScene ? '&mockScene=whisper-compose' : ''}`,
    })
  }

  const hideWhisper = async (item: MessageWhisperItem, bucket: WhisperBucket) => {
    const confirmed = await Taro.showModal({
      title: '删除悄悄话',
      content: '删除后该申请将不再显示，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#F52B2B',
    })
    if (!confirmed.confirm) return
    try {
      await service.hideWhisper(item.whisperNo)
      setSections(current => ({
        ...current,
        [bucket]: {
          ...current[bucket],
          list: current[bucket].list.filter(row => row.whisperNo !== item.whisperNo),
          totalCount: Math.max(0, current[bucket].totalCount - 1),
        },
      }))
      setSwipedNo('')
      await Taro.showToast({ title: '已删除', icon: 'success' })
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : '删除失败，请稍后重试',
        icon: 'none',
      })
    }
  }

  const hideReceivedWhispers = async (bucket: WhisperBucket) => {
    const label = bucket === 'pending' ? '未处理' : '已处理'
    const confirmed = await Taro.showModal({
      title: `删除全部${label}申请`,
      content: '删除后仅从你的列表隐藏，不影响对方已保存的申请记录。',
      confirmText: '全部删除',
      confirmColor: '#F52B2B',
    })
    if (!confirmed.confirm) return
    try {
      await service.hideReceivedWhispers(bucket)
      setSections(current => ({ ...current, [bucket]: emptySection() }))
      await Taro.showToast({ title: '已全部删除', icon: 'success' })
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : '删除失败，请稍后重试',
        icon: 'none',
      })
    }
  }

  const loadMore = (bucket: WhisperBucket) => {
    const section = sections[bucket]
    if (section.hasMore && !section.loading) {
      void loadSection(direction, bucket, true, section.cursor)
    }
  }

  const renderSection = (bucket: WhisperBucket, title: string, first = false) => {
    const section = sections[bucket]
    return (
      <View>
        <View className={first ? 'whisper-section-title whisper-section-title--first' : 'whisper-section-title'}>
          <Text>{title}({section.totalCount})</Text>
          {direction === 'received' && section.list.length > 0 ? (
            <View
              role="button"
              aria-label={`删除全部${title}悄悄话`}
              onClick={() => void hideReceivedWhispers(bucket)}
              style={{ minWidth: '88px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
            >
              <Text style={{ color: '#F52B2B', fontSize: '14px' }}>全部删除</Text>
            </View>
          ) : null}
        </View>
        <View className={bucket === 'processed' ? 'whisper-card-list whisper-card-list--handled' : 'whisper-card-list'}>
          {section.list.map(item => (
            <View className="whisper-card-shell" key={item.whisperNo}>
              {direction === 'received' ? (
                <View
                  className="whisper-delete-button"
                  role="button"
                  aria-label={`删除${item.peerUser.nickname || '用户'}的悄悄话`}
                  onClick={() => void hideWhisper(item, bucket)}
                >
                  <Text>删除</Text>
                </View>
              ) : null}
              <View
                className={swipedNo === item.whisperNo ? 'whisper-card whisper-card--swiped' : 'whisper-card'}
                onTouchStart={event => { touchStartX.current = event.touches[0]?.clientX || 0 }}
                onTouchEnd={event => {
                  const endX = event.changedTouches[0]?.clientX || touchStartX.current
                  const distance = endX - touchStartX.current
                  if (distance < -30 && direction === 'received') setSwipedNo(item.whisperNo)
                  if (distance > 30) setSwipedNo('')
                }}
                onClick={() => openDetail(item)}
              >
                <Image className="whisper-card-avatar" src={item.peerUser.avatarUrl || MESSAGE_AVATAR} mode="aspectFill" />
                <Text className="whisper-card-name">{item.peerUser.nickname || '用户已注销'}</Text>
                {item.canReply ? <Text className="whisper-card-action">回复</Text> : <Text className="whisper-card-status">{item.displayStatus}</Text>}
                {item.unread ? <View className="whisper-unread-dot" /> : null}
              </View>
            </View>
          ))}
          {!section.loading && section.list.length === 0 && !section.errorMessage ? (
            <Text className="message-empty-copy">{bucket === 'pending' ? '暂无待处理悄悄话' : '暂无已处理悄悄话'}</Text>
          ) : null}
          {section.loading ? <Text className="message-empty-copy">加载中...</Text> : null}
          {section.errorMessage ? (
            <Text className="message-empty-copy" onClick={() => void loadSection(direction, bucket)}>{section.errorMessage}，点击重试</Text>
          ) : null}
          {section.hasMore && !section.loading ? (
            <View className="message-load-more" role="button" onClick={() => loadMore(bucket)}><Text>加载更多</Text></View>
          ) : null}
        </View>
      </View>
    )
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
          loadMore('pending')
          if (direction === 'received') loadMore('processed')
        }}
      >
        {renderSection('pending', direction === 'received' ? '待回复' : '等待回复', true)}
        {direction === 'received' ? renderSection('processed', '已处理') : null}
      </ScrollView>
    </View>
  )
}
