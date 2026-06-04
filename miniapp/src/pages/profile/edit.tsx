import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import CustomNavBar from '@/components/CustomNavBar'

/**
 * 个人资料编辑页 — 从觅缘「完善信息」按钮进入
 * 独立非 Tab 页面，不会切换到我的 Tab
 */
export default function ProfileEditPage() {
  const [nickname, setNickname] = useState('筱脑虎')
  const [location] = useState('杭州市')
  const [age] = useState('28')
  const [zodiac] = useState('双鱼座')

  const handleSave = () => {
    Taro.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
  }

  const handleEditField = (field: string) => {
    Taro.showToast({ title: `${field}编辑功能开发中`, icon: 'none' })
  }

  return (
    <View className="min-h-screen bg-[#F5F8FF] flex flex-col">
      <CustomNavBar title="编辑资料" bgColor="#F5F8FF" showBack />

      <View className="flex-1 px-[16px] pt-[16px]">
        {/* 头像行 */}
        <View
          className="flex flex-row items-center justify-between bg-white rounded-card px-[16px] py-[14px] mb-[10px]"
          onClick={() => handleEditField('头像')}
        >
          <Text className="text-base text-[#333]">头像</Text>
          <View className="flex flex-row items-center">
            <View className="w-[48px] h-[48px] rounded-full bg-[#D0E5FA] flex items-center justify-center">
              <Text className="text-xl text-[#2876FF]">?</Text>
            </View>
            <Text className="text-sm text-[#999] ml-[8px]">›</Text>
          </View>
        </View>

        {/* 昵称 */}
        <View className="bg-white rounded-card px-[16px] py-[14px] mb-[10px]">
          <View className="flex flex-row items-center justify-between">
            <Text className="text-base text-[#333]">昵称</Text>
            <View className="flex flex-row items-center" onClick={() => handleEditField('昵称')}>
              <Text className="text-base text-[#333]">{nickname}</Text>
              <Text className="text-sm text-[#999] ml-[8px]">›</Text>
            </View>
          </View>
        </View>

        {/* 基本信息 */}
        <View className="bg-white rounded-card overflow-hidden mb-[10px]">
          {[
            { label: '地区', value: location },
            { label: '年龄', value: `${age}岁` },
            { label: '星座', value: zodiac },
          ].map((item, idx, arr) => (
            <View key={item.label}>
              <View
                className="flex flex-row items-center justify-between px-[16px] py-[14px]"
                onClick={() => handleEditField(item.label)}
              >
                <Text className="text-base text-[#333]">{item.label}</Text>
                <View className="flex flex-row items-center">
                  <Text className="text-base text-[#999]">{item.value}</Text>
                  <Text className="text-sm text-[#999] ml-[8px]">›</Text>
                </View>
              </View>
              {idx < arr.length - 1 && (
                <View className="ml-[16px] h-[1px] bg-[#F0F0F0]" />
              )}
            </View>
          ))}
        </View>

        {/* 更多信息 */}
        <View className="bg-white rounded-card overflow-hidden mb-[24px]">
          {['学历', '职业', '身高', '体重', '兴趣爱好'].map((item, idx, arr) => (
            <View key={item}>
              <View
                className="flex flex-row items-center justify-between px-[16px] py-[14px]"
                onClick={() => handleEditField(item)}
              >
                <Text className="text-base text-[#333]">{item}</Text>
                <Text className="text-sm text-[#999]">未设置 ›</Text>
              </View>
              {idx < arr.length - 1 && (
                <View className="ml-[16px] h-[1px] bg-[#F0F0F0]" />
              )}
            </View>
          ))}
        </View>

        {/* 保存按钮 */}
        <View
          className="w-full rounded-full-btn flex items-center justify-center bg-brand-blue"
          style={{ height: '50px' }}
          onClick={handleSave}
        >
          <Text className="text-[17px] font-semibold text-white">保存</Text>
        </View>
      </View>
    </View>
  )
}
