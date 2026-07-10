import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import ProfilePreviewTopNav from '@/components/ProfilePreviewTopNav'
import editHeroPhoto from '@/assets/lanhu/profile/edit-hero-photo.jpg'
import { getDemoPageData } from '@/services/lanhuDemo'

type ProfilePreviewPageProps = {
  nickname: string
  onBack: () => void
  onEdit: () => void
}

const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'
const fontFamily =
  '"PingFang SC", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
const mainBlue = '#2876FF'
const cardShadow = '0 18rpx 48rpx rgba(25, 54, 98, 0.06)'
const profileDemo = getDemoPageData('profile') as {
  preview: {
    chips: string[]
  }
}
const previewTagColors = [
  { color: '#63B783', background: '#ECF8F0' },
  { color: '#5F94D9', background: '#EAF3FF' },
  { color: '#D99D52', background: '#FFF4E6' },
  { color: '#B86FC0', background: '#F9EDFB' },
]

export default function ProfilePreviewPage({ nickname, onBack, onEdit }: ProfilePreviewPageProps) {
  const showShare = () => {
    void Taro.showShareMenu({ withShareTicket: true }).catch(() => {
      Taro.showToast({ title: '请使用右上角分享', icon: 'none' })
    })
  }

  return (
    <View style={{ height: '100vh', background: pageBackground, overflow: 'hidden', fontFamily }}>
      <ScrollView scrollY style={{ height: '100vh', width: '750rpx' }} showScrollbar={false}>
        <View
          style={{
            width: '750rpx',
            minHeight: '6803rpx',
            paddingBottom: '96rpx',
            boxSizing: 'border-box',
          }}
        >
          <ProfilePreviewTopNav
            activeTab="preview"
            onBack={onBack}
            onTabChange={tab => {
              if (tab === 'form') onEdit()
            }}
          />
          <View style={{ width: '700rpx', margin: '0 auto' }}>
            <ProfilePreviewHero nickname={nickname} onShare={showShare} />
            <ProfilePreviewBasicInfo />
            <ProfilePreviewTagSection />
            <ProfilePreviewIntroduction />
            <ProfilePreviewPhoto label="生活中的样子" />
            <ProfilePreviewCertification />
            <ProfilePreviewPhoto label="旅行中的样子" />
            <ProfilePreviewSong />
            <ProfilePreviewPhoto label="更多精彩瞬间" />
            <ProfilePreviewMbti />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function ProfilePreviewHero({ nickname, onShare }: { nickname: string; onShare: () => void }) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '920rpx',
        overflow: 'hidden',
        borderRadius: '24rpx',
        background: '#D8E7E6',
        boxShadow: cardShadow,
      }}
    >
      <Image src={editHeroPhoto} mode="aspectFill" style={{ width: '700rpx', height: '920rpx' }} />
      <View
        style={{
          position: 'absolute',
          left: '0',
          right: '0',
          bottom: '0',
          height: '336rpx',
          background: 'linear-gradient(180deg, rgba(10,24,44,0) 0%, rgba(10,24,44,0.7) 100%)',
        }}
      />
      <View
        onClick={onShare}
        style={{
          position: 'absolute',
          right: '20rpx',
          top: '20rpx',
          width: '72rpx',
          height: '72rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'relative',
            width: '54rpx',
            height: '54rpx',
            borderRadius: '54rpx',
            background: 'rgba(10, 24, 44, 0.64)',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: '17rpx',
              top: '16rpx',
              width: '19rpx',
              height: '19rpx',
              borderTop: '5rpx solid #FFFFFF',
              borderRight: '5rpx solid #FFFFFF',
              transform: 'rotate(45deg)',
              boxSizing: 'border-box',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '17rpx',
              top: '29rpx',
              width: '24rpx',
              height: '5rpx',
              borderRadius: '5rpx',
              background: '#FFFFFF',
              transform: 'rotate(-45deg)',
            }}
          />
        </View>
      </View>
      <View
        style={{
          position: 'absolute',
          left: '32rpx',
          bottom: '54rpx',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
        }}
      >
        <Image
          src={editHeroPhoto}
          mode="aspectFill"
          style={{
            width: '148rpx',
            height: '148rpx',
            borderRadius: '148rpx',
            border: '8rpx solid #FFFFFF',
            background: '#FFFFFF',
            boxSizing: 'border-box',
            marginRight: '22rpx',
          }}
        />
        <View style={{ paddingBottom: '8rpx' }}>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{ color: '#FFFFFF', fontSize: '36rpx', lineHeight: '50rpx', fontWeight: 700 }}
            >
              {nickname}
            </Text>
            <View
              style={{
                height: '46rpx',
                borderRadius: '46rpx',
                background: 'rgba(238, 246, 255, 0.94)',
                padding: '0 18rpx',
                marginLeft: '14rpx',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: '18rpx',
                  height: '18rpx',
                  borderRadius: '18rpx',
                  background: mainBlue,
                  marginRight: '8rpx',
                }}
              />
              <Text
                style={{
                  color: '#5D89DD',
                  fontSize: '20rpx',
                  lineHeight: '28rpx',
                  fontWeight: 600,
                }}
              >
                三重认证
              </Text>
            </View>
          </View>
          <View
            style={{
              height: '48rpx',
              borderRadius: '98rpx',
              background: 'rgba(29, 43, 59, 0.48)',
              padding: '0 20rpx',
              marginTop: '12rpx',
              display: 'flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
            }}
          >
            <View
              style={{
                width: '14rpx',
                height: '14rpx',
                borderRadius: '14rpx',
                background: '#FF97A2',
                marginRight: '10rpx',
              }}
            />
            <Text style={{ color: '#FFFFFF', fontSize: '22rpx', lineHeight: '31rpx' }}>
              佛系交友
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function ProfilePreviewBasicInfo() {
  return (
    <View
      style={{
        position: 'relative',
        zIndex: 1,
        width: '700rpx',
        minHeight: '248rpx',
        marginTop: '-48rpx',
        borderRadius: '28rpx',
        background: '#FFFFFF',
        padding: '48rpx 30rpx 32rpx',
        boxSizing: 'border-box',
        boxShadow: cardShadow,
      }}
    >
      <ProfilePreviewInfoLine
        marker="♀"
        markerColor="#FF8B94"
        text="女丨97年丨163cm/45kg丨双鱼座"
      />
      <ProfilePreviewInfoLine
        marker="⌾"
        markerColor="#72B3F9"
        text="现居浙江杭州丨河南人"
        marginTop="26rpx"
      />
    </View>
  )
}

