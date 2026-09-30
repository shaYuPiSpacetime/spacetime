import type { RegionTreeOption } from '@/types/prd01'

export interface MatchedLocationRegion {
  province: RegionTreeOption
  city: RegionTreeOption
}

/** 只消除行政层级后缀；民族、自治等地区名称主体必须保留。 */
function normalizeRegionName(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\s+/gu, '')
    .replace(/(?:特别行政区|维吾尔自治区|回族自治区|壮族自治区|自治区|自治州|地区|省|市|盟)$/u, '')
}

function uniqueNameMatch(options: RegionTreeOption[], name: string): RegionTreeOption | undefined {
  const exact = options.filter(option => option.name === name)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) return undefined

  const normalized = normalizeRegionName(name)
  if (!normalized) return undefined
  const matches = options.filter(option => normalizeRegionName(option.name) === normalized)
  return matches.length === 1 ? matches[0] : undefined
}

/** 地图结果仅用于匹配现有字典编码；未匹配到完整省市时不得猜测首项。 */
export function matchLocationRegion(
  provinces: RegionTreeOption[],
  provinceName: string,
  cityName: string
): MatchedLocationRegion | null {
  if (!provinceName?.trim() || !cityName?.trim()) return null
  const province = uniqueNameMatch(provinces, provinceName.trim())
  if (!province) return null
  const city = uniqueNameMatch(province.children || [], cityName.trim())
  return city ? { province, city } : null
}
