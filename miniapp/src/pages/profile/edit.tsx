import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { getDemoPageData } from '@/services/lanhuDemo'

import defaultAvatar from '@/assets/profile/default-avatar.webp'

type EditOptionGroup = {
  title: string
  current: string
  options: string[]
}

type ProfilePhotoSlot = {
  label: string
  imageUrl?: string
}

type AboutTopic = {
  key: string
  title: string
  value?: string
}

type ProfileDemo = {
  nickname: string
  editProfile: {
    title: string
    datingGoal: EditOptionGroup
    relationshipStatus: EditOptionGroup
    favoriteSongs: {
      title: string
      selected: string[]
      options: string[]
    }
    aboutMe: {
      value: string
    }
    intro: {
      value: string
    }
    aboutTopics: AboutTopic[]
  }
  defaultSelectedTags: string[]
}

type SheetState =
  | {
      key: 'goal' | 'relationship' | 'mbti'
      title: string
      value: string
      options: string[]
    }
  | null

const profileDemo = getDemoPageData('profile') as ProfileDemo
const editProfileDemo = profileDemo.editProfile

const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'
const mainBlue = '#2876FF'
const titleColor = '#0C285A'
const mutedColor = '#7F8494'
const cardShadow = '0 18rpx 48rpx rgba(25, 54, 98, 0.06)'
const defaultPhotoSlots: ProfilePhotoSlot[] = [
  { label: '笑起来的样子' },
  { label: '生活中的样子' },
  { label: '得意的旅行照' },
  { label: '好看的全身照' },
  { label: '展示才艺的照片' },
  { label: '宠物小伙伴' },
]
export default function ProfileEditPage() {
  const [heroPhoto, setHeroPhoto] = useState(defaultAvatar)
  const [profilePhotos, setProfilePhotos] = useState(defaultPhotoSlots)
  const [goal, setGoal] = useState(editProfileDemo.datingGoal.current)
  const [relationship, setRelationship] = useState('佛系交友')
  const [mbti, setMbti] = useState('ENFJ 主人公')
  const [wechat, setWechat] = useState('')
  const [sheet, setSheet] = useState<SheetState>(null)

  const closeSheet = () => setSheet(null)

  const openGoalSheet = () => {
    setSheet({
      key: 'goal',
      title: editProfileDemo.datingGoal.title,
      value: goal,
      options: editProfileDemo.datingGoal.options,
    })
  }

  const openRelationshipSheet = () => {
    setSheet({
      key: 'relationship',
      title: editProfileDemo.relationshipStatus.title,
      value: relationship,
      options: ['佛系交友', ...editProfileDemo.relationshipStatus.options.filter((item) => item !== '佛系交友')],
    })
  }

  const openMbtiSheet = () => {
    setSheet({
      key: 'mbti',
      title: 'MBTI类型',
      value: mbti,
      options: ['ENFJ 主人公', 'INFJ 提倡者', 'ENFP 竞选者', 'INTJ 建筑师', 'ISFJ 守卫者'],
    })
  }

  const confirmOption = (value: string) => {
    if (!sheet) return
    if (sheet.key === 'goal') setGoal(value)
    if (sheet.key === 'relationship') setRelationship(value)
    if (sheet.key === 'mbti') setMbti(value)
    closeSheet()
  }

  const handleProfileAction = (title: string, url?: string) => {
    if (url) {
      void Taro.navigateTo({ url }).catch(() => {
        Taro.showToast({ title, icon: 'none' })
      })
      return
    }
    Taro.showToast({ title, icon: 'none' })
  }

  const chooseProfileImage = async (onChoose: (path: string) => void, fallbackTitle: string) => {
    try {
      const result = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const imagePath = result.tempFilePaths?.[0]
      if (!imagePath) {
        Taro.showToast({ title: fallbackTitle, icon: 'none' })
        return
      }
      onChoose(imagePath)
      Taro.showToast({ title: '已选择照片', icon: 'success' })
    } catch {
      Taro.showToast({ title: fallbackTitle, icon: 'none' })
    }
  }

  const onChangePhoto = () => {
    void chooseProfileImage(setHeroPhoto, '更换照片')
  }

  const handlePhotoClick = (index: number) => {
    void chooseProfileImage((imagePath) => {
      setProfilePhotos((current) =>
        current.map((item, photoIndex) => (photoIndex === index ? { ...item, imageUrl: imagePath } : item))
      )
    }, profilePhotos[index]?.label || '添加照片')
  }

  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    }
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground, overflow: 'hidden' }}>
      <ScrollView scrollY style={{ height: '100vh', width: '750rpx' }} showScrollbar={false}>
        <View
          style={{
            width: '750rpx',
            minHeight: '5812rpx',
            paddingBottom: '210rpx',
            boxSizing: 'border-box',
          }}
        >
          <EditProfileNavBar
            title={editProfileDemo.title || '编辑资料'}
            onBack={handleBack}
            onMenu={() => handleProfileAction('更多操作')}
          />
          <ProfileScoreCard onClick={() => handleProfileAction('资料评分')} />
          <TruthNotice />
          <ProfileHeroCard
            nickname={profileDemo.nickname}
            avatar={heroPhoto}
            onChangePhoto={onChangePhoto}
          />
          <PhotoUploadGrid photos={profilePhotos} onPhotoClick={handlePhotoClick} />
          <BasicInfoSection onEdit={() => handleProfileAction('基础资料', '/pages/verification/basic')} />
          <CertificationSection onUpdate={() => handleProfileAction('更新认证', '/pages/verification/triple')} />
          <ProfileSection title="脱单目标">
            <AddPrompt text={goal || '添加脱单目标，为你推荐目标一致的人'} onClick={openGoalSheet} />
          </ProfileSection>
          <SingleLineSection title="感情状态" value={relationship} onClick={openRelationshipSheet} />
          <AboutMeSection
            value={editProfileDemo.intro?.value || editProfileDemo.aboutMe.value}
            onEdit={() => handleProfileAction('自我介绍', '/pages/profile-edit/intro')}
          />
          <ProfileSection title="我的标签">
            <AddPrompt
              text={profileDemo.defaultSelectedTags.length ? profileDemo.defaultSelectedTags.join('、') : '添加标签，让TA更了解你'}
              onClick={() => handleProfileAction('我的标签', '/pages/profile-edit/tags')}
            />
          </ProfileSection>
          <VoiceSection onRecord={() => handleProfileAction('语音介绍', '/pages/profile-edit/voice?variant=voice')} />
          <MbtiSection mbti={mbti} onAdd={openMbtiSheet} />
          <AboutDetailSection
            items={editProfileDemo.aboutTopics || []}
            onAdd={() => handleProfileAction('关于我', '/pages/profile-edit/about')}
            onFill={(key) =>
              handleProfileAction(
                '关于我',
                key === 'meet' ? '/pages/profile-edit/about?topic=meet' : `/pages/profile-edit/about?topic=${key}`
              )
            }
          />
          <SongSection song="告白气球丨周杰伦" onSwitch={() => handleProfileAction('爱听的歌曲', '/pages/profile-edit/songs')} />
          <WechatSection value={wechat} onInput={setWechat} />
          <Text
            style={{
              display: 'block',
              color: '#B5BAC7',
              fontSize: '24rpx',
              lineHeight: '34rpx',
              textAlign: 'center',
              marginTop: '42rpx',
            }}
          >
            填写的资料将会展示在你的主页，请如实填写
          </Text>
        </View>
      </ScrollView>

      {sheet ? (
        <OptionSheet
          title={sheet.title}
          value={sheet.value}
          options={sheet.options}
          onCancel={closeSheet}
          onConfirm={confirmOption}
        />
      ) : null}
    </View>
  )
}

