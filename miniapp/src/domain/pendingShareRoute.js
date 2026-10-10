export const PENDING_SHARE_ROUTE_KEY = 'pending_share_route'

function positiveId(value) {
  const text = String(value ?? '')
  if (!/^[1-9]\d*$/.test(text)) return null
  const id = Number(text)
  return Number.isSafeInteger(id) ? id : null
}

function queryValue(path, query, name) {
  const supplied = query && query[name]
  if (supplied !== undefined && supplied !== null) return supplied
  const match = String(path).match(new RegExp(`[?&]${name}=(\\d+)(?:[&#]|$)`))
  return match ? match[1] : null
}

export function resolvePendingShareRoute(path, query) {
  const route = String(path || '').split('?')[0].replace(/^\/+/, '')
  if (route === 'pages/qianxun/post-detail') {
    const id = positiveId(queryValue(path, query, 'id'))
    return id ? `/pages/qianxun/post-detail?id=${id}` : null
  }
  if (route === 'pages/qianxun/topic') {
    const id = positiveId(queryValue(path, query, 'topicId'))
    return id ? `/pages/qianxun/topic?topicId=${id}` : null
  }
  if (route === 'pages/heart/user') {
    const id = positiveId(queryValue(path, query, 'targetUserId')
      ?? queryValue(path, query, 'userId'))
    return id ? `/pages/heart/user?targetUserId=${id}` : null
  }
  return null
}
