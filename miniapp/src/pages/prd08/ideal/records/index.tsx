import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { getIdealSearchRecords, type IdealSearchRecordVO } from '@/services/ideal'

export default function IdealRecordsPage() {
  const [items, setItems] = useState<IdealSearchRecordVO[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [message, setMessage] = useState('')

  const load = async (cursor?: string, append = false) => {
    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setMessage('')
    }
    try {
      const data = await getIdealSearchRecords(cursor)
      setItems(current => append ? [...current, ...(data.items || [])] : (data.items || []))
      setNextCursor(data.nextCursor || null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '筛选记录加载失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { void load() }, [])
  usePullDownRefresh(() => void load().finally(() => Taro.stopPullDownRefresh()))

  return (
    <View style={{ minHeight: '100vh', background: '#F7F8FA' }}>
      <NativeNavigation title="筛选记录" background="#FFFFFF" />
      {loading ? <Center text="加载中…" /> : null}
      {!loading && message ? <Center text={message} /> : null}
      {!loading && !message && !items.length ? <Center text="暂无筛选记录" /> : null}
      {items.length ? (
        <ScrollView
          scrollY
          showScrollbar={false}
          onScrollToLower={() => {
            if (nextCursor && !loadingMore) void load(nextCursor, true)
          }}
          style={{ height: 'calc(100vh - 154rpx)' }}
        >
          <View style={{ padding: '24rpx 24rpx 120rpx' }}>
            {items.map(item => (
              <View
                key={item.snapshotNo}
                onClick={() => void Taro.navigateTo({ url: `/pages/prd08/ideal/results/index?snapshotNo=${encodeURIComponent(item.snapshotNo)}` })}
                style={{ marginBottom: '18rpx', padding: '28rpx', borderRadius: '18rpx', background: '#FFFFFF' }}
              >
                <Text style={{ display: 'block', color: '#0C285A', fontSize: '28rpx', fontWeight: 600 }}>{item.summary.targetCities.map(city => city.name).join('、')} · {item.summary.minAge}-{item.summary.maxAge}岁</Text>
                <Text style={{ display: 'block', color: '#7F8494', fontSize: '23rpx', lineHeight: '36rpx', marginTop: '14rpx' }}>{item.summary.conditionNames.join('、')}</Text>
                <Text style={{ display: 'block', color: '#A2A8B4', fontSize: '21rpx', marginTop: '14rpx' }}>{item.createdAt.replace('T', ' ').slice(0, 16)}　找到{item.resultCount}位</Text>
              </View>
            ))}
            {loadingMore ? <Center text="加载中…" compact /> : null}
            {!nextCursor && items.length ? <Center text="已展示全部筛选记录" compact /> : null}
          </View>
        </ScrollView>
      ) : null}
      <Text onClick={() => void Taro.navigateTo({ url: '/pages/prd08/ideal/help/index' })} style={{ position: 'fixed', right: '30rpx', bottom: '40rpx', color: '#2876FF', fontSize: '24rpx' }}>什么是理想型？</Text>
    </View>
  )
}

function Center({ text, compact = false }: { text: string; compact?: boolean }) {
  return <View style={{ paddingTop: compact ? '28rpx' : '260rpx', textAlign: 'center' }}><Text style={{ color: '#999999', fontSize: compact ? '22rpx' : '26rpx' }}>{text}</Text></View>
}
