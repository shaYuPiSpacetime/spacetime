import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import { submitRealName } from '@/services/verification'
import VerificationSubShell from './components/VerificationSubShell'
import { AgreementRow, CustomerServiceLink, VerificationStatusTabs } from './components/EducationVerificationShared'

export default function VerificationRealNamePage() {
  const { userInfo, updateUserInfo } = useLogin()
  const [realName, setRealName] = useState(userInfo.realName || '')
  const [idCard, setIdCard] = useState(userInfo.idCard || '')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = realName.trim().length > 0 && idCard.trim().length > 0 && agreed

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const payload = { realName: realName.trim(), idCard: idCard.trim() }
    updateUserInfo(payload)
    try {
      await submitRealName(payload)
      Taro.redirectTo({ url: '/pages/verification/education-student' })
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <VerificationSubShell title="认证">
      <VerificationStatusTabs active="realName" />
      <View style={{ position: 'absolute', left: '25rpx', top: '226rpx', width: '700rpx' }}>
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx' }}>
          实名认证
        </Text>
        <Text style={{ display: 'block', width: '700rpx', color: '#999999', fontSize: '24rpx', lineHeight: '40rpx', marginTop: '10rpx' }}>
          使用公安系统验证身份真实性，信息仅用于验证身份场景。全程采用阿里云智能加密，保护隐私数据
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '426rpx',
          width: '700rpx',
          height: '258rpx',
          borderRadius: '18rpx',
          background: '#FFFFFF',
          padding: '32rpx 30rpx',
          boxSizing: 'border-box',
        }}
      >
        <Input
          value={realName}
          placeholder="请输入真实姓名"
          placeholderStyle="color:#999999;font-size:26rpx;line-height:37rpx"
          onInput={(event) => setRealName(event.detail.value)}
          style={{
            width: '640rpx',
            height: '88rpx',
            borderRadius: '12rpx',
            background: '#FCFCFC',
            padding: '0 30rpx',
            boxSizing: 'border-box',
            color: '#333333',
            fontSize: '26rpx',
            lineHeight: '37rpx',
          }}
        />
        <Input
          value={idCard}
          placeholder="请输入证件号码"
          placeholderStyle="color:#999999;font-size:26rpx;line-height:37rpx"
          onInput={(event) => setIdCard(event.detail.value)}
          style={{
            width: '640rpx',
            height: '88rpx',
            borderRadius: '12rpx',
            background: '#FCFCFC',
            padding: '0 30rpx',
            boxSizing: 'border-box',
            color: '#333333',
            fontSize: '26rpx',
            lineHeight: '37rpx',
            marginTop: '20rpx',
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '714rpx',
          width: '700rpx',
          height: '98rpx',
          borderRadius: '20rpx',
          background: canSubmit ? '#2876FF' : '#CEE0F8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={handleSubmit}
      >
        <Text style={{ color: '#FAFBFC', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>
          {submitting ? '提交中' : '提交'}
        </Text>
      </View>
      <AgreementRow
        top="837rpx"
        checked={agreed}
        agreementName="实名认证服务协议"
        onToggle={() => setAgreed((value) => !value)}
      />
      <CustomerServiceLink top="959rpx" />
    </VerificationSubShell>
  )
}
