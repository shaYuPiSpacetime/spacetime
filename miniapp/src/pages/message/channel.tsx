import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { isSafeSystemJump } from '@/domain/messageRuntime'
import { messageService, mockMessageService } from '@/services/message'
import { messagePlatformRuntime } from '@/services/messagePlatformRuntime'
import type {
  AssistantMessageItem,
  OfficialChannelType,
  SystemMessageItem,
} from '@/types/message'
import { ChannelBadge, MessageNav } from './shared'
import './message.scss'

type ChannelItem =
  | { channel: 'assistant'; value: AssistantMessageItem }
  | { channel: 'system'; value: SystemMessageItem }

function formatDate(value: string): string {
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function MessageChannelPage() {
  const router = useRouter()
  const isMockScene = Boolean(router.params.mockScene)
  const channel: OfficialChannelType =
    router.params.channel === 'system' || router.params.mockScene === 'channel-system'
      ? 'system'
      : 'assistant'
  const service = isMockScene ? mockMessageService : messageService
  const [items, setItems] = useState<ChannelItem[]>([])
  const [cursor, setCursor] = useState<string>()
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const acknowledged = useRef(new Set<string>())

  const acknowledgeRendered = async (
    nextItems: ChannelItem[],
    readAck: string[] = [],
  ) => {
    try {
      if (channel === 'assistant') {
        const messageNos = nextItems
          .filter(item => item.channel === 'assistant' && item.value.readStatus === 'unread')
          .map(item => (item.value as AssistantMessageItem).assistantMessageNo)
          .filter(no => !acknowledged.current.has(no))
        if (!messageNos.length) return
        const result = await service.readAssistantMessages(messageNos)
        const acceptedNos = result.acceptedNos
        acceptedNos.forEach(no => acknowledged.current.add(no))
      } else {
        const renderedNos = new Set(
          nextItems
            .filter(item => item.channel === 'system')
            .map(item => (item.value as SystemMessageItem).noticeNo),
        )
        const noticeNos = readAck
          .filter(no => renderedNos.has(no))
          .filter(no => !acknowledged.current.has(no))
        if (!noticeNos.length) return
        const result = await service.readSystemMessages(noticeNos)
        const acceptedNos = result.acceptedNos
        acceptedNos.forEach(no => acknowledged.current.add(no))
      }
      if (!isMockScene) await messagePlatformRuntime.refreshUnread()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '消息已读同步失败')
    }
  }

  const load = async (append = false) => {
    if (loading) return
    setLoading(true)
    setErrorMessage('')
    try {
      if (channel === 'assistant') {
        const page = await service.listAssistantMessages(append ? cursor : undefined, 20)
        const mapped: ChannelItem[] = page.list.map(value => ({ channel: 'assistant', value }))
        const next = append ? [...items, ...mapped] : mapped
        setItems(next)
        setCursor(page.nextCursor || undefined)
        setHasMore(page.hasMore)
        setTimeout(() => void acknowledgeRendered(next), 0)
      } else {
        const page = await service.listSystemMessages(append ? cursor : undefined, 20)
        const mapped: ChannelItem[] = page.list.map(value => ({ channel: 'system', value }))
        const next = append ? [...items, ...mapped] : mapped
        setItems(next)
        setCursor(page.nextCursor || undefined)
        setHasMore(page.hasMore)
        setTimeout(() => void acknowledgeRendered(next, page.readAck?.noticeNos || []), 0)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '消息加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    acknowledged.current.clear()
    void load(false)
  }, [channel, isMockScene])

  const openAction = async (item: ChannelItem) => {
    const actionType = item.channel === 'assistant' ? item.value.actionType : item.value.jumpType
    const actionValue = item.channel === 'assistant' ? item.value.actionValue : item.value.jumpValue
    if (!actionType || actionType === 'none') return
    if (actionType === 'customer_service') {
      await Taro.showModal({ title: '联系客服', content: '客服工作时间：每日 09:00-21:00', showCancel: false })
      return
    }
    if (actionType === 'community_rules') {
      await Taro.showModal({ title: '社区规则', content: '请真诚、友善、安全地交流，共同维护社区环境。', showCancel: false })
      return
    }
    if (!isSafeSystemJump('miniapp_page', actionValue)) {
      await Taro.showToast({ title: '当前跳转暂不可用', icon: 'none' })
      return
    }
    if (actionValue) await Taro.navigateTo({ url: actionValue })
  }

  return (
    <View className="message-page message-page--gray channel-page">
      <MessageNav title={channel === 'assistant' ? '官方小助手' : '系统消息'} center />
      <ScrollView scrollY className="channel-scroll" showScrollbar={false} onScrollToLower={() => { if (hasMore) void load(true) }}>
        <View className="channel-content">
          {items.map(item => {
            const no = item.channel === 'assistant' ? item.value.assistantMessageNo : item.value.noticeNo
            const actionType = item.channel === 'assistant' ? item.value.actionType : item.value.jumpType
            return (
              <View key={no}>
                <Text className="channel-date">{formatDate(item.value.createdTime)}</Text>
                <ChannelCard type={channel}>
                  <Text className="channel-card-title">{item.value.title}</Text>
                  <Text className="channel-card-body channel-card-body--spaced">{item.value.content}</Text>
                  {actionType && actionType !== 'none' ? <View className="channel-card-action" onClick={() => void openAction(item)}><Text>查看</Text><Text>〉</Text></View> : null}
                </ChannelCard>
              </View>
            )
          })}
          {!loading && items.length === 0 && !errorMessage ? <Text className="message-empty-copy">暂无消息</Text> : null}
          {loading ? <Text className="message-empty-copy">加载中...</Text> : null}
          {errorMessage ? <Text className="message-empty-copy" onClick={() => void load(false)}>{errorMessage}，点击重试</Text> : null}
        </View>
      </ScrollView>
      <View className="channel-footer">
        <View onClick={() => void Taro.showModal({ title: '联系客服', content: '客服工作时间：每日 09:00-21:00', showCancel: false })}><Text>联系客服</Text></View>
        <View className="channel-footer-divider" />
        <View onClick={() => void Taro.showModal({ title: '社区规则', content: '请真诚、友善、安全地交流，共同维护社区环境。', showCancel: false })}><Text>社区规则</Text></View>
      </View>
    </View>
  )
}

function ChannelCard({ type, children }: { type: OfficialChannelType; children: React.ReactNode }) {
  const h5Class = Taro.getEnv() === Taro.ENV_TYPE.WEB ? ' channel-card--h5' : ''
  return <View className="channel-message-row"><ChannelBadge type={type} /><View className={`channel-card${h5Class}`}>{children}</View></View>
}
