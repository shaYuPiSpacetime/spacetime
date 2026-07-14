import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import ProfilePreviewTopNav from '@/components/ProfilePreviewTopNav'
import { miniappOssIcons } from '@/constants/ossIcons'
import { getDemoPageData } from '@/services/lanhuDemo'

type ProfilePreviewPageProps = {
  nickname: string
  onBack: () => void
  onEdit: () => void
}

type ProfilePreviewCardProps = {
  title: string
  titleBubbleLeft?: string
  height: string
  padding: string
  children: ReactNode
}

const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'
const fontFamily =
  '"PingFang SC", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
const mainBlue = '#2876FF'
const profileDemo = getDemoPageData('profile') as {
  preview: {
    chips: string[]
  }
}
const previewTagStyles = [
  { color: '#4CAF51', background: '#EBF5EA', padding: '8rpx 24rpx 7rpx 26rpx' },
  { color: '#3D9FF5', background: '#E7F2FE', padding: '8rpx 27rpx 7rpx 26rpx' },
  { color: '#FF9A0F', background: '#FFF3E6', padding: '8rpx 29rpx 7rpx 25rpx' },
  { color: '#9F2CB2', background: '#F4E6F6', padding: '8rpx 28rpx 7rpx 26rpx' },
]
const previewTagWidths = ['122rpx', '176rpx', '151rpx', '151rpx']
const certificationItems = [
  { label: '头像', icon: miniappOssIcons.profilePreviewCertAvatar },
  { label: '实名', icon: miniappOssIcons.profilePreviewCertRealname },
  { label: '学历', icon: miniappOssIcons.profilePreviewCertEducation },
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
            <ProfilePreviewPhoto />
            <ProfilePreviewCertification />
            <ProfilePreviewPhoto />
            <ProfilePreviewSong />
            <ProfilePreviewPhoto />
            <ProfilePreviewMbti />
            <ProfilePreviewPhoto />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function ProfilePreviewHero({ nickname, onShare }: { nickname: string; onShare: () => void }) {
  return (
    <View style={{ position: 'relative', width: '700rpx', height: '828rpx' }}>
      <View
        style={{
          position: 'absolute',
          inset: '0',
          overflow: 'hidden',
          borderRadius: '32rpx',
          background: '#D8E7E6',
        }}
      >
        <Image
          src={miniappOssIcons.profilePreviewHero}
          mode="scaleToFill"
          style={{ width: '700rpx', height: '828rpx' }}
        />
      </View>

      <Image
        src={miniappOssIcons.profilePreviewShare}
        mode="scaleToFill"
        onClick={onShare}
        style={{
          position: 'absolute',
          right: '30rpx',
          top: '28rpx',
          width: '48rpx',
          height: '48rpx',
          borderRadius: '24rpx',
        }}
      />

      <Image
        src={miniappOssIcons.profilePreviewAvatar}
        mode="scaleToFill"
        style={{
          position: 'absolute',
          zIndex: 3,
          left: '30rpx',
          bottom: '57rpx',
          width: '188rpx',
          height: '188rpx',
          borderRadius: '94rpx',
          background: '#FFFFFF',
        }}
      />

      <View
        style={{
          position: 'absolute',
          zIndex: 2,
          left: '208rpx',
          bottom: '101rpx',
          width: '380rpx',
        }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: '38rpx',
              lineHeight: '53rpx',
              fontWeight: 500,
              textShadow: '0 3rpx 4rpx rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
            }}
          >
            {nickname}
          </Text>
          <View
            style={{
              width: '168rpx',
              height: '48rpx',
              borderRadius: '24rpx',
              background: '#E3F1FE',
              marginLeft: '10rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <Image
              src={miniappOssIcons.profileCertification}
              mode="aspectFit"
              style={{ width: '30rpx', height: '30rpx', marginRight: '8rpx' }}
            />
            <Text style={{ color: '#5D89DD', fontSize: '20rpx', lineHeight: '28rpx', fontWeight: 500 }}>
              三重认证
            </Text>
          </View>
        </View>
        <View
          style={{
            width: '148rpx',
            height: '48rpx',
            borderRadius: '24rpx',
            background: 'rgba(0,0,0,0.2)',
            marginTop: '10rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <Text style={{ color: '#FE918E', fontSize: '27rpx', lineHeight: '28rpx', marginRight: '10rpx' }}>♥</Text>
          <Text style={{ color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx', fontWeight: 500 }}>
            佛系交友
          </Text>
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
        height: '198rpx',
        marginTop: '-105rpx',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding: '60rpx 30rpx 41rpx 27rpx',
        boxSizing: 'border-box',
      }}
    >
      <ProfilePreviewInfoLine
        icon={miniappOssIcons.profilePreviewGender}
        iconWidth="24rpx"
        iconHeight="34rpx"
        text="女丨97年丨163cm丨双鱼座"
      />
      <ProfilePreviewInfoLine
        icon={miniappOssIcons.profilePreviewLocation}
        iconWidth="34rpx"
        iconHeight="34rpx"
        text="现居浙江杭州丨河南人"
        marginTop="23rpx"
      />
    </View>
  )
}

function ProfilePreviewInfoLine({
  icon,
  iconWidth,
  iconHeight,
  text,
  marginTop = '0',
}: {
  icon: string
  iconWidth: string
  iconHeight: string
  text: string
  marginTop?: string
}) {
  return (
    <View style={{ height: '37rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop }}>
      <View
        style={{
          width: '48rpx',
          height: '37rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image src={icon} mode="scaleToFill" style={{ width: iconWidth, height: iconHeight }} />
      </View>
      <Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 400 }}>
        {text}
      </Text>
    </View>
  )
}

function ProfilePreviewTagSection() {
  return (
    <ProfilePreviewCard title="我的标签" height="182rpx" padding="30rpx 40rpx 40rpx 29rpx">
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '20rpx' }}>
        {profileDemo.preview.chips.map((label, index) => {
          const tag = previewTagStyles[index % previewTagStyles.length]
          return (
            <View
              key={label}
              style={{
                height: '48rpx',
                width: previewTagWidths[index],
                borderRadius: '29rpx',
                background: tag.background,
                padding: tag.padding,
                marginLeft: index === 0 ? '0' : index === 1 ? '10rpx' : index === 2 ? '11rpx' : '9rpx',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: tag.color, fontSize: '24rpx', lineHeight: '33rpx', fontWeight: 400 }}>
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
    <ProfilePreviewCard title="自我介绍" height="238rpx" padding="30rpx 38rpx 40rpx 30rpx">
      <Text
        style={{
          display: 'block',
          width: '620rpx',
          height: '104rpx',
          color: '#333333',
          fontSize: '26rpx',
          lineHeight: '52rpx',
          fontWeight: 400,
          textAlign: 'justify',
          textIndent: '54rpx',
          marginTop: '20rpx',
          marginLeft: '12rpx',
        }}
      >
        {'白天是程序员，晚上是‘深夜电台’主播（自封的\n～）你也爱分享书影音，或者想交换歌单随时戳我！'}
      </Text>
    </ProfilePreviewCard>
  )
}

function ProfilePreviewPhoto() {
  return (
    <View
      style={{
        width: '700rpx',
        height: '880rpx',
        marginTop: '20rpx',
        borderRadius: '32rpx',
        overflow: 'hidden',
        background: '#F4F4F2',
      }}
    >
      <Image
        src={miniappOssIcons.profilePreviewPhoto}
        mode="aspectFill"
        style={{ display: 'block', width: '700rpx', height: '896rpx', marginBottom: '-16rpx' }}
      />
    </View>
  )
}

function ProfilePreviewCertification() {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '220rpx',
        marginTop: '20rpx',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding: '30rpx 0 0 28rpx',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <ProfilePreviewTitle title="我的认证" bubbleLeft="94rpx" />
      <View style={{ display: 'flex', flexDirection: 'row', marginTop: '26rpx' }}>
        {certificationItems.map((item, index) => (
          <View
            key={item.label}
            style={{
              width: '148rpx',
              height: '58rpx',
              borderRadius: '31rpx',
              background: 'linear-gradient(135deg, #6D96FB 0%, #387DFE 100%)',
              marginLeft: index === 0 ? '0' : '10rpx',
              padding: '0 25rpx 0 8rpx',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Image src={item.icon} mode="aspectFit" style={{ width: '42rpx', height: '42rpx' }} />
            <Text style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 400 }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={{
          position: 'absolute',
          right: '0',
          top: '0',
          width: '185rpx',
          height: '198rpx',
          background: 'linear-gradient(180deg, rgba(40,118,255,0.10) 0%, rgba(255,255,255,0.3) 100%)',
          clipPath: 'polygon(50% 0, 65% 12%, 100% 16%, 100% 55%, 86% 78%, 50% 100%, 14% 78%, 0 55%, 0 16%, 35% 12%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '39rpx' }}>
          <View
            style={{
              width: '22rpx',
              height: '22rpx',
              borderRadius: '11rpx',
              border: '2rpx solid #999999',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#999999', fontSize: '16rpx', lineHeight: '18rpx' }}>?</Text>
          </View>
          <Text style={{ color: mainBlue, fontSize: '22rpx', lineHeight: '30rpx', marginLeft: '8rpx' }}>
            可信度
          </Text>
        </View>
        <Text style={{ color: mainBlue, fontSize: '48rpx', lineHeight: '67rpx', fontWeight: 600, marginTop: '-3rpx' }}>
          92%
        </Text>
      </View>
    </View>
  )
}

function ProfilePreviewSong() {
  return (
    <ProfilePreviewCard
      title="我最爱听的歌曲"
      titleBubbleLeft="181rpx"
      height="248rpx"
      padding="30rpx 28rpx 56rpx"
    >
      <View
        style={{
          width: '560rpx',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: '30rpx',
          marginLeft: '13rpx',
        }}
      >
        <Image
          src={miniappOssIcons.profilePreviewSong}
          mode="scaleToFill"
          style={{ width: '98rpx', height: '98rpx', borderRadius: '49rpx' }}
        />
        <View style={{ marginLeft: '11rpx' }}>
          <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 500 }}>
            告白气球丨周杰伦
          </Text>
          <Text
            style={{
              display: 'block',
              color: '#333333',
              fontSize: '22rpx',
              lineHeight: '30rpx',
              fontWeight: 400,
              marginTop: '10rpx',
              whiteSpace: 'nowrap',
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
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '635rpx',
        marginTop: '20rpx',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <View style={{ position: 'absolute', left: '29rpx', top: '30rpx' }}>
        <ProfilePreviewTitle title="MBTI类型" bubbleLeft="107rpx" />
      </View>
      <View
        style={{
          position: 'absolute',
          right: '26rpx',
          top: '38rpx',
          height: '33rpx',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#999999', fontSize: '24rpx', lineHeight: '33rpx' }}>添加</Text>
        <View
          style={{
            width: '16rpx',
            height: '16rpx',
            borderTop: '3rpx solid #999999',
            borderRight: '3rpx solid #999999',
            transform: 'rotate(45deg)',
            marginLeft: '8rpx',
          }}
        />
      </View>

      <View style={{ position: 'absolute', left: '132rpx', top: '168rpx', width: '98rpx', height: '98rpx', borderRadius: '49rpx', background: 'linear-gradient(230deg, #ECEFFF 0%, #F1F3FF 100%)' }} />
      <View style={{ position: 'absolute', right: '132rpx', top: '217rpx', width: '58rpx', height: '58rpx', borderRadius: '29rpx', background: 'linear-gradient(230deg, #FFE9D5 0%, #FEF4EA 100%)' }} />
      <View style={{ position: 'absolute', left: '135rpx', top: '382rpx', width: '16rpx', height: '16rpx', borderRadius: '8rpx', background: 'linear-gradient(138deg, #FFEAE5 0%, #FFF5F3 100%)' }} />
      <View style={{ position: 'absolute', right: '152rpx', top: '398rpx', width: '20rpx', height: '20rpx', borderRadius: '10rpx', background: 'linear-gradient(138deg, #D0E1FF 0%, #F3F8FF 100%)' }} />
      <View style={{ position: 'absolute', left: '90rpx', top: '436rpx', width: '140rpx', height: '140rpx', borderRadius: '70rpx', background: 'linear-gradient(138deg, #CEF6ED 0%, #F1FAF7 100%)' }} />
      <View style={{ position: 'absolute', right: '84rpx', top: '461rpx', width: '112rpx', height: '112rpx', borderRadius: '56rpx', background: 'linear-gradient(138deg, #FFEAE5 0%, #FFF5F3 100%)' }} />

      <View
        style={{
          position: 'absolute',
          left: '217rpx',
          top: '211rpx',
          width: '266rpx',
          height: '266rpx',
          borderRadius: '133rpx',
          background: 'linear-gradient(180deg, #CBDEFF 0%, #F6FAFF 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#488AFE', fontSize: '24rpx', lineHeight: '33rpx', fontWeight: 400 }}>
          MBTI类型
        </Text>
        <Text style={{ color: mainBlue, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600, marginTop: '12rpx' }}>
          ENFJ 主人公
        </Text>
      </View>
    </View>
  )
}

function ProfilePreviewCard({
  title,
  titleBubbleLeft = '94rpx',
  height,
  padding,
  children,
}: ProfilePreviewCardProps) {
  return (
    <View
      style={{
        width: '700rpx',
        height,
        marginTop: '20rpx',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding,
        boxSizing: 'border-box',
      }}
    >
      <ProfilePreviewTitle title={title} bubbleLeft={titleBubbleLeft} />
      {children}
    </View>
  )
}

function ProfilePreviewTitle({ title, bubbleLeft }: { title: string; bubbleLeft: string }) {
  return (
    <View style={{ position: 'relative', height: '44rpx' }}>
      <View
        style={{
          position: 'absolute',
          left: bubbleLeft,
          top: '0',
          width: '30rpx',
          height: '30rpx',
          borderRadius: '15rpx',
          background: '#E3F1FE',
        }}
      />
      <Text
        style={{
          position: 'relative',
          top: '4rpx',
          color: '#333333',
          fontSize: '28rpx',
          lineHeight: '40rpx',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </Text>
    </View>
  )
}
