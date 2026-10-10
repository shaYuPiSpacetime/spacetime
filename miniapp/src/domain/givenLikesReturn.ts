import Taro from '@tarojs/taro'
import type { GivenLikeItemVO, GivenLikesPageVO } from '@/services/relation'

export type GivenLikesReturnSnapshot = {
  userId: number | null
  records: GivenLikeItemVO[]
  page: GivenLikesPageVO | null
  scrollTop: number
  openedUserId?: number
}

const STORAGE_KEY = 'given-likes-return-v2'
const MAX_AGE_MS = 30 * 60 * 1000
type SavedSnapshot = GivenLikesReturnSnapshot & { savedAt: number }
let pending: SavedSnapshot | undefined

// 持续保存本次列表浏览，不能在 React 初始化/第一次返回时消费掉。
// 从“我的”重新进入时清理；本地存储用于页面和脚本上下文重建后的恢复。
export function saveGivenLikesReturn(snapshot: GivenLikesReturnSnapshot) {
  if (!snapshot.userId || !snapshot.page) return
  pending = { ...snapshot, savedAt: Date.now() }
  try { Taro.setStorageSync(STORAGE_KEY, pending) } catch { /* 存储不可用时仍保留内存快照。 */ }
}
export function readGivenLikesReturn(userId: number | null): GivenLikesReturnSnapshot | undefined {
  // 登录态尚未恢复时不能销毁上一个页面保存的有效快照。
  if (!userId) return undefined
  let snapshot = pending
  if (!snapshot) {
    try { snapshot = Taro.getStorageSync(STORAGE_KEY) || undefined } catch { return undefined }
  }
  if (!snapshot) return undefined
  if (snapshot.userId !== userId || !Array.isArray(snapshot.records) || !snapshot.page || !Number.isFinite(snapshot.savedAt) || Date.now() - snapshot.savedAt > MAX_AGE_MS) {
    clearGivenLikesReturn()
    return undefined
  }
  pending = snapshot
  return snapshot
}
export function clearGivenLikesReturn() {
  pending = undefined
  try { Taro.removeStorageSync(STORAGE_KEY) } catch { /* 清理内存后不影响重新进入。 */ }
}
