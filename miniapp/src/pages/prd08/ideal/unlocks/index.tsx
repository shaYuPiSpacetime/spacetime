import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getIdealUnlocks, type IdealUnlockRecordVO } from '@/services/ideal'

export default function IdealUnlocksPage() {
  const [items, setItems] = useState<IdealUnlockRecordVO[]>([])
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
      const data = await getIdealUnlocks('all', cursor)
      setItems(current => (append ? [...current, ...(data.items || [])] : data.items || []))
      setNextCursor(data.nextCursor || null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '历史解锁加载失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])
  usePullDownRefresh(() => void load().finally(() => Taro.stopPullDownRefresh()))

  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <NativeNavigation title="历史解锁" />
      {loading ? <EmptyState text="加载中…" compact /> : null}
      {!loading && message ? <EmptyState text={message} compact /> : null}
      {!loading && !message && !items.length ? <EmptyState text="暂无数据" /> : null}
      {items.length ? (
        <ScrollView
          scrollY
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
      : '已失效用户'
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
          {available ? '查看主页' : '用户已注销'}
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
