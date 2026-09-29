import type { CommunityPostVO } from '@/services/community'

export function formatCommunityAuthorMeta(post: CommunityPostVO): string {
  const summary = [
    post.authorBirthYear ? `${String(post.authorBirthYear).slice(-2)}年` : post.authorAge ? `${post.authorAge}岁` : '',
    post.authorCity || '',
    post.authorProfession || post.authorZodiac || '',
  ].filter(Boolean).join('·')
  if (summary) return summary
  if (typeof post.authorProfileCompletion !== 'number') return ''
  const score = Math.max(0, Math.min(100, Math.round(post.authorProfileCompletion)))
  return score >= 100 ? '资料已完善' : `资料完整度 ${score}%`
}
