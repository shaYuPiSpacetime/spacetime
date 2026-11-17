/** 按后台实际天数展示套餐周期；非整月套餐保留天数，避免误写成季卡。 */
function resolveDuration(days?: number) {
  const duration = typeof days === 'number' && Number.isFinite(days) && days > 0 ? days : 30
  const months = duration % 365 === 0 ? duration / 365 * 12 : duration % 30 === 0 ? duration / 30 : null
  return { duration, months }
}

export function formatMembershipDuration(days?: number) {
  const { duration, months } = resolveDuration(days)
  return months == null ? `${duration}天` : `${months}个月`
}

export function formatMembershipAveragePrice(price: number, days?: number) {
  const { duration, months } = resolveDuration(days)
  return months == null ? `¥${price.toFixed(2)}/${duration}天` : `¥${(price / months).toFixed(2)}/月`
}
