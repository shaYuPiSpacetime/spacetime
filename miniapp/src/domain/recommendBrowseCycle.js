/** 服务端返回的重置时间为北京时间，仅在页面激活时判断是否需要重新查询。 */
export function hasRecommendCycleExpired(nextResetAt, now = Date.now()) {
  if (!nextResetAt || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(nextResetAt)) return false
  const resetAt = Date.parse(`${nextResetAt.replace(' ', 'T')}+08:00`)
  return Number.isFinite(resetAt) && now >= resetAt
}
