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
  status: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  createdBy?: number;
  createdByName?: string;
  updatedBy?: number;
  updatedByName?: string;
}

export interface PromotionRuleConfigVO {
  inviteRewardRules?: PromotionRuleVO[];
  agentBonusRules?: PromotionRuleVO[];
  riskRules?: PromotionRuleVO[];
  relationValidityText?: string;
}

export interface PromotionInviteRelationVO {
  id: number;
  relationNo: string;
  sourceType: string;
  inviterId?: number;
  inviterUuid?: string;
  inviterName?: string;
  inviterPhone?: string;
  inviteeId: number;
  inviteeUuid?: string;
  inviteeName?: string;
  inviteePhone?: string;
  agentId?: number;
  agentNo?: string;
  agentName?: string;
  qrCode?: string;
  status: string;
  frozenBeforeStatus?: string;
  invalidReason?: string;
  bindTime: string;
  firstClickTime?: string;
  registerTime?: string;
  firstLoginTime?: string;
  profileCompleteTime?: string;
  verifySuccessTime?: string;
  firstVipTime?: string;
  firstCoinRechargeTime?: string;
  successMetricHitTime?: string;
  totalRewardCoin?: number;
  rewardRecords?: PromotionInviteRewardRecordVO[];
  riskRecords?: PromotionInviteRiskRecordVO[];
  auditRecords?: PromotionInviteAuditRecordVO[];
}

export interface PromotionInviteRewardRecordVO {
  id: number;
  rewardNo?: string;
  eventType?: string;
  rewardCoin?: number;
  status?: string;
  createTime?: string;
  arriveTime?: string;
  riskReason?: string;
}

export interface PromotionInviteRiskRecordVO {
  id: number;
  riskReason?: string;
  status?: string;
  createTime?: string;
  reviewRemark?: string;
}

export interface PromotionInviteAuditRecordVO {
  id: number;
  action?: string;
  beforeValue?: string;
  afterValue?: string;
  remark?: string;
  createTime?: string;
}

export interface PromotionRewardLogVO {
  id: number;
  rewardNo: string;
  relationId: number;
  inviterId: number;
  inviterUuid?: string;
  inviterName?: string;
  inviterPhone?: string;
  inviteeId: number;
  inviteeUuid?: string;
  inviteeName?: string;
  inviteePhone?: string;
  eventType: string;
  rewardCoin: number;
  status: string;
  riskReason?: string;
  frozenTime?: string;
  arriveTime?: string;
  reviewTime?: string;
  reviewRemark?: string;
  createTime?: string;
}

export interface PromotionAgentVO {
  id: number;
  agentNo?: string;
  agentName: string;
  contactName?: string;
  contactPhone?: string;
  school?: string;
  campus?: string;
  bonusRuleGroup?: string;
  bonusDueAmount?: number;
  bonusPaidAmount?: number;
  bonusPendingAmount?: number;
  status: string;
  remark?: string;
  stat?: PromotionAgentStatVO;
  qrCodes?: PromotionAgentQrCodeVO[];
  promotionEvents?: PromotionAgentEventRecordVO[];
  bonusRecords?: PromotionAgentBonusRecordVO[];
  settlementRecords?: PromotionSettlementVO[];
  createTime?: string;
}

export interface PromotionAgentStatVO {
  clickCnt?: number;
  registerCnt?: number;
  profileCnt?: number;
  verifyCnt?: number;
  successCnt?: number;
  firstVipCnt?: number;
  firstCoinRechargeCnt?: number;
  bonusDueAmount?: number;
  bonusPendingAmount?: number;
  bonusConfirmedAmount?: number;
  bonusPaidAmount?: number;
  lastEventTime?: string;
  lastSettlementTime?: string;
  statVersion?: number;
}

export interface PromotionAgentQrCodeVO {
  id: number;
  agentId: number;
  agentNo?: string;
  agentName?: string;
  qrCode: string;
  miniappPath: string;
  qrUrl?: string;
  materialUrl?: string;
  materialTemplate?: string;
  validityText?: string;
  versionNo: number;
  status: string;
  createTime?: string;
}

export interface PromotionAgentEventVO {
  id: number;
  agentId: number;
  qrCode: string;
  relationId?: number;
  userId?: number;
  eventType: string;
  eventTime: string;
  bonusGenerated?: boolean;
  createTime?: string;
}

export interface PromotionAgentEventRecordVO {
  id: number;
  qrCode?: string;
  relationId?: number;
  userId?: number;
  userUuid?: string;
  userName?: string;
  userPhone?: string;
  eventType?: string;
  eventTime?: string;
  bonusGenerated?: number;
}

export interface PromotionAgentBonusRecordVO {
  id: number;
  bonusNo?: string;
  relationId?: number;
  userId?: number;
  userUuid?: string;
  userName?: string;
  eventType?: string;
  bonusAmount?: number;
  status?: string;
  settlementId?: number;
  createTime?: string;
}