function ProfilePreviewInfoLine({
  marker,
  markerColor,
  text,
  marginTop = '0',
}: {
  marker: string
  markerColor: string
  text: string
  marginTop?: string
}) {
  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop }}>
      <Text
        style={{
          width: '38rpx',
          color: markerColor,
          fontSize: '34rpx',
          lineHeight: '40rpx',
          fontWeight: 600,
        }}
      >
        {marker}
      </Text>
      <Text
        style={{ color: '#333333', fontSize: '30rpx', lineHeight: '42rpx', marginLeft: '12rpx' }}
      >
        {text}
      </Text>
    </View>
  )
}

function ProfilePreviewTagSection() {
  return (
    <ProfilePreviewCard title="我的标签" marginTop="22rpx" padding="30rpx 28rpx 26rpx">
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '24rpx' }}>
        {profileDemo.preview.chips.map((label, index) => {
          const tag = previewTagColors[index % previewTagColors.length]
          return (
            <View
              key={label}
              style={{
                height: '52rpx',
                borderRadius: '52rpx',
                background: tag.background,
                padding: '0 20rpx',
                marginRight: '12rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: tag.color,
                  fontSize: '22rpx',
                  lineHeight: '31rpx',
                  fontWeight: 600,
                }}
              >
                {label}
              </Text>
            </View>
          )
        })}
      </View>
    </ProfilePreviewCard>
  )
}

function ProfilePreviewIntroduction() {
  return (
    <ProfilePreviewCard title="自我介绍" marginTop="22rpx" padding="34rpx 30rpx 38rpx">
      <Text
        style={{
          display: 'block',
          color: '#333333',
          fontSize: '30rpx',
          lineHeight: '52rpx',
          marginTop: '26rpx',
        }}
      >
        白天是程序员，晚上是“深夜电台”主播（自封的～）你也爱分享书影音，或者想交换歌单随时戳我！
      </Text>
    </ProfilePreviewCard>
  )
}

function ProfilePreviewPhoto({ label }: { label: string }) {
  return (
    <View
      style={{
        width: '700rpx',
        height: '700rpx',
        marginTop: '22rpx',
        borderRadius: '24rpx',
        background: '#D8E7E6',
        overflow: 'hidden',
        boxShadow: cardShadow,
      }}
    >
      <Image src={editHeroPhoto} mode="aspectFill" style={{ width: '700rpx', height: '700rpx' }} />
      <Text
        style={{
          position: 'absolute',
          left: '26rpx',
          bottom: '22rpx',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '22rpx',
          lineHeight: '31rpx',
        }}
      >
        {label}
      </Text>
    </View>
  )
}

