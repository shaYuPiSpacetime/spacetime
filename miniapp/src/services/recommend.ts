import type { PublicProfileVO } from './profile'
import { get, post, put } from './request'

export type CommunicationMode = 'WHISPER' | 'PRIVATE_MESSAGE'

export interface RecommendCityVO {
  code: string
  name: string
}

export interface RecommendAdvancedFilterVO {
  minHeight?: number | null
  maxHeight?: number | null
  minWeight?: number | null
  maxWeight?: number | null
  educationCodes: string[]
  hometowns: string[]
  schoolCodes: string[]
  schoolFilterAvailable: boolean
  majorNames: string[]
}

export interface RecommendPreferenceVO {
  version: number
  targetCities: RecommendCityVO[]
  allowNeighborCity: boolean
  neighborCityAvailable: boolean
  neighborCityDisabledReason?: string | null
  minAge: number
  maxAge: number
  advanced: RecommendAdvancedFilterVO
  vipEffective: boolean
  advancedEffectiveCount: number
  defaulted: boolean
}

export interface RecommendPreferenceSaveReq extends Record<string, unknown> {
  version: number
  targetCityCodes: string[]
  allowNeighborCity: boolean
  minAge: number
  maxAge: number
  minHeight?: number
  maxHeight?: number
  minWeight?: number
  maxWeight?: number
  educationCodes?: string[]
  hometowns?: string[]
  schoolCodes?: string[]
  majorNames?: string[]
}

export interface RecommendCandidateVO {
  candidateNo: string
  userId: number
  profile: PublicProfileVO
  liked: boolean
  communicationMode: CommunicationMode
  actualCity?: string | null
}

export interface RecommendCandidatePageVO {
  items: RecommendCandidateVO[]
  nextCursor?: string | null
  remainingBrowseCount?: number | null
  waitingReason?: 'no_candidate' | 'browse_limit' | null
  preferenceVersion: number
}

export interface RecommendViewActionReq extends Record<string, unknown> {
  requestId: string
  filterVersion?: number
  position?: number
}

export interface RecommendReplayItemVO {
  candidateNo: string
  profile: PublicProfileVO
  viewedAt: string
  lastAction: string
  dateGroup: string
  liked: boolean
}

export interface RecommendReplayPageVO {
  items: RecommendReplayItemVO[]
  nextCursor?: string | null
}

export interface MeetingPreferenceOptionVO {
  code: string
  label: string
  enabled: boolean
}

export interface MeetingPreferenceVO {
  meetingPreference?: string | null
  meetingPreferenceLabel?: string | null
  preferredActivities: string[]
  preferredActivityLabels: string[]
  meetingPreferenceOptions: MeetingPreferenceOptionVO[]
  preferredActivityOptions: MeetingPreferenceOptionVO[]
  maxActivities: number
  updatedAt?: string | null
  dictionaryAvailable: boolean
}

export function getRecommendPreferences(): Promise<RecommendPreferenceVO> {
  return get<RecommendPreferenceVO>('/miniapp/recommend/preferences')
}

export function saveRecommendPreferences(data: RecommendPreferenceSaveReq): Promise<RecommendPreferenceVO> {
  return put<RecommendPreferenceVO>('/miniapp/recommend/preferences', data)
}

export function getRecommendCandidates(cursor?: string): Promise<RecommendCandidatePageVO> {
  return get<RecommendCandidatePageVO>('/miniapp/recommend/candidates', { cursor })
}

export function recordRecommendView(candidateNo: string, data: RecommendViewActionReq): Promise<null> {
  return post<null>(`/miniapp/recommend/candidates/${candidateNo}/view`, data)
}

export function recordRecommendSkip(candidateNo: string, data: RecommendViewActionReq): Promise<null> {
  return post<null>(`/miniapp/recommend/candidates/${candidateNo}/skip`, data)
}

export function recordRecommendLike(candidateNo: string, data: RecommendViewActionReq): Promise<null> {
  return post<null>(`/miniapp/recommend/candidates/${candidateNo}/like`, data)
}

export function neverRecommendCandidate(candidateNo: string, data: RecommendViewActionReq): Promise<null> {
  return post<null>(`/miniapp/recommend/candidates/${candidateNo}/never`, data)
}

export function getRecommendReplay(): Promise<RecommendReplayPageVO> {
  return get<RecommendReplayPageVO>('/miniapp/recommend/replay')
}

export function getMeetingPreference(): Promise<MeetingPreferenceVO> {
  return get<MeetingPreferenceVO>('/miniapp/recommend/meeting-preference')
}

export function saveMeetingPreference(data: {
  meetingPreference?: string | null
  preferredActivities: string[]
}): Promise<MeetingPreferenceVO> {
  return put<MeetingPreferenceVO>('/miniapp/recommend/meeting-preference', data)
}
