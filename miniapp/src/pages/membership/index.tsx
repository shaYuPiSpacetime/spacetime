import { View, Text, ScrollView } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { useMembership } from '@/hooks/useMembership'
import CustomNavBar from '@/components/CustomNavBar'

/**
 * 会员中心页面 — 1:1 还原蓝湖「会员中心-全」设计稿
 *
 * 设计来源：蓝湖 750×2796 设计稿，深色主题 #151515
 * 关键转换：蓝湖 750px ÷ 2 = CSS px（designWidth=375，CSS 1px = 2rpx）
 *
 * 设计规格速查表（蓝湖值 → CSS值）：
 * ┌──────────────────────┬──────────┬──────────┐
 * │ 元素                  │ 蓝湖 px   │ CSS px   │
 * ├──────────────────────┼──────────┼──────────┤
 * │ 页面标题              │ 32px     │ 16px     │
 * │ 副标题                │ 26px     │ 13px     │
 * │ VIP特权标题           │ 28px     │ 14px     │
 * │ 特权卡片高度          │ 168px    │ 84px     │
 * │ 特权卡片圆角          │ 12px     │ 6px      │
 * │ 特权卡片间距          │ 20px     │ 10px     │
 * │ 卡片背景色            │ #22201F  │ #22201F  │
 * │ 金色文字              │ #FFC969  │ #FFC969  │
 * └──────────────────────┴──────────┴──────────┘
 */

/** VIP 9大特权 — 设计稿真实文案 */
const VIP_BENEFITS = [
  {
    icon: '❤',
    title: '心动名单',
    sub: '123人',
    desc: '一键揭晓谁喜欢你',
  },
  {
    icon: '👁',
    title: '访客记录',
    sub: '340人',
    desc: '谁看过你全公开',
  },
  {
    icon: '💬',
    title: '每日悄悄话',
    sub: '1条',
    desc: '直接弹到对方主页',
  },
  {
    icon: '⭐',
    title: '额外浏览',
    sub: '10位',
    desc: '比别人多一倍机会',
  },
  {
    icon: '🔍',
    title: '精准筛选',
    sub: '',
    desc: '只看最合心意的人',
  },
  {
    icon: '⚡',
    title: '曝光拉满',
    sub: '',
    desc: '优先展示给活跃用户',
  },
  {
    icon: '🕶',
    title: '隐身模式',
    sub: '',
    desc: '只对选中的人可见',
  },
  {
    icon: '↩',
    title: '三天回放',
    sub: '',
    desc: '滑过的嘉宾都能找回',
  },
  {
    icon: '♥',
    title: '额外心动',
    sub: '+5次',
    desc: '每天多看5张嘉宾',
  },
]

