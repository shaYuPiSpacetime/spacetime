import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import LoginProfileShell from './components/LoginProfileShell'
import './identity.scss'

/**
 * 登录-身份：补齐蓝湖登录资料主链路中的身份选择页。
 */
export default function LoginIdentityPage() {
  const { identityOptions, setStep, updateUserInfo } = useLogin()
  const [selected, setSelected] = useState(identityOptions[0] ?? '')
  const [touched, setTouched] = useState(false)

  const handleNext = async () => {
    if (!selected) return Taro.showToast({ title: '请选择身份', icon: 'none' })
    updateUserInfo({ identity: selected })
    setStep('education')
    await Taro.redirectTo({ url: '/pages/login/education' })
  }

  return (
    <View className="login-identity-page">
      <LoginProfileShell
        description="—你的身份（为你推荐更契合的人）—"
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
          {identityOptions.map((option) => {
            const isActive = selected === option
            return (
              <View
                key={option}
                style={{
                  width: '700rpx',
                  height: '128rpx',
                  borderRadius: '48rpx',
                  background: isActive ? '#E3F1FE' : '#FFFFFF',
                  border: isActive ? '2rpx solid #2876FF' : '2rpx solid rgba(255,255,255,0)',
                  marginBottom: '29rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isActive ? '0 12rpx 28rpx rgba(40,118,255,0.10)' : 'none',
                }}
                onClick={() => {
                  setSelected(option)
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
                  {option}
                </Text>
              </View>
            )
          })}
        </View>
      </LoginProfileShell>
    </View>
  )
}
