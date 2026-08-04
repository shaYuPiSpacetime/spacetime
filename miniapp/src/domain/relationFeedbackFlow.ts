export function isIdentityVisible(displayStatus) {
  return displayStatus === 'clear'
}

export function formatRelationBadge(count) {
  const normalized = Math.floor(Number(count) || 0)
  if (normalized <= 0) return ''
  return normalized > 99 ? '99+' : String(normalized)
}

export function ensureUnlockAttempt(currentAttempt, quoteToken, createRequestId) {
  if (currentAttempt?.quoteToken === quoteToken) return currentAttempt
  return {
    quoteToken,
    requestId: createRequestId(),
  }
}

export function resolveRelationApiBaseUrl(productionUrl, e2eMode, e2eUrl) {
  if (e2eMode !== 'true' || !e2eUrl) return productionUrl
  const localHttpPattern = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/
  return localHttpPattern.test(e2eUrl) ? e2eUrl.replace(/\/+$/, '') : productionUrl
}

export function groupRecentVisitors(records) {
  const source = records || []
  const groups = [
    { key: 'today', title: '今天来访', records: source.filter(record => record?.groupKey === 'today') },
    { key: 'yesterday', title: '昨天来访', records: source.filter(record => record?.groupKey === 'yesterday') },
    { key: 'earlier', title: '更早来访', records: source.filter(record => !['today', 'yesterday'].includes(record?.groupKey)) },
  ]
  return groups.filter(group => group.records.length > 0)
}
