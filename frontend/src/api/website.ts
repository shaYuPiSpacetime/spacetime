import request from './request';

export interface WebsiteActivity { id: number; title: string; content: string; location: string; startTime: string; estimatedCost: number; status: string; auditNote?: string; authorId: number }
export interface AdminActivity { activity: WebsiteActivity; authorName: string; imageUrls: string[] }
export interface AdminMessage { id: number; conversationId: number; senderId: number; messageType: string; status: string; createTime: string }
export interface SensitiveMessage { id: number; messageType: string; content?: string; imageUrl?: string }
export interface WebsiteReport { id: number; reporterId?: number; targetType: string; targetId?: number; reason: string; contact?: string; status: string; resolution?: string; createTime: string }
export interface WebsiteAudit { id: number; actorType: string; actorId?: number; action: string; targetType?: string; targetId?: number; remark?: string; createTime: string; retainUntil: string }
type Result<T> = { code: number; data: T; msg?: string };

export const websiteAdminApi = {
  activities: (page = 1) => request.get<unknown, Result<AdminActivity[]>>('/admin/website/activities', { params: { page, size: 50 } }).then(result => result.data),
  moderateActivity: (id: number, status: string, reason: string) => request.post(`/admin/website/activities/${id}/moderate`, { status, reason }),
  messages: (page = 1) => request.get<unknown, Result<AdminMessage[]>>('/admin/website/messages', { params: { page, size: 50 } }).then(result => result.data),
  viewMessage: (id: number, reason: string) => request.post<unknown, Result<SensitiveMessage>>(`/admin/website/messages/${id}/content-view`, { reason }).then(result => result.data),
  moderateMessage: (id: number, status: string, reason: string) => request.post(`/admin/website/messages/${id}/moderate`, { status, reason }),
  exportMessages: (reason: string) => request.post<unknown, Result<string>>('/admin/website/messages/export', { reason }, { timeout: 120000 }).then(result => result.data),
  reports: (page = 1) => request.get<unknown, Result<WebsiteReport[]>>('/admin/website/reports', { params: { page, size: 50 } }).then(result => result.data),
  resolveReport: (id: number, reason: string) => request.post(`/admin/website/reports/${id}/resolve`, { reason }),
  audits: (page = 1) => request.get<unknown, Result<WebsiteAudit[]>>('/admin/website/audits', { params: { page, size: 50 } }).then(result => result.data),
};
