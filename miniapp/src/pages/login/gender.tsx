import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'

/**
 * 登录-性别选择 — 1:1 还原蓝湖「登录-性别选择」设计稿
 */
export default function LoginGenderPage() {
  const { setStep, updateUserInfo } = useLogin()
  const [selected, setSelected] = useState<'female' | 'male'>('female')

  const handleNext = async () => {
    if (!selected) return Taro.showToast({ title: '请选择性别', icon: 'none' })
    updateUserInfo({ gender: selected })
    setStep('age')
    await Taro.redirectTo({ url: '/pages/login/age' })
  }

  return (
    <LoginProfileShell
      description="—你的性别（注册后性别不可更改）—"
      nextActive
      onNext={handleNext}
    >
      <GenderCard
        active={selected === 'female'}
        gender="female"
        label="我是女生"
        top="448rpx"
        onClick={() => setSelected('female')}
      />
      <GenderCard
        active={selected === 'male'}
        gender="male"
        label="我是男生"
        top="693rpx"
        onClick={() => setSelected('male')}
      />
    </LoginProfileShell>
  )
}

interface GenderCardProps {
  active: boolean
  gender: 'female' | 'male'
  label: string
  top: string
  onClick: () => void
}

function GenderCard({ active, gender, label, top, onClick }: GenderCardProps) {
  const isFemale = gender === 'female'
  const activeBorder = isFemale ? '#FF7F8C' : '#2876FF'
  const iconBg = isFemale
    ? 'radial-gradient(circle at 35% 30%, #FFD5DC 0%, #FF9EAF 46%, #F6758C 100%)'
    : 'radial-gradient(circle at 35% 30%, #CFE3FF 0%, #82B3FF 48%, #2F7DFF 100%)'

  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top,
        width: '700rpx',
        height: '196rpx',
        borderRadius: '32rpx',
        background: active
          ? isFemale
            ? 'linear-gradient(180deg, #FFF2F3 0%, #FFE0E4 100%)'
            : 'linear-gradient(180deg, #F1F7FF 0%, #E1EEFF 100%)'
          : 'rgba(255,255,255,0.76)',
        border: active ? `4rpx solid ${activeBorder}` : '4rpx solid rgba(255,255,255,0)',
      }}
      onClick={onClick}
      hoverClass="btn-hover"
    >
      <Text
        style={{
          position: 'absolute',
          left: '66rpx',
          top: '72rpx',
          color: active ? '#333333' : '#999999',
          fontSize: '40rpx',
          fontWeight: 500,
          lineHeight: '56rpx',
        }}
      >
        {label}
      </Text>
      <View
        style={{
          position: 'absolute',
          right: '78rpx',
          top: '43rpx',
          width: '118rpx',
          height: '118rpx',
          borderRadius: '59rpx',
          background: iconBg,
          boxShadow: isFemale
            ? '0 10rpx 18rpx rgba(246, 117, 140, 0.28)'
            : '0 10rpx 18rpx rgba(47, 125, 255, 0.24)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: 'rgba(255,255,255,0.82)',
            fontSize: '74rpx',
            fontWeight: 500,
            lineHeight: '100rpx',
          }}
        >
          {isFemale ? '♀' : '♂'}
        </Text>
      </View>
    </View>
  )
}
