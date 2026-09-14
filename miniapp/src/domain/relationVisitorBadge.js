export function relationVisitorSnapshotKey(userId) {
  return `relation_visitor_seen_${String(userId || 'anonymous')}`
}

export function currentLocalDateKey(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function acknowledgeVisitorCount(count, dateKey) {
  return {
    count: Math.max(0, Number(count || 0)),
    dateKey: String(dateKey || ''),
  }
}

export function resolveVisitorBadge(totalCount, snapshot, dateKey, serverUnreadCount) {
  if (serverUnreadCount !== undefined && serverUnreadCount !== null) {
    return Math.max(0, Number(serverUnreadCount || 0))
  }
  const total = Math.max(0, Number(totalCount || 0))
  if (!snapshot || snapshot.dateKey !== String(dateKey || '')) return total
  return Math.max(0, total - Math.max(0, Number(snapshot.count || 0)))
}

export function shouldApplyVisitorReadResult(displayedCursor, acknowledgedCursor) {
  return Boolean(displayedCursor && acknowledgedCursor && displayedCursor === acknowledgedCursor)
}
