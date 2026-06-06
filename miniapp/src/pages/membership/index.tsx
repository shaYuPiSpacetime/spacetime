import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { useMembership } from '@/hooks/useMembership'
import type { MembershipPlan, MemberStatus } from '@/types/membership'
import {
  LANHU_DARK,
  LANHU_GOLD,
  LanhuNav,
} from '@/pages/lanhu/LanhuShell'

import defaultAvatar from '@/assets/profile/default-avatar.png'
import vipBg from '@/assets/lanhu/pages/member-vip-bg.png'

const BENEFITS = [
  { icon: '♡', title: '心动名单一键揭晓：', value: '123人', desc: '有人对你心动了！看到喜欢的，立即发起对话' },
  { icon: '◎', title: '谁来看过你：', value: '340位访客', desc: '访客全公开，别让在意你的人白等' },
  { icon: 'yo', title: '每日专属悄悄话1条', value: '', desc: '消息直接弹到对方主页，第一时间抓住ta的目光' },
  { icon: '☆', title: '每日额外浏览10位嘉宾', value: '', desc: '比别人多一倍的机会，更快遇见对的人' },
  { icon: '▾', title: '精准筛选功能', value: '', desc: '按你的标准定制筛选条件，只看最合心意的人' },
  { icon: '♢', title: '曝光度拉满', value: '', desc: '你的资料优先展示给活跃用户和你心仪的对象' },
  { icon: '◌', title: '隐身模式', value: '', desc: '只对你选中的人可见，主动权完全在你手上' },
  { icon: '↶', title: '三天回放功能', value: '', desc: '最近3天滑过的嘉宾都能找回，手滑也不怕' },
  { icon: '☻', title: '每日多5次心动机会', value: '', desc: '每天额外多看5张心动嘉宾，让缘分不被错过' },
]

export default function MembershipPage() {
  const {
    myMembership,
    plans,
    fetchMyMembership,
    fetchPlans,
    selectPlan,
    confirmPay,
    payLoading,
    goToRecords,
  } = useMembership()
  const [activePlanId, setActivePlanId] = useState<number | null>(null)

  useEffect(() => {
    fetchMyMembership()
    fetchPlans()
  }, [fetchMyMembership, fetchPlans])

  useEffect(() => {
    if (plans.length > 0 && activePlanId === null) {
      const defaultPlan = plans[0]
      setActivePlanId(defaultPlan.id)
      selectPlan(defaultPlan)
    }
  }, [plans, activePlanId, selectPlan])

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
          <MemberHero status={myMembership.status} onRecords={goToRecords} />
          <PlanRail plans={plans} activePlanId={activePlanId} onSelect={handleSelect} />
          <BenefitTitle />
          {BENEFITS.map((item) => (
            <BenefitCard key={item.title} {...item} />
          ))}
        </View>
      </ScrollView>
      <PayBar plan={activePlan} loading={payLoading} status={myMembership.status} onPay={handlePay} />
    </View>
  )
}

function MemberHero({ status, onRecords }: { status: MemberStatus; onRecords: () => void }) {
  const desc = status === 'active'
    ? '你的会员权益正在生效中'
    : status === 'expired'
      ? '会员已过期，续费继续享权益'
      : '你还不是会员，开通立享超多特权'

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
        筱脑虎
      </Text>
      <Text style={{ position: 'absolute', left: '150rpx', top: '104rpx', color: LANHU_GOLD, fontSize: '26rpx' }}>
        {desc}
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
          const label = index === 0 ? '专属2.1折' : index === 1 ? '专属5.2折' : index === 2 ? '尝鲜首选' : '专属优惠'
          const pricePerMonth = plan.duration >= 365 ? '57.33' : plan.duration >= 90 ? '139.33' : '268.00'
          const duration = plan.duration >= 365 ? '12个月' : plan.duration >= 90 ? '3个月' : '1个月'

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
  const price = plan?.duration && plan.duration >= 365 ? '568.00' : plan?.price?.toFixed(2) ?? '568.00'

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
          borderRadius: '49rpx',
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
        <Text style={{ color: LANHU_GOLD, fontSize: '30rpx', fontWeight: 700 }}>¥{price}/包年</Text>
        <View
          style={{
            width: '248rpx',
            height: '98rpx',
            borderRadius: '49rpx',
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
