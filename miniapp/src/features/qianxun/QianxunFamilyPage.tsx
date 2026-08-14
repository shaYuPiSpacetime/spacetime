import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import {
  COMMUNITY_COPY_KEYS,
  getCommunityMeta,
  getCommunityPosts,
  getCommunityTopicHome,
  getFollowingCount,
  hideCommunityAuthor,
  reportCommunityPost,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  toggleCommunityFollow,
  toggleCommunityLike,
  unhideCommunityAuthor,
  type CommunityConfig,
  type CommunityPostVO,
  type CommunityScene,
  type CommunityTopicHomeVO,
} from '@/services/community'
import { usePrd01Store } from '@/stores/prd01Store'
import { prd01Api } from '@/services/prd01'
import { resolveVerificationOnboardingRoute } from '@/domain/verificationOnboardingFlow'
import { useMessageRuntimeStore } from '@/stores/messageRuntimeStore'
import { normalizeAvatarUrl } from '@/utils/avatar'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import { getQianxunHeaderMetrics, QianxunHeader, type QianxunPrimaryTab } from './QianxunHeader'
import QianxunZhiyinTab from './QianxunZhiyinTab'
import QianxunTopicSpotlight from './QianxunTopicSpotlight'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
const COMMUNITY_CONFIG_CACHE_KEY = 'qianxun_community_config'
const REQUESTED_PRIMARY_TAB_KEY = 'qianxun_requested_primary_tab'
const REQUESTED_SCENE_KEY = 'qianxun_requested_scene'
const sceneByEntryKey: Record<string, CommunityScene> = { follow: 'FOLLOWING', following: 'FOLLOWING', same_city: 'CITY', city: 'CITY', discover: 'HOT', hot: 'HOT' }
const emptySceneState: Partial<Record<CommunityScene, CommunityPostVO[]>> = {}

function readCachedCommunityConfig() {
  const cached = Taro.getStorageSync(COMMUNITY_CONFIG_CACHE_KEY) as CommunityConfig | undefined
  return cached?.homeTabs?.length ? cached : undefined
}

function readRequestedPrimaryTab(): QianxunPrimaryTab {
  const requested = Taro.getStorageSync(REQUESTED_PRIMARY_TAB_KEY)
  if (requested === 'KINDRED') {
    Taro.removeStorageSync(REQUESTED_PRIMARY_TAB_KEY)
    return 'KINDRED'
  }
  return 'FAMILY'
}

function readRequestedScene(): CommunityScene | undefined {
  const requested = Taro.getStorageSync(REQUESTED_SCENE_KEY)
  if (!['FOLLOWING', 'CITY', 'HOT'].includes(String(requested))) return undefined
  Taro.removeStorageSync(REQUESTED_SCENE_KEY)
  return requested as CommunityScene
}

