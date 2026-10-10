/** 重提成功回执用于替换仍挂载的本人动态卡片；审核状态始终取服务端返回值。 */
export interface CommunityPostReplacement {
  previousPostRef: string
  postNo: string
  postId?: number
  status: string
  statusName?: string
  content: string
  imageUrls: string[]
  failureMessage?: string
}

const listeners = new Set<(replacement: CommunityPostReplacement) => void>()

export function subscribeCommunityPostResubmitted(listener: (replacement: CommunityPostReplacement) => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function notifyCommunityPostResubmitted(replacement: CommunityPostReplacement) {
  listeners.forEach(listener => listener(replacement))
}

/** 新帖不能继承旧帖的失败原因、互动数量或旧身份。 */
export function replaceResubmittedPost<T extends { id: string; postId?: number; postNo?: string }>(
  posts: T[], replacement: CommunityPostReplacement,
): T[] {
  return posts.map(post => {
    if (post.postNo !== replacement.previousPostRef && String(post.postId) !== replacement.previousPostRef) return post
    const { previousPostRef: _previousPostRef, ...next } = replacement
    return { ...post, ...next, id: replacement.postNo, likeCount: 0, commentCount: 0, liked: false,
      failureMessage: replacement.status === 'rejected' ? replacement.failureMessage : undefined }
  })
}
