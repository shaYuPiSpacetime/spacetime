import { ScrollView, Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { getVipOrders, type VipOrderVO } from '@/services/payment'
import { LANHU_DARK, LANHU_GOLD, LanhuNav } from '@/pages/lanhu/LanhuShell'
import { getDemoPageData } from '@/services/lanhuDemo'

const membershipDemo = getDemoPageData('membership')

export default function MembershipRecordDetailPage() {
  const router = useRouter()
  const recordId = Number(router.params.id || 0)
  const previewStatus = String(router.params.status || '')
  const [record, setRecord] = useState<VipOrderVO | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let disposed = false
    setLoading(true)
    if (!recordId) {
      setRecord(resolvePreviewRecord(previewStatus))
      setLoading(false)
      return () => {
        disposed = true
      }
    }
    getVipOrders(1, 100)
      .then((page) => {
        if (disposed) return
        setRecord((page.records || []).find((item) => item.id === recordId) || null)
      })
      .catch(() => {
        if (!disposed) setRecord(null)
      })
      .finally(() => {
        if (!disposed) setLoading(false)
      })
    return () => {
      disposed = true
    }
  }, [recordId, previewStatus])

  return (
    <View style={{ minHeight: '100vh', background: LANHU_DARK }}>
      <LanhuNav title="会员详情" tone="dark" showBack />
      <ScrollView scrollY style={{ height: 'calc(100vh - 176rpx)' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '8rpx 25rpx 60rpx', boxSizing: 'border-box' }}>
          {loading ? (
            <Text style={{ display: 'block', color: '#777777', textAlign: 'center', marginTop: '220rpx' }}>加载中...</Text>
          ) : record ? (
            <>
              <SummaryCard record={record} />
              <InfoCard record={record} />
            </>
          ) : (
            <Text style={{ display: 'block', color: '#777777', textAlign: 'center', marginTop: '220rpx' }}>记录不存在</Text>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function resolvePreviewRecord(status: string): VipOrderVO | null {
  const previewStatus = status === 'refunded' ? '已退款' : '已支付'
  const record = membershipDemo.records.find(item => item.status === previewStatus)
  if (!record) return null
  return {
    id: record.id,
    orderNo: record.orderNo || '',
    packageName: record.listTitle || record.planName,
    payAmount: record.amount,
    payChannel: record.payMethod === '微信' ? 'wechat' : record.payMethod,
    orderStatus: previewStatus === '已退款' ? 'refunded' : 'success',
    createTime: record.createTime,
    successTime: record.payTime,
    expireTime: record.validityEnd || record.endTime,
  }
}

function SummaryCard({ record }: { record: VipOrderVO }) {
  const statusLabel = orderStatusLabel(record.orderStatus)
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '168rpx',
        borderRadius: '12rpx',
        background: '#211F1F',
        padding: '34rpx 30rpx',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: '34rpx', lineHeight: '48rpx' }}>{record.packageName}</Text>
      <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '34rpx', lineHeight: '48rpx', marginTop: '20rpx' }}>订单金额</Text>
      <View
        style={{
          position: 'absolute',
          right: '30rpx',
          top: '32rpx',
          height: '40rpx',
          borderRadius: '0 16rpx 0 16rpx',
          background: LANHU_GOLD,
          padding: '0 24rpx',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#211D1E', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>{statusLabel}</Text>
      </View>
      <Text style={{ position: 'absolute', right: '30rpx', bottom: '28rpx', color: LANHU_GOLD, fontSize: '34rpx', fontWeight: 700 }}>
        ¥{Number(record.payAmount || 0).toFixed(2)}
      </Text>
    </View>
  )
}

function InfoCard({ record }: { record: VipOrderVO }) {
  const rows = [
    ['订单号', record.orderNo],
    ['创建时间', formatDisplayDate(record.createTime)],
    ['付款时间', formatDisplayDate(record.successTime)],
    ['付款方式', payChannelName(record.payChannel)],
    ['会员生效日', formatDisplayDate(record.successTime)],
    ['会员到期日', formatDisplayDate(record.expireTime)],
  ]

  return (
    <View
      style={{
        width: '700rpx',
        height: '528rpx',
        background: '#211F1F',
        borderRadius: '8rpx',
        marginTop: '20rpx',
        padding: '0 30rpx',
        boxSizing: 'border-box',
      }}
    >
      {rows.map(([label, value]) => (
        <View
          key={label}
          style={{
            height: '88rpx',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#8D8D8D', fontSize: '32rpx' }}>{label}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', maxWidth: '500rpx', textAlign: 'right' }}>{value}</Text>
        </View>
      ))}
    </View>
  )
}

function formatDisplayDate(value?: string) {
  if (!value) return '-'
  const normalized = value.replace('T', ' ').replace(/\+08:00$/, '')
  const [date = '', time = ''] = normalized.split(' ')
  const clock = time.split('.')[0].slice(0, 5)
  return `${date.replace(/-/g, '.')}${clock ? ` ${clock}` : ''}`
}

function payChannelName(channel?: string) {
  if (channel === 'wechat') return '微信'
  if (channel === 'alipay') return '支付宝'
  if (channel === 'mock') return '模拟支付'
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
