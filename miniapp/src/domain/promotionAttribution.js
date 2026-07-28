const PROMOTION_SOURCE_TYPES = new Set(['normal_user', 'campus_agent'])
const SOURCE_TOKEN_PATTERN = /^[A-Za-z0-9._~-]{8,160}$/
const TRACE_NO_PATTERN = /^TRC-[A-Za-z0-9]{8,128}$/
const MAX_PENDING_TRACE_COUNT = 10
const MAX_PENDING_SOURCE_COUNT = 5

function safeDecode(value) {
  let decoded = String(value || '').trim()
  for (let index = 0; index < 2; index += 1) {
    try {
      const next = decodeURIComponent(decoded.replace(/\+/g, '%20'))
      if (next === decoded) break
      decoded = next
    } catch {
      break
    }
  }
  return decoded
}

function scalar(value) {
  if (Array.isArray(value)) return scalar(value[0])
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return safeDecode(value)
}

function parseQueryString(value) {
  let raw = scalar(value)
  if (!raw) return {}
  const questionIndex = raw.indexOf('?')
  if (questionIndex >= 0) raw = raw.slice(questionIndex + 1)
  raw = raw.replace(/^[?#&]+/, '').split('#')[0]
  if (!raw.includes('=')) return {}

  return raw.split('&').reduce((result, item) => {
    const separatorIndex = item.indexOf('=')
    if (separatorIndex <= 0) return result
    const key = safeDecode(item.slice(0, separatorIndex))
    const itemValue = safeDecode(item.slice(separatorIndex + 1))
    if (key && itemValue) result[key] = itemValue
    return result
  }, {})
}

function queryObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.entries(value).reduce((result, [key, itemValue]) => {
    const normalized = scalar(itemValue)
    if (key && normalized) result[key] = normalized
    return result
  }, {})
}

function validSource(value) {
  const sourceType = scalar(value?.sourceType)
  const sourceToken = scalar(value?.sourceToken)
  if (!PROMOTION_SOURCE_TYPES.has(sourceType) || !SOURCE_TOKEN_PATTERN.test(sourceToken)) {
    return undefined
  }
  return { sourceType, sourceToken }
}

/**
 * 从小程序启动 query 或二维码 scene 中解析合法推广来源。
 * 直接 query 优先，避免 scene 覆盖显式页面参数。
 */
export function parsePromotionSource(input = {}) {
  const direct = validSource(queryObject(input))
  if (direct) return direct
  return validSource(parseQueryString(input?.scene))
}

function stringifyQuery(query) {
  return Object.entries(query)
    .filter(([key, value]) => key && scalar(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(scalar(value))}`)
    .join('&')
}

function mergeUrlQuery(url, query) {
  const normalizedUrl = scalar(url)
  if (!normalizedUrl) return ''
  const hashIndex = normalizedUrl.indexOf('#')
  const hash = hashIndex >= 0 ? normalizedUrl.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? normalizedUrl.slice(0, hashIndex) : normalizedUrl
  const base = withoutHash.split('?')[0]
  const merged = {
    ...parseQueryString(withoutHash),
    ...query,
  }
  const queryString = stringifyQuery(merged)
  return `${base}${queryString ? `?${queryString}` : ''}${hash}`
}

/**
 * 将后端分享上下文归一成可直接使用的 path/link。
 * 来源优先级：query 对象 > path 查询串 > 显式 sourceType/sourceToken。
 */
export function resolveInviteShareTarget(context = {}) {
  const rawPath = scalar(context.path) || '/pages/promotion/invite-home'
  const pathQuery = parseQueryString(rawPath)
  const contextQuery = queryObject(context.query)
  const source = validSource(contextQuery)
    || validSource(pathQuery)
    || validSource(context)

  const mergedQuery = {
    ...pathQuery,
    ...contextQuery,
  }
  if (source) {
    mergedQuery.sourceType = source.sourceType
    mergedQuery.sourceToken = source.sourceToken
  } else {
    delete mergedQuery.sourceType
    delete mergedQuery.sourceToken
  }

  const rawBasePath = rawPath.split('?')[0] || '/pages/promotion/invite-home'
  const basePath = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`
  const path = mergeUrlQuery(basePath, mergedQuery)
  const link = mergeUrlQuery(context.link, mergedQuery)

  return {
    title: scalar(context.title),
    path,
    link,
    source,
    attributable: Boolean(source),
  }
}

export function normalizePendingTraceNos(values = []) {
  const normalized = Array.isArray(values)
    ? values
      .map(value => scalar(value))
      .filter(value => TRACE_NO_PATTERN.test(value))
    : []
  return Array.from(new Set(normalized)).slice(-MAX_PENDING_TRACE_COUNT)
}

export function appendPendingTraceNo(values = [], traceNo = '') {
  const normalizedTraceNo = scalar(traceNo)
  const current = normalizePendingTraceNos(values)
    .filter(value => value !== normalizedTraceNo)
  if (TRACE_NO_PATTERN.test(normalizedTraceNo)) current.push(normalizedTraceNo)
  return current.slice(-MAX_PENDING_TRACE_COUNT)
}

function promotionSourceKey(source) {
  return `${source.sourceType}:${source.sourceToken}`
}

export function normalizePendingSources(values = []) {
  const sources = new Map()
  if (!Array.isArray(values)) return []
  values.forEach((value) => {
    const source = validSource(value)
    if (!source) return
    const key = promotionSourceKey(source)
    sources.delete(key)
    sources.set(key, source)
  })
  return Array.from(sources.values()).slice(-MAX_PENDING_SOURCE_COUNT)
}

export function appendPendingSource(values = [], sourceValue = {}) {
  return normalizePendingSources([
    ...normalizePendingSources(values),
    sourceValue,
  ])
}

export function removePendingSource(values = [], sourceValue = {}) {
  const source = validSource(sourceValue)
  if (!source) return normalizePendingSources(values)
  const removedKey = promotionSourceKey(source)
  return normalizePendingSources(values)
    .filter(value => promotionSourceKey(value) !== removedKey)
}
