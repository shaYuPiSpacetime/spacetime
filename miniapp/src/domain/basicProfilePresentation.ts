import type { BasicProfile, ProfileFieldSetting } from '@/types/prd01'

export type BasicProfileRowId =
  | 'nickname'
  | 'gender'
  | 'birthday'
  | 'location'
  | 'heightWeight'
  | 'hometown'
  | 'identity'
  | 'maritalStatus'
  | 'school'
  | 'educationLevel'
  | 'industry'
  | 'occupation'
  | 'company'
  | 'annualIncome'

/** 编辑资料第一张白卡，顺序来自蓝湖稿，不依赖接口数组顺序。 */
export const PROFILE_PRIMARY_ROW_IDS: BasicProfileRowId[] = [
  'nickname',
  'gender',
  'birthday',
  'location',
  'heightWeight',
  'hometown',
  'identity',
  'maritalStatus',
]

/** 编辑资料第二张白卡，顺序来自蓝湖稿。 */
export const PROFILE_SECONDARY_ROW_IDS: BasicProfileRowId[] = [
  'school',
  'educationLevel',
  'industry',
  'occupation',
  'company',
  'annualIncome',
]

/** 认证基本资料稿为单卡布局，只保留稿件中的业务行。 */
export const VERIFICATION_ROW_IDS: BasicProfileRowId[] = [
  'nickname',
  'gender',
  'birthday',
  'location',
  'heightWeight',
  'hometown',
  'identity',
  'educationLevel',
  'occupation',
  'annualIncome',
  'maritalStatus',
]

export const BASIC_PROFILE_ROW_FIELDS: Record<BasicProfileRowId, string[]> = {
  nickname: ['nickname'],
  gender: ['gender'],
  birthday: ['birthday'],
  location: ['locationProvince', 'locationCity'],
  heightWeight: ['height', 'weight'],
  hometown: ['hometownProvince', 'hometownCity'],
  identity: ['identity'],
  maritalStatus: ['maritalStatus'],
  school: ['school'],
  educationLevel: ['educationLevel'],
  industry: ['industry'],
  occupation: ['occupation'],
  company: ['company'],
  annualIncome: ['annualIncome'],
}

/** 兼容尚未发布默认昵称回填的旧接口，规则与服务端保持一致。 */
export function ensureBasicProfileNickname(profile: BasicProfile): BasicProfile {
  if (String(profile.nickname || '').trim() || profile.userId == null) return profile
  const numericId = Number(profile.userId)
  if (!Number.isSafeInteger(numericId)) return profile
  const suffix = ((numericId % 10_000) + 10_000) % 10_000
  return { ...profile, nickname: `用户${String(suffix).padStart(4, '0')}` }
}

/** 只固定组合行结构；实际显隐仍由接口字段配置决定。 */
export function visibleProfileRows(
  rowIds: BasicProfileRowId[],
  settings: ProfileFieldSetting[]
): BasicProfileRowId[] {
  const visibleIds = new Set(
    settings.filter(setting => setting.visible).map(setting => setting.fieldId)
  )
  return rowIds.filter(rowId =>
    BASIC_PROFILE_ROW_FIELDS[rowId].some(fieldId => visibleIds.has(fieldId))
  )
}
