import { Input, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import { getDemoPageData } from '@/services/lanhuDemo'
import { submitRealName } from '@/services/verification'
import VerificationSubShell from './components/VerificationSubShell'
import { AgreementRow, CustomerServiceLink, VerificationStatusTabs } from './components/EducationVerificationShared'

const verificationDemo = getDemoPageData('verification')
const DEFAULT_REAL_NAME = verificationDemo.realNameActive.realName
const DEFAULT_ID_CARD = verificationDemo.realNameActive.idCard

export default function VerificationRealNamePage() {
  const router = useRouter()
  const variant = String(router.params.variant || 'default')
  const { userInfo, updateUserInfo } = useLogin()
  const realNameCompleted = variant === 'active'
  const [realName, setRealName] = useState(userInfo.realName || DEFAULT_REAL_NAME)
  const [idCard, setIdCard] = useState(userInfo.idCard || DEFAULT_ID_CARD)
  const [agreed, setAgreed] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = realName.trim().length > 0 && idCard.trim().length > 0 && agreed

  const handleSubmit = async () => {
    if (realNameCompleted) {
      Taro.redirectTo({ url: '/pages/verification/education-student' })
      return
    }
    if (!canSubmit || submitting) return
    if (!agreed) {
      Taro.showToast({ title: '请先阅读并同意认证协议', icon: 'none' })
      return
    }
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
      {realNameCompleted && (
        <View
          style={{
            position: 'absolute',
            left: '25rpx',
            top: '366rpx',
            width: '700rpx',
            height: '88rpx',
            borderRadius: '24rpx',
            background: '#EAF3FF',
            border: '2rpx solid #B9D7FF',
            boxSizing: 'border-box',
            padding: '0 28rpx',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 800, lineHeight: '40rpx' }}>实名认证已点亮</Text>
          <Text style={{ color: '#697E9C', fontSize: '24rpx', lineHeight: '34rpx' }}>已完成身份核验</Text>
        </View>
      )}
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: realNameCompleted ? '484rpx' : '426rpx',
          width: '700rpx',
          height: '276rpx',
          borderRadius: '32rpx',
          background: '#FFFFFF',
          padding: '30rpx',
          boxSizing: 'border-box',
          boxShadow: '0 12rpx 30rpx rgba(11, 38, 90, 0.06)',
        }}
      >
        <RealNameInput label="姓名" value={realName} placeholder="请输入真实姓名" onInput={setRealName} />
        <RealNameInput label="身份证号" value={idCard} placeholder="请输入身份证号" onInput={setIdCard} top="20rpx" />
      </View>
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: realNameCompleted ? '792rpx' : '734rpx',
          width: '700rpx',
          height: '98rpx',
          borderRadius: '28rpx',
          background: canSubmit ? '#2876FF' : '#CEE0F8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: canSubmit ? '0 12rpx 28rpx rgba(40,118,255,0.24)' : 'none',
        }}
        onClick={handleSubmit}
      >
        <Text style={{ color: '#FAFBFC', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>
          {realNameCompleted ? '继续学历认证' : submitting ? '提交中' : '提交'}
        </Text>
      </View>
      <AgreementRow
        top={realNameCompleted ? '920rpx' : '862rpx'}
        checked={agreed}
        agreementName="实名认证服务协议"
        onToggle={() => setAgreed((value) => !value)}
      />
      <CustomerServiceLink top={realNameCompleted ? '1042rpx' : '984rpx'} />
    </VerificationSubShell>
  )
}

function RealNameInput({
  label,
  value,
  placeholder,
  top = '0',
  onInput,
}: {
  label: string
  value: string
  placeholder: string
  top?: string
  onInput: (value: string) => void
}) {
  return (
    <View
      style={{
        width: '640rpx',
        height: '98rpx',
        borderRadius: '20rpx',
        background: '#F6F9FE',
        padding: '0 26rpx',
        boxSizing: 'border-box',
        marginTop: top,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 800, lineHeight: '37rpx', width: '150rpx' }}>{label}</Text>
      <Input
        value={value}
        placeholder={placeholder}
        placeholderStyle="color:#A7B4C8;font-size:26rpx;line-height:37rpx"
        onInput={(event) => {
          onInput(String(event.detail.value || ''))
          return event.detail.value
        }}
        style={{
          flex: 1,
          height: '98rpx',
          color: '#0C285A',
          fontSize: '26rpx',
          fontWeight: 700,
          lineHeight: '98rpx',
          textAlign: 'right',
        }}
      />
    </View>
  )
}
