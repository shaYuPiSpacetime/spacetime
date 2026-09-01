import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useCoins, type CoinPayState } from '@/hooks/useCoins'
import type { CoinPackage } from '@/types/coin'
import {
  LANHU_BLUE,
  LANHU_NAVY,
  LANHU_SOFT_BG,
  LanhuNav,
} from '@/pages/lanhu/LanhuShell'


const COIN_PLAN_CARD_WIDTH_RPX = 240
const COIN_PLAN_CARD_GAP_RPX = 8
const COIN_PLAN_SELECTED_LEFT_RPX = 153
const COIN_AGREEMENT_TITLE = '《时空邂逅充值协议》'
const RECHARGE_NOTICE = {
  title: '充值须知',
  faqTitle: '常见问题',
  items: [
    '1.微信支付显示成功后，若千寻币数量没有更新，可以退出该页面再重新进入(有时充值会有延迟，不要着急~~)',
    '2.若千寻币数量长时未更新，请截取微信支付成功详情页面，联系客服并将截图发送给客服进行反馈，我们会及时帮你处理~',
  ],
  contactText: '联系客服',
  confirmText: '好的',
}

export default function CoinsPage() {
  const router = useRouter()
  const sourceScene = String(router.params.sourceScene || '')
  const variant = String(router.params.variant || '')
  const [routePayState, setRoutePayState] = useState(() => resolveCoinPayState(router.params.payState))
  const [agreementChecked, setAgreementChecked] = useState(variant === 'checked' || routePayState !== 'idle')
  const [agreementError, setAgreementError] = useState(variant === 'unchecked-error')
  const [noticeVisible, setNoticeVisible] = useState(variant === 'recharge-notice')
  const {
    balance,
    packages,
    selectedPackage,
    payLoading,
    payState,
    paymentErrorMessage,
    fetchBalance,
    fetchPackages,
    fetchScenes,
    selectPackage,
    purchase,
    hidePaymentLayer,
    goToDetail,
    usages,
  } = useCoins()

  useEffect(() => {
    fetchBalance()
    fetchPackages()
    fetchScenes()
  }, [fetchBalance, fetchPackages, fetchScenes])

  const handlePay = async () => {
    if (!agreementChecked) {
      setAgreementError(true)
      return
    }
    setAgreementError(false)
    await purchase('coins')
  }

  const handleAgreementConfirm = async () => {
    setAgreementChecked(true)
    setAgreementError(false)
    await purchase('coins')
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

  const visiblePayState = payState === 'idle' ? routePayState : payState

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
          <UsageCard usages={usages} />
        </View>
      </ScrollView>
      <PayBar
        checked={agreementChecked}
        error={agreementError}
        loading={payLoading}
        agreementTitle={COIN_AGREEMENT_TITLE}
        onToggle={handleToggleAgreement}
        onPay={handlePay}
      />
      <CoinsPaymentLayer
        payState={visiblePayState}
        failureMessage={paymentErrorMessage}
        onClose={() => {
          const wasSuccess = visiblePayState === 'pay-success'
          if (payState === 'idle') setRoutePayState('idle')
          else hidePaymentLayer()
          if (wasSuccess && sourceScene) Taro.navigateBack({ delta: 1 })
        }}
      />
      {agreementError && (
        <AgreementConfirmSheet
          agreementTitle={COIN_AGREEMENT_TITLE}
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
        height: '188rpx',
        borderRadius: '12rpx',
        background: '#2F79FE',
        overflow: 'hidden',
      }}
    >
      <Image
        src={miniappOssIcons.coinBalanceBackground}
        mode="scaleToFill"
        style={{ position: 'absolute', inset: 0, width: '700rpx', height: '188rpx', pointerEvents: 'none' }}
      />
      <Text style={{ position: 'absolute', left: '32rpx', top: '48rpx', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>
        千寻币余额
      </Text>
      <Text style={{ position: 'absolute', left: '32rpx', top: '91rpx', color: '#FFFFFF', fontSize: '48rpx', fontWeight: 700, lineHeight: '67rpx' }}>
        {balance}
      </Text>
      <View
        style={{ position: 'absolute', right: '28rpx', top: '82rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        onClick={onDetail}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 600 }}>明细</Text>
        <CoinChevronIcon color="#FFFFFF" size="20rpx" marginLeft="6rpx" />
      </View>
    </View>
  )
}

function resolveCoinPayState(value: unknown): CoinPayState {
  if (value === 'wechat-pay') return 'paying'
  if (value === 'pay-success' || value === 'pay-cancel' || value === 'pay-failed') return value
  return 'idle'
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
            paddingTop: '16rpx',
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
                  width: '240rpx',
                  height: '184rpx',
                  borderRadius: '12rpx',
                  border: isSelected ? `4rpx solid ${LANHU_BLUE}` : '2rpx solid #CED2DA',
                  background: isSelected ? '#E3F1FE' : '#F7F8FA',
                  marginRight: '8rpx',
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
                      background: '#EE2559',
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
                    <Text style={{ color: '#999999', fontSize: '20rpx', lineHeight: '28rpx', textDecorationLine: 'line-through' }}>{pkg.originalPrice}</Text>
                    <View
                      style={{
                        borderRadius: '4rpx',
                        background: '#FEDEE4',
                        padding: '2rpx 8rpx 1rpx',
                        marginLeft: '8rpx',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#EE2559', fontSize: '18rpx', lineHeight: '24rpx' }}>{pkg.discountLabel}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ display: 'block', color: '#999999', fontSize: '18rpx', lineHeight: '25rpx', marginTop: '2rpx' }}>{pkg.label}</Text>
                )}
                <View style={{ display: 'flex', flexDirection: 'row', width: '142rpx', height: '53rpx' }}>
                  <Text style={{ color: isSelected ? LANHU_BLUE : LANHU_NAVY, fontSize: '28rpx', fontWeight: 600, lineHeight: '44rpx' }}>¥</Text>
                  <Text style={{ color: isSelected ? LANHU_BLUE : LANHU_NAVY, fontSize: '40rpx', fontWeight: 600, lineHeight: '44rpx' }}>
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
      <Text style={{ color: LANHU_NAVY, fontSize: '30rpx', fontWeight: 500, lineHeight: '40rpx' }}>{amount}</Text>
    </View>
  )
}

function UsageCard({ usages }: { usages: Array<{ code: string; icon: string; label: string; price: number }> }) {
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
        {usages.map((usage) => (
          <View
            key={usage.code}
            style={{
              width: '180rpx',
              height: '178rpx',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {usage.icon ? (
              <Image src={usage.icon} mode="scaleToFill" style={{ width: '99rpx', height: '99rpx' }} />
            ) : (
              <View style={{ width: '99rpx', height: '99rpx', borderRadius: '50%', background: '#E8F4FF' }} />
            )}
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
  failureMessage,
  onClose,
}: {
  payState: CoinPayState
  failureMessage: string
  onClose: () => void
}) {
  if (payState === 'idle') return null

  if (payState === 'pay-success') {
    return <PayResultModal title="支付成功" onClose={onClose} />
  }

  if (payState === 'pay-cancel') {
    return <PayResultModal title="用户取消支付" onClose={onClose} />
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
      <View style={{ position: 'absolute', left: '175rpx', top: '500rpx', width: '400rpx', padding: '30rpx', borderRadius: '16rpx', background: '#FFFFFF', display: 'flex', alignItems: 'center' }}>
        <Text style={{ color: LANHU_NAVY, fontSize: '28rpx' }}>
          {payState === 'paying' ? '正在打开微信支付并确认到账...' : failureMessage || '支付未完成，请稍后重试'}
        </Text>
        {payState !== 'paying' && (
          <View onClick={onClose} style={{ marginTop: '24rpx', padding: '12rpx 36rpx', borderRadius: '10rpx', background: LANHU_BLUE }}>
            <Text style={{ color: '#FFFFFF', fontSize: '26rpx' }}>知道了</Text>
          </View>
        )}
      </View>
    </View>
  )
}

function PayResultModal({ title, onClose }: { title: string; onClose: () => void }) {
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
      onClick={onClose}
    >
      <Text style={{ color: '#FFFFFF', fontSize: '34rpx' }}>{title}</Text>
    </View>
  )
}

function RechargeNoticeModal({ onClose }: { onClose: () => void }) {
  const rechargeNotice = RECHARGE_NOTICE

  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(51, 51, 51, 0.4)',
        zIndex: 70,
      }}
    >
      <View
        id="recharge-notice-card"
        style={{
          position: 'absolute',
          left: '65rpx',
          top: '386rpx',
          width: '620rpx',
          height: '538rpx',
          borderRadius: '32rpx',
          background: '#FFFFFF',
          padding: '51rpx 45rpx 28rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: '#333333', fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx', textAlign: 'center' }}>{rechargeNotice.title}</Text>
        <Text
          id="recharge-notice-body"
          style={{
            display: 'block',
            width: '530rpx',
            height: '282rpx',
            color: '#333333',
            fontSize: '24rpx',
            lineHeight: '40rpx',
            marginTop: '30rpx',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
          }}
        >
          {`${rechargeNotice.faqTitle}\n${rechargeNotice.items.join('\n')}`}
        </Text>
        <View style={{ display: 'flex', flexDirection: 'row', width: '530rpx', marginTop: '34rpx' }}>
          <View
            style={{
              width: '253rpx',
              height: '68rpx',
              borderRadius: '8rpx',
              background: '#F9F9FA',
              marginRight: '24rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={onClose}
          >
            <Text style={{ color: '#333333', fontSize: '24rpx', fontWeight: 500, lineHeight: '33rpx' }}>{rechargeNotice.contactText}</Text>
          </View>
          <View
            style={{
              width: '253rpx',
              height: '68rpx',
              borderRadius: '8rpx',
              background: LANHU_BLUE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={onClose}
          >
            <Text style={{ color: '#FAFBFC', fontSize: '24rpx', fontWeight: 500, lineHeight: '33rpx' }}>{rechargeNotice.confirmText}</Text>
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
