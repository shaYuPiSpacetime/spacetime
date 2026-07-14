import type {
  CopywritingItem,
  EducationFormValues,
  EducationMethod,
  EducationSubmitRequest,
  LoginResult,
  Prd01Config,
  ProfileInitStepRequest,
  ProfileInitValues,
  ProfileOptions,
  RegionOption,
  SmsCodeResult,
} from '@/types/prd01'

export interface Prd01LoaderApi {
  getConfig: () => Promise<Prd01Config>
  getProfileOptions: () => Promise<ProfileOptions>
  getLocations: (parentCode?: string) => Promise<RegionOption[]>
}

export interface Prd01BootstrapResult {
  config: Prd01Config
  profileOptions: ProfileOptions
}

const INIT_STEP_ROUTES: Record<number, string> = {
  1: '/pages/login/gender',
  2: '/pages/login/age',
  3: '/pages/login/identity',
  4: '/pages/login/education',
  5: '/pages/login/address',
}

export function readCopy(
  copywriting: Record<string, CopywritingItem> | undefined,
  copyKey: string
): string {
  const item = copywriting?.[copyKey]
  if (!item?.enabled) return ''
  return item.content?.trim() || ''
}

export function createCopyReader(
  copywriting?: Record<string, CopywritingItem>
): (copyKey: string) => string {
  return copyKey => readCopy(copywriting, copyKey)
}

export function resolveInitStepRoute(nextStep?: number): string {
  return nextStep ? INIT_STEP_ROUTES[nextStep] || '' : ''
}

export function resolvePostLoginRoute(result: Pick<LoginResult, 'firstLoginCompleted' | 'nextStep'>) {
  if (result.firstLoginCompleted) return '/pages/index/index'
  return resolveInitStepRoute(result.nextStep)
}

function requireOptionCode(
  options: ProfileOptions | Partial<ProfileOptions> | undefined,
  key: keyof ProfileOptions,
  code: string | undefined
) {
  if (!code) return undefined
  const rows = options?.[key]
  if (!Array.isArray(rows) || !rows.some(item => item.code === code)) {
    throw new Error(`${String(key)} 必须使用接口返回的字典 code`)
  }
  return code
}

function requireRegionCode(value: string | undefined, required: boolean) {
  if (!value && !required) return undefined
  if (!value || !/^\d{6}$/.test(value)) {
    throw new Error('地区 code 必须使用接口返回的六位行政区编码')
  }
  return value
}

export function buildInitStepPayload(
  step: number,
  values: ProfileInitValues,
  options?: ProfileOptions | Partial<ProfileOptions>
): ProfileInitStepRequest {
  if (step === 1) {
    return { step, gender: requireOptionCode(options, 'gender', values.gender) }
  }
  if (step === 2) {
    if (values.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(values.birthday)) {
      throw new Error('birthday 必须使用 yyyy-MM-dd 格式')
    }
    return { step, birthday: values.birthday }
  }
  if (step === 3) {
    return { step, identity: requireOptionCode(options, 'identity', values.identity) }
  }
  if (step === 4) {
    return {
      step,
      educationLevel: requireOptionCode(options, 'educationLevel', values.educationLevel),
    }
  }
  if (step === 5) {
    return {
      step,
      locationProvince: requireRegionCode(values.locationProvince, Boolean(values.locationCity)),
      locationCity: requireRegionCode(values.locationCity, true),
      locationDistrict: requireRegionCode(values.locationDistrict, false),
    }
  }
  throw new Error(`不支持的首登步骤：${step}`)
}

export function resolveSmsCountdown(
  response?: Pick<SmsCodeResult, 'countdownSeconds'>,
  config?: { sendCountdownSeconds?: number }
) {
  const value = response?.countdownSeconds || config?.sendCountdownSeconds || 0
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export function buildEducationRequest(
  method: EducationMethod,
  form: EducationFormValues
): EducationSubmitRequest {
  const common = {
    educationUserType: form.educationUserType,
    educationMethod: method,
    schoolName: form.schoolName.trim(),
    educationLevel: form.educationLevel,
    educationAgreementChecked: form.educationAgreementChecked,
  }

  if (method === 'STUDENT_CARD') {
    return { ...common, materialUrls: form.materialUrls }
  }
  if (method === 'CHSI') {
    return { ...common, chsiCode: form.chsiCode?.trim() }
  }
  if (method === 'DIPLOMA_NO') {
    return {
      ...common,
      diplomaNo: form.diplomaNo?.trim(),
      certificateName: form.certificateName?.trim(),
    }
  }
  return {
    ...common,
    certificateName: form.certificateName?.trim(),
    materialUrls: form.materialUrls,
  }
}

export function createPrd01Loader(api: Prd01LoaderApi) {
  let snapshot: Prd01BootstrapResult | undefined
  let bootstrapPromise: Promise<Prd01BootstrapResult> | undefined
  const locationCache = new Map<string, RegionOption[]>()

  const bootstrap = (force = false): Promise<Prd01BootstrapResult> => {
    if (!force && snapshot) return Promise.resolve(snapshot)
    if (!force && bootstrapPromise) return bootstrapPromise
    bootstrapPromise = Promise.all([api.getConfig(), api.getProfileOptions()])
      .then(([config, profileOptions]) => {
        snapshot = { config, profileOptions }
        return snapshot
      })
      .finally(() => {
        bootstrapPromise = undefined
      })
    return bootstrapPromise
  }

  const locations = async (parentCode?: string, force = false) => {
    const cacheKey = parentCode || '__ROOT__'
    if (!force && locationCache.has(cacheKey)) return locationCache.get(cacheKey) || []
    const result = await api.getLocations(parentCode)
    locationCache.set(cacheKey, result)
    return result
  }

  const clear = () => {
    snapshot = undefined
    bootstrapPromise = undefined
    locationCache.clear()
  }

  return { bootstrap, locations, clear }
}
