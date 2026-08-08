import type { BasicProfile, ProfileFieldSetting, RegionTreeOption } from '@/types/prd01'

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

/**
 * 编辑资料和主页预览优先展示接口返回的地区中文标签；旧接口没有标签时按省市树解析。
 * 现居取城市，家乡优先取城市；直辖市等没有独立城市标签时回退省份标签。
 */
export function buildBasicProfileLocationText(
  profile: BasicProfile,
  regionTree: RegionTreeOption[] = []
): string {
  const currentLocation = resolveRegionDisplayLabel(
    profile.locationCityLabel,
    profile.locationProvinceLabel,
    profile.locationProvince,
    profile.locationCity,
    regionTree
  )
  const hometown = resolveRegionDisplayLabel(
    profile.hometownCityLabel,
    profile.hometownProvinceLabel,
    profile.hometownProvince,
    profile.hometownCity,
    regionTree
  )
  return [
    currentLocation ? `现居${currentLocation}` : '',
    hometown ? `${hometown}人` : '',
  ].filter(Boolean).join('丨')
}

/** 蓝湖主页资料行使用两位出生年份，例如 1997-06-18 展示为 97年。 */
export function buildBasicProfileBirthYearText(birthday: unknown): string {
  const match = String(birthday || '').trim().match(/^(\d{4})(?:[-/]\d{1,2}[-/]\d{1,2})?$/u)
  return match ? `${match[1].slice(2)}年` : ''
}

function resolveRegionDisplayLabel(
  cityLabel: unknown,
  provinceLabel: unknown,
  provinceCode: unknown,
  cityCode: unknown,
  regionTree: RegionTreeOption[]
): string {
  const directCityLabel = normalizeRegionDisplayLabel(cityLabel)
  if (directCityLabel) return directCityLabel

  const province = regionTree.find(item => item.code === String(provinceCode || ''))
  const city = province?.children.find(item => item.code === String(cityCode || ''))
    || regionTree.flatMap(item => item.children).find(item => item.code === String(cityCode || ''))
  const treeCityLabel = normalizeRegionDisplayLabel(city?.name)
  if (treeCityLabel) return treeCityLabel

  return normalizeRegionDisplayLabel(provinceLabel || province?.name)
}

function normalizeRegionDisplayLabel(value: unknown): string {
  const normalized = String(value || '').trim()
  if (!normalized || /^\d{6}$/u.test(normalized)) return ''
  return normalized.replace(/(?:壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|自治州|地区|省|市|盟)$/u, '')
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
