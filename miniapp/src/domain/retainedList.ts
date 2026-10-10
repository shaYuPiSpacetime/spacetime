/** 返回页面时仅更新已显示条目，保持顺序、长度和后续页；首次加载正常接收结果。 */
export function refreshRetainedItems<T>(current: T[], incoming: T[], key: (item: T) => string | number): T[] {
  if (!current.length) return incoming
  const updates = new Map(incoming.map(item => [key(item), item]))
  return current.map(item => updates.get(key(item)) || item)
}
