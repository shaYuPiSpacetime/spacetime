export interface DictOption {
  code: string
  label: string
  sort?: number
  categoryCode?: string
  categoryLabel?: string
}

export interface ProfileTagGroup {
  categoryCode: string
  categoryLabel: string
  options: DictOption[]
}

export interface ProfileOptions {
  gender: DictOption[]
  identity: DictOption[]
  educationLevel: DictOption[]
  industry: DictOption[]
  occupation: DictOption[]
  annualIncome: DictOption[]
  maritalStatus: DictOption[]
  datingGoal: DictOption[]
  emotionalStatus: DictOption[]
  educationUserType: DictOption[]
  educationMethod: DictOption[]
  auditStatus: DictOption[]
  auditSource: DictOption[]
  coreAccessStatus: DictOption[]
  avatarSource: DictOption[]
  profileTag: DictOption[]
  profileTagGroups: ProfileTagGroup[]
}

export type ProfileOptionKey = Exclude<keyof ProfileOptions, 'profileTagGroups'>

export interface RegionOption {
  code: string
  label: string
  leaf: boolean
  name?: string
  level?: 'PROVINCE' | 'CITY' | 'DISTRICT'
  hasChildren?: boolean
}

/** 省市两级地区树；城市节点的 children 固定为空数组。 */
export interface RegionTreeOption {
  code: string
  name: string
  level: 'PROVINCE' | 'CITY'
  children: RegionTreeOption[]
}

export interface CopywritingItem {
  group?: string
  scene?: string
  enabled: boolean
  content?: string
}

export interface InitFieldConfig {
  step: number
  fieldId: string
  label?: string
  visible: boolean
  required: boolean
  requiredMode?: 'fixed' | 'conditional' | 'configurable' | string
  allowEmpty?: boolean
  submitFields?: string[]
}

export interface ProfileFieldSetting {
  group?: string
  label?: string
  fieldId: string
  pageMenu?: string
  visible: boolean
  required: boolean
  requiredMode?: 'fixed' | 'conditional' | 'configurable' | string
  editable?: boolean
  fieldType?: string
  dictType?: string
  scoreEnabled?: boolean
  minValue?: number
  maxValue?: number
  minLength?: number
  maxLength?: number
}

export interface UploadRule {
  maxCount: number
  maxMb: number
  formats: string[]
}

export interface Prd01Config {
  accessPolicy: {
    minAge: number
    maxAge: number
    tripleCertificationRequired: boolean
    requiredCertifications?: string[]
  }
  initFields: InitFieldConfig[]
  requiredFields: string[]
  fieldSettings: ProfileFieldSetting[]
  profileCompleteness?: {
    studentTotalScore?: number
    workerTotalScore?: number
    items?: Array<Record<string, unknown>>
  }
  copywriting: Record<string, CopywritingItem>
  uploadLimits: {
    education: UploadRule
    album: UploadRule
    profileBg: UploadRule
    voice: UploadRule
    voiceMinDuration: number
    voiceMaxDuration: number
  }
  auditPolicy: {
    educationSlaHours: number
    educationSlaText: string
  }
  smsSecurity: {
    sendCountdownSeconds: number
    validMinutes: number
    dailySendLimit: number
    providerCode: string
  }
  regionScope: {
    locationDictPath: string
    supportsLocation?: boolean
    supportsOverseas?: boolean
  }
  configUpdatedAt?: string
}

export interface AccessStatus {
  canBrowseCards: boolean
  canMatch: boolean
  canMessage: boolean
  canCommunity: boolean
  canBeExposed: boolean
  coreAccessStatus: string
  blockReasons: string[]
}

export interface LoginResult {
  token: string
  userId: number
  phone?: string
  maskedPhone?: string
  nickname?: string
  avatar?: string
  openid?: string
  isNewUser?: boolean
  firstLoginCompleted: boolean
  nextStep?: number
  accessStatus?: AccessStatus
}

export interface SmsCodeResult {
  countdownSeconds: number
  validMinutes: number
  dailyLimit: number
  dailyRemaining: number
  providerCode: string
}

export interface FileUploadResult {
  key?: string
  url: string
  protectedFile: boolean
  fileSizeBytes: number
}

export interface OssUploadTicket {
  uploadUrl: string
  key: string
  formData: Record<string, string>
  expiresAt: number
  fileUrl: string
  protectedFile: boolean
}

export interface ProfileInitStatus {
  firstLoginCompleted: boolean
  currentStep?: number
  nextStep?: number
  completedSteps: number[]
  nextAction: string
  savedFields: Record<string, unknown>
}

export interface ProfileInitValues {
  gender?: string
  birthday?: string
  identity?: string
  educationLevel?: string
  locationProvince?: string
  locationCity?: string
  locationDistrict?: string
}

export interface ProfileInitStepRequest extends ProfileInitValues {
  step: number
}

