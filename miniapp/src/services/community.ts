import { del, get, post } from './request'
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

export interface CommunityPostDetailVO extends CommunityPostVO {
  mentionUserIds?: number[]
  reportCount?: number
  status?: string
  auditStatus?: string
  auditRemark?: string
}

export interface CommunityCommentVO {
  id: number
  postId: number
  authorId: number
  authorName: string
  authorAvatar: string
  parentCommentId?: number
  replyUserId?: number
  replyUserName?: string
  content: string
  status: string
  auditStatus: string
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

export interface CommunityTopicCardVO {
  id: number
  name: string
  description: string
  coverUrl?: string
  postCount: number
  participantCount: number
  participantAvatars: string[]
  previewContent?: string
  previewImageUrl?: string
  previewAuthorId?: number
  previewAuthorName?: string
  previewAuthorAvatar?: string
  previewCreateTime?: string
}

export interface CommunityTopicDetailVO {
  id: number
  name: string
  description: string
  coverUrl?: string
  postCount: number
  participantCount: number
}

export interface CommunityTopicHomeVO {
  featured?: CommunityTopicCardVO
  related: CommunityTopicCardVO[]
}

export interface YuemuUserVO {
  userId: number
  nickname: string
  photoUrl: string
  fateLabel: string
  educationSchool: string
  onlineText: string
  liked: boolean
}

export function getCommunityPosts(scene: CommunityScene, page = 1, size = 10) {
  return get<PageVO<CommunityPostVO>>('/miniapp/community/posts', { scene, page, size })
}

export const getCommunityTopicHome = () =>
  get<CommunityTopicHomeVO>('/miniapp/community/topics/home')

export const getCommunityTopics = (page = 1, size = 10) =>
  get<PageVO<CommunityTopicCardVO>>('/miniapp/community/topics', { page, size })

export const getCommunityTopicDetail = (topicId: number) =>
  get<CommunityTopicDetailVO>(`/miniapp/community/topics/${topicId}`)

export function getCommunityTopicPosts(topicId: number, sort: 'HOT' | 'LATEST' = 'HOT', page = 1, size = 10) {
  return get<PageVO<CommunityPostVO>>(`/miniapp/community/topics/${topicId}/posts`, { sort, page, size })
}

export const getYuemuUsers = (page = 1, size = 20) =>
  get<PageVO<YuemuUserVO>>('/miniapp/community/yuemu', { page, size })

export const toggleYuemuLike = (targetUserId: number) =>
  post<{ liked: boolean }>(`/miniapp/community/yuemu/${targetUserId}/like`)

export const getSincerePosts = (page = 1, size = 10) =>
  get<PageVO<CommunityPostVO>>('/miniapp/community/sincere-posts', { page, size })

export const getCommunityPostDetail = (postId: number) => get<CommunityPostDetailVO>(`/miniapp/community/posts/${postId}`)
export const getCommunityComments = (postId: number, page = 1, size = 20) => get<PageVO<CommunityCommentVO>>(`/miniapp/community/posts/${postId}/comments`, { page, size })
export const createCommunityComment = (postId: number, content: string, parentCommentId?: number, replyUserId?: number) => post<number>('/miniapp/community/comments', { postId, content, parentCommentId, replyUserId })
export const deleteCommunityComment = (commentId: number) => del<void>(`/miniapp/community/comments/${commentId}`)
export const deleteCommunityPost = (postId: number) => del<void>(`/miniapp/community/posts/${postId}`)

export const getCommunityConfig = () => get<CommunityConfig>('/miniapp/community/config')
export const getFollowingCount = () => get<number>('/miniapp/community/following/count')
export const toggleCommunityFollow = (targetUserId: number) => post<{ following: boolean }>(`/miniapp/community/follows/${targetUserId}`)
export const toggleCommunityLike = (postId: number) => post<{ liked: boolean; likeCount: number }>(`/miniapp/community/posts/${postId}/like`)
export const reportCommunityPost = (postId: number, reasonCode: string) => post<number>('/miniapp/community/reports', { targetType: 'post', targetId: postId, reasonCode })

export function publishCommunityPost(content: string, imageUrls: string[], topicId: number, postType: 'normal_post' | 'sincere_post' = 'normal_post'): Promise<number> {
  return post<number>('/miniapp/community/posts', {
    postType,
    content,
    imageUrls,
    topicId,
    mentionUserIds: [],
  })
}
