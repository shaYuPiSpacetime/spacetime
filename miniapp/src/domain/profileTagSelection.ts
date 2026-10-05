export type ProfileTagSelectionResult = {
  codes: string[]
  limitExceeded: boolean
}

/** 不同编码对应相同展示名时，只给用户展示首个配置项。 */
export function uniqueProfileTagOptions<T extends { code: string; label: string }>(options: T[]): T[] {
  const seenCodes = new Set<string>()
  const seenLabels = new Set<string>()
  return options.filter(option => {
    const code = option.code.trim()
    const label = option.label.trim() || code
    if (!code || seenCodes.has(code) || seenLabels.has(label)) return false
    seenCodes.add(code)
    seenLabels.add(label)
    return true
  })
}

/** 历史已选的同名旧编码映射至当前首个配置项，去掉重复和失效编码。 */
export function normalizeProfileTagCodes<T extends { code: string; label: string }>(
  selectedCodes: string[],
  options: T[],
): string[] {
  const canonicalByLabel = new Map<string, string>()
  const canonicalByCode = new Map<string, string>()
  for (const option of options) {
    const label = option.label.trim() || option.code.trim()
    const canonical = canonicalByLabel.get(label) || option.code
    canonicalByLabel.set(label, canonical)
    canonicalByCode.set(option.code, canonical)
  }
  return Array.from(new Set(selectedCodes.map(code => canonicalByCode.get(code)).filter((code): code is string => Boolean(code))))
}

export function toggleProfileTagSelection(
  selectedCodes: string[],
  optionCode: string,
  categoryCode: string,
  categoryOptionCodes: string[],
  maxCount = 16
): ProfileTagSelectionResult {
  if (selectedCodes.includes(optionCode)) {
    return {
      codes: selectedCodes.filter(code => code !== optionCode),
      limitExceeded: false,
    }
  }

  const normalizedCategoryCode = categoryCode.trim().toUpperCase()
  const nextCodes =
    normalizedCategoryCode === 'MBTI'
      ? [...selectedCodes.filter(code => !categoryOptionCodes.includes(code)), optionCode]
      : [...selectedCodes, optionCode]

  if (nextCodes.length > maxCount) {
    return { codes: selectedCodes, limitExceeded: true }
  }

  return { codes: nextCodes, limitExceeded: false }
}
