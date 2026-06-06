import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import AppTabBar from '@/components/AppTabBar'
import bg from '@/assets/lanhu/recommend/recommend-bg.png'
import personImage from '@/assets/lanhu/recommend/recommend-person.png'

type FriendMode = '觅知音' | '悦目' | '诚意贴'

const MODES: FriendMode[] = ['觅知音', '悦目', '诚意贴']

const FEED_ITEMS = [
  {
    followed: false,
    liked: false,
    body: '这个问题困扰着许多的年轻人。实际上，平衡并不是简单的50:50分配时间啊，而是找到适合自己的节奏和生活重心……',
  },
  {
    followed: true,
    liked: true,
    body: '这个问题困扰着许多的年轻人。实际上，平衡并不是简单的50:50分配时间啊，而是找到适合自己的节奏和生活重心……',
  },
]

const POST_TEXT =
  '杭州互联网大厂程序员，工作稳定。喜欢打篮球、跑步，保持运动习惯。周末喜欢和朋友聚会或者宅家打游戏。性格偏i但熟了之后可e'

export default function RecommendFriendsPage() {
  const [mode, setMode] = useState<FriendMode>('悦目')
  const [actionOpen, setActionOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)

  const handleCommunity = () => {
    Taro.switchTab({ url: '/pages/community/index' })
  }

  return (
    <View style={{ minHeight: '100vh', background: '#F3F7FB', overflow: 'hidden', position: 'relative' }}>
      <Image src={bg} mode="widthFix" style={{ position: 'fixed', left: '0', top: '0', width: '750rpx' }} />
      <ScrollView scrollY style={{ height: '100vh', position: 'relative', zIndex: 1 }} showScrollbar={false}>
        <FriendTopBar onCommunity={handleCommunity} />
        <SegmentTabs active={mode} onChange={setMode} />
        <View style={{ width: '750rpx', padding: '20rpx 25rpx 210rpx', boxSizing: 'border-box' }}>
          {mode === '觅知音' && <KnowledgeFriends />}
          {mode === '悦目' && <JoyFeed onAction={() => setActionOpen(true)} />}
          {mode === '诚意贴' && <SincerityPost onAction={() => setActionOpen(true)} onVerify={() => setVerifyOpen(true)} />}
        </View>
      </ScrollView>
      {mode === '悦目' && (
        <View
          style={{
            position: 'fixed',
            right: '30rpx',
            bottom: '174rpx',
            width: '128rpx',
            height: '128rpx',
            borderRadius: '64rpx',
            background: '#2876FF',
            boxShadow: '0 12rpx 26rpx rgba(40,118,255,0.34)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 8,
          }}
          onClick={() => Taro.navigateTo({ url: '/pages/recommend/post' })}
          hoverClass="btn-hover"
        >
          <View style={{ width: '56rpx', height: '8rpx', borderRadius: '4rpx', background: '#FFFFFF' }} />
          <View style={{ position: 'absolute', width: '8rpx', height: '56rpx', borderRadius: '4rpx', background: '#FFFFFF' }} />
        </View>
      )}
      {actionOpen && <ActionSheet onClose={() => setActionOpen(false)} />}
      {verifyOpen && <VerifyPrompt onClose={() => setVerifyOpen(false)} />}
      <AppTabBar active="recommend" />
    </View>
  )
}

