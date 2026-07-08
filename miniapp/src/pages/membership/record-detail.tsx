import { Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { getDemoPageData } from '@/services/lanhuDemo'
import { LANHU_DARK, LANHU_GOLD, LanhuNav } from '@/pages/lanhu/LanhuShell'
import type { MembershipRecord } from '@/types/membership'

const membershipDemo = getDemoPageData('membership')

export default function MembershipRecordDetailPage() {
  const router = useRouter()
  const status = String(router.params.status || 'paid')
  const refunded = status === 'refunded'
  const record = resolveRecord(refunded)

  return (
    <View style={{ minHeight: '100vh', background: LANHU_DARK }}>
      <LanhuNav title="会员详情" tone="dark" showBack />
      <View style={{ width: '750rpx', padding: '8rpx 25rpx 0', boxSizing: 'border-box' }}>
        <SummaryCard record={record} refunded={refunded} />
        <InfoCard record={record} />
      </View>
    </View>
  )
}

function resolveRecord(refunded: boolean): MembershipRecord {
  const expectedStatus = refunded ? '已退款' : '已支付'
  return membershipDemo.records.find((item) => item.status === expectedStatus)
    || membershipDemo.records[refunded ? 1 : 0]
}

function SummaryCard({ record, refunded }: { record: MembershipRecord; refunded: boolean }) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '168rpx',
        borderRadius: '12rpx',
        background: '#211F1F',
        padding: '34rpx 38rpx',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: '34rpx', lineHeight: '48rpx' }}>{record.planName}</Text>
      <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '34rpx', lineHeight: '48rpx', marginTop: '20rpx' }}>订单金额</Text>
      <View
        style={{
          position: 'absolute',
          right: '38rpx',
          top: '40rpx',
          height: '52rpx',
          borderRadius: '0 18rpx 0 18rpx',
          background: LANHU_GOLD,
          padding: '0 24rpx',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#211D1E', fontSize: '28rpx', fontWeight: 700 }}>{refunded ? '已退款' : '已支付'}</Text>
      </View>
      <Text style={{ position: 'absolute', right: '38rpx', bottom: '28rpx', color: LANHU_GOLD, fontSize: '34rpx', fontWeight: 700 }}>
        ¥{record.amount.toFixed(2)}
      </Text>
    </View>
  )
}

function InfoCard({ record }: { record: MembershipRecord }) {
  const rows = [
    ['订单号', record.orderNo || '231213121213479483057398'],
    ['创建时间', record.createTime || record.startTime],
    ['付款时间', record.payTime || record.startTime],
    ['付款方式', record.payMethod || '微信'],
    ['会员生效日', record.startTime],
    ['会员到期日', record.endTime],
  ]

  return (
    <View
      style={{
        width: '700rpx',
        minHeight: '528rpx',
        background: '#211F1F',
        borderRadius: '8rpx',
        marginTop: '20rpx',
        padding: '26rpx 38rpx',
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
