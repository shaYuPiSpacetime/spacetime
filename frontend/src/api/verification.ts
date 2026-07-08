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

// 认证审核接口。
export interface VerificationPageParams {
  page: number;
  size: number;
  keyword?: string;
  status?: string;
  auditSource?: string;
  submitTime?: string;
  faceRecognition?: string;
  coreAccessStatus?: string;
  educationMethod?: string;
  imageType?: string;
  textType?: string;
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

export function auditRealName(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/verify/real-name/${id}/audit`, data);
}

export function auditEducation(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/verify/education/${id}/audit`, data);
}

export function auditAvatar(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/verify/avatar/${id}/audit`, data);
}

// 内容审核接口。
export function getPhotoModerationPage(params: VerificationPageParams) {
  return request.get('/admin/moderation/photos/list', { params });
}

export function getTextModerationPage(params: VerificationPageParams) {
  return request.get('/admin/moderation/texts/list', { params });
}

export function auditPhoto(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/moderation/photos/${id}/audit`, data);
}

export function auditText(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/moderation/texts/${id}/audit`, data);
}

// 认证与内容审核详情接口。
export interface FieldEntry {
  label: string;
  value: string;
}

export interface VerificationAuditDetailVO {
  id: number;
  userId: number;
  nickname: string;
  avatar: string;
  verifyLevel: number;
  fields: FieldEntry[];
  submitTime: string;
  resultTime: string;
  rejectReason: string;
  status: string;
  auditSource: string;
}

export interface ModerationDetailVO {
  id: number;
  userId: number;
  nickname: string;
  avatar: string;
  contentType: string;
  contentFull: string;
  contentField: string;
  submitTime: string;
  status: string;
  auditSource: string;
  rejectReason: string;
}

export function getRealNameDetail(id: number) {
  return request.get(`/admin/verify/real-name/${id}`);
}

export function getEducationDetail(id: number) {
  return request.get(`/admin/verify/education/${id}`);
}

export function getAvatarDetail(id: number) {
  return request.get(`/admin/verify/avatar/${id}`);
}

export function getPhotoModerationDetail(id: number) {
  return request.get(`/admin/moderation/photos/${id}`);
}

export function getTextModerationDetail(id: number) {
  return request.get(`/admin/moderation/texts/${id}`);
}
