import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Download,
  Heart,
  LinkIcon,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  exportAppUsers,
  getAppUserDetail,
  getAppUserList,
  importAppUsers,
  updateAppUserStatus,
  type AppUserListVO,
  type AppUserDetailVO,
  type ExportTaskVO,
  type ImportBatchVO,
  type PageResult,
} from '@/api/userApp';
import { showToast } from '@/components/ui/toast';
import { getCommercialUserAssetDetail, type UserCommercialAssetDetail } from '@/api/commercial';

type BadgeVariant = 'success' | 'destructive' | 'warning' | 'secondary';
type TagTone = 'orange' | 'purple' | 'blue' | 'green';

interface DemoTag {
  label: string;
  tone: TagTone;
}

interface CoinRecord {
  time: string;
  type: string;
  amount: string;
  balance: string;
  usage: string;
}

interface UserStats {
  total: number;
  coreAllowed: number;
}

interface AdminUserCardItem extends AppUserListVO {
  phone: string;
  city: string;
  zodiac: string;
  identity: string;
  jobTitle: string;
  company: string;
  educationText: string;
  mateRequirement: string;
  coins: number;
  vipAmount: number;
  vipLabel: string;
  vipRange: string;
  memberLevel: string;
  followStatus: string;
  avatarAccent: string;
  avatarReviewStatus: string;
  medal: boolean;
  characterTags: DemoTag[];
  coinRecords: CoinRecord[];
}

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: '待审核', variant: 'warning' },
  REVIEWING: { label: '审核中', variant: 'warning' },
  APPROVED: { label: '已通过', variant: 'success' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  NOT_SUBMITTED: { label: '未认证', variant: 'secondary' },
  NOT_CERTIFIED: { label: '未认证', variant: 'secondary' },
  EXPIRED: { label: '已失效', variant: 'secondary' },
};

type VerificationBadgeType = 'avatar' | 'realName' | 'education';

const VERIFICATION_BADGE_TEXT: Record<VerificationBadgeType, Record<string, string>> = {
  avatar: {
    APPROVED: '头像通过',
    PENDING: '头像待审',
    REVIEWING: '头像审核中',
    REJECTED: '头像驳回',
    EXPIRED: '头像失效',
    NOT_SUBMITTED: '头像未认证',
    NOT_CERTIFIED: '头像未认证',
  },
  realName: {
    APPROVED: '实名通过',
    PENDING: '实名待审',
    REVIEWING: '实名审核中',
    REJECTED: '实名驳回',
    EXPIRED: '实名失效',
    NOT_SUBMITTED: '实名未认证',
    NOT_CERTIFIED: '实名未认证',
  },
  education: {
    APPROVED: '学历通过',
    PENDING: '学历待审',
    REVIEWING: '学历审核中',
    REJECTED: '学历驳回',
    EXPIRED: '学历失效',
    NOT_SUBMITTED: '学历未认证',
    NOT_CERTIFIED: '学历未认证',
  },
};

function verificationBadgeText(type: VerificationBadgeType, status?: string) {
  return VERIFICATION_BADGE_TEXT[type][status || ''] || `${type === 'avatar' ? '头像' : type === 'realName' ? '实名' : '学历'}未知`;
}

const ACCOUNT_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  NORMAL: { label: '正常', variant: 'success' },
  FROZEN: { label: '已冻结', variant: 'destructive' },
  CANCELLING: { label: '注销中', variant: 'warning' },
  CANCELLED: { label: '已注销', variant: 'secondary' },
};

const ACCESS_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  full_access: { label: '完全准入', variant: 'success' },
  browse_only: { label: '仅浏览', variant: 'warning' },
  blocked: { label: '已阻止', variant: 'destructive' },
};

const MEMBER_LEVEL_OPTIONS = [
  { value: '', label: '会员等级' },
  { value: 'VIP会员', label: 'VIP会员' },
  { value: '普通会员', label: '普通会员' },
  { value: '高潜会员', label: '高潜会员' },
];

const CORE_ACCESS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'CORE_ALLOWED', label: '已开放' },
  { value: 'CORE_PENDING', label: '待完善' },
];

const VERIFICATION_STATUS_OPTIONS = [
  { value: '', label: '全部认证' },
  { value: 'AVATAR_APPROVED', label: '头像通过' },
  { value: 'REAL_NAME_APPROVED', label: '实名通过' },
  { value: 'EDUCATION_APPROVED', label: '学历通过' },
];

const IDENTITY_OPTIONS = [
  { value: '', label: '全部身份' },
  { value: 'WORKER', label: '职场人' },
  { value: 'STUDENT', label: '在校生' },
];

const CITY_OPTIONS = [
  { value: '', label: '全部城市' },
  { value: '上海', label: '上海' },
  { value: '杭州', label: '杭州' },
  { value: '南京', label: '南京' },
];

const FOLLOW_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '开放', label: '开放' },
  { value: '未开放', label: '未开放' },
  { value: '账号异常', label: '账号异常' },
];

const ACCESS_OPTIONS = [
  { value: '', label: '准入状态' },
  { value: 'full_access', label: '完全准入' },
  { value: 'browse_only', label: '仅浏览' },
  { value: 'blocked', label: '已阻止' },
];

const HIDE_VISIT_RECORD_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'ON', label: '已开启' },
  { value: 'OFF', label: '未开启' },
  { value: 'UNAVAILABLE', label: '权益不可用' },
];

const PAGE_SIZE = 10;

function responseData<T>(res: unknown, fallback: T): T {
  return (res as any)?.data ?? fallback;
}

