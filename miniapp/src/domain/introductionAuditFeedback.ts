export const INTRODUCTION_REJECTED_MESSAGE = '检测到敏感内容，请修改后重新提交'

/**
 * 第三方审核原因只用于识别驳回状态，面向用户统一展示稳定、可执行的中文提示。
 */
export function resolveIntroductionRejectedMessage(_providerReason?: string) {
  return INTRODUCTION_REJECTED_MESSAGE
}
