import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import HeartMessageHeader, { getLanhuNavigationMetrics } from '@/components/HeartMessageHeader'
import personImage from '@/assets/lanhu/heart-message/heart-person.webp'
import blurredPersonImage from '@/assets/lanhu/heart-message/heart-person-blur.webp'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import AccessBlockedPage from '@/components/AccessBlockedPage'
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
  type MatchPopupVO,
  type RecentViewerItemVO,
  type RecentViewersPageVO,
  type RelationDisplayStatus,
  type UnlockConfirmVO,
  type UnlockQuoteVO,
} from '@/services/relation'

type HeartTab = 'likes' | 'visitors'
type UnlockStage = 'closed' | 'confirm' | 'quote' | 'success'
type RelationCard = LikesMeItemVO | RecentViewerItemVO

const background =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6) 100%)'

const fallbackLikes: LikesMeItemVO[] = Array.from({ length: 8 }, (_, index) => ({
  recordNo: `LIK-DEMO-${index}`,
  userId: 1000 + index,
  displayStatus: 'blur',
  nickname: index % 2 ? '有房有车' : '985同城',
  avatar: null,
  age: index % 2 ? 27 : 28,
  school: index % 2 ? '同城高校' : '浙江大学',
  onlineStatus: index % 2 ? 'offline' : 'online',
  onlineText: index % 2 ? '1小时前在线' : '在线',
  identityLabel: index % 2 ? '体制内' : '职场人',
  annualIncomeLabel: index % 2 ? null : '30W+',
  weakTags: index % 2 ? ['有房有车', '体制内'] : ['985', '年薪30W+'],
  sourceScene: 'featured',
  isNew: index === 0,
  groupKey: index === 0 ? 'new' : 'earlier_locked',
  mutualLike: false,
  likedTime: '',
  unlockTime: null,
  likeActionCopy: index % 2 ? '' : '对你一见钟情，秒送喜欢',
}))

const fallbackVisitors: RecentViewerItemVO[] = Array.from({ length: 8 }, (_, index) => ({
  recordNo: `VIS-DEMO-${index}`,
  userId: 2000 + index,
  displayStatus: 'blur',
  nickname: index % 2 ? '公务员' : '28岁',
  avatar: null,
  age: index % 2 ? 29 : 28,
  school: index % 2 ? null : '浙江大学',
  onlineStatus: index % 2 ? 'offline' : 'online',
  onlineText: index % 2 ? '2小时前在线' : '10分钟前在线',
  identityLabel: index % 2 ? '公务员' : '职场人',
  annualIncomeLabel: null,
  weakTags: index % 2 ? ['公务员'] : ['28岁'],
  sourceScene: 'profile',
  groupKey: index < 3 ? 'today' : 'recent7d',
  visitCount: index + 1,
  firstVisitTime: '',
  lastVisitTime: '',
  unlockTime: null,
  mutualLike: false,
  relationBadges: [],
}))