function EditProfileNavBar({ title, onBack, onMenu }: { title: string; onBack: () => void; onMenu: () => void }) {
  return (
    <View style={{ position: 'relative', width: '750rpx', height: '164rpx' }}>
      <View
        onClick={onBack}
        style={{
          position: 'absolute',
          left: '18rpx',
          top: '82rpx',
          width: '86rpx',
          height: '72rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: titleColor, fontSize: '54rpx', lineHeight: '60rpx', fontWeight: 300 }}>‹</Text>
      </View>
      <Text
        style={{
          position: 'absolute',
          left: '0',
          top: '98rpx',
          width: '750rpx',
          color: titleColor,
          fontSize: '32rpx',
          lineHeight: '45rpx',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <View
        onClick={onMenu}
        style={{
          position: 'absolute',
          right: '24rpx',
          top: '78rpx',
          width: '174rpx',
          height: '64rpx',
          borderRadius: '36rpx',
          background: 'rgba(255,255,255,0.86)',
          border: '1rpx solid rgba(12,40,90,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 22rpx',
          boxSizing: 'border-box',
        }}
      >
        <View style={{ width: '10rpx', height: '10rpx', borderRadius: '10rpx', background: titleColor }} />
        <View style={{ width: '10rpx', height: '10rpx', borderRadius: '10rpx', background: titleColor }} />
        <View style={{ width: '10rpx', height: '10rpx', borderRadius: '10rpx', background: titleColor }} />
        <View
          style={{
            width: '34rpx',
            height: '34rpx',
            borderRadius: '34rpx',
            border: `3rpx solid ${titleColor}`,
            boxSizing: 'border-box',
          }}
        />
      </View>
    </View>
  )
}

function ProfileScoreCard({ onClick }: { onClick: () => void }) {
  return (
    <View
      onClick={onClick}
      style={{
        width: '700rpx',
        height: '128rpx',
        margin: '0 auto',
        borderRadius: '8rpx',
        background: '#FFFFFF',
        padding: '18rpx 26rpx 0 22rpx',
        boxSizing: 'border-box',
        boxShadow: cardShadow,
      }}
    >
      <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: titleColor, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 500 }}>资料完整度</Text>
        <Text style={{ color: mainBlue, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600 }}>评分：50</Text>
      </View>
      <View
        style={{
          position: 'relative',
          width: '650rpx',
          height: '10rpx',
          borderRadius: '10rpx',
          background: '#D6E4FB',
          marginTop: '22rpx',
        }}
      >
        <View style={{ width: '326rpx', height: '10rpx', borderRadius: '10rpx', background: mainBlue }} />
        <View
          style={{
            position: 'absolute',
            left: '322rpx',
            top: '-8rpx',
            width: '26rpx',
            height: '26rpx',
            borderRadius: '26rpx',
            background: mainBlue,
            border: '5rpx solid #FFFFFF',
            boxSizing: 'border-box',
          }}
        />
      </View>
    </View>
  )
}

function TruthNotice() {
  return (
    <View
      style={{
        width: '700rpx',
        height: '88rpx',
        margin: '20rpx auto 0',
        borderRadius: '8rpx',
        background: mainBlue,
        display: 'flex',
        alignItems: 'center',
        padding: '0 26rpx',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          width: '36rpx',
          height: '36rpx',
          borderRadius: '36rpx',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '16rpx',
        }}
      >
        <Text style={{ color: mainBlue, fontSize: '24rpx', lineHeight: '30rpx', fontWeight: 700 }}>✓</Text>
      </View>
      <Text style={{ color: '#FFFFFF', fontSize: '24rpx', lineHeight: '34rpx', fontWeight: 500 }}>
        为保障平台真实性，请您如实填写个人资料。
      </Text>
    </View>
  )
}

function ProfileHeroCard({
  nickname,
  avatar,
  onChangePhoto,
}: {
  nickname: string
  avatar: string
  onChangePhoto: () => void
}) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '714rpx',
        margin: '20rpx auto 0',
        borderRadius: '32rpx',
        overflow: 'hidden',
        background: 'linear-gradient(90deg, #DCF9DB 0%, #DCF3ED 49%, #E6E8FD 100%)',
        boxShadow: cardShadow,
      }}
    >
      <View
        onClick={onChangePhoto}
        style={{
          position: 'absolute',
          right: '24rpx',
          top: '26rpx',
          height: '58rpx',
          padding: '0 26rpx',
          borderRadius: '58rpx',
          background: 'rgba(255,255,255,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: mainBlue, fontSize: '24rpx', lineHeight: '34rpx', fontWeight: 600 }}>更换照片</Text>
      </View>

      <View
        data-role="hero-main-photo"
        onClick={onChangePhoto}
        style={{
          position: 'absolute',
          left: '24rpx',
          top: '104rpx',
          width: '652rpx',
          height: '586rpx',
          borderRadius: '28rpx',
          background: '#EFF6F6',
          overflow: 'hidden',
        }}
      >
        <Image
          src={avatar}
          mode="aspectFill"
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '652rpx',
            height: '586rpx',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '0',
            right: '0',
            bottom: '0',
            height: '188rpx',
            background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(15,35,72,0.58) 100%)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '22rpx',
            right: '22rpx',
            bottom: '22rpx',
            height: '122rpx',
            borderRadius: '24rpx',
            background: 'rgba(255,255,255,0.9)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 22rpx',
            boxSizing: 'border-box',
          }}
        >
          <Image
            data-role="hero-mini-avatar"
            src={avatar}
            mode="aspectFill"
            style={{
              width: '82rpx',
              height: '82rpx',
              borderRadius: '82rpx',
              border: '4rpx solid #FFFFFF',
              boxShadow: '0 8rpx 20rpx rgba(12,40,90,0.12)',
              marginRight: '20rpx',
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ display: 'block', color: titleColor, fontSize: '34rpx', lineHeight: '48rpx', fontWeight: 700 }}>{nickname}</Text>
            <Text style={{ display: 'block', color: '#7F8494', fontSize: '22rpx', lineHeight: '31rpx', marginTop: '4rpx' }}>
              97年丨杭州丨双鱼座
            </Text>
          </View>
          <View
            style={{
              height: '44rpx',
              padding: '0 18rpx',
              borderRadius: '22rpx',
              background: '#E3F1FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: mainBlue, fontSize: '22rpx', lineHeight: '31rpx', fontWeight: 600 }}>已认证</Text>
          </View>
        </View>
        <View
          style={{
            position: 'absolute',
            right: '22rpx',
            top: '22rpx',
            height: '48rpx',
            padding: '0 18rpx',
            borderRadius: '24rpx',
            background: 'rgba(255,255,255,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: mainBlue, fontSize: '22rpx', lineHeight: '31rpx', fontWeight: 600 }}>点击更换</Text>
        </View>
      </View>

      <View style={{ position: 'absolute', left: '54rpx', top: '84rpx', width: '68rpx', height: '68rpx', borderRadius: '68rpx', background: 'rgba(40,118,255,0.16)' }} />
      <View style={{ position: 'absolute', right: '94rpx', bottom: '96rpx', width: '92rpx', height: '92rpx', borderRadius: '92rpx', background: 'rgba(255,255,255,0.45)' }} />
    </View>
  )
}

function PhotoUploadGrid({
  photos,
  onPhotoClick,
}: {
  photos: ProfilePhotoSlot[]
  onPhotoClick: (index: number) => void
}) {
  return (
    <View
      style={{
        width: '700rpx',
        height: '648rpx',
        margin: '20rpx auto 0',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding: '30rpx 26rpx',
        boxSizing: 'border-box',
        boxShadow: cardShadow,
      }}
    >
      <Text style={{ display: 'block', color: mutedColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 600 }}>
        更多照片
      </Text>
      <Text style={{ display: 'block', color: '#B5BAC7', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '8rpx' }}>
        生活照、兴趣照、旅行照、让TA了解不同的你
      </Text>
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '26rpx' }}>
        {photos.map((item, index) => (
          <UploadCard
            key={item.label}
            label={item.label}
            imageUrl={item.imageUrl}
            isLastInRow={(index + 1) % 3 === 0}
            onClick={() => onPhotoClick(index)}
          />
        ))}
      </View>
    </View>
  )
}

