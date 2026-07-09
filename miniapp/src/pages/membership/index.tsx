import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import WechatMockPayPanel from '@/components/WechatMockPayPanel'
import { useMembership, type MembershipPayState } from '@/hooks/useMembership'
import { getDemoPageData } from '@/services/lanhuDemo'
import type { MembershipPlan, MemberStatus } from '@/types/membership'
import {
  LANHU_DARK,
  LANHU_GOLD,
  LanhuNav,
} from '@/pages/lanhu/LanhuShell'

import defaultAvatar from '@/assets/profile/default-avatar.webp'
import memberDividerLeft from '@/assets/lanhu/pages/member-benefits/member-slice-group-5-a.png'
import memberDividerRight from '@/assets/lanhu/pages/member-benefits/member-slice-group-5-b.png'
import memberBenefitMatch from '@/assets/lanhu/pages/member-benefits/member-slice-match.png'
import memberBenefitEyeOpen from '@/assets/lanhu/pages/member-benefits/member-slice-eye-open.png'
import memberBenefitGreeting from '@/assets/lanhu/pages/member-benefits/member-slice-greeting-a.png'
import memberBenefitRecommend from '@/assets/lanhu/pages/member-benefits/member-slice-recommend.png'
import memberBenefitFilter from '@/assets/lanhu/pages/member-benefits/member-slice-filter.png'
import memberBenefitExposure from '@/assets/lanhu/pages/member-benefits/member-slice-exposure.png'
import memberBenefitStealth from '@/assets/lanhu/pages/member-benefits/member-slice-stealth.png'
import memberBenefitReplay from '@/assets/lanhu/pages/member-benefits/member-slice-greeting-b.png'
import memberBenefitDailyHeart from '@/assets/lanhu/pages/member-benefits/member-slice-my-2.png'

const profileDemo = getDemoPageData('profile')
const membershipDemo = getDemoPageData('membership')
type MembershipPageVariant = 'default' | 'none' | 'active' | 'expired' | 'annual'
const MEMBER_BENEFIT_ICONS: Record<string, { src: string; width: string; height: string }> = {
  'heart-list': { src: memberBenefitMatch, width: '78rpx', height: '62rpx' },
  'visitor-eye': { src: memberBenefitEyeOpen, width: '78rpx', height: '52rpx' },
  'yo-message': { src: memberBenefitGreeting, width: '78rpx', height: '78rpx' },
  'extra-browse': { src: memberBenefitRecommend, width: '78rpx', height: '76rpx' },
  filter: { src: memberBenefitFilter, width: '68rpx', height: '78rpx' },
  exposure: { src: memberBenefitExposure, width: '72rpx', height: '78rpx' },
  stealth: { src: memberBenefitStealth, width: '78rpx', height: '60rpx' },
  replay: { src: memberBenefitReplay, width: '78rpx', height: '78rpx' },
  'daily-heart': { src: memberBenefitDailyHeart, width: '64rpx', height: '78rpx' },
}

function resolveMembershipVariant(value?: string): MembershipPageVariant {
  if (value === 'none' || value === 'active' || value === 'expired' || value === 'annual') return value
  return 'default'
}

function resolveMembershipPayState(value?: string): MembershipPayState {
  if (value === 'wechat-pay' || value === 'pay-success' || value === 'pay-cancel' || value === 'unpaid-sheet') return value
  return 'idle'
}

