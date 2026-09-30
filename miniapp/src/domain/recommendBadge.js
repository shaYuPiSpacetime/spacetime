export function resolveRecommendBadgeCount(page) {
  if (!page || !Array.isArray(page.items) || page.items.length === 0) return 0
  const remaining = Number(page.remainingBrowseCount)
  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0
}

/** 浏览动作成功后同步服务端已扣除的额度，仅更新仍含该候选的当前页。 */
export function applyRecommendViewToPage(page, candidateNo) {
  if (!page || !page.items?.some(item => item.candidateNo === candidateNo)) return page
  const remaining = page.remainingBrowseCount
  if (remaining == null || !Number.isFinite(remaining)) return page
  return { ...page, remainingBrowseCount: Math.max(0, remaining - 1) }
}
