import { get, post } from './request'
import type { PageVO } from '@/types/api'

export type CommunityScene = 'FOLLOWING' | 'CITY' | 'HOT'

export interface CommunityPostVO {
  id: number
  authorId: number
  authorName: string
  authorAvatar: string
  authorGender?: string
  authorAge?: number
  authorBirthYear?: number
  authorCity?: string
  authorZodiac?: string
  authorAnnualIncome?: string
  authorProfession?: string
  postType: string
  title?: string
  content: string
  imageUrls: string[]
  topicId?: number
  topicName?: string
  likeCount: number
  commentCount: number
  liked: boolean
  followingAuthor: boolean
  activityText?: string
  contactAction?: 'WHISPER' | 'PRIVATE_MESSAGE'
  createTime: string
}

export interface CommunityDictOption {
  code: string
  label: string
  sort?: number
}

export interface CommunityConfig {
  postMaxImages: number
  postMaxTextLength: number
  reportEntryEnabled: boolean
  topics: CommunityDictOption[]
  reportReasons: CommunityDictOption[]
  homeTabs: Array<{ entryKey: string; entryName: string; sort: number }>
}

export function getCommunityPosts(scene: CommunityScene, page = 1, size = 10) {
  return get<PageVO<CommunityPostVO>>('/miniapp/community/posts', { scene, page, size })
}

export const getCommunityConfig = () => get<CommunityConfig>('/miniapp/community/config')
export const getFollowingCount = () => get<number>('/miniapp/community/following/count')
export const toggleCommunityFollow = (targetUserId: number) => post<{ following: boolean }>(`/miniapp/community/follows/${targetUserId}`)
export const toggleCommunityLike = (postId: number) => post<{ liked: boolean; likeCount: number }>(`/miniapp/community/posts/${postId}/like`)
export const reportCommunityPost = (postId: number, reasonCode: string) => post<number>('/miniapp/community/reports', { targetType: 'post', targetId: postId, reasonCode })

export function publishCommunityPost(content: string, imageUrls: string[], topicId: number): Promise<number> {
  return post<number>('/miniapp/community/posts', {
    postType: 'normal_post',
    content,
    imageUrls,
    topicId,
    mentionUserIds: [],
  })
}
