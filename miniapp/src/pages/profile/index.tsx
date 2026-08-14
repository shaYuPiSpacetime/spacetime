import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  hasPartialBasicProfile,
  isVerificationStepSubmitted,
  resolveCertificationChecklist,
  resolveVerificationOnboardingRoute,
} from '@/domain/verificationOnboardingFlow'
import VerificationEntryView from '@/features/verification/VerificationEntryView'
import { useProfile } from '@/hooks/useProfile'
import { useMessageRuntimeStore } from '@/stores/messageRuntimeStore'
import { usePrd01Store } from '@/stores/prd01Store'
import { normalizeAvatarUrl } from '@/utils/avatar'
import type { MyMembership } from '@/types/membership'

import profileBg from '@/assets/profile/profile-bg.webp'
import defaultAvatar from '@/assets/profile/default-avatar.webp'
import cardCoin from '@/assets/profile/card-coin.webp'
import cardInvite from '@/assets/profile/card-invite.webp'

/**
 * 我的页面。
 */
export default function ProfilePage() {
  const unreadCount = useMessageRuntimeStore(state => state.unreadSummary.messageUnreadCount)
  const runtimeConfig = usePrd01Store(state => state.config)
  const copy = usePrd01Store(state => state.copy)
  const {
    data,
    loading,
    error,
    fetch,
    goToEditProfile,
    goToVip,
    goToCoin,
    goToInvite,
    goToMyPosts,
    goToHelp,
    goToSettings,
    goToHeart,
  } = useProfile()
  useEffect(() => {
    fetch()
  }, [fetch])

  useDidShow(() => {
    fetch()
  })

  const nickname = data.nickname || '待完善昵称'
  const sourceAvatar = normalizeAvatarUrl(data.avatarUrl, defaultAvatar)
  const [avatar, setAvatar] = useState(defaultAvatar)
  const ageText = data.age != null ? `${data.age}岁` : ''
  const subInfo = [data.location, ageText, data.zodiac].filter(Boolean).join('丨')
  const membership: MyMembership = data.membership || { status: 'none' }
  const membershipVariant = membership.status
  const stats = [
    { value: data.likedCount, label: '我喜欢的' },
    { value: data.beLikedCount, label: '喜欢我的' },
    { value: data.visitorCount, label: '最近来访' },
  ]

  useEffect(() => {
    setAvatar(sourceAvatar)
  }, [sourceAvatar])

  const basic = data.basicProfile
  const verification = data.verification
  const introduction = data.introduction
  const fieldSettings = basic?.fieldSettings || runtimeConfig?.fieldSettings || []
  const hasPartialProfile = Boolean(basic) && (
    basic?.basicProfileCompleted === true ||
    hasPartialBasicProfile(basic, fieldSettings, runtimeConfig?.initFields || []) ||
    isVerificationStepSubmitted(verification?.avatarVerifyStatus) ||
    isVerificationStepSubmitted(introduction?.auditStatus) ||
    Number(verification?.verifyLevel) > 0
  )
  const checklist = resolveCertificationChecklist({
    basicCompleted: basic?.basicProfileCompleted,
    avatarStatus: verification?.avatarVerifyStatus,
    introductionStatus: introduction?.auditStatus,
    verifyLevel: verification?.verifyLevel,
  })

  const continueVerification = async () => {
    const route = resolveVerificationOnboardingRoute({
      basicCompleted: basic?.basicProfileCompleted,
      avatarStatus: verification?.avatarVerifyStatus,
      introductionStatus: introduction?.auditStatus,
    })
    await Taro.navigateTo({ url: route })
  }

  const enterAvailableArea = async () => {
    if (data.accessStatus?.canBrowseCards) {
      await Taro.switchTab({ url: '/pages/recommend/index' })
      return
    }
    if (data.accessStatus?.canCommunity) {
      await Taro.switchTab({ url: '/pages/community/index' })
      return
    }
    const reason = data.accessStatus?.blockReasons?.[0] || copy('verification_home_partial_notice')
    if (reason) await Taro.showToast({ title: reason, icon: 'none' })
  }

  const renderVerificationEntry = () => (
      <VerificationEntryView
        role="profile-unverified"
        unreadCount={unreadCount}
        loading={loading || !data.entryResolved}
        error={error || ''}
        hasPartialProfile={hasPartialProfile}
        checklist={checklist}
        copy={copy}
        onContinue={() => void continueVerification()}
        onLater={() => void enterAvailableArea()}
        onRetry={() => void fetch()}
      />
  )

  // 必须等服务端最新准入状态返回后再决定页面，避免缓存曾通过时闪现正常“我的”。
  if (!data.entryResolved) return renderVerificationEntry()

  if (data.accessStatus?.coreAccessStatus !== 'CORE_ALLOWED') {
    return renderVerificationEntry()
  }

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
          profileScore={data.profileScore}
          editText="编辑资料"
          certText="三重认证"
          onEdit={goToEditProfile}
          onAvatarError={() => setAvatar(defaultAvatar)}
        />
        <>
          <StatsCard stats={stats} boostText="提升人气" onHeart={goToHeart} />
          <VipBanner
            status={membershipVariant}
            expireTime={membership.expireTime}
            onClick={() => {
              if (membershipVariant === 'none') {
                goToVip()
                return
              }
              Taro.navigateTo({ url: '/pages/membership/index' })
            }}
          />
          <FeatureCards onCoin={goToCoin} onInvite={goToInvite} />
          <MenuCard onPost={goToMyPosts} onHelp={goToHelp} onSettings={goToSettings} />
        </>
      </View>
    </View>
  )
}

