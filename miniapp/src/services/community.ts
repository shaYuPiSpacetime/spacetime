import { del, get, post, put } from './request'
import type { PageVO } from '@/types/api'

export type CommunityScene = 'FOLLOWING' | 'CITY' | 'HOT'
export type CommunityContentType = 'community_post' | 'sincere_post'
export type CommunityContentStatus = 'draft' | 'pending_machine' | 'pending_manual' | 'published' | 'rejected' | 'deleted' | 'blocked'
export type CommunityUploadStatus = 'queued' | 'uploading' | 'success' | 'failed'
export type CommunityInteractionType = 'commented' | 'liked' | 'unlocked' | 'viewed'
export type CommunityRelationType = 'following' | 'followers'
export type CommunityReportTargetType = 'post' | 'comment' | 'user' | 'chat'

export const COMMUNITY_COPY_KEYS = {
  genericError: 'generic_error',
  loadFailed: 'load_failed',
  loading: 'loading',
  retry: 'retry',
  emptyFollowingFeed: 'empty_following_feed',
  emptyFollowingUsers: 'empty_following_users',
  emptyCityFeed: 'empty_city_feed',
  emptyFeedDescription: 'empty_feed_description',
  emptyYuemu: 'empty_yuemu',
  emptyYuemuDescription: 'empty_yuemu_description',
  emptySincere: 'empty_sincere',
  emptySincereDescription: 'empty_sincere_description',
  emptyTopics: 'empty_topics',
  emptyTopicPosts: 'empty_topic_posts',
  topicUnavailable: 'topic_unavailable',
  topicDefaultName: 'topic_default_name',
  topicDefaultDescription: 'topic_default_description',
  topicDefaultUser: 'topic_default_user',
  listEnd: 'list_end',
  emptyMyPosts: 'empty_my_posts',
  emptyUserPosts: 'empty_user_posts',
  emptyCommented: 'empty_commented',
  emptyLiked: 'empty_liked',
  emptyUnlocked: 'empty_unlocked',
  emptyInteractionDescription: 'empty_interaction_description',
  emptyHistory: 'empty_history',
  emptyFollowingRelations: 'empty_following_relations',
  emptyFollowerRelations: 'empty_follower_relations',
  emptyPostLikes: 'empty_post_likes',
  emptyPostComments: 'empty_post_comments',
  postCommentsUnavailable: 'post_comments_unavailable',
  postCommentsEmpty: 'post_comments_empty',
  postUnavailable: 'post_unavailable',
  profileUnavailable: 'profile_unavailable',
  reportReasonUnavailable: 'report_reason_unavailable',
  reportSubmitFailed: 'report_submit_failed',
  reportSubmitted: 'report_submitted',
  reportNumberFormat: 'report_number_format',
  blockUnavailable: 'block_unavailable',
  uploadIncomplete: 'upload_incomplete',
  uploadRetry: 'upload_retry',
  uploading: 'uploading',
  publishing: 'publishing',
  publishFailedTitle: 'publish_failed_title',
  publishFailed: 'publish_failed',
  publishRejectedDefault: 'publish_rejected_default',
  publishStatusUnknown: 'publish_status_unknown',
  composeContentRequired: 'compose_content_required',
  videoUnavailable: 'video_unavailable',
  emojiUnavailable: 'emoji_unavailable',
  careerUnavailable: 'career_unavailable',
  editPublishedUnavailable: 'edit_published_unavailable',
  deleteSuccess: 'delete_success',
  profilePendingNickname: 'profile_pending_nickname',
  profilePendingDescription: 'profile_pending_description',
  profileUnknownUser: 'profile_unknown_user',
  commentSending: 'comment_sending',
} as const

export type CommunityCopyKey = typeof COMMUNITY_COPY_KEYS[keyof typeof COMMUNITY_COPY_KEYS]

export interface CommunityPostVO {
  id: number
  postNo?: string
  authorId: number
  authorUserNo?: string
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
  contentType?: CommunityContentType
  title?: string
  content: string
  imageUrls: string[]
  topicId?: number
  topicCode?: string
  topicName?: string
  likeCount: number
  commentCount: number
  liked: boolean
  followingAuthor: boolean
  hiddenAuthor?: boolean
  activityText?: string
  contactAction?: 'WHISPER' | 'PRIVATE_MESSAGE'
  createTime: string
  status?: CommunityContentStatus
  statusName?: string
  statusMessage?: string
  auditRemark?: string
}

