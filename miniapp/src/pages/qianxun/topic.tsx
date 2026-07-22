import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  getCommunityConfig,
  getCommunityTopicPosts,
  toggleCommunityLike,
  type CommunityPostVO,
} from '@/services/community'

const BLUE = '#2876FF'
const NAVY = '#0C285A'

export default function QianxunTopicPage() {
  const [topicId, setTopicId] = useState<number>()
  const [topicName, setTopicName] = useState('社区话题')
  const [posts, setPosts] = useState<CommunityPostVO[]>([])
  const [topicTotal, setTopicTotal] = useState(0)
  const [sort, setSort] = useState<'HOT' | 'LATEST'>('HOT')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadTopic = async (requestedId?: number, requestedName?: string) => {
    setLoading(true)
    setLoadError('')
    try {
      const config = await getCommunityConfig()
      const id = requestedId || Number(config.topics?.[0]?.code)
      const topic = config.topics?.find(item => Number(item.code) === id)
      if (!Number.isFinite(id) || id <= 0) {
        setLoadError('暂无可浏览的话题')
        return
      }
      setTopicId(id)
      setTopicName(requestedName || topic?.label || '社区话题')
      const page = await getCommunityTopicPosts(id, 1, 30)
      setPosts(page.records || [])
      setTopicTotal(Number(page.total || 0))
    } catch (error) {
      setLoadError(toErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useLoad(options => {
    const id = Number(options.topicId)
    const name = options.topicName ? decodeURIComponent(options.topicName) : ''
    void loadTopic(Number.isFinite(id) && id > 0 ? id : undefined, name)
  })

  const visiblePosts = useMemo(() => [...posts].sort((a, b) => sort === 'HOT' ? (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount) : dateValue(b.createTime) - dateValue(a.createTime)), [posts, sort])

  const likePost = async (post: CommunityPostVO) => {
    try {
      const result = await toggleCommunityLike(post.id)
      setPosts(items => items.map(item => item.id === post.id ? { ...item, liked: result.liked, likeCount: result.likeCount } : item))
    } catch (error) {
      await Taro.showToast({ title: toErrorMessage(error), icon: 'none' })
    }
  }

  return (
    <View id="qianxun-topic-page" style={{ height: '100vh', background: '#F4F6F9', overflow: 'hidden' }}>
      <TopicHero name={topicName} count={topicTotal} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: '430rpx', bottom: 0, borderRadius: '24rpx 24rpx 0 0', background: '#F4F6F9', overflow: 'hidden' }}>
        <View style={{ height: '80rpx', padding: '0 28rpx', background: '#FFFFFF', display: 'flex', alignItems: 'center' }}>
          <View onClick={() => setSort('HOT')} style={{ height: '80rpx', marginRight: '40rpx', display: 'flex', alignItems: 'center', position: 'relative' }}><Text style={{ color: sort === 'HOT' ? NAVY : '#9DA3AE', fontSize: '26rpx', fontWeight: sort === 'HOT' ? 600 : 400 }}>热门</Text>{sort === 'HOT' ? <View style={{ position: 'absolute', left: '50%', bottom: '3rpx', width: '44rpx', height: '5rpx', borderRadius: '3rpx', background: BLUE, transform: 'translateX(-50%)' }} /> : null}</View>
          <View onClick={() => setSort('LATEST')} style={{ height: '80rpx', display: 'flex', alignItems: 'center', position: 'relative' }}><Text style={{ color: sort === 'LATEST' ? NAVY : '#9DA3AE', fontSize: '26rpx', fontWeight: sort === 'LATEST' ? 600 : 400 }}>最新</Text>{sort === 'LATEST' ? <View style={{ position: 'absolute', left: '50%', bottom: '3rpx', width: '44rpx', height: '5rpx', borderRadius: '3rpx', background: BLUE, transform: 'translateX(-50%)' }} /> : null}</View>
        </View>
        <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: '80rpx', bottom: 0 }} showScrollbar={false}>
          <View style={{ padding: '16rpx 20rpx calc(150rpx + env(safe-area-inset-bottom))' }}>
            {loading ? <LoadingCards /> : loadError ? <TopicEmpty title={loadError} /> : visiblePosts.length ? visiblePosts.map(post => <TopicPostCard key={post.id} post={post} onLike={() => void likePost(post)} />) : <TopicEmpty title="该话题还没有动态" />}
          </View>
        </ScrollView>
      </View>
      <View onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/compose${topicId ? `?topicId=${topicId}` : ''}` })} style={{ position: 'fixed', left: '50%', bottom: 'calc(30rpx + env(safe-area-inset-bottom))', width: '240rpx', height: '82rpx', borderRadius: '41rpx', background: BLUE, boxShadow: '0 12rpx 28rpx rgba(40,118,255,0.28)', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}><Text style={{ color: '#FFFFFF', fontSize: '27rpx', fontWeight: 600 }}>参与话题</Text></View>
    </View>
  )
}

function TopicHero({ name, count }: { name: string; count: number }) {
  return <View style={{ position: 'relative', height: '454rpx', overflow: 'hidden', background: '#203047' }}>
    <Image src={miniappOssIcons.qianxunTopicCover} mode="aspectFill" style={{ position: 'absolute', inset: 0, width: '750rpx', height: '454rpx' }} />
    <View style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(9,20,39,.18) 0%, rgba(9,20,39,.7) 100%)' }} />
    <View onClick={() => void Taro.navigateBack()} style={{ position: 'absolute', left: '18rpx', top: '88rpx', width: '82rpx', height: '70rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '54rpx' }}>‹</Text></View>
    <View style={{ position: 'absolute', right: '74rpx', top: '96rpx', width: '92rpx', height: '48rpx', borderRadius: '24rpx', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#516277', fontSize: '28rpx', letterSpacing: '4rpx' }}>•••</Text></View>
    <View style={{ position: 'absolute', left: '28rpx', right: '28rpx', bottom: '50rpx' }}>
      <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '34rpx', lineHeight: '48rpx', fontWeight: 700 }}># {name}</Text>
      <Text style={{ display: 'block', color: 'rgba(255,255,255,.86)', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '10rpx' }}>{count}条动态 · 和有共同话题的人交换真实生活与想法</Text>
      <Text style={{ display: 'block', color: 'rgba(255,255,255,.92)', fontSize: '23rpx', lineHeight: '36rpx', marginTop: '10rpx' }}>关注当下的感受，也尊重每一种不同的表达。</Text>
    </View>
  </View>
}

function TopicPostCard({ post, onLike }: { post: CommunityPostVO; onLike: () => void }) {
  return <View onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` })} style={{ borderRadius: '14rpx', background: '#FFFFFF', marginBottom: '14rpx', padding: '22rpx', overflow: 'hidden' }}>
    <View style={{ display: 'flex', alignItems: 'center' }}><Image src={post.authorAvatar || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '66rpx', height: '66rpx', borderRadius: '33rpx', background: '#EFF3F7' }} /><View style={{ flex: 1, marginLeft: '14rpx' }}><Text style={{ display: 'block', color: '#303B4A', fontSize: '24rpx', fontWeight: 600 }}>{post.authorName || '用户'}</Text><Text style={{ display: 'block', color: '#7F8EA4', fontSize: '20rpx', marginTop: '5rpx' }}>{relativeTime(post.createTime)}</Text></View><Text style={{ color: '#A9ADB5', fontSize: '30rpx' }}>⋮</Text></View>
    {post.title ? <Text style={{ display: 'block', color: '#283548', fontSize: '27rpx', fontWeight: 600, lineHeight: '42rpx', marginTop: '18rpx' }}>{post.title}</Text> : null}
    <Text style={{ display: 'block', color: '#3E4755', fontSize: '25rpx', lineHeight: '42rpx', marginTop: '16rpx' }}>{post.content}</Text>
    <TopicImages images={post.imageUrls || []} />
    <View style={{ height: '62rpx', borderTop: '1rpx solid #F0F2F5', marginTop: '18rpx', display: 'flex', alignItems: 'flex-end' }}><Text style={{ color: BLUE, fontSize: '22rpx' }}>◉ 私信</Text><View style={{ flex: 1 }} /><Text style={{ color: '#A4A9B2', fontSize: '22rpx', marginRight: '24rpx' }}>◯ {post.commentCount || 0}</Text><View onClick={event => { event.stopPropagation(); onLike() }} style={{ minWidth: '72rpx', display: 'flex', justifyContent: 'flex-end' }}><Text style={{ color: post.liked ? '#F06E78' : '#A4A9B2', fontSize: '22rpx' }}>{post.liked ? '♥' : '♡'} {post.likeCount || 0}</Text></View></View>
  </View>
}

