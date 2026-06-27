import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Briefcase,
  Coins,
  Crown,
  Download,
  Eye,
  GraduationCap,
  Heart,
  LinkIcon,
  MapPin,
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
import type { AppUserListVO } from '@/api/userApp';

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

interface MatchmakerRecord {
  name: string;
  time: string;
  content: string;
}

interface AdminUserCardItem extends AppUserListVO {
  phone: string;
  city: string;
  zodiac: string;
  identity: string;
  jobTitle: string;
  company: string;
  educationText: string;
  matchmaker: string;
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
  matchmakerRecords: MatchmakerRecord[];
}

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: '待审核', variant: 'warning' },
  APPROVED: { label: '已通过', variant: 'success' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  NOT_CERTIFIED: { label: '未认证', variant: 'secondary' },
  EXPIRED: { label: '已失效', variant: 'secondary' },
};

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

const FOLLOW_STATUS_OPTIONS = [
  { value: '', label: '跟进状态' },
  { value: '待跟进', label: '待跟进' },
  { value: '跟进中', label: '跟进中' },
  { value: '已牵线', label: '已牵线' },
];

const ACCESS_OPTIONS = [
  { value: '', label: '准入状态' },
  { value: 'full_access', label: '完全准入' },
  { value: 'browse_only', label: '仅浏览' },
  { value: 'blocked', label: '已阻止' },
];

