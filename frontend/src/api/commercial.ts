import request from './request';

export interface VipBenefitConfig {
  id?: number;
  benefitCode: string;
  benefitName: string;
  benefitType: string;
  benefitDesc?: string;
  mobileIcon?: string;
  benefitValue?: number;
  fixedFlag?: number;
  displayOrder?: number;
  status?: string;
}

export interface VipPackageConfig {
  id?: number;
  packageName: string;
  packageType: string;
  subscriptionType?: string;
  price: number;
  originPrice?: number;
  durationDays: number;
  recommendFlag?: number;
  packageTag?: string;
  wechatProductId?: string;
  agreementConfig?: string;
  payChannelReserve?: string;
  sortOrder?: number;
  status?: string;
}

export interface CoinPackageConfig {
  id?: number;
  packageName: string;
  amount: number;
  originAmount?: number;
  discountAmount?: number;
  coinCount: number;
  bonusCoinCount?: number;
  recommendFlag?: number;
  packageTag?: string;
  mobileTag?: string;
  packageDesc?: string;
  sortOrder?: number;
  status?: string;
}

export interface CoinSceneConfig {
  id?: number;
  sceneCode: string;
  mobileName: string;
  mobileIcon?: string;
  sceneDesc?: string;
  unitPrice: number;
  retentionDays?: number;
  sortOrder?: number;
  status?: string;
}

export interface CommercialConfigLog {
  id: number;
  configVersion: string;
  changeModule: string;
  changeSummary: string;
  operatorName?: string;
  createTime?: string;
}

export interface CommercialConfig {
  configVersion: string;
  vipBenefits: VipBenefitConfig[];
  vipPackages: VipPackageConfig[];
  coinPackages: CoinPackageConfig[];
  coinScenes: CoinSceneConfig[];
  latestLogs: CommercialConfigLog[];
}

export interface TradeOrder {
  id: number;
  orderNo: string;
  userId: number;
  orderType: string;
  packageName?: string;
  payAmount: number;
  payChannel?: string;
  channelTradeNo?: string;
  orderStatus: string;
  successTime?: string;
  refundTime?: string;
  refundReason?: string;
  createTime?: string;
}

export interface CoinFlow {
  id: number;
  flowNo: string;
  userId: number;
  assetType?: string;
  flowType: string;
  changeAmount: number;
  balanceBefore?: number;
  balanceAfter: number;
  bizScene?: string;
  bizDesc?: string;
  refId?: number;
  refType?: string;
  createTime?: string;
}

export interface RefundRecord {
  id: number;
  refundNo: string;
  orderId: number;
  orderNo: string;
  userId: number;
  orderType?: string;
  packageName?: string;
  payAmount?: number;
  orderStatus?: string;
  refundAmount: number;
  refundReason?: string;
  refundStatus: string;
  assetRollbackAction?: string;
  channelRefundStatus?: string;
  refundTime?: string;
  createTime?: string;
}

export interface ReconcileDaily {
  date: string;
  successOrderCount: number;
  vipOrderCount: number;
  coinOrderCount: number;
  refundOrderCount: number;
  orderAmount: number;
  refundAmount: number;
  netAmount: number;
  refundRate: number;
}

export interface ExportTask {
  taskNo: string;
  exportType: string;
  status: string;
  message: string;
  createTime?: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

export function getCommercialConfig() {
  return request.get<CommercialConfig>('/admin/commercial/config');
}

export function saveCommercialConfig(data: Partial<CommercialConfig> & { changeSummary?: string }) {
  return request.put<CommercialConfig>('/admin/commercial/config', data);
}

export function getCommercialConfigLogs(params: { page: number; size: number }) {
  return request.get<PageResult<CommercialConfigLog>>('/admin/commercial/config/logs', { params });
}

export function getCommercialOrderList(params: Record<string, unknown>) {
  return request.get<PageResult<TradeOrder>>('/admin/finance/orders/list', { params });
}

export function getCommercialOrderDetail(id: number) {
  return request.get<TradeOrder>(`/admin/finance/orders/${id}`);
}

export function refundCommercialOrder(id: number, data: { reason: string; refundAmount?: number }) {
  return request.post(`/admin/finance/orders/${id}/refund`, data);
}

export function exportCommercialOrders() {
  return request.post<ExportTask>('/admin/finance/orders/export');
}

export function getCommercialFlowList(params: Record<string, unknown>) {
  return request.get<PageResult<CoinFlow>>('/admin/finance/flows/list', { params });
}

export function exportCommercialFlows() {
  return request.post<ExportTask>('/admin/finance/flows/export');
}

export function getCommercialRefundList(params: Record<string, unknown>) {
  return request.get<PageResult<RefundRecord>>('/admin/finance/refunds/list', { params });
}

export function getCommercialRefundDetail(id: number) {
  return request.get(`/admin/finance/refunds/list/${id}`);
}

export function exportCommercialRefunds() {
  return request.post<ExportTask>('/admin/finance/refunds/export');
}

export function getCommercialReconcileDaily(date: string) {
  return request.get<ReconcileDaily>('/admin/finance/reconcile/daily', { params: { date } });
}

export function exportCommercialReconcile() {
  return request.post<ExportTask>('/admin/finance/reconcile/export');
}
