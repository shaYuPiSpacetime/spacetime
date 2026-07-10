import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import WechatMockPayPanel from '@/components/WechatMockPayPanel'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useCoins, type CoinPayState } from '@/hooks/useCoins'
import { getDemoPageData } from '@/services/lanhuDemo'
import type { CoinPackage } from '@/types/coin'
import {
  LANHU_BLUE,
  LANHU_NAVY,
  LANHU_SOFT_BG,
  LanhuNav,
} from '@/pages/lanhu/LanhuShell'


const coinsDemo = getDemoPageData('coins')
type CoinsPageVariant = 'default' | 'checked' | 'unchecked-error' | 'recharge-notice'
const COIN_PLAN_CARD_WIDTH_RPX = 242
const COIN_PLAN_CARD_GAP_RPX = 6
const COIN_PLAN_SELECTED_LEFT_RPX = 150
const COIN_USAGE_ITEMS = [
  { label: '送悄悄话', icon: miniappOssIcons.coinUsageWhisper },
  { label: '心动信号', icon: miniappOssIcons.coinUsageHeartbeat },
  { label: '解锁理想型', icon: miniappOssIcons.coinUsageIdealUnlock },
  { label: '提升人气', icon: miniappOssIcons.coinUsageBoost },
  { label: '解锁精选', icon: miniappOssIcons.coinUsageCuratedUnlock },
  { label: '更多推荐', icon: miniappOssIcons.coinUsageRecommend },
  { label: '匿名解锁', icon: miniappOssIcons.coinUsageAnonymousUnlock },
  { label: '限定活动', icon: miniappOssIcons.coinUsageLimitedActivity },
] as const

function resolveCoinsVariant(value?: string): CoinsPageVariant {
  if (value === 'checked' || value === 'unchecked-error' || value === 'recharge-notice') return value
  return 'default'
}

function resolveCoinPayState(value?: string): CoinPayState {
  if (value === 'wechat-pay' || value === 'pay-success' || value === 'pay-cancel') return value
  return 'idle'
}

