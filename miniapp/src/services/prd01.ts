import { del, get, post, put } from './request'
import { uploadDirectToOss } from './ossUpload'
import { PRD01_API_PATHS } from '@/constants/prd01ApiPaths'
import type {
  AboutMeDetail,
  AccessStatus,
  AvatarDetail,
  AvatarSubmitResult,
  BasicProfile,
  EducationDetail,
  EducationSubmitRequest,
  LoginResult,
  OpenTextDetail,
  Prd01Config,
  ProfileDetail,
  ProfileHomeDetail,
  ProfileInitStatus,
  ProfileInitStepRequest,
  ProfileMedia,
  ProfileMediaSubmitInput,
  ProfileOptions,
  RealNameDetail,
  RealNameSubmitRequest,
  RegionOption,
  RegionTreeOption,
  SmsCodeResult,
  SongOption,
  VerificationStatus,
  VoiceIntro,
} from '@/types/prd01'

export { PRD01_API_PATHS }

export const prd01Api = {
  getConfig: () => get<Prd01Config>(PRD01_API_PATHS.config),
  getProfileOptions: () => get<ProfileOptions>(PRD01_API_PATHS.profileOptions),
  getLocations: (parentCode?: string) =>
    get<RegionOption[]>(PRD01_API_PATHS.locations, parentCode ? { parentCode } : undefined),
  getProvinceCities: () => get<RegionTreeOption[]>(PRD01_API_PATHS.provinceCities),

  sendSmsCode: (phone: string) => post<SmsCodeResult>(PRD01_API_PATHS.smsCode, { phone }),
  phoneLogin: (
    phone: string,
    smsCode: string,
    agreeProtocol: boolean,
    promotionTraceNos?: string[],
  ) =>
    post<LoginResult>(PRD01_API_PATHS.phoneLogin, {
      phone,
      smsCode,
      agreeProtocol,
      ...(promotionTraceNos?.length ? { promotionTraceNos } : {}),
    }),
  wechatLogin: (
    loginCode: string | undefined,
    phoneCode: string,
    agreeProtocol: boolean,
    promotionTraceNos?: string[],
  ) =>
    post<LoginResult>(PRD01_API_PATHS.wechatLogin, {
      loginCode,
      phoneCode,
      agreeProtocol,
      ...(promotionTraceNos?.length ? { promotionTraceNos } : {}),
    }),

  getInitStatus: () => get<ProfileInitStatus>(PRD01_API_PATHS.initStatus),
  saveInitStep: (data: ProfileInitStepRequest) =>
    post<ProfileInitStatus>(PRD01_API_PATHS.initStep, data as unknown as Record<string, unknown>),

  getHomeDetail: () => get<ProfileHomeDetail>(PRD01_API_PATHS.homeDetail),
  getBasicProfile: () => get<BasicProfile>(PRD01_API_PATHS.basic),
  saveBasicProfile: (data: Record<string, unknown>) =>
    put<BasicProfile>(PRD01_API_PATHS.basic, data),

  getVerificationStatus: () => get<VerificationStatus>(PRD01_API_PATHS.verifyStatus),
  getAvatar: () => get<AvatarDetail>(PRD01_API_PATHS.avatar),
  submitAvatar: (data: { avatarSource: string; avatarUrl: string; thumbUrl?: string }) =>
    post<AvatarSubmitResult>(PRD01_API_PATHS.avatar, data),
  getRealName: () => get<RealNameDetail>(PRD01_API_PATHS.realName),
  submitRealName: (data: RealNameSubmitRequest) =>
    post<VerificationStatus>(PRD01_API_PATHS.realName, data as unknown as Record<string, unknown>),
  getEducation: () => get<EducationDetail>(PRD01_API_PATHS.education),
  submitEducation: (data: EducationSubmitRequest) =>
    post<VerificationStatus>(PRD01_API_PATHS.education, data as unknown as Record<string, unknown>),

  getAlbums: () => get<ProfileMedia[]>(PRD01_API_PATHS.albums),
  addAlbum: (data: ProfileMediaSubmitInput) =>
    post<ProfileMedia>(PRD01_API_PATHS.albums, data as unknown as Record<string, unknown>),
  replaceAlbum: (mediaId: number, data: ProfileMediaSubmitInput) =>
    put<ProfileMedia>(`${PRD01_API_PATHS.albums}/${mediaId}`, data as unknown as Record<string, unknown>),
  deleteAlbum: (mediaId: number) => del<void>(`${PRD01_API_PATHS.albums}/${mediaId}`),

  getBackground: () => get<ProfileMedia | null>(PRD01_API_PATHS.background),
  saveBackground: (data: ProfileMediaSubmitInput) =>
    put<ProfileMedia>(PRD01_API_PATHS.background, data as unknown as Record<string, unknown>),
  deleteBackground: () => del<void>(PRD01_API_PATHS.background),

  getIntroduction: () => get<OpenTextDetail>(PRD01_API_PATHS.introduction),
  submitIntroduction: (aboutMe: string) =>
    post<Record<string, unknown>>(PRD01_API_PATHS.introduction, { aboutMe }),
  getAboutMe: () => get<AboutMeDetail>(PRD01_API_PATHS.aboutMe),
  submitAboutMe: (questionKey: string, contentText: string) =>
    post<Record<string, unknown>>(PRD01_API_PATHS.aboutMe, { questionKey, contentText }),

  getVoiceIntro: () => get<VoiceIntro>(PRD01_API_PATHS.voiceIntro),
  submitVoiceIntro: (voiceUrl: string, duration: number) =>
    post<VoiceIntro>(PRD01_API_PATHS.voiceIntro, { voiceUrl, duration }),
  deleteVoiceIntro: () => del<void>(PRD01_API_PATHS.voiceIntro),

  saveDatingGoal: (code: string) =>
    put<ProfileDetail>(PRD01_API_PATHS.datingGoal, { code }),
  saveEmotionalStatus: (code: string) =>
    put<ProfileDetail>(PRD01_API_PATHS.emotionalStatus, { code }),
  getTags: () => get<string>(PRD01_API_PATHS.tags),
  saveTags: (tagCodes: string[]) =>
    put<ProfileDetail>(PRD01_API_PATHS.tags, { tagCodes }),
  searchSongs: (keyword: string, limit = 10) =>
    get<SongOption[]>(PRD01_API_PATHS.songSearch, { keyword, limit }),
  saveFavoriteSong: (data: SongOption) =>
    put<ProfileDetail>(PRD01_API_PATHS.favoriteSong, data as unknown as Record<string, unknown>),
  getWechatId: () => get<string>(PRD01_API_PATHS.wechatId),
  saveWechatId: (wechatId: string) =>
    put<ProfileDetail>(PRD01_API_PATHS.wechatId, { wechatId }),
  getAccessStatus: () => get<AccessStatus>(PRD01_API_PATHS.accessStatus),
  uploadAvatar: (filePath: string) => uploadDirectToOss(PRD01_API_PATHS.uploadAvatarTicket, filePath),
  uploadEducation: (filePath: string) => uploadDirectToOss(PRD01_API_PATHS.uploadEducationTicket, filePath),
  uploadAlbum: (filePath: string) => uploadDirectToOss(PRD01_API_PATHS.uploadAlbumTicket, filePath),
  uploadBackground: (filePath: string) => uploadDirectToOss(PRD01_API_PATHS.uploadBackgroundTicket, filePath),
  uploadVoice: (filePath: string) => uploadDirectToOss(PRD01_API_PATHS.uploadVoiceTicket, filePath),
}
