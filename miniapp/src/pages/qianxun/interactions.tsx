import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { QianxunActionStat, QianxunGenderIcon } from '@/components/QianxunCommunityIcons'
import { miniappOssIcons } from '@/constants/ossIcons'
import { formatInteractionCardDate, groupCommunityInteractions, shouldDisplayMyCommunityPost } from '@/domain/qianxunInteractionPresentation'
import { normalizeAvatarUrl } from '@/utils/avatar'
import { prd01Api } from '@/services/prd01'
import {
  COMMUNITY_COPY_KEYS,
  clearCommunityViewHistory,
  getCommunityMeta,
  getCommunityFollowRelations,
  getCommunityInteractions,
  getCommunityPostInteractors,
  getCommunityProfileSummary,
  getMyCommunityPosts,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  resolveCommunityStatusLabel,
  toggleCommunityFollow,
  type CommunityConfig,
  type CommunityPostVO,
  type CommunityRelationUserVO,
} from '@/services/community'
import { useAuthStore } from '@/stores/authStore'
import defaultAvatar from '@/assets/profile/default-avatar.webp'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
const REQUESTED_SCENE_KEY = 'qianxun_requested_scene'

type MainSection = 'interaction' | 'history' | 'mine'
type InteractionFilter = 'commented' | 'liked' | 'unlocked'
type RosterKind = 'following' | 'followers'

interface ProfileSummary {
  nickname: string
  avatar: string
  description: string
  postCount: number
  followingCount: number
  followerCount: number
  receivedLikeCount: number
}

interface InteractionRecord {
  id: string
  kind: InteractionFilter
  userId?: number
  nickname: string
  avatar: string
  description: string
  interactionTime?: string
  post?: CommunityPostVO
}

interface MyPostSnapshot {
  id: string
  postId?: number
  status: string
  statusName?: string
  content: string
  imageUrls: string[]
  topicName?: string
  createdAt: string
  commentCount: number
  likeCount: number
}

const emptyProfile: ProfileSummary = {
  nickname: `community.copy.${COMMUNITY_COPY_KEYS.profilePendingNickname}`,
  avatar: defaultAvatar,
  description: `community.copy.${COMMUNITY_COPY_KEYS.profilePendingDescription}`,
  postCount: 0,
  followingCount: 0,
  followerCount: 0,
  receivedLikeCount: 0,
}

