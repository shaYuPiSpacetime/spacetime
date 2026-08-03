import { del, get, post } from './request'

export type RelationDisplayStatus = 'blur' | 'clear'
export type RelationAccessMode = 'BLUR_LIMIT' | 'MIXED' | 'VIP_ALL_CLEAR'
export type RelationSourceScene = 'fate' | 'featured' | 'ideal' | 'profile' | 'likes_me' | 'recent_viewers'
export type RelationUnlockScene = 'likes_unlock_one' | 'viewers_unlock_one'
export type RelationUnlockBizType = 'like' | 'visit'
export type MatchPopupAction = 'later' | 'close' | 'profile' | 'chat' | 'system_back'

export interface RelationUserCardBase {
  recordNo: string
  userId: number | null
  displayStatus: RelationDisplayStatus
  nickname?: string | null
  avatar?: string | null
  age?: number | null
  school?: string | null
  onlineStatus?: 'online' | 'offline'
  lastActiveTime?: string | null
  onlineText?: string
  identityCode?: string | null
  identityLabel?: string | null
  industryCode?: string | null
  industryLabel?: string | null
  occupationCode?: string | null
  occupationLabel?: string | null
  company?: string | null
  annualIncomeCode?: string | null
  annualIncomeLabel?: string | null
  weakTags?: string[]
  sourceScene?: RelationSourceScene | string
  mutualLike?: boolean
  unlockTime?: string | null
}

export interface LikesMePreviewAvatar {
  recordNo: string
  displayStatus: RelationDisplayStatus
  avatar?: string | null
  onlineStatus?: 'online' | 'offline'
}

export interface LikesMeItemVO extends RelationUserCardBase {
  userId: number | null
  sourceScene: RelationSourceScene | string
  isNew: boolean
  groupKey: 'new' | 'earlier_unlocked' | 'earlier_locked' | string
  likedTime: string
  likeActionCopy?: string
}

export interface LikesMePageVO {
  current: number
  size: number
  total: number
  newCount: number
  visibleTotal: number
  hiddenCount: number
  pages: number
  readCursor: string | null
  newLikePreviewAvatars: LikesMePreviewAvatar[]
  accessMode: RelationAccessMode
  hasMore: boolean
  records: LikesMeItemVO[]
}

export interface RecentViewerItemVO extends RelationUserCardBase {
  userId: number
  groupKey: 'today' | 'yesterday' | 'recent7d' | string
  visitCount: number
  firstVisitTime?: string
  lastVisitTime: string
  relationBadges?: string[]
}

export interface RecentViewersPageVO {
  current: number
  size: number
  total: number
  visibleTotal: number
  hiddenCount: number
  pages: number
  accessMode: RelationAccessMode
  hasMore: boolean
  visibleDays: number
  totalPv: number
  visitorUv7d: number
  visitorPv7d: number
  todayVisitorUv: number
  todayVisitPv: number
  records: RecentViewerItemVO[]
}

export interface MutualMatchItemVO {
  matchNo: string
  userId: number
  nickname: string
  avatar?: string | null
  age?: number | null
  height?: number | null
  currentCity?: string | null
  hometownCity?: string | null
  primarySource?: string
  activeSources?: string[]
  matchStatus?: string
  matchTime?: string
  canEnterConversation?: boolean
}

export interface MutualMatchPageVO {
  current: number
  size: number
  total: number
  pages: number
  hasMore: boolean
  records: MutualMatchItemVO[]
}

export interface RelationLikeActionVO {
  likeNo?: string
  likeStatus: 'active' | 'cancelled' | string
  matched: boolean
  matchNo?: string | null
  matchStatus?: string | null
  canEnterConversation?: boolean
}

export interface RelationVisitActionVO {
  visitNo: string
  deduplicated: boolean
  visitCount: number
  recordedTime?: string
}

export interface MatchPopupVO {
  matchNo: string
  matchedUserId: number
  nickname: string
  avatar?: string | null
  matchSource?: string
  matchTime?: string
  canEnterConversation?: boolean
  popupStatus?: 'pending' | string
}

export interface UnlockQuoteVO {
  quoteToken: string | null
  scene: RelationUnlockScene | string
  targetBizType: RelationUnlockBizType | string
  targetBizNo: string
  targetUserId: number | null
  unitPrice: number
  coinBalance: number
  alreadyUnlocked: boolean
  expireAt?: string | null
}

export interface UnlockConfirmVO {
  unlockNo: string
  targetBizType: RelationUnlockBizType | string
  targetBizNo: string
  targetUserId: number
  status: string
  coinCost: number
  coinBalance: number
  displayStatus: RelationDisplayStatus
  charged: boolean
  effectiveTime?: string
  expireTime?: string | null
}

export function getLikesMePage(page = 1, size = 20, snapshotCursor?: string): Promise<LikesMePageVO> {
  return get<LikesMePageVO>('/miniapp/relation/likes-me', { page, size, snapshotCursor })
}

export function markLikesMeRead(readCursor: string): Promise<null> {
  return post<null>('/miniapp/relation/likes-me/read', { readCursor })
}

export function getRecentViewersPage(page = 1, size = 20): Promise<RecentViewersPageVO> {
  return get<RecentViewersPageVO>('/miniapp/relation/recent-viewers', { page, size })
}

export function getMutualMatches(page = 1, size = 20): Promise<MutualMatchPageVO> {
  return get<MutualMatchPageVO>('/miniapp/relation/mutual-matches', { page, size })
}

export function sendRelationLike(
  targetUserId: number,
  sourceScene: RelationSourceScene,
  requestId: string,
): Promise<RelationLikeActionVO> {
  return post<RelationLikeActionVO>('/miniapp/relation/likes', { requestId, targetUserId, sourceScene })
}

export function cancelRelationLike(targetUserId: number): Promise<RelationLikeActionVO> {
  return del<RelationLikeActionVO>(`/miniapp/relation/likes/${targetUserId}`)
}

export const deleteRelationLike = cancelRelationLike

export function reportRelationVisit(
  targetUserId: number,
  sourceScene: RelationSourceScene,
  eventNo: string,
): Promise<RelationVisitActionVO> {
  return post<RelationVisitActionVO>('/miniapp/relation/visits', { eventNo, targetUserId, sourceScene })
}

export function getPendingMatchPopup(): Promise<MatchPopupVO | null> {
  return get<MatchPopupVO | null>('/miniapp/relation/match-popup/pending')
}

export function markMatchPopupRead(matchNo: string, action: MatchPopupAction): Promise<null> {
  return post<null>(`/miniapp/relation/match-popup/${matchNo}/read`, { action })
}

export function quoteRelationUnlock(
  scene: RelationUnlockScene,
  targetBizType: RelationUnlockBizType,
  targetBizNo: string,
): Promise<UnlockQuoteVO> {
  return post<UnlockQuoteVO>('/miniapp/asset/unlock/quote', { scene, targetBizType, targetBizNo })
}

export function confirmRelationUnlock(quoteToken: string, requestId: string): Promise<UnlockConfirmVO> {
  return post<UnlockConfirmVO>('/miniapp/asset/unlock/confirm', { requestId, quoteToken })
}
