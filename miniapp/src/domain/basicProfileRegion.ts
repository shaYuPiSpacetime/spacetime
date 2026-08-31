export type BasicProfileRegionRowId = 'location' | 'hometown'

interface BasicProfileFieldLike {
  fieldId: string
  visible?: boolean
}

const RETIRED_DISTRICT_FIELD_IDS = new Set(['locationDistrict', 'hometownDistrict'])

/** 现居地和家乡都只保存省市，并主动清空历史区县。 */
export function buildRegionPatch(
  rowId: BasicProfileRegionRowId,
  provinceCode: string,
  cityCode: string,
  _districtCode = ''
) {
  return {
    [`${rowId}Province`]: provinceCode,
    [`${rowId}City`]: cityCode,
    [`${rowId}District`]: '',
  }
}

/**
 * 现居地和家乡固定为两级；即使旧后端仍返回区县可见，也必须在小程序侧退役。
 */
export function normalizeTwoLevelRegionFieldSettings<T extends BasicProfileFieldLike>(
  settings: T[] | undefined
): T[] {
  return (settings || []).filter(setting => !RETIRED_DISTRICT_FIELD_IDS.has(setting.fieldId))
}

/** 按可见字段白名单生成保存请求，阻止两个历史区县重新提交。 */
export function buildBasicProfileSavePayload(
  settings: BasicProfileFieldLike[] | undefined,
  values: Record<string, unknown>
): Record<string, unknown> {
  const payload = Object.fromEntries(
    normalizeTwoLevelRegionFieldSettings(settings)
      .filter(setting => setting.visible !== false)
      .map(setting => [setting.fieldId, values[setting.fieldId]])
  )
  if (Object.prototype.hasOwnProperty.call(payload, 'school')) payload.schoolCode = values.schoolCode
  return payload
}

/** 地区错误只向用户说明可执行动作。 */
export function toTwoLevelRegionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '')
  return message.includes('REGION_NOT_SUPPORTED') ? '地区选项已更新，请重新选择省市' : message
}