export default function CoinsPage() {
  const router = useRouter()
  const variant = resolveCoinsVariant(String(router.params.variant || 'default'))
  const routePayState = resolveCoinPayState(String(router.params.payState || 'idle'))
  const [agreementChecked, setAgreementChecked] = useState(variant === 'checked' || routePayState !== 'idle')
  const [agreementError, setAgreementError] = useState(variant === 'unchecked-error')
  const [noticeVisible, setNoticeVisible] = useState(variant === 'recharge-notice')
  const {
    balance,
    packages,
    selectedPackage,
    payLoading,
    payState,
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
      return
    }
    setAgreementError(false)
    await purchase()
  }

  const handleAgreementConfirm = async () => {
    setAgreementChecked(true)
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
    <View
      style={{
        height: '100vh',
        background: LANHU_SOFT_BG,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <LanhuNav title="千寻币" showBack />
      <ScrollView
        scrollY
        enableFlex
        style={{
          flex: 1,
          height: '0',
          minHeight: '0',
        }}
        showScrollbar={false}
      >
        <View style={{ width: '750rpx', padding: '6rpx 25rpx 48rpx', boxSizing: 'border-box' }}>
          <BalanceCard balance={balance} onDetail={goToDetail} />
          <RechargeCard packages={packages} selected={selectedPackage} onSelect={selectPackage} onNotice={showRechargeNotice} />
          <UsageCard />
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
        onClose={hidePaymentLayer}
        onSuccess={simulatePaySuccess}
        onCancel={simulatePayCancel}
      />
      {agreementError && (
        <AgreementConfirmSheet
          agreementTitle={coinsDemo.agreement.title}
          onContinue={handleAgreementConfirm}
        />
      )}
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
        background: 'linear-gradient(135deg, #78A4FF 0%, #2E75F6 100%)',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          right: '46rpx',
          top: '-72rpx',
          width: '154rpx',
          height: '154rpx',
          borderRadius: '76rpx',
          background: 'rgba(255, 255, 255, 0.08)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '-22rpx',
          bottom: '-86rpx',
          width: '246rpx',
          height: '246rpx',
          borderRadius: '123rpx',
          background: 'rgba(255, 255, 255, 0.06)',
        }}
      />
      <Text style={{ position: 'absolute', left: '32rpx', top: '48rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>
        千寻币余额
      </Text>
      <Text style={{ position: 'absolute', left: '32rpx', top: '91rpx', color: '#FFFFFF', fontSize: '48rpx', fontWeight: 700, lineHeight: '67rpx' }}>
        {balance}
      </Text>
      <View
        style={{ position: 'absolute', right: '28rpx', top: '78rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        onClick={onDetail}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>明细</Text>
        <CoinChevronIcon color="#FFFFFF" size="20rpx" marginLeft="6rpx" />
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
  const selectedIndex = Math.max(0, packages.findIndex((pkg) => pkg.id === selected?.id))
  const viewportWidth = Taro.getWindowInfo().windowWidth || 375
  const railScrollLeft = Math.max(
    0,
    selectedIndex * (COIN_PLAN_CARD_WIDTH_RPX + COIN_PLAN_CARD_GAP_RPX) - COIN_PLAN_SELECTED_LEFT_RPX,
  ) * viewportWidth / 750

  return (
    <View
      style={{
        width: '700rpx',
        height: '338rpx',
        borderRadius: '12rpx',
        background: '#FFFFFF',
        marginTop: '20rpx',
        padding: '27rpx 30rpx 0',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: LANHU_NAVY, fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>充值千寻币</Text>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }} onClick={onNotice}>
          <Text style={{ color: '#9D9D9D', fontSize: '24rpx', lineHeight: '33rpx' }}>充值须知</Text>
          <CoinChevronIcon color="#9D9D9D" size="18rpx" marginLeft="8rpx" />
        </View>
      </View>
      <ScrollView
        scrollX
        scrollLeft={railScrollLeft}
        scrollWithAnimation
        showScrollbar={false}
        style={{ width: '640rpx', marginTop: '25rpx' }}
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: `${Math.max(640, packages.length * (COIN_PLAN_CARD_WIDTH_RPX + COIN_PLAN_CARD_GAP_RPX) - COIN_PLAN_CARD_GAP_RPX)}rpx`,
            height: '198rpx',
            paddingTop: '15rpx',
            boxSizing: 'border-box',
          }}
        >
          {packages.map((pkg) => {
            const isSelected = selected?.id === pkg.id
            return (
              <View
                key={pkg.id}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: '242rpx',
                  height: '183rpx',
                  borderRadius: '12rpx',
                  border: isSelected ? `4rpx solid ${LANHU_BLUE}` : '2rpx solid #CED4DF',
                  background: isSelected ? '#E8F4FF' : '#F8FAFE',
                  marginRight: '6rpx',
                  padding: '33rpx 26rpx 29rpx',
                  boxSizing: 'border-box',
                }}
                onClick={() => onSelect(pkg)}
              >
                {pkg.tag && (
                  <View
                    style={{
                      position: 'absolute',
                      left: '20rpx',
                      top: '-15rpx',
                      height: '36rpx',
                      borderRadius: '8rpx',
                      background: '#F32B61',
                      padding: '0 13rpx',
                      display: 'flex',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '22rpx' }}>{pkg.tag}</Text>
                  </View>
                )}
                <CoinAmountLabel amount={pkg.amount} />
                {pkg.originalPrice && pkg.discountLabel ? (
                  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '2rpx' }}>
                    <Text style={{ color: '#9A9A9A', fontSize: '18rpx', lineHeight: '25rpx', textDecorationLine: 'line-through' }}>{pkg.originalPrice}</Text>
                    <View
                      style={{
                        borderRadius: '4rpx',
                        background: '#FFD5E2',
                        padding: '2rpx 9rpx 1rpx',
                        marginLeft: '8rpx',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#F32B61', fontSize: '12rpx', lineHeight: '17rpx' }}>{pkg.discountLabel}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ display: 'block', color: '#999999', fontSize: '18rpx', lineHeight: '25rpx', marginTop: '2rpx' }}>{pkg.label}</Text>
                )}
                <View style={{ display: 'flex', flexDirection: 'row', width: '142rpx', height: '53rpx' }}>
                  <Text style={{ color: isSelected ? LANHU_BLUE : LANHU_NAVY, fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>¥</Text>
                  <Text style={{ color: isSelected ? LANHU_BLUE : LANHU_NAVY, fontSize: '38rpx', fontWeight: 600, lineHeight: '40rpx' }}>
                    {Number(pkg.price).toFixed(2)}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

function CoinChevronIcon({
  color,
  size,
  marginLeft,
}: {
  color: string
  size: string
  marginLeft: string
}) {
  return (
    <View style={{ position: 'relative', width: size, height: size, marginLeft }}>
      <View
        style={{
          position: 'absolute',
          right: '2rpx',
          top: '3rpx',
          width: `calc(${size} - 6rpx)`,
          height: `calc(${size} - 6rpx)`,
          borderTop: `4rpx solid ${color}`,
          borderRight: `4rpx solid ${color}`,
          transform: 'rotate(45deg)',
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}

function CoinAmountLabel({ amount }: { amount: number }) {
  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <Image src={miniappOssIcons.coinGold} mode="scaleToFill" style={{ width: '19rpx', height: '19rpx', marginRight: '10rpx' }} />
      <Text style={{ color: LANHU_NAVY, fontSize: '26rpx', fontWeight: 600, lineHeight: '37rpx' }}>{amount}</Text>
    </View>
  )
}

function UsageCard() {
  return (
    <View
      style={{
        width: '700rpx',
        height: '478rpx',
        borderRadius: '12rpx',
        background: '#FFFFFF',
        marginTop: '20rpx',
        overflow: 'hidden',
        boxSizing: 'border-box',
        paddingTop: '30rpx',
      }}
    >
      <Text style={{ display: 'block', marginLeft: '31rpx', color: LANHU_NAVY, fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx' }}>
        千寻币用途
      </Text>
      <View
        style={{
          width: '720rpx',
          marginLeft: '-10rpx',
          marginTop: '25rpx',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {COIN_USAGE_ITEMS.map((usage) => (
          <View
            key={usage.label}
            style={{
              width: '180rpx',
              height: '178rpx',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Image src={usage.icon} mode="scaleToFill" style={{ width: '99rpx', height: '99rpx' }} />
            <Text style={{ color: LANHU_NAVY, fontSize: '24rpx', lineHeight: '34rpx', marginTop: '16rpx', whiteSpace: 'nowrap' }}>
              {usage.label}
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
  onClose,
  onSuccess,
  onCancel,
}: {
  payState: CoinPayState
  selectedPackage: CoinPackage | null
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
}) {
  if (payState === 'idle') return null

  if (payState === 'pay-success') {
    return <PayResultModal title="支付成功" />
  }

  if (payState === 'pay-cancel') {
    return <PayResultModal title="用户取消支付" />
  }

  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.32)',
        zIndex: 60,
      }}
    >
      {payState === 'wechat-pay' && (
        <WechatPayDemoFallback
          amount={selectedPackage?.price.toFixed(2) ?? '0.00'}
          onClose={onClose}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )}
    </View>
  )
}

// 微信原生支付面板由 wx.requestPayment 唤起；这里仅用于蓝湖 demo fallback。
function WechatPayDemoFallback({
  amount,
  onClose,
  onSuccess,
  onCancel,
}: {
  amount: string
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
}) {
  return <WechatMockPayPanel amount={amount} onClose={onClose} onSuccess={onSuccess} onCancel={onCancel} />
}

function PayResultModal({ title }: { title: string }) {
  return (
    <View
      style={{
        position: 'fixed',
        left: '231rpx',
        top: '393rpx',
        width: '288rpx',
        height: '98rpx',
        borderRadius: '12rpx',
        background: '#ADADAD',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        zIndex: 80,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: '34rpx' }}>{title}</Text>
    </View>
  )
}

function RechargeNoticeModal({ onClose }: { onClose: () => void }) {
  const rechargeNotice = coinsDemo.rechargeNotice

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
        justifyContent: 'flex-start',
        padding: '386rpx 65rpx 0',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          width: '620rpx',
          height: '538rpx',
          borderRadius: '64rpx',
          background: '#FFFFFF',
          padding: '54rpx 46rpx 36rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: '#333333', fontSize: '36rpx', fontWeight: 700, textAlign: 'center' }}>{rechargeNotice.title}</Text>
        <View style={{ marginTop: '44rpx' }}>
          <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>{rechargeNotice.faqTitle}</Text>
          {rechargeNotice.items.map((note) => (
            <Text key={note} style={{ display: 'block', color: '#333333', fontSize: '28rpx', lineHeight: '42rpx', marginTop: '12rpx' }}>{note}</Text>
          ))}
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', marginTop: '46rpx' }}>
          <View
            style={{
              flex: 1,
              height: '84rpx',
              borderRadius: '8rpx',
              background: '#F7F7F7',
              marginRight: '22rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={onClose}
          >
            <Text style={{ color: '#333333', fontSize: '30rpx', fontWeight: 700 }}>{rechargeNotice.contactText}</Text>
          </View>
          <View
            style={{
              flex: 1,
              height: '84rpx',
              borderRadius: '8rpx',
              background: LANHU_BLUE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={onClose}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 700 }}>{rechargeNotice.confirmText}</Text>
          </View>
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
        width: '750rpx',
        flexShrink: 0,
        background: '#FFFFFF',
        padding: '20rpx 44rpx max(30rpx, env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
        zIndex: 20,
      }}
    >
      <View
        style={{
          height: '98rpx',
          borderRadius: '14rpx',
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
      <View
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '24rpx' }}
        onClick={onToggle}
      >
        <View
          style={{
            width: '32rpx',
            height: '32rpx',
            borderRadius: '16rpx',
            border: checked ? '0' : `2rpx solid ${error ? '#F32B61' : '#999999'}`,
            background: checked ? LANHU_BLUE : '#FFFFFF',
            marginRight: '16rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {checked && (
            <View
              style={{
                width: '17rpx',
                height: '10rpx',
                borderLeft: '4rpx solid #FFFFFF',
                borderBottom: '4rpx solid #FFFFFF',
                transform: 'rotate(-45deg)',
                marginTop: '-4rpx',
              }}
            />
          )}
        </View>
        <Text style={{ color: error ? '#B7B7B7' : '#333333', fontSize: '28rpx' }}>阅读并同意</Text>
        <Text style={{ color: LANHU_BLUE, fontSize: '28rpx' }}>{agreementTitle}</Text>
      </View>
    </View>
  )
}

function AgreementConfirmSheet({
  agreementTitle,
  onContinue,
}: {
  agreementTitle: string
  onContinue: () => void
}) {
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.32)',
        zIndex: 55,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <View
        style={{
          width: '750rpx',
          height: '388rpx',
          borderRadius: '40rpx 40rpx 0 0',
          background: '#FFFFFF',
          padding: '107rpx 44rpx 0',
          boxSizing: 'border-box',
        }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#A9A9A9', fontSize: '32rpx' }}>我已阅读并同意</Text>
          <Text style={{ color: LANHU_BLUE, fontSize: '32rpx' }}>{agreementTitle}</Text>
        </View>
        <View
          style={{
            height: '98rpx',
            borderRadius: '14rpx',
            background: LANHU_BLUE,
            marginTop: '62rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onContinue}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 700 }}>继续支付</Text>
        </View>
      </View>
    </View>
  )
}
