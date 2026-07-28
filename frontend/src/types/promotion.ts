export type PromotionSourceType = 'normal_user' | 'campus_agent';
export type PromotionRewardMode = 'fixed' | 'ladder';
export type PromotionRewardStatus = 'pending' | 'success' | 'failed';
export type PromotionAgentStatus = 'enabled' | 'disabled';
export type PromotionSettlementStatus = 'pending_confirm' | 'confirmed';

export type PromotionEventType =
  | 'register_reward'
  | 'profile_complete_reward'
  | 'verify_complete_reward'
  | 'first_vip_reward'
  | 'first_coin_recharge_reward'
  | 'ladder_bonus';

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface PromotionRuleEvent {
  eventType: Exclude<PromotionEventType, 'ladder_bonus'>;
  eventLabel: string;
  enabled: boolean;
  amount: number;
}

export interface PromotionRuleTier {
  threshold: number;
  amount: number;
  enabled: boolean;
}

export interface PromotionRuleConfig {
  sourceType: PromotionSourceType;
  rewardMode: PromotionRewardMode;
  version: number;
  events: PromotionRuleEvent[];
  tiers: PromotionRuleTier[];
  publishedAt?: string;
}

export interface PromotionRulePublishRequest {
  sourceType: PromotionSourceType;
  rewardMode: PromotionRewardMode;
  expectedVersion: number;
  events: PromotionRuleEvent[];
  tiers: PromotionRuleTier[];
}

export interface PromotionRelationListItem {
  relationNo: string;
  sourceType: PromotionSourceType;
  sourceObjectNo: string;
  sourceObjectName: string;
  inviteeUserNo: string;
  inviteeNickname: string;
  inviteeMobileMasked?: string;
  registeredAt: string;
  paidRewardTotal: number;
}

export interface PromotionRelationRewardItem {
  rewardNo: string;
  eventType: PromotionEventType;
  eventLabel: string;
  ladderThreshold?: number;
  amount: number;
  status?: PromotionRewardStatus;
  createdAt: string;
  paidAt?: string;
  failureReason?: string;
}

export interface PromotionRelationDetail extends PromotionRelationListItem {
  inviterId?: number;
  agentId?: number;
  rewardItems: PromotionRelationRewardItem[];
}

export interface PromotionRewardListItem {
  rewardNo: string;
  relationNo: string;
  sourceType: PromotionSourceType;
  rewardObjectNo: string;
  rewardObjectName: string;
  inviteeUserNo: string;
  inviteeNickname: string;
  eventType: PromotionEventType;
  eventLabel: string;
  ladderThreshold?: number;
  amount: number;
  amountUnit: 'coin' | 'cny';
  status: PromotionRewardStatus;
  ruleVersion: number;
  retryCount: number;
  failureReason?: string;
  createdAt: string;
  paidAt?: string;
}

export interface PromotionAgentListItem {
  agentNo: string;
  agentName: string;
  school: string;
  campus: string;
  contactName?: string;
  contactPhoneMasked?: string;
  contactPhone?: string;
  status: PromotionAgentStatus;
  scanClickCount: number;
  registerCount: number;
  payableBonus: number;
  paidBonus: number;
  pendingBonus: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromotionAgentBonusRecord {
  bonusNo: string;
  eventLabel: string;
  inviteeDisplayName: string;
  bonusAmount: number;
  occurredAt: string;
  settlementNo?: string;
}

export interface PromotionAgentSettlementRecord {
  settlementNo: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: PromotionSettlementStatus;
  confirmedAt?: string;
}

export interface PromotionAgentDetail extends PromotionAgentListItem {
  remark?: string;
  bonusRecords: PromotionAgentBonusRecord[];
  settlementRecords: PromotionAgentSettlementRecord[];
}

export interface PromotionAgentSaveRequest {
  agentName: string;
  school: string;
  campus: string;
  contactName?: string;
  contactPhone?: string;
  remark?: string;
}

export interface PromotionAgentQrCode {
  agentNo: string;
  qrToken: string;
  miniappPath: string;
  imageUrl: string;
  createdAt: string;
}

export interface PromotionSettlementListItem {
  settlementNo: string;
  agentNo: string;
  agentName: string;
  school: string;
  campus: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: PromotionSettlementStatus;
  generatedAt: string;
  confirmedAt?: string;
  confirmedByName?: string;
}

export interface PromotionExportTask {
  taskNo: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  fileName?: string;
  downloadUrl?: string;
  rowCount?: number;
}

export interface PromotionRelationQuery {
  page: number;
  size: number;
  relationNo?: string;
  sourceKeyword?: string;
  inviteeKeyword?: string;
  sourceType?: PromotionSourceType;
  registeredStartTime?: string;
  registeredEndTime?: string;
}

export interface PromotionRewardQuery {
  page: number;
  size: number;
  rewardNo?: string;
  rewardObjectKeyword?: string;
  inviteeKeyword?: string;
  sourceType?: PromotionSourceType;
  eventType?: PromotionEventType;
  ladderThreshold?: number;
  status?: PromotionRewardStatus;
  createdStartTime?: string;
  createdEndTime?: string;
}

export interface PromotionAgentQuery {
  page: number;
  size: number;
  keyword?: string;
  school?: string;
  campus?: string;
  status?: PromotionAgentStatus;
}

export interface PromotionSettlementQuery {
  page: number;
  size: number;
  settlementNo?: string;
  agentKeyword?: string;
  periodMonth?: string;
  status?: PromotionSettlementStatus;
}
