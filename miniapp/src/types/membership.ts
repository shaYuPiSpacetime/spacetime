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
  monthlyPriceLabel?: string;
  tag?: string;
  subscriptionType?: string;
  perks: string[];
}

/** 会员记录 */
export interface MembershipRecord {
  id: number;
  planName: string;
  packageId?: number;
  subscriptionType?: string;
  durationDays?: number;
  listTitle?: string;
  durationLabel?: string;
  amount: number;
  startTime: string;
  endTime: string;
  validityStart?: string;
  validityEnd?: string;
  status: string;
  statusCode?: string;
  orderNo?: string;
  createTime?: string;
  payTime?: string;
  payMethod?: string;
}

/** 我的会员状态 */
export interface MyMembership {
  status: MemberStatus;
  startTime?: string;
  expireTime?: string;
  planName?: string;
  orderNo?: string;
  packageId?: number;
  subscriptionType?: string;
  payChannel?: string;
}
