import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import HeartMessageHeader, { getLanhuNavigationMetrics } from '@/components/HeartMessageHeader'
import personImage from '@/assets/lanhu/heart-message/heart-person.webp'
import blurredPersonImage from '@/assets/lanhu/heart-message/heart-person-blur.webp'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import AccessBlockedPage from '@/components/AccessBlockedPage'
import {
  ensureUnlockAttempt,
  formatRelationBadge,
  groupRecentVisitors,
  isIdentityVisible,
} from '@/domain/relationFeedbackFlow'
import { getApiErrorCode } from '@/services/request'
import {
  confirmRelationUnlock,
  getLikesMePage,
  getPendingMatchPopup,
  getRecentViewersPage,
  markLikesMeRead,
  markMatchPopupRead,
  quoteRelationUnlock,
  type LikesMeItemVO,
  type LikesMePageVO,
  type MatchPopupAction,
  type MatchPopupVO,
  type RecentViewerItemVO,
  type RecentViewersPageVO,
  type UnlockConfirmVO,
  type UnlockQuoteVO,
} from '@/services/relation'

type HeartTab = 'likes' | 'visitors'
type UnlockStage = 'closed' | 'confirm' | 'quote' | 'success'
type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
type RelationCard = LikesMeItemVO | RecentViewerItemVO
type UnlockAttempt = { quoteToken: string; requestId: string }

const background =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6) 100%)'

