import { post } from './request'
import type { LoginReq, LoginVO } from '@/types/user'

/** 微信授权手机号登录：用 wx.login code + getPhoneNumber code 换取后端 token */
export async function loginByWechatPhone(data: LoginReq): Promise<LoginVO> {
  return post<LoginVO>('/miniapp/auth/wechat-login', {
    loginCode: data.loginCode,
    phoneCode: data.phoneCode,
  })
}
