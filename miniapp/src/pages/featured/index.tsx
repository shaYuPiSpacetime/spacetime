import { View, Text, ScrollView, Image } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { useFeatured } from '@/hooks/useFeatured'
import { mockCoinBalance, mockCoinPackages } from '@/services/mock'
import type { FeaturedGuest } from '@/types/featured'
import type { CoinPackage } from '@/types/coin'
import CustomNavBar from '@/components/CustomNavBar'

/** 页面顶部 Sub-Tab */
const SUB_TABS = ['心印测试', '精选', '理想型']

/**
 * 精选首页 — 1:1 还原蓝湖「成家-精选-无认证」设计稿
 *
 * 蓝湖设计规格（750px ÷ 2 → CSS px = rpx）：
 * - 背景：#F5F7FA
 * - 顶部 Sub-Tab 切换 + 右侧操作图标
 * - 嘉宾大图卡片堆叠（3张），锁定状态显示 🔒 蒙层
 * - 底部「解锁更多精选嘉宾」Banner + 立即解锁按钮
 * - 认证弹窗 / 购买成家币弹窗 / 解锁嘉宾弹窗
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

  const [activeSubTab, setActiveSubTab] = useState(1) // 默认「精选」

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
      <CustomNavBar title="精选" bgColor="#F5F7FA" showBack />

      {/* ── Sub-Tab 筛选栏 ── */}
      <View className="px-[12px] pt-[6px] pb-[4px]">
        <View className="flex flex-row items-center">
          <View className="flex flex-row flex-1">
            {SUB_TABS.map((tab, idx) => {
              const isActive = idx === activeSubTab
              return (
                <View
                  key={tab}
                  className="mr-[16px] pb-[8px]"
                  style={{ borderBottom: isActive ? '2px solid #7F8494' : '2px solid transparent' }}
                  onClick={() => setActiveSubTab(idx)}
                >
                  <Text className="text-[15px]" style={{ color: '#7F8494', fontWeight: isActive ? 600 : 400 }}>
                    {tab}
                  </Text>
                </View>
              )
            })}
          </View>
          <View className="flex flex-row items-center gap-[12px] pb-[8px]">
            <Text className="text-base text-[#888]">⏱</Text>
            <Text className="text-base text-[#888]">⚙</Text>
          </View>
        </View>
      </View>

      {/* ── 嘉宾卡片列表 ── */}
      <ScrollView scrollY className="flex-1" showScrollbar={false}>
        <View className="px-[12px] pt-[8px]">
          {guests.map((guest, idx) => (
            <View
              key={guest.id}
              className="relative rounded-[16px] overflow-hidden mb-[10px]"
              style={{
                height: idx === 0 ? '260px' : '220px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}
              onClick={() => handleCardClick(guest)}
            >
              {/* 背景图 / 占位渐变 */}
              {guest.avatar ? (
                <Image
                  className="absolute inset-0 w-full h-full"
                  style={{ zIndex: 0 }}
                  src={guest.avatar}
                  mode="aspectFill"
                />
              ) : (
                <View
                  className="absolute inset-0"
                  style={{
                    background: idx === 0
                      ? 'linear-gradient(135deg, #B0C4E4 0%, #7A9DCA 100%)'
                      : 'linear-gradient(135deg, #C4B5D4 0%, #9A7DCA 100%)',
                    zIndex: 0,
                  }}
                />
              )}

              {/* 锁定蒙层 */}
              {guest.isLocked && (
                <View
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1 }}
                >
                  <View
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <Text className="text-[28px]">🔒</Text>
                  </View>
                </View>
              )}

              {/* 底部渐变信息层 */}
              <View
                className="absolute bottom-0 left-0 right-0 pt-[40px] pb-[12px] px-[12px]"
                style={{
                  background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
                  zIndex: 2,
                }}
              >
                <Text className="text-[18px] font-semibold text-white">{guest.nickname}</Text>
                <Text className="text-[13px] text-white/80 mt-[2px]">
                  {guest.age}岁 · {guest.education}{guest.height ? ` · ${guest.height}cm` : ''}
                </Text>
              </View>

              {/* 右上角数字角标 (仅第一张) */}
              {idx === 0 && (
                <View
                  className="absolute top-[10px] right-[10px] flex items-center justify-center"
                  style={{
                    background: '#EE2525',
                    border: '2px solid #FFFFFF',
                    borderRadius: '13px',
                    minWidth: '24px',
                    height: '20px',
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    zIndex: 3,
                  }}
                >
                  <Text className="text-[11px] text-white">{guests.length + 42}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── 解锁更多嘉宾 Banner ── */}
        <View
          className="mx-[12px] mb-[16px] rounded-[8px] flex flex-row items-center justify-between px-[16px] py-[14px]"
          style={{ background: 'rgba(40,118,255,0.08)' }}
        >
          <View>
            <Text className="text-[15px] font-semibold text-[#153060]">解锁更多精选嘉宾</Text>
            <Text className="text-[12px] text-[#666] mt-[2px]">从这一刻起，遇见你的小确幸</Text>
          </View>
          <View
            className="px-[16px] py-[8px] rounded-[8px] bg-[#2876FF]"
            onClick={showAuthModal}
          >
            <Text className="text-[14px] text-white font-semibold">立即解锁</Text>
          </View>
        </View>

        <View className="h-[80px]" />
      </ScrollView>

      {/* ══════════════════ 弹窗体系 ══════════════════ */}

      {/* ── 认证弹窗 ── */}
      {authModalVisible && (
        <View
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.55)', top: 'env(safe-area-inset-top)' }}
          onClick={hideAuthModal}
        >
          <View
            className="flex flex-col items-center"
            style={{
              width: '310px',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '36px 28px 28px 28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <View
              className="flex items-center justify-center mb-[16px]"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                background: '#2876FF',
              }}
            >
              <Text className="text-[28px] text-white">✎</Text>
            </View>
            <Text className="text-[16px] font-semibold text-[#153060] text-center leading-[24px] mb-[20px]">
              {'完善资料并完成认证\n解锁更多专属权益'}
            </Text>
            <View
              className="w-full flex items-center justify-center rounded-[8px] bg-[#2876FF]"
              style={{ height: '44px' }}
              onClick={hideAuthModal}
            >
              <Text className="text-[15px] font-semibold text-white">立即完善</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── 购买成家币底部弹窗 ── */}
      {coinModalVisible && (
        <View
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.4)', top: 'env(safe-area-inset-top)' }}
          onClick={hideCoinModal}
        >
          <View
            className="absolute bottom-0 left-0 right-0 rounded-t-[16px] bg-white px-[16px] pt-[16px] pb-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-semibold text-[#153060] text-center block mb-[6px]">充值成家币</Text>
            <View className="flex flex-row justify-between mb-[12px]">
              <Text className="text-sm text-[#333]">
                本次消耗 {unlockCost} <Text className="text-xs text-[#FFC969]">◉</Text>
              </Text>
              <Text className="text-sm text-[#333]">
                余额 {mockCoinBalance} <Text className="text-xs text-[#FFC969]">◉</Text>
              </Text>
            </View>

            <View className="flex flex-col items-center mb-[10px]">
              <Text className="text-base font-semibold text-[#153060]">额外查看10位精选嘉宾</Text>
              <Text className="text-xs text-[#999] mt-[2px]">购买后若遇心仪嘉宾，需要使用成家币才能继续「对你心动」</Text>
            </View>

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
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.4)', top: 'env(safe-area-inset-top)' }}
          onClick={hideUnlockModal}
        >
          <View
            className="absolute bottom-0 left-0 right-0 rounded-t-[16px] bg-white px-[16px] pt-[20px] pb-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-semibold text-[#153060] text-center block mb-[16px]">解锁嘉宾</Text>

            <View className="flex flex-row items-center mb-[14px] p-[12px] bg-[#F5F7FA] rounded-[10px]">
              <View className="w-[40px] h-[40px] rounded-full bg-[#D0E5FA] flex items-center justify-center mr-[12px]">
                <Text className="text-base text-[#2876FF]">{selectedGuest.nickname.charAt(0)}</Text>
              </View>
              <View>
                <Text className="text-base font-semibold text-[#333]">{selectedGuest.nickname}</Text>
                <Text className="text-xs text-[#999]">{selectedGuest.age}岁 · {selectedGuest.education}</Text>
              </View>
            </View>

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
                className="flex-1 py-[13px] rounded-full-btn border border-[#E0E0E0] flex items-center justify-center"
                onClick={hideUnlockModal}
              >
                <Text className="text-base text-[#666]">取消</Text>
              </View>
              <View
                className="flex-1 py-[13px] rounded-full-btn bg-[#2876FF] flex items-center justify-center"
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
