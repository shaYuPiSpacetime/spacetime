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

/** VIP 权益 */
export interface VipBenefitVO {
  id: number
  benefitCode: string
  benefitName: string
  benefitType?: string
  benefitDesc?: string
  mobileIcon?: string
  benefitValue?: number
  displayOrder?: number
}

/** 千寻币套餐 */
export interface CoinPackageVO {
  id: number
  packageName: string
  amount: number
  originAmount?: number
  discountAmount?: number
  coinCount: number
  bonusCoinCount?: number
  recommendFlag?: number
  packageTag?: string
  mobileTag?: string
  packageDesc?: string
}

/** 千寻币余额 */
export interface CoinBalanceVO {
  coinBalance: number
}

/** 千寻币流水 */
export interface CoinFlowVO {
  id: number
  flowNo: string
  flowType: string
  changeAmount: number
  balanceBefore?: number
  balanceAfter: number
  bizScene?: string
  bizDesc?: string
  createTime?: string
}

/** 千寻币消费场景 */
export interface CoinSceneVO {
  id: number
  sceneCode: string
  mobileDisplayName: string
  mobileIcon?: string
  sceneDesc?: string
  unitPrice: number
  retentionDays?: number
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
  orderId: number
  orderNo: string
  orderType: PaymentOrderType
  packageName?: string
  payAmount?: number
  createTime?: string
  orderStatus: string
  coinBalance?: number
  coinAmount?: number
  vipExpireTime?: string
  expireTime?: string
  successTime?: string
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

/** 获取已启用 VIP 权益 */
export function getVipBenefits(): Promise<VipBenefitVO[]> {
  return get<VipBenefitVO[]>('/miniapp/vip/benefits')
}

/** 获取千寻币套餐列表 */
export function getCoinPackages(): Promise<CoinPackageVO[]> {
  return get<CoinPackageVO[]>('/miniapp/coin/packages')
}

/** 获取当前用户千寻币余额 */
export function getCoinBalance(): Promise<CoinBalanceVO> {
  return get<CoinBalanceVO>('/miniapp/coin/balance')
}

/** 获取千寻币消费场景配置 */
export function getCoinScenes(): Promise<CoinSceneVO[]> {
  return get<CoinSceneVO[]>('/miniapp/coin/scenes')
}

/** 获取当前用户千寻币流水 */
export function getCoinFlows(page = 1, size = 20, flowType?: string): Promise<PageVO<CoinFlowVO>> {
  return get<PageVO<CoinFlowVO>>('/miniapp/coin/flows', flowType ? { page, size, flowType } : { page, size })
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

/** 查询当前用户支付订单结果 */
export function getPaymentOrder(orderId: number): Promise<PayResultVO> {
  return get<PayResultVO>(`/miniapp/payment/orders/${orderId}`)
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
