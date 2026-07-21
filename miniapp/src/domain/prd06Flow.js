const SEARCH_SCENES = ['global', 'community', 'recommend']

export function normalizeSourceScene(scene = '') {
  const normalized = String(scene || '').trim().toLowerCase()
  return SEARCH_SCENES.includes(normalized) ? normalized : 'global'
}

export function searchTabsForScene(scene = '') {
  const normalized = normalizeSourceScene(scene)
  if (normalized === 'community') return ['posts', 'topics']
  if (normalized === 'recommend') return ['users']
  return ['users', 'posts', 'topics']
}

export function searchHistoryStorageKey(accountKey = '') {
  const normalized = String(accountKey || '').trim() || 'guest'
  return `prd06.search.history.${normalized}`
}

export function pushSearchHistory(
  history = /** @type {unknown[]} */ ([]),
  keyword = '',
) {
  const normalizedKeyword = String(keyword || '').trim()
  const normalizedHistory = history
    .map(item => String(item || '').trim())
    .filter(Boolean)
  if (!normalizedKeyword) return Array.from(new Set(normalizedHistory)).slice(0, 10)
  return [
    normalizedKeyword,
    ...Array.from(new Set(normalizedHistory.filter(item => item !== normalizedKeyword))),
  ].slice(0, 10)
}

export function resolveSearchSubmission(
  keyword = '',
  result = /** @type {{ blocked?: boolean }} */ ({}),
) {
  const normalizedKeyword = String(keyword || '').trim()
  if (!normalizedKeyword) {
    return { allowed: false, keyword: '', reason: 'empty' }
  }
  if (result?.blocked) {
    return { allowed: false, keyword: normalizedKeyword, reason: 'blocked' }
  }
  return { allowed: true, keyword: normalizedKeyword, reason: '' }
}

export function resolveCompliancePresentation(
  detail = /** @type {{
    title?: string,
    contentUrl?: string,
    url?: string,
    contentBody?: string,
    nativeContent?: string,
    summary?: string,
    linkType?: string
  } | undefined} */ (undefined),
) {
  if (!detail) {
    return {
      mode: 'missing',
      title: '内容',
      url: '',
      body: '',
      message: '',
    }
  }
  const title = String(detail.title || '内容')
  const url = String(detail.contentUrl || detail.url || '')
  const body = String(detail.contentBody || detail.nativeContent || detail.summary || '')
  const linkType = String(detail.linkType || '').toUpperCase()
  if (linkType === 'H5' && url) return { mode: 'h5', title, url, body, message: '' }
  if (body) return { mode: 'native', title, url, body, message: '' }
  return { mode: 'missing', title, url: '', body: '', message: '' }
}
