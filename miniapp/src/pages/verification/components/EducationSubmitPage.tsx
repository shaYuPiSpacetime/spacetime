import { Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, type ReactNode } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import SchoolSearchInput from '@/components/SchoolSearchInput'
import { educationSubmitActionKey } from '@/domain/educationVerification'
import type { EducationField } from '@/domain/educationVerification'
import { useEducationVerification } from '@/hooks/useEducationVerification'
import type { EducationMaterial } from '@/hooks/useEducationVerification'
import { usePrd01Store } from '@/stores/prd01Store'
import type { EducationMethod } from '@/types/prd01'
import VerificationRuntimeBoundary from './VerificationRuntimeBoundary'
import VerificationSubShell from './VerificationSubShell'
import { LanhuOptionSheet } from './LanhuPickerSheet'
import { AgreementRow, CustomerServiceLink, EducationHero, EducationTabs, SubmitButton, UploadProofBox, VerificationStatusTabs } from './EducationVerificationShared'

const EDUCATION_RETRY_COPY_KEYS = [
  'education_school_invalid', 'education_school_selection_required', 'education_level_required',
  'education_chsi_invalid', 'education_diploma_invalid', 'education_certificate_name_invalid',
  'education_material_required', 'education_material_limit_invalid', 'education_resubmit_action',
  'education_reselect_school_action', 'education_material_replace_action', 'education_material_remove_action',
  'education_material_preview_failed', 'education_school_search_empty', 'education_school_search_failed',
  'education_submit_success_notice',
]

