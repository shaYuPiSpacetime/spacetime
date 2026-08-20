import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { resolveEducationEntryRoute } from '@/domain/verificationOnboardingFlow'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { RealNameDetail } from '@/types/prd01'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'
import VerificationSubShell from './components/VerificationSubShell'
import { VerificationBottomAction } from './components/VerificationShell'
import { AgreementRow, CustomerServiceLink, VerificationStatusTabs } from './components/EducationVerificationShared'

export default function VerificationRealNamePage() {
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [detail, setDetail] = useState<RealNameDetail>()
  const [realName, setRealName] = useState('')
  const [idCardNo, setIdCardNo] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadDetail = async () => {
    const value = await prd01Api.getRealName()
    setDetail(value)
    setRealName(value.realName || '')
    setIdCardNo(value.idCardNo || '')
  }

  const canSubmit = detail?.canSubmit !== false && Boolean(realName.trim() && idCardNo.trim() && agreed)

  const handleSubmit = async () => {
    if (!agreed) {
      await Taro.showToast({ title: copy('real_name_agreement_required'), icon: 'none' })
      return
    }
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      await prd01Api.submitRealName({
        realName: realName.trim(),
        idCardNo: idCardNo.trim(),
        singleCommitmentChecked: agreed,
      })
      const education = await prd01Api.getEducation()
      await Taro.redirectTo({ url: resolveEducationEntryRoute(education) })
    } catch (error) {
      await showError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <VerificationRuntimeBoundary loadData={loadDetail}>
      <VerificationSubShell
        title={copy('verification_nav_title')}
        contentHeight="1450rpx"
        scroll
        bottomAction={detail?.canSubmit !== false ? (
          <VerificationBottomAction
            id="real-name-submit-button"
            active={canSubmit && !submitting}
            text={submitting ? copy('common_submitting_action') : copy('common_submit_action')}
            onClick={() => void handleSubmit()}
            onInactiveClick={() => void handleSubmit()}
          />
        ) : null}
      >
        <View style={{ position: 'absolute', left: '25rpx', top: '226rpx', width: '700rpx' }}>
          <Text style={{ display: 'block', width: '330rpx', color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx' }}>{copy('real_name_title')}</Text>
          <Text style={{ display: 'block', width: '700rpx', color: '#999999', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '14rpx' }}>{copy('real_name_notice')}</Text>
        </View>
        <VerificationStatusTabs active="realName" copy={copy} />

        {detail?.auditStatus ? (
          <View style={{ position: 'absolute', left: '25rpx', top: '398rpx', width: '700rpx', minHeight: '70rpx', borderRadius: '18rpx', background: '#EAF3FF', padding: '16rpx 26rpx', boxSizing: 'border-box' }}>
            <Text style={{ color: '#2876FF', fontSize: '26rpx', fontWeight: 600 }}>{optionLabel('auditStatus', detail.auditStatus)}</Text>
            {detail.rejectReason ? <Text style={{ display: 'block', color: '#E36A6A', fontSize: '23rpx', marginTop: '8rpx' }}>{detail.rejectReason}</Text> : null}
          </View>
        ) : null}

        <View style={{ position: 'absolute', left: '25rpx', top: detail?.auditStatus ? '494rpx' : '398rpx', width: '700rpx', borderRadius: '20rpx', background: '#FFFFFF', padding: '0 30rpx', boxSizing: 'border-box' }}>
          <FormInput label={copy('real_name_name_label')} value={realName} placeholder={copy('real_name_name_placeholder')} disabled={detail?.canSubmit === false} onInput={setRealName} />
          <View style={{ height: '2rpx', background: '#F1F2F5' }} />
          <FormInput label={copy('real_name_id_label')} value={idCardNo} placeholder={copy('real_name_id_placeholder')} disabled={detail?.canSubmit === false} onInput={setIdCardNo} />
        </View>

        <AgreementRow
          top={detail?.auditStatus ? '744rpx' : '648rpx'}
          checked={agreed}
          onToggle={() => detail?.canSubmit !== false && setAgreed(value => !value)}
          prefix={copy('agreement_read_prefix')}
          agreementName={copy('agreement_single_commitment_name')}
        />
        <CustomerServiceLink top={detail?.auditStatus ? '834rpx' : '738rpx'} text={copy('common_customer_service')} />
      </VerificationSubShell>
    </VerificationRuntimeBoundary>
  )
}

function FormInput({ label, value, placeholder, disabled, onInput }: { label: string; value: string; placeholder: string; disabled: boolean; onInput: (value: string) => void }) {
  return (
    <View style={{ width: '640rpx', height: '112rpx', display: 'flex', alignItems: 'center' }}>
      <Text style={{ color: '#0C285A', fontSize: '28rpx', fontWeight: 600, width: '180rpx' }}>{label}</Text>
      <Input value={value} disabled={disabled} placeholder={placeholder} placeholderStyle="color:#A7B4C8;font-size:26rpx" onInput={event => { onInput(String(event.detail.value || '')); return event.detail.value }} style={{ flex: 1, color: '#0C285A', fontSize: '28rpx', textAlign: 'right' }} />
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
