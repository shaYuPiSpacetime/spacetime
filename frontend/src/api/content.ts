import request from './request';

// ===== Interfaces =====

export interface ContentArticleVO {
  id: number;
  type: string;
  category: string;
  title: string;
  summary: string;
  coverUrl: string;
  contentType: string;
  contentUrl: string;
  contentBody: string;
  sort: number;
  status: string;
  effectiveTime: string;
  expireTime: string;
  createTime: string;
}

export interface AppConfigVO {
  id: number;
  configKey: string;
  configValue: string;
  configGroup: string;
  configType: string;
  publicVisible: number;
  status: string;
  remark: string;
  updateTime: string;
}

export interface MobileEntryConfigVO {
  id: number;
  pageCode: string;
  entryKey: string;
  entryName: string;
  icon: string;
  jumpType: string;
  jumpTarget: string;
  badgeText: string;
  badgeType: string;
  loginRequired: number;
  sort: number;
  status: string;
  extraJson: string;
  createTime: string;
}

export interface SearchHotWordVO {
  id: number;
  word: string;
  scene: string;
  sort: number;
  status: string;
  createTime: string;
}

export interface SearchBlockWordVO {
  id: number;
  word: string;
  blockType: string;
  matchType: string;
  reasonCode: string;
  hitMessage: string;
  status: string;
  remark: string;
  createTime: string;
}

export interface ContentOperationLogVO {
  id: number;
  bizType: string;
  bizId: number;
  action: string;
  beforeValue: string;
  afterValue: string;
  operatorName: string;
  remark: string;
  createTime: string;
}

// ===== Content Article APIs =====

export function getArticleList(params: { type?: string; category?: string; title?: string; status?: string; page: number; size: number }) {
  return request.get('/admin/content/articles/list', { params });
}

export function getArticleDetail(id: number) {
  return request.get(`/admin/content/articles/${id}`);
}

export function createArticle(data: Partial<ContentArticleVO>) {
  return request.post('/admin/content/articles', data);
}

export function updateArticle(id: number, data: Partial<ContentArticleVO>) {
  return request.put(`/admin/content/articles/${id}`, data);
}

export function updateArticleStatus(id: number, status: string) {
  return request.put(`/admin/content/articles/${id}/status`, { status });
}

export function deleteArticle(id: number) {
  return request.delete(`/admin/content/articles/${id}`);
}

// ===== App Config APIs =====

export function getAppConfigList(group?: string) {
  return request.get('/admin/content/app-config/list', { params: { group } });
}

export function getAppConfig(key: string) {
  return request.get(`/admin/content/app-config/${key}`);
}

export function batchSaveAppConfig(items: Partial<AppConfigVO>[]) {
  return request.post('/admin/content/app-config/batch', { items });
}

// ===== Mobile Entry APIs =====

export function getMobileEntryList(pageCode: string) {
  return request.get('/admin/content/mobile-entries/list', { params: { pageCode } });
}

export function createMobileEntry(data: Partial<MobileEntryConfigVO>) {
  return request.post('/admin/content/mobile-entries', data);
}

export function updateMobileEntry(id: number, data: Partial<MobileEntryConfigVO>) {
  return request.put(`/admin/content/mobile-entries/${id}`, data);
}

export function updateMobileEntryStatus(id: number, status: string) {
  return request.put(`/admin/content/mobile-entries/${id}/status`, { status });
}

export function sortMobileEntries(items: { id: number; sort: number }[]) {
  return request.put('/admin/content/mobile-entries/sort', { items });
}

export function deleteMobileEntry(id: number) {
  return request.delete(`/admin/content/mobile-entries/${id}`);
}

// ===== Search Hot Word APIs =====

export function getHotWordList(params: { word?: string; scene?: string; status?: string; page: number; size: number }) {
  return request.get('/admin/content/search-hot-words/list', { params });
}

export function createHotWord(data: Partial<SearchHotWordVO>) {
  return request.post('/admin/content/search-hot-words', data);
}

export function updateHotWord(id: number, data: Partial<SearchHotWordVO>) {
  return request.put(`/admin/content/search-hot-words/${id}`, data);
}

export function updateHotWordStatus(id: number, status: string) {
  return request.put(`/admin/content/search-hot-words/${id}/status`, { status });
}

export function deleteHotWord(id: number) {
  return request.delete(`/admin/content/search-hot-words/${id}`);
}

// ===== Search Block Word APIs =====

export function getBlockWordList(params: { word?: string; blockType?: string; status?: string; page: number; size: number }) {
  return request.get('/admin/content/search-block-words/list', { params });
}

export function createBlockWord(data: Partial<SearchBlockWordVO>) {
  return request.post('/admin/content/search-block-words', data);
}

export function updateBlockWord(id: number, data: Partial<SearchBlockWordVO>) {
  return request.put(`/admin/content/search-block-words/${id}`, data);
}

export function updateBlockWordStatus(id: number, status: string) {
  return request.put(`/admin/content/search-block-words/${id}/status`, { status });
}

export function deleteBlockWord(id: number) {
  return request.delete(`/admin/content/search-block-words/${id}`);
}

// ===== Operation Log APIs =====

export function getOperationLogList(params: { bizType?: string; action?: string; page: number; size: number }) {
  return request.get('/admin/content/operation-logs/list', { params });
}
