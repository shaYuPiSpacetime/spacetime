import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getCommunityPosts, toggleCommunityLike, type CommunityPostVO } from '@/services/community'

const BLUE = '#2876FF'
const NAVY = '#0C285A'

interface KindredCard {
  key: string
  image: string
  post: CommunityPostVO
}

export default function QianxunKindredPage() {
  const [posts, setPosts] = useState<CommunityPostVO[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadCards = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const page = await getCommunityPosts('HOT', 1, 30)
      setPosts(page.records || [])
    } catch (error) {
      setLoadError(toErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadCards()
  })

  const cards = useMemo<KindredCard[]>(() => posts.flatMap(post => (post.imageUrls || []).slice(0, 2).map((image, index) => ({ key: `${post.id}-${index}`, image, post }))).slice(0, 20), [posts])
  const leftCards = cards.filter((_, index) => index % 2 === 0)
  const rightCards = cards.filter((_, index) => index % 2 === 1)

  const likePost = async (post: CommunityPostVO) => {
    try {
      const result = await toggleCommunityLike(post.id)
      setPosts(items => items.map(item => item.id === post.id ? { ...item, liked: result.liked, likeCount: result.likeCount } : item))
    } catch (error) {
      await Taro.showToast({ title: toErrorMessage(error), icon: 'none' })
    }
  }

  return (
    <View id="qianxun-kindred-page" style={{ height: '100vh', background: 'linear-gradient(130deg, #F2FEFC 0%, #F4F7FF 55%, #FEFFF6 100%)', overflow: 'hidden' }}>
      <KindredHeader />
      <View style={{ position: 'absolute', left: '24rpx', top: '214rpx', height: '58rpx', display: 'flex', alignItems: 'center' }}>
        <View style={{ height: '50rpx', borderRadius: '10rpx', background: '#E3F1FE', padding: '0 24rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: BLUE, fontSize: '25rpx', fontWeight: 600 }}>推荐</Text></View>
        <View style={{ height: '50rpx', padding: '0 24rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#8B96A8', fontSize: '25rpx' }}>谁看过我</Text></View>
      </View>
      <Text style={{ position: 'absolute', left: '25rpx', top: '285rpx', color: '#A0A6B0', fontSize: '22rpx', lineHeight: '32rpx' }}>发现志同道合的朋友，即刻交流</Text>
      <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: '332rpx', bottom: 0 }} showScrollbar={false}>
        {loading ? <KindredLoading /> : loadError ? <KindredEmpty title={loadError} /> : cards.length ? (
          <View style={{ display: 'flex', alignItems: 'flex-start', gap: '10rpx', padding: '0 20rpx calc(50rpx + env(safe-area-inset-bottom))' }}>
            <View style={{ width: '350rpx' }}>{leftCards.map((card, index) => <PhotoCard key={card.key} card={card} tall={index % 3 === 1} onLike={() => void likePost(card.post)} />)}</View>
            <View style={{ width: '350rpx' }}>{rightCards.map((card, index) => <PhotoCard key={card.key} card={card} tall={index % 3 !== 1} onLike={() => void likePost(card.post)} />)}</View>
          </View>
        ) : <KindredEmpty title="暂时没有可展示的知音照片" />}
      </ScrollView>
    </View>
  )
}

function KindredHeader() {
  return <View style={{ position: 'relative', height: '196rpx' }}>
    <View style={{ position: 'absolute', left: '30rpx', top: '96rpx', height: '58rpx', display: 'flex', alignItems: 'center' }}>
      <View onClick={() => void Taro.switchTab({ url: '/pages/recommend/index' })} style={{ width: '90rpx', height: '58rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#7F8494', fontSize: '28rpx', fontWeight: 500 }}>成家</Text></View>
      <View style={{ position: 'relative', width: '90rpx', height: '58rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: NAVY, fontSize: '32rpx', fontWeight: 600 }}>知音</Text><View style={{ position: 'absolute', left: 0, bottom: 0, width: '64rpx', height: '7rpx', borderRadius: '4rpx', background: BLUE }} /></View>
      <View style={{ width: '90rpx', height: '58rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#7F8494', fontSize: '28rpx', fontWeight: 500 }}>立业</Text></View>
    </View>
    <Image src={miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ position: 'absolute', right: '188rpx', top: '95rpx', width: '58rpx', height: '58rpx', borderRadius: '29rpx', background: '#EDF2F6' }} />
  </View>
}

function PhotoCard({ card, tall, onLike }: { card: KindredCard; tall: boolean; onLike: () => void }) {
  const height = tall ? 500 : 440
  const meta = [card.post.authorBirthYear ? `${String(card.post.authorBirthYear).slice(-2)}年` : card.post.authorAge ? `${card.post.authorAge}岁` : '', card.post.authorCity || ''].filter(Boolean).join('·')
  return <View onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${card.post.id}` })} style={{ position: 'relative', width: '350rpx', height: `${height}rpx`, borderRadius: '9rpx', marginBottom: '10rpx', overflow: 'hidden', background: '#E9EEF4' }}>
    <Image src={card.image} mode="aspectFill" style={{ width: '350rpx', height: `${height}rpx` }} />
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '156rpx', background: 'linear-gradient(180deg, rgba(14,24,39,0) 0%, rgba(14,24,39,.68) 100%)' }} />
    <View style={{ position: 'absolute', left: '16rpx', right: '16rpx', bottom: '20rpx' }}><Text style={{ display: 'block', color: '#FFFFFF', fontSize: '24rpx', lineHeight: '34rpx', fontWeight: 600 }}>{card.post.authorName || '用户'}</Text><Text style={{ display: 'block', color: 'rgba(255,255,255,.9)', fontSize: '20rpx', lineHeight: '30rpx', marginTop: '3rpx' }}>{meta || '资料待完善'}</Text></View>
    <View onClick={event => { event.stopPropagation(); onLike() }} style={{ position: 'absolute', right: '16rpx', bottom: '18rpx', width: '55rpx', height: '55rpx', borderRadius: '28rpx', background: card.post.liked ? '#F35F72' : 'rgba(255,255,255,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: card.post.liked ? '#FFFFFF' : '#F35F72', fontSize: '30rpx' }}>{card.post.liked ? '♥' : '♡'}</Text></View>
  </View>
}

function KindredLoading() {
  return <View style={{ display: 'flex', gap: '10rpx', padding: '0 20rpx' }}>{[0, 1].map(column => <View key={column} style={{ width: '350rpx' }}>{[0, 1].map(index => <View key={index} style={{ width: '350rpx', height: index === column ? '500rpx' : '440rpx', borderRadius: '9rpx', background: 'rgba(255,255,255,.8)', marginBottom: '10rpx' }} />)}</View>)}</View>
}

function KindredEmpty({ title }: { title: string }) {
  return <View style={{ paddingTop: '110rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunEmptyHeart} mode="aspectFit" style={{ width: '292rpx', height: '224rpx' }} /><Text style={{ color: '#999999', fontSize: '25rpx', marginTop: '24rpx' }}>{title}</Text></View>
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || '加载失败')
}
