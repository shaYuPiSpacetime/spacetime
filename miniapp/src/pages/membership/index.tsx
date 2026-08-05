import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { miniappOssIcons } from '@/constants/ossIcons'
import { useMembership, type MembershipPayState } from '@/hooks/useMembership'
import { useAuthStore } from '@/stores/authStore'
import type { MembershipPlan, MemberStatus, MyMembership } from '@/types/membership'
import {
  LANHU_DARK,
  LANHU_GOLD,
  LanhuNav,
} from '@/pages/lanhu/LanhuShell'

import defaultAvatar from '@/assets/profile/default-avatar.webp'

type MembershipPageVariant = 'default'
const MEMBER_PLAN_CARD_WIDTH_RPX = 220
const MEMBER_PLAN_CARD_GAP_RPX = 8
const MEMBER_PLAN_SELECTED_LEFT_RPX = 20
const MEMBER_BENEFIT_ICONS: Record<string, { src: string; width: string; height: string }> = {
  'heart-list': { src: miniappOssIcons.memberBenefitMatch, width: '78rpx', height: '62rpx' },
  'visitor-eye': { src: miniappOssIcons.memberBenefitEyeOpen, width: '78rpx', height: '52rpx' },
  'yo-message': { src: miniappOssIcons.memberBenefitGreeting, width: '78rpx', height: '78rpx' },
  'extra-browse': { src: miniappOssIcons.memberBenefitRecommend, width: '78rpx', height: '76rpx' },
  filter: { src: miniappOssIcons.memberBenefitFilter, width: '68rpx', height: '78rpx' },
  exposure: { src: miniappOssIcons.memberBenefitExposure, width: '72rpx', height: '78rpx' },
  replay: { src: miniappOssIcons.memberBenefitReplay, width: '78rpx', height: '78rpx' },
  'daily-heart': { src: miniappOssIcons.memberBenefitDailyHeart, width: '64rpx', height: '78rpx' },
}

