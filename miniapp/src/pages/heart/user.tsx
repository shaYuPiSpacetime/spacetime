import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter, useShareAppMessage } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import ProfilePreviewPage, { type ProfilePreviewModel } from '@/pages/profile/components/ProfilePreviewPage'
import NativeNavigation from '@/components/NativeNavigation'
import CommunityReportReasonSheet from '@/components/CommunityReportReasonSheet'
import UnverifiedCertificationModal from '@/components/UnverifiedCertificationModal'
import WhisperComposeSheet, { type WhisperComposeTarget } from '@/components/WhisperComposeSheet'
import { resolveReplayProfileStep } from '@/domain/recommendReplay'
import { resolveWhisperRouteSourceScene } from '@/domain/whisperRuntime'
import { buildPublicProfileCertifications } from '@/domain/publicProfileCertification'
import { navigateToPendingVerification } from '@/features/verification/navigateToVerification'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import { getApiErrorCode } from '@/services/request'
import { resolveConversationByPeerUserId } from '@/services/message'
import { getPublicProfile, getSharedProfile, type PublicProfileVO } from '@/services/profile'
import { useAuthStore } from '@/stores/authStore'
import { PENDING_SHARE_ROUTE_KEY } from '@/domain/pendingShareRoute'
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
  getSharedUserCommunityPosts,
  reportCommunityTarget,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  type CommunityConfig,
  type CommunityPostVO,
} from '@/services/community'
import {
  neverRecommendCandidate,
  quoteRecommendReplayProfile,
  unlockRecommendReplayProfile,
} from '@/services/recommend'
import { settingsApi } from '@/services/settings'

