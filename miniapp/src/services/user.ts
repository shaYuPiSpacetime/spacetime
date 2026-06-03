import { get } from './request'
import type { AppUserVO, MatchUserCard } from '@/types/user'
import type { PageVO } from '@/types/api'

/** 获取用户信息 */
export function getUserInfo(): Promise<AppUserVO> {
  return get<AppUserVO>('/miniapp/user/info')
}

/** 获取推荐用户列表 */
export function getRecommendUsers(page: number, size: number): Promise<PageVO<MatchUserCard>> {
  return get<PageVO<MatchUserCard>>('/miniapp/match/recommend', { page, size })
}
