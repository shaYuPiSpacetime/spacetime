/** 会员状态 */
export type MemberStatus = 'active' | 'expired' | 'none';

/** 会员套餐 */
export interface MembershipPlan {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  duration: number;
  durationLabel: string;
  tag?: string;
  perks: string[];
}

/** 会员记录 */
export interface MembershipRecord {
  id: number;
  planName: string;
  amount: number;
  startTime: string;
  endTime: string;
  status: string;
}

/** 我的会员状态 */
export interface MyMembership {
  status: MemberStatus;
  expireTime?: string;
  planName?: string;
}
