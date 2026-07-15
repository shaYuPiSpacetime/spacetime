import { Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { canRevokeCancellation, isCoolingOff, resolveCancelSubmitState } from '@/domain/settingsFlow'
import { settingsApi } from '@/services/settings'
import type { AccountCancelStatus } from '@/types/settings'
import { navigateBackOrRedirect } from '@/utils/navigation'
import SettingsDialog from './components/SettingsDialog'
import SettingsShell from './components/SettingsShell'

const DEFAULT_REASONS = ['暂时不想使用', '隐私顾虑', '其他']

function parseReasons(raw?: string) {
  if (!raw) return DEFAULT_REASONS
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const reasons = parsed.map(item => String(item || '').trim()).filter(Boolean)
      if (reasons.length > 0) return reasons
    }
  } catch {
    const reasons = raw.split(/[，,；;\n]/).map(item => item.trim()).filter(Boolean)
    if (reasons.length > 0) return reasons
  }
  return DEFAULT_REASONS
}

export default function AccountCancelPage() {
  const [status, setStatus] = useState<AccountCancelStatus>({ status: 'NONE' })
  const [config, setConfig] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [detail, setDetail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    void loadPage()
  }, [])

  const reasons = useMemo(() => parseReasons(config['account_cancel.reasons']), [config])
  const submitState = useMemo(() => resolveCancelSubmitState({ selected, detail }), [detail, selected])
  const cooling = isCoolingOff(status)
  const blocked = Boolean(status.blockReason)
  const canOpenDialog = submitState.enabled && !cooling && !blocked
  const coolingDays = status.coolingDays || Number(config['account_cancel.cooling_days']) || 30
  const reapplyDays = Number(config['account_cancel.reapply_days']) || 30

  async function loadPage() {
    try {
      const [statusResult, configResult] = await Promise.all([
        settingsApi.cancelStatus(),
        settingsApi.publicConfig([
          'account_cancel.reasons',
          'account_cancel.cooling_days',
          'account_cancel.reapply_days',
          'account_cancel.notice_copy',
          'account_cancel.protocol_summary',
          'agreement.account_cancellation',
        ]),
      ])
      setStatus(statusResult)
      setConfig(configResult || {})
    } catch (error) {
      await showError(error)
    }
  }

  function toggleReason(reason: string) {
    setSelected(current => current.includes(reason) ? [] : [reason])
    if (reason !== '其他') setDetail('')
  }

  async function submitCancellation() {
    if (!agreed) {
      await Taro.showToast({ title: '请先阅读并同意用户注销协议', icon: 'none' })
      return
    }
    if (!submitState.enabled || submitting) return
    setSubmitting(true)
    try {
      await settingsApi.applyCancel(submitState.reason)
      setCancelDialogOpen(false)
      setSubmitSuccess(true)
      await loadPage()
      setTimeout(() => setSubmitSuccess(false), 1600)
    } catch (error) {
      await showError(error)
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
      await Taro.showToast({ title: '已撤销注销申请', icon: 'none' })
    } catch (error) {
      await showError(error)
    } finally {
      setRevoking(false)
    }
  }

  function openAgreement() {
    const url = config['agreement.account_cancellation']
    if (!url) {
      void Taro.showToast({ title: '注销须知暂未配置', icon: 'none' })
      return
    }
    void Taro.navigateTo({
      url: `/pages/settings/content?title=${encodeURIComponent('注销须知')}&url=${encodeURIComponent(url)}`,
    })
  }

  return (
    <SettingsShell title="注销账号" className="cancel-content">
      <View className="cancel-heading">
        <Text className="cancel-heading__title">注销账号须知</Text>
        <Text className="cancel-heading__subtitle">账号注销后，资料将被清空且无法恢复</Text>
      </View>

      {cooling ? (
        <View className="cancel-status-card">
          <Text className="cancel-status-card__title">注销申请已提交</Text>
          <Text className="cancel-status-card__copy">
            账号正在{coolingDays}天冷静期内，预计于{status.coolingEndTime || '冷静期结束后'}注销。
          </Text>
        </View>
      ) : null}

      {blocked ? <Text className="cancel-block-reason">{status.blockReason}</Text> : null}

      <View className="cancel-reason-title">
        <Text>选择原因</Text>
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
            disabled={!selected.includes('其他')}
            maxlength={120}
            placeholder="好聚好散，把注销原因告诉我们吧"
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
          <Text>{cooling ? (revoking ? '撤销中' : '撤销注销') : '取消注销'}</Text>
        </View>
        <View
          className={`cancel-bottom-button cancel-bottom-button--primary ${canOpenDialog ? '' : 'is-disabled'}`}
          onClick={() => canOpenDialog && setCancelDialogOpen(true)}
          hoverClass={canOpenDialog ? 'settings-hover' : 'none'}
        >
          <Text>{cooling ? '已提交' : '仍要注销'}</Text>
        </View>
      </View>

      <SettingsDialog
        open={cancelDialogOpen}
        title="注销提醒"
        cancelText="取消注销"
        confirmText="确定注销"
        loading={submitting}
        variant="cancel"
        onCancel={() => setCancelDialogOpen(false)}
        onConfirm={() => void submitCancellation()}
      >
        <Text className="cancel-dialog-copy">
          {config['account_cancel.notice_copy'] || `本次注销有${coolingDays}天的冷静期，如${coolingDays}天内重新登录，可以恢复账号。但为了避免频繁操作，${reapplyDays}天内只可提交1次，否则下次注销时无冷静期。`}
        </Text>
        <View className="cancel-dialog-notice">
          <Text className="cancel-dialog-notice__title">注销须知</Text>
          <Text>{config['account_cancel.protocol_summary'] || `注销期间，你的资料将被下架，无法被查看。所有进行的好友申请即刻失效。\n千寻币、时空邂逅会员等权益如在注销期间过期，无法恢复。\n${coolingDays}天后，你的账号资料、匹配记录、千寻币会员等将永久清空，无法恢复。\n由于平台风控要求，注销后${reapplyDays}天内，你将无法重新注册账号。`}</Text>
        </View>
        <View className="cancel-dialog-agreement" onClick={() => setAgreed(value => !value)} hoverClass="settings-hover">
          <View className={`settings-check settings-check--small ${agreed ? 'is-active' : ''}`}><View className="settings-check__mark" /></View>
          <Text>阅读并同意</Text>
          <Text className="cancel-dialog-link" onClick={event => { event.stopPropagation(); openAgreement() }}>《用户注销协议》</Text>
        </View>
      </SettingsDialog>

      {submitSuccess ? <View className="settings-success-toast"><Text>提交成功</Text></View> : null}
    </SettingsShell>
  )
}

async function showError(error: unknown) {
  await Taro.showToast({ title: error instanceof Error ? error.message : '操作失败，请稍后重试', icon: 'none' })
}
