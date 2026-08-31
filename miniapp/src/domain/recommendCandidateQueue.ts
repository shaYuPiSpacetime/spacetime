import type { RecommendCandidatePageVO } from '@/services/recommend'

/**
 * 过滤本次会话中已经展示过的推荐候选，避免刷新队列时再次停留在当前用户。
 */
export function omitSeenRecommendCandidates(
  page: RecommendCandidatePageVO,
  seenCandidateNos: ReadonlySet<string>,
  currentCandidateNo?: string
): RecommendCandidatePageVO {
  return {
    ...page,
    items: page.items.filter(
      item =>
        item.candidateNo !== currentCandidateNo && !seenCandidateNos.has(item.candidateNo)
    ),
  }
}
