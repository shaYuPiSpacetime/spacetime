import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import QianxunFamilyPage from '@/features/qianxun/QianxunFamilyPage'
import {
  hasPartialBasicProfile,
  isVerificationStepSubmitted,
  resolveCertificationChecklist,
  resolveVerificationOnboardingRoute,
} from '@/domain/verificationOnboardingFlow'
import { validateVerificationRuntime } from '@/domain/prd01Runtime'
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
  const [ready, setReady] = useState(false)
  const [coreAllowed, setCoreAllowed] = useState(false)

  useDidShow(() => {
    void (async () => {
      setLoading(true)
      try {
        await bootstrap()
        const runtime = usePrd01Store.getState()
        if (!runtime.config || !runtime.profileOptions) throw new Error()
        validateVerificationRuntime(runtime.config, runtime.profileOptions)
        const [basicResult, verificationResult, introductionResult] = await Promise.all([
          prd01Api.getBasicProfile(),
          prd01Api.getVerificationStatus(),
          prd01Api.getIntroduction(),
        ])
        if (verificationResult.accessStatus?.coreAccessStatus === 'CORE_ALLOWED') {
          setCoreAllowed(true)
          setReady(true)
          return
        }
        setCoreAllowed(false)
        setBasic(basicResult)
        setVerification(verificationResult)
        setIntroduction(introductionResult)
        setReady(true)
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

  if (!ready) return <IndexLoadingSkeleton unreadCount={unreadCount} />
  if (coreAllowed) return <QianxunFamilyPage />

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

function IndexLoadingSkeleton({ unreadCount }: { unreadCount: number }) {
  return (
    <View style={{ minHeight: '100vh', background: 'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)', position: 'relative', overflow: 'hidden' }}>
      <TopTabs unreadCount={unreadCount} />
      <View style={{ position: 'absolute', left: '25rpx', top: '246rpx', width: '700rpx', height: '168rpx', borderRadius: '24rpx', background: 'rgba(255,255,255,0.72)' }} />
      <View style={{ position: 'absolute', left: '25rpx', top: '434rpx', width: '700rpx', height: '168rpx', borderRadius: '24rpx', background: 'rgba(255,255,255,0.56)' }} />
      <View style={{ position: 'absolute', left: '25rpx', top: '622rpx', width: '700rpx', height: '168rpx', borderRadius: '24rpx', background: 'rgba(255,255,255,0.42)' }} />
    </View>
  )
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
    { key: 'basic', icon: miniappOssIcons.verificationProfileBasic, title: copy('verification_home_basic_title'), desc: copy('verification_home_basic_desc'), completed: checklist.basic },
    { key: 'avatarIntro', icon: miniappOssIcons.verificationProfileAvatarIntro, title: copy('verification_home_avatar_intro_title'), desc: copy('verification_home_avatar_intro_desc'), completed: checklist.avatarIntro },
    { key: 'triple', icon: miniappOssIcons.verificationProfileTriple, title: copy('verification_home_triple_title'), desc: copy('verification_home_triple_desc'), completed: checklist.triple },
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
            <Image src={item.icon} mode="aspectFit" style={{ position: 'absolute', left: '40rpx', top: '34rpx', width: '72rpx', height: '84rpx' }} />
            <Text style={{ position: 'absolute', left: '140rpx', top: '42rpx', color: '#0C285A', fontSize: '30rpx', fontWeight: 600, lineHeight: '42rpx' }}>{item.title}</Text>
            <Text style={{ position: 'absolute', left: '140rpx', top: '96rpx', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx' }}>{item.desc}</Text>
            {item.completed ? <Image src={miniappOssIcons.verificationRoundCheck} mode="aspectFit" style={{ position: 'absolute', right: '38rpx', top: '60rpx', width: '48rpx', height: '48rpx' }} /> : null}
          </View>
        ))}
      </View>
    </>
  )
}

function CertificationArtwork() {
  return (
    <View style={{ position: 'absolute', left: '0', top: '453rpx', width: '750rpx', height: '390rpx' }}>
      <Image src={miniappOssIcons.qianxunCenter} mode="aspectFit" style={{ position: 'absolute', left: '90rpx', top: '-44rpx', width: '570rpx', height: '640rpx' }} />
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
