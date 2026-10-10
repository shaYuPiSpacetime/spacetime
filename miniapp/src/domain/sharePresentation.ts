import type { CommunityPostVO } from '@/services/community'

export type ShareKind = 'profile' | 'post' | 'topic' | 'invite'
export interface SharePresentation {
  kind: ShareKind
  title: string
  path: string
  images: string[]
}

/** 分享文案清除换行并按 Unicode 字符截断，避免 emoji 被截成半个字符。 */
export function shareText(value: unknown, fallback: string, limit = 36): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim() || fallback
  const chars = Array.from(text)
  return chars.length > limit ? `${chars.slice(0, limit - 1).join('')}…` : text
}

function validId(value: unknown): boolean {
  return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))
}

export function profileShare(userId: unknown, nickname?: string, images: string[] = []): SharePresentation {
  return {
    kind: 'profile',
    title: nickname?.trim() ? `${shareText(nickname, '', 20)}的主页` : '来时空邂逅，认识真实的彼此',
    path: validId(userId) ? `/pages/heart/user?targetUserId=${userId}` : '/pages/index/index',
    images,
  }
}

export function postShare(post?: Pick<CommunityPostVO, 'id' | 'content' | 'authorName' | 'imageUrls'>): SharePresentation {
  return {
    kind: 'post',
    title: shareText(post?.content, post?.authorName ? `${shareText(post.authorName, '', 16)}分享了新动态` : '千寻时空站台 · 发现生活中的心动'),
    path: validId(post?.id) ? `/pages/qianxun/post-detail?id=${post!.id}` : '/pages/index/index',
    images: post?.imageUrls || [],
  }
}

export function topicShare(topicId?: number, name?: string, coverUrl?: string): SharePresentation {
  return {
    kind: 'topic', title: shareText(name, '千寻话题 · 遇见有共鸣的人'),
    path: validId(topicId) ? `/pages/qianxun/topic?topicId=${topicId}` : '/pages/index/index',
    images: coverUrl ? [coverUrl] : [],
  }
}
