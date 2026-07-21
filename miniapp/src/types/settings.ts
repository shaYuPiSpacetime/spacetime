export type SettingsJumpType = 'NATIVE_ROUTE' | 'H5' | 'MINI_PROGRAM' | 'NONE'

export interface SettingsEntry {
  entryKey: string
  entryName: string
  icon?: string
  jumpType: SettingsJumpType
  jumpTarget?: string
  badgeText?: string
  badgeType?: string
  loginRequired?: number
  sort?: number
}

export interface SettingsHome {
  phoneBindStatus: string
  maskedPhone?: string
  wechatBindStatus: string
  entries: SettingsEntry[]
  currentVersion?: string
  accountStatus?: string
}

export interface AccountCancelStatus {
  id?: number
  status: 'NONE' | 'COOLING_OFF' | 'REVOKED' | 'CANCELLED' | 'BLOCKED' | string
  reason?: string
  blockReason?: string
  coolingEndTime?: string
  coolingDays?: number
}

export interface AccountCancelCheckItem {
  code: string
  title: string
  description?: string
  severity?: string
}

export interface AccountCancelCheck {
  canSubmit: boolean
  coolingDays?: number
  description?: string
  reasons: string[]
  recheckToken?: string
  hardBlocks: AccountCancelCheckItem[]
  risks: AccountCancelCheckItem[]
}

export interface ContentArticleSummary {
  id: number
  type: string
  category?: string
  title: string
  summary?: string
  coverUrl?: string
  contentType?: string
  contentUrl?: string
  createTime?: string
}

export interface ContentArticleDetail extends ContentArticleSummary {
  contentBody?: string
}

export interface ComplianceContentDetail {
  id?: number
  contentCode: string
  contentType?: string
  title: string
  version?: string
  linkType?: SettingsJumpType | string
  contentUrl?: string
  url?: string
  contentBody?: string
  nativeContent?: string
  summary?: string
  effectiveTime?: string
  updateTime?: string
}

export type SearchSourceScene = 'global' | 'community' | 'recommend'
export type SearchResultTab = 'users' | 'posts' | 'topics'

export interface SearchResultItem {
  id: number
  type: 'user' | 'post' | 'topic' | string
  title: string
  subtitle?: string
  avatar?: string
}

export interface SearchResultPage {
  keyword: string
  type: string
  tabs?: string[]
  items: SearchResultItem[]
  hasMore?: boolean
  totalCount?: number
  violation?: boolean
  message?: string
}

export interface SearchRuntimeConfig {
  emptyStateText?: string
  violationText?: string
  defaultSort?: string
}

export interface ContentPage<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
