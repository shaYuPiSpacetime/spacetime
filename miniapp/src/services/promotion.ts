import type {
  CreateInviteSourceTraceReq,
  InviteHomeVO,
  InviteRecordPageVO,
  InviteRewardStatus,
  InviteRulesH5VO,
  InviteSourceTraceVO,
} from '@/types/promotion'
import { get, post } from './request'

/** 记录匿名邀请来源。 */
export function createInviteSourceTrace(
  payload: CreateInviteSourceTraceReq,
): Promise<InviteSourceTraceVO> {
  return post('/miniapp/promotion/source-traces', { ...payload })
}

/** 获取邀请首页聚合数据。 */
export function getInviteHome(): Promise<InviteHomeVO> {
  return get('/miniapp/promotion/invite/home')
}

/** 获取当前用户的邀请记录。 */
export function getInviteRecords(
  page: number,
  size: number,
  status?: InviteRewardStatus,
): Promise<InviteRecordPageVO> {
  return get('/miniapp/promotion/invite/records', { page, size, status })
}

/** 获取邀请活动业务规则。 */
export function getInviteRulesBusiness(): Promise<Record<string, unknown>> {
  return get('/miniapp/promotion/invite/rules')
}

/** 获取 PRD-06 当前启用的邀请规则 H5 内容。 */
export function getInviteRulesH5(): Promise<InviteRulesH5VO> {
  return get('/miniapp/app/h5-content/invite_rules')
}
