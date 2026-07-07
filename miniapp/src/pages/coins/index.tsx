import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { useCoins, type CoinPayState } from '@/hooks/useCoins'
import { getDemoPageData } from '@/services/lanhuDemo'
import type { CoinPackage } from '@/types/coin'
import {
  LANHU_BLUE,
  LANHU_NAVY,
  LANHU_SOFT_BG,
  LanhuNav,
} from '@/pages/lanhu/LanhuShell'

import coinBalanceBg from '@/assets/lanhu/pages/coin-balance-bg.webp'

const coinsDemo = getDemoPageData('coins')
type CoinsPageVariant = 'default' | 'checked' | 'unchecked-error' | 'recharge-notice'

function resolveCoinsVariant(value?: string): CoinsPageVariant {
  if (value === 'checked' || value === 'unchecked-error' || value === 'recharge-notice') return value
  return 'default'
}

function resolveCoinPayState(value?: string): CoinPayState {
  if (value === 'wechat-pay' || value === 'pay-success' || value === 'pay-cancel') return value
  return 'idle'
}

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
  const router = useRouter()
  const variant = resolveCoinsVariant(String(router.params.variant || 'default'))
  const routePayState = resolveCoinPayState(String(router.params.payState || 'idle'))
  const [agreementChecked, setAgreementChecked] = useState(variant === 'checked')
  const [agreementError, setAgreementError] = useState(variant === 'unchecked-error')
  const [noticeVisible, setNoticeVisible] = useState(variant === 'recharge-notice')
  const {
    balance,
    packages,
    selectedPackage,
    payLoading,
    payState,
    usages,
    fetchBalance,
    fetchPackages,
    selectPackage,
    purchase,
    simulatePaySuccess,
    simulatePayCancel,
    hidePaymentLayer,
    previewPayState,
    goToDetail,
  } = useCoins()

  useEffect(() => {
    fetchBalance()
    fetchPackages()
  }, [fetchBalance, fetchPackages])

  useEffect(() => {
    if (routePayState !== 'idle') {
      previewPayState(routePayState)
    }
  }, [routePayState, previewPayState])

  const handlePay = async () => {
    if (!agreementChecked) {
      setAgreementError(true)
      Taro.showToast({ title: coinsDemo.agreement.uncheckedMessage, icon: 'none' })
      return
    }
    setAgreementError(false)
    await purchase()
  }

  const handleToggleAgreement = () => {
    setAgreementChecked((checked) => {
      const next = !checked
      if (next) setAgreementError(false)
      return next
    })
  }

  const showRechargeNotice = () => {
    setNoticeVisible(true)
  }

  return (
    <View style={{ minHeight: '100vh', background: LANHU_SOFT_BG }}>
      <LanhuNav title="成家币" showBack />
      <ScrollView scrollY style={{ height: 'calc(100vh - 176rpx)' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '6rpx 25rpx 220rpx', boxSizing: 'border-box' }}>
          <BalanceCard balance={balance} onDetail={goToDetail} />
          <RechargeCard packages={packages} selected={selectedPackage} onSelect={selectPackage} onNotice={showRechargeNotice} />
          <UsageCard usages={usages.map((item) => item.label)} />
        </View>
      </ScrollView>
      <PayBar
        checked={agreementChecked}
        error={agreementError}
        loading={payLoading}
        agreementTitle={coinsDemo.agreement.title}
        onToggle={handleToggleAgreement}
        onPay={handlePay}
      />
      <CoinsPaymentLayer
        payState={payState}
        selectedPackage={selectedPackage}
        loading={payLoading}
        onClose={hidePaymentLayer}
        onSuccess={simulatePaySuccess}
        onCancel={simulatePayCancel}
      />
      {noticeVisible && (
        <RechargeNoticeModal onClose={() => setNoticeVisible(false)} />
      )}
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
  onNotice,
}: {
  packages: CoinPackage[]
  selected: CoinPackage | null
  onSelect: (pkg: CoinPackage) => void
  onNotice: () => void
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
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }} onClick={onNotice}>
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

