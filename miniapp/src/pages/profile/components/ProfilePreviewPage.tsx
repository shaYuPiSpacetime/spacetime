import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import ProfilePreviewTopNav from '@/components/ProfilePreviewTopNav'
import ProfileTagChip from '@/components/ProfileTagChip'
import { miniappOssIcons } from '@/constants/ossIcons'
import { buildProfilePreviewVisibility } from '@/domain/profilePreviewVisibility'
import type { ProfileTagItem } from '@/utils/profileTags'
import ProfileHeroImage from './ProfileHeroImage'

export type ProfilePreviewModel = {
  avatarUrl: string
  heroImageUrl: string
  nickname: string
  gender: string
  genderAgeHeight: string
  location: string
  tags: ProfileTagItem[]
  introduction: string
  photos: string[]
  certifications: Array<{
    key: 'avatar' | 'realName' | 'education'
    label: string
    passed: boolean
    status?: string
    statusLabel?: string
  }>
  voice: {
    url: string
    duration?: number
    statusLabel?: string
  }
  datingGoal: string
  relationshipStatus: string
  favoriteSong: string
  aboutMe: Array<{ title: string; value: string }>
  detailInfo?: string[]
}

type ProfilePreviewPageProps = {
  model: ProfilePreviewModel
  onBack: () => void
  onEdit?: () => void
  variant?: 'owner-preview' | 'public-profile'
  onSafetyActions?: () => void
  additionalContent?: ReactNode
  footer?: ReactNode
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
const certificationIcons = {
  avatar: miniappOssIcons.profilePreviewCertAvatar,
  realName: miniappOssIcons.profilePreviewCertRealname,
  education: miniappOssIcons.profilePreviewCertEducation,
}

export default function ProfilePreviewPage({
  model,
  onBack,
  onEdit,
  variant = 'owner-preview',
  onSafetyActions,
  additionalContent,
  footer,
}: ProfilePreviewPageProps) {
  const visibleContent = buildProfilePreviewVisibility(model)
  const showShare = () => {
    void Taro.showShareMenu({ withShareTicket: true }).catch(() => {
      Taro.showToast({ title: '请使用右上角分享', icon: 'none' })
    })
  }

  return (
    <View style={{ height: '100vh', background: pageBackground, overflow: 'hidden', fontFamily }}>
      {variant === 'owner-preview' ? (
        <ProfilePreviewTopNav
          activeTab="preview"
          onBack={onBack}
          onTabChange={tab => {
            if (tab === 'form') onEdit?.()
          }}
        />
      ) : null}
      <ScrollView
        data-role="profile-preview-scroll-content"
        scrollY
        style={variant === 'owner-preview'
          ? { position: 'absolute', left: 0, right: 0, top: '182rpx', bottom: 0, width: '750rpx' }
          : { height: '100vh', width: '750rpx' }}
        showScrollbar={false}
      >
        <View
          style={{
            width: '750rpx',
            minHeight: '100vh',
            boxSizing: 'border-box',
          }}
        >
          {variant === 'public-profile' ? <HeartMessageHeader title="用户主页" align="center" showBack /> : null}
          <View style={{ width: '700rpx', margin: '0 auto' }}>
            <ProfilePreviewHero model={model} onShare={showShare} onSafetyActions={onSafetyActions} />
            {(variant === 'owner-preview' || model.genderAgeHeight || model.location || model.datingGoal)
              ? <ProfilePreviewBasicInfo model={model} variant={variant} />
              : null}
            {model.detailInfo?.length ? <ProfilePreviewDetailInfo items={model.detailInfo} /> : null}
            {visibleContent.tags.length ? <ProfilePreviewTagSection tags={visibleContent.tags} /> : null}
            {visibleContent.introduction ? <ProfilePreviewIntroduction introduction={visibleContent.introduction} /> : null}
            {visibleContent.aboutMe.length ? <ProfilePreviewAboutMe items={visibleContent.aboutMe} /> : null}
            {visibleContent.photos[0] ? <ProfilePreviewPhoto url={visibleContent.photos[0]} /> : null}
            {visibleContent.showCertification ? <ProfilePreviewCertification certifications={model.certifications} /> : null}
            {visibleContent.photos[1] ? <ProfilePreviewPhoto url={visibleContent.photos[1]} /> : null}
            {visibleContent.favoriteSong ? <ProfilePreviewSong favoriteSong={visibleContent.favoriteSong} /> : null}
            {visibleContent.photos.slice(2).map((url, index) => (
              <ProfilePreviewPhoto key={`${url}-${index}`} url={url} />
            ))}
            {additionalContent}
            {footer ? <View style={{ height: '160rpx' }} /> : null}
          </View>
        </View>
      </ScrollView>
      {footer}
    </View>
  )
}

function ProfilePreviewHero({ model, onShare, onSafetyActions }: { model: ProfilePreviewModel; onShare: () => void; onSafetyActions?: () => void }) {
  return (
    <ProfileHeroImage src={model.heroImageUrl || miniappOssIcons.profilePreviewHero}>
      <Image
        src={miniappOssIcons.profilePreviewShare}
        mode="scaleToFill"
        onClick={onShare}
        style={{ position: 'absolute', right: '30rpx', top: '28rpx', width: '48rpx', height: '48rpx', borderRadius: '24rpx' }}
      />
      {onSafetyActions ? (
        <View onClick={onSafetyActions} style={{ position: 'absolute', left: '30rpx', top: '28rpx', zIndex: 4, padding: '10rpx 18rpx', borderRadius: '24rpx', background: 'rgba(0,0,0,0.28)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '22rpx' }}>举报 · 拉黑</Text>
        </View>
      ) : null}
      <Image
        id="profile-preview-avatar"
        src={model.avatarUrl || miniappOssIcons.profilePreviewAvatar}
        mode="aspectFill"
        style={{
          position: 'absolute',
          zIndex: 3,
          left: '30rpx',
          bottom: '57rpx',
          width: '188rpx',
          height: '188rpx',
          borderRadius: '50%',
          background: '#FFFFFF',
          border: '7rpx solid #FFFFFF',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      />
      <View
        data-role="profile-preview-identity"
        style={{
          position: 'absolute',
          zIndex: 2,
          left: '238rpx',
          bottom: '101rpx',
          width: '432rpx',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '38rpx', lineHeight: '53rpx', fontWeight: 500, textShadow: '0 3rpx 4rpx rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
            {model.nickname || '昵称待完善'}
          </Text>
          {model.certifications.length ? <View style={{ width: '168rpx', height: '48rpx', borderRadius: '24rpx', background: '#E3F1FE', marginLeft: '10rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
            <Image src={miniappOssIcons.profileCertification} mode="aspectFit" style={{ width: '30rpx', height: '30rpx', marginRight: '8rpx' }} />
            <Text style={{ color: '#5D89DD', fontSize: '20rpx', lineHeight: '28rpx', fontWeight: 500 }}>
              三重认证
            </Text>
          </View> : null}
        </View>
        {model.relationshipStatus ? (
          <View
            data-role="profile-preview-subtitle"
            style={{
              display: 'inline-flex',
              width: 'auto',
              minWidth: '148rpx',
              height: '48rpx',
              borderRadius: '24rpx',
              background: 'rgba(0,0,0,0.2)',
              marginTop: '10rpx',
              padding: '0 18rpx',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}
          >
            <Text style={{ color: '#FE918E', fontSize: '27rpx', lineHeight: '28rpx', marginRight: '10rpx' }}>♥</Text>
            <Text style={{ color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {model.relationshipStatus}
            </Text>
          </View>
        ) : null}
      </View>
    </ProfileHeroImage>
  )
}

function ProfilePreviewBasicInfo({ model, variant }: { model: ProfilePreviewModel; variant: 'owner-preview' | 'public-profile' }) {
  const isMale = model.gender === 'MALE'
  const showDatingGoal = Boolean(model.datingGoal) || variant === 'owner-preview'
  const genderIcon = model.gender === 'MALE'
    ? miniappOssIcons.qianxunGenderMale
    : miniappOssIcons.profilePreviewGender
  return (
    <View
      style={{
        position: 'relative',
        zIndex: 1,
        width: '700rpx',
        height: showDatingGoal ? '281rpx' : '198rpx',
        marginTop: '-105rpx',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding: '60rpx 30rpx 41rpx 27rpx',
        boxSizing: 'border-box',
      }}
    >
      {model.genderAgeHeight || variant === 'owner-preview' ? <ProfilePreviewInfoLine
        icon={genderIcon}
        iconWidth={isMale ? '32rpx' : '24rpx'}
        iconHeight={isMale ? '32rpx' : '34rpx'}
        text={model.genderAgeHeight || '基础资料待完善'}
      /> : null}
      {model.location || variant === 'owner-preview' ? <ProfilePreviewInfoLine
        icon={miniappOssIcons.profilePreviewLocation}
        iconWidth="34rpx"
        iconHeight="34rpx"
        text={model.location || '地区待完善'}
        marginTop={model.genderAgeHeight || variant === 'owner-preview' ? '23rpx' : '0'}
      /> : null}
      {showDatingGoal ? (
        <>
          <View
            data-role="profile-preview-basic-divider"
            style={{ height: '1rpx', marginTop: '25rpx', background: '#EEF1F5' }}
          />
          <Text
            data-role="profile-preview-dating-goal"
            style={{ display: 'block', marginTop: '20rpx', color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', whiteSpace: 'nowrap' }}
          >
            脱单目标：{model.datingGoal || '待完善'}
          </Text>
        </>
      ) : null}
    </View>
  )
}

function ProfilePreviewDetailInfo({ items }: { items: string[] }) {
  return (
    <ProfilePreviewCard title="资料信息" height="auto" padding="30rpx 30rpx 34rpx">
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10rpx', marginTop: '20rpx' }}>
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={{ minHeight: '48rpx', padding: '0 22rpx', borderRadius: '24rpx', background: '#F1F5FC', display: 'flex', alignItems: 'center' }}>
            <Text style={{ color: '#61718A', fontSize: '23rpx' }}>{item}</Text>
          </View>
        ))}
      </View>
    </ProfilePreviewCard>
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
      <View style={{ width: '48rpx', height: '37rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src={icon} mode="scaleToFill" style={{ width: iconWidth, height: iconHeight }} />
      </View>
      <Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 400 }}>{text}</Text>
    </View>
  )
}

function ProfilePreviewTagSection({ tags }: { tags: ProfileTagItem[] }) {
  const visibleTags = tags.slice(0, 8)
  return (
    <View
      style={{
        width: '700rpx',
        minHeight: '182rpx',
        marginTop: '20rpx',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding: '30rpx 40rpx 40rpx 29rpx',
        boxSizing: 'border-box',
      }}
    >
      <ProfilePreviewTitle title="我的标签" bubbleLeft="94rpx" />
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: '10rpx', marginTop: '20rpx' }}>
        {visibleTags.map(item => (
          <View key={item.code} style={{ flexShrink: 0 }}>
            <ProfileTagChip item={item} />
          </View>
        ))}
      </View>
    </View>
  )
}

function ProfilePreviewIntroduction({ introduction }: { introduction: string }) {
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
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
        }}
      >
        {introduction}
      </Text>
    </ProfilePreviewCard>
  )
}

function ProfilePreviewAboutMe({ items }: { items: ProfilePreviewModel['aboutMe'] }) {
  return (
    <ProfilePreviewCard title="关于我" height="auto" padding="30rpx 30rpx 34rpx">
      <View style={{ marginTop: '14rpx' }}>
        {items.map((item, index) => (
          <View
            key={`${item.title}-${index}`}
            style={{ padding: '18rpx 0', borderBottom: index === items.length - 1 ? 'none' : '1rpx solid #EEF1F5' }}
          >
            <Text style={{ display: 'block', color: '#68758A', fontSize: '23rpx', lineHeight: '34rpx' }}>{item.title}</Text>
            <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '42rpx', marginTop: '8rpx', whiteSpace: 'pre-wrap' }}>{item.value}</Text>
          </View>
        ))}
      </View>
    </ProfilePreviewCard>
  )
}

function ProfilePreviewPhoto({ url }: { url: string }) {
  return (
    <View style={{ width: '700rpx', height: '880rpx', marginTop: '20rpx', borderRadius: '32rpx', overflow: 'hidden', background: '#F4F4F2' }}>
      <Image src={url} mode="aspectFill" style={{ display: 'block', width: '700rpx', height: '896rpx', marginBottom: '-16rpx' }} />
    </View>
  )
}

function ProfilePreviewCertification({ certifications }: { certifications: ProfilePreviewModel['certifications'] }) {
  const verifiedCount = certifications.filter(item => item.passed).length
  const trustPercent = certifications.length ? Math.round((verifiedCount / certifications.length) * 100) : 0
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
        {certifications.map((item, index) => (
          <View
            key={item.key}
            style={{
              width: '148rpx',
              height: '58rpx',
              borderRadius: '31rpx',
              background: item.passed ? 'linear-gradient(135deg, #6D96FB 0%, #387DFE 100%)' : '#EEF2F8',
              marginLeft: index === 0 ? '0' : '10rpx',
              padding: '0 25rpx 0 8rpx',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Image src={certificationIcons[item.key]} mode="aspectFit" style={{ width: '42rpx', height: '42rpx' }} />
            <Text style={{ color: item.passed ? '#FFFFFF' : '#697E9C', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 400 }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ position: 'absolute', right: '0', top: '0', width: '185rpx', height: '198rpx', background: 'linear-gradient(180deg, rgba(40,118,255,0.10) 0%, rgba(255,255,255,0.3) 100%)', clipPath: 'polygon(50% 0, 65% 12%, 100% 16%, 100% 55%, 86% 78%, 50% 100%, 14% 78%, 0 55%, 0 16%, 35% 12%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '39rpx' }}>
          <View style={{ width: '22rpx', height: '22rpx', borderRadius: '11rpx', border: '2rpx solid #999999', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#999999', fontSize: '16rpx', lineHeight: '18rpx' }}>?</Text>
          </View>
          <Text style={{ color: mainBlue, fontSize: '22rpx', lineHeight: '30rpx', marginLeft: '8rpx' }}>可信度</Text>
        </View>
        <Text style={{ color: mainBlue, fontSize: '48rpx', lineHeight: '67rpx', fontWeight: 600, marginTop: '-3rpx' }}>{trustPercent}%</Text>
      </View>
    </View>
  )
}

function ProfilePreviewSong({ favoriteSong }: { favoriteSong: string }) {
  return (
    <ProfilePreviewCard title="我最爱听的歌曲" titleBubbleLeft="181rpx" height="248rpx" padding="30rpx 28rpx 56rpx">
      <View style={{ width: '560rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '30rpx', marginLeft: '13rpx' }}>
        <Image src={miniappOssIcons.profilePreviewSong} mode="scaleToFill" style={{ width: '98rpx', height: '98rpx', borderRadius: '49rpx' }} />
        <View style={{ marginLeft: '11rpx' }}>
          <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: 500 }}>
            {favoriteSong}
          </Text>
          <Text style={{ display: 'block', color: '#333333', fontSize: '22rpx', lineHeight: '30rpx', fontWeight: 400, marginTop: '10rpx', whiteSpace: 'nowrap' }}>
            分享你的音乐灵魂，遇见相同频率的人
          </Text>
        </View>
      </View>
    </ProfilePreviewCard>
  )
}

function ProfilePreviewCard({ title, titleBubbleLeft = '94rpx', height, padding, children }: ProfilePreviewCardProps) {
  return (
    <View style={{ width: '700rpx', height, marginTop: '20rpx', borderRadius: '32rpx', background: '#FFFFFF', padding, boxSizing: 'border-box' }}>
      <ProfilePreviewTitle title={title} bubbleLeft={titleBubbleLeft} />
      {children}
    </View>
  )
}

function ProfilePreviewTitle({ title, bubbleLeft }: { title: string; bubbleLeft: string }) {
  return (
    <View style={{ position: 'relative', height: '44rpx' }}>
      <View style={{ position: 'absolute', left: bubbleLeft, top: '0', width: '30rpx', height: '30rpx', borderRadius: '15rpx', background: '#E3F1FE' }} />
      <Text style={{ position: 'relative', top: '4rpx', color: '#333333', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600, whiteSpace: 'nowrap' }}>{title}</Text>
    </View>
  )
}
