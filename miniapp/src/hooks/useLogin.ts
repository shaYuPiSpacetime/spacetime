import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { buildInitStepPayload, resolveInitStepRoute } from '@/domain/prd01Runtime'
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

async function navigateByInitStatus(status: ProfileInitStatus) {
  if (status.firstLoginCompleted) {
    await Taro.switchTab({ url: '/pages/index/index' })
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
    await Taro.switchTab({ url: '/pages/index/index' })
  }

  const resumeInit = async () => {
    await ensureRuntime()
    const status = await prd01Api.getInitStatus()
    updateUserInfo(status.savedFields as Partial<LoginUserInfo>)
    await navigateByInitStatus(status)
    return status
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
      locationDistrict: userInfo.locationDistrict,
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
    loadProvinceCities: (force = false): Promise<RegionTreeOption[]> =>
      loadProvinceCities(force),
    updateUserInfo,
    saveInitStep,
    resumeInit,
    submit,
    enterHome,
    setStep,
    reset,
  }
}
