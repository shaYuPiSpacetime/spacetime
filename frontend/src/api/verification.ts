import request from './request';

export interface VerificationVO {
  id: number;
  userId: number;
  avatar: string;
  nickname: string;
  status: string;
  rejectReason: string;
  submitTime: string;
}

export interface ModerationVO {
  id: number;
  userId: number;
  avatar: string;
  nickname: string;
  contentType: string;
  contentPreview: string;
  status: string;
  rejectReason: string;
  submitTime: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

// Verification APIs
export function getRealNamePage(params: { page: number; size: number; keyword?: string; status?: string }) {
  return request.get('/admin/verify/real-name/list', { params });
}

export function getEducationPage(params: { page: number; size: number; keyword?: string; status?: string }) {
  return request.get('/admin/verify/education/list', { params });
}

export function getAvatarPage(params: { page: number; size: number; keyword?: string; status?: string }) {
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

// Moderation APIs
export function getPhotoModerationPage(params: { page: number; size: number; keyword?: string; status?: string }) {
  return request.get('/admin/moderation/photos/list', { params });
}

export function getTextModerationPage(params: { page: number; size: number; keyword?: string; status?: string }) {
  return request.get('/admin/moderation/texts/list', { params });
}

export function auditPhoto(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/moderation/photos/${id}/audit`, data);
}

export function auditText(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/moderation/texts/${id}/audit`, data);
}

// Verification Detail APIs
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