function createRequestId(prefix: string, bizNo: string): string {
  return `${prefix}-${bizNo}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function resolveState(records: unknown[]): LoadState {
  return records.length ? 'ready' : 'empty'
}

export default function CommunityPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<HeartTab>(router.params.tab === 'visitors' ? 'visitors' : 'likes')
  const [unlockStage, setUnlockStage] = useState<UnlockStage>('closed')
  const [likesPage, setLikesPage] = useState<LikesMePageVO | null>(null)
  const [visitorsPage, setVisitorsPage] = useState<RecentViewersPageVO | null>(null)
  const [likesRecords, setLikesRecords] = useState<LikesMeItemVO[]>([])
  const [visitorRecords, setVisitorRecords] = useState<RecentViewerItemVO[]>([])
  const [likesPageNo, setLikesPageNo] = useState(1)
  const [visitorsPageNo, setVisitorsPageNo] = useState(1)
  const [likesState, setLikesState] = useState<LoadState>('idle')
  const [visitorsState, setVisitorsState] = useState<LoadState>('idle')
  const [likesError, setLikesError] = useState('')
  const [visitorsError, setVisitorsError] = useState('')
  const [likesLoadingMore, setLikesLoadingMore] = useState(false)
  const [visitorsLoadingMore, setVisitorsLoadingMore] = useState(false)
  const [selectedCard, setSelectedCard] = useState<RelationCard | null>(null)
  const [unlockQuote, setUnlockQuote] = useState<UnlockQuoteVO | null>(null)
  const [unlockResult, setUnlockResult] = useState<UnlockConfirmVO | null>(null)
  const [unlockSubmitting, setUnlockSubmitting] = useState(false)
  const [matchPopup, setMatchPopup] = useState<MatchPopupVO | null>(null)
  const [matchSubmitting, setMatchSubmitting] = useState(false)
  const access = useAccessStatus('canCommunity')
  const snapshotCursorRef = useRef<string | undefined>(undefined)
  const acknowledgedCursorRef = useRef<string | null>(null)
  const unlockAttemptRef = useRef<UnlockAttempt | undefined>(undefined)
  const likesLoadingRef = useRef(false)
  const visitorsLoadingRef = useRef(false)

  const acknowledgeLikesAfterPaint = async (pageData: LikesMePageVO) => {
    const readCursor = pageData.readCursor
    if (!readCursor || pageData.newCount <= 0 || acknowledgedCursorRef.current === readCursor) return
    await new Promise<void>(resolve => Taro.nextTick(resolve))
    try {
      await markLikesMeRead(readCursor)
      acknowledgedCursorRef.current = readCursor
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '已读确认失败，请刷新重试', icon: 'none' })
    }
  }

  const loadLikes = async (page = 1) => {
    if (likesLoadingRef.current) return
    likesLoadingRef.current = true
    if (page === 1) {
      setLikesState('loading')
      setLikesError('')
      snapshotCursorRef.current = undefined
    } else {
      setLikesLoadingMore(true)
    }
    try {
      const pageData = await getLikesMePage(page, 20, page > 1 ? snapshotCursorRef.current : undefined)
      const nextRecords = page === 1 ? (pageData.records || []) : [...likesRecords, ...(pageData.records || [])]
      setLikesPage(pageData)
      setLikesPageNo(page)
      setLikesRecords(nextRecords)
      setLikesState(resolveState(nextRecords))
      if (page === 1) {
        snapshotCursorRef.current = pageData.readCursor || undefined
        await acknowledgeLikesAfterPaint(pageData)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '喜欢列表加载失败'
      setLikesError(message)
      setLikesState(likesRecords.length ? 'ready' : 'error')
      await Taro.showToast({ title: message, icon: 'none' })
    } finally {
      likesLoadingRef.current = false
      setLikesLoadingMore(false)
    }
  }

  const loadVisitors = async (page = 1) => {
    if (visitorsLoadingRef.current) return
    visitorsLoadingRef.current = true
    if (page === 1) {
      setVisitorsState('loading')
      setVisitorsError('')
    } else {
      setVisitorsLoadingMore(true)
    }
    try {
      const pageData = await getRecentViewersPage(page, 20)
      const nextRecords = page === 1 ? (pageData.records || []) : [...visitorRecords, ...(pageData.records || [])]
      setVisitorsPage(pageData)
      setVisitorsPageNo(page)
      setVisitorRecords(nextRecords)
      setVisitorsState(resolveState(nextRecords))
    } catch (error) {
      const message = error instanceof Error ? error.message : '访客列表加载失败'
      setVisitorsError(message)
      setVisitorsState(visitorRecords.length ? 'ready' : 'error')
      await Taro.showToast({ title: message, icon: 'none' })
    } finally {
      visitorsLoadingRef.current = false
      setVisitorsLoadingMore(false)
    }
  }

  useEffect(() => {
    if (access.allowed !== true) return
    void loadLikes(1)
    void loadVisitors(1)
    void getPendingMatchPopup()
      .then(data => setMatchPopup(data || null))
      .catch(error => Taro.showToast({ title: error instanceof Error ? error.message : '匹配提醒加载失败', icon: 'none' }))
  }, [access.allowed])

  const openLockedCard = (card: RelationCard) => {
    setSelectedCard(card)
    setUnlockQuote(null)
    setUnlockResult(null)
    unlockAttemptRef.current = undefined
    setUnlockStage('confirm')
  }

  const refreshActiveList = async () => {
    if (activeTab === 'likes') await loadLikes(1)
    else await loadVisitors(1)
  }

  const currentUnlockScene = activeTab === 'visitors' ? 'viewers_unlock_one' : 'likes_unlock_one'

  const goToRecharge = () => {
    setUnlockStage('closed')
    void Taro.navigateTo({ url: `/pages/coins/unlock-recharge?sourceScene=${currentUnlockScene}` })
  }

  const requestUnlockQuote = async () => {
    if (!selectedCard || unlockSubmitting) return
    setUnlockSubmitting(true)
    try {
      const isVisitor = activeTab === 'visitors'
      const quote = await quoteRelationUnlock(
        isVisitor ? 'viewers_unlock_one' : 'likes_unlock_one',
        isVisitor ? 'visit' : 'like',
        selectedCard.recordNo,
      )
      setUnlockQuote(quote)
      if (quote.alreadyUnlocked) {
        await refreshActiveList()
        setUnlockStage('success')
        return
      }
      if (!quote.quoteToken) throw new Error('报价已失效，请重试')
      unlockAttemptRef.current = ensureUnlockAttempt(
        undefined,
        quote.quoteToken,
        () => createRequestId('unlock', quote.targetBizNo),
      )
      setUnlockStage('quote')
    } catch (error) {
      if (getApiErrorCode(error) === 5001) {
        goToRecharge()
        return
      }
      await Taro.showToast({ title: error instanceof Error ? error.message : '获取报价失败', icon: 'none' })
    } finally {
      setUnlockSubmitting(false)
    }
  }

  const confirmUnlock = async () => {
    if (!unlockQuote?.quoteToken || unlockSubmitting) return
    const attempt = ensureUnlockAttempt(
      unlockAttemptRef.current,
      unlockQuote.quoteToken,
      () => createRequestId('unlock', unlockQuote.targetBizNo),
    )
    unlockAttemptRef.current = attempt
    setUnlockSubmitting(true)
    try {
      const result = await confirmRelationUnlock(attempt.quoteToken, attempt.requestId)
      setUnlockResult(result)
      await refreshActiveList()
      setUnlockStage('success')
    } catch (error) {
      if (getApiErrorCode(error) === 5001) {
        goToRecharge()
        return
      }
      await Taro.showToast({ title: error instanceof Error ? error.message : '解锁失败，请重试', icon: 'none' })
    } finally {
      setUnlockSubmitting(false)
    }
  }

  const handleCardClick = (card: RelationCard) => {
    if (isIdentityVisible(card.displayStatus) && card.userId) {
      const sourceScene = activeTab === 'likes' ? 'likes_me' : 'recent_viewers'
      void Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${card.userId}&sourceScene=${sourceScene}` })
      return
    }
    openLockedCard(card)
  }

  const handleMatchAction = async (action: MatchPopupAction) => {
    const popup = matchPopup
    if (!popup || matchSubmitting) return
    setMatchSubmitting(true)
    try {
      await markMatchPopupRead(popup.matchNo, action)
      setMatchPopup(null)
      if (action === 'profile') {
        await Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${popup.matchedUserId}&sourceScene=profile` })
      } else if (action === 'chat') {
        if (!popup.canEnterConversation) {
          await Taro.showToast({ title: '当前匹配暂不可聊天', icon: 'none' })
          return
        }
        await Taro.navigateTo({ url: `/pages/message/private-chat?conversationNo=${popup.matchNo}&targetUserId=${popup.matchedUserId}` })
      }
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '操作确认失败，请重试', icon: 'none' })
    } finally {
      setMatchSubmitting(false)
    }
  }

  if (access.allowed !== true) return <AccessBlockedPage {...access} />

  const showMembershipEntry = activeTab === 'likes'
    ? likesPage?.accessMode !== 'VIP_ALL_CLEAR'
    : visitorsPage?.accessMode !== 'VIP_ALL_CLEAR'

  return (
    <View id="relation-feedback-page" style={{ height: '100vh', overflow: 'hidden', background, fontFamily: 'PingFang SC, sans-serif' }}>
      <ScrollView scrollY style={{ width: '750rpx', height: '100vh' }} showScrollbar={false}>
        <View style={{ minHeight: '1624rpx', paddingBottom: showMembershipEntry ? '310rpx' : '180rpx', boxSizing: 'border-box' }}>
          <HeartTabsHeader
            active={activeTab}
            likesCount={likesPage?.newCount || 0}
            visitorsCount={visitorsPage?.todayVisitorUv || 0}
            onChange={setActiveTab}
          />
          {activeTab === 'likes'
            ? (
              <LikesPanel
                page={likesPage}
                records={likesRecords}
                state={likesState}
                error={likesError}
                loadingMore={likesLoadingMore}
                onCard={handleCardClick}
                onRetry={() => void loadLikes(1)}
                onLoadMore={() => likesPage?.hasMore && void loadLikes(likesPageNo + 1)}
              />
            )
            : (
              <VisitorsPanel
                page={visitorsPage}
                records={visitorRecords}
                state={visitorsState}
                error={visitorsError}
                loadingMore={visitorsLoadingMore}
                onCard={handleCardClick}
                onRetry={() => void loadVisitors(1)}
                onLoadMore={() => visitorsPage?.hasMore && void loadVisitors(visitorsPageNo + 1)}
              />
            )}
        </View>
      </ScrollView>

      {showMembershipEntry ? (
        <View
          id="relation-membership-entry"
          onClick={() => Taro.navigateTo({ url: '/pages/heart/membership-unlock' })}
          style={{ position: 'fixed', left: '25rpx', bottom: '184rpx', zIndex: 80, width: '700rpx', height: '98rpx', borderRadius: '49rpx', background: '#211F20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#EAD8B6', fontSize: '28rpx', fontWeight: 500 }}>开通会员查看全部</Text>
        </View>
      ) : null}

      {unlockStage !== 'closed' ? (
        <UnlockSheet
          stage={unlockStage}
          card={selectedCard}
          quote={unlockQuote}
          result={unlockResult}
          submitting={unlockSubmitting}
          sourceScene={activeTab === 'likes' ? 'likes_me' : 'recent_viewers'}
          onClose={() => !unlockSubmitting && setUnlockStage('closed')}
          onQuote={() => void requestUnlockQuote()}
          onConfirm={() => void confirmUnlock()}
        />
      ) : null}

      {matchPopup ? <MatchPopupSheet popup={matchPopup} submitting={matchSubmitting} onAction={action => void handleMatchAction(action)} /> : null}
    </View>
  )
}

function HeartTabsHeader({ active, likesCount, visitorsCount, onChange }: { active: HeartTab; likesCount: number; visitorsCount: number; onChange: (tab: HeartTab) => void }) {
  const { menuTop, menuHeight } = getLanhuNavigationMetrics()
  const top = menuTop + (menuHeight - 45) / 2
  return (
    <HeartMessageHeader rightIcon="folder" onRightIconClick={() => Taro.navigateTo({ url: '/pages/heart/mutual' })}>
      <View style={{ position: 'absolute', left: '24rpx', top: `${top}rpx`, height: '56rpx', display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
        <HeartTabButton label="对我心动" count={likesCount} active={active === 'likes'} onClick={() => onChange('likes')} />
        <View style={{ width: '36rpx' }} />
        <HeartTabButton label="访客" count={visitorsCount} active={active === 'visitors'} onClick={() => onChange('visitors')} />
      </View>
    </HeartMessageHeader>
  )
}

function HeartTabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  const width = label.length > 2 ? 128 : 80
  const badge = formatRelationBadge(count)
  return (
    <View onClick={onClick} style={{ position: 'relative', width: `${width}rpx`, height: '56rpx', display: 'flex', justifyContent: 'center' }}>
      {active ? <View style={{ position: 'absolute', left: 0, bottom: '3rpx', width: `${width}rpx`, height: '8rpx', borderRadius: '6rpx', background: 'rgba(40,118,255,0.8)' }} /> : null}
      <Text style={{ position: 'relative', zIndex: 1, color: active ? '#0C285A' : '#7F8494', fontSize: active ? '32rpx' : '28rpx', fontWeight: active ? 500 : 400, lineHeight: '45rpx', whiteSpace: 'nowrap' }}>{label}</Text>
      {badge ? (
        <View id={`relation-${label === '访客' ? 'visitors' : 'likes'}-badge`} style={{ position: 'absolute', right: '-8rpx', top: '-13rpx', minWidth: '28rpx', height: '28rpx', padding: '0 5rpx', borderRadius: '14rpx', background: '#EE2525', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '22rpx' }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  )
}

interface PanelCommonProps {
  state: LoadState
  error: string
  loadingMore: boolean
  onRetry: () => void
  onLoadMore: () => void
}

function LikesPanel({ page, records, state, error, loadingMore, onCard, onRetry, onLoadMore }: PanelCommonProps & { page: LikesMePageVO | null; records: LikesMeItemVO[]; onCard: (card: LikesMeItemVO) => void }) {
  if (state === 'loading' && !records.length) return <RelationStatePanel state="loading" message="正在加载喜欢你的人" />
  if (state === 'error' && !records.length) return <RelationStatePanel state="error" message={error || '喜欢列表加载失败'} onRetry={onRetry} />
  if (state === 'empty') return <RelationStatePanel state="empty" message="还没有人向你表达心动" onRetry={onRetry} />
  const previewAvatars = page?.newLikePreviewAvatars || []
  const newest = records.filter(item => item.groupKey === 'new')
  const earlier = records.filter(item => item.groupKey !== 'new')
  return (
    <View id="relation-likes-panel" style={{ width: '700rpx', margin: '0 auto' }}>
      <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 500 }}>{page?.newCount || 0} 个新喜欢</Text>
      {previewAvatars.length ? (
        <View style={{ width: '670rpx', minHeight: '134rpx', marginTop: '10rpx', display: 'flex', flexDirection: 'row' }}>
          {previewAvatars.slice(0, 5).map(item => (
            <Image key={item.recordNo} src={item.avatar || (isIdentityVisible(item.displayStatus) ? personImage : blurredPersonImage)} mode="aspectFill" style={{ width: '120rpx', height: '120rpx', margin: '7rpx', borderRadius: '50%', filter: isIdentityVisible(item.displayStatus) ? 'none' : 'blur(8rpx)' }} />
          ))}
        </View>
      ) : null}
      <Text style={{ display: 'block', marginTop: '16rpx', color: '#0C285A', fontSize: '28rpx', fontWeight: 500 }}>共有 {page?.total || 0} 人喜欢我</Text>
      {newest.length ? <RelationGroup title="新喜欢" kind="likes" records={newest} onCard={onCard} /> : null}
      {earlier.length ? <RelationGroup title="更早" kind="likes" records={earlier} onCard={onCard} /> : null}
      {error ? <InlineRetry message={error} onRetry={onRetry} /> : null}
      {page?.hasMore ? <LoadMoreButton loading={loadingMore} onClick={onLoadMore} /> : null}
    </View>
  )
}

function VisitorsPanel({ page, records, state, error, loadingMore, onCard, onRetry, onLoadMore }: PanelCommonProps & { page: RecentViewersPageVO | null; records: RecentViewerItemVO[]; onCard: (card: RecentViewerItemVO) => void }) {
  if (state === 'loading' && !records.length) return <RelationStatePanel state="loading" message="正在加载最近访客" />
  if (state === 'error' && !records.length) return <RelationStatePanel state="error" message={error || '访客列表加载失败'} onRetry={onRetry} />
  if (state === 'empty') return <RelationStatePanel state="empty" message="最近还没有人来访" onRetry={onRetry} />
  const groups = groupRecentVisitors(records) as Array<{ key: string; title: string; records: RecentViewerItemVO[] }>
  return (
    <View id="relation-visitors-panel" style={{ width: '700rpx', margin: '0 auto' }}>
      <View style={{ width: '700rpx', height: '130rpx', borderRadius: '12rpx', background: 'rgba(255,255,255,0.88)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        <VisitorMetric value={String(page?.totalPv || 0)} label="总浏览量" />
        <VisitorMetric value={String(page?.todayVisitorUv || 0)} label="今日访客" />
        <VisitorMetric value={String(page?.todayVisitPv || 0)} label="今日浏览量" />
      </View>
      {groups.map(group => <RelationGroup key={group.key} title={group.title} kind="visitors" records={group.records} onCard={onCard} />)}
      {error ? <InlineRetry message={error} onRetry={onRetry} /> : null}
      {page?.hasMore ? <LoadMoreButton loading={loadingMore} onClick={onLoadMore} /> : null}
    </View>
  )
}

function RelationStatePanel({ state, message, onRetry }: { state: 'loading' | 'empty' | 'error'; message: string; onRetry?: () => void }) {
  return (
    <View id={`relation-${state}-state`} style={{ width: '700rpx', minHeight: '520rpx', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#7F8494', fontSize: '26rpx' }}>{message}</Text>
      {onRetry ? <View onClick={onRetry} style={{ marginTop: '28rpx', padding: '18rpx 48rpx', borderRadius: '40rpx', background: '#2876FF' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>重新加载</Text></View> : null}
    </View>
  )
}

function InlineRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View onClick={onRetry} style={{ marginTop: '20rpx', display: 'flex', justifyContent: 'center' }}><Text style={{ color: '#E65A5A', fontSize: '22rpx' }}>{message}，点击重试</Text></View>
}

function RelationGroup<T extends RelationCard>({ title, kind, records, onCard }: { title: string; kind: 'likes' | 'visitors'; records: T[]; onCard: (card: T) => void }) {
  return (
    <View style={{ marginTop: '24rpx' }}>
      <View style={{ display: 'flex', alignItems: 'center' }}><View style={{ width: '8rpx', height: '28rpx', marginRight: '10rpx', borderRadius: '5rpx', background: '#2876FF' }} /><Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600 }}>{title}</Text></View>
      <HeartGrid kind={kind} records={records} onCard={onCard} />
    </View>
  )
}

function VisitorMetric({ value, label }: { value: string; label: string }) {
  return <View style={{ width: '150rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Text style={{ color: '#0C285A', fontSize: '48rpx', fontWeight: 500 }}>{value}</Text><Text style={{ color: '#7F8494', fontSize: '26rpx', whiteSpace: 'nowrap' }}>{label}</Text></View>
}

function HeartGrid<T extends RelationCard>({ kind, records, onCard }: { kind: 'likes' | 'visitors'; records: T[]; onCard: (card: T) => void }) {
  return <View style={{ width: '700rpx', marginTop: '20rpx', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '18rpx 20rpx' }}>{records.map(record => <HeartPersonCard key={record.recordNo} record={record} kind={kind} onClick={() => onCard(record)} />)}</View>
}

function buildCardTitle(record: RelationCard, kind: 'likes' | 'visitors'): string {
  if (!isIdentityVisible(record.displayStatus)) return record.weakTags?.join('·') || record.identityLabel || record.annualIncomeLabel || (kind === 'likes' ? '同城心动' : '最近来访')
  return [record.nickname, record.age ? `${record.age}岁` : '', record.occupationLabel || record.identityLabel].filter(Boolean).join('·')
}

function HeartPersonCard({ record, kind, onClick }: { record: RelationCard; kind: 'likes' | 'visitors'; onClick: () => void }) {
  const clear = isIdentityVisible(record.displayStatus)
  return (
    <View id={`relation-card-${record.recordNo}`} onClick={onClick} style={{ position: 'relative', width: '340rpx', height: '378rpx', overflow: 'hidden', borderRadius: '8rpx', background: '#D8D8D8' }}>
      <Image src={record.avatar || (clear ? personImage : blurredPersonImage)} mode="aspectFill" style={{ width: '340rpx', height: '378rpx', filter: clear ? 'none' : 'blur(10rpx)' }} />
      <View style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 52%,rgba(0,0,0,0.48) 100%)' }} />
      {kind === 'likes' && 'isNew' in record && record.isNew ? <Text style={{ position: 'absolute', right: '16rpx', top: '16rpx', color: '#FFFFFF', fontSize: '22rpx', fontWeight: 600 }}>新</Text> : null}
      <View style={{ position: 'absolute', left: '14rpx', bottom: '18rpx' }}><Text style={{ display: 'block', color: '#FFFFFF', fontSize: '20rpx' }}>{record.onlineText || (kind === 'likes' ? '最近在线' : '刚刚来访')}</Text><Text style={{ display: 'block', marginTop: '4rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500 }}>{buildCardTitle(record, kind)}</Text></View>
    </View>
  )
}

function LoadMoreButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return <View id="relation-load-more" onClick={loading ? undefined : onClick} style={{ width: '260rpx', height: '64rpx', margin: '28rpx auto 0', borderRadius: '32rpx', background: 'rgba(255,255,255,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#2876FF', fontSize: '24rpx' }}>{loading ? '加载中...' : '加载更多'}</Text></View>
}

function UnlockSheet({ stage, card, quote, result, submitting, sourceScene, onClose, onQuote, onConfirm }: { stage: Exclude<UnlockStage, 'closed'>; card: RelationCard | null; quote: UnlockQuoteVO | null; result: UnlockConfirmVO | null; submitting: boolean; sourceScene: 'likes_me' | 'recent_viewers'; onClose: () => void; onQuote: () => void; onConfirm: () => void }) {
  const success = stage === 'success'
  const quoteReady = stage === 'quote'
  const title = success ? '解锁成功' : quoteReady ? '确认解锁 Ta' : '解锁 Ta 是谁'
  const subtitle = success ? '现在可以查看主页并继续互动' : quoteReady ? `本次消耗 ${quote?.unitPrice ?? 0} 千寻币，余额 ${quote?.coinBalance ?? 0}` : '先查看实时报价，确认后才会扣费'
  const shownName = success ? card?.nickname || `用户${result?.targetUserId || ''}` : card?.weakTags?.join('·') || '一位心动用户'
  return (
    <View id="relation-unlock-sheet" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.42)' }}>
      <View onClick={event => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: '166rpx', minHeight: '454rpx', overflow: 'hidden', borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF' }}>
        <View style={{ padding: '44rpx 28rpx 24rpx', background: success ? '#FFF3F3' : '#EAF4FF' }}><Text style={{ display: 'block', color: '#333333', fontSize: '32rpx', fontWeight: 600 }}>{title}</Text><Text style={{ display: 'block', marginTop: '8rpx', color: '#7F8494', fontSize: '24rpx' }}>{subtitle}</Text></View>
        <View style={{ height: '128rpx', margin: '10rpx 28rpx 0', padding: '0 20rpx', borderRadius: '12rpx', background: success ? '#FFFFFF' : '#E3F1FE', display: 'flex', alignItems: 'center' }}><Image src={success ? (card?.avatar || personImage) : blurredPersonImage} mode="aspectFill" style={{ width: '92rpx', height: '92rpx', borderRadius: '50%', filter: success ? 'none' : 'blur(8rpx)' }} /><Text style={{ marginLeft: '20rpx', color: '#333333', fontSize: '28rpx', fontWeight: 500 }}>{shownName}</Text></View>
        {success ? (
          <View onClick={() => card?.userId && Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${card.userId}&sourceScene=${sourceScene}` })} style={{ height: '98rpx', margin: '18rpx 28rpx 28rpx', borderRadius: '49rpx', background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#F06C83', fontSize: '28rpx' }}>查看主页</Text></View>
        ) : (
          <View style={{ margin: '18rpx 28rpx 28rpx', display: 'flex', gap: '20rpx' }}>
            <View id="unlock-one-button" onClick={submitting ? undefined : (quoteReady ? onConfirm : onQuote)} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#E3F1FE', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}><Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 500 }}>{submitting ? '处理中...' : quoteReady ? `确认解锁 ${quote?.unitPrice ?? 0} 千寻币` : '只看 Ta'}</Text></View>
            <View onClick={() => !submitting && Taro.navigateTo({ url: '/pages/heart/membership-unlock' })} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#211F20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#EAD8B6', fontSize: '28rpx' }}>开通会员</Text></View>
          </View>
        )}
      </View>
    </View>
  )
}

