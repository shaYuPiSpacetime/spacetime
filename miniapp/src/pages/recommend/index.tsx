import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import AppTabBar from '@/components/AppTabBar'
import bg from '@/assets/lanhu/recommend/recommend-bg.png'
import avatarImage from '@/assets/lanhu/recommend/slices/avatar-xiaolaohu.png'
import cityNight from '@/assets/lanhu/recommend/slices/city-night.png'
import cityTower from '@/assets/lanhu/recommend/slices/city-tower.png'
import verifyNote from '@/assets/lanhu/recommend/slices/verify-note.png'

type FriendMode = '觅知音' | '悦目' | '诚意贴'

const BLUE = '#2876FF'
const NAVY = '#0C285A'
const MODES: FriendMode[] = ['觅知音', '悦目', '诚意贴']

const PROFILE = {
  name: '筱老虎',
  meta: '26岁·杭州·年薪50W+·985硕士',
}

const QUESTION_TITLE = '如何在30岁前实现事业与生活的平衡？'
const QUESTION_BODY =
  '这个问题困扰着许多的年轻人。实际上，平衡并不是简单的50:50分配时间啊，而是找到适合自己的节奏和生活重心……'
const SINCERITY_BODY =
  '杭州互联网大厂程序员，工作稳定。喜欢打篮球、跑步，保持运动习惯。周末喜欢和朋友聚会或者宅家打游戏。性格偏i但熟了之后可e'

const SINCERITY_ITEMS = [
  { id: 1, imageCount: 2, followed: false },
  { id: 2, imageCount: 1, followed: false },
  { id: 3, imageCount: 3, followed: false },
  { id: 4, imageCount: 4, followed: false },
]

export default function RecommendFriendsPage() {
  const [mode, setMode] = useState<FriendMode>('悦目')
  const [actionOpen, setActionOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)

  return (
    <View style={{ minHeight: '100vh', background: '#F7FBFF', overflow: 'hidden', position: 'relative' }}>
      <Image src={bg} mode="aspectFill" style={{ position: 'fixed', left: '0', top: '0', width: '750rpx', height: '1624rpx' }} />
      <ScrollView scrollY style={{ height: '100vh', position: 'relative', zIndex: 1 }} showScrollbar={false}>
        <FriendTopBar />
        <SegmentTabs active={mode} onChange={setMode} />
        <View style={{ width: '750rpx', padding: '20rpx 25rpx 210rpx', boxSizing: 'border-box' }}>
          {mode === '觅知音' && <KnowledgeFriends />}
          {mode === '悦目' && <JoyFeed onAction={() => setActionOpen(true)} />}
          {mode === '诚意贴' && <SincerityFeed onAction={() => setActionOpen(true)} onVerify={() => setVerifyOpen(true)} />}
        </View>
      </ScrollView>

      {mode === '悦目' && <FloatingPublishButton />}
      {actionOpen && <ActionSheet onClose={() => setActionOpen(false)} />}
      {verifyOpen && <VerifyPrompt onClose={() => setVerifyOpen(false)} />}
      <AppTabBar active="recommend" />
    </View>
  )
}

function FriendTopBar() {
  const handleCommunity = () => {
    Taro.switchTab({ url: '/pages/community/index' })
  }

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
        <Text style={{ color: NAVY, fontSize: '34rpx', fontWeight: 800, lineHeight: '46rpx' }}>朋友</Text>
        <View
          style={{
            position: 'absolute',
            left: '0',
            bottom: '2rpx',
            width: '62rpx',
            height: '6rpx',
            borderRadius: '3rpx',
            background: BLUE,
            boxShadow: '0 8rpx 18rpx rgba(40,118,255,0.28)',
          }}
        />
      </View>
      <View style={{ height: '58rpx' }} onClick={handleCommunity} hoverClass="btn-hover">
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
              width: '233.33rpx',
              height: '88rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => onChange(item)}
            hoverClass="btn-hover"
          >
            <Text
              style={{
                color: isActive ? NAVY : '#7F8494',
                fontSize: isActive ? '30rpx' : '28rpx',
                fontWeight: isActive ? 600 : 400,
                lineHeight: isActive ? '42rpx' : '40rpx',
                textShadow: isActive ? '0 10rpx 16rpx rgba(40,118,255,0.36)' : 'none',
              }}
            >
              {item}
            </Text>
            {isActive && (
              <View
                style={{
                  position: 'absolute',
                  left: '68rpx',
                  bottom: '23rpx',
                  width: '96rpx',
                  height: '6rpx',
                  borderRadius: '3rpx',
                  background: BLUE,
                  boxShadow: '0 10rpx 18rpx rgba(40,118,255,0.35)',
                }}
              />
            )}
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
          background: 'linear-gradient(180deg, #CEE8FF 0%, #2876FF 100%)',
          padding: '45rpx 0 0 55rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '30rpx', fontWeight: 600, lineHeight: '42rpx' }}>
          占位、待待修改
        </Text>
        <Text style={{ display: 'block', color: '#FFFFFF', fontSize: '24rpx', fontWeight: 600, lineHeight: '33rpx', marginTop: '23rpx' }}>
          寻找你的知音好友
        </Text>
      </View>
      <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '33rpx', marginTop: '30rpx' }}>
        发现志同道合的朋友，即刻交流
      </Text>
    </View>
  )
}

