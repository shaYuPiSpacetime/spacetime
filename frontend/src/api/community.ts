import axios from 'axios';
import request from './request';

export type CommunityTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface CommunityMetaOption {
  code: string;
  label: string;
  tone?: CommunityTone;
  disabled?: boolean;
  description?: string;
  extra?: Record<string, unknown>;
}

export interface CommunityAdminMeta {
  options: Record<string, CommunityMetaOption[]>;
  copy: Record<string, string>;
  capabilities?: Record<string, boolean>;
  configVersion?: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export interface CommunityStatCard {
  code: string;
  label: string;
  value: number | string;
  tone?: CommunityTone;
}

export interface CommunityStatsVO {
  cards: CommunityStatCard[];
}

export interface CommunityAuditLogVO {
  id?: number | string;
  operatorName?: string;
  action?: string;
  actionName?: string;
  remark?: string;
  createTime?: string;
}

export interface CommunityPostAdminVO {
  id: number;
  postNo?: string;
  auditNo?: string;
  authorId: number;
  authorNo?: string;
  authorName?: string;
  authorPhone?: string;
  postType?: string;
  contentType?: string;
  contentSourceScene?: string;
  sourceScene?: string;
  title?: string;
  content: string;
  contentSummary?: string;
  mediaType?: string;
  imageUrls?: string[];
  topicId?: number;
  topicCode?: string;
  topicName?: string;
  distributionScenes?: string[];
  readCount?: number;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  machineResult?: string;
  machineLabel?: string;
  riskLevel?: string;
  violationLabels?: string[];
  status: string;
  statusName?: string;
  auditStatus?: string;
  auditRemark?: string;
  version?: number;
  createTime?: string;
  publishedTime?: string;
  handledTime?: string;
  updateTime?: string;
  auditLogs?: CommunityAuditLogVO[];
}

export interface CommunityCommentAdminVO {
  id: number;
  commentNo?: string;
  postId: number;
  postAvailable?: boolean;
  postNo?: string;
  postType?: string;
  postTitle?: string;
  postSummary?: string;
  postContent?: string;
  postImageUrls?: string[];
  postSourceScene?: string;
  postStatus?: string;
  postStatusName?: string;
  authorId: number;
  authorNo?: string;
  authorName?: string;
  authorPhone?: string;
  parentCommentId?: number;
  parentContent?: string;
  replyUserId?: number;
  replyUserName?: string;
  content: string;
  likeCount?: number;
  reportCount: number;
  machineResult?: string;
  status: string;
  statusName?: string;
  auditStatus?: string;
  auditRemark?: string;
  version?: number;
  createTime?: string;
  updateTime?: string;
  auditLogs?: CommunityAuditLogVO[];
}

export interface CommunityReportContextVO {
  summary?: string;
  content?: string;
  imageUrls?: string[];
  sourceNo?: string;
  conversationType?: string;
  participantSummary?: string;
  available?: boolean;
  unavailableReason?: string;
}

export interface CommunityReportAdminVO {
  id: number;
  reportNo?: string;
  reporterId: number;
  reporterNo?: string;
  reporterName?: string;
  reporterPhone?: string;
  targetType: string;
  targetId: string | number;
  targetNo?: string;
  targetUserId?: number;
  targetUserNo?: string;
  targetUserName?: string;
  reasonCode: string;
  reasonLabel?: string;
  extraText?: string;
  sourceScene?: string;
  status: string;
  statusName?: string;
  replyStatus?: string;
  punishAction?: string;
  handleAction?: string;
  handleRemark?: string;
  handlerId?: number;
  handlerName?: string;
  mergedIntoReportNo?: string;
  riskIpMasked?: string;
  version?: number;
  createTime?: string;
  handleTime?: string;
  updateTime?: string;
  context?: CommunityReportContextVO;
  auditLogs?: CommunityAuditLogVO[];
}

export interface ReportEvidenceVO {
  evidenceNo: string; evidenceType?: string; targetType?: string; sourceBizNo?: string;
  conversationNo?: string; senderMask?: string; receiverMask?: string; messageType?: string;
  eventTime?: string; contextOrder?: number; severity?: string; contentHmacSummary?: string;
  snapshotAt?: string; retainUntil?: string; contentAvailable: boolean;
}

export interface ReportSensitiveContentVO {
  accessNo: string; evidenceNo: string; messageType?: string; content: string; eventTime?: string;
}

export interface CommunityTopicAdminVO {
  id: number;
  topicCode: string;
  topicName: string;
  description?: string;
  coverUrl?: string;
  displayScenes?: string[];
  recommended: boolean;
  sort: number;
  status: string;
  statusName?: string;
  contentCount?: number;
  heatValue?: number;
  version: number;
  createTime?: string;
  updateTime?: string;
  auditLogs?: CommunityAuditLogVO[];
}

export interface CommunityTopicSaveCommand {
  topicName: string;
  description?: string;
  coverUrl: string;
  displayScenes: string[];
  recommended: boolean;
  sort: number;
  status: string;
  version?: number;
  remark?: string;
}

export interface CommunityConfigItemVO {
  configKey: string;
  configValue: unknown;
  sectionCode?: string;
  configGroup?: string;
  name?: string;
  description?: string;
  configType?: string;
  highRisk?: boolean;
  editable?: boolean;
  optionsKey?: string;
  sort?: number;
}

export interface CommunityConfigSectionVO {
  code: string;
  name: string;
  description?: string;
  items: CommunityConfigItemVO[];
}

export interface CommunityConfigVersionVO {
  versionNo?: string;
  version: number;
  items?: CommunityConfigItemVO[];
  sections?: CommunityConfigSectionVO[];
  changeLogs?: CommunityAuditLogVO[];
  initialized?: boolean;
}

export interface CommunityConfigSaveCommand {
  version: number;
  items: CommunityConfigItemVO[];
  changeSummary?: string;
  highRiskConfirmed?: boolean;
}

export interface OssDirectUploadTicket {
  uploadUrl: string;
  key: string;
  formData: Record<string, string>;
  expiresAt?: string;
  fileUrl: string;
}

export interface CommunityPageQuery {
  page: number;
  size: number;
  keyword?: string;
  userId?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface CommunityPostHandleCommand {
  action: string;
  version: number;
  reason?: string;
  notifyUser?: boolean;
  mutePeriod?: string;
}

export interface CommunityReportHandleCommand {
  action?: string;
  reason?: string;
  result: string;
  punishAction?: string;
  version: number;
  handleRemark: string;
  mutePeriod?: string;
  riskIp?: string;
  ipBlockPeriod?: string;
  ipBlockScopes?: string[];
  replyReporter?: boolean;
  mergeIntoReportNo?: string;
}

export function getCommunityMeta() {
  return request.get('/admin/community/meta');
}

export function getCommunityPostStats(scope: 'content' | 'moments') {
  return request.get('/admin/community/posts/stats', { params: { scope } });
}

export function getCommunityPostPage(params: CommunityPageQuery & { scope?: 'content' | 'moments' }) {
  return request.get('/admin/community/posts/list', { params });
}

export function getCommunityPostDetail(id: number) {
  return request.get(`/admin/community/posts/${id}`);
}

export function handleCommunityPost(id: number, data: CommunityPostHandleCommand) {
  return request.put(`/admin/community/posts/${id}/status`, data);
}

export function createCommunityExport(domain: 'posts' | 'comments' | 'reports' | 'topics', filters: object) {
  return request.post('/admin/community/exports', { exportType: domain, filters });
}

export function getCommunityCommentStats() {
  return request.get('/admin/community/comments/stats');
}

export function getCommunityCommentPage(params: CommunityPageQuery & { postId?: number; reported?: boolean }) {
  return request.get('/admin/community/comments/list', { params });
}

export function getCommunityCommentDetail(id: number) {
  return request.get(`/admin/community/comments/${id}`);
}

export function handleCommunityComment(id: number, data: CommunityPostHandleCommand) {
  return request.put(`/admin/community/comments/${id}/status`, data);
}

export function getCommunityReportStats() {
  return request.get('/admin/community/reports/stats');
}

export function getCommunityReportPage(params: CommunityPageQuery & { targetType?: string; reasonCode?: string }) {
  return request.get('/admin/community/reports/list', { params });
}

export function getCommunityReportDetail(id: number) {
  return request.get(`/admin/community/reports/${id}`);
}

export function handleCommunityReport(id: number, data: CommunityReportHandleCommand) {
  return request.put(`/admin/community/reports/${id}/status`, data);
}

export function getCommunityReportEvidence(reportNo: string) {
  return request.get(`/admin/community/reports/${reportNo}/evidence`);
}

export function viewCommunityReportEvidenceContent(reportNo: string, evidenceNo: string,
  data: { viewReason: string; requestId: string }) {
  return request.post(`/admin/community/reports/${reportNo}/evidence/${evidenceNo}/content-view`, data);
}

export function getCommunityTopicStats() {
  return request.get('/admin/community/topics/stats');
}

export function getCommunityTopicPage(params: CommunityPageQuery & { recommended?: boolean }) {
  return request.get('/admin/community/topics/list', { params });
}

export function getCommunityTopicDetail(id: number) {
  return request.get(`/admin/community/topics/${id}`);
}

export function createCommunityTopic(data: CommunityTopicSaveCommand) {
  return request.post('/admin/community/topics', data);
}

export function updateCommunityTopic(id: number, data: CommunityTopicSaveCommand) {
  return request.put(`/admin/community/topics/${id}`, data);
}

export function updateCommunityTopicStatus(id: number, data: { status: string; version: number; remark?: string }) {
  return request.put(`/admin/community/topics/${id}/status`, data);
}

export function createCommunityTopicCoverTicket(file: File) {
  return request.post('/admin/community/topics/cover-upload-ticket', {
    fileName: file.name,
    fileSizeBytes: file.size,
    contentType: file.type,
  });
}

export async function uploadByOssTicket(ticket: OssDirectUploadTicket, file: File) {
  const form = new FormData();
  Object.entries(ticket.formData).forEach(([key, value]) => form.append(key, value));
  form.append('file', file);
  await axios.post(ticket.uploadUrl, form, { timeout: 60_000 });
  return ticket.fileUrl;
}

export function getCommunityConfigs() {
  return request.get('/admin/community/configs/version');
}

export function saveCommunityConfigs(data: CommunityConfigSaveCommand) {
  return request.post('/admin/community/configs/version', data);
}

export function getCommunityConfigLogs() {
  return request.get('/admin/community/configs/logs');
}

// 迁移期旧接口兼容导出，旧页面不再使用。
export function auditCommunityPost(id: number, data: { auditStatus: string; auditRemark?: string }) {
  return request.put(`/admin/community/posts/${id}/audit`, data);
}

export function auditCommunityComment(id: number, data: { auditStatus: string; auditRemark?: string }) {
  return request.put(`/admin/community/comments/${id}/audit`, data);
}

export function getCommunityHomeTabs() {
  return request.get('/admin/community/home-tabs');
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
