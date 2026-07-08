import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { useCoins } from '@/hooks/useCoins'
import { LANHU_BLUE, LANHU_NAVY, LanhuNav } from '@/pages/lanhu/LanhuShell'
import type { CoinTransaction } from '@/types/coin'

const TABS = ['全部', '获取', '消耗'] as const

export default function CoinsDetailPage() {
  const router = useRouter()
  const variant = String(router.params.variant || 'default')
  const forceEmpty = variant === 'empty'
  const {
    transactions,
    transactionsLoading,
    fetchTransactions,
  } = useCoins()
  const [active, setActive] = useState<(typeof TABS)[number]>('全部')

  useLoad(() => {
    fetchTransactions()
  })

  const filtered = forceEmpty ? [] : transactions.filter((item) => {
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
              onClick={() => setActive(tab)}
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
      ) : filtered.length === 0 ? (
        <EmptyState />
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

function EmptyState() {
  return (
    <View style={{ width: '750rpx', paddingTop: '262rpx', boxSizing: 'border-box', display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
      <View style={{ position: 'relative', width: '298rpx', height: '210rpx' }}>
        <View style={{ position: 'absolute', left: '78rpx', top: '28rpx', width: '134rpx', height: '154rpx', borderRadius: '18rpx', border: '12rpx solid #D8DEE6' }} />
        <View style={{ position: 'absolute', left: '44rpx', top: '64rpx', width: '134rpx', height: '130rpx', borderRadius: '18rpx', border: '12rpx solid #D8DEE6', background: '#FFFFFF' }} />
        <View style={{ position: 'absolute', left: '82rpx', top: '108rpx', width: '66rpx', height: '66rpx', borderRadius: '33rpx', border: '10rpx solid #D8DEE6' }} />
        <View style={{ position: 'absolute', left: '137rpx', top: '162rpx', width: '58rpx', height: '18rpx', borderRadius: '9rpx', background: '#D8DEE6', transform: 'rotate(45deg)' }} />
        <View style={{ position: 'absolute', left: '76rpx', top: '84rpx', width: '78rpx', height: '10rpx', borderRadius: '5rpx', background: '#D8DEE6' }} />
        <View style={{ position: 'absolute', left: '76rpx', top: '118rpx', width: '98rpx', height: '10rpx', borderRadius: '5rpx', background: '#D8DEE6' }} />
        <Text style={{ position: 'absolute', left: '0', top: '58rpx', color: '#D8DEE6', fontSize: '52rpx', fontWeight: 700 }}>+</Text>
        <Text style={{ position: 'absolute', right: '0', top: '88rpx', color: '#D8DEE6', fontSize: '42rpx', fontWeight: 700 }}>。</Text>
      </View>
      <Text style={{ color: '#9A9A9A', fontSize: '34rpx', lineHeight: '48rpx', marginTop: '28rpx' }}>暂无记录</Text>
      <View
        style={{
          width: '662rpx',
          height: '98rpx',
          borderRadius: '14rpx',
          background: LANHU_BLUE,
          marginTop: '52rpx',
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
      <Text style={{ color: amountColor, fontSize: '34rpx', lineHeight: '48rpx' }}>
        {amount}
      </Text>
    </View>
  )
}
