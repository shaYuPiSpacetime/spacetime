function normalizeNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export function formatVoiceDuration(seconds: number) {
  const safeSeconds = normalizeNonNegativeInteger(seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function getVoiceRecordingSeconds(startedAt: number, now: number, maxDuration: number) {
  const elapsed = normalizeNonNegativeInteger((now - startedAt) / 1000)
  return Math.min(elapsed, normalizeNonNegativeInteger(maxDuration))
}

export function resolveVoiceDuration(durationMs: number, timerSeconds: number, maxDuration: number) {
  const measuredSeconds = Number.isFinite(durationMs) && durationMs > 0
    ? Math.round(durationMs / 1000)
    : normalizeNonNegativeInteger(timerSeconds)
  return Math.min(Math.max(0, measuredSeconds), normalizeNonNegativeInteger(maxDuration))
}
