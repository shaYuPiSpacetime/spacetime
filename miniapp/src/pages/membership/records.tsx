import { ScrollView, Text, View } from '@tarojs/components'
import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useMembership } from '@/hooks/useMembership'
import { LANHU_DARK, LANHU_GOLD, LanhuNav } from '@/pages/lanhu/LanhuShell'

export default function RecordsPage() {
  const {
    recordsLoading,
    filteredRecords,
    fetchRecords,
  } = useMembership()

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return (
    <View style={{ minHeight: '100vh', background: LANHU_DARK }}>
      <LanhuNav title="会员记录" tone="dark" showBack />
      <ScrollView scrollY style={{ height: 'calc(100vh - 176rpx)' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '6rpx 25rpx 60rpx', boxSizing: 'border-box' }}>
          {recordsLoading && filteredRecords.length === 0 ? (
            <Text style={{ display: 'block', color: '#777777', textAlign: 'center', marginTop: '220rpx' }}>
              加载中...
            </Text>
          ) : filteredRecords.length === 0 ? (
            <Text style={{ display: 'block', color: '#777777', textAlign: 'center', marginTop: '220rpx' }}>
              暂无会员记录
            </Text>
          ) : (
            filteredRecords.map((record, index) => (
              <RecordCard
                key={record.id}
                id={record.id}
                title={record.listTitle || record.planName}
                duration={record.durationLabel || '12个月'}
                startTime={record.validityStart || record.startTime}
                endTime={record.validityEnd || record.endTime}
                refunded={record.status === '已退款'}
                index={index}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function RecordCard({
  id,
  title,
  duration,
  startTime,
  endTime,
  refunded,
  index,
}: {
  id: number
  title: string
  duration: string
  startTime: string
  endTime: string
  refunded: boolean
  index: number
}) {
  const mainColor = refunded ? '#A1A1A1' : '#FFFFFF'
  const accent = refunded ? '#9A9A9A' : LANHU_GOLD
  const detailStatus = refunded ? 'refunded' : 'paid'

  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '188rpx',
        borderRadius: '12rpx',
        background: '#22201F',
        marginTop: index === 0 ? '0' : '20rpx',
        padding: '43rpx 28rpx',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      onClick={() => Taro.navigateTo({ url: `/pages/membership/record-detail?status=${detailStatus}&id=${id}` })}
    >
      <MemberRecordDiamond tone={accent} />
      <Text style={{ position: 'absolute', left: '102rpx', top: '47rpx', color: mainColor, fontSize: '36rpx', fontWeight: 700, lineHeight: '50rpx' }}>
        {title}
      </Text>
      <Text style={{ position: 'absolute', right: '35rpx', top: '47rpx', color: mainColor, fontSize: '36rpx', fontWeight: 700, lineHeight: '50rpx' }}>
        {duration}
      </Text>
      <Text style={{ position: 'absolute', left: '28rpx', top: '114rpx', color: mainColor, fontSize: '28rpx', lineHeight: '40rpx' }}>
        有效期： {startTime} – {endTime}
      </Text>
      {refunded && <RefundStamp />}
    </View>
  )
}

function MemberRecordDiamond({ tone }: { tone: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '30rpx',
        top: '54rpx',
        width: '52rpx',
        height: '52rpx',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '6rpx',
          top: '6rpx',
          width: '38rpx',
          height: '38rpx',
          borderRadius: '8rpx',
          border: `5rpx solid ${tone}`,
          transform: 'rotate(45deg)',
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '19rpx',
          top: '18rpx',
          width: '16rpx',
          height: '16rpx',
          borderRight: `5rpx solid ${tone}`,
          borderBottom: `5rpx solid ${tone}`,
          transform: 'rotate(45deg)',
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}

function RefundStamp() {
  return (
    <View
      style={{
        position: 'absolute',
        left: '322rpx',
        top: '14rpx',
        width: '232rpx',
        height: '164rpx',
        transform: 'rotate(-24deg)',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '40rpx',
          top: '2rpx',
          width: '142rpx',
          height: '142rpx',
          borderRadius: '82rpx',
          border: '10rpx solid rgba(150,150,150,0.34)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '18rpx',
          top: '50rpx',
          width: '184rpx',
          height: '58rpx',
          borderRadius: '8rpx',
          border: '6rpx solid rgba(150,150,150,0.48)',
          background: '#22201F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: 'rgba(160,160,160,0.68)', fontSize: '42rpx', fontWeight: 700, lineHeight: '58rpx' }}>
          已退款
        </Text>
      </View>
    </View>
  )
}
