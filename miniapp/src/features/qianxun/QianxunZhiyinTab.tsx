import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow, useShareAppMessage } from '@tarojs/taro'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import { QianxunActionStat, QianxunGenderIcon } from '@/components/QianxunCommunityIcons'
import UnverifiedCertificationModal from '@/components/UnverifiedCertificationModal'
import { miniappOssIcons } from '@/constants/ossIcons'
import { navigateToPendingVerification } from '@/features/verification/navigateToVerification'
import { resolveStableWhisperTargetUserNo } from '@/domain/whisperRuntime'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import {
  COMMUNITY_COPY_KEYS,
  getCommunityMeta,
  getSincerePosts,
  getYuemuUsers,
  hideCommunityAuthor,
  reportCommunityPost,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  toggleCommunityFollow,
  toggleCommunityLike,
  toggleYuemuLike,
  unhideCommunityAuthor,
  type CommunityConfig,
  type CommunityPostVO,
  type YuemuUserVO,
} from '@/services/community'
import { usePrd01Store } from '@/stores/prd01Store'
import { QIANXUN_BLUE } from './QianxunHeader'
import './QianxunZhiyinTab.scss'

type ZhiyinTab = 'YUEMU' | 'SINCERE'
type Sheet = 'actions' | 'report' | 'uncertified' | null

interface QianxunZhiyinTabProps {
  secondaryTop: number
  contentTop: number
}

