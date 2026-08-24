import Taro from '@tarojs/taro'
import { resolveVerificationOnboardingRoute } from '@/domain/verificationOnboardingFlow'
import { prd01Api } from '@/services/prd01'

/** 按服务端最新状态进入下一未完成的资料或认证步骤。 */
export async function navigateToPendingVerification() {
  try {
    const [basic, verification, introduction] = await Promise.all([
      prd01Api.getBasicProfile(),
      prd01Api.getVerificationStatus(),
      prd01Api.getIntroduction(),
    ])
    const route = resolveVerificationOnboardingRoute({
      basicCompleted: basic.basicProfileCompleted,
      avatarStatus: verification.avatarVerifyStatus,
      introductionStatus: introduction.auditStatus,
    })
    await Taro.navigateTo({ url: route })
  } catch (error) {
    await Taro.showToast({
      title: error instanceof Error ? error.message : '认证状态加载失败，请稍后重试',
      icon: 'none',
    })
  }
}
