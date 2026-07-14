import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import ProfilePreviewTopNav from '@/components/ProfilePreviewTopNav'
import { miniappOssIcons } from '@/constants/ossIcons'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { BasicProfile, ProfileFieldSetting, ProfileMedia, VerificationStatus, VoiceIntro } from '@/types/prd01'
import ProfilePreviewPage from './components/ProfilePreviewPage'

import editHeroPhoto from '@/assets/lanhu/profile/edit-hero-photo.jpg'
import defaultAvatar from '@/assets/profile/default-avatar.webp'

type EditOptionGroup = {
  title: string
  current: string
  options: string[]
}

type ProfilePhotoSlot = {
  label: string
  imageUrl?: string
  mediaId?: number
}

type AboutTopic = {
  key: string
  title: string
  value?: string
}

type VoiceSheetVariant =
  | 'voice'
  | 'recording'
  | 'exit'
  | 'play'
  | 'complete'
  | 'delete'
  | 'delete-success'

type VoiceState = {
  title: string
  desc: string
  buttonText?: string
  timer?: string
  duration?: string
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
    voiceIntro: {
      title: string
      subtitle?: string
      duration?: string
      statusText?: string
      deleteText?: string
      deleteTitle?: string
      deleteContent?: string
      deleteConfirmText?: string
      deleteCancelText?: string
      successText?: string
      states: Record<VoiceSheetVariant, VoiceState>
    }
  }
  defaultSelectedTags: string[]
}

type SheetState = {
  key: 'goal' | 'relationship' | 'mbti'
  title: string
  value: string
  options: string[]
} | null

const profileDemo: ProfileDemo = {
  nickname: '',
  editProfile: {
    title: '编辑资料',
    datingGoal: { title: '脱单目标', current: '', options: [] },
    relationshipStatus: { title: '感情状态', current: '', options: [] },
    favoriteSongs: { title: '我最爱听的歌曲', selected: [], options: [] },
    aboutMe: { value: '' },
    intro: { value: '' },
    aboutTopics: [],
    voiceIntro: {
      title: '语音介绍',
      deleteTitle: '删除语音介绍',
      deleteContent: '确定删除当前语音介绍吗？',
      deleteConfirmText: '删除',
      deleteCancelText: '取消',
      successText: '语音介绍已删除',
      states: {
        voice: { title: '使用语音介绍特别的你', desc: '更容易获得异性青睐哦', buttonText: '开始录音' },
        recording: { title: '录制中', desc: '请保持安静并清晰表达', timer: '00:00' },
        exit: { title: '退出录音', desc: '退出后本次录音不会保存' },
        play: { title: '试听语音', desc: '听听你的声音', duration: '0s' },
        complete: { title: '录制完成', desc: '可以试听或重新录制', duration: '0s' },
        delete: { title: '删除语音介绍', desc: '确定删除当前语音介绍吗？' },
        'delete-success': { title: '已删除', desc: '语音介绍已删除' },
      },
    },
  },
  defaultSelectedTags: [],
}
const editProfileDemo = profileDemo.editProfile

const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'
const mainBlue = '#2876FF'
const titleColor = '#0C285A'
const cardShadow = '0 18rpx 48rpx rgba(25, 54, 98, 0.06)'
const fontFamily =
  '"PingFang SC", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
const defaultPhotoSlots: ProfilePhotoSlot[] = [
  { label: '笑起来的样子' },
  { label: '生活中的样子' },
  { label: '得意的旅行照' },
  { label: '好看的全身照' },
  { label: '展示才艺的照片' },
  { label: '宠物小伙伴' },
]
const aboutStoryPrompts = ['购车情况?', '是否想要孩子?', '有无子女?', '宠物?', '作息习惯?']

function resolveVoiceSheetVariant(value?: string): VoiceSheetVariant | null {
  if (
    value === 'voice' ||
    value === 'recording' ||
    value === 'exit' ||
    value === 'play' ||
    value === 'complete' ||
    value === 'delete' ||
    value === 'delete-success'
  ) {
    return value
  }
  return null
}

