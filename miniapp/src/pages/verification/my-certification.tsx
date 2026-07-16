import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { miniappOssIcons } from '@/constants/ossIcons'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { EducationDetail, RealNameDetail, VerificationStatus } from '@/types/prd01'
import { navigateBackOrRedirect } from '@/utils/navigation'
import { emitProfileUpdated } from '@/utils/profileEditEvents'
import VerificationRuntimeBoundary from './components/VerificationRuntimeBoundary'

type CertificationKey = 'avatar' | 'realName' | 'education'

const certifications = [
  { key: 'avatar' as const, icon: miniappOssIcons.verificationCertAvatar, titleKey: 'verification_avatar_title', descKey: 'verification_detail_avatar_desc', statusKey: 'avatarVerifyStatus' as const, route: '/pages/verification/avatar' },
  { key: 'realName' as const, icon: miniappOssIcons.verificationCertRealName, titleKey: 'verification_real_name_title', descKey: 'verification_detail_real_name_desc', statusKey: 'realNameStatus' as const, route: '/pages/verification/real-name' },
  { key: 'education' as const, icon: miniappOssIcons.verificationCertEducation, titleKey: 'verification_education_title', descKey: 'verification_detail_education_desc', statusKey: 'educationStatus' as const, route: '/pages/verification/education-mainland' },
]

export default function MyCertificationPage() {
  const copy = usePrd01Store(state => state.copy)
  const optionLabel = usePrd01Store(state => state.optionLabel)
  const [status, setStatus] = useState<VerificationStatus>({})
  const [realName, setRealName] = useState<RealNameDetail>()
  const [education, setEducation] = useState<EducationDetail>()

  useDidShow(() => {
    void Promise.all([
      prd01Api.getVerificationStatus(),
      prd01Api.getRealName(),
      prd01Api.getEducation(),
    ]).then(([nextStatus, realNameDetail, educationDetail]) => {
      setStatus(nextStatus)
      setRealName(realNameDetail)
      setEducation(educationDetail)
      emitProfileUpdated({ type: 'verification', status: nextStatus })
    }).catch(showError)
  })

  const enter = async (key: CertificationKey, route: string) => {
    if (key === 'education' && education?.educationUserType === 'STUDENT') {
      await Taro.navigateTo({ url: '/pages/verification/education-student' })
      return
    }
    await Taro.navigateTo({ url: route })
  }

  return (
    <VerificationRuntimeBoundary>
      <View style={{ height: '100vh', overflow: 'hidden', background: 'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 50%, rgba(248,250,239,0.72) 100%)' }}>
        <LanhuSubNav title={copy('verification_center_title')} onBack={() => navigateBackOrRedirect('/pages/profile/edit')} />
        <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)' }} showScrollbar={false}>
          <View style={{ width: '700rpx', minHeight: '1420rpx', margin: '0 auto', paddingBottom: '180rpx', boxSizing: 'border-box' }}>
            <Text style={{ display: 'block', color: '#0C285A', fontSize: '48rpx', lineHeight: '67rpx', fontWeight: 800, marginTop: '50rpx' }}>{copy('verification_detail_heading')}</Text>
            <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '38rpx', marginTop: '18rpx' }}>{copy('verification_detail_notice')}</Text>
            <View style={{ marginTop: '62rpx' }}>
              {certifications.map(item => {
                const auditStatus = status[item.statusKey]
                const approved = auditStatus === 'APPROVED'
                return (
                  <CertificationDetailCard
                    key={item.key}
                    icon={item.icon}
                    title={copy(item.titleKey)}
                    desc={copy(item.descKey)}
                    statusText={approved ? copy('verification_detail_verified') : optionLabel('auditStatus', auditStatus)}
                    detail={item.key === 'realName' && approved ? [
                      [copy('verification_detail_name_label'), realName?.realName || ''],
                      [copy('verification_detail_id_label'), realName?.idCardNo || ''],
                    ] : item.key === 'education' && approved ? [
                      [copy('verification_detail_school_label'), education?.schoolName || ''],
                      [copy('verification_detail_degree_label'), education?.educationLevelLabel || optionLabel('educationLevel', education?.educationLevel)],
                    ] : []}
                    actionText={item.key === 'education' && approved ? copy('verification_detail_update_action') : !approved ? copy('verification_enter_action') : ''}
                    onClick={() => void enter(item.key, item.route)}
                  />
                )
              })}
            </View>
            <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '46rpx', marginTop: '24rpx' }}>{copy('verification_detail_safety_notice')}</Text>
            <Button openType="contact" style={{ width: '280rpx', height: '72rpx', margin: '242rpx auto 0', padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#2876FF', fontSize: '28rpx', lineHeight: '40rpx' }}>◯ {copy('common_customer_service')}</Text>
            </Button>
          </View>
        </ScrollView>
      </View>
    </VerificationRuntimeBoundary>
  )
}

function CertificationDetailCard({ icon, title, desc, statusText, detail, actionText, onClick }: {
  icon: string
  title: string
  desc: string
  statusText: string
  detail: string[][]
  actionText: string
  onClick: () => void
}) {
  const hasDetail = detail.some(row => row[1])
  return (
    <View data-role="certification-detail-card" onClick={actionText ? onClick : undefined} style={{ position: 'relative', width: '700rpx', minHeight: hasDetail ? '304rpx' : '168rpx', borderRadius: '16rpx', background: '#FFFFFF', marginBottom: '20rpx', padding: '44rpx 28rpx 28rpx 98rpx', boxSizing: 'border-box' }}>
      <Image src={icon} mode="aspectFit" style={{ position: 'absolute', left: '24rpx', top: '45rpx', width: '58rpx', height: '58rpx' }} />
      <Text style={{ display: 'block', color: '#0C285A', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 700 }}>{title}</Text>
      <Text style={{ display: 'block', color: '#999999', fontSize: '25rpx', lineHeight: '36rpx', marginTop: '10rpx' }}>{desc}</Text>
      {!actionText || hasDetail ? <Text style={{ position: 'absolute', right: '30rpx', top: '58rpx', color: '#666666', fontSize: '25rpx', lineHeight: '36rpx' }}>{statusText}</Text> : null}
      {hasDetail ? (
        <View style={{ position: 'relative', height: '116rpx', borderRadius: '10rpx', background: '#F7F8FA', marginTop: '28rpx', marginLeft: '-72rpx', padding: '20rpx 30rpx', boxSizing: 'border-box' }}>
          {detail.filter(row => row[1]).map(([label, value]) => (
            <Text key={label} style={{ display: 'block', color: '#666666', fontSize: '24rpx', lineHeight: '38rpx' }}>{label}：{value}</Text>
          ))}
          {actionText ? (
            <View style={{ position: 'absolute', right: '16rpx', top: '24rpx', minWidth: '148rpx', height: '68rpx', borderRadius: '8rpx', background: '#2876FF', padding: '0 22rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              <Text style={{ color: '#FFFFFF', fontSize: '25rpx', lineHeight: '36rpx' }}>{actionText}</Text>
            </View>
          ) : null}
        </View>
      ) : actionText ? (
        <View style={{ position: 'absolute', right: '24rpx', top: '50rpx', minWidth: '138rpx', height: '68rpx', borderRadius: '8rpx', background: '#2876FF', padding: '0 20rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '25rpx' }}>{actionText}</Text>
        </View>
      ) : null}
    </View>
  )
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
