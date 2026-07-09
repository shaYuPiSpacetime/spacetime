import { useState, useCallback, useMemo } from 'react'
import Taro from '@tarojs/taro'
import type { MembershipPlan, MembershipRecord, MyMembership, MemberStatus } from '@/types/membership'
import { getDemoPageData } from '@/services/lanhuDemo'
import {
  createOrder,
  getVipPackages,
  getVipStatus,
  requestWechatPayment,
  type VipPackageVO,
  type VipStatusVO,
} from '@/services/payment'

const membershipDemo = getDemoPageData('membership')
type MembershipDemoVariant = 'default' | 'none' | 'active' | 'expired' | 'annual'
export type MembershipPayState = 'idle' | 'wechat-pay' | 'pay-success' | 'pay-cancel' | 'unpaid-sheet'

function membershipForVariant(variant: MembershipDemoVariant): MyMembership {
  if (variant === 'active' || variant === 'annual') return { ...membershipDemo.activeMembership }
  if (variant === 'expired') return { ...membershipDemo.expiredMembership }
  return { ...membershipDemo.myMembership }
}

function plansForVariant(variant: MembershipDemoVariant): MembershipPlan[] {
  if (variant === 'default') return [...membershipDemo.regularPlans]
  return [...membershipDemo.plans]
}

function defaultPlanForVariant(variant: MembershipDemoVariant, plans = plansForVariant(variant)): MembershipPlan | null {
  if (variant === 'annual') {
    return plans.find((plan) => plan.id === membershipDemo.annualPlanId) ?? plans[0] ?? null
  }
  return plans[0] ?? null
}

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
    perks: [],
  }
}

function adaptVipStatus(status: VipStatusVO): MyMembership {
  if (status.vipStatus === 'active') {
    return {
      status: 'active',
      expireTime: status.vipExpireTime,
      planName: membershipDemo.activeMembership.planName,
    }
  }
  if (status.vipStatus === 'expired') {
    return {
      status: 'expired',
      expireTime: status.vipExpireTime,
      planName: membershipDemo.expiredMembership.planName,
    }
  }
  return { ...membershipDemo.myMembership }
}

function isRoutePreviewVariant(variant: MembershipDemoVariant) {
  return variant === 'active' || variant === 'expired' || variant === 'annual'
}

function isPaymentCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { errMsg?: string })?.errMsg || error || '')
  return message.includes('cancel') || message.includes('取消')
}

/**
 * 会员模块 hook
 * 封装会员状态查询、套餐选择、支付结果、记录加载等完整逻辑。
 */
