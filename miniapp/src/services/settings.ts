import { get, post } from './request'
import type {
  AccountCancelStatus,
  ContentArticleDetail,
  ContentArticleSummary,
  ContentPage,
  SettingsHome,
} from '@/types/settings'

export const settingsApi = {
  home: () => get<SettingsHome>('/miniapp/settings/home'),
  cancelStatus: () => get<AccountCancelStatus>('/miniapp/account/cancel-status'),
  applyCancel: (reason: string) => post<number>('/miniapp/account/cancel', { confirm: true, reason }),
  revokeCancel: () => post<void>('/miniapp/account/cancel/revoke'),
  logout: () => post<void>('/miniapp/logout'),
  publicConfig: (keys: string[]) =>
    get<Record<string, string>>('/miniapp/content/config', { keys: keys.join(',') }),
  announcements: (page = 1, size = 20) =>
    get<ContentPage<ContentArticleSummary>>('/miniapp/content/announcements', { page, size }),
  articleDetail: (id: number) => get<ContentArticleDetail>(`/miniapp/content/articles/${id}`),
}