export interface CommunityPostDetailVO extends CommunityPostVO {
  reportCount?: number
  auditStatus?: string
}

export interface CommunityCommentVO {
  id: number
  commentNo?: string
  postId: number
  postNo?: string
  authorId: number
  authorName: string
  authorAvatar: string
  parentCommentId?: number
  replyUserId?: number
  replyUserName?: string
  content: string
  status: string
  statusName?: string
  auditStatus?: string
  likeCount?: number
  liked?: boolean
  createTime: string
}

export interface CommunityDictOption {
  code: string
  label: string
  sort?: number
  enabled?: boolean
  tone?: string
}

export interface CommunityConfig {
  postMaxImages: number
  postMaxTextLength: number
  reportEntryEnabled: boolean
  topics: CommunityDictOption[]
  reportReasons: CommunityDictOption[]
  homeTabs: Array<{ entryKey: string; entryName: string; sort: number }>
  contentStatuses?: CommunityDictOption[]
  interactionTypes?: CommunityDictOption[]
  relationTypes?: CommunityDictOption[]
  copy?: Record<string, string>
}

export interface CommunityMetaVO extends CommunityConfig {
  reportTargetTypes?: CommunityDictOption[]
  publishStatuses?: CommunityDictOption[]
}

interface CommunityMetaPayloadVO extends Partial<CommunityMetaVO> {
  dictionaries?: Record<string, CommunityDictOption[]>
  copies?: Record<string, string>
  configs?: Record<string, string | number | boolean>
}

export interface CommunityTopicCardVO {
  id: number
  topicCode?: string
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
  topicCode?: string
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
  userNo?: string
  nickname: string
  photoUrl: string
  fateLabel: string
  educationSchool: string
  onlineText: string
  liked: boolean
}

export interface CommunityPublishResultVO {
  postNo: string
  postId?: number
  status: CommunityContentStatus
  statusName: string
  message: string
}

export interface CommunityCommentResultVO {
  commentNo: string
  commentId?: number
  status: string
  statusName: string
  message: string
  commentCount: number
}

export interface CommunityReportResultVO {
  reportNo: string
  status: string
  statusName: string
  message?: string
}

export interface CommunityDraftImageVO {
  url: string
  objectKey?: string
}

export interface CommunityDraftVO {
  contentType: CommunityContentType
  content: string
  topicId?: number
  topicCode?: string
  topicName?: string
  images: CommunityDraftImageVO[]
  version?: number
  updateTime?: string
}

export interface CommunityDraftSaveCommand {
  content: string
  topicId?: number
  topicCode?: string
  images: CommunityDraftImageVO[]
  version?: number
}

export interface CommunityProfileStatsVO {
  postCount: number
  followingCount: number
  followerCount: number
  receivedLikeCount: number
}

export interface CommunityInteractionRecordVO {
  id: string
  interactionType: CommunityInteractionType
  targetUserId?: number
  targetUserNo?: string
  nickname: string
  avatar: string
  description: string
  interactionTime?: string
  post?: CommunityPostVO
}

export interface CommunityRelationUserVO {
  userId: number
  userNo?: string
  nickname: string
  avatar: string
  description: string
  following: boolean
  mutualFollowing?: boolean
  interactionTime?: string
  commentSummary?: string
}

export interface CommunityProfileSummaryVO {
  nickname?: string
  avatar?: string
  description?: string
  stats: CommunityProfileStatsVO
}

export interface CommunityAuthorPreferenceResultVO {
  authorUserNo: string
  hidden: boolean
  message: string
}

export function resolveCommunityCopy(config: Pick<CommunityConfig, 'copy'> | undefined, key: CommunityCopyKey | string) {
  const configured = config?.copy?.[key]?.trim()
  if (configured) return configured
  const generic = key === COMMUNITY_COPY_KEYS.genericError ? '' : config?.copy?.[COMMUNITY_COPY_KEYS.genericError]?.trim()
  return generic || `community.copy.${key}`
}

export function resolveCommunityFeedback(config: Pick<CommunityConfig, 'copy'> | undefined, key: CommunityCopyKey | string, source?: unknown) {
  const serverMessage = readCommunityServerMessage(source)
  return serverMessage || resolveCommunityCopy(config, key)
}

export function resolveCommunityStatusLabel(config: CommunityConfig | undefined, status: string, statusName?: string) {
  const serverLabel = String(statusName || '').trim()
  if (serverLabel) return serverLabel
  const dictionaryLabel = [...(config?.publishStatuses || []), ...(config?.contentStatuses || [])]
    .find(item => item.code === status)?.label?.trim()
  return dictionaryLabel || resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.publishStatusUnknown)
}

