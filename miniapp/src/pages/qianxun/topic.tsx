import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow, useLoad } from '@tarojs/taro'
import { useRef, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { QianxunActionStat, QianxunGenderIcon } from '@/components/QianxunCommunityIcons'
import UnverifiedCertificationModal from '@/components/UnverifiedCertificationModal'
import { miniappOssIcons } from '@/constants/ossIcons'
import { resolveStableWhisperTargetUserNo } from '@/domain/whisperRuntime'
import { navigateToPendingVerification } from '@/features/verification/navigateToVerification'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import {
  COMMUNITY_COPY_KEYS,
  getCommunityMeta,
  getCommunityTopicDetail,
  getCommunityTopicPosts,
  hideCommunityAuthor,
  reportCommunityPost,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  toggleCommunityFollow,
  toggleCommunityLike,
  unhideCommunityAuthor,
  type CommunityConfig,
  type CommunityPostVO,
  type CommunityTopicDetailVO,
} from '@/services/community'

const BLUE = '#2876FF'
const NAVY = '#0C285A'

export default function QianxunTopicPage() {
  const [topicId, setTopicId] = useState<number>()
  const [topic, setTopic] = useState<CommunityTopicDetailVO>()
  const [fallbackName, setFallbackName] = useState(`community.copy.${COMMUNITY_COPY_KEYS.topicDefaultName}`)
  const [posts, setPosts] = useState<CommunityPostVO[]>([])
  const [sort, setSort] = useState<'HOT' | 'LATEST'>('HOT')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [config, setConfig] = useState<CommunityConfig>()
  const [showUnverifiedModal, setShowUnverifiedModal] = useState(false)
  const access = useAccessStatus('canCommunity')
  const topicIdRef = useRef<number>()
  const resumeRefreshRef = useRef(false)
  const requestSequenceRef = useRef(0)

  const loadTopic = async (id: number, requestedSort: 'HOT' | 'LATEST' = sort) => {
    const sequence = requestSequenceRef.current + 1
    requestSequenceRef.current = sequence
    setLoading(true)
    setLoadError('')
    try {
      const [runtime, detail, page] = await Promise.all([
        getCommunityMeta(),
        getCommunityTopicDetail(id),
        getCommunityTopicPosts(id, requestedSort, 1, 30),
      ])
      if (requestSequenceRef.current !== sequence) return
      setConfig(runtime)
      setTopic(detail)
      setPosts(page.records || [])
    } catch (error) {
      if (requestSequenceRef.current === sequence) setLoadError(resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.loadFailed, error))
    } finally {
      if (requestSequenceRef.current === sequence) setLoading(false)
    }
  }

  useLoad(options => {
    const id = Number(options.topicId)
    const name = options.topicName ? decodeURIComponent(options.topicName) : ''
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false)
      setLoadError(resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.topicUnavailable))
      return
    }
    topicIdRef.current = id
    setTopicId(id)
    if (name) setFallbackName(name)
    void loadTopic(id, 'HOT')
  })

  useDidHide(() => {
    resumeRefreshRef.current = true
  })

  useDidShow(() => {
    if (!resumeRefreshRef.current || !topicIdRef.current) return
    resumeRefreshRef.current = false
    void loadTopic(topicIdRef.current, sort)
  })

  const changeSort = (next: 'HOT' | 'LATEST') => {
    if (next === sort || !topicIdRef.current) return
    setSort(next)
    void loadTopic(topicIdRef.current, next)
  }

  const likePost = async (post: CommunityPostVO) => {
    try {
      const result = await toggleCommunityLike(post.id)
      setPosts(items => items.map(item => item.id === post.id ? { ...item, liked: result.liked, likeCount: result.likeCount } : item))
    } catch (error) {
      await Taro.showToast({ title: resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.genericError, error), icon: 'none' })
    }
  }

  const openPostActions = async (post: CommunityPostVO) => {
    try {
      const action = await Taro.showActionSheet({ itemList: [
        '分享',
        post.followingAuthor ? '取消关注' : '关注',
        post.hiddenAuthor ? '取消不看 TA 动态' : '不看 TA 动态',
        '举报',
      ] })
      if (action.tapIndex === 0) {
        await Taro.showShareMenu({ withShareTicket: true })
        return
      }
      if (action.tapIndex === 1) {
        if (access.status?.coreAccessStatus !== 'CORE_ALLOWED') {
          setShowUnverifiedModal(true)
          return
        }
        const result = await toggleCommunityFollow(post.authorId)
        setPosts(items => items.map(item => item.authorId === post.authorId ? { ...item, followingAuthor: result.following } : item))
        return
      }
      if (action.tapIndex === 2) {
        const result = post.hiddenAuthor
          ? await unhideCommunityAuthor(post.authorUserNo || post.authorId)
          : await hideCommunityAuthor(post.authorUserNo || post.authorId)
        setPosts(items => items.map(item => item.authorId === post.authorId ? { ...item, hiddenAuthor: result.hidden } : item))
        if (result.message) await Taro.showToast({ title: result.message, icon: 'none' })
        return
      }
      const runtime = config || await getCommunityMeta()
      setConfig(runtime)
      const reasons = runtime.reportReasons || []
      if (!reasons.length) {
        await Taro.showToast({ title: resolveCommunityCopy(runtime, COMMUNITY_COPY_KEYS.reportReasonUnavailable), icon: 'none' })
        return
      }
      const reasonResult = await Taro.showActionSheet({ itemList: reasons.map(item => item.label) })
      const reason = reasons[reasonResult.tapIndex]
      if (!reason) return
      const result = await reportCommunityPost(post.postNo || post.id, reason.code)
      await Taro.showToast({ title: resolveCommunityFeedback(runtime, COMMUNITY_COPY_KEYS.reportSubmitted, result), icon: 'none' })
    } catch (error) {
      if (!isActionSheetCancel(error)) await Taro.showToast({ title: resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.genericError, error), icon: 'none' })
    }
  }

  const topicName = topic?.name || fallbackName
  return <View id="qianxun-topic-page" style={{ height: '100vh', background: '#F3F5F7', overflow: 'hidden' }}>
    <TopicHero topic={topic} name={topicName} config={config} />
    <View style={{ position: 'absolute', left: 0, right: 0, top: '454rpx', bottom: 0, borderRadius: '24rpx 24rpx 0 0', background: '#F3F5F7', overflow: 'hidden' }}>
      <View style={{ height: '82rpx', padding: '0 30rpx', background: '#FFFFFF', display: 'flex', alignItems: 'center' }}>
        <SortTab label="热门" selected={sort === 'HOT'} onClick={() => changeSort('HOT')} />
        <SortTab label="最新" selected={sort === 'LATEST'} onClick={() => changeSort('LATEST')} />
      </View>
      <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: '82rpx', bottom: 0 }} showScrollbar={false}>
        <View style={{ padding: '18rpx 25rpx calc(160rpx + env(safe-area-inset-bottom))' }}>
          {loading && !posts.length ? <LoadingCards /> : loadError ? <TopicState title={loadError} onRetry={topicId ? () => void loadTopic(topicId, sort) : undefined} /> : posts.length ? posts.map(post => <TopicPostCard key={post.id} post={post} onLike={() => void likePost(post)} onMore={() => void openPostActions(post)} onContact={() => {
            if (access.status?.coreAccessStatus !== 'CORE_ALLOWED') {
              setShowUnverifiedModal(true)
              return false
            }
            return true
          }} />) : <TopicState title={resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyTopicPosts)} />}
        </View>
      </ScrollView>
    </View>
    <View id="qianxun-topic-participate" onClick={() => topicId && void Taro.navigateTo({ url: `/pages/qianxun/compose?topicId=${topicId}&topicName=${encodeURIComponent(topicName)}` })} style={{ position: 'fixed', left: '50%', bottom: 'calc(30rpx + env(safe-area-inset-bottom))', width: '240rpx', height: '82rpx', borderRadius: '41rpx', background: topicId ? BLUE : '#C8D4E8', boxShadow: '0 12rpx 28rpx rgba(40,118,255,0.28)', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}><Text style={{ color: '#FFFFFF', fontSize: '27rpx', fontWeight: 600 }}>参与话题</Text></View>
    {showUnverifiedModal ? <UnverifiedCertificationModal onClose={() => setShowUnverifiedModal(false)} onConfirm={() => {
      setShowUnverifiedModal(false)
      void navigateToPendingVerification()
    }} /> : null}
  </View>
}

