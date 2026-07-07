import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { useMembership, type MembershipPayState } from '@/hooks/useMembership'
import { getDemoPageData } from '@/services/lanhuDemo'
import type { MembershipPlan, MemberStatus } from '@/types/membership'
import {
  LANHU_DARK,
  LANHU_GOLD,
  LanhuNav,
} from '@/pages/lanhu/LanhuShell'

import defaultAvatar from '@/assets/profile/default-avatar.webp'
import vipBg from '@/assets/lanhu/pages/member-vip-bg.webp'

const profileDemo = getDemoPageData('profile')
const membershipDemo = getDemoPageData('membership')
type MembershipPageVariant = 'none' | 'active' | 'expired' | 'annual' | 'subscription'

function resolveMembershipVariant(value?: string): MembershipPageVariant {
  if (value === 'active' || value === 'expired' || value === 'annual' || value === 'subscription') return value
  return 'none'
}

function resolveMembershipPayState(value?: string): MembershipPayState {
  if (value === 'wechat-pay' || value === 'pay-success' || value === 'pay-cancel' || value === 'unpaid-sheet') return value
  return 'idle'
}

export default function MembershipPage() {
  const router = useRouter()
  const variant = resolveMembershipVariant(String(router.params.variant || 'none'))
  const routePayState = resolveMembershipPayState(String(router.params.payState || 'idle'))
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
  const [activePlanId, setActivePlanId] = useState<number | null>(null)

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

  const handleSelect = (plan: MembershipPlan) => {
    setActivePlanId(plan.id)
    selectPlan(plan)
  }

  const handlePay = async () => {
    if (!activePlan) {
      Taro.showToast({ title: '请选择套餐', icon: 'none' })
      return
    }
    await confirmPay()
  }

  return (
    <View style={{ minHeight: '100vh', background: LANHU_DARK }}>
      <LanhuNav title="会员中心" tone="dark" showBack />
      <ScrollView scrollY style={{ height: 'calc(100vh - 176rpx)', paddingBottom: '220rpx', boxSizing: 'border-box' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '0 25rpx 220rpx', boxSizing: 'border-box' }}>
          <MemberHero membership={variant === 'expired' ? expiredMembership : myMembership} nickname={profileDemo.nickname} onRecords={goToRecords} />
          <PlanRail plans={plans} activePlanId={activePlanId} onSelect={handleSelect} />
          {variant === 'subscription' && (
            <SubscriptionPanel plan={activePlan} onManage={showUnpaidSheet} />
          )}
          <BenefitTitle />
          {benefits.map((item) => (
            <BenefitCard key={item.title} {...item} />
          ))}
        </View>
      </ScrollView>
      <PayBar plan={activePlan} loading={payLoading} status={myMembership.status} onPay={handlePay} />
      <MembershipPaymentLayer
        payState={payState}
        plan={activePlan}
        loading={payLoading}
        onClose={hidePaymentLayer}
        onSuccess={simulatePaySuccess}
        onCancel={simulatePayCancel}
        onUnpaid={showUnpaidSheet}
      />
    </View>
  )
}

