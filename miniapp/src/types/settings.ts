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
}

export interface AccountCancelStatus {
  id?: number
  status: 'NONE' | 'COOLING_OFF' | 'REVOKED' | 'CANCELLED' | 'BLOCKED' | string
  reason?: string
  blockReason?: string
  coolingEndTime?: string
  coolingDays?: number
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

export interface ContentPage<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