function FriendTopBar({ onCommunity }: { onCommunity: () => void }) {
  return (
    <View
      style={{
        width: '750rpx',
        height: '166rpx',
        padding: '86rpx 160rpx 0 25rpx',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      <View style={{ position: 'relative', height: '58rpx', marginRight: '30rpx' }}>
        <Text style={{ color: '#0C285A', fontSize: '34rpx', fontWeight: 800, lineHeight: '46rpx' }}>朋友</Text>
        <View
          style={{
            position: 'absolute',
            left: '0',
            bottom: '2rpx',
            width: '52rpx',
            height: '6rpx',
            borderRadius: '3rpx',
            background: '#2876FF',
            boxShadow: '0 8rpx 18rpx rgba(40,118,255,0.28)',
          }}
        />
      </View>
      <View style={{ height: '58rpx' }} onClick={onCommunity} hoverClass="btn-hover">
        <Text style={{ color: '#7F8494', fontSize: '30rpx', fontWeight: 600, lineHeight: '46rpx' }}>社区</Text>
      </View>
    </View>
  )
}

function SegmentTabs({ active, onChange }: { active: FriendMode; onChange: (mode: FriendMode) => void }) {
  return (
    <View
      style={{
        width: '700rpx',
        height: '88rpx',
        marginLeft: '25rpx',
        borderRadius: '8rpx',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 8rpx 24rpx rgba(210,224,246,0.34)',
      }}
    >
      {MODES.map((item) => {
        const isActive = active === item
        return (
          <View
            key={item}
            style={{
              position: 'relative',
              height: '88rpx',
              minWidth: '150rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => onChange(item)}
            hoverClass="btn-hover"
          >
            <Text
              style={{
                color: isActive ? '#0C285A' : '#828899',
                fontSize: '30rpx',
                fontWeight: isActive ? 800 : 600,
                lineHeight: '42rpx',
                textShadow: isActive ? '0 10rpx 16rpx rgba(40,118,255,0.26)' : 'none',
              }}
            >
              {item}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function KnowledgeFriends() {
  return (
    <View>
      <View
        style={{
          width: '700rpx',
          height: '188rpx',
          borderRadius: '16rpx',
          background: 'linear-gradient(180deg, #B9DBFF 0%, #2876FF 100%)',
          padding: '54rpx 58rpx',
          boxSizing: 'border-box',
          marginBottom: '30rpx',
        }}
      >
        <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '34rpx', fontWeight: 800, lineHeight: '48rpx' }}>
          占位、待待修改
        </Text>
        <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx', marginTop: '18rpx' }}>
          寻找你的知音好友
        </Text>
      </View>
      <Text style={{ display: 'block', color: '#9A9A9A', fontSize: '26rpx', lineHeight: '38rpx', marginBottom: '28rpx' }}>
        发现志同道合的朋友，即刻交流
      </Text>
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            style={{
              position: 'relative',
              width: '340rpx',
              height: '460rpx',
              borderRadius: '8rpx',
              overflow: 'hidden',
              marginBottom: '20rpx',
              background: '#DDE9F7',
            }}
          >
            <Image src={personImage} mode="aspectFill" style={{ width: '340rpx', height: '460rpx' }} />
            <View
              style={{
                position: 'absolute',
                left: '22rpx',
                top: '24rpx',
                height: '42rpx',
                borderRadius: '21rpx',
                background: 'rgba(255,255,255,0.82)',
                padding: '0 22rpx',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#333333', fontSize: '23rpx', lineHeight: '32rpx' }}>同专业，超有缘</Text>
            </View>
            <View style={{ position: 'absolute', left: '22rpx', bottom: '24rpx' }}>
              <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '26rpx', fontWeight: 800, lineHeight: '36rpx' }}>
                硕士·南京大学
              </Text>
              <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '20rpx', lineHeight: '30rpx', marginTop: '2rpx' }}>
                2小时前在线
              </Text>
            </View>
            <View
              style={{
                position: 'absolute',
                right: '20rpx',
                bottom: '26rpx',
                width: '58rpx',
                height: '58rpx',
                borderRadius: '29rpx',
                background: '#FF5B70',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: '34rpx', lineHeight: '46rpx' }}>♥</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function JoyFeed({ onAction }: { onAction: () => void }) {
  return (
    <View>
      {FEED_ITEMS.map((item, index) => (
        <DynamicCard key={`${item.followed}-${index}`} item={item} onAction={onAction} />
      ))}
    </View>
  )
}

function SincerityPost({ onAction, onVerify }: { onAction: () => void; onVerify: () => void }) {
  return (
    <View>
      <DynamicCard item={{ followed: false, liked: false, body: POST_TEXT }} onAction={onAction} withImages />
      <View
        style={{
          width: '700rpx',
          height: '92rpx',
          borderRadius: '46rpx',
          background: '#2876FF',
          marginTop: '22rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10rpx 24rpx rgba(40,118,255,0.26)',
        }}
        onClick={onVerify}
        hoverClass="btn-hover"
      >
        <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 700 }}>立即认证</Text>
      </View>
    </View>
  )
}

function DynamicCard({
  item,
  onAction,
  withImages = false,
}: {
  item: { followed: boolean; liked: boolean; body: string }
  onAction: () => void
  withImages?: boolean
}) {
  return (
    <View
      style={{
        width: '700rpx',
        minHeight: withImages ? '820rpx' : '420rpx',
        borderRadius: '18rpx',
        background: '#FFFFFF',
        padding: '32rpx 26rpx 0',
        boxSizing: 'border-box',
        marginBottom: '20rpx',
        boxShadow: '0 10rpx 28rpx rgba(210,224,246,0.42)',
      }}
    >
      <View style={{ position: 'relative', minHeight: '82rpx', paddingLeft: '100rpx', boxSizing: 'border-box' }}>
        <Image
          src={personImage}
          mode="aspectFill"
          style={{ position: 'absolute', left: '0', top: '0', width: '78rpx', height: '78rpx', borderRadius: '39rpx' }}
        />
        <Text style={{ color: '#333333', fontSize: '26rpx', fontWeight: 800, lineHeight: '36rpx' }}>筱老虎</Text>
        <Text style={{ color: '#E06B73', fontSize: '28rpx', lineHeight: '34rpx', marginLeft: '14rpx' }}>♀</Text>
        <Text style={{ display: 'block', color: '#2876FF', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '4rpx' }}>
          26岁 · 杭州 · 年薪50W+ · 985硕士
        </Text>
        <View
          style={{
            position: 'absolute',
            right: '26rpx',
            top: '0',
            width: '118rpx',
            height: '48rpx',
            borderRadius: '24rpx',
            border: item.followed ? '1rpx solid #B8B8B8' : '1rpx solid #2876FF',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: item.followed ? '#8B8B8B' : '#2876FF', fontSize: '24rpx', fontWeight: 700 }}>
            {item.followed ? '已关注' : '关注'}
          </Text>
        </View>
        <View
          style={{
            position: 'absolute',
            right: '-4rpx',
            top: '-2rpx',
            width: '24rpx',
            height: '62rpx',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-around',
          }}
          onClick={onAction}
          hoverClass="btn-hover"
        >
          {[1, 2, 3].map((dot) => (
            <View key={dot} style={{ width: '6rpx', height: '6rpx', borderRadius: '3rpx', background: '#999999' }} />
          ))}
        </View>
      </View>
      {!withImages && (
        <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 800, lineHeight: '42rpx', marginTop: '24rpx' }}>
          如何在30岁前实现事业与生活的平衡？
        </Text>
      )}
      <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '48rpx', marginTop: withImages ? '26rpx' : '22rpx' }}>
        {item.body}
      </Text>
      {withImages && (
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '26rpx' }}>
          <Image src={personImage} mode="aspectFill" style={{ width: '318rpx', height: '348rpx', borderRadius: '8rpx' }} />
          <Image src={personImage} mode="aspectFill" style={{ width: '318rpx', height: '348rpx', borderRadius: '8rpx' }} />
        </View>
      )}
      {withImages && (
        <Text style={{ display: 'block', color: '#8F8F8F', fontSize: '26rpx', lineHeight: '36rpx', marginTop: '28rpx' }}>
          2小时前活跃
        </Text>
      )}
      {withImages && (
        <View
          style={{
            width: '168rpx',
            height: '48rpx',
            borderRadius: '24rpx',
            background: '#EDF2FA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '22rpx',
          }}
        >
          <Text style={{ color: '#7A7A7A', fontSize: '24rpx', lineHeight: '32rpx' }}>#程序员</Text>
        </View>
      )}
      <View style={{ height: '1rpx', background: '#EDF2FA', marginTop: '32rpx' }} />
      <View style={{ height: '92rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: '42rpx',
            height: '42rpx',
            borderRadius: '21rpx',
            background: '#E3F1FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16rpx',
          }}
        >
          <Text style={{ color: '#2876FF', fontSize: '20rpx', fontWeight: 800 }}>yo</Text>
        </View>
        <Text style={{ color: '#2876FF', fontSize: '26rpx', fontWeight: 700, lineHeight: '36rpx' }}>私信</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: '#999999', fontSize: '26rpx', lineHeight: '36rpx', marginRight: '34rpx' }}>◔ 10</Text>
        <Text style={{ color: item.liked ? '#F05D6A' : '#999999', fontSize: '26rpx', lineHeight: '36rpx' }}>♥ {item.liked ? 11 : 10}</Text>
      </View>
    </View>
  )
}

