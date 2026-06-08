import { Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import { submitEducation } from '@/services/verification'
import VerificationSubShell from './components/VerificationSubShell'
import { AgreementRow, CustomerServiceLink, FormRow, SubmitButton } from './components/EducationVerificationShared'

const EDUCATION_LEVELS = ['博士', '硕士', '本科', '大专', '高中/中专']

export default function VerificationEducationDiplomaNoPage() {
  const { userInfo, updateUserInfo } = useLogin()
  const [schoolName, setSchoolName] = useState(userInfo.schoolName || '')
  const [educationLevel, setEducationLevel] = useState(userInfo.educationLevel || userInfo.education || '')
  const [diplomaNo, setDiplomaNo] = useState(userInfo.diplomaNo || '')
  const [realName, setRealName] = useState(userInfo.realName || '')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = schoolName.trim().length > 0 && educationLevel && diplomaNo.trim().length > 0 && realName.trim().length > 0 && agreed

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    updateUserInfo({ schoolName: schoolName.trim(), educationLevel, diplomaNo: diplomaNo.trim(), realName: realName.trim() })
    try {
      await submitEducation({ educationMethod: 'DIPLOMA_NO', diplomaNo: diplomaNo.trim() })
      Taro.switchTab({ url: '/pages/index/index' })
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <VerificationSubShell title="证书编号">
      <Text style={{ position: 'absolute', left: '25rpx', top: '226rpx', color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx' }}>
        毕业证或者学位证书编号
      </Text>
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '344rpx',
          width: '700rpx',
          height: '652rpx',
          borderRadius: '18rpx',
          background: '#FFFFFF',
          padding: '32rpx 30rpx',
          boxSizing: 'border-box',
        }}
      >
        <FormInputRow label="学校名称" value={schoolName} placeholder="请输入" onInput={setSchoolName} />
        <Picker range={EDUCATION_LEVELS} value={Math.max(0, EDUCATION_LEVELS.indexOf(educationLevel))} onChange={(event) => setEducationLevel(EDUCATION_LEVELS[Number(event.detail.value)] || '')}>
          <FormRow label="学历" top="20rpx">
            <Text style={{ color: educationLevel ? '#333333' : '#999999', fontSize: '26rpx', lineHeight: '37rpx' }}>{educationLevel || '请选择'}</Text>
          </FormRow>
        </Picker>
        <FormInputRow label="证书编号" value={diplomaNo} placeholder="毕业证书/学位证书编号" onInput={setDiplomaNo} top="20rpx" />
        <FormInputRow label="姓名" value={realName} placeholder="证书上的姓名" onInput={setRealName} top="20rpx" />
        <Text style={{ display: 'block', color: '#333333', fontSize: '24rpx', lineHeight: '40rpx', marginTop: '20rpx' }}>
          1、若您使用毕业证书编号，请确保在2001年以后毕业，否则请点此
          <Text style={{ color: '#2876FF' }} onClick={() => Taro.redirectTo({ url: '/pages/verification/education-certificate-upload' })}>上传证书</Text>
          认证；{'\n'}
          2、若您使用学位证书编号，请确保在2008年9月1日获得学位，否则请点此
          <Text style={{ color: '#2876FF' }} onClick={() => Taro.redirectTo({ url: '/pages/verification/education-certificate-upload' })}>上传证书</Text>
          认证。
        </Text>
      </View>
      <SubmitButton top="1026rpx" active={Boolean(canSubmit)} submitting={submitting} onClick={handleSubmit} />
      <AgreementRow top="1146rpx" checked={agreed} onToggle={() => setAgreed((value) => !value)} />
      <CustomerServiceLink top="1274rpx" />
    </VerificationSubShell>
  )
}

function FormInputRow({
  label,
  value,
  placeholder,
  onInput,
  top = '0',
}: {
  label: string
  value: string
  placeholder: string
  onInput: (value: string) => void
  top?: string
}) {
  return (
    <FormRow label={label} top={top}>
      <Input
        value={value}
        placeholder={placeholder}
        placeholderStyle="color:#999999;font-size:26rpx;line-height:37rpx;text-align:right"
        onInput={(event) => onInput(event.detail.value)}
        style={{ flex: 1, color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', textAlign: 'right' }}
      />
    </FormRow>
  )
}