function TopicHero({ topic, name, config }: { topic?: CommunityTopicDetailVO; name: string; config?: CommunityConfig }) {
  return <View style={{ position: 'relative', height: '478rpx', overflow: 'hidden', background: '#203047' }}>
    <Image src={topic?.coverUrl || miniappOssIcons.qianxunTopicHero} mode="aspectFill" style={{ position: 'absolute', inset: 0, width: '750rpx', height: '478rpx' }} />
    <View style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,19,34,.16) 0%, rgba(7,19,34,.76) 100%)' }} />
    <NativeNavigation overlay background="transparent" titleColor="#FFFFFF" />
    <View style={{ position: 'absolute', left: '30rpx', right: '30rpx', bottom: '50rpx' }}>
      <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '34rpx', lineHeight: '48rpx', fontWeight: 700 }}># {name}</Text>
      <View style={{ display: 'flex', alignItems: 'center', marginTop: '10rpx' }}><Text style={{ color: 'rgba(255,255,255,.88)', fontSize: '22rpx', lineHeight: '32rpx' }}>{formatCompactCount(topic?.participantCount || 0)}人参与</Text><Text style={{ color: 'rgba(255,255,255,.88)', fontSize: '22rpx', lineHeight: '32rpx', marginLeft: '36rpx' }}>{formatCompactCount(topic?.postCount || 0)}动态</Text></View>
      <Text style={{ display: '-webkit-box', color: 'rgba(255,255,255,.94)', fontSize: '23rpx', lineHeight: '34rpx', height: '68rpx', marginTop: '10rpx', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{topic?.description || resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.topicDefaultDescription)}</Text>
    </View>
  </View>
}