export default function ProfileEditPage() {
  const router = useRouter()
  const [showPreview, setShowPreview] = useState(false)
  const bootstrap = usePrd01Store(state => state.bootstrap)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const [heroPhoto, setHeroPhoto] = useState(editHeroPhoto)
  const [miniAvatar, setMiniAvatar] = useState(defaultAvatar)
  const [profilePhotos, setProfilePhotos] = useState(defaultPhotoSlots)
  const [nickname, setNickname] = useState('待完善昵称')
  const [profileScore, setProfileScore] = useState(0)
  const [basic, setBasic] = useState<BasicProfile>({})
  const [fieldSettings, setFieldSettings] = useState<ProfileFieldSetting[]>([])
  const [verification, setVerification] = useState<VerificationStatus>({})
  const [intro, setIntro] = useState('添加自我介绍，让TA更了解你')
  const [aboutTopics, setAboutTopics] = useState<AboutTopic[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [favoriteSong, setFavoriteSong] = useState('还没有添加喜欢的歌曲')
  const [goal, setGoal] = useState('')
  const [relationship, setRelationship] = useState('佛系交友')
  const [mbti, setMbti] = useState('ENFJ 主人公')
  const [wechat, setWechat] = useState('')
  const [sheet, setSheet] = useState<SheetState>(null)
  const [voiceSheet, setVoiceSheet] = useState<VoiceSheetVariant | null>(() =>
    resolveVoiceSheetVariant(String(router.params.voice || ''))
  )
  const [voiceDetail, setVoiceDetail] = useState<VoiceIntro>()
  const recorder = useRef(Taro.getRecorderManager())
  const discardVoice = useRef(false)

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const [basicResult, home, albums, wechatId, introDetail, aboutDetail, tags, voice] = await Promise.all([
          prd01Api.getBasicProfile(),
          prd01Api.getHomeDetail(),
          prd01Api.getAlbums(),
          prd01Api.getWechatId(),
          prd01Api.getIntroduction(),
          prd01Api.getAboutMe(),
          prd01Api.getTags(),
          prd01Api.getVoiceIntro(),
        ])
        const options = usePrd01Store.getState().profileOptions
        const profile = home.profile
        const avatar = String(profile.avatar || '')
        const nextGoalCode = String(profile.datingGoal || '')
        const nextRelationshipCode = String(profile.emotionalStatus || '')
        setNickname(String(profile.nickname || basicResult.nickname || '待完善昵称'))
        setProfileScore(Number(profile.profileScore || basicResult.profileScore || 0))
        setBasic(basicResult)
        setFieldSettings(home.fieldSettings || basicResult.fieldSettings || [])
        setVerification(home.verificationStatus || {})
        if (avatar) {
          setHeroPhoto(avatar)
          setMiniAvatar(avatar)
        }
        setProfilePhotos(mergeAlbumSlots(albums))
        setGoal(options?.datingGoal.find(option => option.code === nextGoalCode)?.label || '')
        setRelationship(options?.emotionalStatus.find(option => option.code === nextRelationshipCode)?.label || '')
        setWechat(wechatId || '')
        setIntro(introDetail.effectiveContent || introDetail.latestContent || '添加自我介绍，让TA更了解你')
        setAboutTopics(aboutDetail.questions.map(question => ({
          key: question.questionKey,
          title: question.title,
          value: question.effectiveContent || question.latestContent,
        })))
        setSelectedTags(parseTagCodes(tags).map(code => options?.profileTag.find(option => option.code === code)?.label || code))
        const songName = String(profile.favoriteSongName || '')
        const artistName = String(profile.favoriteSongArtist || '')
        if (songName) setFavoriteSong(artistName ? `${songName}｜${artistName}` : songName)
        setVoiceDetail(voice)
      } catch (error) {
        await showError(error)
      }
    })()
  }, [])

  useEffect(() => {
    const manager = recorder.current
    const handleStop = (result: Taro.RecorderManager.OnStopCallbackResult) => {
      if (discardVoice.current) {
        discardVoice.current = false
        return
      }
      void saveVoiceRecording(result.tempFilePath, Math.round(result.duration / 1000))
    }
    const handleError = (error: Taro.RecorderManager.OnErrorCallbackResult) => {
      setVoiceSheet('voice')
      void showError(error)
    }
    manager.onStop(handleStop)
    manager.onError(handleError)
    return () => {
      discardVoice.current = true
      manager.stop()
    }
  }, [])

  const closeSheet = () => setSheet(null)
  const closeVoiceSheet = () => setVoiceSheet(null)

  const saveVoiceRecording = async (filePath: string, duration: number) => {
    const config = usePrd01Store.getState().config
    if (!config) return
    if (duration < config.uploadLimits.voiceMinDuration) {
      setVoiceSheet('voice')
      await Taro.showToast({ title: '录音时长太短，请重新录制', icon: 'none' })
      return
    }
    try {
      const uploaded = await prd01Api.uploadVoice(filePath)
      const saved = await prd01Api.submitVoiceIntro(uploaded.url, duration)
      setVoiceDetail(saved)
      setVoiceSheet('complete')
    } catch (error) {
      setVoiceSheet('voice')
      await showError(error)
    }
  }

  const handleVoiceSheetChange = (variant: VoiceSheetVariant) => {
    if (variant === 'recording') {
      const config = usePrd01Store.getState().config
      const format = config?.uploadLimits.voice.formats[0]
      if (!config || !format) return
      discardVoice.current = false
      recorder.current.start({ duration: config.uploadLimits.voiceMaxDuration * 1000, format: format as keyof Taro.RecorderManager.Format })
      setVoiceSheet('recording')
      return
    }
    if (voiceSheet === 'recording' && variant === 'complete') {
      recorder.current.stop()
      return
    }
    if (voiceSheet === 'recording' && variant === 'exit') {
      discardVoice.current = true
      recorder.current.stop()
    }
    if (variant === 'delete-success') {
      void prd01Api.deleteVoiceIntro().then(() => {
        setVoiceDetail(undefined)
        setVoiceSheet('delete-success')
      }).catch(showError)
      return
    }
    setVoiceSheet(variant)
  }

  const openGoalSheet = () => {
    setSheet({
      key: 'goal',
      title: editProfileDemo.datingGoal.title,
      value: goal,
      options: profileOptions?.datingGoal.map(option => option.label) || [],
    })
  }

  const openRelationshipSheet = () => {
    setSheet({
      key: 'relationship',
      title: editProfileDemo.relationshipStatus.title,
      value: relationship,
      options: profileOptions?.emotionalStatus.map(option => option.label) || [],
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

  const confirmOption = async (value: string) => {
    if (!sheet) return
    try {
      if (sheet.key === 'goal') {
        const option = profileOptions?.datingGoal.find(option => option.label === value)
        if (!option) return
        await prd01Api.saveDatingGoal(option.code)
        setGoal(option.label)
      }
      if (sheet.key === 'relationship') {
        const option = profileOptions?.emotionalStatus.find(option => option.label === value)
        if (!option) return
        await prd01Api.saveEmotionalStatus(option.code)
        setRelationship(option.label)
      }
      if (sheet.key === 'mbti') setMbti(value)
    } catch (error) {
      await showError(error)
      return
    }
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

  const chooseProfileImage = async (onChoose: (path: string) => void | Promise<void>, fallbackTitle: string) => {
    try {
      const result = await Taro.chooseImage({
        count: 1,
        sizeType: ['original'],
        sourceType: ['album', 'camera'],
      })
      const imagePath = result.tempFilePaths?.[0]
      if (!imagePath) {
        Taro.showToast({ title: fallbackTitle, icon: 'none' })
        return
      }
      await onChoose(imagePath)
      Taro.showToast({ title: '已选择照片', icon: 'success' })
    } catch {
      Taro.showToast({ title: fallbackTitle, icon: 'none' })
    }
  }

  const onChangePhoto = () => {
    void chooseProfileImage(async imagePath => {
      const source = usePrd01Store.getState().profileOptions?.avatarSource[0]
      if (!source) throw new Error('头像来源字典为空，请联系管理员')
      const uploaded = await prd01Api.uploadAvatar(imagePath)
      await prd01Api.submitAvatar({ avatarSource: source.code, avatarUrl: uploaded.url })
      setHeroPhoto(uploaded.url)
      setMiniAvatar(uploaded.url)
    }, '更换照片')
  }

  const handlePhotoClick = (index: number) => {
    void chooseProfileImage(async imagePath => {
      const uploaded = await prd01Api.uploadAlbum(imagePath)
      const current = profilePhotos[index]
      const saved = current?.mediaId
        ? await prd01Api.replaceAlbum(current.mediaId, { mediaUrl: uploaded.url, sortOrder: index })
        : await prd01Api.addAlbum({ mediaUrl: uploaded.url, sortOrder: index })
      setProfilePhotos(items => items.map((item, photoIndex) => photoIndex === index ? { ...item, mediaId: saved.mediaId, imageUrl: saved.mediaUrl } : item))
    }, profilePhotos[index]?.label || '添加照片')
  }

  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    }
  }

  // 主页预览等价路由：/pages/profile/index?variant=preview；底部 Tab 页面不使用 navigateTo。
  return showPreview ? (
    <ProfilePreviewPage nickname={nickname} onBack={handleBack} onEdit={() => setShowPreview(false)} />
  ) : (
    <View
      style={{ minHeight: '100vh', background: pageBackground, overflow: 'hidden', fontFamily }}
    >
      <ScrollView scrollY style={{ height: '100vh', width: '750rpx' }} showScrollbar={false}>
        <View
          style={{
            width: '750rpx',
            minHeight: '5812rpx',
            paddingBottom: '210rpx',
            boxSizing: 'border-box',
          }}
        >
          <ProfilePreviewTopNav
            activeTab="form"
            onBack={handleBack}
            onTabChange={tab => {
              if (tab === 'preview') setShowPreview(true)
            }}
          />
          <ProfileScoreCard score={profileScore} onClick={() => handleProfileAction('资料评分')} />
          <TruthNotice />
          <ProfileHeroCard
            nickname={nickname}
            avatar={heroPhoto}
            miniAvatar={miniAvatar}
            onChangePhoto={onChangePhoto}
          />
          <PhotoUploadGrid photos={profilePhotos} onPhotoClick={handlePhotoClick} />
          <BasicInfoSection basic={basic} fieldSettings={fieldSettings}
            onEdit={() => handleProfileAction('基础资料', '/pages/verification/basic?from=profile')}
          />
          <CertificationSection verification={verification}
            onUpdate={() => handleProfileAction('更新认证', '/pages/verification/my-certification')}
          />
          <ProfileSection title="脱单目标">
            <AddPrompt
              text={goal || '添加脱单目标，为你推荐目标一致的人'}
              onClick={openGoalSheet}
            />
          </ProfileSection>
          <SingleLineSection
            title="感情状态"
            value={relationship}
            onClick={openRelationshipSheet}
          />
          <AboutMeSection
            value={intro}
            onEdit={() => handleProfileAction('自我介绍', '/pages/profile-edit/intro')}
          />
          <ProfileSection title="我的标签" padding="24rpx 26rpx">
            <AddPrompt
              text={
                selectedTags.length
                  ? selectedTags.join('、')
                  : '添加标签，让TA更了解你'
              }
              marginTop="10rpx"
              minHeight="72rpx"
              promptPadding="12rpx 20rpx 12rpx 28rpx"
              onClick={() => handleProfileAction('我的标签', '/pages/profile-edit/tags')}
            />
          </ProfileSection>
          <VoiceSection onRecord={() => setVoiceSheet('voice')} />
          <MbtiSection mbti={mbti} onAdd={openMbtiSheet} />
          <AboutDetailSection
            items={aboutTopics}
            onAdd={() => handleProfileAction('关于我', '/pages/profile-edit/about')}
            onFill={key =>
              handleProfileAction(
                '关于我',
                key === 'meet'
                  ? '/pages/profile-edit/about?topic=meet'
                  : `/pages/profile-edit/about?topic=${key}`
              )
            }
          />
          <SongSection
            song={favoriteSong}
            onSwitch={() => handleProfileAction('爱听的歌曲', '/pages/profile-edit/songs')}
          />
          <WechatSection value={wechat} onInput={setWechat} onSave={() => void saveWechat(wechat)} />
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
      {voiceSheet ? (
        <VoiceIntroSheet
          variant={voiceSheet}
          voiceIntro={{ ...editProfileDemo.voiceIntro, duration: voiceDetail?.voiceIntroDuration ? `${voiceDetail.voiceIntroDuration}s` : editProfileDemo.voiceIntro.duration }}
          onClose={closeVoiceSheet}
          onChange={handleVoiceSheetChange}
        />
      ) : null}
    </View>
  )
}

function ProfileScoreCard({ score, onClick }: { score: number; onClick: () => void }) {
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
        <Text
          style={{ color: titleColor, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 500 }}
        >
          资料完整度
        </Text>
        <Text style={{ color: mainBlue, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 600 }}>
          评分：{score}
        </Text>
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
        <View
          style={{ width: '326rpx', height: '10rpx', borderRadius: '10rpx', background: mainBlue }}
        />
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
        <Text style={{ color: mainBlue, fontSize: '24rpx', lineHeight: '30rpx', fontWeight: 700 }}>
          ✓
        </Text>
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
  miniAvatar,
  onChangePhoto,
}: {
  nickname: string
  avatar: string
  miniAvatar: string
  onChangePhoto: () => void
}) {
  return (
    <View
      style={{
        position: 'relative',
        width: '700rpx',
        height: '558rpx',
        margin: '20rpx auto 0',
        borderRadius: '8rpx',
        overflow: 'hidden',
        background: '#EFF6F6',
        boxShadow: cardShadow,
      }}
    >
      <View
        data-role="hero-main-photo"
        onClick={onChangePhoto}
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '700rpx',
          height: '558rpx',
          borderRadius: '8rpx',
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
            width: '700rpx',
            height: '558rpx',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '0',
            right: '0',
            bottom: '0',
            height: '210rpx',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(15,27,48,0.64) 100%)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '36rpx',
            bottom: '34rpx',
            height: '116rpx',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Image
            data-role="hero-mini-avatar"
            src={miniAvatar}
            mode="aspectFit"
            style={{
              width: '104rpx',
              height: '104rpx',
              borderRadius: '104rpx',
              background: '#FFFFFF',
              border: '4rpx solid #FFFFFF',
              boxShadow: '0 8rpx 20rpx rgba(0,0,0,0.18)',
              marginRight: '18rpx',
              boxSizing: 'border-box',
            }}
          />
          <View style={{ minWidth: 0 }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: '32rpx',
                  lineHeight: '45rpx',
                  fontWeight: 700,
                  maxWidth: '360rpx',
                }}
              >
                {nickname}
              </Text>
              <HeroCertBadge />
            </View>
            <Text
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.84)',
                fontSize: '24rpx',
                lineHeight: '34rpx',
                marginTop: '8rpx',
              }}
            >
              97年丨杭州丨双鱼座
            </Text>
          </View>
        </View>
        <View
          onClick={onChangePhoto}
          style={{
            position: 'absolute',
            right: '28rpx',
            top: '28rpx',
            height: '58rpx',
            padding: '0 22rpx 0 24rpx',
            borderRadius: '58rpx',
            background: 'rgba(0,0,0,0.58)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ color: '#FFFFFF', fontSize: '24rpx', lineHeight: '34rpx', fontWeight: 600 }}
          >
            更换照片
          </Text>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: '38rpx',
              lineHeight: '38rpx',
              fontWeight: 300,
              marginLeft: '12rpx',
            }}
          >
            ›
          </Text>
        </View>
      </View>
    </View>
  )
}

