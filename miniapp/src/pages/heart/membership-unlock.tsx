import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import blurredPersonImage from '@/assets/lanhu/heart-message/heart-person-blur.webp'
import { getLanhuNavigationMetrics } from '@/components/HeartMessageHeader'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useMembership } from '@/hooks/useMembership'
import type { MembershipPlan } from '@/types/membership'

const GOLD = '#D5A85F'
const PAGE_BG = '#121212'

const LANHU_PLANS: MembershipPlan[] = [
  { id: -1, name: '连续包年', price: 568, originalPrice: 2376, duration: 365, durationLabel: '12个月', monthlyPriceLabel: '¥47.33/月', tag: '专属2.4折', perks: [] },
  { id: -2, name: '连续包季', price: 318, originalPrice: 594, duration: 90, durationLabel: '3个月', monthlyPriceLabel: '¥106.00/月', tag: '专属5.4折', perks: [] },
  { id: -3, name: '连续包月', price: 198, originalPrice: 198, duration: 30, durationLabel: '1个月', monthlyPriceLabel: '¥198.00/月', tag: '尝鲜首选', perks: [] },
  { id: -4, name: '单月会员', price: 218, originalPrice: 218, duration: 30, durationLabel: '1个月', monthlyPriceLabel: '¥218.00/月', tag: '随用随开', perks: [] },
]

const LANHU_BENEFITS = [
  { icon: miniappOssIcons.memberBenefitMatch, title: '心动名单一键揭晓：123人', desc: '有人对你心动了！看到喜欢的，立即发起对话' },
  { icon: miniappOssIcons.memberBenefitEyeOpen, title: '谁来看过你：340位访客', desc: '访客全公开，别让在意你的人白等' },
  { icon: miniappOssIcons.memberBenefitGreeting, title: '每天更多主动开聊机会', desc: '喜欢就勇敢靠近，重要缘分不再错过' },
  { icon: miniappOssIcons.memberBenefitRecommend, title: '优先推荐给心仪的人', desc: '提升展示优先级，让对的人更快看到你' },
  { icon: miniappOssIcons.memberBenefitFilter, title: '高级筛选精准找人', desc: '按理想条件筛选，更快遇见契合对象' },
  { icon: miniappOssIcons.memberBenefitExposure, title: '专属曝光加速相遇', desc: '获得更多曝光机会，心动概率持续提升' },
  { icon: miniappOssIcons.memberBenefitStealth, title: '隐身访问保护足迹', desc: '查看心仪主页时，自由选择是否留下记录' },
  { icon: miniappOssIcons.memberBenefitReplay, title: '错过的人再次遇见', desc: '重新发现曾经划过的人，不让缘分遗憾散场' },
  { icon: miniappOssIcons.memberBenefitDailyHeart, title: '每日心动权益加倍', desc: '更多表达心意的机会，解锁完整会员体验' },
] as const

