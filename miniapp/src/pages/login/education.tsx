import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'

const OPTIONS = ['博士', '硕士', '本科', '大专']

/**
 * 登录-学历 — 1:1 还原蓝湖「登录-学历」设计稿
 */
export default function LoginEducationPage() {
  const { setStep, updateUserInfo } = useLogin()
  const [selected, setSelected] = useState('硕士')
  const [touched, setTouched] = useState(false)

  const handleNext = async () => {
    if (!selected) return Taro.showToast({ title: '请选择学历', icon: 'none' })
    updateUserInfo({ education: selected })
    setStep('address')
    await Taro.navigateTo({ url: '/pages/login/address' })
  }

  return (
    <LoginProfileShell
      description="—你的最高学历（为你推荐匹配的异性）—"
      nextActive={touched}
      onNext={handleNext}
    >
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '442rpx',
          width: '700rpx',
        }}
      >
        {OPTIONS.map((opt) => {
          const isActive = selected === opt
          return (
            <View
              key={opt}
              style={{
                width: '700rpx',
                height: '128rpx',
                borderRadius: '24rpx',
                background: isActive ? '#E3F1FE' : '#FFFFFF',
                border: isActive ? '2rpx solid #2876FF' : '2rpx solid #FFFFFF',
                marginBottom: '29rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => {
                setSelected(opt)
                setTouched(true)
              }}
              hoverClass="btn-hover"
            >
              <Text
                style={{
                  color: isActive ? '#2876FF' : '#333333',
                  fontSize: '38rpx',
                  fontWeight: 500,
                  lineHeight: '53rpx',
                }}
              >
                {opt}
              </Text>
            </View>
          )
        })}
      </View>
    </LoginProfileShell>
  )
}
