/** 成功的社区写操作通知个人区重新核对实时统计。 */
const listeners = new Set<() => void>()

export function subscribeCommunityPersonalChanged(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export async function withCommunityPersonalRefresh<T>(operation: Promise<T>): Promise<T> {
  const result = await operation
  listeners.forEach(listener => listener())
  return result
}
