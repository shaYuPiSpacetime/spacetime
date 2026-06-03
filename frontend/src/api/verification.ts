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
export function getRealNamePage(params: { page: number; size: number; userId?: number; status?: string }) {
  return request.get('/admin/verify/real-name/list', { params });
}

export function getEducationPage(params: { page: number; size: number; userId?: number; status?: string }) {
  return request.get('/admin/verify/education/list', { params });
}

export function getAvatarPage(params: { page: number; size: number; userId?: number; status?: string }) {
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
export function getPhotoModerationPage(params: { page: number; size: number; userId?: number; status?: string }) {
  return request.get('/admin/moderation/photos/list', { params });
}

export function getTextModerationPage(params: { page: number; size: number; userId?: number; status?: string }) {
  return request.get('/admin/moderation/texts/list', { params });
}

export function auditPhoto(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/moderation/photos/${id}/audit`, data);
}

export function auditText(id: number, data: { action: string; rejectReason?: string }) {
  return request.post(`/admin/moderation/texts/${id}/audit`, data);
}
