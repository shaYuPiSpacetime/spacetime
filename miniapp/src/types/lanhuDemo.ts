import type { CoinPackage, CoinTransaction, CoinUsage } from './coin'
import type { MemberStatus, MembershipPlan, MembershipRecord, MyMembership } from './membership'

export type LanhuDesignStatus = 'todo' | 'ready' | 'implemented'

export interface LanhuDesignItem {
  id: string
  index: number
  name: string
  flow: string
  route?: string
  status: LanhuDesignStatus
  sourceUrl?: string
  assetRefs: string[]
}

export interface DemoFlowStep {
  key: string
  title: string
  route: string
  designNames: string[]
  nextRoute?: string
  fallbackRoute?: string
}

export interface LoginDemoData {
  uiDesigns: LanhuUiDesignCoverageItem[]
  methods: Array<{
    key: 'wechat' | 'phone'
    title: string
    desc: string
    buttonText: string
  }>
  agreement: {
    title: string
    content: string
    disagreeText: string
    agreeText: string
    errorText: string
  }
  phoneLogin: {
    defaultPhone: string
    defaultCode: string
    codeButtonText: string
    submitText: string
  }
  educationOptions: string[]
  identityOptions: string[]
  goalOptions: string[]
  ageRange: {
    min: number
    max: number
    defaultBirthday: string
  }
  provinceCityMap: Record<string, string[]>
  defaultAddress: {
    province: string
    city: string
  }
  defaultUser: {
    userId: number
    nickname: string
    avatar: string
  }
}

export interface LanhuUiDesignCoverageItem {
  key: string
  designName: string
  route: string
  variant: string
  description: string
}

export interface VerificationDemoData {
  uiDesigns: LanhuUiDesignCoverageItem[]
  introTitle: string
  introDescription: string
  certItems: Array<{
    title: string
    desc: string
    buttonText: string
    disabled?: boolean
    route: string
  }>
  completedCertTitles: string[]
  realNameActive: {
    realName: string
    idCard: string
  }
  introDefaultText: string
  basicInfoLabels: string[]
}

export interface MembershipDemoData {
  uiDesigns: LanhuUiDesignCoverageItem[]
  myMembership: MyMembership
  activeMembership: MyMembership
  expiredMembership: MyMembership
  annualPlanId: number
  plans: MembershipPlan[]
  records: MembershipRecord[]
  benefits: Array<{
    icon: string
    title: string
    value: string
    desc: string
  }>
}

export interface CoinsDemoData {
  uiDesigns: LanhuUiDesignCoverageItem[]
  balance: number
  packages: CoinPackage[]
  transactions: CoinTransaction[]
  usages: CoinUsage[]
  agreement: {
    defaultChecked: boolean
    title: string
    uncheckedMessage: string
  }
}

export interface ProfileDemoData {
  uiDesigns: LanhuUiDesignCoverageItem[]
  nickname: string
  location: string
  age: number
  zodiac: string
  isVerified: boolean
  verifiedLabels: string[]
  defaultSelectedTags: string[]
  tagGroups: Array<{
    title: string
    subtitle: string
    tags: string[]
  }>
  stats: {
    likedCount: number
    beLikedCount: number
    visitorCount: number
  }
}

export interface LanhuDemoData {
  projectName: string
  projectUrl: string
  totalDesigns: number
  designs: LanhuDesignItem[]
  flows: {
    main: DemoFlowStep[]
  }
  login: LoginDemoData
  verification: VerificationDemoData
  membership: MembershipDemoData
  coins: CoinsDemoData
  profile: ProfileDemoData
}

export type LanhuDemoPageKey = 'login' | 'verification' | 'membership' | 'coins' | 'profile'