export interface VerificationStatus {
  realNameStatus?: string
  realNameRejectReason?: string
  realNameSubmitTime?: string
  realNameCanSubmit?: boolean
  educationStatus?: string
  educationRejectReason?: string
  educationSubmitTime?: string
  educationCanSubmit?: boolean
  educationBlockedReason?: string
  educationSlaHours?: number
  educationSlaText?: string
  educationEstimatedCompleteTime?: string
  avatarVerifyStatus?: string
  avatarVerifyRejectReason?: string
  avatarVerifySubmitTime?: string
  avatarCanSubmit?: boolean
  profilePhotoAuditStatus?: string
  openTextAuditStatus?: string
  verifyLevel?: number
  unlockMateRecommend?: boolean
  coreAccessStatus?: string
  accessStatus?: AccessStatus
}

export interface AvatarDetail {
  latestAvatarUrl?: string
  effectiveAvatarUrl?: string
  auditStatus?: string
  auditSource?: string
  rejectReason?: string
  submitTime?: string
  canSubmit: boolean
}

export interface AvatarSubmitResult {
  auditRecordId: number
  auditStatus: string
  auditSource?: string
}

export interface RealNameDetail {
  realName?: string
  idCardNo?: string
  auditStatus?: string
  auditSource?: string
  rejectReason?: string
  submitTime?: string
  canSubmit: boolean
}

export interface RealNameSubmitRequest {
  realName: string
  idCardNo: string
  singleCommitmentChecked: boolean
}

export type EducationMethod = 'STUDENT_CARD' | 'CHSI' | 'DIPLOMA_NO' | 'MATERIAL_UPLOAD'

export interface EducationFormValues {
  educationUserType: string
  schoolName: string
  schoolCode?: string
  educationLevel: string
  chsiCode?: string
  diplomaNo?: string
  certificateName?: string
  materialUrls?: string[]
  educationAgreementChecked: boolean
}

export interface EducationSubmitRequest extends EducationFormValues {
  educationMethod: EducationMethod
}

export interface EducationDetail extends Partial<EducationSubmitRequest> {
  auditStatus?: string
  auditSource?: string
  rejectReason?: string
  submitTime?: string
  canSubmit: boolean
  blockedReason?: string
  educationSlaHours?: number
  educationSlaText?: string
  educationEstimatedCompleteTime?: string
  educationUserTypeLabel?: string
  identityCode?: string
  identityLabel?: string
  educationMethodLabel?: string
  educationLevelLabel?: string
}

export interface ProfileMedia {
  mediaId: number
  mediaType?: string
  mediaUrl: string
  thumbUrl?: string
  fileSizeBytes?: number
  sortOrder?: number
  auditStatus?: string
  auditSource?: string
  rejectReason?: string
}

export interface ProfileMediaSubmitInput {
  mediaUrl: string
  thumbUrl?: string
  fileSizeBytes: number
  sortOrder?: number
}

export interface OpenTextDetail {
  latestContent?: string
  effectiveContent?: string
  auditStatus?: string
  auditSource?: string
  rejectReason?: string
  submitTime?: string
  canSubmit: boolean
}

export interface OpenTextAuditResult {
  fieldName: string
  auditStatus: string
  auditSource?: string
  rejectReason?: string
}

export interface AboutMeQuestion {
  questionKey: string
  title: string
  placeholder: string
  latestContent?: string
  effectiveContent?: string
  auditStatus?: string
  rejectReason?: string
  canSubmit: boolean
}

export interface AboutMeDetail {
  questions: AboutMeQuestion[]
}

export interface VoiceIntro {
  voiceIntroUrl?: string
  voiceIntroDuration?: number
  voiceIntroAuditStatus?: string
  voiceIntroRejectReason?: string
  visibleToPublic?: boolean
  canSubmit?: boolean
}

export interface SongOption {
  songId: string
  songName: string
  artistName?: string
  coverUrl?: string
}

export interface SchoolOption {
  code: string
  name: string
  shortName?: string
  province?: string
  city?: string
  is985?: boolean
  is211?: boolean
  isDualClass?: boolean
  source?: 'LOCAL' | 'GUGUDATA' | string
}

export interface ProfileDetail extends Record<string, unknown> {
  profileScore?: number
}

export interface ProfileHomeDetail {
  profile: ProfileDetail
  fieldSettings: ProfileFieldSetting[]
  verificationStatus: VerificationStatus
  accessStatus: AccessStatus
  profileOptionsPath: string
  locationOptionsPath: string
  runtimeConfig: Partial<Prd01Config>
}

export interface BasicProfile extends Record<string, unknown> {
  userId?: number
  nickname?: string
  gender?: string
  birthday?: string
  age?: number
  zodiac?: string
  height?: number
  weight?: number
  identity?: string
  educationLevel?: string
  industry?: string
  occupation?: string
  annualIncome?: string
  maritalStatus?: string
  locationProvince?: string
  locationProvinceLabel?: string
  locationCity?: string
  locationCityLabel?: string
  locationDistrict?: string
  hometownProvince?: string
  hometownProvinceLabel?: string
  hometownCity?: string
  hometownCityLabel?: string
  hometownDistrict?: string
  company?: string
  school?: string
  schoolCode?: string
  major?: string
  minAge?: number
  maxAge?: number
  profileScore?: number
  basicProfileCompleted?: boolean
  nextAction?: string
  missingRequiredFields?: string[]
  fieldSettings?: ProfileFieldSetting[]
}