function createRequestId(prefix: string, bizNo: string): string {
  return `${prefix}-${bizNo}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export default function CommunityPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<HeartTab>(router.params.tab === 'visitors' ? 'visitors' : 'likes')
  const initialUnlockStage: UnlockStage = router.params.unlock === 'success'
    ? 'success'
    : router.params.unlock === 'confirm'
      ? 'confirm'
      : 'closed'
  const [unlockStage, setUnlockStage] = useState<UnlockStage>(initialUnlockStage)
  const [likesPage, setLikesPage] = useState<LikesMePageVO | null>(null)
  const [visitorsPage, setVisitorsPage] = useState<RecentViewersPageVO | null>(null)
  const [likesRecords, setLikesRecords] = useState<LikesMeItemVO[]>([])
  const [visitorRecords, setVisitorRecords] = useState<RecentViewerItemVO[]>([])
  const [likesPageNo, setLikesPageNo] = useState(1)
  const [visitorsPageNo, setVisitorsPageNo] = useState(1)
  const [snapshotCursor, setSnapshotCursor] = useState<string | undefined>(undefined)
  const [selectedCard, setSelectedCard] = useState<RelationCard | null>(null)
  const [unlockQuote, setUnlockQuote] = useState<UnlockQuoteVO | null>(null)
  const [unlockResult, setUnlockResult] = useState<UnlockConfirmVO | null>(null)
  const [matchPopup, setMatchPopup] = useState<MatchPopupVO | null>(null)
  const [loading, setLoading] = useState(false)
  const isMember = router.params.member === '1' || router.params.member === 'true'
  const access = useAccessStatus('canCommunity')
  const readCursorSubmitted = useRef<string | null>(null)

  const loadLikes = async (page = 1) => {
    setLoading(true)
    try {
      const pageData = await getLikesMePage(page, 20, page > 1 ? snapshotCursor : undefined)
      setLikesPage(pageData)
      setLikesPageNo(page)
      if (page === 1) {
        setSnapshotCursor(pageData.readCursor || undefined)
        setLikesRecords(pageData.records || [])
        if (pageData.readCursor && pageData.newCount > 0 && readCursorSubmitted.current !== pageData.readCursor) {
          readCursorSubmitted.current = pageData.readCursor
          markLikesMeRead(pageData.readCursor).catch(() => undefined)
        }
      } else {
        setLikesRecords(previous => [...previous, ...(pageData.records || [])])
      }
    } catch (error) {
      if (page === 1 && likesRecords.length === 0) setLikesRecords(fallbackLikes)
      Taro.showToast({ title: error instanceof Error ? error.message : '喜欢列表加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const loadVisitors = async (page = 1) => {
    setLoading(true)
    try {
      const pageData = await getRecentViewersPage(page, 20)
      setVisitorsPage(pageData)
      setVisitorsPageNo(page)
      setVisitorRecords(page === 1 ? pageData.records || [] : previous => [...previous, ...(pageData.records || [])])
    } catch (error) {
      if (page === 1 && visitorRecords.length === 0) setVisitorRecords(fallbackVisitors)
      Taro.showToast({ title: error instanceof Error ? error.message : '访客列表加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (access.allowed !== true) return
    loadLikes(1)
    loadVisitors(1)
    getPendingMatchPopup()
      .then(data => {
        if (data) setMatchPopup(data)
      })
      .catch(() => undefined)
  }, [access.allowed])

  const openLockedCard = (card: RelationCard) => {
    setSelectedCard(card)
    setUnlockQuote(null)
    setUnlockResult(null)
    setUnlockStage('confirm')
  }

  const refreshActiveList = async () => {
    if (activeTab === 'likes') await loadLikes(1)
    else await loadVisitors(1)
  }

  const requestUnlockQuote = async () => {
    if (!selectedCard) return
    const isVisitor = activeTab === 'visitors'
    try {
      const quote = await quoteRelationUnlock(
        isVisitor ? 'viewers_unlock_one' : 'likes_unlock_one',
        isVisitor ? 'visit' : 'like',
        selectedCard.recordNo,
      )
      if (quote.alreadyUnlocked) {
        await refreshActiveList()
        setUnlockQuote(quote)
        setUnlockStage('success')
        return
      }
      setUnlockQuote(quote)
      setUnlockStage('quote')
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取报价失败'
      if (/余额|5001/.test(message)) {
        Taro.navigateTo({ url: '/pages/coins/unlock-recharge?sourceScene=likes_unlock_one' })
        return
      }
      Taro.showToast({ title: message, icon: 'none' })
    }
  }

  const confirmUnlock = async () => {
    if (!unlockQuote?.quoteToken) return
    try {
      const result = await confirmRelationUnlock(unlockQuote.quoteToken, createRequestId('unlock', unlockQuote.targetBizNo))
      setUnlockResult(result)
      await refreshActiveList()
      setUnlockStage('success')
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '解锁失败，请重试', icon: 'none' })
    }
  }

  const handleCardClick = (card: RelationCard) => {
    if (card.displayStatus === 'clear' && card.userId) {
      const sourceScene = activeTab === 'likes' ? 'likes_me' : 'recent_viewers'
      Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${card.userId}&sourceScene=${sourceScene}` })
      return
    }
    openLockedCard(card)
  }

  const closeMatchPopup = async (action: 'later' | 'close' | 'profile' | 'chat') => {
    const popup = matchPopup
    setMatchPopup(null)
    if (popup) markMatchPopupRead(popup.matchNo, action).catch(() => undefined)
    if (popup && action === 'profile') {
      Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${popup.matchedUserId}&sourceScene=profile` })
    } else if (popup && action === 'chat') {
      Taro.showToast({ title: popup.canEnterConversation ? '正在打开聊天' : '匹配后才能聊天', icon: 'none' })
    }
  }

  if (access.allowed !== true) return <AccessBlockedPage {...access} />

  return (
    <View style={{ height: '100vh', overflow: 'hidden', background, fontFamily: 'PingFang SC, sans-serif' }}>
      <ScrollView scrollY style={{ width: '750rpx', height: '100vh' }} showScrollbar={false}>
        <View style={{ minHeight: '1624rpx', paddingBottom: isMember ? '180rpx' : '310rpx', boxSizing: 'border-box' }}>
          <HeartTabsHeader
            active={activeTab}
            likesCount={likesPage?.newCount ?? 55}
            visitorsCount={visitorsPage?.todayVisitorUv ?? 45}
            onChange={setActiveTab}
          />
          {activeTab === 'likes'
            ? (
              <LikesPanel
                isMember={isMember}
                page={likesPage}
                records={likesRecords.length ? likesRecords : fallbackLikes}
                loading={loading}
                onLockedCard={handleCardClick}
                onLoadMore={() => likesPage?.hasMore && loadLikes(likesPageNo + 1)}
              />
            )
            : (
              <VisitorsPanel
                isMember={isMember}
                page={visitorsPage}
                records={visitorRecords.length ? visitorRecords : fallbackVisitors}
                loading={loading}
                onLockedCard={handleCardClick}
                onLoadMore={() => visitorsPage?.hasMore && loadVisitors(visitorsPageNo + 1)}
              />
            )}
        </View>
      </ScrollView>

      {!isMember ? (
        <View
          onClick={() => Taro.navigateTo({ url: '/pages/heart/membership-unlock' })}
          style={{
            position: 'fixed',
            left: '25rpx',
            bottom: '184rpx',
            zIndex: 80,
            width: '700rpx',
            height: '98rpx',
            borderRadius: '49rpx',
            background: '#211F20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#EAD8B6', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
            解锁全部访客
          </Text>
        </View>
      ) : null}

      {unlockStage !== 'closed' ? (
        <UnlockSheet
          stage={unlockStage}
          card={selectedCard}
          quote={unlockQuote}
          result={unlockResult}
          onClose={() => setUnlockStage('closed')}
          onQuote={requestUnlockQuote}
          onConfirm={confirmUnlock}
        />
      ) : null}

      {matchPopup ? <MatchPopupSheet popup={matchPopup} onAction={closeMatchPopup} /> : null}
    </View>
  )
}

function HeartTabsHeader({ active, likesCount, visitorsCount, onChange }: { active: HeartTab; likesCount: number; visitorsCount: number; onChange: (tab: HeartTab) => void }) {
  const { menuTop, menuHeight } = getLanhuNavigationMetrics()
  const top = menuTop + (menuHeight - 45) / 2

  return (
    <HeartMessageHeader
      rightIcon="folder"
      onRightIconClick={() => Taro.navigateTo({ url: '/pages/heart/mutual' })}
    >
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
  const shownCount = count > 99 ? '99+' : String(count)
  return (
    <View onClick={onClick} style={{ position: 'relative', width: `${width}rpx`, height: '56rpx', display: 'flex', justifyContent: 'center' }}>
      {active ? (
        <View style={{ position: 'absolute', left: '0', bottom: '3rpx', width: `${width}rpx`, height: '8rpx', borderRadius: '6rpx', background: 'rgba(40,118,255,0.8)' }} />
      ) : null}
      <Text style={{ position: 'relative', zIndex: 1, color: active ? '#0C285A' : '#7F8494', fontSize: active ? '32rpx' : '28rpx', fontWeight: active ? 500 : 400, lineHeight: '45rpx', whiteSpace: 'nowrap' }}>
        {label}
      </Text>
      <View style={{ position: 'absolute', right: '-8rpx', top: '-13rpx', minWidth: '28rpx', height: '28rpx', padding: '0 5rpx', borderRadius: '14rpx', background: '#EE2525', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
        <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '22rpx' }}>{shownCount}</Text>
      </View>
    </View>
  )
}

function LikesPanel({ isMember, page, records, loading, onLockedCard, onLoadMore }: { isMember: boolean; page: LikesMePageVO | null; records: LikesMeItemVO[]; loading: boolean; onLockedCard: (card: LikesMeItemVO) => void; onLoadMore: () => void }) {
  const previewAvatars = page?.newLikePreviewAvatars?.length ? page.newLikePreviewAvatars : records.slice(0, 5).map(item => ({
    recordNo: item.recordNo,
    displayStatus: item.displayStatus,
    avatar: item.avatar,
    onlineStatus: item.onlineStatus,
  }))
  return (
    <View style={{ width: '700rpx', margin: '0 auto' }}>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', height: '45rpx' }}>
        <Text style={{ color: '#2876FF', fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx' }}>{page?.newCount ?? 59}</Text>
        <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 500, lineHeight: '45rpx' }}> 新喜欢</Text>
      </View>
      <View style={{ width: '670rpx', height: '134rpx', marginTop: '10rpx', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        {previewAvatars.slice(0, 5).map((item, index) => (
          <View key={item.recordNo} style={{ position: 'relative', width: '134rpx', height: '134rpx' }}>
            <Image src={item.avatar || (isMember || item.displayStatus === 'clear' ? personImage : blurredPersonImage)} mode="aspectFill" style={{ width: '120rpx', height: '120rpx', margin: '7rpx', borderRadius: '50%', filter: item.displayStatus === 'blur' ? 'blur(8rpx)' : 'none' }} />
            {index === 0 ? (
              <View style={{ position: 'absolute', left: '0', top: '0', width: '42rpx', height: '26rpx', borderRadius: '13rpx', background: '#35C36B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '22rpx' }}>新!</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', height: '45rpx', marginTop: '16rpx' }}>
        <Text style={{ color: '#2876FF', fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx' }}>{page?.total ?? 315}</Text>
        <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 500, lineHeight: '45rpx' }}> 人新喜欢了我</Text>
      </View>
      <HeartGrid kind="likes" records={records} isMember={isMember} onLockedCard={onLockedCard} />
      {page?.hasMore ? <LoadMoreButton loading={loading} onClick={onLoadMore} /> : null}
    </View>
  )
}

function VisitorsPanel({ isMember, page, records, loading, onLockedCard, onLoadMore }: { isMember: boolean; page: RecentViewersPageVO | null; records: RecentViewerItemVO[]; loading: boolean; onLockedCard: (card: RecentViewerItemVO) => void; onLoadMore: () => void }) {
  return (
    <View style={{ width: '700rpx', margin: '0 auto' }}>
      <View style={{ width: '700rpx', height: '130rpx', borderRadius: '12rpx', background: 'rgba(255,255,255,0.88)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        <VisitorMetric value={String(page?.totalPv ?? 1171)} label="总浏览量" />
        <VisitorMetric value={String(page?.todayVisitorUv ?? 71)} label="今日访客" />
        <VisitorMetric value={String(page?.todayVisitPv ?? 0)} label="今日浏览量" />
      </View>
      <View style={{ width: '700rpx', height: '74rpx', marginTop: '20rpx', borderRadius: '8rpx', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#7F8494', fontSize: '24rpx', lineHeight: '33rpx' }}>担心被认识的人看到？</Text>
        <Text onClick={() => Taro.navigateTo({ url: '/pages/membership/index' })} style={{ color: '#2876FF', fontSize: '24rpx', lineHeight: '33rpx' }}>开通会员</Text>
        <Text style={{ color: '#7F8494', fontSize: '24rpx', lineHeight: '33rpx' }}>只让你喜欢的人看到你</Text>
      </View>
      <View style={{ height: '40rpx', marginTop: '22rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: '8rpx', height: '28rpx', marginRight: '10rpx', borderRadius: '5rpx', background: '#2876FF' }} />
        <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>昨日来访</Text>
      </View>
      <HeartGrid kind="visitors" records={records} isMember={isMember} onLockedCard={onLockedCard} />
      {page?.hasMore ? <LoadMoreButton loading={loading} onClick={onLoadMore} /> : null}
    </View>
  )
}

function VisitorMetric({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ width: '150rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Text style={{ color: '#0C285A', fontSize: '48rpx', fontWeight: 500, lineHeight: '60rpx' }}>{value}</Text>
      <Text style={{ color: '#7F8494', fontSize: '26rpx', lineHeight: '37rpx', whiteSpace: 'nowrap' }}>{label}</Text>
    </View>
  )
}

function HeartGrid<T extends RelationCard>({ kind, records, isMember, onLockedCard }: { kind: 'likes' | 'visitors'; records: T[]; isMember: boolean; onLockedCard: (card: T) => void }) {
  return (
    <View style={{ width: '700rpx', marginTop: kind === 'likes' ? '28rpx' : '20rpx', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '18rpx 20rpx' }}>
      {records.map((record, index) => (
        <HeartPersonCard key={`${record.recordNo}-${index}`} record={record} kind={kind} isMember={isMember} onClick={() => onLockedCard(record)} />
      ))}
    </View>
  )
}

function buildCardTitle(record: RelationCard, kind: 'likes' | 'visitors'): string {
  if (record.displayStatus === 'blur') {
    const tags = record.weakTags?.length ? record.weakTags.join('·') : ''
    return tags || record.identityLabel || record.annualIncomeLabel || (kind === 'likes' ? '同城心动' : '最近来访')
  }
  return [record.nickname, record.age ? `${record.age}岁` : '', record.occupationLabel || record.identityLabel].filter(Boolean).join('·')
}

function HeartPersonCard({ record, kind, isMember, onClick }: { record: RelationCard; kind: 'likes' | 'visitors'; isMember: boolean; onClick: () => void }) {
  const clear = isMember || record.displayStatus === 'clear'
  const image = record.avatar || (clear ? personImage : blurredPersonImage)
  return (
    <View onClick={onClick} style={{ position: 'relative', width: '340rpx', height: '378rpx', overflow: 'hidden', borderRadius: '8rpx', background: '#D8D8D8' }}>
      <Image src={image} mode="aspectFill" style={{ width: '340rpx', height: '378rpx', filter: clear ? 'none' : 'blur(10rpx)' }} />
      <View style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 52%,rgba(0,0,0,0.48) 100%)' }} />
      {kind === 'likes' ? (
        <>
          <View style={{ position: 'absolute', left: '14rpx', top: '226rpx', height: '38rpx', padding: '0 14rpx', borderRadius: '19rpx', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
            <Text style={{ color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx' }}>{record.onlineText || '在线'}</Text>
          </View>
          {'likeActionCopy' in record && record.likeActionCopy ? (
            <View style={{ position: 'absolute', left: '14rpx', top: '272rpx', maxWidth: '306rpx', height: '38rpx', padding: '0 13rpx', borderRadius: '19rpx', background: 'rgba(255,225,170,0.92)', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
              <Text style={{ color: '#242122', fontSize: '20rpx', lineHeight: '28rpx', whiteSpace: 'nowrap' }}>{record.likeActionCopy}</Text>
            </View>
          ) : null}
          {'isNew' in record && record.isNew ? <Text style={{ position: 'absolute', right: '16rpx', top: '16rpx', color: '#FFFFFF', fontSize: '22rpx', fontWeight: 600 }}>新</Text> : null}
          <Text style={{ position: 'absolute', left: '14rpx', bottom: '20rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
            {buildCardTitle(record, kind)}
          </Text>
        </>
      ) : (
        <View style={{ position: 'absolute', left: '14rpx', bottom: '18rpx' }}>
          <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx' }}>{record.onlineText || '刚刚来访'}</Text>
          <Text style={{ display: 'block', marginTop: '2rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>{buildCardTitle(record, kind)}</Text>
        </View>
      )}
    </View>
  )
}

function LoadMoreButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <View onClick={loading ? undefined : onClick} style={{ width: '260rpx', height: '64rpx', margin: '28rpx auto 0', borderRadius: '32rpx', background: 'rgba(255,255,255,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#2876FF', fontSize: '24rpx' }}>{loading ? '加载中...' : '加载更多'}</Text>
    </View>
  )
}

function UnlockSheet({ stage, card, quote, result, onClose, onQuote, onConfirm }: { stage: Exclude<UnlockStage, 'closed'>; card: RelationCard | null; quote: UnlockQuoteVO | null; result: UnlockConfirmVO | null; onClose: () => void; onQuote: () => void; onConfirm: () => void }) {
  const success = stage === 'success'
  const quoteReady = stage === 'quote'
  const unitPrice = quote?.unitPrice ?? 100
  const title = success ? '解锁成功' : quoteReady ? '确认解锁Ta是谁' : '解锁Ta是谁'
  const subtitle = success ? '现在可以查看主页并继续互动' : quoteReady ? `本次消耗 ${unitPrice} 千寻币，余额 ${quote?.coinBalance ?? 0}` : '送出喜欢，即刻开聊'
  const shownName = success ? card?.nickname || `用户${result?.targetUserId || ''}` : card?.weakTags?.join('·') || '同城·金牛座'
  return (
    <View onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 20000, background: 'rgba(0,0,0,0.42)' }}>
      <View onClick={(event) => event.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: '454rpx', overflow: 'hidden', borderRadius: '32rpx 32rpx 0 0', background: '#FFFFFF' }}>
        <View style={{ position: 'relative', height: '170rpx', padding: '44rpx 28rpx 0', background: success ? 'linear-gradient(105deg,#FFF3F3,#FFE9F1)' : 'linear-gradient(105deg,#E7F5FF,#EDF4FF)', boxSizing: 'border-box' }}>
          <Text style={{ display: 'block', color: '#333333', fontSize: '32rpx', fontWeight: 600, lineHeight: '45rpx' }}>{title}</Text>
          <Text style={{ display: 'block', marginTop: '8rpx', color: '#7F8494', fontSize: '24rpx', lineHeight: '33rpx' }}>{subtitle}</Text>
          <View style={{ position: 'absolute', right: '-18rpx', top: '34rpx', width: '170rpx', height: '120rpx', borderRadius: '80rpx', background: success ? 'rgba(255,143,165,0.18)' : 'rgba(96,165,250,0.12)' }}>
            <Text style={{ position: 'absolute', left: '48rpx', top: '24rpx', color: success ? '#FF8CA6' : '#7EB4F4', fontSize: '62rpx', lineHeight: '70rpx' }}>{success ? '♥' : '▣'}</Text>
          </View>
        </View>
        <View style={{ height: '128rpx', margin: '10rpx 28rpx 0', padding: '0 20rpx', border: success ? '1rpx solid #F4F4F4' : '0', borderRadius: '12rpx', background: success ? '#FFFFFF' : '#E3F1FE', display: 'flex', flexDirection: 'row', alignItems: 'center', boxSizing: 'border-box' }}>
          <Image src={success ? (card?.avatar || personImage) : (card?.avatar || blurredPersonImage)} mode="aspectFill" style={{ width: '92rpx', height: '92rpx', borderRadius: '50%', filter: success ? 'none' : 'blur(8rpx)' }} />
          <View style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}>
            <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>{shownName}</Text>
            <Text style={{ display: 'block', marginTop: '8rpx', color: '#999999', fontSize: '20rpx', lineHeight: '28rpx', whiteSpace: 'nowrap' }}>{success ? '解锁后可进入主页' : '一看到你，立刻点了喜欢'}</Text>
          </View>
        </View>
        {success ? (
          <View onClick={() => card?.userId && Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${card.userId}&sourceScene=likes_me` })} style={{ height: '98rpx', margin: '18rpx 28rpx 28rpx', borderRadius: '49rpx', background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#F06C83', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>查看主页</Text>
          </View>
        ) : (
          <View style={{ margin: '18rpx 28rpx 28rpx', display: 'flex', flexDirection: 'row', gap: '20rpx' }}>
            <View id="unlock-one-button" onClick={quoteReady ? onConfirm : onQuote} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#E3F1FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>{quoteReady ? '确认解锁' : '只看ta(100'}</Text>
              {!quoteReady ? (
                <>
                  <View style={{ width: '30rpx', height: '30rpx', margin: '0 5rpx', borderRadius: '50%', background: '#F4B331', border: '3rpx solid #FFE08A', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '20rpx' }}>Q</Text>
                  </View>
                  <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>)</Text>
                </>
              ) : null}
            </View>
            <View onClick={() => Taro.navigateTo({ url: '/pages/heart/membership-unlock' })} style={{ flex: 1, height: '98rpx', borderRadius: '49rpx', background: '#211F20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#EAD8B6', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>解锁全部</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

function MatchPopupSheet({ popup, onAction }: { popup: MatchPopupVO; onAction: (action: 'later' | 'close' | 'profile' | 'chat') => void }) {
  const avatar = popup.avatar || personImage
  return (
    <View onClick={() => onAction('close')} style={{ position: 'fixed', inset: 0, zIndex: 21000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View onClick={event => event.stopPropagation()} style={{ width: '620rpx', borderRadius: '32rpx', background: '#FFFFFF', padding: '42rpx 34rpx 34rpx', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Image src={avatar} mode="aspectFill" style={{ width: '132rpx', height: '132rpx', borderRadius: '50%' }} />
        <Text style={{ marginTop: '24rpx', color: '#0C285A', fontSize: '34rpx', fontWeight: 700 }}>匹配成功</Text>
        <Text style={{ marginTop: '12rpx', color: '#7F8494', fontSize: '24rpx' }}>你和{popup.nickname}互相喜欢了</Text>
        <View style={{ width: '100%', marginTop: '34rpx', display: 'flex', flexDirection: 'row', gap: '18rpx' }}>
          <View onClick={() => onAction('profile')} style={{ flex: 1, height: '82rpx', borderRadius: '41rpx', background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#F06C83', fontSize: '26rpx' }}>查看主页</Text>
          </View>
          <View onClick={() => onAction('chat')} style={{ flex: 1, height: '82rpx', borderRadius: '41rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: '26rpx' }}>去聊天</Text>
          </View>
        </View>
        <Text onClick={() => onAction('later')} style={{ marginTop: '24rpx', color: '#A0A6B2', fontSize: '24rpx' }}>稍后再说</Text>
      </View>
    </View>
  )
}
