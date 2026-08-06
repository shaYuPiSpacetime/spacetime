import type { PublicProfileVO } from './profile'
import type { CommunicationMode, RecommendCityVO } from './recommend'
import { get, post } from './request'

export interface IdealConditionVO {
  code: string
  category: string
  name: string
  available: boolean
  disabledReason?: string | null
}

export interface IdealMetaVO {
  preferenceVersion: number
  targetCities: RecommendCityVO[]
  minAge: number
  maxAge: number
  conditions: IdealConditionVO[]
  lastConditionCodes: string[]
  historyCount: number
  overseasAddressAvailable: boolean
  overseasAddressDisabledReason?: string | null
}

export interface IdealSearchReq extends Record<string, unknown> {
  requestId: string
  preferenceVersion: number
  targetCityCodes: string[]
  minAge: number
  maxAge: number
  conditionCodes: string[]
}

export interface IdealSearchVO {
  snapshotNo: string
  resultCount: number
  expiresAt: string
}

export interface IdealConditionSummaryVO {
  targetCities: RecommendCityVO[]
  minAge: number
  maxAge: number
  conditionNames: string[]
}

export interface IdealPricingVO {
  unitPrice: number
  discountPercent: number
  retentionDays: number
  batchMax: number
}

export interface IdealResultItemVO {
  itemNo: string
  unlocked: boolean
  blurAvatarUrl?: string | null
  ageBand?: string | null
  cityName?: string | null
  educationLabel?: string | null
  schoolSummary?: string | null
  matchedConditionNames: string[]
  candidateNo?: string | null
  profile?: PublicProfileVO | null
  communicationMode?: CommunicationMode | null
  unlockExpiresAt?: string | null
}

export interface IdealResultPageVO {
  snapshotNo: string
  status: 'active' | 'expired' | string
  summary: IdealConditionSummaryVO
  resultCount: number
  unlockableCount: number
  items: IdealResultItemVO[]
  nextCursor?: string | null
  pricing: IdealPricingVO
}

export interface IdealUnlockQuoteVO {
  quoteToken: string
  quoteExpiresAt: string
  snapshotNo: string
  candidateCount: number
  unitPrice: number
  originalCost: number
  discountPercent: number
  discountAmount: number
  payableCost: number
  currentBalance: number
  balanceEnough: boolean
  retentionDays: number
  batchMax: number
  unlockAll: boolean
}

export interface IdealUnlockedItemVO {
  itemNo: string
  candidateNo: string
  profile: PublicProfileVO
  communicationMode: 'PRIVATE_MESSAGE'
  unlockExpiresAt: string
}

export interface IdealUnlockConfirmVO {
  snapshotNo: string
  paidCost: number
  newBalance: number
  alreadyConfirmed: boolean
  unlockedItems: IdealUnlockedItemVO[]
}

export interface IdealSearchRecordVO {
  snapshotNo: string
  summary: IdealConditionSummaryVO
  resultCount: number
  status: string
  createdAt: string
  expiresAt: string
}

export interface IdealSearchRecordPageVO {
  items: IdealSearchRecordVO[]
  nextCursor?: string | null
  total: number
}

export interface IdealUnlockRecordVO {
  unlockNo: string
  scene: string
  snapshotNo: string
  itemNo: string
  unlockedAt: string
  expiresAt?: string | null
  status: string
  cost: number
  available: boolean
  profile?: PublicProfileVO | null
  communicationMode?: CommunicationMode | null
  educationLabel?: string | null
  schoolSummary?: string | null
  matchedConditionNames?: string[]
}

export interface IdealUnlockRecordPageVO {
  items: IdealUnlockRecordVO[]
  nextCursor?: string | null
  total: number
}

export interface IdealHelpVO {
  title: string
  intro: string
  resultDescription: string
  unlockDescription: string
  pricing: IdealPricingVO
}

export function getIdealMeta(): Promise<IdealMetaVO> {
  return get<IdealMetaVO>('/miniapp/ideal/meta')
}

export function createIdealSearch(data: IdealSearchReq): Promise<IdealSearchVO> {
  return post<IdealSearchVO>('/miniapp/ideal/search', data)
}

export function getIdealResults(snapshotNo: string, cursor?: string): Promise<IdealResultPageVO> {
  return get<IdealResultPageVO>(`/miniapp/ideal/snapshots/${snapshotNo}/results`, { cursor })
}

export function quoteIdealUnlock(
  snapshotNo: string,
  itemNos: string[]
): Promise<IdealUnlockQuoteVO> {
  return post<IdealUnlockQuoteVO>('/miniapp/ideal/unlock/quote', { snapshotNo, itemNos })
}

export function quoteAllIdealUnlock(snapshotNo: string): Promise<IdealUnlockQuoteVO> {
  return post<IdealUnlockQuoteVO>('/miniapp/ideal/unlock-all/quote', { snapshotNo })
}

export function confirmIdealUnlock(
  quoteToken: string,
  requestId: string
): Promise<IdealUnlockConfirmVO> {
  return post<IdealUnlockConfirmVO>('/miniapp/ideal/unlock/confirm', { quoteToken, requestId })
}

export function getIdealSearchRecords(cursor?: string): Promise<IdealSearchRecordPageVO> {
  return get<IdealSearchRecordPageVO>('/miniapp/ideal/search-records', { cursor })
}

export function getIdealUnlocks(
  status: 'all' | 'active' | 'inactive' = 'all',
  cursor?: string
): Promise<IdealUnlockRecordPageVO> {
  return get<IdealUnlockRecordPageVO>('/miniapp/ideal/unlocks', { status, cursor })
}

export function getIdealHelp(): Promise<IdealHelpVO> {
  return get<IdealHelpVO>('/miniapp/ideal/help')
}