const PAGE_SIZE = 10;

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
    matchmaker: '陈欣怡',
    mateRequirement: '希望找到一个成熟靠谱、三观契合、能一起好好过日子的人。比起外在条件，更看重内在品质和相处舒服。',
    coins: 7923,
    vipAmount: 789,
    vipLabel: 'VIP会员',
    vipRange: '2026.02.15 - 2026.03.14',
    memberLevel: 'VIP会员',
    followStatus: '跟进中',
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
    matchmakerRecords: [
      { name: '陈欣怡', time: '2026.02.15 14:30', content: '倾向稳重顾家，介意吸烟' },
      { name: '陈欣怡', time: '2026.02.15 14:30', content: '电话沟通，客户表示近期工作较忙，希望周末再安排相亲' },
      { name: '陈欣怡', time: '2026.02.15 14:30', content: '已添加微信，推送2位候选人资料' },
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
    matchmaker: '林若乔',
    mateRequirement: '喜欢真诚、有边界感的沟通，希望双方都有长期关系的意愿。',
    coins: 3680,
    vipAmount: 589,
    vipLabel: '高潜会员',
    vipRange: '2026.03.01 - 2026.03.31',
    memberLevel: '高潜会员',
    followStatus: '待跟进',
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
    matchmakerRecords: [
      { name: '林若乔', time: '2026.03.01 11:00', content: '择偶关注价值观和工作节奏匹配' },
      { name: '林若乔', time: '2026.02.28 19:10', content: '已确认可接受异地一年内规划' },
      { name: '林若乔', time: '2026.02.27 18:30', content: '待补充家庭情况沟通' },
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
    matchmaker: '王以晴',
    mateRequirement: '希望对方温和、有责任感，不急躁，愿意一起经营生活。',
    coins: 2150,
    vipAmount: 299,
    vipLabel: '普通会员',
    vipRange: '2026.02.20 - 2026.03.20',
    memberLevel: '普通会员',
    followStatus: '跟进中',
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
    matchmakerRecords: [
      { name: '王以晴', time: '2026.02.20 15:10', content: '学历认证资料已提醒补充' },
      { name: '王以晴', time: '2026.02.19 18:22', content: '接受年龄差 3 岁以内' },
      { name: '王以晴', time: '2026.02.18 11:05', content: '偏好南京本地发展对象' },
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
    matchmaker: '沈曼宁',
    mateRequirement: '希望对方沟通直接、生活规律，有共同成长的意识。',
    coins: 5040,
    vipAmount: 789,
    vipLabel: 'VIP会员',
    vipRange: '2026.01.29 - 2026.02.28',
    memberLevel: 'VIP会员',
    followStatus: '已牵线',
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
    matchmakerRecords: [
      { name: '沈曼宁', time: '2026.01.29 15:30', content: '已安排与 920001 首轮沟通' },
      { name: '沈曼宁', time: '2026.01.28 19:42', content: '希望对方本科及以上，杭州工作' },
      { name: '沈曼宁', time: '2026.01.27 14:12', content: '客户表达半年内稳定恋爱诉求' },
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
    matchmaker: '陈欣怡',
    mateRequirement: '希望对方真诚、干净、积极，有清晰的未来规划。',
    coins: 1890,
    vipAmount: 0,
    vipLabel: '普通会员',
    vipRange: '未开通',
    memberLevel: '普通会员',
    followStatus: '待跟进',
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
    matchmakerRecords: [
      { name: '陈欣怡', time: '2026.02.23 20:00', content: '在校生，偏好同城或上海发展' },
      { name: '陈欣怡', time: '2026.02.22 18:50', content: '可接受比自己大 3-5 岁' },
      { name: '陈欣怡', time: '2026.02.21 15:18', content: '提醒补充毕业时间和职业规划' },
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
    matchmaker: '林若乔',
    mateRequirement: '希望对方独立、乐观，可以一起探索城市生活。',
    coins: 4310,
    vipAmount: 589,
    vipLabel: '高潜会员',
    vipRange: '2026.03.04 - 2026.04.03',
    memberLevel: '高潜会员',
    followStatus: '跟进中',
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
    matchmakerRecords: [
      { name: '林若乔', time: '2026.03.04 13:20', content: '关注对方生活方式和消费观' },
      { name: '林若乔', time: '2026.03.03 19:30', content: '愿意周内下班后线下见面' },
      { name: '林若乔', time: '2026.03.02 11:18', content: '待补充家庭成员信息' },
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
    matchmaker: '王以晴',
    mateRequirement: '希望对方稳定、真诚，重视家庭，也尊重彼此事业。',
    coins: 6020,
    vipAmount: 789,
    vipLabel: 'VIP会员',
    vipRange: '2026.04.01 - 2026.04.30',
    memberLevel: 'VIP会员',
    followStatus: '待跟进',
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
    matchmakerRecords: [
      { name: '王以晴', time: '2026.04.01 10:22', content: '学历较高，择偶更关注沟通质量' },
      { name: '王以晴', time: '2026.03.31 18:11', content: '偏好福建或长三角发展对象' },
      { name: '王以晴', time: '2026.03.30 12:00', content: '已推荐两位同城候选人' },
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
    matchmaker: '沈曼宁',
    mateRequirement: '希望对方性格爽朗，能接受阶段性加班。',
    coins: 980,
    vipAmount: 0,
    vipLabel: '普通会员',
    vipRange: '未开通',
    memberLevel: '普通会员',
    followStatus: '待跟进',
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
    matchmakerRecords: [
      { name: '沈曼宁', time: '2026.03.18 20:10', content: '头像审核未通过，需更换清晰正脸照' },
      { name: '沈曼宁', time: '2026.03.17 17:44', content: '实名认证材料姓名需重新核对' },
      { name: '沈曼宁', time: '2026.03.16 13:01', content: '暂不进入牵线池' },
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
    matchmaker: '陈欣怡',
    mateRequirement: '喜欢有趣、有责任感的人，愿意一起尝试新鲜事物。',
    coins: 2760,
    vipAmount: 299,
    vipLabel: '普通会员',
    vipRange: '2026.03.08 - 2026.04.07',
    memberLevel: '普通会员',
    followStatus: '跟进中',
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
    matchmakerRecords: [
      { name: '陈欣怡', time: '2026.03.08 11:30', content: '在校生身份，建议先完成学历认证' },
      { name: '陈欣怡', time: '2026.03.07 20:10', content: '可接受广州、深圳发展对象' },
      { name: '陈欣怡', time: '2026.03.06 12:42', content: '偏好年龄差 4 岁以内' },
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
    matchmaker: '林若乔',
    mateRequirement: '希望对方情绪稳定，愿意理解彼此工作节奏。',
    coins: 7110,
    vipAmount: 789,
    vipLabel: 'VIP会员',
    vipRange: '2026.04.10 - 2026.05.09',
    memberLevel: 'VIP会员',
    followStatus: '已牵线',
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
    matchmakerRecords: [
      { name: '林若乔', time: '2026.04.10 12:12', content: '工作忙，建议优先安排高意愿候选人' },
      { name: '林若乔', time: '2026.04.09 19:22', content: '已完成一次线下见面反馈' },
      { name: '林若乔', time: '2026.04.08 13:40', content: '客户关注对方家庭沟通方式' },
    ],
  },
];

export default function CustomersPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [memberLevel, setMemberLevel] = useState('');
  const [followStatus, setFollowStatus] = useState('');
  const [accessStatus, setAccessStatus] = useState('');
  const [page, setPage] = useState(1);
  const [drawerUser, setDrawerUser] = useState<AdminUserCardItem | null>(null);
  const [avatarUser, setAvatarUser] = useState<AdminUserCardItem | null>(null);
  const [workflowDialog, setWorkflowDialog] = useState<'import' | 'export' | null>(null);

  const filteredUsers = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return DEMO_USERS.filter((user) => {
      const searchText = `${user.nickname} ${user.city} ${user.school} ${user.company} ${user.jobTitle}`.toLowerCase();
      const matchKeyword = !search || searchText.includes(search);
      const matchMember = !memberLevel || user.memberLevel === memberLevel;
      const matchFollow = !followStatus || user.followStatus === followStatus;
      const matchAccess = !accessStatus || user.accessStatus === accessStatus;
      return matchKeyword && matchMember && matchFollow && matchAccess;
    });
  }, [accessStatus, followStatus, keyword, memberLevel]);

  const pageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const stat = useMemo(() => ({
    realNameCount: 7923,
    coinAmount: 7923,
    vipAmount: 7923,
  }), []);

  function handleSearch() {
    setPage(1);
  }

  function handleReset() {
    setKeyword('');
    setMemberLevel('');
    setFollowStatus('');
    setAccessStatus('');
    setPage(1);
  }

  function openWorkflowDialog(type: 'import' | 'export') {
    setWorkflowDialog(type);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0C285A]">客户管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">PRD-01 准入与画像 demo，数据固定在前端页面。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => openWorkflowDialog('import')}>
            <Upload className="mr-1.5 h-4 w-4" />
            批量导入
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => openWorkflowDialog('export')}>
            <Download className="mr-1.5 h-4 w-4" />
            导出客户
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-sm">
        <CardContent className="p-7">
          <div className="grid gap-4 lg:grid-cols-3">
            <StatCard icon={<ShieldCheck className="h-8 w-8" />} label="实名人数" value={stat.realNameCount} tone="blue" />
            <StatCard icon={<Coins className="h-8 w-8" />} label="千寻币" value={stat.coinAmount.toFixed(2)} tone="orange" />
            <StatCard icon={<Crown className="h-8 w-8" />} label="VIP金额" value={stat.vipAmount.toFixed(2)} tone="purple" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-[198px]">
              <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索客户"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
                }}
                className="h-9 pl-9 text-sm"
              />
            </div>
            <Select options={MEMBER_LEVEL_OPTIONS} value={memberLevel} onChange={setMemberLevel} className="w-[198px]" />
            <Select options={FOLLOW_STATUS_OPTIONS} value={followStatus} onChange={setFollowStatus} className="w-[198px]" />
            <Select options={ACCESS_OPTIONS} value={accessStatus} onChange={setAccessStatus} className="w-[198px]" />
            <Button variant="primary" size="sm" className="h-9 w-[78px]" onClick={handleSearch}>
              <Search className="mr-1.5 h-4 w-4" />
              搜索
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-[78px]" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              重置
            </Button>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {pageUsers.map((user) => (
              <CustomerCard
                key={user.id}
                user={user}
                onOpenProfile={() => setDrawerUser(user)}
                onOpenAvatar={() => setAvatarUser(user)}
                onMatch={() => setDrawerUser(user)}
              />
            ))}
          </div>

          {pageUsers.length === 0 && (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              暂无匹配的 demo 客户
            </div>
          )}

          <div className="mt-7 flex justify-end border-t border-border pt-4">
            <Pagination current={page} total={filteredUsers.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        </CardContent>
      </Card>

      <ProfileDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />
      <AvatarAuditDialog
        user={avatarUser}
        onClose={() => setAvatarUser(null)}
        onGoAudit={() => navigate('/verify/avatar')}
      />
      <WorkflowDialog type={workflowDialog} onClose={() => setWorkflowDialog(null)} />
    </div>
  );
}