export default function MembershipPage() {
  const router = useRouter()
  const requestedVariant = resolveMembershipVariant(String(router.params.variant || 'default'))
  const routePayState = resolveMembershipPayState(String(router.params.payState || 'idle'))
  const variant = routePayState === 'idle' ? requestedVariant : 'annual'
  const expiredMembership = membershipDemo.expiredMembership
  const {
    myMembership,
    plans,
    benefits,
    fetchMyMembership,
    fetchPlans,
    selectPlan,
    confirmPay,
    payLoading,
    payState,
    simulatePaySuccess,
    simulatePayCancel,
    showUnpaidSheet,
    hidePaymentLayer,
    previewPayState,
    goToRecords,
  } = useMembership(variant)
  const initialActivePlan = variant === 'annual'
    ? plans.find((plan) => plan.id === membershipDemo.annualPlanId) ?? plans[0] ?? null
    : plans[0] ?? null
  const [activePlanId, setActivePlanId] = useState<number | null>(initialActivePlan?.id ?? null)
  const [agreementChecked, setAgreementChecked] = useState(false)

  useEffect(() => {
    fetchMyMembership()
    fetchPlans()
  }, [fetchMyMembership, fetchPlans])

  useEffect(() => {
    if (plans.length > 0 && activePlanId === null) {
      const defaultPlan = variant === 'annual'
        ? plans.find((plan) => plan.id === membershipDemo.annualPlanId) ?? plans[0]
        : plans[0]
      setActivePlanId(defaultPlan.id)
      selectPlan(defaultPlan)
    }
  }, [plans, activePlanId, selectPlan, variant])

  useEffect(() => {
    if (routePayState !== 'idle') {
      previewPayState(routePayState)
    }
  }, [routePayState, previewPayState])

  const activePlan = plans.find((plan) => plan.id === activePlanId)
  const currentMembership = variant === 'expired' ? expiredMembership : myMembership
  const paymentPreviewAmount = routePayState === 'wechat-pay' ? membershipDemo.wechatPayPreviewAmount : undefined

  const handleSelect = (plan: MembershipPlan) => {
    setActivePlanId(plan.id)
    selectPlan(plan)
  }

  const handlePay = async () => {
    if (!activePlan) {
      Taro.showToast({ title: '请选择套餐', icon: 'none' })
      return
    }
    if (!agreementChecked) {
      showUnpaidSheet()
      return
    }
    await confirmPay()
  }

  const handleConfirmAgreement = async () => {
    setAgreementChecked(true)
    await confirmPay()
  }

  const handlePaySuccess = async () => {
    setAgreementChecked(false)
    await simulatePaySuccess()
  }

  const handlePayCancel = () => {
    setAgreementChecked(false)
    simulatePayCancel()
  }

  const navTitle = variant === 'expired' ? undefined : '会员中心'

  return (
    <View style={{ minHeight: '100vh', background: LANHU_DARK }}>
      <LanhuNav title={navTitle} tone="dark" showBack />
      <ScrollView scrollY style={{ height: 'calc(100vh - 176rpx)', paddingBottom: '320rpx', boxSizing: 'border-box' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '6rpx 25rpx 320rpx', boxSizing: 'border-box' }}>
          <MemberHero
            membership={currentMembership}
            nickname={profileDemo.nickname}
            onRecords={goToRecords}
            onSubscription={() => Taro.navigateTo({ url: '/pages/membership/subscription' })}
          />
          <PlanRail plans={plans} activePlanId={activePlanId} onSelect={handleSelect} />
          <BenefitTitle title={getBenefitTitle(variant)} />
          {benefits.map((item) => (
            <BenefitCard key={item.title} {...item} />
          ))}
        </View>
      </ScrollView>
      <PayBar
        plan={activePlan}
        variant={variant}
        memberStatus={currentMembership.status}
        loading={payLoading}
        checked={agreementChecked}
        onToggle={() => setAgreementChecked((checked) => !checked)}
        onPay={handlePay}
      />
      <MembershipPaymentLayer
        payState={payState}
        plan={activePlan}
        previewAmount={paymentPreviewAmount}
        onClose={hidePaymentLayer}
        onSuccess={handlePaySuccess}
        onCancel={handlePayCancel}
        onConfirmAgreement={handleConfirmAgreement}
      />
    </View>
  )
}

