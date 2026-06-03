import { View, Text, ScrollView, Image } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { useFeatured } from '@/hooks/useFeatured'
import { mockCoinBalance, mockCoinPackages } from '@/services/mock'
import type { FeaturedGuest } from '@/types/featured'
import type { CoinPackage } from '@/types/coin'

/** 页面顶部 Sub-Tab */
const SUB_TABS = ['心印测试', '精选', '理想型']

/**
 * 精选首页 — 1:1 还原蓝湖「成家-精选」设计稿
 * 特征：两张大图卡片堆叠 + 认证弹窗 + 购买成家币弹窗 + 解锁嘉宾弹窗
 * 蓝湖 750px → ÷2 → 实际 CSS px
 */
export default function FeaturedPage() {
  const {
    guests,
    authModalVisible,
    showAuthModal,
    hideAuthModal,
    coinModalVisible,
    showCoinModal,
    hideCoinModal,
    unlockModalVisible,
    showUnlockModal,
    hideUnlockModal,
    selectedGuest,
  } = useFeatured()

  const [activeSubTab, setActiveSubTab] = useState(1) // 默认精选

  const unlockCost = selectedGuest?.unlockCost ?? 0
  const afterBalance = Math.max(0, mockCoinBalance - unlockCost)
  const balanceInsufficient = mockCoinBalance < unlockCost

  const handleCardClick = (guest: FeaturedGuest) => {
    if (guest.isLocked) {
      showUnlockModal(guest)
    }
  }

  const handleUnlockConfirm = () => {
    if (balanceInsufficient) {
      hideUnlockModal()
      showCoinModal()
    } else {
      hideUnlockModal()
      Taro.showToast({ title: '解锁成功', icon: 'success' })
    }
  }

  const handleBuyPackage = (_pkg: CoinPackage) => {
    hideCoinModal()
    Taro.showToast({ title: '支付功能建设中', icon: 'none' })
  }

  return (
    <View className="min-h-screen bg-[#F5F7FA] flex flex-col">

      {/* ── 顶部导航 Header ── */}
      <View className="bg-white px-[12px] pt-[10px] pb-[0px]">
        {/* 行：品牌 + sub-tabs + 操作图标 */}
        <View className="flex flex-row items-center">
          {/* 品牌 Logo */}
          <View className="flex flex-row items-center mr-[6px]">
            <View
              className="w-[24px] h-[24px] rounded-[4px] bg-[#2876FF] flex items-center justify-center mr-[4px]"
            >
              <Text className="text-xs text-white font-bold">觅</Text>
            </View>
          </View>

          {/* Sub-tabs */}
          <View className="flex flex-row flex-1">
            {SUB_TABS.map((tab, idx) => {
              const isActive = idx === activeSubTab
              return (
                <View
                  key={tab}
                  className="mr-[16px] pb-[10px] relative"
                  onClick={() => setActiveSubTab(idx)}
                >
                  <Text
                    className="text-base font-medium"
                    style={{ color: isActive ? '#7F8494' : '#7F8494', fontWeight: isActive ? '500' : 'normal' }}
                  >
                    {tab}
                  </Text>
                  {isActive && (
                    <View
                      className="absolute bottom-0 left-0 right-0 h-[4px] rounded-t-[3px]"
                      style={{ background: 'rgba(40,118,255,0.8)' }}
                    />
                  )}
                </View>
              )
            })}
          </View>

          {/* 右侧操作图标 */}
          <View className="flex flex-row items-center gap-[12px] pb-[10px]">
            <Text className="text-base text-[#888]">⏱</Text>
            <Text className="text-base text-[#888]">⚙</Text>
            <Text className="text-base text-[#888]">···</Text>
            <View className="w-[20px] h-[20px] rounded-full border border-[#888] flex items-center justify-center">
              <Text className="text-xs text-[#888]">○</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── 嘉宾卡片列表 ── */}
      <ScrollView scrollY className="flex-1" showScrollbar={false}>
        <View className="px-[12px] pt-[10px]">
          {guests.map((guest, idx) => (
            <View
              key={guest.id}
              className="relative rounded-b-[16px] overflow-hidden mb-[10px]"
              style={{ height: '260px' }}
              onClick={() => handleCardClick(guest)}
            >
              {/* 背景图 */}
              {guest.avatar ? (
                <Image
                  className="absolute inset-0 w-full h-full"
                  src={guest.avatar}
                  mode="aspectFill"
                />
              ) : (
                <View
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg,#B0C4E4 0%,#7A9DCA 100%)' }}
                />
              )}

              {/* 锁定蒙层 */}
              {guest.isLocked && (
                <View
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.35)' }}
                >
                  <Text className="text-[40px]">🔒</Text>
                </View>
              )}

              {/* 底部渐变信息层 */}
              <View
                className="absolute bottom-0 left-0 right-0 pt-[40px] pb-[12px] px-[12px]"
                style={{ background: 'linear-gradient(0deg,rgba(0,0,0,0.3) 0%,rgba(0,0,0,0.2) 65%,rgba(255,255,255,0) 100%)' }}
              >
                <Text className="text-[19px] font-semibold text-white">{guest.nickname}</Text>
                <Text className="text-sm text-white/80 mt-[2px]">
                  {guest.age}岁 · {guest.education} {guest.height ? `· ${guest.height}cm` : ''}
                </Text>
              </View>

              {/* 右上角数字角标 (仅第一个) */}
              {idx === 0 && (
                <View
                  className="absolute top-[10px] right-[10px] px-[5px] py-[1px] rounded-[13px]"
                  style={{ background: '#EE2525', border: '2px solid #fff', minWidth: '24px' }}
                >
                  <Text className="text-xs text-white text-center">{guests.length + 42}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── 解锁更多嘉宾 Banner ── */}
        <View
          className="mx-[12px] mb-[16px] rounded-[8px] flex flex-row items-center justify-between px-[16px] py-[12px]"
          style={{ background: 'rgba(40,118,255,0.1)' }}
        >
          <View>
            <Text className="text-base font-semibold text-[#153060]">解锁更多精选嘉宾</Text>
            <Text className="text-xs text-[#666] mt-[2px]">从这一刻起，遇见你的小确幸</Text>
          </View>
          <View
            className="px-[14px] py-[7px] rounded-[8px] bg-[#2876FF]"
            onClick={showAuthModal}
          >
            <Text className="text-base text-white font-semibold">立即解锁</Text>
          </View>
        </View>

        <View className="h-[80px]" />
      </ScrollView>

      {/* ══════════════ 弹窗体系 ══════════════ */}

      {/* ── 认证弹窗 ── */}
      {authModalVisible && (
        <View
          className="fixed inset-0 flex items-center justify-center px-[28px]"
          style={{ background: 'rgba(0,0,0,0.3)', zIndex: 100 }}
          onClick={hideAuthModal}
        >
          <View
            className="w-full rounded-[16px] bg-[#EEF5FF] px-[24px] py-[32px] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 图标占位 */}
            <View
              className="w-[64px] h-[64px] rounded-[14px] bg-[#2876FF] flex items-center justify-center mb-[16px]"
            >
              <Text className="text-2xl text-white">✎</Text>
            </View>
            <Text className="text-lg font-semibold text-[#153060] text-center leading-relaxed">
              {'完善资料并完成认证\n解锁更多专属权益'}
            </Text>
            <View
              className="mt-[20px] w-full py-[14px] rounded-[8px] bg-[#2876FF] flex items-center justify-center"
              onClick={hideAuthModal}
            >
              <Text className="text-base font-semibold text-white">立即完善</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── 购买成家币底部弹窗 ── */}
      {coinModalVisible && (
        <View
          className="fixed inset-0"
          style={{ background: 'rgba(0,0,0,0.4)', zIndex: 100 }}
          onClick={hideCoinModal}
        >
          <View
            className="absolute bottom-0 left-0 right-0 rounded-t-[16px] bg-white px-[16px] pt-[16px] pb-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-semibold text-[#153060] text-center block mb-[6px]">充值成家币</Text>
            <View className="flex flex-row justify-between mb-[12px]">
              <Text className="text-sm text-[#333]">本次消耗 {unlockCost} <Text className="text-xs text-[#FFC969]">◉</Text></Text>
              <Text className="text-sm text-[#333]">余额 {mockCoinBalance} <Text className="text-xs text-[#FFC969]">◉</Text></Text>
            </View>

            <View className="flex flex-col items-center mb-[10px]">
              <Text className="text-base font-semibold text-[#153060]">额外查看10位精选嘉宾</Text>
              <Text className="text-xs text-[#999] mt-[2px]">购买后若遇心仪嘉宾，需要使用成家币才能继续「对你心动」</Text>
            </View>

            {/* 套餐横向滚动 */}
            <ScrollView scrollX showScrollbar={false} className="mb-[14px]">
              <View className="flex flex-row gap-[10px]">
                {mockCoinPackages.map((pkg) => (
                  <View
                    key={pkg.id}
                    className="flex-shrink-0 w-[90px] rounded-[10px] border-[2px] border-[#2876FF] bg-[#EEF5FF] py-[12px] flex flex-col items-center"
                    onClick={() => handleBuyPackage(pkg)}
                  >
                    <Text className="text-base font-bold text-[#2876FF]">{pkg.amount}</Text>
                    <Text className="text-xs text-[#666] mt-[2px]">{pkg.label}</Text>
                    <Text className="text-base font-bold text-[#153060] mt-[4px]">¥{pkg.price}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View
              className="w-full py-[14px] rounded-[20px] bg-[#2876FF] flex items-center justify-center mb-[8px]"
              onClick={() => handleBuyPackage(mockCoinPackages[0])}
            >
              <Text className="text-lg font-semibold text-white">立即获取成家币</Text>
            </View>
            <View className="flex flex-row items-center justify-center">
              <View className="w-[14px] h-[14px] rounded-full border border-[#999] mr-[6px]" />
              <Text className="text-xs text-[#999]">阅读并同意</Text>
              <Text className="text-xs text-[#2876FF]">《时空邂逅充值协议》</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── 解锁嘉宾底部弹窗 ── */}
      {unlockModalVisible && selectedGuest && (
        <View
          className="fixed inset-0"
          style={{ background: 'rgba(0,0,0,0.4)', zIndex: 100 }}
          onClick={hideUnlockModal}
        >
          <View
            className="absolute bottom-0 left-0 right-0 rounded-t-[16px] bg-white px-[16px] pt-[20px] pb-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-semibold text-[#153060] text-center block mb-[16px]">
              解锁嘉宾
            </Text>

            {/* 嘉宾信息 */}
            <View className="flex flex-row items-center mb-[14px] p-[12px] bg-[#F5F7FA] rounded-[10px]">
              <View className="w-[40px] h-[40px] rounded-full bg-[#D0E5FA] flex items-center justify-center mr-[12px]">
                <Text className="text-base text-[#2876FF]">{selectedGuest.nickname.charAt(0)}</Text>
              </View>
              <View>
                <Text className="text-base font-semibold text-[#333]">{selectedGuest.nickname}</Text>
                <Text className="text-xs text-[#999]">{selectedGuest.age}岁 · {selectedGuest.education}</Text>
              </View>
            </View>

            {/* 费用明细 */}
            <View className="mb-[14px]">
              {[
                { label: '解锁费用', value: `${unlockCost} 成家币` },
                { label: '当前余额', value: `${mockCoinBalance} 成家币` },
                { label: '解锁后余额', value: `${afterBalance} 成家币`, danger: balanceInsufficient },
              ].map((row) => (
                <View key={row.label} className="flex flex-row justify-between py-[6px]">
                  <Text className="text-sm text-[#999]">{row.label}</Text>
                  <Text className={`text-sm ${row.danger ? 'text-[#E54D42]' : 'text-[#333]'}`}>{row.value}</Text>
                </View>
              ))}
            </View>

            {balanceInsufficient && (
              <Text className="text-xs text-[#E54D42] text-center block mb-[8px]">
                成家币余额不足，请先购买成家币
              </Text>
            )}

            <View className="flex flex-row gap-[10px]">
              <View
                className="flex-1 py-[13px] rounded-[49px] border border-[#E0E0E0] flex items-center justify-center"
                onClick={hideUnlockModal}
              >
                <Text className="text-base text-[#666]">取消</Text>
              </View>
              <View
                className="flex-1 py-[13px] rounded-[49px] bg-[#2876FF] flex items-center justify-center"
                onClick={handleUnlockConfirm}
              >
                <Text className="text-base font-semibold text-white">
                  {balanceInsufficient ? '去购买' : '确认解锁'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
