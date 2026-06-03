import { View, Text, Textarea, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useMatch } from '@/hooks/useMatch';

/** 顶部 Sub-Tab */
const SUB_TABS = ['心印测试', '精选', '理想型'];

/**
 * 觅缘首页 (Tab: 推荐) — 1:1 还原蓝湖「成家-觅缘-yo弹窗」设计稿
 * 全屏用户卡片 + 悄悄话发送面板
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

  return (
    <View className="min-h-screen bg-[#F5F7FA] flex flex-col">

      {/* ── 顶部导航 Header ── */}
      <View className="bg-white px-[12px] pt-[10px] pb-[0px]">
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
              const isActive = idx === activeSubTab;
              return (
                <View
                  key={tab}
                  className="mr-[16px] pb-[10px] relative"
                  onClick={() => setActiveSubTab(idx)}
                >
                  <Text className="text-base" style={{ color: '#7F8494', fontWeight: isActive ? '500' : 'normal' }}>
                    {tab}
                  </Text>
                  {isActive && (
                    <View
                      className="absolute bottom-0 left-0 right-0 h-[4px] rounded-t-[3px]"
                      style={{ background: 'rgba(40,118,255,0.8)' }}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* 右侧图标 */}
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

      {/* ── 用户大图卡片 ── */}
      <View className="relative mx-[12px] mt-[10px] rounded-t-[16px] overflow-hidden" style={{ height: '280px' }}>
        {user ? (
          user.avatar ? (
            <Image className="absolute inset-0 w-full h-full" src={user.avatar} mode="aspectFill" />
          ) : (
            <View
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#B3C9E8 0%,#7FA8CF 100%)' }}
            >
              <Text className="text-[48px] text-white/40">{user.nickname?.charAt(0)}</Text>
            </View>
          )
        ) : (
          <View className="absolute inset-0 bg-[#D0E5FA] flex items-center justify-center">
            <Text className="text-base text-[#999]">加载中...</Text>
          </View>
        )}

        {/* 右上角转发按钮 */}
        <View
          className="absolute top-[12px] right-[12px] w-[24px] h-[24px] rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <Text className="text-xs text-white">↗</Text>
        </View>

        {/* 底部用户信息 */}
        {user && (
          <View className="absolute bottom-[10px] left-[12px]">
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
        {/* 标题 */}
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
          —第一时间抓住ta的目光—
        </Text>

        {/* 对方简介行 */}
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

        {/* 输入框 */}
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

        {/* 底部操作行 */}
        <View className="flex flex-row items-center justify-between">
          {/* 成家币费用 */}
          <View className="flex flex-row items-center">
            <View className="w-[18px] h-[18px] rounded-full bg-[#FFC969] flex items-center justify-center mr-[4px]">
              <Text className="text-xs text-white font-bold">¢</Text>
            </View>
            <Text className="text-lg font-bold text-[#2876FF]">100</Text>
          </View>
          {/* 发送按钮 */}
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
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', zIndex: 100 }}
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
              className="w-full py-[14px] rounded-[49px] bg-[#2876FF] flex items-center justify-center mt-[8px]"
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