export default function QianxunZhiyinTab({ secondaryTop, contentTop }: QianxunZhiyinTabProps) {
  const [activeTab, setActiveTab] = useState<ZhiyinTab>('YUEMU')
  const [users, setUsers] = useState<YuemuUserVO[]>()
  const [sincerePosts, setSincerePosts] = useState<CommunityPostVO[]>()
  const [loading, setLoading] = useState<Partial<Record<ZhiyinTab, boolean>>>({ YUEMU: true })
  const [error, setError] = useState<Partial<Record<ZhiyinTab, string>>>({})
  const [config, setConfig] = useState<CommunityConfig>()
  const [selectedPost, setSelectedPost] = useState<CommunityPostVO>()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [likingUserIds, setLikingUserIds] = useState<number[]>([])
  const resumedRef = useRef(false)
  const access = useAccessStatus('canBrowseCards')
  const optionLabel = usePrd01Store(state => state.optionLabel)
  useShareAppMessage(() => ({
    title: selectedPost?.content ? selectedPost.content.slice(0, 28) : '千寻诚意贴',
    path: selectedPost?.id ? `/pages/qianxun/post-detail?id=${selectedPost.id}` : '/pages/index/index',
  }))

  const loadYuemu = async () => {
    setLoading(state => ({ ...state, YUEMU: true }))
    setError(state => ({ ...state, YUEMU: '' }))
    try {
      const page = await getYuemuUsers(1, 30)
      setUsers(page.records || [])
    } catch (loadError) {
      setError(state => ({ ...state, YUEMU: resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.loadFailed, loadError) }))
      setUsers([])
    } finally {
      setLoading(state => ({ ...state, YUEMU: false }))
    }
  }

  const loadSincere = async () => {
    setLoading(state => ({ ...state, SINCERE: true }))
    setError(state => ({ ...state, SINCERE: '' }))
    try {
      const page = await getSincerePosts(1, 20)
      setSincerePosts(page.records || [])
    } catch (loadError) {
      setError(state => ({ ...state, SINCERE: resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.loadFailed, loadError) }))
      setSincerePosts([])
    } finally {
      setLoading(state => ({ ...state, SINCERE: false }))
    }
  }

  const refreshActive = () => activeTab === 'YUEMU' ? loadYuemu() : loadSincere()

  useEffect(() => {
    void getCommunityMeta().then(setConfig).catch(() => undefined)
    void loadYuemu()
  }, [])

  useDidHide(() => {
    resumedRef.current = true
  })

  useDidShow(() => {
    if (!resumedRef.current) return
    resumedRef.current = false
    void refreshActive()
  })

  const changeTab = (tab: ZhiyinTab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    if (tab === 'YUEMU' && users === undefined) void loadYuemu()
    if (tab === 'SINCERE' && sincerePosts === undefined) void loadSincere()
  }

  const requireInteraction = () => {
    if (access.status?.coreAccessStatus === 'CORE_ALLOWED') return true
    setSheet('uncertified')
    return false
  }

  const likeUser = async (user: YuemuUserVO) => {
    if (!requireInteraction()) return
    if (likingUserIds.includes(user.userId)) return
    setLikingUserIds(items => [...items, user.userId])
    try {
      const result = await toggleYuemuLike(user.userId)
      setUsers(items => items?.map(item => item.userId === user.userId ? { ...item, liked: result.liked } : item))
      await Taro.showToast({ title: result.liked ? '已心动' : '已取消心动', icon: 'none', duration: 1200 })
    } catch (likeError) {
      await showError(config, likeError)
    } finally {
      setLikingUserIds(items => items.filter(id => id !== user.userId))
    }
  }

  const followPostAuthor = async (post: CommunityPostVO) => {
    if (!requireInteraction()) return
    try {
      const result = await toggleCommunityFollow(post.authorId)
      setSincerePosts(items => items?.map(item => item.authorId === post.authorId ? { ...item, followingAuthor: result.following } : item))
      setSheet(null)
    } catch (followError) {
      await showError(config, followError)
    }
  }

  const likePost = async (post: CommunityPostVO) => {
    if (!requireInteraction()) return
    try {
      const result = await toggleCommunityLike(post.id)
      setSincerePosts(items => items?.map(item => item.id === post.id ? { ...item, liked: result.liked, likeCount: result.likeCount } : item))
    } catch (likeError) {
      await showError(config, likeError)
    }
  }

  const toggleSelectedAuthorPreference = async () => {
    if (!selectedPost) return
    try {
      const result = selectedPost.hiddenAuthor
        ? await unhideCommunityAuthor(selectedPost.authorUserNo || selectedPost.authorId)
        : await hideCommunityAuthor(selectedPost.authorUserNo || selectedPost.authorId)
      setSincerePosts(items => items?.map(item => item.authorId === selectedPost.authorId ? { ...item, hiddenAuthor: result.hidden } : item))
      setSelectedPost(current => current ? { ...current, hiddenAuthor: result.hidden } : current)
      setSheet(null)
      if (result.message) await Taro.showToast({ title: result.message, icon: 'none' })
    } catch (hideError) {
      await showError(config, hideError)
    }
  }

  const reportSelectedPost = async (reasonCode: string) => {
    if (!selectedPost) return
    try {
      const result = await reportCommunityPost(selectedPost.postNo || selectedPost.id, reasonCode)
      setSheet(null)
      await Taro.showToast({ title: resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.reportSubmitted, result), icon: 'none' })
    } catch (reportError) {
      await showError(config, reportError)
    }
  }

  const openContact = (post: CommunityPostVO) => {
    if (!requireInteraction()) return
    const targetUserNo = resolveStableWhisperTargetUserNo(post.authorUserNo, post.authorId)
    if (!targetUserNo || !post.postNo) {
      void Taro.showToast({ title: '当前动态暂时无法申请认识', icon: 'none' })
      return
    }
    const query = [
      `receiverUserNo=${encodeURIComponent(targetUserNo)}`,
      `sourceScene=community_post`,
      `sourceBizNo=${encodeURIComponent(post.postNo)}`,
      `nickname=${encodeURIComponent(post.authorName || resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.profileUnknownUser))}`,
      `avatar=${encodeURIComponent(post.authorAvatar || '')}`,
      `meta=${encodeURIComponent(formatPostAuthorMeta(post, optionLabel))}`,
      'compose=1',
    ].join('&')
    void Taro.navigateTo({ url: `/pages/message/whisper-detail?${query}` })
  }

  return (
    <>
      <ZhiyinTabs active={activeTab} top={secondaryTop} onChange={changeTab} />
      <ScrollView scrollY style={{ position: 'absolute', left: 0, right: 0, top: `${contentTop}rpx`, bottom: '146rpx' }} showScrollbar={false}>
        {activeTab === 'YUEMU' ? (
          <YuemuContent users={users} loading={Boolean(loading.YUEMU)} error={error.YUEMU} config={config} likingUserIds={likingUserIds} onRetry={() => void loadYuemu()} onOpen={user => void Taro.navigateTo({ url: `/pages/heart/user?userId=${user.userId}` })} onLike={user => void likeUser(user)} />
        ) : (
          <SincereContent
            posts={sincerePosts}
            loading={Boolean(loading.SINCERE)}
            error={error.SINCERE}
            config={config}
            optionLabel={optionLabel}
            onRetry={() => void loadSincere()}
            onAuthor={post => void Taro.navigateTo({ url: `/pages/heart/user?userId=${post.authorId}` })}
            onOpen={post => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}` })}
            onTopic={post => post.topicId && void Taro.navigateTo({ url: `/pages/qianxun/topic?topicId=${post.topicId}` })}
            onComment={post => void Taro.navigateTo({ url: `/pages/qianxun/post-detail?id=${post.id}&focus=comment` })}
            onContact={openContact}
            onFollow={post => void followPostAuthor(post)}
            onLike={post => void likePost(post)}
            onMore={post => { setSelectedPost(post); setSheet('actions') }}
          />
        )}
      </ScrollView>

      {activeTab === 'SINCERE' ? (
        <View id="qianxun-sincere-publish" onClick={() => requireInteraction() && void Taro.navigateTo({ url: '/pages/qianxun/compose?postType=sincere_post' })} style={{ position: 'fixed', right: '30rpx', bottom: '190rpx', width: '104rpx', height: '104rpx', borderRadius: '52rpx', background: QIANXUN_BLUE, boxShadow: '0 10rpx 28rpx rgba(40,118,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8 }}>
          <Text style={{ color: '#FFFFFF', fontSize: '56rpx', lineHeight: '60rpx', fontWeight: 300 }}>＋</Text>
        </View>
      ) : null}

      {sheet === 'actions' && selectedPost ? <SincereActionSheet post={selectedPost} onClose={() => setSheet(null)} onFollow={() => void followPostAuthor(selectedPost)} onHide={() => void toggleSelectedAuthorPreference()} onReport={() => {
        if (config?.reportReasons?.length) setSheet('report')
        else void Taro.showToast({ title: resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.reportReasonUnavailable), icon: 'none' })
      }} /> : null}
      {sheet === 'report' ? <ReportSheet reasons={config?.reportReasons || []} onClose={() => setSheet(null)} onReport={reason => void reportSelectedPost(reason)} /> : null}
      {sheet === 'uncertified' ? (
        <UnverifiedCertificationModal
          onClose={() => setSheet(null)}
          onConfirm={() => {
            setSheet(null)
            void navigateToPendingVerification()
          }}
          description="完成认证即可心动、评论和发布诚意贴"
        />
      ) : null}
    </>
  )
}

function ZhiyinTabs({ active, top, onChange }: { active: ZhiyinTab; top: number; onChange: (tab: ZhiyinTab) => void }) {
  const tabs: Array<{ id: string; tab: ZhiyinTab; label: string }> = [
    { id: 'qianxun-zhiyin-yuemu', tab: 'YUEMU', label: '悦目' },
    { id: 'qianxun-zhiyin-sincere', tab: 'SINCERE', label: '诚意贴' },
  ]
  return <View style={{ position: 'absolute', left: '25rpx', top: `${top}rpx`, height: '62rpx', display: 'flex', gap: '10rpx', zIndex: 2 }}>{tabs.map(item => {
    const selected = active === item.tab
    return <View key={item.tab} id={item.id} onClick={() => onChange(item.tab)} style={{ position: 'relative', width: item.tab === 'YUEMU' ? '108rpx' : '130rpx', height: '62rpx', borderRadius: '12rpx', background: selected ? 'linear-gradient(180deg, #51AEFF 0%, #2876FF 100%)' : '#E3F1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: selected ? '#FFFFFF' : '#8B96A8', fontSize: selected ? '28rpx' : '26rpx', lineHeight: '40rpx', fontWeight: selected ? 600 : 400 }}>{item.label}</Text>{selected ? <View style={{ position: 'absolute', left: '50%', bottom: '-10rpx', width: 0, height: 0, borderLeft: '10rpx solid transparent', borderRight: '10rpx solid transparent', borderTop: `12rpx solid ${QIANXUN_BLUE}`, transform: 'translateX(-50%)' }} /> : null}</View>
  })}</View>
}

function YuemuContent({ users, loading, error, config, likingUserIds, onRetry, onOpen, onLike }: { users?: YuemuUserVO[]; loading: boolean; error?: string; config?: CommunityConfig; likingUserIds: number[]; onRetry: () => void; onOpen: (user: YuemuUserVO) => void; onLike: (user: YuemuUserVO) => void }) {
  if (loading && users === undefined) return <YuemuLoading />
  if (error) return <EmptyState title={resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.loadFailed)} description={error} action="重新加载" onAction={onRetry} />
  if (!users?.length) return <EmptyState title={resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyYuemu)} description={resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptyYuemuDescription)} />
  return <View id="qianxun-yuemu-content" style={{ width: '750rpx', padding: '0 25rpx 130rpx', boxSizing: 'border-box' }}>
    <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '38rpx', marginBottom: '32rpx' }}>发现志同道合的朋友，即刻交流</Text>
    <View style={{ display: 'flex', flexWrap: 'wrap', columnGap: '20rpx', rowGap: '20rpx' }}>{users.map(user => <YuemuCard key={user.userId} user={user} liking={likingUserIds.includes(user.userId)} onOpen={() => onOpen(user)} onLike={() => onLike(user)} />)}</View>
  </View>
}

function YuemuCard({ user, liking, onOpen, onLike }: { user: YuemuUserVO; liking: boolean; onOpen: () => void; onLike: () => void }) {
  const [photoUnavailable, setPhotoUnavailable] = useState(false)
  return <View className="qianxun-yuemu-card" data-user-id={user.userId} onClick={onOpen} style={{ position: 'relative', width: '340rpx', height: '458rpx', borderRadius: '8rpx', overflow: 'hidden', background: '#E9EEF4' }}>
    <Image src={!photoUnavailable && user.photoUrl ? user.photoUrl : defaultAvatar} mode="aspectFill" onError={() => setPhotoUnavailable(true)} style={{ width: '340rpx', height: '458rpx' }} />
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '116rpx', background: 'linear-gradient(180deg, rgba(16,25,38,0) 0%, rgba(16,25,38,.62) 100%)' }} />
    <View style={{ position: 'absolute', left: '20rpx', top: '21rpx', maxWidth: '270rpx', height: '39rpx', borderRadius: '19rpx', background: 'rgba(255,255,255,.82)', padding: '0 19rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}><Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '34rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.fateLabel}</Text></View>
    <Text style={{ position: 'absolute', left: '20rpx', right: '94rpx', bottom: '49rpx', color: '#FFFFFF', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.educationSchool}</Text>
    <Text style={{ position: 'absolute', left: '20rpx', right: '94rpx', bottom: '20rpx', color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx' }}>{user.onlineText}</Text>
    <View className="qianxun-yuemu-like" id={`qianxun-yuemu-like-${user.userId}`} aria-label={user.liked ? '取消心动' : '心动'} onClick={event => { event.stopPropagation(); if (!liking) onLike() }} style={{ position: 'absolute', right: '20rpx', bottom: '26rpx', width: '54rpx', height: '54rpx', opacity: liking ? 0.72 : 1 }}><Image src={miniappOssIcons.qianxunYuemuHeart} mode="aspectFit" style={{ width: '54rpx', height: '54rpx', display: 'block' }} /></View>
  </View>
}

function SincereContent({ posts, loading, error, config, optionLabel, onRetry, onAuthor, onOpen, onTopic, onComment, onContact, onFollow, onLike, onMore }: { posts?: CommunityPostVO[]; loading: boolean; error?: string; config?: CommunityConfig; optionLabel: (type: string, code: string) => string; onRetry: () => void; onAuthor: (post: CommunityPostVO) => void; onOpen: (post: CommunityPostVO) => void; onTopic: (post: CommunityPostVO) => void; onComment: (post: CommunityPostVO) => void; onContact: (post: CommunityPostVO) => void; onFollow: (post: CommunityPostVO) => void; onLike: (post: CommunityPostVO) => void; onMore: (post: CommunityPostVO) => void }) {
  if (loading && posts === undefined) return <CardLoading />
  if (error) return <EmptyState title={resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.loadFailed)} description={error} action="重新加载" onAction={onRetry} />
  if (!posts?.length) return <EmptyState title={resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptySincere)} description={resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.emptySincereDescription)} />
  return <View id="qianxun-sincere-content" style={{ width: '750rpx', padding: '20rpx 25rpx 130rpx', boxSizing: 'border-box' }}>{posts.map(post => <SincereCard key={post.id} post={post} optionLabel={optionLabel} onAuthor={() => onAuthor(post)} onOpen={() => onOpen(post)} onTopic={() => onTopic(post)} onComment={() => onComment(post)} onContact={() => onContact(post)} onFollow={() => onFollow(post)} onLike={() => onLike(post)} onMore={() => onMore(post)} />)}</View>
}

function SincereCard({ post, optionLabel, onAuthor, onOpen, onTopic, onComment, onContact, onFollow, onLike, onMore }: { post: CommunityPostVO; optionLabel: (type: string, code: string) => string; onAuthor: () => void; onOpen: () => void; onTopic: () => void; onComment: () => void; onContact: () => void; onFollow: () => void; onLike: () => void; onMore: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = post.content.length > 78
  const meta = formatPostAuthorMeta(post, optionLabel)
  return <View className="qianxun-sincere-card" data-post-id={post.id} style={{ width: '700rpx', borderRadius: '18rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '28rpx 26rpx 0', boxSizing: 'border-box', overflow: 'hidden' }}>
    <View style={{ display: 'flex', alignItems: 'center' }}><Image onClick={onAuthor} src={post.authorAvatar || defaultAvatar} mode="aspectFill" style={{ width: '80rpx', height: '80rpx', borderRadius: '40rpx', background: '#EEF3F8', flexShrink: 0 }} /><View onClick={onAuthor} style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}><View style={{ display: 'flex', alignItems: 'center' }}><Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 500 }}>{post.authorName || '用户'}</Text><View style={{ marginLeft: '12rpx', display: 'flex' }}><QianxunGenderIcon gender={post.authorGender} /></View></View><Text style={{ display: 'block', color: QIANXUN_BLUE, fontSize: '24rpx', lineHeight: '33rpx', marginTop: '8rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</Text></View><View className="qianxun-sincere-follow" onClick={onFollow} style={{ width: '118rpx', height: '48rpx', borderRadius: '24rpx', border: `1rpx solid ${post.followingAuthor ? '#999999' : QIANXUN_BLUE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: post.followingAuthor ? '#999999' : QIANXUN_BLUE, fontSize: '24rpx' }}>{post.followingAuthor ? '已关注' : '+ 关注'}</Text></View><View onClick={onMore} style={{ width: '52rpx', height: '60rpx', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}><Text style={{ color: '#999999', fontSize: '38rpx' }}>⋮</Text></View></View>
    <View onClick={onOpen} style={{ position: 'relative', marginTop: '26rpx' }}><Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '48rpx', maxHeight: !expanded && canExpand ? '192rpx' : 'none', overflow: 'hidden' }}>{post.content}</Text>{!expanded && canExpand ? <View onClick={event => { event.stopPropagation(); setExpanded(true) }} style={{ position: 'absolute', right: 0, bottom: 0, height: '48rpx', paddingLeft: '18rpx', background: '#FFFFFF', display: 'flex', alignItems: 'center' }}><Text style={{ color: QIANXUN_BLUE, fontSize: '26rpx' }}>查看全部</Text></View> : null}<PostImages images={post.imageUrls || []} /></View>
    <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '37rpx', marginTop: '26rpx' }}>{post.activityText || `${relativeTime(post.createTime)}活跃`}</Text>
    {post.topicName ? <View onClick={onTopic} style={{ display: 'inline-flex', maxWidth: '300rpx', height: '48rpx', borderRadius: '24rpx', background: '#F4F5F7', padding: '0 18rpx', marginTop: '20rpx', alignItems: 'center' }}><Text style={{ color: '#666666', fontSize: '25rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Text style={{ color: QIANXUN_BLUE }}># </Text>{post.topicName}</Text></View> : null}
    <View style={{ height: '92rpx', borderTop: '2rpx solid #EFF4FC', marginTop: '28rpx', display: 'flex', alignItems: 'center' }}><View onClick={onContact} style={{ minWidth: '176rpx', height: '88rpx', display: 'flex', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunWhisper} mode="aspectFit" style={{ width: '52rpx', height: '52rpx', marginRight: '10rpx' }} /><Text style={{ color: '#4E8EFF', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 500 }}>{post.contactAction === 'PRIVATE_MESSAGE' ? '私信' : '悄悄话'}</Text></View><View style={{ flex: 1 }} /><QianxunActionStat kind="comment" count={post.commentCount || 0} onClick={onComment} fontSize="26rpx" /><QianxunActionStat kind="like" count={post.likeCount || 0} active={post.liked} onClick={onLike} fontSize="26rpx" /></View>
  </View>
}

function PostImages({ images }: { images: string[] }) {
  const visible = images.slice(0, 4)
  if (!visible.length) return null
  return <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginTop: '28rpx' }}>{visible.map((url, index) => <Image key={`${url}-${index}`} src={url} mode="aspectFill" style={{ width: visible.length === 1 ? '648rpx' : '318rpx', height: visible.length === 1 ? '420rpx' : '348rpx', borderRadius: '8rpx', background: '#EEF2F7' }} />)}</View>
}

function YuemuLoading() {
  return <View style={{ padding: '38rpx 25rpx', display: 'flex', flexWrap: 'wrap', gap: '20rpx' }}>{[0, 1, 2, 3].map(index => <View key={index} style={{ width: '340rpx', height: '458rpx', borderRadius: '8rpx', background: 'rgba(255,255,255,.72)' }} />)}</View>
}

function CardLoading() {
  return <View style={{ padding: '20rpx 25rpx' }}>{[0, 1].map(index => <View key={index} style={{ width: '700rpx', height: '520rpx', borderRadius: '18rpx', background: 'rgba(255,255,255,.72)', marginBottom: '20rpx' }} />)}</View>
}

function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <View id="qianxun-zhiyin-empty-state" style={{ paddingTop: '120rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Image src={miniappOssIcons.qianxunEmptyHeart} mode="aspectFit" style={{ width: '292rpx', height: '224rpx' }} /><Text style={{ color: '#999999', fontSize: '28rpx', marginTop: '24rpx' }}>{title}</Text><Text style={{ color: '#A7A7A7', fontSize: '24rpx', marginTop: '16rpx' }}>{description}</Text>{action && onAction ? <View onClick={onAction} style={{ width: '300rpx', height: '82rpx', borderRadius: '12rpx', background: QIANXUN_BLUE, marginTop: '38rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '27rpx' }}>{action}</Text></View> : null}</View>
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <View onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,20,43,0.46)', zIndex: 10000 }}>{children}</View>
}

function SincereActionSheet({ post, onClose, onFollow, onHide, onReport }: { post: CommunityPostVO; onClose: () => void; onFollow: () => void; onHide: () => void; onReport: () => void }) {
  const actions = [{ label: post.followingAuthor ? '取消关注' : '关注', onClick: onFollow }, { label: post.hiddenAuthor ? '取消不看 TA 动态' : '不看 TA 动态', onClick: onHide }, { label: '举报', onClick: onReport }]
  return <Overlay onClose={onClose}><View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', padding: '24rpx 24rpx calc(28rpx + env(safe-area-inset-bottom))' }}><Button openType="share" className="qianxun-sincere-share-button">分享</Button>{actions.map(action => <View key={action.label} onClick={action.onClick} style={{ height: '94rpx', borderBottom: '1rpx solid #F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#333333', fontSize: '28rpx' }}>{action.label}</Text></View>)}<View onClick={onClose} style={{ height: '86rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#777F8B', fontSize: '28rpx' }}>取消</Text></View></View></Overlay>
}

function ReportSheet({ reasons, onClose, onReport }: { reasons: Array<{ code: string; label: string }>; onClose: () => void; onReport: (code: string) => void }) {
  return <Overlay onClose={onClose}><View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '1080rpx', borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF', padding: '28rpx 30rpx calc(26rpx + env(safe-area-inset-bottom))' }}><ScrollView scrollY style={{ maxHeight: '850rpx' }}>{reasons.map(reason => <View key={reason.code} onClick={() => onReport(reason.code)} style={{ height: '82rpx', borderBottom: '1rpx solid #F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#333333', fontSize: '27rpx' }}>{reason.label}</Text></View>)}</ScrollView><View onClick={onClose} style={{ height: '82rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#777F8B', fontSize: '28rpx' }}>取消</Text></View></View></Overlay>
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

function formatPostAuthorMeta(post: CommunityPostVO, optionLabel: (type: string, code: string) => string) {
  return [
    post.authorBirthYear ? `${String(post.authorBirthYear).slice(-2)}年` : post.authorAge ? `${post.authorAge}岁` : '',
    post.authorCity ? optionLabel('location', post.authorCity) || post.authorCity : '',
    post.authorProfession || post.authorZodiac || '',
  ].filter(Boolean).join('·') || '资料待完善'
}

async function showError(config: CommunityConfig | undefined, error: unknown) {
  const title = resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.genericError, error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