export default function QianxunInteractionsPage() {
  const [profile, setProfile] = useState<ProfileSummary>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<MainSection>('interaction')
  const [filter, setFilter] = useState<InteractionFilter>('commented')
  const [records, setRecords] = useState<InteractionRecord[]>([])
  const [history, setHistory] = useState<InteractionRecord[]>([])
  const [myPosts, setMyPosts] = useState<MyPostSnapshot[]>([])
  const [roster, setRoster] = useState<RosterKind | null>(null)
  const [rosterUsers, setRosterUsers] = useState<CommunityRelationUserVO[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [interactorPostId, setInteractorPostId] = useState<string>()
  const [interactorType, setInteractorType] = useState<'liked' | 'commented'>('liked')
  const [likeSummaryVisible, setLikeSummaryVisible] = useState(false)
  const [config, setConfig] = useState<CommunityConfig>()

  useLoad(options => {
    if (['interaction', 'history', 'mine'].includes(String(options.section))) {
      setSection(options.section as MainSection)
    }
    if (['following', 'followers'].includes(String(options.roster))) {
      setRoster(options.roster as RosterKind)
    }
    if (options.likes === '1') setLikeSummaryVisible(true)
    if (options.postId) setInteractorPostId(String(options.postId))
    if (options.interactionType === 'commented') setInteractorType('commented')
  })

  useDidShow(() => {
    void loadPage()
  })

  useEffect(() => {
    if (!roster) return
    setRosterLoading(true)
    void getCommunityFollowRelations(roster, 1, 50).then(page => {
      setRosterUsers(page.records || [])
    }).catch(error => showError(config, error)).finally(() => setRosterLoading(false))
  }, [roster])

  useEffect(() => {
    if (!interactorPostId) return
    setRosterLoading(true)
    void getCommunityPostInteractors(interactorPostId, interactorType, 1, 50).then(page => {
      setRosterUsers(page.records || [])
    }).catch(error => showError(config, error)).finally(() => setRosterLoading(false))
  }, [interactorPostId, interactorType])

  const loadPage = async () => {
    setLoading(true)
    try {
      const [runtime, home, summary, commented, liked, unlocked, viewHistory, myPostPage] = await Promise.all([
        getCommunityMeta(),
        prd01Api.getHomeDetail(),
        getCommunityProfileSummary(),
        getCommunityInteractions('commented', 1, 50),
        getCommunityInteractions('liked', 1, 50),
        getCommunityInteractions('unlocked', 1, 50),
        getCommunityInteractions('viewed', 1, 50),
        getMyCommunityPosts(1, 50),
      ])
      setConfig(runtime)
      const auth = useAuthStore.getState()
      const source = home.profile || {}
      setProfile({
        nickname: String(source.nickname || auth.nickname || resolveCommunityCopy(runtime, COMMUNITY_COPY_KEYS.profilePendingNickname)),
        avatar: normalizeAvatarUrl(String(source.avatar || auth.avatar || ''), defaultAvatar),
        description: buildProfileDescription(source, runtime),
        postCount: readNonNegativeNumber(summary.stats?.postCount),
        followingCount: readNonNegativeNumber(summary.stats?.followingCount),
        followerCount: readNonNegativeNumber(summary.stats?.followerCount),
        receivedLikeCount: readNonNegativeNumber(summary.stats?.receivedLikeCount),
      })
      setRecords([...commented.records, ...liked.records, ...unlocked.records].map(item => ({
        id: String(item.id),
        kind: item.interactionType as InteractionFilter,
        userId: item.targetUserId,
        nickname: item.nickname,
        avatar: item.avatar,
        description: item.description,
        interactionTime: item.interactionTime,
        post: item.post,
      })))
      setHistory((viewHistory.records || []).map(item => ({
        id: String(item.id),
        kind: 'commented',
        userId: item.targetUserId,
        nickname: item.nickname,
        avatar: item.avatar,
        description: item.description,
        interactionTime: item.interactionTime,
        post: item.post,
      })))
      setMyPosts((myPostPage.records || []).filter(item => shouldDisplayMyCommunityPost(item.status)).map(toMyPostSnapshot))
    } catch (error) {
      await showError(config, error)
    } finally {
      setLoading(false)
    }
  }

  const visibleRecords = useMemo(() => records.filter(item => item.kind === filter), [filter, records])
  const visiblePostGroups = useMemo(
    () => groupCommunityInteractions(visibleRecords.filter(item => item.post)),
    [visibleRecords]
  )
  const historyGroups = useMemo(() => groupCommunityInteractions(history.filter(item => item.post)), [history])

  const changeSection = (next: MainSection) => {
    setSection(next)
  }

  const clearHistory = async () => {
    if (!history.length) return
    const confirmation = await Taro.showModal({
      title: '温馨提示',
      content: '确定清空浏览记录吗？',
      cancelText: '取消',
      confirmText: '清空',
      confirmColor: BLUE,
    })
    if (!confirmation.confirm) return
    try {
      await clearCommunityViewHistory()
      setHistory([])
    } catch (error) {
      await showError(config, error)
    }
  }

  const openHistoryActions = async () => {
    if (!history.length) return
    const selected = await Taro.showActionSheet({ itemList: ['清空浏览记录'] })
    if (selected.tapIndex === 0) await clearHistory()
  }

  if (interactorPostId) {
    return <View id="qianxun-interactors-page" style={{ minHeight: '100vh', background: '#FFFFFF' }}><SimpleHeader title="互动" onBack={() => void Taro.navigateBack()} /><View style={{ height: '88rpx', padding: '0 30rpx', display: 'flex', alignItems: 'center', borderBottom: '1rpx solid #EFF2F6' }}>{(['liked', 'commented'] as const).map(type => <View key={type} onClick={() => setInteractorType(type)} style={{ position: 'relative', width: '150rpx', height: '88rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: interactorType === type ? NAVY : '#999999', fontSize: '27rpx', fontWeight: interactorType === type ? 600 : 400 }}>{type === 'liked' ? '点赞' : '评论'}</Text>{interactorType === type ? <View style={{ position: 'absolute', bottom: 0, width: '54rpx', height: '6rpx', borderRadius: '3rpx', background: BLUE }} /> : null}</View>)}</View>{rosterLoading ? <LoadingRows /> : rosterUsers.length ? <RosterList users={rosterUsers} onChanged={() => void getCommunityPostInteractors(interactorPostId, interactorType, 1, 50).then(page => setRosterUsers(page.records || [])).catch(error => showError(config, error))} config={config} /> : <InteractorEmpty type={interactorType} config={config} />}</View>
  }

  if (roster) {
    return (
      <View id="qianxun-interactions-page" style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <SimpleHeader title={roster === 'following' ? '关注' : '粉丝'} onBack={() => setRoster(null)} />
        <View style={{ height: '78rpx', padding: '0 30rpx', background: '#FAFAFA', display: 'flex', alignItems: 'center' }}>
          <Text style={{ color: '#999999', fontSize: '25rpx' }}>
            {roster === 'following' ? `我关注的（${profile.followingCount}人）` : `我的粉丝（${profile.followerCount}人）`}
          </Text>
        </View>
        {rosterLoading ? <LoadingRows /> : rosterUsers.length ? <RosterList users={rosterUsers} onChanged={() => void getCommunityFollowRelations(roster, 1, 50).then(page => setRosterUsers(page.records || [])).catch(error => showError(config, error))} config={config} /> : <RosterEmpty kind={roster} config={config} />}
      </View>
    )
  }

  return (
    <View id="qianxun-interactions-page" style={{ height: '100vh', background: 'linear-gradient(105deg, #EEFFFC 0%, #F2F6FF 55%, #FEFFF4 100%)', overflow: 'hidden' }}>
      <ProfileHeader
        profile={profile}
        onFollowing={() => setRoster('following')}
        onFollowers={() => setRoster('followers')}
        onLikes={() => setLikeSummaryVisible(true)}
        onMine={() => setSection('mine')}
      />
      <View style={{ position: 'absolute', left: '25rpx', right: '25rpx', top: '430rpx', bottom: 0, borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', overflow: 'hidden' }}>
        <MainTabs active={section} onChange={changeSection} />
        <View id="qianxun-interactions-panel-interaction" data-section-panel="interaction" style={sectionPanelStyle(section === 'interaction')}>
          <FilterTabs active={filter} onChange={setFilter} />
          <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: '80rpx', bottom: 0 }} showScrollbar={false}>
            {loading ? <LoadingRows /> : (filter === 'unlocked' ? visibleRecords.length > 0 : visiblePostGroups.length > 0) ? (
              filter === 'unlocked'
                ? <View style={{ padding: '20rpx 26rpx 40rpx' }}>{visibleRecords.map(item => <InteractionRow key={item.id} item={item} config={config} />)}</View>
                : <InteractionPostGroups groups={visiblePostGroups} />
            ) : <InteractionEmpty filter={filter} config={config} />}
          </ScrollView>
        </View>
        <View id="qianxun-interactions-panel-history" data-section-panel="history" style={sectionPanelStyle(section === 'history')}>
          {history.length && !loading ? <View id="qianxun-history-more" role="button" onClick={() => void openHistoryActions()} style={{ position: 'absolute', right: '20rpx', top: '4rpx', width: '72rpx', height: '72rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><Text style={{ color: '#8D929B', fontSize: '32rpx', letterSpacing: '3rpx' }}>···</Text></View> : null}
          <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} showScrollbar={false}>
            {loading ? <LoadingRows /> : historyGroups.length ? (
              <InteractionPostGroups groups={historyGroups} />
            ) : <HistoryEmpty config={config} />}
          </ScrollView>
        </View>
        <View id="qianxun-interactions-panel-mine" data-section-panel="mine" style={sectionPanelStyle(section === 'mine')}>
          <MinePanel loading={loading} posts={myPosts} config={config} />
        </View>
      </View>
      {likeSummaryVisible ? <LikeSummary count={profile.receivedLikeCount} nickname={profile.nickname} onClose={() => setLikeSummaryVisible(false)} /> : null}
    </View>
  )
}

function ProfileHeader({ profile, onFollowing, onFollowers, onLikes, onMine }: { profile: ProfileSummary; onFollowing: () => void; onFollowers: () => void; onLikes: () => void; onMine: () => void }) {
  const stats = [
    { label: '动态', value: profile.postCount, onClick: onMine },
    { label: '关注', value: profile.followingCount, onClick: onFollowing },
    { label: '粉丝', value: profile.followerCount, onClick: onFollowers },
    { label: '获赞', value: profile.receivedLikeCount, onClick: onLikes },
  ]
  return (
    <View style={{ height: '430rpx', position: 'relative' }}>
      <SimpleHeader title="千寻互动" onBack={() => void Taro.navigateBack()} transparent />
      <View style={{ position: 'absolute', left: '33rpx', top: '226rpx', right: '30rpx', height: '100rpx', display: 'flex', alignItems: 'center' }}>
        <Image src={profile.avatar} mode="aspectFill" style={{ width: '80rpx', height: '80rpx', borderRadius: '40rpx', border: '5rpx solid #FFFFFF', boxSizing: 'border-box', background: '#EDF1F6' }} />
        <View style={{ marginLeft: '20rpx', minWidth: 0 }}>
          <Text style={{ display: 'block', color: '#222222', fontSize: '31rpx', lineHeight: '44rpx', fontWeight: 600 }}>{profile.nickname}</Text>
          <Text style={{ display: 'block', color: '#999999', fontSize: '23rpx', lineHeight: '34rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.description}</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', left: '28rpx', top: '356rpx', width: '550rpx', height: '62rpx', display: 'flex', alignItems: 'center' }}>
        {stats.map(item => (
          <View key={item.label} onClick={item.onClick} style={{ minWidth: '116rpx', height: '62rpx', marginRight: '5rpx', display: 'flex', alignItems: 'center' }}>
            <Text style={{ color: '#9A9FA8', fontSize: '22rpx', marginRight: '10rpx' }}>{item.label}</Text>
            <Text style={{ color: NAVY, fontSize: '30rpx', fontWeight: 600 }}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function SimpleHeader({ title, onBack, transparent = false }: { title: string; onBack: () => void; transparent?: boolean }) {
  return <NativeNavigation title={title} onBack={onBack} background={transparent ? 'transparent' : '#FFFFFF'} />
}

function MainTabs({ active, onChange }: { active: MainSection; onChange: (value: MainSection) => void }) {
  const tabs: Array<{ key: MainSection; label: string }> = [
    { key: 'interaction', label: '互动' },
    { key: 'history', label: '浏览记录' },
    { key: 'mine', label: '我的动态' },
  ]
  return (
    <View style={{ height: '104rpx', padding: '0 26rpx', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
      {tabs.map(item => {
        const selected = active === item.key
        return (
          <View key={item.key} id={`qianxun-interactions-tab-${item.key}`} onClick={() => onChange(item.key)} style={{ position: 'relative', width: '190rpx', height: '86rpx', display: 'flex', alignItems: 'center', justifyContent: item.key === 'interaction' ? 'flex-start' : item.key === 'mine' ? 'flex-end' : 'center' }}>
            <Text style={{ color: selected ? NAVY : '#999999', fontSize: '28rpx', fontWeight: selected ? 600 : 400 }}>{item.label}</Text>
            {selected ? <View style={{ position: 'absolute', bottom: '8rpx', width: item.key === 'interaction' ? '58rpx' : '112rpx', height: '8rpx', borderRadius: '4rpx', background: '#6095FF' }} /> : null}
          </View>
        )
      })}
    </View>
  )
}

function sectionPanelStyle(active: boolean) {
  return {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: '104rpx',
    bottom: 0,
    visibility: active ? 'visible' as const : 'hidden' as const,
    pointerEvents: active ? 'auto' as const : 'none' as const,
    zIndex: active ? 1 : 0,
    background: '#FFFFFF',
  }
}

function MinePanel({ loading, posts, config }: { loading: boolean; posts: MyPostSnapshot[]; config?: CommunityConfig }) {
  return (
    <ScrollView scrollY style={{ height: '100%' }} showScrollbar={false}>
      <View style={{ padding: '6rpx 26rpx 54rpx' }}>
        <View id="qianxun-post-guide" style={{ position: 'relative', width: '650rpx', height: '188rpx', borderRadius: '12rpx', overflow: 'hidden' }}>
          <Image src={miniappOssIcons.qianxunPostGuideBg} mode="scaleToFill" style={{ position: 'absolute', left: 0, top: 0, width: '650rpx', height: '188rpx' }} />
          <Text style={{ position: 'absolute', left: '45rpx', top: '42rpx', color: '#999999', fontSize: '27rpx', lineHeight: '40rpx' }}>记录美好生活 遇上另一半</Text>
          <View onClick={() => void Taro.navigateTo({ url: '/pages/qianxun/compose' })} style={{ position: 'absolute', left: '45rpx', top: '102rpx', width: '130rpx', height: '50rpx', borderRadius: '7rpx', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '25rpx', fontWeight: 500 }}>发动态</Text></View>
        </View>
        {loading ? <LoadingRows /> : posts.length ? posts.map(item => <MyPostSnapshotCard key={item.id} item={item} config={config} />) : <MineEmpty config={config} />}
      </View>
    </ScrollView>
  )
}

function MyPostSnapshotCard({ item, config }: { item: MyPostSnapshot; config?: CommunityConfig }) {
  const date = splitMyPostDate(item.createdAt)
  const open = () => {
    if (item.postId && item.status === 'published') {
      void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${item.postId}` })
    } else if (item.statusName) {
      void Taro.showToast({ title: item.statusName, icon: 'none' })
    }
  }
  return (
    <View onClick={open} style={{ padding: '30rpx 0 24rpx', borderBottom: '2rpx solid #EEF3F8' }}>
      <View style={{ display: 'flex', alignItems: 'flex-start' }}>
        <View style={{ width: '112rpx', display: 'flex', alignItems: 'baseline', flexShrink: 0 }}><Text style={{ color: '#333333', fontSize: '36rpx', lineHeight: '48rpx', fontWeight: 600 }}>{date.day}</Text><Text style={{ color: '#8F8F8F', fontSize: '24rpx', marginLeft: '8rpx' }}>{date.month}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ display: 'block', color: '#333333', fontSize: '27rpx', lineHeight: '42rpx' }}>{item.content}</Text>
          {item.imageUrls[0] ? <Image src={item.imageUrls[0]} mode="aspectFill" style={{ width: '260rpx', height: '190rpx', borderRadius: '9rpx', background: '#F1F3F6', marginTop: '16rpx' }} /> : null}
          {item.topicName ? <Text style={{ display: 'block', color: BLUE, fontSize: '22rpx', marginTop: '14rpx' }}># {item.topicName}</Text> : null}
          <View style={{ marginTop: '16rpx', display: 'flex', alignItems: 'center' }}>
            {item.status !== 'published' ? <Text style={{ color: item.status === 'rejected' ? '#D44747' : BLUE, fontSize: '21rpx' }}>{resolveCommunityStatusLabel(config, item.status, item.statusName)}</Text> : null}
            <View style={{ flex: 1 }} />
            <QianxunActionStat kind="comment" count={item.commentCount} fontSize="21rpx" />
            <View style={{ width: '30rpx' }} />
            <QianxunActionStat kind="like" count={item.likeCount} active fontSize="21rpx" />
          </View>
        </View>
      </View>
    </View>
  )
}

function MineEmpty({ config }: { config?: CommunityConfig }) {
  return <View style={{ paddingTop: '82rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunEmptyChart} mode="aspectFit" style={{ width: '300rpx', height: '204rpx' }} /><Text style={{ color: '#A3A3A3', fontSize: '27rpx', marginTop: '14rpx' }}>{resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyMyPosts)}</Text></View>
}

function FilterTabs({ active, onChange }: { active: InteractionFilter; onChange: (value: InteractionFilter) => void }) {
  const tabs: Array<{ key: InteractionFilter; label: string }> = [
    { key: 'commented', label: '评论过' },
    { key: 'liked', label: '点赞过' },
    { key: 'unlocked', label: '解锁过' },
  ]
  return (
    <View style={{ height: '80rpx', padding: '4rpx 27rpx 12rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
      {tabs.map(item => {
        const selected = active === item.key
        return <View key={item.key} id={`qianxun-interactions-filter-${item.key}`} onClick={() => onChange(item.key)} style={{ height: '56rpx', borderRadius: '28rpx', padding: '0 22rpx', marginRight: '12rpx', background: selected ? BLUE : '#F5F6F8', display: 'flex', alignItems: 'center' }}><Text style={{ color: selected ? '#FFFFFF' : '#AAAAAA', fontSize: '24rpx' }}>{item.label}</Text></View>
      })}
    </View>
  )
}

function InteractionEmpty({ filter, config }: { filter: InteractionFilter; config?: CommunityConfig }) {
  const model = filter === 'commented'
    ? { image: miniappOssIcons.qianxunEmptyMessage, title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyCommented), subtitle: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyInteractionDescription) }
    : filter === 'liked'
      ? { image: miniappOssIcons.qianxunEmptyHeart, title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyLiked), subtitle: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyInteractionDescription) }
      : { image: miniappOssIcons.qianxunEmptyFollowing, title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyUnlocked), subtitle: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyInteractionDescription) }
  return (
    <View style={{ paddingTop: '126rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Image src={model.image} mode="aspectFit" style={{ width: '330rpx', height: '230rpx' }} />
      <Text style={{ color: '#A3A3A3', fontSize: '28rpx', lineHeight: '42rpx', marginTop: '12rpx' }}>{model.title}</Text>
      <Text style={{ color: '#A3A3A3', fontSize: '25rpx', lineHeight: '38rpx', marginTop: '18rpx' }}>{model.subtitle}</Text>
      <View onClick={openQianxunCity} style={{ width: '472rpx', height: '82rpx', borderRadius: '7rpx', background: BLUE, marginTop: '48rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>去千寻同城看看</Text>
      </View>
    </View>
  )
}

function HistoryEmpty({ config }: { config?: CommunityConfig }) {
  return (
    <View style={{ paddingTop: '162rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Image src={miniappOssIcons.qianxunEmptyMessage} mode="aspectFit" style={{ width: '330rpx', height: '230rpx' }} />
      <Text style={{ color: '#A3A3A3', fontSize: '28rpx', marginTop: '14rpx' }}>{resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyHistory)}</Text>
      <View onClick={openQianxunCity} style={{ width: '472rpx', height: '82rpx', borderRadius: '7rpx', background: BLUE, marginTop: '54rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '28rpx' }}>去千寻同城看看</Text></View>
    </View>
  )
}

function openQianxunCity() {
  Taro.setStorageSync(REQUESTED_SCENE_KEY, 'CITY')
  void Taro.switchTab({ url: '/pages/index/index' })
}

function InteractionRow({ item, config }: { item: InteractionRecord; config?: CommunityConfig }) {
  return (
    <View style={{ height: '124rpx', display: 'flex', alignItems: 'center' }}>
      <Image src={normalizeAvatarUrl(item.avatar, defaultAvatar)} mode="aspectFill" style={{ width: '82rpx', height: '82rpx', borderRadius: '41rpx', background: '#EEF1F5' }} />
      <View style={{ marginLeft: '18rpx', minWidth: 0, flex: 1 }}>
        <Text style={{ display: 'block', color: '#292929', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600 }}>{item.nickname}</Text>
        <Text style={{ display: 'block', color: '#A1A1A1', fontSize: '23rpx', lineHeight: '33rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</Text>
      </View>
      <View onClick={() => item.userId ? void Taro.navigateTo({ url: `/pages/heart/user?userId=${item.userId}` }) : void Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.profileUnavailable), icon: 'none' })} style={{ width: '138rpx', height: '58rpx', borderRadius: '29rpx', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>查看主页</Text></View>
    </View>
  )
}

function InteractionPostGroups({ groups }: { groups: Array<{ key: string; label: string; items: InteractionRecord[] }> }) {
  return (
    <View style={{ padding: '18rpx 26rpx 52rpx' }}>
      {groups.map((group, groupIndex) => (
        <View key={group.key} style={{ paddingTop: groupIndex ? '38rpx' : 0 }}>
          <Text className="qianxun-interaction-date-group" data-date-label={group.label} style={{ display: 'block', color: '#999999', fontSize: '25rpx', lineHeight: '36rpx', marginBottom: '28rpx' }}>{group.label}</Text>
          {group.items.map(item => item.post ? <InteractionPostCard key={item.id} post={item.post} /> : null)}
        </View>
      ))}
    </View>
  )
}

function InteractionPostCard({ post }: { post: CommunityPostVO }) {
  return (
    <View className="qianxun-interaction-post-card" onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` })} style={{ padding: '0 0 32rpx', marginBottom: '38rpx', borderBottom: '2rpx solid #F0F3F8' }}>
      <View style={{ display: 'flex', alignItems: 'center' }}>
        <Image src={normalizeAvatarUrl(post.authorAvatar, defaultAvatar)} mode="aspectFill" style={{ width: '72rpx', height: '72rpx', borderRadius: '36rpx' }} />
        <View style={{ marginLeft: '16rpx', flex: 1, minWidth: 0 }}>
          <View style={{ display: 'flex', alignItems: 'center' }}>
            <Text style={{ color: '#333333', fontSize: '27rpx', lineHeight: '36rpx', fontWeight: 600 }}>{post.authorName}</Text>
            <View style={{ marginLeft: '15rpx', display: 'flex', alignItems: 'center' }}><QianxunGenderIcon gender={post.authorGender} /></View>
          </View>
          <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '32rpx', marginTop: '4rpx' }}>{[post.authorCity, post.authorProfession].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <Text style={{ display: 'block', color: '#3D3D3D', fontSize: '27rpx', lineHeight: '42rpx', marginTop: '20rpx' }}>{post.content}</Text>
      {post.topicName ? <Text style={{ display: 'block', color: BLUE, fontSize: '23rpx', lineHeight: '34rpx', marginTop: '12rpx' }}># {post.topicName}</Text> : null}
      {post.imageUrls?.[0] ? <Image src={post.imageUrls[0]} mode="aspectFill" style={{ width: '100%', height: '448rpx', borderRadius: '10rpx', marginTop: '18rpx', background: '#F3F5F8' }} /> : null}
      <View style={{ marginTop: '20rpx', height: '34rpx', display: 'flex', alignItems: 'center' }}>
        <Text className="qianxun-interaction-card-date" style={{ color: '#A4A4A4', fontSize: '22rpx', lineHeight: '32rpx' }}>{formatInteractionCardDate(post.createTime)}</Text>
        <View style={{ flex: 1 }} />
        <QianxunActionStat kind="comment" count={post.commentCount} />
        <View style={{ width: '30rpx' }} />
        <QianxunActionStat kind="like" count={post.likeCount} active={post.liked} />
      </View>
    </View>
  )
}

function LoadingRows() {
  return (
    <View style={{ padding: '34rpx 28rpx' }}>
      {[0, 1, 2].map(index => <View key={index} style={{ height: '116rpx', display: 'flex', alignItems: 'center' }}><View style={{ width: '78rpx', height: '78rpx', borderRadius: '39rpx', background: '#EEF2F7' }} /><View style={{ marginLeft: '20rpx' }}><View style={{ width: '196rpx', height: '25rpx', borderRadius: '13rpx', background: '#EEF2F7' }} /><View style={{ width: '280rpx', height: '21rpx', borderRadius: '11rpx', background: '#F3F5F8', marginTop: '17rpx' }} /></View></View>)}
    </View>
  )
}

function RosterEmpty({ kind, config }: { kind: RosterKind; config?: CommunityConfig }) {
  return (
    <View style={{ paddingTop: '110rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Image src={miniappOssIcons.qianxunEmptyFollowing} mode="aspectFit" style={{ width: '330rpx', height: '230rpx' }} />
      <Text style={{ color: '#A3A3A3', fontSize: '28rpx', marginTop: '18rpx' }}>{resolveCommunityCopy(config, kind === 'following' ? COMMUNITY_COPY_KEYS.emptyFollowingRelations : COMMUNITY_COPY_KEYS.emptyFollowerRelations)}</Text>
    </View>
  )
}

function InteractorEmpty({ type, config }: { type: 'liked' | 'commented'; config?: CommunityConfig }) {
  return <View style={{ paddingTop: '150rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Image src={type === 'liked' ? miniappOssIcons.qianxunEmptyHeart : miniappOssIcons.qianxunEmptyMessage} mode="aspectFit" style={{ width: '330rpx', height: '230rpx' }} /><Text style={{ color: '#A3A3A3', fontSize: '28rpx', marginTop: '18rpx' }}>{resolveCommunityCopy(config, type === 'liked' ? COMMUNITY_COPY_KEYS.emptyPostLikes : COMMUNITY_COPY_KEYS.emptyPostComments)}</Text></View>
}

function RosterList({ users, onChanged, config }: { users: CommunityRelationUserVO[]; onChanged: () => void; config?: CommunityConfig }) {
  const changeFollow = async (user: CommunityRelationUserVO) => {
    if (user.userId === useAuthStore.getState().userId) {
      await Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.cannotFollowSelf), icon: 'none' })
      return
    }
    if (user.following) {
      const confirmed = await Taro.showModal({
        title: '温馨提示',
        content: '确定取消关注吗？',
        cancelText: '取消',
        confirmText: '确定',
        confirmColor: BLUE,
      })
      if (!confirmed.confirm) return
    }
    try {
      await toggleCommunityFollow(user.userId)
      onChanged()
    } catch (error) {
      await showError(config, error)
    }
  }
  return <ScrollView scrollY style={{ height: 'calc(100vh - 260rpx)' }} showScrollbar={false}><View style={{ padding: '16rpx 28rpx 40rpx' }}>{users.map(user => <View key={user.userNo || user.userId} style={{ height: '126rpx', display: 'flex', alignItems: 'center' }}><Image onClick={() => void Taro.navigateTo({ url: `/pages/heart/user?userId=${user.userId}` })} src={normalizeAvatarUrl(user.avatar, defaultAvatar)} mode="aspectFill" style={{ width: '82rpx', height: '82rpx', borderRadius: '41rpx', background: '#EEF1F5' }} /><View onClick={() => void Taro.navigateTo({ url: `/pages/heart/user?userId=${user.userId}` })} style={{ marginLeft: '18rpx', minWidth: 0, flex: 1 }}><Text style={{ display: 'block', color: '#292929', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600 }}>{user.nickname}</Text><Text style={{ display: 'block', color: '#A1A1A1', fontSize: '23rpx', lineHeight: '33rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.description}</Text></View><View onClick={() => void changeFollow(user)} style={{ minWidth: '126rpx', height: '58rpx', borderRadius: '29rpx', padding: '0 18rpx', border: `1rpx solid ${user.following ? '#A8ADB5' : BLUE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}><Text style={{ color: user.following ? '#999999' : BLUE, fontSize: '24rpx' }}>{user.following ? '已关注' : '关注'}</Text></View></View>)}</View></ScrollView>
}

function LikeSummary({ count, nickname, onClose }: { count: number; nickname: string; onClose: () => void }) {
  return (
    <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,38,.34)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View onClick={event => event.stopPropagation()} style={{ width: '620rpx', borderRadius: '32rpx', background: '#FFFFFF', padding: '46rpx 50rpx 28rpx', boxSizing: 'border-box' }}>
        <View style={{ height: '126rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1, 2, 3, 4].map(index => <Image key={index} src={miniappOssIcons.qianxunLikeActive} mode="aspectFit" style={{ width: index === 2 ? '42rpx' : '32rpx', height: index === 2 ? '42rpx' : '32rpx', margin: index === 2 ? '0 10rpx' : '0 5rpx', marginTop: index % 2 ? '-20rpx' : '14rpx' }} />)}
        </View>
        <Text style={{ display: 'block', color: '#222222', fontSize: '30rpx', lineHeight: '44rpx', fontWeight: 600, textAlign: 'center' }}>“{nickname}”共获得{count}个赞</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '25rpx', lineHeight: '39rpx', textAlign: 'center', marginTop: '14rpx' }}>获赞数含动态、日常、诚意帖点赞，重复点赞仅累计一次</Text>
        <View onClick={onClose} style={{ height: '70rpx', borderRadius: '7rpx', background: BLUE, marginTop: '38rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '27rpx' }}>我知道了</Text></View>
      </View>
    </View>
  )
}

function toMyPostSnapshot(post: CommunityPostVO): MyPostSnapshot {
  return {
    id: post.postNo || String(post.id),
    postId: post.id,
    status: post.status || 'published',
    statusName: post.statusName,
    content: post.content,
    imageUrls: post.imageUrls || [],
    topicName: post.topicName,
    createdAt: post.createTime,
    commentCount: readNonNegativeNumber(post.commentCount),
    likeCount: readNonNegativeNumber(post.likeCount),
  }
}

function buildProfileDescription(source: Record<string, unknown>, config?: CommunityConfig) {
  const birthYear = source.birthYear || (typeof source.birthday === 'string' ? source.birthday.slice(0, 4) : '')
  return [birthYear ? `${birthYear}年` : '', source.locationCityName || source.locationCity, source.occupationLabel || source.occupation].filter(Boolean).join(' · ') || resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.profilePendingDescription)
}

function readNonNegativeNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

function splitMyPostDate(value: string) {
  const match = String(value || '').match(/\d{4}-(\d{2})-(\d{2})/)
  if (!match) return { day: '--', month: '' }
  return { day: String(Number(match[2])), month: `${Number(match[1])}月` }
}

async function showError(config: CommunityConfig | undefined, error: unknown) {
  const title = resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.genericError, error)
  await Taro.showToast({ title, icon: 'none' })
}