export function useMembership(variant: MembershipDemoVariant = 'default') {
  /* ---------- 会员状态 ---------- */
  const [myMembership, setMyMembership] = useState<MyMembership>(() => membershipForVariant(variant))
  const [statusLoading, setStatusLoading] = useState(false)

  /* ---------- 套餐列表 ---------- */
  const [plans, setPlans] = useState<MembershipPlan[]>(() => plansForVariant(variant))
  const [plansLoading, setPlansLoading] = useState(false)

  /* ---------- 选中的套餐 ---------- */
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(() => defaultPlanForVariant(variant))

  /* ---------- 支付弹窗 ---------- */
  const [payPopupVisible, setPayPopupVisible] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [payState, setPayState] = useState<MembershipPayState>('idle')

  /* ---------- 状态筛选 Tab ---------- */
  const [activeStatus, setActiveStatus] = useState<MemberStatus | 'all'>('all')

  /* ---------- 会员记录 ---------- */
  const [records, setRecords] = useState<MembershipRecord[]>(membershipDemo.records)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [benefits] = useState(membershipDemo.benefits)

  /** 筛选后的记录列表 */
  const filteredRecords = useMemo(() => {
    if (activeStatus === 'all') return records
    return records.filter((r) => {
      if (activeStatus === 'active') return r.status === '已开通' || r.status === '生效中'
      if (activeStatus === 'expired') return r.status === '已过期' || r.status === '即将过期'
      return false
    })
  }, [records, activeStatus])

  /* ---------- 操作方法 ---------- */

  /** 刷新会员状态 */
  const fetchMyMembership = useCallback(async () => {
    setStatusLoading(true)
    try {
      if (isRoutePreviewVariant(variant)) {
        setMyMembership(membershipForVariant(variant))
        return
      }
      const nextStatus = await getVipStatus()
      setMyMembership(adaptVipStatus(nextStatus))
    } catch {
      setMyMembership(membershipForVariant(variant))
    } finally {
      setStatusLoading(false)
    }
  }, [variant])

  /** 加载套餐列表 */
  const fetchPlans = useCallback(async () => {
    setPlansLoading(true)
    try {
      const serverPlans = await getVipPackages()
      const nextPlans = serverPlans.length > 0 ? serverPlans.map(adaptVipPackage) : plansForVariant(variant)
      setPlans(nextPlans)
      setSelectedPlan((currentPlan) => currentPlan ?? defaultPlanForVariant(variant, nextPlans))
    } catch {
      const nextPlans = plansForVariant(variant)
      setPlans(nextPlans)
      setSelectedPlan((currentPlan) => currentPlan ?? defaultPlanForVariant(variant, nextPlans))
    } finally {
      setPlansLoading(false)
    }
  }, [variant])

  /** 加载会员记录（Mock 实现） */
  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      // 后续替换为真实 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500))
      setRecords([...membershipDemo.records])
    } finally {
      setRecordsLoading(false)
    }
  }, [])

  /** 选中套餐 */
  const selectPlan = useCallback((plan: MembershipPlan) => {
    setSelectedPlan(plan)
  }, [])

  /** 关闭支付弹窗 */
  const closePayPopup = useCallback(() => {
    setPayPopupVisible(false)
    setPayState('idle')
    setSelectedPlan(null)
  }, [])

  /** 预览指定支付状态，供蓝湖 demo query 直达 */
  const previewPayState = useCallback((nextState: MembershipPayState) => {
    setPayState(nextState)
    setPayPopupVisible(nextState !== 'idle')
  }, [])

  /** 打开蓝湖微信支付预览面板 */
  const openWechatPay = useCallback(() => {
    if (!selectedPlan) {
      Taro.showToast({ title: '请选择套餐', icon: 'none' })
      return
    }
    setPayPopupVisible(true)
    setPayState('wechat-pay')
  }, [selectedPlan])

  /** 模拟支付成功 */
  const simulatePaySuccess = useCallback(async () => {
    if (!selectedPlan) {
      Taro.showToast({ title: '请选择套餐', icon: 'none' })
      return
    }
    setPayLoading(true)
    try {
      // 后续替换为真实支付 API 调用
      await new Promise((resolve) => setTimeout(resolve, 360))
      setMyMembership({ ...membershipDemo.activeMembership })
      setPayPopupVisible(true)
      setPayState('pay-success')
    } catch {
      Taro.showToast({ title: '支付失败，请重试', icon: 'none' })
    } finally {
      setPayLoading(false)
    }
  }, [selectedPlan])

  /** 模拟取消支付 */
  const simulatePayCancel = useCallback(() => {
    setPayPopupVisible(true)
    setPayState('pay-cancel')
  }, [])

  /** 展示未支付挽留底部弹层 */
  const showUnpaidSheet = useCallback(() => {
    setPayPopupVisible(true)
    setPayState('unpaid-sheet')
  }, [])

  /** 隐藏支付状态层 */
  const hidePaymentLayer = useCallback(() => {
    setPayPopupVisible(false)
    setPayState('idle')
  }, [])

  /** 确认支付 */
  const confirmPay = useCallback(async () => {
    if (!selectedPlan) {
      Taro.showToast({ title: '请选择套餐', icon: 'none' })
      return
    }
    setPayLoading(true)
    try {
      const order = await createOrder(selectedPlan.id, 'vip')
      if (!order.payParams) {
        throw new Error('微信支付参数缺失')
      }
      await requestWechatPayment(order.payParams)
      setMyMembership({ ...membershipDemo.activeMembership })
      setPayPopupVisible(true)
      setPayState('pay-success')
    } catch (error) {
      setPayPopupVisible(true)
      if (isPaymentCancel(error)) {
        setPayState('pay-cancel')
      } else {
        setPayState('idle')
        Taro.showToast({ title: error instanceof Error ? error.message : '支付失败，请重试', icon: 'none' })
      }
    } finally {
      setPayLoading(false)
    }
  }, [selectedPlan])

  /** 跳转到会员记录页 */
  const goToRecords = useCallback(() => {
    Taro.navigateTo({ url: '/pages/membership/records' })
  }, [])

  /** 切换状态筛选 */
  const changeStatus = useCallback((status: MemberStatus | 'all') => {
    setActiveStatus(status)
  }, [])

  return {
    /* 状态 */
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
    /* 方法 */
    fetchMyMembership,
    fetchPlans,
    fetchRecords,
    selectPlan,
    closePayPopup,
    confirmPay,
    openWechatPay,
    simulatePaySuccess,
    simulatePayCancel,
    showUnpaidSheet,
    hidePaymentLayer,
    previewPayState,
    goToRecords,
    changeStatus,
  }
}