/** 学历表单局部顺序布局，原因、错误和图片可撑高，不再覆盖按钮。 */
export default function EducationSubmitPage({ methodCode, userTypeCode }: { methodCode: EducationMethod; userTypeCode: string }) {
  const form = useEducationVerification(methodCode, userTypeCode)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const methodOption = profileOptions?.educationMethod?.find(option => option.code === methodCode)
  const educationOptions = profileOptions?.educationLevel || []
  const [educationPickerVisible, setEducationPickerVisible] = useState(false)
  const [scrollTarget, setScrollTarget] = useState('')
  const [focusedField, setFocusedField] = useState<EducationField>()
  const issueText = (field: EducationField) => {
    const issue = form.issues.find(value => value.field === field)
    return issue ? copy(issue.copyKey).replace('{max}', String(form.maxMaterialCount)) : ''
  }
  const submit = async () => {
    const issue = await form.submit()
    if (!issue) return
    setScrollTarget('')
    setFocusedField(undefined)
    Taro.nextTick(() => { setScrollTarget(`education-field-${issue.field}`); setFocusedField(issue.field) })
  }
  const onSchool = (name: string, code?: string) => {
    if (!form.canEdit) return
    form.setField('schoolName', name)
    form.setField('schoolCode', code)
  }
  const statusNotice = form.statusError || form.detail?.blockedReason || form.detail?.rejectReason
  const fieldProps = {
    schoolName: form.draft.schoolName, schoolCode: form.draft.schoolCode,
    educationLevel: form.draft.educationLevel, copy, optionLabel, issueText,
    disabled: !form.canEdit, focusedField, onSchool,
    onEducationPicker: () => { if (form.canEdit) setEducationPickerVisible(true) },
  }

  return (
    <VerificationRuntimeBoundary loadData={async () => {
      const runtimeCopy = usePrd01Store.getState().copy
      if (EDUCATION_RETRY_COPY_KEYS.some(key => !runtimeCopy(key))) throw new Error(runtimeCopy('common_load_failed_message'))
      await form.loadDetail()
    }}>
      <VerificationSubShell title={methodCode === 'STUDENT_CARD' ? copy('verification_nav_title') : methodCode === 'MATERIAL_UPLOAD' ? '上传证书' : methodOption?.label || ''} contentHeight="1678rpx" scroll scrollIntoView={scrollTarget}>
        {methodCode === 'STUDENT_CARD' ? <><EducationHero copy={copy} /><VerificationStatusTabs active="education" copy={copy} /><EducationTabs active="student" copy={copy} /></> : methodCode !== 'CHSI' ? (
          <Text style={{ position: 'absolute', left: '25rpx', top: '226rpx', color: '#0C285A', fontSize: '48rpx', fontWeight: 600 }}>{methodOption?.label || ''}</Text>
        ) : null}
        <View id="education-field-method" style={{ width: '700rpx', margin: '0 auto', paddingTop: methodCode === 'STUDENT_CARD' ? '344rpx' : methodCode === 'CHSI' ? 0 : '159rpx', paddingBottom: '80rpx' }}>
          {statusNotice ? (
            <View id="education-status-notice" style={{ padding: '24rpx 30rpx', marginBottom: '20rpx', background: '#FFF3F3', borderRadius: '16rpx', color: '#BC4B4B', fontSize: '25rpx', lineHeight: '38rpx', overflowWrap: 'break-word' }}>
              {statusNotice}
              {form.statusError ? <View onClick={() => void form.refreshStatus()} style={{ marginTop: '14rpx', color: '#2876FF' }}>{copy('common_retry_action')}</View> : null}
            </View>
          ) : null}
          <FieldError text={issueText('method')} />
          {methodCode === 'CHSI' ? (
            <ChsiForm {...fieldProps} chsiCode={form.draft.chsiCode || ''} onChsiCode={value => form.setField('chsiCode', value)} />
          ) : (
            <StandardForm {...fieldProps} methodCode={methodCode} methodLabel={methodOption?.label || ''}
              diplomaNo={form.draft.diplomaNo || ''} certificateName={form.draft.certificateName || ''}
              onDiplomaNo={value => form.setField('diplomaNo', value)} onCertificateName={value => form.setField('certificateName', value)}>
              {methodCode === 'STUDENT_CARD' || methodCode === 'MATERIAL_UPLOAD' ? (
                <View id="education-field-materials">
                  <MaterialUploadArea methodCode={methodCode} materials={form.materials} maxMaterialCount={form.maxMaterialCount} uploading={form.uploading} disabled={!form.canEdit} copy={copy}
                    onUpload={id => void form.upload(id)} onRemove={form.removeMaterial} onRetry={form.retryPreview} />
                  <FieldError text={issueText('materials')} />
                  <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '18rpx' }}>{copy(methodCode === 'STUDENT_CARD' ? 'education_student_upload_notice' : 'education_upload_notice')}</Text>
                </View>
              ) : null}
            </StandardForm>
          )}
          <SubmitButton id="education-submit-button" flow active={form.canEdit && !form.uploading} disabled={!form.canEdit || form.submitting || form.uploading} submitting={form.submitting}
            text={copy(educationSubmitActionKey(form.detail))} submittingText={copy('common_submitting_action')} onClick={() => void submit()} />
          {form.uploading ? <FieldError text={copy('common_uploading_action')} /> : null}
          <View id="education-field-agreement">
            <AgreementRow id="education-agreement-row" flow checked={form.draft.educationAgreementChecked} onToggle={() => { if (form.canEdit) form.setField('educationAgreementChecked', !form.draft.educationAgreementChecked) }}
              prefix={copy('agreement_read_prefix')} agreementName={copy('agreement_education_name')} agreementCode="education_verification_agreement" />
            <FieldError text={issueText('agreement')} />
          </View>
          <CustomerServiceLink id="education-customer-service" flow text={copy('common_customer_service')} />
        </View>
        {educationPickerVisible ? <LanhuOptionSheet title={copy('education_level_label')} options={educationOptions.map(option => option.label)} value={optionLabel('educationLevel', form.draft.educationLevel)}
          onConfirm={label => { const option = educationOptions.find(value => value.label === label); if (option && form.canEdit) form.setField('educationLevel', option.code); setEducationPickerVisible(false) }} onClose={() => setEducationPickerVisible(false)} /> : null}
      </VerificationSubShell>
    </VerificationRuntimeBoundary>
  )
}

interface CommonFieldsProps {
  schoolName: string
  schoolCode?: string
  educationLevel: string
  disabled: boolean
  focusedField?: EducationField
  copy: (key: string) => string
  optionLabel: (key: 'educationLevel', code?: string) => string
  issueText: (field: EducationField) => string
  onSchool: (name: string, code?: string) => void
  onEducationPicker: () => void
}

function CommonFields({ schoolName, schoolCode, educationLevel, disabled, focusedField, copy, optionLabel, issueText, onSchool, onEducationPicker }: CommonFieldsProps) {
  return <>
    <View id="education-field-school">
      <SchoolSearchInput marginTop="0" label={copy('education_school_label')} value={schoolName} placeholder={copy('education_school_placeholder')} onChange={onSchool} disabled={disabled}
        selectionRequired={!schoolCode && Boolean(schoolName.trim())} selectionHint={copy('education_school_selection_required')} reselectText={copy('education_reselect_school_action')}
        emptyText={copy('education_school_search_empty')} failureText={copy('education_school_search_failed')} focus={focusedField === 'school'} />
      <FieldError text={issueText('school')} />
    </View>
    <View id="education-field-educationLevel">
      <View onClick={disabled ? undefined : onEducationPicker} style={{ minHeight: '88rpx', borderRadius: '12rpx', background: '#FCFCFC', marginTop: '20rpx', padding: '0 26rpx', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
        <View style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 600 }}>{copy('education_level_label')}</View>
        <View style={{ color: educationLevel ? '#333333' : '#999999', fontSize: '25rpx' }}>{optionLabel('educationLevel', educationLevel) || copy('common_select_placeholder')}</View>
      </View>
      <FieldError text={issueText('educationLevel')} />
    </View>
  </>
}

