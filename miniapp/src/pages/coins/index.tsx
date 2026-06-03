import { View, Text, ScrollView } from '@tarojs/components'
import { useEffect } from 'react'
import { useCoins } from '@/hooks/useCoins'

/**
 * 成家币 — 1:1 还原蓝湖「成家币」设计稿
 * 750px 坐标系 ÷ 2 = 实际 CSS px
 */
export default function CoinsPage() {
  const {
    balance,
    packages,
    selectedPackage,
    payLoading,
    usages,
    fetchBalance,
    fetchPackages,
    selectPackage,
    purchase,
    goToDetail,
  } = useCoins()

  useEffect(() => {
    fetchBalance()
    fetchPackages()
  }, [fetchBalance, fetchPackages])

  /* 用途图标映射 */
  const usageIcons: Record<string, string> = {
    '送悄悄话': 'yo',
    '心动信号': '❤',
    '解锁理想型': '👤',
    '提升人气': '⚡',
    '解锁精选': '✱',
    '更多推荐': '★',
    '匿名解锁': '🔒',
    '限定活动': '🎁',
  }

  return (
    <View className="min-h-screen bg-[#F0F6FF] flex flex-col">
      <ScrollView scrollY className="flex-1" style={{ paddingTop: '12px', paddingBottom: '86px' }}>

        {/* ── 余额卡片 ── */}
        <View
          className="mx-[12px] rounded-[14px] px-[28px] py-[30px]"
          style={{ background: 'linear-gradient(180deg,#7B9DFB 0%,#2876FF 100%)' }}
        >
          <Text className="text-sm font-semibold text-white">成家币余额</Text>
          <View className="flex flex-row items-end justify-between mt-[4px]">
            <Text className="text-2xl font-bold text-white" style={{ fontSize: '40px', lineHeight: '48px' }}>
              {balance}
            </Text>
            <View
              className="flex flex-row items-center pb-[2px]"
              onClick={goToDetail}
            >
              <Text className="text-sm text-white">明细</Text>
              <Text className="text-sm text-white ml-[2px]">›</Text>
            </View>
          </View>
        </View>

        {/* ── 充值成家币 ── */}
        <View className="mx-[12px] mt-[16px] bg-white rounded-[12px] px-[16px] py-[14px]">
          <View className="flex flex-row items-center justify-between mb-[14px]">
            <Text className="text-base font-semibold text-[#153060]">充值成家币</Text>
            <View className="flex flex-row items-center">
              <Text className="text-sm text-[#999]">充值须知</Text>
              <Text className="text-sm text-[#999] ml-[2px]">›</Text>
            </View>
          </View>

          {/* 套餐横向滚动 */}
          <ScrollView scrollX className="w-full" showScrollbar={false}>
            <View className="flex flex-row gap-[10px] pr-[4px]">
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id
                return (
                  <View
                    key={pkg.id}
                    className="flex-shrink-0 w-[96px] rounded-[10px] flex flex-col items-center py-[14px] px-[8px]"
                    style={{
                      border: isSelected ? '2px solid #2876FF' : '2px solid #EFEFEF',
                      background: isSelected ? '#EEF5FF' : '#FAFAFA',
                    }}
                    onClick={() => selectPackage(pkg)}
                  >
                    {pkg.tag && (
                      <View className="absolute -top-[8px] left-0 right-0 flex items-center justify-center">
                        <View className="px-[6px] py-[1px] rounded-[4px] bg-[#FF4444]">
                          <Text className="text-xs text-white">{pkg.tag}</Text>
                        </View>
                      </View>
                    )}
                    {/* 成家币图标 */}
                    <View
                      className="w-[49px] h-[49px] rounded-full flex items-center justify-center mb-[6px]"
                      style={{ background: 'linear-gradient(180deg,#7B9DFB 0%,#2876FF 100%)' }}
                    >
                      <Text className="text-base font-bold text-white">¢</Text>
                    </View>
                    <Text className="text-[19px] font-bold text-[#153060]">{pkg.amount}</Text>
                    {pkg.label && (
                      <Text className="text-xs text-[#999] mt-[1px]">{pkg.label}</Text>
                    )}
                    <Text className="text-lg font-bold text-[#153060] mt-[4px]">¥{pkg.price}</Text>
                  </View>
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* ── 成家币用途 ── */}
        <View className="mx-[12px] mt-[10px] bg-white rounded-[12px] px-[16px] py-[14px]">
          <Text className="text-base font-semibold text-[#153060] mb-[16px]">成家币用途</Text>

          {/* 2行×4列 */}
          {[usages.slice(0, 4), usages.slice(4, 8)].map((row, rowIdx) => (
            <View key={rowIdx} className={`flex flex-row justify-between ${rowIdx > 0 ? 'mt-[16px]' : ''}`}>
              {row.map((usage) => (
                <View key={usage.label} className="flex flex-col items-center w-[72px]">
                  <View
                    className="w-[49px] h-[49px] rounded-full flex items-center justify-center mb-[6px]"
                    style={{ background: 'linear-gradient(180deg,#7499FB 0%,#2876FF 100%)' }}
                  >
                    <Text className="text-base text-white">
                      {usageIcons[usage.label] ?? '○'}
                    </Text>
                  </View>
                  <Text className="text-xs text-[#153060] text-center">{usage.label}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View className="h-[16px]" />
      </ScrollView>

      {/* ── 底部支付按钮（固定）── */}
      <View className="fixed bottom-0 left-0 right-0 px-[12px] py-[10px] bg-white"
        style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
        <View className="flex flex-row items-center justify-between mb-[6px] px-[4px]">
          <View className="flex flex-row items-center">
            <View className="w-[16px] h-[16px] rounded-full border border-[#999] mr-[6px]" />
            <Text className="text-xs text-[#999]">阅读并同意</Text>
            <Text className="text-xs text-[#2876FF]">《时空邂逅充值协议》</Text>
          </View>
        </View>
        <View
          className="rounded-[20px] py-[14px] flex items-center justify-center"
          style={{ background: '#2876FF', opacity: payLoading ? 0.7 : 1 }}
          onClick={purchase}
        >
          <Text className="text-[18px] font-semibold text-white">
            {payLoading ? '支付中...' : '立即支付'}
          </Text>
        </View>
      </View>
    </View>
  )
}