export interface PromotionSettlementVO {
  id: number;
  settlementNo: string;
  agentId: number;
  agentNo?: string;
  agentName?: string;
  agentDisplay?: string;
  periodStart: string;
  periodEnd: string;
  periodText?: string;
  statsDesc?: string;
  caliberDesc?: string;
  payableAmount: number;
  paidAmount?: number;
  status: string;
  settlementMethod?: string;
  payeeInfo?: string;
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

export function getPromotionRuleConfig() {
  return request.get('/admin/promotion/rule-config');
}

export function savePromotionInviteRewardConfig(data: {
  events: { eventType: string; enabled: boolean; amount: number }[];
  successMetric: string;
  rewardMode: string;
  rewardCap?: number;
  effectiveTime?: string;
  expireTime?: string;
  ladder?: { minCount: number; maxCount: number; amount: number; enabled: boolean }[];
}) {
  return request.put('/admin/promotion/rule-config/invite-reward', data);
}

export function savePromotionAgentBonusConfig(data: {
  ruleGroups: {
    groupCode: string;
    groupName: string;
    enabled: boolean;
    events: { eventType: string; enabled: boolean; amount: number }[];
  }[];
}) {
  return request.put('/admin/promotion/rule-config/agent-bonus', data);
}

export function savePromotionRiskConfig(data: {
  dailyCap?: number;
  deviceThreshold?: number;
  phoneThreshold?: number;
  paymentThreshold?: number;
  freezeSwitch: boolean;
  reviewSwitch: boolean;
}) {
  return request.put('/admin/promotion/rule-config/risk', data);
}

export function getPromotionInvites(params: {
  page: number;
  size: number;
  relationNo?: string;
  inviterKeyword?: string;
  inviteeKeyword?: string;
  sourceType?: string;
  status?: string;
  bindStartTime?: string;
  bindEndTime?: string;
}) {
  return request.get('/admin/promotion/invite-relations/list', { params });
}

export function getPromotionInviteDetail(id: number) {
  return request.get(`/admin/promotion/invite-relations/${id}`);
}

export function unfreezePromotionInvite(id: number, remark?: string) {
  return request.put(`/admin/promotion/invite-relations/${id}/unfreeze`, { remark });
}

export function invalidatePromotionInvite(id: number, remark?: string) {
  return request.put(`/admin/promotion/invite-relations/${id}/invalid`, { remark });
}

export function getPromotionRewards(params: {
  page: number;
  size: number;
  rewardNo?: string;
  inviterId?: number;
  inviterKeyword?: string;
  inviteeId?: number;
  inviteeKeyword?: string;
  eventType?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
}) {
  return request.get('/admin/promotion/invite-rewards/list', { params });
}

export function approvePromotionReward(id: number, remark?: string) {
  return request.put(`/admin/promotion/invite-rewards/${id}/approve`, { remark });
}

export function rejectPromotionReward(id: number, remark?: string) {
  return request.put(`/admin/promotion/invite-rewards/${id}/reject`, { remark });
}

export function getPromotionAgents(params: {
  page: number;
  size: number;
  keyword?: string;
  agentNo?: string;
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

export function getPromotionAgentDetail(id: number) {
  return request.get(`/admin/promotion/agents/${id}`);
}

export function getPromotionAgentEvents(id: number, params: {
  page: number;
  size: number;
  eventType?: string;
}) {
  return request.get(`/admin/promotion/agents/${id}/events`, { params });
}

export function regeneratePromotionAgentQrCode(id: number) {
  return request.post(`/admin/promotion/agents/${id}/qr-codes/regenerate`);
}

export function getPromotionMaterials(params: {
  page: number;
  size: number;
  agentId?: number;
  agentKeyword?: string;
  qrCode?: string;
  status?: string;
}) {
  return request.get('/admin/promotion/materials/list', { params });
}

export function disablePromotionMaterial(id: number, remark?: string) {
  return request.put(`/admin/promotion/materials/${id}/disable`, { remark });
}

export function regeneratePromotionMaterial(id: number) {
  return request.post(`/admin/promotion/materials/${id}/regenerate`);
}

export function getPromotionSettlements(params: {
  page: number;
  size: number;
  settlementNo?: string;
  agentKeyword?: string;
  status?: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  return request.get('/admin/promotion/settlements/list', { params });
}

export function confirmPromotionSettlement(id: number, remark?: string) {
  return request.put(`/admin/promotion/settlements/${id}/confirm`, { remark });
}

export function paidPromotionSettlement(id: number, paidAmount: number, remark?: string) {
  return request.put(`/admin/promotion/settlements/${id}/paid`, { paidAmount, remark });
}
