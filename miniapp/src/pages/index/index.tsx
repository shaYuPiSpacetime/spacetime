import { View, Text, Textarea, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useMatch } from '@/hooks/useMatch';
import CustomNavBar from '@/components/CustomNavBar';

/** 顶部 Sub-Tab */
const SUB_TABS = ['心印测试', '精选', '理想型'];

/**
 * 觅缘首页 (Tab: 推荐) — 1:1 还原蓝湖「成家-觅缘-信息未完善」设计稿
 *
 * 蓝湖设计规格（750px ÷ 2 → 375 CSS px = rpx）：
 * - 背景：浅蓝渐变 #E8F4FF → #F0F7FF
 * - 顶部 Sub-Tab：心印测试 | 精选 | 理想型，灰度色 #7F8494
 * - 信息完善状态：大图卡片 + 悄悄话交互面板
 * - 信息未完善状态：用户头像 + 引导文案 + 完善信息按钮
 */
export default function IndexPage() {
  const {
    currentUser,
    sendYoText,
    yoText,
    setYoText,
    showCertPopup,
    openCertPopup,
    closeCertPopup,
    isProfileComplete,
    navigateToProfileEdit,
  } = useMatch();

  const [activeSubTab, setActiveSubTab] = useState(0);

  const user = currentUser;

  const handleSend = async () => {
    if (!yoText.trim()) {
      Taro.showToast({ title: '请写点什么', icon: 'none' });
      return;
    }
    await sendYoText();
    Taro.showToast({ title: '发送成功', icon: 'success' });
  };

  // ===================================================================
  // 信息已完善 — 大图卡片 + 悄悄话面板
  // ===================================================================
  if (isProfileComplete) {
    return (
      <View className="min-h-screen bg-[#F5F7FA] flex flex-col">
        <CustomNavBar bgColor="transparent" />

        {/* 内容筛选栏 */}
        <View className="px-[12px] pt-[10px] pb-[0px]">
          <View className="flex flex-row items-center">
            <View className="flex flex-row flex-1">
              {SUB_TABS.map((tab, idx) => {
                const isActive = idx === activeSubTab;
                return (
                  <View
                    key={tab}
                    className="mr-[16px] pb-[10px]"
                    onClick={() => setActiveSubTab(idx)}
                  >
                    <Text className="text-base" style={{ color: '#7F8494', fontWeight: isActive ? '500' : 'normal' }}>
                      {tab}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View className="flex flex-row items-center gap-[12px] pb-[10px]">
              <Text className="text-base text-[#888]">⏱</Text>
              <Text className="text-base text-[#888]">⚙</Text>
            </View>
          </View>
        </View>

        {/* ── 用户大图卡片 ── */}
        <View className="relative mx-[12px] mt-[10px] rounded-t-[16px] overflow-hidden" style={{ height: '280px' }}>
          {user ? (
            user.avatar ? (
              <Image className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} src={user.avatar} mode="aspectFill" />
            ) : (
              <View
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#B3C9E8 0%,#7FA8CF 100%)', zIndex: 0 }}
              >
                <Text className="text-[48px] text-white/40">{user.nickname?.charAt(0)}</Text>
              </View>
            )
          ) : (
            <View className="absolute inset-0 bg-[#D0E5FA] flex items-center justify-center" style={{ zIndex: 0 }}>
              <Text className="text-base text-[#999]">加载中...</Text>
            </View>
          )}

          <View
            className="absolute top-[12px] right-[12px] w-[24px] h-[24px] rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1 }}
          >
            <Text className="text-xs text-white">↗</Text>
          </View>

          {user && (
            <View className="absolute bottom-[10px] left-[12px]" style={{ zIndex: 1 }}>
              <Text className="text-[19px] font-semibold text-white">{user.nickname}</Text>
              <View className="flex flex-row items-center gap-[6px] mt-[2px]">
                <View className="px-[8px] py-[2px] rounded-[24px] bg-[#E3F1FE]">
                  <Text className="text-xs text-[#2876FF]">{user.age}岁</Text>
                </View>
                {user.education && (
                  <View className="px-[8px] py-[2px] rounded-[24px] bg-[rgba(0,0,0,0.2)]">
                    <Text className="text-xs text-white">{user.education}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* ── 悄悄话发送面板 ── */}
        <View
          className="mx-[12px] rounded-b-[32px] bg-white px-[20px] pt-[22px] pb-[24px]"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <View className="flex flex-row items-center justify-center mb-[2px]">
            <Text className="text-base font-semibold text-[#333]">悄悄话</Text>
            <View
              className="ml-[4px] w-[16px] h-[16px] rounded-full border border-[#999] flex items-center justify-center"
              onClick={openCertPopup}
            >
              <Text className="text-xs text-[#999]">?</Text>
            </View>
          </View>
          <Text className="text-xs text-[#999] text-center block mb-[14px]">
            第一时间抓住TA的目光
          </Text>

          {user && (
            <View className="flex flex-row items-center mb-[12px]">
              <View className="w-[32px] h-[32px] rounded-full bg-[#D0E5FA] mr-[10px] flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <Image className="w-full h-full" src={user.avatar} mode="aspectFill" />
                ) : (
                  <Text className="text-base text-[#2876FF]">{user.nickname?.charAt(0)}</Text>
                )}
              </View>
              <View>
                <Text className="text-sm font-semibold text-[#333]">{user.nickname}</Text>
                <Text className="text-xs text-[#999]">
                  {user.age}岁 {user.tags.length > 0 ? `· ${user.tags[0]}` : ''} {user.education}
                </Text>
              </View>
            </View>
          )}

          <View
            className="w-full rounded-[10px] p-[12px] mb-[12px]"
            style={{ border: '1px solid #2876FF', minHeight: '80px' }}
          >
            <Textarea
              className="w-full text-sm text-[#333]"
              style={{ minHeight: '56px' }}
              value={yoText}
              placeholder="写点什么···"
              placeholderStyle="color:#BBBBBB;font-size:14px"
              maxlength={60}
              onInput={(e) => setYoText(e.detail.value)}
              autoHeight
            />
            <View className="flex justify-end">
              <Text className="text-xs text-[#999]">{yoText.length}/60</Text>
            </View>
          </View>

          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center">
              <View className="w-[18px] h-[18px] rounded-full bg-[#FFC969] flex items-center justify-center mr-[4px]">
                <Text className="text-xs text-white font-bold">¢</Text>
              </View>
              <Text className="text-lg font-bold text-[#2876FF]">100</Text>
            </View>
            <View
              className="px-[24px] py-[11px] rounded-[32px] bg-[#2876FF] flex items-center justify-center"
              onClick={handleSend}
            >
              <Text className="text-base font-semibold text-white">发送悄悄话</Text>
            </View>
          </View>
        </View>

        {/* VIP 提示 */}
        <View className="mx-[12px] mt-[10px] flex items-center justify-center">
          <View
            className="flex flex-row items-center px-[16px] py-[8px] rounded-[20px]"
            style={{ background: '#1F1F2E' }}
            onClick={() => Taro.navigateTo({ url: '/pages/membership/index' })}
          >
            <Text className="text-xs text-[#FFC969] mr-[4px]">◇</Text>
            <Text className="text-xs text-[#FFC969]">开通VIP会员每天一个悄悄话</Text>
          </View>
        </View>

        {/* ── 三重认证说明弹窗 ── */}
        {showCertPopup && (
          <View
            className="fixed inset-0 flex items-end justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.4)', top: 'env(safe-area-inset-top)' }}
            onClick={closeCertPopup}
          >
            <View
              className="w-full rounded-t-[16px] bg-white px-[20px] pt-[20px] pb-[32px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Text className="text-lg font-semibold text-[#333] text-center block mb-[6px]">什么是悄悄话？</Text>
              <Text className="text-sm text-[#666] text-center block mb-[16px]">一种匿名但有诚意的沟通方式</Text>
              {[
                { title: '匿名发送', desc: '对方看不到你的真实身份，只有匹配成功后才互相可见' },
                { title: '需要成家币', desc: '每条悄悄话消耗 100 成家币，体现你的诚意' },
                { title: '对方回复后自动匹配', desc: '如果对方也回复了你，双方会自动进入聊天列表' },
              ].map((item, idx) => (
                <View key={idx} className="flex flex-row items-start mb-[12px]">
                  <Text className="text-base text-[#2876FF] mr-[8px] mt-[1px]">✓</Text>
                  <View>
                    <Text className="text-sm font-semibold text-[#333]">{item.title}</Text>
                    <Text className="text-xs text-[#999] mt-[2px]">{item.desc}</Text>
                  </View>
                </View>
              ))}
              <View
                className="w-full py-[14px] rounded-full-btn bg-[#2876FF] flex items-center justify-center mt-[8px]"
                onClick={closeCertPopup}
              >
                <Text className="text-base font-semibold text-white">我知道了</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  // ===================================================================
  // 信息未完善 — 代码渲染，与设计稿 1:1 对齐
  // ===================================================================
  return (
    <View
      className="min-h-screen flex flex-col items-center"
      style={{ background: 'linear-gradient(180deg, #E8F4FF 0%, #F0F7FF 40%, #F5F8FF 100%)' }}
    >
      <CustomNavBar bgColor="transparent" />

      {/* Sub-Tab 栏 */}
      <View className="w-full px-[24px] pt-[10px] pb-[12px]">
        <View className="flex flex-row">
          {SUB_TABS.map((tab, idx) => {
            const isActive = idx === activeSubTab;
            return (
              <View
                key={tab}
                className="mr-[20px] pb-[8px]"
                style={{ borderBottom: isActive ? '2px solid #7F8494' : '2px solid transparent' }}
                onClick={() => setActiveSubTab(idx)}
              >
                <Text className="text-[15px]" style={{ color: '#7F8494', fontWeight: isActive ? 600 : 400 }}>
                  {tab}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── 用户头像占位 ── */}
      <View className="mt-[40px]">
        <View
          className="rounded-full flex items-center justify-center"
          style={{
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #D0E5FA 0%, #A8C8F0 100%)',
            border: '3px solid #FFFFFF',
            boxShadow: '0 4px 20px rgba(40,118,255,0.12)',
          }}
        >
          <Text className="text-[40px] text-[#2876FF]/40">?</Text>
        </View>
      </View>

      {/* ── 引导文案 ── */}
      <View className="flex flex-col items-center mt-[24px] px-[40px]">
        <Text
          className="text-[18px] font-semibold text-center leading-[28px]"
          style={{ color: '#153060' }}
        >
          完善个人信息
        </Text>
        <Text
          className="text-[13px] text-center mt-[8px] leading-[20px]"
          style={{ color: '#7F8494' }}
        >
          完成资料认证后，即可解锁匹配功能
        </Text>
      </View>

      {/* ── 完善信息 CTA 按钮 ── */}
      <View className="w-full px-[32px] mt-[32px]">
        <View
          className="w-full rounded-[10px] flex items-center justify-center"
          style={{
            height: '50px',
            background: '#2876FF',
            boxShadow: '0 4px 16px rgba(40,118,255,0.25)',
          }}
          onClick={navigateToProfileEdit}
        >
          <Text className="text-[17px] font-semibold text-white">完善信息</Text>
        </View>
      </View>

      {/* ── 底部提示 ── */}
      <Text
        className="text-[11px] mt-[16px]"
        style={{ color: '#AAAAAA' }}
        onClick={openCertPopup}
      >
        为什么要完善信息？
      </Text>
    </View>
  );
}
