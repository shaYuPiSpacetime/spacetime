import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useCoins, type CoinPayState } from '@/hooks/useCoins'
import CoinRechargePlans from '@/components/CoinRechargePlans'
import './recharge.scss'
import {
  LANHU_BLUE,
  LANHU_NAVY,
  LANHU_SOFT_BG,
  LanhuNav,
} from '@/pages/lanhu/LanhuShell'



const COIN_AGREEMENT_TITLE = '《时空邂逅充值协议》'
const openCoinAgreement = () => void Taro.navigateTo({ url: '/pages/settings/content?contentCode=coin_recharge_agreement' })
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

  useDidShow(() => {
    void fetchBalance().catch(() => undefined)
    void fetchPackages().catch(() => undefined)
    void fetchScenes().catch(() => undefined)
  })

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
        <View className="coin-recharge-content">
          <BalanceCard balance={balance} onDetail={goToDetail} />
          <CoinRechargePlans packages={packages} selected={selectedPackage} onSelect={selectPackage} onNotice={showRechargeNotice} />
          <UsageCard usages={usages.filter((usage) => usage.code !== 'replay_profile_unlock_one').slice(0, 8)} />
        </View>
      </ScrollView>
      <PayBar
        checked={agreementChecked}
        error={agreementError}
        loading={payLoading}
        agreementTitle={COIN_AGREEMENT_TITLE}
        onToggle={handleToggleAgreement}
        onOpenAgreement={openCoinAgreement}
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
          onOpenAgreement={openCoinAgreement}
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
    <View className="coin-recharge-balance">
      <Image src={miniappOssIcons.coinBalanceBackground} mode="scaleToFill" className="coin-recharge-balance__background" />
      <View className="coin-recharge-balance__label">千寻币余额</View>
      <View className="coin-recharge-balance__value">{balance}</View>
      <View className="coin-recharge-balance__detail" onClick={onDetail}>明细<CoinChevronIcon color="#FFFFFF" size="20rpx" marginLeft="6rpx" /></View>
    </View>
  )
}

function resolveCoinPayState(value: unknown): CoinPayState {
  if (value === 'wechat-pay') return 'paying'
  if (value === 'pay-success' || value === 'pay-cancel' || value === 'pay-failed') return value
  return 'idle'
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

function UsageCard({ usages }: { usages: Array<{ code: string; icon: string; label: string; price: number }> }) {
  return (
    <View className="coin-recharge-usages">
      <View className="coin-recharge-usages__title">千寻币用途</View>
      <View className="coin-recharge-usages__grid">
        {usages.map(usage => (
          <View key={usage.code} className="coin-recharge-usages__item">
            {usage.icon ? <Image src={usage.icon} mode="aspectFit" className="coin-recharge-usages__icon" /> : <View className="coin-recharge-usages__icon coin-recharge-usages__fallback" />}
            <View className="coin-recharge-usages__label">{usage.label}</View>
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
  if (payState === 'idle' || payState === 'paying') return null

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
      <View style={{ position: 'absolute', left: '175rpx', top: '500rpx', width: '400rpx', padding: '30rpx', borderRadius: '16rpx', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
        <Text style={{ color: LANHU_NAVY, fontSize: '28rpx', lineHeight: '42rpx', textAlign: 'center' }}>
          {failureMessage || '支付未完成，请稍后重试'}
        </Text>
        <View onClick={onClose} style={{ marginTop: '24rpx', padding: '12rpx 36rpx', borderRadius: '10rpx', background: LANHU_BLUE }}>
          <Text style={{ color: '#FFFFFF', fontSize: '26rpx' }}>知道了</Text>
        </View>
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
          <Button
            id="recharge-notice-contact"
            openType="contact"
            style={{
              width: '253rpx',
              height: '68rpx',
              padding: 0,
              border: 'none',
              borderRadius: '8rpx',
              background: '#F9F9FA',
              marginRight: '24rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#333333', fontSize: '24rpx', fontWeight: 500, lineHeight: '33rpx' }}>{rechargeNotice.contactText}</Text>
          </Button>
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
  onOpenAgreement,
  onPay,
}: {
  checked: boolean
  error: boolean
  loading: boolean
  agreementTitle: string
  onToggle: () => void
  onOpenAgreement: () => void
  onPay: () => void
}) {
  return (
    <View
      style={{
        width: '750rpx',
        flexShrink: 0,
        background: '#FFFFFF',
        padding: '16rpx 32rpx max(16rpx, env(safe-area-inset-bottom))',
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
        <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 700 }}>立即支付</Text>
      </View>
      <View
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', minHeight: '64rpx', flexWrap: 'wrap' }}
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
        <Text style={{ color: error ? '#B7B7B7' : '#333333', fontSize: '24rpx' }}>阅读并同意</Text>
        <Text style={{ color: LANHU_BLUE, fontSize: '24rpx' }} onClick={event => { event.stopPropagation(); onOpenAgreement() }}>{agreementTitle}</Text>
      </View>
    </View>
  )
}

function AgreementConfirmSheet({
  agreementTitle,
  onOpenAgreement,
  onContinue,
}: {
  agreementTitle: string
  onOpenAgreement: () => void
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
          <Text style={{ color: LANHU_BLUE, fontSize: '32rpx' }} onClick={event => { event.stopPropagation(); onOpenAgreement() }}>{agreementTitle}</Text>
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
