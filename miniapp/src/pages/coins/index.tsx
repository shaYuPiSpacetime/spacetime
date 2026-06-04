import { View, Text, ScrollView } from '@tarojs/components'
import { useEffect } from 'react'
import { useCoins } from '@/hooks/useCoins'
import CustomNavBar from '@/components/CustomNavBar'

/**
 * 成家币 — 1:1 还原蓝湖「成家币」设计稿
 *
 * 设计来源：蓝湖设计稿「成家币」
 * 设计稿尺寸：750 × 1624
 * 换算规则：蓝湖 750px ÷ 2 = 实际 CSS px（designWidth=375，pxtransform 自动转 rpx）
 *
 * 关键设计 Token：
 *   - 导航栏标题色：#0C285A（与 text-dark #153060 不同，需精确匹配）
 *   - 余额卡片：蓝色渐变 180deg #7B9DFB → #2876FF
 *   - 正文标题色：#153060（text-dark） / 辅助文字：#999
 *   - 品牌蓝 #2876FF（brand-blue）
 *   - 版面左右留白：24px 设计 → 12px CSS
 *
 * 页面结构（自上而下）：
 *   1. 自定义导航栏 — 返回箭头 + 标题「成家币」
 *   2. 成家币余额卡片 — 蓝色渐变背景，余额数字 + 明细入口
 *   3. 充值成家币卡片 — 套餐横向滚动选择
 *   4. 成家币用途 — 8 个圆形图标 2×4 网格
 *   5. 底部固定支付按钮区域 — 协议勾选 + 立即支付
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

  /* ────── 用途图标映射（设计稿未提供图标资源，使用 emoji 占位）────── */
  const usageIcons: Record<string, string> = {
    '送悄悄话': '💌',
    '心动信号': '💝',
    '解锁理想型': '⭐',
    '提升人气': '🔥',
    '解锁精选': '💎',
    '更多推荐': '🎯',
    '匿名解锁': '👀',
    '限定活动': '🎪',
  }

  return (
    <View className="min-h-screen bg-[#F0F6FF] flex flex-col">
      {/* ────────────────────────────────────
          1. 自定义导航栏
          设计：返回箭头 + "成家币"标题(#0C285A) + 右侧胶囊按钮(微信框架自带)
          ──────────────────────────────────── */}
      <CustomNavBar title="成家币" bgColor="#F0F6FF" titleColor="#0C285A" showBack />

      <ScrollView scrollY className="flex-1" style={{ paddingTop: '12px', paddingBottom: '86px' }}>

        {/* ────────────────────────────────────
            2. 成家币余额卡片
            设计：蓝色渐变背景，圆角卡片
            蓝湖 750px 坐标系 → 左右边距 24→12px，圆角 28→14px
            "成家币余额" 24px 设计 → 12px CSS (text-sm)，白色
            余额数字 "1800" 48px 设计 → 24px CSS (text-2xl)，白色粗体
            "明细" 24px 设计 → 12px CSS (text-sm)，白色
            ──────────────────────────────────── */}
        <View
          className="mx-[12px] rounded-[14px] px-[28px] py-[30px]"
          style={{ background: 'linear-gradient(180deg, #7B9DFB 0%, #2876FF 100%)' }}
        >
          {/* 标题行：成家币余额 */}
          <Text className="text-sm font-semibold text-white">
            成家币余额
          </Text>

          {/* 余额数字 + 明细入口 */}
          <View className="flex flex-row items-end justify-between mt-[4px]">
            <Text className="text-2xl font-bold text-white" style={{ lineHeight: '30px' }}>
              {balance}
            </Text>
            {/* 明细 — 点击跳转交易明细页 */}
            <View
              className="flex flex-row items-center pb-[2px]"
              onClick={goToDetail}
              hoverClass="opacity-70"
            >
              <Text className="text-sm text-white">明细</Text>
              <Text className="text-sm text-white ml-[2px]">›</Text>
            </View>
          </View>
        </View>

        {/* ────────────────────────────────────
            3. 充值成家币卡片
            设计：白色背景，圆角 24px 设计 → 12px CSS
            标题 "充值成家币" 28px 设计 → 14px CSS (text-base)，#153060
            "充值须知" 24px 设计 → 12px CSS (text-sm)，#999
            套餐横向滚动选择
            ──────────────────────────────────── */}
        <View className="mx-[12px] mt-[16px] bg-white rounded-card px-[16px] py-[14px]">
          {/* 卡片标题栏 */}
          <View className="flex flex-row items-center justify-between mb-[14px]">
            <Text className="text-base font-semibold text-text-dark">充值成家币</Text>
            <View className="flex flex-row items-center">
              <Text className="text-sm text-[#999]">充值须知</Text>
              <Text className="text-sm text-[#999] ml-[2px]">›</Text>
            </View>
          </View>

          {/* 套餐横向滚动列表 */}
          <ScrollView scrollX className="w-full" showScrollbar={false}>
            <View className="flex flex-row gap-[10px] pr-[4px]">
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id
                return (
                  <View
                    key={pkg.id}
                    className="flex-shrink-0 w-[96px] rounded-[10px] flex flex-col items-center py-[14px] px-[8px] relative"
                    style={{
                      border: isSelected ? '2px solid #2876FF' : '2px solid #EFEFEF',
                      background: isSelected ? '#EEF5FF' : '#FAFAFA',
                    }}
                    onClick={() => selectPackage(pkg)}
                  >
                    {/* 热门/推荐标签 */}
                    {pkg.tag && (
                      <View className="absolute -top-[8px] left-0 right-0 flex items-center justify-center">
                        <View className="px-[6px] py-[1px] rounded-[4px] bg-[#FF4444]">
                          <Text className="text-xs text-white">{pkg.tag}</Text>
                        </View>
                      </View>
                    )}

                    {/* 成家币图标：49px 设计 → 24.5px CSS ≈ rounded-full */}
                    <View
                      className="w-[49px] h-[49px] rounded-full flex items-center justify-center mb-[6px]"
                      style={{ background: 'linear-gradient(180deg, #7B9DFB 0%, #2876FF 100%)' }}
                    >
                      <Text className="text-base font-bold text-white">¢</Text>
                    </View>

                    {/* 币数：38px 设计 → 19px CSS */}
                    <Text className="text-19 font-bold text-text-dark">{pkg.amount}</Text>

                    {/* 副标签（如 "60个"） */}
                    {pkg.label && (
                      <Text className="text-xs text-[#999] mt-[1px]">{pkg.label}</Text>
                    )}

                    {/* 价格 */}
                    <Text className="text-lg font-bold text-text-dark mt-[4px]">¥{pkg.price}</Text>
                  </View>
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* ────────────────────────────────────
            4. 成家币用途
            设计：8 个圆形图标，2 行 × 4 列
            图标尺寸：98px 设计 → 49px CSS，border-radius 49px 设计 → 24.5px CSS
            图标背景：蓝色渐变 180deg #7499FB → #2876FF
            标签文字：#153060，居中
            第一行：送悄悄话 / 心动信号 / 解锁理想型 / 提升人气
            第二行：解锁精选 / 更多推荐 / 匿名解锁 / 限定活动
            ──────────────────────────────────── */}
        <View className="mx-[12px] mt-[10px] bg-white rounded-card px-[16px] py-[14px]">
          <Text className="text-base font-semibold text-text-dark mb-[16px]">成家币用途</Text>

          {/* 2 行 × 4 列网格 */}
          {[usages.slice(0, 4), usages.slice(4, 8)].map((row, rowIdx) => (
            <View
              key={rowIdx}
              className={`flex flex-row justify-between ${rowIdx > 0 ? 'mt-[16px]' : ''}`}
            >
              {row.map((usage) => (
                <View key={usage.label} className="flex flex-col items-center w-[72px]">
                  {/* 图标：98px 设计 → 49px CSS，圆角 49px 设计 → 24.5px CSS ≈ rounded-full */}
                  <View
                    className="w-[49px] h-[49px] rounded-full flex items-center justify-center mb-[6px]"
                    style={{ background: 'linear-gradient(180deg, #7499FB 0%, #2876FF 100%)' }}
                  >
                    <Text className="text-base text-white">
                      {usageIcons[usage.label] ?? '○'}
                    </Text>
                  </View>
                  {/* 用途标签 */}
                  <Text className="text-xs text-text-dark text-center">{usage.label}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* 底部留白，避免被支付按钮遮挡 */}
        <View className="h-[16px]" />
      </ScrollView>

      {/* ────────────────────────────────────
          5. 底部固定支付按钮区域
          设计：白色背景 + 协议勾选 + 蓝色支付按钮
          按钮：品牌蓝 #2876FF，圆角 20px 设计 → 10px CSS
          按钮文字 "立即支付"：36px 设计 → 18px CSS (text-xl)，白色
          适配安全区域
          ──────────────────────────────────── */}
      <View
        className="fixed bottom-0 left-0 right-0 px-[12px] py-[10px] bg-white"
        style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}
      >
        {/* 协议勾选 */}
        <View className="flex flex-row items-center justify-between mb-[6px] px-[4px]">
          <View className="flex flex-row items-center">
            <View className="w-[16px] h-[16px] rounded-full border border-[#999] mr-[6px]" />
            <Text className="text-xs text-[#999]">阅读并同意</Text>
            <Text className="text-xs text-brand-blue">《时空邂逅充值协议》</Text>
          </View>
        </View>

        {/* 立即支付按钮 */}
        <View
          className="rounded-[10px] py-[14px] flex items-center justify-center"
          style={{ background: '#2876FF', opacity: payLoading ? 0.7 : 1 }}
          onClick={purchase}
          hoverClass="opacity-80"
        >
          <Text className="text-xl font-semibold text-white">
            {payLoading ? '支付中...' : '立即支付'}
          </Text>
        </View>
      </View>
    </View>
  )
}
