import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useCoins, type CoinPayState } from '@/hooks/useCoins'
import { LANHU_BLUE, LANHU_NAVY, LanhuNav } from '@/pages/lanhu/LanhuShell'
import type { CoinPackage } from '@/types/coin'
import CoinRechargePlans from '@/components/CoinRechargePlans'
import './recharge.scss'

const PAGE_BACKGROUND =
  'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.68) 49%, rgba(248,250,239,0.68) 100%)'
const AGREEMENT_TITLE = '《时空邂逅充值协议》'
const openCoinAgreement = () => void Taro.navigateTo({ url: '/pages/settings/content?contentCode=coin_recharge_agreement' })


const RECHARGE_NOTICE = [
  '1.微信支付显示成功后，若千寻币数量没有更新，可以退出该页面再重新进入。',
  '2.若千寻币数量长时间未更新，请截取微信支付成功详情页面并联系客服反馈。',
]

export default function UnlockRechargePage() {
  const router = useRouter()
  const sourceScene = String(router.params.sourceScene || 'likes_unlock_one')
  const idealScene = sourceScene === 'ideal_user_unlock'
  const replayScene = sourceScene === 'replay_profile_unlock_one'
  const returnAfterRecharge = idealScene || replayScene
  const unlockCost = Math.max(0, Number(router.params.cost || 0))
  const {
    balance,
    packages,
    selectedPackage,
    packagesLoading,
    payLoading,
    payState,
    paymentErrorMessage,
    fetchBalance,
    fetchPackages,
    selectPackage,
    purchase,
    hidePaymentLayer,
  } = useCoins()
  const displayPackages = packages
  const defaultPackage = displayPackages.find(pkg => pkg.amount === 3000)
    || displayPackages.find(pkg => pkg.recommended)
    || displayPackages[0]
  const [activePackageId, setActivePackageId] = useState(0)
  const [agreementChecked, setAgreementChecked] = useState(false)
  const [agreementError, setAgreementError] = useState(false)
  const [noticeVisible, setNoticeVisible] = useState(false)

  useEffect(() => {
    void Promise.allSettled([fetchBalance(), fetchPackages()])
  }, [fetchBalance, fetchPackages])

  useEffect(() => {
    if (!packages.length) return
    const preferred = packages.find(pkg => pkg.amount === 3000)
      || packages.find(pkg => pkg.recommended)
      || packages[0]
    setActivePackageId(preferred.id)
    selectPackage(preferred)
  }, [packages, selectPackage])

  useEffect(() => {
    if (!returnAfterRecharge || payState !== 'pay-success') return
    const timer = setTimeout(() => void Taro.navigateBack(), 500)
    return () => clearTimeout(timer)
  }, [returnAfterRecharge, payState])

  const activePackage = useMemo(
    () => displayPackages.find(pkg => pkg.id === activePackageId)
      || selectedPackage
      || defaultPackage
      || null,
    [activePackageId, defaultPackage, displayPackages, selectedPackage],
  )

  const handleSelect = (pkg: CoinPackage) => {
    setActivePackageId(pkg.id)
    if (pkg.id > 0) selectPackage(pkg)
  }

  const handlePay = async () => {
    if (!agreementChecked) {
      setAgreementError(true)
      return
    }
    setAgreementError(false)
    if (!activePackage || activePackage.id <= 0) {
      Taro.showToast({ title: packagesLoading ? '套餐加载中，请稍后重试' : '套餐暂不可用，请稍后重试', icon: 'none' })
      return
    }
    await purchase(sourceScene, returnAfterRecharge ? { navigateOnSuccess: false } : undefined)
  }

  const handleAgreementConfirm = async () => {
    setAgreementChecked(true)
    setAgreementError(false)
    if (!activePackage || activePackage.id <= 0) {
      Taro.showToast({ title: packagesLoading ? '套餐加载中，请稍后重试' : '套餐暂不可用，请稍后重试', icon: 'none' })
      return
    }
    await purchase(sourceScene, returnAfterRecharge ? { navigateOnSuccess: false } : undefined)
  }

  return (
    <View style={{ height: '100vh', overflow: 'hidden', background: PAGE_BACKGROUND, display: 'flex', flexDirection: 'column', fontFamily: 'PingFang SC, sans-serif' }}>
      <LanhuNav title="千寻币" showBack />
      <ScrollView scrollY enableFlex showScrollbar={false} style={{ flex: 1, height: 0, minHeight: 0 }}>
        <View className="coin-recharge-content coin-recharge-content--unlock">
          <UnlockSceneHero idealScene={idealScene} replayScene={replayScene} />
          <UnlockSummary balance={balance} cost={unlockCost} />
          {displayPackages.length && activePackage ? <CoinRechargePlans packages={displayPackages} selected={activePackage} onSelect={handleSelect} onNotice={() => setNoticeVisible(true)} /> : <View style={{ width: '100%', height: '220rpx', margin: 0, borderRadius: '12rpx', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#999999', fontSize: '24rpx' }}>{packagesLoading ? '充值套餐加载中…' : '暂无可用充值套餐'}</Text></View>}
        </View>
      </ScrollView>
      <RechargePayBar
        checked={agreementChecked}
        loading={payLoading}
        onToggle={() => {
          setAgreementChecked(value => !value)
          setAgreementError(false)
        }}
        onOpenAgreement={openCoinAgreement}
        onPay={handlePay}
      />
      {agreementError ? <AgreementConfirmSheet onContinue={handleAgreementConfirm} onOpenAgreement={openCoinAgreement} /> : null}
      {noticeVisible ? <RechargeNoticeModal onClose={() => setNoticeVisible(false)} /> : null}
      <ScenePaymentLayer payState={payState} failureMessage={paymentErrorMessage} onClose={hidePaymentLayer} />
    </View>
  )
}

function UnlockSceneHero({ idealScene, replayScene }: { idealScene: boolean; replayScene: boolean }) {
  return (
    <View className="coin-recharge-hero">
      <View className="coin-recharge-hero__art">
        <SceneAvatar left={122} top={66} size={120} />
        <SceneAvatar left={458} top={66} size={120} />
        <SceneAvatar left={250} top={26} size={200} featured />
        <SceneBubble left={210} top={44} text={idealScene ? '理想型' : replayScene ? '三天回放' : '心动'} tail="right" />
        <SceneBubble left={390} top={126} text={idealScene ? '已匹配' : '待解锁'} tail="left" />
      </View>
      <View className="coin-recharge-hero__title">{idealScene ? '立即解锁理想型' : replayScene ? '查看三天回放用户主页' : 'Ta也喜欢了你!'}</View>
      <View className="coin-recharge-hero__subtitle">{idealScene ? '只邂逅你想要的人' : replayScene ? '充值后返回回放列表确认解锁' : '解锁后立即和ta配对聊天'}</View>
    </View>
  )
}

function SceneAvatar({ left, top, size, featured = false }: { left: number; top: number; size: number; featured?: boolean }) {
  return (
    <View style={{ position: 'absolute', left: `${left}rpx`, top: `${top}rpx`, width: `${size}rpx`, height: `${size}rpx`, borderRadius: '50%', border: featured ? '6rpx solid #FFFFFF' : '4rpx solid rgba(255,255,255,0.9)', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Image src={miniappOssIcons.messageAvatarLikedBlurred} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
    </View>
  )
}

function SceneBubble({ left, top, text, tail }: { left: number; top: number; text: string; tail: 'left' | 'right' }) {
  return (
    <View style={{ position: 'absolute', left: `${left}rpx`, top: `${top}rpx`, minWidth: '98rpx', height: '58rpx', padding: '0 19rpx', borderRadius: '12rpx', background: LANHU_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', zIndex: 4 }}>
      <View style={{ position: 'absolute', left: tail === 'left' ? '8rpx' : 'auto', right: tail === 'right' ? '8rpx' : 'auto', bottom: '-12rpx', width: '28rpx', height: '24rpx', background: LANHU_BLUE, clipPath: tail === 'right' ? 'polygon(0 0,100% 100%,28% 64%)' : 'polygon(100% 0,0 100%,72% 64%)' }} />
      <Text style={{ position: 'relative', color: '#FFFFFF', fontSize: '26rpx', fontWeight: 500, lineHeight: '38rpx', zIndex: 1 }}>{text}</Text>
    </View>
  )
}

function UnlockSummary({ balance, cost }: { balance: number; cost: number }) {
  return (
    <View style={{ width: '100%', minHeight: '54rpx', padding: '0 8rpx', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <SummaryAmount label="本次消耗" value={cost} />
      <SummaryAmount label="余额" value={balance} />
    </View>
  )
}

function SummaryAmount({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: '#333333', fontSize: '30rpx', lineHeight: '44rpx' }}>{label}</Text>
      <Text style={{ marginLeft: '12rpx', color: LANHU_NAVY, fontSize: '30rpx', lineHeight: '44rpx' }}>{value}</Text>
      <Image src={miniappOssIcons.coinGold} mode="aspectFit" style={{ width: '28rpx', height: '28rpx', marginLeft: '10rpx' }} />
    </View>
  )
}



function RechargePayBar({ checked, loading, onToggle, onOpenAgreement, onPay }: { checked: boolean; loading: boolean; onToggle: () => void; onOpenAgreement: () => void; onPay: () => void }) {
  return (
    <View style={{ width: '750rpx', padding: '16rpx 32rpx max(16rpx, env(safe-area-inset-bottom))', background: 'rgba(255,255,255,0.96)', flexShrink: 0, boxSizing: 'border-box', zIndex: 20 }}>
      <View onClick={onPay} style={{ width: '100%', height: '98rpx', borderRadius: '14rpx', background: LANHU_BLUE, opacity: loading ? 0.72 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 600, lineHeight: '50rpx' }}>立即充值</Text>
      </View>
      <View onClick={onToggle} style={{ minHeight: '64rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
        <View style={{ width: '32rpx', height: '32rpx', marginRight: '16rpx', borderRadius: '50%', border: `2rpx solid ${LANHU_BLUE}`, background: checked ? LANHU_BLUE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          {checked ? <Text style={{ color: '#FFFFFF', fontSize: '22rpx', fontWeight: 700, lineHeight: '26rpx' }}>✓</Text> : null}
        </View>
        <Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '40rpx' }}>阅读并同意</Text>
        <Text style={{ color: LANHU_BLUE, fontSize: '24rpx', lineHeight: '40rpx' }} onClick={event => { event.stopPropagation(); onOpenAgreement() }}>{AGREEMENT_TITLE}</Text>
      </View>
    </View>
  )
}

function AgreementConfirmSheet({ onContinue, onOpenAgreement }: { onContinue: () => void; onOpenAgreement: () => void }) {
  return (
    <View style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'flex-end' }}>
      <View style={{ width: '750rpx', height: '388rpx', padding: '107rpx 44rpx 0', borderRadius: '40rpx 40rpx 0 0', background: '#FFFFFF', boxSizing: 'border-box' }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#A9A9A9', fontSize: '32rpx', lineHeight: '45rpx' }}>我已阅读并同意</Text>
          <Text style={{ color: LANHU_BLUE, fontSize: '32rpx', lineHeight: '45rpx' }} onClick={event => { event.stopPropagation(); onOpenAgreement() }}>{AGREEMENT_TITLE}</Text>
        </View>
        <View onClick={onContinue} style={{ height: '98rpx', marginTop: '62rpx', borderRadius: '14rpx', background: LANHU_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 600, lineHeight: '50rpx' }}>继续支付</Text>
        </View>
      </View>
    </View>
  )
}

function RechargeNoticeModal({ onClose }: { onClose: () => void }) {
  return (
    <View onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, padding: '386rpx 64rpx 0 65rpx', background: 'rgba(51,51,51,0.4)', boxSizing: 'border-box' }}>
      <View onClick={event => event.stopPropagation()} style={{ width: '620rpx', height: '538rpx', padding: '51rpx 45rpx 28rpx', borderRadius: '32rpx', background: '#FFFFFF', boxSizing: 'border-box' }}>
        <Text style={{ display: 'block', color: '#333333', fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx', textAlign: 'center' }}>充值须知</Text>
        <Text style={{ display: 'block', width: '530rpx', height: '282rpx', marginTop: '30rpx', color: '#333333', fontSize: '24rpx', lineHeight: '40rpx', whiteSpace: 'pre-wrap' }}>{`常见问题\n${RECHARGE_NOTICE.join('\n')}`}</Text>
        <View onClick={onClose} style={{ width: '530rpx', height: '68rpx', borderRadius: '8rpx', background: LANHU_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '24rpx', lineHeight: '34rpx' }}>好的</Text>
        </View>
      </View>
    </View>
  )
}

function ScenePaymentLayer({ payState, failureMessage, onClose }: { payState: CoinPayState; failureMessage: string; onClose: () => void }) {
  if (payState === 'idle' || payState === 'paying' || payState === 'pay-success' || payState === 'pay-cancel') return null
  return (
    <View style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: '400rpx', padding: '30rpx', borderRadius: '16rpx', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
        <Text style={{ color: LANHU_NAVY, fontSize: '28rpx', lineHeight: '40rpx', textAlign: 'center' }}>{failureMessage || '支付未完成，请稍后重试'}</Text>
        {payState === 'pay-failed' ? (
          <View onClick={onClose} style={{ marginTop: '24rpx', padding: '12rpx 36rpx', borderRadius: '10rpx', background: LANHU_BLUE }}>
            <Text style={{ color: '#FFFFFF', fontSize: '26rpx' }}>知道了</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}