const DEMO_USERS: AdminUserCardItem[] = [
  {
    id: 920001,
    avatar: createAvatar('筱脑虎', '#E8F4FF', '#2876FF'),
    nickname: '筱脑虎',
    gender: 'FEMALE',
    age: 28,
    school: '浙江工商管理大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'PENDING',
    firstLoginCompleted: 1,
    profileScore: 92,
    accountStatus: 'NORMAL',
    accessStatus: 'full_access',
    registerTime: '2026.05.16',
    lastLoginTime: '2026.06.26 22:18',
    phone: '187****9932',
    city: '浙江杭州',
    zodiac: '双鱼座',
    identity: '职场人',
    jobTitle: '工程师',
    company: '浙江某某某某科技有限公司',
    educationText: '硕士 | 浙江工商管理大学',
    mateRequirement: '希望找到一个成熟靠谱、三观契合、能一起好好过日子的人。比起外在条件，更看重内在品质和相处舒服。',
    coins: 7923,
    vipAmount: 789,
    vipLabel: 'VIP会员',
    vipRange: '2026.02.15 - 2026.03.14',
    memberLevel: 'VIP会员',
    followStatus: '开放',
    avatarAccent: '#2876FF',
    avatarReviewStatus: '待审核',
    medal: true,
    characterTags: [
      { label: '稳重', tone: 'orange' },
      { label: '成熟', tone: 'purple' },
      { label: '温柔', tone: 'blue' },
    ],
    coinRecords: [
      { time: '2026.02.15 14:30', type: '收入', amount: '+100', balance: '2580', usage: '签到奖励' },
      { time: '2026.02.15 14:30', type: '支出', amount: '-100', balance: '2480', usage: '解锁用户' },
      { time: '2026.02.15 14:30', type: '支出', amount: '-100', balance: '2580', usage: '赠送礼物' },
    ],
  },
  {
    id: 920002,
    avatar: createAvatar('许清越', '#FFF3E8', '#F59E0B'),
    nickname: '许清越',
    gender: 'MALE',
    age: 29,
    school: '上海交通大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'APPROVED',
    firstLoginCompleted: 1,
    profileScore: 88,
    accountStatus: 'NORMAL',
    accessStatus: 'full_access',
    registerTime: '2026.05.18',
    lastLoginTime: '2026.06.27 09:41',
    phone: '136****2718',
    city: '上海浦东',
    zodiac: '天秤座',
    identity: '职场人',
    jobTitle: '产品经理',
    company: '上海澄禾互联网科技有限公司',
    educationText: '硕士 | 上海交通大学',
    mateRequirement: '喜欢真诚、有边界感的沟通，希望双方都有长期关系的意愿。',
    coins: 3680,
    vipAmount: 589,
    vipLabel: '高潜会员',
    vipRange: '2026.03.01 - 2026.03.31',
    memberLevel: '高潜会员',
    followStatus: '开放',
    avatarAccent: '#F59E0B',
    avatarReviewStatus: '已通过',
    medal: false,
    characterTags: [
      { label: '理性', tone: 'green' },
      { label: '自律', tone: 'blue' },
      { label: '稳定', tone: 'orange' },
    ],
    coinRecords: [
      { time: '2026.03.01 10:12', type: '收入', amount: '+200', balance: '3680', usage: '会员赠送' },
      { time: '2026.02.28 21:08', type: '支出', amount: '-60', balance: '3480', usage: '查看联系方式' },
      { time: '2026.02.27 19:20', type: '收入', amount: '+20', balance: '3540', usage: '连续签到' },
    ],
  },
  {
    id: 920003,
    avatar: createAvatar('林初夏', '#F5EDFF', '#8B5CF6'),
    nickname: '林初夏',
    gender: 'FEMALE',
    age: 26,
    school: '南京大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'PENDING',
    avatarVerifyStatus: 'PENDING',
    firstLoginCompleted: 1,
    profileScore: 85,
    accountStatus: 'NORMAL',
    accessStatus: 'browse_only',
    registerTime: '2026.05.20',
    lastLoginTime: '2026.06.26 19:26',
    phone: '159****6088',
    city: '江苏南京',
    zodiac: '巨蟹座',
    identity: '职场人',
    jobTitle: '品牌策划',
    company: '南京云起文化传播有限公司',
    educationText: '本科 | 南京大学',
    mateRequirement: '希望对方温和、有责任感，不急躁，愿意一起经营生活。',
    coins: 2150,
    vipAmount: 299,
    vipLabel: '普通会员',
    vipRange: '2026.02.20 - 2026.03.20',
    memberLevel: '普通会员',
    followStatus: '未开放',
    avatarAccent: '#8B5CF6',
    avatarReviewStatus: '待审核',
    medal: true,
    characterTags: [
      { label: '温柔', tone: 'blue' },
      { label: '细腻', tone: 'purple' },
      { label: '有房', tone: 'green' },
    ],
    coinRecords: [
      { time: '2026.02.20 13:30', type: '收入', amount: '+100', balance: '2150', usage: '资料完善' },
      { time: '2026.02.19 20:12', type: '支出', amount: '-80', balance: '2050', usage: '解锁用户' },
      { time: '2026.02.18 09:52', type: '收入', amount: '+30', balance: '2130', usage: '签到奖励' },
    ],
  },
  {
    id: 920004,
    avatar: createAvatar('周慕白', '#EAFBF1', '#22C55E'),
    nickname: '周慕白',
    gender: 'MALE',
    age: 31,
    school: '浙江大学',
    realNameStatus: 'PENDING',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'PENDING',
    firstLoginCompleted: 1,
    profileScore: 81,
    accountStatus: 'NORMAL',
    accessStatus: 'browse_only',
    registerTime: '2026.05.21',
    lastLoginTime: '2026.06.25 23:03',
    phone: '188****1720',
    city: '浙江杭州',
    zodiac: '摩羯座',
    identity: '职场人',
    jobTitle: '算法工程师',
    company: '杭州启明智能科技有限公司',
    educationText: '硕士 | 浙江大学',
    mateRequirement: '希望对方沟通直接、生活规律，有共同成长的意识。',
    coins: 5040,
    vipAmount: 789,
    vipLabel: 'VIP会员',
    vipRange: '2026.01.29 - 2026.02.28',
    memberLevel: 'VIP会员',
    followStatus: '未开放',
    avatarAccent: '#22C55E',
    avatarReviewStatus: '待审核',
    medal: false,
    characterTags: [
      { label: '稳重', tone: 'orange' },
      { label: '理性', tone: 'green' },
      { label: '成熟', tone: 'purple' },
    ],
    coinRecords: [
      { time: '2026.01.29 12:18', type: '收入', amount: '+300', balance: '5040', usage: '购买套餐' },
      { time: '2026.01.28 20:31', type: '支出', amount: '-100', balance: '4740', usage: '赠送礼物' },
      { time: '2026.01.27 08:44', type: '收入', amount: '+20', balance: '4840', usage: '签到奖励' },
    ],
  },
  {
    id: 920005,
    avatar: createAvatar('唐知遥', '#FFEFF3', '#F43F5E'),
    nickname: '唐知遥',
    gender: 'FEMALE',
    age: 24,
    school: '复旦大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'APPROVED',
    firstLoginCompleted: 1,
    profileScore: 90,
    accountStatus: 'NORMAL',
    accessStatus: 'full_access',
    registerTime: '2026.05.23',
    lastLoginTime: '2026.06.27 08:16',
    phone: '182****5521',
    city: '上海徐汇',
    zodiac: '处女座',
    identity: '在校生',
    jobTitle: '研究生',
    company: '复旦大学新闻学院',
    educationText: '硕士在读 | 复旦大学',
    mateRequirement: '希望对方真诚、干净、积极，有清晰的未来规划。',
    coins: 1890,
    vipAmount: 0,
    vipLabel: '普通会员',
    vipRange: '未开通',
    memberLevel: '普通会员',
    followStatus: '开放',
    avatarAccent: '#F43F5E',
    avatarReviewStatus: '已通过',
    medal: true,
    characterTags: [
      { label: '清爽', tone: 'blue' },
      { label: '上进', tone: 'green' },
      { label: '温柔', tone: 'purple' },
    ],
    coinRecords: [
      { time: '2026.02.23 18:36', type: '收入', amount: '+80', balance: '1890', usage: '新手任务' },
      { time: '2026.02.22 12:20', type: '支出', amount: '-40', balance: '1810', usage: '查看资料' },
      { time: '2026.02.21 10:11', type: '收入', amount: '+30', balance: '1850', usage: '签到奖励' },
    ],
  },
  {
    id: 920006,
    avatar: createAvatar('顾言川', '#EEF6FF', '#2563EB'),
    nickname: '顾言川',
    gender: 'MALE',
    age: 30,
    school: '中国人民大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'PENDING',
    firstLoginCompleted: 1,
    profileScore: 86,
    accountStatus: 'NORMAL',
    accessStatus: 'full_access',
    registerTime: '2026.05.24',
    lastLoginTime: '2026.06.25 18:04',
    phone: '139****4106',
    city: '北京朝阳',
    zodiac: '射手座',
    identity: '职场人',
    jobTitle: '投资经理',
    company: '北京启辰资本管理有限公司',
    educationText: '硕士 | 中国人民大学',
    mateRequirement: '希望对方独立、乐观，可以一起探索城市生活。',
    coins: 4310,
    vipAmount: 589,
    vipLabel: '高潜会员',
    vipRange: '2026.03.04 - 2026.04.03',
    memberLevel: '高潜会员',
    followStatus: '开放',
    avatarAccent: '#2563EB',
    avatarReviewStatus: '待审核',
    medal: false,
    characterTags: [
      { label: '开朗', tone: 'green' },
      { label: '成熟', tone: 'purple' },
      { label: '有房', tone: 'blue' },
    ],
    coinRecords: [
      { time: '2026.03.04 12:01', type: '收入', amount: '+160', balance: '4310', usage: '会员赠送' },
      { time: '2026.03.03 22:09', type: '支出', amount: '-100', balance: '4150', usage: '解锁用户' },
      { time: '2026.03.02 09:44', type: '收入', amount: '+20', balance: '4250', usage: '签到奖励' },
    ],
  },
  {
    id: 920007,
    avatar: createAvatar('宋栀宁', '#FDF2F8', '#DB2777'),
    nickname: '宋栀宁',
    gender: 'FEMALE',
    age: 27,
    school: '厦门大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'PENDING',
    firstLoginCompleted: 1,
    profileScore: 87,
    accountStatus: 'NORMAL',
    accessStatus: 'full_access',
    registerTime: '2026.05.25',
    lastLoginTime: '2026.06.26 21:16',
    phone: '185****7349',
    city: '福建厦门',
    zodiac: '金牛座',
    identity: '职场人',
    jobTitle: '高校教师',
    company: '厦门某高校',
    educationText: '博士 | 厦门大学',
    mateRequirement: '希望对方稳定、真诚，重视家庭，也尊重彼此事业。',
    coins: 6020,
    vipAmount: 789,
    vipLabel: 'VIP会员',
    vipRange: '2026.04.01 - 2026.04.30',
    memberLevel: 'VIP会员',
    followStatus: '开放',
    avatarAccent: '#DB2777',
    avatarReviewStatus: '待审核',
    medal: true,
    characterTags: [
      { label: '温柔', tone: 'blue' },
      { label: '知性', tone: 'purple' },
      { label: '稳定', tone: 'orange' },
    ],
    coinRecords: [
      { time: '2026.04.01 09:10', type: '收入', amount: '+300', balance: '6020', usage: '会员赠送' },
      { time: '2026.03.31 17:28', type: '支出', amount: '-120', balance: '5720', usage: '解锁用户' },
      { time: '2026.03.30 08:10', type: '收入', amount: '+20', balance: '5840', usage: '签到奖励' },
    ],
  },
  {
    id: 920008,
    avatar: createAvatar('陆景行', '#F7FEE7', '#65A30D'),
    nickname: '陆景行',
    gender: 'MALE',
    age: 32,
    school: '武汉大学',
    realNameStatus: 'REJECTED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'REJECTED',
    firstLoginCompleted: 1,
    profileScore: 72,
    accountStatus: 'NORMAL',
    accessStatus: 'blocked',
    registerTime: '2026.05.26',
    lastLoginTime: '2026.06.24 20:42',
    phone: '177****9027',
    city: '湖北武汉',
    zodiac: '狮子座',
    identity: '职场人',
    jobTitle: '建筑设计师',
    company: '武汉江城建筑设计院',
    educationText: '硕士 | 武汉大学',
    mateRequirement: '希望对方性格爽朗，能接受阶段性加班。',
    coins: 980,
    vipAmount: 0,
    vipLabel: '普通会员',
    vipRange: '未开通',
    memberLevel: '普通会员',
    followStatus: '账号异常',
    avatarAccent: '#65A30D',
    avatarReviewStatus: '已驳回',
    medal: false,
    characterTags: [
      { label: '直接', tone: 'green' },
      { label: '成熟', tone: 'purple' },
      { label: '稳重', tone: 'orange' },
    ],
    coinRecords: [
      { time: '2026.03.18 19:50', type: '收入', amount: '+30', balance: '980', usage: '签到奖励' },
      { time: '2026.03.17 19:12', type: '支出', amount: '-60', balance: '950', usage: '查看资料' },
      { time: '2026.03.16 12:30', type: '收入', amount: '+20', balance: '1010', usage: '签到奖励' },
    ],
  },
  {
    id: 920009,
    avatar: createAvatar('江予安', '#ECFEFF', '#0891B2'),
    nickname: '江予安',
    gender: 'FEMALE',
    age: 25,
    school: '华南理工大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'PENDING',
    avatarVerifyStatus: 'PENDING',
    firstLoginCompleted: 1,
    profileScore: 83,
    accountStatus: 'NORMAL',
    accessStatus: 'browse_only',
    registerTime: '2026.05.27',
    lastLoginTime: '2026.06.26 12:30',
    phone: '134****6399',
    city: '广东广州',
    zodiac: '水瓶座',
    identity: '在校生',
    jobTitle: '研究生',
    company: '华南理工大学设计学院',
    educationText: '硕士在读 | 华南理工大学',
    mateRequirement: '喜欢有趣、有责任感的人，愿意一起尝试新鲜事物。',
    coins: 2760,
    vipAmount: 299,
    vipLabel: '普通会员',
    vipRange: '2026.03.08 - 2026.04.07',
    memberLevel: '普通会员',
    followStatus: '未开放',
    avatarAccent: '#0891B2',
    avatarReviewStatus: '待审核',
    medal: true,
    characterTags: [
      { label: '有趣', tone: 'green' },
      { label: '温柔', tone: 'blue' },
      { label: '上进', tone: 'purple' },
    ],
    coinRecords: [
      { time: '2026.03.08 10:33', type: '收入', amount: '+100', balance: '2760', usage: '资料完善' },
      { time: '2026.03.07 21:18', type: '支出', amount: '-80', balance: '2660', usage: '解锁用户' },
      { time: '2026.03.06 08:54', type: '收入', amount: '+20', balance: '2740', usage: '签到奖励' },
    ],
  },
  {
    id: 920010,
    avatar: createAvatar('季南风', '#FFF7ED', '#EA580C'),
    nickname: '季南风',
    gender: 'MALE',
    age: 28,
    school: '四川大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'APPROVED',
    firstLoginCompleted: 1,
    profileScore: 89,
    accountStatus: 'NORMAL',
    accessStatus: 'full_access',
    registerTime: '2026.05.28',
    lastLoginTime: '2026.06.27 11:05',
    phone: '181****4520',
    city: '四川成都',
    zodiac: '白羊座',
    identity: '职场人',
    jobTitle: '医生',
    company: '成都某三甲医院',
    educationText: '硕士 | 四川大学',
    mateRequirement: '希望对方情绪稳定，愿意理解彼此工作节奏。',
    coins: 7110,
    vipAmount: 789,
    vipLabel: 'VIP会员',
    vipRange: '2026.04.10 - 2026.05.09',
    memberLevel: 'VIP会员',
    followStatus: '开放',
    avatarAccent: '#EA580C',
    avatarReviewStatus: '已通过',
    medal: false,
    characterTags: [
      { label: '可靠', tone: 'orange' },
      { label: '自律', tone: 'blue' },
      { label: '成熟', tone: 'purple' },
    ],
    coinRecords: [
      { time: '2026.04.10 08:15', type: '收入', amount: '+300', balance: '7110', usage: '会员赠送' },
      { time: '2026.04.09 22:48', type: '支出', amount: '-100', balance: '6810', usage: '解锁用户' },
      { time: '2026.04.08 07:58', type: '收入', amount: '+20', balance: '6910', usage: '签到奖励' },
    ],
  },
];

