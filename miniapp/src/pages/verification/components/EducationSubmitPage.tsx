import { Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import SchoolSearchInput from '@/components/SchoolSearchInput'
import { buildEducationRequest } from '@/domain/prd01Runtime'
import { prd01Api } from '@/services/prd01'
import { resolveProtectedFilePreview, resolveProtectedFilePreviews } from '@/services/protectedFile'
import { usePrd01Store } from '@/stores/prd01Store'
import type { EducationDetail, EducationMethod } from '@/types/prd01'
import VerificationRuntimeBoundary from './VerificationRuntimeBoundary'
import VerificationSubShell from './VerificationSubShell'
import { LanhuOptionSheet } from './LanhuPickerSheet'
import {
  AgreementRow,
  CustomerServiceLink,
  EducationHero,
  EducationTabs,
  SubmitButton,
  UploadProofBox,
  VerificationStatusTabs,
} from './EducationVerificationShared'

const CONTENT_HEIGHT: Record<EducationMethod, string> = {
  STUDENT_CARD: '1678rpx',
  CHSI: '2940rpx',
  DIPLOMA_NO: '1500rpx',
  MATERIAL_UPLOAD: '1620rpx',
}

const SUBMIT_TOP: Record<EducationMethod, string> = {
  STUDENT_CARD: '1278rpx',
  CHSI: '2406rpx',
  DIPLOMA_NO: '996rpx',
  MATERIAL_UPLOAD: '1076rpx',
}

const AGREEMENT_TOP: Record<EducationMethod, string> = {
  STUDENT_CARD: '1402rpx',
  CHSI: '2530rpx',
  DIPLOMA_NO: '1120rpx',
  MATERIAL_UPLOAD: '1200rpx',
}

const EDUCATION_MATERIAL_MAX_COUNT = 4

export default function EducationSubmitPage({ methodCode, userTypeCode }: { methodCode: EducationMethod; userTypeCode: string }) {
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const config = usePrd01Store(state => state.config)
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<EducationDetail>()
  const [schoolName, setSchoolName] = useState('')
  const [schoolCode, setSchoolCode] = useState<string>()
  const [educationLevel, setEducationLevel] = useState('')
  const [chsiCode, setChsiCode] = useState('')
  const [diplomaNo, setDiplomaNo] = useState('')
  const [certificateName, setCertificateName] = useState('')
  const [materialUrls, setMaterialUrls] = useState<string[]>([])
  const [materialPreviewUrls, setMaterialPreviewUrls] = useState<string[]>([])
  const [agreed, setAgreed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [educationPickerVisible, setEducationPickerVisible] = useState(false)

  const loadDetail = async () => {
    const value = await prd01Api.getEducation()
    const urls = (value.materialUrls || []).slice(0, EDUCATION_MATERIAL_MAX_COUNT)
    setDetail(value)
    setSchoolName(value.schoolName || '')
    setSchoolCode(value.schoolCode)
    setEducationLevel(value.educationLevel || '')
    setChsiCode(value.chsiCode || '')
    setDiplomaNo(value.diplomaNo || '')
    setCertificateName(value.certificateName || '')
    setMaterialUrls(urls)
    setMaterialPreviewUrls(await resolveProtectedFilePreviews(urls))
  }

  const methodOption = profileOptions?.educationMethod?.find(option => option.code === methodCode)
  const userTypeOption = profileOptions?.educationUserType?.find(option => option.code === userTypeCode)
  const educationOptions = profileOptions?.educationLevel || []
  const needsMaterial = methodCode === 'STUDENT_CARD' || methodCode === 'MATERIAL_UPLOAD'
  const methodFieldsReady = needsMaterial
    ? materialUrls.length > 0
    : methodCode === 'CHSI'
      ? chsiCode.trim().length >= 12 && chsiCode.trim().length <= 18
      : diplomaNo.trim().length > 0 && certificateName.trim().length > 0
  const canSubmit = detail?.canSubmit !== false
    && Boolean(methodOption && userTypeOption && schoolName.trim() && educationLevel && agreed && methodFieldsReady)
  // 蓝湖学历认证稿固定为 0/4。运行时配置只能收紧限制，不能把页面放宽到 4 张以上。
  const runtimeMaxMaterialCount = config?.uploadLimits.education.maxCount
  const maxMaterialCount = Math.min(
    EDUCATION_MATERIAL_MAX_COUNT,
    Math.max(1, runtimeMaxMaterialCount || EDUCATION_MATERIAL_MAX_COUNT),
  )

  const handleUpload = async () => {
    if (uploading) return
    const remaining = Math.max(0, maxMaterialCount - materialUrls.length)
    if (remaining <= 0) {
      await Taro.showToast({ title: copy('education_upload_limit_reached'), icon: 'none' })
      return
    }
    setUploading(true)
    try {
      const result = await Taro.chooseImage({ count: remaining, sizeType: ['original'], sourceType: ['album', 'camera'] })
      const uploaded: string[] = []
      const uploadedPreviews: string[] = []
      for (const filePath of result.tempFilePaths.slice(0, remaining)) {
        const item = await prd01Api.uploadEducation(filePath)
        uploaded.push(item.url)
        uploadedPreviews.push(await resolveProtectedFilePreview(item.url))
      }
      setMaterialUrls(current => [...current, ...uploaded].slice(0, maxMaterialCount))
      setMaterialPreviewUrls(current => [...current, ...uploadedPreviews].slice(0, maxMaterialCount))
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
      await prd01Api.submitEducation(buildEducationRequest(methodCode, {
        educationUserType: userTypeOption.code,
        schoolName,
        schoolCode,
        educationLevel,
        chsiCode,
        diplomaNo,
        certificateName,
        materialUrls: materialUrls.slice(0, maxMaterialCount),
        educationAgreementChecked: agreed,
      }))
      await Taro.redirectTo({ url: '/pages/verification/education-submit-success' })
    } catch (error) {
      await showError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <VerificationRuntimeBoundary loadData={loadDetail}>
      <VerificationSubShell
        title={methodCode === 'STUDENT_CARD'
          ? copy('verification_nav_title')
          : methodCode === 'MATERIAL_UPLOAD'
            ? '上传证书'
            : (methodOption?.label || '')}
        contentHeight={CONTENT_HEIGHT[methodCode]}
        scroll
      >
        {methodCode === 'STUDENT_CARD' ? (
          <>
            <EducationHero copy={copy} />
            <VerificationStatusTabs active="education" copy={copy} />
            <EducationTabs active="student" copy={copy} />
          </>
        ) : methodCode !== 'CHSI' ? (
          <Text style={{ position: 'absolute', left: '25rpx', top: '226rpx', width: '700rpx', color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx' }}>{methodOption?.label || ''}</Text>
        ) : null}

        {methodCode === 'CHSI' ? (
          <ChsiForm copy={copy} schoolName={schoolName} onSchool={(name, code) => { setSchoolName(name); setSchoolCode(code) }} chsiCode={chsiCode} onChsiCode={setChsiCode} />
        ) : (
          <StandardForm
            methodCode={methodCode}
            copy={copy}
            methodLabel={methodOption?.label || ''}
            top={methodCode === 'STUDENT_CARD' ? '520rpx' : '335rpx'}
            schoolName={schoolName}
            educationLevel={educationLevel}
            certificateName={certificateName}
            diplomaNo={diplomaNo}
            materialUrls={materialUrls}
            materialPreviewUrls={materialPreviewUrls}
            maxMaterialCount={maxMaterialCount}
            uploading={uploading}
            optionLabel={optionLabel}
            onSchool={(name, code) => { setSchoolName(name); setSchoolCode(code) }}
            onEducationPicker={() => setEducationPickerVisible(true)}
            onCertificateName={setCertificateName}
            onDiplomaNo={setDiplomaNo}
            onUpload={() => void handleUpload()}
          />
        )}

        {detail?.blockedReason ? <Text style={{ position: 'absolute', left: '50rpx', top: '1260rpx', width: '650rpx', color: '#E36A6A', fontSize: '24rpx', textAlign: 'center' }}>{detail.blockedReason}</Text> : null}
        {detail?.rejectReason ? <Text style={{ position: 'absolute', left: '50rpx', top: '1310rpx', width: '650rpx', color: '#E36A6A', fontSize: '24rpx', textAlign: 'center' }}>{detail.rejectReason}</Text> : null}

        {detail?.canSubmit !== false ? (
          <SubmitButton
            id="education-submit-button"
            top={SUBMIT_TOP[methodCode]}
            active={canSubmit}
            submitting={submitting}
            text={copy('common_submit_action')}
            submittingText={copy('common_submitting_action')}
            onClick={() => void handleSubmit()}
          />
        ) : null}

        <AgreementRow
          id="education-agreement-row"
          top={AGREEMENT_TOP[methodCode]}
          checked={agreed}
          onToggle={() => detail?.canSubmit !== false && setAgreed(value => !value)}
          prefix={copy('agreement_read_prefix')}
          agreementName={copy('agreement_education_name')}
        />
        <CustomerServiceLink id="education-customer-service" top={`calc(${AGREEMENT_TOP[methodCode]} + 124rpx)`} text={copy('common_customer_service')} />

        {educationPickerVisible ? (
          <LanhuOptionSheet
            title={copy('education_level_label')}
            options={educationOptions.map(option => option.label)}
            value={optionLabel('educationLevel', educationLevel)}
            onConfirm={label => {
              const option = educationOptions.find(item => item.label === label)
              if (option) setEducationLevel(option.code)
              setEducationPickerVisible(false)
            }}
            onClose={() => setEducationPickerVisible(false)}
          />
        ) : null}
      </VerificationSubShell>
    </VerificationRuntimeBoundary>
  )
}

function StandardForm({ methodCode, copy, methodLabel, top, schoolName, educationLevel, certificateName, diplomaNo, materialUrls, materialPreviewUrls, maxMaterialCount, uploading, optionLabel, onSchool, onEducationPicker, onCertificateName, onDiplomaNo, onUpload }: {
  methodCode: EducationMethod
  copy: (key: string) => string
  methodLabel: string
  top: string
  schoolName: string
  educationLevel: string
  certificateName: string
  diplomaNo: string
  materialUrls: string[]
  materialPreviewUrls: string[]
  maxMaterialCount: number
  uploading: boolean
  optionLabel: (key: 'educationLevel', code?: string) => string
  onSchool: (name: string, code?: string) => void
  onEducationPicker: () => void
  onCertificateName: (value: string) => void
  onDiplomaNo: (value: string) => void
  onUpload: () => void
}) {
  const isStudent = methodCode === 'STUDENT_CARD'
  const isDiploma = methodCode === 'DIPLOMA_NO'
  return (
    <View id={isStudent ? 'education-student-form' : undefined} style={{ position: 'absolute', left: '25rpx', top, width: '700rpx', minHeight: isStudent ? '725rpx' : undefined, borderRadius: '18rpx', background: '#FFFFFF', padding: '34rpx 30rpx 38rpx', boxSizing: 'border-box' }}>
      {!isStudent ? <Text style={{ display: 'block', color: '#0C285A', fontSize: '29rpx', fontWeight: 600, lineHeight: '42rpx', marginBottom: '18rpx' }}>{methodLabel}</Text> : null}
      <SchoolSearchInput marginTop={isStudent ? '0' : '20rpx'} label={copy('education_school_label')} value={schoolName} placeholder={copy('education_school_placeholder')} onChange={onSchool} />
      <PickerRow label={copy('education_level_label')} value={optionLabel('educationLevel', educationLevel)} placeholder={copy('common_select_placeholder')} onClick={onEducationPicker} />
      {isDiploma ? <InputRow label={copy('education_diploma_label')} value={diplomaNo} placeholder={copy('education_diploma_placeholder')} onInput={onDiplomaNo} /> : null}
      {isDiploma ? <InputRow label={copy('education_certificate_name_label')} value={certificateName} placeholder={copy('education_certificate_name_placeholder')} onInput={onCertificateName} /> : null}
      {isStudent || methodCode === 'MATERIAL_UPLOAD' ? (
        <>
          <MaterialUploadArea
            id={isStudent ? 'education-student-upload' : 'education-certificate-upload'}
            gridId={isStudent ? 'education-student-material-grid' : 'education-certificate-material-grid'}
            materialUrls={materialUrls}
            materialPreviewUrls={materialPreviewUrls}
            maxMaterialCount={maxMaterialCount}
            uploading={uploading}
            copy={copy}
            onClick={onUpload}
          />
          <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '18rpx' }}>
            {copy(isStudent ? 'education_student_upload_notice' : 'education_upload_notice')}
          </Text>
        </>
      ) : null}
      {isDiploma ? (
        <View style={{ marginTop: '26rpx', borderRadius: '14rpx', background: '#F7F9FC', padding: '22rpx 24rpx' }}>
          <Text style={{ display: 'block', color: '#0C285A', fontSize: '24rpx', fontWeight: 600 }}>{copy('education_diploma_rules_title')}</Text>
          <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '12rpx' }}>{copy('education_diploma_rule_one')}</Text>
          <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '8rpx' }}>{copy('education_diploma_rule_two')}</Text>
        </View>
      ) : null}
    </View>
  )
}

