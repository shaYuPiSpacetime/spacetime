import { Image, ScrollView, Text, View } from '@tarojs/components'
import { getTabBarBottom } from '@/constants/tabBarLayout'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import AppTabBar, { getCapsuleLeftActionsLayout } from '@/components/AppTabBar'
import { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useRetainedScroll } from '@/hooks/useRetainedScroll'
import {
  confirmIdealUnlock,
  getIdealResults,
  quoteAllIdealUnlock,
  quoteIdealUnlock,
  type IdealResultItemVO,
  type IdealResultPageVO,
  type IdealUnlockQuoteVO,
} from '@/services/ideal'

// 与旧全快照报价隔离，升级后不能自动确认旧的全量解锁。
const PENDING_QUOTE_KEY = 'prd08IdealPagePendingQuote'
const BLUE = '#2876FF'

interface Props {
  snapshotNo: string
  embedded?: boolean
  onRecommend?: () => void
  active?: boolean
  resolvingSnapshot?: boolean
  resolutionError?: string
  onRetry?: () => void
}

/** 推荐页与独立结果页复用内容；内嵌时只由推荐主页面拥有底部导航。 */
export default function IdealResultsContent({ snapshotNo, embedded = false, onRecommend, active = true, resolvingSnapshot = false, resolutionError = '', onRetry }: Props) {
  const [page, setPage] = useState<IdealResultPageVO | null>(null)
  const scroll = useRetainedScroll(snapshotNo)
  const [items, setItems] = useState<IdealResultItemVO[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageNumber, setPageNumber] = useState(1)
  const currentPageNumber = useRef(1)
  const pageCursors = useRef<Array<string | undefined>>([undefined])
  const requestGeneration = useRef(0)
  const currentSnapshotNo = useRef(snapshotNo)
  currentSnapshotNo.current = snapshotNo
  const [unlocking, setUnlocking] = useState(false)
  const unlockInFlight = useRef(false)
  const [selection, setSelection] = useState<{ snapshotNo: string; itemNos: string[] }>({ snapshotNo, itemNos: [] })
  const selectedItemNos = selection.snapshotNo === snapshotNo ? selection.itemNos : []
  const toggleSelection = (itemNo: string) => {
    if (unlockInFlight.current || loadInFlight.current || unlocking || loading || page?.snapshotNo !== snapshotNo) return
    setSelection(current => {
      const previous = current.snapshotNo === snapshotNo ? current.itemNos : []
      return { snapshotNo, itemNos: previous.includes(itemNo) ? previous.filter(no => no !== itemNo) : [...previous, itemNo] }
    })
  }
  const pendingCheck = useRef(false)
  const loadInFlight = useRef(false)
  const currentItemNos = page?.snapshotNo === snapshotNo ? items.filter(item => !item.unlocked).map(item => item.itemNo) : []
  const showEmptyState = !resolvingSnapshot && !loading && !message && !resolutionError && items.length === 0 && pageNumber === 1
  const load = async (cursor?: string, targetPage = 1): Promise<boolean> => {
    if (loadInFlight.current) return false
    if (!snapshotNo) {
      if (resolvingSnapshot) return false
      setMessage('筛选快照不存在')
      setLoading(false)
      return false
    }
    const generation = ++requestGeneration.current
    setLoading(true)
    loadInFlight.current = true
    try {
      const data = await getIdealResults(snapshotNo, cursor)
      if (generation !== requestGeneration.current) return false
      setMessage('')
      setPage(data)
      setItems(data.items || [])
      // 分页只更新当前页可选项，保留同一快照中其他页的勾选。
      setSelection(current => {
        if (current.snapshotNo !== snapshotNo) return { snapshotNo, itemNos: [] }
        const noLongerSelectable = new Set((data.items || []).filter(item => item.unlocked).map(item => item.itemNo))
        return { snapshotNo, itemNos: current.itemNos.filter(no => !noLongerSelectable.has(no)) }
      })
      pageCursors.current = [...pageCursors.current.slice(0, targetPage - 1), cursor]
      currentPageNumber.current = targetPage
      setPageNumber(targetPage)
      return true
    } catch (error) {
      if (generation === requestGeneration.current) setMessage(error instanceof Error ? error.message : '理想型结果加载失败')
      return false
    } finally {
      if (generation === requestGeneration.current) {
        loadInFlight.current = false
        setLoading(false)
      }
    }
  }
  const changePage = async (direction: -1 | 1) => {
    if (loadInFlight.current || unlockInFlight.current || loading || unlocking || resolvingSnapshot || page?.snapshotNo !== snapshotNo) return
    if (direction === -1 && pageNumber === 1) return
    if (direction === 1 && !page?.nextCursor) return
    const nextPage = pageNumber + direction
    const cursor = direction === 1 ? page?.nextCursor || undefined : pageCursors.current[nextPage - 1]
    if (await load(cursor, nextPage)) scroll.reset()
  }
  const refreshResults = () => {
    if (pendingCheck.current) return
    const pending = Taro.getStorageSync(PENDING_QUOTE_KEY) as
      | { snapshotNo?: string; quoteToken?: string; requestId?: string; pageCursors?: Array<string | undefined>; pageNumber?: number }
      | undefined
    if (!pending?.quoteToken || pending.snapshotNo !== snapshotNo) {
      // 普通跳转返回不覆盖已加载批次；新快照、主动刷新和解锁回执单独处理。
      if (!page || page.snapshotNo !== snapshotNo) void load()
      return
    }
    // 常驻但隐藏的面板只预取内容，不能在用户浏览推荐时自动执行待确认的解锁。
    if (!active) return
    pendingCheck.current = true
    if (pending.pageCursors?.length && pending.pageNumber && pending.pageNumber <= pending.pageCursors.length) {
      pageCursors.current = pending.pageCursors
      currentPageNumber.current = pending.pageNumber
      setPageNumber(pending.pageNumber)
    }
    void confirmQuote(
      pending.quoteToken,
      pending.requestId || createRequestId('ideal-confirm')
    ).finally(() => {
      pendingCheck.current = false
    })
  }
  // 两个入口都走同一套恢复逻辑，避免首次挂载与充值返回并发加载旧结果。
  useEffect(() => {
    pageCursors.current = [undefined]
    currentPageNumber.current = 1
    setPageNumber(1)
    setPage(null)
    setItems([])
    setMessage('')
    setSelection({ snapshotNo, itemNos: [] })
    loadInFlight.current = false
    refreshResults()
    return () => { requestGeneration.current += 1 }
  }, [snapshotNo])
  useDidShow(() => {
    if (active) refreshResults()
  })
  useEffect(() => {
    const pending = Taro.getStorageSync(PENDING_QUOTE_KEY)
    if (active && snapshotNo && (!page || (pending?.snapshotNo === snapshotNo && pending?.quoteToken))) refreshResults()
  }, [active])
  const confirmQuote = async (quoteToken: string, requestId: string) => {
    unlockInFlight.current = true
    setUnlocking(true)
    try {
      const result = await confirmIdealUnlock(quoteToken, requestId)
      Taro.removeStorageSync(PENDING_QUOTE_KEY)
      if (currentSnapshotNo.current !== snapshotNo) return
      // 先应用已确认权益，刷新失败也不会再次展示付费入口；批量缺少的资料再按当前页加载。
      const confirmedItems = new Map(result.unlockedItems.map(item => [item.itemNo, item]))
      setItems(current => current.map(item => {
        const confirmed = confirmedItems.get(item.itemNo)
        return confirmed ? { ...item, ...confirmed, profile: confirmed.profile || item.profile, unlocked: true } : item
      }))
      setSelection({ snapshotNo, itemNos: [] })
      await Taro.showToast({ title: `成功解锁${result.unlockedItems.length}位`, icon: 'success' })
    } catch (error) {
      Taro.removeStorageSync(PENDING_QUOTE_KEY)
      await Taro.showToast({
        title: error instanceof Error ? error.message : '解锁失败，请重新报价',
        icon: 'none',
      })
    } finally {
      if (currentSnapshotNo.current === snapshotNo) {
        await load(pageCursors.current[currentPageNumber.current - 1], currentPageNumber.current)
      }
      unlockInFlight.current = false
      setUnlocking(false)
    }
  }
  const handleQuote = async (quoteLoader: () => Promise<IdealUnlockQuoteVO>) => {
    if (unlockInFlight.current || loadInFlight.current || unlocking || loading || page?.snapshotNo !== snapshotNo) return
    unlockInFlight.current = true
    setUnlocking(true)
    try {
      const quote = await quoteLoader()
      const requestId = createRequestId('ideal-confirm')
      if (!quote.balanceEnough) {
        Taro.setStorageSync(PENDING_QUOTE_KEY, {
          snapshotNo,
          quoteToken: quote.quoteToken,
          requestId,
          pageCursors: pageCursors.current,
          pageNumber: currentPageNumber.current,
        })
        await Taro.navigateTo({
          url: `/pages/coins/unlock-recharge?sourceScene=ideal_user_unlock&quoteToken=${encodeURIComponent(quote.quoteToken)}&cost=${quote.payableCost}&balance=${quote.currentBalance}&snapshotNo=${encodeURIComponent(snapshotNo)}`,
        })
        return
      }
      const confirmed = await Taro.showModal({
        title: '确认解锁',
        content: `${quote.candidateCount}位，原价${quote.originalCost}千寻币，优惠${quote.discountPercent}%，实付${quote.payableCost}千寻币`,
        confirmText: '确认解锁',
      })
      if (confirmed.confirm) await confirmQuote(quote.quoteToken, requestId)
    } catch (error) {
      await Taro.showToast({
        title: error instanceof Error ? error.message : '报价失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      unlockInFlight.current = false
      setUnlocking(false)
    }
  }
  return (
    <View
      style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: 'PingFang SC, sans-serif' }}
    >
      <IdealResultsHeader onRecommend={onRecommend} />
      {showEmptyState ? (
        <IdealResultsEmptyState />
      ) : (
        <ScrollView
          scrollY
          scrollTop={scroll.scrollTop}
          onScroll={scroll.onScroll}
          showScrollbar={false}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            top: '184rpx',
            zIndex: 3,
            height: 'calc(100vh - 334rpx)',
          }}
        >
          <View
            style={{
              width: '700rpx',
              margin: '0 auto',
              paddingBottom: getTabBarBottom(260),
              position: 'relative',
            }}
          >
            {(loading || resolvingSnapshot) && !items.length && !resolutionError ? <CenterText text="理想型结果加载中…" /> : null}
            {resolutionError ? (
              <View onClick={onRetry}>
                <CenterText text={`${resolutionError}，点击重试`} />
              </View>
            ) : null}
            {message ? <View>
              <CenterText text={message} />
              <Text onClick={() => { if (!loading && !unlocking) void load(pageCursors.current[currentPageNumber.current - 1], currentPageNumber.current) }} style={{ display: 'block', textAlign: 'center', padding: '20rpx', color: BLUE }}>重新加载</Text>
            </View> : null}
            {items.map(item => (
              <IdealCandidateCard
                key={item.itemNo}
                item={item}
                selected={selectedItemNos.includes(item.itemNo)}
                onSelect={() => toggleSelection(item.itemNo)}
                onUnlock={() => void handleQuote(() => quoteIdealUnlock(snapshotNo, [item.itemNo]))}
              />
            ))}
            {loading && items.length > 0 ? (
              <Text
                style={{
                  display: 'block',
                  color: '#999999',
                  fontSize: '23rpx',
                  textAlign: 'center',
                  marginTop: '24rpx',
                }}
              >
                加载中…
              </Text>
            ) : null}
            {!items.length && !loading && pageNumber > 1 ? <CenterText text="本页暂无可解锁人员，可返回上一页查看" /> : null}
            {page && !showEmptyState ? (
              <View
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '60rpx',
                  marginTop: '30rpx',
                }}
              >
                <View
                  onClick={() => void changePage(-1)}
                  style={{ padding: '20rpx 10rpx', color: pageNumber > 1 && !loading && !unlocking ? BLUE : '#B6BDCA', fontSize: '26rpx' }}
                >
                  上一页
                </View>
                <View style={{ padding: '20rpx 0', color: '#949BAA', fontSize: '24rpx' }}>第 {pageNumber} 页</View>
                <View onClick={() => void changePage(1)} style={{ padding: '20rpx 10rpx', color: page.nextCursor && !loading && !unlocking ? BLUE : '#B6BDCA', fontSize: '26rpx' }}>下一页</View>
              </View>
            ) : null}
            {page ? (
              <View style={{ textAlign: 'center', marginTop: '16rpx' }}>
                <Text
                  onClick={() => void Taro.navigateTo({ url: '/pages/prd08/ideal/help/index' })}
                  style={{ color: '#999999', fontSize: '24rpx' }}
                >
                  活动说明
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
      {!showEmptyState && currentItemNos.length > 0 && page ? (
        <View
          style={{
            position: 'fixed',
            left: '44rpx',
            right: '44rpx',
            bottom: getTabBarBottom(64),
            zIndex: 10000,
          }}
        >
          <View
            onClick={() => void Taro.navigateTo({ url: '/pages/prd08/ideal/filter/index' })}
            style={{
              position: 'absolute',
              right: '8rpx',
              bottom: '170rpx',
              width: '82rpx',
              height: '82rpx',
              borderRadius: '41rpx',
              background: '#FFFFFF',
              boxShadow: '0 5rpx 20rpx rgba(50,80,120,.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              src={miniappOssIcons.idealFilter}
              mode="aspectFit"
              style={{ width: '62rpx', height: '62rpx' }}
            />
          </View>
          <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '56rpx', padding: '0 12rpx', background: '#FFFFFF', color: '#0C285A', fontSize: '24rpx' }}>
            <View>本页 {currentItemNos.length} 人 · 已选 {selectedItemNos.length} 人</View>
            {selectedItemNos.length > 0 ? <View onClick={() => { if (!unlocking) setSelection({ snapshotNo, itemNos: [] }) }} style={{ padding: '12rpx', color: BLUE }}>取消选择</View> : <View>勾选卡片右上角</View>}
          </View>
          <View style={{ display: 'flex', gap: '16rpx' }}>
          <View
            onClick={() => void handleQuote(() => quoteAllIdealUnlock(snapshotNo, currentItemNos))}
            style={{
              flex: 1,
              position: 'relative',
              height: '98rpx',
              borderRadius: '49rpx',
              background: BLUE,
              opacity: unlocking ? 0.62 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 600 }}>
              解锁本页（{currentItemNos.length}）
            </View>
            {page.pricing.discountPercent > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  right: '12rpx',
                  top: '-22rpx',
                  padding: '8rpx 16rpx',
                  borderRadius: '6rpx',
                  background: '#F52C61',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: '19rpx' }}>
                  优惠{page.pricing.discountPercent}%
                </Text>
              </View>
            ) : null}
          </View>
          <View
            onClick={() => { if (selectedItemNos.length) void handleQuote(() => quoteIdealUnlock(snapshotNo, selectedItemNos)) }}
            style={{ flex: 1, position: 'relative', height: '98rpx', borderRadius: '49rpx', background: selectedItemNos.length ? BLUE : '#CCD5E2', opacity: unlocking ? 0.62 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 600 }}>解锁选中{selectedItemNos.length ? `（${selectedItemNos.length}）` : ''}</View>
            {selectedItemNos.length > 1 && page.pricing.discountPercent > 0 ? (
              <View style={{ position: 'absolute', right: '12rpx', top: '-22rpx', padding: '8rpx 16rpx', borderRadius: '6rpx', background: '#F52C61' }}>
                <Text style={{ color: '#FFFFFF', fontSize: '19rpx' }}>优惠{page.pricing.discountPercent}%</Text>
              </View>
            ) : null}
          </View>
          </View>
        </View>
      ) : null}
      {!embedded ? <AppTabBar active="recommend" /> : null}
    </View>
  )
}