function JoyFeed({ onAction }: { onAction: () => void }) {
  return (
    <View>
      <DynamicCard followed={false} liked={false} body={QUESTION_BODY} title={QUESTION_TITLE} onAction={onAction} />
      <DynamicCard followed liked body={QUESTION_BODY} title={QUESTION_TITLE} onAction={onAction} />
    </View>
  )
}

function SincerityFeed({ onAction, onVerify }: { onAction: () => void; onVerify: () => void }) {
  return (
    <View>
      {SINCERITY_ITEMS.map((item) => (
        <DynamicCard
          key={item.id}
          followed={item.followed}
          liked={false}
          body={SINCERITY_BODY}
          imageCount={item.imageCount}
          onAction={onAction}
        />
      ))}
      <View
        style={{
          width: '700rpx',
          height: '92rpx',
          borderRadius: '46rpx',
          background: BLUE,
          marginTop: '2rpx',
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
  followed,
  liked,
  body,
  title,
  imageCount = 0,
  onAction,
}: {
  followed: boolean
  liked: boolean
  body: string
  title?: string
  imageCount?: number
  onAction: () => void
}) {
  const hasImages = imageCount > 0

  return (
    <View
      style={{
        width: '700rpx',
        borderRadius: '18rpx',
        background: '#FFFFFF',
        padding: '33rpx 26rpx 0',
        boxSizing: 'border-box',
        marginBottom: '20rpx',
        overflow: 'hidden',
      }}
    >
      <ProfileHeader followed={followed} onAction={onAction} />
      {title && (
        <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 600, lineHeight: '40rpx', marginTop: '29rpx' }}>
          {title}
        </Text>
      )}
      <Text
        style={{
          display: 'block',
          color: '#333333',
          fontSize: '26rpx',
          lineHeight: '48rpx',
          marginTop: title ? '12rpx' : '27rpx',
        }}
      >
        {body}
      </Text>
      {hasImages && <ImageGrid count={imageCount} />}
      {hasImages && (
        <>
          <Text style={{ display: 'block', color: '#999999', fontSize: '26rpx', lineHeight: '37rpx', marginTop: '28rpx', marginLeft: '7rpx' }}>
            2小时前活跃
          </Text>
          <View
            style={{
              width: '168rpx',
              height: '48rpx',
              borderRadius: '24rpx',
              background: '#EFF4FC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '23rpx',
              marginLeft: '7rpx',
            }}
          >
            <Text style={{ color: '#666666', fontSize: '26rpx', lineHeight: '37rpx' }}>#程序员</Text>
          </View>
        </>
      )}
      <View style={{ height: '2rpx', background: '#EFF4FC', marginTop: hasImages ? '30rpx' : '32rpx' }} />
      <CardActions liked={liked} />
    </View>
  )
}

function ProfileHeader({ followed, onAction }: { followed: boolean; onAction: () => void }) {
  return (
    <View style={{ position: 'relative', height: '80rpx', paddingLeft: '100rpx', boxSizing: 'border-box' }}>
      <Image
        src={avatarImage}
        mode="aspectFill"
        style={{ position: 'absolute', left: '0', top: '0', width: '80rpx', height: '80rpx', borderRadius: '40rpx' }}
      />
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', height: '38rpx' }}>
        <Text style={{ color: '#333333', fontSize: '26rpx', fontWeight: 500, lineHeight: '37rpx' }}>{PROFILE.name}</Text>
        <Text style={{ color: '#FF7078', fontSize: '30rpx', lineHeight: '37rpx', marginLeft: '14rpx' }}>♀</Text>
      </View>
      <Text style={{ display: 'block', color: BLUE, fontSize: '24rpx', lineHeight: '33rpx', marginTop: '9rpx' }}>{PROFILE.meta}</Text>
      <View
        style={{
          position: 'absolute',
          right: '26rpx',
          top: '0',
          width: followed ? '128rpx' : '118rpx',
          height: '48rpx',
          borderRadius: '24rpx',
          border: followed ? '1rpx solid #999999' : `1rpx solid ${BLUE}`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: followed ? '#999999' : BLUE, fontSize: '24rpx', fontWeight: followed ? 400 : 500, lineHeight: '33rpx' }}>
          {followed ? '已关注' : '关注'}
        </Text>
      </View>
      <DotMenu onClick={onAction} />
    </View>
  )
}

function DotMenu({ onClick }: { onClick: () => void }) {
  return (
    <View
      style={{
        position: 'absolute',
        right: '-10rpx',
        top: '0',
        width: '30rpx',
        height: '52rpx',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8rpx 0',
        boxSizing: 'border-box',
      }}
      onClick={onClick}
      hoverClass="btn-hover"
    >
      {[1, 2, 3].map((dot) => (
        <View key={dot} style={{ width: '6rpx', height: '6rpx', borderRadius: '3rpx', background: '#999999' }} />
      ))}
    </View>
  )
}

