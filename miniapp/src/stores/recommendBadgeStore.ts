import { create } from 'zustand'
import { createRecommendBadgeRuntime } from '@/domain/recommendBadge'
import { getRecommendCandidates, type RecommendCandidatePageVO } from '@/services/recommend'

interface RecommendBadgeState {
  ownerId: number | null
  count: number
}

const runtime = createRecommendBadgeRuntime({ fetchPage: getRecommendCandidates })
export const useRecommendBadgeStore = create<RecommendBadgeState>(() => ({ ownerId: null, count: 0 }))
runtime.subscribe((state: RecommendBadgeState) => useRecommendBadgeStore.setState({ ownerId: state.ownerId, count: state.count }))

/** 推荐页浏览结果即时同步给所有底部栏。 */
export function publishRecommendBadge(userId: number, page: RecommendCandidatePageVO) {
  runtime.publishPage(userId, page)
}

/** 底部栏只刷新同一份数字，不为每个页面重复创建状态。 */
export function refreshRecommendBadge(userId: number | null) {
  return runtime.refresh(userId)
}

/** 注销或切换账号时清除上一账号的数字和未完成请求。 */
export function resetRecommendBadge() {
  runtime.reset()
}