function HeaderBlock({
  avatar,
  nickname,
  subInfo,
  showCert,
  profileScore,
  editText,
  certText,
  onEdit,
  onAvatarError,
}: {
  avatar: string
  nickname: string
  subInfo: string
  showCert: boolean
  profileScore: number
  editText: string
  certText: string
  onEdit: () => void
  onAvatarError: () => void
}) {
  return (
    <View
      id="profile-header-edit-area"
      onClick={onEdit}
      hoverClass="btn-hover"
      style={{
        position: 'absolute',
        left: '25rpx',
        top: '186rpx',
        width: '700rpx',
        height: '124rpx',
      }}
    >
      <ProfileAvatarFrame
        avatar={avatar}
        profileScore={profileScore}
        onError={onAvatarError}
      />
      <View
        id="profile-nickname-row"
        style={{
          position: 'absolute',
          left: '124rpx',
          top: '2rpx',
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
        {showCert && <CertBadge text={certText} />}
      </View>
      <Text
        id="profile-sub-info"
        style={{
          position: 'absolute',
          left: '124rpx',
          top: '58rpx',
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
      >
        <Text style={{ color: '#999999', fontSize: '22rpx', lineHeight: '34rpx' }}>{editText}</Text>
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

function ProfileAvatarFrame({
  avatar,
  profileScore,
  onError,
}: {
  avatar: string
  profileScore: number
  onError: () => void
}) {
  return (
    <View
      id="profile-avatar-frame"
      style={{
        position: 'absolute',
        left: '0',
        top: '0',
        width: '110rpx',
        height: '110rpx',
        borderRadius: '55rpx',
        background: profileScore > 0 ? '#E3F1FE' : '#FFFFFF',
        padding: '6rpx',
        boxSizing: 'border-box',
      }}
    >
      <Image
        id="profile-avatar-image"
        src={avatar}
        mode="aspectFill"
        onError={onError}
        style={{ width: '98rpx', height: '98rpx', borderRadius: '49rpx' }}
      />
      {profileScore > 0 && (
        <View
          style={{
            position: 'absolute',
            left: '10rpx',
            bottom: '-4rpx',
            width: '90rpx',
            height: '30rpx',
            borderRadius: '18rpx',
            background: '#D9EBFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: '14rpx',
              height: '5rpx',
              borderRadius: '4rpx',
              background: '#2876FF',
              transform: 'rotate(-45deg)',
              marginRight: '8rpx',
            }}
          />
          <Text style={{ color: '#2876FF', fontSize: '18rpx', fontWeight: 600, lineHeight: '25rpx' }}>{profileScore}%</Text>
        </View>
      )}
    </View>
  )
}

function CertBadge({ text }: { text: string }) {
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
        src={miniappOssIcons.profileCertification}
        mode="aspectFit"
        style={{
          width: '28rpx',
          height: '28rpx',
          marginRight: '6rpx',
        }}
      />
      <Text style={{ color: '#5D89DD', fontSize: '20rpx', lineHeight: '28rpx' }}>{text}</Text>
    </View>
  )
}

function StatsCard({ stats, boostText, onHeart }: { stats: Array<{ value: number; label: string }>; boostText: string; onHeart: () => void }) {
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
        {stats.map((item, index) => (
          <View
            key={item.label}
            id={`profile-stat-${index}`}
            onClick={onHeart}
            hoverClass="btn-hover"
            style={{
              width: '176rpx',
              height: '120rpx',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
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
        onClick={() => boostText && Taro.showToast({ title: boostText, icon: 'none' })}
        hoverClass="btn-hover"
      >
        <Image
          src={miniappOssIcons.profileBoostButton}
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

function VipBanner({
  status,
  expireTime,
  onClick,
}: {
  status: MyMembership['status']
  expireTime?: string
  onClick: () => void
}) {
  const isActive = status === 'active'
  const title = isActive
    ? '时空邂逅会员已开通，享尊享特权'
    : status === 'expired'
      ? '时空邂逅会员已过期'
      : '开通时空邂逅会员，享尊享特权'
  const ctaText = isActive ? '立即续费' : '立即开通'
  const expiry = formatVipBannerExpiry(expireTime)

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
        background: 'linear-gradient(105deg, #1B1B1B 0%, #292725 58%, #45423D 100%)',
      }}
      onClick={onClick}
      hoverClass="btn-hover"
    >
      <VipBannerPattern />
      <VipBannerMark />
      <Text
        style={{
          position: 'absolute',
          left: '102rpx',
          top: isActive ? '38rpx' : '43rpx',
          maxWidth: '400rpx',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          color: '#F7C968',
          fontSize: '26rpx',
          fontWeight: 700,
          lineHeight: '40rpx',
        }}
      >
        {title}
      </Text>
      {isActive ? (
        <>
          <View
            style={{
              position: 'absolute',
              right: '26rpx',
              top: '35rpx',
              height: '40rpx',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#F7C968', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>{ctaText}</Text>
            <VipBannerChevron color="#F7C968" />
          </View>
          <Text
            style={{
              position: 'absolute',
              right: '28rpx',
              bottom: '24rpx',
              color: '#FFFFFF',
              fontSize: '22rpx',
              lineHeight: '31rpx',
            }}
          >
            {expiry ? `${expiry} 到期` : ''}
          </Text>
        </>
      ) : (
        <View
          style={{
            position: 'absolute',
            right: '20rpx',
            top: '35rpx',
            width: '160rpx',
            height: '58rpx',
            borderRadius: '58rpx',
            background: '#F7C968',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#211D1E', fontSize: '26rpx', fontWeight: 700, lineHeight: '36rpx' }}>
            {ctaText}
          </Text>
        </View>
      )}
    </View>
  )
}

function VipBannerPattern() {
  const border = '10rpx solid rgba(184,166,123,0.24)'
  return (
    <View style={{ position: 'absolute', right: '-10rpx', top: '-56rpx', width: '220rpx', height: '240rpx', overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          right: '-24rpx',
          top: '-18rpx',
          width: '128rpx',
          height: '128rpx',
          borderRadius: '18rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '34rpx',
          top: '72rpx',
          width: '118rpx',
          height: '118rpx',
          borderRadius: '18rpx',
          border,
          transform: 'rotate(45deg)',
        }}
      />
    </View>
  )
}

function VipBannerMark() {
  return (
    <View style={{ position: 'absolute', left: '28rpx', top: '38rpx', width: '54rpx', height: '54rpx' }}>
      <View
        style={{
          position: 'absolute',
          left: '7rpx',
          top: '7rpx',
          width: '40rpx',
          height: '40rpx',
          borderRadius: '8rpx',
          border: '4rpx solid #F7C968',
          boxSizing: 'border-box',
          transform: 'rotate(45deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '17rpx',
          top: '19rpx',
          width: '20rpx',
          height: '10rpx',
          borderLeft: '4rpx solid #F7C968',
          borderBottom: '4rpx solid #F7C968',
          transform: 'rotate(-45deg)',
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}

function VipBannerChevron({ color }: { color: string }) {
  return (
    <View style={{ width: '22rpx', height: '32rpx', marginLeft: '8rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: '12rpx',
          height: '12rpx',
          borderTop: `3rpx solid ${color}`,
          borderRight: `3rpx solid ${color}`,
          transform: 'rotate(45deg)',
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}

function formatVipBannerExpiry(value?: string) {
  return value?.replace('T', ' ').split(' ')[0].replace(/-/g, '.') || ''
}

function FeatureCards({ onCoin, onInvite }: { onCoin: () => void; onInvite: () => void }) {
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
        title="千寻币"
        subtitle="查看千寻币"
        titleColor="#00469F"
        subtitleColor="#00469F"
        onClick={onCoin}
      />
      <FeatureCard
        image={cardInvite}
        title="邀请好友"
        subtitle="免费获得千寻币"
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
    { label: '我的动态', icon: miniappOssIcons.profilePost, onClick: onPost },
    { label: '帮助与客服', icon: miniappOssIcons.profileService, onClick: onHelp },
    { label: '设置', icon: miniappOssIcons.profileSettings, onClick: onSettings },
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
            <Text style={{ color: '#999999', fontSize: '58rpx', lineHeight: '40rpx' }}>›</Text>
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