export default function MembershipPage() {
  const { plans, fetchMyMembership, fetchPlans, selectPlan, confirmPay, payLoading } =
    useMembership()
  const [activePlanId, setActivePlanId] = useState<number | null>(null)

  useEffect(() => {
    fetchMyMembership()
    fetchPlans()
  }, [fetchMyMembership, fetchPlans])

  // 默认选中第一个套餐
  useEffect(() => {
    if (plans.length > 0 && activePlanId === null) {
      setActivePlanId(plans[0].id)
      selectPlan(plans[0])
    }
  }, [plans, activePlanId, selectPlan])

  const activePlan = plans.find((p) => p.id === activePlanId)

  const handleSelectPlan = (plan: (typeof plans)[number]) => {
    setActivePlanId(plan.id)
    selectPlan(plan)
  }

  const handlePay = async () => {
    if (!activePlan) return Taro.showToast({ title: '请选择套餐', icon: 'none' })
    await confirmPay()
  }

  return (
    <View className="min-h-screen flex flex-col" style={{ background: '#151515' }}>
      {/* 自定义导航栏 — navigationStyle: 'custom' */}
      <CustomNavBar title="会员中心" bgColor="#151515" titleColor="#FFFFFF" showBack />

      <ScrollView scrollY className="flex-1" style={{ paddingBottom: '90px' }}>
        {/* ========== 页面标题区 ========== */}
        {/* 蓝湖 750 设计稿：标题 32px → 16px，副标题 26px → 13px */}
        <View className="px-[16px] pt-[14px] pb-[6px]">
          <Text
            className="font-semibold text-white"
            style={{ fontSize: '16px' /* 蓝湖 32px → 16px */ }}
          >
            会员中心
          </Text>
        </View>
        <View className="px-[16px] pb-[14px]">
          <Text
            className="text-white"
            style={{ fontSize: '13px' /* 蓝湖 26px → 13px */ }}
          >
            专属9大特权，加速双向奔赴
          </Text>
        </View>

        {/* ========== 用户信息卡片 ========== */}
        <View className="mx-[16px] mb-[16px] rounded-[6px] flex flex-row items-center px-[12px] py-[12px]"
          style={{ background: '#1E1C1B' }}
        >
          {/* 头像占位 — 蓝湖 80px → 40px CSS */}
          <View
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: '40px', height: '40px', background: '#333' }}
          >
            <Text style={{ fontSize: '18px', color: '#888' }}>?</Text>
          </View>
          <View className="ml-[10px] flex-1">
            <Text className="text-white font-semibold" style={{ fontSize: '14px' }}>
              筱脑虎
            </Text>
            <Text className="text-[#999] mt-[2px]" style={{ fontSize: '12px' }}>
              你还不是会员，开通立享超多特权
            </Text>
          </View>
          {/* 会员标识 */}
          <View
            className="rounded-[4px] px-[8px] py-[2px] flex-shrink-0"
            style={{ background: '#FFC969' }}
          >
            <Text style={{ fontSize: '10px', color: '#333', fontWeight: 600 }}>开通会员</Text>
          </View>
        </View>

        {/* ========== 套餐选择 — 横向滚动 ========== */}
        <ScrollView scrollX showScrollbar={false} className="px-[12px]">
          <View className="flex flex-row gap-[10px] pr-[12px] pb-[4px]">
            {plans.map((plan) => {
              const isActive = plan.id === activePlanId
              const pricePerMonth = (plan.price / (plan.duration / 30)).toFixed(0)
              return (
                <View
                  key={plan.id}
                  className="flex-shrink-0 rounded-[8px] py-[12px] px-[10px] flex flex-col items-center relative"
                  style={{
                    width: '100px',
                    border: isActive ? '1.5px solid #FFC969' : '1.5px solid #333',
                    background: isActive ? '#2A2200' : '#1E1C1B',
                  }}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {/* 标签 — 热门/最划算 */}
                  {plan.tag && (
                    <View
                      className="absolute flex items-center justify-center"
                      style={{ top: '-9px', left: 0, right: 0 }}
                    >
                      <View
                        className="rounded-[4px] px-[6px] py-[1px]"
                        style={{ background: '#FFC969' }}
                      >
                        <Text style={{ fontSize: '10px', fontWeight: 700, color: '#333' }}>
                          {plan.tag}
                        </Text>
                      </View>
                    </View>
                  )}
                  <Text
                    className="font-semibold"
                    style={{ fontSize: '15px', color: '#FFC969' }}
                  >
                    {plan.durationLabel}
                  </Text>
                  <Text style={{ fontSize: '11px', color: '#FFC969', marginTop: '2px' }}>
                    {plan.name}
                  </Text>
                  <View className="flex flex-row items-end mt-[6px]">
                    <Text style={{ fontSize: '12px', color: '#FFC969' }}>¥</Text>
                    <Text
                      className="font-bold leading-none"
                      style={{ fontSize: '20px', color: '#FFC969' }}
                    >
                      {pricePerMonth}
                    </Text>
                    <Text style={{ fontSize: '10px', color: '#999', marginBottom: '1px' }}>
                      /月
                    </Text>
                  </View>
                  {plan.originalPrice != null && plan.originalPrice > 0 && (
                    <Text
                      style={{
                        fontSize: '10px',
                        color: '#666',
                        marginTop: '2px',
                        textDecoration: 'line-through',
                      }}
                    >
                      ¥{plan.originalPrice}
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        </ScrollView>

        {/* ========== VIP特权 标题 ========== */}
        {/* 蓝湖 28px → 14px CSS */}
        <View className="flex flex-row items-center justify-center mt-[20px] mb-[14px]">
          <View style={{ width: '16px', height: '1px', background: '#FFC969', opacity: 0.4 }} />
          <Text
            className="font-semibold mx-[8px]"
            style={{ fontSize: '14px', color: '#FFC969' /* 蓝湖 28px → 14px */ }}
          >
            VIP特权
          </Text>
          <View style={{ width: '16px', height: '1px', background: '#FFC969', opacity: 0.4 }} />
        </View>

        {/* ========== 9大特权 3×3 网格 ========== */}
        {/* 卡片规格：蓝湖 168px 高 → 84px CSS，圆角 12px → 6px CSS，间距 20px → 10px CSS */}
        <View
          className="flex flex-row flex-wrap px-[16px]"
          style={{ columnGap: '10px', rowGap: '10px' /* 蓝湖 20px → 10px */ }}
        >
          {VIP_BENEFITS.map((benefit, idx) => (
            <View
              key={idx}
              className="flex flex-col items-center justify-center rounded-[6px]"
              style={{
                width: 'calc((100% - 20px) / 3)' /* 3列均分，减去2个gap */,
                height: '84px' /* 蓝湖 168px → 84px */,
                background: '#22201F',
              }}
            >
              {/* 图标 — 蓝湖约 36px → 18px CSS */}
              <Text style={{ fontSize: '18px', lineHeight: '20px' }}>{benefit.icon}</Text>
              {/* 标题 */}
              <View className="flex flex-row items-center mt-[4px]">
                <Text
                  className="text-white font-semibold"
                  style={{ fontSize: '12px', lineHeight: '16px' }}
                >
                  {benefit.title}
                </Text>
                {benefit.sub ? (
                  <Text
                    style={{
                      fontSize: '11px',
                      color: '#FFC969',
                      fontWeight: 600,
                      marginLeft: '2px',
                      lineHeight: '16px',
                    }}
                  >
                    {benefit.sub}
                  </Text>
                ) : null}
              </View>
              {/* 描述 */}
              <Text
                className="text-[#888] mt-[2px]"
                style={{ fontSize: '10px', lineHeight: '14px' }}
              >
                {benefit.desc}
              </Text>
            </View>
          ))}
        </View>

        {/* 底部留白 — 为固定购买栏让位 */}
        <View style={{ height: '20px' }} />
      </ScrollView>

      {/* ========== 底部购买栏（固定） ========== */}
      <View
        className="fixed bottom-0 left-0 right-0 px-[16px]"
        style={{
          background: '#151515',
          borderTop: '0.5px solid #222',
          paddingTop: '10px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        }}
      >
        <View className="flex flex-row items-center justify-between mb-[8px]">
          {/* 价格 */}
          <View className="flex flex-row items-baseline">
            <Text
              className="font-bold"
              style={{ fontSize: '22px', color: '#FFC969' }}
            >
              ¥{activePlan?.price ?? '---'}
            </Text>
            <Text style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}>
              /{activePlan?.durationLabel ?? ''}
            </Text>
          </View>
          {/* 支付按钮 */}
          <View
            className="rounded-[24px] flex items-center justify-center"
            style={{
              background: '#FFC969',
              opacity: payLoading ? 0.7 : 1,
              paddingTop: '12px',
              paddingBottom: '12px',
              paddingLeft: '40px',
              paddingRight: '40px',
            }}
            onClick={handlePay}
          >
            <Text
              className="font-semibold"
              style={{ fontSize: '15px', color: '#151515' }}
            >
              {payLoading ? '开通中...' : '立即开通'}
            </Text>
          </View>
        </View>
        {/* 协议 */}
        <View className="flex flex-row items-center">
          <View
            className="rounded-full border flex-shrink-0 mr-[6px]"
            style={{
              width: '14px',
              height: '14px',
              borderColor: '#666',
              borderWidth: '1px',
            }}
          />
          <Text style={{ fontSize: '11px', color: '#666' }}>阅读并同意</Text>
          <Text style={{ fontSize: '11px', color: '#2876FF' }}>
            《时空邂逅会员服务协议》
          </Text>
        </View>
      </View>
    </View>
  )
}
