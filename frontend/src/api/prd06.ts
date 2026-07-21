import request from './request';

export interface ComplianceContentVO {
  id: number;
  contentCode: string;
  contentType: string;
  contentTypeLabel?: string;
  title: string;
  version: string;
  status: string;
  effectiveTime?: string;
  contentUrl?: string;
  contentBody?: string;
  h5Url?: string;
}

export interface SearchBlockWordVO {
  id: number;
  word: string;
  blockType: string;
  matchType: string;
  reasonCode: string;
  hitMessage?: string;
  status: string;
  updateByName?: string;
  updatedBy?: string;
  updateTime?: string;
  createTime?: string;
}

export interface CancelRequestVO {
  id: number;
  requestNo?: string;
  userId?: number;
  userCode?: string;
  nickname?: string;
  phone?: string;
  reason?: string;
  status: string;
  blockReason?: string;
  blockReasons?: string[];
  coolingEndTime?: string;
  revokedTime?: string;
  finalCancelTime?: string;
  createTime?: string;
  vipRisk?: string;
  refundRisk?: string;
  coinBalance?: number;
  executionLog?: string;
  remark?: string;
  remarks?: string[];
}

export function getComplianceContentList(params?: { page?: number; size?: number }) {
  return request.get('/admin/mobile-config/compliance', { params });
}

export function updateComplianceContent(id: number, data: Pick<ComplianceContentVO, 'title' | 'status'> & { contentUrl: string }) {
  return request.put(`/admin/mobile-config/compliance/${id}`, data);
}

export function getPrd06BlockWordList(params: {
  word?: string;
  blockType?: string;
  matchType?: string;
  reasonCode?: string;
  status?: string;
  page: number;
  size: number;
}) {
  return request.get('/admin/content/search-block-words/list', { params });
}

export function createPrd06BlockWord(data: Partial<SearchBlockWordVO>) {
  return request.post('/admin/content/search-block-words', data);
}

export function updatePrd06BlockWord(id: number, data: Partial<SearchBlockWordVO>) {
  return request.put(`/admin/content/search-block-words/${id}`, data);
}

export function updatePrd06BlockWordStatus(id: number, status: string) {
  return request.put(`/admin/content/search-block-words/${id}/status`, { status });
}

export function getPrd06CancelRequestList(params: {
  page: number;
  size: number;
  keyword?: string;
  userId?: number;
  status?: string;
}) {
  return request.get('/admin/user-security/cancel-requests/list', { params });
}

export function getPrd06CancelRequestDetail(id: number) {
  return request.get(`/admin/user-security/cancel-requests/${id}`);
}

export function appendPrd06CancelRequestRemark(id: number, remark: string) {
  return request.put(`/admin/user-security/cancel-requests/${id}/remark`, { remark });
}
