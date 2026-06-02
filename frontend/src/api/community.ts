import request from './request';

export interface CommunityPostAdminVO {
  id: number;
  authorId: number;
  authorName?: string;
  authorPhone?: string;
  postType: string;
  title?: string;
  content: string;
  topicId?: number;
  topicName?: string;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  status: string;
  auditStatus: string;
  auditRemark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface CommunityCommentAdminVO {
  id: number;
  postId: number;
  authorId: number;
  authorName?: string;
  authorPhone?: string;
  parentCommentId?: number;
  replyUserId?: number;
  replyUserName?: string;
  content: string;
  reportCount: number;
  status: string;
  auditStatus: string;
  auditRemark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface CommunityReportAdminVO {
  id: number;
  reporterId: number;
  reporterName?: string;
  reporterPhone?: string;
  targetType: string;
  targetId: number;
  reasonCode: string;
  reasonLabel?: string;
  extraText?: string;
  status: string;
  handleAction?: string;
  handleRemark?: string;
  handlerId?: number;
  handlerName?: string;
  createTime?: string;
  updateTime?: string;
}

export interface AppConfigVO {
  id?: number;
  configKey: string;
  configValue: string;
  configGroup: string;
  configType: string;
  publicVisible: number;
  status: string;
  remark?: string;
  updateTime?: string;
}

export interface MobileEntryConfigVO {
  id: number;
  pageCode: string;
  entryKey: string;
  entryName: string;
  icon?: string;
  jumpType: string;
  jumpTarget?: string;
  badgeText?: string;
  badgeType?: string;
  loginRequired: number;
  sort: number;
  status: string;
  extraJson?: string;
  createTime?: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export function getCommunityPostPage(params: {
  page: number;
  size: number;
  authorId?: number;
  postType?: string;
  status?: string;
  auditStatus?: string;
  topicId?: number;
  keyword?: string;
}) {
  return request.get('/admin/community/posts/list', { params });
}

export function getCommunityPostDetail(id: number) {
  return request.get(`/admin/community/posts/${id}`);
}

export function auditCommunityPost(id: number, data: { auditStatus: string; auditRemark?: string }) {
  return request.put(`/admin/community/posts/${id}/audit`, data);
}

export function getCommunityCommentPage(params: {
  page: number;
  size: number;
  postId?: number;
  authorId?: number;
  status?: string;
  auditStatus?: string;
  keyword?: string;
}) {
  return request.get('/admin/community/comments/list', { params });
}

export function auditCommunityComment(id: number, data: { auditStatus: string; auditRemark?: string }) {
  return request.put(`/admin/community/comments/${id}/audit`, data);
}

export function getCommunityReportPage(params: {
  page: number;
  size: number;
  reporterId?: number;
  targetType?: string;
  status?: string;
  reasonCode?: string;
}) {
  return request.get('/admin/community/reports/list', { params });
}

export function handleCommunityReport(id: number, data: { status: string; handleAction?: string; handleRemark?: string }) {
  return request.put(`/admin/community/reports/${id}/handle`, data);
}

export function getCommunityConfigs() {
  return request.get('/admin/community/configs');
}

export function saveCommunityConfigs(items: AppConfigVO[]) {
  return request.post('/admin/community/configs', { items });
}

export function getCommunityHomeTabs() {
  return request.get('/admin/community/home-tabs');
}
