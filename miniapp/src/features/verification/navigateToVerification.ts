import Taro from '@tarojs/taro'
import { resolveVerificationOnboardingRoute } from '@/domain/verificationOnboardingFlow'
import { prd01Api } from '@/services/prd01'
import { navigateToOrRedirect } from '@/utils/navigation'

/** 查询数据库中的最新完成状态，统一进入下一个未完成的资料或认证步骤。 */
export async function navigateToPendingVerification() {
  try {
    const basic = await prd01Api.getBasicProfile()
    if (basic.basicProfileCompleted !== true) {
      await navigateToOrRedirect('/pages/verification/basic')
      return
    }

    const [verification, introduction] = await Promise.all([
      prd01Api.getVerificationStatus(),
      prd01Api.getIntroduction(),
    ])
    const route = resolveVerificationOnboardingRoute({
      basicCompleted: basic.basicProfileCompleted,
      avatarStatus: verification.avatarVerifyStatus,
      introductionStatus: introduction.auditStatus,
    })
    await navigateToOrRedirect(route)
  } catch (error) {
    await Taro.showToast({
      title: error instanceof Error ? error.message : '认证状态加载失败，请稍后重试',
      icon: 'none',
    })
  }
}