function ImageGrid({ count }: { count: number }) {
  const images = Array.from({ length: count }, (_, index) => (index % 2 === 0 ? cityTower : cityNight))
  const useTwoColumn = count <= 2 || count === 4
  const imageWidth = useTwoColumn ? '318rpx' : '206rpx'
  const imageHeight = useTwoColumn ? '348rpx' : '226rpx'
  const imageSpace = useTwoColumn ? '12rpx' : '10rpx'

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: '28rpx',
      }}
    >
      {images.map((item, index) => (
        <Image
          key={`${count}-${index}`}
          src={item}
          mode="aspectFill"
          style={{
            width: imageWidth,
            height: imageHeight,
            borderRadius: '8rpx',
            background: '#EDF2FA',
            marginRight: (index + 1) % (useTwoColumn ? 2 : 3) === 0 ? '0' : imageSpace,
            marginBottom: index >= images.length - (useTwoColumn ? 2 : 3) ? '0' : imageSpace,
          }}
        />
      ))}
    </View>
  )
}

function CardActions({ liked }: { liked: boolean }) {
  return (
    <View style={{ height: '92rpx', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: '52rpx',
          height: '52rpx',
          borderRadius: '26rpx',
          background: '#E3F1FE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '10rpx',
        }}
      >
        <View
          style={{
            width: '36rpx',
            height: '36rpx',
            borderRadius: '18rpx',
            background: '#4E8EFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '22rpx', lineHeight: '30rpx' }}>✉</Text>
        </View>
      </View>
      <Text style={{ color: '#4E8EFF', fontSize: '26rpx', fontWeight: 500, lineHeight: '37rpx' }}>私信</Text>
      <View style={{ flex: 1 }} />
      <Text style={{ color: '#999999', fontSize: '26rpx', lineHeight: '37rpx', marginRight: '68rpx' }}>○ 10</Text>
      <Text style={{ color: liked ? '#D95D68' : '#999999', fontSize: '26rpx', lineHeight: '37rpx' }}>♡ {liked ? 11 : 10}</Text>
    </View>
  )
}

function FloatingPublishButton() {
  return (
    <View
      style={{
        position: 'fixed',
        right: '30rpx',
        bottom: '174rpx',
        width: '128rpx',
        height: '128rpx',
        borderRadius: '64rpx',
        background: BLUE,
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
  )
}

function ActionSheet({ onClose }: { onClose: () => void }) {
  const items = ['关注', '不看ta动态', '举报']

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
          overflow: 'hidden',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <View
          style={{
            height: '98rpx',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '2rpx solid #EFF4FC',
          }}
          onClick={onClose}
          hoverClass="btn-hover"
        >
          <View
            style={{
              width: '48rpx',
              height: '48rpx',
              borderRadius: '24rpx',
              background: '#25C44A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '28rpx',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '24rpx', fontWeight: 700, lineHeight: '32rpx' }}>微</Text>
          </View>
          <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>分享</Text>
        </View>
        {items.map((item, index) => (
          <View
            key={item}
            style={{
              height: '96rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: index === items.length - 1 ? '16rpx solid #F0F4FA' : '2rpx solid #EFF4FC',
              boxSizing: 'border-box',
            }}
            onClick={onClose}
            hoverClass="btn-hover"
          >
            <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>{item}</Text>
          </View>
        ))}
        <View style={{ height: '96rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose} hoverClass="btn-hover">
          <Text style={{ color: '#999999', fontSize: '28rpx', lineHeight: '40rpx' }}>取消</Text>
        </View>
      </View>
    </View>
  )
}

function VerifyPrompt({ onClose }: { onClose: () => void }) {
  const handleVerify = () => {
    Taro.navigateTo({ url: '/pages/verification/basic' })
  }

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
          height: '488rpx',
          borderRadius: '32rpx 32rpx 0 0',
          background: 'linear-gradient(180deg, #D9E8FF 0%, #FFFFFF 100%)',
          padding: '86rpx 42rpx 0 44rpx',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={verifyNote}
          mode="aspectFit"
          style={{ position: 'absolute', right: '84rpx', top: '-56rpx', width: '190rpx', height: '190rpx' }}
        />
        <Text style={{ display: 'block', color: NAVY, fontSize: '38rpx', fontWeight: 600, lineHeight: '53rpx' }}>你还未认证</Text>
        <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '48rpx', marginTop: '20rpx' }}>
          完成认证即可给感兴趣的用户评论，发布个人动态
        </Text>
        <View
          style={{
            position: 'absolute',
            left: '44rpx',
            right: '42rpx',
            bottom: '96rpx',
            height: '98rpx',
            borderRadius: '20rpx',
            background: BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={handleVerify}
          hoverClass="btn-hover"
        >
          <Text style={{ color: '#FFFFFF', fontSize: '36rpx', fontWeight: 500, lineHeight: '50rpx' }}>立即认证</Text>
        </View>
      </View>
    </View>
  )
}
