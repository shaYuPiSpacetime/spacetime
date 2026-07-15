export function resolveCancelSubmitState(
  { selected = [], detail = '' } = /** @type {{ selected?: string[], detail?: string }} */ ({}),
) {
  const normalized = Array.from(new Set(selected.map(item => String(item || '').trim()).filter(Boolean)))
  const trimmedDetail = String(detail || '').trim()
  if (normalized.length === 0) return { enabled: false, reason: '' }
  if (normalized.includes('其他')) {
    if (!trimmedDetail) return { enabled: false, reason: '' }
    const otherReasons = normalized.filter(item => item !== '其他')
    return {
      enabled: true,
      reason: [...otherReasons, `其他：${trimmedDetail}`].join('；'),
    }
  }
  return { enabled: true, reason: normalized.join('；') }
}

export function isCoolingOff(status = /** @type {{ status?: string }} */ ({})) {
  return status?.status === 'COOLING_OFF'
}

export function canRevokeCancellation(status = /** @type {{ status?: string }} */ ({})) {
  return isCoolingOff(status)
}
