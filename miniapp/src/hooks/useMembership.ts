import { useState, useCallback, useMemo } from 'react'
import Taro from '@tarojs/taro'
import type { MembershipPlan, MembershipRecord, MyMembership, MemberStatus } from '@/types/membership'
import { mockMembershipPlans, mockMyMembership, mockMembershipRecords } from '@/services/mock'

/**
 * 会员模块 hook
 * 封装会员状态查询、套餐选择、支付弹窗、记录加载等完整逻辑
 *
 * 注意：当前所有数据使用 Mock，后续接入真实 API 只需替换 fetch* 函数。
 */
export function useMembership() {
  /* ---------- 会员状态 ---------- */
  const [myMembership, setMyMembership] = useState<MyMembership>(mockMyMembership)
  const [statusLoading, setStatusLoading] = useState(false)

  /* ---------- 套餐列表 ---------- */
  const [plans, setPlans] = useState<MembershipPlan[]>(mockMembershipPlans)
  const [plansLoading, setPlansLoading] = useState(false)

  /* ---------- 选中的套餐 ---------- */
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null)

  /* ---------- 支付弹窗 ---------- */
  const [payPopupVisible, setPayPopupVisible] = useState(false)
  const [payLoading, setPayLoading] = useState(false)

  /* ---------- 状态筛选 Tab ---------- */
  const [activeStatus, setActiveStatus] = useState<MemberStatus | 'all'>('all')

  /* ---------- 会员记录 ---------- */
  const [records, setRecords] = useState<MembershipRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)

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
      // TODO: 替换为真实 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500))
      setMyMembership({ ...mockMyMembership })
    } finally {
      setStatusLoading(false)
    }
  }, [])

  /** 加载套餐列表（Mock 实现） */
  const fetchPlans = useCallback(async () => {
    setPlansLoading(true)
    try {
      // TODO: 替换为真实 API 调用
      await new Promise((resolve) => setTimeout(resolve, 300))
      setPlans([...mockMembershipPlans])
    } finally {
      setPlansLoading(false)
    }
  }, [])

  /** 加载会员记录（Mock 实现） */
  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      // TODO: 替换为真实 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500))
      setRecords([...mockMembershipRecords])
    } finally {
      setRecordsLoading(false)
    }
  }, [])

  /** 选中套餐并打开支付弹窗 */
  const selectPlan = useCallback((plan: MembershipPlan) => {
    setSelectedPlan(plan)
    setPayPopupVisible(true)
  }, [])

  /** 关闭支付弹窗 */
  const closePayPopup = useCallback(() => {
    setPayPopupVisible(false)
    setSelectedPlan(null)
  }, [])

  /** 确认支付 */
  const confirmPay = useCallback(async () => {
    if (!selectedPlan) return
    setPayLoading(true)
    try {
      // TODO: 替换为真实支付 API 调用
      await new Promise((resolve) => setTimeout(resolve, 1500))
      Taro.showToast({ title: '支付成功', icon: 'success' })
      closePayPopup()
      // 刷新状态
      await fetchMyMembership()
    } catch {
      Taro.showToast({ title: '支付失败，请重试', icon: 'none' })
    } finally {
      setPayLoading(false)
    }
  }, [selectedPlan, closePayPopup, fetchMyMembership])

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
    activeStatus,
    records,
    recordsLoading,
    filteredRecords,
    /* 方法 */
    fetchMyMembership,
    fetchPlans,
    fetchRecords,
    selectPlan,
    closePayPopup,
    confirmPay,
    goToRecords,
    changeStatus,
  }
}
