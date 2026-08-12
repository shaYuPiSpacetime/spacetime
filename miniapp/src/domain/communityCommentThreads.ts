export type CommunityCommentSort = 'latest' | 'earliest'

export interface CommunityCommentThreadItem {
  id: number
  parentCommentId?: number
  createTime: string
}

export interface CommunityCommentThread<T extends CommunityCommentThreadItem> {
  root: T
  replies: T[]
}

function timestamp(value: string) {
  const parsed = new Date(String(value || '').replace(' ', 'T')).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

export function resolveCommentThreadRootId<T extends CommunityCommentThreadItem>(comments: T[], commentId: number) {
  const byId = new Map(comments.map(item => [item.id, item]))
  let current = byId.get(commentId)
  if (!current) return commentId

  const visited = new Set<number>()
  while (current.parentCommentId && !visited.has(current.id)) {
    visited.add(current.id)
    const parent = byId.get(current.parentCommentId)
    if (!parent) break
    current = parent
  }
  return current.id
}

export function buildCommunityCommentThreads<T extends CommunityCommentThreadItem>(
  comments: T[],
  sort: CommunityCommentSort = 'latest'
) {
  const threads = new Map<number, CommunityCommentThread<T>>()

  for (const item of comments) {
    const rootId = resolveCommentThreadRootId(comments, item.id)
    const root = comments.find(comment => comment.id === rootId) || item
    if (!threads.has(root.id)) threads.set(root.id, { root, replies: [] })
    if (item.id !== root.id) threads.get(root.id)?.replies.push(item)
  }

  const direction = sort === 'latest' ? -1 : 1
  return [...threads.values()]
    .map(thread => ({
      ...thread,
      replies: [...thread.replies].sort((left, right) => timestamp(left.createTime) - timestamp(right.createTime)),
    }))
    .sort((left, right) => direction * (timestamp(left.root.createTime) - timestamp(right.root.createTime)))
}
