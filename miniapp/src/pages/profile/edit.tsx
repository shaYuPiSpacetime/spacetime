import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import ProfilePreviewTopNav from '@/components/ProfilePreviewTopNav'
import ProfileTagChip from '@/components/ProfileTagChip'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  buildBasicProfileBirthYearText,
  buildBasicProfileLocationText,
} from '@/domain/basicProfilePresentation'
import {
  buildProfileAboutSummary,
  resolveOwnerVisibleText,
  type ProfileAboutSummaryItem,
} from '@/domain/profileAboutPresentation'
import { normalizeOptionalWechatId } from '@/domain/profileWechat'
import { prd01Api } from '@/services/prd01'
import { usePrd01Store } from '@/stores/prd01Store'
import type { BasicProfile, ProfileFieldSetting, ProfileMedia, RegionTreeOption, VerificationStatus, VoiceIntro } from '@/types/prd01'
import { PROFILE_UPDATED_EVENT, type ProfileEditUpdate } from '@/utils/profileEditEvents'
import type { ProfileTagItem } from '@/utils/profileTags'
import {
  getVoiceRecordingSeconds,
  resolveVoiceDuration,
} from '@/utils/voiceRecording'
import ProfileHeroImage from './components/ProfileHeroImage'
import ProfilePreviewPage, { type ProfilePreviewModel } from './components/ProfilePreviewPage'

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
    aboutTopics: ProfileAboutSummaryItem[]
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
  key: 'goal' | 'relationship'
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
      deleteTitle: '删除提示',
      deleteContent: '一旦删除不可恢复，确定删除吗？',
      deleteConfirmText: '确认',
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
const ABOUT_ROW_GAP_RPX = 18
const ABOUT_LINE_HEIGHT_RPX = 42
const defaultPhotoSlots: ProfilePhotoSlot[] = [
  { label: '笑起来的样子' },
  { label: '生活中的样子' },
  { label: '得意的旅行照' },
  { label: '好看的全身照' },
  { label: '展示才艺的照片' },
  { label: '宠物小伙伴' },
]
const aboutStoryPrompts = ['购车情况?', '是否想要孩子?', '有无子女?']

type VoiceRecorderSession = {
  onStart: () => void
  onStop: (result: Taro.RecorderManager.OnStopCallbackResult) => void
  onError: (error: Taro.RecorderManager.OnErrorCallbackResult) => void
  onPause: () => void
  onResume: () => void
  onInterruptionEnd: () => void
}

let sharedVoiceRecorderManager: ReturnType<typeof Taro.getRecorderManager> | undefined
let voiceRecorderEventsBound = false
let activeVoiceRecorderSession: VoiceRecorderSession | undefined

