import { ScrollView, Text, View } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { useCoins } from '@/hooks/useCoins'
import { LANHU_BLUE, LANHU_NAVY, LanhuNav } from '@/pages/lanhu/LanhuShell'
import type { CoinTransaction } from '@/types/coin'

const TABS = ['全部', '获取', '消耗'] as const

export default function CoinsDetailPage() {
  const {
    transactions,
    transactionsLoading,
    fetchTransactions,
  } = useCoins()
  const [active, setActive] = useState<(typeof TABS)[number]>('全部')

  useLoad(() => {
    fetchTransactions()
  })

  const filtered = transactions.filter((item) => {
    if (active === '获取') return item.type === 'income'
    if (active === '消耗') return item.type === 'expense'
    return true
  })

  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <LanhuNav title="成家币明细" showBack />
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
              onClick={() => setActive(tab)}
            >
              <Text style={{ color: isActive ? LANHU_NAVY : '#999999', fontSize: '30rpx', fontWeight: isActive ? 700 : 400 }}>
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

      {transactionsLoading ? (
        <Text style={{ display: 'block', textAlign: 'center', color: '#999999', marginTop: '160rpx' }}>
          加载中...
        </Text>
      ) : filtered.length === 0 ? (
        <Text style={{ display: 'block', textAlign: 'center', color: '#999999', marginTop: '160rpx' }}>
          暂无交易记录
        </Text>
      ) : (
        <ScrollView scrollY style={{ height: 'calc(100vh - 264rpx)' }} showScrollbar={false}>
          <View style={{ width: '750rpx', padding: '0 25rpx 80rpx', boxSizing: 'border-box' }}>
            {filtered.map((item) => (
              <DetailRow key={item.id} item={item} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

function DetailRow({ item }: { item: CoinTransaction }) {
  const amount = item.amount > 0 ? `+${item.amount}` : `${item.amount}`

  return (
    <View
      style={{
        position: 'relative',
        height: '152rpx',
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
      <Text style={{ color: LANHU_BLUE, fontSize: '34rpx', lineHeight: '48rpx' }}>
        {amount}
      </Text>
    </View>
  )
}
