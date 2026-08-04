import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import AccessBlockedPage from '@/components/AccessBlockedPage'
import avatarImage from '@/assets/lanhu/heart-message/heart-avatar.webp'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import { getMutualMatches, type MutualMatchItemVO, type MutualMatchPageVO } from '@/services/relation'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'

export default function MutualLikesPage() {
  const access = useAccessStatus('canCommunity')
  const [page, setPage] = useState<MutualMatchPageVO | null>(null)
  const [records, setRecords] = useState<MutualMatchItemVO[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const loadingMoreRef = useRef(false)

  const load = async (pageNo = 1) => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    if (pageNo === 1) {
      setState('loading')
      setError('')
    } else {
      setLoadingMore(true)
    }
    try {
      const data = await getMutualMatches(pageNo, 20)
      const nextRecords = pageNo === 1 ? (data.records || []) : [...records, ...(data.records || [])]
      setPage(data)
      setRecords(nextRecords)
      setState(nextRecords.length ? 'ready' : 'empty')
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '相互喜欢加载失败'
      setError(message)
      setState(records.length ? 'ready' : 'error')
      await Taro.showToast({ title: message, icon: 'none' })
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (access.allowed === true) void load(1)
  }, [access.allowed])

  if (access.allowed !== true) return <AccessBlockedPage {...access} />

  const title = `相互喜欢(${page?.total || 0}人)`
  return (
    <View id="mutual-likes-page" style={{ height: '100vh', background: '#FFFFFF', fontFamily: 'PingFang SC, sans-serif' }}>
      <HeartMessageHeader title={title} align="center" showBack />
      <ScrollView scrollY style={{ height: 'calc(100vh - 176rpx)' }}>
        <View style={{ width: '700rpx', minHeight: '520rpx', margin: '0 auto' }}>
          {state === 'loading' ? <MutualState id="mutual-loading-state" text="正在加载相互喜欢" /> : null}
          {state === 'empty' ? <MutualState id="mutual-empty-state" text="还没有相互喜欢的人" action="去发现心动" onAction={() => Taro.switchTab({ url: '/pages/recommend/index' })} /> : null}
          {state === 'error' ? <MutualState id="mutual-error-state" text={error} action="重新加载" onAction={() => void load(1)} /> : null}
          {records.map((person, index) => (
            <View key={person.matchNo} style={{ width: '700rpx', height: '160rpx', borderTop: index ? '1rpx solid #EFF4FC' : 0, display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
              <Image src={person.avatar || avatarImage} mode="aspectFill" style={{ width: '100rpx', height: '100rpx', borderRadius: '50%' }} />
              <View style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}><Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 500 }}>{person.nickname}</Text><Text style={{ display: 'block', marginTop: '10rpx', color: '#999999', fontSize: '20rpx' }}>{buildLocation(person)}</Text></View>
              <View onClick={() => Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${person.userId}&sourceScene=profile` })} style={{ width: '168rpx', height: '72rpx', borderRadius: '12rpx', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#333333', fontSize: '26rpx' }}>查看主页</Text></View>
            </View>
          ))}
          {error && records.length ? <Text onClick={() => void load(1)} style={{ display: 'block', textAlign: 'center', color: '#E65A5A', fontSize: '22rpx' }}>{error}，点击重试</Text> : null}
          {page?.hasMore ? <View id="mutual-load-more" onClick={() => !loadingMore && void load(page.current + 1)} style={{ width: '260rpx', height: '64rpx', margin: '28rpx auto', borderRadius: '32rpx', background: '#F3F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#2876FF', fontSize: '24rpx' }}>{loadingMore ? '加载中...' : '加载更多'}</Text></View> : null}
        </View>
      </ScrollView>
    </View>
  )
}

function MutualState({ id, text, action, onAction }: { id: string; text: string; action?: string; onAction?: () => void }) {
  return <View id={id} style={{ minHeight: '520rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#999999', fontSize: '26rpx' }}>{text}</Text>{action && onAction ? <View onClick={onAction} style={{ marginTop: '28rpx', padding: '18rpx 48rpx', borderRadius: '40rpx', background: '#2876FF' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>{action}</Text></View> : null}</View>
}

function buildLocation(person: MutualMatchItemVO): string {
  const city = person.currentCity ? `现居${person.currentCity}` : ''
  const hometown = person.hometownCity ? `${person.hometownCity}人` : ''
  const profile = [person.age ? `${person.age}岁` : '', person.height ? `${person.height}cm` : ''].filter(Boolean).join('·')
  return [city, hometown, profile].filter(Boolean).join('·') || '资料待完善'
}
