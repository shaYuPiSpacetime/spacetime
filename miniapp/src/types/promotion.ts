import type { PageVO } from '@/types/api'

/** 邀请来源类型。 */
export type InviteSourceType = 'normal_user' | 'campus_agent'

/** 邀请奖励发放状态。 */
export type InviteRewardStatus = 'pending' | 'success' | 'failed'

/** 首页阶梯进度。 */
export interface InviteLadderVO {
  /** 达标人数。 */
  threshold: number
  /** 额外奖励千寻币数量。 */
  rewardAmount: number
  /** 是否已经获得该档奖励。 */
  achieved: boolean
}

/** 被邀请好友的脱敏信息。 */
export interface InviteeSummaryVO {
  userNo?: string
  nickname: string
  avatarUrl?: string
  mobileMasked?: string
}

/** 首页最近邀请记录。 */
export interface RecentInviteVO {
  relationNo: string
  invitee: InviteeSummaryVO
  registeredAt: string
  rewardAmount: number
  rewardStatus: InviteRewardStatus
}

/** 分享上下文。 */
export interface InviteShareContextVO {
  title: string
  path: string
  link: string
  /** 后端生成的可直接拼接到分享路径的来源参数。 */
  query?: Record<string, string>
  /** 兼容显式字段；客户端仍优先使用 query 对象。 */
  sourceType?: InviteSourceType
  sourceToken?: string
}

/** 邀请首页聚合数据。 */
export interface InviteHomeVO {
  registerReward: number
  successCount: number
  paidRewardTotal: number
  progressCurrent: number
  progressMax?: number | null
  ladders: InviteLadderVO[]
  recentRecords: RecentInviteVO[]
  shareContext: InviteShareContextVO
}

/** 单条奖励明细。 */
export interface InviteRewardItemVO {
  rewardNo: string
  eventType: string
  eventLabel: string
  amount: number
  status: InviteRewardStatus
  createdAt: string
  paidAt?: string
  failureReason?: string
  ladderThreshold?: number | null
}

/** 邀请记录。 */
export interface InviteRecordVO {
  relationNo: string
  invitee: InviteeSummaryVO
  registeredAt: string
  paidTotal: number
  rewardStatus: InviteRewardStatus
  rewardItems: InviteRewardItemVO[]
}

/** 邀请记录分页。 */
export type InviteRecordPageVO = PageVO<InviteRecordVO>

/** 邀请来源记录请求。 */
export interface CreateInviteSourceTraceReq {
  sourceType: InviteSourceType
  sourceToken: string
  visitorKey?: string
}

/** 邀请来源记录响应。 */
export interface InviteSourceTraceVO {
  traceNo: string
  expiresAt?: string
}

/** PRD-06 邀请规则 H5 内容。 */
export interface InviteRulesH5VO {
  title: string
  version: string
  updatedAt: string
  enabled?: boolean
  /** 当前配置 URL，仅用于在线展示，不作为正文缓存。 */
  url?: string
  /** 服务端清洗后的安全 HTML 快照。 */
  htmlSnapshot?: string
  /** 不可变的版本化快照代理地址。 */
  snapshotUrl?: string
}
