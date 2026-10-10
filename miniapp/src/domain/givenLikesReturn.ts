import type { GivenLikeItemVO, GivenLikesPageVO } from '@/services/relation'

export type GivenLikesReturnSnapshot = {
  userId: number | null
  records: GivenLikeItemVO[]
  page: GivenLikesPageVO | null
  scrollTop: number
  openedUserId: number
}

// 仅保存一次详情往返；不写磁盘，普通重新进入及其他账号不能复用。
let pending: GivenLikesReturnSnapshot | undefined
export function saveGivenLikesReturn(snapshot: GivenLikesReturnSnapshot) { pending = snapshot }
export function takeGivenLikesReturn(userId: number | null) {
  const snapshot = pending
  pending = undefined
  return snapshot?.userId === userId ? snapshot : undefined
}
export function clearGivenLikesReturn() { pending = undefined }