function readCommunityServerMessage(source: unknown) {
  if (source instanceof Error) return source.message.trim()
  if (typeof source === 'string') return source.trim()
  if (!source || typeof source !== 'object') return ''
  const value = source as Record<string, unknown>
  for (const field of ['message', 'statusMessage', 'auditRemark', 'statusName']) {
    const text = typeof value[field] === 'string' ? value[field].trim() : ''
    if (text) return text
  }
  return ''
}

export function getCommunityPosts(scene: CommunityScene, page = 1, size = 10) {
  return get<PageVO<CommunityPostVO>>('/miniapp/community/posts', { scene, page, size })
}

export const getCommunityTopicHome = () => get<CommunityTopicHomeVO>('/miniapp/community/topics/home')
export const getCommunityTopics = (page = 1, size = 10) => get<PageVO<CommunityTopicCardVO>>('/miniapp/community/topics', { page, size })
export const getCommunityTopicDetail = (topicId: number | string) => get<CommunityTopicDetailVO>(`/miniapp/community/topics/${topicId}`)

export function getCommunityTopicPosts(topicId: number | string, sort: 'HOT' | 'LATEST' = 'HOT', page = 1, size = 10) {
  return get<PageVO<CommunityPostVO>>(`/miniapp/community/topics/${topicId}/posts`, { sort, page, size })
}

export const getYuemuUsers = (page = 1, size = 20) => get<PageVO<YuemuUserVO>>('/miniapp/community/yuemu', { page, size })
export const toggleYuemuLike = (targetUserId: number) => post<{ liked: boolean }>(`/miniapp/community/yuemu/${targetUserId}/like`)
export const getSincerePosts = (page = 1, size = 10) => get<PageVO<CommunityPostVO>>('/miniapp/community/posts', { postType: 'sincere_post', page, size })

export const getCommunityPostDetail = (postId: number | string) => get<CommunityPostDetailVO>(`/miniapp/community/posts/${postId}`)
export const getCommunityComments = (postId: number | string, page = 1, size = 20) => get<PageVO<CommunityCommentVO>>(`/miniapp/community/posts/${postId}/comments`, { page, size })
export const createCommunityComment = (postId: number | string, content: string, parentCommentId?: number, replyUserId?: number) => post<CommunityCommentResultVO>('/miniapp/community/comments', { postId, content, parentCommentId, replyUserId })
export const deleteCommunityComment = (commentId: number | string) => del<void>(`/miniapp/community/comments/${commentId}`)
export const deleteCommunityPost = (postId: number | string) => del<void>(`/miniapp/community/posts/${postId}`)

export const getCommunityConfig = () => get<CommunityConfig>('/miniapp/community/config')
export const getCommunityMeta = async () => normalizeCommunityMeta(await get<CommunityMetaPayloadVO>('/miniapp/community/meta'))
export const getFollowingCount = () => get<number>('/miniapp/community/following/count')
export const toggleCommunityFollow = (targetUserId: number | string) => post<{ following: boolean; followingCount?: number; followerCount?: number }>(`/miniapp/community/follows/${targetUserId}`)
export const toggleCommunityLike = (postId: number | string) => post<{ liked: boolean; likeCount: number }>(`/miniapp/community/posts/${postId}/like`)
export const toggleCommunityCommentLike = (commentId: number | string) => post<{ liked: boolean; likeCount: number }>(`/miniapp/community/comments/${commentId}/like`)

export function reportCommunityTarget(targetType: CommunityReportTargetType, targetId: number | string, reasonCode: string) {
  return post<CommunityReportResultVO>('/miniapp/community/reports', { targetType, targetId: String(targetId), reasonCode })
}

export const reportCommunityPost = (postId: number | string, reasonCode: string) => reportCommunityTarget('post', postId, reasonCode)

export function publishCommunityPost(content: string, imageUrls: string[], topicId: number, contentType: CommunityContentType = 'community_post') {
  return post<CommunityPublishResultVO>('/miniapp/community/posts', {
    contentType,
    postType: contentType,
    content,
    imageUrls,
    topicId,
  })
}

