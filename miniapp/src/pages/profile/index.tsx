import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';

/**
 * 我的 — Tab5
 *
 * 蓝湖稿：「我的」
 * 设计稿基准：750px → ÷2 = 375px 实际尺寸
 */
export default function ProfilePage() {
  const {
    data,
    loading,
    fetch,
    goToEditProfile,
    goToVip,
    goToCoin,
    goToInvite,
    goToMyPosts,
    goToHelp,
    goToSettings,
  } = useProfile();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const {
    nickname,
    avatarUrl,
    location,
    age,
    zodiac,
    isVerified,
    membership,
    coinBalance,
    likedCount,
    beLikedCount,
    visitorCount,
  } = data;

  const isVip = membership?.status === 'active';
  const coinAmount = coinBalance?.balance ?? 0;

  const subInfo = [location, age != null ? `${age}岁` : '', zodiac]
    .filter(Boolean)
    .join(' | ');

  if (loading) {
    return (
      <View className="flex items-center justify-center h-screen bg-white">
        <Text className="text-sm text-[#999]">加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="min-h-screen" scrollY style={{ background: 'linear-gradient(180deg,#E8F4FF 0%,#F4F8FF 240px,#fff 400px)' }}>

      {/* ── 顶部操作栏 ── */}
      <View className="flex items-center justify-end px-[12px] pt-[12px] pb-[6px]">
        <Text className="text-lg text-[#333] mr-[12px]">···</Text>
        <View className="w-[18px] h-[18px] rounded-full border border-[#999] flex items-center justify-center">
          <Text className="text-xs text-[#999]">⊙</Text>
        </View>
      </View>

      {/* ── 用户信息区 ── */}
      <View className="px-[16px] pb-[6px]">
        <View className="flex items-start justify-between">
          {/* 左侧：头像 + 昵称/认证/信息 */}
          <View className="flex items-center">
            {/* 头像 49px，白边 3px */}
            <View className="relative mr-[12px]">
              {avatarUrl ? (
                <Image
                  className="w-[49px] h-[49px] rounded-full"
                  src={avatarUrl}
                  mode="aspectFill"
                  style={{ border: '3px solid #fff' }}
                />
              ) : (
                <View
                  className="w-[49px] h-[49px] rounded-full bg-[#D0E5FA] flex items-center justify-center"
                  style={{ border: '3px solid #fff' }}
                >
                  <Text className="text-lg text-[#2876FF]">
                    {nickname?.charAt(0) ?? '?'}
                  </Text>
                </View>
              )}
            </View>
            <View>
              {/* 昵称行 */}
              <View className="flex items-center">
                <Text className="text-lg font-semibold text-[#333] mr-[6px]">
                  {nickname}
                </Text>
                {isVerified && (
                  <View className="px-[6px] py-[1px] rounded-[4px] bg-[#E3F1FE] flex items-center">
                    <Text className="text-xs text-[#5D89DD]">三重认证</Text>
                  </View>
                )}
              </View>
              {/* 地区 | 年龄 | 星座 */}
              {subInfo ? (
                <Text className="text-[13px] text-[#666] mt-[2px]">{subInfo}</Text>
              ) : null}
            </View>
          </View>
          {/* 右侧：编辑资料 */}
          <View
            className="flex items-center mt-[4px]"
            onClick={goToEditProfile}
          >
            <Text className="text-[11px] text-[#999]">编辑资料</Text>
            <Text className="text-[11px] text-[#999] ml-[2px]">›</Text>
          </View>
        </View>
      </View>

      {/* ── 统计卡片 ── */}
      <View className="mx-[12px] mt-[15px] bg-white rounded-[12px] px-[29px] py-[22px] flex flex-row items-center"
        style={{ boxShadow: '0 1px 13px 0 rgba(227,241,254,1)' }}>
        {/* 三列统计 */}
        <View className="flex-1 flex flex-row justify-between">
          {[
            { count: likedCount, label: '我喜欢的' },
            { count: beLikedCount, label: '喜欢我的' },
            { count: visitorCount, label: '最近来访' },
          ].map((item, idx) => (
            <View key={idx} className="flex flex-col items-center">
              <Text className="text-[19px] font-bold text-[#333]">{item.count}</Text>
              <Text className="text-sm text-[#999] mt-[2px]">{item.label}</Text>
            </View>
          ))}
        </View>
        {/* 提升人气按钮 */}
        <View
          className="ml-[14px] px-[12px] py-[5px] rounded-[100px] bg-[#E3F1FE] flex flex-row items-center flex-shrink-0"
          onClick={() => Taro.showToast({ title: '功能建设中', icon: 'none' })}
        >
          <Text className="text-sm text-[#2876FF]">⚡ 提升人气</Text>
        </View>
      </View>

      {/* ── VIP 横幅 ── */}
      <View
        className="mx-[12px] mt-[10px] rounded-[10px] flex flex-row items-center justify-between px-[16px] py-[14px]"
        style={{ background: 'linear-gradient(135deg,#2C2C2C 0%,#1A1A1A 100%)' }}
        onClick={goToVip}
      >
        <View className="flex flex-row items-center">
          <Text className="text-[22px] mr-[8px]">◇</Text>
          <Text className="text-base font-semibold text-[#FFC969]">
            {isVip ? 'VIP会员续费，享尊享特权' : '开通VIP，享尊享特权'}
          </Text>
        </View>
        <View
          className="px-[14px] py-[4px] rounded-[24px] bg-[#FFC969]"
          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          <Text className="text-[13px] font-semibold text-[#232323]">
            {isVip ? '立即续费' : '立即开通'}
          </Text>
        </View>
      </View>

      {/* ── 功能双卡片 ── */}
      <View className="mx-[12px] mt-[10px] flex flex-row gap-[10px]">
        {/* 成家币 */}
        <View
          className="flex-1 rounded-[12px] px-[12px] py-[14px] overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg,#E3F1FE 0%,#C2DCFA 100%)', minHeight: '76px' }}
          onClick={goToCoin}
        >
          <Text className="text-base font-semibold text-[#00469F]">成家币</Text>
          <Text className="text-xs text-[#A055C3] mt-[2px] block">{coinAmount} 个</Text>
          <Text className="text-xs text-[#2876FF] mt-[1px] block">查看成家币</Text>
          {/* 装饰圆 */}
          <View
            className="absolute bottom-[-12px] right-[-12px] w-[56px] h-[56px] rounded-full opacity-30"
            style={{ background: '#2876FF' }}
          />
        </View>
        {/* 邀请好友 */}
        <View
          className="flex-1 rounded-[12px] px-[12px] py-[14px] overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg,#EEE2FA 0%,#D4AFF5 100%)', minHeight: '76px' }}
          onClick={goToInvite}
        >
          <Text className="text-base font-semibold text-[#6600AF]">邀请好友</Text>
          <Text className="text-xs text-[#A055C3] mt-[2px] block">免费获得成家币</Text>
          <View
            className="absolute bottom-[-12px] right-[-12px] w-[56px] h-[56px] rounded-full opacity-30"
            style={{ background: '#A055C3' }}
          />
        </View>
      </View>

      {/* ── 菜单列表 ── */}
      <View className="mx-[12px] mt-[10px] bg-white rounded-[8px] px-[10px]">
        {[
          { label: '我的动态', icon: '♡', onClick: goToMyPosts },
          { label: '帮助与客服', icon: '○', onClick: goToHelp },
          { label: '设置', icon: '⊙', onClick: goToSettings },
        ].map((item, idx) => (
          <View key={idx}>
            <View
              className="flex flex-row items-center justify-between py-[14px]"
              onClick={item.onClick}
            >
              <View className="flex flex-row items-center">
                <Text className="text-[22px] text-[#595F77] mr-[10px] w-[22px] text-center">
                  {item.icon}
                </Text>
                <Text className="text-base text-[#595F77]">{item.label}</Text>
              </View>
              <Text className="text-base text-[#999]">›</Text>
            </View>
            {idx < 2 && (
              <View className="h-px bg-[#F0F0F0]" style={{ marginLeft: '32px' }} />
            )}
          </View>
        ))}
      </View>

      {/* 底部安全高度 */}
      <View className="h-[80px]" />
    </ScrollView>
  );
}
