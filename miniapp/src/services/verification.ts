import Taro from '@tarojs/taro'
import { MOCK_ENABLED } from '@/constants/config'
import { get, post } from './request'
import type { EducationSubmitReq, RealNameSubmitReq, VerificationStatusVO } from '@/types/verification'

// ==================== Mock 数据 ====================

/** Mock 认证状态：未认证的初始状态 */
const mockStatus: VerificationStatusVO = {
  realNameStatus: 'NONE',
  educationStatus: 'NONE',
  avatarVerifyStatus: 'NONE',
  verifyLevel: 0,
  unlockMateRecommend: false,
}

/**
 * 获取认证状态
 * Mock 模式：返回未认证的初始状态
 */
export async function getVerificationStatus(): Promise<VerificationStatusVO> {
  if (MOCK_ENABLED) {
    return { ...mockStatus }
  }
  return get<VerificationStatusVO>('/miniapp/verify/status')
}

/**
 * 提交实名认证
 * Mock 模式：模拟提交成功，直接标记为已通过
 */
export async function submitRealName(data: RealNameSubmitReq): Promise<VerificationStatusVO> {
  if (MOCK_ENABLED) {
    Taro.showToast({ title: '实名认证提交成功', icon: 'success', duration: 1500 })
    return {
      ...mockStatus,
      realNameStatus: 'APPROVED',
      verifyLevel: 1,
      unlockMateRecommend: true,
    }
  }
  return post<VerificationStatusVO>('/miniapp/verify/real-name', data as unknown as Record<string, unknown>)
}

/**
 * 提交学历认证
 * Mock 模式：模拟提交成功，状态设为审核中
 */
export async function submitEducation(data: EducationSubmitReq): Promise<VerificationStatusVO> {
  if (MOCK_ENABLED) {
    Taro.showToast({ title: '学历认证提交成功，审核中', icon: 'success', duration: 1500 })
    return {
      ...mockStatus,
      educationStatus: 'PENDING',
      verifyLevel: 0,
    }
  }
  return post<VerificationStatusVO>('/miniapp/verify/education', data as unknown as Record<string, unknown>)
}
