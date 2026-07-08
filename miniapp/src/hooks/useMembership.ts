import { useState, useCallback, useMemo } from 'react'
import Taro from '@tarojs/taro'
import type { MembershipPlan, MembershipRecord, MyMembership, MemberStatus } from '@/types/membership'
import { getDemoPageData } from '@/services/lanhuDemo'

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

/**
 * 会员模块 hook
 * 封装会员状态查询、套餐选择、支付弹窗、记录加载等完整逻辑
 *
 * 注意：当前所有数据使用 Mock，后续接入真实 API 只需替换 fetch* 函数。
 */
export function useMembership(variant: MembershipDemoVariant = 'default') {
  /* ---------- 会员状态 ---------- */
  const [myMembership, setMyMembership] = useState<MyMembership>(() => membershipForVariant(variant))
  const [statusLoading, setStatusLoading] = useState(false)

  /* ---------- 套餐列表 ---------- */
  const [plans, setPlans] = useState<MembershipPlan[]>(() => plansForVariant(variant))
  const [plansLoading, setPlansLoading] = useState(false)

  /* ---------- 选中的套餐 ---------- */
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null)

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

  /** 刷新会员状态（Mock 实现） */
  const fetchMyMembership = useCallback(async () => {
    setStatusLoading(true)
    try {
      // 后续替换为真实 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500))
      setMyMembership(membershipForVariant(variant))
    } finally {
      setStatusLoading(false)
    }
  }, [variant])

  /** 加载套餐列表（Mock 实现） */
  const fetchPlans = useCallback(async () => {
    setPlansLoading(true)
    try {
      // 后续替换为真实 API 调用
      await new Promise((resolve) => setTimeout(resolve, 300))
      setPlans(plansForVariant(variant))
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

  /** 打开 mock 微信支付面板 */
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
    openWechatPay()
  }, [openWechatPay])

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
