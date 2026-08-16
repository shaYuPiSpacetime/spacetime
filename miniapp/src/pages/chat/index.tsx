import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import AccessBlockedPage from '@/components/AccessBlockedPage'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import { miniappOssIcons } from '@/constants/ossIcons'
import { formatMessageBadge } from '@/domain/messageRuntime'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import { messageService, mockMessageService } from '@/services/message'
import { messagePlatformRuntime } from '@/services/messagePlatformRuntime'
import { useMessageRuntimeStore } from '@/stores/messageRuntimeStore'
import type { MessageHomeResponse } from '@/types/message'

const background =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6) 100%)'
const designRpx = (value: number) =>
  Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? `${value}rpx` : `${value / 2}px`

interface HomeViewRow {
  id: string
  type: 'liked' | 'assistant' | 'system' | 'conversation'
  title: string
  preview: string
  timeText: string
  unreadCount: number
  avatarUrl?: string
  conversationNo?: string
}

const mockHomeRows: HomeViewRow[] = [
  {
    id: 'liked-me',
    type: 'liked',
    title: '喜欢我的人(119人)',
    preview: '解锁喜欢你的人，即刻匹配',
    timeText: '10:23',
    unreadCount: 1,
    avatarUrl: miniappOssIcons.messageAvatarLikedBlurred,
  },
  {
    id: 'assistant',
    type: 'assistant',
    title: '官方小助手',
    preview: '你的学历认证已通过，资料可信度已更新。',
    timeText: '昨天 11:42',
    unreadCount: 0,
  },
  {
    id: 'system',
    type: 'system',
    title: '系统消息',
    preview: '你们已成功匹配',
    timeText: '昨天 10:55',
    unreadCount: 0,
  },
]

function formatTime(value?: string | null): string {
  if (!value) return ''
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  return `${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`
}

