import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import CustomNavBar from '@/components/CustomNavBar'

const CITIES = ['北京市', '上海市', '杭州市', '深圳市', '广州市', '成都市', '武汉市', '南京市', '西安市', '重庆市']

/**
 * 登录-地址 — 1:1 还原蓝湖「登录-地址」设计稿
 */
export default function LoginAddressPage() {
  const { setStep } = useLogin()
  const [selected, setSelected] = useState<string>('')

  const handleNext = () => {
    if (!selected) return Taro.showToast({ title: '请选择居住地', icon: 'none' })
    setStep('age')
    Taro.showToast({ title: '注册完成', icon: 'success', duration: 1000 })
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/index/index' })
    }, 1000)
  }

  const handleLocation = () => {
    Taro.showToast({ title: '定位功能建设中', icon: 'none' })
  }

  return (
    <View
      className="min-h-screen flex flex-col px-[16px]"
      style={{ background: 'linear-gradient(180deg,#E8F4FF 0%,#F0F7FF 100%)' }}
    >
      <CustomNavBar title="选择地区" bgColor="transparent" showBack />
      {/* 页面标题由 CustomNavBar 展示 */}
      <View className="flex flex-col items-center mt-[48px] mb-[32px]">
        <Text className="text-xs text-[#999]">你的居住地，为你推荐匹配的异性</Text>
      </View>

      {/* 城市选择行 */}
      <View
        className="flex flex-row items-center justify-between px-[16px] py-[14px] rounded-[10px] bg-white/90"
      >
        <View className="flex flex-row items-center">
          <Text className="text-base text-[#999] mr-[8px]">◎</Text>
          {selected ? (
            <Text className="text-base text-[#333]">{selected}</Text>
          ) : (
            <Text className="text-base text-[#BBBBBB]">选择城市</Text>
          )}
        </View>
        <Text className="text-base text-[#2876FF]" onClick={handleLocation}>获取定位</Text>
      </View>

      {/* 城市快速选择 */}
      <View className="flex flex-wrap gap-[10px] mt-[16px]">
        {CITIES.map((city) => (
          <View
            key={city}
            className="px-[14px] py-[6px] rounded-[24px]"
            style={{
              background: selected === city ? '#2876FF' : 'rgba(255,255,255,0.9)',
              border: selected === city ? '1px solid #2876FF' : '1px solid #E0E0E0',
            }}
            onClick={() => setSelected(city)}
          >
            <Text className="text-sm" style={{ color: selected === city ? '#fff' : '#666' }}>
              {city}
            </Text>
          </View>
        ))}
      </View>

      {/* 底部下一步按钮 */}
      <View className="flex-1 flex items-end justify-center pb-[48px]">
        <View
          className="w-[56px] h-[56px] rounded-full flex items-center justify-center"
          style={{ background: selected ? '#2876FF' : 'rgba(40,118,255,0.3)' }}
          onClick={handleNext}
        >
          <Text className="text-xl text-white">→</Text>
        </View>
      </View>
    </View>
  )
}
