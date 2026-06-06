import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useEffect } from 'react'
import { useCoins } from '@/hooks/useCoins'
import type { CoinPackage } from '@/types/coin'
import {
  LANHU_BLUE,
  LANHU_NAVY,
  LANHU_SOFT_BG,
  LanhuNav,
} from '@/pages/lanhu/LanhuShell'

import coinBalanceBg from '@/assets/lanhu/pages/coin-balance-bg.png'

const USAGE_ICONS: Record<string, string> = {
  '送悄悄话': 'yo',
  '心动信号': '♡',
  '解锁理想型': '☻',
  '提升人气': 'ϟ',
  '解锁精选': '✦',
  '更多推荐': '☆',
  '匿名解锁': '∞',
  '限定活动': '◇',
}

export default function CoinsPage() {
  const {
    balance,
    packages,
    selectedPackage,
    payLoading,
    usages,
    fetchBalance,
    fetchPackages,
    selectPackage,
    purchase,
    goToDetail,
  } = useCoins()

  useEffect(() => {
    fetchBalance()
    fetchPackages()
  }, [fetchBalance, fetchPackages])

  return (
    <View style={{ minHeight: '100vh', background: LANHU_SOFT_BG }}>
      <LanhuNav title="成家币" showBack />
      <ScrollView scrollY style={{ height: 'calc(100vh - 176rpx)' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '6rpx 25rpx 220rpx', boxSizing: 'border-box' }}>
          <BalanceCard balance={balance} onDetail={goToDetail} />
          <RechargeCard packages={packages} selected={selectedPackage} onSelect={selectPackage} />
          <UsageCard usages={usages.map((item) => item.label)} />
        </View>
      </ScrollView>
      <PayBar loading={payLoading} onPay={purchase} />
    </View>
  )
}

function BalanceCard({ balance, onDetail }: { balance: number; onDetail: () => void }) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '190rpx',
        borderRadius: '12rpx',
        overflow: 'hidden',
      }}
    >
      <Image src={coinBalanceBg} mode="scaleToFill" style={{ width: '700rpx', height: '190rpx' }} />
      <Text style={{ position: 'absolute', left: '32rpx', top: '48rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>
        成家币余额
      </Text>
      <Text style={{ position: 'absolute', left: '32rpx', top: '91rpx', color: '#FFFFFF', fontSize: '48rpx', fontWeight: 700, lineHeight: '67rpx' }}>
        {balance}
      </Text>
      <View
        style={{ position: 'absolute', right: '28rpx', top: '78rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        onClick={onDetail}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>明细</Text>
        <Text style={{ color: '#FFFFFF', fontSize: '40rpx', lineHeight: '40rpx', marginLeft: '4rpx' }}>›</Text>
      </View>
    </View>
  )
}

function RechargeCard({
  packages,
  selected,
  onSelect,
}: {
  packages: CoinPackage[]
  selected: CoinPackage | null
  onSelect: (pkg: CoinPackage) => void
}) {
  return (
    <View
      style={{
        width: '700rpx',
        height: '338rpx',
        borderRadius: '12rpx',
        background: '#FFFFFF',
        marginTop: '20rpx',
        padding: '32rpx 31rpx',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: LANHU_NAVY, fontSize: '32rpx', fontWeight: 700 }}>充值成家币</Text>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#9D9D9D', fontSize: '26rpx' }}>充值须知</Text>
          <Text style={{ color: '#9D9D9D', fontSize: '38rpx', marginLeft: '6rpx' }}>›</Text>
        </View>
      </View>
      <ScrollView scrollX showScrollbar={false} style={{ width: '668rpx', marginTop: '31rpx', marginLeft: '-68rpx' }}>
        <View style={{ display: 'flex', flexDirection: 'row', paddingLeft: '0' }}>
          {packages.map((pkg) => {
            const isSelected = selected?.id === pkg.id
            return (
              <View
                key={pkg.id}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: '238rpx',
                  height: '178rpx',
                  borderRadius: '12rpx',
                  border: isSelected ? `4rpx solid ${LANHU_BLUE}` : '2rpx solid #CED4DF',
                  background: isSelected ? '#E8F4FF' : '#F8FAFE',
                  marginRight: '12rpx',
                  padding: '36rpx 24rpx 18rpx',
                  boxSizing: 'border-box',
                }}
                onClick={() => onSelect(pkg)}
              >
                {pkg.tag && (
                  <View
                    style={{
                      position: 'absolute',
                      left: '18rpx',
                      top: '-18rpx',
                      height: '36rpx',
                      borderRadius: '8rpx',
                      background: '#F32B61',
                      padding: '0 18rpx',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: '22rpx' }}>{pkg.tag}</Text>
                  </View>
                )}
                <Text style={{ color: LANHU_NAVY, fontSize: '30rpx', fontWeight: 700 }}>¥ {pkg.amount}</Text>
                <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', marginTop: '6rpx' }}>{pkg.label}</Text>
                <Text style={{ display: 'block', color: isSelected ? LANHU_BLUE : LANHU_NAVY, fontSize: '42rpx', fontWeight: 700, marginTop: '14rpx' }}>
                  ¥{pkg.price}.00
                </Text>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

function UsageCard({ usages }: { usages: string[] }) {
  return (
    <View
      style={{
        width: '700rpx',
        minHeight: '520rpx',
        borderRadius: '12rpx',
        background: '#FFFFFF',
        marginTop: '20rpx',
        padding: '32rpx 31rpx 40rpx',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ color: LANHU_NAVY, fontSize: '32rpx', fontWeight: 700 }}>成家币用途</Text>
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '36rpx' }}>
        {usages.slice(0, 8).map((label) => (
          <View
            key={label}
            style={{
              width: '25%',
              height: '176rpx',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: '98rpx',
                height: '98rpx',
                borderRadius: '49rpx',
                background: 'linear-gradient(180deg, #7499FB 0%, #2876FF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: USAGE_ICONS[label] === 'yo' ? '36rpx' : '46rpx', fontWeight: 700 }}>
                {USAGE_ICONS[label] ?? '○'}
              </Text>
            </View>
            <Text style={{ color: LANHU_NAVY, fontSize: '26rpx', lineHeight: '37rpx', marginTop: '18rpx', textAlign: 'center' }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function PayBar({ loading, onPay }: { loading: boolean; onPay: () => void }) {
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#FFFFFF',
        padding: '18rpx 25rpx calc(20rpx + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
        zIndex: 20,
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12rpx', paddingLeft: '8rpx' }}>
        <View style={{ width: '28rpx', height: '28rpx', borderRadius: '14rpx', border: '1rpx solid #999999', marginRight: '10rpx' }} />
        <Text style={{ color: '#999999', fontSize: '22rpx' }}>阅读并同意</Text>
        <Text style={{ color: LANHU_BLUE, fontSize: '22rpx' }}>《时空邂逅充值协议》</Text>
      </View>
      <View
        style={{
          height: '88rpx',
          borderRadius: '20rpx',
          background: LANHU_BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.72 : 1,
        }}
        onClick={onPay}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 700 }}>{loading ? '支付中...' : '立即支付'}</Text>
      </View>
    </View>
  )
}
