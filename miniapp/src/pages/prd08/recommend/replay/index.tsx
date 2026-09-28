import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import NativeNavigation from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'
import { buildReplayGroups, resolveReplayProfileStep } from '@/domain/recommendReplay'
import { cancelRelationLike, sendRelationLike } from '@/services/relation'
import { getApiErrorCode } from '@/services/request'
import {
  getRecommendReplay,
  quoteRecommendReplayProfile,
  recordRecommendLike,
  unlockRecommendReplayProfile,
  type RecommendReplayItemVO,
} from '@/services/recommend'

type ReplayState = 'loading' | 'ready' | 'error'

function createRequestId(prefix: string, candidateNo: string) {
  return `${prefix}-${candidateNo}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export default function RecommendReplayPage() {
  const [items, setItems] = useState<RecommendReplayItemVO[]>([])
  const [state, setState] = useState<ReplayState>('loading')
  const [message, setMessage] = useState('')
  const [submittingCandidateNo, setSubmittingCandidateNo] = useState('')
  const [openingCandidateNo, setOpeningCandidateNo] = useState('')
  const [memberProfileAccess, setMemberProfileAccess] = useState(false)
  const openingRef = useRef(false)

  const load = async () => {
    setState('loading')
    setMessage('')
    try {
      const data = await getRecommendReplay()
      setItems(data.items || [])
      setMemberProfileAccess(Boolean(data.memberProfileAccess))
      setState('ready')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '回看记录加载失败')
      setState('error')
    }
  }

  useEffect(() => { void load() }, [])
  usePullDownRefresh(() => void load().finally(() => Taro.stopPullDownRefresh()))
  const groups = useMemo(() => buildReplayGroups(items), [items])

  const openRecharge = (price: number) => Taro.navigateTo({
    url: `/pages/coins/unlock-recharge?sourceScene=replay_profile_unlock_one&cost=${price}`,
  })

  const openProfile = async (item: RecommendReplayItemVO) => {
    if (openingRef.current) return
    const targetUserId = Number(item.profile.userId || item.candidateNo)
    if (!targetUserId) return
    openingRef.current = true
    setOpeningCandidateNo(item.candidateNo)
    let quotedPrice = 0
    try {
      const quote = await quoteRecommendReplayProfile(targetUserId)
      quotedPrice = quote.unitPrice || 0
      const step = resolveReplayProfileStep(quote.memberAccess, quote)
      if (step === 'open') {
        await Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${targetUserId}&sourceScene=fate` })
        return
      }
      if (step === 'unavailable') throw new Error('当前暂不能解锁该主页，请稍后重试')
      if (step === 'recharge') {
        const modal = await Taro.showModal({ title: '千寻币余额不足', content: `查看主页需 ${quote.unitPrice} 千寻币，当前余额 ${quote.coinBalance} 千寻币。`, confirmText: '去充值' })
        if (modal.confirm) await openRecharge(quotedPrice)
        return
      }
      const modal = await Taro.showModal({
        title: '解锁用户主页',
        content: `将消耗 ${quote.unitPrice} 千寻币，解锁后再次查看该用户不重复扣费。`,
        confirmText: '确认解锁',
      })
      if (!modal.confirm) return
      const result = await unlockRecommendReplayProfile(targetUserId, {
        requestId: createRequestId('replay-profile', item.candidateNo),
        expectedPrice: quote.unitPrice,
      })
      if (result.canOpen) {
        await Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${targetUserId}&sourceScene=fate` })
      }
    } catch (error) {
      if (getApiErrorCode(error) === 5001) {
        const modal = await Taro.showModal({ title: '千寻币余额不足', content: '余额不足，充值后可继续解锁该主页。', confirmText: '去充值' })
        if (modal.confirm) await openRecharge(quotedPrice)
      } else {
        await Taro.showToast({ title: error instanceof Error ? error.message : '打开主页失败，请稍后重试', icon: 'none' })
      }
    } finally {
      openingRef.current = false
      setOpeningCandidateNo('')
    }
  }

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
      {state === 'ready' ? (
        <ScrollView scrollY showScrollbar={false} style={{ height: 'calc(100vh - 160rpx)' }}>
          <View style={{ padding: '18rpx 24rpx 80rpx' }}>
            {groups.map(group => <ReplayGroup key={group.date} date={group.date} items={group.items} submittingCandidateNo={submittingCandidateNo} openingCandidateNo={openingCandidateNo} onLike={item => void toggleLike(item)} onOpen={item => void openProfile(item)} />)}
            <Text style={{ display: 'block', color: '#AAAAAA', fontSize: '24rpx', textAlign: 'center', marginTop: '48rpx' }}>{memberProfileAccess ? '会员可直接查看最近3天回放用户主页' : '最近3天回放列表免费查看，打开主页需按单人解锁'}</Text>
          </View>
        </ScrollView>
      ) : null}
    </View>
  )
}

function ReplayGroup({ date, items, submittingCandidateNo, openingCandidateNo, onLike, onOpen }: {
  date: string
  items: RecommendReplayItemVO[]
  submittingCandidateNo: string
  openingCandidateNo: string
  onLike: (item: RecommendReplayItemVO) => void
  onOpen: (item: RecommendReplayItemVO) => void
}) {
  const skipped = items.filter(item => item.lastAction === 'skip').length
  return <View style={{ marginBottom: '28rpx' }}><View style={{ height: '58rpx', display: 'flex', alignItems: 'center' }}><View style={{ width: '7rpx', height: '30rpx', borderRadius: '4rpx', background: '#6095FF', marginRight: '12rpx' }} /><Text style={{ flex: 1, color: '#333333', fontSize: '29rpx', fontWeight: 500 }}>{date}</Text><Text style={{ color: '#777777', fontSize: '24rpx' }}>推荐 {items.length}人　跳过 {skipped}人</Text></View>{items.length ? items.map(item => <ReplayRow key={item.candidateNo} item={item} submitting={submittingCandidateNo === item.candidateNo || openingCandidateNo === item.candidateNo} onLike={() => onLike(item)} onOpen={() => onOpen(item)} />) : <Text style={{ display: 'block', color: '#777777', fontSize: '24rpx', margin: '18rpx 0' }}>这一天暂无回放记录</Text>}</View>
}

function ReplayRow({ item, submitting, onLike, onOpen }: { item: RecommendReplayItemVO; submitting: boolean; onLike: () => void; onOpen: () => void }) {
  const profile = item.profile
  const desc = [profile.age ? `${profile.age}岁` : '', profile.currentCity || '', profile.occupationLabel || ''].filter(Boolean).join('·')
  return (
    <View style={{ height: '128rpx', display: 'flex', alignItems: 'center', opacity: submitting ? .62 : 1 }}>
      <View onClick={onOpen} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        {profile.avatar ? <Image src={profile.avatar} mode="aspectFill" style={{ width: '78rpx', height: '78rpx', borderRadius: '39rpx' }} /> : <View style={{ width: '78rpx', height: '78rpx', borderRadius: '39rpx', background: '#E8EEF7' }} />}
        <View style={{ flex: 1, marginLeft: '20rpx' }}><Text style={{ display: 'block', color: '#333333', fontSize: '27rpx', fontWeight: 600 }}>{profile.nickname}</Text><Text style={{ display: 'block', color: '#AAAAAA', fontSize: '23rpx', marginTop: '10rpx' }}>{desc}</Text></View>
      </View>
      <Image onClick={onLike} src={miniappOssIcons.recommendLike} mode="aspectFit" style={{ width: '58rpx', height: '58rpx', marginRight: '20rpx', opacity: item.liked ? 1 : .42, filter: item.liked ? 'none' : 'grayscale(1)' }} />
      <View onClick={onOpen} style={{ width: '118rpx', height: '54rpx', borderRadius: '27rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '24rpx' }}>查看</Text></View>
    </View>
  )
}

function StateText({ text }: { text: string }) {
  return <View style={{ paddingTop: '260rpx', textAlign: 'center' }}><Text style={{ color: '#999999', fontSize: '26rpx' }}>{text}</Text></View>
}
