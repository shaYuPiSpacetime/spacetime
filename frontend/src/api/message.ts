import request from '@/api/request';

export interface MessageRecordQuery {
  page: number; size: number; keyword?: string; recordType?: string; messageType?: string;
  systemCategory?: string; status?: string; startTime?: string; endTime?: string;
}
export interface MessageRecordVO {
  recordNo: string; recordType: string; userId?: number; userNickname?: string;
  peerUserId?: number; peerNickname?: string; messageType?: string; systemCategory?: string;
  status?: string; createdTime?: string; caseCount?: number;
}
export interface MessageRecordDetailVO extends MessageRecordVO {
  conversationNo?: string; sourceBizNo?: string; timMessageId?: string; timMsgKey?: string;
  failureCode?: string; failureReason?: string; contentAvailable?: boolean;
  contentClearedAt?: string; sensitiveContent?: boolean; title?: string; content?: string;
  contentFormat?: string; actionText?: string;
}
export interface SensitiveContentItem { role: string; messageNo: string; messageType?: string; content: string; eventTime?: string }
export interface SensitiveMessageContent { accessNo: string; targetType: string; targetNo: string; items: SensitiveContentItem[] }
export interface MessageConfig {
  versionNo: string; status: string; femaleProtectionEnabled: boolean; femaleProtectionDays: number;
  whisperExpireDays: number; whisperCooldownDays: number; ordinaryMessageRetainDays: number;
  systemMessageVisibleDays: number; reportEvidenceRetainDays: number; severeEvidenceRetainDays: number;
  sensitiveAuditRetainDays: number; remark?: string; publishedBy?: number; publishedAt?: string;
  globalSend: { controlKey: string; enabled: boolean; version: number; reason?: string; changedBy?: number; changedAt?: string };
}
export interface ConfigLog { id: number; bizType: string; action: string; beforeValue?: string; afterValue?: string; operatorName?: string; remark?: string; createTime?: string }

export const getMessageRecordStats = () => request.get('/admin/message/records/stats');
export const getMessageRecords = (params: MessageRecordQuery) => request.get('/admin/message/records', { params });
export const getMessageRecordDetail = (recordNo: string) => request.get(`/admin/message/records/${recordNo}`);
export const viewMessageRecordContent = (recordNo: string, data: { viewReason: string; requestId: string }) => request.post(`/admin/message/records/${recordNo}/content-view`, data);
export const exportMessageRecords = (data: Omit<MessageRecordQuery, 'page' | 'size'> & { confirmNoContent: true }) => request.post('/admin/message/records/export', data);
export const getMessageConfig = () => request.get('/admin/message/config');
export const publishMessageConfig = (data: object) => request.post('/admin/message/config/versions', data);
export const updateGlobalSend = (data: { enabled: boolean; expectedVersion: number; reason: string }) => request.post('/admin/message/config/runtime/global-send', data);
export const getMessageConfigLogs = (params: { page: number; size: number }) => request.get('/admin/message/config/logs', { params });
