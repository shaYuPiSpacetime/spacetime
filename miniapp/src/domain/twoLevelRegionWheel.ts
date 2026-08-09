import type { RegionTreeOption } from '@/types/prd01'

export type TwoLevelRegionSelection = [number, number]

/**
 * 将省市两列滚轮索引限制在当前地区树的有效范围内。
 * 切换省份后城市数量发生变化时，城市列会立即收敛到新省份的合法索引。
 */
export function normalizeTwoLevelRegionSelection(
  regions: RegionTreeOption[],
  selection: readonly number[]
): TwoLevelRegionSelection {
  if (regions.length === 0) return [0, 0]

  const provinceIndex = clampIndex(selection[0], regions.length)
  const cityCount = regions[provinceIndex]?.children.length || 0
  const cityIndex = clampIndex(selection[1], cityCount)
  return [provinceIndex, cityIndex]
}

function clampIndex(value: number | undefined, length: number) {
  if (length <= 0) return 0
  const normalized = Number.isFinite(value) ? Math.trunc(value as number) : 0
  return Math.min(Math.max(normalized, 0), length - 1)
}