function MaterialUploadArea({ id, gridId, materialUrls, materialPreviewUrls, maxMaterialCount, uploading, copy, onClick }: {
  id: string
  gridId: string
  materialUrls: string[]
  materialPreviewUrls: string[]
  maxMaterialCount: number
  uploading: boolean
  copy: (key: string) => string
  onClick: () => void
}) {
  if (materialUrls.length === 0) {
    return (
      <UploadProofBox
        id={id}
        onClick={onClick}
        text={uploading
          ? copy('common_uploading_action')
          : formatCopy(copy('education_upload_count_template'), { count: 0, max: maxMaterialCount })}
      />
    )
  }

  return (
    <View id={gridId} style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginTop: '20rpx' }}>
      {materialPreviewUrls.slice(0, maxMaterialCount).map((url, index) => (
        <Image key={`${url}-${index}`} src={url} mode="aspectFill" style={{ width: '148rpx', height: '148rpx', borderRadius: '12rpx' }} />
      ))}
      {materialUrls.length < maxMaterialCount ? (
        <View id={`${id}-more`} style={{ width: '148rpx', height: '148rpx', border: '2rpx dashed #D9D9D9', borderRadius: '12rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }} onClick={onClick}>
          <Image src={miniappOssIcons.verificationUploadCamera} mode="widthFix" style={{ width: '52rpx' }} />
          <Text style={{ color: '#999999', fontSize: '22rpx', marginTop: '10rpx' }}>{uploading ? copy('common_uploading_action') : copy('education_upload_action')}</Text>
        </View>
      ) : null}
    </View>
  )
}

