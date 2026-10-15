/** 兼容已有配置中的“其他”和“其他原因”，自定义文案仍按配置识别。 */
export function isOtherCancelReason(reason, configured = '') {
  const value = String(reason || '').trim()
  return Boolean(value) && (value === String(configured || '').trim() || value === '其他' || value === '其他原因')
}

export function resolveCancelSubmitState(input = {}) {
  const selected = 'selected' in input && Array.isArray(input.selected) ? input.selected : []
  const detail = 'detail' in input ? String(input.detail || '') : ''
  const normalized = Array.from(new Set(selected.map(item => String(item || '').trim()).filter(Boolean)))
  const trimmedDetail = String(detail || '').trim()
  if (normalized.length === 0) return { enabled: false, reason: '' }
  const configured = 'otherReason' in input ? String(input.otherReason || '') : ''
  const other = normalized.find(reason => isOtherCancelReason(reason, configured))
  if (other) {
    if (!trimmedDetail) return { enabled: false, reason: '' }
    const otherReasons = normalized.filter(item => !isOtherCancelReason(item, configured))
    return {
      enabled: true,
      reason: [...otherReasons, `${other}：${trimmedDetail}`].join('；'),
    }
  }
  return { enabled: true, reason: normalized.join('；') }
}

export function isCoolingOff(status = /** @type {{ status?: string }} */ ({})) {
  return 'status' in status && status.status === 'COOLING_OFF'
}

export function canRevokeCancellation(status = /** @type {{ status?: string }} */ ({})) {
  return isCoolingOff(status)
}