function StandardForm({ methodCode, methodLabel, diplomaNo, certificateName, onDiplomaNo, onCertificateName, children, ...common }: CommonFieldsProps & {
  methodCode: EducationMethod; methodLabel: string; diplomaNo: string; certificateName: string
  onDiplomaNo: (value: string) => void; onCertificateName: (value: string) => void; children: ReactNode
}) {
  const isStudent = methodCode === 'STUDENT_CARD'
  const isDiploma = methodCode === 'DIPLOMA_NO'
  return (
    <View id={isStudent ? 'education-student-form' : 'education-standard-form'} style={{ width: '700rpx', minHeight: isStudent ? '725rpx' : undefined, borderRadius: '18rpx', background: '#FFFFFF', padding: '34rpx 30rpx 38rpx', boxSizing: 'border-box' }}>
      {!isStudent ? <Text style={{ display: 'block', color: '#0C285A', fontSize: '29rpx', fontWeight: 600, marginBottom: '18rpx' }}>{methodLabel}</Text> : null}
      <CommonFields {...common} />
      {isDiploma ? <>
        <InputRow field="diplomaNo" label={common.copy('education_diploma_label')} value={diplomaNo} placeholder={common.copy('education_diploma_placeholder')} disabled={common.disabled} focus={common.focusedField === 'diplomaNo'} error={common.issueText('diplomaNo')} onInput={onDiplomaNo} />
        <InputRow field="certificateName" label={common.copy('education_certificate_name_label')} value={certificateName} placeholder={common.copy('education_certificate_name_placeholder')} disabled={common.disabled} focus={common.focusedField === 'certificateName'} error={common.issueText('certificateName')} onInput={onCertificateName} />
      </> : null}
      {children}
      {isDiploma ? <View style={{ marginTop: '26rpx', borderRadius: '14rpx', background: '#F7F9FC', padding: '22rpx 24rpx', color: '#999999', fontSize: '22rpx', lineHeight: '34rpx' }}>
        <View style={{ color: '#0C285A', fontSize: '24rpx', fontWeight: 600 }}>{common.copy('education_diploma_rules_title')}</View>
        <View style={{ marginTop: '12rpx' }}>{common.copy('education_diploma_rule_one')}</View><View style={{ marginTop: '8rpx' }}>{common.copy('education_diploma_rule_two')}</View>
      </View> : null}
    </View>
  )
}

function MaterialUploadArea({ methodCode, materials, maxMaterialCount, uploading, disabled, copy, onUpload, onRemove, onRetry }: {
  methodCode: EducationMethod; materials: EducationMaterial[]; maxMaterialCount: number; uploading: boolean; disabled: boolean
  copy: (key: string) => string; onUpload: (id?: string) => void; onRemove: (id: string) => void; onRetry: (id: string) => void
}) {
  const id = methodCode === 'STUDENT_CARD' ? 'education-student-upload' : 'education-certificate-upload'
  const gridId = methodCode === 'STUDENT_CARD' ? 'education-student-material-grid' : 'education-certificate-material-grid'
  const busy = disabled || uploading
  const countText = copy('education_upload_count_template').replace('{count}', String(materials.length)).replace('{max}', String(maxMaterialCount))
  if (materials.length === 0) return <UploadProofBox id={id} onClick={() => { if (!busy) onUpload() }} text={uploading ? copy('common_uploading_action') : countText} />
  return <>
    <View style={{ color: '#697E9C', fontSize: '22rpx', marginTop: '20rpx' }}>{countText}</View>
    <View id={gridId} style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginTop: '14rpx' }}>
      {materials.map(item => <View key={item.id} style={{ width: '196rpx' }}>
        {item.previewStatus === 'ready' && item.previewUrl ? <Image src={item.previewUrl} mode="aspectFill" style={{ width: '196rpx', height: '148rpx', borderRadius: '12rpx' }} onClick={() => void Taro.previewImage({ current: item.previewUrl!, urls: materials.filter(value => value.previewStatus === 'ready' && value.previewUrl).map(value => value.previewUrl!) })} /> : (
          <View onClick={() => { if (item.previewStatus === 'error') onRetry(item.id) }} style={{ height: '148rpx', background: '#F7F9FC', borderRadius: '12rpx', padding: '12rpx', boxSizing: 'border-box', textAlign: 'center', color: '#8A93A5', fontSize: '22rpx', lineHeight: '32rpx' }}>
            {copy(item.previewStatus === 'error' ? 'education_material_preview_failed' : 'common_loading_action')}
            {item.previewStatus === 'error' ? <View style={{ color: '#2876FF' }}>{copy('common_retry_action')}</View> : null}
          </View>
        )}
        <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8rpx', color: busy ? '#AAB1BE' : '#2876FF', fontSize: '22rpx' }}>
          <View data-role="education-material-replace" onClick={busy ? undefined : () => onUpload(item.id)} style={{ padding: '8rpx' }}>{copy('education_material_replace_action')}</View>
          <View data-role="education-material-remove" onClick={busy ? undefined : () => onRemove(item.id)} style={{ padding: '8rpx' }}>{copy('education_material_remove_action')}</View>
        </View>
      </View>)}
      {materials.length < maxMaterialCount ? <View id={`${id}-more`} onClick={busy ? undefined : () => onUpload()} style={{ width: '196rpx', height: '148rpx', border: '2rpx dashed #D9D9D9', borderRadius: '12rpx', boxSizing: 'border-box', textAlign: 'center', paddingTop: '24rpx' }}>
        <Image src={miniappOssIcons.verificationUploadCamera} mode="widthFix" style={{ width: '52rpx' }} /><View style={{ color: '#999999', fontSize: '22rpx' }}>{copy(uploading ? 'common_uploading_action' : 'education_upload_action')}</View>
      </View> : null}
    </View>
  </>
}