function MemberHero({
  membership,
  nickname,
  onRecords,
}: {
  membership: { status: MemberStatus; expireTime?: string; planName?: string }
  nickname: string
  onRecords: () => void
}) {
  const { status, expireTime, planName } = membership
  const desc = status === 'active'
    ? `${planName || '会员'}权益正在生效中`
    : status === 'expired'
      ? '会员已过期，续费继续享权益'
      : '你还不是会员，开通立享超多特权'
  const extra = status === 'none' ? '点击查看开通记录' : `有效期至 ${expireTime || '2027.05.27 15:58'}`

  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '240rpx',
        borderRadius: '12rpx',
        overflow: 'hidden',
        background: '#2B2928',
      }}
      onClick={onRecords}
    >
      <Image src={vipBg} mode="scaleToFill" style={{ width: '700rpx', height: '240rpx', opacity: 0.95 }} />
      <Image
        src={defaultAvatar}
        mode="aspectFill"
        style={{
          position: 'absolute',
          left: '38rpx',
          top: '59rpx',
          width: '80rpx',
          height: '80rpx',
          borderRadius: '40rpx',
          border: `2rpx solid ${LANHU_GOLD}`,
        }}
      />
      <Text style={{ position: 'absolute', left: '150rpx', top: '58rpx', color: LANHU_GOLD, fontSize: '28rpx', fontWeight: 700 }}>
        {nickname}
      </Text>
      <Text style={{ position: 'absolute', left: '150rpx', top: '104rpx', color: LANHU_GOLD, fontSize: '26rpx' }}>
        {desc}
      </Text>
      <Text style={{ position: 'absolute', right: '38rpx', top: '58rpx', color: '#FFFFFF', fontSize: '22rpx', opacity: 0.82 }}>
        {extra}
      </Text>
      <Text style={{ position: 'absolute', left: '38rpx', bottom: '44rpx', color: '#FFFFFF', fontSize: '30rpx', fontWeight: 500 }}>
        专属9大特权，加速双向奔赴
      </Text>
    </View>
  )
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
      <View style={{ display: 'flex', flexDirection: 'row', height: '230rpx', paddingLeft: '0' }}>
        {displayPlans.map((plan, index) => {
          const isActive = plan.id === activePlanId
          const label = plan.tag ?? (index === 0 ? '专属优惠' : '限时优惠')
          const months = plan.duration >= 365 ? 12 : plan.duration >= 90 ? 3 : 1
          const pricePerMonth = (plan.price / months).toFixed(2)
          const duration = plan.durationLabel

          return (
            <View
              key={plan.id}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: '220rpx',
                height: '224rpx',
                borderRadius: '12rpx',
                border: isActive ? `4rpx solid ${LANHU_GOLD}` : '0',
                background: '#252323',
                marginRight: '16rpx',
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
              <Text style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '40rpx' }}>包{duration === '12个月' ? '年' : duration === '3个月' ? '季' : '月'}</Text>
              <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '42rpx', fontWeight: 700, lineHeight: '58rpx', marginTop: '8rpx' }}>
                {duration}
              </Text>
              <Text style={{ display: 'block', color: LANHU_GOLD, fontSize: '28rpx', fontWeight: 700, marginTop: '8rpx' }}>
                ¥{pricePerMonth}/月
              </Text>
              <Text style={{ display: 'block', color: '#9C9C9C', fontSize: '22rpx', textDecoration: 'line-through', marginTop: '8rpx' }}>
                ¥{plan.originalPrice}.00
              </Text>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

