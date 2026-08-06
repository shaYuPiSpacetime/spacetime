import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import { cancelRelationLike, sendRelationLike } from '@/services/relation'
import { getApiErrorCode } from '@/services/request'
import {
  getRecommendReplay,
  recordRecommendLike,
  type RecommendReplayItemVO,
} from '@/services/recommend'

type ReplayState = 'loading' | 'member-gate' | 'ready' | 'empty' | 'error'

function createRequestId(prefix: string, candidateNo: string) {
  return `${prefix}-${candidateNo}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export default function RecommendReplayPage() {
  const [items, setItems] = useState<RecommendReplayItemVO[]>([])
  const [state, setState] = useState<ReplayState>('loading')
  const [message, setMessage] = useState('')
  const [submittingCandidateNo, setSubmittingCandidateNo] = useState('')

  const load = async () => {
    setState('loading')
    setMessage('')
    try {
      const data = await getRecommendReplay()
      setItems(data.items || [])
      setState(data.items?.length ? 'ready' : 'empty')
    } catch (error) {
      if (getApiErrorCode(error) === 403) {
        setState('member-gate')
      } else {
        setMessage(error instanceof Error ? error.message : '回看记录加载失败')
        setState('error')
      }
    }
  }

  useEffect(() => { void load() }, [])
  usePullDownRefresh(() => void load().finally(() => Taro.stopPullDownRefresh()))
  const groups = useMemo(() => buildReplayGroups(items), [items])

  const toggleLike = async (item: RecommendReplayItemVO) => {
    if (submittingCandidateNo) return
    const targetUserId = Number(item.profile.userId || item.candidateNo)
    if (!targetUserId) return
    setSubmittingCandidateNo(item.candidateNo)
    try {
      const relation = item.liked
        ? await cancelRelationLike(targetUserId)
        : await sendRelationLike(targetUserId, 'fate', createRequestId('replay-like', item.candidateNo))
      setItems(current => current.map(candidate => candidate.candidateNo === item.candidateNo
        ? {
            ...candidate,
            liked: !item.liked,
            profile: {
              ...candidate.profile,
              liked: !item.liked,
              matched: Boolean(relation.matched),
              matchNo: relation.matchNo || candidate.profile.matchNo,
              canEnterConversation: Boolean(relation.canEnterConversation),
              communicationMode: relation.canEnterConversation ? 'PRIVATE_MESSAGE' : 'WHISPER',
            },
          }
        : candidate))
      if (!item.liked) {
        try {
          await recordRecommendLike(item.candidateNo, {
            requestId: createRequestId('replay-action-like', item.candidateNo),
          })
        } catch {
          await Taro.showToast({ title: '已喜欢，推荐记录同步稍有延迟', icon: 'none' })
          return
        }
      }
      await Taro.showToast({ title: item.liked ? '已取消喜欢' : relation.matched ? '匹配成功' : '已喜欢', icon: item.liked ? 'none' : 'success' })
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '操作失败，请稍后重试', icon: 'none' })
    } finally {
      setSubmittingCandidateNo('')
    }
  }

  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: 'PingFang SC, sans-serif' }}>
      <NativeNavigation title="三天回看" background="#FFFFFF" />
      {state === 'loading' ? <StateText text="记录加载中…" /> : null}
      {state === 'error' ? <StateText text={message || '加载失败，请下拉刷新'} /> : null}
      {state === 'member-gate' ? <MemberGate /> : null}
      {state === 'empty' ? <StateText text="最近三天还没有推荐记录" /> : null}
      {state === 'ready' ? (
        <ScrollView scrollY showScrollbar={false} style={{ height: 'calc(100vh - 160rpx)' }}>
          <View style={{ padding: '18rpx 24rpx 80rpx' }}>
            {groups.map(group => <ReplayGroup key={group.date} date={group.date} items={group.items} submittingCandidateNo={submittingCandidateNo} onLike={item => void toggleLike(item)} />)}
            <Text style={{ display: 'block', color: '#AAAAAA', fontSize: '24rpx', textAlign: 'center', marginTop: '48rpx' }}>仅展示最近3天推荐嘉宾，珍惜当下</Text>
          </View>
        </ScrollView>
      ) : null}
    </View>
  )
}

function MemberGate() {
  return <View style={{ width: '700rpx', height: '370rpx', margin: '34rpx auto 0', borderRadius: '14rpx', background: '#202020', overflow: 'hidden', position: 'relative' }}><Image src={miniappOssIcons.recommendVipBanner} mode="aspectFill" style={{ position: 'absolute', inset: 0, width: '700rpx', height: '370rpx', opacity: .72 }} /><View style={{ position: 'relative', zIndex: 2, paddingTop: '132rpx', textAlign: 'center' }}><Text style={{ display: 'block', color: '#FFFFFF', fontSize: '34rpx', fontWeight: 600 }}>不错过最近遇见的人</Text><Text style={{ display: 'block', color: '#FFFFFF', fontSize: '25rpx', marginTop: '22rpx' }}>开通会员后可查看近3天浏览或跳过的推荐候选人</Text><View onClick={() => void Taro.navigateTo({ url: '/pages/membership/index?sourcePage=recommend_replay' })} style={{ width: '260rpx', height: '76rpx', margin: '30rpx auto 0', borderRadius: '38rpx', background: '#FFC965', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#242424', fontSize: '30rpx', fontWeight: 600 }}>立即开通</Text></View></View></View>
}

function ReplayGroup({ date, items, submittingCandidateNo, onLike }: {
  date: string
  items: RecommendReplayItemVO[]
  submittingCandidateNo: string
  onLike: (item: RecommendReplayItemVO) => void
}) {
  const skipped = items.filter(item => item.lastAction === 'skip').length
  return <View style={{ marginBottom: '28rpx' }}><View style={{ height: '58rpx', display: 'flex', alignItems: 'center' }}><View style={{ width: '7rpx', height: '30rpx', borderRadius: '4rpx', background: '#6095FF', marginRight: '12rpx' }} /><Text style={{ flex: 1, color: '#333333', fontSize: '29rpx', fontWeight: 500 }}>{date}</Text><Text style={{ color: '#777777', fontSize: '24rpx' }}>推荐 {items.length}人　跳过 {skipped}人</Text></View>{items.length ? items.map(item => <ReplayRow key={item.candidateNo} item={item} submitting={submittingCandidateNo === item.candidateNo} onLike={() => onLike(item)} />) : <Text style={{ display: 'block', color: '#777777', fontSize: '24rpx', margin: '18rpx 0' }}>这一天你没来，无推荐嘉宾</Text>}</View>
}

function ReplayRow({ item, submitting, onLike }: { item: RecommendReplayItemVO; submitting: boolean; onLike: () => void }) {
  const profile = item.profile
  const desc = [profile.age ? `${profile.age}岁` : '', profile.currentCity || '', profile.occupationLabel || ''].filter(Boolean).join('·')
  return (
    <View style={{ height: '128rpx', display: 'flex', alignItems: 'center', opacity: submitting ? .62 : 1 }}>
      <View onClick={() => void Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${profile.userId}&sourceScene=fate` })} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        {profile.avatar ? <Image src={profile.avatar} mode="aspectFill" style={{ width: '78rpx', height: '78rpx', borderRadius: '39rpx' }} /> : <View style={{ width: '78rpx', height: '78rpx', borderRadius: '39rpx', background: '#E8EEF7' }} />}
        <View style={{ flex: 1, marginLeft: '20rpx' }}><Text style={{ display: 'block', color: '#333333', fontSize: '27rpx', fontWeight: 600 }}>{profile.nickname}</Text><Text style={{ display: 'block', color: '#AAAAAA', fontSize: '23rpx', marginTop: '10rpx' }}>{desc}</Text></View>
      </View>
      <Image onClick={onLike} src={miniappOssIcons.recommendLike} mode="aspectFit" style={{ width: '58rpx', height: '58rpx', marginRight: '20rpx', opacity: item.liked ? 1 : .42, filter: item.liked ? 'none' : 'grayscale(1)' }} />
      <View onClick={() => void Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${profile.userId}&sourceScene=fate` })} style={{ width: '118rpx', height: '54rpx', borderRadius: '27rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>查看</Text></View>
    </View>
  )
}

function buildReplayGroups(items: RecommendReplayItemVO[]) {
  const dates = Array.from({ length: 3 }, (_, index) => {
    const value = new Date(Date.now() - index * 86400000)
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  })
  return dates.map(date => ({ date, items: items.filter(item => String(item.viewedAt || '').slice(0, 10) === date || item.dateGroup === (date === dates[0] ? '今天' : date === dates[1] ? '昨天' : '前天')) }))
}

function StateText({ text }: { text: string }) {
  return <View style={{ paddingTop: '260rpx', textAlign: 'center' }}><Text style={{ color: '#999999', fontSize: '26rpx' }}>{text}</Text></View>
}
