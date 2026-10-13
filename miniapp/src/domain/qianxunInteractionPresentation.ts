export interface InteractionDateGroup<T> {
  key: string
  label: string
  items: T[]
}

interface InteractionDateRecord {
  interactionTime?: string
}

const DATE_PATTERN = /(\d{4})-(\d{2})-(\d{2})/

export function formatInteractionGroupDate(value?: string) {
  const match = String(value || '').match(DATE_PATTERN)
  return match ? `${match[1]}年${match[2]}月${match[3]}日` : '日期未知'
}

export function formatInteractionCardDate(value?: string) {
  const match = String(value || '').match(DATE_PATTERN)
  return match ? `${match[2]}-${match[3]}` : ''
}

export function groupCommunityInteractions<T extends InteractionDateRecord>(records: T[]): InteractionDateGroup<T>[] {
  const groups = new Map<string, InteractionDateGroup<T>>()

  for (const item of records) {
    const match = String(item.interactionTime || '').match(DATE_PATTERN)
    const key = match ? `${match[1]}-${match[2]}-${match[3]}` : 'unknown'
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(item)
      continue
    }
    groups.set(key, {
      key,
      label: formatInteractionGroupDate(item.interactionTime),
      items: [item],
    })
  }

  return [...groups.values()]
}

export function shouldDisplayMyCommunityPost(status?: string) {
  return String(status || '').trim().toLowerCase() !== 'deleted'
}

/** 审核拒绝和发布后下架均以失败回执呈现，仅用于本人动态列表。 */
export function isCommunityPostFailure(status?: string) {
  return ['rejected', 'blocked'].includes(String(status || '').trim().toLowerCase())
}