function ProfilePreviewCertification() {
  const items = ['头像', '实名', '学历']
  return (
    <ProfilePreviewCard title="我的认证" marginTop="22rpx" padding="32rpx 28rpx">
      <View
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '26rpx' }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
          {items.map(item => (
            <View
              key={item}
              style={{
                height: '54rpx',
                borderRadius: '54rpx',
                background: mainBlue,
                padding: '0 18rpx',
                marginRight: '10rpx',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: '18rpx',
                  height: '18rpx',
                  borderRadius: '18rpx',
                  background: '#DCEBFF',
                  marginRight: '8rpx',
                }}
              />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: '22rpx',
                  lineHeight: '31rpx',
                  fontWeight: 600,
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
        <View
          style={{
            width: '116rpx',
            height: '108rpx',
            borderRadius: '18rpx',
            background: '#EEF5FF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#7895BB', fontSize: '18rpx', lineHeight: '26rpx' }}>可信度</Text>
          <Text
            style={{
              color: mainBlue,
              fontSize: '42rpx',
              lineHeight: '50rpx',
              fontWeight: 800,
              marginTop: '4rpx',
            }}
          >
            92%
          </Text>
        </View>
      </View>
    </ProfilePreviewCard>
  )
}

function ProfilePreviewSong() {
  return (
    <ProfilePreviewCard title="我最爱听的歌曲" marginTop="22rpx" padding="32rpx 28rpx">
      <View
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '26rpx' }}
      >
        <View
          style={{
            width: '84rpx',
            height: '84rpx',
            borderRadius: '84rpx',
            background: mainBlue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '42rpx', lineHeight: '46rpx' }}>♪</Text>
        </View>
        <View style={{ marginLeft: '22rpx' }}>
          <Text
            style={{
              display: 'block',
              color: '#333333',
              fontSize: '30rpx',
              lineHeight: '42rpx',
              fontWeight: 600,
            }}
          >
            告白气球丨周杰伦
          </Text>
          <Text
            style={{
              display: 'block',
              color: '#697E9C',
              fontSize: '22rpx',
              lineHeight: '31rpx',
              marginTop: '8rpx',
            }}
          >
            分享你的音乐灵魂，遇见相同频率的人
          </Text>
        </View>
      </View>
    </ProfilePreviewCard>
  )
}

function ProfilePreviewMbti() {
  return (
    <ProfilePreviewCard title="MBTI类型" marginTop="22rpx" padding="32rpx 28rpx 40rpx">
      <View style={{ position: 'relative', height: '470rpx', marginTop: '12rpx' }}>
        <View
          style={{
            position: 'absolute',
            left: '82rpx',
            top: '62rpx',
            width: '86rpx',
            height: '86rpx',
            borderRadius: '86rpx',
            background: '#EEF0FF',
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: '74rpx',
            top: '88rpx',
            width: '62rpx',
            height: '62rpx',
            borderRadius: '62rpx',
            background: '#FFF0DD',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '74rpx',
            bottom: '38rpx',
            width: '132rpx',
            height: '132rpx',
            borderRadius: '132rpx',
            background: '#DCF8F2',
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: '74rpx',
            bottom: '42rpx',
            width: '116rpx',
            height: '116rpx',
            borderRadius: '116rpx',
            background: '#FFF0EE',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '50%',
            top: '58rpx',
            width: '280rpx',
            height: '280rpx',
            marginLeft: '-140rpx',
            borderRadius: '280rpx',
            background: '#DDEAFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#5F94D9', fontSize: '26rpx', lineHeight: '37rpx' }}>MBTI类型</Text>
          <Text
            style={{
              color: mainBlue,
              fontSize: '34rpx',
              lineHeight: '48rpx',
              fontWeight: 700,
              marginTop: '16rpx',
            }}
          >
            ENFJ 主人公
          </Text>
        </View>
      </View>
    </ProfilePreviewCard>
  )
}

function ProfilePreviewCard({
  title,
  marginTop,
  padding,
  children,
}: {
  title: string
  marginTop: string
  padding: string
  children: ReactNode
}) {
  return (
    <View
      style={{
        width: '700rpx',
        marginTop,
        borderRadius: '24rpx',
        background: '#FFFFFF',
        padding,
        boxSizing: 'border-box',
        boxShadow: cardShadow,
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: '#333333', fontSize: '34rpx', lineHeight: '48rpx', fontWeight: 700 }}>
          {title}
        </Text>
        <View
          style={{
            width: '14rpx',
            height: '14rpx',
            borderRadius: '14rpx',
            background: '#E4F2FF',
            marginLeft: '6rpx',
          }}
        />
      </View>
      {children}
    </View>
  )
}
