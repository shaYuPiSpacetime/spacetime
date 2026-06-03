import { get, post } from './request'

/** VIP 套餐 */
export interface VipPackageVO {
  id: number
  name: string
  price: number
  duration: number
  benefits: string[]
}

/** 成家币套餐 */
export interface CoinPackageVO {
  id: number
  amount: number
  price: number
  bonus: number
}

/** 获取 VIP 套餐列表 */
export function getVipPackages(): Promise<VipPackageVO[]> {
  return get<VipPackageVO[]>('/miniapp/payment/vip/packages')
}

/** 获取成家币套餐列表 */
export function getCoinPackages(): Promise<CoinPackageVO[]> {
  return get<CoinPackageVO[]>('/miniapp/payment/coin/packages')
}

/** 创建充值订单 */
export function createOrder(packageId: number, type: 'VIP' | 'COIN'): Promise<{ orderId: number; payParams: unknown }> {
  return post<{ orderId: number; payParams: unknown }>('/miniapp/payment/order', { packageId, type })
}
