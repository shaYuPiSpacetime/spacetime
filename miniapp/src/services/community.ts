import { get, post } from './request'
import type { PageVO } from '@/types/api'

/** 社区动态 */
export interface FeedVO {
  id: number
  userId: number
  nickname: string
  avatar: string
  content: string
  images: string[]
  likeCount: number
  commentCount: number
  createTime: string
}

/** 获取社区动态列表 */
export function getFeedList(page: number, size: number): Promise<PageVO<FeedVO>> {
  return get<PageVO<FeedVO>>('/miniapp/community/feed', { page, size })
}

/** 发布动态 */
export function publishFeed(content: string, images: string[]): Promise<number> {
  return post<number>('/miniapp/community/feed', { content, images })
}
