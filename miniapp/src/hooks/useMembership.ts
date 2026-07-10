import { useState, useCallback, useMemo } from 'react'
import Taro from '@tarojs/taro'
import type { MembershipPlan, MembershipRecord, MyMembership, MemberStatus } from '@/types/membership'
import {
  confirmWechatPayment,
  createOrder,
  getVipBenefits,
  getVipOrders,
  getVipPackages,
  getVipStatus,
  requestWechatPayment,
  type VipBenefitVO,
  type VipOrderVO,
  type VipPackageVO,
  type VipStatusVO,
} from '@/services/payment'

export interface MembershipBenefit {
  icon: string
  title: string
  value: string
  desc: string
}

export type MembershipPayState = 'idle' | 'paying' | 'pay-success' | 'pay-cancel' | 'pay-failed' | 'unpaid-sheet'

function durationLabel(days?: number) {
  if (!days) return '1个月'
  if (days >= 365) return '12个月'
  if (days >= 90) return '3个月'
  if (days >= 30) return '1个月'
  return `${days}天`
}

function monthlyPriceLabel(price: number, days?: number) {
  const months = days && days >= 365 ? 12 : days && days >= 90 ? 3 : 1
  return `¥${(price / months).toFixed(2)}/月`
}

function adaptVipPackage(pkg: VipPackageVO): MembershipPlan {
  const price = Number(pkg.price || 0)
  const originPrice = Number(pkg.originPrice || pkg.price || 0)
  return {
    id: pkg.id,
    name: pkg.packageName,
    price,
    originalPrice: originPrice,
    duration: pkg.durationDays || 30,
    durationLabel: durationLabel(pkg.durationDays),
    monthlyPriceLabel: monthlyPriceLabel(price, pkg.durationDays),
    tag: pkg.packageTag,
    subscriptionType: pkg.subscriptionType,
    perks: [],
  }
}

function adaptVipBenefit(benefit: VipBenefitVO): MembershipBenefit {
  const rawIcon = benefit.mobileIcon || benefit.benefitCode || ''
  return {
    icon: rawIcon.replace(/^icon-/, ''),
    title: benefit.benefitName || benefit.benefitCode || '会员权益',
    value: benefit.benefitValue == null ? '' : String(benefit.benefitValue),
    desc: benefit.benefitDesc || '',
  }
}

function adaptVipStatus(status: VipStatusVO): MyMembership {
  if (status.vipStatus === 'active' || status.vipStatus === 'expired') {
    return {
      status: status.vipStatus,
      startTime: status.memberStartTime,
      expireTime: status.vipExpireTime,
      planName: status.packageName,
      orderNo: status.orderNo,
      packageId: status.packageId,
      subscriptionType: status.subscriptionType,
      payChannel: status.payChannel,
    }
  }
  return { status: 'none' }
}

function formatDisplayDate(value?: string) {
  if (!value) return ''
  const normalized = value.replace('T', ' ').replace(/\+08:00$/, '')
  const [date = '', time = ''] = normalized.split(' ')
  const clock = time.split('.')[0].slice(0, 5)
  return `${date.replace(/-/g, '.')}${clock ? ` ${clock}` : ''}`
}

function payChannelName(channel?: string) {
  if (channel === 'wechat') return '微信'
  if (channel === 'alipay') return '支付宝'
  return channel || '微信'
}

function orderStatusLabel(status?: string) {
  if (status === 'success') return '已支付'
  if (status === 'refunding') return '退款中'
  if (status === 'refunded') return '已退款'
  if (status === 'closed') return '已关闭'
  if (status === 'failed') return '支付失败'
  return '未支付'
}

function adaptVipOrder(order: VipOrderVO): MembershipRecord {
  const startTime = formatDisplayDate(order.successTime || order.createTime)
  const endTime = formatDisplayDate(order.expireTime)
  return {
    id: order.id,
    packageId: order.packageId,
    planName: order.packageName,
    listTitle: order.packageName,
    subscriptionType: order.subscriptionType,
    durationDays: order.durationDays,
    durationLabel: durationLabel(order.durationDays),
    amount: Number(order.payAmount || 0),
    startTime,
    endTime,
    validityStart: startTime,
    validityEnd: endTime,
    status: orderStatusLabel(order.orderStatus),
    statusCode: order.orderStatus,
    orderNo: order.orderNo,
    createTime: formatDisplayDate(order.createTime),
    payTime: formatDisplayDate(order.successTime),
    payMethod: payChannelName(order.payChannel),
  }
}

function isPaymentCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { errMsg?: string })?.errMsg || error || '')
  return message.includes('cancel') || message.includes('取消')
}

async function confirmPaidOrder(orderId: number) {
  let lastResult: Awaited<ReturnType<typeof confirmWechatPayment>> | null = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    lastResult = await confirmWechatPayment(orderId)
    if (lastResult.orderStatus === 'success') return lastResult
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 800))
  }
  return lastResult
}

/**
 * 会员模块 hook，生产路径只消费会员状态、权益、套餐、订单和微信支付接口。
 */
