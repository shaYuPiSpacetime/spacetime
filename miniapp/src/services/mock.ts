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
    name: '包年',
    price: 568,
    originalPrice: 688,
    duration: 365,
    durationLabel: '12个月',
    tag: '专属2.1折',
    perks: ['无限解锁嘉宾', '查看谁喜欢我', '专属认证标识', '优先推荐'],
  },
  {
    id: 2,
    name: '包季',
    price: 418,
    originalPrice: 418,
    duration: 90,
    durationLabel: '3个月',
    tag: '专属5.2折',
    perks: ['无限解锁嘉宾', '查看谁喜欢我', '专属认证标识', '优先推荐', '每月成家币礼包'],
  },
  {
    id: 3,
    name: '包月',
    price: 268,
    originalPrice: 268,
    duration: 30,
    durationLabel: '1个月',
    tag: '尝鲜首选',
    perks: ['无限解锁嘉宾', '查看谁喜欢我', '专属认证标识', '优先推荐', '每月成家币礼包', '专属客服'],
  },
];

/** 模拟我的会员状态 — 蓝湖设计稿「会员未开通」默认验收态 */
export const mockMyMembership: MyMembership = {
  status: 'none',
};

/** 模拟成家币套餐 */
export const mockCoinPackages: CoinPackage[] = [
  { id: 1, amount: 100, price: 8, label: '解锁2位嘉宾' },
  { id: 2, amount: 3000, price: 268, label: '60位嘉宾', tag: '热销推荐' },
  { id: 3, amount: 6000, price: 428, label: '150位嘉宾', tag: '节省最多' },
  { id: 4, amount: 12000, price: 698, label: '300位嘉宾' },
];

/** 模拟成家币余额 */
export const mockCoinBalance = 1800;

/** 模拟成家币交易明细 */
export const mockCoinTransactions: CoinTransaction[] = [
  { id: 1, type: 'income', amount: 100, description: '邀请好友获得', time: '2026.04.29 15:26:56', balance: 1800 },
  { id: 2, type: 'income', amount: 100, description: '邀请好友获得', time: '2026.04.29 15:26:56', balance: 1700 },
  { id: 3, type: 'income', amount: 100, description: '邀请好友获得', time: '2026.04.29 15:26:56', balance: 1600 },
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
  { id: 1, planName: '时空邂逅VIP', amount: 568, startTime: '2026.05.28 15:58', endTime: '2027.05.27 15:58', status: '生效中' },
  { id: 2, planName: '时空邂逅VIP', amount: 568, startTime: '2026.05.28 15:58', endTime: '2027.05.27 15:58', status: '已退款' },
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