const background = 'linear-gradient(90deg, rgba(233,253,251,0.6), rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6))'
const PROFILE_ACCESS_REQUIRED = '查看该主页需要先解锁'
function createRequestId(prefix: string, targetUserId: number): string {
  return `${prefix}-${targetUserId}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function createEventNo(targetUserId: number, sourceScene: string): string {
  return `visit-${targetUserId}-${sourceScene}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export default function HeartUserPage() {
  const router = useRouter()
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const targetUserId = Number(router.params.targetUserId || router.params.userId || 0)
  const sourceScene = ((router.params.sourceScene as RelationSourceScene | undefined) || 'profile') as RelationSourceScene
  const returnAfterUnlike = router.params.from === 'my-likes'
  const [profile, setProfile] = useState<PublicProfileVO | null>(null)
  useShareAppMessage(() => ({
    title: profile?.nickname ? `${profile.nickname}的主页` : '时空邂逅用户主页',
    path: `/pages/heart/user?targetUserId=${targetUserId}`,
    imageUrl: profile?.heroPhoto || profile?.avatar || undefined,
  }))
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [liked, setLiked] = useState(false)
  const [likeSubmitting, setLikeSubmitting] = useState(false)
  const [communityPosts, setCommunityPosts] = useState<CommunityPostVO[]>([])
  const [communityPostsLoading, setCommunityPostsLoading] = useState(true)
  const [communityPostsError, setCommunityPostsError] = useState('')
  const [communityConfig, setCommunityConfig] = useState<CommunityConfig>()
  const [showReportReasons, setShowReportReasons] = useState(false)
  const [showUnverifiedModal, setShowUnverifiedModal] = useState(false)
  const [whisperTarget, setWhisperTarget] = useState<WhisperComposeTarget | null>(null)
  const access = useAccessStatus('canMatch', isLoggedIn)
  const eventNo = useMemo(() => createEventNo(targetUserId || 0, sourceScene), [targetUserId, sourceScene])
  const visitReported = useRef(false)
  const likeRequestId = useRef<string | null>(null)
  const unlockRequestRef = useRef<{ targetUserId: number; expectedPrice: number; requestId: string } | null>(null)

  const openLogin = async () => {
    Taro.setStorageSync(PENDING_SHARE_ROUTE_KEY, `/pages/heart/user?targetUserId=${targetUserId}`)
    await Taro.navigateTo({ url: '/pages/login/index' })
  }

  const goBack = () => {
    if (Taro.getCurrentPages().length > 1) void Taro.navigateBack()
    else if (isLoggedIn) void Taro.switchTab({ url: '/pages/index/index' })
    else void openLogin()
  }

  const runCertifiedAction = (action: () => void) => {
    if (!isLoggedIn) {
      void openLogin()
      return
    }
    if (access.status?.coreAccessStatus === 'CORE_ALLOWED') {
      action()
      return
    }
    setShowUnverifiedModal(true)
  }

  const requestProfileAccess = async (): Promise<boolean> => {
    let quotedPrice = 0
    try {
      const quote = await quoteRecommendReplayProfile(targetUserId)
      quotedPrice = quote.unitPrice || 0
      const step = resolveReplayProfileStep(quote.memberAccess, quote)
      if (step === 'open') return true
      if (step === 'unavailable') throw new Error('当前暂不能解锁该主页，请稍后重试')
      if (step === 'recharge') {
        const modal = await Taro.showModal({
          title: '千寻币余额不足',
          content: `查看主页需 ${quote.unitPrice} 千寻币，当前余额 ${quote.coinBalance} 千寻币。`,
          confirmText: '去充值',
        })
        if (modal.confirm) {
          await Taro.navigateTo({ url: `/pages/coins/unlock-recharge?sourceScene=replay_profile_unlock_one&cost=${quotedPrice}` })
        }
        return false
      }
      const modal = await Taro.showModal({
        title: '解锁用户主页',
        content: `将消耗 ${quote.unitPrice} 千寻币，解锁后再次查看该用户不重复扣费。`,
        confirmText: '确认解锁',
      })
      if (!modal.confirm) return false
      if (unlockRequestRef.current?.targetUserId !== targetUserId || unlockRequestRef.current.expectedPrice !== quote.unitPrice) {
        unlockRequestRef.current = {
          targetUserId,
          expectedPrice: quote.unitPrice,
          requestId: createRequestId('profile-unlock', targetUserId),
        }
      }
      const result = await unlockRecommendReplayProfile(targetUserId, {
        requestId: unlockRequestRef.current.requestId,
        expectedPrice: quote.unitPrice,
      })
      if (!result.canOpen) throw new Error('主页尚未解锁，请稍后重试')
      unlockRequestRef.current = null
      return true
    } catch (error) {
      if (getApiErrorCode(error) !== 5001) throw error
      const modal = await Taro.showModal({
        title: '千寻币余额不足',
        content: '余额不足，充值后可继续解锁该主页。',
        confirmText: '去充值',
      })
      if (modal.confirm) {
        await Taro.navigateTo({ url: `/pages/coins/unlock-recharge?sourceScene=replay_profile_unlock_one&cost=${quotedPrice}` })
      }
      return false
    }
  }

  const loadProfile = async () => {
    if (!targetUserId) {
      setProfileError('缺少用户信息')
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    setProfileError('')
    setProfile(null)
    try {
      let data: PublicProfileVO | null
      try {
        data = await (isLoggedIn ? getPublicProfile(targetUserId) : getSharedProfile(targetUserId))
      } catch (error) {
        if (getApiErrorCode(error) !== 20003) throw error
        if (!await requestProfileAccess()) {
          setProfileError(PROFILE_ACCESS_REQUIRED)
          return
        }
        try {
          data = await getPublicProfile(targetUserId)
        } catch (retryError) {
          if (getApiErrorCode(retryError) === 20003) throw new Error('主页解锁状态同步中，请稍后重试')
          throw retryError
        }
      }
      setProfile(data)
      setLiked(Boolean(data.liked))
      await new Promise<void>(resolve => Taro.nextTick(resolve))
      if (isLoggedIn && !visitReported.current) {
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
  }, [targetUserId, sourceScene, eventNo, isLoggedIn])

  useDidShow(() => {
    setCommunityPostsLoading(true)
    setCommunityPostsError('')
    if (!isLoggedIn) {
      void getSharedUserCommunityPosts(targetUserId).then(page => {
        setCommunityPosts(page.records || [])
      }).catch(error => {
        setCommunityPosts([])
        setCommunityPostsError(error instanceof Error ? error.message : '个人动态加载失败')
      }).finally(() => setCommunityPostsLoading(false))
      return
    }
    void getCommunityMeta().then(async runtime => {
      setCommunityConfig(runtime)
      if (!targetUserId) throw new Error(resolveCommunityCopy(runtime, COMMUNITY_COPY_KEYS.profileUnavailable))
      const page = await getUserCommunityPosts(String(targetUserId), 1, 20)
      setCommunityPosts(page.records || [])
    }).catch(error => {
      setCommunityPosts([])
      setCommunityPostsError(resolveCommunityFeedback(communityConfig, COMMUNITY_COPY_KEYS.loadFailed, error))
    }).finally(() => setCommunityPostsLoading(false))
  })

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
        if (returnAfterUnlike) goBack()
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
      setWhisperTarget({
        targetUserNo: profile.userNo,
        sourceScene: resolveWhisperRouteSourceScene(sourceScene),
        nickname: profile.nickname || '用户',
        avatar: profile.avatar || undefined,
        meta: [profile.currentCity, profile.age ? `${profile.age}岁` : ''].filter(Boolean).join(' · '),
      })
      return
    }
    try {
      const conversation = await resolveConversationByPeerUserId(profile.userId)
      await Taro.navigateTo({ url: `/pages/message/private-chat?conversationNo=${encodeURIComponent(conversation.conversationNo)}` })
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '私信会话暂不可用，请刷新后重试', icon: 'none' })
    }
  }

  const reportUser = async () => {
    if (!targetUserId) return
    const meta = communityConfig || await getCommunityMeta()
    setCommunityConfig(meta)
    if (!meta.reportReasons.length) {
      await Taro.showToast({ title: resolveCommunityCopy(meta, COMMUNITY_COPY_KEYS.reportReasonUnavailable), icon: 'none' })
      return
    }
    setShowReportReasons(true)
  }

  const submitUserReport = async (reasonCode: string) => {
    setShowReportReasons(false)
    try {
      const result = await reportCommunityTarget('user', targetUserId, reasonCode)
      await Taro.showModal({ title: result.statusName || resolveCommunityCopy(communityConfig, COMMUNITY_COPY_KEYS.reportSubmitted), content: result.message || '', showCancel: false, confirmText: '知道了' })
    } catch (error) {
      await Taro.showToast({ title: resolveCommunityFeedback(communityConfig, COMMUNITY_COPY_KEYS.reportSubmitFailed, error), icon: 'none' })
    }
  }

  const openSafetyActions = async () => {
    if (!isLoggedIn) {
      await openLogin()
      return
    }
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
      if (!String((error as { errMsg?: string })?.errMsg || error).includes('cancel')) {
        await Taro.showToast({ title: error instanceof Error ? error.message : '操作失败，请重试', icon: 'none' })
      }
    }
  }

  if (profileLoading && !profile) return <ProfileState id="public-profile-loading" text="正在加载公开资料" />
  if (profileError && !profile) return <ProfileState id="public-profile-error" text={profileError} action={profileError === PROFILE_ACCESS_REQUIRED ? '查看解锁方式' : '重新加载'} onAction={() => void loadProfile()} />
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
    certifications: buildPublicProfileCertifications(profile.certifications),
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
          : communityPosts.map(post => <CommunityPostCard key={post.postNo || post.id} post={post} onOpen={!isLoggedIn ? () => void openLogin() : undefined} />)}
    </View>
  ) : null
  const footer = (
    <View style={{ position: 'fixed', left: '55rpx', right: '55rpx', bottom: '30rpx', zIndex: 50, display: 'flex', gap: '20rpx' }}>
      {liked || !profile.matched ? (
        <View id="public-profile-like-button" onClick={() => runCertifiedAction(() => void toggleLike())} style={{ width: '210rpx', height: '98rpx', borderRadius: '49rpx', background: liked ? '#FFF0F2' : '#FFFFFF', border: '2rpx solid #FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: likeSubmitting ? 0.6 : 1 }}><Text style={{ color: '#FF5E6E', fontSize: '28rpx', fontWeight: 500 }}>{likeSubmitting ? '处理中' : liked ? '取消喜欢' : '喜欢'}</Text></View>
      ) : null}
      <View id="public-profile-chat-button" onClick={() => runCertifiedAction(() => void openConversation())} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8rpx 22rpx rgba(255,94,110,0.25)' }}><Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>{profile.communicationMode === 'PRIVATE_MESSAGE' ? '私信' : '悄悄话'}</Text></View>
    </View>
  )

  return (
    <View id="public-profile-page">
      <ProfilePreviewPage
        variant="public-profile"
        model={previewModel}
        onBack={goBack}
        onSafetyActions={() => void openSafetyActions()}
        additionalContent={communityContent}
        footer={footer}
      />
      <UnverifiedCertificationModal
        visible={showUnverifiedModal}
        onClose={() => setShowUnverifiedModal(false)}
        onConfirm={() => {
          setShowUnverifiedModal(false)
          void navigateToPendingVerification()
        }}
      />
      <CommunityReportReasonSheet visible={showReportReasons} reasons={communityConfig?.reportReasons || []} onClose={() => setShowReportReasons(false)} onReport={reasonCode => void submitUserReport(reasonCode)} />
      <WhisperComposeSheet visible={whisperTarget !== null} target={whisperTarget} onClose={() => setWhisperTarget(null)} />
    </View>
  )
}

function ProfileState({ id, text, action, onAction }: { id: string; text: string; action?: string; onAction?: () => void }) {
  return <View id={id} style={{ minHeight: '100vh', background, display: 'flex', flexDirection: 'column' }}><NativeNavigation title="用户主页" background="transparent" /><View style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '160rpx' }}><Text style={{ color: '#7F8494', fontSize: '26rpx' }}>{text}</Text>{action && onAction ? <View onClick={onAction} style={{ marginTop: '28rpx', padding: '18rpx 48rpx', borderRadius: '40rpx', background: '#2876FF' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>{action}</Text></View> : null}</View></View>
}

function genderText(gender?: string | null) {
  if (gender === 'FEMALE') return '女'
  if (gender === 'MALE') return '男'
  return gender || ''
}

function CommunityPostCard({ post, onOpen }: { post: CommunityPostVO; onOpen?: () => void }) {
  return <View onClick={onOpen || (() => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` }))} style={{ padding: '24rpx 0 20rpx', borderBottom: '1rpx solid #EEF1F5' }}><Text style={{ display: 'block', color: '#596273', fontSize: '24rpx', lineHeight: '38rpx' }}>{post.content}</Text>{post.imageUrls?.length ? <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8rpx', marginTop: '16rpx' }}>{post.imageUrls.slice(0, 3).map((url, index) => <Image key={`${post.id}-${index}`} src={url} mode="aspectFill" style={{ width: '202rpx', height: '202rpx', borderRadius: '8rpx' }} />)}</View> : null}<Text style={{ display: 'block', marginTop: '12rpx', color: '#A0A6B2', fontSize: '20rpx' }}>{relativeTime(post.createTime)}</Text></View>
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
