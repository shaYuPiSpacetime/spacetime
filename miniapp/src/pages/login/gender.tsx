import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import CustomNavBar from '@/components/CustomNavBar'

/**
 * 登录-性别选择 — 1:1 还原蓝湖「登录-性别选择」设计稿
 */
export default function LoginGenderPage() {
  const { setStep } = useLogin()
  const [selected, setSelected] = useState<'female' | 'male' | null>(null)

  const handleNext = () => {
    if (!selected) return Taro.showToast({ title: '请选择性别', icon: 'none' })
    setStep('age')
    Taro.navigateTo({ url: '/pages/login/age' })
  }

  return (
    <View
      className="min-h-screen flex flex-col px-[16px]"
      style={{ background: 'linear-gradient(180deg,#E8F4FF 0%,#F0F7FF 100%)' }}
    >
      <CustomNavBar title="选择性别" bgColor="transparent" showBack />
      {/* 页面标题由 CustomNavBar 展示 */}
      <View className="flex flex-col items-center mt-[48px] mb-[32px]">
        <Text className="text-xs text-[#999]">你的性别，注册后不可更改</Text>
      </View>

      {/* 选项 */}
      <View className="flex flex-col gap-[16px]">
        {/* 女生 */}
        <View
          className="flex flex-row items-center justify-between px-[24px] py-[20px] rounded-[12px]"
          style={{
            background: selected === 'female' ? 'rgba(255,180,200,0.15)' : 'rgba(255,255,255,0.9)',
            border: selected === 'female' ? '1.5px solid #F5A0B5' : '1.5px solid rgba(255,255,255,0.9)',
          }}
          onClick={() => setSelected('female')}
        >
          <Text className="text-lg font-medium" style={{ color: selected === 'female' ? '#333' : '#666' }}>
            我是女生
          </Text>
          <View
            className="w-[48px] h-[48px] rounded-full flex items-center justify-center"
            style={{ background: 'radial-gradient(circle,#FFC0D0 0%,#EE88AA 100%)' }}
          >
            <Text className="text-xl text-white">♀</Text>
          </View>
        </View>

        {/* 男生 */}
        <View
          className="flex flex-row items-center justify-between px-[24px] py-[20px] rounded-[12px]"
          style={{
            background: selected === 'male' ? 'rgba(150,190,255,0.12)' : 'rgba(255,255,255,0.9)',
            border: selected === 'male' ? '1.5px solid #96BEFF' : '1.5px solid rgba(255,255,255,0.9)',
          }}
          onClick={() => setSelected('male')}
        >
          <Text className="text-lg font-medium text-[#999]">我是男生</Text>
          <View
            className="w-[48px] h-[48px] rounded-full flex items-center justify-center"
            style={{ background: 'radial-gradient(circle,#AAD0FF 0%,#6699EE 100%)' }}
          >
            <Text className="text-xl text-white">♂</Text>
          </View>
        </View>
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
