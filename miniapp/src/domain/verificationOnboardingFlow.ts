const INCOMPLETE_AUDIT_STATUSES = new Set(['', 'NOT_SUBMITTED', 'REJECTED', 'EXPIRED'])

export function isVerificationStepSubmitted(status) {
  return !INCOMPLETE_AUDIT_STATUSES.has(String(status || '').toUpperCase())
}

export function resolveVerificationOnboardingRoute({
  basicCompleted,
  avatarStatus,
  introductionStatus,
}) {
  if (basicCompleted !== true) return '/pages/verification/basic'
  if (!isVerificationStepSubmitted(avatarStatus)) return '/pages/verification/avatar'
  if (!isVerificationStepSubmitted(introductionStatus)) return '/pages/verification/intro'
  return '/pages/verification/triple'
}

export function hasPartialBasicProfile(basic, fieldSettings, initFields) {
  const initFieldIds = new Set(
    (initFields || []).flatMap(item => Array.isArray(item.submitFields) ? item.submitFields : []),
  )

  return (fieldSettings || []).some(setting => {
    if (!setting?.visible || initFieldIds.has(setting.fieldId)) return false
    return hasValue(basic?.[setting.fieldId])
  })
}

export function resolveCertificationChecklist({
  basicCompleted,
  avatarStatus,
  introductionStatus,
  verifyLevel,
}) {
  return {
    basic: basicCompleted === true,
    avatarIntro:
      isVerificationStepSubmitted(avatarStatus) &&
      isVerificationStepSubmitted(introductionStatus),
    triple: Number(verifyLevel) >= 3,
  }
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  return value !== undefined && value !== null && value !== false
}
