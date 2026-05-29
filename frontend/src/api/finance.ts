import request from './request';

/** 交易订单 */
export interface TradeOrder {
  id: number;
  orderNo: string;
  userId: number;
  orderType: string;
  packageId: number;
  packageName: string;
  payAmount: number;
  orderStatus: string;
  successTime?: string;
  expireTime?: string;
  refundTime?: string;
  refundReason?: string;
  remark?: string;
  createTime?: string;
}

/** 成家币流水 */
export interface CoinFlow {
  id: number;
  flowNo: string;
  userId: number;
  flowType: string;
  changeAmount: number;
  balanceAfter: number;
  bizScene: string;
  bizDesc?: string;
  refId?: number;
  refType?: string;
  createTime?: string;
}

/** 退款记录 */
export interface RefundRecord {
  id: number;
  orderNo: string;
  userId: number;
  orderType: string;
  payAmount: number;
  refundAmount: number;
  refundReason?: string;
  refundStatus: string;
  applyTime?: string;
  finishTime?: string;
  remark?: string;
}

/** 每日统计 */
export interface DailyStats {
  date: string;
  vipOrderCount: number;
  coinOrderCount: number;
  refundOrderCount: number;
  totalAmount: number;
}

// ==================== 订单管理 API ====================

/** 查询订单列表（分页） */
export function getOrderList(params: {
  page: number;
  size: number;
  orderNo?: string;
  orderType?: string;
  orderStatus?: string;
  startTime?: string;
  endTime?: string;
}) {
  return request.get('/admin/finance/orders/list', { params });
}

/** 获取订单详情 */
export function getOrderDetail(id: number) {
  return request.get<TradeOrder>(`/admin/finance/orders/${id}`);
}

/** 处理退款 */
export function processRefund(id: number, data: { refundReason: string; refundAmount?: number }) {
  return request.put(`/admin/finance/orders/${id}/refund`, data);
}

// ==================== 流水管理 API ====================

/** 查询流水列表（分页） */
export function getFlowList(params: {
  page: number;
  size: number;
  userId?: number;
  flowType?: string;
  bizScene?: string;
  startTime?: string;
  endTime?: string;
}) {
  return request.get('/admin/finance/flows/list', { params });
}

// ==================== 退款管理 API ====================

/** 查询退款列表（分页） */
export function getRefundList(params: {
  page: number;
  size: number;
  orderNo?: string;
  userId?: number;
  startTime?: string;
  endTime?: string;
}) {
  return request.get('/admin/finance/refunds/list', { params });
}

// ==================== 统计 API ====================

/** 获取每日统计数据 */
export function getDailyStats(date: string) {
  return request.get<DailyStats[]>('/admin/finance/stats/daily', { params: { date } });
}
