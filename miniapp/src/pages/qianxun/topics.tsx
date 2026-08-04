import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import NativeNavigation, { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  COMMUNITY_COPY_KEYS,
  getCommunityMeta,
  getCommunityTopics,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  type CommunityConfig,
  type CommunityTopicCardVO,
} from '@/services/community'

const PAGE_SIZE = 10
const BLUE = '#2876FF'

export default function QianxunTopicsPage() {
  const metrics = getNativeNavigationMetrics()
  const [topics, setTopics] = useState<CommunityTopicCardVO[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [config, setConfig] = useState<CommunityConfig>()

  const loadPage = async (nextPage: number, reset = false) => {
    if (loading || (!reset && !hasMore)) return
    setLoading(true)
    setErrorMessage('')
    try {
      const [runtime, result] = await Promise.all([
        config ? Promise.resolve(config) : getCommunityMeta(),
        getCommunityTopics(nextPage, PAGE_SIZE),
      ])
      setConfig(runtime)
      const records = result.records || []
      setTopics(current => reset ? records : mergeTopics(current, records))
      setPage(nextPage)
      setHasMore(nextPage * PAGE_SIZE < Number(result.total || 0))
    } catch (error) {
      setErrorMessage(resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.loadFailed, error))
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    void loadPage(1, true)
  })

  return <View id="qianxun-topics-page" style={{ height: '100vh', background: '#F4F5F7', overflow: 'hidden' }}>
    <NativeNavigation title="社区话题" titleFontWeight={500} />
    <ScrollView scrollY onScrollToLower={() => void loadPage(page + 1)} lowerThreshold={120} style={{ position: 'absolute', left: 0, right: 0, top: `${metrics.navigationHeight}rpx`, bottom: 0 }} showScrollbar={false}>
      <View style={{ width: '750rpx', padding: '20rpx 25rpx calc(42rpx + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}>
        {topics.map(topic => <TopicListCard key={topic.id} topic={topic} config={config} />)}
        {!topics.length && loading ? <TopicListSkeleton /> : null}
        {!topics.length && !loading ? <ListState text={errorMessage || resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyTopics)} action={errorMessage ? () => void loadPage(1, true) : undefined} /> : null}
        {topics.length && loading ? <Text style={{ display: 'block', color: '#AAAAAA', fontSize: '22rpx', lineHeight: '72rpx', textAlign: 'center' }}>{resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.loading)}</Text> : null}
        {topics.length && errorMessage ? <ListState text={errorMessage} action={() => void loadPage(page + 1)} compact /> : null}
        {topics.length && !hasMore && !loading ? <Text style={{ display: 'block', color: '#B0B0B0', fontSize: '22rpx', lineHeight: '72rpx', textAlign: 'center' }}>{resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.listEnd)}</Text> : null}
      </View>
    </ScrollView>
  </View>
}

function TopicListCard({ topic, config }: { topic: CommunityTopicCardVO; config?: CommunityConfig }) {
  const open = () => void Taro.navigateTo({ url: `/pages/qianxun/topic?topicId=${topic.id}&topicName=${encodeURIComponent(topic.name || '')}` })
  return <View onClick={open} style={{ width: '700rpx', minHeight: '278rpx', borderRadius: '16rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '24rpx 24rpx 22rpx', boxSizing: 'border-box' }}>
    <View style={{ display: 'flex', alignItems: 'center' }}>
      <View style={{ width: '36rpx', height: '36rpx', borderRadius: '9rpx', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Text style={{ color: '#FFFFFF', fontSize: '29rpx', lineHeight: '34rpx', fontWeight: 700 }}>#</Text></View>
      <Text style={{ maxWidth: '430rpx', color: '#333333', fontSize: '29rpx', lineHeight: '42rpx', fontWeight: 600, marginLeft: '12rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.name}</Text>
      <View style={{ flex: 1 }} />
      <Text style={{ color: '#9A9A9A', fontSize: '22rpx' }}>{formatPostCount(topic.postCount)}</Text>
      <Text style={{ color: '#A9A9A9', fontSize: '34rpx', lineHeight: '38rpx', marginLeft: '8rpx' }}>›</Text>
    </View>
    <View style={{ display: 'flex', marginTop: '18rpx' }}>
      <Image src={topic.coverUrl || topic.previewImageUrl || miniappOssIcons.qianxunTopicThumb} mode="aspectFill" style={{ width: '128rpx', height: '128rpx', borderRadius: '10rpx', background: '#EEF1F5', flexShrink: 0 }} />
      <View style={{ minWidth: 0, flex: 1, height: '128rpx', marginLeft: '18rpx', display: 'flex', flexDirection: 'column' }}>
        <Text style={{ display: '-webkit-box', color: '#555555', fontSize: '24rpx', lineHeight: '37rpx', height: '74rpx', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{topic.description || topic.previewContent || resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.topicDefaultDescription)}</Text>
        <View style={{ display: 'flex', alignItems: 'center', marginTop: 'auto' }}>
          <Image src={topic.previewAuthorAvatar || topic.participantAvatars?.[0] || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '32rpx', height: '32rpx', borderRadius: '16rpx', background: '#EEF2F6' }} />
          <Text style={{ maxWidth: '220rpx', color: '#999999', fontSize: '20rpx', marginLeft: '9rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.previewAuthorName || resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.topicDefaultUser)}</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ color: '#B0B0B0', fontSize: '20rpx' }}>{formatDate(topic.previewCreateTime)}</Text>
        </View>
      </View>
    </View>
  </View>
}

function TopicListSkeleton() {
  return <>{[0, 1, 2].map(index => <View key={index} style={{ width: '700rpx', height: '278rpx', borderRadius: '16rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '24rpx', boxSizing: 'border-box' }}><View style={{ width: '280rpx', height: '36rpx', borderRadius: '8rpx', background: '#F0F2F5' }} /><View style={{ width: '652rpx', height: '128rpx', borderRadius: '10rpx', background: '#F4F5F7', marginTop: '20rpx' }} /></View>)}</>
}

function ListState({ text, action, compact = false }: { text: string; action?: () => void; compact?: boolean }) {
  return <View style={{ minHeight: compact ? '120rpx' : '450rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#999999', fontSize: '24rpx' }}>{text}</Text>{action ? <View onClick={action} style={{ height: '58rpx', borderRadius: '29rpx', padding: '0 28rpx', marginTop: '18rpx', border: `1rpx solid ${BLUE}`, display: 'flex', alignItems: 'center' }}><Text style={{ color: BLUE, fontSize: '24rpx' }}>重新加载</Text></View> : null}</View>
}

function mergeTopics(current: CommunityTopicCardVO[], next: CommunityTopicCardVO[]) {
  const map = new Map(current.map(item => [item.id, item]))
  next.forEach(item => map.set(item.id, item))
  return Array.from(map.values())
}

function formatPostCount(value: number) {
  const count = Number(value || 0)
  return count >= 10000 ? `${(count / 10000).toFixed(1)}万条动态` : `${count}条动态`
}

function formatDate(value?: string) {
  if (!value) return ''
  return value.slice(0, 10).replace(/-/g, '.')
}
