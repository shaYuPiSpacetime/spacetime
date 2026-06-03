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
  code: string
}

/** 登录返回 */
export interface LoginVO {
  token: string
  userId: number
  nickname: string
  avatar: string
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