function MemberHero({
  membership,
  nickname,
  onRecords,
  onSubscription,
}: {
  membership: { status: MemberStatus; expireTime?: string; planName?: string }
  nickname: string
  onRecords: () => void
  onSubscription: () => void
}) {
  const { status, expireTime, planName } = membership
  const desc = '你还不是会员，开通立享超多特权'
  const bottomText = getHeroBottomText(status, expireTime)
  const shouldShowRecords = status !== 'none'

  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '268rpx',
        borderRadius: '12rpx',
        overflow: 'hidden',
        background: '#2B2928',
      }}
    >
      <MemberHeroPattern />
      <Image
        src={defaultAvatar}
        mode="aspectFill"
        style={{
          position: 'absolute',
          left: '27rpx',
          top: '59rpx',
          width: '92rpx',
          height: '92rpx',
          borderRadius: '46rpx',
          border: `2rpx solid ${LANHU_GOLD}`,
        }}
      />
      <Text style={{ position: 'absolute', left: '150rpx', top: '58rpx', color: LANHU_GOLD, fontSize: '28rpx', fontWeight: 700 }}>
        {nickname}
      </Text>
      {status === 'expired' ? (
        <View
          style={{
            position: 'absolute',
            left: '150rpx',
            top: '104rpx',
            height: '42rpx',
            borderRadius: '21rpx',
            background: '#9A9A9A',
            padding: '0 26rpx',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>已过期</Text>
        </View>
      ) : status === 'active' ? (
        <View
          style={{
            position: 'absolute',
            left: '150rpx',
            top: '104rpx',
            height: '42rpx',
            borderRadius: '21rpx',
            background: '#3E2F08',
            padding: '0 22rpx',
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={onSubscription}
        >
          <Text style={{ color: LANHU_GOLD, fontSize: '24rpx' }}>{planName || '连续包年'}</Text>
        </View>
      ) : (
        <Text style={{ position: 'absolute', left: '150rpx', top: '104rpx', color: LANHU_GOLD, fontSize: '26rpx' }}>
          {desc}
        </Text>
      )}
      {shouldShowRecords && (
        <MemberRecordEntry onRecords={onRecords} />
      )}
      <Text style={{ position: 'absolute', left: '38rpx', bottom: '44rpx', color: '#FFFFFF', fontSize: '30rpx', fontWeight: 500 }}>
        {bottomText}
      </Text>
    </View>
  )
}

function MemberRecordEntry({ onRecords }: { onRecords: () => void }) {
  return (
    <View
      style={{
        position: 'absolute',
        right: '38rpx',
        top: '58rpx',
        height: '40rpx',
        display: 'flex',
        alignItems: 'center',
      }}
      onClick={onRecords}
    >
      <Text style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '40rpx', opacity: 0.9 }}>
        查看记录
      </Text>
    </View>
  )
}

function MemberHeroPattern() {
  const border = '12rpx solid rgba(134,126,103,0.22)'
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width: '700rpx', height: '268rpx', overflow: 'hidden', background: '#2B2928' }}>
      <View
        style={{
          position: 'absolute',
          right: '-70rpx',
          top: '-112rpx',
          width: '238rpx',
          height: '238rpx',
          borderRadius: '20rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '-72rpx',
          top: '82rpx',
          width: '218rpx',
          height: '218rpx',
          borderRadius: '20rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '140rpx',
          top: '156rpx',
          width: '154rpx',
          height: '154rpx',
          borderRadius: '18rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '256rpx',
          top: '-92rpx',
          width: '178rpx',
          height: '178rpx',
          borderRadius: '18rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '-76rpx',
          bottom: '-34rpx',
          width: '236rpx',
          height: '70rpx',
          borderRadius: '36rpx',
          background: 'rgba(214,180,95,0.05)',
        }}
      />
    </View>
  )
}

function getHeroBottomText(status: MemberStatus, expireTime?: string) {
  if (status === 'active') return `有效期： 2026.05.28 15:58 - ${expireTime || '2027.05.27 15:58'}`
  if (status === 'expired') return '尊贵特权已过期，重启会员，精准匹配、自由畅聊'
  return '专属9大特权，加速双向奔赴'
}

