import axios from 'axios';
import request from './request';
import type {
  PageResult,
  PromotionAgentDetail,
  PromotionAgentListItem,
  PromotionAgentQrCode,
  PromotionAgentQuery,
  PromotionAgentSaveRequest,
  PromotionAgentStatus,
  PromotionExportTask,
  PromotionRelationDetail,
  PromotionRelationListItem,
  PromotionRelationQuery,
  PromotionRewardListItem,
  PromotionRewardQuery,
  PromotionRuleConfig,
  PromotionRulePublishRequest,
  PromotionSettlementListItem,
  PromotionSettlementQuery,
  PromotionSourceType,
} from '@/types/promotion';

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export type {
  PageResult,
  PromotionAgentDetail,
  PromotionAgentListItem,
  PromotionAgentQrCode,
  PromotionAgentQuery,
  PromotionAgentSaveRequest,
  PromotionAgentStatus,
  PromotionExportTask,
  PromotionRelationDetail,
  PromotionRelationListItem,
  PromotionRelationQuery,
  PromotionRewardListItem,
  PromotionRewardQuery,
  PromotionRuleConfig,
  PromotionRulePublishRequest,
  PromotionSettlementListItem,
  PromotionSettlementQuery,
  PromotionSourceType,
} from '@/types/promotion';

export function getCurrentPromotionRule(sourceType: PromotionSourceType) {
  return request.get<unknown, ApiResponse<PromotionRuleConfig>>('/admin/promotion/rules/current', {
    params: { sourceType },
  });
}

export function publishPromotionRule(data: PromotionRulePublishRequest) {
  return request.post<unknown, ApiResponse<PromotionRuleConfig>>('/admin/promotion/rules/publish', data);
}

export function getPromotionRelations(params: PromotionRelationQuery) {
  return request.get<unknown, ApiResponse<PageResult<PromotionRelationListItem>>>(
    '/admin/promotion/relations/list',
    { params },
  );
}

export function getPromotionRelationDetail(relationNo: string) {
  return request.get<unknown, ApiResponse<PromotionRelationDetail>>(
    `/admin/promotion/relations/${encodeURIComponent(relationNo)}`,
  );
}

export function exportPromotionRelations(params: Omit<PromotionRelationQuery, 'page' | 'size'>) {
  return request.post<unknown, ApiResponse<PromotionExportTask>>('/admin/promotion/relations/export', params);
}

export function getPromotionRewards(params: PromotionRewardQuery) {
  return request.get<unknown, ApiResponse<PageResult<PromotionRewardListItem>>>(
    '/admin/promotion/rewards/list',
    { params },
  );
}

export function retryPromotionReward(rewardNo: string) {
  return request.post<unknown, ApiResponse<PromotionRewardListItem>>(
    `/admin/promotion/rewards/${encodeURIComponent(rewardNo)}/retry`,
  );
}

export function exportPromotionRewards(params: Omit<PromotionRewardQuery, 'page' | 'size'>) {
  return request.post<unknown, ApiResponse<PromotionExportTask>>('/admin/promotion/rewards/export', params);
}

export function getPromotionAgents(params: PromotionAgentQuery) {
  return request.get<unknown, ApiResponse<PageResult<PromotionAgentListItem>>>(
    '/admin/promotion/agents/list',
    { params },
  );
}

export function createPromotionAgent(data: PromotionAgentSaveRequest) {
  return request.post<unknown, ApiResponse<PromotionAgentListItem>>('/admin/promotion/agents', data);
}

export function updatePromotionAgent(agentNo: string, data: PromotionAgentSaveRequest) {
  return request.put<unknown, ApiResponse<PromotionAgentListItem>>(
    `/admin/promotion/agents/${encodeURIComponent(agentNo)}`,
    data,
  );
}

export function updatePromotionAgentStatus(agentNo: string, status: PromotionAgentStatus) {
  return request.put<unknown, ApiResponse<PromotionAgentListItem>>(
    `/admin/promotion/agents/${encodeURIComponent(agentNo)}/status`,
    { status },
  );
}

export function getPromotionAgentDetail(agentNo: string) {
  return request.get<unknown, ApiResponse<PromotionAgentDetail>>(
    `/admin/promotion/agents/${encodeURIComponent(agentNo)}`,
  );
}

export function getPromotionAgentQrCode(agentNo: string) {
  return request.post<unknown, ApiResponse<PromotionAgentQrCode>>(
    `/admin/promotion/agents/${encodeURIComponent(agentNo)}/qr-code`,
  );
}

export async function downloadPromotionAgentQrImage(imageUrl: string) {
  const parsedUrl = new URL(imageUrl, window.location.origin);
  const sameOrigin = parsedUrl.origin === window.location.origin;
  if (!sameOrigin && parsedUrl.protocol !== 'https:') {
    throw new Error('拒绝加载不安全的跨域二维码地址');
  }
  const resolvedUrl = sameOrigin
    ? parsedUrl.pathname.startsWith('/api/')
      ? `${parsedUrl.pathname}${parsedUrl.search}`
      : `/api${parsedUrl.pathname.startsWith('/') ? parsedUrl.pathname : `/${parsedUrl.pathname}`}${parsedUrl.search}`
    : parsedUrl.toString();
  const token = localStorage.getItem('token');
  const response = await axios.get<Blob>(resolvedUrl, {
    responseType: 'blob',
    headers: sameOrigin && token ? { 'X-Auth-Token': token } : undefined,
  });
  return response.data;
}

export function exportPromotionAgents(params: Omit<PromotionAgentQuery, 'page' | 'size'>) {
  return request.post<unknown, ApiResponse<PromotionExportTask>>('/admin/promotion/agents/export', params);
}

export function getPromotionSettlements(params: PromotionSettlementQuery) {
  return request.get<unknown, ApiResponse<PageResult<PromotionSettlementListItem>>>(
    '/admin/promotion/settlements/list',
    { params },
  );
}

export function confirmPromotionSettlement(settlementNo: string) {
  return request.post<unknown, ApiResponse<PromotionSettlementListItem>>(
    `/admin/promotion/settlements/${encodeURIComponent(settlementNo)}/confirm`,
  );
}

export function exportPromotionSettlements(params: Omit<PromotionSettlementQuery, 'page' | 'size'>) {
  return request.post<unknown, ApiResponse<PromotionExportTask>>('/admin/promotion/settlements/export', params);
}

export function getPromotionExportTask(taskNo: string) {
  return request.get<unknown, ApiResponse<PromotionExportTask>>(
    `/admin/promotion/exports/${encodeURIComponent(taskNo)}`,
  );
}

export async function downloadPromotionExportFile(taskNo: string) {
  const token = localStorage.getItem('token');
  const response = await axios.get<Blob>(
    `/api/admin/promotion/exports/${encodeURIComponent(taskNo)}/download`,
    {
      responseType: 'blob',
      headers: token ? { 'X-Auth-Token': token } : undefined,
    },
  );
  return response.data;
}