function ChsiForm({ copy, schoolName, onSchool, chsiCode, onChsiCode }: {
  copy: (key: string) => string
  schoolName: string
  onSchool: (name: string, code?: string) => void
  chsiCode: string
  onChsiCode: (value: string) => void
}) {
  const steps = [
    { image: miniappOssIcons.verificationChsiStep1, title: 'education_chsi_step_one_title', desc: 'education_chsi_step_one_desc' },
    { image: miniappOssIcons.verificationChsiStep2, title: 'education_chsi_step_two_title', desc: 'education_chsi_step_two_desc' },
    { image: miniappOssIcons.verificationChsiStep3, title: 'education_chsi_step_three_title', desc: 'education_chsi_step_three_desc' },
    { image: miniappOssIcons.verificationChsiStep4, title: 'education_chsi_step_four_title', desc: 'education_chsi_step_four_desc' },
  ]
  return (
    <View style={{ position: 'absolute', left: '25rpx', top: '156rpx', width: '700rpx', borderRadius: '18rpx', background: '#FFFFFF', padding: '34rpx 30rpx 42rpx', boxSizing: 'border-box' }}>
      <Text style={{ display: 'block', color: '#0C285A', fontSize: '29rpx', fontWeight: 600 }}>{copy('education_chsi_guide_title')}</Text>
      <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '10rpx' }}>{copy('education_chsi_guide_notice')}</Text>
      {steps.map((step, index) => (
        <View key={step.title} style={{ marginTop: '28rpx' }}>
          <Text style={{ display: 'block', color: '#0C285A', fontSize: '24rpx', fontWeight: 600 }}>{copy(step.title)}</Text>
          <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '33rpx', marginTop: '6rpx' }}>{copy(step.desc)}</Text>
          <Image src={step.image} mode="widthFix" style={{ width: '640rpx', marginTop: '14rpx', borderRadius: '10rpx' }} />
          {index === 0 ? <View style={{ height: '68rpx', borderRadius: '34rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '14rpx' }}><Text style={{ color: '#FFFFFF', fontSize: '25rpx' }}>{copy('education_chsi_open_action')}</Text></View> : null}
        </View>
      ))}
      <SchoolSearchInput label={copy('education_school_label')} value={schoolName} placeholder={copy('education_school_placeholder')} onChange={onSchool} />
      <InputRow label={copy('education_chsi_label')} value={chsiCode} placeholder={copy('education_chsi_placeholder')} onInput={onChsiCode} />
    </View>
  )
}

