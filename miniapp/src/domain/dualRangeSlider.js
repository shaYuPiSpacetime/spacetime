export function clampRangeValue(value, min, max, step = 1) {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1
  const bounded = Math.min(max, Math.max(min, Number(value)))
  const stepped = min + Math.round((bounded - min) / safeStep) * safeStep
  return Number(Math.min(max, Math.max(min, stepped)).toFixed(8))
}

export function rangeValueFromPointer(clientX, left, width, min, max, step = 1) {
  if (!Number.isFinite(width) || width <= 0) return min
  const progress = Math.min(1, Math.max(0, (clientX - left) / width))
  return clampRangeValue(min + progress * (max - min), min, max, step)
}

export function selectRangeThumb(pointerValue, low, high) {
  if (low === high) {
    if (pointerValue > high) return 'high'
    if (pointerValue < low) return 'low'
    return null
  }
  return Math.abs(pointerValue - low) <= Math.abs(pointerValue - high) ? 'low' : 'high'
}