function IdealResultsHeader({ onRecommend }: { onRecommend?: () => void }) {
  const metrics = getNativeNavigationMetrics()
  const top = metrics.menuTop + (metrics.menuHeight - 54) / 2
  const actionsLayout = getCapsuleLeftActionsLayout({
    menuLeft: metrics.menuLeft,
    menuTop: metrics.menuTop,
    menuHeight: metrics.menuHeight,
    actionCount: 1,
    actionSize: 72,
  })
  return (
    <View style={{ position: 'relative', width: '750rpx', height: '378rpx' }}>
      <Image
        src={miniappOssIcons.idealHeaderBackground}
        mode="aspectFill"
        style={{ position: 'absolute', inset: 0, width: '750rpx', height: '378rpx' }}
      />
      <View
        style={{
          position: 'absolute',
          left: '32rpx',
          top: `${top}rpx`,
          zIndex: 2,
          display: 'flex',
          gap: '32rpx',
        }}
      >
        <Text
          onClick={() => {
            if (onRecommend) onRecommend()
            else {
              Taro.setStorageSync('prd08RecommendTab', 'recommend')
              void Taro.switchTab({ url: '/pages/recommend/index' })
            }
          }}
          style={{ color: '#FFFFFF', fontSize: '30rpx' }}
        >
          推荐
        </Text>
        <View style={{ position: 'relative' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '34rpx', fontWeight: 700 }}>理想型</Text>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '-10rpx',
              height: '7rpx',
              borderRadius: '4rpx',
              background: '#FFFFFF',
            }}
          />
        </View>
      </View>
      <View
        onClick={() => void Taro.navigateTo({ url: '/pages/prd08/ideal/unlocks/index' })}
        style={{
          position: 'absolute',
          left: `${actionsLayout.left}rpx`,
          top: `${actionsLayout.top}rpx`,
          zIndex: 2,
          width: `${actionsLayout.actionSize}rpx`,
          height: `${actionsLayout.actionSize}rpx`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src={miniappOssIcons.idealHistory}
          mode="aspectFit"
          style={{ width: '36rpx', height: '36rpx' }}
        />
      </View>
      <Text
        style={{
          position: 'absolute',
          left: '28rpx',
          top: `${metrics.navigationHeight + 52}rpx`,
          zIndex: 2,
          color: '#FFFFFF',
          fontSize: '48rpx',
          fontWeight: 600,
          lineHeight: '68rpx',
        }}
      >
        选择你的理想型
      </Text>
    </View>
  )
}

