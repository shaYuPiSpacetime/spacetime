import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import { miniappOssIcons } from '@/constants/ossIcons'
import { messageService } from '@/services/message'
import type { MessageHome, MessageHomeRow } from '@/types/message'
import { useAccessStatus } from '@/hooks/useAccessStatus'
import AccessBlockedPage from '@/components/AccessBlockedPage'

const background =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6) 100%)'
const designRpx = (value: number) =>
  Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? `${value}rpx` : `${value / 2}px`

const designRows: MessageHomeRow[] = [
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
  {
    id: 'xiaoming',
    type: 'conversation',
    title: '小明',
    preview: '周末有空一起吃饭吗？',
    timeText: '03月31日',
    unreadCount: 1,
    avatarUrl: miniappOssIcons.messageAvatarXiaoming,
    conversationNo: 'conversation-lin',
  },
  {
    id: 'qingqing',
    type: 'conversation',
    title: '卿卿',
    preview: '周末有空一起吃饭吗？',
    timeText: '03月31日',
    unreadCount: 0,
    avatarUrl: miniappOssIcons.messageAvatarXiaoming,
    conversationNo: 'conversation-lin',
  },
]

export default function ChatPage() {
  const router = useRouter()
  const certified = router.params.variant !== 'unverified'
  const [home, setHome] = useState<MessageHome>()
  const access = useAccessStatus('canMessage')
  useEffect(() => {
    if (access.allowed === true) void messageService.getHome().then(setHome)
  }, [access.allowed])

  if (access.allowed !== true) return <AccessBlockedPage {...access} />

  const rows = certified
    ? designRows.map((row, index) => ({
        ...row,
        unreadCount: router.params.mockScene
          ? row.unreadCount
          : (home?.rows[index]?.unreadCount ?? row.unreadCount),
      }))
    : designRows.slice(0, 3)

  return (
    <View
      style={{
        height: '100vh',
        overflow: 'hidden',
        background,
        fontFamily: 'PingFang SC, sans-serif',
      }}
    >
      <ScrollView
        scrollY
        style={{
          width: Taro.getEnv() === Taro.ENV_TYPE.WEAPP ? '750rpx' : '100%',
          height: '100vh',
        }}
        showScrollbar={false}
      >
        <View
          style={{
            minHeight: designRpx(1624),
            paddingBottom: designRpx(190),
            boxSizing: 'border-box',
          }}
        >
          <HeartMessageHeader title="消息" underline />
          {!certified ? <CertificationBanner /> : null}
          <MessageEntrances />
          <View
            style={{
              width: designRpx(700),
              minHeight: designRpx(certified ? 1264 : 760),
              margin: `${designRpx(24)} auto 0`,
              padding: `0 ${designRpx(17)}`,
              borderRadius: designRpx(8),
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            {rows.map(row => (
              <MessageListRow key={row.id} row={row} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function CertificationBanner() {
  return (
    <View
      style={{
        width: designRpx(700),
        height: designRpx(88),
        margin: `${designRpx(-4)} auto ${designRpx(14)}`,
        padding: `0 ${designRpx(18)}`,
        display: 'flex',
        alignItems: 'center',
        borderRadius: designRpx(8),
        background: '#FFFFFF',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ flex: 1, color: '#7F8494', fontSize: designRpx(24) }}>
        通过认证，才可以聊天哦！
      </Text>
      <View
        onClick={() => Taro.navigateTo({ url: '/pages/verification/triple' })}
        style={{
          width: designRpx(116),
          height: designRpx(58),
          borderRadius: designRpx(8),
          background: '#2876FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: designRpx(24) }}>去认证</Text>
      </View>
    </View>
  )
}

function MessageEntrances() {
  return (
    <View
      style={{
        width: designRpx(700),
        height: designRpx(158),
        margin: `${designRpx(14)} auto 0`,
        display: 'flex',
        gap: designRpx(20),
      }}
    >
      <View
        onClick={() =>
          Taro.navigateTo({ url: '/pages/message/whisper-list?mockScene=whisper-received' })
        }
        style={{
          position: 'relative',
          width: designRpx(340),
          height: designRpx(158),
          overflow: 'hidden',
          borderRadius: designRpx(12),
          background: '#E3F1FE',
        }}
      >
        <Text
          style={{
            position: 'absolute',
            zIndex: 2,
            left: designRpx(22),
            top: designRpx(29),
            color: '#00469F',
            fontSize: designRpx(28),
            fontWeight: 500,
            lineHeight: designRpx(40),
          }}
        >
          悄悄话
        </Text>
        <Image
          src={miniappOssIcons.messageAvatarWhisperGroup}
          mode="widthFix"
          style={{
            position: 'absolute',
            zIndex: 2,
            left: designRpx(22),
            top: designRpx(79),
            width: designRpx(114),
            height: designRpx(55),
          }}
        />
        <Image
          src={miniappOssIcons.messageHomeYoArt}
          mode="scaleToFill"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: designRpx(150),
            height: designRpx(140),
          }}
        />
      </View>
      <View
        onClick={() =>
          Taro.navigateTo({ url: '/pages/message/private-list?mockScene=private-list' })
        }
        style={{
          position: 'relative',
          width: designRpx(340),
          height: designRpx(158),
          overflow: 'hidden',
          borderRadius: designRpx(12),
          background: '#FDEAD9',
        }}
      >
        <Text
          style={{
            position: 'absolute',
            zIndex: 2,
            left: designRpx(22),
            top: designRpx(29),
            color: '#9C5C05',
            fontSize: designRpx(28),
            fontWeight: 500,
            lineHeight: designRpx(40),
          }}
        >
          私信
        </Text>
        <Text
          style={{
            position: 'absolute',
            zIndex: 2,
            left: designRpx(22),
            top: designRpx(79),
            color: '#9C5C05',
            fontSize: designRpx(22),
            fontWeight: 500,
            lineHeight: designRpx(30),
          }}
        >
          有个小秘密只告诉你
        </Text>
        <Image
          src={miniappOssIcons.messageHomePrivateBubbleArt}
          mode="scaleToFill"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: designRpx(111),
            height: designRpx(140),
          }}
        />
      </View>
    </View>
  )
}

function MessageListRow({ row }: { row: MessageHomeRow }) {
  const open = () => {
    if (row.type === 'liked') return void Taro.switchTab({ url: '/pages/community/index' })
    if (row.type === 'assistant' || row.type === 'system') {
      return void Taro.navigateTo({ url: `/pages/message/channel?mockScene=channel-${row.type}` })
    }
    return void Taro.navigateTo({
      url: `/pages/message/private-chat?mockScene=private-chat-default&conversationNo=${row.conversationNo || 'conversation-lin'}`,
    })
  }
  return (
    <View
      onClick={open}
      style={{
        width: designRpx(666),
        height: designRpx(160),
        borderBottom: `${designRpx(1)} solid #EFF4FC`,
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <HomeRowAvatar row={row} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: designRpx(20) }}>
        <Text
          style={{
            display: 'block',
            color: '#333333',
            fontSize: designRpx(28),
            fontWeight: 500,
            lineHeight: designRpx(40),
            whiteSpace: 'nowrap',
          }}
        >
          {row.title}
        </Text>
        <Text
          style={{
            display: 'block',
            marginTop: designRpx(6),
            overflow: 'hidden',
            color: '#999999',
            fontSize: designRpx(26),
            lineHeight: designRpx(37),
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {row.preview}
        </Text>
      </View>
      <Text
        style={{
          alignSelf: 'flex-start',
          marginTop: designRpx(46),
          color: '#999999',
          fontSize: designRpx(20),
          lineHeight: designRpx(28),
          whiteSpace: 'nowrap',
        }}
      >
        {row.timeText}
      </Text>
    </View>
  )
}

function HomeRowAvatar({ row }: { row: MessageHomeRow }) {
  const source =
    row.type === 'assistant'
      ? miniappOssIcons.messageAssistant
      : row.type === 'system'
        ? miniappOssIcons.messageSystem
        : row.avatarUrl || miniappOssIcons.messageAvatarXiaoming
  return (
    <View
      style={{ position: 'relative', width: designRpx(100), height: designRpx(100), flexShrink: 0 }}
    >
      <Image
        src={source}
        mode="aspectFill"
        style={{ width: designRpx(100), height: designRpx(100), borderRadius: '50%' }}
      />
      {row.unreadCount ? (
        <Text
          style={{
            position: 'absolute',
            right: designRpx(-1),
            top: designRpx(-1),
            minWidth: designRpx(20),
            height: designRpx(20),
            padding: `0 ${designRpx(4)}`,
            border: `${designRpx(2)} solid #FFFFFF`,
            borderRadius: designRpx(13),
            background: '#EE2525',
            color: '#FFFFFF',
            fontSize: designRpx(16),
            lineHeight: designRpx(20),
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {row.type === 'liked' ? '' : row.unreadCount}
        </Text>
      ) : null}
    </View>
  )
}