function ActionSheet({ onClose }: { onClose: () => void }) {
  return (
    <View
      style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.28)', zIndex: 20 }}
      onClick={onClose}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: '32rpx 32rpx 0 0',
          background: '#FFFFFF',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {['分享', '关注', '不看ta动态', '举报'].map((item, index) => (
          <View
            key={item}
            style={{
              height: index === 0 ? '98rpx' : '96rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: index === 3 ? '16rpx solid #F0F4FA' : '1rpx solid #EEF2F8',
              boxSizing: 'border-box',
            }}
            onClick={onClose}
            hoverClass="btn-hover"
          >
            <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>{item}</Text>
          </View>
        ))}
        <View style={{ height: '96rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
          <Text style={{ color: '#999999', fontSize: '28rpx', lineHeight: '40rpx' }}>取消</Text>
        </View>
      </View>
    </View>
  )
}

function VerifyPrompt({ onClose }: { onClose: () => void }) {
  return (
    <View
      style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.34)', zIndex: 20 }}
      onClick={onClose}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '462rpx',
          borderRadius: '32rpx 32rpx 0 0',
          background: '#D9E9FF',
          padding: '78rpx 44rpx 0',
          boxSizing: 'border-box',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '34rpx', fontWeight: 800, lineHeight: '48rpx' }}>
          你还未认证
        </Text>
        <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '40rpx', marginTop: '28rpx' }}>
          完成认证即可给感兴趣的用户评论，发布个人动态
        </Text>
        <View
          style={{
            position: 'absolute',
            left: '44rpx',
            right: '44rpx',
            bottom: '80rpx',
            height: '98rpx',
            borderRadius: '24rpx',
            background: '#2876FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => Taro.navigateTo({ url: '/pages/verification/basic' })}
          hoverClass="btn-hover"
        >
          <Text style={{ color: '#FFFFFF', fontSize: '32rpx', fontWeight: 800 }}>立即认证</Text>
        </View>
      </View>
    </View>
  )
}