function InputRow({ label, value, placeholder, marginTop = '20rpx', onInput }: { label: string; value: string; placeholder: string; marginTop?: string; onInput: (value: string) => void }) {
  return (
    <View style={{ minHeight: '88rpx', borderRadius: '12rpx', background: '#FCFCFC', marginTop, padding: '0 26rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
      <Text style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 600, lineHeight: '37rpx', width: '220rpx' }}>{label}</Text>
      <Input value={value} placeholder={placeholder} placeholderStyle="color:#999999;font-size:24rpx;text-align:right" onInput={event => { onInput(event.detail.value); return event.detail.value }} style={{ flex: 1, color: '#333333', fontSize: '25rpx', textAlign: 'right' }} />
    </View>
  )
}

function PickerRow({ label, value, placeholder, onClick }: { label: string; value: string; placeholder: string; onClick: () => void }) {
  return (
    <View style={{ minHeight: '88rpx', borderRadius: '12rpx', background: '#FCFCFC', marginTop: '20rpx', padding: '0 26rpx', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }} onClick={onClick}>
      <Text style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 600, lineHeight: '37rpx' }}>{label}</Text>
      <Text style={{ color: value ? '#333333' : '#999999', fontSize: '25rpx', lineHeight: '36rpx' }}>{value || placeholder}</Text>
    </View>
  )
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((result, [key, value]) => result.replace(`{${key}}`, String(value)), template)
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
