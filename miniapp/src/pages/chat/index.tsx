import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import personImage from '@/assets/lanhu/heart-message/heart-person.webp'
import blurredPersonImage from '@/assets/lanhu/heart-message/heart-person-blur.webp'

type MessageRow = {
  id: string
  kind: 'likes' | 'assistant' | 'official' | 'person'
  title: string
  preview: string
  time: string
  unread?: number
}

const background =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48.5%, rgba(248,250,239,0.6) 100%)'

const verifiedRows: MessageRow[] = [
  { id: 'likes', kind: 'likes', title: '喜欢我的人(119人)', preview: '解锁喜欢你的人，即刻匹配', time: '10:23' },
  { id: 'helper', kind: 'assistant', title: '官方小助手', preview: '你的学历认证已通过，资料可信度已更新。', time: '昨天 11:42' },
  { id: 'official', kind: 'official', title: '官方账号消息', preview: '你们已成功匹配', time: '昨天 10:55' },
  { id: 'xiaoming', kind: 'person', title: '小明', preview: '周末有空一起吃饭吗？', time: '03月31日', unread: 1 },
  { id: 'qingqing', kind: 'person', title: '卿卿', preview: '周末有空一起吃饭吗？', time: '03月31日' },
]

const unverifiedRows = verifiedRows.slice(0, 3)

