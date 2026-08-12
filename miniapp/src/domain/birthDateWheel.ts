export type BirthDateSelection = [number, number, number]
export type BirthDatePickerColumn = 'year' | 'month' | 'day'

/** 返回指定公历年月的天数，月份索引从 0 开始。 */
export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** 将滚轮索引收敛到当前年份范围和公历月份的合法日期。 */
export function normalizeBirthDateSelection(
  years: string[],
  selection: readonly number[]
): BirthDateSelection {
  const yearIndex = clampIndex(selection[0], Math.max(years.length - 1, 0))
  const monthIndex = clampIndex(selection[1], 11)
  const year = parseYear(years[yearIndex])
  const maxDayIndex = year === undefined ? 0 : getDaysInMonth(year, monthIndex) - 1
  const dayIndex = clampIndex(selection[2], maxDayIndex)
  return [yearIndex, monthIndex, dayIndex]
}

/** 只替换当前原生单列滚轮的索引，其他两列保持不变。 */
export function updateBirthDatePickerColumn(
  years: string[],
  selection: BirthDateSelection,
  column: BirthDatePickerColumn,
  nextIndex: number
): BirthDateSelection {
  const columnIndex = column === 'year' ? 0 : column === 'month' ? 1 : 2
  const next: BirthDateSelection = [...selection]
  next[columnIndex] = nextIndex
  return normalizeBirthDateSelection(years, next)
}

/** 根据已有生日生成滚轮默认索引；无有效生日时默认落在年份中点的 1 月 1 日。 */
export function resolveBirthDateInitialValue(
  birthday: string | undefined,
  years: string[]
): BirthDateSelection {
  const fallback: BirthDateSelection = [Math.floor(Math.max(years.length - 1, 0) / 2), 0, 0]
  const normalized = birthday?.replace(/\//g, '-')
  const [year, month, day] = normalized?.split('-').map(Number) || []
  const yearIndex = years.indexOf(`${year}年`)
  if (yearIndex < 0) return fallback
  return normalizeBirthDateSelection(years, [yearIndex, (month || 1) - 1, (day || 1) - 1])
}

/** 将当前合法滚轮索引格式化为接口要求的 yyyy-MM-dd。 */
export function formatBirthDate(years: string[], selection: readonly number[]) {
  if (years.length === 0) return undefined
  const [yearIndex, monthIndex, dayIndex] = normalizeBirthDateSelection(years, selection)
  const year = parseYear(years[yearIndex])
  if (year === undefined) return undefined
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayIndex + 1).padStart(2, '0')}`
}

function parseYear(label: string | undefined) {
  const year = Number(label?.replace('年', ''))
  return Number.isInteger(year) && year > 0 ? year : undefined
}

function clampIndex(value: number | undefined, max: number) {
  const normalized = Number.isFinite(value) ? Math.trunc(value as number) : 0
  return Math.min(Math.max(normalized, 0), Math.max(max, 0))
}