function PlanRail({
  plans,
  activePlanId,
  onSelect,
}: {
  plans: MembershipPlan[]
  activePlanId: number | null
  onSelect: (plan: MembershipPlan) => void
}) {
  const displayPlans = plans.length > 0 ? plans : []

  return (
    <ScrollView scrollX showScrollbar={false} style={{ width: '725rpx', marginTop: '54rpx' }}>
      <View style={{ display: 'flex', flexDirection: 'row', height: '248rpx', paddingLeft: '0' }}>
        {displayPlans.map((plan, index) => {
          const isActive = plan.id === activePlanId
          const label = plan.tag ?? (index === 0 ? '专属优惠' : '限时优惠')
          const months = plan.duration >= 365 ? 12 : plan.duration >= 90 ? 3 : 1
          const pricePerMonth = (plan.price / months).toFixed(2)
          const pricePerMonthText = plan.monthlyPriceLabel ?? `¥${pricePerMonth}/月`
          const duration = plan.durationLabel
          const header = getPlanHeader(plan)

          return (
            <View
              key={plan.id}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: '220rpx',
                height: '248rpx',
                borderRadius: '12rpx',
                border: isActive ? `4rpx solid ${LANHU_GOLD}` : '0',
                background: '#252323',
                marginRight: '8rpx',
                padding: '48rpx 24rpx 20rpx',
                boxSizing: 'border-box',
              }}
              onClick={() => onSelect(plan)}
            >
              <View
                style={{
                  position: 'absolute',
                  left: '16rpx',
                  top: '-22rpx',
                  height: '46rpx',
                  borderRadius: '8rpx',
                  background: LANHU_GOLD,
                  padding: '0 18rpx',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#8B5B19', fontSize: '22rpx', fontWeight: 600 }}>{label}</Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '40rpx' }}>{header}</Text>
              <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '42rpx', fontWeight: 700, lineHeight: '58rpx', marginTop: '8rpx' }}>
                {duration}
              </Text>
              <Text style={{ display: 'block', color: LANHU_GOLD, fontSize: '28rpx', fontWeight: 700, marginTop: '8rpx' }}>
                {pricePerMonthText}
              </Text>
              <Text style={{ display: 'block', color: '#9C9C9C', fontSize: '22rpx', marginTop: '8rpx' }}>
                ¥{plan.originalPrice}.00
              </Text>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

function BenefitTitle({ title }: { title: string }) {
  return (
    <View style={{ height: '104rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Image src={memberDividerLeft} mode="scaleToFill" style={{ width: '39rpx', height: '20rpx', marginRight: '20rpx' }} />
      <Text style={{ color: LANHU_GOLD, fontSize: '30rpx', fontWeight: 700 }}>{title}</Text>
      <Image src={memberDividerRight} mode="scaleToFill" style={{ width: '39rpx', height: '20rpx', marginLeft: '20rpx' }} />
    </View>
  )
}

function getBenefitTitle(variant: MembershipPageVariant) {
  if (variant === 'annual') return 'VIP特权'
  return '时空邂逅会员特权'
}

function BenefitCard({
  icon,
  title,
  value,
  desc,
}: {
  icon: string
  title: string
  value: string
  desc: string
}) {
  return (
    <View
      style={{
        width: '700rpx',
        height: '168rpx',
        borderRadius: '12rpx',
        background: '#22201F',
        marginBottom: '20rpx',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 36rpx',
        boxSizing: 'border-box',
      }}
    >
      <View style={{ width: '88rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '26rpx' }}>
        <MemberBenefitIcon icon={icon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#C4913F', fontSize: '30rpx', fontWeight: 700, lineHeight: '42rpx' }}>
          {title}
        </Text>
        {value && (
          <Text style={{ color: LANHU_GOLD, fontSize: '30rpx', fontWeight: 700, lineHeight: '42rpx' }}>
            {value}
          </Text>
        )}
        <Text style={{ display: 'block', color: '#9B7847', fontSize: '26rpx', lineHeight: '37rpx', marginTop: '10rpx' }}>
          {desc}
        </Text>
      </View>
    </View>
  )
}

function MemberBenefitIcon({ icon }: { icon: string }) {
  // 商业化校验保证当前权益 icon 都映射到 MCP 切片，缺切图必须先登记，不能静默画泛用占位。
  const iconAsset = MEMBER_BENEFIT_ICONS[icon]

  return <Image src={iconAsset.src} mode="scaleToFill" style={{ width: iconAsset.width, height: iconAsset.height }} />
}

function MembershipPaymentLayer({
  payState,
  plan,
  previewAmount,
  onClose,
  onSuccess,
  onCancel,
  onConfirmAgreement,
}: {
  payState: MembershipPayState
  plan?: MembershipPlan
  previewAmount?: string
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
  onConfirmAgreement: () => void
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
          amount={previewAmount ?? plan?.price.toFixed(2) ?? '0.00'}
          onClose={onClose}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )}
      {payState === 'unpaid-sheet' && (
        <UnpaidBottomSheet
          onPay={onConfirmAgreement}
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
        background: 'rgba(255, 255, 255, 0.32)',
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

function UnpaidBottomSheet({ onPay }: { onPay: () => void }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '388rpx',
        borderRadius: '40rpx 40rpx 0 0',
        background: '#FFFFFF',
        padding: '28rpx 44rpx 0',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ display: 'block', color: '#333333', fontSize: '34rpx', fontWeight: 700, lineHeight: '48rpx', textAlign: 'center' }}>确认开通会员</Text>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '30rpx' }}>
        <Text style={{ color: '#A9A9A9', fontSize: '32rpx', lineHeight: '50rpx' }}>我已阅读并同意</Text>
        <Text style={{ color: '#211D1E', fontSize: '32rpx', fontWeight: 700, lineHeight: '50rpx' }}>《时空邂逅会员服务协议》</Text>
      </View>
      <View
        style={{
          height: '98rpx',
          borderRadius: '98rpx',
          background: '#211D1E',
          marginTop: '50rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onPay}
      >
        <Text style={{ color: LANHU_GOLD, fontSize: '34rpx', fontWeight: 700 }}>确认并开通</Text>
      </View>
    </View>
  )
}

function PayBar({
  plan,
  variant,
  memberStatus,
  loading,
  checked,
  onToggle,
  onPay,
}: {
  plan?: MembershipPlan
  variant: MembershipPageVariant
  memberStatus: MemberStatus
  loading: boolean
  checked: boolean
  onToggle: () => void
  onPay: () => void
}) {
  const buttonText = getPayButtonText(memberStatus)
  const price = plan?.price.toFixed(2) ?? '0.00'
  const billingLabel = getBillingLabel(plan, variant)
  const agreement = getAgreementText(variant)
  const pricePrefix = memberStatus === 'active' ? '续费价 ' : memberStatus === 'expired' ? '重启价 ' : ''
  const loadingText = memberStatus === 'active' ? '续费中...' : memberStatus === 'expired' ? '开通中...' : '开通中...'

  return (
    <View
      style={{
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        minHeight: variant === 'annual' ? '262rpx' : '236rpx',
        borderRadius: '12rpx 12rpx 0 0',
        background: '#FFFFFF',
        padding: '40rpx 25rpx calc(30rpx + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
        zIndex: 20,
      }}
    >
      <View
        style={{
          height: '98rpx',
          borderRadius: '98rpx',
          background: '#211D1E',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '32rpx',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <Text style={{ color: LANHU_GOLD, fontSize: '30rpx', fontWeight: 700, maxWidth: '420rpx' }}>{pricePrefix}¥{price}{billingLabel ? `/${billingLabel}` : ''}</Text>
        <View
          style={{
            width: '248rpx',
            height: '98rpx',
            borderRadius: '98rpx',
            background: LANHU_GOLD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.72 : 1,
          }}
          onClick={onPay}
        >
          <Text style={{ color: '#211D1E', fontSize: '32rpx', fontWeight: 700 }}>{loading ? loadingText : buttonText}</Text>
        </View>
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: '26rpx' }} onClick={onToggle}>
        <View
          style={{
            width: '28rpx',
            height: '28rpx',
            borderRadius: '14rpx',
            border: checked ? '0' : '1rpx solid #C4913F',
            background: checked ? LANHU_GOLD : '#FFFFFF',
            marginRight: '12rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked && (
            <View
              style={{
                width: '14rpx',
                height: '8rpx',
                borderLeft: '3rpx solid #211D1E',
                borderBottom: '3rpx solid #211D1E',
                transform: 'rotate(-45deg)',
                marginTop: '-3rpx',
              }}
            />
          )}
        </View>
        <Text style={{ color: '#666666', fontSize: '24rpx' }}>阅读并同意</Text>
        <Text style={{ color: '#C4913F', fontSize: '24rpx' }}>《时空邂逅会员服务协议》</Text>
        {agreement.showContinuous && (
          <>
            <Text style={{ color: '#666666', fontSize: '24rpx' }}>及</Text>
            <Text style={{ color: '#C4913F', fontSize: '24rpx' }}>《连续订阅会员服务协议》</Text>
            <Text style={{ color: '#C4913F', fontSize: '24rpx' }}>
              {agreement.discountText}
            </Text>
          </>
        )}
      </View>
    </View>
  )
}

function getPayButtonText(memberStatus: MemberStatus) {
  if (memberStatus === 'active') return '立即续费'
  if (memberStatus === 'expired') return '重新开通'
  return '立即开通'
}

function getPlanHeader(plan: MembershipPlan) {
  if (plan.name === '年卡会员') return '年卡'
  return plan.name
}

function getBillingLabel(plan?: MembershipPlan, variant?: MembershipPageVariant) {
  if (!plan) return ''
  if (variant === 'annual' && plan.name === '连续包年') return '连续包年'
  if (plan.name === '年卡会员') return '年卡'
  if (plan.name.includes('包年')) return '包年'
  if (plan.name.includes('包季')) return '包季'
  if (plan.name.includes('包月')) return '包月'
  return plan.durationLabel
}

function getAgreementText(variant: MembershipPageVariant) {
  if (variant !== 'annual') {
    return { showContinuous: false, discountText: '' }
  }

  const renewalAmount = formatSubscriptionAmount(membershipDemo.subscription.renewalAmount)
  const originalAmount = formatSubscriptionAmount(membershipDemo.subscription.originalAmount)
  return {
    showContinuous: true,
    discountText: `享${renewalAmount}订阅优惠价（原价${originalAmount}），可随时取消自动续费`,
  }
}

function formatSubscriptionAmount(amount: string) {
  return amount.replace('¥', '').replace(/\.00$/, '')
}
