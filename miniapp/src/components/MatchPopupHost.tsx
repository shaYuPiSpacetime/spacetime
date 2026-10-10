import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import personImage from '@/assets/lanhu/heart-message/heart-person.webp'
import { useAuthStore } from '@/stores/authStore'
import { getPendingMatchPopup, markMatchPopupRead, type MatchPopupAction, type MatchPopupVO } from '@/services/relation'
import { resolveConversationByPeerUserId } from '@/services/message'
import { MATCH_POPUP_POLL_MS, MATCH_POPUP_REFRESH_EVENT } from '@/domain/matchPopupRefresh'
import { MESSAGE_RUNTIME_BACKGROUND_EVENT } from '@/domain/messageLifecycle'

/** 页面前台匹配提醒：只处理可见页面，隐藏后忽略旧响应并停止轮询。 */
export default function MatchPopupHost() {
  const userId = useAuthStore(state => state.userId)
  const allowed = useAuthStore(state => state.accessStatus?.coreAccessStatus === 'CORE_ALLOWED')
  const [popup, setPopup] = useState<MatchPopupVO | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const popupRef = useRef<MatchPopupVO | null>(null)
  const busy = useRef(false)
  const active = useRef(true)
  const epoch = useRef(0)
  const querying = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const checkRef = useRef<() => Promise<void>>(async () => {})

  const stop = () => {
    active.current = false
    epoch.current += 1
    querying.current = false
    popupRef.current = null
    setPopup(null)
    busy.current = false
    setSubmitting(false)
    if (timer.current) clearTimeout(timer.current)
  }
  checkRef.current = async () => {
    if (!active.current || !userId || !allowed || querying.current || popupRef.current || busy.current) return
    const requestEpoch = epoch.current
    querying.current = true
    try {
      const next = await getPendingMatchPopup()
      if (!active.current || requestEpoch !== epoch.current) return
      popupRef.current = next
      setPopup(next)
    } catch {
      // 临时网络故障由下一次前台轮询重试，不打断当前操作。
    } finally {
      if (requestEpoch === epoch.current) querying.current = false
    }
  }
  const start = () => {
    active.current = true
    if (timer.current) clearTimeout(timer.current)
    void checkRef.current()
    const tick = () => {
      if (!active.current) return
      void checkRef.current()
      timer.current = setTimeout(tick, MATCH_POPUP_POLL_MS)
    }
    timer.current = setTimeout(tick, MATCH_POPUP_POLL_MS)
  }
  useDidShow(start)
  useDidHide(stop)
  useEffect(() => {
    epoch.current += 1
    querying.current = false
    popupRef.current = null
    setPopup(null)
    busy.current = false
    setSubmitting(false)
    if (active.current) start()
    const refresh = () => { void checkRef.current() }
    Taro.eventCenter.on(MATCH_POPUP_REFRESH_EVENT, refresh)
    Taro.eventCenter.on(MESSAGE_RUNTIME_BACKGROUND_EVENT, stop)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      epoch.current += 1
      Taro.eventCenter.off(MATCH_POPUP_REFRESH_EVENT, refresh)
      Taro.eventCenter.off(MESSAGE_RUNTIME_BACKGROUND_EVENT, stop)
    }
  }, [userId, allowed])

  const handleAction = async (action: MatchPopupAction) => {
    const current = popupRef.current
    if (!current || busy.current) return
    const actionEpoch = epoch.current
    busy.current = true
    setSubmitting(true)
    try {
      await markMatchPopupRead(current.matchNo, action)
      if (!active.current || actionEpoch !== epoch.current) return
      popupRef.current = null
      setPopup(null)
      if (action === 'profile') {
        await Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${current.matchedUserId}&sourceScene=profile` })
      } else if (action === 'chat') {
        if (!current.canEnterConversation) {
          await Taro.showToast({ title: '当前匹配暂不可聊天，请刷新后重试', icon: 'none' })
          return
        }
        const conversation = await resolveConversationByPeerUserId(current.matchedUserId)
        if (active.current && actionEpoch === epoch.current) await Taro.navigateTo({ url: `/pages/message/private-chat?conversationNo=${encodeURIComponent(conversation.conversationNo)}` })
      }
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : '匹配确认失败，请重试', icon: 'none' })
    } finally {
      if (actionEpoch === epoch.current) {
        busy.current = false
        setSubmitting(false)
      }
    }
  }
  return <MatchPopupSheet visible={Boolean(popup)} popup={popup} submitting={submitting} onAction={action => void handleAction(action)} />
}

function MatchPopupSheet({ visible = true, popup, submitting, onAction }: { visible?: boolean; popup?: MatchPopupVO | null; submitting: boolean; onAction: (action: MatchPopupAction) => void }) {
  if (!popup) {
    return <View style={{ position: 'fixed', inset: 0, zIndex: 9000, visibility: 'hidden', pointerEvents: 'none' }} />
  }
  return (
    <View id="relation-match-popup" onClick={() => !submitting && onAction('close')} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', visibility: visible ? 'visible' : 'hidden', pointerEvents: visible ? 'auto' : 'none' }}>
      {visible ? <View onClick={event => event.stopPropagation()} style={{ width: '620rpx', borderRadius: '32rpx', background: '#FFFFFF', padding: '42rpx 34rpx 34rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
        <Image src={popup.avatar || personImage} mode="aspectFill" style={{ width: '132rpx', height: '132rpx', borderRadius: '50%' }} />
        <Text style={{ marginTop: '24rpx', color: '#0C285A', fontSize: '34rpx', fontWeight: 700 }}>匹配成功</Text>
        <Text style={{ marginTop: '12rpx', color: '#7F8494', fontSize: '24rpx' }}>{popup.mutualLiked ? `你和${popup.nickname}互相喜欢了` : `你已与${popup.nickname}建立匹配`}</Text>
        <View style={{ width: '100%', marginTop: '34rpx', display: 'flex', gap: '18rpx', opacity: submitting ? 0.6 : 1 }}>
          <View id="match-profile-button" onClick={() => !submitting && onAction('profile')} style={{ flex: 1, height: '82rpx', borderRadius: '41rpx', background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#F06C83', fontSize: '26rpx' }}>查看主页</Text></View>
          <View id="match-chat-button" onClick={() => !submitting && onAction('chat')} style={{ flex: 1, height: '82rpx', borderRadius: '41rpx', background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: '26rpx' }}>去聊天</Text></View>
        </View>
        <Text onClick={() => !submitting && onAction('later')} style={{ marginTop: '24rpx', color: '#A0A6B2', fontSize: '24rpx' }}>{submitting ? '正在确认...' : '稍后再说'}</Text>
      </View> : null}
    </View>
  )
}
