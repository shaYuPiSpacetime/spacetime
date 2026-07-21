import { Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { canRevokeCancellation, isCoolingOff, resolveCancelSubmitState } from '@/domain/settingsFlow'
import { settingsApi } from '@/services/settings'
import type { AccountCancelCheck, AccountCancelStatus } from '@/types/settings'
import { navigateBackOrRedirect } from '@/utils/navigation'
import SettingsDialog from './components/SettingsDialog'
import SettingsShell from './components/SettingsShell'

const CANCEL_COPY_KEYS = [
  'account_cancel.heading_title',
  'account_cancel.heading_subtitle',
  'account_cancel.cooling_title',
  'account_cancel.cooling_end_label',
  'account_cancel.reason_title',
  'account_cancel.other_reason_value',
  'account_cancel.other_placeholder',
  'account_cancel.cancel_button',
  'account_cancel.submit_button',
  'account_cancel.checking_button',
  'account_cancel.submitted_button',
  'account_cancel.revoke_button',
  'account_cancel.revoking_button',
  'account_cancel.dialog_title',
  'account_cancel.dialog_cancel',
  'account_cancel.dialog_confirm',
  'account_cancel.risk_title',
  'account_cancel.agreement_prefix',
  'account_cancel.agreement_title',
  'account_cancel.success_text',
  'account_cancel.agree_required_text',
  'account_cancel.revoked_success_text',
  'account_cancel.blocked_fallback_text',
  'account_cancel.operation_failed_text',
]

export default function AccountCancelPage() {
  const [status, setStatus] = useState<AccountCancelStatus>({ status: 'NONE' })
  const [check, setCheck] = useState<AccountCancelCheck>({
    canSubmit: false,
    reasons: [],
    hardBlocks: [],
    risks: [],
  })
  const [selected, setSelected] = useState<string[]>([])
  const [detail, setDetail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [checking, setChecking] = useState(false)
  const [copyConfig, setCopyConfig] = useState<Record<string, string>>({})

  useEffect(() => {
    void loadPage()
  }, [])

  const reasons = check.reasons || []
  const submitState = useMemo(() => resolveCancelSubmitState({ selected, detail }), [detail, selected])
  const cooling = isCoolingOff(status)
  const hardBlocks = check.hardBlocks || []
  const risks = check.risks || []
  const canOpenDialog = submitState.enabled && !cooling
  const otherReason = copyConfig['account_cancel.other_reason_value'] || ''

  function copy(key: string) {
    return copyConfig[key] || ''
  }

  async function loadPage() {
    try {
      const [statusResult, checkResult, copyResult] = await Promise.all([
        settingsApi.cancelStatus(),
        settingsApi.cancelCheck(),
        settingsApi.publicConfig(CANCEL_COPY_KEYS),
      ])
      setStatus(statusResult)
      setCopyConfig(copyResult || {})
      setCheck({
        canSubmit: Boolean(checkResult?.canSubmit),
        coolingDays: checkResult?.coolingDays,
        description: checkResult?.description,
        reasons: checkResult?.reasons || [],
        recheckToken: checkResult?.recheckToken,
        hardBlocks: checkResult?.hardBlocks || [],
        risks: checkResult?.risks || [],
      })
    } catch (error) {
      await showError(error)
    }
  }

  function toggleReason(reason: string) {
    setSelected(current => current.includes(reason) ? [] : [reason])
    if (reason !== otherReason) setDetail('')
  }

  async function openCancelDialog() {
    if (!submitState.enabled || cooling || checking) return
    setChecking(true)
    try {
      const latest = await settingsApi.cancelCheck()
      const normalized = {
        canSubmit: Boolean(latest?.canSubmit),
        coolingDays: latest?.coolingDays,
        description: latest?.description,
        reasons: latest?.reasons || [],
        recheckToken: latest?.recheckToken,
        hardBlocks: latest?.hardBlocks || [],
        risks: latest?.risks || [],
      }
      setCheck(normalized)
      if (!normalized.canSubmit || normalized.hardBlocks.length > 0 || !normalized.recheckToken) {
        const firstBlock = normalized.hardBlocks[0]
        await Taro.showToast({
          title: firstBlock?.description || firstBlock?.title || normalized.description || copy('account_cancel.blocked_fallback_text'),
          icon: 'none',
        })
        return
      }
      setAgreed(false)
      setCancelDialogOpen(true)
    } catch (error) {
      await showError(error, copy('account_cancel.operation_failed_text'))
    } finally {
      setChecking(false)
    }
  }

  async function submitCancellation() {
    if (!agreed) {
      await Taro.showToast({ title: copy('account_cancel.agree_required_text'), icon: 'none' })
      return
    }
    if (!submitState.enabled || submitting) return
    setSubmitting(true)
    try {
      await settingsApi.applyCancel(submitState.reason, check.recheckToken)
      setCancelDialogOpen(false)
      setSubmitSuccess(true)
      await loadPage()
      setTimeout(() => setSubmitSuccess(false), 1600)
    } catch (error) {
      await showError(error, copy('account_cancel.operation_failed_text'))
    } finally {
      setSubmitting(false)
    }
  }

  async function revokeCancellation() {
    if (!canRevokeCancellation(status) || revoking) return
    setRevoking(true)
    try {
      await settingsApi.revokeCancel()
      await loadPage()
      await Taro.showToast({ title: copy('account_cancel.revoked_success_text'), icon: 'none' })
    } catch (error) {
      await showError(error, copy('account_cancel.operation_failed_text'))
    } finally {
      setRevoking(false)
    }
  }

  function openAgreement() {
    void Taro.navigateTo({
      url: `/pages/settings/content?title=${encodeURIComponent(copy('account_cancel.agreement_title'))}&contentCode=account_cancellation`,
    })
  }

  return (
    <SettingsShell title="注销账号" className="cancel-content">
      <View className="cancel-heading">
        <Text className="cancel-heading__title">{copy('account_cancel.heading_title')}</Text>
        <Text className="cancel-heading__subtitle">{copy('account_cancel.heading_subtitle') || check.description || ''}</Text>
      </View>

      {cooling ? (
        <View className="cancel-status-card">
          <Text className="cancel-status-card__title">{copy('account_cancel.cooling_title')}</Text>
          <Text className="cancel-status-card__copy">
            {copy('account_cancel.cooling_end_label')}{status.coolingEndTime || ''}
          </Text>
        </View>
      ) : null}

      {status.blockReason ? <Text className="cancel-block-reason">{status.blockReason}</Text> : null}
      {hardBlocks.map(item => (
        <View key={item.code} className="cancel-check-item cancel-check-item--blocked">
          <Text className="cancel-check-item__title">{item.title}</Text>
          {item.description ? <Text className="cancel-check-item__copy">{item.description}</Text> : null}
        </View>
      ))}

      <View className="cancel-reason-title">
        <Text>{copy('account_cancel.reason_title')}</Text>
        <View className="cancel-reason-title__underline" />
      </View>

      <View className="cancel-reason-card">
        {reasons.map(reason => {
          const active = selected.includes(reason)
          return (
            <View key={reason} className={`cancel-reason ${active ? 'is-active' : ''}`} onClick={() => toggleReason(reason)} hoverClass="settings-hover">
              <Text className="cancel-reason__label">{reason}</Text>
              <View className={`settings-check ${active ? 'is-active' : ''}`}><View className="settings-check__mark" /></View>
            </View>
          )
        })}
        <View className="cancel-detail-wrap">
          <Textarea
            className="cancel-detail"
            value={detail}
            disabled={!otherReason || !selected.includes(otherReason)}
            maxlength={120}
            placeholder={copy('account_cancel.other_placeholder')}
            onInput={event => setDetail(event.detail.value)}
          />
        </View>
      </View>

      <View className="cancel-bottom-bar">
        <View
          className="cancel-bottom-button cancel-bottom-button--secondary"
          onClick={() => cooling ? void revokeCancellation() : navigateBackOrRedirect('/pages/settings/index')}
          hoverClass="settings-hover"
        >
          <Text>{cooling
            ? revoking
              ? copy('account_cancel.revoking_button')
              : copy('account_cancel.revoke_button')
            : copy('account_cancel.cancel_button')}</Text>
        </View>
        <View
          className={`cancel-bottom-button cancel-bottom-button--primary ${canOpenDialog ? '' : 'is-disabled'}`}
          onClick={() => canOpenDialog && void openCancelDialog()}
          hoverClass={canOpenDialog ? 'settings-hover' : 'none'}
        >
          <Text>{cooling
            ? copy('account_cancel.submitted_button')
            : checking
              ? copy('account_cancel.checking_button')
              : copy('account_cancel.submit_button')}</Text>
        </View>
      </View>

      <SettingsDialog
        open={cancelDialogOpen}
        title={copy('account_cancel.dialog_title')}
        cancelText={copy('account_cancel.dialog_cancel')}
        confirmText={copy('account_cancel.dialog_confirm')}
        loading={submitting}
        variant="cancel"
        onCancel={() => setCancelDialogOpen(false)}
        onConfirm={() => void submitCancellation()}
      >
        <Text className="cancel-dialog-copy">
          {check.description || ''}
        </Text>
        {risks.length > 0 ? <View className="cancel-dialog-notice">
          <Text className="cancel-dialog-notice__title">{copy('account_cancel.risk_title')}</Text>
          {risks.map(item => (
            <View key={item.code} className="cancel-risk-row">
              <Text className="cancel-risk-row__title">{item.title}</Text>
              {item.description ? <Text className="cancel-risk-row__copy">{item.description}</Text> : null}
            </View>
          ))}
        </View> : null}
        <View className="cancel-dialog-agreement" onClick={() => setAgreed(value => !value)} hoverClass="settings-hover">
          <View className={`settings-check settings-check--small ${agreed ? 'is-active' : ''}`}><View className="settings-check__mark" /></View>
          <Text>{copy('account_cancel.agreement_prefix')}</Text>
          <Text className="cancel-dialog-link" onClick={event => { event.stopPropagation(); openAgreement() }}>
            {copy('account_cancel.agreement_title')}
          </Text>
        </View>
      </SettingsDialog>

      {submitSuccess ? <View className="settings-success-toast"><Text>{copy('account_cancel.success_text')}</Text></View> : null}
    </SettingsShell>
  )
}

async function showError(error: unknown, fallback = '') {
  await Taro.showToast({ title: error instanceof Error ? error.message : fallback, icon: 'none' })
}