function getSharedVoiceRecorderManager() {
  if (!sharedVoiceRecorderManager) sharedVoiceRecorderManager = Taro.getRecorderManager()
  const manager = sharedVoiceRecorderManager
  if (!voiceRecorderEventsBound) {
    voiceRecorderEventsBound = true
    manager.onStart(() => activeVoiceRecorderSession?.onStart())
    manager.onStop(result => activeVoiceRecorderSession?.onStop(result))
    manager.onError(error => activeVoiceRecorderSession?.onError(error))
    manager.onPause(() => activeVoiceRecorderSession?.onPause())
    manager.onResume(() => activeVoiceRecorderSession?.onResume())
    manager.onInterruptionBegin(() => activeVoiceRecorderSession?.onPause())
    manager.onInterruptionEnd(() => activeVoiceRecorderSession?.onInterruptionEnd())
  }
  return manager
}

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
  const config = usePrd01Store(state => state.config)
  const profileOptions = usePrd01Store(state => state.profileOptions)
  const [profileAvatar, setProfileAvatar] = useState('')
  const [profileBackground, setProfileBackground] = useState('')
  const [profilePhotos, setProfilePhotos] = useState(defaultPhotoSlots)
  const [nickname, setNickname] = useState('')
  const [profileScore, setProfileScore] = useState(0)
  const [basic, setBasic] = useState<BasicProfile>({})
  const [regionTree, setRegionTree] = useState<RegionTreeOption[]>([])
  const [fieldSettings, setFieldSettings] = useState<ProfileFieldSetting[]>([])
  const [verification, setVerification] = useState<VerificationStatus>({})
  const [intro, setIntro] = useState('')
  const [aboutTopics, setAboutTopics] = useState<ProfileAboutSummaryItem[]>(() =>
    buildProfileAboutSummary([])
  )
  const [selectedTags, setSelectedTags] = useState<ProfileTagItem[]>([])
  const [favoriteSong, setFavoriteSong] = useState('')
  const [goal, setGoal] = useState('')
  const [relationship, setRelationship] = useState('')
  const [wechat, setWechat] = useState('')
  const [sheet, setSheet] = useState<SheetState>(null)
  const [voiceSheet, setVoiceSheet] = useState<VoiceSheetVariant | null>(() =>
    resolveVoiceSheetVariant(String(router.params.voice || ''))
  )
  const [voiceDetail, setVoiceDetail] = useState<VoiceIntro>()
  const voiceDetailRef = useRef<VoiceIntro>()
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [voiceTempPath, setVoiceTempPath] = useState('')
  const [voiceTempDuration, setVoiceTempDuration] = useState(0)
  const [voiceSaving, setVoiceSaving] = useState(false)
  const [restoredScrollTop, setRestoredScrollTop] = useState(0)
  const scrollTopRef = useRef(0)
  const recorder = useRef(getSharedVoiceRecorderManager())
  const discardVoice = useRef(false)
  const recorderActive = useRef(false)
  const recorderStarting = useRef(false)
  const recordingStopRequested = useRef(false)
  const recordingStartedAt = useRef(0)
  const recordingSecondsRef = useRef(0)
  const recordingTimer = useRef<ReturnType<typeof setInterval>>()
  const voiceAudio = useRef<ReturnType<typeof Taro.createInnerAudioContext>>()

  useEffect(() => {
    void (async () => {
      try {
        await bootstrap()
        const regionTreePromise = usePrd01Store.getState().provinceCities().catch(() => [])
        const [basicResult, home, albums, wechatId, introDetail, aboutDetail, tags, voice, regions] = await Promise.all([
          prd01Api.getBasicProfile(),
          prd01Api.getHomeDetail(),
          prd01Api.getAlbums(),
          prd01Api.getWechatId(),
          prd01Api.getIntroduction(),
          prd01Api.getAboutMe(),
          prd01Api.getTags(),
          prd01Api.getVoiceIntro(),
          regionTreePromise,
        ])
        const options = usePrd01Store.getState().profileOptions
        const profile = home.profile
        const avatar = String(profile.avatar || '')
        const background = String(profile.profileBgImage || '')
        setProfileBackground(background)
        const nextGoalCode = String(profile.datingGoal || '')
        const nextRelationshipCode = String(profile.emotionalStatus || '')
        setNickname(String(profile.nickname || basicResult.nickname || ''))
        setProfileScore(Number(profile.profileScore || basicResult.profileScore || 0))
        setBasic(basicResult)
        setRegionTree(regions)
        setFieldSettings(home.fieldSettings || basicResult.fieldSettings || [])
        setVerification(home.verificationStatus || {})
        if (avatar) {
          setProfileAvatar(avatar)
        }
        setProfilePhotos(mergeAlbumSlots(albums))
        setGoal(options?.datingGoal.find(option => option.code === nextGoalCode)?.label || '')
        setRelationship(options?.emotionalStatus.find(option => option.code === nextRelationshipCode)?.label || '')
        setWechat(wechatId || '')
        setIntro(resolveOwnerVisibleText(introDetail))
        setAboutTopics(buildProfileAboutSummary(aboutDetail.questions))
        const tagCodes = parseTagCodes(tags)
        setSelectedTags(tagCodes.map(code => ({
          code,
          label: options?.profileTag.find(option => option.code === code)?.label || code,
        })))
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
    voiceDetailRef.current = voiceDetail
  }, [voiceDetail])

  const setRecordingElapsed = (seconds: number) => {
    recordingSecondsRef.current = seconds
    setRecordingSeconds(seconds)
  }

  const clearVoiceTimer = () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current)
    recordingTimer.current = undefined
  }

  const startVoiceTimer = (initialSeconds = 0) => {
    clearVoiceTimer()
    const maxDuration = usePrd01Store.getState().config?.uploadLimits.voiceMaxDuration || 60
    recordingStartedAt.current = Date.now() - initialSeconds * 1000
    setRecordingElapsed(initialSeconds)
    recordingTimer.current = setInterval(() => {
      const elapsed = getVoiceRecordingSeconds(recordingStartedAt.current, Date.now(), maxDuration)
      setRecordingElapsed(elapsed)
      if (elapsed >= maxDuration && !recordingStopRequested.current) {
        recordingStopRequested.current = true
        recorder.current.stop()
      }
    }, 250)
  }

  const resetVoiceDraft = () => {
    setVoiceTempPath('')
    setVoiceTempDuration(0)
    setRecordingElapsed(0)
  }

  const stopVoicePlayback = () => {
    const audio = voiceAudio.current
    if (audio && !audio.paused) audio.stop()
  }

  const ensureVoiceAudio = () => {
    if (voiceAudio.current) return voiceAudio.current
    const audio = Taro.createInnerAudioContext()
    audio.autoplay = false
    audio.onPlay(() => setVoiceSheet('play'))
    audio.onPause(() => setVoiceSheet(current => current === 'play' ? 'complete' : current))
    audio.onStop(() => setVoiceSheet(current => current === 'play' ? 'complete' : current))
    audio.onEnded(() => setVoiceSheet(current => current === 'play' ? 'complete' : current))
    audio.onError(error => {
      setVoiceSheet('complete')
      void showError(error)
    })
    voiceAudio.current = audio
    return audio
  }

  useEffect(() => {
    const manager = recorder.current
    const session: VoiceRecorderSession = {
      onStart: () => {
        recorderStarting.current = false
        recorderActive.current = true
        recordingStopRequested.current = false
        startVoiceTimer()
        setVoiceSheet('recording')
      },
      onStop: result => {
        clearVoiceTimer()
        recorderStarting.current = false
        recorderActive.current = false
        recordingStopRequested.current = false
        if (discardVoice.current) {
          discardVoice.current = false
          resetVoiceDraft()
          return
        }
        const config = usePrd01Store.getState().config
        const maxDuration = config?.uploadLimits.voiceMaxDuration || 60
        const duration = resolveVoiceDuration(result.duration, recordingSecondsRef.current, maxDuration)
        setRecordingElapsed(duration)
        if (!result.tempFilePath || !config || duration < config.uploadLimits.voiceMinDuration) {
          resetVoiceDraft()
          setVoiceSheet(voiceDetailRef.current?.voiceIntroUrl ? 'complete' : 'voice')
          if (config) {
            void Taro.showToast({ title: `录音至少需要${config.uploadLimits.voiceMinDuration}秒`, icon: 'none' })
          }
          return
        }
        setVoiceTempPath(result.tempFilePath)
        setVoiceTempDuration(duration)
        setVoiceSheet('complete')
      },
      onError: error => {
        clearVoiceTimer()
        recorderStarting.current = false
        recorderActive.current = false
        recordingStopRequested.current = false
        discardVoice.current = false
        resetVoiceDraft()
        setVoiceSheet(voiceDetailRef.current?.voiceIntroUrl ? 'complete' : 'voice')
        void showError(error)
      },
      onPause: clearVoiceTimer,
      onResume: () => {
        if (recorderActive.current) startVoiceTimer(recordingSecondsRef.current)
      },
      onInterruptionEnd: () => {
        if (recorderActive.current) manager.resume()
      },
    }
    activeVoiceRecorderSession = session
    return () => {
      if (activeVoiceRecorderSession === session) activeVoiceRecorderSession = undefined
      clearVoiceTimer()
      const audio = voiceAudio.current
      audio?.destroy()
      voiceAudio.current = undefined
      if (recorderActive.current || recorderStarting.current) {
        discardVoice.current = true
        recorderActive.current = false
        recorderStarting.current = false
        manager.stop()
      }
    }
  }, [])

  const restoreScrollPosition = () => {
    const target = scrollTopRef.current
    setRestoredScrollTop(Math.max(0, target - 0.5))
    Taro.nextTick(() => setRestoredScrollTop(target))
  }

  const closeSheet = () => {
    setSheet(null)
    restoreScrollPosition()
  }
  const closeVoiceSheet = () => {
    if (recorderActive.current || recorderStarting.current) {
      setVoiceSheet('exit')
      return
    }
    stopVoicePlayback()
    if (voiceTempPath) resetVoiceDraft()
    setVoiceSheet(null)
  }

  const playVoiceRecording = () => {
    const source = voiceTempPath || voiceDetail?.voiceIntroUrl || ''
    if (!source) {
      void Taro.showToast({ title: '暂无可播放的录音', icon: 'none' })
      return
    }
    const audio = ensureVoiceAudio()
    if (audio.src !== source) audio.src = source
    audio.play()
    setVoiceSheet('play')
  }

  const pauseVoiceRecording = () => {
    const audio = voiceAudio.current
    if (audio && !audio.paused) audio.pause()
    setVoiceSheet('complete')
  }

  const confirmVoiceRecording = async () => {
    if (voiceSaving) return
    if (!voiceTempPath) {
      closeVoiceSheet()
      return
    }
    setVoiceSaving(true)
    try {
      const uploaded = await prd01Api.uploadVoice(voiceTempPath)
      const saved = await prd01Api.submitVoiceIntro(uploaded.url, voiceTempDuration)
      setVoiceDetail(saved)
      resetVoiceDraft()
      setVoiceSheet(null)
    } catch (error) {
      setVoiceSheet('complete')
      await showError(error)
    } finally {
      setVoiceSaving(false)
    }
  }

  const cancelVoiceConfirm = () => {
    setVoiceSheet(current => current === 'exit' ? 'recording' : 'complete')
  }

  const confirmDiscardRecording = () => {
    discardVoice.current = true
    clearVoiceTimer()
    if (recorderActive.current || recorderStarting.current) recorder.current.stop()
    recorderActive.current = false
    recorderStarting.current = false
    resetVoiceDraft()
    setVoiceSheet(null)
  }

  const confirmDeleteVoice = () => {
    stopVoicePlayback()
    if (voiceTempPath) {
      resetVoiceDraft()
      setVoiceSheet(voiceDetail?.voiceIntroUrl ? 'complete' : 'voice')
      return
    }
    if (!voiceDetail?.voiceIntroUrl || voiceSaving) {
      setVoiceSheet('voice')
      return
    }
    setVoiceSaving(true)
    void prd01Api.deleteVoiceIntro().then(() => {
      setVoiceDetail(undefined)
      setVoiceSheet('delete-success')
    }).catch(showError).finally(() => setVoiceSaving(false))
  }

  const handleVoiceSheetChange = (variant: VoiceSheetVariant) => {
    if (voiceSaving) return
    if (variant === 'recording') {
      const config = usePrd01Store.getState().config
      const format = config?.uploadLimits.voice.formats[0]
      if (!config || !format || recorderStarting.current || recorderActive.current) return
      stopVoicePlayback()
      resetVoiceDraft()
      discardVoice.current = false
      recordingStopRequested.current = false
      recorderStarting.current = true
      setVoiceSheet('recording')
      try {
        recorder.current.start({ duration: config.uploadLimits.voiceMaxDuration * 1000, format: format as keyof Taro.RecorderManager.Format })
      } catch (error) {
        recorderStarting.current = false
        setVoiceSheet(voiceDetailRef.current?.voiceIntroUrl ? 'complete' : 'voice')
        void showError(error)
      }
      return
    }
    if (voiceSheet === 'recording' && variant === 'complete') {
      recorder.current.stop()
      return
    }
    if (voiceSheet === 'recording' && variant === 'exit') {
      setVoiceSheet('exit')
      return
    }
    if (variant === 'play') {
      playVoiceRecording()
      return
    }
    if (voiceSheet === 'play' && variant === 'complete') {
      pauseVoiceRecording()
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
    } catch (error) {
      await showError(error)
      return
    }
    closeSheet()
  }

  const applyProfileUpdate = (update: ProfileEditUpdate) => {
    if (update.type === 'basic') setBasic(update.basic)
    if (update.type === 'intro') setIntro(update.value)
    if (update.type === 'tags') {
      setSelectedTags(update.items)
    }
    if (update.type === 'about') {
      setAboutTopics(buildProfileAboutSummary(update.questions))
    }
    if (update.type === 'song') setFavoriteSong(update.display)
    if (update.type === 'verification') setVerification(update.status)
    restoreScrollPosition()
  }

  const handleProfileAction = (title: string, url?: string) => {
    if (url) {
      void Taro.navigateTo({
        url,
        events: {
          [PROFILE_UPDATED_EVENT]: (update: ProfileEditUpdate) => applyProfileUpdate(update),
        },
      }).catch(() => {
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
    } catch (error) {
      if (isChooseImageCancelled(error)) return
      await showError(error)
    }
  }

  const onChangeBackground = () => {
    void chooseProfileImage(async imagePath => {
      const uploaded = await prd01Api.uploadBackground(imagePath)
      const saved = await prd01Api.saveBackground({
        mediaUrl: uploaded.url,
        fileSizeBytes: uploaded.fileSizeBytes,
        sortOrder: 0,
      })
      const backgroundUrl = saved.mediaUrl || uploaded.url
      setProfileBackground(backgroundUrl)
    }, '更换背景')
  }

  const onChangeAvatar = () => {
    void chooseProfileImage(async imagePath => {
      const source = usePrd01Store.getState().profileOptions?.avatarSource[0]
      if (!source) throw new Error('头像来源字典为空，请联系管理员')
      const uploaded = await prd01Api.uploadAvatar(imagePath)
      await prd01Api.submitAvatar({ avatarSource: source.code, avatarUrl: uploaded.url })
      setProfileAvatar(uploaded.url)
    }, '更换头像')
  }

  const handlePhotoClick = (index: number) => {
    void chooseProfileImage(async imagePath => {
      const uploaded = await prd01Api.uploadAlbum(imagePath)
      const current = profilePhotos[index]
      const saved = current?.mediaId
        ? await prd01Api.replaceAlbum(current.mediaId, {
            mediaUrl: uploaded.url,
            fileSizeBytes: uploaded.fileSizeBytes,
            sortOrder: index,
          })
        : await prd01Api.addAlbum({
            mediaUrl: uploaded.url,
            fileSizeBytes: uploaded.fileSizeBytes,
            sortOrder: index,
          })
      setProfilePhotos(items => items.map((item, photoIndex) => photoIndex === index ? { ...item, mediaId: saved.mediaId, imageUrl: saved.mediaUrl } : item))
    }, profilePhotos[index]?.label || '添加照片')
  }

  const handleBack = () => {
    const fallbackToProfile = () => {
      const switchResult = Taro.switchTab({ url: '/pages/profile/index' })
      void Promise.resolve(switchResult).catch(() => {
        void Taro.reLaunch({ url: '/pages/profile/index' })
      })
    }
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      const backResult = Taro.navigateBack({
        delta: 1,
        fail: fallbackToProfile,
      })
      void Promise.resolve(backResult).catch(fallbackToProfile)
      return
    }
    fallbackToProfile()
  }

  const optionLabel = usePrd01Store.getState().optionLabel
  const gender = optionLabel('gender', String(basic.gender || ''))
  const genderAgeHeight = [
    gender,
    buildBasicProfileBirthYearText(String(basic.birthday || '')),
    basic.height ? `${basic.height}cm` : '',
    basic.zodiac ? String(basic.zodiac) : '',
  ].filter(Boolean).join('丨')
  const locationText = buildBasicProfileLocationText(basic, regionTree)
  const profileHeroImage = profileBackground || editHeroPhoto
  const photos = profilePhotos.flatMap(item => item.imageUrl ? [item.imageUrl] : [])
  const certificationRows = [
    { key: 'avatar' as const, label: '头像', status: verification.avatarVerifyStatus },
    { key: 'realName' as const, label: '实名', status: verification.realNameStatus },
    { key: 'education' as const, label: '学历', status: verification.educationStatus },
  ]
  const previewModel: ProfilePreviewModel = {
    avatarUrl: profileAvatar || defaultAvatar,
    heroImageUrl: profileHeroImage,
    nickname,
    gender: String(basic.gender || ''),
    genderAgeHeight,
    location: locationText,
    tags: selectedTags,
    introduction: intro,
    photos,
    certifications: certificationRows.map(item => ({
      ...item,
      passed: isCertificationPassed(item.status),
      statusLabel: optionLabel('auditStatus', String(item.status || '')),
    })),
    voice: {
      url: voiceDetail?.voiceIntroUrl || '',
      duration: voiceDetail?.voiceIntroDuration,
      statusLabel: optionLabel('auditStatus', String(voiceDetail?.voiceIntroAuditStatus || '')),
    },
    datingGoal: goal,
    relationshipStatus: relationship,
    favoriteSong,
    aboutMe: aboutTopics.flatMap(item => item.value ? [{ title: item.title, value: item.value }] : []),
  }

  // 主页预览等价路由：/pages/profile/index?variant=preview；底部 Tab 页面不使用 navigateTo。
  return showPreview ? (
    <ProfilePreviewPage model={previewModel} onBack={handleBack} onEdit={() => setShowPreview(false)} />
  ) : (
    <View
      style={{ minHeight: '100vh', background: pageBackground, overflow: 'hidden', fontFamily }}
    >
      <ScrollView
        scrollY
        scrollTop={restoredScrollTop}
        scrollWithAnimation={false}
        onScroll={event => { scrollTopRef.current = event.detail.scrollTop }}
        style={{ height: '100vh', width: '750rpx' }}
        showScrollbar={false}
      >
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
            heroImageUrl={profileHeroImage}
            profileAvatar={profileAvatar || defaultAvatar}
            onChangeBackground={onChangeBackground}
            onChangeAvatar={onChangeAvatar}
          />
          <PhotoUploadGrid photos={profilePhotos} onPhotoClick={handlePhotoClick} />
          <BasicInfoSection basic={basic} fieldSettings={fieldSettings} regionTree={regionTree}
            onEdit={() => handleProfileAction('基础资料', '/pages/verification/basic?from=profile')}
          />
          <CertificationSection verification={verification}
            onUpdate={() => handleProfileAction('更新认证', '/pages/verification/my-certification')}
          />
          <ProfileSection title="脱单目标">
            {goal ? (
              <DatingGoalValue value={goal} onClick={openGoalSheet} />
            ) : (
              <AddPrompt
                id="profile-dating-goal-empty"
                text="添加脱单目标，为你推荐目标一致的人"
                onClick={openGoalSheet}
              />
            )}
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
          <ProfileSection
            title="我的标签"
            action="编辑"
            actionId="profile-tags-edit"
            onAction={() => handleProfileAction('我的标签', '/pages/profile-edit/tags')}
            padding="24rpx 26rpx"
          >
            <View
              data-role="profile-tag-list"
              onClick={() => handleProfileAction('我的标签', '/pages/profile-edit/tags')}
              style={{ minHeight: '72rpx', marginTop: '10rpx', borderRadius: '16rpx', background: '#F8FAFD', padding: '12rpx 20rpx', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10rpx', boxSizing: 'border-box' }}
            >
              {selectedTags.length
                ? selectedTags.map(item => <ProfileTagChip key={item.code} item={item} compact />)
                : <Text style={{ color: '#9AA1AF', fontSize: '26rpx', lineHeight: '38rpx' }}>添加标签，让TA更了解你</Text>}
            </View>
          </ProfileSection>
          <VoiceSection
            voice={voiceDetail}
            onRecord={() => setVoiceSheet(voiceDetail?.voiceIntroUrl ? 'complete' : 'voice')}
            onDelete={() => setVoiceSheet('delete')}
          />
          <AboutDetailSection
            items={aboutTopics}
            onAdd={() => handleProfileAction('关于我', '/pages/profile-edit/about')}
            onFill={key =>
              handleProfileAction(
                '关于我',
                `/pages/profile-edit/about?topic=${key}`
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
          recordingSeconds={recordingSeconds}
          recordedDurationSeconds={voiceTempDuration || voiceDetail?.voiceIntroDuration || 0}
          minDuration={config?.uploadLimits.voiceMinDuration || 10}
          maxDuration={config?.uploadLimits.voiceMaxDuration || 60}
          saving={voiceSaving}
          onClose={closeVoiceSheet}
          onChange={handleVoiceSheetChange}
          onComplete={() => void confirmVoiceRecording()}
          onCancelConfirm={cancelVoiceConfirm}
          onConfirmExit={confirmDiscardRecording}
          onConfirmDelete={confirmDeleteVoice}
        />
      ) : null}
    </View>
  )
}

function ProfileScoreCard({ score, onClick }: { score: number; onClick: () => void }) {
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0))
  const trackWidth = 652
  const markerSize = 30
  const bubbleWidth = 128
  const markerLeft = Math.max(0, Math.min(trackWidth - markerSize, trackWidth * normalizedScore / 100 - markerSize / 2))
  const bubbleLeft = Math.max(0, Math.min(trackWidth - bubbleWidth, trackWidth * normalizedScore / 100 - bubbleWidth / 2))
  return (
    <View
      onClick={onClick}
      style={{
        width: '700rpx',
        height: '138rpx',
        margin: '0 auto',
        borderRadius: '8rpx',
        background: '#FFFFFF',
        padding: '20rpx 24rpx 0',
        boxSizing: 'border-box',
        boxShadow: cardShadow,
      }}
    >
      <View
        style={{
          position: 'relative',
          left: `${bubbleLeft}rpx`,
          width: '128rpx',
          height: '43rpx',
          borderRadius: '24rpx',
          background: mainBlue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '24rpx', lineHeight: '33rpx', fontWeight: 500 }}>
          评分：{normalizedScore}
        </Text>
        <View
          style={{
            position: 'absolute',
            left: '53rpx',
            bottom: '-10rpx',
            width: 0,
            height: 0,
            borderLeft: '11rpx solid transparent',
            borderRight: '11rpx solid transparent',
            borderTop: `12rpx solid ${mainBlue}`,
          }}
        />
      </View>
      <View
        data-role="profile-score-track"
        style={{
          position: 'relative',
          width: '652rpx',
          height: '10rpx',
          borderRadius: '10rpx',
          background: '#D6E4FB',
          marginTop: '19rpx',
        }}
      >
        <View
          style={{ width: `${trackWidth * normalizedScore / 100}rpx`, height: '10rpx', borderRadius: '10rpx', background: mainBlue }}
        />
        <View
          style={{
            position: 'absolute',
            left: `${markerLeft}rpx`,
            top: '-10rpx',
            width: `${markerSize}rpx`,
            height: `${markerSize}rpx`,
            borderRadius: `${markerSize}rpx`,
            background: mainBlue,
            border: '6rpx solid #A9C7FF',
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
        data-role="truth-check-icon"
        style={{
          width: '30rpx',
          height: '18rpx',
          borderLeft: '5rpx solid #FFFFFF',
          borderBottom: '5rpx solid #FFFFFF',
          transform: 'rotate(-45deg)',
          margin: '-8rpx 22rpx 0 4rpx',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      />
      <Text style={{ color: '#FFFFFF', fontSize: '24rpx', lineHeight: '34rpx', fontWeight: 500 }}>
        为保障平台真实性，请您如实填写个人资料。
      </Text>
    </View>
  )
}

function ProfileHeroCard({
  nickname,
  heroImageUrl,
  profileAvatar,
  onChangeBackground,
  onChangeAvatar,
}: {
  nickname: string
  heroImageUrl: string
  profileAvatar: string
  onChangeBackground: () => void
  onChangeAvatar: () => void
}) {
  return (
    <View
      data-role="profile-edit-hero"
      style={{
        position: 'relative',
        width: '700rpx',
        height: '828rpx',
        margin: '20rpx auto 0',
        borderRadius: '32rpx',
        overflow: 'visible',
        background: '#EFF6F6',
        boxShadow: cardShadow,
      }}
    >
      <ProfileHeroImage
        src={heroImageUrl}
        dataRole="hero-main-photo"
        onClick={onChangeBackground}
      >
        <View
          data-role="hero-mini-avatar"
          aria-label="更换头像"
          onClick={event => {
            event.stopPropagation()
            onChangeAvatar()
          }}
          style={{
            position: 'absolute',
            left: '0',
            right: '0',
            bottom: '0',
            height: '300rpx',
            borderRadius: '0 0 32rpx 32rpx',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(15,27,48,0.64) 100%)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '30rpx',
            bottom: '56rpx',
            width: '188rpx',
            height: '188rpx',
            zIndex: 5,
          }}
        >
          <Image
            id="profile-edit-avatar"
            src={profileAvatar}
            mode="aspectFill"
            style={{
              width: '188rpx',
              height: '188rpx',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '7rpx solid #FFFFFF',
              boxShadow: '0 8rpx 20rpx rgba(0,0,0,0.18)',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            left: '238rpx',
            bottom: '117rpx',
            minWidth: 0,
            zIndex: 4,
          }}
        >
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
        </View>
        <View
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
            更换背景
          </Text>
          <View style={{ marginLeft: '14rpx' }}>
            <RightChevron color="#FFFFFF" size={15} borderWidth={3} />
          </View>
        </View>
      </ProfileHeroImage>
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
      data-role="profile-photo-grid"
      style={{
        position: 'relative',
        width: '700rpx',
        height: '648rpx',
        margin: '-105rpx auto 0',
        borderRadius: '32rpx',
        background: '#FFFFFF',
        padding: '64rpx 26rpx 28rpx',
        boxSizing: 'border-box',
        boxShadow: cardShadow,
        zIndex: 2,
      }}
    >
      <View style={{ display: 'flex', alignItems: 'center' }}>
        <SectionTitleDecoration title="更多照片" />
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
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '24rpx' }}>
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
        marginBottom: '14rpx',
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
  actionId,
  onAction,
  padding = '30rpx 26rpx',
  children,
}: {
  title: string
  action?: string
  actionId?: string
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
        <SectionTitleDecoration title={title} />
        {action ? (
          <View id={actionId} onClick={onAction} style={{ display: 'flex', alignItems: 'center', minHeight: '48rpx' }}>
            <Text style={{ color: '#9AA1AF', fontSize: '24rpx', lineHeight: '34rpx' }}>
              {action}
            </Text>
            <View style={{ marginLeft: '12rpx' }}>
              <RightChevron />
            </View>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  )
}

function SectionTitleDecoration({ title }: { title: string }) {
  return (
    <View
      data-role="section-title-decoration"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          right: '-8rpx',
          top: '-6rpx',
          width: '34rpx',
          height: '34rpx',
          borderRadius: '34rpx',
          background: 'rgba(227,241,254,0.92)',
        }}
      />
      <Text
        style={{
          position: 'relative',
          color: titleColor,
          fontSize: '28rpx',
          lineHeight: '40rpx',
          fontWeight: 700,
          zIndex: 1,
        }}
      >
        {title}
      </Text>
    </View>
  )
}

function BasicInfoSection({
  basic,
  fieldSettings,
  regionTree,
  onEdit,
}: {
  basic: BasicProfile
  fieldSettings: ProfileFieldSetting[]
  regionTree: RegionTreeOption[]
  onEdit: () => void
}) {
  const optionLabel = usePrd01Store.getState().optionLabel
  const visibleFields = new Set(fieldSettings.filter(item => item.visible).map(item => item.fieldId))
  const canShow = (field: string) => visibleFields.size === 0 || visibleFields.has(field)
  const genderText = canShow('gender') ? optionLabel('gender', String(basic.gender || '')) : ''
  const birthYear = canShow('birthday')
    ? buildBasicProfileBirthYearText(String(basic.birthday || ''))
    : ''
  const stature = [canShow('height') && basic.height ? `${basic.height}cm` : '', canShow('weight') && basic.weight ? `${basic.weight}kg` : ''].filter(Boolean).join('/')
  const firstLine = [genderText, birthYear, stature].filter(Boolean).join('丨') || '基础资料待完善'
  const secondLine = buildBasicProfileLocationText(basic, regionTree) || '居住地待完善'
  return (
    <ProfileSection title="基础资料" action="编辑" onAction={onEdit}>
      <View style={{ marginTop: '24rpx' }}>
        <BasicInfoRow type="gender" text={firstLine} gender={String(basic.gender || '')} />
        <BasicInfoRow type="location" text={secondLine} />
      </View>
    </ProfileSection>
  )
}

function BasicInfoRow({ type, text, gender = '' }: { type: 'gender' | 'location'; text: string; gender?: string }) {
  return (
    <View style={{ display: 'flex', alignItems: 'center', height: '40rpx', marginBottom: '14rpx' }}>
      <BasicInfoIcon type={type} gender={gender} />
      <Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '36rpx', fontWeight: 400 }}>
        {text}
      </Text>
    </View>
  )
}

