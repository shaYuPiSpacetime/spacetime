import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'

import profileBg from '@/assets/profile/profile-bg.webp'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import cardCoin from '@/assets/profile/card-coin.webp'
import cardInvite from '@/assets/profile/card-invite.webp'
import boostButton from '@/assets/profile/boost-button.png'
import vipBanner from '@/assets/profile/vip-banner.webp'
import iconPost from '@/assets/profile/icon-post.png'
import iconService from '@/assets/profile/icon-service.png'
import iconSettings from '@/assets/profile/icon-settings.png'
import iconCert from '@/assets/profile/icon-cert.png'

const PROFILE_STATS = [
  { value: 3, label: '我喜欢的' },
  { value: 55, label: '喜欢我的' },
  { value: 55, label: '最近来访' },
]

/**
 * 我的 — 蓝湖「我的」未开通状态自绘还原。
 */
export default function ProfilePage() {
  const {
    data,
    fetch,
    goToEditProfile,
    goToVip,
    goToCoin,
    goToInvite,
    goToMyPosts,
    goToHelp,
    goToSettings,
  } = useProfile()

  useEffect(() => {
    fetch()
  }, [fetch])

  const nickname = data.nickname || '筱脑虎'
  const sourceAvatar = data.avatarUrl?.trim() || defaultAvatar
  const [avatar, setAvatar] = useState(defaultAvatar)
  const location = data.location || '杭州市'
  const ageText = data.age != null ? `${data.age}岁` : '28岁'
  const zodiac = data.zodiac || '双鱼座'
  const subInfo = `${location}丨${ageText}丨${zodiac}`

  useEffect(() => {
    setAvatar(sourceAvatar)
  }, [sourceAvatar])

  return (
    <View
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        background: '#F3F5FB',
      }}
    >
      <Image
        src={profileBg}
        mode="widthFix"
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '750rpx',
        }}
      />

      <View
        style={{
          position: 'relative',
          width: '750rpx',
          height: '1624rpx',
        }}
      >
        <HeaderBlock
          avatar={avatar}
          nickname={nickname}
          subInfo={subInfo}
          showCert={data.isVerified}
          onEdit={goToEditProfile}
          onAvatarError={() => setAvatar(defaultAvatar)}
        />
        <StatsCard />
        <VipBanner onClick={goToVip} />
        <FeatureCards onCoin={goToCoin} onInvite={goToInvite} />
        <MenuCard
          onPost={goToMyPosts}
          onHelp={goToHelp}
          onSettings={goToSettings}
        />
      </View>
    </View>
  )
}

function HeaderBlock({
  avatar,
  nickname,
  subInfo,
  showCert,
  onEdit,
  onAvatarError,
}: {
  avatar: string
  nickname: string
  subInfo: string
  showCert: boolean
  onEdit: () => void
  onAvatarError: () => void
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '186rpx',
        width: '700rpx',
        height: '105rpx',
      }}
    >
      <Image
        src={avatar}
        mode="aspectFill"
        onError={onAvatarError}
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '111rpx',
          height: '111rpx',
          borderRadius: '56rpx',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '123rpx',
          top: '8rpx',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: '#333333',
            fontSize: '32rpx',
            fontWeight: 500,
            lineHeight: '45rpx',
          }}
        >
          {nickname}
        </Text>
        {showCert && <CertBadge />}
      </View>
      <Text
        style={{
          position: 'absolute',
          left: '124rpx',
          top: '64rpx',
          color: '#333333',
          fontSize: '26rpx',
          lineHeight: '37rpx',
        }}
      >
        {subInfo}
      </Text>
      <View
        style={{
          position: 'absolute',
          right: '0',
          top: '39rpx',
          height: '34rpx',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onClick={onEdit}
        hoverClass="btn-hover"
      >
        <Text style={{ color: '#999999', fontSize: '22rpx', lineHeight: '34rpx' }}>
          编辑资料
        </Text>
        <View
          style={{
            width: '14rpx',
            height: '34rpx',
            marginLeft: '4rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: '8rpx',
              height: '8rpx',
              boxSizing: 'border-box',
              borderTop: '3rpx solid #999999',
              borderRight: '3rpx solid #999999',
              transform: 'rotate(45deg)',
              marginTop: '-1rpx',
            }}
          />
        </View>
      </View>
    </View>
  )
}

