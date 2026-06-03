import { post } from './request'
import type { LoginReq, LoginVO } from '@/types/user'

/** 微信登录：用 wx.login 的 code 换取后端 token */
export async function loginByCode(code: string): Promise<LoginVO> {
  return post<LoginVO>('/miniapp/login', { code } as LoginReq)
}