function toCardItem(user: AppUserListVO): AdminUserCardItem {
  const tags = toTagPills(user.tags);
  return {
    id: user.id,
    avatar: user.avatar || '',
    nickname: user.nickname || '-',
    gender: user.gender || '',
    age: user.age ?? 0,
    school: user.school || '-',
    realNameStatus: user.realNameStatus || 'NOT_CERTIFIED',
    educationStatus: user.educationStatus || 'NOT_CERTIFIED',
    avatarVerifyStatus: user.avatarVerifyStatus || 'NOT_CERTIFIED',
    firstLoginCompleted: user.firstLoginCompleted ?? 0,
    profileScore: user.profileScore ?? 0,
    accountStatus: user.accountStatus || 'NORMAL',
    accessStatus: user.accessStatus || 'blocked',
    registerTime: user.registerTime || '-',
    lastLoginTime: user.lastLoginTime || '-',
    phone: user.phone || '-',
    city: user.city || '-',
    zodiac: user.zodiac || '-',
    identity: user.identity || '-',
    jobTitle: user.occupation || '-',
    company: '-',
    educationText: user.school || '-',
    mateRequirement: '-',
    coins: 0,
    vipAmount: 0,
    vipLabel: '-',
    vipRange: '-',
    memberLevel: '-',
    followStatus: '-',
    avatarAccent: '#E6EDF7',
    avatarReviewStatus: STATUS_MAP[user.avatarVerifyStatus || '']?.label || '-',
    medal: user.accessStatus === 'full_access',
    characterTags: tags.length > 0 ? tags : [],
    coinRecords: [],
  };
}