export default function RecommendFamilyPage() {
  const unreadCount = useMessageRuntimeStore(state => state.unreadSummary.messageUnreadCount)
  const [primaryTab, setPrimaryTab] = useState<QianxunPrimaryTab>(() => readRequestedPrimaryTab())
  const [activeTab, setActiveTab] = useState<CommunityScene>(() => readRequestedScene() || 'FOLLOWING')
  const [postsByScene, setPostsByScene] = useState<Partial<Record<CommunityScene, CommunityPostVO[]>>>(emptySceneState)
  const [loadingByScene, setLoadingByScene] = useState<Partial<Record<CommunityScene, boolean>>>({ FOLLOWING: true })
  const [followingCount, setFollowingCount] = useState(0)
  const [topicHome, setTopicHome] = useState<CommunityTopicHomeVO>()
  const [topicHomeLoading, setTopicHomeLoading] = useState(false)
  const [config, setConfig] = useState<CommunityConfig | undefined>(readCachedCommunityConfig)
  const [ownerAvatar, setOwnerAvatar] = useState(defaultAvatar)
  const [selectedPost, setSelectedPost] = useState<CommunityPostVO>()
  const [sheet, setSheet] = useState<'actions' | 'report' | 'uncertified' | null>(null)
  const requestSequenceRef = useRef<Record<CommunityScene, number>>({ FOLLOWING: 0, CITY: 0, HOT: 0 })
  const resumeRefreshRef = useRef(false)
  const access = useAccessStatus('canBrowseCards')
  const optionLabel = usePrd01Store(state => state.optionLabel)

  const tabs = useMemo(() => (config?.homeTabs || []).map(item => ({ label: item.entryName, scene: sceneByEntryKey[item.entryKey] })).filter((item): item is { label: string; scene: CommunityScene } => Boolean(item.scene)), [config?.homeTabs])
  const visiblePosts = postsByScene[activeTab] || []
  const initialLoading = Boolean(loadingByScene[activeTab] && postsByScene[activeTab] === undefined)

  const loadScene = async (targetScene: CommunityScene) => {
    const sequence = requestSequenceRef.current[targetScene] + 1
    requestSequenceRef.current[targetScene] = sequence
    setLoadingByScene(state => ({ ...state, [targetScene]: true }))
    try {
      const page = await getCommunityPosts(targetScene)
      if (requestSequenceRef.current[targetScene] !== sequence) return
      const records = page.records || []
      setPostsByScene(state => ({ ...state, [targetScene]: records }))
      setSelectedPost(current => current || records[0])
    } catch (error) {
      await showError(config, error)
    } finally {
      if (requestSequenceRef.current[targetScene] === sequence) {
        setLoadingByScene(state => ({ ...state, [targetScene]: false }))
      }
    }
  }

  const loadContext = async () => {
    try {
      const [runtime, count, home] = await Promise.all([
        getCommunityMeta(),
        getFollowingCount(),
        prd01Api.getHomeDetail(),
      ])
      setConfig(runtime)
      Taro.setStorageSync(COMMUNITY_CONFIG_CACHE_KEY, runtime)
      setFollowingCount(Number(count || 0))
      setOwnerAvatar(normalizeAvatarUrl(String(home.profile.avatar || ''), defaultAvatar))
    } catch (error) {
      await showError(config, error)
    }
  }

  const loadTopicHome = async () => {
    setTopicHomeLoading(true)
    try {
      setTopicHome(await getCommunityTopicHome())
    } catch (error) {
      await showError(config, error)
    } finally {
      setTopicHomeLoading(false)
    }
  }

  const refreshFamily = () => {
    void loadContext()
    void loadScene(activeTab)
    if (activeTab === 'HOT') void loadTopicHome()
  }

  useEffect(() => {
    refreshFamily()
  }, [])

  useDidHide(() => {
    resumeRefreshRef.current = true
  })

  useDidShow(() => {
    const requested = readRequestedPrimaryTab()
    if (requested === 'KINDRED') setPrimaryTab('KINDRED')
    const requestedScene = readRequestedScene()
    if (requestedScene) {
      setPrimaryTab('FAMILY')
      setActiveTab(requestedScene)
      void loadScene(requestedScene)
      if (requestedScene === 'HOT') void loadTopicHome()
    }
    if (!resumeRefreshRef.current) return
    resumeRefreshRef.current = false
    if (primaryTab === 'FAMILY') refreshFamily()
  })

  const changeTab = (tab: CommunityScene) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    void loadScene(tab)
    if (tab === 'HOT' && !topicHome) void loadTopicHome()
  }

  const changePrimaryTab = (tab: QianxunPrimaryTab) => {
    if (tab === 'CAREER') {
      void Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.careerUnavailable), icon: 'none' })
      return
    }
    setPrimaryTab(tab)
  }

  const requireCoreAccess = () => {
    if (access.status?.coreAccessStatus === 'CORE_ALLOWED') return true
    setSheet('uncertified')
    return false
  }

  const toggleFollow = async (post: CommunityPostVO) => {
    if (!requireCoreAccess()) return
    try {
      const result = await toggleCommunityFollow(post.authorId)
      setPostsByScene(state => mapPostsByScene(state, item => item.authorId === post.authorId ? { ...item, followingAuthor: result.following } : item))
      setFollowingCount(value => Math.max(0, value + (result.following ? 1 : -1)))
      setSheet(null)
    } catch (error) {
      await showError(config, error)
    }
  }

  const toggleLike = async (post: CommunityPostVO) => {
    if (!requireCoreAccess()) return
    try {
      const result = await toggleCommunityLike(post.id)
      setPostsByScene(state => mapPostsByScene(state, item => item.id === post.id ? { ...item, liked: result.liked, likeCount: result.likeCount } : item))
    } catch (error) {
      await showError(config, error)
    }
  }

  const openActions = (post: CommunityPostVO) => {
    setSelectedPost(post)
    setSheet('actions')
  }

  const toggleSelectedAuthorPreference = async () => {
    if (!selectedPost) return
    try {
      const result = selectedPost.hiddenAuthor
        ? await unhideCommunityAuthor(selectedPost.authorUserNo || selectedPost.authorId)
        : await hideCommunityAuthor(selectedPost.authorUserNo || selectedPost.authorId)
      setPostsByScene(state => mapPostsByScene(state, item => item.authorId === selectedPost.authorId ? { ...item, hiddenAuthor: result.hidden } : item))
      setSelectedPost(current => current ? { ...current, hiddenAuthor: result.hidden } : current)
      setSheet(null)
      if (result.message) await Taro.showToast({ title: result.message, icon: 'none' })
    } catch (error) {
      await showError(config, error)
    }
  }

  const report = async (reasonCode: string) => {
    if (!selectedPost) return
    try {
      const result = await reportCommunityPost(selectedPost.postNo || selectedPost.id, reasonCode)
      setSheet(null)
      await Taro.showToast({ title: resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.reportSubmitted, result), icon: 'none' })
    } catch (error) {
      await showError(config, error)
    }
  }

  const goVerify = async () => {
    try {
      const [basic, verification, introduction] = await Promise.all([
        prd01Api.getBasicProfile(),
        prd01Api.getVerificationStatus(),
        prd01Api.getIntroduction(),
      ])
      const route = resolveVerificationOnboardingRoute({
        basicCompleted: basic.basicProfileCompleted,
        avatarStatus: verification.avatarVerifyStatus,
        introductionStatus: introduction.auditStatus,
      })
      setSheet(null)
      await Taro.navigateTo({ url: route })
    } catch (error) {
      await showError(config, error)
    }
  }

  const headerMetrics = getQianxunHeaderMetrics()

  return (
    <View style={{ minHeight: '100vh', background: 'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6) 100%)', overflow: 'hidden', position: 'relative' }}>
      <QianxunHeader
        active={primaryTab}
        avatar={ownerAvatar}
        unreadCount={unreadCount}
        metrics={headerMetrics}
        onChange={changePrimaryTab}
        onProfile={() => void Taro.navigateTo({ url: '/pages/qianxun/interactions?section=mine' })}
      />
      {primaryTab === 'FAMILY' ? <>
        <FamilyTabs active={activeTab} tabs={tabs} top={headerMetrics.secondaryTop} onChange={changeTab} />
        <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: `${headerMetrics.contentTop}rpx`, bottom: '146rpx' }} showScrollbar={false}>
          <View style={{ width: '750rpx', padding: '20rpx 25rpx 120rpx', boxSizing: 'border-box' }}>
            {activeTab === 'HOT' ? <QianxunTopicSpotlight home={topicHome} loading={topicHomeLoading} config={config} onRetry={() => void loadTopicHome()} /> : null}
            {initialLoading ? <LoadingCards /> : visiblePosts.length ? visiblePosts.map(post => (
              <CommunityCard
                key={post.id}
                post={post}
                optionLabel={optionLabel}
                onAuthor={() => void Taro.navigateTo({ url: `/pages/heart/user?userId=${post.authorId}` })}
                onOpen={() => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` })}
                onTopic={() => post.topicId && void Taro.navigateTo({ url: `/pages/qianxun/topic?topicId=${post.topicId}` })}
                onComment={() => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}&focus=comment` })}
                onContact={() => requireCoreAccess() && void Taro.navigateTo({ url: `/pages/message/whisper-detail?receiverUserNo=${post.authorId}&nickname=${encodeURIComponent(post.authorName || '用户')}&avatar=${encodeURIComponent(post.authorAvatar || '')}&meta=${encodeURIComponent(formatPostAuthorMeta(post, optionLabel))}&compose=1` })}
                onMore={() => openActions(post)}
                onFollow={() => void toggleFollow(post)}
                onLike={() => void toggleLike(post)}
              />
            )) : <FeedEmptyState tab={activeTab} hasFollowing={followingCount > 0} config={config} onGoCity={() => changeTab('CITY')} />}
          </View>
        </ScrollView>
        <View onClick={() => requireCoreAccess() && Taro.navigateTo({ url: '/pages/qianxun/compose' })} style={{ position: 'fixed', right: '30rpx', bottom: '190rpx', width: '104rpx', height: '104rpx', borderRadius: '52rpx', background: BLUE, boxShadow: '0 10rpx 28rpx rgba(40,118,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8 }}><Text style={{ color: '#FFFFFF', fontSize: '56rpx', lineHeight: '60rpx', fontWeight: 300 }}>＋</Text></View>
      </> : <QianxunZhiyinTab secondaryTop={headerMetrics.secondaryTop} contentTop={headerMetrics.contentTop} />}

      {sheet === 'actions' && selectedPost ? (
        <PostActionSheet
          post={selectedPost}
          onClose={() => setSheet(null)}
          onFollow={() => void toggleFollow(selectedPost)}
          onHide={() => void toggleSelectedAuthorPreference()}
          onReport={config?.reportEntryEnabled === false ? undefined : () => {
            if (config?.reportReasons?.length) setSheet('report')
            else void Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.reportReasonUnavailable), icon: 'none' })
          }}
        />
      ) : null}
      {sheet === 'report' ? <ReportSheet reasons={config?.reportReasons || []} onClose={() => setSheet(null)} onReport={reason => void report(reason)} /> : null}
      {sheet === 'uncertified' ? <UncertifiedSheet onClose={() => setSheet(null)} onVerify={() => void goVerify()} /> : null}
    </View>
  )
}

