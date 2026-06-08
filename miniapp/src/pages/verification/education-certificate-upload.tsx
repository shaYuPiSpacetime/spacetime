import { Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { useLogin } from '@/hooks/useLogin'
import { submitEducation } from '@/services/verification'
import VerificationSubShell from './components/VerificationSubShell'
import { AgreementRow, CustomerServiceLink, FormRow, SubmitButton, UploadProofBox } from './components/EducationVerificationShared'

const EDUCATION_LEVELS = ['博士', '硕士', '本科', '大专', '高中/中专']

export default function VerificationEducationCertificateUploadPage() {
  const { userInfo, updateUserInfo } = useLogin()
  const [schoolName, setSchoolName] = useState(userInfo.schoolName || '')
  const [educationLevel, setEducationLevel] = useState(userInfo.educationLevel || userInfo.education || '')
  const [uploadPath, setUploadPath] = useState(userInfo.educationUploadLocalPath || '')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = schoolName.trim().length > 0 && educationLevel && uploadPath && agreed

  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      const path = res.tempFilePaths[0]
      if (!path) return
      setUploadPath(path)
      updateUserInfo({ educationUploadLocalPath: path })
    } catch {
      Taro.showToast({ title: '已取消选择', icon: 'none' })
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    updateUserInfo({ schoolName: schoolName.trim(), educationLevel, educationUploadLocalPath: uploadPath })
    try {
      await submitEducation({ educationMethod: 'CERTIFICATE_UPLOAD' })
      Taro.switchTab({ url: '/pages/index/index' })
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <VerificationSubShell title="上传证书">
      <Text style={{ position: 'absolute', left: '25rpx', top: '226rpx', color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx' }}>
        上传毕业证或学位证书
      </Text>
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '344rpx',
          width: '700rpx',
          height: '716rpx',
          borderRadius: '18rpx',
          background: '#FFFFFF',
          padding: '32rpx 30rpx',
          boxSizing: 'border-box',
        }}
      >
        <FormRow label="学校名称">
          <Input
            value={schoolName}
            placeholder="请输入"
            placeholderStyle="color:#999999;font-size:26rpx;line-height:37rpx;text-align:right"
            onInput={(event) => setSchoolName(event.detail.value)}
            style={{ flex: 1, color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', textAlign: 'right' }}
          />
        </FormRow>
        <Picker range={EDUCATION_LEVELS} value={Math.max(0, EDUCATION_LEVELS.indexOf(educationLevel))} onChange={(event) => setEducationLevel(EDUCATION_LEVELS[Number(event.detail.value)] || '')}>
          <FormRow label="学历" top="20rpx">
            <Text style={{ color: educationLevel ? '#333333' : '#999999', fontSize: '26rpx', lineHeight: '37rpx' }}>{educationLevel || '请选择'}</Text>
          </FormRow>
        </Picker>
        <UploadProofBox uploadPath={uploadPath} onClick={handleChooseImage} />
        <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', fontWeight: 500, lineHeight: '33rpx', marginTop: '20rpx' }}>
          不要涂抹，需要露出姓名/学校名称及学历层次信息
        </Text>
      </View>
      <SubmitButton top="1092rpx" active={Boolean(canSubmit)} submitting={submitting} onClick={handleSubmit} />
      <AgreementRow top="1212rpx" checked={agreed} onToggle={() => setAgreed((value) => !value)} />
      <CustomerServiceLink top="1342rpx" />
    </VerificationSubShell>
  )
}
