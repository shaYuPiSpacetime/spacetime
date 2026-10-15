import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useCoins } from '@/hooks/useCoins'
import { LANHU_BLUE, LanhuNav } from '@/pages/lanhu/LanhuShell'
import type { CoinTransaction } from '@/types/coin'

const TABS = ['全部', '获取', '消耗'] as const

export default function CoinsDetailPage() {
  const router = useRouter()
  const {
    transactions,
    transactionsLoading,
    fetchTransactions,
    transactionsHasMore,
    transactionsError,
    loadMoreTransactions,
  } = useCoins()
  const [active, setActive] = useState<(typeof TABS)[number]>('全部')

  useDidShow(() => {
    void fetchTransactions(active === '获取' ? 'income' : active === '消耗' ? 'expense' : undefined).catch(showLoadError)
  })

  const sourceTransactions = router.params.variant === 'empty' ? [] : transactions
  const filtered = sourceTransactions.filter((item) => {
    if (active === '获取') return item.type === 'income'
    if (active === '消耗') return item.type === 'expense'
    return true
  })

  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <LanhuNav title="千寻币明细" showBack />
      <View
        style={{
          width: '750rpx',
          height: '88rpx',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0 25rpx',
          boxSizing: 'border-box',
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab === active
          return (
            <View
              key={tab}
              style={{
                width: '156rpx',
                height: '70rpx',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                marginRight: '4rpx',
              }}
              onClick={() => {
                if (tab === active) return
                setActive(tab)
                void fetchTransactions(tab === '获取' ? 'income' : tab === '消耗' ? 'expense' : undefined).catch(showLoadError)
              }}
            >
              <Text style={{ color: isActive ? LANHU_BLUE : '#999999', fontSize: '30rpx', fontWeight: isActive ? 700 : 400 }}>
                {tab}
              </Text>
              {isActive && (
                <View
                  style={{
                    position: 'absolute',
                    left: '0',
                    bottom: '8rpx',
                    width: '48rpx',
                    height: '6rpx',
                    borderRadius: '3rpx',
                    background: LANHU_BLUE,
                  }}
                />
              )}
            </View>
          )
        })}
      </View>

      {transactionsLoading && filtered.length === 0 ? (
        <Text style={{ display: 'block', textAlign: 'center', color: '#999999', marginTop: '160rpx' }}>
          加载中...
        </Text>
      ) : transactionsError && filtered.length === 0 ? (
        <Text onClick={() => void fetchTransactions(active === '获取' ? 'income' : active === '消耗' ? 'expense' : undefined).catch(showLoadError)} style={{ display: 'block', textAlign: 'center', color: LANHU_BLUE, marginTop: '160rpx' }}>
          {transactionsError}，点击重试
        </Text>
      ) : filtered.length === 0 ? (
        <CoinNoDataState />
      ) : (
        <ScrollView scrollY onScrollToLower={() => void loadMoreTransactions().catch(showLoadError)} lowerThreshold={120} style={{ height: 'calc(100vh - 264rpx)' }} showScrollbar={false}>
          <View style={{ width: '750rpx', padding: '0 25rpx 80rpx', boxSizing: 'border-box' }}>
            {filtered.map((item) => (
              <DetailRow key={item.id} item={item} />
            ))}
            <Text onClick={() => void loadMoreTransactions().catch(showLoadError)} style={{ display: 'block', padding: '32rpx', textAlign: 'center', color: '#999999', fontSize: '24rpx' }}>
              {transactionsLoading ? '加载中…' : transactionsHasMore ? '加载更多' : '已显示全部明细'}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

function showLoadError(error: unknown) {
  void Taro.showToast({ title: error instanceof Error ? error.message : '明细加载失败，请重试', icon: 'none' })
}

function CoinNoDataState() {
  return (
    <View style={{ width: '750rpx', paddingTop: '262rpx', boxSizing: 'border-box', display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
      <Image
        id="coin-empty-illustration"
        src={miniappOssIcons.qianxunEmptyChart}
        mode="aspectFit"
        style={{ width: '334rpx', height: '251rpx' }}
      />
      <View
        style={{
          width: '664rpx',
          height: '98rpx',
          borderRadius: '14rpx',
          background: LANHU_BLUE,
          marginTop: '87rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => Taro.navigateTo({ url: '/pages/coins/index' })}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 700 }}>去充值</Text>
      </View>
    </View>
  )
}

function DetailRow({ item }: { item: CoinTransaction }) {
  const amount = item.amount > 0 ? `+${item.amount}` : `${item.amount}`
  const amountColor = item.amount > 0 ? LANHU_BLUE : '#F32B61'

  return (
    <View
      style={{
        position: 'relative',
        height: '148rpx',
        borderBottom: '1rpx solid #D9D9D9',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#333333', fontSize: '30rpx', fontWeight: 700, lineHeight: '42rpx' }}>
          {item.description}
        </Text>
        <Text style={{ display: 'block', color: '#9A9A9A', fontSize: '28rpx', lineHeight: '40rpx', marginTop: '22rpx' }}>
          {item.time}
        </Text>
      </View>
      <Text style={{ color: amountColor, fontSize: '34rpx', lineHeight: '48rpx' }}>
        {amount}
      </Text>
    </View>
  )
}