function FamilyTabs({ active, tabs, top, onChange }: { active: CommunityScene; tabs: Array<{ label: string; scene: CommunityScene }>; top: number; onChange: (tab: CommunityScene) => void }) {
  return <View style={{ position: 'absolute', left: '29rpx', top: `${top}rpx`, width: '344rpx', height: '62rpx', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
    {tabs.map(item => {
      const selected = active === item.scene
      return <View key={item.scene} id={`qianxun-scene-${item.scene}`} data-scene={item.scene} onClick={() => onChange(item.scene)} style={{ position: 'relative', width: '108rpx', height: '62rpx', borderRadius: '12rpx', background: selected ? 'linear-gradient(180deg, #51AEFF 0%, #2876FF 100%)' : '#E3F1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: selected ? '#FFFFFF' : '#8B96A8', fontSize: selected ? '28rpx' : '26rpx', lineHeight: selected ? '40rpx' : '37rpx', fontWeight: selected ? 600 : 400 }}>{item.label}</Text>
        {selected ? <View style={{ position: 'absolute', left: '50%', bottom: '-10rpx', width: 0, height: 0, borderLeft: '10rpx solid transparent', borderRight: '10rpx solid transparent', borderTop: `12rpx solid ${BLUE}`, transform: 'translateX(-50%)' }} /> : null}
      </View>
    })}
  </View>
}

function CommunityCard({ post, optionLabel, onAuthor, onOpen, onTopic, onComment, onContact, onMore, onFollow, onLike }: { post: CommunityPostVO; optionLabel: (type: string, code: string) => string; onAuthor: () => void; onOpen: () => void; onTopic: () => void; onComment: () => void; onContact: () => void; onMore: () => void; onFollow: () => void; onLike: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = post.content.length > 78
  const meta = formatPostAuthorMeta(post, optionLabel)
  const genderIcon = post.authorGender === 'FEMALE'
    ? miniappOssIcons.qianxunGenderFemale
    : post.authorGender === 'MALE'
      ? miniappOssIcons.qianxunGenderMale
      : undefined
  const contactText = post.contactAction === 'PRIVATE_MESSAGE' ? '私信' : '悄悄话'
  return <View style={{ width: '700rpx', borderRadius: '18rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '33rpx 26rpx 0', boxSizing: 'border-box', overflow: 'hidden' }}>
    <View style={{ display: 'flex', alignItems: 'center' }}>
      <Image onClick={onAuthor} src={post.authorAvatar || defaultAvatar} mode="aspectFill" style={{ width: '80rpx', height: '80rpx', borderRadius: '40rpx', background: '#EEF3F8', flexShrink: 0 }} />
      <View onClick={onAuthor} style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}>
        <View style={{ display: 'flex', alignItems: 'center', height: '38rpx' }}><Text style={{ maxWidth: '260rpx', color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.authorName || '用户'}</Text>{genderIcon ? <Image src={genderIcon} mode="aspectFit" style={{ width: '32rpx', height: '32rpx', marginLeft: '14rpx', flexShrink: 0 }} /> : null}</View>
        <Text style={{ display: 'block', maxWidth: '390rpx', color: BLUE, fontSize: '24rpx', lineHeight: '33rpx', marginTop: '9rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</Text>
      </View>
      <View className="qianxun-family-follow" onClick={onFollow} style={{ width: post.followingAuthor ? '128rpx' : '118rpx', height: '48rpx', borderRadius: '24rpx', border: `1rpx solid ${post.followingAuthor ? '#999999' : BLUE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}><Text style={{ color: post.followingAuthor ? '#999999' : BLUE, fontSize: '24rpx', lineHeight: '33rpx', fontWeight: post.followingAuthor ? 400 : 500 }}>{post.followingAuthor ? '已关注' : '+ 关注'}</Text></View>
      <View onClick={onMore} style={{ width: '36rpx', height: '52rpx', marginLeft: '4rpx', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}><Text style={{ color: '#999999', fontSize: '38rpx', lineHeight: '44rpx' }}>⋮</Text></View>
    </View>
    <View className="qianxun-community-card" data-post-id={post.id} onClick={onOpen}>
    {post.title ? <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600, marginTop: '29rpx' }}>{post.title}</Text> : null}
    <View style={{ position: 'relative', marginTop: post.title ? '12rpx' : '27rpx' }}>
      <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '48rpx', maxHeight: !expanded && canExpand ? '192rpx' : 'none', overflow: 'hidden' }}>{post.content}</Text>
      {!expanded && canExpand ? <View onClick={() => setExpanded(true)} style={{ position: 'absolute', right: 0, bottom: 0, height: '48rpx', paddingLeft: '18rpx', background: '#FFFFFF', display: 'flex', alignItems: 'center' }}><Text style={{ color: BLUE, fontSize: '26rpx', lineHeight: '48rpx' }}>查看全部</Text></View> : null}
    </View>
    <PostImageGrid images={post.imageUrls || []} />
    </View>
    <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '37rpx', marginTop: '28rpx', marginLeft: '7rpx' }}>{post.activityText || `${relativeTime(post.createTime)}活跃`}</Text>
    {post.topicName ? <View onClick={onTopic} style={{ width: 'auto', maxWidth: '300rpx', height: '48rpx', borderRadius: '24rpx', background: '#EFF4FC', padding: '0 18rpx', marginTop: '23rpx', marginLeft: '7rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}><Text style={{ color: '#666666', fontSize: '26rpx', lineHeight: '37rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Text style={{ color: '#229AF8' }}># </Text>{post.topicName}</Text></View> : null}
    <View style={{ height: '92rpx', borderTop: '2rpx solid #EFF4FC', marginTop: post.topicName ? '30rpx' : '32rpx', display: 'flex', alignItems: 'center' }}>
      <View onClick={onContact} style={{ minHeight: '80rpx', display: 'flex', alignItems: 'center' }}><ActionStat kind="contact" text={contactText} /></View>
      <View style={{ flex: 1 }} />
      <View onClick={onComment}><ActionStat kind="comment" text={String(post.commentCount || 0)} /></View>
      <View onClick={onLike}><ActionStat kind="like" text={String(post.likeCount || 0)} active={post.liked} /></View>
    </View>
  </View>
}

function formatPostAuthorMeta(post: CommunityPostVO, optionLabel: (type: string, code: string) => string) {
  return [
    post.authorBirthYear ? `${String(post.authorBirthYear).slice(-2)}年` : post.authorAge ? `${post.authorAge}岁` : '',
    post.authorCity ? optionLabel('location', post.authorCity) || post.authorCity : '',
    post.authorProfession || post.authorZodiac || (post.authorAnnualIncome ? optionLabel('annualIncome', post.authorAnnualIncome) : ''),
  ].filter(Boolean).join('·') || '资料待完善'
}

function PostImageGrid({ images }: { images: string[] }) {
  const visible = images.slice(0, 9)
  if (!visible.length) return null
  const useTwoColumn = visible.length <= 2 || visible.length === 4
  const width = useTwoColumn ? '318rpx' : '206rpx'
  const height = useTwoColumn ? '348rpx' : '226rpx'
  const columns = useTwoColumn ? 2 : 3
  const gap = useTwoColumn ? 12 : 10
  return <View style={{ display: 'flex', flexWrap: 'wrap', marginTop: '28rpx' }}>{visible.map((url, index) => <Image key={`${url}-${index}`} src={url} mode="aspectFill" style={{ width, height, borderRadius: '8rpx', background: '#EEF2F7', marginRight: (index + 1) % columns === 0 ? 0 : `${gap}rpx`, marginBottom: index >= visible.length - columns ? 0 : `${gap}rpx` }} />)}</View>
}

function ActionStat({ kind, text, active = false }: { kind: 'contact' | 'comment' | 'like'; text: string; active?: boolean }) {
  if (kind === 'contact') return <View style={{ display: 'flex', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunWhisper} mode="aspectFit" style={{ width: '52rpx', height: '52rpx', marginRight: '10rpx', flexShrink: 0 }} /><Text style={{ color: '#4E8EFF', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 500 }}>{text}</Text></View>
  const icon = kind === 'comment' ? miniappOssIcons.qianxunComment : active ? miniappOssIcons.qianxunLikeActive : miniappOssIcons.qianxunLike
  return <View style={{ minWidth: '92rpx', marginLeft: '24rpx', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}><Image src={icon} mode="aspectFit" style={{ width: '32rpx', height: '32rpx', marginRight: '8rpx', flexShrink: 0 }} /><Text style={{ color: '#999999', fontSize: '26rpx', lineHeight: '37rpx' }}>{text}</Text></View>
}

function FeedEmptyState({ tab, hasFollowing, config, onGoCity }: { tab: CommunityScene; hasFollowing: boolean; config?: CommunityConfig; onGoCity: () => void }) {
  const following = tab === 'FOLLOWING'
  const title = resolveCommunityCopy(config, following
    ? (hasFollowing ? COMMUNITY_COPY_KEYS.emptyFollowingFeed : COMMUNITY_COPY_KEYS.emptyFollowingUsers)
    : COMMUNITY_COPY_KEYS.emptyCityFeed)
  const desc = resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyFeedDescription)
  return <View id="qianxun-family-empty-state" style={{ width: '700rpx', paddingTop: '128rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <Image src={miniappOssIcons.qianxunEmptyFollowing} mode="aspectFit" style={{ width: '334rpx', height: '254rpx' }} />
    <Text style={{ color: '#999999', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 400, marginTop: '30rpx' }}>{title}</Text>
    <Text style={{ color: '#999999', fontSize: '28rpx', lineHeight: '40rpx', marginTop: '20rpx' }}>{desc}</Text>
    {following ? <View onClick={onGoCity} style={{ width: '468rpx', height: '98rpx', borderRadius: '12rpx', background: BLUE, marginTop: '50rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 500 }}>去千寻同城看看</Text></View> : null}
  </View>
}

function LoadingCards() {
  return <View>{[0, 1].map(index => <View key={index} style={{ width: '700rpx', height: '330rpx', borderRadius: '18rpx', background: 'rgba(255,255,255,0.7)', marginBottom: '20rpx' }} />)}</View>
}

function mapPostsByScene(state: Partial<Record<CommunityScene, CommunityPostVO[]>>, mapper: (post: CommunityPostVO) => CommunityPostVO) {
  return Object.fromEntries(Object.entries(state).map(([scene, posts]) => [scene, posts?.map(mapper)])) as Partial<Record<CommunityScene, CommunityPostVO[]>>
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,20,43,0.46)', zIndex: 10000 }}>{children}</View>
}

function PostActionSheet({ post, onClose, onFollow, onHide, onReport }: { post: CommunityPostVO; onClose: () => void; onFollow: () => void; onHide: () => void; onReport?: () => void }) {
  const actions = [
    { label: '分享', share: true, onClick: () => void Taro.showShareMenu({ withShareTicket: true }) },
    { label: post.followingAuthor ? '取消关注' : '关注', onClick: onFollow },
    { label: post.hiddenAuthor ? '取消不看 TA 动态' : '不看 TA 动态', onClick: onHide },
    ...(onReport ? [{ label: '举报', onClick: onReport }] : []),
  ]
  return <Overlay onClose={onClose}><View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', padding: '24rpx 24rpx calc(28rpx + env(safe-area-inset-bottom))' }}>
    {actions.map(action => <View key={action.label} onClick={action.onClick} style={{ position: 'relative', height: '94rpx', borderBottom: '1rpx solid #F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{action.share ? <View style={{ width: '42rpx', height: '42rpx', borderRadius: '10rpx', background: '#14C76A', marginRight: '18rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>微</Text></View> : null}<Text style={{ color: '#333333', fontSize: '28rpx' }}>{action.label}</Text></View>)}
    <View onClick={onClose} style={{ height: '86rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#777F8B', fontSize: '28rpx' }}>取消</Text></View>
  </View></Overlay>
}

function ReportSheet({ reasons, onClose, onReport }: { reasons: Array<{ code: string; label: string }>; onClose: () => void; onReport: (code: string) => void }) {
  return <Overlay onClose={onClose}><View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '1190rpx', borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', padding: '28rpx 30rpx calc(26rpx + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}>
    <ScrollView scrollY style={{ maxHeight: '920rpx' }}>{reasons.map(reason => <View key={reason.code} onClick={() => onReport(reason.code)} style={{ height: '82rpx', borderBottom: '1rpx solid #F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#333333', fontSize: '27rpx', textAlign: 'center' }}>{reason.label}</Text></View>)}</ScrollView>
    <View style={{ height: '14rpx', background: '#F4F5F7', margin: '0 -30rpx' }} /><View onClick={onClose} style={{ height: '78rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#777F8B', fontSize: '28rpx' }}>取消</Text></View>
  </View></Overlay>
}

function UncertifiedSheet({ onClose, onVerify }: { onClose: () => void; onVerify: () => void }) {
  return <Overlay onClose={onClose}><View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: '488rpx', borderRadius: '40rpx 40rpx 0 0', background: 'linear-gradient(180deg, #D8ECFF 0%, #FFFFFF 72%)', padding: '58rpx 46rpx calc(38rpx + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}>
    <Image src={miniappOssIcons.qianxunVerifyNote} mode="aspectFit" style={{ position: 'absolute', right: '44rpx', top: '-104rpx', width: '250rpx', height: '250rpx' }} />
    <Text style={{ display: 'block', color: NAVY, fontSize: '38rpx', lineHeight: '54rpx', fontWeight: 800 }}>你还未认证</Text>
    <Text style={{ display: 'block', width: '500rpx', color: '#68778E', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '22rpx' }}>完成认证即可给感兴趣的用户评论，发布个人动态</Text>
    <View onClick={onVerify} style={{ width: '658rpx', height: '86rpx', borderRadius: '43rpx', background: BLUE, margin: '62rpx auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 700 }}>立即认证</Text></View>
  </View></Overlay>
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

async function showError(config: CommunityConfig | undefined, error: unknown) {
  const title = resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.genericError, error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