function HeroCertBadge({ compact = false }: { compact?: boolean }) {
  return (
    <View
      data-role="hero-cert-badge"
      style={{
        position: 'relative',
        width: compact ? '26rpx' : '32rpx',
        height: compact ? '28rpx' : '36rpx',
        marginLeft: compact ? '0' : '10rpx',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: compact ? '1rpx' : '2rpx',
          top: '0',
          width: compact ? '23rpx' : '28rpx',
          height: compact ? '26rpx' : '32rpx',
          background: mainBlue,
          borderRadius: compact ? '6rpx 6rpx 9rpx 9rpx' : '8rpx 8rpx 12rpx 12rpx',
          transform: 'skewY(-4deg)',
        }}
      />
      <Text
        style={{
          position: 'absolute',
          left: compact ? '6rpx' : '8rpx',
          top: compact ? '2rpx' : '3rpx',
          color: '#FFFFFF',
          fontSize: compact ? '16rpx' : '20rpx',
          lineHeight: compact ? '22rpx' : '26rpx',
          fontWeight: 800,
        }}
      >
        ✓
      </Text>
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
      <View style={{ display: 'flex', alignItems: 'center' }}>
        <SectionTitleDot />
        <Text
          style={{
            display: 'block',
            color: titleColor,
            fontSize: '28rpx',
            lineHeight: '40rpx',
            fontWeight: 700,
          }}
        >
          更多照片
        </Text>
      </View>
      <Text
        style={{
          display: 'block',
          color: '#B5BAC7',
          fontSize: '22rpx',
          lineHeight: '31rpx',
          marginTop: '8rpx',
        }}
      >
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
        <Image
          src={imageUrl}
          mode="aspectFill"
          style={{ position: 'absolute', left: '0', top: '0', width: '198rpx', height: '198rpx' }}
        />
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
        <PhotoUploadPlus active={Boolean(imageUrl)} />
        <Text
          style={{
            color: imageUrl ? '#FFFFFF' : '#9CA5B8',
            fontSize: '22rpx',
            lineHeight: '31rpx',
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  )
}

function PhotoUploadPlus({ active }: { active: boolean }) {
  const color = active ? '#FFFFFF' : '#8E96A7'
  return (
    <View
      style={{
        position: 'relative',
        width: '58rpx',
        height: '58rpx',
        marginBottom: '16rpx',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '6rpx',
          top: '27rpx',
          width: '46rpx',
          height: '5rpx',
          borderRadius: '5rpx',
          background: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '27rpx',
          top: '6rpx',
          width: '5rpx',
          height: '46rpx',
          borderRadius: '5rpx',
          background: color,
        }}
      />
    </View>
  )
}

function ProfileSection({
  title,
  action,
  onAction,
  padding = '30rpx 26rpx',
  children,
}: {
  title: string
  action?: string
  onAction?: () => void
  padding?: string
  children: ReactNode
}) {
  return (
    <View
      style={{
        width: '700rpx',
        margin: '20rpx auto 0',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding,
        boxSizing: 'border-box',
        boxShadow: cardShadow,
      }}
    >
      <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ display: 'flex', alignItems: 'center' }}>
          <SectionTitleDot />
          <Text
            style={{ color: titleColor, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}
          >
            {title}
          </Text>
        </View>
        {action ? (
          <View onClick={onAction} style={{ display: 'flex', alignItems: 'center' }}>
            <Text style={{ color: '#9AA1AF', fontSize: '24rpx', lineHeight: '34rpx' }}>
              {action}
            </Text>
            <Text
              style={{
                color: '#C0C5D0',
                fontSize: '34rpx',
                lineHeight: '34rpx',
                marginLeft: '8rpx',
              }}
            >
              ›
            </Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  )
}

function SectionTitleDot() {
  return (
    <View
      data-role="section-title-dot"
      style={{
        width: '10rpx',
        height: '10rpx',
        borderRadius: '10rpx',
        background: mainBlue,
        marginRight: '12rpx',
        flexShrink: 0,
      }}
    />
  )
}

function BasicInfoSection({ basic, fieldSettings, onEdit }: { basic: BasicProfile; fieldSettings: ProfileFieldSetting[]; onEdit: () => void }) {
  const optionLabel = usePrd01Store.getState().optionLabel
  const visibleFields = new Set(fieldSettings.filter(item => item.visible).map(item => item.fieldId))
  const canShow = (field: string) => visibleFields.size === 0 || visibleFields.has(field)
  const genderText = canShow('gender') ? optionLabel('gender', String(basic.gender || '')) : ''
  const birthday = canShow('birthday') ? String(basic.birthday || '') : ''
  const birthYear = birthday ? `${birthday.slice(2, 4)}年` : ''
  const stature = [canShow('height') && basic.height ? `${basic.height}cm` : '', canShow('weight') && basic.weight ? `${basic.weight}kg` : ''].filter(Boolean).join('/')
  const firstLine = [genderText, birthYear, stature].filter(Boolean).join('丨') || '基础资料待完善'
  const location = String(basic.locationCityLabel || basic.locationCityName || basic.locationCity || '')
  const hometown = String(basic.hometownProvinceLabel || basic.hometownProvinceName || basic.hometownProvince || '')
  const secondLine = [location ? `现居${location}` : '', hometown ? `${hometown}人` : ''].filter(Boolean).join('丨') || '居住地待完善'
  return (
    <ProfileSection title="基础资料" action="编辑" onAction={onEdit}>
      <View style={{ marginTop: '24rpx' }}>
        <BasicInfoRow type="gender" text={firstLine} />
        <BasicInfoRow type="location" text={secondLine} />
      </View>
    </ProfileSection>
  )
}

function BasicInfoRow({ type, text }: { type: 'gender' | 'location'; text: string }) {
  return (
    <View style={{ display: 'flex', alignItems: 'center', height: '40rpx', marginBottom: '14rpx' }}>
      <BasicInfoIcon type={type} />
      <Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '34rpx', fontWeight: 400 }}>
        {text}
      </Text>
    </View>
  )
}

function BasicInfoIcon({ type }: { type: 'gender' | 'location' }) {
  const isGender = type === 'gender'
  return (
    <View
      data-role={`basic-info-icon-${type}`}
      style={{
        position: 'relative',
        width: '30rpx',
        height: '30rpx',
        marginRight: '14rpx',
        flexShrink: 0,
      }}
    >
      {isGender ? (
        <>
          <View
            style={{
              position: 'absolute',
              left: '6rpx',
              top: '1rpx',
              width: '16rpx',
              height: '16rpx',
              borderRadius: '16rpx',
              border: '3rpx solid #FF7D9D',
              boxSizing: 'border-box',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '13rpx',
              top: '17rpx',
              width: '3rpx',
              height: '11rpx',
              borderRadius: '3rpx',
              background: '#FF7D9D',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '9rpx',
              top: '22rpx',
              width: '11rpx',
              height: '3rpx',
              borderRadius: '3rpx',
              background: '#FF7D9D',
            }}
          />
        </>
      ) : (
        <>
          <View
            style={{
              position: 'absolute',
              left: '6rpx',
              top: '2rpx',
              width: '18rpx',
              height: '22rpx',
              borderRadius: '12rpx 12rpx 14rpx 14rpx',
              border: '3rpx solid #7BC8E8',
              boxSizing: 'border-box',
              transform: 'rotate(45deg)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '11rpx',
              top: '8rpx',
              width: '8rpx',
              height: '8rpx',
              borderRadius: '8rpx',
              background: '#7BC8E8',
            }}
          />
        </>
      )}
    </View>
  )
}

function CertificationSection({ verification, onUpdate }: { verification: VerificationStatus; onUpdate: () => void }) {
  const rows = [
    { title: '头像认证', icon: miniappOssIcons.verificationCertAvatar, status: verification.avatarVerifyStatus },
    { title: '实名认证', icon: miniappOssIcons.verificationCertRealName, status: verification.realNameStatus },
    { title: '学历认证', icon: miniappOssIcons.verificationCertEducation, status: verification.educationStatus },
  ]
  return (
    <ProfileSection title="认证信息" action="更新认证" onAction={onUpdate}>
      <View style={{ marginTop: '16rpx' }}>
        {rows.map((item, index) => (
          <View
            key={item.title}
            style={{
              height: '78rpx',
              borderBottom: index === rows.length - 1 ? '0' : '1rpx solid #EFF2F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ display: 'flex', alignItems: 'center' }}>
              <CertificationIcon src={item.icon} />
              <Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '34rpx' }}>
                {item.title}
              </Text>
            </View>
            <View style={{ display: 'flex', alignItems: 'center' }}>
              <CertifiedStatusIcon />
              <Text
                style={{
                  color: '#666666',
                  fontSize: '24rpx',
                  lineHeight: '34rpx',
                  marginLeft: '8rpx',
                }}
              >
                {isCertificationPassed(item.status) ? '已认证' : '待认证'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ProfileSection>
  )
}

function CertificationIcon({ src }: { src: string }) {
  return (
    <Image
      data-role="certification-icon"
      src={src}
      mode="aspectFit"
      style={{
        width: '38rpx',
        height: '38rpx',
        marginRight: '18rpx',
        flexShrink: 0,
      }}
    />
  )
}

function CertifiedStatusIcon() {
  return (
    <View
      data-role="certified-status-icon"
      style={{
        position: 'relative',
        width: '34rpx',
        height: '36rpx',
        flexShrink: 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '3rpx',
          top: '1rpx',
          width: '28rpx',
          height: '32rpx',
          borderRadius: '8rpx 8rpx 12rpx 12rpx',
          background: mainBlue,
          transform: 'skewY(-4deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '10rpx',
          top: '12rpx',
          width: '14rpx',
          height: '8rpx',
          borderLeft: '4rpx solid #FFFFFF',
          borderBottom: '4rpx solid #FFFFFF',
          transform: 'rotate(-45deg)',
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}

function AddPrompt({
  text,
  onClick,
  marginTop = '26rpx',
  minHeight = '88rpx',
  promptPadding = '18rpx 20rpx 18rpx 28rpx',
}: {
  text: string
  onClick: () => void
  marginTop?: string
  minHeight?: string
  promptPadding?: string
}) {
  return (
    <View
      onClick={onClick}
      style={{
        minHeight,
        borderRadius: '8rpx',
        background: '#FBFDFF',
        border: '2rpx dashed #D8E8FF',
        marginTop,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: promptPadding,
        boxSizing: 'border-box',
      }}
    >
      <Text
        style={{
          color: mainBlue,
          fontSize: '24rpx',
          lineHeight: '34rpx',
          fontWeight: 500,
          flex: 1,
          paddingRight: '18rpx',
        }}
      >
        {text}
      </Text>
      <AddPromptPlus />
    </View>
  )
}

function AddPromptPlus() {
  return (
    <View
      data-role="add-prompt-plus"
      style={{
        position: 'relative',
        width: '42rpx',
        height: '42rpx',
        flexShrink: 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '5rpx',
          top: '19rpx',
          width: '32rpx',
          height: '4rpx',
          borderRadius: '4rpx',
          background: mainBlue,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '19rpx',
          top: '5rpx',
          width: '4rpx',
          height: '32rpx',
          borderRadius: '4rpx',
          background: mainBlue,
        }}
      />
    </View>
  )
}

function SingleLineSection({
  title,
  value,
  onClick,
}: {
  title: string
  value: string
  onClick: () => void
}) {
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
      <View style={{ display: 'flex', alignItems: 'center' }}>
        <SectionTitleDot />
        <Text
          style={{ color: titleColor, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}
        >
          {title}
        </Text>
      </View>
      <View style={{ display: 'flex', alignItems: 'center' }}>
        <Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '36rpx' }}>{value}</Text>
        <Text
          style={{ color: '#C0C5D0', fontSize: '34rpx', lineHeight: '34rpx', marginLeft: '12rpx' }}
        >
          ›
        </Text>
      </View>
    </View>
  )
}

function AboutMeSection({ value, onEdit }: { value: string; onEdit: () => void }) {
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
        <Text
          style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '38rpx' }}
        >
          使用语音介绍特别的你，更容易获得异性青睐哦。
        </Text>
        <Text
          style={{
            display: 'block',
            color: '#9AA1AF',
            fontSize: '24rpx',
            lineHeight: '34rpx',
            marginTop: '8rpx',
          }}
        >
          例如：唱歌、一段深情的告白等等
        </Text>
      </View>
    </ProfileSection>
  )
}

function MbtiSection({ mbti, onAdd }: { mbti: string; onAdd: () => void }) {
  return (
    <ProfileSection title="MBTI类型" action="添加" onAction={onAdd}>
      <MbtiOrbChart mbti={mbti} onClick={onAdd} />
    </ProfileSection>
  )
}

function MbtiOrbChart({ mbti, onClick }: { mbti: string; onClick: () => void }) {
  return (
    <View
      data-role="mbti-orb-chart"
      onClick={onClick}
      style={{
        position: 'relative',
        height: '430rpx',
        marginTop: '18rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '126rpx',
          top: '44rpx',
          width: '92rpx',
          height: '92rpx',
          borderRadius: '92rpx',
          background: 'rgba(217,221,255,0.42)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '94rpx',
          top: '68rpx',
          width: '40rpx',
          height: '40rpx',
          borderRadius: '40rpx',
          background: 'rgba(255,213,170,0.58)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '72rpx',
          bottom: '66rpx',
          width: '136rpx',
          height: '136rpx',
          borderRadius: '136rpx',
          background: 'rgba(179,249,229,0.56)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '72rpx',
          bottom: '76rpx',
          width: '108rpx',
          height: '108rpx',
          borderRadius: '108rpx',
          background: 'rgba(255,215,210,0.62)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: '176rpx',
          top: '210rpx',
          width: '16rpx',
          height: '16rpx',
          borderRadius: '16rpx',
          background: 'rgba(40,118,255,0.28)',
        }}
      />
      <View
        style={{
          width: '214rpx',
          height: '214rpx',
          borderRadius: '214rpx',
          background: 'linear-gradient(180deg, #D8E7FF 0%, #EAF1FF 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 16rpx 36rpx rgba(40,118,255,0.08)',
        }}
      >
        <Text style={{ color: '#7EA4D8', fontSize: '22rpx', lineHeight: '31rpx' }}>MBTI类型</Text>
        <Text
          style={{
            color: mainBlue,
            fontSize: '26rpx',
            lineHeight: '36rpx',
            fontWeight: 800,
            marginTop: '8rpx',
          }}
        >
          {mbti}
        </Text>
      </View>
    </View>
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
    <ProfileSection title="关于我" action="添加" onAction={onAdd} padding="24rpx 26rpx">
      <View data-role="about-detail-list" style={{ marginTop: '8rpx' }}>
        {items.map((item, index) => (
          <View
            key={item.title}
            onClick={() => onFill(item.key)}
            style={{
              minHeight: '104rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: index === 0 ? '2rpx 0 10rpx' : '10rpx 0',
              boxSizing: 'border-box',
            }}
          >
            <View style={{ flex: 1, paddingRight: '28rpx', boxSizing: 'border-box' }}>
              <Text
                style={{
                  display: 'block',
                  color: titleColor,
                  fontSize: '28rpx',
                  lineHeight: '38rpx',
                  fontWeight: 700,
                }}
              >
                {item.title}
              </Text>
              {item.value ? (
                <Text
                  numberOfLines={2}
                  style={{
                    display: 'block',
                    color: '#9B9FA8',
                    fontSize: '25rpx',
                    lineHeight: '36rpx',
                    marginTop: '6rpx',
                  }}
                >
                  {item.value}
                </Text>
              ) : null}
            </View>
            <View
              onClick={event => {
                event.stopPropagation()
                onFill(item.key)
              }}
              style={{
                minWidth: '108rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                boxSizing: 'border-box',
              }}
            >
              <Text
                data-role="about-action-text"
                style={{ color: mainBlue, fontSize: '26rpx', lineHeight: '36rpx', fontWeight: 700 }}
              >
                去填写
              </Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ height: '1rpx', background: '#EFF2F7', marginTop: '4rpx' }} />
      <Text
        style={{
          display: 'block',
          color: titleColor,
          fontSize: '28rpx',
          lineHeight: '40rpx',
          fontWeight: 700,
          marginTop: '20rpx',
        }}
      >
        补充更多关于我的故事
      </Text>
      <AboutStoryChips onClick={onAdd} />
      <View
        onClick={onAdd}
        style={{
          height: '86rpx',
          borderRadius: '20rpx',
          background: mainBlue,
          marginTop: '22rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: '46rpx',
            lineHeight: '46rpx',
            fontWeight: 300,
            marginRight: '12rpx',
          }}
        >
          +
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: '34rpx', lineHeight: '48rpx', fontWeight: 700 }}>
          去添加
        </Text>
      </View>
    </ProfileSection>
  )
}

function AboutStoryChips({ onClick }: { onClick: () => void }) {
  return (
    <ScrollView
      scrollX
      style={{ width: '648rpx', whiteSpace: 'nowrap', marginTop: '22rpx' }}
      showScrollbar={false}
    >
      <View style={{ display: 'flex', flexDirection: 'row' }}>
        {aboutStoryPrompts.map(item => (
          <View
            key={item}
            onClick={onClick}
            style={{
              height: '54rpx',
              borderRadius: '28rpx',
              background: '#FAFAFB',
              padding: '0 20rpx',
              marginRight: '14rpx',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Text style={{ color: '#9B9FA8', fontSize: '24rpx', lineHeight: '34rpx' }}>{item}</Text>
            <AboutStoryChipPlus />
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function AboutStoryChipPlus() {
  return (
    <View
      data-role="about-story-chip-plus"
      style={{
        position: 'relative',
        width: '24rpx',
        height: '24rpx',
        marginLeft: '10rpx',
        flexShrink: 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '2rpx',
          top: '11rpx',
          width: '20rpx',
          height: '3rpx',
          borderRadius: '3rpx',
          background: '#8B909B',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '11rpx',
          top: '2rpx',
          width: '3rpx',
          height: '20rpx',
          borderRadius: '3rpx',
          background: '#8B909B',
        }}
      />
    </View>
  )
}

function SongSection({ song, onSwitch }: { song: string; onSwitch: () => void }) {
  return (
    <ProfileSection title="我最爱听的歌曲" action="切换" onAction={onSwitch}>
      <View style={{ display: 'flex', alignItems: 'center', marginTop: '30rpx' }}>
        <MusicDiscIcon />
        <View style={{ minWidth: 0, flex: 1, marginLeft: '24rpx' }}>
          <Text
            style={{
              display: 'block',
              color: '#333333',
              fontSize: '28rpx',
              lineHeight: '40rpx',
              fontWeight: 700,
            }}
          >
            {song}
          </Text>
          <Text
            style={{
              display: 'block',
              color: '#666666',
              fontSize: '24rpx',
              lineHeight: '34rpx',
              marginTop: '10rpx',
            }}
          >
            分享你的音乐灵魂，遇见相同频率的人
          </Text>
        </View>
      </View>
    </ProfileSection>
  )
}

function MusicDiscIcon() {
  return (
    <View
      data-role="music-disc-icon"
      style={{
        position: 'relative',
        width: '82rpx',
        height: '82rpx',
        borderRadius: '82rpx',
        background: 'linear-gradient(135deg, #79A1FF 0%, #2876FF 100%)',
        flexShrink: 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '19rpx',
          top: '20rpx',
          width: '30rpx',
          height: '30rpx',
          borderRadius: '30rpx',
          background: '#DBE8FF',
          border: '3rpx solid rgba(255,255,255,0.75)',
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '28rpx',
          top: '29rpx',
          width: '12rpx',
          height: '12rpx',
          borderRadius: '12rpx',
          background: '#FFFFFF',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '47rpx',
          top: '18rpx',
          width: '4rpx',
          height: '38rpx',
          borderRadius: '4rpx',
          background: '#FFFFFF',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '49rpx',
          top: '18rpx',
          width: '18rpx',
          height: '10rpx',
          borderTop: '4rpx solid #FFFFFF',
          borderRight: '4rpx solid #FFFFFF',
          borderRadius: '0 10rpx 0 0',
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '39rpx',
          top: '52rpx',
          width: '20rpx',
          height: '15rpx',
          borderRadius: '50%',
          background: '#FFFFFF',
          transform: 'rotate(-12deg)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '21rpx',
          top: '19rpx',
          width: '5rpx',
          height: '5rpx',
          borderRadius: '5rpx',
          background: '#8CB2FF',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '41rpx',
          top: '38rpx',
          width: '5rpx',
          height: '5rpx',
          borderRadius: '5rpx',
          background: '#8CB2FF',
        }}
      />
    </View>
  )
}

function WechatSection({ value, onInput, onSave }: { value: string; onInput: (value: string) => void; onSave: () => void }) {
  return (
    <ProfileSection title="添加微信">
      <View
        data-role="wechat-input-box"
        style={{
          width: '648rpx',
          height: '90rpx',
          borderRadius: '6rpx',
          background: '#F7F8FA',
          marginTop: '26rpx',
          padding: '0 28rpx',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Input
          value={value}
          placeholder="请输入你的微信号"
          placeholderStyle="color:#9B9FA8;font-size:28rpx;line-height:90rpx"
          onInput={event => onInput(event.detail.value)}
          onBlur={onSave}
          style={{
            width: '592rpx',
            height: '90rpx',
            color: '#333333',
            fontSize: '28rpx',
            lineHeight: '90rpx',
          }}
        />
      </View>
      <Text
        style={{
          display: 'block',
          color: '#9B9FA8',
          fontSize: '26rpx',
          lineHeight: '36rpx',
          marginTop: '34rpx',
        }}
      >
        仅作为紧急联系方式，不会暴露给用户。
      </Text>
    </ProfileSection>
  )
}

function VoiceIntroSheet({
  variant,
  voiceIntro,
  onClose,
  onChange,
}: {
  variant: VoiceSheetVariant
  voiceIntro: ProfileDemo['editProfile']['voiceIntro']
  onClose: () => void
  onChange: (variant: VoiceSheetVariant) => void
}) {
  const showConfirm = variant === 'exit' || variant === 'delete'
  const baseVariant: VoiceSheetVariant =
    variant === 'exit' ? 'recording' : variant === 'delete' ? 'complete' : variant
  const state = voiceIntro.states[baseVariant] || voiceIntro.states.voice
  const isVoice = baseVariant === 'voice'
  const isRecording = baseVariant === 'recording'
  const isPlay = baseVariant === 'play'
  const isComplete =
    baseVariant === 'complete' || baseVariant === 'play' || baseVariant === 'delete-success'

  const handleBackdrop = () => {
    if (isRecording) {
      onChange('exit')
      return
    }
    onClose()
  }

  const handleMainAction = () => {
    if (baseVariant === 'voice') {
      onChange('recording')
      return
    }
    if (baseVariant === 'recording') {
      onChange('complete')
      return
    }
    if (baseVariant === 'play') {
      onChange('complete')
      return
    }
    onClose()
  }

  return (
    <View
      style={{
        position: 'fixed',
        left: '0',
        right: '0',
        top: '0',
        bottom: '0',
        background: 'rgba(0,0,0,0.38)',
        zIndex: 80,
      }}
      onClick={handleBackdrop}
    >
      {variant === 'delete-success' ? (
        <VoiceToast text={voiceIntro.successText || '语音介绍已删除'} />
      ) : null}
      <View
        style={{
          position: 'absolute',
          left: '0',
          bottom: '0',
          width: '750rpx',
          minHeight: isVoice ? '618rpx' : '548rpx',
          borderRadius: '64rpx 64rpx 0 0',
          background: '#FFFFFF',
          padding: '55rpx 30rpx calc(48rpx + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
        }}
        onClick={event => event.stopPropagation()}
      >
        <Text
          style={{
            display: 'block',
            color: '#333333',
            fontSize: '34rpx',
            lineHeight: '48rpx',
            fontWeight: 800,
            textAlign: 'center',
          }}
        >
          {isVoice ? '使用语音介绍特别的你' : state.title}
        </Text>
        <Text
          style={{
            display: 'block',
            color: '#999999',
            fontSize: '28rpx',
            lineHeight: '44rpx',
            textAlign: 'center',
            marginTop: isVoice ? '18rpx' : '22rpx',
          }}
        >
          {isVoice
            ? '更容易获得异性青睐哦\n例如：唱歌、一段深情的告白等等'
            : state.timer || state.duration || voiceIntro.duration || '1S'}
        </Text>

        <View
          style={{
            position: 'relative',
            height: isVoice ? '286rpx' : '248rpx',
            marginTop: isVoice ? '42rpx' : '38rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VoiceWave active={isRecording || isPlay || isComplete} />
          <VoiceRoundButton variant={baseVariant} onClick={handleMainAction} />
        </View>

        {isComplete ? (
          <View
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '0 64rpx',
              boxSizing: 'border-box',
              marginTop: '-2rpx',
            }}
          >
            <VoiceActionButton
              label={voiceIntro.deleteText || '删除'}
              tone="muted"
              symbol="×"
              onClick={() => onChange('delete')}
            />
            <VoiceActionButton
              label={isPlay ? '暂停' : '点击播放'}
              tone="primary"
              symbol={isPlay ? 'Ⅱ' : '▶'}
              onClick={() => onChange(isPlay ? 'complete' : 'play')}
            />
            <VoiceActionButton label="完成" tone="primary" symbol="✓" onClick={onClose} />
          </View>
        ) : (
          <Text
            style={{
              display: 'block',
              color: '#333333',
              fontSize: '32rpx',
              lineHeight: '45rpx',
              fontWeight: 800,
              textAlign: 'center',
              marginTop: isVoice ? '0' : '-2rpx',
            }}
          >
            {isRecording ? '点击完成录音' : state.buttonText || '点击录音'}
          </Text>
        )}
      </View>

      {showConfirm ? (
        <VoiceConfirmDialog
          title={variant === 'exit' ? '退出提示' : voiceIntro.deleteTitle || '删除提示'}
          content={
            variant === 'exit'
              ? '退出录音后当前录音丢失，确定要关闭吗？'
              : voiceIntro.deleteContent || '一旦删除不可恢复，确定删除吗？'
          }
          leftText={variant === 'exit' ? '删除' : voiceIntro.deleteText || '删除'}
          rightText="确认"
          onLeft={() => onChange(variant === 'exit' ? 'voice' : 'delete-success')}
          onRight={() => onChange(variant === 'exit' ? 'voice' : 'delete-success')}
        />
      ) : null}
    </View>
  )
}

function VoiceWave({ active }: { active: boolean }) {
  const bars = [42, 68, 98, 56, 126, 72, 44, 112, 76, 128, 66, 92, 54, 34]
  return (
    <View
      style={{
        position: 'absolute',
        left: '128rpx',
        right: '128rpx',
        top: '55rpx',
        height: '160rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {bars.map((height, index) => (
        <View
          key={`${height}-${index}`}
          style={{
            width: '10rpx',
            height: `${active ? height : Math.max(18, Math.round(height * 0.48))}rpx`,
            borderRadius: '10rpx',
            background: active ? '#EEF4FC' : '#F5F7FA',
          }}
        />
      ))}
    </View>
  )
}

function VoiceRoundButton({
  variant,
  onClick,
}: {
  variant: VoiceSheetVariant
  onClick: () => void
}) {
  const recording = variant === 'recording'
  const play = variant === 'play'
  const symbol = recording ? '' : play ? 'Ⅱ' : variant === 'voice' ? '' : '▶'
  return (
    <View
      onClick={onClick}
      style={{
        position: 'relative',
        width: '166rpx',
        height: '166rpx',
        borderRadius: '166rpx',
        background: '#E3F1FE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: '104rpx',
          height: '104rpx',
          borderRadius: '104rpx',
          background: mainBlue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12rpx 32rpx rgba(40,118,255,0.22)',
        }}
      >
        {recording ? (
          <View
            style={{
              width: '42rpx',
              height: '42rpx',
              borderRadius: '42rpx',
              background: mainBlue,
              border: '28rpx solid #FFFFFF',
              boxSizing: 'border-box',
            }}
          />
        ) : null}
        {variant === 'voice' ? <MicIcon /> : null}
        {symbol ? (
          <Text
            style={{ color: '#FFFFFF', fontSize: '50rpx', lineHeight: '58rpx', fontWeight: 800 }}
          >
            {symbol}
          </Text>
        ) : null}
      </View>
      {recording ? (
        <View
          style={{
            position: 'absolute',
            left: '30rpx',
            top: '30rpx',
            width: '106rpx',
            height: '106rpx',
            borderRadius: '106rpx',
            border: `5rpx solid ${mainBlue}`,
            borderLeftColor: 'transparent',
            boxSizing: 'border-box',
          }}
        />
      ) : null}
    </View>
  )
}

function MicIcon() {
  return (
    <View style={{ position: 'relative', width: '46rpx', height: '58rpx' }}>
      <View
        style={{
          position: 'absolute',
          left: '12rpx',
          top: '0',
          width: '22rpx',
          height: '36rpx',
          borderRadius: '14rpx',
          background: '#FFFFFF',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '5rpx',
          top: '20rpx',
          width: '36rpx',
          height: '24rpx',
          borderLeft: '5rpx solid #FFFFFF',
          borderRight: '5rpx solid #FFFFFF',
          borderBottom: '5rpx solid #FFFFFF',
          borderRadius: '0 0 22rpx 22rpx',
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '20rpx',
          top: '43rpx',
          width: '6rpx',
          height: '12rpx',
          background: '#FFFFFF',
          borderRadius: '6rpx',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '10rpx',
          bottom: '0',
          width: '26rpx',
          height: '5rpx',
          background: '#FFFFFF',
          borderRadius: '5rpx',
        }}
      />
    </View>
  )
}

function VoiceActionButton({
  label,
  tone,
  symbol,
  onClick,
}: {
  label: string
  tone: 'muted' | 'primary'
  symbol: string
  onClick: () => void
}) {
  const active = tone === 'primary'
  return (
    <View
      onClick={onClick}
      style={{ width: '150rpx', display: 'flex', alignItems: 'center', flexDirection: 'column' }}
    >
      <View
        style={{
          width: '76rpx',
          height: '76rpx',
          borderRadius: '76rpx',
          background: active ? mainBlue : '#B8B8B8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '42rpx', lineHeight: '48rpx', fontWeight: 800 }}>
          {symbol}
        </Text>
      </View>
      <Text
        style={{
          color: '#333333',
          fontSize: '30rpx',
          lineHeight: '42rpx',
          fontWeight: 800,
          marginTop: '24rpx',
        }}
      >
        {label}
      </Text>
    </View>
  )
}

function VoiceConfirmDialog({
  title,
  content,
  leftText,
  rightText,
  onLeft,
  onRight,
}: {
  title: string
  content: string
  leftText: string
  rightText: string
  onLeft: () => void
  onRight: () => void
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '65rpx',
        top: '386rpx',
        width: '620rpx',
        minHeight: '312rpx',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding: '52rpx 44rpx 34rpx',
        boxSizing: 'border-box',
        zIndex: 90,
      }}
      onClick={event => event.stopPropagation()}
    >
      <Text
        style={{
          display: 'block',
          color: '#333333',
          fontSize: '36rpx',
          lineHeight: '50rpx',
          fontWeight: 800,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          display: 'block',
          color: '#666666',
          fontSize: '28rpx',
          lineHeight: '40rpx',
          textAlign: 'center',
          marginTop: '36rpx',
        }}
      >
        {content}
      </Text>
      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '42rpx',
        }}
      >
        <View
          onClick={onLeft}
          style={{
            width: '258rpx',
            height: '68rpx',
            borderRadius: '6rpx',
            background: '#F7F7F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}
          >
            {leftText}
          </Text>
        </View>
        <View
          onClick={onRight}
          style={{
            width: '258rpx',
            height: '68rpx',
            borderRadius: '6rpx',
            background: mainBlue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}
          >
            {rightText}
          </Text>
        </View>
      </View>
    </View>
  )
}

function VoiceToast({ text }: { text: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '230rpx',
        top: '430rpx',
        width: '290rpx',
        height: '84rpx',
        borderRadius: '8rpx',
        background: 'rgba(0,0,0,0.34)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 92,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: '28rpx', lineHeight: '40rpx' }}>{text}</Text>
    </View>
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
        onClick={event => event.stopPropagation()}
      >
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{ color: '#8A93A5', fontSize: '28rpx', lineHeight: '40rpx' }}
            onClick={onCancel}
          >
            取消
          </Text>
          <Text
            style={{ color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 700 }}
          >
            {title}
          </Text>
          <Text
            style={{ color: mainBlue, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: 700 }}
            onClick={() => onConfirm(draft)}
          >
            确定
          </Text>
        </View>
        <View style={{ marginTop: '28rpx' }}>
          {options.map(item => {
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
                <Text
                  style={{
                    color: active ? mainBlue : '#333333',
                    fontSize: '28rpx',
                    lineHeight: '40rpx',
                    fontWeight: active ? 700 : 400,
                  }}
                >
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

function mergeAlbumSlots(albums: ProfileMedia[]) {
  return defaultPhotoSlots.map((slot, index) => {
    const media = [...albums].sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))[index]
    return media ? { ...slot, mediaId: media.mediaId, imageUrl: media.mediaUrl } : slot
  })
}

function parseTagCodes(value: string) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    // 兼容后端返回逗号分隔 code。
  }
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function isCertificationPassed(status?: string) {
  return ['PASSED', 'APPROVED', 'VERIFIED', 'SUCCESS'].includes(String(status || '').toUpperCase())
}

async function saveWechat(wechatId: string) {
  try {
    await prd01Api.saveWechatId(wechatId.trim())
    await Taro.showToast({ title: '保存成功', icon: 'success' })
  } catch (error) {
    await showError(error)
  }
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
