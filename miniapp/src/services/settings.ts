import { get, post } from './request'
import type {
  AccountCancelCheck,
  AccountCancelStatus,
  ComplianceContentDetail,
  ContentArticleDetail,
  ContentArticleSummary,
  ContentPage,
  SearchResultPage,
  SearchRuntimeConfig,
  SearchSourceScene,
  SettingsHome,
} from '@/types/settings'

export const settingsApi = {
  home: () => get<SettingsHome>('/miniapp/settings/home'),
  cancelStatus: () => get<AccountCancelStatus>('/miniapp/account/cancel-status'),
  cancelCheck: () => get<AccountCancelCheck>('/miniapp/account/cancel-check'),
  applyCancel: (reason: string, recheckToken?: string) =>
    post<number>('/miniapp/account/cancel', { confirm: true, reason, recheckToken }),
  revokeCancel: () => post<void>('/miniapp/account/cancel/revoke'),
  logout: () => post<void>('/miniapp/logout'),
  publicConfig: (keys: string[]) =>
    get<Record<string, string>>('/miniapp/content/config', { keys: keys.join(',') }),
  announcements: (page = 1, size = 20) =>
    get<ContentPage<ContentArticleSummary>>('/miniapp/content/announcements', { page, size }),
  articleDetail: (id: number) => get<ContentArticleDetail>(`/miniapp/content/articles/${id}`),
  complianceDetail: (contentCode: string) =>
    get<ComplianceContentDetail>(`/miniapp/content/compliance/${encodeURIComponent(contentCode)}`),
  searchConfig: () => get<SearchRuntimeConfig>('/miniapp/search/config'),
  search: (
    keyword: string,
    type: string,
    page = 1,
    size = 20,
    sourceScene: SearchSourceScene = 'global',
  ) => get<SearchResultPage>('/miniapp/search/results', { keyword, type, page, size, sourceScene }),
}
