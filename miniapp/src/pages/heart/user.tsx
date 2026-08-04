import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getApiErrorCode } from '@/services/request'
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

const background = 'linear-gradient(90deg, rgba(233,253,251,0.6), rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6))'
const tagStyles = [
  { color: '#4CAF51', background: '#EBF5EA' },
  { color: '#3D9FF5', background: '#E7F2FE' },
  { color: '#FF9A0F', background: '#FFF3E6' },
  { color: '#9F2CB2', background: '#F4E6F6' },
]

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
  const [matched, setMatched] = useState(false)
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
      setMatched(Boolean(data.matched))
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
        setMatched(Boolean(data.matched))
        setProfile(previous => previous ? { ...previous, liked: false, matched: Boolean(data.matched), matchNo: data.matchNo || previous.matchNo, canEnterConversation: Boolean(data.canEnterConversation) } : previous)
        likeRequestId.current = null
        await Taro.showToast({ title: '已取消喜欢', icon: 'none' })
      } else {
        likeRequestId.current ||= createRequestId('like', targetUserId)
        const data = await sendRelationLike(targetUserId, sourceScene, likeRequestId.current)
        setLiked(true)
        setMatched(Boolean(data.matched))
        setProfile(previous => previous ? { ...previous, liked: true, matched: Boolean(data.matched), matchNo: data.matchNo || previous.matchNo, canEnterConversation: Boolean(data.canEnterConversation) } : previous)
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
    if (!profile?.canEnterConversation || !profile.matchNo) {
      await Taro.showToast({ title: '互相喜欢后才能聊天', icon: 'none' })
      return
    }
    await Taro.navigateTo({ url: `/pages/message/private-chat?conversationNo=${profile.matchNo}&targetUserId=${profile.userId}` })
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
      const selection = await Taro.showActionSheet({ itemList: ['举报该用户', '拉黑该用户'] })
      if (selection.tapIndex === 0) await reportUser()
      else await Taro.showToast({ title: resolveCommunityCopy(communityConfig, COMMUNITY_COPY_KEYS.blockUnavailable), icon: 'none' })
    } catch (error) {
      if (!String((error as { errMsg?: string })?.errMsg || error).includes('cancel')) await Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  }

  if (profileLoading && !profile) return <ProfileState id="public-profile-loading" text="正在加载公开资料" />
  if (profileError && !profile) return <ProfileState id="public-profile-error" text={profileError} action="重新加载" onAction={() => void loadProfile()} />
  if (!profile) return <ProfileState id="public-profile-empty" text="该用户暂不可展示" />

  const basicInfo = [genderText(profile.gender), profile.age ? `${profile.age}岁` : '', profile.height ? `${profile.height}cm` : '', profile.zodiac || ''].filter(Boolean).join('丨')
  const locationInfo = [profile.currentCity ? `现居${profile.currentCity}` : '', profile.hometownCity ? `${profile.hometownCity}人` : ''].filter(Boolean).join('丨')
  const detailInfo = [profile.school, profile.identityLabel, profile.industryLabel, profile.occupationLabel, profile.company, profile.annualIncomeLabel].filter(Boolean)

  return (
    <View id="public-profile-page" style={{ height: '100vh', overflow: 'hidden', background, fontFamily: 'PingFang SC, sans-serif' }}>
      <ScrollView scrollY style={{ width: '750rpx', height: '100vh' }} showScrollbar={false}>
        <View style={{ minHeight: '1850rpx', paddingBottom: '150rpx', boxSizing: 'border-box' }}>
          <HeartMessageHeader title="用户主页" align="center" showBack />
          <View style={{ width: '700rpx', margin: '0 auto' }}>
            <View style={{ position: 'relative', width: '700rpx', height: '828rpx', overflow: 'hidden', borderRadius: '32rpx', background: '#D8E7E6' }}>
              <Image src={profile.heroPhoto || profile.photos?.[0] || miniappOssIcons.profilePreviewHero} mode="aspectFill" style={{ width: '700rpx', height: '828rpx' }} />
              <Image src={miniappOssIcons.profilePreviewShare} mode="scaleToFill" onClick={() => Taro.showShareMenu({ withShareTicket: true })} style={{ position: 'absolute', right: '30rpx', top: '28rpx', width: '48rpx', height: '48rpx', borderRadius: '50%' }} />
              <View onClick={() => void openSafetyActions()} style={{ position: 'absolute', left: '30rpx', top: '28rpx', zIndex: 4, padding: '10rpx 18rpx', borderRadius: '24rpx', background: 'rgba(0,0,0,0.28)' }}><Text style={{ color: '#FFFFFF', fontSize: '22rpx' }}>举报 · 拉黑</Text></View>
              <Image src={profile.avatar || miniappOssIcons.profilePreviewAvatar} mode="aspectFill" style={{ position: 'absolute', left: '30rpx', bottom: '57rpx', zIndex: 3, width: '188rpx', height: '188rpx', borderRadius: '50%', background: '#FFFFFF' }} />
              <View style={{ position: 'absolute', left: '238rpx', bottom: '112rpx', zIndex: 3 }}><Text style={{ color: '#FFFFFF', fontSize: '38rpx', fontWeight: 500, textShadow: '0 3rpx 4rpx rgba(0,0,0,0.5)' }}>{profile.nickname}</Text></View>
            </View>
            <View style={{ position: 'relative', zIndex: 4, width: '700rpx', minHeight: '198rpx', marginTop: '-105rpx', padding: '60rpx 30rpx 34rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
              {basicInfo ? <InfoLine icon={miniappOssIcons.profilePreviewGender} text={basicInfo} /> : null}
              {basicInfo && locationInfo ? <View style={{ height: '18rpx' }} /> : null}
              {locationInfo ? <InfoLine icon={miniappOssIcons.profilePreviewLocation} text={locationInfo} /> : null}
            </View>
            <ProfileSection title="资料信息"><TagList tags={detailInfo} /></ProfileSection>
            <ProfileSection title="我的标签"><TagList tags={profile.tags || []} /></ProfileSection>
            <ProfileSection title="自我介绍"><Text style={{ display: 'block', marginTop: '20rpx', color: '#7F8494', fontSize: '24rpx', lineHeight: '38rpx' }}>{profile.introduction || '暂未填写自我介绍'}</Text></ProfileSection>
            <ProfileSection title="个人动态">{communityPostsLoading ? <CommunityPostLoading /> : communityPostsError ? <CommunityPostEmpty text={communityPostsError} /> : communityPosts.length ? communityPosts.map(post => <CommunityPostCard key={post.postNo || post.id} post={post} />) : <CommunityPostEmpty text={resolveCommunityCopy(communityConfig, COMMUNITY_COPY_KEYS.emptyUserPosts)} />}</ProfileSection>
          </View>
        </View>
      </ScrollView>
      <View style={{ position: 'fixed', left: '55rpx', right: '55rpx', bottom: '30rpx', zIndex: 50, display: 'flex', gap: '20rpx' }}>
        <View id="public-profile-like-button" onClick={() => void toggleLike()} style={{ width: '210rpx', height: '98rpx', borderRadius: '49rpx', background: liked ? '#FFF0F2' : '#FFFFFF', border: '2rpx solid #FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: likeSubmitting ? 0.6 : 1 }}><Text style={{ color: '#FF5E6E', fontSize: '28rpx', fontWeight: 500 }}>{likeSubmitting ? '处理中' : liked ? '取消喜欢' : '喜欢'}</Text></View>
        <View id="public-profile-chat-button" onClick={() => void openConversation()} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#FF5E6E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8rpx 22rpx rgba(255,94,110,0.25)' }}><Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>{matched ? '聊天' : '打招呼'}</Text></View>
      </View>
    </View>
  )
}

function ProfileState({ id, text, action, onAction }: { id: string; text: string; action?: string; onAction?: () => void }) {
  return <View id={id} style={{ minHeight: '100vh', background, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#7F8494', fontSize: '26rpx' }}>{text}</Text>{action && onAction ? <View onClick={onAction} style={{ marginTop: '28rpx', padding: '18rpx 48rpx', borderRadius: '40rpx', background: '#2876FF' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>{action}</Text></View> : null}</View>
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ width: '700rpx', marginTop: '20rpx', padding: '32rpx 34rpx 38rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}><Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>{title}</Text>{children}</View>
}

function TagList({ tags }: { tags: Array<string | null | undefined> }) {
  const visible = tags.filter((tag): tag is string => Boolean(tag))
  if (!visible.length) return <Text style={{ display: 'block', marginTop: '20rpx', color: '#A0A6B2', fontSize: '24rpx' }}>暂未填写</Text>
  return <View style={{ marginTop: '20rpx', display: 'flex', flexWrap: 'wrap', gap: '10rpx' }}>{visible.map((tag, index) => { const style = tagStyles[index % tagStyles.length]; return <View key={`${tag}-${index}`} style={{ height: '48rpx', padding: '0 24rpx', borderRadius: '29rpx', background: style.background, display: 'flex', alignItems: 'center' }}><Text style={{ color: style.color, fontSize: '24rpx' }}>{tag}</Text></View> })}</View>
}

function genderText(gender?: string | null) {
  if (gender === 'FEMALE') return '女'
  if (gender === 'MALE') return '男'
  return gender || ''
}

function InfoLine({ icon, text }: { icon: string; text: string }) {
  return <View style={{ minHeight: '36rpx', display: 'flex', alignItems: 'center' }}><Image src={icon} mode="aspectFit" style={{ width: '30rpx', height: '34rpx', marginRight: '14rpx' }} /><Text style={{ color: '#333333', fontSize: '24rpx' }}>{text}</Text></View>
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
