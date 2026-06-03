import { View, Text, PickerView, PickerViewColumn } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
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
    Taro.showToast({ title: `已选择 ${year}${month}${day}`, icon: 'success', duration: 1000 })
    setTimeout(() => {
      // 注册完成，进入主应用
      Taro.switchTab({ url: '/pages/index/index' })
    }, 1000)
  }

  return (
    <View
      className="min-h-screen flex flex-col px-[16px]"
      style={{ background: 'linear-gradient(180deg,#E8F4FF 0%,#F0F7FF 100%)' }}
    >
      {/* Header */}
      <View className="flex flex-row items-center justify-between pt-[12px] pb-[6px]">
        <View className="w-[30px] h-[30px] flex items-center justify-center" onClick={() => Taro.navigateBack()}>
          <Text className="text-lg text-[#333]">‹</Text>
        </View>
        <View className="flex flex-row items-center gap-[10px]">
          <Text className="text-base text-[#999]">···</Text>
          <View className="w-[18px] h-[18px] rounded-full border border-[#999] flex items-center justify-center">
            <Text className="text-xs text-[#999]">⊙</Text>
          </View>
        </View>
      </View>

      {/* 标题区 */}
      <View className="flex flex-col items-center mt-[32px] mb-[20px]">
        <Text className="text-lg font-semibold text-[#153060] mb-[8px]">请选择</Text>
        <Text className="text-xs text-[#999]">—你是哪一年出生（为你推荐匹配的异性）—</Text>
      </View>

      {/* 三列 Picker */}
      <PickerView
        value={value}
        onChange={handleChange}
        indicatorStyle="height: 44px; border-top: 1.5px solid #2876FF; border-bottom: 1.5px solid #2876FF; border-radius: 10px; background: rgba(238,245,255,0.9);"
        maskStyle="background: linear-gradient(180deg,rgba(238,246,255,0.8) 0%,rgba(238,246,255,0.1) 100%),linear-gradient(0deg,rgba(238,246,255,0.8) 0%,rgba(238,246,255,0.1) 100%);"
        style={{ height: '220px' }}
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
