import { useState, useCallback } from 'react'
import Taro from '@tarojs/taro'
import type { CoinPackage, CoinTransaction, CoinUsage } from '@/types/coin'
import { mockCoinBalance, mockCoinPackages, mockCoinTransactions, mockCoinUsages } from '@/services/mock'

/**
 * 成家币模块 hook
 * 封装余额查询、套餐选择、支付、交易明细加载等完整逻辑
 *
 * 注意：当前所有数据使用 Mock，后续接入真实 API 只需替换 fetch* 函数。
 */
export function useCoins() {
  /* ---------- 余额 ---------- */
  const [balance, setBalance] = useState<number>(mockCoinBalance)
  const [balanceLoading, setBalanceLoading] = useState(false)

  /* ---------- 套餐列表 ---------- */
  const [packages, setPackages] = useState<CoinPackage[]>(mockCoinPackages)
  const [packagesLoading, setPackagesLoading] = useState(false)

  /* ---------- 选中的套餐 ---------- */
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null)

  /* ---------- 支付状态 ---------- */
  const [payLoading, setPayLoading] = useState(false)

  /* ---------- 交易明细 ---------- */
  const [transactions, setTransactions] = useState<CoinTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)

  /* ---------- 用途列表 ---------- */
  const [usages] = useState<CoinUsage[]>(mockCoinUsages)

  /* ---------- 操作方法 ---------- */

  /** 刷新余额（Mock 实现） */
  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true)
    try {
      // TODO: 替换为真实 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500))
      setBalance(mockCoinBalance)
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  /** 加载套餐列表（Mock 实现） */
  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true)
    try {
      // TODO: 替换为真实 API 调用
      await new Promise((resolve) => setTimeout(resolve, 300))
      setPackages([...mockCoinPackages])
    } finally {
      setPackagesLoading(false)
    }
  }, [])

  /** 加载交易明细（Mock 实现） */
  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true)
    try {
      // TODO: 替换为真实 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500))
      setTransactions([...mockCoinTransactions])
    } finally {
      setTransactionsLoading(false)
    }
  }, [])

  /** 选中套餐 */
  const selectPackage = useCallback((pkg: CoinPackage) => {
    setSelectedPackage(pkg)
  }, [])

  /** 确认支付（Mock 实现） */
  const purchase = useCallback(async () => {
    if (!selectedPackage) {
      Taro.showToast({ title: '请选择充值套餐', icon: 'none' })
      return
    }
    setPayLoading(true)
    try {
      // TODO: 替换为真实支付 API 调用（wx.requestPayment）
      await new Promise((resolve) => setTimeout(resolve, 1500))
      Taro.showToast({ title: '支付成功', icon: 'success' })
      // 更新余额
      setBalance((prev) => prev + selectedPackage.amount)
      setSelectedPackage(null)
      // 刷新余额
      await fetchBalance()
    } catch {
      Taro.showToast({ title: '支付失败，请重试', icon: 'none' })
    } finally {
      setPayLoading(false)
    }
  }, [selectedPackage, fetchBalance])

  /** 跳转到交易明细页 */
  const goToDetail = useCallback(() => {
    Taro.navigateTo({ url: '/pages/coins/detail' })
  }, [])

  return {
    /* 状态 */
    balance,
    balanceLoading,
    packages,
    packagesLoading,
    selectedPackage,
    payLoading,
    transactions,
    transactionsLoading,
    usages,
    /* 方法 */
    fetchBalance,
    fetchPackages,
    fetchTransactions,
    selectPackage,
    purchase,
    goToDetail,
  }
}
