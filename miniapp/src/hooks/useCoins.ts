import { useCallback, useState } from 'react'
import Taro from '@tarojs/taro'
import { miniappOssIcons, type MiniappOssIconKey } from '@/constants/ossIcons'
import type { CoinPackage, CoinTransaction, CoinUsage } from '@/types/coin'
import {
  confirmWechatPayment,
  createOrder,
  getCoinBalance,
  getCoinFlows,
  getCoinPackages,
  getCoinScenes,
  requestWechatPayment,
  type CoinFlowVO,
  type CoinPackageVO,
  type CoinSceneVO,
} from '@/services/payment'

export type CoinPayState = 'idle' | 'paying' | 'pay-success' | 'pay-cancel' | 'pay-failed'

export interface CoinPurchaseOptions {
  /** 来源页是否沿用通用支付结果页；理想型充值成功后由来源页直接回跳。 */
  navigateOnSuccess?: boolean
}

function adaptCoinPackage(pkg: CoinPackageVO): CoinPackage {
  const coinCount = Number(pkg.coinCount || 0)
  const bonusCount = Number(pkg.bonusCoinCount || 0)
  const originAmount = Number(pkg.originAmount || 0)
  return {
    id: pkg.id,
    amount: coinCount + bonusCount,
    price: Number(pkg.amount || 0),
    label: pkg.packageName,
    tag: pkg.packageTag,
    originalPrice: originAmount > 0 ? `¥${originAmount.toFixed(2)}` : undefined,
    discountLabel: pkg.mobileTag,
    recommended: pkg.recommendFlag === 1,
  }
}

const COIN_USAGE_ICON_KEYS: Record<string, MiniappOssIconKey> = {
  coinUsageWhisper: 'coinUsageWhisper',
  coinUsageHeartbeat: 'coinUsageHeartbeat',
  coinUsageIdealUnlock: 'coinUsageIdealUnlock',
  coinUsageBoost: 'coinUsageBoost',
  coinUsageCuratedUnlock: 'coinUsageCuratedUnlock',
  coinUsageRecommend: 'coinUsageRecommend',
  coinUsageAnonymousUnlock: 'coinUsageAnonymousUnlock',
  coinUsageLimitedActivity: 'coinUsageLimitedActivity',
  'icon-whisper': 'coinUsageWhisper',
  'icon-heart-unlock': 'coinUsageHeartbeat',
  'icon-eye-unlock': 'coinUsageIdealUnlock',
  'icon-target-user': 'coinUsageBoost',
  'icon-target-batch': 'coinUsageCuratedUnlock',
  'icon-compatible-person': 'coinUsageRecommend',
  'icon-soulmate': 'coinUsageAnonymousUnlock',
  'icon-career-recommend': 'coinUsageLimitedActivity',
}

function resolveCoinUsageIcon(icon?: string): string {
  if (!icon) return ''
  if (/^https:\/\//.test(icon)) return icon
  const key = COIN_USAGE_ICON_KEYS[icon]
  return key ? miniappOssIcons[key] : ''
}

function adaptCoinFlow(flow: CoinFlowVO): CoinTransaction {
  const amount = Number(flow.changeAmount || 0)
  return {
    id: flow.id,
    type: amount >= 0 ? 'income' : 'expense',
    amount,
    description: flow.bizDesc || flow.bizScene || '千寻币资产变动',
    time: flow.createTime || '-',
    balance: Number(flow.balanceAfter || 0),
  }
}

function adaptCoinScene(scene: CoinSceneVO): CoinUsage {
  return {
    code: scene.sceneCode,
    icon: resolveCoinUsageIcon(scene.mobileIcon),
    label: scene.mobileDisplayName,
    price: Number(scene.unitPrice || 0),
    description: scene.sceneDesc || '',
  }
}

function isPaymentCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { errMsg?: string })?.errMsg || error || '')
  return message.includes('cancel') || message.includes('取消')
}

async function confirmPayment(orderId: number) {
  let result = await confirmWechatPayment(orderId)
  for (let attempt = 0; attempt < 2 && result.orderStatus === 'unpaid'; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    result = await confirmWechatPayment(orderId)
  }
  return result
}

