import { Button, Text, View } from '@tarojs/components'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { getPaymentOrder, type PayResultVO } from '@/services/payment'

type ResultState = 'success' | 'processing' | 'cancel' | 'failed' | 'closed' | 'error'

const BLUE = '#2876FF'
const TEXT = '#1F2937'
const MUTED = '#8A93A3'

function displayDate(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').replace(/\.\d+$/, '').replace(/\+08:00$/, '').slice(0, 19)
}

function orderTypeLabel(orderType?: string) {
  return orderType === 'vip' ? '会员订单' : '千寻币充值订单'
}

function statusLabel(state: ResultState) {
  if (state === 'success') return '支付成功'
  if (state === 'cancel') return '支付已取消'
  if (state === 'closed') return '订单已关闭'
  if (state === 'failed') return '支付失败'
  if (state === 'error') return '订单查询失败'
  return '支付结果确认中'
}

function stateFrom(order: PayResultVO, requested?: string): ResultState {
  if (order.orderStatus === 'success') return 'success'
  if (order.orderStatus === 'closed') return 'closed'
  if (requested === 'cancel') return 'cancel'
  if (requested === 'failed') return 'failed'
  return 'processing'
}

export default function PaymentResultPage() {
  const router = useRouter()
  const orderId = Number(router.params.orderId || 0)
  const sourcePage = router.params.sourcePage === 'membership' ? 'membership' : 'coins'
  const requestedResult = router.params.result
  const [order, setOrder] = useState<PayResultVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!orderId) {
      setError('缺少订单信息')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setOrder(await getPaymentOrder(orderId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '订单查询失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  const state = useMemo<ResultState>(() => {
    if (error) return 'error'
    if (!order) return 'processing'
    return stateFrom(order, requestedResult)
  }, [error, order, requestedResult])

  const backToSource = () => {
    if (sourcePage === 'membership' || sourcePage === 'coins') {
      Taro.navigateBack({ delta: 1 })
      return
    }
    Taro.navigateBack({ delta: 1 })
  }

  const openRecords = () => {
    if (order?.orderType === 'vip') {
      Taro.navigateTo({ url: '/pages/membership/records' })
    } else {
      Taro.navigateTo({ url: '/pages/coins/detail' })
    }
  }

  const goPurchase = () => {
    backToSource()
  }

  return (
    <View style={{ minHeight: '100vh', background: '#F6F8FC', color: TEXT, padding: '48rpx 32rpx', boxSizing: 'border-box' }}>
      <View style={{ textAlign: 'center', padding: '56rpx 20rpx 36rpx', background: '#FFFFFF', borderRadius: '24rpx' }}>
        <View style={{ width: '112rpx', height: '112rpx', margin: '0 auto 24rpx', borderRadius: '56rpx', background: state === 'success' ? '#E8F7EE' : '#EEF4FF', color: state === 'success' ? '#22A06B' : BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60rpx', fontWeight: 700 }}>
          {loading ? '…' : state === 'success' ? '✓' : state === 'error' ? '!' : '·'}
        </View>
        <Text style={{ display: 'block', fontSize: '40rpx', fontWeight: 700 }}>{loading ? '正在查询支付结果' : statusLabel(state)}</Text>
        <Text style={{ display: 'block', marginTop: '16rpx', color: MUTED, fontSize: '26rpx' }}>
          {state === 'success' ? '资产已由服务端确认并入账' : state === 'cancel' ? '订单未支付，会员和千寻币余额不会变化' : state === 'closed' ? '未支付订单已超过有效期，资产未发生变化' : state === 'error' ? error : '正在从服务端确认订单状态，请稍候'}
        </Text>
      </View>

      {order && (
        <View style={{ marginTop: '24rpx', padding: '28rpx', background: '#FFFFFF', borderRadius: '24rpx' }}>
          <InfoRow label="订单类型" value={orderTypeLabel(order.orderType)} />
          <InfoRow label="订单号" value={order.orderNo || '-'} />
          <InfoRow label="套餐名称" value={order.packageName || '-'} />
          <InfoRow label="支付金额" value={order.payAmount == null ? '-' : `¥${Number(order.payAmount).toFixed(2)}`} />
          <InfoRow label="创建时间" value={displayDate(order.createTime)} />
          {state === 'success' && order.orderType === 'coin' && <InfoRow label="本次到账" value={`${order.coinAmount || 0} 千寻币`} emphasize />}
          {state === 'success' && order.orderType === 'vip' && <InfoRow label="会员有效期至" value={displayDate(order.vipExpireTime)} emphasize />}
          {state === 'processing' && <InfoRow label="当前状态" value="待支付或确认中" />}
        </View>
      )}

      {error && (
        <Button onClick={load} style={{ marginTop: '24rpx', background: '#FFFFFF', color: BLUE, border: '1px solid #D6E3FF', borderRadius: '16rpx' }}>重新查询</Button>
      )}

      <View style={{ display: 'flex', gap: '20rpx', marginTop: '32rpx' }}>
        <Button onClick={openRecords} style={{ flex: 1, background: '#FFFFFF', color: BLUE, border: '1px solid #D6E3FF', borderRadius: '16rpx' }}>查看记录</Button>
        <Button onClick={state === 'failed' || state === 'closed' ? goPurchase : backToSource} style={{ flex: 1, background: BLUE, color: '#FFFFFF', borderRadius: '16rpx' }}>{state === 'failed' || state === 'closed' ? '重新选择套餐' : '返回来源页'}</Button>
      </View>
    </View>
  )
}

function InfoRow({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={{ display: 'flex', justifyContent: 'space-between', gap: '24rpx', padding: '18rpx 0', borderBottom: '1px solid #F0F2F5' }}>
      <Text style={{ color: MUTED, fontSize: '26rpx' }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: 'right', color: emphasize ? BLUE : TEXT, fontSize: '26rpx', fontWeight: emphasize ? 700 : 400, wordBreak: 'break-all' }}>{value}</Text>
    </View>
  )
}