function BenefitTitle() {
  return (
    <View style={{ height: '98rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: LANHU_GOLD, fontSize: '42rpx', marginRight: '20rpx' }}>⌁</Text>
      <Text style={{ color: LANHU_GOLD, fontSize: '30rpx', fontWeight: 700 }}>VIP特权</Text>
      <Text style={{ color: LANHU_GOLD, fontSize: '42rpx', marginLeft: '20rpx' }}>⌁</Text>
    </View>
  )
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
        <Text style={{ color: '#C4913F', fontSize: icon === 'yo' ? '42rpx' : '58rpx', fontWeight: icon === 'yo' ? 700 : 400 }}>
          {icon}
        </Text>
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

function SubscriptionPanel({
  plan,
  onManage,
}: {
  plan?: MembershipPlan
  onManage: () => void
}) {
  const price = plan?.price.toFixed(2) ?? '568.00'
  return (
    <View
      style={{
        width: '700rpx',
        minHeight: '206rpx',
        borderRadius: '24rpx',
        background: '#2B2928',
        marginTop: '28rpx',
        padding: '30rpx',
        boxSizing: 'border-box',
        border: `2rpx solid ${LANHU_GOLD}`,
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: LANHU_GOLD, fontSize: '32rpx', fontWeight: 700 }}>订阅管理</Text>
          <Text style={{ display: 'block', color: '#C8A66E', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '12rpx' }}>
            当前连续订阅将于会员到期前自动续费
          </Text>
        </View>
        <View
          style={{
            height: '56rpx',
            borderRadius: '16rpx',
            background: LANHU_GOLD,
            padding: '0 26rpx',
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={onManage}
        >
          <Text style={{ color: '#211D1E', fontSize: '24rpx', fontWeight: 700 }}>管理</Text>
        </View>
      </View>
      <View
        style={{
          height: '98rpx',
          borderRadius: '98rpx',
          background: '#211D1E',
          marginTop: '24rpx',
          padding: '0 32rpx',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ color: LANHU_GOLD, fontSize: '28rpx', fontWeight: 700 }}>¥{price}/周期</Text>
        <Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>微信支付自动扣款</Text>
      </View>
    </View>
  )
}

function MembershipPaymentLayer({
  payState,
  plan,
  loading,
  onClose,
  onSuccess,
  onCancel,
  onUnpaid,
}: {
  payState: MembershipPayState
  plan?: MembershipPlan
  loading: boolean
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
  onUnpaid: () => void
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
          title="微信支付"
          subtitle="会员中心-微信支付"
          amount={plan?.price.toFixed(2) ?? '0.00'}
          loading={loading}
          onClose={onClose}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onUnpaid={onUnpaid}
        />
      )}
      {payState === 'pay-success' && (
        <PayResultModal
          tone="success"
          title="支付成功"
          desc="会员权益已开通，专属特权立即生效"
          primaryText="查看会员权益"
          secondaryText="关闭"
          onPrimary={onClose}
          onSecondary={onClose}
        />
      )}
      {payState === 'pay-cancel' && (
        <PayResultModal
          tone="cancel"
          title="取消支付"
          desc="本次订单未完成，可重新选择套餐继续开通"
          primaryText="继续支付"
          secondaryText="暂不开通"
          onPrimary={onUnpaid}
          onSecondary={onClose}
        />
      )}
      {payState === 'unpaid-sheet' && (
        <UnpaidBottomSheet
          amount={plan?.price.toFixed(2) ?? '0.00'}
          onClose={onClose}
          onPay={onSuccess}
        />
      )}
    </View>
  )
}

function WechatPayPanel({
  title,
  subtitle,
  amount,
  loading,
  onClose,
  onSuccess,
  onCancel,
  onUnpaid,
}: {
  title: string
  subtitle: string
  amount: string
  loading: boolean
  onClose: () => void
  onSuccess: () => void
  onCancel: () => void
  onUnpaid: () => void
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '516rpx',
        borderRadius: '24rpx 24rpx 0 0',
        background: '#FFFFFF',
        padding: '34rpx 30rpx calc(32rpx + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#211D1E', fontSize: '34rpx', fontWeight: 700 }}>{title}</Text>
        <Text style={{ color: '#999999', fontSize: '32rpx' }} onClick={onClose}>×</Text>
      </View>
      <View
        style={{
          borderRadius: '24rpx',
          background: '#F8F3EA',
          padding: '30rpx',
          marginTop: '28rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ color: '#8B5B19', fontSize: '24rpx' }}>{subtitle}</Text>
        <Text style={{ display: 'block', color: '#211D1E', fontSize: '52rpx', fontWeight: 700, marginTop: '18rpx' }}>¥{amount}</Text>
        <Text style={{ display: 'block', color: '#777777', fontSize: '24rpx', marginTop: '10rpx' }}>微信支付 mock 面板，可演示成功、取消和未支付路径</Text>
      </View>
      <View
        style={{
          height: '98rpx',
          borderRadius: '98rpx',
          background: LANHU_GOLD,
          marginTop: '32rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.72 : 1,
        }}
        onClick={onSuccess}
      >
        <Text style={{ color: '#211D1E', fontSize: '34rpx', fontWeight: 700 }}>{loading ? '支付中...' : '确认支付'}</Text>
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', marginTop: '22rpx' }}>
        <View
          style={{
            flex: 1,
            height: '72rpx',
            borderRadius: '16rpx',
            background: '#F3F3F3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16rpx',
          }}
          onClick={onCancel}
        >
          <Text style={{ color: '#666666', fontSize: '26rpx' }}>取消支付</Text>
        </View>
        <View
          style={{
            flex: 1,
            height: '72rpx',
            borderRadius: '16rpx',
            background: '#211D1E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onUnpaid}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '26rpx' }}>稍后支付</Text>
        </View>
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
        top: '318rpx',
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
          background: isSuccess ? '#20B56D' : '#F0A43A',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '50rpx', fontWeight: 700 }}>{isSuccess ? '✓' : '!'}</Text>
      </View>
      <Text style={{ display: 'block', color: '#211D1E', fontSize: '36rpx', fontWeight: 700, textAlign: 'center', marginTop: '26rpx' }}>{title}</Text>
      <Text style={{ display: 'block', color: '#777777', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '16rpx' }}>{desc}</Text>
      <View
        style={{
          height: '98rpx',
          borderRadius: '98rpx',
          background: isSuccess ? LANHU_GOLD : '#211D1E',
          marginTop: '34rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onPrimary}
      >
        <Text style={{ color: isSuccess ? '#211D1E' : '#FFFFFF', fontSize: '32rpx', fontWeight: 700 }}>{primaryText}</Text>
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

function UnpaidBottomSheet({
  amount,
  onClose,
  onPay,
}: {
  amount: string
  onClose: () => void
  onPay: () => void
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: '64rpx 64rpx 0 0',
        background: '#FFFFFF',
        padding: '46rpx 32rpx calc(34rpx + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ display: 'block', color: '#211D1E', fontSize: '36rpx', fontWeight: 700, textAlign: 'center' }}>订单尚未支付</Text>
      <Text style={{ display: 'block', color: '#777777', fontSize: '26rpx', lineHeight: '40rpx', textAlign: 'center', marginTop: '18rpx' }}>
        VIP 权益正在等你解锁，本次开通金额 ¥{amount}
      </Text>
      <View
        style={{
          height: '98rpx',
          borderRadius: '98rpx',
          background: LANHU_GOLD,
          marginTop: '36rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onPay}
      >
        <Text style={{ color: '#211D1E', fontSize: '34rpx', fontWeight: 700 }}>继续支付</Text>
      </View>
      <View
        style={{
          height: '72rpx',
          borderRadius: '16rpx',
          marginTop: '14rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <Text style={{ color: '#999999', fontSize: '26rpx' }}>暂不开通</Text>
      </View>
    </View>
  )
}

function PayBar({
  plan,
  loading,
  status,
  onPay,
}: {
  plan?: MembershipPlan
  loading: boolean
  status: MemberStatus
  onPay: () => void
}) {
  const buttonText = status === 'active' ? '立即续费' : '立即开通'
  const price = plan?.price.toFixed(2) ?? '0.00'
  const billingLabel = getBillingLabel(plan)

  return (
    <View
      style={{
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        minHeight: '236rpx',
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
        <Text style={{ color: LANHU_GOLD, fontSize: '30rpx', fontWeight: 700 }}>¥{price}{billingLabel ? `/${billingLabel}` : ''}</Text>
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
          <Text style={{ color: '#211D1E', fontSize: '34rpx', fontWeight: 700 }}>{loading ? '开通中...' : buttonText}</Text>
        </View>
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '30rpx' }}>
        <View style={{ width: '28rpx', height: '28rpx', borderRadius: '14rpx', border: '1rpx solid #C4913F', marginRight: '12rpx' }} />
        <Text style={{ color: '#666666', fontSize: '24rpx' }}>阅读并同意</Text>
        <Text style={{ color: '#C4913F', fontSize: '24rpx' }}>《时空邂逅会员服务协议》</Text>
      </View>
    </View>
  )
}

function getBillingLabel(plan?: MembershipPlan) {
  if (!plan) return ''
  if (plan.name.includes('包年')) return '包年'
  if (plan.name.includes('包季')) return '包季'
  if (plan.name.includes('包月')) return '包月'
  return plan.durationLabel
}
