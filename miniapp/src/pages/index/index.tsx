import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import QianxunFamilyPage from '@/features/qianxun/QianxunFamilyPage'
import VerificationEntryView from '@/features/verification/VerificationEntryView'
import {
  hasPartialBasicProfile,
  isVerificationStepSubmitted,
  resolveCertificationChecklist,
  resolveVerificationOnboardingRoute,
} from '@/domain/verificationOnboardingFlow'
import { validateVerificationRuntime } from '@/domain/prd01Runtime'
import { prd01Api } from '@/services/prd01'
import { useAuthStore } from '@/stores/authStore'
import { useMessageRuntimeStore } from '@/stores/messageRuntimeStore'
import { usePrd01Store } from '@/stores/prd01Store'
import type { BasicProfile, OpenTextDetail, VerificationStatus } from '@/types/prd01'

export default function IndexPage() {
  const unreadCount = useMessageRuntimeStore(state => state.unreadSummary.messageUnreadCount)
  const cachedAccessStatus = useAuthStore(state => state.accessStatus)
  const setAccessStatus = useAuthStore(state => state.setAccessStatus)
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const copy = usePrd01Store(state => state.copy)
  const [basic, setBasic] = useState<BasicProfile>()
  const [verification, setVerification] = useState<VerificationStatus>()
  const [introduction, setIntroduction] = useState<OpenTextDetail>()
  const cachedCoreAllowed = cachedAccessStatus?.coreAccessStatus === 'CORE_ALLOWED'
  const [loading, setLoading] = useState(!cachedCoreAllowed)
  const [ready, setReady] = useState(cachedCoreAllowed)
  const [coreAllowed, setCoreAllowed] = useState(cachedCoreAllowed)
  const [entryError, setEntryError] = useState('')

  useEffect(() => {
    if (!cachedCoreAllowed) return
    setCoreAllowed(true)
    setReady(true)
  }, [cachedCoreAllowed])

  const loadIndex = async () => {
    setLoading(true)
    setEntryError('')
    try {
      await bootstrap()
      const runtime = usePrd01Store.getState()
      if (!runtime.config || !runtime.profileOptions) throw new Error('页面配置加载失败')
      validateVerificationRuntime(runtime.config, runtime.profileOptions)
      const [basicResult, verificationResult, introductionResult] = await Promise.all([
        prd01Api.getBasicProfile(),
        prd01Api.getVerificationStatus(),
        prd01Api.getIntroduction(),
      ])
      if (verificationResult.accessStatus) setAccessStatus(verificationResult.accessStatus)
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
      setEntryError(toErrorMessage(error))
      setReady(true)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadIndex()
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

  if (coreAllowed) return <QianxunFamilyPage />
  return (
    <VerificationEntryView
      role="index-unverified"
      unreadCount={unreadCount}
      loading={!ready || loading}
      error={entryError}
      hasPartialProfile={hasPartialProfile}
      checklist={checklist}
      copy={copy}
      onContinue={() => void continueFlow()}
      onLater={() => void enterAvailableArea()}
      onRetry={() => void loadIndex()}
    />
  )
}

function toErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return message || '网络开小差了，请重新加载'
}
