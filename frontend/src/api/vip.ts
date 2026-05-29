import request from './request';

/** VIP 权益 */
export interface VipBenefit {
  id: number;
  benefitCode: string;
  benefitName: string;
  benefitType: string;
  benefitDesc: string;
  displayOrder: number;
  status: string;
  createTime?: string;
  updateTime?: string;
}

/** VIP 套餐 */
export interface VipPackage {
  id: number;
  packageName: string;
  packageType: string;
  price: number;
  originPrice?: number;
  durationDays: number;
  recommendFlag: number;
  packageTag?: string;
  sortOrder: number;
  status: string;
  createTime?: string;
  updateTime?: string;
}

// ==================== VIP 权益 API ====================

/** 获取 VIP 权益列表 */
export function getVipBenefits() {
  return request.get<VipBenefit[]>('/admin/vip/benefits/list');
}

/** 获取单个 VIP 权益 */
export function getVipBenefit(id: number) {
  return request.get<VipBenefit>(`/admin/vip/benefits/${id}`);
}

/** 新增 VIP 权益 */
export function createVipBenefit(data: Partial<VipBenefit>) {
  return request.post<number>('/admin/vip/benefits', data);
}

/** 编辑 VIP 权益 */
export function updateVipBenefit(id: number, data: Partial<VipBenefit>) {
  return request.put(`/admin/vip/benefits/${id}`, data);
}

/** 更新 VIP 权益启停状态 */
export function updateVipBenefitStatus(id: number, status: string) {
  return request.put(`/admin/vip/benefits/${id}/status`, { status });
}

// ==================== VIP 套餐 API ====================

/** 获取 VIP 套餐列表 */
export function getVipPackages() {
  return request.get<VipPackage[]>('/admin/vip/packages/list');
}

/** 获取单个 VIP 套餐 */
export function getVipPackage(id: number) {
  return request.get<VipPackage>(`/admin/vip/packages/${id}`);
}

/** 新增 VIP 套餐 */
export function createVipPackage(data: Partial<VipPackage>) {
  return request.post<number>('/admin/vip/packages', data);
}

/** 编辑 VIP 套餐 */
export function updateVipPackage(id: number, data: Partial<VipPackage>) {
  return request.put(`/admin/vip/packages/${id}`, data);
}

/** 更新 VIP 套餐启停状态 */
export function updateVipPackageStatus(id: number, status: string) {
  return request.put(`/admin/vip/packages/${id}/status`, { status });
}
