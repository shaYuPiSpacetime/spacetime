export type BasicProfileRegionRowId = 'location' | 'hometown'

interface BasicProfileFieldLike {
  fieldId: string
  visible?: boolean
}

const RETIRED_DISTRICT_FIELD_IDS = new Set(['locationDistrict', 'hometownDistrict'])

/** 把组合地区选择还原为省、市原子字段，并立即清空本地历史区县。 */
export function buildRegionPatch(
  rowId: BasicProfileRegionRowId,
  provinceCode: string,
  cityCode: string
) {
  return {
    [`${rowId}Province`]: provinceCode,
    [`${rowId}City`]: cityCode,
    [`${rowId}District`]: '',
  }
}

/**
 * 滚动升级期间旧后端可能仍返回区县可见；小程序必须按最终两级口径强制退役。
 */
export function normalizeTwoLevelRegionFieldSettings<T extends BasicProfileFieldLike>(
  settings: T[] | undefined
): T[] {
  return (settings || []).filter(setting => !RETIRED_DISTRICT_FIELD_IDS.has(setting.fieldId))
}

/** 按可见字段白名单生成保存请求，双重保证历史区县不会重新提交。 */
export function buildBasicProfileSavePayload(
  settings: BasicProfileFieldLike[] | undefined,
  values: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    normalizeTwoLevelRegionFieldSettings(settings)
      .filter(setting => setting.visible !== false)
      .map(setting => [setting.fieldId, values[setting.fieldId]])
  )
}

/** 地区错误只向用户说明可执行动作，不暴露已经退役的三级技术口径。 */
export function toTwoLevelRegionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '')
  return message.includes('REGION_NOT_SUPPORTED')
    ? '地区选项已更新，请重新选择省市'
    : message
}
