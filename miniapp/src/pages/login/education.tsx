import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import CustomNavBar from '@/components/CustomNavBar'

const OPTIONS = ['博士', '硕士', '本科', '大专']

/**
 * 登录-学历 — 1:1 还原蓝湖「登录-学历」设计稿
 */
export default function LoginEducationPage() {
  const { setStep } = useLogin()
  const [selected, setSelected] = useState<string | null>(null)

  const handleNext = () => {
    if (!selected) return Taro.showToast({ title: '请选择学历', icon: 'none' })
    setStep('address')
    Taro.navigateTo({ url: '/pages/login/address' })
  }

  return (
    <View
      className="min-h-screen flex flex-col px-[16px]"
      style={{ background: 'linear-gradient(180deg,#E8F4FF 0%,#F0F7FF 100%)' }}
    >
      <CustomNavBar title="选择学历" bgColor="transparent" showBack />
      {/* 页面标题由 CustomNavBar 展示 */}
      <View className="flex flex-col items-center mt-[48px] mb-[32px]">
        <Text className="text-xs text-[#999]">你的最高学历，为你推荐匹配的异性</Text>
      </View>

      {/* 选项列表 */}
      <View className="flex flex-col gap-[12px]">
        {OPTIONS.map((opt) => {
          const isActive = selected === opt
          return (
            <View
              key={opt}
              className="py-[18px] rounded-[12px] flex items-center justify-center"
              style={{
                background: isActive ? '#EEF5FF' : 'rgba(255,255,255,0.9)',
                border: isActive ? '1.5px solid #2876FF' : '1.5px solid rgba(255,255,255,0.9)',
              }}
              onClick={() => setSelected(opt)}
            >
              <Text
                className="text-lg font-medium"
                style={{ color: isActive ? '#2876FF' : '#666' }}
              >
                {opt}
              </Text>
            </View>
          )
        })}
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
