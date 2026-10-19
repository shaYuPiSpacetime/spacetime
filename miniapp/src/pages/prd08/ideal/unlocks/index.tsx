import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { useRetainedScroll } from '@/hooks/useRetainedScroll'
import { useAuthStore } from '@/stores/authStore'
import { subscribeCommunityPersonalChanged } from '@/domain/communityPersonalEvents'
import NativeNavigation from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getIdealUnlocks, type IdealUnlockRecordVO } from '@/services/ideal'

export default function IdealUnlocksPage() {
  const [items, setItems] = useState<IdealUnlockRecordVO[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [message, setMessage] = useState('')
  const loadVersion = useRef(0)
  const loadInFlight = useRef(false)
  const loaded = useRef(false)
  const blockedUserIds = useRef(new Set<number>())
  const userId = useAuthStore(state => state.userId)
  const scroll = useRetainedScroll(`ideal-unlocks:${userId}`)

  const load = async (cursor?: string, append = false) => {
    if (append && loadInFlight.current) return
    const version = ++loadVersion.current
    loadInFlight.current = true
    if (append) setLoadingMore(true)
    else {
      setLoading(items.length === 0)
      setMessage('')
      blockedUserIds.current.clear()
    }
    try {
      const data = await getIdealUnlocks('all', cursor)
      if (version !== loadVersion.current) return
      const visibleItems = (data.items || []).filter(item => item.unavailableReason !== 'blocked'
        && !blockedUserIds.current.has(item.profile?.userId || 0))
      setItems(current => {
        const combined = append ? [...current, ...visibleItems] : visibleItems
        return [...new Map(combined.map(item => [item.unlockNo, item])).values()]
      })
      setNextCursor(data.nextCursor || null)
      loaded.current = true
    } catch (error) {
      if (version !== loadVersion.current) return
      setMessage(error instanceof Error ? error.message : '历史解锁加载失败')
    } finally {
      if (version === loadVersion.current) {
        loadInFlight.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  useEffect(() => {
    loaded.current = false
    setItems([])
    setNextCursor(null)
    void load()
    return () => { loadVersion.current++; loadInFlight.current = false }
  }, [userId])
  useEffect(() => subscribeCommunityPersonalChanged(change => {
    if (change.kind !== 'block' || !change.authorId) return
    blockedUserIds.current.add(change.authorId)
    setItems(current => current.filter(item => item.profile?.userId !== change.authorId))
  }), [])
  // 主页返回复用当前页实例，保留已加载分页和滚动位置；失败重试与主动下拉独立触发。
  useDidShow(() => {
    if (!loaded.current && !loadInFlight.current) void load()
  })
  usePullDownRefresh(() => void load().then(() => scroll.reset()).finally(() => Taro.stopPullDownRefresh()))

  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <NativeNavigation title="历史解锁" />
      {loading ? <EmptyState text="加载中…" compact /> : null}
      {!loading && message ? <EmptyState text={message} compact /> : null}
      {!loading && !message && !items.length ? <EmptyState text="暂无数据" /> : null}
      {items.length ? (
        <ScrollView
          id="ideal-unlocks-scroll"
          scrollY
          scrollTop={scroll.scrollTop}
          onScroll={scroll.onScroll}
          showScrollbar={false}
          onScrollToLower={() => {
            if (nextCursor && !loadingMore) void load(nextCursor, true)
          }}
          style={{ height: 'calc(100vh - 154rpx)' }}
        >
          <View style={{ padding: '20rpx 24rpx 80rpx' }}>
            {items.map(item => (
              <UnlockCard key={item.unlockNo} item={item} />
            ))}
            {loadingMore ? <EmptyState text="加载中…" compact /> : null}
          </View>
        </ScrollView>
      ) : null}
    </View>
  )
}

function UnlockCard({ item }: { item: IdealUnlockRecordVO }) {
  const profile = item.profile
  const available = Boolean(item.available && profile)
  const title =
    available && profile
      ? [profile.currentCity, profile.age ? `${profile.age}岁` : '', item.educationLabel]
          .filter(Boolean)
          .join('·')
      : item.unavailableReason === 'blocked' ? '暂不可查看'
        : item.unavailableReason === 'unlock_inactive' ? '解锁已失效' : '暂不可访问用户'
  return (
    <View
      style={{
        minHeight: '354rpx',
        marginBottom: '20rpx',
        padding: '30rpx 28rpx',
        borderRadius: '20rpx',
        background: available ? 'linear-gradient(135deg,#D8E8FF,#F3F7FD)' : '#F6F7F9',
        boxSizing: 'border-box',
      }}
    >
      <View style={{ display: 'flex', alignItems: 'center' }}>
        {available && profile?.avatar ? (
          <Image
            src={profile.avatar}
            mode="aspectFill"
            style={{
              width: '150rpx',
              height: '150rpx',
              borderRadius: '75rpx',
              border: '6rpx solid #FFFFFF',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <View
            style={{
              width: '150rpx',
              height: '150rpx',
              borderRadius: '75rpx',
              background: '#D9DDE4',
            }}
          />
        )}
        <View style={{ marginLeft: '26rpx', flex: 1 }}>
          <Text style={{ display: 'block', color: '#0C285A', fontSize: '31rpx', fontWeight: 600 }}>
            {title}
          </Text>
          <Text
            style={{ display: 'block', color: '#A2A8B4', fontSize: '24rpx', marginTop: '16rpx' }}
          >
            {available && profile
              ? item.schoolSummary || profile.school || profile.occupationLabel || '资料已解锁'
              : item.unavailableReason === 'blocked' ? '存在拉黑关系，暂不可查看'
                : item.unavailableReason === 'unlock_inactive' ? '解锁已过期或退还'
                  : '该用户当前不可访问'}
          </Text>
        </View>
      </View>
      {available && profile ? (
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '10rpx', marginTop: '24rpx' }}>
          {(item.matchedConditionNames || []).slice(0, 3).map(tag => (
            <View
              key={tag}
              style={{
                minWidth: '172rpx',
                height: '62rpx',
                padding: '0 20rpx',
                borderRadius: '31rpx',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <Text style={{ color: '#0C285A', fontSize: '23rpx' }}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '34rpx',
        }}
      >
        <Text style={{ color: '#949BAA', fontSize: '23rpx' }}>
          解锁时间：{formatTime(item.unlockedAt)}
        </Text>
        <Text
          onClick={
            available && profile
              ? () =>
                  void Taro.navigateTo({
                    url: `/pages/heart/user?targetUserId=${profile.userId}&sourceScene=ideal`,
                  })
              : undefined
          }
          style={{ color: available ? '#4C8BFF' : '#999999', fontSize: '27rpx', fontWeight: 600 }}
        >
          {available ? '查看主页' : '暂不可查看'}
        </Text>
      </View>
    </View>
  )
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <View
      style={{
        paddingTop: compact ? '28rpx' : '220rpx',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {compact ? null : (
        <Image
          src={miniappOssIcons.qianxunEmptyChart}
          mode="aspectFit"
          style={{ width: '334rpx', height: '254rpx' }}
        />
      )}
      <Text
        style={{
          color: '#999999',
          fontSize: compact ? '22rpx' : '28rpx',
          marginTop: compact ? 0 : '24rpx',
        }}
      >
        {text}
      </Text>
    </View>
  )
}

function formatTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16).replace(/-/g, '.') : '-'
}
