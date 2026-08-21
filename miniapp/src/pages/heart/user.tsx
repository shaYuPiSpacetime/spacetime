import { Image, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import ProfilePreviewPage, { type ProfilePreviewModel } from '@/pages/profile/components/ProfilePreviewPage'
import { resolveWhisperRouteSourceScene } from '@/domain/whisperRuntime'
import { getApiErrorCode } from '@/services/request'
import { findConversationByPeerUserId } from '@/services/message'
import { getPublicProfile, type PublicProfileVO } from '@/services/profile'
import {
  cancelRelationLike,
  reportRelationVisit,
  sendRelationLike,
  type RelationSourceScene,
} from '@/services/relation'
import {
  COMMUNITY_COPY_KEYS,
  getCommunityMeta,
  getUserCommunityPosts,
  reportCommunityTarget,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  type CommunityConfig,
  type CommunityPostVO,
} from '@/services/community'
import { neverRecommendCandidate } from '@/services/recommend'
import { settingsApi } from '@/services/settings'

const background = 'linear-gradient(90deg, rgba(233,253,251,0.6), rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6))'
function createRequestId(prefix: string, targetUserId: number): string {
  return `${prefix}-${targetUserId}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function createEventNo(targetUserId: number, sourceScene: string): string {
  return `visit-${targetUserId}-${sourceScene}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export default function HeartUserPage() {
  const router = useRouter()
  const targetUserId = Number(router.params.targetUserId || router.params.userId || 0)
  const sourceScene = ((router.params.sourceScene as RelationSourceScene | undefined) || 'profile') as RelationSourceScene
  const [profile, setProfile] = useState<PublicProfileVO | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [liked, setLiked] = useState(false)
  const [likeSubmitting, setLikeSubmitting] = useState(false)
  const [communityPosts, setCommunityPosts] = useState<CommunityPostVO[]>([])
  const [communityPostsLoading, setCommunityPostsLoading] = useState(true)
  const [communityPostsError, setCommunityPostsError] = useState('')
  const [communityConfig, setCommunityConfig] = useState<CommunityConfig>()
  const eventNo = useMemo(() => createEventNo(targetUserId || 0, sourceScene), [targetUserId, sourceScene])
  const visitReported = useRef(false)
  const likeRequestId = useRef<string | null>(null)

  const loadProfile = async () => {
    if (!targetUserId) {
      setProfileError('缺少用户信息')
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    setProfileError('')
    try {
      const data = await getPublicProfile(targetUserId)
      setProfile(data)
      setLiked(Boolean(data.liked))
      await new Promise<void>(resolve => Taro.nextTick(resolve))
      if (!visitReported.current) {
        await reportRelationVisit(targetUserId, sourceScene, eventNo)
        visitReported.current = true
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '用户资料加载失败'
      setProfileError(message)
      await Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [targetUserId, sourceScene, eventNo])

  useEffect(() => {
    setCommunityPostsLoading(true)
    setCommunityPostsError('')
    void getCommunityMeta().then(async runtime => {
      setCommunityConfig(runtime)
      if (!targetUserId) throw new Error(resolveCommunityCopy(runtime, COMMUNITY_COPY_KEYS.profileUnavailable))
      const page = await getUserCommunityPosts(String(targetUserId), 1, 20)
      setCommunityPosts(page.records || [])
    }).catch(error => {
      setCommunityPosts([])
      setCommunityPostsError(resolveCommunityFeedback(communityConfig, COMMUNITY_COPY_KEYS.loadFailed, error))
    }).finally(() => setCommunityPostsLoading(false))
  }, [targetUserId])

  const toggleLike = async () => {
    if (!profile || likeSubmitting) return
    if (liked) {
      const modal = await Taro.showModal({ title: '取消喜欢', content: '取消后仅撤销爱心来源；若仍有其他匹配来源，聊天关系继续有效。' })
      if (!modal.confirm) return
    }
    setLikeSubmitting(true)
    try {
      if (liked) {
        const data = await cancelRelationLike(targetUserId)
        setLiked(false)
        setProfile(previous => previous ? { ...previous, liked: false, matched: Boolean(data.matched), matchNo: data.matchNo || previous.matchNo, canEnterConversation: Boolean(data.canEnterConversation), communicationMode: data.canEnterConversation ? 'PRIVATE_MESSAGE' : 'WHISPER' } : previous)
        likeRequestId.current = null
        await Taro.showToast({ title: '已取消喜欢', icon: 'none' })
      } else {
        likeRequestId.current ||= createRequestId('like', targetUserId)
        const data = await sendRelationLike(targetUserId, sourceScene, likeRequestId.current)
        setLiked(true)
        setProfile(previous => previous ? { ...previous, liked: true, matched: Boolean(data.matched), matchNo: data.matchNo || previous.matchNo, canEnterConversation: Boolean(data.canEnterConversation), communicationMode: data.canEnterConversation ? 'PRIVATE_MESSAGE' : 'WHISPER' } : previous)
        likeRequestId.current = null
        await Taro.showToast({ title: data.matched ? '匹配成功' : '已喜欢', icon: 'success' })
      }
    } catch (error) {
      if (getApiErrorCode(error) === 20004) setLiked(true)
      await Taro.showToast({ title: error instanceof Error ? error.message : '关系操作失败', icon: 'none' })
    } finally {
      setLikeSubmitting(false)
    }
  }

  const openConversation = async () => {
    if (!profile) return
    if (profile.communicationMode === 'WHISPER') {
      const whisperSourceScene = resolveWhisperRouteSourceScene(sourceScene)
      const query = [
        `receiverUserNo=${profile.userNo}`,
        `sourceScene=${whisperSourceScene}`,
        `nickname=${encodeURIComponent(profile.nickname || '用户')}`,
        `avatar=${encodeURIComponent(profile.avatar || '')}`,
        'compose=1',
      ].join('&')
      await Taro.navigateTo({ url: `/pages/message/whisper-detail?${query}` })
      return
    }
    const conversation = await findConversationByPeerUserId(profile.userId)
    if (!conversation) {
      await Taro.showToast({ title: '私信会话暂不可用，请刷新后重试', icon: 'none' })
      return
    }
    await Taro.navigateTo({ url: `/pages/message/private-chat?conversationNo=${encodeURIComponent(conversation.conversationNo)}` })
  }

  const reportUser = async () => {
    if (!targetUserId) return
    const meta = communityConfig || await getCommunityMeta()
    setCommunityConfig(meta)
    if (!meta.reportReasons.length) {
      await Taro.showToast({ title: resolveCommunityCopy(meta, COMMUNITY_COPY_KEYS.reportReasonUnavailable), icon: 'none' })
      return
    }
    const selection = await Taro.showActionSheet({ itemList: meta.reportReasons.map(item => item.label) })
    const reason = meta.reportReasons[selection.tapIndex]
    if (!reason) return
    const result = await reportCommunityTarget('user', targetUserId, reason.code)
    await Taro.showModal({ title: result.statusName || resolveCommunityCopy(meta, COMMUNITY_COPY_KEYS.reportSubmitted), content: result.message || '', showCancel: false, confirmText: '知道了' })
  }

  const openSafetyActions = async () => {
    try {
      const selection = await Taro.showActionSheet({ itemList: ['举报该用户', '不再推荐', '拉黑该用户'] })
      if (selection.tapIndex === 0) {
        await reportUser()
        return
      }
      if (selection.tapIndex === 1) {
        const confirm = await Taro.showModal({ title: '不再推荐', content: '确认后，推荐和理想型中将不再展示该用户。' })
        if (!confirm.confirm) return
        await neverRecommendCandidate(String(targetUserId), {
          requestId: createRequestId('profile-never', targetUserId),
        })
        await Taro.showToast({ title: '已设置不再推荐', icon: 'success' })
        await Taro.navigateBack()
        return
      }
      const confirm = await Taro.showModal({ title: '拉黑该用户', content: '拉黑后双方将无法继续互动，可在隐私设置中解除。' })
      if (!confirm.confirm) return
      await settingsApi.addBlacklist(targetUserId, sourceScene)
      await Taro.showToast({ title: '已拉黑', icon: 'success' })
      await Taro.navigateBack()
    } catch (error) {
      if (!String((error as { errMsg?: string })?.errMsg || error).includes('cancel')) await Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  }

  if (profileLoading && !profile) return <ProfileState id="public-profile-loading" text="正在加载公开资料" />
  if (profileError && !profile) return <ProfileState id="public-profile-error" text={profileError} action="重新加载" onAction={() => void loadProfile()} />
  if (!profile) return <ProfileState id="public-profile-empty" text="该用户暂不可展示" />

  const basicInfo = [genderText(profile.gender), profile.age ? `${profile.age}岁` : '', profile.height ? `${profile.height}cm` : '', profile.zodiac || ''].filter(Boolean).join('丨')
  const locationInfo = [profile.currentCity ? `现居${profile.currentCity}` : '', profile.hometownCity ? `${profile.hometownCity}人` : ''].filter(Boolean).join('丨')
  const detailInfo = [profile.school, profile.identityLabel, profile.industryLabel, profile.occupationLabel, profile.company, profile.annualIncomeLabel]
    .filter((item): item is string => Boolean(item))
  const favoriteSong = [profile.favoriteSongName, profile.favoriteSongArtist].filter(Boolean).join(' · ')
  const previewModel: ProfilePreviewModel = {
    avatarUrl: profile.avatar || '',
    heroImageUrl: profile.heroPhoto || profile.photos?.[0] || '',
    nickname: profile.nickname,
    gender: profile.gender || '',
    genderAgeHeight: basicInfo,
    location: locationInfo,
    detailInfo,
    tags: (profile.tags || []).map((label, index) => ({ code: `public-${index}-${label}`, label })),
    introduction: profile.introduction || '',
    photos: profile.photos || [],
    certifications: [],
    voice: { url: '' },
    datingGoal: profile.datingGoal || '',
    relationshipStatus: profile.emotionalStatus || '',
    favoriteSong,
    aboutMe: [],
  }
  const communityContent = communityPostsLoading || communityPostsError || communityPosts.length ? (
    <View style={{ width: '700rpx', marginTop: '20rpx', padding: '32rpx 34rpx 38rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
      <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>个人动态</Text>
      {communityPostsLoading
        ? <CommunityPostLoading />
        : communityPostsError
          ? <CommunityPostEmpty text={communityPostsError} />
          : communityPosts.map(post => <CommunityPostCard key={post.postNo || post.id} post={post} />)}
    </View>
  ) : null
  const footer = (
    <View style={{ position: 'fixed', left: '55rpx', right: '55rpx', bottom: '30rpx', zIndex: 50, display: 'flex', gap: '20rpx' }}>
      <View id="public-profile-like-button" onClick={() => void toggleLike()} style={{ width: '210rpx', height: '98rpx', borderRadius: '49rpx', background: liked ? '#FFF0F2' : '#FFFFFF', border: '2rpx solid #FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: likeSubmitting ? 0.6 : 1 }}><Text style={{ color: '#FF5E6E', fontSize: '28rpx', fontWeight: 500 }}>{likeSubmitting ? '处理中' : liked ? '取消喜欢' : '喜欢'}</Text></View>
      <View id="public-profile-chat-button" onClick={() => void openConversation()} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8rpx 22rpx rgba(255,94,110,0.25)' }}><Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>{profile.communicationMode === 'PRIVATE_MESSAGE' ? '私信' : '悄悄话'}</Text></View>
    </View>
  )

  return (
    <View id="public-profile-page">
      <ProfilePreviewPage
        variant="public-profile"
        model={previewModel}
        onBack={() => void Taro.navigateBack()}
        onSafetyActions={() => void openSafetyActions()}
        additionalContent={communityContent}
        footer={footer}
      />
    </View>
  )
}

function ProfileState({ id, text, action, onAction }: { id: string; text: string; action?: string; onAction?: () => void }) {
  return <View id={id} style={{ minHeight: '100vh', background, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#7F8494', fontSize: '26rpx' }}>{text}</Text>{action && onAction ? <View onClick={onAction} style={{ marginTop: '28rpx', padding: '18rpx 48rpx', borderRadius: '40rpx', background: '#2876FF' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>{action}</Text></View> : null}</View>
}

function genderText(gender?: string | null) {
  if (gender === 'FEMALE') return '女'
  if (gender === 'MALE') return '男'
  return gender || ''
}

function CommunityPostCard({ post }: { post: CommunityPostVO }) {
  return <View onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` })} style={{ padding: '24rpx 0 20rpx', borderBottom: '1rpx solid #EEF1F5' }}><Text style={{ display: 'block', color: '#596273', fontSize: '24rpx', lineHeight: '38rpx' }}>{post.content}</Text>{post.imageUrls?.length ? <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8rpx', marginTop: '16rpx' }}>{post.imageUrls.slice(0, 3).map((url, index) => <Image key={`${post.id}-${index}`} src={url} mode="aspectFill" style={{ width: '202rpx', height: '202rpx', borderRadius: '8rpx' }} />)}</View> : null}<Text style={{ display: 'block', marginTop: '12rpx', color: '#A0A6B2', fontSize: '20rpx' }}>{relativeTime(post.createTime)}</Text></View>
}

function CommunityPostLoading() {
  return <View style={{ padding: '26rpx 0' }}><View style={{ width: '88%', height: '24rpx', borderRadius: '12rpx', background: '#F0F2F5' }} /></View>
}

function CommunityPostEmpty({ text }: { text: string }) {
  return <View style={{ minHeight: '120rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#A0A6B2', fontSize: '23rpx' }}>{text}</Text></View>
}

function relativeTime(value: string) {
  if (!value) return ''
  const time = new Date(value.replace(' ', 'T')).getTime()
  if (!Number.isFinite(time)) return value
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return `${Math.floor(minutes / 1440)}天前`
}
