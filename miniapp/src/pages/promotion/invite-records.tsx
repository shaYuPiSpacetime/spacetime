import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { getInviteRecords } from '@/services/promotion'
import type { InviteRecordVO, InviteRewardStatus } from '@/types/promotion'
import './invite-records.scss'

type RecordFilter = 'all' | InviteRewardStatus

const FILTERS: Array<{ value: RecordFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待发放' },
  { value: 'success', label: '已发放' },
  { value: 'failed', label: '发放失败' },
]

const PAGE_SIZE = 20

function statusLabel(status: InviteRewardStatus) {
  return FILTERS.find(item => item.value === status)?.label || '待发放'
}

function eventLabel(item: InviteRecordVO['rewardItems'][number]) {
  if (item.eventType === 'ladder_bonus' && item.ladderThreshold) {
    return `阶梯奖励-累计${item.ladderThreshold}人`
  }
  return item.eventLabel || '邀请奖励'
}

export default function InviteRecordsPage() {
  const [filter, setFilter] = useState<RecordFilter>('all')
  const [records, setRecords] = useState<InviteRecordVO[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [failedPage, setFailedPage] = useState<number>()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const requestSequence = useRef(0)

  const load = useCallback(async (
    nextPage: number,
    nextFilter: RecordFilter,
    mode: 'initial' | 'refresh' | 'more',
  ) => {
    const requestId = ++requestSequence.current
    if (mode === 'initial') setLoading(true)
    if (mode === 'refresh') setRefreshing(true)
    if (mode === 'more') setLoadingMore(true)
    if (mode !== 'more') setError('')

    try {
      const result = await getInviteRecords(
        nextPage,
        PAGE_SIZE,
        nextFilter === 'all' ? undefined : nextFilter,
      )
      if (requestId !== requestSequence.current) return
      const nextRecords = result.records || []
      setError('')
      setFailedPage(undefined)
      setRecords(current => mode === 'more' ? [...current, ...nextRecords] : nextRecords)
      setPage(Number(result.current || nextPage))
      setTotal(Number(result.total || 0))
    } catch (reason) {
      if (requestId !== requestSequence.current) return
      setError(reason instanceof Error ? reason.message : '邀请记录加载失败，请稍后重试')
      setFailedPage(nextPage)
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    }
  }, [])

  useEffect(() => {
    void load(1, filter, 'initial')
  }, [filter, load])

  const changeFilter = (nextFilter: RecordFilter) => {
    if (nextFilter === filter) return
    setExpanded(new Set())
    setFilter(nextFilter)
  }

  const refresh = () => {
    void load(1, filter, 'refresh')
  }

  const loadMore = () => {
    if (loading || loadingMore || records.length >= total) return
    void load(page + 1, filter, 'more')
  }

  const toggleExpanded = (relationNo: string) => {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(relationNo)) next.delete(relationNo)
      else next.add(relationNo)
      return next
    })
  }

  return (
    <View className="promotion-records-page">
      <NativeNavigation
        title="邀请记录"
        showBack
        fallbackUrl="/pages/promotion/invite-home"
      />
      <View className="promotion-record-tabs">
        {FILTERS.map(item => (
          <Button
            key={item.value}
            className={`promotion-record-tab${filter === item.value ? ' is-active' : ''}`}
            onClick={() => changeFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </View>

      <ScrollView
        className="promotion-record-scroll"
        scrollY
        enhanced
        showScrollbar={false}
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={refresh}
        onScrollToLower={loadMore}
        lowerThreshold={120}
      >
        {loading ? <RecordsSkeleton /> : null}
        {!loading && error && !records.length ? (
          <RecordsState
            title="邀请记录加载失败"
            description={error}
            action="重新加载"
            onAction={() => void load(1, filter, 'initial')}
          />
        ) : null}
        {!loading && !error && !records.length ? (
          <RecordsState
            title="暂无该状态记录"
            description={filter === 'all' ? '邀请好友注册后，记录会展示在这里' : '切换其他状态查看邀请进度'}
            action="返回邀请"
            onAction={() => void Taro.navigateBack()}
          />
        ) : null}
        {records.length ? (
          <View className="promotion-record-list">
            {error ? (
              <View className="promotion-record-inline-error">
                <Text>{error}，已为你保留当前列表</Text>
                <Button
                  onClick={() => void load(
                    failedPage && failedPage > 1 ? failedPage : 1,
                    filter,
                    failedPage && failedPage > 1 ? 'more' : 'refresh',
                  )}
                >
                  重试
                </Button>
              </View>
            ) : null}
            {records.map(record => {
              const isExpanded = expanded.has(record.relationNo)
              return (
                <View className="promotion-record-card" key={record.relationNo}>
                  <View className="promotion-record-main">
                    {record.invitee.avatarUrl ? (
                      <Image className="promotion-record-avatar" src={record.invitee.avatarUrl} mode="aspectFill" />
                    ) : (
                      <View className="promotion-record-avatar promotion-record-avatar--fallback">
                        {(record.invitee.nickname || '友').slice(0, 1)}
                      </View>
                    )}
                    <View className="promotion-record-user">
                      <Text>{record.invitee.nickname || record.invitee.mobileMasked || '邀请好友'}</Text>
                      <Text>完成注册 {record.registeredAt || '—'}</Text>
                    </View>
                    <Text className={`promotion-record-status is-${record.rewardStatus}`}>
                      {statusLabel(record.rewardStatus)}
                    </Text>
                  </View>
                  <View className="promotion-record-summary">
                    <Text>累计已发奖励</Text>
                    <Text>+{record.paidTotal} 千寻币</Text>
                  </View>
                  <Button
                    className="promotion-record-expand"
                    onClick={() => toggleExpanded(record.relationNo)}
                  >
                    {isExpanded ? '收起奖励明细' : '查看奖励明细'}
                    <View className={`promotion-record-chevron${isExpanded ? ' is-expanded' : ''}`} />
                  </Button>
                  {isExpanded ? (
                    <View className="promotion-reward-details">
                      {record.rewardItems.length ? record.rewardItems.map(item => (
                        <View className="promotion-reward-detail" key={item.rewardNo}>
                          <View>
                            <Text>{eventLabel(item)}</Text>
                            <Text>{item.createdAt}</Text>
                          </View>
                          <View>
                            <Text>+{item.amount}</Text>
                            <Text className={`is-${item.status}`}>{statusLabel(item.status)}</Text>
                          </View>
                        </View>
                      )) : <Text className="promotion-reward-details__empty">暂无奖励明细</Text>}
                    </View>
                  ) : null}
                </View>
              )
            })}
            <View className="promotion-record-footer">
              {loadingMore ? '正在加载更多…' : records.length >= total ? '已加载全部记录' : '继续上滑加载'}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

function RecordsSkeleton() {
  return (
    <View className="promotion-record-skeleton">
      {[0, 1, 2].map(item => (
        <View key={item}>
          <View /><View /><View />
        </View>
      ))}
    </View>
  )
}

function RecordsState({
  title,
  description,
  action,
  onAction,
}: {
  title: string
  description: string
  action: string
  onAction: () => void
}) {
  return (
    <View className="promotion-record-state">
      <View className="promotion-record-state__icon">◎</View>
      <Text className="promotion-record-state__title">{title}</Text>
      <Text className="promotion-record-state__description">{description}</Text>
      <Button className="promotion-record-state__button" onClick={onAction}>{action}</Button>
    </View>
  )
}
