import { prd01Api } from './prd01'
import type { LoginReq, LoginVO } from '@/types/user'
import type { SmsCodeResult } from '@/types/prd01'

/** 微信授权手机号登录：用 wx.login code + getPhoneNumber code 换取后端 token */
export async function loginByWechatPhone(data: LoginReq): Promise<LoginVO> {
  return prd01Api.wechatLogin(data.loginCode, data.phoneCode, data.agreeProtocol)
}

export function sendPhoneSmsCode(phone: string): Promise<SmsCodeResult> {
  return prd01Api.sendSmsCode(phone)
}

export function loginByPhone(phone: string, smsCode: string, agreeProtocol: boolean): Promise<LoginVO> {
  return prd01Api.phoneLogin(phone, smsCode, agreeProtocol)
}
