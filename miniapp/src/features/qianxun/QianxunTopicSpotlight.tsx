import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { miniappOssIcons } from '@/constants/ossIcons'
import type { CommunityTopicCardVO, CommunityTopicHomeVO } from '@/services/community'

const BLUE = '#2876FF'

interface Props {
  home?: CommunityTopicHomeVO
  loading?: boolean
  onRetry?: () => void
}

export default function QianxunTopicSpotlight({ home, loading = false, onRetry }: Props) {
  if (loading && !home?.featured) return <TopicSpotlightSkeleton />
  if (!home?.featured) {
    return <View style={{ width: '700rpx', minHeight: '182rpx', marginBottom: '20rpx', borderRadius: '18rpx', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#999999', fontSize: '24rpx' }}>暂时没有社区话题</Text>
      {onRetry ? <Text onClick={onRetry} style={{ color: BLUE, fontSize: '24rpx', marginTop: '16rpx' }}>重新加载</Text> : null}
    </View>
  }

  const featured = home.featured
  return <View id="qianxun-topic-spotlight" style={{ width: '700rpx', borderRadius: '18rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '32rpx 26rpx 24rpx', boxSizing: 'border-box', overflow: 'hidden' }}>
    <View style={{ height: '50rpx', display: 'flex', alignItems: 'center' }}>
      <View style={{ width: '38rpx', height: '38rpx', borderRadius: '10rpx', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '31rpx', lineHeight: '36rpx', fontWeight: 700 }}>#</Text></View>
      <Text style={{ color: '#333333', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 600, marginLeft: '12rpx' }}>社区话题</Text>
      <View style={{ flex: 1 }} />
      <View id="qianxun-topic-all" onClick={() => void Taro.navigateTo({ url: '/pages/qianxun/topics' })} style={{ minWidth: '138rpx', height: '50rpx', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Text style={{ color: '#777777', fontSize: '27rpx', lineHeight: '38rpx' }}>全部话题</Text><Text style={{ color: '#999999', fontSize: '39rpx', lineHeight: '42rpx', marginLeft: '7rpx', fontWeight: 200 }}>›</Text>
      </View>
    </View>

    <View id="qianxun-topic-featured" onClick={() => openTopic(featured)} style={{ display: 'flex', marginTop: '28rpx' }}>
      <Image src={topicImage(featured)} mode="aspectFill" style={{ width: '176rpx', height: '176rpx', borderRadius: '12rpx', background: '#EDF1F5', flexShrink: 0 }} />
      <View style={{ minWidth: 0, flex: 1, marginLeft: '18rpx', paddingTop: '3rpx' }}>
        <Text style={{ display: 'block', color: '#333333', fontSize: '31rpx', lineHeight: '44rpx', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Text style={{ color: BLUE, fontSize: '37rpx' }}>#</Text> {featured.name}</Text>
        <Text style={{ display: '-webkit-box', color: '#333333', fontSize: '24rpx', lineHeight: '39rpx', height: '78rpx', marginTop: '9rpx', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{featured.description || featured.previewContent || '分享真实的生活，也听见彼此的故事。'}</Text>
        <View style={{ height: '42rpx', display: 'flex', alignItems: 'center', marginTop: '5rpx' }}>
          <TopicAvatars urls={featured.participantAvatars || []} />
          <Text style={{ color: '#AAAAAA', fontSize: '22rpx', marginLeft: '11rpx' }}>{formatBrowseCount(featured.postCount)}</Text>
        </View>
      </View>
    </View>

    {home.related?.length ? <View style={{ marginTop: '18rpx', borderRadius: '12rpx', background: '#F6F7F9', padding: '14rpx 14rpx 12rpx', display: 'flex', flexWrap: 'wrap', boxSizing: 'border-box' }}>
      {home.related.slice(0, 4).map(item => <RelatedTopic key={item.id} topic={item} />)}
    </View> : null}
    <View style={{ height: '28rpx', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}><View style={{ width: '20rpx', height: '6rpx', borderRadius: '3rpx', background: BLUE }} /><View style={{ width: '6rpx', height: '6rpx', borderRadius: '3rpx', background: '#A9AAAD', marginLeft: '8rpx' }} /><View style={{ width: '6rpx', height: '6rpx', borderRadius: '3rpx', background: '#A9AAAD', marginLeft: '8rpx' }} /></View>
  </View>
}

function RelatedTopic({ topic }: { topic: CommunityTopicCardVO }) {
  return <View onClick={() => openTopic(topic)} style={{ width: '50%', height: '50rpx', padding: '0 8rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
    <Image src={topicImage(topic)} mode="aspectFill" style={{ width: '38rpx', height: '38rpx', borderRadius: '7rpx', background: '#E9EDF2', flexShrink: 0 }} />
    <Text style={{ color: '#333333', fontSize: '23rpx', lineHeight: '32rpx', fontWeight: 500, marginLeft: '10rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}># {topic.name}</Text>
    <Text style={{ color: '#333333', fontSize: '32rpx', lineHeight: '36rpx', marginLeft: 'auto' }}>›</Text>
  </View>
}

function TopicAvatars({ urls }: { urls: string[] }) {
  const avatars = (urls.length ? urls : [miniappOssIcons.qianxunTopicAvatar]).slice(0, 5)
  return <View style={{ display: 'flex', width: `${30 + Math.max(0, avatars.length - 1) * 20}rpx`, height: '30rpx' }}>{avatars.map((url, index) => <Image key={`${url}-${index}`} src={url || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '30rpx', height: '30rpx', borderRadius: '15rpx', border: '2rpx solid #FFFFFF', marginLeft: index ? '-10rpx' : 0, background: '#EEF2F6', boxSizing: 'border-box' }} />)}</View>
}

function TopicSpotlightSkeleton() {
  return <View style={{ width: '700rpx', height: '430rpx', marginBottom: '20rpx', borderRadius: '18rpx', background: '#FFFFFF', padding: '32rpx 26rpx', boxSizing: 'border-box' }}><View style={{ width: '180rpx', height: '40rpx', borderRadius: '8rpx', background: '#F1F3F6' }} /><View style={{ width: '648rpx', height: '176rpx', borderRadius: '12rpx', background: '#F4F5F7', marginTop: '28rpx' }} /><View style={{ width: '648rpx', height: '114rpx', borderRadius: '12rpx', background: '#F4F5F7', marginTop: '18rpx' }} /></View>
}

function topicImage(topic: CommunityTopicCardVO) {
  return topic.coverUrl || topic.previewImageUrl || miniappOssIcons.qianxunTopicThumb
}

function openTopic(topic: CommunityTopicCardVO) {
  void Taro.navigateTo({ url: `/pages/qianxun/topic?topicId=${topic.id}&topicName=${encodeURIComponent(topic.name || '')}` })
}

function formatBrowseCount(value: number) {
  const count = Number(value || 0)
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}亿浏览`
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万浏览`
  return `${count}浏览`
}