export default function MembershipPage() {
  const variant: MembershipPageVariant = 'default'
  const authNickname = useAuthStore(state => state.nickname)
  const authAvatar = useAuthStore(state => state.avatar)
  const {
    myMembership,
    plans,
    benefits,
    fetchMyMembership,
    fetchPlans,
    fetchBenefits,
    selectPlan,
    confirmPay,
    payLoading,
    payState,
    showUnpaidSheet,
    hidePaymentLayer,
    goToRecords,
  } = useMembership()
  const initialActivePlan = plans[0] ?? null
  const [activePlanId, setActivePlanId] = useState<number | null>(initialActivePlan?.id ?? null)
  const [agreementChecked, setAgreementChecked] = useState(false)

  useEffect(() => {
    fetchMyMembership()
    fetchPlans()
    fetchBenefits()
  }, [fetchBenefits, fetchMyMembership, fetchPlans])

  useEffect(() => {
    if (plans.length === 0 || plans.some(plan => plan.id === activePlanId)) return
    const defaultPlan = plans[0]
    if (!defaultPlan) return
    setActivePlanId(defaultPlan.id)
    selectPlan(defaultPlan)
  }, [plans, activePlanId, selectPlan, variant])

  const activePlan = plans.find((plan) => plan.id === activePlanId)
  const currentMembership = myMembership
  const heroNickname = authNickname.trim() || '时空用户'
  const heroAvatar = authAvatar.trim() || defaultAvatar
  // 隐身/隐藏访问为后续预留权益，一期 Demo 不展示也不可启用。
  const visibleBenefits = benefits.filter(item => item.icon !== 'stealth')

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

  const navTitle = '会员中心'

  return (
    <View
      style={{
        height: '100vh',
        background: LANHU_DARK,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <LanhuNav title={navTitle} tone="dark" showBack />
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
          <MemberHero
            membership={currentMembership}
            avatar={heroAvatar}
            nickname={heroNickname}
            onRecords={goToRecords}
          />
          <PlanRail plans={plans} activePlanId={activePlanId} onSelect={handleSelect} />
          <BenefitTitle title={getBenefitTitle(variant)} />
          {visibleBenefits.map((item, index) => (
            <BenefitCard key={item.title} {...item} index={index + 1} />
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
        onClose={hidePaymentLayer}
        onConfirmAgreement={handleConfirmAgreement}
      />
    </View>
  )
}

function MemberHero({
  membership,
  avatar,
  nickname,
  onRecords,
}: {
  membership: MyMembership
  avatar: string
  nickname: string
  onRecords: () => void
}) {
  const { status, startTime, expireTime, planName } = membership
  const desc = '你还不是会员，开通立享超多特权'
  const bottomText = getHeroBottomText(status, startTime, expireTime)
  const shouldShowRecords = status !== 'none'

  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '268rpx',
        borderRadius: '12rpx',
        overflow: 'hidden',
        background: '#2B2B2B',
      }}
    >
      <MemberHeroPattern />
      <Image
        src={avatar}
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
        >
          <Text style={{ color: LANHU_GOLD, fontSize: '24rpx' }}>{planName || '会员权益'}</Text>
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
    <View style={{ position: 'absolute', left: 0, top: 0, width: '700rpx', height: '268rpx', overflow: 'hidden', background: '#2B2B2B' }}>
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
          right: '89rpx',
          top: '-92rpx',
          width: '178rpx',
          height: '178rpx',
          borderRadius: '18rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
    </View>
  )
}

function getHeroBottomText(status: MemberStatus, startTime?: string, expireTime?: string) {
  if (status === 'active') {
    const start = formatMembershipDate(startTime)
    const end = formatMembershipDate(expireTime)
    return start && end ? `有效期： ${start} - ${end}` : '会员权益生效中'
  }
  if (status === 'expired') return '尊贵特权已过期，重启会员，精准匹配、自由畅聊'
  return '专属权益，加速双向奔赴'
}

function formatMembershipDate(value?: string) {
  if (!value) return ''
  const normalized = value.replace('T', ' ').replace(/\+08:00$/, '')
  const [date = '', time = ''] = normalized.split(' ')
  const clock = time.split('.')[0].slice(0, 5)
  return `${date.replace(/-/g, '.')}${clock ? ` ${clock}` : ''}`
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
  const selectedIndex = Math.max(0, displayPlans.findIndex(plan => plan.id === activePlanId))
  const viewportWidth = Taro.getWindowInfo().windowWidth || 375
  const railScrollLeft = Math.max(
    0,
    selectedIndex * (MEMBER_PLAN_CARD_WIDTH_RPX + MEMBER_PLAN_CARD_GAP_RPX) - MEMBER_PLAN_SELECTED_LEFT_RPX,
  ) * viewportWidth / 750

  return (
    <ScrollView
      scrollX
      scrollLeft={railScrollLeft}
      scrollWithAnimation
      showScrollbar={false}
      style={{ width: '700rpx', height: '270rpx', marginTop: '32rpx' }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: `${Math.max(700, displayPlans.length * (MEMBER_PLAN_CARD_WIDTH_RPX + MEMBER_PLAN_CARD_GAP_RPX) - MEMBER_PLAN_CARD_GAP_RPX)}rpx`,
          height: '270rpx',
          paddingTop: '22rpx',
          boxSizing: 'border-box',
        }}
      >
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
                width: `${MEMBER_PLAN_CARD_WIDTH_RPX}rpx`,
                height: '248rpx',
                borderRadius: '12rpx',
                border: isActive ? `4rpx solid ${LANHU_GOLD}` : '0',
                background: '#252323',
                marginRight: `${MEMBER_PLAN_CARD_GAP_RPX}rpx`,
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
                ¥{plan.originalPrice.toFixed(2)}
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
      <Image src={miniappOssIcons.memberDividerLeft} mode="scaleToFill" style={{ width: '39rpx', height: '20rpx', marginRight: '20rpx' }} />
      <Text style={{ color: LANHU_GOLD, fontSize: '30rpx', fontWeight: 700 }}>{title}</Text>
      <Image src={miniappOssIcons.memberDividerRight} mode="scaleToFill" style={{ width: '39rpx', height: '20rpx', marginLeft: '20rpx' }} />
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
  index,
}: {
  icon: string
  title: string
  value: string
  desc: string
  index: number
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
      data-benefit-index={index}
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
  const iconAsset = MEMBER_BENEFIT_ICONS[icon] ?? MEMBER_BENEFIT_ICONS['heart-list']

  return <Image src={iconAsset.src} mode="scaleToFill" style={{ width: iconAsset.width, height: iconAsset.height }} />
}

function MembershipPaymentLayer({
  payState,
  onClose,
  onConfirmAgreement,
}: {
  payState: MembershipPayState
  onClose: () => void
  onConfirmAgreement: () => void
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
      {payState === 'paying' && (
        <View style={{ position: 'absolute', left: '175rpx', top: '500rpx', width: '400rpx', padding: '30rpx', borderRadius: '16rpx', background: '#FFFFFF', display: 'flex', alignItems: 'center' }}>
          <Text style={{ color: LANHU_DARK, fontSize: '28rpx' }}>正在打开微信支付并确认会员状态...</Text>
        </View>
      )}
      {payState === 'pay-failed' && (
        <View style={{ position: 'absolute', left: '175rpx', top: '500rpx', width: '400rpx', padding: '30rpx', borderRadius: '16rpx', background: '#FFFFFF', display: 'flex', alignItems: 'center' }} onClick={onClose}>
          <Text style={{ color: LANHU_DARK, fontSize: '28rpx' }}>支付结果确认中，请稍后查看订单</Text>
        </View>
      )}
      {payState === 'unpaid-sheet' && (
        <UnpaidBottomSheet
          onPay={onConfirmAgreement}
        />
      )}
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
        background: 'rgba(255, 255, 255, 0.32)',
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
  const pricePrefix = memberStatus === 'active' ? '再次购买价 ' : memberStatus === 'expired' ? '重新购买价 ' : ''
  const loadingText = memberStatus === 'active' ? '购买中...' : memberStatus === 'expired' ? '购买中...' : '开通中...'

  return (
    <View
      style={{
        minHeight: variant === 'annual' ? '262rpx' : '236rpx',
        flexShrink: 0,
        borderRadius: '12rpx 12rpx 0 0',
        background: '#FFFFFF',
        padding: '40rpx 25rpx max(30rpx, env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
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
      </View>
    </View>
  )
}

function getPayButtonText(memberStatus: MemberStatus) {
  if (memberStatus === 'active') return '再次购买'
  if (memberStatus === 'expired') return '重新开通'
  return '立即开通'
}

function getPlanHeader(plan: MembershipPlan) {
  if (plan.name === '年卡会员') return '年卡'
  return plan.name
}

function getBillingLabel(plan?: MembershipPlan, _variant?: MembershipPageVariant) {
  if (!plan) return ''
  if (plan.name === '年卡会员') return '年卡'
  if (plan.name.includes('包年')) return '包年'
  if (plan.name.includes('包季')) return '包季'
  if (plan.name.includes('包月')) return '包月'
  return plan.durationLabel
}
