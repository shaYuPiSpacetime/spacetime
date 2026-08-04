import { get } from './request'

export interface PublicProfileVO {
  userId: number
  nickname: string
  avatar?: string | null
  heroPhoto?: string | null
  photos?: string[]
  gender?: string | null
  age?: number | null
  height?: number | null
  zodiac?: string | null
  currentCity?: string | null
  hometownCity?: string | null
  school?: string | null
  identityLabel?: string | null
  industryLabel?: string | null
  occupationLabel?: string | null
  company?: string | null
  annualIncomeLabel?: string | null
  tags?: string[]
  introduction?: string | null
  liked: boolean
  matched: boolean
  matchNo?: string | null
  canEnterConversation: boolean
}

/** 获取关系链路中的已审核公开资料。 */
export function getPublicProfile(userId: number): Promise<PublicProfileVO> {
  return get<PublicProfileVO>(`/miniapp/profile/public/${userId}`)
}