function CustomerCard({
  user,
  onOpenProfile,
  onOpenAvatar,
  onMatch,
}: {
  user: AdminUserCardItem;
  onOpenProfile: () => void;
  onOpenAvatar: () => void;
  onMatch: () => void;
}) {
  const access = ACCESS_STATUS_MAP[user.accessStatus] ?? { label: user.accessStatus || '-', variant: 'secondary' as const };
  const realName = STATUS_MAP[user.realNameStatus] ?? { label: user.realNameStatus || '-', variant: 'secondary' as const };
  const account = ACCOUNT_STATUS_MAP[user.accountStatus] ?? { label: user.accountStatus || '-', variant: 'secondary' as const };

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#E6EDF7] bg-white shadow-[0_8px_22px_rgba(12,40,90,0.04)]">
      {user.medal && (
        <div className="absolute left-0 top-0 h-7 w-7 rounded-br-2xl bg-[#343431]">
          <BadgeCheck className="ml-1.5 mt-1.5 h-3.5 w-3.5 text-[#F2DFA7]" />
        </div>
      )}

      <div className="p-5 pb-3">
        <div className="flex items-start gap-3">
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
                <p className="mt-1 text-sm text-[#999999]">
                  {user.gender === 'MALE' ? '男' : '女'} | {user.age}岁 | {user.zodiac}
                </p>
              </div>
              <Button variant="secondary" size="sm" className="h-8 shrink-0 rounded-full bg-[#E6F3FF] px-3 text-[#2876FF]" onClick={onOpenAvatar}>
                头像审核
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2.5 border-t border-[#EEF2F7] pt-3 text-sm text-[#6D7280]">
          <InfoLine icon={<Coins className="h-4 w-4" />} label="千寻币" value={String(user.coins)} />
          <InfoLine icon={<Briefcase className="h-4 w-4" />} label={`${user.jobTitle} | ${user.company}`} />
          <InfoLine icon={<GraduationCap className="h-4 w-4" />} label={user.educationText} />
          <InfoLine icon={<Heart className="h-4 w-4" />} label={`红娘：${user.matchmaker}`} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {user.characterTags.map((tag) => (
            <DemoTagPill key={tag.label} tag={tag} />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge variant={realName.variant}>{realName.label}</Badge>
          <Badge variant={access.variant}>{access.label}</Badge>
          <Badge variant={account.variant}>{account.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 bg-[#EEF3F8] text-sm font-semibold text-[#2876FF]">
        <button className="flex h-12 items-center justify-center gap-1 border-r border-[#D3DCE8]" onClick={onOpenProfile}>
          <Eye className="h-4 w-4" />
          画像
        </button>
        <button className="flex h-12 items-center justify-center gap-1" onClick={onMatch}>
          <LinkIcon className="h-4 w-4" />
          牵线
        </button>
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
  tone: 'blue' | 'orange' | 'purple';
}) {
  const toneClass = {
    blue: 'bg-[#EAF5FF] text-[#2876FF]',
    orange: 'bg-[#FFF3E8] text-[#F59E0B]',
    purple: 'bg-[#F5EDFF] text-[#8B5CF6]',
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

function ProfileDrawer({ user, onClose }: { user: AdminUserCardItem | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(user)} onClose={onClose} className="absolute right-0 top-0 h-screen w-[808px] max-w-[calc(100vw-48px)] rounded-none border-l bg-white p-0">
      {user && (
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center border-b border-[#E6EDF7] px-6">
            <DialogHeader>
              <DialogTitle className="text-base text-[#1F2433]">画像详情</DialogTitle>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#F7FAFE] p-5">
            <DrawerSection title="基本信息">
              <div className="flex gap-5 p-5">
                <Avatar
                  className="h-[92px] w-[92px] ring-4 ring-[#EAF5FF]"
                  src={user.avatar}
                  fallback={user.nickname.slice(0, 1)}
                  style={{ boxShadow: `0 10px 24px ${user.avatarAccent}24` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-semibold text-[#1F2433]">{user.nickname}</span>
                    <span className="text-sm text-[#666666]">{user.gender === 'MALE' ? '男' : '女'} | {user.age}岁 | {user.zodiac}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[#666666] md:grid-cols-2">
                    <DrawerInfo icon={<Briefcase className="h-4 w-4" />} text={`${user.jobTitle} | ${user.company}`} />
                    <DrawerInfo icon={<GraduationCap className="h-4 w-4" />} text={user.educationText} />
                    <DrawerInfo icon={<MapPin className="h-4 w-4" />} text={`地址 现居${user.city} | 河南人`} />
                    <DrawerInfo icon={<BadgeCheck className="h-4 w-4" />} text={`手机号 ${user.phone}`} />
                  </div>
                </div>
                <div className="flex h-[68px] w-[188px] shrink-0 flex-col justify-center rounded-l-3xl bg-[#343431] px-6 text-[#F7DFA6]">
                  <span className="text-sm font-semibold">{user.vipLabel}</span>
                  <span className="mt-1 text-xs">{user.vipRange}</span>
                </div>
              </div>

              <div className="border-t border-[#E6EDF7] px-5 py-4 text-sm leading-7 text-[#777777]">
                <span className="mr-4 text-[#999999]">择偶要求</span>
                {user.mateRequirement}
              </div>

              <div className="flex flex-wrap items-center gap-2 px-5 pb-5">
                <span className="mr-3 text-sm text-[#999999]">性格标签</span>
                {user.characterTags.map((tag) => (
                  <DemoTagPill key={tag.label} tag={tag} />
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title="千寻币">
              <DemoTable
                headers={['时间', '类型', '金额', '余额', '来源/用途']}
                rows={user.coinRecords.map((item) => [item.time, item.type, item.amount, item.balance, item.usage])}
              />
            </DrawerSection>

            <DrawerSection
              title="红娘"
              action={<button className="text-sm font-semibold text-[#2876FF]">添加备注</button>}
            >
              <DemoTable
                headers={['红娘', '备注时间', '备注内容']}
                rows={user.matchmakerRecords.map((item) => [item.name, item.time, item.content])}
              />
            </DrawerSection>
          </div>

          <div className="flex h-[72px] shrink-0 items-center justify-end border-t border-[#E6EDF7] bg-white px-6">
            <Button variant="primary" onClick={onClose}>快速牵线</Button>
          </div>
        </div>
      )}
    </Dialog>
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

function WorkflowDialog({ type, onClose }: { type: 'import' | 'export' | null; onClose: () => void }) {
  const isImport = type === 'import';
  return (
    <Dialog open={Boolean(type)} onClose={onClose} className="max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{isImport ? '批量导入客户' : '导出客户数据'}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 space-y-4 text-sm text-[#5F6675]">
        <div className="rounded-md bg-[#F4F8FF] p-4">
          {isImport
            ? 'Demo 模式下不上传真实文件，点击确认后仅模拟导入 10 条客户样例。'
            : 'Demo 模式下不生成真实文件，点击确认后仅模拟导出当前筛选结果。'}
        </div>
        <div className="flex items-center gap-3 rounded-md border border-[#E6EDF7] p-4">
          {isImport ? <Upload className="h-5 w-5 text-[#2876FF]" /> : <Download className="h-5 w-5 text-[#2876FF]" />}
          <span>{isImport ? '客户名单-demo.xlsx' : '客户画像-demo.xlsx'}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onClose}>{isImport ? '确认导入' : '确认导出'}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function DrawerSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#E6EDF7] bg-white">
      <div className="flex h-12 items-center justify-between bg-[#EEF3F8] px-5">
        <div className="flex items-center gap-3">
          <span className="h-5 w-1 rounded-full bg-[#2876FF]" />
          <span className="font-semibold text-[#1F2433]">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </section>
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

function DrawerInfo({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[#A8B0BD]">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
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
