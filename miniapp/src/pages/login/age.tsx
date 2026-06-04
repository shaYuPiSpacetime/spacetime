import { View, Text, PickerView, PickerViewColumn } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import CustomNavBar from '@/components/CustomNavBar'
const YEARS = Array.from({ length: 30 }, (_, i) => `${1985 + i}年`)
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
const DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}日`)

/**
 * 登录-年龄选择 — 1:1 还原蓝湖「登录-年龄选择」设计稿
 * 三列滚动选择器：年 | 月 | 日
 */
export default function LoginAgePage() {
  const [value, setValue] = useState([12, 9, 0]) // 默认 1997年 10月 1日

  const handleChange = (e: { detail: { value: number[] } }) => {
    setValue(e.detail.value)
  }

  const handleNext = () => {
    const year = YEARS[value[0]]
    const month = MONTHS[value[1]]
    const day = DAYS[value[2]]
    if (!year) return
    Taro.showToast({ title: `已选择 ${year}${month}${day}`, icon: 'success', duration: 800 })
    setTimeout(() => {
      Taro.navigateTo({ url: '/pages/login/education' })
    }, 800)
  }

  return (
    <View
      className="min-h-screen flex flex-col px-[16px]"
      style={{ background: 'linear-gradient(180deg,#E8F4FF 0%,#F0F7FF 100%)' }}
    >
      <CustomNavBar title="选择年龄" bgColor="transparent" showBack />
      {/* 页面标题由 CustomNavBar 展示 */}
      <View className="flex flex-col items-center mt-[48px] mb-[20px]">
        <Text className="text-xs text-[#999]">选择出生日期，为你推荐匹配的异性</Text>
      </View>

      {/* 三列 Picker */}
      <PickerView
        value={value}
        onChange={handleChange}
        indicatorStyle="height: 44px; border-radius: 10px; background: rgba(238,245,255,0.9); box-shadow: 0 6px 18px rgba(40,118,255,0.12);"
        maskStyle="background: linear-gradient(180deg,rgba(238,246,255,0.8) 0%,rgba(238,246,255,0.1) 100%),linear-gradient(0deg,rgba(238,246,255,0.8) 0%,rgba(238,246,255,0.1) 100%);"
        style={{ width: '100%', height: '220px' }}
      >
        <PickerViewColumn>
          {YEARS.map((y) => (
            <View key={y} className="flex items-center justify-center h-[44px]">
              <Text className="text-base text-[#153060]">{y}</Text>
            </View>
          ))}
        </PickerViewColumn>
        <PickerViewColumn>
          {MONTHS.map((m) => (
            <View key={m} className="flex items-center justify-center h-[44px]">
              <Text className="text-base text-[#153060]">{m}</Text>
            </View>
          ))}
        </PickerViewColumn>
        <PickerViewColumn>
          {DAYS.map((d) => (
            <View key={d} className="flex items-center justify-center h-[44px]">
              <Text className="text-base text-[#153060]">{d}</Text>
            </View>
          ))}
        </PickerViewColumn>
      </PickerView>

      {/* 底部下一步按钮 */}
      <View className="flex-1 flex items-end justify-center pb-[48px]">
        <View
          className="w-[56px] h-[56px] rounded-full flex items-center justify-center bg-[#2876FF]"
          onClick={handleNext}
        >
          <Text className="text-xl text-white">→</Text>
        </View>
      </View>
    </View>
  )
}
