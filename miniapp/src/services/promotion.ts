import { get, post } from './request'

/** 推广邀请记录 */
export interface InviteRecordVO {
  id: number
  inviteeName: string
  inviteeAvatar: string
  reward: number
  createTime: string
}

/** 获取我的邀请记录 */
export function getInviteRecords(page: number, size: number): Promise<{ records: InviteRecordVO[]; total: number }> {
  return get('/miniapp/promotion/invites', { page, size })
}

/** 获取分享邀请码 */
export function getMyInviteCode(): Promise<{ code: string; qrcode: string }> {
  return get('/miniapp/promotion/invite-code')
}

/** 使用邀请码 */
export function useInviteCode(code: string): Promise<void> {
  return post('/miniapp/promotion/use-code', { code })
}
