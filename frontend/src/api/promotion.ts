import request from './request';

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export interface PromotionRuleVO {
  id: number;
  ruleName: string;
  ruleType: string;
  eventType: string;
  rewardAmount: number;
  rewardUnit: string;
  dailyLimit?: number;
  effectiveTime?: string;
  expireTime?: string;
  agentGroup?: string;
  status: string;
  remark?: string;
  createTime?: string;
}

export interface PromotionInviteRelationVO {
  id: number;
  relationNo: string;
  sourceType: string;
  inviterId?: number;
  inviteeId: number;
  agentId?: number;
  agentCode?: string;
  status: string;
  bindTime: string;
  firstLoginTime?: string;
  profileCompleteTime?: string;
  verifySuccessTime?: string;
  invalidReason?: string;
  frozenReason?: string;
  totalRewardCoin?: number;
}

export interface PromotionRewardLogVO {
  id: number;
  rewardNo: string;
  relationId: number;
  inviterId: number;
  inviteeId: number;
  eventType: string;
  rewardCoin: number;
  status: string;
  riskReason?: string;
  arriveTime?: string;
  reviewTime?: string;
  reviewRemark?: string;
  createTime?: string;
}

export interface PromotionAgentVO {
  id: number;
  agentName: string;
  contactName?: string;
  contactPhone?: string;
  school?: string;
  campus?: string;
  agentGroup?: string;
  status: string;
  remark?: string;
  createTime?: string;
}

export interface PromotionAgentCodeVO {
  id: number;
  agentId: number;
  agentCode: string;
  miniappPath: string;
  qrUrl?: string;
  posterUrl?: string;
  versionNo: number;
  status: string;
}

export interface PromotionSettlementVO {
  id: number;
  settlementNo: string;
  agentId: number;
  periodStart: string;
  periodEnd: string;
  statsDesc?: string;
  payableAmount: number;
  paidAmount?: number;
  status: string;
  confirmTime?: string;
  paidTime?: string;
  remark?: string;
  createTime?: string;
}

export function getPromotionRules(params: {
  page: number;
  size: number;
  ruleType?: string;
  eventType?: string;
  status?: string;
}) {
  return request.get('/admin/promotion/rules/list', { params });
}

export function createPromotionRule(data: Partial<PromotionRuleVO>) {
  return request.post('/admin/promotion/rules', data);
}

export function updatePromotionRule(id: number, data: Partial<PromotionRuleVO>) {
  return request.put(`/admin/promotion/rules/${id}`, data);
}

export function updatePromotionRuleStatus(id: number, status: string) {
  return request.put(`/admin/promotion/rules/${id}/status`, { status });
}

export function savePromotionRuleTiers(
  id: number,
  tiers: { minCount: number; maxCount: number; rewardAmount: number; status?: string; remark?: string }[],
) {
  return request.put(`/admin/promotion/rules/${id}/tiers`, tiers);
}

export function getPromotionInvites(params: {
  page: number;
  size: number;
  inviterId?: number;
  inviteeId?: number;
  sourceType?: string;
  status?: string;
}) {
  return request.get('/admin/promotion/invites/list', { params });
}

export function markPromotionInviteInvalid(id: number, remark?: string) {
  return request.put(`/admin/promotion/invites/${id}/invalid`, { remark });
}

export function unfreezePromotionInvite(id: number, remark?: string) {
  return request.put(`/admin/promotion/invites/${id}/unfreeze`, { remark });
}

export function getPromotionRewards(params: {
  page: number;
  size: number;
  inviterId?: number;
  inviteeId?: number;
  eventType?: string;
  status?: string;
}) {
  return request.get('/admin/promotion/rewards/list', { params });
}

export function approvePromotionReward(id: number, remark?: string) {
  return request.put(`/admin/promotion/rewards/${id}/approve`, { remark });
}

export function rejectPromotionReward(id: number, remark?: string) {
  return request.put(`/admin/promotion/rewards/${id}/reject`, { remark });
}

export function getPromotionAgents(params: {
  page: number;
  size: number;
  keyword?: string;
  school?: string;
  status?: string;
}) {
  return request.get('/admin/promotion/agents/list', { params });
}

export function createPromotionAgent(data: Partial<PromotionAgentVO>) {
  return request.post('/admin/promotion/agents', data);
}

export function updatePromotionAgent(id: number, data: Partial<PromotionAgentVO>) {
  return request.put(`/admin/promotion/agents/${id}`, data);
}

export function updatePromotionAgentStatus(id: number, status: string) {
  return request.put(`/admin/promotion/agents/${id}/status`, { status });
}

export function regeneratePromotionAgentCode(id: number) {
  return request.post(`/admin/promotion/agents/${id}/codes/regenerate`);
}

export function getPromotionSettlements(params: {
  page: number;
  size: number;
  agentId?: number;
  status?: string;
}) {
  return request.get('/admin/promotion/settlements/list', { params });
}

export function createPromotionSettlement(data: Partial<PromotionSettlementVO>) {
  return request.post('/admin/promotion/settlements', data);
}

export function confirmPromotionSettlement(id: number, remark?: string) {
  return request.put(`/admin/promotion/settlements/${id}/confirm`, { remark });
}

export function paidPromotionSettlement(id: number, paidAmount: number, remark?: string) {
  return request.put(`/admin/promotion/settlements/${id}/paid`, { paidAmount, remark });
}
