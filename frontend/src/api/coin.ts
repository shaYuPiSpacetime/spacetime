import request from './request';

/** 成家币套餐 */
export interface CoinPackage {
  id: number;
  packageName: string;
  amount: number;
  coinCount: number;
  bonusCoinCount: number;
  recommendFlag: number;
  packageTag?: string;
  packageDesc?: string;
  sortOrder: number;
  status: string;
  createTime?: string;
  updateTime?: string;
}

// ==================== 成家币套餐 API ====================

/** 获取成家币套餐列表 */
export function getCoinPackages() {
  return request.get<CoinPackage[]>('/admin/coin/packages/list');
}

/** 获取单个成家币套餐 */
export function getCoinPackage(id: number) {
  return request.get<CoinPackage>(`/admin/coin/packages/${id}`);
}

/** 新增成家币套餐 */
export function createCoinPackage(data: Partial<CoinPackage>) {
  return request.post<number>('/admin/coin/packages', data);
}

/** 编辑成家币套餐 */
export function updateCoinPackage(id: number, data: Partial<CoinPackage>) {
  return request.put(`/admin/coin/packages/${id}`, data);
}

/** 更新成家币套餐启停状态 */
export function updateCoinPackageStatus(id: number, status: string) {
  return request.put(`/admin/coin/packages/${id}/status`, { status });
}
