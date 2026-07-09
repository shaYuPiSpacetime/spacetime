/** 小程序用户信息 */
export interface AppUserVO {
  id: number
  nickname: string
  avatar: string
  gender: string
  school: string
  age: number
}

/** 登录请求 */
export interface LoginReq {
  loginCode: string
  phoneCode: string
  agreeProtocol?: boolean
}

/** 登录返回 */
export interface LoginVO {
  token: string
  userId: number
  openid?: string
  phone?: string
  maskedPhone?: string
  nickname?: string
  avatar?: string
  firstLoginCompleted?: boolean
}

/** 匹配用户卡片 */
export interface MatchUserCard {
  id: number
  nickname: string
  avatar: string
  age: number
  school: string
  tags: string[]
  distance?: string
}
