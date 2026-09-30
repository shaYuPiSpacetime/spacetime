/** 按北京时间自然日组织近三天记录，空日期也保留。 */
export function buildReplayGroups(items = [], now = new Date()) {
  const chinaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const dates = Array.from({ length: 3 }, (_, index) => {
    const date = new Date(chinaNow.getTime() - index * 24 * 60 * 60 * 1000)
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
  })
  return dates.map((date, index) => ({
    date,
    items: items.filter(item => {
      const viewedDate = String(item.viewedAt || '').slice(0, 10)
      return /^\d{4}-\d{2}-\d{2}$/.test(viewedDate)
        ? viewedDate === date
        : item.dateGroup === ['今天', '昨天', '前天'][index]
    }),
  }))
}

/** 非会员必须先取得服务端报价，余额与价格都以报价为准。 */
export function resolveReplayProfileStep(memberProfileAccess, quote) {
  if (memberProfileAccess || quote?.canOpen) return 'open'
  if (!quote) return 'quote'
  if (!Number.isInteger(quote.unitPrice) || quote.unitPrice <= 0) return 'unavailable'
  return (quote.coinBalance || 0) < quote.unitPrice ? 'recharge' : 'confirm'
}

/** 非会员仅能清晰查看今天的回看头像，过往自然日保持模糊。 */
export function shouldBlurReplayAvatar(groupDate, today, memberProfileAccess) {
  return !memberProfileAccess && Boolean(groupDate) && groupDate !== today
}
