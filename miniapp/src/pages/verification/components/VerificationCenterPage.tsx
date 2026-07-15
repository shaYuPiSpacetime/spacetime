import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { VerificationStatus } from '@/types/prd01'
import { getErrorMessage } from '@/utils/errorMessage'
import { navigateBackOrRedirect } from '@/utils/navigation'
import VerificationRuntimeBoundary from './VerificationRuntimeBoundary'
import VerificationShell from './VerificationShell'
import VerificationSubShell from './VerificationSubShell'

const CERT_ITEMS = [
  { key: 'avatar', icon: miniappOssIcons.verificationCertAvatar, titleKey: 'verification_avatar_title', descKey: 'verification_avatar_desc', statusKey: 'avatarVerifyStatus', reasonKey: 'avatarVerifyRejectReason', canSubmitKey: 'avatarCanSubmit', route: '/pages/verification/avatar' },
  { key: 'realName', icon: miniappOssIcons.verificationCertRealName, titleKey: 'verification_real_name_title', descKey: 'verification_real_name_desc', statusKey: 'realNameStatus', reasonKey: 'realNameRejectReason', canSubmitKey: 'realNameCanSubmit', route: '/pages/verification/real-name' },
  { key: 'education', icon: miniappOssIcons.verificationCertEducation, titleKey: 'verification_education_title', descKey: 'verification_education_desc', statusKey: 'educationStatus', reasonKey: 'educationRejectReason', canSubmitKey: 'educationCanSubmit', route: '/pages/verification/education-mainland' },
] as const

export default function VerificationCenterPage({ onboarding = false }: { onboarding?: boolean }) {
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [status, setStatus] = useState<VerificationStatus>()

  const enterCertification = async (item: (typeof CERT_ITEMS)[number]) => {
    const auditStatus = status?.[item.statusKey]
    const canSubmit = status?.[item.canSubmitKey] !== false
    const blockedReason = item.key === 'education' ? status?.educationBlockedReason : undefined
    if (auditStatus === 'APPROVED') return
    if (!canSubmit) {
      await Taro.showToast({ title: blockedReason || status?.[item.reasonKey] || optionLabel('auditStatus', auditStatus), icon: 'none' })
      return
    }
    if (item.key !== 'education') {
      await Taro.redirectTo({ url: item.route })
      return
    }
    try {
      const detail = await prd01Api.getEducation()
      const route = detail.educationUserType === 'STUDENT'
        ? '/pages/verification/education-student'
        : item.route
      await Taro.redirectTo({ url: route })
    } catch (error) {
      await showError(error, copy('common_load_failed_message'))
    }
  }

  const content = (
    <VerificationCenterContent
      status={status}
      copy={copy}
      optionLabel={optionLabel}
      top={onboarding ? '558rpx' : '400rpx'}
      onEnter={enterCertification}
    />
  )

  return (
    <VerificationRuntimeBoundary loadData={async () => setStatus(await prd01Api.getVerificationStatus())}>
      {onboarding ? (
        <VerificationShell stage="triple" onBack={() => navigateBackOrRedirect('/pages/index/index')}>
          {content}
        </VerificationShell>
      ) : (
        <VerificationSubShell title={copy('verification_center_title')} onBack={() => navigateBackOrRedirect('/pages/profile/edit')}>
          {content}
        </VerificationSubShell>
      )}
    </VerificationRuntimeBoundary>
  )
}

function VerificationCenterContent({
  status,
  copy,
  optionLabel,
  top,
  onEnter,
}: {
  status?: VerificationStatus
  copy: (key: string) => string
  optionLabel: (key: 'auditStatus', code?: string) => string
  top: string
  onEnter: (item: (typeof CERT_ITEMS)[number]) => void | Promise<void>
}) {
  return (
    <View style={{ position: 'absolute', left: '25rpx', top, width: '700rpx' }}>
      {CERT_ITEMS.map(item => {
        const auditStatus = status?.[item.statusKey]
        const approved = auditStatus === 'APPROVED'
        const canSubmit = status?.[item.canSubmitKey] !== false
        const reason = status?.[item.reasonKey]
        const statusLabel = optionLabel('auditStatus', auditStatus)
        return (
          <View key={item.key} style={{ position: 'relative', width: '700rpx', height: '168rpx', borderRadius: '16rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '36rpx 190rpx 30rpx 146rpx', boxSizing: 'border-box' }} onClick={() => void onEnter(item)}>
            <Image src={item.icon} mode="aspectFit" style={{ position: 'absolute', left: '30rpx', top: '34rpx', width: '100rpx', height: '100rpx' }} />
            <Text style={{ display: 'block', color: '#0C285A', fontSize: '30rpx', fontWeight: 800, lineHeight: '42rpx' }}>{copy(item.titleKey)}</Text>
            <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '8rpx', whiteSpace: 'nowrap' }}>{copy(item.descKey)}</Text>
            {approved ? (
              <RoundCheck />
            ) : (
              <View style={{ position: 'absolute', right: '28rpx', top: '50rpx', minWidth: '138rpx', height: '68rpx', borderRadius: '8rpx', background: canSubmit ? '#2876FF' : '#D8E8FF', padding: '0 18rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                <Text style={{ color: canSubmit ? '#FFFFFF' : '#FFFFFF', fontSize: '24rpx', fontWeight: 700 }}>{statusLabel || copy('verification_enter_action')}</Text>
              </View>
            )}
            {reason ? <Text style={{ position: 'absolute', left: '146rpx', bottom: '8rpx', color: '#E36A6A', fontSize: '20rpx', lineHeight: '28rpx' }}>{reason}</Text> : null}
          </View>
        )
      })}
      <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '38rpx', marginTop: '28rpx' }}>{copy('triple_safety_notice')}</Text>
      {status?.educationEstimatedCompleteTime ? <Text style={{ display: 'block', color: '#697E9C', fontSize: '22rpx', lineHeight: '34rpx', marginTop: '10rpx' }}>{status.educationSlaText} {status.educationEstimatedCompleteTime}</Text> : null}
    </View>
  )
}

function RoundCheck() {
  return (
    <View style={{ position: 'absolute', right: '38rpx', top: '60rpx', width: '48rpx', height: '48rpx', borderRadius: '24rpx', background: '#2876FF' }}>
      <View style={{ position: 'absolute', left: '13rpx', top: '12rpx', width: '22rpx', height: '13rpx', borderLeft: '5rpx solid #FFFFFF', borderBottom: '5rpx solid #FFFFFF', transform: 'rotate(-45deg)' }} />
    </View>
  )
}

async function showError(error: unknown, fallback: string) {
  const title = getErrorMessage(error, fallback)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
