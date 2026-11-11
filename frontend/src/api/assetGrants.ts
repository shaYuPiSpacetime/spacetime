import request from './request';
import type { ApiResponse } from './promotion';

/** 单次赠送请求，重试必须复用 requestId。 */
export interface AssetGrantRequest {
  requestId: string;
  vipDays: number;
  coinAmount: number;
  reason: string;
}

/** 赠送回执不属于支付订单。 */
export interface AssetGrantReceipt {
  id: number;
  source: string;
  vipDays: number;
  coinAmount: number;
  balanceAfter: number;
  vipExpireAfter?: string;
  reason: string;
  operatorName?: string;
  createTime: string;
}

/** 为指定用户赠送权益。 */
export function grantUserAssets(userId: number, data: AssetGrantRequest) {
  return request.post<unknown, ApiResponse<AssetGrantReceipt>>(`/admin/commercial/users/${userId}/grants`, data);
}

/** 查询用户最近赠送记录。 */
export function getUserAssetGrants(userId: number) {
  return request.get<unknown, ApiResponse<AssetGrantReceipt[]>>(`/admin/commercial/users/${userId}/grants`);
}
