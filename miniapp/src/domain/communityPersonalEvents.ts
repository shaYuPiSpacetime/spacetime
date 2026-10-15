/** 成功的社区写操作通知个人区重新核对实时统计。 */
export interface CommunityPersonalChange {
  kind: 'content' | 'interaction' | 'block' | 'delete' | 'follow'
  authorId?: number
  postId?: number
}
const listeners = new Set<(change: CommunityPersonalChange) => void>()

export function subscribeCommunityPersonalChanged(listener: (change: CommunityPersonalChange) => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export async function withCommunityPersonalRefresh<T>(operation: Promise<T>, change: CommunityPersonalChange = { kind: 'content' }): Promise<T> {
  const result = await operation
  listeners.forEach(listener => listener(change))
  return result
}