function toDetailCardItem(detail: AppUserDetailVO, current?: AdminUserCardItem | null): AdminUserCardItem {
  const base = current as AdminUserCardItem;
  const verification = detail.verification;
  const city = [detail.locationProvince, detail.locationCity].filter(Boolean).join('') || '-';
  const tags = toTagPills(detail.tags);
  const accessStatus = detail.canMatch && detail.canBeExposed ? 'full_access' : detail.canBrowseCards ? 'browse_only' : 'blocked';
  return {
    ...base,
    id: detail.id,
    avatar: detail.avatar || '',
    nickname: detail.nickname || '-',
    gender: detail.gender || '',
    age: detail.age ?? 0,
    school: detail.school || '-',
    realNameStatus: verification?.realNameStatus || 'NOT_CERTIFIED',
    educationStatus: verification?.educationStatus || 'NOT_CERTIFIED',
    avatarVerifyStatus: verification?.avatarVerifyStatus || 'NOT_CERTIFIED',
    firstLoginCompleted: detail.firstLoginCompleted ?? 0,
    profileScore: detail.profileScore ?? 0,
    accountStatus: detail.accountStatus || 'NORMAL',
    accessStatus,
    registerTime: detail.registerTime || '-',
    lastLoginTime: detail.lastLoginTime || '-',
    phone: detail.phone || base.phone || '-',
    city,
    zodiac: detail.zodiac || '-',
    identity: detail.identity || '-',
    jobTitle: detail.occupation || '-',
    company: '-',
    educationText: [detail.educationLevel, detail.school].filter(Boolean).join(' | ') || '-',
    mateRequirement: detail.hopeTheyKnow || '-',
    characterTags: tags,
    avatarReviewStatus: STATUS_MAP[verification?.avatarVerifyStatus || '']?.label || '-',
  };
}

function toTagPills(raw?: string): DemoTag[] {
  if (!raw) return [];
  let values: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      values = parsed.map((item) => String(typeof item === 'string' ? item : item?.label ?? item?.name ?? '')).filter(Boolean);
    }
  } catch {
    values = raw.split(/[,，\s]+/).map((item) => item.trim()).filter(Boolean);
  }
  const tones: TagTone[] = ['orange', 'purple', 'blue', 'green'];
  return values.slice(0, 6).map((label, index) => ({ label, tone: tones[index % tones.length] }));
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [coreAccessStatus, setCoreAccessStatus] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [identity, setIdentity] = useState('');
  const [city, setCity] = useState('');
  const [memberLevel, setMemberLevel] = useState('');
  const [followStatus, setFollowStatus] = useState('');
  const [hideVisitRecord, setHideVisitRecord] = useState('');
  const [listView, setListView] = useState<'card' | 'table'>('card');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<UserStats>({ total: 0, coreAllowed: 0 });
  const [loading, setLoading] = useState(false);
  const [drawerUser, setDrawerUser] = useState<AdminUserCardItem | null>(null);
  const [avatarUser, setAvatarUser] = useState<AdminUserCardItem | null>(null);
  const [moduleSupplementUser, setModuleSupplementUser] = useState<AdminUserCardItem | null>(null);
  const [workflowDialog, setWorkflowDialog] = useState<'import' | 'export' | null>(null);
  const [workflowResult, setWorkflowResult] = useState<ImportBatchVO | ExportTaskVO | null>(null);
  const [workflowProcessing, setWorkflowProcessing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAppUserList({
        page,
        size: PAGE_SIZE,
        keyword: keyword.trim() || undefined,
        coreAccessStatus: coreAccessStatus || undefined,
        verificationStatus: verificationStatus || undefined,
        identity: identity || undefined,
        city: city || undefined,
        relationshipAccess: followStatus || undefined,
        vipStatus: memberLevel || undefined,
        hideVisitRecord: hideVisitRecord || undefined,
      });
      const data = responseData<PageResult<AppUserListVO>>(res, { records: [], total: 0, size: PAGE_SIZE, current: page });
      setUsers((data.records || []).map(toCardItem));
      setTotal(data.total ?? data.records?.length ?? 0);
    } catch {
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [city, coreAccessStatus, followStatus, hideVisitRecord, identity, keyword, memberLevel, page, verificationStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const [all, coreAllowed] = await Promise.all([
        getAppUserList({ page: 1, size: 1 }),
        getAppUserList({ page: 1, size: 1, coreAccessStatus: 'CORE_ALLOWED' }),
      ]);
      const allData = responseData<PageResult<AppUserListVO>>(all, { records: [], total: 0, size: 1, current: 1 });
      const coreData = responseData<PageResult<AppUserListVO>>(coreAllowed, { records: [], total: 0, size: 1, current: 1 });
      setStats((prev) => ({
        ...prev,
        total: allData.total ?? 0,
        coreAllowed: coreData.total ?? 0,
      }));
    } catch {
      setStats((prev) => ({ ...prev, total: 0, coreAllowed: 0 }));
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const pageUsers = users;
  const paginationTotal = total;
  function handleSearch() {
    if (page === 1) {
      fetchUsers();
    } else {
      setPage(1);
    }
  }

  function handleReset() {
    setKeyword('');
    setCoreAccessStatus('');
    setVerificationStatus('');
    setIdentity('');
    setCity('');
    setMemberLevel('');
    setFollowStatus('');
    setHideVisitRecord('');
    setPage(1);
  }

  async function openProfile(user: AdminUserCardItem) {
    setDrawerUser(user);
    try {
      const res = await getAppUserDetail(user.id);
      const detail = responseData<AppUserDetailVO>(res, null as any);
      if (detail) setDrawerUser(toDetailCardItem(detail, user));
    } catch {
      showToast('用户详情接口加载失败，当前仅展示列表行数据', 'error');
    }
  }

  function openWorkflowDialog(type: 'import' | 'export') {
    setWorkflowResult(null);
    setWorkflowDialog(type);
  }

  async function handleWorkflowConfirm(type: 'import' | 'export', file?: File | null) {
    setWorkflowProcessing(true);
    try {
      if (type === 'import') {
        if (!file) {
          showToast('请选择要导入的文件', 'info');
          return;
        }
        const res = await importAppUsers(file);
        const data = responseData<ImportBatchVO>(res, null as any);
        setWorkflowResult(data);
        showToast(data?.message || '导入预校验完成', 'success');
      } else {
        const res = await exportAppUsers({ page, size: PAGE_SIZE, keyword: keyword.trim() || undefined }, true);
        const data = responseData<ExportTaskVO>(res, null as any);
        setWorkflowResult(data);
        showToast(data?.message || '导出任务已创建', 'success');
      }
      fetchUsers();
    } finally {
      setWorkflowProcessing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0C285A]">App 用户管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">用户准入、认证、画像、批量导入、固定字段导出与运营备注。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => openWorkflowDialog('import')}>
            <Upload className="mr-1.5 h-4 w-4" />
            批量导入
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => openWorkflowDialog('export')}>
            <Download className="mr-1.5 h-4 w-4" />
            导出字段
          </Button>
          <Button variant="primary" size="sm" className="h-9" onClick={() => showToast('已重算当前筛选用户准入状态', 'success')}>
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            重算准入
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-sm">
        <CardContent className="p-7">
          <div className="grid gap-4 lg:grid-cols-4">
            <StatCard icon={<ShieldCheck className="h-8 w-8" />} label="当前用户" value={stats.total} tone="blue" />
            <StatCard icon={<BadgeCheck className="h-8 w-8" />} label="核心准入开放" value={stats.coreAllowed} tone="green" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            <QueryField label="用户搜索">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="姓名/昵称/手机号/身份证/标签"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSearch();
                  }}
                  className="h-9 pl-9 text-sm"
                />
              </div>
            </QueryField>
            <QueryField label="核心准入">
              <Select options={CORE_ACCESS_OPTIONS} value={coreAccessStatus} onChange={setCoreAccessStatus} />
            </QueryField>
            <QueryField label="认证状态">
              <Select options={VERIFICATION_STATUS_OPTIONS} value={verificationStatus} onChange={setVerificationStatus} />
            </QueryField>
            <QueryField label="身份">
              <Select options={IDENTITY_OPTIONS} value={identity} onChange={setIdentity} />
            </QueryField>
            <QueryField label="城市">
              <Select options={CITY_OPTIONS} value={city} onChange={setCity} />
            </QueryField>
            <QueryField label="关系反馈准入">
              <Select options={FOLLOW_STATUS_OPTIONS} value={followStatus} onChange={setFollowStatus} />
            </QueryField>
            <QueryField label="VIP 状态">
              <Select options={MEMBER_LEVEL_OPTIONS} value={memberLevel} onChange={setMemberLevel} />
            </QueryField>
            <QueryField label="隐藏访问记录">
              <Select options={HIDE_VISIT_RECORD_OPTIONS} value={hideVisitRecord} onChange={setHideVisitRecord} />
            </QueryField>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" className="h-9 w-[78px]" onClick={handleSearch}>
              <Search className="mr-1.5 h-4 w-4" />
              搜索
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-[78px]" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              重置
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#1F2433]">用户卡片列表</h2>
              <p className="mt-1 text-sm text-muted-foreground">卡片内展示固定字段和敏感信息掩码，跨模块补充从卡片按钮进入。</p>
            </div>
            <div className="flex rounded-md border border-[#D8E2F0] bg-white p-1 text-sm">
              <button className={`rounded px-3 py-1.5 ${listView === 'card' ? 'bg-[#2876FF] text-white' : 'text-[#526173]'}`} onClick={() => setListView('card')}>卡片</button>
              <button className={`rounded px-3 py-1.5 ${listView === 'table' ? 'bg-[#2876FF] text-white' : 'text-[#526173]'}`} onClick={() => setListView('table')}>表格</button>
            </div>
          </div>

          <div className="mt-4">
            {listView === 'card' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pageUsers.map((user) => (
                  <CustomerCard
                    key={user.id}
                    user={user}
                    onOpenProfile={() => openProfile(user)}
                    onOpenAvatar={() => setAvatarUser(user)}
                    onOpenModuleSupplement={() => setModuleSupplementUser(user)}
                  />
                ))}
              </div>
            ) : (
              <AppUserTable users={pageUsers} onOpenProfile={openProfile} onOpenAvatar={setAvatarUser} />
            )}
          </div>

          {pageUsers.length === 0 && (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              {loading ? '加载中...' : '暂无匹配的 App 用户'}
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">共 {paginationTotal} 条 · 10条/页</span>
            <Pagination current={page} total={paginationTotal} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        </CardContent>
      </Card>

      <ProfileDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />
      <ModuleSupplementDialog user={moduleSupplementUser} onClose={() => setModuleSupplementUser(null)} />
      <AvatarAuditDialog
        user={avatarUser}
        onClose={() => setAvatarUser(null)}
        onGoAudit={() => navigate('/verify/avatar')}
      />
      <WorkflowDialog
        type={workflowDialog}
        result={workflowResult}
        processing={workflowProcessing}
        onConfirm={handleWorkflowConfirm}
        onClose={() => setWorkflowDialog(null)}
      />
    </div>
  );
}

