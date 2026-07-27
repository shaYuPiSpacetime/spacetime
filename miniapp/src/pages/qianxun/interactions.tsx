import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import { normalizeAvatarUrl } from '@/utils/avatar'
import { prd01Api } from '@/services/prd01'
import { getFollowingCount, type CommunityPostVO } from '@/services/community'
import { useAuthStore } from '@/stores/authStore'
import defaultAvatar from '@/assets/profile/default-avatar.webp'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
const INTERACTION_STORAGE_KEY = 'qianxun_interaction_history'
const BROWSING_STORAGE_KEY = 'qianxun_browsing_history'
const MY_POST_RECEIPTS_KEY = 'qianxun_my_post_receipts'
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
}

interface MyPostSnapshot {
  id: string
  postId?: number
  status: 'publishing' | 'failed' | 'published'
  content: string
  imageUrls: string[]
  topicName?: string
  createdAt: string
  commentCount: number
  likeCount: number
}

const emptyProfile: ProfileSummary = {
  nickname: '待完善昵称',
  avatar: defaultAvatar,
  description: '完善资料，让更多人认识你',
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
  const [history, setHistory] = useState<CommunityPostVO[]>([])
  const [myPosts, setMyPosts] = useState<MyPostSnapshot[]>([])
  const [roster, setRoster] = useState<RosterKind | null>(null)
  const [likeSummaryVisible, setLikeSummaryVisible] = useState(false)

  useLoad(options => {
    if (['interaction', 'history', 'mine'].includes(String(options.section))) {
      setSection(options.section as MainSection)
    }
    if (['following', 'followers'].includes(String(options.roster))) {
      setRoster(options.roster as RosterKind)
    }
    if (options.likes === '1') setLikeSummaryVisible(true)
  })

  useDidShow(() => {
    void loadPage()
  })

  const loadPage = async () => {
    setLoading(true)
    try {
      const [home, followingCount] = await Promise.all([
        prd01Api.getHomeDetail(),
        getFollowingCount(),
      ])
      const auth = useAuthStore.getState()
      const source = home.profile || {}
      setProfile({
        nickname: String(source.nickname || auth.nickname || emptyProfile.nickname),
        avatar: normalizeAvatarUrl(String(source.avatar || auth.avatar || ''), defaultAvatar),
        description: buildProfileDescription(source),
        postCount: readNonNegativeNumber(source.postCount ?? source.dynamicCount),
        followingCount: readNonNegativeNumber(followingCount),
        followerCount: readNonNegativeNumber(source.followerCount ?? source.fansCount),
        receivedLikeCount: readNonNegativeNumber(source.beLikedCount ?? source.receivedLikeCount),
      })
    } catch (error) {
      await showError(error)
    } finally {
      setRecords(readInteractionRecords())
      setHistory(readBrowsingHistory())
      setMyPosts(readMyPostSnapshots())
      setLoading(false)
    }
  }

  const visibleRecords = useMemo(() => records.filter(item => item.kind === filter), [filter, records])

  const changeSection = (next: MainSection) => {
    setSection(next)
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
        <RosterEmpty kind={roster} />
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
      <View style={{ position: 'absolute', left: '25rpx', right: '25rpx', top: '544rpx', bottom: 0, borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', overflow: 'hidden' }}>
        <MainTabs active={section} onChange={changeSection} />
        <View id="qianxun-interactions-panel-interaction" data-section-panel="interaction" style={sectionPanelStyle(section === 'interaction')}>
          <FilterTabs active={filter} onChange={setFilter} />
          <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: '80rpx', bottom: 0 }} showScrollbar={false}>
            {loading ? <LoadingRows /> : visibleRecords.length ? (
              <View style={{ padding: '20rpx 26rpx 40rpx' }}>
                {visibleRecords.map(item => <InteractionRow key={item.id} item={item} />)}
              </View>
            ) : <InteractionEmpty filter={filter} />}
          </ScrollView>
        </View>
        <View id="qianxun-interactions-panel-history" data-section-panel="history" style={sectionPanelStyle(section === 'history')}>
          <ScrollView scrollY style={{ height: '100%' }} showScrollbar={false}>
            {loading ? <LoadingRows /> : history.length ? (
              <View style={{ padding: '18rpx 26rpx 44rpx' }}>
                {history.map(item => <HistoryCard key={item.id} post={item} />)}
              </View>
            ) : <HistoryEmpty />}
          </ScrollView>
        </View>
        <View id="qianxun-interactions-panel-mine" data-section-panel="mine" style={sectionPanelStyle(section === 'mine')}>
          <MinePanel loading={loading} posts={myPosts} />
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
    <View style={{ height: '544rpx', position: 'relative' }}>
      <SimpleHeader title="千寻互动" onBack={() => void Taro.navigateBack()} transparent />
      <View style={{ position: 'absolute', left: '33rpx', top: '294rpx', right: '30rpx', height: '100rpx', display: 'flex', alignItems: 'center' }}>
        <Image src={profile.avatar} mode="aspectFill" style={{ width: '80rpx', height: '80rpx', borderRadius: '40rpx', border: '5rpx solid #FFFFFF', boxSizing: 'border-box', background: '#EDF1F6' }} />
        <View style={{ marginLeft: '20rpx', minWidth: 0 }}>
          <Text style={{ display: 'block', color: '#222222', fontSize: '31rpx', lineHeight: '44rpx', fontWeight: 600 }}>{profile.nickname}</Text>
          <Text style={{ display: 'block', color: '#999999', fontSize: '23rpx', lineHeight: '34rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.description}</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', left: '28rpx', top: '442rpx', width: '510rpx', height: '62rpx', display: 'flex', alignItems: 'center' }}>
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

function MinePanel({ loading, posts }: { loading: boolean; posts: MyPostSnapshot[] }) {
  return (
    <ScrollView scrollY style={{ height: '100%' }} showScrollbar={false}>
      <View style={{ padding: '6rpx 26rpx 54rpx' }}>
        <View style={{ position: 'relative', height: '184rpx', borderRadius: '12rpx', background: '#F7F8FA', overflow: 'hidden' }}>
          <Text style={{ position: 'absolute', left: '36rpx', top: '38rpx', color: '#999999', fontSize: '27rpx', lineHeight: '40rpx' }}>记录美好生活 遇上另一半</Text>
          <View onClick={() => void Taro.navigateTo({ url: '/pages/qianxun/compose' })} style={{ position: 'absolute', left: '36rpx', top: '100rpx', width: '130rpx', height: '50rpx', borderRadius: '7rpx', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '25rpx', fontWeight: 500 }}>发动态</Text></View>
          <Image src={miniappOssIcons.qianxunEmptyChart} mode="aspectFit" style={{ position: 'absolute', right: '20rpx', top: '22rpx', width: '205rpx', height: '142rpx' }} />
        </View>
        {loading ? <LoadingRows /> : posts.length ? posts.map(item => <MyPostSnapshotCard key={item.id} item={item} />) : <MineEmpty />}
      </View>
    </ScrollView>
  )
}

function MyPostSnapshotCard({ item }: { item: MyPostSnapshot }) {
  const open = () => {
    if (item.postId && item.status === 'published') {
      void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${item.postId}` })
    } else if (item.status === 'failed') {
      void Taro.showToast({ title: '发布失败，可前往管理页查看原因', icon: 'none' })
    }
  }
  return (
    <View onClick={open} style={{ padding: '30rpx 0 24rpx', borderBottom: '2rpx solid #EEF3F8' }}>
      <View style={{ display: 'flex', alignItems: 'flex-start' }}>
        <Text style={{ width: '112rpx', color: '#8F8F8F', fontSize: '23rpx', lineHeight: '40rpx', flexShrink: 0 }}>{formatDate(item.createdAt)}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ display: 'block', color: '#333333', fontSize: '27rpx', lineHeight: '42rpx' }}>{item.content}</Text>
          {item.imageUrls[0] ? <Image src={item.imageUrls[0]} mode="aspectFill" style={{ width: '260rpx', height: '190rpx', borderRadius: '9rpx', background: '#F1F3F6', marginTop: '16rpx' }} /> : null}
          {item.topicName ? <Text style={{ display: 'block', color: BLUE, fontSize: '22rpx', marginTop: '14rpx' }}># {item.topicName}</Text> : null}
          <View style={{ marginTop: '16rpx', display: 'flex', alignItems: 'center' }}>
            {item.status !== 'published' ? <Text style={{ color: item.status === 'failed' ? '#D44747' : BLUE, fontSize: '21rpx' }}>{item.status === 'failed' ? '发布失败' : '发布中'}</Text> : null}
            <View style={{ flex: 1 }} />
            <Text style={{ color: '#999999', fontSize: '21rpx' }}>◯ {item.commentCount}</Text>
            <Text style={{ color: '#FF6C79', fontSize: '21rpx', marginLeft: '24rpx' }}>♥ {item.likeCount}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function MineEmpty() {
  return <View style={{ paddingTop: '82rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunEmptyChart} mode="aspectFit" style={{ width: '300rpx', height: '204rpx' }} /><Text style={{ color: '#A3A3A3', fontSize: '27rpx', marginTop: '14rpx' }}>还没有发布动态</Text></View>
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
        return <View key={item.key} onClick={() => onChange(item.key)} style={{ height: '56rpx', borderRadius: '28rpx', padding: '0 22rpx', marginRight: '12rpx', background: selected ? BLUE : '#F5F6F8', display: 'flex', alignItems: 'center' }}><Text style={{ color: selected ? '#FFFFFF' : '#AAAAAA', fontSize: '24rpx' }}>{item.label}</Text></View>
      })}
    </View>
  )
}

function InteractionEmpty({ filter }: { filter: InteractionFilter }) {
  const model = filter === 'commented'
    ? { image: miniappOssIcons.qianxunEmptyMessage, title: '还没有评论', subtitle: '去「千寻同城」看看，发现精彩动态' }
    : filter === 'liked'
      ? { image: miniappOssIcons.qianxunEmptyHeart, title: '还没有点赞过', subtitle: '去「千寻同城」看看，发现精彩动态' }
      : { image: miniappOssIcons.qianxunEmptyFollowing, title: '还没有解锁过', subtitle: '去「千寻同城」看看，发现精彩动态' }
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

function HistoryEmpty() {
  return (
    <View style={{ paddingTop: '162rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Image src={miniappOssIcons.qianxunEmptyMessage} mode="aspectFit" style={{ width: '330rpx', height: '230rpx' }} />
      <Text style={{ color: '#A3A3A3', fontSize: '28rpx', marginTop: '14rpx' }}>还没有浏览记录</Text>
      <View onClick={openQianxunCity} style={{ width: '472rpx', height: '82rpx', borderRadius: '7rpx', background: BLUE, marginTop: '54rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '28rpx' }}>去千寻同城看看</Text></View>
    </View>
  )
}

function openQianxunCity() {
  Taro.setStorageSync(REQUESTED_SCENE_KEY, 'CITY')
  void Taro.switchTab({ url: '/pages/index/index' })
}

function InteractionRow({ item }: { item: InteractionRecord }) {
  return (
    <View style={{ height: '124rpx', display: 'flex', alignItems: 'center' }}>
      <Image src={normalizeAvatarUrl(item.avatar, defaultAvatar)} mode="aspectFill" style={{ width: '82rpx', height: '82rpx', borderRadius: '41rpx', background: '#EEF1F5' }} />
      <View style={{ marginLeft: '18rpx', minWidth: 0, flex: 1 }}>
        <Text style={{ display: 'block', color: '#292929', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600 }}>{item.nickname}</Text>
        <Text style={{ display: 'block', color: '#A1A1A1', fontSize: '23rpx', lineHeight: '33rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</Text>
      </View>
      <View onClick={() => item.userId ? void Taro.navigateTo({ url: `/pages/heart/user?userId=${item.userId}` }) : void Taro.showToast({ title: '暂无可查看的主页', icon: 'none' })} style={{ width: '138rpx', height: '58rpx', borderRadius: '29rpx', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>查看主页</Text></View>
    </View>
  )
}

function HistoryCard({ post }: { post: CommunityPostVO }) {
  return (
    <View onClick={() => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` })} style={{ padding: '22rpx 0 28rpx', borderBottom: '2rpx solid #F0F3F8' }}>
      <View style={{ display: 'flex', alignItems: 'center' }}>
        <Image src={normalizeAvatarUrl(post.authorAvatar, defaultAvatar)} mode="aspectFill" style={{ width: '72rpx', height: '72rpx', borderRadius: '36rpx' }} />
        <View style={{ marginLeft: '16rpx', flex: 1, minWidth: 0 }}><Text style={{ display: 'block', color: '#333333', fontSize: '27rpx', fontWeight: 600 }}>{post.authorName}</Text><Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', marginTop: '5rpx' }}>{[post.authorCity, post.authorProfession].filter(Boolean).join(' · ')}</Text></View>
      </View>
      <Text style={{ display: 'block', color: '#3D3D3D', fontSize: '27rpx', lineHeight: '42rpx', marginTop: '19rpx' }}>{post.content}</Text>
      {post.imageUrls?.[0] ? <Image src={post.imageUrls[0]} mode="aspectFill" style={{ width: '344rpx', height: '286rpx', borderRadius: '10rpx', marginTop: '17rpx', background: '#F3F5F8' }} /> : null}
      <View style={{ marginTop: '18rpx', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#A4A4A4', fontSize: '22rpx' }}>{formatDate(post.createTime)}</Text><View style={{ flex: 1 }} /><Text style={{ color: '#999999', fontSize: '22rpx' }}>◯ {post.commentCount}</Text><Text style={{ color: '#FF6C79', fontSize: '22rpx', marginLeft: '26rpx' }}>♥ {post.likeCount}</Text></View>
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

function RosterEmpty({ kind }: { kind: RosterKind }) {
  return (
    <View style={{ paddingTop: '110rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Image src={miniappOssIcons.qianxunEmptyFollowing} mode="aspectFit" style={{ width: '330rpx', height: '230rpx' }} />
      <Text style={{ color: '#A3A3A3', fontSize: '28rpx', marginTop: '18rpx' }}>{kind === 'following' ? '还没有关注' : '还没有收到关注'}</Text>
    </View>
  )
}

function LikeSummary({ count, nickname, onClose }: { count: number; nickname: string; onClose: () => void }) {
  return (
    <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,38,.34)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View onClick={event => event.stopPropagation()} style={{ width: '620rpx', borderRadius: '32rpx', background: '#FFFFFF', padding: '46rpx 50rpx 28rpx', boxSizing: 'border-box' }}>
        <View style={{ height: '126rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FF6776', fontSize: '82rpx' }}>♡</Text><Text style={{ color: '#FF6776', fontSize: '46rpx', marginLeft: '-8rpx', marginTop: '-54rpx' }}>♥</Text></View>
        <Text style={{ display: 'block', color: '#222222', fontSize: '30rpx', lineHeight: '44rpx', fontWeight: 600, textAlign: 'center' }}>“{nickname}”共获得{count}个赞</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '25rpx', lineHeight: '39rpx', textAlign: 'center', marginTop: '14rpx' }}>获赞数含动态、日常、诚意帖点赞，重复点赞仅累计一次</Text>
        <View onClick={onClose} style={{ height: '70rpx', borderRadius: '7rpx', background: BLUE, marginTop: '38rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '27rpx' }}>我知道了</Text></View>
      </View>
    </View>
  )
}

function readInteractionRecords(): InteractionRecord[] {
  const raw = Taro.getStorageSync(INTERACTION_STORAGE_KEY)
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const source = item as Partial<InteractionRecord>
    if (!['commented', 'liked', 'unlocked'].includes(String(source.kind))) return []
    return [{
      id: String(source.id || index),
      kind: source.kind as InteractionFilter,
      userId: readOptionalNumber(source.userId),
      nickname: String(source.nickname || '未命名用户'),
      avatar: String(source.avatar || ''),
      description: String(source.description || ''),
    }]
  })
}

function readBrowsingHistory(): CommunityPostVO[] {
  const raw = Taro.getStorageSync(BROWSING_STORAGE_KEY)
  if (!Array.isArray(raw)) return []
  return raw.filter(item => item && typeof item === 'object' && Number.isFinite(Number(item.id)) && typeof item.content === 'string') as CommunityPostVO[]
}

function readMyPostSnapshots(): MyPostSnapshot[] {
  const raw = Taro.getStorageSync(MY_POST_RECEIPTS_KEY)
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const source = item as Partial<MyPostSnapshot>
    if (typeof source.content !== 'string') return []
    const status = ['publishing', 'failed', 'published'].includes(String(source.status))
      ? source.status as MyPostSnapshot['status']
      : 'published'
    return [{
      id: String(source.id || index),
      postId: readOptionalNumber(source.postId),
      status,
      content: source.content,
      imageUrls: Array.isArray(source.imageUrls) ? source.imageUrls.filter(url => typeof url === 'string') : [],
      topicName: source.topicName ? String(source.topicName) : undefined,
      createdAt: String(source.createdAt || ''),
      commentCount: readNonNegativeNumber(source.commentCount),
      likeCount: readNonNegativeNumber(source.likeCount),
    }]
  })
}

function buildProfileDescription(source: Record<string, unknown>) {
  const birthYear = source.birthYear || (typeof source.birthday === 'string' ? source.birthday.slice(0, 4) : '')
  return [birthYear ? `${birthYear}年` : '', source.locationCityName || source.locationCity, source.occupationLabel || source.occupation].filter(Boolean).join(' · ') || emptyProfile.description
}

function readNonNegativeNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

function readOptionalNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function formatDate(value: string) {
  const match = String(value || '').match(/\d{4}-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}` : String(value || '')
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error || '加载失败，请稍后重试')
  await Taro.showToast({ title, icon: 'none' })
}