export default function HeartMembershipUnlockPage() {
  const {
    plans,
    plansLoading,
    payLoading,
    fetchPlans,
    selectPlan,
    confirmPay,
  } = useMembership()
  const displayPlans = useMemo(
    () => plans.length > 0
      ? [...plans, ...LANHU_PLANS.slice(Math.min(plans.length, LANHU_PLANS.length))]
      : LANHU_PLANS,
    [plans],
  )
  const [activePlanId, setActivePlanId] = useState(displayPlans[0].id)
  const [agreementChecked, setAgreementChecked] = useState(false)

  useEffect(() => {
    void fetchPlans().catch(() => undefined)
  }, [fetchPlans])

  useEffect(() => {
    if (!plans.length) return
    const defaultPlan = plans.find(plan => plan.tag) || plans[0]
    setActivePlanId(defaultPlan.id)
    selectPlan(defaultPlan)
  }, [plans, selectPlan])

  const activePlan = useMemo(
    () => displayPlans.find(plan => plan.id === activePlanId) || displayPlans[0],
    [activePlanId, displayPlans],
  )

  const handleSelectPlan = (plan: MembershipPlan) => {
    setActivePlanId(plan.id)
    if (plan.id > 0) selectPlan(plan)
  }

  const handlePay = async () => {
    if (!agreementChecked) {
      Taro.showToast({ title: '请先阅读并同意会员服务协议', icon: 'none' })
      return
    }
    if (activePlan.id <= 0) {
      Taro.showToast({ title: plansLoading ? '套餐加载中，请稍后重试' : '套餐暂不可用，请稍后重试', icon: 'none' })
      return
    }
    await confirmPay('heart_unlock_all')
  }

  return (
    <View style={{ height: '100vh', overflow: 'hidden', background: PAGE_BG, color: '#FFFFFF', fontFamily: 'PingFang SC, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <DarkNavigation title="时空邂逅会员" />
      <ScrollView scrollY enableFlex showScrollbar={false} style={{ flex: 1, height: 0, minHeight: 0 }}>
        <View style={{ width: '750rpx', paddingBottom: '36rpx' }}>
          <MemberHero />
          <PlanRail plans={displayPlans} activePlanId={activePlan.id} onSelect={handleSelectPlan} />
          <Benefits />
        </View>
      </ScrollView>
      <PaymentBar
        plan={activePlan}
        checked={agreementChecked}
        loading={payLoading}
        onToggle={() => setAgreementChecked(value => !value)}
        onPay={handlePay}
      />
    </View>
  )
}

function DarkNavigation({ title }: { title: string }) {
  const { menuTop, menuHeight } = getLanhuNavigationMetrics()
  const titleTop = menuTop + (menuHeight - 45) / 2
  const goBack = () => {
    if (Taro.getCurrentPages().length > 1) void Taro.navigateBack()
    else void Taro.switchTab({ url: '/pages/community/index' })
  }

  return (
    <View style={{ position: 'relative', width: '750rpx', height: '176rpx', flexShrink: 0, background: PAGE_BG }}>
      <View onClick={goBack} style={{ position: 'absolute', left: '25rpx', top: `${menuTop}rpx`, width: '54rpx', height: `${menuHeight}rpx`, display: 'flex', alignItems: 'center' }}>
        <View style={{ width: '22rpx', height: '22rpx', borderLeft: '4rpx solid #FFFFFF', borderBottom: '4rpx solid #FFFFFF', transform: 'rotate(45deg)', boxSizing: 'border-box' }} />
      </View>
      <Text style={{ position: 'absolute', left: '175rpx', top: `${titleTop}rpx`, width: '400rpx', color: '#FFFFFF', fontSize: '32rpx', fontWeight: 500, lineHeight: '45rpx', textAlign: 'center' }}>{title}</Text>
    </View>
  )
}

function MemberHero() {
  return (
    <View style={{ width: '700rpx', height: '418rpx', margin: '0 auto', position: 'relative' }}>
      <HeroAvatar left={122} top={90} size={120} />
      <HeroAvatar left={458} top={90} size={120} />
      <HeroAvatar left={250} top={50} size={200} featured />
      <SpeechBubble left={210} top={68} text="97年" tail="right" />
      <SpeechBubble left={390} top={150} text="本科" tail="left" />
      <Text style={{ position: 'absolute', left: 0, top: '288rpx', width: '700rpx', color: '#FFC766', fontSize: '34rpx', fontWeight: 600, lineHeight: '48rpx', textAlign: 'center' }}>免费解锁全部对你心动的人</Text>
      <View style={{ position: 'absolute', left: 0, top: '356rpx', width: '700rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '42rpx' }}>共有</Text>
        <View style={{ minWidth: '72rpx', height: '42rpx', margin: '0 12rpx', padding: '0 18rpx', borderRadius: '21rpx', background: 'linear-gradient(135deg,#F4D7A0,#BD8841)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <Text style={{ color: '#211F20', fontSize: '26rpx', fontWeight: 600, lineHeight: '38rpx' }}>70</Text>
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '42rpx' }}>人对你心动</Text>
      </View>
    </View>
  )
}

function HeroAvatar({ left, top, size, featured = false }: { left: number; top: number; size: number; featured?: boolean }) {
  return (
    <View style={{ position: 'absolute', left: `${left}rpx`, top: `${top}rpx`, width: `${size}rpx`, height: `${size}rpx`, borderRadius: '50%', border: featured ? '5rpx solid #FFFFFF' : '3rpx solid rgba(255,255,255,0.85)', boxShadow: featured ? '0 6rpx 24rpx rgba(0,0,0,0.46)' : 'none', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Image src={blurredPersonImage} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
    </View>
  )
}

function SpeechBubble({ left, top, text, tail }: { left: number; top: number; text: string; tail: 'left' | 'right' }) {
  return (
    <View style={{ position: 'absolute', left: `${left}rpx`, top: `${top}rpx`, minWidth: '98rpx', height: '58rpx', padding: '0 19rpx', borderRadius: '12rpx', background: '#FFC766', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', zIndex: 4 }}>
      <View style={{ position: 'absolute', [tail]: '8rpx', bottom: '-12rpx', width: '28rpx', height: '24rpx', background: '#FFC766', clipPath: tail === 'right' ? 'polygon(0 0,100% 100%,28% 64%)' : 'polygon(100% 0,0 100%,72% 64%)' }} />
      <Text style={{ position: 'relative', color: '#975D08', fontSize: '26rpx', fontWeight: 600, lineHeight: '38rpx', zIndex: 1 }}>{text}</Text>
    </View>
  )
}

function PlanRail({ plans, activePlanId, onSelect }: { plans: MembershipPlan[]; activePlanId: number; onSelect: (plan: MembershipPlan) => void }) {
  return (
    <ScrollView scrollX showScrollbar={false} style={{ width: '750rpx', height: '302rpx', whiteSpace: 'nowrap' }}>
      <View style={{ width: `${plans.length * 218 + Math.max(0, plans.length - 1) * 10 + 50}rpx`, height: '284rpx', padding: '24rpx 25rpx 0', display: 'flex', flexDirection: 'row', gap: '10rpx', boxSizing: 'border-box' }}>
        {plans.map(plan => {
          const selected = plan.id === activePlanId
          return (
            <View key={plan.id} onClick={() => onSelect(plan)} style={{ position: 'relative', width: '218rpx', height: '248rpx', padding: '54rpx 0 0 26rpx', borderRadius: '12rpx', border: selected ? `4rpx solid ${GOLD}` : '0', background: '#242424', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', verticalAlign: 'top', boxSizing: 'border-box' }}>
              {plan.tag ? <View style={{ position: 'absolute', left: selected ? '-4rpx' : '0', top: '-24rpx', height: '48rpx', padding: '0 14rpx', borderRadius: '8rpx', background: '#FFC766', display: 'flex', alignItems: 'center' }}><Text style={{ color: '#975D08', fontSize: '20rpx', lineHeight: '30rpx' }}>{plan.tag}</Text></View> : null}
              <Text style={{ color: '#FFFFFF', fontSize: '26rpx', lineHeight: '38rpx' }}>{plan.name}</Text>
              <Text style={{ marginTop: '10rpx', color: '#FFFFFF', fontSize: '36rpx', lineHeight: '50rpx' }}>{plan.durationLabel}</Text>
              <Text style={{ marginTop: '9rpx', color: '#FFD58E', fontSize: '28rpx', lineHeight: '40rpx' }}>{plan.monthlyPriceLabel || `¥${plan.price.toFixed(2)}`}</Text>
              <Text style={{ marginTop: '5rpx', color: '#F0F0F0', fontSize: '20rpx', lineHeight: '28rpx', textDecoration: plan.originalPrice > plan.price ? 'line-through' : 'none' }}>¥{plan.originalPrice.toFixed(2)}</Text>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

function Benefits() {
  return (
    <View style={{ width: '700rpx', margin: '6rpx auto 0' }}>
      <View style={{ height: '66rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src={miniappOssIcons.memberDividerLeft} mode="aspectFit" style={{ width: '68rpx', height: '20rpx' }} />
        <Text style={{ margin: '0 18rpx', color: '#FFC766', fontSize: '30rpx', fontWeight: 500, lineHeight: '44rpx' }}>时空邂逅会员特权</Text>
        <Image src={miniappOssIcons.memberDividerRight} mode="aspectFit" style={{ width: '68rpx', height: '20rpx' }} />
      </View>
      {LANHU_BENEFITS.map((benefit, index) => (
        <View key={benefit.title} style={{ width: '700rpx', height: '168rpx', marginTop: index ? '18rpx' : '12rpx', padding: '0 28rpx', borderRadius: '16rpx', background: 'linear-gradient(100deg,#24211E,#191919)', border: '1rpx solid #3B342C', display: 'flex', flexDirection: 'row', alignItems: 'center', boxSizing: 'border-box' }}>
          <View style={{ width: '98rpx', height: '98rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Image src={benefit.icon} mode="aspectFit" style={{ width: '88rpx', height: '76rpx' }} />
          </View>
          <View style={{ minWidth: 0, marginLeft: '24rpx' }}>
            <Text style={{ display: 'block', color: '#B89157', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>{benefit.title}</Text>
            <Text style={{ display: 'block', marginTop: '10rpx', color: '#B89157', fontSize: '22rpx', lineHeight: '32rpx' }}>{benefit.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function PaymentBar({ plan, checked, loading, onToggle, onPay }: { plan: MembershipPlan; checked: boolean; loading: boolean; onToggle: () => void; onPay: () => void }) {
  return (
    <View style={{ width: '750rpx', height: '232rpx', padding: '24rpx 25rpx 18rpx', background: '#FFFFFF', boxSizing: 'border-box', flexShrink: 0 }}>
      <View onClick={onPay} style={{ width: '700rpx', height: '98rpx', borderRadius: '49rpx', background: '#211F20', display: 'flex', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
        <View style={{ width: '452rpx', height: '98rpx', display: 'flex', alignItems: 'center', paddingLeft: '32rpx', boxSizing: 'border-box' }}>
          <Text style={{ color: '#FFD58E', fontSize: '30rpx', lineHeight: '44rpx' }}>{loading ? '支付中…' : `¥${plan.price.toFixed(2)}/${plan.name.replace('连续', '')}`}</Text>
        </View>
        <View style={{ width: '248rpx', height: '98rpx', borderRadius: '49rpx', background: '#FFC766', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#211F20', fontSize: '32rpx', fontWeight: 600, lineHeight: '46rpx' }}>立即开通</Text>
        </View>
      </View>
      <View onClick={onToggle} style={{ height: '72rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: '28rpx', height: '28rpx', marginRight: '10rpx', borderRadius: '50%', border: `2rpx solid ${checked ? GOLD : '#A6A6A6'}`, background: checked ? GOLD : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          {checked ? <Text style={{ color: '#FFFFFF', fontSize: '20rpx', fontWeight: 700, lineHeight: '24rpx' }}>✓</Text> : null}
        </View>
        <Text style={{ color: '#333333', fontSize: '20rpx', lineHeight: '30rpx' }}>阅读并同意</Text>
        <Text style={{ color: '#9B7134', fontSize: '20rpx', lineHeight: '30rpx' }}>《时空邂逅会员服务协议》</Text>
      </View>
    </View>
  )
}