function MatchPopupSheet({ popup, submitting, onAction }: { popup: MatchPopupVO; submitting: boolean; onAction: (action: MatchPopupAction) => void }) {
  return (
    <View id="relation-match-popup" onClick={() => !submitting && onAction('close')} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View onClick={event => event.stopPropagation()} style={{ width: '620rpx', borderRadius: '32rpx', background: '#FFFFFF', padding: '42rpx 34rpx 34rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
        <Image src={popup.avatar || personImage} mode="aspectFill" style={{ width: '132rpx', height: '132rpx', borderRadius: '50%' }} />
        <Text style={{ marginTop: '24rpx', color: '#0C285A', fontSize: '34rpx', fontWeight: 700 }}>匹配成功</Text>
        <Text style={{ marginTop: '12rpx', color: '#7F8494', fontSize: '24rpx' }}>你和{popup.nickname}互相喜欢了</Text>
        <View style={{ width: '100%', marginTop: '34rpx', display: 'flex', gap: '18rpx', opacity: submitting ? 0.6 : 1 }}>
          <View id="match-profile-button" onClick={() => !submitting && onAction('profile')} style={{ flex: 1, height: '82rpx', borderRadius: '41rpx', background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#F06C83', fontSize: '26rpx' }}>查看主页</Text></View>
          <View id="match-chat-button" onClick={() => !submitting && onAction('chat')} style={{ flex: 1, height: '82rpx', borderRadius: '41rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '26rpx' }}>去聊天</Text></View>
        </View>
        <Text onClick={() => !submitting && onAction('later')} style={{ marginTop: '24rpx', color: '#A0A6B2', fontSize: '24rpx' }}>{submitting ? '正在确认...' : '稍后再说'}</Text>
      </View>
    </View>
  )
}