function BasicInfoIcon({ type, gender }: { type: 'gender' | 'location'; gender: string }) {
  const icon = type === 'gender'
    ? gender === 'MALE' ? miniappOssIcons.qianxunGenderMale : miniappOssIcons.profilePreviewGender
    : miniappOssIcons.profilePreviewLocation
  return (
    <Image
      data-role={`basic-info-icon-${type}`}
      src={icon}
      mode="aspectFit"
      style={{
        width: '30rpx',
        height: '30rpx',
        marginRight: '14rpx',
        flexShrink: 0,
      }}
    />
  )
}

function CertificationSection({ verification, onUpdate }: { verification: VerificationStatus; onUpdate: () => void }) {
  const rows = [
    { title: '头像认证', icon: miniappOssIcons.profileEditCertAvatar, status: verification.avatarVerifyStatus },
    { title: '实名认证', icon: miniappOssIcons.profileEditCertRealName, status: verification.realNameStatus },
    { title: '学历认证', icon: miniappOssIcons.profileEditCertEducation, status: verification.educationStatus },
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
              <Text style={{ color: '#333333', fontSize: '28rpx', lineHeight: '40rpx' }}>
                {item.title}
              </Text>
            </View>
            <View style={{ display: 'flex', alignItems: 'center' }}>
              <CertifiedStatusIcon />
              <Text
                style={{
                  color: '#666666',
                  fontSize: '26rpx',
                  lineHeight: '36rpx',
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
    <View
      style={{
        width: '48rpx',
        height: '48rpx',
        marginRight: '14rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Image
        data-role="certification-icon"
        src={src}
        mode="aspectFit"
        style={{ width: '48rpx', height: '48rpx' }}
      />
    </View>
  )
}

function CertifiedStatusIcon() {
  return (
    <Image
      data-role="certified-status-icon"
      src={miniappOssIcons.profileCertification}
      mode="aspectFit"
      style={{
        width: '32rpx',
        height: '36rpx',
        flexShrink: 0,
      }}
    />
  )
}

function AddPrompt({
  id,
  text,
  onClick,
  marginTop = '26rpx',
  minHeight = '88rpx',
  promptPadding = '18rpx 20rpx 18rpx 28rpx',
}: {
  id?: string
  text: string
  onClick: () => void
  marginTop?: string
  minHeight?: string
  promptPadding?: string
}) {
  return (
    <View
      id={id}
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

function DatingGoalValue({ value, onClick }: { value: string; onClick: () => void }) {
  return (
    <View
      id="profile-dating-goal-value"
      onClick={onClick}
      hoverClass="btn-hover"
      style={{
        minHeight: '88rpx',
        borderRadius: '8rpx',
        background: '#F8FAFD',
        marginTop: '26rpx',
        padding: '18rpx 24rpx 18rpx 28rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      <Text style={{ color: '#666666', fontSize: '26rpx', lineHeight: '36rpx' }}>{value}</Text>
      <View style={{ marginLeft: '18rpx', flexShrink: 0 }}>
        <RightChevron />
      </View>
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
      <SectionTitleDecoration title={title} />
      <View style={{ display: 'flex', alignItems: 'center' }}>
        <Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '36rpx' }}>{value}</Text>
        <View style={{ marginLeft: '14rpx' }}>
          <RightChevron />
        </View>
      </View>
    </View>
  )
}

function RightChevron({
  color = '#C0C5D0',
  size = 14,
  borderWidth = 3,
}: {
  color?: string
  size?: number
  borderWidth?: number
}) {
  return (
    <View
      aria-hidden
      style={{
        width: `${size}rpx`,
        height: `${size}rpx`,
        borderTop: `${borderWidth}rpx solid ${color}`,
        borderRight: `${borderWidth}rpx solid ${color}`,
        transform: 'rotate(45deg)',
        boxSizing: 'border-box',
      }}
    />
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
        {value || '介绍下自己的性格、习惯、优点、缺点'}
      </Text>
    </ProfileSection>
  )
}

function VoiceSection({ voice, onRecord, onDelete }: { voice?: VoiceIntro; onRecord: () => void; onDelete: () => void }) {
  const hasVoice = Boolean(voice?.voiceIntroUrl)
  const duration = voice ? voice.voiceIntroDuration || 0 : 0
  return (
    <ProfileSection title="语音介绍" action={hasVoice ? '管理' : '录音'} actionId="voice-intro-manage" onAction={onRecord} padding={hasVoice ? '30rpx 26rpx 36rpx' : undefined}>
      {hasVoice ? (
        <View data-role="voice-intro-echo" style={{ marginTop: '24rpx', display: 'flex', alignItems: 'center' }}>
          <View
            id="voice-intro-saved-bar"
            onClick={onRecord}
            style={{
              width: '270rpx',
              height: '48rpx',
              borderRadius: '24rpx',
              background: mainBlue,
              padding: '0 20rpx',
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <View style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5rpx' }}>
              {[13, 21, 15, 28, 18, 24, 13, 20, 14].map((height, index) => (
                <View key={`${height}-${index}`} style={{ width: '3rpx', height: `${height}rpx`, borderRadius: '3rpx', background: '#FFFFFF' }} />
              ))}
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: '24rpx', lineHeight: '34rpx' }}>{duration}s</Text>
          </View>
          <View id="voice-intro-delete" onClick={onDelete} style={{ position: 'relative', width: '48rpx', height: '48rpx', marginLeft: '18rpx', borderRadius: '24rpx', background: '#B8B8B8', flexShrink: 0 }}>
            <View style={{ position: 'absolute', left: '21rpx', top: '10rpx', width: '6rpx', height: '28rpx', borderRadius: '6rpx', background: '#FFFFFF', transform: 'rotate(45deg)' }} />
            <View style={{ position: 'absolute', left: '21rpx', top: '10rpx', width: '6rpx', height: '28rpx', borderRadius: '6rpx', background: '#FFFFFF', transform: 'rotate(-45deg)' }} />
          </View>
        </View>
      ) : (
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
      )}
    </ProfileSection>
  )
}

function AboutDetailSection({
  items,
  onAdd,
  onFill,
}: {
  items: ProfileAboutSummaryItem[]
  onAdd: () => void
  onFill: (key: string) => void
}) {
  return (
    <ProfileSection title="关于我" action="添加" onAction={onAdd} padding="24rpx 26rpx">
      <View
        data-role="about-detail-list"
        style={{
          marginTop: '28rpx',
          display: 'flex',
          flexDirection: 'column',
          gap: `${ABOUT_ROW_GAP_RPX}rpx`,
        }}
      >
        {items.map((item, index) => (
          <View
            key={item.key}
            onClick={() => onFill(item.key)}
            style={{
              minHeight: '104rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: index === 0 ? '2rpx 0 0' : '0',
              boxSizing: 'border-box',
            }}
          >
            <View style={{ flex: 1, paddingRight: '28rpx', boxSizing: 'border-box' }}>
              <Text
                style={{
                  display: 'block',
                  color: titleColor,
                  fontSize: '26rpx',
                  lineHeight: '37rpx',
                  fontWeight: 700,
                }}
              >
                {item.title}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  display: 'block',
                  color: '#9B9FA8',
                  fontSize: '24rpx',
                  lineHeight: `${ABOUT_LINE_HEIGHT_RPX}rpx`,
                  marginTop: '8rpx',
                }}
              >
                {item.value || item.placeholder}
              </Text>
            </View>
            <View
              onClick={event => {
                event.stopPropagation()
                onFill(item.key)
              }}
              style={{
                minWidth: '116rpx',
                height: '48rpx',
                borderRadius: '24rpx',
                background: '#FAFAFB',
                padding: '0 18rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <Text
                data-role="about-action-text"
                style={{ color: mainBlue, fontSize: '24rpx', lineHeight: '33rpx', fontWeight: 700 }}
              >
                {item.value ? '编辑' : '去填写'}
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
            {song || '添加一首喜欢的歌曲'}
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
    <Image
      data-role="music-disc-icon"
      src={miniappOssIcons.profilePreviewSong}
      mode="aspectFit"
      style={{
        width: '82rpx',
        height: '82rpx',
        flexShrink: 0,
      }}
    />
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
  recordingSeconds,
  recordedDurationSeconds,
  minDuration,
  maxDuration,
  saving,
  onClose,
  onChange,
  onComplete,
  onCancelConfirm,
  onConfirmExit,
  onConfirmDelete,
}: {
  variant: VoiceSheetVariant
  voiceIntro: ProfileDemo['editProfile']['voiceIntro']
  recordingSeconds: number
  recordedDurationSeconds: number
  minDuration: number
  maxDuration: number
  saving: boolean
  onClose: () => void
  onChange: (variant: VoiceSheetVariant) => void
  onComplete: () => void
  onCancelConfirm: () => void
  onConfirmExit: () => void
  onConfirmDelete: () => void
}) {
  const showConfirm = variant === 'exit' || variant === 'delete'
  const baseVariant: VoiceSheetVariant =
    variant === 'exit'
      ? 'recording'
      : variant === 'delete'
        ? 'complete'
        : variant === 'delete-success'
          ? 'voice'
          : variant
  const state = voiceIntro.states[baseVariant] || voiceIntro.states.voice
  const isVoice = baseVariant === 'voice'
  const isRecording = baseVariant === 'recording'
  const isPlay = baseVariant === 'play'
  const isComplete = baseVariant === 'complete' || baseVariant === 'play'

  const handleBackdrop = () => {
    if (showConfirm) {
      onCancelConfirm()
      return
    }
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
    if (baseVariant === 'complete') onChange('play')
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
          height: 'calc(548rpx + env(safe-area-inset-bottom))',
          borderRadius: '32rpx 32rpx 0 0',
          background: '#FFFFFF',
          padding: '50rpx 30rpx calc(34rpx + env(safe-area-inset-bottom))',
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
          id="voice-duration"
          data-role="voice-duration"
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
            : isRecording
              ? `${recordingSeconds}S`
              : `${recordedDurationSeconds}S`}
        </Text>

        <Text
          id="voice-recording-limit"
          style={{
            display: 'block',
            color: '#B1B5BD',
            fontSize: '22rpx',
            lineHeight: '30rpx',
            textAlign: 'center',
            marginTop: '4rpx',
          }}
        >
          录音时长 {minDuration}-{maxDuration} 秒
        </Text>

        <View
          id="voice-control-stage"
          style={{
            position: 'relative',
            height: isVoice ? '250rpx' : '238rpx',
            marginTop: isVoice ? '20rpx' : '14rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VoiceWave active={isRecording || isPlay || isComplete} />
          {isComplete ? (
            <View
              id="voice-complete-actions"
              style={{
                position: 'relative',
                zIndex: 1,
                width: '620rpx',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              <VoiceActionButton
                label={voiceIntro.deleteText || '删除'}
                tone="muted"
                icon="delete"
                onClick={() => onChange('delete')}
                disabled={saving}
              />
              <View style={{ width: '188rpx', display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                <VoiceRoundButton variant={baseVariant} onClick={handleMainAction} disabled={saving} />
                <Text style={{ color: '#333333', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 800, marginTop: '24rpx', whiteSpace: 'nowrap' }}>
                  {isPlay ? '暂停' : '点击播放'}
                </Text>
              </View>
              <VoiceActionButton
                label={saving ? '保存中' : '完成'}
                tone="primary"
                icon="confirm"
                onClick={onComplete}
                disabled={saving}
              />
            </View>
          ) : (
            <View id="voice-primary-action">
              <VoiceRoundButton variant={baseVariant} onClick={handleMainAction} disabled={saving} />
            </View>
          )}
        </View>

        {!isComplete ? (
          <Text
            style={{
              display: 'block',
              color: '#333333',
              fontSize: '32rpx',
              lineHeight: '45rpx',
              fontWeight: 800,
              textAlign: 'center',
              marginTop: '-4rpx',
            }}
          >
            {isRecording ? '点击完成录音' : state.buttonText || '点击录音'}
          </Text>
        ) : null}
      </View>

      {showConfirm ? (
        <VoiceConfirmDialog
          title={variant === 'exit' ? '退出提示' : '删除提示'}
          content={
            variant === 'exit'
              ? '退出录音后当前录音丢失，确定要关闭吗？'
              : '一旦删除不可恢复，确定删除吗？'
          }
          leftText={variant === 'delete' ? voiceIntro.deleteCancelText || '取消' : '取消'}
          rightText={variant === 'delete' ? voiceIntro.deleteConfirmText || '确认' : '退出'}
          onLeft={onCancelConfirm}
          onRight={variant === 'exit' ? onConfirmExit : onConfirmDelete}
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
  disabled = false,
}: {
  variant: VoiceSheetVariant
  onClick: () => void
  disabled?: boolean
}) {
  const recording = variant === 'recording'
  const play = variant === 'play'
  return (
    <View
      id="voice-round-button"
      data-role="voice-round-button"
      onClick={disabled ? undefined : onClick}
      style={{
        position: 'relative',
        width: '188rpx',
        height: '188rpx',
        borderRadius: '188rpx',
        background: '#E3F1FE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View
        style={{
          width: '124rpx',
          height: '124rpx',
          borderRadius: '124rpx',
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
        {!recording && variant !== 'voice' ? (
          <VoiceActionIcon type={play ? 'pause' : 'play'} large />
        ) : null}
      </View>
      {recording ? (
        <View
          style={{
            position: 'absolute',
            left: '31rpx',
            top: '31rpx',
            width: '126rpx',
            height: '126rpx',
            borderRadius: '126rpx',
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
  icon,
  onClick,
  disabled = false,
}: {
  label: string
  tone: 'muted' | 'primary'
  icon: 'delete' | 'play' | 'pause' | 'confirm'
  onClick: () => void
  disabled?: boolean
}) {
  const active = tone === 'primary'
  return (
    <View
      onClick={disabled ? undefined : onClick}
      style={{
        width: '150rpx',
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View
        style={{
          width: '150rpx',
          height: '188rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
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
          <VoiceActionIcon type={icon} />
        </View>
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

function VoiceActionIcon({
  type,
  large = false,
}: {
  type: 'delete' | 'play' | 'pause' | 'confirm'
  large?: boolean
}) {
  const metric = large ? 1.25 : 1
  if (type === 'play') {
    return (
      <View
        aria-hidden
        style={{
          width: 0,
          height: 0,
          borderTop: `${17 * metric}rpx solid transparent`,
          borderBottom: `${17 * metric}rpx solid transparent`,
          borderLeft: `${25 * metric}rpx solid #FFFFFF`,
          marginLeft: `${6 * metric}rpx`,
        }}
      />
    )
  }
  if (type === 'pause') {
    return (
      <View aria-hidden style={{ display: 'flex', gap: `${8 * metric}rpx` }}>
        <View style={{ width: `${8 * metric}rpx`, height: `${34 * metric}rpx`, borderRadius: '4rpx', background: '#FFFFFF' }} />
        <View style={{ width: `${8 * metric}rpx`, height: `${34 * metric}rpx`, borderRadius: '4rpx', background: '#FFFFFF' }} />
      </View>
    )
  }
  if (type === 'confirm') {
    return (
      <View
        aria-hidden
        style={{
          width: `${30 * metric}rpx`,
          height: `${17 * metric}rpx`,
          borderLeft: `${7 * metric}rpx solid #FFFFFF`,
          borderBottom: `${7 * metric}rpx solid #FFFFFF`,
          transform: 'rotate(-45deg)',
          marginTop: `${-8 * metric}rpx`,
          boxSizing: 'border-box',
        }}
      />
    )
  }
  return (
    <View aria-hidden style={{ position: 'relative', width: `${34 * metric}rpx`, height: `${34 * metric}rpx` }}>
      <View style={{ position: 'absolute', left: `${15 * metric}rpx`, top: 0, width: `${6 * metric}rpx`, height: `${34 * metric}rpx`, borderRadius: '6rpx', background: '#FFFFFF', transform: 'rotate(45deg)' }} />
      <View style={{ position: 'absolute', left: `${15 * metric}rpx`, top: 0, width: `${6 * metric}rpx`, height: `${34 * metric}rpx`, borderRadius: '6rpx', background: '#FFFFFF', transform: 'rotate(-45deg)' }} />
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
          id="voice-confirm-left"
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
          id="voice-confirm-right"
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
  const slots = defaultPhotoSlots.map(slot => ({ ...slot }))
  albums.forEach((media, fallbackIndex) => {
    const preferredIndex = normalizeAlbumSlot(media.sortOrder, fallbackIndex, slots.length)
    const slotIndex = preferredIndex >= 0 && !slots[preferredIndex].mediaId
      ? preferredIndex
      : slots.findIndex(slot => !slot.mediaId)
    if (slotIndex < 0) return
    slots[slotIndex] = { ...slots[slotIndex], mediaId: media.mediaId, imageUrl: media.mediaUrl }
  })
  return slots
}

function normalizeAlbumSlot(sortOrder: number | undefined, fallbackIndex: number, slotCount: number) {
  const candidate = Number.isInteger(sortOrder) ? Number(sortOrder) : fallbackIndex
  return candidate >= 0 && candidate < slotCount ? candidate : -1
}

function isChooseImageCancelled(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : String((error as { errMsg?: string } | null)?.errMsg || error || '')
  return /cancel/i.test(message)
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
  const normalizedWechatId = normalizeOptionalWechatId(wechatId)
  if (normalizedWechatId === null) return

  try {
    await prd01Api.saveWechatId(normalizedWechatId)
    await Taro.showToast({ title: '保存成功', icon: 'success' })
  } catch (error) {
    await showError(error)
  }
}

async function showError(error: unknown) {
  const title = error instanceof Error ? error.message : String(error)
  if (title) await Taro.showToast({ title, icon: 'none' })
}
