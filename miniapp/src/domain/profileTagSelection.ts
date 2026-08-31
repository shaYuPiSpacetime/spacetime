export type ProfileTagSelectionResult = {
  codes: string[]
  limitExceeded: boolean
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
