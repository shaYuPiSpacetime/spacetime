import Taro from '@tarojs/taro'
import { get, post } from './request'
import type { PageVO } from '@/types/api'

/** VIP 套餐 */
export interface VipPackageVO {
  id: number
  packageName: string
  packageType?: string
  subscriptionType?: string
  price: number
  originPrice?: number
  durationDays: number
  recommendFlag?: number
  packageTag?: string
}

/** 千寻币套餐 */
export interface CoinPackageVO {
  id: number
  packageName: string
  amount: number
  coinCount: number
  bonusCoinCount?: number
  recommendFlag?: number
  packageTag?: string
  packageDesc?: string
}

/** VIP 状态 */
export interface VipStatusVO {
  vipStatus?: string
  vipExpireTime?: string
  orderNo?: string
  packageId?: number
  packageName?: string
  subscriptionType?: string
  memberStartTime?: string
  payChannel?: string
}

/** VIP 订单记录 */
export interface VipOrderVO {
  id: number
  orderNo: string
  packageId?: number
  packageName: string
  subscriptionType?: string
  durationDays?: number
  payAmount: number
  payChannel?: string
  orderStatus: string
  createTime?: string
  successTime?: string
  expireTime?: string
  refundTime?: string
}

/** 支付结果 */
export interface PayResultVO {
  orderNo: string
  orderStatus: string
  coinBalance?: number
  vipExpireTime?: string
}

/** 微信 JSAPI 支付参数 */
export interface WechatPayParams {
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}

export type PaymentOrderType = 'vip' | 'coin'

/** 创建订单结果 */
export interface CreateOrderResult {
  orderId: number
  orderNo: string
  payAmount: number
  payChannel: string
  payParams: WechatPayParams
}

/** 获取 VIP 套餐列表 */
export function getVipPackages(): Promise<VipPackageVO[]> {
  return get<VipPackageVO[]>('/miniapp/vip/packages')
}

/** 获取千寻币套餐列表 */
export function getCoinPackages(): Promise<CoinPackageVO[]> {
  return get<CoinPackageVO[]>('/miniapp/coin/packages')
}

/** 获取当前 VIP 状态 */
export function getVipStatus(): Promise<VipStatusVO> {
  return get<VipStatusVO>('/miniapp/vip/status')
}

/** 获取当前用户 VIP 订单记录 */
export function getVipOrders(page = 1, size = 50): Promise<PageVO<VipOrderVO>> {
  return get<PageVO<VipOrderVO>>('/miniapp/vip/orders', { page, size })
}

/** 创建充值订单 */
export function createOrder(packageId: number, type: PaymentOrderType): Promise<CreateOrderResult> {
  return post<CreateOrderResult>('/miniapp/payment/create-order', { packageId, orderType: type })
}

/** 微信支付成功后主动确认订单，补偿回调延迟或丢失 */
export function confirmWechatPayment(orderId: number): Promise<PayResultVO> {
  return post<PayResultVO>(`/miniapp/payment/wechat/confirm/${orderId}`)
}

/** 唤起微信小程序原生支付面板 */
export async function requestWechatPayment(payParams: WechatPayParams): Promise<void> {
  await Taro.requestPayment({
    timeStamp: payParams.timeStamp,
    nonceStr: payParams.nonceStr,
    package: payParams.package,
    signType: payParams.signType as 'RSA',
    paySign: payParams.paySign,
  })
}