export default function ChatPage() {
  const router = useRouter()
  const certified = router.params.variant !== 'unverified'
  const isMockScene = Boolean(router.params.mockScene)
  const access = useAccessStatus('canMessage')
  const runtimeHome = useMessageRuntimeStore(state => state.home)
  const runtimeError = useMessageRuntimeStore(state => state.errorMessage)
  const [home, setHome] = useState<MessageHomeResponse>()
  const [conversationRows, setConversationRows] = useState<HomeViewRow[]>([])
  const [loading, setLoading] = useState(false)
  const [pageError, setPageError] = useState('')

  const load = async () => {
    if (access.allowed !== true) return
    setLoading(true)
    setPageError('')
    try {
      const service = isMockScene ? mockMessageService : messageService
      const result = isMockScene ? await service.getHome() : runtimeHome || (await service.getHome())
      setHome(result)
      if (result.accessMode === 'restricted') {
        setConversationRows([])
        return
      }
      const rows = (result.conversationPage.list || []).map(
        item => ({
          id: item.conversationNo,
          type: 'conversation' as const,
          title: item.peerUser.nickname || '用户已注销',
          preview: item.lastMessage?.preview || '点击进入会话',
          timeText: formatTime(item.lastMessage?.messageTime),
          unreadCount: Number(item.unreadCount || 0),
          avatarUrl: item.peerUser.avatarUrl || miniappOssIcons.messageAvatarXiaoming,
          conversationNo: item.conversationNo,
        }),
      )
      setConversationRows(rows)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : '消息加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [access.allowed, isMockScene, runtimeHome])

  useDidShow(() => {
    if (!isMockScene) void messagePlatformRuntime.onForeground()
  })

  const activeHome = home || runtimeHome
  const accessMode = activeHome?.accessMode || 'normal'
  const fixedRows = useMemo<HomeViewRow[]>(() => {
    if (isMockScene) return mockHomeRows
    if (!activeHome) return []
    const rows: HomeViewRow[] = []
    if (accessMode === 'normal') {
      rows.push({
        id: 'liked-me',
        type: 'liked',
        title: `喜欢我的人(${activeHome.likesMeSummary.totalCount}人)`,
        preview: '解锁喜欢你的人，即刻匹配',
        timeText: formatTime(activeHome.likesMeSummary.latestLikedTime),
        unreadCount: activeHome.likesMeSummary.newCount,
        avatarUrl: activeHome.likesMeSummary.latestAvatarUrl || miniappOssIcons.messageAvatarLikedBlurred,
      })
      rows.push({
        id: 'assistant',
        type: 'assistant',
        title: '官方小助手',
        preview: activeHome.assistantSummary.latestPreview || '暂无新消息',
        timeText: formatTime(activeHome.assistantSummary.latestTime),
        unreadCount: activeHome.assistantSummary.unreadCount,
      })
    }
    rows.push({
      id: 'system',
      type: 'system',
      title: '系统消息',
      preview: activeHome.systemSummary.latestPreview || '暂无新消息',
      timeText: formatTime(activeHome.systemSummary.latestTime),
      unreadCount: activeHome.systemSummary.unreadCount,
    })
    return rows
  }, [activeHome, accessMode, isMockScene])
  const rows = certified
    ? [...(isMockScene ? mockHomeRows : fixedRows), ...conversationRows]
    : (isMockScene ? mockHomeRows : fixedRows).slice(0, 3)

  if (access.allowed !== true) return <AccessBlockedPage {...access} />

  return (
    <View
      style={{ height: '100vh', overflow: 'hidden', background, fontFamily: 'PingFang SC, sans-serif' }}
    >
      <ScrollView
        scrollY
        style={{ width: Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? '750rpx' : '100%', height: '100vh' }}
        showScrollbar={false}
      >
        <View style={{ minHeight: designRpx(1624), paddingBottom: designRpx(190), boxSizing: 'border-box' }}>
          <HeartMessageHeader title="消息" underline />
          {!certified ? <CertificationBanner /> : null}
          {accessMode === 'restricted' ? (
            <View style={{ width: designRpx(700), margin: `${designRpx(6)} auto 0`, padding: designRpx(24), borderRadius: designRpx(12), background: '#FFF7ED', boxSizing: 'border-box' }}>
              <Text style={{ color: '#9C5C05', fontSize: designRpx(24), lineHeight: designRpx(36) }}>
                {activeHome?.restrictionPrompt || '当前账号处于受限只读状态'}
              </Text>
            </View>
          ) : (
            <MessageEntrances isMockScene={isMockScene} home={activeHome} />
          )}
          <View style={{ width: designRpx(700), minHeight: designRpx(certified ? 1264 : 760), margin: `${designRpx(24)} auto 0`, padding: `0 ${designRpx(17)}`, borderRadius: designRpx(8), background: '#FFFFFF', boxSizing: 'border-box' }}>
            {rows.map(row => <MessageListRow key={row.id} row={row} isMockScene={isMockScene} />)}
            {!loading && rows.length === 0 ? <Text style={{ display: 'block', padding: designRpx(60), color: '#999999', fontSize: designRpx(24), textAlign: 'center' }}>暂无消息</Text> : null}
            {loading && rows.length === 0 ? <Text style={{ display: 'block', padding: designRpx(60), color: '#999999', fontSize: designRpx(24), textAlign: 'center' }}>消息加载中...</Text> : null}
            {pageError || runtimeError ? (
              <View onClick={() => void load()} style={{ padding: designRpx(36), textAlign: 'center' }}>
                <Text style={{ color: '#EE2525', fontSize: designRpx(24) }}>{pageError || runtimeError}，点击重试</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function CertificationBanner() {
  return (
    <View style={{ width: designRpx(700), height: designRpx(88), margin: `${designRpx(-4)} auto ${designRpx(14)}`, padding: `0 ${designRpx(18)}`, display: 'flex', alignItems: 'center', borderRadius: designRpx(8), background: '#FFFFFF', boxSizing: 'border-box' }}>
      <Text style={{ flex: 1, color: '#7F8494', fontSize: designRpx(24) }}>通过认证，才可以聊天哦！</Text>
      <View onClick={() => Taro.navigateTo({ url: '/pages/verification/triple' })} style={{ width: designRpx(116), height: designRpx(58), borderRadius: designRpx(8), background: '#2876FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: designRpx(24) }}>去认证</Text>
      </View>
    </View>
  )
}

function MessageEntrances({ isMockScene, home }: { isMockScene: boolean; home?: MessageHomeResponse }) {
  const sceneSuffix = isMockScene ? '?mockScene=whisper-received' : ''
  const whisperBadge = formatMessageBadge(home?.unreadSummary.whisperUnreadCount || 0)
  const privateBadge = formatMessageBadge(home?.unreadSummary.privateUnreadCount || 0)
  return (
    <View style={{ width: designRpx(700), height: designRpx(158), margin: `${designRpx(6)} auto 0`, display: 'flex', gap: designRpx(20) }}>
      <View id="message-home-whisper-entry" data-role="message-home-whisper-entry" onClick={() => Taro.navigateTo({ url: `/pages/message/whisper-list${sceneSuffix}` })} style={{ position: 'relative', width: designRpx(340), height: designRpx(158), overflow: 'hidden', borderRadius: designRpx(12), background: '#E3F1FE' }}>
        <Image id="message-home-whisper-background" data-role="message-home-whisper-background" src={miniappOssIcons.messageHomeWhisperCardBackground} mode="aspectFill" style={{ position: 'absolute', zIndex: 1, left: 0, top: 0, width: designRpx(340), height: designRpx(158), pointerEvents: 'none' }} />
        <Text style={{ position: 'absolute', zIndex: 2, left: designRpx(22), top: designRpx(29), color: '#00469F', fontSize: designRpx(28), fontWeight: 500, lineHeight: designRpx(40) }}>悄悄话</Text>
        <Image src={miniappOssIcons.messageAvatarWhisperGroup} mode="widthFix" style={{ position: 'absolute', zIndex: 2, left: designRpx(22), top: designRpx(79), width: designRpx(114), height: designRpx(55) }} />
        {whisperBadge ? <Text style={{ position: 'absolute', zIndex: 3, right: designRpx(16), top: designRpx(16), minWidth: designRpx(32), height: designRpx(32), padding: `0 ${designRpx(8)}`, borderRadius: designRpx(18), background: '#EE2525', color: '#FFFFFF', fontSize: designRpx(18), lineHeight: designRpx(32), textAlign: 'center', boxSizing: 'border-box' }}>{whisperBadge}</Text> : null}
      </View>
      <View id="message-home-private-entry" data-role="message-home-private-entry" onClick={() => Taro.navigateTo({ url: `/pages/message/private-list${isMockScene ? '?mockScene=private-list' : ''}` })} style={{ position: 'relative', width: designRpx(340), height: designRpx(158), overflow: 'hidden', borderRadius: designRpx(12), background: '#FDEAD9' }}>
        <Image id="message-home-private-background" data-role="message-home-private-background" src={miniappOssIcons.messageHomePrivateCardBackground} mode="aspectFill" style={{ position: 'absolute', zIndex: 1, left: 0, top: 0, width: designRpx(340), height: designRpx(158), pointerEvents: 'none' }} />
        <Text style={{ position: 'absolute', zIndex: 2, left: designRpx(22), top: designRpx(29), color: '#9C5C05', fontSize: designRpx(28), fontWeight: 500, lineHeight: designRpx(40) }}>私信</Text>
        <Text style={{ position: 'absolute', zIndex: 2, left: designRpx(22), top: designRpx(79), color: '#9C5C05', fontSize: designRpx(22), fontWeight: 500, lineHeight: designRpx(30) }}>有个小秘密只告诉你</Text>
        {privateBadge ? <Text style={{ position: 'absolute', zIndex: 3, right: designRpx(16), top: designRpx(16), minWidth: designRpx(32), height: designRpx(32), padding: `0 ${designRpx(8)}`, borderRadius: designRpx(18), background: '#EE2525', color: '#FFFFFF', fontSize: designRpx(18), lineHeight: designRpx(32), textAlign: 'center', boxSizing: 'border-box' }}>{privateBadge}</Text> : null}
      </View>
    </View>
  )
}

function MessageListRow({ row, isMockScene }: { row: HomeViewRow; isMockScene: boolean }) {
  const open = () => {
    if (row.type === 'liked') return void Taro.switchTab({ url: '/pages/community/index' })
    if (row.type === 'assistant' || row.type === 'system') {
      return void Taro.navigateTo({ url: `/pages/message/channel?channel=${row.type}${isMockScene ? `&mockScene=channel-${row.type}` : ''}` })
    }
    return void Taro.navigateTo({ url: `/pages/message/private-chat?conversationNo=${encodeURIComponent(row.conversationNo || '')}${isMockScene ? '&mockScene=private-chat-default' : ''}` })
  }
  return (
    <View onClick={open} style={{ width: designRpx(666), height: designRpx(160), borderBottom: `${designRpx(1)} solid #EFF4FC`, display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
      <HomeRowAvatar row={row} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: designRpx(20) }}>
        <Text style={{ display: 'block', color: '#333333', fontSize: designRpx(28), fontWeight: 500, lineHeight: designRpx(40), whiteSpace: 'nowrap' }}>{row.title}</Text>
        <Text style={{ display: 'block', marginTop: designRpx(6), overflow: 'hidden', color: '#999999', fontSize: designRpx(26), lineHeight: designRpx(37), whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{row.preview}</Text>
      </View>
      <Text style={{ alignSelf: 'flex-start', marginTop: designRpx(46), color: '#999999', fontSize: designRpx(20), lineHeight: designRpx(28), whiteSpace: 'nowrap' }}>{row.timeText}</Text>
    </View>
  )
}

function HomeRowAvatar({ row }: { row: HomeViewRow }) {
  const source = row.type === 'assistant' ? miniappOssIcons.messageAssistant : row.type === 'system' ? miniappOssIcons.messageSystem : row.avatarUrl || miniappOssIcons.messageAvatarXiaoming
  const badge = formatMessageBadge(row.unreadCount)
  return (
    <View style={{ position: 'relative', width: designRpx(100), height: designRpx(100), flexShrink: 0 }}>
      <Image src={source} mode="aspectFill" style={{ width: designRpx(100), height: designRpx(100), borderRadius: '50%' }} />
      {badge ? <Text style={{ position: 'absolute', right: designRpx(-1), top: designRpx(-1), minWidth: designRpx(20), height: designRpx(20), padding: `0 ${designRpx(4)}`, border: `${designRpx(2)} solid #FFFFFF`, borderRadius: designRpx(13), background: '#EE2525', color: '#FFFFFF', fontSize: designRpx(16), lineHeight: designRpx(20), textAlign: 'center', boxSizing: 'border-box' }}>{row.type === 'liked' ? '' : badge}</Text> : null}
    </View>
  )
}
