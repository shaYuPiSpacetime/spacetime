import { Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import VerificationShell from './components/VerificationShell'

const DEFAULT_INTRO =
  '这里是个人的自我介绍，我是一个好人，这里是个人的自我介绍，我是一个好人，这里是个人的自我介绍，我是一个好人，这里是个人的自我介绍，我是一个好人，这里是个人的自我介绍，我是一个好人。'

export default function VerificationIntroEditPage() {
  const { userInfo, updateUserInfo } = useLogin()
  const [intro, setIntro] = useState(userInfo.introduction || DEFAULT_INTRO)
  const canSubmit = intro.trim().length >= 20

  const handleSubmit = () => {
    if (!canSubmit) return
    updateUserInfo({ introduction: intro.trim() })
    Taro.redirectTo({ url: '/pages/verification/triple' })
  }

  return (
    <VerificationShell
      stage="intro"
      primaryText="下一步"
      primaryActive={canSubmit}
      onPrimary={handleSubmit}
      onBack={() => Taro.redirectTo({ url: '/pages/verification/intro' })}
    >
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '558rpx',
          width: '700rpx',
          height: '974rpx',
          borderRadius: '18rpx',
          background: '#FFFFFF',
          padding: '52rpx 30rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '30rpx', fontWeight: 800, lineHeight: '42rpx' }}>
          自我描述
        </Text>
        <View
          style={{
            width: '640rpx',
            minHeight: '408rpx',
            borderRadius: '12rpx',
            border: '4rpx solid #2876FF',
            marginTop: '44rpx',
            padding: '28rpx',
            boxSizing: 'border-box',
          }}
        >
          <Textarea
            value={intro}
            maxlength={240}
            autoHeight
            onInput={(event) => setIntro(event.detail.value)}
            style={{ width: '584rpx', minHeight: '300rpx', color: '#333333', fontSize: '28rpx', lineHeight: '48rpx' }}
          />
          <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '32rpx', textAlign: 'right' }}>最少20字</Text>
        </View>
      </View>
    </VerificationShell>
  )
}
