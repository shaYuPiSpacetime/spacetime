import { ScrollView, Text, View } from '@tarojs/components'
import { useEffect } from 'react'
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
          {recordsLoading ? (
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
                title={record.planName}
                duration="12个月"
                startTime={record.startTime}
                endTime={record.endTime}
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
  title,
  duration,
  startTime,
  endTime,
  refunded,
  index,
}: {
  title: string
  duration: string
  startTime: string
  endTime: string
  refunded: boolean
  index: number
}) {
  const mainColor = refunded ? '#A1A1A1' : '#FFFFFF'
  const accent = refunded ? '#9A9A9A' : LANHU_GOLD

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
    >
      <Text style={{ position: 'absolute', left: '28rpx', top: '49rpx', color: accent, fontSize: '62rpx', lineHeight: '58rpx' }}>
        ◇
      </Text>
      <Text style={{ position: 'absolute', left: '102rpx', top: '47rpx', color: mainColor, fontSize: '36rpx', fontWeight: 700, lineHeight: '50rpx' }}>
        {title}
      </Text>
      <Text style={{ position: 'absolute', right: '35rpx', top: '47rpx', color: mainColor, fontSize: '36rpx', fontWeight: 700, lineHeight: '50rpx' }}>
        {duration}
      </Text>
      <Text style={{ position: 'absolute', left: '28rpx', top: '114rpx', color: mainColor, fontSize: '28rpx', lineHeight: '40rpx' }}>
        有效期： {startTime} – {endTime}
      </Text>
      {refunded && (
        <View
          style={{
            position: 'absolute',
            left: '330rpx',
            top: '22rpx',
            width: '210rpx',
            height: '150rpx',
            borderRadius: '75rpx',
            border: '10rpx solid rgba(150,150,150,0.34)',
            transform: 'rotate(-24deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: 'rgba(160,160,160,0.62)', fontSize: '42rpx', fontWeight: 700 }}>
            已退款
          </Text>
        </View>
      )}
    </View>
  )
}
