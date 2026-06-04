import { View, Text, ScrollView } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { useMembership } from '@/hooks/useMembership'
import CustomNavBar from '@/components/CustomNavBar'

/** VIP 权益列表 */
const VIP_BENEFITS = [
  { icon: '❤', title: '心动名单一键揭晓：123人', desc: '有人对你心动了！看到最爱的，立即发起对话' },
  { icon: '👁', title: '谁来看过你：340位访客', desc: '访客全公开，别让在意你的人白等' },
  { icon: 'yo', title: '每日专属悄悄话1条', desc: '消息直接弹到对方主页，第一时间抓住ta的目光' },
  { icon: '⭐', title: '每日额外浏览10位嘉宾', desc: '比别人多一倍的机会，更快速遇见对的人' },
  { icon: '▦', title: '精准筛选功能', desc: '按你的标准定制筛选条件，只看最合心意的人' },
  { icon: '⚡', title: '曝光度拉满', desc: '你的资料优先展示给活跃用户和你心仪的对象' },
  { icon: '🕶', title: '隐身模式', desc: '只对你选中的人可见，主动权完全在你手上' },
  { icon: '↩', title: '三天回放功能', desc: '最近3天滑过的嘉宾都能找回，手滑也不怕' },
  { icon: '♥', title: '每日多5次心动机会', desc: '每天额外多看5张心动嘉宾，让缘分不被错过' },
]

/**
 * 会员中心 — 1:1 还原蓝湖「会员中心-全」设计稿
 * 深色金色主题
 */
export default function MembershipPage() {
  const { plans, fetchMyMembership, fetchPlans, selectPlan, confirmPay, payLoading } = useMembership()
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

  const handleSelectPlan = (plan: typeof plans[number]) => {
    setActivePlanId(plan.id)
    selectPlan(plan)
  }

  const handlePay = async () => {
    if (!activePlan) return Taro.showToast({ title: '请选择套餐', icon: 'none' })
    await confirmPay()
  }

  return (
    <View className="min-h-screen flex flex-col" style={{ background: '#1A1A1A' }}>
      <CustomNavBar title="会员中心" bgColor="#1A1A1A" titleColor="#FFFFFF" showBack />
      <ScrollView scrollY className="flex-1" style={{ paddingTop: '12px', paddingBottom: '90px' }}>

        {/* ── 用户信息 ── */}
        <View className="px-[16px] pt-[6px] pb-[14px] flex flex-row items-center">
          <View
            className="w-[40px] h-[40px] rounded-full bg-[#333] flex items-center justify-center mr-[10px]"
          >
            <Text className="text-lg text-[#888]">?</Text>
          </View>
          <View>
            <Text className="text-base font-semibold text-white">筱脑虎</Text>
            <Text className="text-xs text-[#999] mt-[2px]">你还不是会员，开通立享超多特权</Text>
          </View>
        </View>

        {/* ── 副标题 ── */}
        <Text className="px-[16px] text-[13px] text-[#888] mb-[14px]">专享9大特权，加速双向奔赴</Text>

        {/* ── 套餐横向滚动 ── */}
        <ScrollView scrollX showScrollbar={false} className="px-[12px]">
          <View className="flex flex-row gap-[10px] pr-[12px]">
            {plans.map((plan) => {
              const isActive = plan.id === activePlanId
              const pricePerMonth = (plan.price / (plan.duration / 30)).toFixed(2)
              return (
                <View
                  key={plan.id}
                  className="flex-shrink-0 w-[100px] rounded-[12px] py-[14px] px-[8px] flex flex-col items-center"
                  style={{
                    border: isActive ? '2px solid #FFC969' : '2px solid #333',
                    background: isActive ? '#2A2200' : '#272727',
                    position: 'relative',
                  }}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.tag && (
                    <View className="absolute -top-[10px] left-0 right-0 flex items-center justify-center">
                      <View className="px-[8px] py-[2px] rounded-[4px] bg-[#FFC969]">
                        <Text className="text-xs font-semibold text-[#333]">{plan.tag}</Text>
                      </View>
                    </View>
                  )}
                  <Text className="text-lg font-semibold text-[#FFC969]">{plan.durationLabel}</Text>
                  <Text className="text-[11px] text-[#FFC969] mt-[2px]">{plan.name}</Text>
                  <View className="mt-[8px] flex flex-row items-end">
                    <Text className="text-base text-[#FFC969]">¥</Text>
                    <Text className="text-[22px] font-bold text-[#FFC969] leading-none">{pricePerMonth}</Text>
                    <Text className="text-xs text-[#999] mb-[1px]">/月</Text>
                  </View>
                  {plan.originalPrice && (
                    <Text className="text-xs text-[#666] mt-[2px]" style={{ textDecoration: 'line-through' }}>
                      ¥{plan.originalPrice}
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        </ScrollView>

        {/* ── VIP 特权 标题 ── */}
        <View className="flex flex-row items-center justify-center mt-[20px] mb-[12px]">
          <Text className="text-[13px] text-[#FFC969] mx-[6px]">◆◆</Text>
          <Text className="text-base font-semibold text-[#FFC969]">VIP特权</Text>
          <Text className="text-[13px] text-[#FFC969] mx-[6px]">◆◆</Text>
        </View>

        {/* ── 权益列表 ── */}
        <View className="mx-[12px] rounded-[12px] overflow-hidden" style={{ background: '#242424' }}>
          {VIP_BENEFITS.map((benefit, idx) => (
            <View key={idx}>
              <View className="flex flex-row items-start px-[14px] py-[14px]">
                <View
                  className="w-[36px] h-[36px] rounded-full bg-[#333] flex-shrink-0 flex items-center justify-center mr-[12px] mt-[2px]"
                >
                  <Text className="text-base">{benefit.icon === 'yo' ? 'yo' : benefit.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">{benefit.title}</Text>
                  <Text className="text-xs text-[#888] mt-[3px] leading-relaxed">{benefit.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View className="h-[16px]" />
      </ScrollView>

      {/* ── 底部购买区（固定）── */}
      <View
        className="fixed bottom-0 left-0 right-0 px-[12px]"
        style={{
          background: '#1A1A1A',
          paddingTop: '10px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        }}
      >
        <View className="flex flex-row items-center justify-between mb-[8px]">
          <View className="flex flex-row items-baseline">
            <Text className="text-xl font-bold text-[#FFC969]">
              ¥{activePlan?.price ?? '---'}
            </Text>
            <Text className="text-xs text-[#888] ml-[4px]">/{activePlan?.durationLabel ?? ''}</Text>
          </View>
          <View
            className="px-[32px] py-[12px] rounded-[49px] flex items-center justify-center"
            style={{ background: '#FFC969', opacity: payLoading ? 0.7 : 1 }}
            onClick={handlePay}
          >
            <Text className="text-base font-semibold text-[#232323]">
              {payLoading ? '开通中...' : '立即开通'}
            </Text>
          </View>
        </View>
        <View className="flex flex-row items-center">
          <View className="w-[14px] h-[14px] rounded-full border border-[#666] mr-[6px]" />
          <Text className="text-xs text-[#666]">阅读并同意</Text>
          <Text className="text-xs text-[#2876FF]">《时空邂逅会员服务协议》</Text>
        </View>
      </View>
    </View>
  )
}
