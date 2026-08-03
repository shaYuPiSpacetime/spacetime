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
  RegionTreeOption,
  SmsCodeResult,
} from '@/types/prd01'

export interface Prd01LoaderApi {
  getConfig: () => Promise<Prd01Config>
  getProfileOptions: () => Promise<ProfileOptions>
  getLocations: (parentCode?: string) => Promise<RegionOption[]>
  getProvinceCities: () => Promise<RegionTreeOption[]>
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

/**
 * 首登五步依赖的数据必须成套可用，避免接口成功但页面静默渲染为空。
 * 这里只校验配置完整性，不提供任何本地枚举或文案兜底。
 */
export function validateInitRuntime(
  config: Pick<Prd01Config, 'accessPolicy' | 'initFields'>,
  profileOptions: Pick<ProfileOptions, 'gender' | 'identity' | 'educationLevel'>
) {
  const requiredOptions: Array<[keyof typeof profileOptions, string]> = [
    ['gender', '性别'],
    ['identity', '身份'],
    ['educationLevel', '学历'],
  ]
  requiredOptions.forEach(([key, label]) => {
    if (!Array.isArray(profileOptions?.[key]) || profileOptions[key].length === 0) {
      throw new Error(`${label}字典配置为空，请联系管理员`)
    }
  })

  const minAge = Number(config?.accessPolicy?.minAge)
  const maxAge = Number(config?.accessPolicy?.maxAge)
  if (!Number.isFinite(minAge) || !Number.isFinite(maxAge) || minAge <= 0 || maxAge < minAge) {
    throw new Error('年龄范围配置无效，请联系管理员')
  }

  const configuredSteps = new Set((config?.initFields || []).map(item => item.step))
  if ([1, 2, 3, 4, 5].some(step => !configuredSteps.has(step))) {
    throw new Error('首登字段配置不完整，请联系管理员')
  }
}

/**
 * 认证目录允许运行时读取的完整文案契约。
 * 任意一项缺失、禁用或为空都必须阻断认证页渲染，避免再次出现空标题、空按钮。
 */
export const VERIFICATION_COPY_KEYS = [
  'verification_nav_title',
  'verification_center_title',
  'verification_center_heading',
  'verification_center_notice',
  'verification_detail_heading',
  'verification_detail_notice',
  'verification_detail_verified',
  'verification_detail_avatar_desc',
  'verification_detail_real_name_desc',
  'verification_detail_education_desc',
  'verification_detail_name_label',
  'verification_detail_id_label',
  'verification_detail_school_label',
  'verification_detail_degree_label',
  'verification_detail_safety_notice',
  'verification_detail_update_action',
  'verification_enter_action',
  'verification_avatar_title',
  'verification_avatar_desc',
  'verification_real_name_title',
  'verification_real_name_desc',
  'verification_education_title',
  'verification_education_desc',
  'common_submit_action',
  'common_submitting_action',
  'common_uploading_action',
  'common_select_placeholder',
  'common_input_placeholder',
  'common_cancel_action',
  'common_confirm_action',
  'common_loading_action',
  'common_load_failed_title',
  'common_load_failed_message',
  'common_retry_action',
  'profile_basic_nav_title',
  'profile_basic_heading',
  'profile_basic_notice',
  'common_save_action',
  'common_saving_action',
  'common_save_success',
  'verification_back_center_action',
  'verification_onboarding_heading',
  'verification_onboarding_notice',
  'verification_step_basic',
  'verification_step_avatar',
  'verification_step_intro',
  'verification_step_triple',
  'verification_next_action',
  'verification_home_initial_heading_line2',
  'verification_home_initial_notice',
  'verification_home_partial_notice',
  'verification_home_basic_title',
  'verification_home_basic_desc',
  'verification_home_avatar_intro_title',
  'verification_home_avatar_intro_desc',
  'verification_home_triple_title',
  'verification_home_triple_desc',
  'verification_home_primary_action',
  'verification_home_later_action',
  'avatar_title',
  'avatar_notice',
  'avatar_choosing_action',
  'avatar_source_invalid',
  'avatar_crop_notice',
  'avatar_crop_export_failed',
  'avatar_guide_title',
  'avatar_rule_self',
  'avatar_rule_clear',
  'avatar_rule_best',
  'avatar_invalid_title',
  'avatar_invalid_non_person',
  'avatar_invalid_landscape',
  'avatar_invalid_blurred',
  'avatar_invalid_no_face',
  'avatar_choose_action',
  'intro_section_title',
  'intro_placeholder',
  'intro_minimum_hint',
  'triple_safety_notice',
  'real_name_title',
  'real_name_notice',
  'real_name_name_label',
  'real_name_name_placeholder',
  'real_name_id_label',
  'real_name_id_placeholder',
  'real_name_agreement_required',
  'verification_status_avatar',
  'verification_status_real_name',
  'verification_status_education',
  'common_customer_service',
  'agreement_read_prefix',
  'agreement_single_commitment_name',
  'agreement_education_name',
  'education_title',
  'education_notice',
  'education_upload_notice',
  'education_method_select_title',
  'education_user_type_label',
  'education_school_label',
  'education_school_placeholder',
  'education_level_label',
  'education_chsi_label',
  'education_chsi_placeholder',
  'education_diploma_label',
  'education_diploma_placeholder',
  'education_certificate_name_label',
  'education_certificate_name_placeholder',
  'education_upload_action',
  'education_upload_limit_reached',
  'education_method_unavailable',
  'education_agreement_required',
  'education_method_chsi_desc',
  'education_method_diploma_no_desc',
  'education_method_material_upload_desc',
  'education_tab_student',
  'education_tab_mainland',
  'education_method_section_title',
  'education_method_recommended_badge',
  'education_method_slow_badge',
  'education_student_form_title',
  'education_student_upload_notice',
  'education_upload_count_template',
  'education_diploma_rules_title',
  'education_diploma_rule_one',
  'education_diploma_rule_two',
  'education_chsi_guide_title',
  'education_chsi_guide_notice',
  'education_chsi_open_action',
  'education_chsi_step_one_title',
  'education_chsi_step_one_desc',
  'education_chsi_step_two_title',
  'education_chsi_step_two_desc',
  'education_chsi_step_three_title',
  'education_chsi_step_three_desc',
  'education_chsi_step_four_title',
  'education_chsi_step_four_desc',
  'agreement_single_commitment',
  'agreement_education',
] as const

/** 认证链路必须同时具备认证文案和业务字典，缺一项都不能展示空白卡片。 */
export function validateVerificationRuntime(
  config: Pick<Prd01Config, 'copywriting'>,
  profileOptions: Pick<
    ProfileOptions,
    | 'educationLevel'
    | 'educationUserType'
    | 'educationMethod'
    | 'auditStatus'
    | 'auditSource'
    | 'coreAccessStatus'
    | 'avatarSource'
  >
) {
  const missingCopyKeys = VERIFICATION_COPY_KEYS.filter(
    key => !readCopy(config?.copywriting, key)
  )
  if (missingCopyKeys.length > 0) {
    throw new Error(`认证文案配置缺失：${missingCopyKeys.join('、')}，请联系管理员`)
  }

  const requiredOptions: Array<[keyof typeof profileOptions, string]> = [
    ['educationLevel', '学历'],
    ['auditStatus', '审核状态'],
    ['auditSource', '审核来源'],
    ['coreAccessStatus', '核心准入状态'],
    ['educationUserType', '学历认证人群'],
    ['educationMethod', '学历认证方式'],
    ['avatarSource', '头像来源'],
  ]
  requiredOptions.forEach(([key, label]) => {
    if (!Array.isArray(profileOptions?.[key]) || profileOptions[key].length === 0) {
      throw new Error(`${label}字典配置为空，请联系管理员`)
    }
  })
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
  let provinceCityCache: RegionTreeOption[] | undefined
  let provinceCityPromise: Promise<RegionTreeOption[]> | undefined

  const bootstrap = (force = false): Promise<Prd01BootstrapResult> => {
    if (!force && snapshot) return Promise.resolve(snapshot)
    if (!force && bootstrapPromise) return bootstrapPromise
    bootstrapPromise = Promise.all([api.getConfig(), api.getProfileOptions()])
      .then(([config, profileOptions]) => {
        validateInitRuntime(config, profileOptions)
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
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('地区字典配置为空，请联系管理员')
    }
    locationCache.set(cacheKey, result)
    return result
  }

  const provinceCities = (force = false): Promise<RegionTreeOption[]> => {
    if (!force && provinceCityCache) return Promise.resolve(provinceCityCache)
    if (!force && provinceCityPromise) return provinceCityPromise
    provinceCityPromise = api.getProvinceCities()
      .then(result => {
        if (!Array.isArray(result) || result.length === 0) {
          throw new Error('省市字典配置为空，请联系管理员')
        }
        provinceCityCache = result
        return result
      })
      .finally(() => {
        provinceCityPromise = undefined
      })
    return provinceCityPromise
  }

  const clear = () => {
    snapshot = undefined
    bootstrapPromise = undefined
    locationCache.clear()
    provinceCityCache = undefined
    provinceCityPromise = undefined
  }

  return { bootstrap, locations, provinceCities, clear }
}
