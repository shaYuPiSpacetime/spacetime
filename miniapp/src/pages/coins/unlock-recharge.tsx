import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import blurredPersonImage from '@/assets/lanhu/heart-message/heart-person-blur.webp'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useCoins, type CoinPayState } from '@/hooks/useCoins'
import { LANHU_BLUE, LANHU_NAVY, LanhuNav } from '@/pages/lanhu/LanhuShell'
import type { CoinPackage } from '@/types/coin'

const PAGE_BACKGROUND =
  'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.68) 49%, rgba(248,250,239,0.68) 100%)'
const AGREEMENT_TITLE = '《时空邂逅充值协议》'
const UNLOCK_COST = 100
const PLAN_CARD_WIDTH_RPX = 242
const PLAN_CARD_GAP_RPX = 6
const PLAN_SELECTED_LEFT_RPX = 150

const LANHU_PACKAGES: CoinPackage[] = [
  { id: -1, amount: 100, price: 8, label: '解锁2位嘉宾', recommended: false },
  { id: -2, amount: 3000, price: 268, label: '60位嘉宾', originalPrice: '¥301.12', discountLabel: '8.9折', tag: '热销推荐', recommended: true },
  { id: -3, amount: 6000, price: 428, label: '150位嘉宾', originalPrice: '¥602.82', discountLabel: '7.1折', tag: '节省最多', recommended: false },
  { id: -4, amount: 12000, price: 698, label: '300位嘉宾', recommended: false },
]

const RECHARGE_NOTICE = [
  '1.微信支付显示成功后，若千寻币数量没有更新，可以退出该页面再重新进入。',
  '2.若千寻币数量长时间未更新，请截取微信支付成功详情页面并联系客服反馈。',
]

export default function UnlockRechargePage() {
  const router = useRouter()
  const sourceScene = String(router.params.sourceScene || 'likes_unlock_one')
  const {
    balance,
    packages,
    selectedPackage,
    packagesLoading,
    payLoading,
    payState,
    fetchBalance,
    fetchPackages,
    selectPackage,
    purchase,
    hidePaymentLayer,
  } = useCoins()
  const displayPackages = packages.length > 0 ? packages : LANHU_PACKAGES
  const defaultPackage = displayPackages.find(pkg => pkg.amount === 3000)
    || displayPackages.find(pkg => pkg.recommended)
    || displayPackages[0]
  const [activePackageId, setActivePackageId] = useState(defaultPackage.id)
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

  const activePackage = useMemo(
    () => displayPackages.find(pkg => pkg.id === activePackageId)
      || selectedPackage
      || defaultPackage,
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
    if (activePackage.id <= 0) {
      Taro.showToast({ title: packagesLoading ? '套餐加载中，请稍后重试' : '套餐暂不可用，请稍后重试', icon: 'none' })
      return
    }
    await purchase(sourceScene)
  }

  const handleAgreementConfirm = async () => {
    setAgreementChecked(true)
    setAgreementError(false)
    if (activePackage.id <= 0) {
      Taro.showToast({ title: packagesLoading ? '套餐加载中，请稍后重试' : '套餐暂不可用，请稍后重试', icon: 'none' })
      return
    }
    await purchase(sourceScene)
  }

  return (
    <View style={{ height: '100vh', overflow: 'hidden', background: PAGE_BACKGROUND, display: 'flex', flexDirection: 'column', fontFamily: 'PingFang SC, sans-serif' }}>
      <LanhuNav title="千寻币" showBack />
      <ScrollView scrollY enableFlex showScrollbar={false} style={{ flex: 1, height: 0, minHeight: 0 }}>
        <View style={{ width: '750rpx', minHeight: '1170rpx', paddingBottom: '36rpx', boxSizing: 'border-box' }}>
          <UnlockSceneHero />
          <UnlockSummary balance={balance} />
          <RechargePanel
            packages={displayPackages}
            activePackage={activePackage}
            onSelect={handleSelect}
            onNotice={() => setNoticeVisible(true)}
          />
        </View>
      </ScrollView>
      <RechargePayBar
        checked={agreementChecked}
        loading={payLoading}
        onToggle={() => {
          setAgreementChecked(value => !value)
          setAgreementError(false)
        }}
        onPay={handlePay}
      />
      {agreementError ? <AgreementConfirmSheet onContinue={handleAgreementConfirm} /> : null}
      {noticeVisible ? <RechargeNoticeModal onClose={() => setNoticeVisible(false)} /> : null}
      <ScenePaymentLayer payState={payState} onClose={hidePaymentLayer} />
    </View>
  )
}