function CustomerCard({
  user,
  onOpenProfile,
  onOpenAvatar,
  onOpenModuleSupplement,
}: {
  user: AdminUserCardItem;
  onOpenProfile: () => void;
  onOpenAvatar: () => void;
  onOpenModuleSupplement: () => void;
}) {
  return (
      <div className="relative overflow-hidden rounded-lg border border-[#E6EDF7] bg-white p-5 shadow-[0_8px_22px_rgba(12,40,90,0.04)]">
      {user.medal && (
        <div className="absolute left-0 top-0 h-7 w-7 rounded-br-2xl bg-[#343431]">
          <BadgeCheck className="ml-1.5 mt-1.5 h-3.5 w-3.5 text-[#F2DFA7]" />
        </div>
      )}

      <div>
        <div className="flex items-start gap-4">
          <Avatar
            className="h-[58px] w-[58px] ring-4 ring-[#EAF5FF]"
            src={user.avatar}
            fallback={user.nickname.slice(0, 1)}
            style={{ boxShadow: `0 8px 18px ${user.avatarAccent}26` }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[#1F2433]">{user.nickname}</p>
                <p className="mt-1 text-sm text-[#5F6675]">{user.gender === 'MALE' ? '男' : '女'} {user.age} · {user.city}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-md bg-[#EAF5FF] px-3 py-1 text-xs font-medium text-[#2876FF]">{user.identity}</span>
                {user.vipLabel !== '普通会员' && <span className="rounded-md bg-[#FFF3E8] px-3 py-1 text-xs font-medium text-[#E57D1F]">VIP</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-[#F7FAFE] px-4 py-3 text-sm text-[#1F2433]">
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <span className="font-medium text-[#5F6675]">资料摘要</span>
            <div>
              <b>{user.jobTitle} · {user.company}</b>
              <div className="mt-1 text-[#5F6675]">年收入30-50万 · {user.city}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-md bg-[#F7FAFE] p-3">
            <span className="text-xs text-[#7D8597]">完整度</span>
            <strong className="mt-1 block text-[#111827]">{user.profileScore}/100</strong>
          </div>
          <div className="rounded-md bg-[#F7FAFE] p-3">
            <span className="text-xs text-[#7D8597]">千寻币</span>
            <strong className="mt-1 block text-[#111827]">{user.coins.toLocaleString()}</strong>
          </div>
          <div className="rounded-md bg-[#F7FAFE] p-3">
            <span className="text-xs text-[#7D8597]">微信</span>
            <strong className="mt-1 block text-[#111827]">wx_****{String(user.id).slice(-2)}</strong>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={STATUS_MAP[user.avatarVerifyStatus]?.variant ?? 'secondary'}>{verificationBadgeText('avatar', user.avatarVerifyStatus)}</Badge>
          <Badge variant={STATUS_MAP[user.realNameStatus]?.variant ?? 'secondary'}>{verificationBadgeText('realName', user.realNameStatus)}</Badge>
          <Badge variant={STATUS_MAP[user.educationStatus]?.variant ?? 'secondary'}>{verificationBadgeText('education', user.educationStatus)}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_1fr_88px] gap-2 text-sm font-semibold">
          <button className="h-10 rounded-md bg-[#2876FF] text-white" onClick={onOpenProfile}>详情</button>
          <button className="h-10 rounded-md border border-[#2876FF] bg-white text-[#2876FF]" onClick={onOpenModuleSupplement}>模块补充</button>
          <button className="h-10 rounded-md bg-white text-[#1F2433]" onClick={onOpenAvatar}>头像审核</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: 'blue' | 'orange' | 'purple' | 'green';
}) {
  const toneClass = {
    blue: 'bg-[#EAF5FF] text-[#2876FF]',
    orange: 'bg-[#FFF3E8] text-[#F59E0B]',
    purple: 'bg-[#F5EDFF] text-[#8B5CF6]',
    green: 'bg-[#E9F8EF] text-[#27A45D]',
  }[tone];

  return (
    <div className="relative h-24 overflow-hidden rounded-lg bg-[#F9FBFF] px-7 py-5">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${toneClass}`}>{icon}</div>
      <div className="absolute left-[100px] top-6">
        <p className="text-sm text-[#7D8597]">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[#2B3043]">{value}</p>
      </div>
      <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-current opacity-[0.06]" />
    </div>
  );
}

function QueryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="block text-xs font-medium text-[#5F6675]">{label}</span>
      {children}
    </label>
  );
}

function AppUserTable({
  users,
  onOpenProfile,
  onOpenAvatar,
}: {
  users: AdminUserCardItem[];
  onOpenProfile: (user: AdminUserCardItem) => void;
  onOpenAvatar: (user: AdminUserCardItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E6EDF7]">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-[#F7FAFE] text-[#5F6675]">
          <tr>
            <th className="px-4 py-3 font-medium">用户</th>
            <th className="px-4 py-3 font-medium">身份</th>
            <th className="px-4 py-3 font-medium">城市</th>
            <th className="px-4 py-3 font-medium">核心准入</th>
            <th className="px-4 py-3 font-medium">认证状态</th>
            <th className="px-4 py-3 font-medium">VIP 状态</th>
            <th className="px-4 py-3 font-medium">注册时间</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6EDF7] bg-white">
          {users.map((user) => {
            const access = ACCESS_STATUS_MAP[user.accessStatus] ?? { label: user.accessStatus || '-', variant: 'secondary' as const };
            const realName = STATUS_MAP[user.realNameStatus] ?? { label: user.realNameStatus || '-', variant: 'secondary' as const };
            return (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9" src={user.avatar} fallback={user.nickname.slice(0, 1)} />
                    <div>
                      <div className="font-medium text-[#1F2433]">{user.nickname}</div>
                      <div className="text-xs text-muted-foreground">{user.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{user.identity}</td>
                <td className="px-4 py-3">{user.city}</td>
                <td className="px-4 py-3"><Badge variant={access.variant}>{access.label}</Badge></td>
                <td className="px-4 py-3"><Badge variant={realName.variant}>{realName.label}</Badge></td>
                <td className="px-4 py-3">{user.vipLabel}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.registerTime}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onOpenProfile(user)}>画像详情</Button>
                    <Button variant="ghost" size="sm" onClick={() => onOpenAvatar(user)}>头像审核</Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModuleSupplementDialog({ user, onClose }: { user: AdminUserCardItem | null; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'relation' | 'message'>('relation');

  useEffect(() => {
    if (user) setActiveTab('relation');
  }, [user?.id]);

  return (
    <Dialog open={Boolean(user)} onClose={onClose} className="max-w-[920px]">
      {user && (
        <div className="space-y-5">
          <DialogHeader>
            <DialogTitle>{user.nickname} {user.id} · 模块补充</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">承接 PRD-02 关系反馈与 PRD-03 消息互动，不直接铺在用户列表和画像详情内。</p>
          <div className="flex gap-2 border-b border-[#E6EDF7]">
            {[
              ['relation', '关系反馈 Tab'],
              ['message', '消息互动 Tab'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value as 'relation' | 'message')}
                className={`rounded-t-md px-4 py-2 text-sm font-semibold ${
                  activeTab === value ? 'bg-[#2876FF] text-white' : 'bg-[#F4F7FB] text-[#4D5A6D]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* 跨模块信息按 Demo 分 Tab 展示，避免重新铺回用户画像详情。 */}
          {activeTab === 'relation' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <MetricTile label="关系反馈准入" value={user.followStatus} />
                <MetricTile label="VIP 状态" value={user.vipRange === '未开通' ? '未开通' : '生效中'} />
                <MetricTile label="隐藏访问记录" value={user.vipRange === '未开通' ? '权益不可用' : '未开启'} />
                <MetricTile label="7天访客 UV/PV" value={`${42 + (user.id % 10)} / ${128 + (user.id % 40)}`} />
                <MetricTile label="当前被喜欢" value={`${3 + (user.id % 5)}`} />
                <MetricTile label="当前相互喜欢" value={`${1 + (user.id % 3)}`} />
                <div className="rounded-md border border-[#E6EDF7] p-4 md:col-span-2">
                  <span className="text-xs text-muted-foreground">最近匹配成功时间</span>
                  <strong className="mt-2 block">2026-07-02 13:21</strong>
                </div>
              </div>
              <div className="rounded-md border border-[#E6EDF7] p-4">
              <h3 className="font-semibold text-[#1F2433]">关系记录</h3>
              <DemoTable
                headers={['记录编号', '对方用户', '状态', '发生时间']}
                rows={[
                  [`LIK-${user.id}-001`, '周语桐 U100352', '生效中', '2026-07-02 13:21'],
                  [`VIS-${user.id}-036`, '陆清和 U100516', '已解锁', '2026-07-02 12:32'],
                  [`REL-${user.id}-008`, '陈一鸣 U100193', user.followStatus === '开放' ? '相互喜欢' : '未解锁', '2026-07-01 20:41'],
                ]}
              />
              </div>
            </div>
          )}
          {activeTab === 'message' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <MetricTile label="消息未读数" value={`${user.id % 6}`} />
                <MetricTile label="待回复悄悄话" value={`${user.id % 3}`} />
                <MetricTile label="最近通知" value="资料审核结果通知" />
                <MetricTile label="聊天举报数" value={`${user.id % 2}`} />
                <MetricTile label="普通私信状态" value={user.accessStatus === 'full_access' ? '可发起私信' : '普通私信未开启'} wide />
                <MetricTile label="高敏查看审计" value="高敏内容查看需二次确认并记录审计" wide />
              </div>
              <div className="rounded-md border border-[#E6EDF7] p-4">
              <h3 className="font-semibold text-[#1F2433]">消息互动</h3>
              <div className="mt-3 grid gap-3 text-sm">
                <InfoLine icon={<LinkIcon className="h-4 w-4" />} label="普通私信状态" value={user.accessStatus === 'full_access' ? '可发起私信' : '普通私信未开启'} />
                <InfoLine icon={<Heart className="h-4 w-4" />} label="最近私信" value="最近暂无未读私信" />
                <InfoLine icon={<ShieldCheck className="h-4 w-4" />} label="高敏查看审计" value="高敏内容查看需二次确认并记录审计" />
              </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

function ProfileDrawer({ user, onClose }: { user: AdminUserCardItem | null; onClose: () => void }) {
  const [freezeConfirmOpen, setFreezeConfirmOpen] = useState(false);
  const [freezeProcessing, setFreezeProcessing] = useState(false);
  const [commercial, setCommercial] = useState<UserCommercialAssetDetail | null>(null);
  const [commercialLoading, setCommercialLoading] = useState(false);
  const genderLabel = user?.gender === 'MALE' ? '男' : '女';
  const score = Math.max(0, Math.min(user?.profileScore ?? 0, 100));
  const educationLevel = user?.educationText.split('|')[0]?.trim() || '-';
  const industry = user?.company.includes('大学') || user?.company.includes('学院') ? '教育科研' : '互联网';
  const coreStatus = user?.accessStatus === 'full_access' ? '核心准入通过' : user?.accessStatus === 'browse_only' ? '核心准入待完善' : '核心准入阻断';
  const verifyBadges = [
    user?.realNameStatus === 'APPROVED' && user?.educationStatus === 'APPROVED' && user?.avatarVerifyStatus === 'APPROVED'
      ? '三重认证通过'
      : '认证待完善',
    statusBadgeText('头像', user?.avatarVerifyStatus),
    statusBadgeText('实名', user?.realNameStatus),
    statusBadgeText('学历', user?.educationStatus),
  ];
  const lightFields = [
    ['性别/年龄', `${genderLabel} / ${user?.age ?? '-'}岁`],
    ['身份', user?.identity || '-'],
    ['最高学历', educationLevel],
    ['现居地', user?.city || '-'],
    ['定位状态', '已授权定位'],
  ];
  const basicFields = [
    ['昵称', user?.nickname || '-'],
    ['身高/体重', user?.gender === 'MALE' ? '176cm / 70kg' : '165cm / 49kg'],
    ['家乡/户口', `${(user?.city || '上海').slice(0, 2)} / 上海`],
    ['行业/职业', `${industry} / ${user?.jobTitle || '-'}`],
    ['公司/年收入', `${user?.company || '-'} / 30-50万`],
    ['婚姻状况', '未婚'],
  ];

  useEffect(() => {
    if (!user) setFreezeConfirmOpen(false);
  }, [user]);

  useEffect(() => {
    let disposed = false;
    if (!user) {
      setCommercial(null);
      return undefined;
    }
    setCommercialLoading(true);
    getCommercialUserAssetDetail(user.id)
      .then((res) => {
        if (!disposed) setCommercial((res as any)?.data ?? null);
      })
      .catch(() => {
        if (!disposed) setCommercial(null);
      })
      .finally(() => {
        if (!disposed) setCommercialLoading(false);
      });
    return () => { disposed = true; };
  }, [user]);

  const confirmFreeze = async () => {
    if (!user) return;
    setFreezeProcessing(true);
    try {
      await updateAppUserStatus(user.id, 'FROZEN');
      setFreezeConfirmOpen(false);
      showToast('冻结账号确认已提交，操作已写入审计日志。', 'success');
    } finally {
      setFreezeProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={Boolean(user)} onClose={onClose} className="absolute right-0 top-0 h-screen w-[808px] max-w-[calc(100vw-48px)] rounded-none border-l bg-white p-0">
        {user && (
          <div className="flex h-full flex-col">
            <div className="flex h-16 shrink-0 items-center border-b border-[#E6EDF7] px-6">
              <DialogHeader>
                <DialogTitle className="text-base text-[#1F2433]">画像详情</DialogTitle>
              </DialogHeader>
            </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7FAFE] p-5">
            <div className="space-y-4">
              <ProfileConfirmSection title="顶部概览">
                <div className="flex items-center gap-5 p-5">
                <Avatar
                  className="h-[72px] w-[72px] ring-4 ring-[#EAF5FF]"
                  src={user.avatar}
                  fallback={user.nickname.slice(0, 1)}
                  style={{ boxShadow: `0 10px 24px ${user.avatarAccent}24` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-semibold text-[#1F2433]">{user.nickname} U{user.id}</span>
                    <span className="rounded-full bg-[#EAF5FF] px-3 py-1 text-xs font-semibold text-[#2876FF]">{coreStatus}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#4D5A6D]">{genderLabel} | {user.age}岁 | {user.identity} | {user.city}</p>
                  <p className="mt-2 text-sm text-[#4D5A6D]">手机号 {user.phone} <span className="ml-4">注册 {user.registerTime}</span></p>
                </div>
                <div className="flex h-[68px] w-[188px] shrink-0 flex-col justify-center rounded-lg bg-[#343431] px-6 text-[#F7DFA6]">
                  <span className="text-sm font-semibold">{commercial?.vipStatus === 'active' ? 'VIP会员' : commercial?.vipStatus === 'expired' ? '会员已过期' : '非会员'}</span>
                  <span className="mt-1 text-xs">{commercial?.vipExpireTime || '-'}</span>
                </div>
              </div>
              </ProfileConfirmSection>

              <ProfileConfirmSection title="基本信息 - 轻量资料">
                <ProfileFieldGrid fields={lightFields} />
              </ProfileConfirmSection>

              <ProfileConfirmSection title="基本信息 - 基础资料">
                <ProfileFieldGrid fields={basicFields} />
              </ProfileConfirmSection>

              <ProfileConfirmSection title="扩展资料">
                <div className="space-y-3 p-5 text-sm leading-7 text-[#4D5A6D]">
                  <div className="flex flex-wrap gap-2">
                    {user.characterTags.map((tag) => (
                      <DemoTagPill key={tag.label} tag={tag} />
                    ))}
                    <span className="rounded-full bg-[#E9F8EF] px-3 py-1 text-xs font-medium text-[#27A45D]">MBTI: INFJ</span>
                  </div>
                  <p><span className="font-medium text-[#1F2433]">关于我：</span>喜欢稳定而真诚的关系，工作之余会运动、看展，希望能认真了解彼此。</p>
                  <p><span className="font-medium text-[#1F2433]">见面偏好：</span>周末咖啡/展览；生活方式：不吸烟、少饮酒、可接受宠物；问答 3 条。</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="h-14 w-14 rounded-md bg-[#D7E6FF]" />
                    <span className="h-14 w-14 rounded-md bg-[#F7D8EA]" />
                    <span className="h-14 w-14 rounded-md bg-[#D8F7E1]" />
                    <em className="text-[#4D5A6D] not-italic">相册 6 张 · 背景图已上传 · 语音介绍 18s</em>
                  </div>
                </div>
              </ProfileConfirmSection>

              <ProfileConfirmSection title="认证与准入">
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    {verifyBadges.map((badge) => (
                      <span key={badge} className="rounded-full bg-[#EAF5FF] px-3 py-1 text-xs font-semibold text-[#2876FF]">{badge}</span>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm font-semibold text-[#1F2433]">
                      <span>资料完整度 {user.profileScore} / 100</span>
                      <span>{coreStatus}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6EDF7]">
                      <span className="block h-full rounded-full bg-[#2876FF]" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </div>
              </ProfileConfirmSection>

              <ProfileConfirmSection title="千寻币/VIP">
                {commercialLoading ? <p className="p-5 text-sm text-[#667085]">商业化资产加载中...</p> : commercial ? (
                  <ProfileLogList rows={[
                    [`当前余额`, String(commercial.coinBalance ?? 0), `累计充值 ¥${Number(commercial.totalRecharge ?? 0).toFixed(2)}`, '千寻币'],
                    ...(commercial.recentFlows || []).map((item) => [item.createTime || '-', `${item.flowType} ${item.changeAmount}`, `余额${item.balanceAfter}`, item.bizDesc || item.bizScene || '-']),
                    ...(commercial.recentOrders || []).map((item) => [item.createTime || '-', item.orderType === 'coin' ? '千寻币订单' : '会员订单', item.orderStatus, item.packageName || '-']),
                  ]} />
                ) : <p className="p-5 text-sm text-[#667085]">暂无商业化资产记录</p>}
              </ProfileConfirmSection>

              <ProfileConfirmSection title="客服/风控处理记录">
                <ProfileLogList
                  rows={[
                    ['陈依怡', '2026.02.15 14:30', '风控', '账号风险复核完成并记录审计'],
                    ['系统', user.lastLoginTime, '准入重算', '核心准入状态刷新'],
                  ]}
                />
              </ProfileConfirmSection>

            </div>
          </div>

          <div className="flex h-[72px] shrink-0 items-center justify-end border-t border-[#E6EDF7] bg-white px-6">
            <Button variant="primary" onClick={() => setFreezeConfirmOpen(true)}>冻结账号</Button>
          </div>
        </div>
      )}
      </Dialog>
      <Dialog open={Boolean(user) && freezeConfirmOpen} onClose={() => setFreezeConfirmOpen(false)} className="max-w-[440px]">
        {user && (
          <>
            <DialogHeader>
              <DialogTitle>冻结账号确认</DialogTitle>
            </DialogHeader>
            <div className="mt-5 space-y-4 text-sm text-[#4D5A6D]">
              <div className="rounded-md bg-[#FFF7E8] p-4 text-[#8A5A00]">
                冻结后用户将无法继续使用核心准入能力，操作人、原因和时间会进入审计日志。
              </div>
              <div className="rounded-md border border-[#E6EDF7] p-4">
                <strong className="block text-[#1F2433]">{user.nickname} U{user.id}</strong>
                <span className="mt-2 block">当前状态：{ACCOUNT_STATUS_MAP[user.accountStatus]?.label ?? user.accountStatus}</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFreezeConfirmOpen(false)} disabled={freezeProcessing}>取消</Button>
                <Button variant="primary" onClick={confirmFreeze} disabled={freezeProcessing}>
                  {freezeProcessing ? '处理中…' : '确认冻结'}
                </Button>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}

function statusBadgeText(prefix: string, status?: string) {
  const label = STATUS_MAP[status || '']?.label;
  if (label === '已通过') return `${prefix}通过`;
  if (label === '已驳回') return `${prefix}驳回`;
  if (label === '待审核') return `${prefix}待审`;
  return `${prefix}审核`;
}

function ProfileConfirmSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-0 flex h-12 items-center justify-between rounded-t-lg bg-[#EEF3F8] px-5">
        <div className="flex items-center gap-3">
          <span className="h-5 w-1 rounded-full bg-[#2876FF]" />
          <strong className="text-[#1F2433]">{title}</strong>
        </div>
        {action}
      </div>
      <div className="rounded-b-lg border border-t-0 border-[#E6EDF7] bg-white">{children}</div>
    </section>
  );
}

function ProfileFieldGrid({ fields }: { fields: string[][] }) {
  return (
    <div className="grid gap-3 p-5 md:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-[#F7FAFE] px-4 text-sm">
          <span className="text-[#7D8597]">{label}</span>
          <strong className="text-right text-[#1F2433]">{value}</strong>
        </div>
      ))}
    </div>
  );
}

function ProfileLogList({ rows }: { rows: string[][] }) {
  return (
    <div className="space-y-2 p-5">
      {rows.map((row) => (
        <div key={row.join('-')} className="grid gap-2 rounded-md bg-[#F7FAFE] px-4 py-3 text-sm text-[#0C3A78] md:grid-cols-4">
          {row.map((cell, index) => (
            <span key={`${cell}-${index}`} className={index === row.length - 1 ? 'md:text-right' : ''}>{cell || '-'}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function MetricTile({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-[#E6EDF7] p-4 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="mt-2 block text-[#1F2433]">{value}</strong>
    </div>
  );
}

function AvatarAuditDialog({
  user,
  onClose,
  onGoAudit,
}: {
  user: AdminUserCardItem | null;
  onClose: () => void;
  onGoAudit: () => void;
}) {
  return (
    <Dialog open={Boolean(user)} onClose={onClose} className="max-w-[828px] p-0">
      {user && (
        <div>
          <div className="flex h-[68px] items-center border-b border-[#E6EDF7] px-6">
            <DialogHeader>
              <DialogTitle className="text-base text-[#1F2433]">头像审核</DialogTitle>
            </DialogHeader>
          </div>
          <div className="bg-white px-16 py-10">
            <div className="mx-auto flex h-[410px] max-w-[708px] items-center justify-center overflow-hidden rounded-lg bg-[#F5F6F8]">
              <img src={user.avatar} alt={`${user.nickname}头像`} className="h-full w-full object-cover" />
            </div>
            <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
              <span>{user.nickname} · {user.avatarReviewStatus}</span>
              <button className="text-[#2876FF]" onClick={onGoAudit}>进入审核列表</button>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-[#E6EDF7] bg-[#F8FAFD] px-6 py-4">
            <Button variant="outline" onClick={onClose}>审核失败</Button>
            <Button variant="primary" onClick={onClose}>审核通过</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function WorkflowImportResult({ result }: { result: ImportBatchVO | null }) {
  return (
    <div className="grid gap-2 rounded-md border border-[#E6EDF7] p-4">
      <strong className="text-[#1F2433]">预校验结果</strong>
      {result ? (
        <>
          <span>批次 {result.batchNo} / 状态 {result.status}</span>
          <span>
            总行数 {result.totalCount ?? 0} / 可导入 {result.successCount ?? 0} / 失败行 {result.failCount ?? 0} / 重复 {result.duplicateCount ?? 0}
          </span>
          <span>{result.message || '导入预校验完成，结果来自后端接口。'}</span>
        </>
      ) : (
        <span>尚未调用后端预校验接口，点击确认导入后展示真实批次结果。</span>
      )}
    </div>
  );
}

function WorkflowExportResult({ result }: { result: ExportTaskVO }) {
  return (
    <div className="grid gap-2 rounded-md border border-[#E6EDF7] bg-[#F7FAFE] p-4">
      <strong className="text-[#1F2433]">导出任务结果</strong>
      <span>任务号 {result.taskNo} / 类型 {result.exportType} / 状态 {result.status}</span>
      <span>{result.message || '导出任务已由后端创建。'}</span>
    </div>
  );
}

function WorkflowDialog({
  type,
  result,
  processing,
  onConfirm,
  onClose,
}: {
  type: 'import' | 'export' | null;
  result: ImportBatchVO | ExportTaskVO | null;
  processing: boolean;
  onConfirm: (type: 'import' | 'export', file?: File | null) => void;
  onClose: () => void;
}) {
  const isImport = type === 'import';
  const importResult = isImport ? result as ImportBatchVO | null : null;
  const exportResult = !isImport ? result as ExportTaskVO | null : null;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!type) setSelectedFile(null);
  }, [type]);

  return (
    <Dialog open={Boolean(type)} onClose={onClose} className="max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{isImport ? '批量导入 App 用户' : '导出固定字段确认'}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 space-y-4 text-sm text-[#5F6675]">
        <div className="rounded-md bg-[#F4F8FF] p-4">
          {isImport
            ? '上传 Excel 导入线下收集用户信息；不会发送短信验证码，也不会自动通过认证。'
            : '导出前二次确认并记录操作日志。导出字段按后台固定字段输出，导出文件不做掩码。'}
        </div>
        {isImport && (
          <>
            <div className="grid gap-2 rounded-md border border-[#E6EDF7] p-4">
              <strong className="text-[#1F2433]">标准模板</strong>
              <span>必填：手机号、真实姓名、身份证号、性别、出生日期、身份、最高学历、现居省市</span>
              <span>步骤：1 下载模板 / 2 上传 Excel / 3 预校验 / 4 确认导入</span>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm">下载模板</Button>
                <Button variant="outline" size="sm">下载错误报告</Button>
              </div>
            </div>
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            <WorkflowImportResult result={importResult} />
            <div className="hidden">
              <strong className="text-[#1F2433]">预校验结果</strong>
              <span>总行数 286 / 可导入 274 / 失败行 12 / 重复 5</span>
              <span>导入规则：不覆盖已有用户，手机号/身份证重复行失败，实名进入审核中。</span>
            </div>
          </>
        )}
        {!isImport && (
          <>
            <div className="font-semibold text-[#1F2433]">字段范围</div>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-[#E6EDF7] p-4 md:grid-cols-3">
              {['用户姓名', '用户昵称', '身份证号', '性别', '出生日期', '身份', '婚姻状况', '个人标签', '资料完整度', '首登引导状态', '核心准入状态', '头像认证状态', '实名认证状态', '学历认证状态'].map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
            <div className="rounded-md bg-[#FFF7E8] p-4 text-[#8A5A00]">
              审计提示：导出行为将记录操作人、筛选条件、字段范围、导出时间和审计号。
            </div>
          </>
        )}
        {exportResult && <WorkflowExportResult result={exportResult} />}
        <div className="flex items-center gap-3 rounded-md border border-[#E6EDF7] p-4">
          {isImport ? <Upload className="h-5 w-5 text-[#2876FF]" /> : <Download className="h-5 w-5 text-[#2876FF]" />}
          <span>{isImport ? (selectedFile?.name || 'app-users-template.csv') : 'app-user-fixed-fields.xlsx'}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={processing}>取消</Button>
          <Button
            variant="primary"
            disabled={processing || !type}
            onClick={() => type && onConfirm(type, selectedFile)}
          >
            {processing ? '处理中...' : isImport ? '确认导入' : '确认导出'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function DemoTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="p-5">
      <div className="overflow-hidden rounded-lg border border-[#E6EDF7]">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-white text-[#5F6B7A]">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-8 py-3 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EDF7] text-[#0C3A78]">
            {rows.map((row) => (
              <tr key={row.join('-')} className="bg-white">
                {row.map((cell, index) => (
                  <td key={`${cell}-${index}`} className="px-8 py-3">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-[#B0B6C1]">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      {value && <span className="shrink-0 text-[#323743]">{value}</span>}
    </div>
  );
}

function DemoTagPill({ tag }: { tag: DemoTag }) {
  const toneClass = {
    orange: 'bg-[#FFF0E8] text-[#E57D1F]',
    purple: 'bg-[#F2E7FF] text-[#8B5CF6]',
    blue: 'bg-[#E4F0FF] text-[#2876FF]',
    green: 'bg-[#E9F8EF] text-[#27A45D]',
  }[tag.tone];
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}>{tag.label}</span>;
}

function createAvatar(name: string, bg: string, color: string) {
  const label = name.slice(0, 1);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 420 420">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${bg}"/>
          <stop offset="1" stop-color="#ffffff"/>
        </linearGradient>
      </defs>
      <rect width="420" height="420" rx="32" fill="url(#g)"/>
      <circle cx="210" cy="158" r="72" fill="${color}" opacity="0.18"/>
      <circle cx="210" cy="152" r="52" fill="${color}" opacity="0.36"/>
      <path d="M106 352c19-70 70-108 104-108s85 38 104 108" fill="${color}" opacity="0.22"/>
      <text x="210" y="180" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, Arial" font-size="76" font-weight="700" fill="${color}">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
