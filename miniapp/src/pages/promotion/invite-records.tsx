import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { getInviteHome, getInviteRecords } from '@/services/promotion'
import type { InviteHomeVO, InviteRecordVO } from '@/types/promotion'
import './invite-records.scss'

const PAGE_SIZE = 20

interface RecordTimelineItem {
  key: string
  kind: 'invite' | 'gift'
  title: string
  subtitle: string
  amount: number
  avatarUrl?: string
}

function formatTimelineTime(value: string) {
  if (!value) return ''
  return value.replace(/^\d{4}-/, '').replace('T', ' ').slice(0, 11)
}

function inviteeName(record: InviteRecordVO) {
  return record.invitee.nickname || record.invitee.mobileMasked || record.invitee.userNo || '邀请好友'
}

function eventSubtitle(item: InviteRecordVO['rewardItems'][number]) {
  if (item.eventType === 'ladder_bonus' && item.ladderThreshold) {
    return `完成${item.ladderThreshold}人邀请奖励`
  }
  if (item.eventType === 'register_reward') return '注册成功'
  return item.eventLabel || '邀请奖励'
}

export function toTimelineItems(records: InviteRecordVO[]): RecordTimelineItem[] {
  return records.flatMap(record => {
    if (!record.rewardItems.length) {
      return [{
        key: `${record.relationNo}:relation`,
        kind: 'invite' as const,
        title: inviteeName(record),
        subtitle: `${formatTimelineTime(record.registeredAt)}  注册成功`,
        amount: record.paidTotal,
        avatarUrl: record.invitee.avatarUrl,
      }]
    }

    return record.rewardItems.map(item => {
      const isInvite = item.eventType === 'register_reward'
      return {
        key: `${record.relationNo}:${item.rewardNo}`,
        kind: isInvite ? 'invite' as const : 'gift' as const,
        title: isInvite ? inviteeName(record) : item.eventLabel || '额外奖励',
        subtitle: `${formatTimelineTime(item.createdAt || record.registeredAt)}  ${eventSubtitle(item)}`,
        amount: item.amount,
        avatarUrl: isInvite ? record.invitee.avatarUrl : undefined,
      }
    })
  })
}

export default function InviteRecordsPage() {
  const [summary, setSummary] = useState<InviteHomeVO>()
  const [records, setRecords] = useState<InviteRecordVO[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [failedPage, setFailedPage] = useState<number>()
  const requestSequence = useRef(0)

  const load = useCallback(async (
    nextPage: number,
    mode: 'initial' | 'refresh' | 'more',
  ) => {
    const requestId = ++requestSequence.current
    if (mode === 'initial') setLoading(true)
    if (mode === 'refresh') setRefreshing(true)
    if (mode === 'more') setLoadingMore(true)
    if (mode !== 'more') setError('')

    try {
      const [recordResult, homeResult] = await Promise.all([
        getInviteRecords(nextPage, PAGE_SIZE),
        getInviteHome(),
      ])
      if (requestId !== requestSequence.current) return
      const nextRecords = recordResult.records || []
      setSummary(homeResult)
      setError('')
      setFailedPage(undefined)
      setRecords(current => mode === 'more' ? [...current, ...nextRecords] : nextRecords)
      setPage(Number(recordResult.current || nextPage))
      setTotal(Number(recordResult.total || 0))
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
    void load(1, 'initial')
  }, [load])

  const refresh = () => {
    void load(1, 'refresh')
  }

  const loadMore = () => {
    if (loading || loadingMore || records.length >= total) return
    void load(page + 1, 'more')
  }

  const timelineItems = useMemo(() => toTimelineItems(records), [records])

  return (
    <View className="promotion-records-page">
      <View className="promotion-records-hero">
        <NativeNavigation
          title="邀请记录"
          titleColor="#ffffff"
          background="transparent"
          showBack
          fallbackUrl="/pages/promotion/invite-home"
          overlay
        />
        <View className="promotion-records-summary">
          <View className="promotion-records-summary__surface">
            <View className="promotion-records-summary__item">
              <Text>累计邀请成功</Text>
              <Text className="promotion-records-summary__number">
                {summary?.successCount ?? 0}
              </Text>
              <Text>人</Text>
            </View>
            <View className="promotion-records-summary__divider" />
            <View className="promotion-records-summary__item">
              <Text>累计到账</Text>
              <Text className="promotion-records-summary__number promotion-records-summary__number--orange">
                {summary?.paidRewardTotal ?? 0}
              </Text>
              <Text>币</Text>
            </View>
          </View>
        </View>
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
        {!loading && error && !timelineItems.length ? (
          <RecordsState
            title="邀请记录加载失败"
            description={error}
            action="重新加载"
            onAction={() => void load(failedPage || 1, 'initial')}
          />
        ) : null}
        {!loading && !error && !timelineItems.length ? (
          <RecordsState
            title="暂无邀请记录"
            description="成功邀请好友后，注册与额外奖励会显示在这里"
            action="刷新看看"
            onAction={refresh}
          />
        ) : null}
        {timelineItems.length ? (
          <View className="promotion-record-list">
            {error ? (
              <View className="promotion-record-inline-error">
                <Text>{error}</Text>
                <Button onClick={() => void load(failedPage || page + 1, 'more')}>重试</Button>
              </View>
            ) : null}
            {timelineItems.map(item => (
              <View className="promotion-record-item" key={item.key}>
                {item.kind === 'invite' ? (
                  item.avatarUrl ? (
                    <Image
                      className="promotion-record-item__avatar"
                      src={item.avatarUrl}
                      mode="aspectFill"
                    />
                  ) : (
                    <View className="promotion-record-item__avatar promotion-record-item__avatar--fallback">
                      <View className="promotion-record-item__person-head" />
                      <View className="promotion-record-item__person-body" />
                    </View>
                  )
                ) : (
                  <View className="promotion-record-item__gift">
                    <View className="promotion-record-item__gift-lid" />
                    <View className="promotion-record-item__gift-box" />
                    <View className="promotion-record-item__gift-ribbon" />
                  </View>
                )}
                <View className="promotion-record-item__copy">
                  <Text>{item.title}</Text>
                  <Text>{item.subtitle}</Text>
                </View>
                <Text className="promotion-record-item__amount">+{item.amount}</Text>
              </View>
            ))}
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
      {[0, 1, 2, 3, 4].map(item => (
        <View className="promotion-record-skeleton__row" key={item}>
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
      <View className="promotion-record-state__icon">
        <View />
        <View />
      </View>
      <Text className="promotion-record-state__title">{title}</Text>
      <Text className="promotion-record-state__description">{description}</Text>
      <Button className="promotion-record-state__button" onClick={onAction}>{action}</Button>
    </View>
  )
}
