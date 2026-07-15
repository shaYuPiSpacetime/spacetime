import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { RealNameDetail } from '@/types/prd01'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'
import VerificationSubShell from './components/VerificationSubShell'

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

  const canSubmit = detail?.canSubmit !== false && realName.trim() && idCardNo.trim() && agreed

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
      await Taro.redirectTo({ url: '/pages/verification/triple' })
    } catch (error) {
      await showError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel = optionLabel('auditStatus', detail?.auditStatus)

  return (
    <VerificationRuntimeBoundary loadData={loadDetail}>
      <VerificationSubShell title={copy('verification_nav_title')}>
      <View style={{ position: 'absolute', left: '25rpx', top: '226rpx', width: '700rpx' }}>
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', fontWeight: 600 }}>{copy('real_name_title')}</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '40rpx', marginTop: '12rpx' }}>{copy('real_name_notice')}</Text>
      </View>

      {detail?.auditStatus ? (
        <View style={{ position: 'absolute', left: '25rpx', top: '370rpx', width: '700rpx', minHeight: '80rpx', borderRadius: '20rpx', background: '#EAF3FF', padding: '20rpx 28rpx', boxSizing: 'border-box' }}>
          <Text style={{ color: '#2876FF', fontSize: '28rpx', fontWeight: 700 }}>{statusLabel}</Text>
          {detail.rejectReason ? <Text style={{ display: 'block', color: '#697E9C', fontSize: '24rpx', marginTop: '8rpx' }}>{detail.rejectReason}</Text> : null}
        </View>
      ) : null}

      <View style={{ position: 'absolute', left: '25rpx', top: '480rpx', width: '700rpx', borderRadius: '32rpx', background: '#FFFFFF', padding: '30rpx', boxSizing: 'border-box' }}>
        <FormInput label={copy('real_name_name_label')} value={realName} placeholder={copy('real_name_name_placeholder')} disabled={detail?.canSubmit === false} onInput={setRealName} />
        <FormInput label={copy('real_name_id_label')} value={idCardNo} placeholder={copy('real_name_id_placeholder')} disabled={detail?.canSubmit === false} onInput={setIdCardNo} top="20rpx" />
      </View>

      <View style={{ position: 'absolute', left: '32rpx', top: '790rpx', width: '686rpx', display: 'flex', alignItems: 'flex-start' }} onClick={() => detail?.canSubmit !== false && setAgreed(value => !value)}>
        <View style={{ width: '32rpx', height: '32rpx', borderRadius: '16rpx', border: '2rpx solid #2876FF', background: agreed ? '#2876FF' : 'transparent', boxSizing: 'border-box', marginRight: '16rpx', flexShrink: 0 }} />
        <Text style={{ color: '#697E9C', fontSize: '26rpx', lineHeight: '40rpx' }}>{copy('agreement_single_commitment')}</Text>
      </View>

      {detail?.canSubmit !== false ? (
        <View style={{ position: 'absolute', left: '25rpx', top: '920rpx', width: '700rpx', height: '98rpx', borderRadius: '24rpx', background: canSubmit ? '#2876FF' : '#CEE0F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void handleSubmit()}>
          <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 500 }}>{copy(submitting ? 'common_submitting_action' : 'common_submit_action')}</Text>
        </View>
      ) : null}
      </VerificationSubShell>
    </VerificationRuntimeBoundary>
  )
}

function FormInput({ label, value, placeholder, disabled, top = '0', onInput }: { label: string; value: string; placeholder: string; disabled: boolean; top?: string; onInput: (value: string) => void }) {
  return (
    <View style={{ width: '640rpx', height: '98rpx', borderRadius: '20rpx', background: '#F6F9FE', padding: '0 26rpx', boxSizing: 'border-box', marginTop: top, display: 'flex', alignItems: 'center' }}>
      <Text style={{ color: '#0C285A', fontSize: '26rpx', fontWeight: 800, width: '160rpx' }}>{label}</Text>
      <Input value={value} disabled={disabled} placeholder={placeholder} placeholderStyle="color:#A7B4C8;font-size:26rpx" onInput={event => { onInput(String(event.detail.value || '')); return event.detail.value }} style={{ flex: 1, color: '#0C285A', fontSize: '26rpx', textAlign: 'right' }} />
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
