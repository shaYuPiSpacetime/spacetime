import request from './request';
import type { PageResult } from './user';

export interface AdminUserSecuritySummaryVO {
  userId: number;
  nickname: string;
  blacklistCount: number;
  hiddenDynamicCount: number;
  keywordCount: number;
  feedbackCount: number;
  searchCount: number;
  cancelStatus: string;
}

export interface AdminRelationBlockVO {
  id: number;
  userId: number;
  targetUserId: number;
  targetNickname: string;
  blockType: string;
  sourceScene?: string;
  status: string;
  createTime?: string;
}

export interface AdminUserKeywordVO {
  id: number;
  userId: number;
  keyword: string;
  status: string;
  createTime?: string;
}

export interface AdminFeedbackVO {
  id: number;
  userId: number;
  nickname: string;
  feedbackType: string;
  content: string;
  imageUrls: string[];
  contact?: string;
  status: string;
  handleRemark?: string;
  handledBy?: number;
  handledTime?: string;
  createTime?: string;
}

export interface AdminCancelRequestVO {
  id: number;
  userId: number;
  nickname: string;
  status: string;
  reason?: string;
  blockReason?: string;
  remark?: string;
  coolingEndTime?: string;
  revokedTime?: string;
  finalCancelTime?: string;
  createTime?: string;
}

export function getUserSecuritySummary(userId: number) {
  return request.get(`/admin/user-security/users/${userId}/summary`);
}

export function getUserBlacklist(userId: number, params = { page: 1, size: 10 }) {
  return request.get(`/admin/user-security/users/${userId}/blacklist`, { params });
}

export function getUserHiddenDynamics(userId: number, params = { page: 1, size: 10 }) {
  return request.get(`/admin/user-security/users/${userId}/hidden-dynamics`, { params });
}

export function getUserKeywordBlocks(userId: number) {
  return request.get(`/admin/user-security/users/${userId}/keyword-blocks`);
}

export function getFeedbackList(params: {
  page: number;
  size: number;
  userId?: number;
  feedbackType?: string;
  status?: string;
}) {
  return request.get<PageResult<AdminFeedbackVO>>('/admin/user-security/feedback/list', { params });
}

export function getFeedbackDetail(id: number) {
  return request.get(`/admin/user-security/feedback/${id}`);
}

export function updateFeedbackStatus(id: number, data: { status: string; remark: string }) {
  return request.put(`/admin/user-security/feedback/${id}/status`, data);
}

export function getCancelRequestList(params: {
  page: number;
  size: number;
  userId?: number;
  status?: string;
}) {
  return request.get<PageResult<AdminCancelRequestVO>>('/admin/user-security/cancel-requests/list', { params });
}

export function getCancelRequestDetail(id: number) {
  return request.get(`/admin/user-security/cancel-requests/${id}`);
}

export function updateCancelRequestRemark(id: number, data: { remark?: string; blockReason?: string }) {
  return request.put(`/admin/user-security/cancel-requests/${id}/remark`, data);
}
