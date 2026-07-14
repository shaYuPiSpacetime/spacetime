import { Image, Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { API_BASE_URL } from '@/constants/config'
import { buildEducationRequest } from '@/domain/prd01Runtime'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { EducationDetail, EducationMethod } from '@/types/prd01'
import VerificationSubShell from './VerificationSubShell'

export default function EducationSubmitPage({ methodCode, userTypeCode }: { methodCode: EducationMethod; userTypeCode: string }) {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const config = usePrd01Store(state => state.config)
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<EducationDetail>()
  const [schoolName, setSchoolName] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [chsiCode, setChsiCode] = useState('')
  const [diplomaNo, setDiplomaNo] = useState('')
  const [certificateName, setCertificateName] = useState('')
  const [materialUrls, setMaterialUrls] = useState<string[]>([])
  const [agreed, setAgreed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const value = await prd01Api.getEducation()
        setDetail(value)
        setSchoolName(value.schoolName || '')
        setEducationLevel(value.educationLevel || '')
        setChsiCode(value.chsiCode || '')
        setDiplomaNo(value.diplomaNo || '')
        setCertificateName(value.certificateName || '')
        setMaterialUrls(value.materialUrls || [])
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const methodOption = profileOptions?.educationMethod?.find(option => option.code === methodCode)
  const userTypeOption = profileOptions?.educationUserType?.find(option => option.code === userTypeCode)
  const educationOptions = profileOptions?.educationLevel || []
  const needsMaterial = methodCode === 'STUDENT_CARD' || methodCode === 'MATERIAL_UPLOAD'
  const needsChsi = methodCode === 'CHSI'
  const needsDiploma = methodCode === 'DIPLOMA_NO'
  const needsCertificateName = needsDiploma || methodCode === 'MATERIAL_UPLOAD'
  const methodFieldsReady = needsMaterial
    ? materialUrls.length > 0
    : needsChsi
      ? chsiCode.trim().length >= 12 && chsiCode.trim().length <= 18
      : diplomaNo.trim().length > 0 && certificateName.trim().length > 0
  const canSubmit = detail?.canSubmit !== false
    && Boolean(methodOption && userTypeOption && schoolName.trim() && educationLevel && agreed && methodFieldsReady)

  const handleUpload = async () => {
    if (uploading) return
    const maxCount = config?.uploadLimits.education.maxCount || 0
    const remaining = Math.max(0, maxCount - materialUrls.length)
    if (remaining <= 0) {
      await Taro.showToast({ title: copy('education_upload_limit_reached'), icon: 'none' })
      return
    }
    setUploading(true)
    try {
      const result = await Taro.chooseImage({ count: remaining, sizeType: ['original'], sourceType: ['album', 'camera'] })
      const uploaded: string[] = []
      for (const filePath of result.tempFilePaths) {
        const item = await prd01Api.uploadEducation(filePath)
        uploaded.push(item.url)
      }
      setMaterialUrls(current => [...current, ...uploaded])
    } catch (error) {
      await showError(error)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!methodOption || !userTypeOption) {
      await Taro.showToast({ title: copy('education_method_unavailable'), icon: 'none' })
      return
    }
    if (!agreed) {
      await Taro.showToast({ title: copy('education_agreement_required'), icon: 'none' })
      return
    }
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const request = buildEducationRequest(methodCode, {
        educationUserType: userTypeOption.code,
        schoolName,
        educationLevel,
        chsiCode,
        diplomaNo,
        certificateName,
        materialUrls,
        educationAgreementChecked: agreed,
      })
      await prd01Api.submitEducation(request)
      await Taro.redirectTo({ url: '/pages/verification/triple' })
    } catch (error) {
      await showError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <VerificationSubShell title={copy('verification_nav_title')} contentHeight="1750rpx" scroll>
      <View style={{ position: 'absolute', left: '25rpx', top: '210rpx', width: '700rpx' }}>
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '44rpx', fontWeight: 700 }}>{methodOption?.label || ''}</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '12rpx' }}>{copy('education_notice')}</Text>
        {detail?.blockedReason ? <Text style={{ display: 'block', color: '#E36A6A', fontSize: '24rpx', marginTop: '14rpx' }}>{detail.blockedReason}</Text> : null}
        {detail?.rejectReason ? <Text style={{ display: 'block', color: '#E36A6A', fontSize: '24rpx', marginTop: '14rpx' }}>{detail.rejectReason}</Text> : null}
        {detail?.educationSlaText ? <Text style={{ display: 'block', color: '#697E9C', fontSize: '24rpx', marginTop: '12rpx' }}>{detail.educationSlaText}</Text> : null}
      </View>

      <View style={{ position: 'absolute', left: '25rpx', top: '410rpx', width: '700rpx', borderRadius: '24rpx', background: '#FFFFFF', padding: '30rpx', boxSizing: 'border-box' }}>
        <ReadOnlyRow label={copy('education_user_type_label')} value={userTypeOption?.label || ''} />
        <InputRow label={copy('education_school_label')} value={schoolName} placeholder={copy('education_school_placeholder')} onInput={setSchoolName} />
        <Picker mode="selector" range={educationOptions.map(option => option.label)} onChange={event => {
          const option = educationOptions[Number(event.detail.value)]
          if (option) setEducationLevel(option.code)
        }}>
          <ReadOnlyRow label={copy('education_level_label')} value={optionLabel('educationLevel', educationLevel) || copy('common_select_placeholder')} />
        </Picker>
        {needsChsi ? <InputRow label={copy('education_chsi_label')} value={chsiCode} placeholder={copy('education_chsi_placeholder')} onInput={setChsiCode} /> : null}
        {needsDiploma ? <InputRow label={copy('education_diploma_label')} value={diplomaNo} placeholder={copy('education_diploma_placeholder')} onInput={setDiplomaNo} /> : null}
        {needsCertificateName ? <InputRow label={copy('education_certificate_name_label')} value={certificateName} placeholder={copy('education_certificate_name_placeholder')} onInput={setCertificateName} /> : null}
        {needsMaterial ? (
          <View>
            <View style={{ minHeight: '104rpx', borderRadius: '16rpx', background: '#F6F9FE', marginTop: '20rpx', padding: '20rpx', display: 'flex', flexWrap: 'wrap', gap: '16rpx', boxSizing: 'border-box' }} onClick={() => void handleUpload()}>
              {materialUrls.map(url => <Image key={url} src={url.startsWith('/') ? API_BASE_URL + url : url} mode="aspectFill" style={{ width: '92rpx', height: '92rpx', borderRadius: '12rpx' }} />)}
              <Text style={{ color: '#2876FF', fontSize: '26rpx', alignSelf: 'center' }}>{copy(uploading ? 'common_uploading_action' : 'education_upload_action')}</Text>
            </View>
            <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '12rpx' }}>{copy('education_upload_notice')}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ position: 'absolute', left: '32rpx', top: '1320rpx', width: '686rpx', display: 'flex', alignItems: 'flex-start' }} onClick={() => setAgreed(value => !value)}>
        <View style={{ width: '32rpx', height: '32rpx', borderRadius: '16rpx', border: '2rpx solid #2876FF', background: agreed ? '#2876FF' : 'transparent', boxSizing: 'border-box', marginRight: '16rpx', flexShrink: 0 }} />
        <Text style={{ color: '#697E9C', fontSize: '26rpx', lineHeight: '40rpx' }}>{copy('agreement_education')}</Text>
      </View>
      {detail?.canSubmit !== false ? (
        <View style={{ position: 'absolute', left: '25rpx', top: '1450rpx', width: '700rpx', height: '98rpx', borderRadius: '24rpx', background: canSubmit ? '#2876FF' : '#CEE0F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void handleSubmit()}>
          <Text style={{ color: '#FFFFFF', fontSize: '36rpx' }}>{copy(submitting ? 'common_submitting_action' : 'common_submit_action')}</Text>
        </View>
      ) : null}
    </VerificationSubShell>
  )
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return <View style={{ minHeight: '88rpx', borderRadius: '12rpx', background: '#FCFCFC', marginTop: '20rpx', padding: '0 30rpx', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}><Text style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 600 }}>{label}</Text><Text style={{ color: value ? '#333333' : '#999999', fontSize: '26rpx' }}>{value}</Text></View>
}

function InputRow({ label, value, placeholder, onInput }: { label: string; value: string; placeholder: string; onInput: (value: string) => void }) {
  return <View style={{ minHeight: '88rpx', borderRadius: '12rpx', background: '#FCFCFC', marginTop: '20rpx', padding: '0 30rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}><Text style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 600, width: '220rpx' }}>{label}</Text><Input value={value} placeholder={placeholder} placeholderStyle="color:#999999;font-size:26rpx;text-align:right" onInput={event => { onInput(event.detail.value); return event.detail.value }} style={{ flex: 1, color: '#333333', fontSize: '26rpx', textAlign: 'right' }} /></View>
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