function UploadCard({
  label,
  imageUrl,
  isLastInRow,
  onClick,
}: {
  label: string
  imageUrl?: string
  isLastInRow: boolean
  onClick: () => void
}) {
  return (
    <View
      data-role="photo-upload-card"
      onClick={onClick}
      style={{
        position: 'relative',
        width: '198rpx',
        height: '198rpx',
        borderRadius: '12rpx',
        background: '#F6F8FC',
        marginRight: isLastInRow ? '0' : '27rpx',
        marginBottom: '28rpx',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {imageUrl ? (
        <Image src={imageUrl} mode="aspectFill" style={{ position: 'absolute', left: '0', top: '0', width: '198rpx', height: '198rpx' }} />
      ) : null}
      <View
        style={{
          ...(imageUrl
            ? {
                position: 'absolute',
                left: '0',
                right: '0',
                top: '0',
                bottom: '0',
                width: '198rpx',
                height: '198rpx',
              }
            : {
                position: 'relative',
              }),
          background: imageUrl ? 'rgba(12,40,90,0.24)' : 'transparent',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'relative',
            width: '58rpx',
            height: '58rpx',
            borderRadius: '58rpx',
            background: imageUrl ? 'rgba(255,255,255,0.9)' : '#E7EEF9',
            marginBottom: '18rpx',
          }}
        >
          <View style={{ position: 'absolute', left: '15rpx', top: '27rpx', width: '28rpx', height: '4rpx', borderRadius: '4rpx', background: imageUrl ? mainBlue : '#AEB9CA' }} />
          <View style={{ position: 'absolute', left: '27rpx', top: '15rpx', width: '4rpx', height: '28rpx', borderRadius: '4rpx', background: imageUrl ? mainBlue : '#AEB9CA' }} />
        </View>
        <Text style={{ color: imageUrl ? '#FFFFFF' : '#9CA5B8', fontSize: '22rpx', lineHeight: '31rpx', textAlign: 'center' }}>{label}</Text>
      </View>
    </View>
  )
}

function ProfileSection({
  title,
  action,
  onAction,
  children,
}: {
  title: string
  action?: string
  onAction?: () => void
  children: ReactNode
}) {
  return (
    <View
      style={{
        width: '700rpx',
        margin: '20rpx auto 0',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding: '30rpx 26rpx',
        boxSizing: 'border-box',
        boxShadow: cardShadow,
      }}
    >
      <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: titleColor, fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 700 }}>{title}</Text>
        {action ? (
          <View onClick={onAction} style={{ display: 'flex', alignItems: 'center' }}>
            <Text style={{ color: '#9AA1AF', fontSize: '24rpx', lineHeight: '34rpx' }}>{action}</Text>
            <Text style={{ color: '#C0C5D0', fontSize: '34rpx', lineHeight: '34rpx', marginLeft: '8rpx' }}>›</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  )
}

function BasicInfoSection({ onEdit }: { onEdit: () => void }) {
  return (
    <ProfileSection title="基础资料" action="编辑" onAction={onEdit}>
      <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', lineHeight: '40rpx', marginTop: '28rpx' }}>
        女丨97年丨163cm/45kg丨双鱼座
      </Text>
      <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', lineHeight: '40rpx', marginTop: '18rpx' }}>
        现居浙江杭州丨河南人
      </Text>
    </ProfileSection>
  )
}

function CertificationSection({ onUpdate }: { onUpdate: () => void }) {
  const rows = ['头像认证', '实名认证', '学历认证']
  return (
    <ProfileSection title="认证信息" action="更新认证" onAction={onUpdate}>
      <View style={{ marginTop: '16rpx' }}>
        {rows.map((item, index) => (
          <View
            key={item}
            style={{
              height: '78rpx',
              borderBottom: index === rows.length - 1 ? '0' : '1rpx solid #EFF2F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ display: 'flex', alignItems: 'center' }}>
              <View
                style={{
                  width: '36rpx',
                  height: '36rpx',
                  borderRadius: '36rpx',
                  background: 'rgba(40,118,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '18rpx',
                }}
              >
                <Text style={{ color: mainBlue, fontSize: '22rpx', lineHeight: '28rpx', fontWeight: 700 }}>✓</Text>
              </View>
              <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>{item}</Text>
            </View>
            <Text style={{ color: mainBlue, fontSize: '24rpx', lineHeight: '34rpx', fontWeight: 600 }}>已认证</Text>
          </View>
        ))}
      </View>
    </ProfileSection>
  )
}

function AddPrompt({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <View
      onClick={onClick}
      style={{
        minHeight: '88rpx',
        borderRadius: '8rpx',
        background: '#F5F8FF',
        marginTop: '26rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '18rpx 28rpx',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ color: mainBlue, fontSize: '24rpx', lineHeight: '34rpx', fontWeight: 500, textAlign: 'center' }}>
        ＋ {text}
      </Text>
    </View>
  )
}

function SingleLineSection({ title, value, onClick }: { title: string; value: string; onClick: () => void }) {
  return (
    <View
      onClick={onClick}
      style={{
        width: '700rpx',
        height: '104rpx',
        margin: '20rpx auto 0',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding: '0 26rpx',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: cardShadow,
      }}
    >
      <Text style={{ color: titleColor, fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 700 }}>{title}</Text>
      <View style={{ display: 'flex', alignItems: 'center' }}>
        <Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '36rpx' }}>{value}</Text>
        <Text style={{ color: '#C0C5D0', fontSize: '34rpx', lineHeight: '34rpx', marginLeft: '12rpx' }}>›</Text>
      </View>
    </View>
  )
}

function AboutMeSection({
  value,
  onEdit,
}: {
  value: string
  onEdit: () => void
}) {
  return (
    <ProfileSection title="自我介绍" action="编辑" onAction={onEdit}>
      <Text
        style={{
          display: 'block',
          width: '648rpx',
          minHeight: '142rpx',
          color: '#333333',
          fontSize: '26rpx',
          lineHeight: '42rpx',
          marginTop: '22rpx',
        }}
      >
        {value}
      </Text>
    </ProfileSection>
  )
}

function VoiceSection({ onRecord }: { onRecord: () => void }) {
  return (
    <ProfileSection title="语音介绍" action="录音" onAction={onRecord}>
      <View
        onClick={onRecord}
        style={{
          marginTop: '24rpx',
          minHeight: '118rpx',
          borderRadius: '12rpx',
          background: '#F7FAFF',
          padding: '24rpx 26rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '38rpx' }}>
          使用语音介绍特别的你，更容易获得异性青睐哦。
        </Text>
        <Text style={{ display: 'block', color: '#9AA1AF', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '8rpx' }}>
          例如：分享一个你最近很开心的瞬间
        </Text>
      </View>
    </ProfileSection>
  )
}

function MbtiSection({ mbti, onAdd }: { mbti: string; onAdd: () => void }) {
  return (
    <ProfileSection title="MBTI类型" action="添加" onAction={onAdd}>
      <View
        onClick={onAdd}
        style={{
          marginTop: '28rpx',
          height: '162rpx',
          borderRadius: '18rpx',
          background: 'linear-gradient(90deg, #EDF7FF 0%, #F3F6FF 100%)',
          padding: '24rpx 28rpx',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: '98rpx',
            height: '98rpx',
            borderRadius: '98rpx',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '24rpx',
          }}
        >
          <Text style={{ color: mainBlue, fontSize: '26rpx', lineHeight: '36rpx', fontWeight: 800 }}>EN</Text>
        </View>
        <View>
          <Text style={{ display: 'block', color: '#7F8494', fontSize: '24rpx', lineHeight: '34rpx' }}>MBTI类型</Text>
          <Text style={{ display: 'block', color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 700, marginTop: '8rpx' }}>
            {mbti}
          </Text>
        </View>
      </View>
    </ProfileSection>
  )
}

function AboutDetailSection({
  items,
  onAdd,
  onFill,
}: {
  items: AboutTopic[]
  onAdd: () => void
  onFill: (key: string) => void
}) {
  return (
    <ProfileSection title="关于我" action="添加" onAction={onAdd}>
      <View style={{ marginTop: '18rpx' }}>
        {items.map((item, index) => (
          <View
            key={item.title}
            onClick={() => onFill(item.key)}
            style={{
              minHeight: '84rpx',
              borderBottom: index === items.length - 1 ? '0' : '1rpx solid #EFF2F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12rpx 0',
              boxSizing: 'border-box',
            }}
          >
            <View style={{ flex: 1, paddingRight: '20rpx', boxSizing: 'border-box' }}>
              <Text style={{ display: 'block', color: '#333333', fontSize: '27rpx', lineHeight: '38rpx' }}>{item.title}</Text>
              {item.value ? (
                <Text
                  numberOfLines={1}
                  style={{
                    display: 'block',
                    color: '#9AA1AF',
                    fontSize: '22rpx',
                    lineHeight: '31rpx',
                    marginTop: '4rpx',
                  }}
                >
                  {item.value}
                </Text>
              ) : null}
            </View>
            <View
              onClick={(event) => {
                event.stopPropagation()
                onFill(item.key)
              }}
              style={{
                height: '48rpx',
                minWidth: '118rpx',
                padding: '0 22rpx',
                borderRadius: '24rpx',
                background: '#F5F8FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <Text style={{ color: mainBlue, fontSize: '23rpx', lineHeight: '32rpx' }}>
                {item.value ? '去修改' : '去填写'}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <View
        onClick={onAdd}
        style={{
          height: '98rpx',
          borderRadius: '20rpx',
          background: mainBlue,
          marginTop: '30rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 700 }}>去添加</Text>
      </View>
    </ProfileSection>
  )
}

function SongSection({ song, onSwitch }: { song: string; onSwitch: () => void }) {
  return (
    <ProfileSection title="我最爱听的歌曲" action="切换" onAction={onSwitch}>
      <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600, marginTop: '26rpx' }}>
        {song}
      </Text>
      <Text style={{ display: 'block', color: '#9AA1AF', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '12rpx' }}>
        分享你的音乐灵魂，遇见相同频率的人
      </Text>
    </ProfileSection>
  )
}

function WechatSection({ value, onInput }: { value: string; onInput: (value: string) => void }) {
  return (
    <ProfileSection title="添加微信">
      <Input
        value={value}
        placeholder="请输入你的微信号"
        placeholderStyle="color:#B5BAC7;font-size:28rpx;line-height:76rpx"
        onInput={(event) => onInput(event.detail.value)}
        style={{
          width: '648rpx',
          height: '76rpx',
          color: '#333333',
          fontSize: '28rpx',
          lineHeight: '76rpx',
          borderBottom: '1rpx solid #EFF2F7',
          marginTop: '20rpx',
        }}
      />
      <Text style={{ display: 'block', color: '#9AA1AF', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '18rpx' }}>
        仅作为紧急联系方式，不会暴露给用户。
      </Text>
    </ProfileSection>
  )
}

function OptionSheet({
  title,
  value,
  options,
  onCancel,
  onConfirm,
}: {
  title: string
  value: string
  options: string[]
  onCancel: () => void
  onConfirm: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)

  return (
    <View
      style={{
        position: 'fixed',
        left: '0',
        right: '0',
        top: '0',
        bottom: '0',
        background: 'rgba(8, 20, 43, 0.42)',
        zIndex: 20,
      }}
      onClick={onCancel}
    >
      <View
        style={{
          position: 'absolute',
          left: '0',
          bottom: '0',
          width: '750rpx',
          borderRadius: '64rpx 64rpx 0 0',
          background: '#FFFFFF',
          padding: '34rpx 32rpx 56rpx',
          boxSizing: 'border-box',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#8A93A5', fontSize: '28rpx', lineHeight: '40rpx' }} onClick={onCancel}>
            取消
          </Text>
          <Text style={{ color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 700 }}>{title}</Text>
          <Text style={{ color: mainBlue, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }} onClick={() => onConfirm(draft)}>
            确定
          </Text>
        </View>
        <View style={{ marginTop: '28rpx' }}>
          {options.map((item) => {
            const active = item === draft
            return (
              <View
                key={item}
                onClick={() => setDraft(item)}
                style={{
                  height: '76rpx',
                  borderRadius: '16rpx',
                  background: active ? '#E3F1FE' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10rpx',
                }}
              >
                <Text style={{ color: active ? mainBlue : '#333333', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: active ? 700 : 400 }}>
                  {item}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}