export function useMembership() {
  const [myMembership, setMyMembership] = useState<MyMembership>({ status: 'none' })
  const [statusLoading, setStatusLoading] = useState(false)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null)
  const [payPopupVisible, setPayPopupVisible] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [payState, setPayState] = useState<MembershipPayState>('idle')
  const [activeStatus, setActiveStatus] = useState<MemberStatus | 'all'>('all')
  const [records, setRecords] = useState<MembershipRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [benefits, setBenefits] = useState<MembershipBenefit[]>([])

  const filteredRecords = useMemo(() => {
    if (activeStatus === 'all') return records
    return records.filter((record) => {
      if (activeStatus === 'active') return record.status === '已开通' || record.status === '生效中' || record.status === '已支付'
      if (activeStatus === 'expired') return record.status === '已过期' || record.status === '即将过期' || record.status === '已退款'
      return false
    })
  }, [records, activeStatus])

  const fetchMyMembership = useCallback(async () => {
    setStatusLoading(true)
    try {
      setMyMembership(adaptVipStatus(await getVipStatus()))
    } catch {
      setMyMembership({ status: 'none' })
    } finally {
      setStatusLoading(false)
    }
  }, [])

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true)
    try {
      const nextPlans = (await getVipPackages()).map(adaptVipPackage)
      setPlans(nextPlans)
      setSelectedPlan((currentPlan) => {
        const current = currentPlan && nextPlans.find((plan) => plan.id === currentPlan.id)
        return current || nextPlans.find((plan) => plan.tag) || nextPlans[0] || null
      })
    } finally {
      setPlansLoading(false)
    }
  }, [])

  const fetchBenefits = useCallback(async () => {
    setBenefits((await getVipBenefits()).map(adaptVipBenefit))
  }, [])

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const page = await getVipOrders(1, 50)
      setRecords((page.records || []).map(adaptVipOrder))
    } finally {
      setRecordsLoading(false)
    }
  }, [])

  const selectPlan = useCallback((plan: MembershipPlan) => setSelectedPlan(plan), [])

  const closePayPopup = useCallback(() => {
    setPayPopupVisible(false)
    setPayState('idle')
  }, [])

  const showUnpaidSheet = useCallback(() => {
    setPayPopupVisible(true)
    setPayState('unpaid-sheet')
  }, [])

  const hidePaymentLayer = useCallback(() => {
    setPayPopupVisible(false)
    setPayState('idle')
  }, [])

  const confirmPay = useCallback(async (sourcePage = 'membership') => {
    if (!selectedPlan) {
      Taro.showToast({ title: '暂无可购买套餐', icon: 'none' })
      return
    }
    let orderId: number | null = null
    setPayLoading(true)
    setPayPopupVisible(true)
    setPayState('paying')
    try {
      const order = await createOrder(selectedPlan.id, 'vip')
      orderId = order.orderId
      if (!order.payParams) throw new Error('微信支付参数缺失')
      await requestWechatPayment(order.payParams)
      const payResult = await confirmPaidOrder(order.orderId)
      if (payResult?.orderStatus !== 'success') {
        setPayState('pay-failed')
        Taro.showToast({ title: '支付确认中，请稍后刷新', icon: 'none' })
        Taro.navigateTo({ url: `/pages/commerce/payment-result?orderId=${order.orderId}&orderType=vip&sourcePage=${sourcePage}&result=processing` })
        return
      }
      setMyMembership(adaptVipStatus(await getVipStatus()))
      await fetchRecords()
      setPayState('pay-success')
      Taro.navigateTo({ url: `/pages/commerce/payment-result?orderId=${order.orderId}&orderType=vip&sourcePage=${sourcePage}&result=success` })
    } catch (error) {
      const cancelled = isPaymentCancel(error)
      setPayState(cancelled ? 'pay-cancel' : 'pay-failed')
      if (!cancelled) Taro.showToast({ title: error instanceof Error ? error.message : '支付失败，请重试', icon: 'none' })
      if (orderId) Taro.navigateTo({ url: `/pages/commerce/payment-result?orderId=${orderId}&orderType=vip&sourcePage=${sourcePage}&result=${cancelled ? 'cancel' : 'failed'}` })
    } finally {
      setPayLoading(false)
    }
  }, [fetchRecords, selectedPlan])

  const goToRecords = useCallback(() => Taro.navigateTo({ url: '/pages/membership/records' }), [])
  const changeStatus = useCallback((status: MemberStatus | 'all') => setActiveStatus(status), [])

  return {
    myMembership,
    statusLoading,
    plans,
    plansLoading,
    selectedPlan,
    payPopupVisible,
    payLoading,
    payState,
    activeStatus,
    records,
    recordsLoading,
    filteredRecords,
    benefits,
    fetchMyMembership,
    fetchPlans,
    fetchBenefits,
    fetchRecords,
    selectPlan,
    closePayPopup,
    confirmPay,
    showUnpaidSheet,
    hidePaymentLayer,
    goToRecords,
    changeStatus,
  }
}
