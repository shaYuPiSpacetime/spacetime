import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { buildInitStepPayload, resolveInitStepRoute, resolvePostLoginRoute } from '@/domain/prd01Runtime'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { LoginStep, LoginUserInfo } from '@/types/login'
import type {
  ProfileInitStatus,
  ProfileInitValues,
  ProfileOptionKey,
  RegionOption,
  RegionTreeOption,
} from '@/types/prd01'
import type { LoginVO } from '@/types/user'
import { PENDING_SHARE_ROUTE_KEY, resolvePendingShareRoute } from '@/domain/pendingShareRoute'

interface LoginFlowState {
  step: LoginStep
  userInfo: LoginUserInfo
  setStep: (step: LoginStep) => void
  updateUserInfo: (info: Partial<LoginUserInfo>) => void
  reset: () => void
}

const useLoginFlowStore = create<LoginFlowState>(set => ({
  step: 'auth',
  userInfo: {},
  setStep: step => set({ step }),
  updateUserInfo: info => set(state => ({ userInfo: { ...state.userInfo, ...info } })),
  reset: () => set({ step: 'auth', userInfo: {} }),
}))

function loginStepFromNumber(step?: number): LoginStep {
  if (step === 1) return 'gender'
  if (step === 2) return 'age'
  if (step === 3) return 'identity'
  if (step === 4) return 'education'
  if (step === 5) return 'address'
  return 'verification'
}

async function navigateAfterAuthentication(fallbackRoute: string) {
  let pendingRoute: string | null = null
  try {
    pendingRoute = resolvePendingShareRoute(Taro.getStorageSync(PENDING_SHARE_ROUTE_KEY))
  } catch {
    // 本地分享目标不可读时继续正常登录流程。
  }
  if (pendingRoute) {
    await Taro.reLaunch({ url: pendingRoute })
    try {
      Taro.removeStorageSync(PENDING_SHARE_ROUTE_KEY)
    } catch {
      // 清理分享目标失败不影响已经完成的页面跳转。
    }
    return
  }
  await Taro.switchTab({ url: fallbackRoute })
}

async function navigateByInitStatus(status: ProfileInitStatus) {
  if (status.firstLoginCompleted) {
    await navigateAfterAuthentication('/pages/index/index')
    return
  }
  const route = resolveInitStepRoute(status.nextStep)
  if (!route) throw new Error(`后端未返回有效的首登 nextStep：${String(status.nextStep)}`)
  useLoginFlowStore.getState().setStep(loginStepFromNumber(status.nextStep))
  await Taro.redirectTo({ url: route })
}

export function useLogin() {
  const { step, userInfo, setStep, updateUserInfo, reset } = useLoginFlowStore()
  const config = usePrd01Store(state => state.config)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const runtimeLoading = usePrd01Store(state => state.loading)
  const runtimeError = usePrd01Store(state => state.error)
  const retryRuntime = usePrd01Store(state => state.retry)
  const copy = usePrd01Store(state => state.copy)
  const loadLocations = usePrd01Store(state => state.locations)
  const loadProvinceCities = usePrd01Store(state => state.provinceCities)

  const options = (key: ProfileOptionKey) => {
    const rows = profileOptions?.[key]
    return Array.isArray(rows) ? rows : []
  }

  const ensureRuntime = async () => {
    if (!usePrd01Store.getState().config || !usePrd01Store.getState().profileOptions) {
      await bootstrap()
    }
  }

  const enterHome = async () => {
    reset()
    await navigateAfterAuthentication('/pages/index/index')
  }

  const resumeInit = async () => {
    await ensureRuntime()
    const status = await prd01Api.getInitStatus()
    updateUserInfo(status.savedFields as Partial<LoginUserInfo>)
    await navigateByInitStatus(status)
    return status
  }

  const resumeAfterLogin = async (
    result: Pick<LoginVO, 'firstLoginCompleted' | 'nextStep'>,
  ) => {
    const firstLoginCompleted = Boolean(result.firstLoginCompleted)
    const route = resolvePostLoginRoute({
      firstLoginCompleted,
      nextStep: result.nextStep,
    })
    if (!route) return resumeInit()
    if (firstLoginCompleted) {
      reset()
      await navigateAfterAuthentication(route)
      return undefined
    }
    useLoginFlowStore.getState().setStep(loginStepFromNumber(result.nextStep))
    await Taro.redirectTo({ url: route })
    return undefined
  }

  const saveInitStep = async (stepNumber: number, values: ProfileInitValues) => {
    await ensureRuntime()
    const payload = buildInitStepPayload(
      stepNumber,
      values,
      usePrd01Store.getState().profileOptions
    )
    const status = await prd01Api.saveInitStep(payload)
    updateUserInfo(values)
    await navigateByInitStatus(status)
    return status
  }

  const submit = async () =>
    saveInitStep(5, {
      locationProvince: userInfo.locationProvince,
      locationCity: userInfo.locationCity,
    })

  const initField = (stepNumber: number) =>
    config?.initFields?.find(item => item.step === stepNumber)

  return {
    step,
    userInfo,
    config,
    profileOptions,
    genderOptions: options('gender'),
    educationOptions: options('educationLevel'),
    identityOptions: options('identity'),
    goalOptions: options('datingGoal'),
    ageRange: {
      min: config?.accessPolicy?.minAge,
      max: config?.accessPolicy?.maxAge,
    },
    initField,
    copy,
    runtimeLoading,
    runtimeError,
    retryRuntime,
    bootstrap: ensureRuntime,
    loadLocations: (parentCode?: string, force = false): Promise<RegionOption[]> =>
      loadLocations(parentCode, force),
    loadProvinceCities: (force = false): Promise<RegionTreeOption[]> => loadProvinceCities(force),
    updateUserInfo,
    saveInitStep,
    resumeInit,
    resumeAfterLogin,
    submit,
    enterHome,
    setStep,
    reset,
  }
}