export const getCommunityDraft = (contentType: CommunityContentType) => get<CommunityDraftVO | null>(`/miniapp/community/drafts/${contentType}`)
export const saveCommunityDraft = (contentType: CommunityContentType, command: CommunityDraftSaveCommand) => put<CommunityDraftVO>(`/miniapp/community/drafts/${contentType}`, {
  content: command.content,
  topicId: command.topicId,
  topicCode: command.topicCode,
  images: command.images,
  version: command.version,
})
export const deleteCommunityDraft = (contentType: CommunityContentType) => del<void>(`/miniapp/community/drafts/${contentType}`)

export const getMyCommunityPosts = (page = 1, size = 20) => get<PageVO<CommunityPostVO>>('/miniapp/community/me/posts', { page, size })
export const getUserCommunityPosts = (userNo: string, page = 1, size = 20) => get<PageVO<CommunityPostVO>>(`/miniapp/community/users/${userNo}/posts`, { page, size })
export const getCommunityProfileSummary = () => get<CommunityProfileSummaryVO>('/miniapp/community/me/profile-summary')
export const getCommunityInteractions = (interactionType: CommunityInteractionType, page = 1, size = 20) => get<PageVO<CommunityInteractionRecordVO>>('/miniapp/community/me/interactions', { type: interactionType, page, size })
export const getCommunityViewHistory = (page = 1, size = 20) => get<PageVO<CommunityPostVO>>('/miniapp/community/me/view-history', { page, size })
export const clearCommunityViewHistory = () => del<void>('/miniapp/community/me/view-history')
export const recordCommunityView = (postId: number | string) => post<void>(`/miniapp/community/posts/${postId}/view`)

export const getCommunityFollowRelations = (relationType: CommunityRelationType, page = 1, size = 20) => get<PageVO<CommunityRelationUserVO>>('/miniapp/community/me/follows', { relation: relationType === 'followers' ? 'fans' : 'following', page, size })
export const getCommunityPostInteractors = (postId: number | string, interactionType: 'liked' | 'commented', page = 1, size = 20) => get<PageVO<CommunityRelationUserVO>>(`/miniapp/community/posts/${postId}/interactors`, { type: interactionType, page, size })

export const getHiddenCommunityAuthors = (page = 1, size = 20) => get<PageVO<CommunityRelationUserVO>>('/miniapp/community/me/hidden-authors', { page, size })
export const hideCommunityAuthor = (authorUserNo: number | string) => put<CommunityAuthorPreferenceResultVO>(`/miniapp/community/me/hidden-authors/${authorUserNo}`)
export const unhideCommunityAuthor = (authorUserNo: number | string) => del<CommunityAuthorPreferenceResultVO>(`/miniapp/community/me/hidden-authors/${authorUserNo}`)

function normalizeCommunityMeta(raw: CommunityMetaPayloadVO): CommunityMetaVO {
  const dictionaries = raw.dictionaries || {}
  const configs = raw.configs || {}
  const dictionary = (...keys: string[]) => keys.map(key => dictionaries[key]).find(Boolean) || []
  const config = (...keys: string[]) => keys.map(key => configs[key]).find(value => value !== undefined)
  return {
    postMaxImages: Number(raw.postMaxImages ?? config('postMaxImages', 'community.post_max_images')),
    postMaxTextLength: Number(raw.postMaxTextLength ?? config('postMaxTextLength', 'community.post_max_text_length')),
    reportEntryEnabled: toBoolean(raw.reportEntryEnabled ?? config('reportEntryEnabled', 'community.report_entry_enabled')),
    topics: raw.topics || dictionary('topics', 'communityTopic', 'community_topic'),
    reportReasons: raw.reportReasons || dictionary('reportReasons', 'communityReportReason', 'community_report_reason'),
    homeTabs: raw.homeTabs || [],
    contentStatuses: raw.contentStatuses || dictionary('contentStatuses', 'communityContentStatus', 'community_content_status'),
    interactionTypes: raw.interactionTypes || dictionary('interactionTypes', 'communityInteractionType', 'community_interaction_type'),
    relationTypes: raw.relationTypes || dictionary('relationTypes', 'communityRelationType', 'community_relation_type'),
    reportTargetTypes: raw.reportTargetTypes || dictionary('reportTargetTypes', 'communityReportTargetType', 'community_report_target_type'),
    publishStatuses: raw.publishStatuses || dictionary('publishStatuses', 'communityPublishStatus', 'community_publish_status'),
    copy: raw.copy || raw.copies || {},
  }
}

function toBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') return false
  if (typeof value === 'boolean') return value
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(String(value).trim().toLowerCase())
}
