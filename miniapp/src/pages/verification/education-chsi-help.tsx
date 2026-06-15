import { Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import { submitEducation } from '@/services/verification'
import VerificationSubShell from './components/VerificationSubShell'
import { AgreementRow, CustomerServiceLink, SubmitButton } from './components/EducationVerificationShared'
import chsiStep1 from '@/assets/lanhu/verification/slices/chsi-step-1.webp'
import chsiStep2 from '@/assets/lanhu/verification/slices/chsi-step-2.webp'
import chsiStep3 from '@/assets/lanhu/verification/slices/chsi-step-3.webp'
import chsiStep4 from '@/assets/lanhu/verification/slices/chsi-step-4.webp'

const STEPS = [
  {
    text: '前往学信网官网，选择【学信档案】登录或注册学信网账号',
    image: chsiStep1,
    width: '606rpx',
    button: true,
  },
  {
    text: '登录并进入学信档案页面，选择【在线验证报告】',
    image: chsiStep2,
    width: '608rpx',
  },
  {
    text: '选择【教育部学籍在线验证报告】',
    image: chsiStep3,
    width: '588rpx',
  },
  {
    text: '复制在线验证码(请确保验证码有效状态，否则认证会失败)',
    image: chsiStep4,
    width: '588rpx',
  },
]

export default function VerificationEducationChsiHelpPage() {
  const { userInfo, updateUserInfo } = useLogin()
  const [verificationCode, setVerificationCode] = useState(userInfo.verificationCode || '')
  const [agreed, setAgreed] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = verificationCode.trim().length >= 12 && agreed

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    updateUserInfo({ verificationCode: verificationCode.trim() })
    try {
      await submitEducation({ educationMethod: 'CHSI', verificationCode: verificationCode.trim() })
      Taro.switchTab({ url: '/pages/index/index' })
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <VerificationSubShell title="学信网验证编码" contentHeight="2288rpx" scroll onBack={() => Taro.redirectTo({ url: '/pages/verification/education-mainland' })}>
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '176rpx',
          width: '700rpx',
          borderRadius: '8rpx',
          background: '#FFFFFF',
          padding: '41rpx 28rpx 31rpx 22rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '38rpx', fontWeight: 600, lineHeight: '53rpx', marginLeft: '8rpx' }}>
          如何获取学信网在线验证码？
        </Text>
        {STEPS.map((step, index) => (
          <View key={step.text} style={{ margin: `${index === 0 ? 30 : 20}rpx 16rpx 0 8rpx` }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: '10rpx', height: '10rpx', borderRadius: '5rpx', background: '#2876FF', marginRight: '8rpx' }} />
              <Text style={{ color: '#2876FF', fontSize: '24rpx', lineHeight: '28rpx' }}>STEP</Text>
              <Text style={{ color: '#2876FF', fontSize: '32rpx', lineHeight: '45rpx', marginLeft: '6rpx' }}>{index + 1}</Text>
            </View>
            <Text style={{ display: 'block', color: '#333333', fontSize: '24rpx', lineHeight: '40rpx', marginTop: '5rpx' }}>
              {step.text}
            </Text>
            {step.button && (
              <View
                style={{
                  width: '263rpx',
                  height: '74rpx',
                  borderRadius: '14rpx',
                  background: '#2876FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '18rpx',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 600, lineHeight: '42rpx' }}>打开学信网</Text>
              </View>
            )}
            <Image src={step.image} mode="widthFix" style={{ width: step.width, marginTop: '22rpx', display: 'block' }} />
          </View>
        ))}
      </View>
      <View
        style={{
          position: 'absolute',
          left: '0',
          top: '1814rpx',
          width: '750rpx',
          height: '474rpx',
          borderRadius: '20rpx 20rpx 0 0',
          background: '#FFFFFF',
          padding: '52rpx 25rpx 0',
          boxSizing: 'border-box',
        }}
      >
        <Input
          value={verificationCode}
          placeholder="请输入12-18位在线验证码"
          placeholderStyle="color:#999999;font-size:28rpx;line-height:40rpx"
          onInput={(event) => setVerificationCode(event.detail.value)}
          style={{
            width: '700rpx',
            height: '98rpx',
            borderRadius: '12rpx',
            background: '#FCFCFC',
            padding: '0 30rpx',
            boxSizing: 'border-box',
            color: '#333333',
            fontSize: '28rpx',
            lineHeight: '40rpx',
          }}
        />
      </View>
      <SubmitButton top="1968rpx" active={canSubmit} submitting={submitting} onClick={handleSubmit} />
      <AgreementRow top="2088rpx" checked={agreed} onToggle={() => setAgreed((value) => !value)} />
      <CustomerServiceLink top="2172rpx" />
    </VerificationSubShell>
  )
}
