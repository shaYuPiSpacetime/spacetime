import type { FeaturedGuest } from '@/types/featured';
import type { MembershipPlan, MembershipRecord, MyMembership } from '@/types/membership';
import type { CoinPackage, CoinTransaction, CoinUsage } from '@/types/coin';

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
export const mockMembershipPlans: MembershipPlan[] = [
  {
    id: 1,
    name: '月卡会员',
    price: 30,
    originalPrice: 60,
    duration: 30,
    durationLabel: '1个月',
    perks: ['无限解锁嘉宾', '查看谁喜欢我', '专属认证标识', '优先推荐'],
  },
  {
    id: 2,
    name: '季卡会员',
    price: 78,
    originalPrice: 180,
    duration: 90,
    durationLabel: '3个月',
    tag: '热门',
    perks: ['无限解锁嘉宾', '查看谁喜欢我', '专属认证标识', '优先推荐', '每月成家币礼包'],
  },
  {
    id: 3,
    name: '年卡会员',
    price: 258,
    originalPrice: 720,
    duration: 365,
    durationLabel: '12个月',
    tag: '最划算',
    perks: ['无限解锁嘉宾', '查看谁喜欢我', '专属认证标识', '优先推荐', '每月成家币礼包', '专属客服'],
  },
];

/** 模拟我的会员状态 */
export const mockMyMembership: MyMembership = {
  status: 'none',
};

/** 模拟成家币套餐 */
export const mockCoinPackages: CoinPackage[] = [
  { id: 1, amount: 60, price: 6, label: '60个' },
  { id: 2, amount: 180, price: 18, label: '180个', tag: '热门' },
  { id: 3, amount: 500, price: 50, label: '500个', tag: '推荐' },
  { id: 4, amount: 1200, price: 120, label: '1200个', tag: '最划算' },
];

/** 模拟成家币余额 */
export const mockCoinBalance = 1800;

/** 模拟成家币交易明细 */
export const mockCoinTransactions: CoinTransaction[] = [
  { id: 1, type: 'income', amount: 500, description: '充值 500 成家币', time: '2026-06-03 12:30', balance: 1800 },
  { id: 2, type: 'expense', amount: -45, description: '解锁嘉宾 @小雨', time: '2026-06-02 15:20', balance: 1300 },
  { id: 3, type: 'income', amount: 100, description: '邀请好友奖励', time: '2026-06-01 10:00', balance: 1345 },
  { id: 4, type: 'expense', amount: -30, description: '发送悄悄话', time: '2026-05-31 20:15', balance: 1245 },
];

/** 模拟成家币用途列表 */
export const mockCoinUsages: CoinUsage[] = [
  { icon: '', label: '送悄悄话' },
  { icon: '', label: '心动信号' },
  { icon: '', label: '解锁理想型' },
  { icon: '', label: '提升人气' },
  { icon: '', label: '解锁精选' },
  { icon: '', label: '更多推荐' },
  { icon: '', label: '匿名解锁' },
  { icon: '', label: '限定活动' },
];

/** 模拟会员记录 */
export const mockMembershipRecords: MembershipRecord[] = [
  { id: 1, planName: '月卡会员', amount: 30, startTime: '2026-05-03 10:00', endTime: '2026-06-03 10:00', status: '已过期' },
  { id: 2, planName: '年卡会员', amount: 258, startTime: '2025-06-03 10:00', endTime: '2026-06-03 10:00', status: '即将过期' },
];

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