/**
 * 千寻币模块 hook。
 * 所有余额、套餐、场景、流水和入账结果均来自后端接口。
 */
export function useCoins() {
  const [balance, setBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [packages, setPackages] = useState<CoinPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null)
  const [payLoading, setPayLoading] = useState(false)
  const [payState, setPayState] = useState<CoinPayState>('idle')
  const [transactions, setTransactions] = useState<CoinTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [usages, setUsages] = useState<CoinUsage[]>([])

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true)
    try {
      const result = await getCoinBalance()
      setBalance(Number(result.coinBalance || 0))
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true)
    try {
      const serverPackages = (await getCoinPackages()).map(adaptCoinPackage)
      setPackages(serverPackages)
      setSelectedPackage((current) => {
        const currentPackage = current && serverPackages.find((pkg) => pkg.id === current.id)
        return currentPackage || serverPackages.find((pkg) => pkg.recommended) || serverPackages[0] || null
      })
    } finally {
      setPackagesLoading(false)
    }
  }, [])

  const fetchScenes = useCallback(async () => {
    setUsages((await getCoinScenes()).map(adaptCoinScene))
  }, [])

  const fetchTransactions = useCallback(async (flowType?: string) => {
    setTransactionsLoading(true)
    try {
      const page = await getCoinFlows(1, 20, flowType)
      setTransactions((page.records || []).map(adaptCoinFlow))
    } finally {
      setTransactionsLoading(false)
    }
  }, [])

  const selectPackage = useCallback((pkg: CoinPackage) => {
    setSelectedPackage(pkg)
  }, [])

  const purchase = useCallback(async (
    sourcePage = 'coins',
    options: CoinPurchaseOptions = {},
  ) => {
    if (!selectedPackage) {
      Taro.showToast({ title: '暂无可购买套餐', icon: 'none' })
      return
    }
    let orderId: number | null = null
    setPayLoading(true)
    setPayState('paying')
    try {
      const order = await createOrder(selectedPackage.id, 'coin')
      orderId = order.orderId
      if (!order.payParams) {
        throw new Error('支付参数缺失，请稍后重试')
      }
      await requestWechatPayment(order.payParams)
      const result = await confirmPayment(order.orderId)
      if (result.orderStatus !== 'success') {
        setPayState('pay-failed')
        Taro.showToast({ title: '支付结果确认中，请稍后查看订单', icon: 'none' })
        Taro.navigateTo({ url: `/pages/commerce/payment-result?orderId=${order.orderId}&orderType=coin&sourcePage=${sourcePage}&result=processing` })
        return
      }
      if (result.coinBalance != null) setBalance(Number(result.coinBalance))
      await fetchTransactions()
      setPayState('pay-success')
      if (options.navigateOnSuccess !== false) {
        Taro.navigateTo({ url: `/pages/commerce/payment-result?orderId=${order.orderId}&orderType=coin&sourcePage=${sourcePage}&result=success` })
      }
    } catch (error) {
      if (isPaymentCancel(error)) {
        setPayState('pay-cancel')
        if (orderId) Taro.navigateTo({ url: `/pages/commerce/payment-result?orderId=${orderId}&orderType=coin&sourcePage=${sourcePage}&result=cancel` })
      } else {
        setPayState('pay-failed')
        Taro.showToast({ title: error instanceof Error ? error.message : '支付失败，请重试', icon: 'none' })
        if (orderId) Taro.navigateTo({ url: `/pages/commerce/payment-result?orderId=${orderId}&orderType=coin&sourcePage=${sourcePage}&result=failed` })
      }
    } finally {
      setPayLoading(false)
    }
  }, [fetchTransactions, selectedPackage])

  const hidePaymentLayer = useCallback(() => {
    setPayState('idle')
  }, [])

  const goToDetail = useCallback(() => {
    Taro.navigateTo({ url: '/pages/coins/detail' })
  }, [])

  return {
    balance,
    balanceLoading,
    packages,
    packagesLoading,
    selectedPackage,
    payLoading,
    payState,
    transactions,
    transactionsLoading,
    usages,
    fetchBalance,
    fetchPackages,
    fetchScenes,
    fetchTransactions,
    selectPackage,
    purchase,
    hidePaymentLayer,
    goToDetail,
  }
}