function CoinsPaymentLayer({
  payState,
  selectedPackage,
  loading,
  onClose,
  onSuccess,
  onCancel,
}: {
  payState: CoinPayState
  selectedPackage: CoinPackage | null
  loading: boolean
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
}) {
  if (payState === 'idle') return null

  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.48)',
        zIndex: 60,
      }}
    >
      {payState === 'wechat-pay' && (
        <WechatPayPanel
          amount={selectedPackage?.price.toFixed(2) ?? '0.00'}
          coins={selectedPackage?.amount ?? 0}
          loading={loading}
          onClose={onClose}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )}
      {payState === 'pay-success' && (
        <PayResultModal
          tone="success"
          title="支付成功"
          desc={`成家币已到账，当前套餐 ${selectedPackage?.amount ?? 0} 枚`}
          primaryText="完成"
          secondaryText="查看明细"
          onPrimary={onClose}
          onSecondary={onClose}
        />
      )}
      {payState === 'pay-cancel' && (
        <PayResultModal
          tone="cancel"
          title="取消支付"
          desc="本次充值未完成，可重新发起微信支付"
          primaryText="重新支付"
          secondaryText="关闭"
          onPrimary={onSuccess}
          onSecondary={onClose}
        />
      )}
    </View>
  )
}

function WechatPayPanel({
  amount,
  coins,
  loading,
  onClose,
  onSuccess,
  onCancel,
}: {
  amount: string
  coins: number
  loading: boolean
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '476rpx',
        borderRadius: '24rpx 24rpx 0 0',
        background: '#FFFFFF',
        padding: '34rpx 30rpx calc(32rpx + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: LANHU_NAVY, fontSize: '34rpx', fontWeight: 700 }}>微信支付</Text>
        <Text style={{ color: '#999999', fontSize: '32rpx' }} onClick={onClose}>×</Text>
      </View>
      <View
        style={{
          borderRadius: '24rpx',
          background: '#F3F8FF',
          padding: '30rpx',
          marginTop: '28rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ color: LANHU_BLUE, fontSize: '24rpx' }}>千寻币-微信支付</Text>
        <Text style={{ display: 'block', color: LANHU_NAVY, fontSize: '52rpx', fontWeight: 700, marginTop: '18rpx' }}>¥{amount}</Text>
        <Text style={{ display: 'block', color: '#777777', fontSize: '24rpx', marginTop: '10rpx' }}>充值 {coins} 枚成家币，支付成功后即时到账</Text>
      </View>
      <View
        style={{
          height: '98rpx',
          borderRadius: '98rpx',
          background: LANHU_BLUE,
          marginTop: '32rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.72 : 1,
        }}
        onClick={onSuccess}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '34rpx', fontWeight: 700 }}>{loading ? '支付中...' : '确认支付'}</Text>
      </View>
      <View
        style={{
          height: '72rpx',
          borderRadius: '16rpx',
          background: '#F3F3F3',
          marginTop: '18rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onCancel}
      >
        <Text style={{ color: '#666666', fontSize: '26rpx' }}>取消支付</Text>
      </View>
    </View>
  )
}

function PayResultModal({
  tone,
  title,
  desc,
  primaryText,
  secondaryText,
  onPrimary,
  onSecondary,
}: {
  tone: 'success' | 'cancel'
  title: string
  desc: string
  primaryText: string
  secondaryText: string
  onPrimary: () => void
  onSecondary: () => void
}) {
  const isSuccess = tone === 'success'
  return (
    <View
      style={{
        position: 'absolute',
        left: '75rpx',
        right: '75rpx',
        top: '330rpx',
        borderRadius: '24rpx',
        background: '#FFFFFF',
        padding: '44rpx 36rpx 34rpx',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          width: '96rpx',
          height: '96rpx',
          borderRadius: '48rpx',
          background: isSuccess ? LANHU_BLUE : '#F0A43A',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '50rpx', fontWeight: 700 }}>{isSuccess ? '✓' : '!'}</Text>
      </View>
      <Text style={{ display: 'block', color: LANHU_NAVY, fontSize: '36rpx', fontWeight: 700, textAlign: 'center', marginTop: '26rpx' }}>{title}</Text>
      <Text style={{ display: 'block', color: '#777777', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '16rpx' }}>{desc}</Text>
      <View
        style={{
          height: '98rpx',
          borderRadius: '98rpx',
          background: isSuccess ? LANHU_BLUE : LANHU_NAVY,
          marginTop: '34rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onPrimary}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 700 }}>{primaryText}</Text>
      </View>
      <View
        style={{
          height: '64rpx',
          borderRadius: '16rpx',
          marginTop: '14rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onSecondary}
      >
        <Text style={{ color: '#999999', fontSize: '26rpx' }}>{secondaryText}</Text>
      </View>
    </View>
  )
}

function RechargeNoticeModal({ onClose }: { onClose: () => void }) {
  const notes = [
    '成家币为平台虚拟道具，充值成功后即时到账。',
    '成家币可用于解锁嘉宾、发送心动信号等互动场景。',
    '充值成功后不支持提现，请根据需要选择套餐。',
  ]

  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.48)',
        zIndex: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 55rpx',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          width: '640rpx',
          borderRadius: '64rpx',
          background: '#FFFFFF',
          padding: '44rpx 36rpx 34rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: LANHU_NAVY, fontSize: '36rpx', fontWeight: 700, textAlign: 'center' }}>充值须知</Text>
        <View style={{ marginTop: '30rpx' }}>
          {notes.map((note, index) => (
            <View key={note} style={{ display: 'flex', flexDirection: 'row', marginBottom: '18rpx' }}>
              <View
                style={{
                  width: '32rpx',
                  height: '32rpx',
                  borderRadius: '8rpx',
                  background: '#E8F4FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '14rpx',
                  flexShrink: 0,
                }}
              >
                <Text style={{ color: LANHU_BLUE, fontSize: '20rpx', fontWeight: 700 }}>{index + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: '#666666', fontSize: '26rpx', lineHeight: '39rpx' }}>{note}</Text>
            </View>
          ))}
        </View>
        <View
          style={{
            height: '98rpx',
            borderRadius: '98rpx',
            background: LANHU_BLUE,
            marginTop: '18rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onClose}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '34rpx', fontWeight: 700 }}>我知道了</Text>
        </View>
      </View>
    </View>
  )
}

function PayBar({
  checked,
  error,
  loading,
  agreementTitle,
  onToggle,
  onPay,
}: {
  checked: boolean
  error: boolean
  loading: boolean
  agreementTitle: string
  onToggle: () => void
  onPay: () => void
}) {
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
      <View
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12rpx', paddingLeft: '8rpx' }}
        onClick={onToggle}
      >
        <View
          style={{
            width: '28rpx',
            height: '28rpx',
            borderRadius: '14rpx',
            border: checked ? '0' : `2rpx solid ${error ? '#F32B61' : '#999999'}`,
            background: checked ? LANHU_BLUE : '#FFFFFF',
            marginRight: '10rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {checked && (
            <View
              style={{
                width: '13rpx',
                height: '8rpx',
                borderLeft: '3rpx solid #FFFFFF',
                borderBottom: '3rpx solid #FFFFFF',
                transform: 'rotate(-45deg)',
                marginTop: '-3rpx',
              }}
            />
          )}
        </View>
        <Text style={{ color: '#999999', fontSize: '22rpx' }}>阅读并同意</Text>
        <Text style={{ color: LANHU_BLUE, fontSize: '22rpx' }}>{agreementTitle}</Text>
        {error && <Text style={{ color: '#F32B61', fontSize: '22rpx', marginLeft: '8rpx' }}>请先勾选</Text>}
      </View>
      <View
        style={{
          height: '98rpx',
          borderRadius: '98rpx',
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
