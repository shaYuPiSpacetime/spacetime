import request from './request';

export interface VerificationVO {
  id: number;
  userId: number;
  avatar: string;
  nickname: string;
  phone?: string;
  realName?: string;
  idCard?: string;
  educationIdentity?: string;
  educationMaterialSummary?: string;
  avatarUrl?: string;
  status: string;
  auditSource: string;
  rejectReason: string;
  submitTime: string;
  resultTime?: string;
}

export interface ModerationVO {
  id: number;
  userId: number;
  avatar: string;
  nickname: string;
  contentType: string;
  imageType?: string;
  imageCategory?: string;
  imageUrl?: string;
  textType?: string;
  contentTitle?: string;
  questionKey?: string;
  textSummary?: string;
  contentPreview: string;
  status: string;
  auditSource: string;
  rejectReason: string;
  submitTime: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export interface VerificationStatsVO {
  pendingCount: number;
  reviewingCount: number;
  approvedTodayCount: number;
  rejectedTodayCount: number;
  expiredCount: number;
}

export interface VerificationPageParams {
  page: number;
  size: number;
  keyword?: string;
  status?: string;
  auditSource?: string;
  submitTime?: string;
  educationMethod?: string;
  imageType?: string;
  textType?: string;
}

export interface FieldEntry {
  label: string;
  value: string;
}

export interface AuditHistoryVO {
  id: number;
  auditRecordId: number;
  fromStatus: string;
  toStatus: string;
  auditSource: string;
  action: string;
  reason?: string;
  operatorType: string;
  operatorName: string;
  providerTaskId?: number;
  createTime: string;
}

export interface VerificationAuditDetailVO {
  id: number;
  userId: number;
  nickname: string;
  avatar: string;
  verifyLevel: number;
  fields: FieldEntry[];
  sensitiveFields?: FieldEntry[];
  submitTime: string;
  resultTime: string;
  rejectReason: string;
  status: string;
  auditSource: string;
  mediaUrl?: string;
  thumbUrl?: string;
  historyPage?: PageResult<AuditHistoryVO>;
}

export interface ModerationDetailVO {
  id: number;
  userId: number;
  nickname: string;
  avatar: string;
  contentType: string;
  imageType?: string;
  contentFull: string;
  contentField?: string;
  contentTitle?: string;
  questionKey?: string;
  submitTime: string;
  status: string;
  auditSource: string;
  rejectReason: string;
  historyPage?: PageResult<AuditHistoryVO>;
}

export function getRealNamePage(params: VerificationPageParams) {
  return request.get('/admin/verify/real-name/list', { params });
}

export function getEducationPage(params: VerificationPageParams) {
  return request.get('/admin/verify/education/list', { params });
}

export function getAvatarPage(params: VerificationPageParams) {
  return request.get('/admin/verify/avatar/list', { params });
}

export function getRealNameStats() {
  return request.get('/admin/verify/real-name/stats');
}

export function getEducationStats() {
  return request.get('/admin/verify/education/stats');
}

export function getAvatarStats() {
  return request.get('/admin/verify/avatar/stats');
}

export function auditRealName(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/verify/real-name/${id}/audit`, data);
}

export function auditEducation(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/verify/education/${id}/audit`, data);
}

export function auditAvatar(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/verify/avatar/${id}/audit`, data);
}

export function getPhotoModerationPage(params: VerificationPageParams) {
  return request.get('/admin/moderation/photos/list', { params });
}

export function getTextModerationPage(params: VerificationPageParams) {
  return request.get('/admin/moderation/texts/list', { params });
}

export function getPhotoModerationStats() {
  return request.get('/admin/moderation/photos/stats');
}

export function getTextModerationStats() {
  return request.get('/admin/moderation/texts/stats');
}

export function auditPhoto(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/moderation/photos/${id}/audit`, data);
}

export function auditText(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/moderation/texts/${id}/audit`, data);
}

export function getRealNameDetail(id: number, params?: { historyPage?: number; historySize?: number }) {
  return request.get(`/admin/verify/real-name/${id}`, { params });
}

export function getEducationDetail(id: number, params?: { historyPage?: number; historySize?: number }) {
  return request.get(`/admin/verify/education/${id}`, { params });
}

export function getAvatarDetail(id: number, params?: { historyPage?: number; historySize?: number }) {
  return request.get(`/admin/verify/avatar/${id}`, { params });
}

export function getPhotoModerationDetail(id: number, params?: { historyPage?: number; historySize?: number }) {
  return request.get(`/admin/moderation/photos/${id}`, { params });
}

export function getTextModerationDetail(id: number, params?: { historyPage?: number; historySize?: number }) {
  return request.get(`/admin/moderation/texts/${id}`, { params });
}
