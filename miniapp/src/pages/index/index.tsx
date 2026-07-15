import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import qianxunCenterImage from '@/assets/lanhu/pages/qianxun-center.png'
import {
  hasPartialBasicProfile,
  isVerificationStepSubmitted,
  resolveCertificationChecklist,
  resolveVerificationOnboardingRoute,
} from '@/domain/verificationOnboardingFlow'
import { prd01Api } from '@/services/prd01'
import { useMessageStore } from '@/stores/messageStore'
import { usePrd01Store } from '@/stores/prd01Store'
import type { BasicProfile, OpenTextDetail, VerificationStatus } from '@/types/prd01'

export default function IndexPage() {
  const unreadCount = useMessageStore(state => state.unread.totalCount)
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const copy = usePrd01Store(state => state.copy)
  const [basic, setBasic] = useState<BasicProfile>()
  const [verification, setVerification] = useState<VerificationStatus>()
  const [introduction, setIntroduction] = useState<OpenTextDetail>()
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    void (async () => {
      setLoading(true)
      try {
        await bootstrap()
        const [basicResult, verificationResult, introductionResult] = await Promise.all([
          prd01Api.getBasicProfile(),
          prd01Api.getVerificationStatus(),
          prd01Api.getIntroduction(),
        ])
        setBasic(basicResult)
        setVerification(verificationResult)
        setIntroduction(introductionResult)
      } catch (error) {
        await showError(error)
      } finally {
        setLoading(false)
      }
    })()
  })

  const runtimeConfig = usePrd01Store.getState().config
  const fieldSettings = basic?.fieldSettings || runtimeConfig?.fieldSettings || []
  const hasPartialProfile = Boolean(basic) && (
    basic?.basicProfileCompleted === true ||
    hasPartialBasicProfile(basic, fieldSettings, runtimeConfig?.initFields || []) ||
    isVerificationStepSubmitted(verification?.avatarVerifyStatus) ||
    isVerificationStepSubmitted(introduction?.auditStatus) ||
    Number(verification?.verifyLevel) > 0
  )
  const checklist = resolveCertificationChecklist({
    basicCompleted: basic?.basicProfileCompleted,
    avatarStatus: verification?.avatarVerifyStatus,
    introductionStatus: introduction?.auditStatus,
    verifyLevel: verification?.verifyLevel,
  })

  const continueFlow = async () => {
    if (loading) return
    const route = resolveVerificationOnboardingRoute({
      basicCompleted: basic?.basicProfileCompleted,
      avatarStatus: verification?.avatarVerifyStatus,
      introductionStatus: introduction?.auditStatus,
    })
    await Taro.navigateTo({ url: route })
  }

  const enterAvailableArea = async () => {
    if (verification?.accessStatus?.canBrowseCards) {
      await Taro.switchTab({ url: '/pages/recommend/index' })
      return
    }
    if (verification?.accessStatus?.canCommunity) {
      await Taro.switchTab({ url: '/pages/community/index' })
      return
    }
    const reason = verification?.accessStatus?.blockReasons?.[0] || copy('verification_home_partial_notice')
    if (reason) await Taro.showToast({ title: reason, icon: 'none' })
  }

  return <View style={{ minHeight: '100vh', background: 'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)', position: 'relative', overflow: 'hidden' }}>
    <TopTabs unreadCount={unreadCount} />
    {hasPartialProfile ? (
      <PartialCertificationPanel copy={copy} checklist={checklist} />
    ) : (
      <InitialCertificationPanel copy={copy} />
    )}
    <View style={{ position: 'absolute', left: '44rpx', top: '1098rpx', width: '664rpx', height: '98rpx', borderRadius: '40rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void continueFlow()} hoverClass="btn-hover">
      <Text style={{ color: '#FAFBFC', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>{copy('verification_home_primary_action')}</Text>
    </View>
    <View style={{ position: 'absolute', left: '0', top: '1208rpx', width: '750rpx', height: '50rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => void enterAvailableArea()} hoverClass="btn-hover">
      <Text style={{ color: '#999999', fontSize: '30rpx', fontWeight: 500, lineHeight: '42rpx' }}>{copy('verification_home_later_action')}</Text>
    </View>
  </View>
}

function InitialCertificationPanel({ copy }: { copy: (key: string) => string }) {
  return (
    <>
      <CertificationArtwork />
      <View style={{ position: 'absolute', left: '70rpx', right: '70rpx', top: '245rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Text style={headingStyle}>{copy('verification_onboarding_heading')}</Text>
        <Text style={headingStyle}>{copy('verification_home_initial_heading_line2')}</Text>
        <Text style={{ color: '#999999', fontSize: '24rpx', lineHeight: '33rpx', marginTop: '26rpx', textAlign: 'center' }}>{copy('verification_home_initial_notice')}</Text>
      </View>
    </>
  )
}

function PartialCertificationPanel({
  copy,
  checklist,
}: {
  copy: (key: string) => string
  checklist: { basic: boolean; avatarIntro: boolean; triple: boolean }
}) {
  const items = [
    { key: 'basic', title: copy('verification_home_basic_title'), desc: copy('verification_home_basic_desc'), completed: checklist.basic },
    { key: 'avatarIntro', title: copy('verification_home_avatar_intro_title'), desc: copy('verification_home_avatar_intro_desc'), completed: checklist.avatarIntro },
    { key: 'triple', title: copy('verification_home_triple_title'), desc: copy('verification_home_triple_desc'), completed: checklist.triple },
  ] as const

  return (
    <>
      <View style={{ position: 'absolute', left: '25rpx', top: '246rpx', width: '700rpx', textAlign: 'center' }}>
        <Text style={{ ...headingStyle, display: 'block' }}>{copy('verification_onboarding_heading')}</Text>
        <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '38rpx', marginTop: '24rpx' }}>{copy('verification_home_partial_notice')}</Text>
      </View>
      <View style={{ position: 'absolute', left: '25rpx', top: '458rpx', width: '700rpx' }}>
        {items.map((item, index) => (
          <View key={item.key} style={{ position: 'relative', width: '700rpx', height: '168rpx', borderRadius: '16rpx', background: '#FFFFFF', marginBottom: index === items.length - 1 ? '0' : '20rpx' }}>
            <ChecklistIcon type={item.key} />
            <Text style={{ position: 'absolute', left: '140rpx', top: '42rpx', color: '#0C285A', fontSize: '30rpx', fontWeight: 600, lineHeight: '42rpx' }}>{item.title}</Text>
            <Text style={{ position: 'absolute', left: '140rpx', top: '96rpx', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx' }}>{item.desc}</Text>
            {item.completed ? <RoundCheck /> : null}
          </View>
        ))}
      </View>
    </>
  )
}

function ChecklistIcon({ type }: { type: 'basic' | 'avatarIntro' | 'triple' }) {
  if (type === 'avatarIntro') {
    return (
      <View style={{ position: 'absolute', left: '42rpx', top: '48rpx', width: '56rpx', height: '56rpx', borderRadius: '28rpx', border: '4rpx solid #0C285A', boxSizing: 'border-box' }}>
        <View style={{ position: 'absolute', left: '13rpx', top: '15rpx', width: '5rpx', height: '5rpx', borderRadius: '3rpx', background: '#0C285A' }} />
        <View style={{ position: 'absolute', right: '13rpx', top: '15rpx', width: '5rpx', height: '5rpx', borderRadius: '3rpx', background: '#0C285A' }} />
        <View style={{ position: 'absolute', left: '13rpx', top: '28rpx', width: '24rpx', height: '12rpx', borderBottom: '4rpx solid #0C285A', borderRadius: '0 0 18rpx 18rpx' }} />
      </View>
    )
  }
  if (type === 'triple') {
    return (
      <View style={{ position: 'absolute', left: '42rpx', top: '42rpx', width: '58rpx', height: '66rpx', border: '4rpx solid #0C285A', borderRadius: '28rpx 28rpx 32rpx 32rpx', boxSizing: 'border-box' }}>
        <View style={{ position: 'absolute', left: '16rpx', top: '20rpx', width: '20rpx', height: '12rpx', borderLeft: '4rpx solid #0C285A', borderBottom: '4rpx solid #0C285A', transform: 'rotate(-45deg)' }} />
      </View>
    )
  }
  return (
    <View style={{ position: 'absolute', left: '42rpx', top: '40rpx', width: '62rpx', height: '72rpx' }}>
      <View style={{ position: 'absolute', left: '19rpx', top: 0, width: '24rpx', height: '24rpx', borderRadius: '12rpx', border: '4rpx solid #0C285A', boxSizing: 'border-box' }} />
      <View style={{ position: 'absolute', left: '5rpx', top: '30rpx', width: '52rpx', height: '38rpx', border: '4rpx solid #0C285A', borderBottom: 0, borderRadius: '30rpx 30rpx 0 0', boxSizing: 'border-box' }} />
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

function CertificationArtwork() {
  return (
    <View style={{ position: 'absolute', left: '0', top: '453rpx', width: '750rpx', height: '390rpx' }}>
      <Image src={qianxunCenterImage} mode="aspectFit" style={{ position: 'absolute', left: '90rpx', top: '-44rpx', width: '570rpx', height: '640rpx' }} />
    </View>
  )
}

function TopTabs({ unreadCount }: { unreadCount: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '0',
        top: '68rpx',
        width: '750rpx',
        height: '88rpx',
      }}
    >
      <Text
        style={{
          position: 'absolute',
          left: '32rpx',
          top: '22rpx',
          color: '#0C285A',
          fontSize: '32rpx',
          fontWeight: 500,
          lineHeight: '45rpx',
        }}
      >
        成家
      </Text>
      <View
        style={{
          position: 'absolute',
          left: '32rpx',
          top: '73rpx',
          width: '64rpx',
          height: '8rpx',
          borderRadius: '6rpx',
          background: 'rgba(40,118,255,0.8)',
        }}
      />
      {unreadCount > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: '76rpx',
            top: '11rpx',
            minWidth: '28rpx',
            height: '28rpx',
            borderRadius: '14rpx',
            border: '2rpx solid #FFFFFF',
            background: '#EE2525',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4rpx',
            boxSizing: 'border-box',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '18rpx', fontWeight: 500, lineHeight: '25rpx' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      ) : null}
      <Text style={{ position: 'absolute', left: '123rpx', top: '31rpx', color: '#7F8494', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
        知音
      </Text>
      <Text style={{ position: 'absolute', left: '199rpx', top: '31rpx', color: '#7F8494', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
        立业
      </Text>
    </View>
  )
}

const headingStyle = { color: '#0C285A', fontSize: '48rpx', fontWeight: 600, lineHeight: '67rpx', textAlign: 'center' } as const
async function showError(error: unknown) { const title = error instanceof Error ? error.message : String(error); if (title) await Taro.showToast({ title, icon: 'none' }) }
