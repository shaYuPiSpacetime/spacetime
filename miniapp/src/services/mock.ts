import type { FeaturedGuest } from '@/types/featured';
import type { MembershipPlan, MembershipRecord, MyMembership } from '@/types/membership';
import type { CoinPackage, CoinTransaction, CoinUsage } from '@/types/coin';
import { getDemoPageData } from './lanhuDemo';

const membershipDemo = getDemoPageData('membership');
const coinsDemo = getDemoPageData('coins');

/** 模拟精选嘉宾列表 */
export const mockFeaturedGuests: FeaturedGuest[] = [
  {
    id: 1,
    nickname: '小雨',
    avatar: '',
    age: 24,
    education: '浙江大学',
    location: '杭州',
    height: 165,
    photos: [],
    authStatus: 'triple',
    isLocked: false,
    unlockCost: 45,
    tags: ['温柔', '爱运动'],
  },
  {
    id: 2,
    nickname: '小鹿',
    avatar: '',
    age: 26,
    education: '复旦大学',
    location: '上海',
    height: 162,
    photos: [],
    authStatus: 'double',
    isLocked: true,
    unlockCost: 60,
    tags: ['文艺', '爱旅行'],
  },
  {
    id: 3,
    nickname: '思思',
    avatar: '',
    age: 23,
    education: '南京大学',
    location: '南京',
    height: 168,
    photos: [],
    authStatus: 'triple',
    isLocked: true,
    unlockCost: 50,
    tags: ['开朗', '爱美食'],
  },
];

/** 模拟会员套餐 */
export const mockMembershipPlans: MembershipPlan[] = membershipDemo.plans;

/** 模拟我的会员状态 — 蓝湖设计稿「会员未开通」默认验收态 */
export const mockMyMembership: MyMembership = {
  ...membershipDemo.myMembership,
};

/** 模拟成家币套餐 */
export const mockCoinPackages: CoinPackage[] = coinsDemo.packages;

/** 模拟成家币余额 */
export const mockCoinBalance = coinsDemo.balance;

/** 模拟成家币交易明细 */
export const mockCoinTransactions: CoinTransaction[] = coinsDemo.transactions;

/** 模拟成家币用途列表 */
export const mockCoinUsages: CoinUsage[] = coinsDemo.usages;

/** 模拟会员记录 */
export const mockMembershipRecords: MembershipRecord[] = membershipDemo.records;

/** 模拟觅缘推荐用户 */
export interface MockMatchUser {
  id: number;
  nickname: string;
  avatar: string;
  age: number;
  education: string;
  location: string;
  tags: string[];
  isOnline: boolean;
}

export const mockMatchUsers: MockMatchUser[] = [
  { id: 1, nickname: '小雨', avatar: '', age: 24, education: '浙大', location: '杭州', tags: ['温柔', '爱运动'], isOnline: true },
  { id: 2, nickname: '小鹿', avatar: '', age: 26, education: '复旦', location: '上海', tags: ['文艺', '爱旅行'], isOnline: false },
  { id: 3, nickname: '思思', avatar: '', age: 23, education: '南大', location: '南京', tags: ['开朗', '爱美食'], isOnline: true },
  { id: 4, nickname: '小美', avatar: '', age: 25, education: '武大', location: '武汉', tags: ['阳光', '爱摄影'], isOnline: true },
];
