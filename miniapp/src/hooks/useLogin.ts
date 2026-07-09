import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { post } from '@/services/request'
import { getDemoPageData } from '@/services/lanhuDemo'
import type { LoginStep, LoginUserInfo } from '@/types/login'

// ==================== Mock 数据 ====================

const loginDemo = getDemoPageData('login')

/** 学历选项列表（Mock） */
const EDUCATION_OPTIONS: string[] = loginDemo.educationOptions

/** 身份选项列表（Mock） */
const IDENTITY_OPTIONS: string[] = loginDemo.identityOptions

/** 脱单目标选项列表（Mock） */
const GOAL_OPTIONS: string[] = loginDemo.goalOptions

/** 年龄范围 */
const AGE_RANGE = {
  min: loginDemo.ageRange.min,
  max: loginDemo.ageRange.max,
}

/** 省份城市映射（Mock 数据） */
const PROVINCE_CITY_MAP: Record<string, string[]> = loginDemo.provinceCityMap

// ==================== 登录流程状态 Store ====================

interface LoginFlowState {
  /** 当前步骤 */
  step: LoginStep
  /** 用户填写的信息 */
  userInfo: LoginUserInfo
  /** 设置当前步骤 */
  setStep: (step: LoginStep) => void
  /** 更新用户信息（合并） */
  updateUserInfo: (info: Partial<LoginUserInfo>) => void
  /** 重置登录流程 */
  reset: () => void
}

/**
 * 登录流程共享状态 Store
 * 跨页面共享，各步骤页面通过 useLogin hook 读写
 */
const useLoginFlowStore = create<LoginFlowState>((set) => ({
  step: 'auth',
  userInfo: {},
  setStep: (step) => set({ step }),
  updateUserInfo: (info) =>
    set((state) => ({ userInfo: { ...state.userInfo, ...info } })),
  reset: () => set({ step: 'auth', userInfo: {} }),
}))


// ==================== Hook ====================

/**
 * 登录流程 Hook
 * 提供跨页面的登录状态管理、步骤导航、选项数据、Mock 提交
 */
export function useLogin() {
  const { step, userInfo, setStep, updateUserInfo, reset } = useLoginFlowStore()

  /**
   * 获取指定省份的城市列表
   * @param province 省份名称
   * @returns 城市名称数组
   */
  const getCities = (province: string): string[] => {
    return PROVINCE_CITY_MAP[province] || []
  }

  /**
   * 提交首登资料
   * 依赖微信授权手机号登录后写入的真实 token，将轻量资料落库后进入首页。
   */
  const submit = async (): Promise<void> => {
    try {
      await post('/miniapp/profile/init-complete', buildProfileInitPayload(userInfo))

      // 重置登录流程状态
      reset()

      Taro.showToast({ title: '登录成功', icon: 'success', duration: 1500 })

      // 延迟跳转首页
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/index/index' })
      }, 1500)
    } catch {
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  }

  return {
    /** 当前步骤 */
    step,
    /** 用户已填写的信息 */
    userInfo,
    /** 学历选项列表 */
    educationOptions: EDUCATION_OPTIONS,
    /** 身份选项列表 */
    identityOptions: IDENTITY_OPTIONS,
    /** 脱单目标选项列表 */
    goalOptions: GOAL_OPTIONS,
    /** 年龄范围 { min: 18, max: 60 } */
    ageRange: AGE_RANGE,
    /** 省份名称列表 */
    provinces: Object.keys(PROVINCE_CITY_MAP),
    /** 根据省份获取城市列表 */
    getCities,
    /** 更新用户信息（合并写入） */
    updateUserInfo,
    /** 提交登录（Mock，成功后跳转首页） */
    submit,
    /** 设置当前步骤 */
    setStep,
    /** 重置登录流程状态 */
    reset,
  }
}

function buildProfileInitPayload(userInfo: LoginUserInfo): Record<string, unknown> {
  return {
    step: 3,
    nickname: userInfo.nickname || loginDemo.defaultUser.nickname,
    avatar: userInfo.avatar || loginDemo.defaultUser.avatar,
    gender: normalizeGender(userInfo.gender),
    birthday: normalizeBirthday(userInfo.birthday),
    locationProvince: userInfo.province,
    locationCity: userInfo.city,
    educationLevel: userInfo.education || userInfo.educationLevel,
    datingGoal: userInfo.datingGoal,
  }
}

function normalizeGender(gender?: LoginUserInfo['gender']) {
  if (gender === 'male') return 'MALE'
  if (gender === 'female') return 'FEMALE'
  return undefined
}

function normalizeBirthday(birthday?: string) {
  return birthday ? birthday.replace(/\//g, '-') : undefined
}
