export function resolveRecommendBadgeCount(page) {
  if (!page || !Array.isArray(page.items) || page.items.length === 0) return 0
  const remaining = Number(page.remainingBrowseCount)
  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0
}
