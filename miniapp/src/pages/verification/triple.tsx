import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { VerificationStatus } from '@/types/prd01'
import VerificationSubShell from './components/VerificationSubShell'

const CERT_ITEMS = [
  { key: 'avatar', icon: miniappOssIcons.verificationCertAvatar, titleKey: 'verification_avatar_title', descKey: 'verification_avatar_desc', statusKey: 'avatarVerifyStatus', reasonKey: 'avatarVerifyRejectReason', canSubmitKey: 'avatarCanSubmit', route: '/pages/verification/avatar' },
  { key: 'realName', icon: miniappOssIcons.verificationCertRealName, titleKey: 'verification_real_name_title', descKey: 'verification_real_name_desc', statusKey: 'realNameStatus', reasonKey: 'realNameRejectReason', canSubmitKey: 'realNameCanSubmit', route: '/pages/verification/real-name' },
  { key: 'education', icon: miniappOssIcons.verificationCertEducation, titleKey: 'verification_education_title', descKey: 'verification_education_desc', statusKey: 'educationStatus', reasonKey: 'educationRejectReason', canSubmitKey: 'educationCanSubmit', route: '/pages/verification/education-mainland' },
] as const

export default function VerificationTriplePage() {
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [status, setStatus] = useState<VerificationStatus>()

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        setStatus(await prd01Api.getVerificationStatus())
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  const enterCertification = async (item: (typeof CERT_ITEMS)[number]) => {
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
      await showError(error)
    }
  }

  return (
    <VerificationSubShell title={copy('verification_center_title')}>
      <View style={{ position: 'absolute', left: '25rpx', top: '226rpx', width: '700rpx' }}>
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', fontWeight: 700 }}>{copy('verification_center_heading')}</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '40rpx', marginTop: '14rpx' }}>{copy('verification_center_notice')}</Text>
      </View>
      <View style={{ position: 'absolute', left: '25rpx', top: '400rpx', width: '700rpx' }}>
        {CERT_ITEMS.map(item => {
          const auditStatus = status?.[item.statusKey]
          const canSubmit = status?.[item.canSubmitKey] !== false
          const reason = status?.[item.reasonKey]
          return (
            <View key={item.key} style={{ position: 'relative', width: '700rpx', minHeight: reason ? '206rpx' : '168rpx', borderRadius: '24rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '36rpx 190rpx 30rpx 150rpx', boxSizing: 'border-box' }} onClick={() => void enterCertification(item)}>
              <Image src={item.icon} mode="aspectFit" style={{ position: 'absolute', left: '38rpx', top: '34rpx', width: '84rpx', height: '84rpx' }} />
              <Text style={{ display: 'block', color: '#0C285A', fontSize: '30rpx', fontWeight: 800 }}>{copy(item.titleKey)}</Text>
              <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', marginTop: '10rpx' }}>{copy(item.descKey)}</Text>
              {reason ? <Text style={{ display: 'block', color: '#E36A6A', fontSize: '22rpx', lineHeight: '32rpx', marginTop: '10rpx' }}>{reason}</Text> : null}
              <View style={{ position: 'absolute', right: '24rpx', top: '48rpx', minWidth: '138rpx', height: '64rpx', borderRadius: '18rpx', background: canSubmit ? '#2876FF' : '#EAF3FF', padding: '0 18rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                <Text style={{ color: canSubmit ? '#FFFFFF' : '#2876FF', fontSize: '24rpx', fontWeight: 700 }}>{optionLabel('auditStatus', auditStatus) || copy('verification_enter_action')}</Text>
              </View>
            </View>
          )
        })}
        {status?.educationEstimatedCompleteTime ? <Text style={{ display: 'block', color: '#697E9C', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '14rpx' }}>{status.educationSlaText} {status.educationEstimatedCompleteTime}</Text> : null}
      </View>
    </VerificationSubShell>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