function CertBadge() {
  return (
    <View
      style={{
        width: '138rpx',
        height: '48rpx',
        borderRadius: '8rpx',
        background: '#E3F1FE',
        marginLeft: '22rpx',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        src={iconCert}
        mode="aspectFit"
        style={{
          width: '28rpx',
          height: '28rpx',
          marginRight: '6rpx',
        }}
      />
      <Text style={{ color: '#5D89DD', fontSize: '20rpx', lineHeight: '28rpx' }}>
        三重认证
      </Text>
    </View>
  )
}

function StatsCard() {
  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '314rpx',
        width: '700rpx',
        height: '178rpx',
        borderRadius: '12rpx',
        background: '#FFFFFF',
        boxShadow: '0 2rpx 26rpx rgba(227,241,254,1)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: '528rpx',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-around',
        }}
      >
        {PROFILE_STATS.map((item) => (
          <View
            key={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#333333',
                fontSize: '40rpx',
                fontWeight: 500,
                lineHeight: '56rpx',
              }}
            >
              {item.value}
            </Text>
            <Text
              style={{
                color: '#999999',
                fontSize: '26rpx',
                lineHeight: '37rpx',
                marginTop: '7rpx',
              }}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={{
          flex: 1,
          height: '64rpx',
          borderRadius: '100rpx 0 0 100rpx',
          overflow: 'hidden',
        }}
        onClick={() => Taro.showToast({ title: '提升人气', icon: 'none' })}
        hoverClass="btn-hover"
      >
        <Image
          src={boostButton}
          mode="scaleToFill"
          style={{
            width: '172rpx',
            height: '64rpx',
          }}
        />
      </View>
    </View>
  )
}

function VipBanner({ onClick }: { onClick: () => void }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '512rpx',
        width: '700rpx',
        height: '128rpx',
        borderRadius: '12rpx',
        overflow: 'hidden',
      }}
      onClick={onClick}
      hoverClass="btn-hover"
    >
      <Image
        src={vipBanner}
        mode="scaleToFill"
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '700rpx',
          height: '128rpx',
        }}
      />
    </View>
  )
}

function FeatureCards({
  onCoin,
  onInvite,
}: {
  onCoin: () => void
  onInvite: () => void
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '660rpx',
        width: '700rpx',
        height: '158rpx',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      <FeatureCard
        image={cardCoin}
        title="成家币"
        subtitle="查看成家币"
        titleColor="#00469F"
        subtitleColor="#00469F"
        onClick={onCoin}
      />
      <FeatureCard
        image={cardInvite}
        title="邀请好友"
        subtitle="免费获得成家币"
        titleColor="#6600AF"
        subtitleColor="#A055C3"
        onClick={onInvite}
      />
    </View>
  )
}

function FeatureCard({
  image,
  title,
  subtitle,
  titleColor,
  subtitleColor,
  onClick,
}: {
  image: string
  title: string
  subtitle: string
  titleColor: string
  subtitleColor: string
  onClick: () => void
}) {
  return (
    <View
      style={{
        position: 'relative',
        width: '340rpx',
        height: '158rpx',
        borderRadius: '8rpx',
        overflow: 'hidden',
      }}
      onClick={onClick}
      hoverClass="btn-hover"
    >
      <Image
        src={image}
        mode="scaleToFill"
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '340rpx',
          height: '158rpx',
        }}
      />
      <Text
        style={{
          position: 'absolute',
          left: '22rpx',
          top: '20rpx',
          color: titleColor,
          fontSize: '28rpx',
          fontWeight: 500,
          lineHeight: '40rpx',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          position: 'absolute',
          left: '22rpx',
          top: '66rpx',
          color: subtitleColor,
          fontSize: '20rpx',
          lineHeight: '28rpx',
        }}
      >
        {subtitle}
      </Text>
    </View>
  )
}

function MenuCard({
  onPost,
  onHelp,
  onSettings,
}: {
  onPost: () => void
  onHelp: () => void
  onSettings: () => void
}) {
  const items = [
    { label: '我的动态', icon: iconPost, onClick: onPost },
    { label: '帮助与客服', icon: iconService, onClick: onHelp },
    { label: '设置', icon: iconSettings, onClick: onSettings },
  ]

  return (
    <View
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '838rpx',
        width: '700rpx',
        height: '282rpx',
        borderRadius: '8rpx',
        background: '#FFFFFF',
      }}
    >
      {items.map((item, index) => (
        <View
          key={item.label}
          style={{
            position: 'absolute',
            left: '20rpx',
            top: `${27 + index * 94}rpx`,
            width: '660rpx',
          }}
        >
          <View
            style={{
              height: '40rpx',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onClick={item.onClick}
            hoverClass="btn-hover"
          >
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Image
                src={item.icon}
                mode="aspectFit"
                style={{
                  width: '30rpx',
                  height: '30rpx',
                  marginRight: '20rpx',
                }}
              />
              <Text
                style={{
                  color: '#595F77',
                  fontSize: '28rpx',
                  lineHeight: '40rpx',
                }}
              >
                {item.label}
              </Text>
            </View>
            <Text style={{ color: '#999999', fontSize: '58rpx', lineHeight: '40rpx' }}>
              ›
            </Text>
          </View>
          {index < items.length - 1 && (
            <View
              style={{
                width: '660rpx',
                height: '1rpx',
                background: '#EFF4FC',
                marginTop: '26rpx',
              }}
            />
          )}
        </View>
      ))}
    </View>
  )
}