function TopicImages({ images }: { images: string[] }) {
  const visible = images.slice(0, 3)
  if (!visible.length) return null
  return <View style={{ display: 'flex', gap: '8rpx', marginTop: '18rpx' }}>{visible.map((url, index) => <Image key={`${url}-${index}`} src={url} mode="aspectFill" style={{ width: visible.length === 1 ? '666rpx' : visible.length === 2 ? '329rpx' : '216rpx', height: visible.length === 1 ? '420rpx' : '210rpx', borderRadius: '7rpx', background: '#EEF2F6' }} />)}</View>
}

function TopicEmpty({ title }: { title: string }) {
  return <View style={{ paddingTop: '90rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunEmptyFollowing} mode="aspectFit" style={{ width: '280rpx', height: '210rpx' }} /><Text style={{ color: '#999999', fontSize: '25rpx', marginTop: '20rpx' }}>{title}</Text></View>
}

function LoadingCards() {
  return <View>{[0, 1].map(index => <View key={index} style={{ height: '350rpx', borderRadius: '14rpx', background: '#FFFFFF', marginBottom: '14rpx' }} />)}</View>
}

function relativeTime(value: string) {
  const timestamp = dateValue(value)
  if (!timestamp) return value || ''
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return `${Math.floor(minutes / 1440)}天前`
}

function dateValue(value: string) {
  const result = new Date(String(value || '').replace(' ', 'T')).getTime()
  return Number.isFinite(result) ? result : 0
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || '加载失败')
}