export default function ChatPage() {
  const router = useRouter()
  const certified = router.params.variant !== 'unverified'
  const rows = certified ? verifiedRows : unverifiedRows

  return (
    <View style={{ height: '100vh', overflow: 'hidden', background, fontFamily: 'PingFang SC, sans-serif' }}>
      <ScrollView scrollY style={{ width: '750rpx', height: '100vh' }} showScrollbar={false}>
        <View style={{ minHeight: '1624rpx', paddingBottom: '190rpx', boxSizing: 'border-box' }}>
          <HeartMessageHeader title="消息" underline rightIcon="clean" />
          {!certified ? <CertificationBanner /> : null}
          <MessageActions />
          <View
            style={{
              width: '700rpx',
              minHeight: certified ? '930rpx' : '730rpx',
              margin: '20rpx auto 0',
              padding: '0 20rpx 80rpx',
              borderRadius: '8rpx',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            {rows.map((row) => <MessageListRow key={row.id} row={row} />)}
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
        width: '700rpx',
        height: '88rpx',
        margin: '-4rpx auto 14rpx',
        padding: '0 18rpx',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: '8rpx',
        background: 'rgba(255,255,255,0.92)',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          width: '32rpx',
          height: '36rpx',
          marginRight: '14rpx',
          borderRadius: '16rpx 16rpx 20rpx 20rpx',
          background: '#6F9AF5',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: '20rpx', lineHeight: '24rpx' }}>✓</Text>
      </View>
      <Text style={{ flex: 1, color: '#7F8494', fontSize: '24rpx', lineHeight: '34rpx' }}>
        通过认证，才可以聊天哦！
      </Text>
      <View
        onClick={() => Taro.navigateTo({ url: '/pages/verification/triple' })}
        style={{
          width: '116rpx',
          height: '58rpx',
          borderRadius: '8rpx',
          background: '#2876FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '24rpx', lineHeight: '34rpx' }}>去认证</Text>
      </View>
    </View>
  )
}

function MessageActions() {
  return (
    <View style={{ width: '700rpx', height: '158rpx', margin: '0 auto', display: 'flex', flexDirection: 'row', gap: '40rpx' }}>
      <View
        onClick={() => Taro.navigateTo({ url: '/pages/heart/mutual' })}
        style={{
          position: 'relative',
          width: '330rpx',
          height: '158rpx',
          padding: '28rpx 20rpx',
          overflow: 'hidden',
          borderRadius: '12rpx',
          background: '#E3F1FE',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ position: 'relative', zIndex: 2, color: '#00469F', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
          查看全部申请
        </Text>
        <View style={{ position: 'absolute', left: '20rpx', bottom: '23rpx', display: 'flex', flexDirection: 'row' }}>
          {[0, 1, 2].map((item) => (
            <Image
              key={item}
              src={blurredPersonImage}
              mode="aspectFill"
              style={{
                width: '54rpx',
                height: '54rpx',
                marginLeft: item ? '-8rpx' : '0',
                border: '3rpx solid #FFFFFF',
                borderRadius: '50%',
              }}
            />
          ))}
        </View>
        <View style={{ position: 'absolute', right: '-20rpx', top: '18rpx', width: '183rpx', height: '183rpx', borderRadius: '50%', background: 'linear-gradient(145deg,#7BBAFE,rgba(255,255,255,0))' }} />
        <View
          style={{
            position: 'absolute',
            right: '-7rpx',
            bottom: '-20rpx',
            width: '116rpx',
            height: '116rpx',
            borderRadius: '50%',
            background: 'linear-gradient(180deg,rgba(128,174,255,0.75),rgba(40,118,255,0.75))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '50rpx', fontFamily: 'cursive', fontStyle: 'italic', lineHeight: '60rpx' }}>yo</Text>
        </View>
      </View>

      <View
        style={{
          position: 'relative',
          width: '330rpx',
          height: '158rpx',
          padding: '28rpx 22rpx',
          overflow: 'hidden',
          borderRadius: '12rpx',
          background: '#FDEAD9',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ position: 'relative', zIndex: 2, display: 'block', color: '#9C5C05', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>
          悄悄话
        </Text>
        <Text style={{ position: 'relative', zIndex: 2, display: 'block', marginTop: '10rpx', color: '#9C5C05', fontSize: '22rpx', fontWeight: 500, lineHeight: '30rpx' }}>
          有个小秘密只告诉你
        </Text>
        <View style={{ position: 'absolute', right: '-20rpx', top: '18rpx', width: '183rpx', height: '183rpx', borderRadius: '50%', background: 'linear-gradient(145deg,#FFC288,rgba(255,255,255,0))' }} />
        <View
          style={{
            position: 'absolute',
            right: '-6rpx',
            bottom: '-20rpx',
            width: '116rpx',
            height: '116rpx',
            borderRadius: '50%',
            background: 'linear-gradient(180deg,rgba(255,151,43,0.75),rgba(255,154,57,0.75))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: '56rpx', height: '46rpx', border: '5rpx solid #FFFFFF', borderRadius: '50%', boxSizing: 'border-box' }} />
        </View>
      </View>
    </View>
  )
}

function MessageListRow({ row }: { row: MessageRow }) {
  const open = () => {
    if (row.kind === 'likes') {
      void Taro.switchTab({ url: '/pages/community/index' })
      return
    }
    if (row.kind === 'person') {
      void Taro.navigateTo({ url: '/pages/heart/user' })
    }
  }

  return (
    <View
      onClick={open}
      style={{
        width: '660rpx',
        height: '160rpx',
        borderTop: '1rpx solid #EFF4FC',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <MessageAvatar kind={row.kind} unread={row.unread} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}>
        <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx', whiteSpace: 'nowrap' }}>
          {row.title}
        </Text>
        <Text style={{ display: 'block', marginTop: '10rpx', color: '#999999', fontSize: '20rpx', lineHeight: '28rpx', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.preview}
        </Text>
      </View>
      <Text style={{ marginLeft: '12rpx', color: '#999999', fontSize: '20rpx', lineHeight: '28rpx', whiteSpace: 'nowrap' }}>
        {row.time}
      </Text>
    </View>
  )
}

function MessageAvatar({ kind, unread }: { kind: MessageRow['kind']; unread?: number }) {
  if (kind === 'likes' || kind === 'person') {
    return (
      <View style={{ position: 'relative', width: '100rpx', height: '100rpx', flexShrink: 0 }}>
        <Image
          src={kind === 'likes' ? blurredPersonImage : personImage}
          mode="aspectFill"
          style={{ width: '100rpx', height: '100rpx', borderRadius: '50%' }}
        />
        {kind === 'likes' || unread ? (
          <View
            style={{
              position: 'absolute',
              right: '-1rpx',
              top: '-1rpx',
              minWidth: '20rpx',
              height: '20rpx',
              padding: unread ? '0 4rpx' : '0',
              borderRadius: '13rpx',
              background: '#EE2525',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {unread ? <Text style={{ color: '#FFFFFF', fontSize: '16rpx', lineHeight: '20rpx' }}>{unread}</Text> : null}
          </View>
        ) : null}
      </View>
    )
  }

  const green = kind === 'assistant'
  return (
    <View
      style={{
        position: 'relative',
        width: '100rpx',
        height: '100rpx',
        flexShrink: 0,
        borderRadius: '50%',
        background: green ? 'linear-gradient(180deg,#73C599,#00BD58)' : 'linear-gradient(180deg,#7499FB,#2876FF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {green ? (
        <View style={{ width: '48rpx', height: '48rpx', border: '4rpx solid #FFFFFF', borderRadius: '8rpx', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '25rpx', lineHeight: '28rpx' }}>⌣</Text>
        </View>
      ) : (
        <View style={{ position: 'relative', width: '50rpx', height: '38rpx', border: '4rpx solid #FFFFFF', borderRadius: '7rpx', boxSizing: 'border-box' }}>
          <View style={{ position: 'absolute', left: '15rpx', top: '-13rpx', width: '16rpx', height: '12rpx', border: '4rpx solid #FFFFFF', borderBottom: 0, borderRadius: '7rpx 7rpx 0 0', boxSizing: 'border-box' }} />
          <View style={{ position: 'absolute', left: '11rpx', top: '14rpx', width: '20rpx', height: '4rpx', borderRadius: '2rpx', background: '#FFFFFF' }} />
        </View>
      )}
    </View>
  )
}
