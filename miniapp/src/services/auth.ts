import { prd01Api } from './prd01'
import {
  clearPendingPromotionTraceNos,
  getPendingPromotionTraceNos,
  waitForPromotionAttributionCapture,
} from './promotionAttribution'
import type { LoginReq, LoginVO } from '@/types/user'
import type { SmsCodeResult } from '@/types/prd01'

/** 微信授权手机号登录：用 wx.login code + getPhoneNumber code 换取后端 token */
export async function loginByWechatPhone(data: LoginReq): Promise<LoginVO> {
  await waitForPromotionAttributionCapture(150)
  const promotionTraceNos = getPendingPromotionTraceNos()
  const result = await prd01Api.wechatLogin(
    data.loginCode,
    data.phoneCode,
    data.agreeProtocol,
    promotionTraceNos,
  )
  clearPendingPromotionTraceNos()
  return result
}

export function sendPhoneSmsCode(phone: string): Promise<SmsCodeResult> {
  return prd01Api.sendSmsCode(phone)
}

export async function loginByPhone(
  phone: string,
  smsCode: string,
  agreeProtocol: boolean,
): Promise<LoginVO> {
  await waitForPromotionAttributionCapture(150)
  const promotionTraceNos = getPendingPromotionTraceNos()
  const result = await prd01Api.phoneLogin(phone, smsCode, agreeProtocol, promotionTraceNos)
  clearPendingPromotionTraceNos()
  return result
}