function SortTab({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <View onClick={onClick} style={{ position: 'relative', height: '82rpx', minWidth: '76rpx', marginRight: '26rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: selected ? NAVY : '#9DA3AE', fontSize: '26rpx', fontWeight: selected ? 600 : 400 }}>{label}</Text>{selected ? <View style={{ position: 'absolute', left: '50%', bottom: '3rpx', width: '44rpx', height: '5rpx', borderRadius: '3rpx', background: BLUE, transform: 'translateX(-50%)' }} /> : null}</View>
}

function TopicPostCard({ post, onLike, onMore, onContact }: { post: CommunityPostVO; onLike: () => void; onMore: () => void; onContact: () => boolean }) {
  const openPost = () => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` })
  const openAuthor = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    void Taro.navigateTo({ url: `/pages/heart/user?userId=${post.authorId}` })
  }
  const openContact = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    if (!onContact()) return
    const targetUserNo = resolveStableWhisperTargetUserNo(post.authorUserNo, post.authorId)
    if (!targetUserNo || !post.postNo) return void Taro.showToast({ title: '当前动态暂时无法申请认识', icon: 'none' })
    void Taro.navigateTo({ url: `/pages/message/whisper-detail?receiverUserNo=${encodeURIComponent(targetUserNo)}&sourceScene=community_post&sourceBizNo=${encodeURIComponent(post.postNo)}&nickname=${encodeURIComponent(post.authorName || '用户')}&avatar=${encodeURIComponent(post.authorAvatar || '')}&compose=1` })
  }
  return <View onClick={openPost} style={{ width: '700rpx', borderRadius: '14rpx', background: '#FFFFFF', marginBottom: '18rpx', padding: '24rpx 24rpx 0', boxSizing: 'border-box', overflow: 'hidden' }}>
    <View style={{ display: 'flex', alignItems: 'center' }}><Image onClick={openAuthor} src={post.authorAvatar || miniappOssIcons.qianxunTopicAvatar} mode="aspectFill" style={{ width: '68rpx', height: '68rpx', borderRadius: '34rpx', background: '#EFF3F7' }} /><View onClick={openAuthor} style={{ flex: 1, minWidth: 0, marginLeft: '14rpx' }}><View style={{ display: 'flex', alignItems: 'center' }}><Text style={{ color: '#303B4A', fontSize: '24rpx', fontWeight: 600 }}>{post.authorName || '用户'}</Text><View style={{ marginLeft: '12rpx', display: 'flex' }}><QianxunGenderIcon gender={post.authorGender} /></View></View><Text style={{ display: 'block', color: '#7F8EA4', fontSize: '20rpx', marginTop: '5rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{postAuthorMeta(post) || relativeTime(post.createTime)}</Text></View><View id={`qianxun-topic-post-more-${post.id}`} onClick={event => { event.stopPropagation(); onMore() }} style={{ width: '54rpx', height: '64rpx', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}><Text style={{ color: '#A5A9B1', fontSize: '34rpx', lineHeight: '44rpx' }}>⋮</Text></View></View>
    {post.title ? <Text style={{ display: 'block', color: '#283548', fontSize: '27rpx', fontWeight: 600, lineHeight: '42rpx', marginTop: '18rpx' }}>{post.title}</Text> : null}
    <Text style={{ display: 'block', color: '#3E4755', fontSize: '25rpx', lineHeight: '42rpx', marginTop: '16rpx' }}>{post.content}</Text>
    <TopicImages images={post.imageUrls || []} />
    <View style={{ height: '72rpx', borderTop: '1rpx solid #F0F2F5', marginTop: '18rpx', display: 'flex', alignItems: 'center' }}>
      <View onClick={openContact} style={{ minWidth: '150rpx', height: '72rpx', display: 'flex', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunWhisper} mode="aspectFit" style={{ width: '36rpx', height: '36rpx' }} /><Text style={{ color: BLUE, fontSize: '22rpx', marginLeft: '8rpx' }}>{post.contactAction === 'PRIVATE_MESSAGE' ? '私信' : '悄悄话'}</Text></View>
      <View style={{ flex: 1 }} />
      <QianxunActionStat kind="comment" count={post.commentCount || 0} onClick={openPost} />
      <QianxunActionStat kind="like" count={post.likeCount || 0} active={post.liked} onClick={onLike} />
    </View>
  </View>
}

function TopicImages({ images }: { images: string[] }) {
  const visible = images.slice(0, 3)
  if (!visible.length) return null
  return <View style={{ display: 'flex', gap: '8rpx', marginTop: '18rpx' }}>{visible.map((url, index) => <Image key={`${url}-${index}`} src={url} mode="aspectFill" onClick={event => { event.stopPropagation(); void Taro.previewImage({ current: url, urls: images }) }} style={{ width: visible.length === 1 ? '652rpx' : visible.length === 2 ? '322rpx' : '212rpx', height: visible.length === 1 ? '410rpx' : '210rpx', borderRadius: '8rpx', background: '#EEF2F6' }} />)}</View>
}

function postAuthorMeta(post: CommunityPostVO) {
  const birthYear = Number(post.authorBirthYear || 0)
  const year = birthYear > 1900 ? `${String(birthYear).slice(-2)}年` : ''
  return [year, post.authorCity, post.authorProfession].filter(Boolean).join(' · ')
}

function TopicState({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return <View style={{ paddingTop: '84rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunEmptyFollowing} mode="aspectFit" style={{ width: '280rpx', height: '210rpx' }} /><Text style={{ color: '#999999', fontSize: '25rpx', marginTop: '20rpx' }}>{title}</Text>{onRetry ? <View onClick={onRetry} style={{ height: '58rpx', borderRadius: '29rpx', border: `1rpx solid ${BLUE}`, padding: '0 28rpx', marginTop: '20rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: BLUE, fontSize: '24rpx' }}>重新加载</Text></View> : null}</View>
}

function LoadingCards() {
  return <View>{[0, 1].map(index => <View key={index} style={{ height: '350rpx', borderRadius: '14rpx', background: '#FFFFFF', marginBottom: '18rpx' }} />)}</View>
}

function formatCompactCount(value: number) {
  const count = Number(value || 0)
  if (count >= 10000) return `${(count / 1000).toFixed(1)}k`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

function relativeTime(value: string) {
  const timestamp = new Date(String(value || '').replace(' ', 'T')).getTime()
  if (!Number.isFinite(timestamp)) return value || ''
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return `${Math.floor(minutes / 1440)}天前`
}

function isActionSheetCancel(error: unknown) {
  return String(error instanceof Error ? error.message : error || '').toLowerCase().includes('cancel')
}
