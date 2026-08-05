import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useState } from 'react'
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
  } = useCoins()
  const [active, setActive] = useState<(typeof TABS)[number]>('全部')

  useDidShow(() => {
    void fetchTransactions().catch(() => undefined)
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
      <View id="coin-empty-illustration" style={{ position: 'relative', width: '298rpx', height: '210rpx' }}>
        <View style={{ position: 'absolute', left: '91rpx', top: '26rpx', width: '128rpx', height: '150rpx', borderRadius: '14rpx', border: '10rpx solid #D8DEE6', boxSizing: 'border-box' }} />
        <View style={{ position: 'absolute', left: '62rpx', top: '45rpx', width: '136rpx', height: '148rpx', borderRadius: '14rpx', border: '10rpx solid #D8DEE6', background: '#FFFFFF', boxSizing: 'border-box' }} />
        <View style={{ position: 'absolute', left: '84rpx', top: '69rpx', width: '55rpx', height: '8rpx', borderRadius: '4rpx', background: '#D8DEE6' }} />
        <View style={{ position: 'absolute', left: '84rpx', top: '91rpx', width: '76rpx', height: '8rpx', borderRadius: '4rpx', background: '#D8DEE6' }} />
        <View style={{ position: 'absolute', left: '84rpx', top: '113rpx', width: '35rpx', height: '8rpx', borderRadius: '4rpx', background: '#D8DEE6' }} />
        <View style={{ position: 'absolute', left: '89rpx', top: '126rpx', width: '61rpx', height: '61rpx', borderRadius: '31rpx', border: '9rpx solid #D8DEE6', background: '#FFFFFF', boxSizing: 'border-box' }} />
        <View style={{ position: 'absolute', left: '139rpx', top: '174rpx', width: '55rpx', height: '16rpx', borderRadius: '8rpx', background: '#D8DEE6', transform: 'rotate(45deg)', transformOrigin: 'left center' }} />
        <View style={{ position: 'absolute', left: '4rpx', top: '186rpx', width: '34rpx', height: '8rpx', borderRadius: '4rpx', background: '#D8DEE6' }} />
        <View style={{ position: 'absolute', left: '198rpx', top: '166rpx', width: '54rpx', height: '8rpx', borderRadius: '4rpx', background: '#D8DEE6' }} />
        <EmptyPlusMark left="34rpx" top="4rpx" size="27rpx" />
        <EmptyPlusMark left="16rpx" top="126rpx" size="20rpx" />
        <EmptyPlusMark left="270rpx" top="108rpx" size="20rpx" />
        <EmptyRingMark left="0" top="58rpx" size="28rpx" />
        <EmptyRingMark left="246rpx" top="28rpx" size="30rpx" />
      </View>
      <Text style={{ color: '#9A9A9A', fontSize: '34rpx', lineHeight: '48rpx', marginTop: '28rpx' }}>暂无记录</Text>
      <View
        style={{
          width: '664rpx',
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

function EmptyPlusMark({
  left,
  top,
  size,
}: {
  left: string
  top: string
  size: string
}) {
  return (
    <View style={{ position: 'absolute', left, top, width: size, height: size }}>
      <View style={{ position: 'absolute', left: '0', top: '50%', width: size, height: '8rpx', borderRadius: '4rpx', background: '#D8DEE6', transform: 'translateY(-50%)' }} />
      <View style={{ position: 'absolute', left: '50%', top: '0', width: '8rpx', height: size, borderRadius: '4rpx', background: '#D8DEE6', transform: 'translateX(-50%)' }} />
    </View>
  )
}

function EmptyRingMark({
  left,
  right,
  top,
  size,
}: {
  left?: string
  right?: string
  top: string
  size: string
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        right,
        top,
        width: size,
        height: size,
        borderRadius: '50%',
        border: '10rpx solid #D8DEE6',
        boxSizing: 'border-box',
      }}
    />
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