function ChsiForm({ chsiCode, onChsiCode, ...common }: CommonFieldsProps & { chsiCode: string; onChsiCode: (value: string) => void }) {
  const steps = [
    { image: miniappOssIcons.verificationChsiStep1, title: 'education_chsi_step_one_title', desc: 'education_chsi_step_one_desc' },
    { image: miniappOssIcons.verificationChsiStep2, title: 'education_chsi_step_two_title', desc: 'education_chsi_step_two_desc' },
    { image: miniappOssIcons.verificationChsiStep3, title: 'education_chsi_step_three_title', desc: 'education_chsi_step_three_desc' },
    { image: miniappOssIcons.verificationChsiStep4, title: 'education_chsi_step_four_title', desc: 'education_chsi_step_four_desc' },
  ]
  return <View style={{ width: '700rpx', borderRadius: '18rpx', background: '#FFFFFF', padding: '34rpx 30rpx 42rpx', boxSizing: 'border-box' }}>
    <CommonFields {...common} />
    <InputRow field="chsiCode" label={common.copy('education_chsi_label')} value={chsiCode} placeholder={common.copy('education_chsi_placeholder')} disabled={common.disabled} focus={common.focusedField === 'chsiCode'} error={common.issueText('chsiCode')} onInput={onChsiCode} />
    <View style={{ marginTop: '32rpx', color: '#0C285A', fontSize: '29rpx', fontWeight: 600 }}>{common.copy('education_chsi_guide_title')}</View>
    <View style={{ color: '#999999', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '10rpx' }}>{common.copy('education_chsi_guide_notice')}</View>
    {steps.map(step => <View key={step.title} style={{ marginTop: '28rpx' }}>
      <View style={{ color: '#0C285A', fontSize: '24rpx', fontWeight: 600 }}>{common.copy(step.title)}</View>
      <View style={{ color: '#999999', fontSize: '22rpx', lineHeight: '33rpx', marginTop: '6rpx' }}>{common.copy(step.desc)}</View>
      <Image src={step.image} mode="widthFix" style={{ width: '640rpx', marginTop: '14rpx', borderRadius: '10rpx' }} />
    </View>)}
  </View>
}

function InputRow({ field, label, value, placeholder, disabled, focus, error, onInput }: { field: EducationField; label: string; value: string; placeholder: string; disabled: boolean; focus: boolean; error: string; onInput: (value: string) => void }) {
  return <View id={`education-field-${field}`}>
    <View style={{ minHeight: '88rpx', borderRadius: '12rpx', background: '#FCFCFC', marginTop: '20rpx', padding: '0 26rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
      <View style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 600, width: '220rpx' }}>{label}</View>
      <Input value={value} placeholder={placeholder} disabled={disabled} focus={focus} maxlength={100} placeholderStyle="color:#999999;font-size:24rpx;text-align:right" onInput={event => { onInput(event.detail.value); return event.detail.value }} style={{ flex: 1, color: '#333333', fontSize: '25rpx', textAlign: 'right' }} />
    </View>
    <FieldError text={error} />
  </View>
}

function FieldError({ text }: { text: string }) {
  return text ? <View style={{ color: '#BC4B4B', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '10rpx', overflowWrap: 'break-word' }}>{text}</View> : null
}
