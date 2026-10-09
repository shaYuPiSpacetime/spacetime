import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import AccessBlockedPage from '@/components/AccessBlockedPage'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import avatarImage from '@/assets/lanhu/heart-message/heart-avatar.webp'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import { navigateToOrRedirect } from '@/utils/navigation'
import {
  getGivenLikes,
  type GivenLikeItemVO,
  type GivenLikesPageVO,
} from '@/services/relation'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'

/** “我的-我喜欢的”真实有效关系列表。 */
export default function MyLikesPage() {
  const access = useAccessStatus('canCommunity')
  const [page, setPage] = useState<GivenLikesPageVO | null>(null)
  const [records, setRecords] = useState<GivenLikeItemVO[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const recordsRef = useRef<GivenLikeItemVO[]>([])
  const loadingMoreRef = useRef(false)
  const requestGenerationRef = useRef(0)
  const previousAllowedRef = useRef(access.allowed)

  const load = async (pageNo = 1) => {
    const refreshing = pageNo === 1
    if (!refreshing && loadingMoreRef.current) return
    const requestGeneration = refreshing
      ? ++requestGenerationRef.current
      : requestGenerationRef.current
    if (refreshing) {
      loadingMoreRef.current = false
      setLoadingMore(false)
      setState('loading')
      setError('')
    } else {
      loadingMoreRef.current = true
      setLoadingMore(true)
    }
    try {
      const data = await getGivenLikes(pageNo, 20)
      if (requestGeneration !== requestGenerationRef.current) return
      const nextRecords = mergeGivenLikesByLikeNo(
        refreshing ? [] : recordsRef.current,
        data.records || [],
      )
      setPage(data)
      recordsRef.current = nextRecords
      setRecords(nextRecords)
      setState(nextRecords.length ? 'ready' : 'empty')
    } catch (reason) {
      if (requestGeneration !== requestGenerationRef.current) return
      const message = reason instanceof Error ? reason.message : '我喜欢的人加载失败'
      setError(message)
      setState(recordsRef.current.length ? 'ready' : 'error')
      await Taro.showToast({ title: message, icon: 'none' })
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    }
  }

  useDidShow(() => {
    if (access.allowed === true) void load(1)
  })

  useEffect(() => {
    const becameAllowed = previousAllowedRef.current !== true && access.allowed === true
    previousAllowedRef.current = access.allowed
    if (becameAllowed) void load(1)
  }, [access.allowed])

  useEffect(() => () => {
    requestGenerationRef.current += 1
  }, [])

  if (access.allowed !== true) return <AccessBlockedPage {...access} />

  return (
    <View id="my-likes-page" style={{ height: '100vh', background: '#FFFFFF', fontFamily: 'PingFang SC, sans-serif' }}>
      <HeartMessageHeader title={`我喜欢的(${page?.total || 0}人)`} align="center" showBack />
      <ScrollView scrollY style={{ height: 'calc(100vh - 176rpx)' }}>
        <View style={{ width: '700rpx', minHeight: '520rpx', margin: '0 auto' }}>
          {state === 'loading' ? <ListState id="my-likes-loading-state" text="正在加载我喜欢的人" /> : null}
          {state === 'empty' ? <ListState id="my-likes-empty-state" text="还没有喜欢的人" action="去发现心动" onAction={() => void Taro.switchTab({ url: '/pages/recommend/index' })} /> : null}
          {state === 'error' ? <ListState id="my-likes-error-state" text={error} action="重新加载" onAction={() => void load(1)} /> : null}
          {records.map((person, index) => (
            <View key={person.likeNo} style={{ width: '700rpx', height: '160rpx', borderTop: index ? '1rpx solid #EFF4FC' : 0, display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
              <Image src={person.avatar || avatarImage} mode="aspectFill" style={{ width: '100rpx', height: '100rpx', borderRadius: '50%' }} />
              <View style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}>
                <View style={{ display: 'flex', alignItems: 'center' }}>
                  <Text style={{ color: '#333333', fontSize: '28rpx', fontWeight: 500 }}>{person.nickname}</Text>
                  {person.matched ? <Text style={{ marginLeft: '12rpx', color: '#FF5E6E', fontSize: '20rpx' }}>已匹配</Text> : null}
                </View>
                <Text style={{ display: 'block', marginTop: '10rpx', color: '#999999', fontSize: '20rpx' }}>{buildProfileText(person)}</Text>
              </View>
              <View onClick={() => void navigateToOrRedirect(`/pages/heart/user?targetUserId=${person.userId}&sourceScene=profile&from=my-likes`)} style={{ width: '168rpx', height: '72rpx', borderRadius: '12rpx', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#333333', fontSize: '26rpx' }}>查看主页</Text>
              </View>
            </View>
          ))}
          {error && records.length ? <Text onClick={() => void load(1)} style={{ display: 'block', textAlign: 'center', color: '#E65A5A', fontSize: '22rpx' }}>{error}，点击重试</Text> : null}
          {page?.hasMore ? <View id="my-likes-load-more" onClick={() => !loadingMore && void load(page.current + 1)} style={{ width: '260rpx', height: '64rpx', margin: '28rpx auto', borderRadius: '32rpx', background: '#F3F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#2876FF', fontSize: '24rpx' }}>{loadingMore ? '加载中...' : '加载更多'}</Text></View> : null}
        </View>
      </ScrollView>
    </View>
  )
}

export function mergeGivenLikesByLikeNo(
  current: GivenLikeItemVO[],
  incoming: GivenLikeItemVO[],
): GivenLikeItemVO[] {
  const recordsByLikeNo = new Map<string, GivenLikeItemVO>()
  current.forEach(item => recordsByLikeNo.set(item.likeNo, item))
  incoming.forEach(item => recordsByLikeNo.set(item.likeNo, item))
  return [...recordsByLikeNo.values()]
}

function ListState({ id, text, action, onAction }: { id: string; text: string; action?: string; onAction?: () => void }) {
  return <View id={id} style={{ minHeight: '520rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#999999', fontSize: '26rpx' }}>{text}</Text>{action && onAction ? <View onClick={onAction} style={{ marginTop: '28rpx', padding: '18rpx 48rpx', borderRadius: '40rpx', background: '#2876FF' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>{action}</Text></View> : null}</View>
}

function buildProfileText(person: GivenLikeItemVO): string {
  const city = person.currentCity ? `现居${person.currentCity}` : ''
  const profile = [person.age ? `${person.age}岁` : '', person.height ? `${person.height}cm` : '']
    .filter(Boolean)
    .join('·')
  return [city, profile].filter(Boolean).join('·') || '资料待完善'
}