function UnlockSceneHero() {
  return (
    <View style={{ position: 'relative', width: '700rpx', height: '420rpx', margin: '0 auto' }}>
      <SceneAvatar left={122} top={90} size={120} />
      <SceneAvatar left={458} top={90} size={120} />
      <SceneAvatar left={250} top={50} size={200} featured />
      <SceneBubble left={210} top={68} text="97年" tail="right" />
      <SceneBubble left={390} top={150} text="本科" tail="left" />
      <Text style={{ position: 'absolute', left: 0, top: '270rpx', width: '700rpx', color: LANHU_NAVY, fontSize: '34rpx', fontWeight: 500, lineHeight: '48rpx', textAlign: 'center' }}>Ta也喜欢了你!</Text>
      <Text style={{ position: 'absolute', left: 0, top: '326rpx', width: '700rpx', color: LANHU_NAVY, fontSize: '34rpx', fontWeight: 500, lineHeight: '48rpx', textAlign: 'center' }}>解锁后立即和ta配对聊天</Text>
    </View>
  )
}

function SceneAvatar({ left, top, size, featured = false }: { left: number; top: number; size: number; featured?: boolean }) {
  return (
    <View style={{ position: 'absolute', left: `${left}rpx`, top: `${top}rpx`, width: `${size}rpx`, height: `${size}rpx`, borderRadius: '50%', border: featured ? '6rpx solid #FFFFFF' : '4rpx solid rgba(255,255,255,0.9)', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Image src={blurredPersonImage} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
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

function UnlockSummary({ balance }: { balance: number }) {
  return (
    <View style={{ width: '664rpx', height: '54rpx', margin: '24rpx auto 0', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <SummaryAmount label="本次消耗" value={UNLOCK_COST} />
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

function RechargePanel({
  packages,
  activePackage,
  onSelect,
  onNotice,
}: {
  packages: CoinPackage[]
  activePackage: CoinPackage
  onSelect: (pkg: CoinPackage) => void
  onNotice: () => void
}) {
  const selectedIndex = Math.max(0, packages.findIndex(pkg => pkg.id === activePackage.id))
  const targetScrollLeft = Math.max(
    0,
    selectedIndex * (PLAN_CARD_WIDTH_RPX + PLAN_CARD_GAP_RPX) - PLAN_SELECTED_LEFT_RPX,
  ) * Taro.getWindowInfo().windowWidth / 750
  const [railScrollLeft, setRailScrollLeft] = useState(0)
  const railContentWidth = Math.max(
    640,
    packages.length * (PLAN_CARD_WIDTH_RPX + PLAN_CARD_GAP_RPX) - PLAN_CARD_GAP_RPX,
  )

  useEffect(() => {
    setRailScrollLeft(targetScrollLeft)
  }, [targetScrollLeft])

  return (
    <View style={{ width: '700rpx', height: '338rpx', margin: '52rpx auto 0', padding: '27rpx 30rpx 0', borderRadius: '12rpx', background: '#FFFFFF', overflow: 'hidden', boxSizing: 'border-box' }}>
      <View style={{ height: '40rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: LANHU_NAVY, fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>充值千寻币</Text>
        <View onClick={onNotice} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#9D9D9D', fontSize: '24rpx', lineHeight: '34rpx' }}>充值须知</Text>
          <View style={{ width: '16rpx', height: '16rpx', marginLeft: '10rpx', borderTop: '3rpx solid #9D9D9D', borderRight: '3rpx solid #9D9D9D', transform: 'rotate(45deg)', boxSizing: 'border-box' }} />
        </View>
      </View>
      <ScrollView scrollX scrollLeft={railScrollLeft} scrollWithAnimation={false} showScrollbar={false} style={{ width: '640rpx', marginTop: '25rpx' }}>
        <View style={{ width: `${railContentWidth}rpx`, height: '198rpx', paddingTop: '15rpx', display: 'flex', flexDirection: 'row', boxSizing: 'border-box' }}>
          {packages.map(pkg => <RechargePackageCard key={pkg.id} pkg={pkg} selected={pkg.id === activePackage.id} onClick={() => onSelect(pkg)} />)}
        </View>
      </ScrollView>
    </View>
  )
}

function RechargePackageCard({ pkg, selected, onClick }: { pkg: CoinPackage; selected: boolean; onClick: () => void }) {
  return (
    <View onClick={onClick} style={{ position: 'relative', flexShrink: 0, width: '242rpx', height: '183rpx', marginRight: '6rpx', padding: '33rpx 26rpx 29rpx', borderRadius: '12rpx', border: selected ? `4rpx solid ${LANHU_BLUE}` : '2rpx solid #CED4DF', background: selected ? '#E3F1FE' : '#F8FAFE', boxSizing: 'border-box' }}>
      {pkg.tag ? (
        <View style={{ position: 'absolute', left: '20rpx', top: '-15rpx', height: '36rpx', padding: '0 13rpx', borderRadius: '8rpx', background: '#F32B61', display: 'flex', alignItems: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '22rpx' }}>{pkg.tag}</Text>
        </View>
      ) : null}
      <View style={{ height: '37rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <Image src={miniappOssIcons.coinGold} mode="aspectFit" style={{ width: '19rpx', height: '19rpx', marginRight: '10rpx' }} />
        <Text style={{ color: LANHU_NAVY, fontSize: '26rpx', fontWeight: 500, lineHeight: '37rpx' }}>{pkg.amount}</Text>
      </View>
      {pkg.originalPrice && pkg.discountLabel ? (
        <View style={{ height: '28rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '2rpx' }}>
          <Text style={{ color: '#9A9A9A', fontSize: '18rpx', lineHeight: '25rpx', textDecorationLine: 'line-through' }}>{pkg.originalPrice}</Text>
          <View style={{ marginLeft: '8rpx', padding: '2rpx 9rpx 1rpx', borderRadius: '4rpx', background: '#FFD5E2' }}>
            <Text style={{ color: '#F32B61', fontSize: '12rpx', lineHeight: '17rpx' }}>{pkg.discountLabel}</Text>
          </View>
        </View>
      ) : (
        <Text style={{ display: 'block', color: '#999999', fontSize: '18rpx', lineHeight: '25rpx', marginTop: '2rpx' }}>{pkg.label}</Text>
      )}
      <View style={{ width: '170rpx', height: '53rpx', display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text style={{ color: selected ? LANHU_BLUE : LANHU_NAVY, fontSize: '28rpx', fontWeight: 500, lineHeight: '44rpx' }}>¥</Text>
        <Text style={{ color: selected ? LANHU_BLUE : LANHU_NAVY, fontSize: '38rpx', fontWeight: 500, lineHeight: '44rpx' }}>{pkg.price.toFixed(2)}</Text>
      </View>
    </View>
  )
}

function RechargePayBar({ checked, loading, onToggle, onPay }: { checked: boolean; loading: boolean; onToggle: () => void; onPay: () => void }) {
  return (
    <View style={{ width: '750rpx', padding: '20rpx 44rpx max(30rpx, calc(env(safe-area-inset-bottom) - 24rpx))', background: 'rgba(255,255,255,0.96)', flexShrink: 0, boxSizing: 'border-box', zIndex: 20 }}>
      <View onClick={onPay} style={{ width: '664rpx', height: '98rpx', borderRadius: '14rpx', background: LANHU_BLUE, opacity: loading ? 0.72 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 600, lineHeight: '50rpx' }}>{loading ? '支付中...' : '立即充值'}</Text>
      </View>
      <View onClick={onToggle} style={{ height: '62rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: '32rpx', height: '32rpx', marginRight: '16rpx', borderRadius: '50%', border: `2rpx solid ${LANHU_BLUE}`, background: checked ? LANHU_BLUE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          {checked ? <Text style={{ color: '#FFFFFF', fontSize: '22rpx', fontWeight: 700, lineHeight: '26rpx' }}>✓</Text> : null}
        </View>
        <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>阅读并同意</Text>
        <Text style={{ color: LANHU_BLUE, fontSize: '28rpx', lineHeight: '40rpx' }}>{AGREEMENT_TITLE}</Text>
      </View>
    </View>
  )
}

function AgreementConfirmSheet({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'flex-end' }}>
      <View style={{ width: '750rpx', height: '388rpx', padding: '107rpx 44rpx 0', borderRadius: '40rpx 40rpx 0 0', background: '#FFFFFF', boxSizing: 'border-box' }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#A9A9A9', fontSize: '32rpx', lineHeight: '45rpx' }}>我已阅读并同意</Text>
          <Text style={{ color: LANHU_BLUE, fontSize: '32rpx', lineHeight: '45rpx' }}>{AGREEMENT_TITLE}</Text>
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

function ScenePaymentLayer({ payState, onClose }: { payState: CoinPayState; onClose: () => void }) {
  if (payState === 'idle' || payState === 'pay-success' || payState === 'pay-cancel') return null
  return (
    <View style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: '400rpx', padding: '30rpx', borderRadius: '16rpx', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
        <Text style={{ color: LANHU_NAVY, fontSize: '28rpx', lineHeight: '40rpx', textAlign: 'center' }}>{payState === 'paying' ? '正在打开微信支付并确认到账...' : '支付未完成，请稍后重试'}</Text>
        {payState === 'pay-failed' ? (
          <View onClick={onClose} style={{ marginTop: '24rpx', padding: '12rpx 36rpx', borderRadius: '10rpx', background: LANHU_BLUE }}>
            <Text style={{ color: '#FFFFFF', fontSize: '26rpx' }}>知道了</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}