function IdealResultsEmptyState() {
  return (
    <View
      id="ideal-results-empty-state"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: '378rpx',
        bottom: 0,
        zIndex: 3,
        background: '#FFFFFF',
      }}
    >
      <View
        style={{
          paddingTop: '128rpx',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Image
          src={miniappOssIcons.qianxunEmptyFollowing}
          mode="aspectFit"
          style={{ width: '334rpx', height: '254rpx' }}
        />
        <Text style={{ color: '#999999', fontSize: '28rpx', marginTop: '24rpx' }}>
          当前条件下暂未找到理想型
        </Text>
      </View>
      <View
        id="ideal-results-empty-filter"
        onClick={() => void Taro.navigateTo({ url: '/pages/prd08/ideal/filter/index' })}
        style={{
          position: 'absolute',
          right: '44rpx',
          bottom: getTabBarBottom(110),
          width: '112rpx',
          height: '112rpx',
          borderRadius: '56rpx',
          background: '#FFFFFF',
          boxShadow: '0 0 8rpx rgba(175,175,175,.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src={miniappOssIcons.idealFilter}
          mode="aspectFit"
          style={{ width: '82rpx', height: '82rpx' }}
        />
      </View>
    </View>
  )
}

function IdealCandidateCard({ item, onUnlock, selected, onSelect }: { item: IdealResultItemVO; onUnlock: () => void; selected: boolean; onSelect: () => void }) {
  const profile = item.profile
  const avatar = item.unlocked ? profile?.avatar : item.blurAvatarUrl
  const title = profile
    ? [profile.currentCity, profile.age ? `${profile.age}岁` : '', item.educationLabel]
        .filter(Boolean)
        .join('·')
    : [item.cityName, item.ageBand, item.educationLabel].filter(Boolean).join('·')
  return (
    <View
      id={`ideal-candidate-${item.itemNo}`}
      style={{
        marginBottom: '20rpx',
        padding: '30rpx 28rpx 28rpx',
        borderRadius: '20rpx',
        border: `2rpx solid ${selected ? BLUE : 'transparent'}`,
        background: selected ? '#EEF5FF' : '#F7F8FA',
        boxSizing: 'border-box',
      }}
    >
      {!item.unlocked ? (
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16rpx' }}>
          <Text style={{ color: '#64748B', fontSize: '24rpx' }}>可多选，勾选后统一解锁</Text>
          <View
            onClick={onSelect}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              minHeight: '88rpx',
              minWidth: '220rpx',
              marginLeft: '16rpx',
              padding: '0 16rpx',
              border: `2rpx solid ${BLUE}`,
              borderRadius: '16rpx',
              background: selected ? BLUE : '#FFFFFF',
              color: selected ? '#FFFFFF' : BLUE,
              fontSize: '26rpx',
              fontWeight: 600,
              boxSizing: 'border-box',
            }}
          >
            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40rpx',
                height: '40rpx',
                marginRight: '12rpx',
                borderRadius: '8rpx',
                border: `2rpx solid ${selected ? '#FFFFFF' : BLUE}`,
                background: '#FFFFFF',
                color: BLUE,
                boxSizing: 'border-box',
              }}
            >
              {selected ? '✓' : ''}
            </View>
            <Text>{selected ? '已勾选' : '勾选此人'}</Text>
          </View>
        </View>
      ) : null}
      <View style={{ display: 'flex', alignItems: 'center' }}>
        {avatar ? (
          <Image
            src={avatar}
            mode="aspectFill"
            style={{
              width: '150rpx',
              height: '150rpx',
              borderRadius: '75rpx',
              border: '6rpx solid #FFFFFF',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <View
            style={{
              width: '150rpx',
              height: '150rpx',
              borderRadius: '75rpx',
              background: '#DCE6F1',
            }}
          />
        )}
        <View style={{ marginLeft: '26rpx', flex: 1 }}>
          <Text style={{ display: 'block', color: '#0C285A', fontSize: '31rpx', fontWeight: 600 }}>
            {title || '契合嘉宾'}
          </Text>
          <Text
            style={{ display: 'block', color: '#A2A8B4', fontSize: '24rpx', marginTop: '16rpx' }}
          >
            {item.schoolSummary || profile?.school || '学校信息解锁后可见'}
          </Text>
        </View>
      </View>
      <View style={{ display: 'flex', flexWrap: 'wrap', gap: '10rpx', marginTop: '24rpx' }}>
        {(item.matchedConditionNames || []).map(name => (
          <View
            key={name}
            style={{
              minWidth: '172rpx',
              height: '62rpx',
              padding: '0 20rpx',
              borderRadius: '31rpx',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <Text style={{ color: '#0C285A', fontSize: '23rpx' }}>{name}</Text>
          </View>
        ))}
      </View>
      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: item.unlocked ? 'space-between' : 'flex-end',
          marginTop: '34rpx',
        }}
      >
        {item.unlocked ? <View style={{ color: '#949BAA', fontSize: '23rpx' }}>资料已解锁</View> : null}
        <Text
          onClick={
            item.unlocked
              ? () => {
                  const targetUserId = profile?.userId || item.candidateNo
                  if (targetUserId) void Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${encodeURIComponent(String(targetUserId))}&sourceScene=ideal` })
                  else void Taro.showToast({ title: '用户资料加载中，请稍后重试', icon: 'none' })
                }
              : onUnlock
          }
          style={{ color: '#4C8BFF', fontSize: '27rpx', fontWeight: 600 }}
        >
          {item.unlocked ? '查看主页' : '解锁ta ›'}
        </Text>
      </View>
    </View>
  )
}
function CenterText({ text }: { text: string }) {
  return (
    <View
      style={{
        minHeight: '360rpx',
        borderRadius: '20rpx',
        background: '#F7F8FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#999999', fontSize: '25rpx' }}>{text}</Text>
    </View>
  )
}
function createRequestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}
