import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import AppTabBar, { getCapsuleLeftActionsLayout } from '@/components/AppTabBar'
import { getNativeNavigationMetrics } from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  confirmIdealUnlock,
  getIdealResults,
  quoteAllIdealUnlock,
  quoteIdealUnlock,
  type IdealResultItemVO,
  type IdealResultPageVO,
  type IdealUnlockQuoteVO,
} from '@/services/ideal'

const PENDING_QUOTE_KEY = 'prd08IdealPendingQuote'
const BLUE = '#2876FF'

export default function IdealResultsPage() {
  const router = useRouter()
  const snapshotNo = String(router.params.snapshotNo || '')
  const [page, setPage] = useState<IdealResultPageVO | null>(null)
  const [items, setItems] = useState<IdealResultItemVO[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const pendingCheck = useRef(false)
  const showEmptyState = !loading && !message && items.length === 0
  const load = async (cursor?: string) => {
    if (!snapshotNo) {
      setMessage('筛选快照不存在')
      setLoading(false)
      return
    }
    if (cursor) setLoadingMore(true)
    else setLoading(true)
    try {
      const data = await getIdealResults(snapshotNo, cursor)
      setPage(data)
      setItems(current => (cursor ? [...current, ...(data.items || [])] : data.items || []))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '理想型结果加载失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }
  useEffect(() => {
    void load()
  }, [snapshotNo])
  useDidShow(() => {
    if (pendingCheck.current) return
    const pending = Taro.getStorageSync(PENDING_QUOTE_KEY) as
      | { snapshotNo?: string; quoteToken?: string; requestId?: string }
      | undefined
    if (!pending?.quoteToken || pending.snapshotNo !== snapshotNo) return
    pendingCheck.current = true
    void confirmQuote(
      pending.quoteToken,
      pending.requestId || createRequestId('ideal-confirm')
    ).finally(() => {
      pendingCheck.current = false
    })
  })
  const confirmQuote = async (quoteToken: string, requestId: string) => {
    setUnlocking(true)
    try {
      const result = await confirmIdealUnlock(quoteToken, requestId)
      Taro.removeStorageSync(PENDING_QUOTE_KEY)
      await Taro.showToast({ title: `成功解锁${result.unlockedItems.length}位`, icon: 'success' })
      await load()
    } catch (error) {
      Taro.removeStorageSync(PENDING_QUOTE_KEY)
      await Taro.showToast({
        title: error instanceof Error ? error.message : '解锁失败，请重新报价',
        icon: 'none',
      })
    } finally {
      setUnlocking(false)
    }
  }
  const handleQuote = async (quoteLoader: () => Promise<IdealUnlockQuoteVO>) => {
    if (unlocking) return
    setUnlocking(true)
    try {
      const quote = await quoteLoader()
      const requestId = createRequestId('ideal-confirm')
      if (!quote.balanceEnough) {
        Taro.setStorageSync(PENDING_QUOTE_KEY, {
          snapshotNo,
          quoteToken: quote.quoteToken,
          requestId,
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
      setUnlocking(false)
    }
  }
  return (
    <View
      style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: 'PingFang SC, sans-serif' }}
    >
      <IdealResultsHeader />
      {showEmptyState ? (
        <IdealResultsEmptyState />
      ) : (
        <ScrollView
          scrollY
          showScrollbar={false}
          onScrollToLower={() => {
            if (page?.nextCursor && !loadingMore) void load(page.nextCursor)
          }}
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
              paddingBottom: '360rpx',
              position: 'relative',
            }}
          >
            {loading ? <CenterText text="理想型结果加载中…" /> : null}
            {message ? <CenterText text={message} /> : null}
            {items.map(item => (
              <IdealCandidateCard
                key={item.itemNo}
                item={item}
                onUnlock={() => void handleQuote(() => quoteIdealUnlock(snapshotNo, [item.itemNo]))}
              />
            ))}
            {loadingMore ? (
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
            {items.length ? (
              <View
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '60rpx',
                  marginTop: '30rpx',
                }}
              >
                <View
                  onClick={() => void Taro.redirectTo({ url: '/pages/prd08/ideal/filter/index' })}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <Image
                    src={miniappOssIcons.recommendReplay}
                    mode="aspectFit"
                    style={{
                      width: '25rpx',
                      height: '25rpx',
                      marginRight: '8rpx',
                      opacity: 0.58,
                    }}
                  />
                  <Text style={{ color: '#999999', fontSize: '24rpx' }}>换一批</Text>
                </View>
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
      {!showEmptyState && page?.unlockableCount ? (
        <View
          style={{
            position: 'fixed',
            left: '44rpx',
            right: '44rpx',
            bottom: '164rpx',
            zIndex: 10000,
          }}
        >
          <View
            onClick={() => void Taro.navigateTo({ url: '/pages/prd08/ideal/filter/index' })}
            style={{
              position: 'absolute',
              right: '8rpx',
              bottom: '108rpx',
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
          <View
            onClick={() => void handleQuote(() => quoteAllIdealUnlock(snapshotNo))}
            style={{
              height: '98rpx',
              borderRadius: '49rpx',
              background: BLUE,
              opacity: unlocking ? 0.62 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '34rpx', fontWeight: 600 }}>
              {unlocking ? '处理中…' : '解锁全部'}
            </Text>
            {page.pricing.discountPercent > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  right: '72rpx',
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
        </View>
      ) : null}
      <AppTabBar active="recommend" />
    </View>
  )
}

function IdealResultsHeader() {
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
          onClick={() => void Taro.switchTab({ url: '/pages/recommend/index' })}
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
          style={{ width: '52rpx', height: '52rpx' }}
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
          bottom: '210rpx',
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

function IdealCandidateCard({ item, onUnlock }: { item: IdealResultItemVO; onUnlock: () => void }) {
  const profile = item.profile
  const avatar = item.unlocked ? profile?.avatar : item.blurAvatarUrl
  const title = profile
    ? [profile.currentCity, profile.age ? `${profile.age}岁` : '', item.educationLabel]
        .filter(Boolean)
        .join('·')
    : [item.cityName, item.ageBand, item.educationLabel].filter(Boolean).join('·')
  return (
    <View
      style={{
        minHeight: '468rpx',
        marginBottom: '20rpx',
        padding: '30rpx 28rpx 28rpx',
        borderRadius: '20rpx',
        background: '#F7F8FA',
        boxSizing: 'border-box',
      }}
    >
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
          justifyContent: 'space-between',
          marginTop: '34rpx',
        }}
      >
        <Text style={{ color: '#949BAA', fontSize: '23rpx' }}>笑起来眼里有光的理想嘉宾</Text>
        <Text
          onClick={
            item.unlocked && profile
              ? () =>
                  void Taro.navigateTo({
                    url: `/pages/heart/user?targetUserId=${profile.userId}&sourceScene=ideal`,
                  })
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
