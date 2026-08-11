import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Download,
  Eye,
  Heart,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
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
  getAppUserStats,
  getAppUserWorkflowHistory,
  getAppUserRelationLikes,
  getAppUserRelationMatches,
  getAppUserRelationSummary,
  getAppUserRelationUnlocks,
  getAppUserRelationVisits,
  getAppUserMessageSummary,
  getAppUserPrivateMessages,
  getAppUserWhispers,
  getAppUserPlatformMessages,
  getAppUserMessageReports,
  viewAppUserPrivateMessageContent,
  viewAppUserWhisperContent,
  importAppUsers,
  deleteAppUser,
  updateAppUserStatus,
  type AppUserListVO,
  type AppUserStatsVO,
  type AppUserDetailVO,
  type ExportTaskVO,
  type ImportBatchVO,
  type AppUserWorkflowHistoryVO,
  type PageResult,
  type AppUserRelationLikeVO,
  type AppUserRelationMatchVO,
  type AppUserRelationSummaryVO,
  type AppUserRelationUnlockVO,
  type AppUserRelationVisitVO,
  type RelationCounterpartyVO,
  type RelationPageParams,
  type AppUserMessageSummaryVO,
  type AppUserPrivateMessageVO,
  type AppUserWhisperVO,
  type AppUserPlatformMessageVO,
  type AppUserMessageReportVO,
  type SensitiveMessageContentVO,
} from '@/api/userApp';
import { showToast } from '@/components/ui/toast';
import { getCommercialUserAssetDetail, type UserCommercialAssetDetail } from '@/api/commercial';
import {
  auditAvatar,
  getAvatarDetail,
  type VerificationAuditDetailVO,
} from '@/api/verification';
import { getTwoLevelRegions, type RegionTreeVO } from '@/api/dict';
import { usePermission } from '@/hooks/usePermission';

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
  relationshipOpen: number;
  visitorUv7d: number;
}

interface AppUserFilters extends Record<string, string | undefined> {
  keyword?: string;
  coreAccessStatus?: string;
  verificationStatus?: string;
  identity?: string;
  city?: string;
  relationshipAccess?: string;
  vipStatus?: string;
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
  aboutMe?: string;
  profileBgImage?: string;
  voiceIntroUrl?: string;
  voiceIntroAuditStatus?: string;
  favoriteSongId?: string;
  favoriteSongName?: string;
  favoriteSongArtist?: string;
  favoriteSongCoverUrl?: string;
  emotionalStatus?: string;
  emotionalStatusLabel?: string;
  datingGoal?: string;
  datingGoalLabel?: string;
  maritalStatus?: string;
  maritalStatusLabel?: string;
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
  { value: '', label: '全部VIP' },
  { value: 'active', label: 'VIP会员' },
  { value: 'inactive', label: '普通会员' },
  { value: 'expired', label: '会员过期' },
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

const FOLLOW_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'OPEN', label: '开放' },
  { value: 'CLOSED', label: '未开放' },
  { value: 'ABNORMAL', label: '账号异常' },
];

const ACCESS_OPTIONS = [
  { value: '', label: '准入状态' },
  { value: 'full_access', label: '完全准入' },
  { value: 'browse_only', label: '仅浏览' },
  { value: 'blocked', label: '已阻止' },
];

const APP_USER_PAGE_SIZE = 9;
const APP_USER_IMPORT_TEMPLATE_COLUMNS = [
  '登录方式', '手机号', '短信验证码', '微信授权信息', '登录协议/隐私协议同意',
  'openid', 'unionid', '昵称', '性别', '出生日期', '年龄', '身高', '体重',
  '身份', '行业', '职业', '公司', '年收入',
  '现居省份', '现居城市', '现居区县', '家乡省份', '家乡城市', '家乡区县',
  '婚姻状况', '脱单目标', '感情状态', '是否想要孩子', '子女计划',
  '学校', '专业', '最高学历', '个人标签', '微信号',
  '爱听的歌曲', '爱听歌曲ID', '爱听歌曲名称', '爱听歌曲歌手', '爱听歌曲封面URL', 'MBTI', '星座',
  '头像来源', '裁剪后主头像', '相册/附加照片', '资料背景图', '语音介绍文件', '语音介绍时长',
  '自我介绍', '资料问答', '见面偏好', '喜欢的见面活动', '住房情况', '购车情况',
  '有无子女', '结婚计划', '宗教信仰', '吸烟情况', '饮酒情况', '宠物态度',
  '真实姓名', '身份证号', '单身承诺/认证协议勾选',
  '学历人群', '学校名称', '学生证/在读证明', '认证方式', '学信网在线验证码',
  '毕业证或学位证书编号', '证书姓名', '毕业证/学位证材料', '学历协议勾选',
];

function responseData<T>(res: unknown, fallback: T): T {
  return (res as any)?.data ?? fallback;
}

function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\uFEFF', content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildImportTemplateCsv() {
  const sample = [
    '手机号登录', '13800000001', '123456', '已授权', '是',
    'openid_demo_01', 'unionid_demo_01', '导入示例用户', '女', '1997-03-06', '29', '168', '50',
    '职场人', 'IT/互联网', '设计师', '星河科技', '30-50万',
    '浙江省', '杭州市', '西湖区', '河南省', '郑州市', '中原区',
    '未婚', '1-2年内结婚', '正在寻觅', '想要', '以后考虑',
    '浙江工商管理大学', '设计学', '本科', 'IT文娱|户外旅行', 'wx_demo_01',
    '告白气球', 'song_001', '告白气球', '周杰伦', 'https://example.com/song-cover.jpg', 'INFJ', '双鱼座',
    '相册选择', 'https://example.com/avatar.jpg', 'https://example.com/album-a.jpg|https://example.com/album-b.jpg',
    'https://example.com/profile-bg.jpg', 'https://example.com/voice.mp3', '18',
    '我是一个真诚稳定的人。', '希望你也认真对待关系。',
    '[{"questionKey":"meetingPreference","title":"见面偏好","answer":"周末咖啡或展览"}]',
    '周末咖啡或展览', '看电影/逛展', '已购房', '已购车', '无子女', '1-2年内结婚', '无宗教信仰',
    '不吸烟', '偶尔饮酒', '喜欢宠物',
    '张三', '330106199703060011', '是',
    '职场人', '浙江工商管理大学', 'https://example.com/student-card.jpg',
    '证书编号', 'ABCD12345678', 'DIPLOMA20260001', '张三',
    'https://example.com/edu-a.jpg|https://example.com/edu-b.jpg', '是',
  ];
  return [
    APP_USER_IMPORT_TEMPLATE_COLUMNS.map(csvCell).join(','),
    sample.map(csvCell).join(','),
  ].join('\n');
}

function parseImportErrors(errorSummaryJson?: string): string[] {
  if (!errorSummaryJson) return [];
  try {
    const parsed = JSON.parse(errorSummaryJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => typeof item === 'string' ? item : JSON.stringify(item));
    }
    return [JSON.stringify(parsed)];
  } catch {
    return errorSummaryJson.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
  }
}

function buildImportErrorReportCsv(result: ImportBatchVO) {
  const errors = parseImportErrors(result.errorSummaryJson);
  const rows = errors.length > 0 ? errors : ['本次导入没有错误记录'];
  return [
    ['批次号', '原文件名', '错误信息'].map(csvCell).join(','),
    ...rows.map((error) => [result.batchNo, result.fileName, error].map(csvCell).join(',')),
  ].join('\n');
}

function flattenCityOptions(regions: RegionTreeVO[]) {
  return regions.flatMap((province) => (province.children || []).map((city) => ({
    value: city.code,
    label: province.name === city.name ? city.name : `${province.name} / ${city.name}`,
  })));
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
  const educationText = [user.educationLevelLabel || user.educationLevelCode, user.school]
    .filter(Boolean)
    .join(' | ') || '-';
  return {
    id: user.id,
    avatar: user.avatar || '',
    nickname: user.nickname || '-',
    gender: user.gender || '',
    genderLabel: user.genderLabel,
    age: user.age ?? 0,
    height: user.height,
    weight: user.weight,
    school: user.school || '-',
    realNameStatus: user.realNameStatus || 'NOT_CERTIFIED',
    educationStatus: user.educationStatus || 'NOT_CERTIFIED',
    avatarVerifyStatus: user.avatarVerifyStatus || 'NOT_CERTIFIED',
    avatarAuditRecordId: user.avatarAuditRecordId,
    avatarAuditMediaUrl: user.avatarAuditMediaUrl,
    avatarAuditThumbUrl: user.avatarAuditThumbUrl,
    avatarAuditRejectReason: user.avatarAuditRejectReason,
    avatarAuditSubmitTime: user.avatarAuditSubmitTime,
    firstLoginCompleted: user.firstLoginCompleted ?? 0,
    profileScore: user.profileScore ?? 0,
    accountStatus: user.accountStatus || 'NORMAL',
    accessStatus: user.accessStatus || 'blocked',
    registerTime: user.registerTime || '-',
    lastLoginTime: user.lastLoginTime || '-',
    phone: user.phone || '-',
    city: user.city || '-',
    zodiac: user.zodiac || '-',
    identity: user.identityLabel || user.identity || '-',
    identityCode: user.identityCode,
    identityLabel: user.identityLabel,
    industryCode: user.industryCode,
    industryLabel: user.industryLabel,
    occupationCode: user.occupationCode,
    occupationLabel: user.occupationLabel,
    annualIncomeCode: user.annualIncomeCode,
    annualIncomeLabel: user.annualIncomeLabel,
    educationLevelCode: user.educationLevelCode,
    educationLevelLabel: user.educationLevelLabel,
    wechatId: user.wechatId,
    coinBalance: user.coinBalance,
    vipStatus: user.vipStatus,
    vipExpireTime: user.vipExpireTime,
    jobTitle: user.occupationLabel || user.occupation || '-',
    company: user.company || '-',
    educationText,
    mateRequirement: user.annualIncomeLabel || user.annualIncome || '-',
    coins: user.coinBalance ?? 0,
    vipAmount: 0,
    vipLabel: user.vipStatus === 'active' ? 'VIP会员' : user.vipStatus === 'expired' ? '会员过期' : '普通会员',
    vipRange: user.vipExpireTime || '-',
    memberLevel: user.vipStatus === 'active' ? 'VIP会员' : user.vipStatus === 'expired' ? '会员过期' : '普通会员',
    followStatus: relationAccessText(user.accessStatus, user.accountStatus),
    avatarAccent: '#E6EDF7',
    avatarReviewStatus: STATUS_MAP[user.avatarVerifyStatus || '']?.label || '-',
    medal: user.accessStatus === 'full_access',
    characterTags: tags.length > 0 ? tags : [],
    coinRecords: [],
  };
}

function toDetailCardItem(detail: AppUserDetailVO, current?: AdminUserCardItem | null): AdminUserCardItem {
  const base = current ?? ({} as AdminUserCardItem);
  const verification = detail.verification;
  const city = [
    detail.locationProvinceLabel || detail.locationProvince,
    detail.locationCityLabel || detail.locationCity,
    detail.locationDistrictLabel || detail.locationDistrict,
  ].filter(Boolean).join('') || '-';
  const tags = toTagPills(detail.tags);
  const accessStatus = detail.canMatch && detail.canBeExposed ? 'full_access' : detail.canBrowseCards ? 'browse_only' : 'blocked';
  const educationText = [detail.educationLevelLabel || detail.educationLevel, detail.school]
    .filter(Boolean)
    .join(' | ') || '-';
  return {
    ...base,
    id: detail.id,
    avatar: detail.avatar || '',
    nickname: detail.nickname || '-',
    gender: detail.gender || '',
    genderLabel: detail.genderLabel,
    age: detail.age ?? 0,
    height: detail.height,
    weight: detail.weight,
    school: detail.school || '-',
    realNameStatus: verification?.realNameStatus || 'NOT_CERTIFIED',
    educationStatus: verification?.educationStatus || 'NOT_CERTIFIED',
    avatarVerifyStatus: verification?.avatarVerifyStatus || 'NOT_CERTIFIED',
    avatarAuditRecordId: detail.avatarAuditRecordId,
    avatarAuditMediaUrl: detail.avatarAuditMediaUrl,
    avatarAuditThumbUrl: detail.avatarAuditThumbUrl,
    avatarAuditRejectReason: detail.avatarAuditRejectReason,
    avatarAuditSubmitTime: detail.avatarAuditSubmitTime,
    firstLoginCompleted: detail.firstLoginCompleted ?? 0,
    profileScore: detail.profileScore ?? 0,
    accountStatus: detail.accountStatus || 'NORMAL',
    accessStatus,
    registerTime: detail.registerTime || '-',
    lastLoginTime: detail.lastLoginTime || '-',
    phone: detail.phone || base.phone || '-',
    city,
    zodiac: detail.zodiac || '-',
    identity: detail.identityLabel || detail.identity || '-',
    identityCode: detail.identityCode,
    identityLabel: detail.identityLabel,
    industryCode: detail.industryCode,
    industryLabel: detail.industryLabel,
    occupationCode: detail.occupationCode,
    occupationLabel: detail.occupationLabel,
    annualIncomeCode: detail.annualIncomeCode,
    annualIncomeLabel: detail.annualIncomeLabel,
    educationLevelCode: detail.educationLevelCode,
    educationLevelLabel: detail.educationLevelLabel,
    wechatId: detail.wechatId,
    coinBalance: detail.coinBalance,
    vipStatus: detail.vipStatus,
    vipExpireTime: detail.vipExpireTime,
    jobTitle: detail.occupationLabel || detail.occupation || '-',
    company: detail.company || '-',
    educationText,
    mateRequirement: detail.datingGoalLabel || detail.datingGoal || '-',
    coins: detail.coinBalance ?? base.coins ?? 0,
    vipLabel: detail.vipStatus === 'active' ? 'VIP会员' : detail.vipStatus === 'expired' ? '会员过期' : '普通会员',
    vipRange: detail.vipExpireTime || '-',
    memberLevel: detail.vipStatus === 'active' ? 'VIP会员' : detail.vipStatus === 'expired' ? '会员过期' : '普通会员',
    followStatus: relationAccessText(accessStatus, detail.accountStatus),
    characterTags: tags,
    avatarReviewStatus: STATUS_MAP[verification?.avatarVerifyStatus || '']?.label || '-',
    aboutMe: detail.aboutMe,
    photos: detail.photos,
    profileBgImage: detail.profileBgImage,
    voiceIntroUrl: detail.voiceIntroUrl,
    voiceIntroDuration: detail.voiceIntroDuration,
    voiceIntroAuditStatus: detail.voiceIntroAuditStatus,
    favoriteSongId: detail.favoriteSongId,
    favoriteSongName: detail.favoriteSongName,
    favoriteSongArtist: detail.favoriteSongArtist,
    favoriteSongCoverUrl: detail.favoriteSongCoverUrl,
    emotionalStatus: detail.emotionalStatus,
    emotionalStatusLabel: detail.emotionalStatusLabel,
    datingGoal: detail.datingGoal,
    datingGoalLabel: detail.datingGoalLabel,
    maritalStatus: detail.maritalStatus,
    maritalStatusLabel: detail.maritalStatusLabel,
  };
}

function relationAccessText(accessStatus?: string, accountStatus?: string) {
  if (['FROZEN', 'CANCELLED', 'CANCELLING'].includes(accountStatus || '')) {
    return '账号异常';
  }
  if (accessStatus === 'full_access') {
    return '开放';
  }
  return '未开放';
}

function parseStringArray(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(typeof item === 'string' ? item : item?.url ?? item?.mediaUrl ?? item?.value ?? ''))
        .filter(Boolean);
    }
  } catch {
    // 非 JSON 字符串按逗号拆分，兼容历史数据。
  }
  return raw.split(/[,，\s]+/).map((item) => item.trim()).filter(Boolean);
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
  const { hasPermission } = usePermission();
  const canViewRelations = hasPermission('user:app:relation:view');
  const canViewCommercial = hasPermission('commercial:user:view');
  const canDeleteUser = hasPermission('user:app:delete');
  const canViewMessageSummary = hasPermission('message:summary:view');
  const canViewPrivateMessages = hasPermission('message:conversation:list');
  const canViewWhispers = hasPermission('message:whisper:list');
  const canViewPlatformMessages = hasPermission('message:system:list');
  const canViewMessageReports = hasPermission('community:report:list');
  const canViewSensitiveMessages = hasPermission('message:sensitive-content:view');
  const [keyword, setKeyword] = useState('');
  const [coreAccessStatus, setCoreAccessStatus] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [identity, setIdentity] = useState('');
  const [city, setCity] = useState('');
  const [memberLevel, setMemberLevel] = useState('');
  const [followStatus, setFollowStatus] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [listView, setListView] = useState<'card' | 'table'>('card');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    coreAllowed: 0,
    relationshipOpen: 0,
    visitorUv7d: 0,
  });
  const [loading, setLoading] = useState(false);
  const [drawerUser, setDrawerUser] = useState<AdminUserCardItem | null>(null);
  const [avatarUser, setAvatarUser] = useState<AdminUserCardItem | null>(null);
  const [moduleSupplementUser, setModuleSupplementUser] = useState<AdminUserCardItem | null>(null);
  const [workflowDialog, setWorkflowDialog] = useState<'import' | 'export' | null>(null);
  const [workflowResult, setWorkflowResult] = useState<ImportBatchVO | ExportTaskVO | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<PageResult<AppUserWorkflowHistoryVO>>({
    records: [],
    total: 0,
    size: 5,
    current: 1,
  });
  const [workflowHistoryPage, setWorkflowHistoryPage] = useState(1);
  const [workflowHistoryOpen, setWorkflowHistoryOpen] = useState(false);
  const [workflowHistoryLoading, setWorkflowHistoryLoading] = useState(false);
  const [workflowProcessing, setWorkflowProcessing] = useState(false);
  const [cityOptions, setCityOptions] = useState([{ value: '', label: '全部城市' }]);
  const listRequestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [coreAccessStatus, verificationStatus, identity, city, memberLevel, followStatus]);

  const currentFilters = useMemo<AppUserFilters>(() => ({
    keyword: debouncedKeyword || undefined,
    coreAccessStatus: coreAccessStatus || undefined,
    verificationStatus: verificationStatus || undefined,
    identity: identity || undefined,
    city: city || undefined,
    relationshipAccess: followStatus || undefined,
    vipStatus: memberLevel || undefined,
  }), [city, coreAccessStatus, debouncedKeyword, followStatus, identity, memberLevel, verificationStatus]);

  const fetchUsers = useCallback(async () => {
    const requestSequence = ++listRequestSequence.current;
    setLoading(true);
    try {
      const res = await getAppUserList({
        page,
        size: APP_USER_PAGE_SIZE,
        ...currentFilters,
      });
      if (requestSequence !== listRequestSequence.current) return;
      const data = responseData<PageResult<AppUserListVO>>(res, {
        records: [], total: 0, size: APP_USER_PAGE_SIZE, current: page,
      });
      setUsers((data.records || []).map(toCardItem));
      setTotal(data.total ?? data.records?.length ?? 0);
    } catch {
      if (requestSequence !== listRequestSequence.current) return;
      setUsers([]);
      setTotal(0);
    } finally {
      if (requestSequence === listRequestSequence.current) setLoading(false);
    }
  }, [currentFilters, page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getAppUserStats();
      const data = responseData<AppUserStatsVO>(res, {
        currentUserCount: 0,
        coreAccessAllowedCount: 0,
        relationshipAccessOpenCount: 0,
        visitorUv7d: 0,
      });
      setStats((prev) => ({
        ...prev,
        total: data.currentUserCount ?? 0,
        coreAllowed: data.coreAccessAllowedCount ?? 0,
        relationshipOpen: data.relationshipAccessOpenCount ?? 0,
        visitorUv7d: data.visitorUv7d ?? 0,
      }));
    } catch {
      setStats((prev) => ({
        ...prev,
        total: 0,
        coreAllowed: 0,
        relationshipOpen: 0,
        visitorUv7d: 0,
      }));
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    let disposed = false;
    getTwoLevelRegions()
      .then((res) => {
        const regions = responseData<RegionTreeVO[]>(res, []);
        if (disposed) return;
        setCityOptions([{ value: '', label: '全部城市' }, ...flattenCityOptions(regions)]);
      })
      .catch(() => {
        if (!disposed) setCityOptions([{ value: '', label: '全部城市' }]);
      });
    return () => { disposed = true; };
  }, []);

  const pageUsers = users;
  const paginationTotal = total;
  function handleSearch() {
    setDebouncedKeyword(keyword.trim());
    setPage(1);
  }

  function handleReset() {
    setKeyword('');
    setCoreAccessStatus('');
    setVerificationStatus('');
    setIdentity('');
    setCity('');
    setMemberLevel('');
    setFollowStatus('');
    setDebouncedKeyword('');
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

  function openRelationProfile(counterparty: RelationCounterpartyVO) {
    if (!counterparty.userId) return;
    void openProfile(toCardItem({
      id: counterparty.userId,
      avatar: counterparty.avatar || '',
      nickname: counterparty.nickname || counterparty.userNo || '-',
      gender: '',
      age: 0,
      school: '-',
      phone: counterparty.maskedPhone,
      realNameStatus: 'NOT_CERTIFIED',
      educationStatus: 'NOT_CERTIFIED',
      avatarVerifyStatus: 'NOT_CERTIFIED',
      firstLoginCompleted: 0,
      profileScore: 0,
      accountStatus: 'NORMAL',
      accessStatus: 'blocked',
      registerTime: '-',
      lastLoginTime: '-',
    }));
  }

  function handleUserStatusChanged(userId: number, status: string) {
    setUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, accountStatus: status } : item)));
    setDrawerUser((prev) => (prev && prev.id === userId ? { ...prev, accountStatus: status } : prev));
    fetchUsers();
    fetchStats();
  }

  function handleUserDeleted(userId: number) {
    setDrawerUser(null);
    setUsers((prev) => prev.filter((item) => item.id !== userId));
    if (users.length <= 1 && page > 1) {
      setPage((current) => Math.max(1, current - 1));
    } else {
      void fetchUsers();
    }
    void fetchStats();
  }

  function openWorkflowDialog(type: 'import' | 'export') {
    setWorkflowResult(null);
    setWorkflowDialog(type);
  }

  async function fetchWorkflowHistory(nextPage = workflowHistoryPage) {
    setWorkflowHistoryLoading(true);
    try {
      const res = await getAppUserWorkflowHistory({ page: nextPage, size: 5 });
      const data = responseData<PageResult<AppUserWorkflowHistoryVO>>(res, {
        records: [],
        total: 0,
        size: 5,
        current: nextPage,
      });
      setWorkflowHistory({
        records: data.records || [],
        total: data.total ?? 0,
        size: data.size ?? 5,
        current: data.current ?? nextPage,
      });
      setWorkflowHistoryPage(data.current ?? nextPage);
    } catch {
      setWorkflowHistory({ records: [], total: 0, size: 5, current: nextPage });
      showToast('导入导出历史加载失败', 'error');
    } finally {
      setWorkflowHistoryLoading(false);
    }
  }

  function openWorkflowHistory() {
    setWorkflowHistoryOpen(true);
    setWorkflowHistoryPage(1);
    fetchWorkflowHistory(1);
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
        const res = await exportAppUsers(currentFilters, true);
        const data = responseData<ExportTaskVO>(res, null as any);
        setWorkflowResult(data);
        showToast(data?.message || '导出任务已创建', 'success');
      }
      if (workflowHistoryOpen) fetchWorkflowHistory(1);
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
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={openWorkflowHistory}
          >
            查看导入导出结果
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => openWorkflowDialog('import')}>
            <Upload className="mr-1.5 h-4 w-4" />
            批量导入
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => openWorkflowDialog('export')}>
            <Download className="mr-1.5 h-4 w-4" />
            导出字段
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-sm">
        <CardContent className="p-7">
          <div className="grid gap-4 lg:grid-cols-4">
            <StatCard icon={<ShieldCheck className="h-8 w-8" />} label="当前用户" value={stats.total.toLocaleString('zh-CN')} tone="blue" />
            <StatCard icon={<BadgeCheck className="h-8 w-8" />} label="核心准入开放" value={stats.coreAllowed.toLocaleString('zh-CN')} tone="green" />
            <StatCard icon={<Heart className="h-8 w-8" />} label="关系反馈开放" value={stats.relationshipOpen.toLocaleString('zh-CN')} tone="orange" />
            <StatCard icon={<Eye className="h-8 w-8" />} label="7天访客 UV" value={stats.visitorUv7d.toLocaleString('zh-CN')} tone="purple" />
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
              <SearchableSelect options={cityOptions} value={city} onChange={setCity} placeholder="全部城市" />
            </QueryField>
            <QueryField label="关系反馈准入">
              <Select options={FOLLOW_STATUS_OPTIONS} value={followStatus} onChange={setFollowStatus} />
            </QueryField>
            {canViewCommercial && (
              <QueryField label="VIP 状态">
                <Select options={MEMBER_LEVEL_OPTIONS} value={memberLevel} onChange={setMemberLevel} />
              </QueryField>
            )}
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
              <p className="mt-1 text-sm text-muted-foreground">卡片内展示固定字段和敏感信息掩码，“心动 & 消息”从卡片或列表操作进入。</p>
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
                    canViewCommercial={canViewCommercial}
                    onOpenProfile={() => openProfile(user)}
                    onOpenAvatar={() => setAvatarUser(user)}
                    onOpenModuleSupplement={() => setModuleSupplementUser(user)}
                  />
                ))}
              </div>
            ) : (
              <AppUserTable
                users={pageUsers}
                canViewCommercial={canViewCommercial}
                onOpenProfile={openProfile}
                onOpenAvatar={setAvatarUser}
                onOpenModuleSupplement={setModuleSupplementUser}
              />
            )}
          </div>

          {pageUsers.length === 0 && (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              {loading ? '加载中...' : '暂无匹配的 App 用户'}
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">共 {paginationTotal} 条 · {APP_USER_PAGE_SIZE}条/页</span>
            <Pagination current={page} total={paginationTotal} pageSize={APP_USER_PAGE_SIZE} onChange={setPage} />
          </div>
        </CardContent>
      </Card>

      <ProfileDrawer
        user={drawerUser}
        canViewCommercial={canViewCommercial}
        canDeleteUser={canDeleteUser}
        elevated={Boolean(moduleSupplementUser)}
        onClose={() => setDrawerUser(null)}
        onStatusChanged={handleUserStatusChanged}
        onDeleted={handleUserDeleted}
      />
      <ModuleSupplementDialog
        user={moduleSupplementUser}
        canViewRelations={canViewRelations}
        canViewCommercial={canViewCommercial}
        canViewMessageSummary={canViewMessageSummary}
        canViewPrivateMessages={canViewPrivateMessages}
        canViewWhispers={canViewWhispers}
        canViewPlatformMessages={canViewPlatformMessages}
        canViewMessageReports={canViewMessageReports}
        canViewSensitiveMessages={canViewSensitiveMessages}
        childDialogOpen={Boolean(drawerUser)}
        onViewUser={openRelationProfile}
        onClose={() => setModuleSupplementUser(null)}
      />
      <AvatarAuditDialog
        user={avatarUser}
        onClose={() => setAvatarUser(null)}
        onGoAudit={() => {
          const auditKeyword = avatarUser?.nickname?.trim() || (avatarUser?.id ? String(avatarUser.id) : '');
          navigate(auditKeyword ? `/verify/avatar?keyword=${encodeURIComponent(auditKeyword)}` : '/verify/avatar');
        }}
        onChanged={fetchUsers}
      />
      <WorkflowDialog
        type={workflowDialog}
        result={workflowResult}
        processing={workflowProcessing}
        onConfirm={handleWorkflowConfirm}
        onClose={() => setWorkflowDialog(null)}
      />
      <WorkflowHistoryDialog
        open={workflowHistoryOpen}
        historyPage={workflowHistory}
        loading={workflowHistoryLoading}
        onPageChange={(nextPage) => fetchWorkflowHistory(nextPage)}
        onClose={() => setWorkflowHistoryOpen(false)}
      />
    </div>
  );
}

function CustomerCard({
  user,
  canViewCommercial,
  onOpenProfile,
  onOpenAvatar,
  onOpenModuleSupplement,
}: {
  user: AdminUserCardItem;
  canViewCommercial: boolean;
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
                <p className="mt-1 text-sm text-[#5F6675]">{user.genderLabel || '-'} {user.age} · {user.city}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-md bg-[#EAF5FF] px-3 py-1 text-xs font-medium text-[#2876FF]">{user.identity}</span>
                {canViewCommercial && user.vipLabel !== '普通会员' && <span className="rounded-md bg-[#FFF3E8] px-3 py-1 text-xs font-medium text-[#E57D1F]">VIP</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-[#F7FAFE] px-4 py-3 text-sm text-[#1F2433]">
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <span className="font-medium text-[#5F6675]">资料摘要</span>
            <div>
              <b>{user.jobTitle} · {user.company}</b>
              <div className="mt-1 text-[#5F6675]">年收入{user.annualIncomeLabel || user.annualIncome || '-'} · {user.city}</div>
            </div>
          </div>
        </div>

        <div className={`mt-4 grid gap-3 text-sm ${canViewCommercial ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="rounded-md bg-[#F7FAFE] p-3">
            <span className="text-xs text-[#7D8597]">完整度</span>
            <strong className="mt-1 block text-[#111827]">{user.profileScore}/100</strong>
          </div>
          {canViewCommercial && (
            <div className="rounded-md bg-[#F7FAFE] p-3">
              <span className="text-xs text-[#7D8597]">千寻币</span>
              <strong className="mt-1 block text-[#111827]">{user.coins.toLocaleString()}</strong>
            </div>
          )}
          <div className="rounded-md bg-[#F7FAFE] p-3">
            <span className="text-xs text-[#7D8597]">微信</span>
            <strong className="mt-1 block text-[#111827]">{user.wechatId || '-'}</strong>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={STATUS_MAP[user.avatarVerifyStatus]?.variant ?? 'secondary'}>{verificationBadgeText('avatar', user.avatarVerifyStatus)}</Badge>
          <Badge variant={STATUS_MAP[user.realNameStatus]?.variant ?? 'secondary'}>{verificationBadgeText('realName', user.realNameStatus)}</Badge>
          <Badge variant={STATUS_MAP[user.educationStatus]?.variant ?? 'secondary'}>{verificationBadgeText('education', user.educationStatus)}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_1fr_88px] gap-2 text-sm font-semibold">
          <button className="h-10 rounded-md bg-[#2876FF] text-white" onClick={onOpenProfile}>详情</button>
          <button className="h-10 rounded-md border border-[#2876FF] bg-white text-[#2876FF]" onClick={onOpenModuleSupplement}>心动 &amp; 消息</button>
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

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((item) => item.value === value)?.label || placeholder || '请选择';
  const filteredOptions = options.filter((item) => {
    const key = keyword.trim().toLowerCase();
    return !key || item.label.toLowerCase().includes(key) || item.value.toLowerCase().includes(key);
  }).slice(0, 80);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={`flex h-9 w-full items-center justify-between rounded-md border bg-card px-3 text-left text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring ${
          value ? 'border-[#2876FF] text-foreground' : 'border-input text-muted-foreground'
        }`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="text-xs text-muted-foreground">v</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-[#D8E2F0] bg-white p-2 shadow-lg">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="输入城市名搜索"
            className="mb-2 h-8 text-sm"
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">暂无匹配城市</div>
            ) : filteredOptions.map((option) => (
              <button
                key={option.value || '__all_city__'}
                type="button"
                className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-[#F4F7FB] ${
                  option.value === value ? 'bg-[#EAF2FF] font-semibold text-[#2876FF]' : 'text-[#1F2433]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setKeyword('');
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AppUserTable({
  users,
  canViewCommercial,
  onOpenProfile,
  onOpenAvatar,
  onOpenModuleSupplement,
}: {
  users: AdminUserCardItem[];
  canViewCommercial: boolean;
  onOpenProfile: (user: AdminUserCardItem) => void;
  onOpenAvatar: (user: AdminUserCardItem) => void;
  onOpenModuleSupplement: (user: AdminUserCardItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E6EDF7]">
      <table className={`w-full text-left text-sm ${canViewCommercial ? 'min-w-[980px]' : 'min-w-[860px]'}`}>
        <thead className="bg-[#F7FAFE] text-[#5F6675]">
          <tr>
            <th className="px-4 py-3 font-medium">用户</th>
            <th className="px-4 py-3 font-medium">资料摘要</th>
            <th className="px-4 py-3 font-medium">完整度</th>
            {canViewCommercial && <th className="px-4 py-3 font-medium">千寻币</th>}
            <th className="px-4 py-3 font-medium">微信</th>
            <th className="px-4 py-3 font-medium">认证状态</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6EDF7] bg-white">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9" src={user.avatar} fallback={user.nickname.slice(0, 1)} />
                  <div>
                    <div className="font-medium text-[#1F2433]">{user.nickname}</div>
                    <div className="text-xs text-muted-foreground">{user.genderLabel || user.gender} {user.age} · {user.city}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-[#1F2433]">{user.jobTitle} · {user.company}</div>
                <div className="mt-1 text-xs text-muted-foreground">年收入 {user.annualIncomeLabel || user.annualIncome || '-'} · {user.identity}</div>
              </td>
              <td className="px-4 py-3 font-semibold">{user.profileScore}/100</td>
              {canViewCommercial && <td className="px-4 py-3">{user.coins.toLocaleString()}</td>}
              <td className="px-4 py-3">{user.wechatId || '-'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={STATUS_MAP[user.avatarVerifyStatus]?.variant ?? 'secondary'}>{verificationBadgeText('avatar', user.avatarVerifyStatus)}</Badge>
                  <Badge variant={STATUS_MAP[user.realNameStatus]?.variant ?? 'secondary'}>{verificationBadgeText('realName', user.realNameStatus)}</Badge>
                  <Badge variant={STATUS_MAP[user.educationStatus]?.variant ?? 'secondary'}>{verificationBadgeText('education', user.educationStatus)}</Badge>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onOpenProfile(user)}>详情</Button>
                  <Button variant="ghost" size="sm" onClick={() => onOpenModuleSupplement(user)}>心动 &amp; 消息</Button>
                  <Button variant="ghost" size="sm" onClick={() => onOpenAvatar(user)}>头像审核</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
type RelationTabKey = 'likes' | 'visitors' | 'matches' | 'unlocks';
type RelationRecord = AppUserRelationLikeVO | AppUserRelationVisitVO | AppUserRelationMatchVO | AppUserRelationUnlockVO;
const RELATION_PAGE_SIZE = 5;

const RELATION_LABELS: Record<RelationTabKey, string> = {
  likes: '喜欢记录', visitors: '访客记录', matches: '相互喜欢', unlocks: '解锁记录',
};
const RELATION_ACCESS_LABELS: Record<string, string> = { OPEN: '开放', CLOSED: '未开放', ABNORMAL: '账号异常' };
const RELATION_SOURCE_LABELS: Record<string, string> = {
  fate: '觅缘', featured: '精选', ideal: '理想型', profile: '婚恋主页', likes_me: '喜欢我的', recent_viewers: '最近访客',
  double_like: '双方互送爱心', featured_heart_return_like: '精选心动后回爱心', whisper_reply: '悄悄话回复',
  likes_unlock_one: '喜欢单条解锁', viewers_unlock_one: '访客单条解锁',
};
const RELATION_STATUS_LABELS: Record<string, string> = {
  active: '有效', cancelled: '已取消', invalid: '已失效', visible: '窗口内可见', expired_window: '已超展示窗口',
  matched: '匹配有效', expired: '已过期', refunded: '已退款',
};
const RELATION_REASON_LABELS: Record<string, string> = {
  like_cancelled: '取消喜欢', blocked: '任一方拉黑', account_frozen: '账号冻结', account_deleted: '账号注销',
  risk_banned: '风控封禁', certification_revoked: '认证失效',
};

type MessageListKey = 'private' | 'whisper' | 'platform' | 'report';
type SensitiveMessageTarget = { type: 'private_message' | 'whisper'; no: string };
interface MessagePanelItem {
  key: string;
  title: string;
  subtitle: string;
  status: string;
  detail: string;
  action?: ReactNode;
}

const MESSAGE_PAGE_SIZE = 5;
const MESSAGE_SEND_LABELS: Record<string, string> = {
  queued: '待投递', sent: '已发送', failed: '发送失败',
};
const MESSAGE_READ_LABELS: Record<string, string> = {
  not_applicable: '未送达/不适用', unread: '未读', read: '已读',
};
const WHISPER_STATUS_LABELS: Record<string, string> = {
  pending: '等待回复', replied: '已回复并匹配', expired: '已过期', invalid: '已失效',
};
const DELIVERY_STATUS_LABELS: Record<string, string> = {
  queued: '待投递', sent: '已送达', failed: '投递失败',
};
const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: '待处理', processing: '处理中', resolved: '已处理', rejected: '已驳回', closed: '已关闭',
  valid: '举报成立', invalid: '举报不成立', merged: '已合并',
};

function emptyMessagePage<T>(page = 1): PageResult<T> {
  return { records: [], total: 0, size: MESSAGE_PAGE_SIZE, current: page };
}

function ModuleSupplementDialog({
  user,
  canViewRelations,
  canViewCommercial,
  canViewMessageSummary,
  canViewPrivateMessages,
  canViewWhispers,
  canViewPlatformMessages,
  canViewMessageReports,
  canViewSensitiveMessages,
  childDialogOpen,
  onViewUser,
  onClose,
}: {
  user: AdminUserCardItem | null;
  canViewRelations: boolean;
  canViewCommercial: boolean;
  canViewMessageSummary: boolean;
  canViewPrivateMessages: boolean;
  canViewWhispers: boolean;
  canViewPlatformMessages: boolean;
  canViewMessageReports: boolean;
  canViewSensitiveMessages: boolean;
  childDialogOpen: boolean;
  onViewUser: (counterparty: RelationCounterpartyVO) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'relation' | 'message'>(canViewRelations ? 'relation' : 'message');
  const [relationTab, setRelationTab] = useState<RelationTabKey>('likes');
  const [relationPage, setRelationPage] = useState(1);
  const [direction, setDirection] = useState<'ALL' | 'OUTBOUND' | 'INBOUND'>('ALL');
  const [relationStatus, setRelationStatus] = useState('');
  const [relationSource, setRelationSource] = useState('');
  const [unlockNo, setUnlockNo] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [summary, setSummary] = useState<AppUserRelationSummaryVO | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [relationData, setRelationData] = useState<PageResult<RelationRecord>>({ records: [], total: 0, size: RELATION_PAGE_SIZE, current: 1 });
  const [relationLoading, setRelationLoading] = useState(false);
  const [relationError, setRelationError] = useState('');
  const relationRequestSequence = useRef(0);
  const relationCache = useRef(new Map<string, PageResult<RelationRecord>>());
  const [messageSummary, setMessageSummary] = useState<AppUserMessageSummaryVO | null>(null);
  const [messageSummaryLoading, setMessageSummaryLoading] = useState(false);
  const [messageSummaryError, setMessageSummaryError] = useState('');
  const [privatePage, setPrivatePage] = useState(1);
  const [whisperPage, setWhisperPage] = useState(1);
  const [platformPage, setPlatformPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const [privateData, setPrivateData] = useState<PageResult<AppUserPrivateMessageVO>>(emptyMessagePage());
  const [whisperData, setWhisperData] = useState<PageResult<AppUserWhisperVO>>(emptyMessagePage());
  const [platformData, setPlatformData] = useState<PageResult<AppUserPlatformMessageVO>>(emptyMessagePage());
  const [reportData, setReportData] = useState<PageResult<AppUserMessageReportVO>>(emptyMessagePage());
  const [messageLoading, setMessageLoading] = useState<Record<MessageListKey, boolean>>({
    private: false, whisper: false, platform: false, report: false,
  });
  const [messageErrors, setMessageErrors] = useState<Record<MessageListKey, string>>({
    private: '', whisper: '', platform: '', report: '',
  });
  const currentMessageUserId = useRef<number | null>(user?.id ?? null);
  const messageSummaryRequestSequence = useRef(0);
  const messageListRequestSequence = useRef<Record<MessageListKey, number>>({
    private: 0, whisper: 0, platform: 0, report: 0,
  });
  currentMessageUserId.current = user?.id ?? null;
  const [sensitiveTarget, setSensitiveTarget] = useState<SensitiveMessageTarget | null>(null);
  const [sensitiveReason, setSensitiveReason] = useState('');
  const [sensitiveLoading, setSensitiveLoading] = useState(false);
  const [sensitiveError, setSensitiveError] = useState('');
  const [sensitiveContent, setSensitiveContent] = useState<SensitiveMessageContentVO | null>(null);

  const loadSummary = useCallback(async (userId: number) => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const res = await getAppUserRelationSummary(userId);
      setSummary(responseData<AppUserRelationSummaryVO>(res, null as any));
    } catch {
      setSummary(null);
      setSummaryError('关系摘要加载失败');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadRelationPage = useCallback(async (
    userId: number,
    tab: RelationTabKey,
    params: RelationPageParams,
    bypassCache = false,
  ) => {
    const cacheKey = `${userId}:${tab}:${JSON.stringify(params)}`;
    const cached = relationCache.current.get(cacheKey);
    if (cached && !bypassCache) {
      setRelationData(cached);
      setRelationError('');
      return;
    }
    const sequence = ++relationRequestSequence.current;
    setRelationLoading(true);
    setRelationError('');
    try {
      const requestByTab = {
        likes: getAppUserRelationLikes,
        visitors: getAppUserRelationVisits,
        matches: getAppUserRelationMatches,
        unlocks: getAppUserRelationUnlocks,
      }[tab];
      const res = await requestByTab(userId, params);
      if (sequence !== relationRequestSequence.current) return;
      const data = responseData<PageResult<RelationRecord>>(res, { records: [], total: 0, size: params.size, current: params.page });
      relationCache.current.set(cacheKey, data);
      setRelationData(data);
    } catch {
      if (sequence !== relationRequestSequence.current) return;
      setRelationData({ records: [], total: 0, size: params.size, current: params.page });
      setRelationError(`${RELATION_LABELS[tab]}加载失败`);
    } finally {
      if (sequence === relationRequestSequence.current) setRelationLoading(false);
    }
  }, []);

  const loadMessageSummary = useCallback(async (userId: number) => {
    const sequence = ++messageSummaryRequestSequence.current;
    setMessageSummaryLoading(true);
    setMessageSummaryError('');
    try {
      const res = await getAppUserMessageSummary(userId);
      if (sequence !== messageSummaryRequestSequence.current || currentMessageUserId.current !== userId) return;
      setMessageSummary(responseData<AppUserMessageSummaryVO>(res, null as any));
    } catch {
      if (sequence !== messageSummaryRequestSequence.current || currentMessageUserId.current !== userId) return;
      setMessageSummary(null);
      setMessageSummaryError('消息摘要加载失败');
    } finally {
      if (sequence === messageSummaryRequestSequence.current && currentMessageUserId.current === userId) {
        setMessageSummaryLoading(false);
      }
    }
  }, []);

  const loadMessageList = useCallback(async (userId: number, key: MessageListKey, page: number) => {
    const sequence = ++messageListRequestSequence.current[key];
    const isCurrentRequest = () => sequence === messageListRequestSequence.current[key]
      && currentMessageUserId.current === userId;
    setMessageLoading((current) => ({ ...current, [key]: true }));
    setMessageErrors((current) => ({ ...current, [key]: '' }));
    try {
      if (key === 'private') {
        const res = await getAppUserPrivateMessages(userId, page);
        if (!isCurrentRequest()) return;
        setPrivateData(responseData<PageResult<AppUserPrivateMessageVO>>(res, emptyMessagePage(page)));
      } else if (key === 'whisper') {
        const res = await getAppUserWhispers(userId, page);
        if (!isCurrentRequest()) return;
        setWhisperData(responseData<PageResult<AppUserWhisperVO>>(res, emptyMessagePage(page)));
      } else if (key === 'platform') {
        const res = await getAppUserPlatformMessages(userId, page);
        if (!isCurrentRequest()) return;
        setPlatformData(responseData<PageResult<AppUserPlatformMessageVO>>(res, emptyMessagePage(page)));
      } else {
        const res = await getAppUserMessageReports(userId, page);
        if (!isCurrentRequest()) return;
        setReportData(responseData<PageResult<AppUserMessageReportVO>>(res, emptyMessagePage(page)));
      }
    } catch {
      if (!isCurrentRequest()) return;
      if (key === 'private') setPrivateData(emptyMessagePage(page));
      if (key === 'whisper') setWhisperData(emptyMessagePage(page));
      if (key === 'platform') setPlatformData(emptyMessagePage(page));
      if (key === 'report') setReportData(emptyMessagePage(page));
      setMessageErrors((current) => ({ ...current, [key]: '数据加载失败' }));
    } finally {
      if (isCurrentRequest()) {
        setMessageLoading((current) => ({ ...current, [key]: false }));
      }
    }
  }, []);

  const openSensitiveContent = (target: SensitiveMessageTarget) => {
    setSensitiveTarget(target);
    setSensitiveReason('');
    setSensitiveError('');
    setSensitiveContent(null);
  };

  const confirmSensitiveContent = async () => {
    if (!user || !sensitiveTarget) return;
    if (sensitiveReason.trim().length < 5) {
      setSensitiveError('查看原因至少填写 5 个字符');
      return;
    }
    setSensitiveLoading(true);
    setSensitiveError('');
    try {
      const payload = {
        viewReason: sensitiveReason.trim(),
        requestId: `ADMIN-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      };
      const res = sensitiveTarget.type === 'private_message'
        ? await viewAppUserPrivateMessageContent(user.id, sensitiveTarget.no, payload)
        : await viewAppUserWhisperContent(user.id, sensitiveTarget.no, payload);
      setSensitiveContent(responseData<SensitiveMessageContentVO>(res, null as any));
    } catch (error: any) {
      setSensitiveError(
        error?.response?.data?.msg
        || error?.response?.data?.message
        || error?.message
        || '高敏正文查看失败',
      );
    } finally {
      setSensitiveLoading(false);
    }
  };

  const queryParams = useMemo<RelationPageParams>(() => ({
    page: relationPage,
    size: RELATION_PAGE_SIZE,
    unlockNo: relationTab === 'unlocks' && unlockNo ? unlockNo : undefined,
    direction: relationTab === 'matches' ? 'ALL' : direction,
    status: relationStatus || undefined,
    source: relationSource || undefined,
    startTime: toBackendDateTime(startTime),
    endTime: toBackendDateTime(endTime),
  }), [direction, endTime, relationPage, relationSource, relationStatus, relationTab, startTime, unlockNo]);

  useEffect(() => {
    messageSummaryRequestSequence.current += 1;
    (Object.keys(messageListRequestSequence.current) as MessageListKey[]).forEach((key) => {
      messageListRequestSequence.current[key] += 1;
    });
    relationCache.current.clear();
    setSummary(null);
    setRelationData({ records: [], total: 0, size: RELATION_PAGE_SIZE, current: 1 });
    setRelationTab('likes');
    setRelationPage(1);
    setDirection('ALL');
    setRelationStatus('');
    setRelationSource('');
    setUnlockNo('');
    setStartTime('');
    setEndTime('');
    setMessageSummary(null);
    setMessageSummaryLoading(false);
    setMessageSummaryError('');
    setPrivatePage(1);
    setWhisperPage(1);
    setPlatformPage(1);
    setReportPage(1);
    setPrivateData(emptyMessagePage());
    setWhisperData(emptyMessagePage());
    setPlatformData(emptyMessagePage());
    setReportData(emptyMessagePage());
    setMessageErrors({ private: '', whisper: '', platform: '', report: '' });
    setMessageLoading({ private: false, whisper: false, platform: false, report: false });
    setSensitiveTarget(null);
    setSensitiveContent(null);
    setActiveTab(canViewRelations ? 'relation' : 'message');
  }, [canViewRelations, user?.id]);

  useEffect(() => {
    if (user && canViewRelations) void loadSummary(user.id);
  }, [canViewRelations, loadSummary, user?.id]);

  useEffect(() => {
    if (user && canViewRelations && activeTab === 'relation') {
      void loadRelationPage(user.id, relationTab, queryParams);
    }
  }, [activeTab, canViewRelations, loadRelationPage, queryParams, relationTab, user?.id]);

  useEffect(() => {
    if (user && canViewMessageSummary && activeTab === 'message') {
      void loadMessageSummary(user.id);
    }
  }, [activeTab, canViewMessageSummary, loadMessageSummary, user?.id]);

  useEffect(() => {
    if (user && canViewPrivateMessages && activeTab === 'message') {
      void loadMessageList(user.id, 'private', privatePage);
    }
  }, [activeTab, canViewPrivateMessages, loadMessageList, privatePage, user?.id]);

  useEffect(() => {
    if (user && canViewWhispers && activeTab === 'message') {
      void loadMessageList(user.id, 'whisper', whisperPage);
    }
  }, [activeTab, canViewWhispers, loadMessageList, user?.id, whisperPage]);

  useEffect(() => {
    if (user && canViewPlatformMessages && activeTab === 'message') {
      void loadMessageList(user.id, 'platform', platformPage);
    }
  }, [activeTab, canViewPlatformMessages, loadMessageList, platformPage, user?.id]);

  useEffect(() => {
    if (user && canViewMessageReports && activeTab === 'message') {
      void loadMessageList(user.id, 'report', reportPage);
    }
  }, [activeTab, canViewMessageReports, loadMessageList, reportPage, user?.id]);

  const changeRelationTab = (tab: RelationTabKey, targetUnlockNo = '') => {
    setRelationTab(tab);
    setRelationPage(1);
    setDirection('ALL');
    setRelationStatus('');
    setRelationSource('');
    setUnlockNo(tab === 'unlocks' ? targetUnlockNo : '');
    setStartTime('');
    setEndTime('');
  };

  const pageRows = relationData.records.map((record) => relationTableRow(
    relationTab,
    record,
    canViewCommercial,
    onViewUser,
    (targetUnlockNo) => changeRelationTab('unlocks', targetUnlockNo),
  ));
  const tableHeaders = relationTableHeaders(relationTab, canViewCommercial);
  const filterOptions = relationFilterOptions(relationTab);
  const peerLabel = (record: { peerUserId?: number; peerNickname?: string; peerMask?: string }) => {
    const nickname = record.peerNickname?.trim();
    if (nickname && record.peerUserId) return `${nickname}（U${record.peerUserId}）`;
    if (nickname) return nickname;
    if (record.peerUserId) return `U${record.peerUserId}`;
    return record.peerMask || '-';
  };
  const sensitiveAction = (contentAvailable: boolean, onClick: () => void) => {
    const disabled = !canViewSensitiveMessages || !contentAvailable;
    const hint = !contentAvailable
      ? '正文不可用'
      : canViewSensitiveMessages ? '查看高敏正文' : '无查看权限';
    return (
      <span className="inline-flex" title={hint}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label={hint}
          disabled={disabled}
          onClick={onClick}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </span>
    );
  };
  const privateItems: MessagePanelItem[] = privateData.records.map((record) => ({
    key: record.messageNo,
    title: record.messageNo,
    subtitle: `${record.direction === 'sent' ? '当前用户发出' : '当前用户收到'} · ${peerLabel(record)} · ${record.messageType || 'text'}`,
    status: `${MESSAGE_SEND_LABELS[record.sendStatus] || record.sendStatus} · ${MESSAGE_READ_LABELS[record.receiverReadStatus] || record.receiverReadStatus}`,
    detail: record.failureReason || `${record.conversationNo || '-'} · ${record.businessTime || '-'}`,
    action: sensitiveAction(record.contentAvailable, () => openSensitiveContent({ type: 'private_message', no: record.messageNo })),
  }));
  const whisperItems: MessagePanelItem[] = whisperData.records.map((record) => ({
    key: record.whisperNo,
    title: record.whisperNo,
    subtitle: `${record.direction === 'sent' ? '我申请的' : '申请我的'} · ${peerLabel(record)} · ${DELIVERY_STATUS_LABELS[record.deliveryStatus] || record.deliveryStatus}`,
    status: WHISPER_STATUS_LABELS[record.status] || record.status,
    detail: record.failureReason || record.invalidReason || record.createTime || '-',
    action: sensitiveAction(record.contentAvailable, () => openSensitiveContent({ type: 'whisper', no: record.whisperNo })),
  }));
  const platformItems: MessagePanelItem[] = platformData.records.map((record) => ({
    key: record.recordNo,
    title: record.recordNo,
    subtitle: `${record.channel === 'assistant' ? '官方助手' : '系统消息'} · ${record.category || '-'}`,
    status: MESSAGE_READ_LABELS[record.readStatus] || record.readStatus,
    detail: `${record.bizType || '-'}${record.bizNo ? ` / ${record.bizNo}` : ''} · ${record.businessTime || '-'}`,
  }));
  const reportItems: MessagePanelItem[] = reportData.records.map((record) => ({
    key: record.reportNo,
    title: record.reportNo,
    subtitle: `${record.direction === 'submitted' ? '当前用户举报' : '当前用户被举报'} · ${record.targetType || '-'} · ${record.targetBizNo || '-'}`,
    status: REPORT_STATUS_LABELS[record.status] || record.status,
    detail: `${record.reasonCode || '-'} · ${record.createTime || '-'}`,
  }));

  return (
    <Dialog
      open={Boolean(user)}
      onClose={onClose}
      closeOnEscape={!childDialogOpen && !sensitiveTarget}
      className="max-h-[calc(100vh-32px)] max-w-[1080px] overflow-y-auto"
    >
      {user && (
        <div className="space-y-5" data-testid="module-supplement-dialog-content">
          <DialogHeader>
            <DialogTitle>{user.nickname} {user.id} · 心动 &amp; 消息</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 border-b border-[#E6EDF7]">
            {[
              ...(canViewRelations ? [['relation', '关系反馈'] as const] : []),
              ['message', '消息互动'] as const,
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`rounded-t-md px-4 py-2 text-sm font-semibold ${
                  activeTab === value ? 'bg-[#2876FF] text-white' : 'bg-[#F4F7FB] text-[#4D5A6D]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {activeTab === 'relation' && canViewRelations && (
            <div className="space-y-4">
              {summaryError ? (
                <div className="flex items-center justify-between rounded-md border border-[#F3C5C5] bg-[#FFF7F7] p-4 text-sm text-[#B42318]">
                  <span>{summaryError}</span>
                  <Button variant="outline" size="sm" onClick={() => loadSummary(user.id)}>重试</Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricTile label="关系反馈准入" value={summaryLoading ? '加载中...' : RELATION_ACCESS_LABELS[summary?.relationshipAccess || ''] || '-'} />
                  {canViewCommercial && summary?.vipVisible && <MetricTile label="VIP 状态" value={vipStatusText(summary.vipStatus)} />}
                  <MetricTile label="7天访客 UV/PV" value={summaryLoading ? '加载中...' : `${summary?.visitorUv7d ?? 0} / ${summary?.visitorPv7d ?? 0}`} />
                  <MetricTile label="当前被喜欢" value={summaryLoading ? '加载中...' : `${summary?.activeLikedCount ?? 0}`} />
                  <MetricTile label="当前相互喜欢" value={summaryLoading ? '加载中...' : `${summary?.activeMutualCount ?? 0}`} />
                  <MetricTile label="最近匹配成功时间" value={summaryLoading ? '加载中...' : summary?.lastMatchTime || '-'} wide />
                </div>
              )}
              <div className="rounded-md border border-[#E6EDF7] p-4">
                <div className="mb-4 flex flex-wrap gap-2">
                  {(Object.keys(RELATION_LABELS) as RelationTabKey[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => changeRelationTab(tab)}
                      className={`rounded-md px-3 py-1.5 text-sm ${relationTab === tab ? 'bg-[#EAF2FF] font-semibold text-[#2876FF]' : 'bg-[#F6F8FB] text-[#526173]'}`}
                    >
                      {RELATION_LABELS[tab]}
                    </button>
                  ))}
                </div>
                <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                  {relationTab !== 'matches' && (
                    <Select
                      options={[{ value: 'ALL', label: '全部方向' }, { value: 'OUTBOUND', label: '当前用户发起' }, { value: 'INBOUND', label: '当前用户接收' }]}
                      value={direction}
                      onChange={(value) => { setDirection(value as typeof direction); setRelationPage(1); }}
                    />
                  )}
                  <Select
                    options={filterOptions.statuses}
                    value={relationStatus}
                    onChange={(value) => { setRelationStatus(value); setRelationPage(1); }}
                  />
                  <Select
                    options={filterOptions.sources}
                    value={relationSource}
                    onChange={(value) => { setRelationSource(value); setRelationPage(1); }}
                  />
                  <Input type="datetime-local" value={startTime} onChange={(event) => { setStartTime(event.target.value); setRelationPage(1); }} />
                  <Input type="datetime-local" value={endTime} onChange={(event) => { setEndTime(event.target.value); setRelationPage(1); }} />
                </div>
                {relationError ? (
                  <div className="flex h-40 items-center justify-center gap-3 rounded-md border border-dashed border-[#F3C5C5] text-sm text-[#B42318]">
                    <span>{relationError}</span>
                    <Button variant="outline" size="sm" onClick={() => loadRelationPage(user.id, relationTab, queryParams, true)}>重试</Button>
                  </div>
                ) : relationLoading ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">加载中...</div>
                ) : pageRows.length > 0 ? (
                  <DemoTable headers={tableHeaders} rows={pageRows} />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-[#D8E2F0] text-sm text-muted-foreground">暂无关系记录</div>
                )}
                <div className="mt-4 flex justify-end border-t border-[#E6EDF7] pt-4">
                  <Pagination
                    current={relationPage}
                    total={relationData.total}
                    pageSize={RELATION_PAGE_SIZE}
                    onChange={setRelationPage}
                    showPageSizeSelector={false}
                  />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'message' && (
            <div className="space-y-4">
              {messageSummaryError ? (
                <div className="flex items-center justify-between rounded-md border border-[#F3C5C5] bg-[#FFF7F7] p-4 text-sm text-[#B42318]">
                  <span>{messageSummaryError}</span>
                  {canViewMessageSummary && <Button variant="outline" size="sm" onClick={() => loadMessageSummary(user.id)}>重试</Button>}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-4">
                  <MetricTile label="消息未读数" value={messageSummaryLoading ? '加载中...' : `${messageSummary?.messageUnreadCount ?? 0}`} />
                  <MetricTile label="待回复悄悄话" value={messageSummaryLoading ? '加载中...' : `${messageSummary?.pendingWhisperCount ?? 0}`} />
                  <MetricTile label="系统/助手未读" value={messageSummaryLoading ? '加载中...' : `${(messageSummary?.unreadSystemMessageCount ?? 0) + (messageSummary?.assistantUnreadCount ?? 0)}`} />
                  <MetricTile label="聊天举报数" value={messageSummaryLoading ? '加载中...' : `${messageSummary?.reportCount ?? 0}`} />
                  <MetricTile label="普通私信状态" value={(messageSummary?.activeConversationCount ?? 0) > 0 ? '普通私信已开启' : '暂无有效私信会话'} wide />
                </div>
              )}
              <div className="grid items-start gap-4 xl:grid-cols-2">
                <MessageListPanel
                  title="私信消息"
                  total={privateData.total}
                  page={privatePage}
                  items={privateItems}
                  loading={messageLoading.private}
                  error={canViewPrivateMessages ? messageErrors.private : '无权限查看'}
                  onPageChange={setPrivatePage}
                  onRetry={() => loadMessageList(user.id, 'private', privatePage)}
                />
                <MessageListPanel
                  title="悄悄话"
                  total={whisperData.total}
                  page={whisperPage}
                  items={whisperItems}
                  loading={messageLoading.whisper}
                  error={canViewWhispers ? messageErrors.whisper : '无权限查看'}
                  onPageChange={setWhisperPage}
                  onRetry={() => loadMessageList(user.id, 'whisper', whisperPage)}
                />
                <MessageListPanel
                  title="系统/助手消息"
                  total={platformData.total}
                  page={platformPage}
                  items={platformItems}
                  loading={messageLoading.platform}
                  error={canViewPlatformMessages ? messageErrors.platform : '无权限查看'}
                  onPageChange={setPlatformPage}
                  onRetry={() => loadMessageList(user.id, 'platform', platformPage)}
                />
                <MessageListPanel
                  title="举报"
                  total={reportData.total}
                  page={reportPage}
                  items={reportItems}
                  loading={messageLoading.report}
                  error={canViewMessageReports ? messageErrors.report : '无权限查看'}
                  onPageChange={setReportPage}
                  onRetry={() => loadMessageList(user.id, 'report', reportPage)}
                />
              </div>
            </div>
          )}
          <Dialog
            open={Boolean(sensitiveTarget)}
            onClose={() => { setSensitiveTarget(null); setSensitiveContent(null); }}
            closeOnEscape={!sensitiveLoading}
            layer="nested"
            lockBodyScroll={false}
            ariaLabel="查看高敏消息正文"
            className="max-w-[620px]"
          >
            <DialogHeader>
              <DialogTitle>查看高敏消息正文</DialogTitle>
            </DialogHeader>
            {!sensitiveContent ? (
              <div className="space-y-4">
                <div className="rounded-md border border-[#F3D39A] bg-[#FFF9ED] p-3 text-sm text-[#8A5B00]">
                  查看对象：{sensitiveTarget?.no || '-'}。本次操作将记录管理员、原因、时间和访问结果。
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#1F2433]">查看原因</label>
                  <Input
                    value={sensitiveReason}
                    onChange={(event) => setSensitiveReason(event.target.value)}
                    placeholder="请填写客诉核查、风控复核等具体原因"
                    maxLength={100}
                  />
                </div>
                {sensitiveError && <div className="text-sm text-[#B42318]">{sensitiveError}</div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSensitiveTarget(null)} disabled={sensitiveLoading}>取消</Button>
                  <Button onClick={confirmSensitiveContent} disabled={sensitiveLoading}>
                    {sensitiveLoading ? '查询中...' : '确认并查看'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">审计编号：{sensitiveContent.accessNo}</div>
                {sensitiveContent.items.map((item) => (
                  <div key={`${item.role}-${item.messageNo}`} className="rounded-md border border-[#E6EDF7] p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{item.role === 'request' ? '原悄悄话' : item.role === 'reply' ? '回复内容' : '私信正文'} · {item.messageNo}</span>
                      <span>{item.eventTime || '-'}</span>
                    </div>
                    <div className="whitespace-pre-wrap break-words text-sm text-[#1F2433]">{item.content}</div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => { setSensitiveTarget(null); setSensitiveContent(null); }}>关闭</Button>
                </div>
              </div>
            )}
          </Dialog>
        </div>
      )}
    </Dialog>
  );
}

function toBackendDateTime(value: string) {
  if (!value) return undefined;
  return `${value.replace('T', ' ')}${value.length === 16 ? ':00' : ''}`;
}

function counterpartyText(record: RelationRecord) {
  const counterparty = record.counterparty;
  if (counterparty.anonymous) return counterparty.userNo || '匿名用户';
  return `${counterparty.nickname || '-'} ${counterparty.userNo ? `U${counterparty.userNo}` : ''}`.trim();
}

function relationStateText(status: string) {
  return RELATION_STATUS_LABELS[status] || status || '-';
}

function relationReasonText(reason?: string) {
  return reason ? RELATION_REASON_LABELS[reason] || reason : '-';
}

function relationTableHeaders(tab: RelationTabKey, canViewCommercial: boolean) {
  if (tab === 'likes') return ['记录编号', '方向', '对方用户', '来源', '状态', '失效原因', '失效时间', '喜欢时间', '解锁编号', '操作'];
  if (tab === 'visitors') return ['记录编号', '方向', '对方用户', '来源', '状态', '失效原因', '失效时间', '最近访问', 'PV', '解锁编号', '操作'];
  if (tab === 'matches') return ['记录编号', '对方用户', '首次来源', '有效来源', '状态', '失效原因', '失效时间', '匹配时间', '操作'];
  return ['解锁编号', '目标记录', '对方用户', '场景/方式', ...(canViewCommercial ? ['消耗币'] : []), '状态', '对象失效原因', '对象失效时间', '生效时间', '到期时间', '操作'];
}

function relationActions(
  record: RelationRecord,
  unlockNo: string | undefined,
  canViewCommercial: boolean,
  onViewUser: (counterparty: RelationCounterpartyVO) => void,
  onViewUnlock: (unlockNo: string) => void,
) {
  const canViewUser = Boolean(record.counterparty.userId);
  if (!canViewUser && (!unlockNo || !canViewCommercial)) return '-';
  return (
    <div className="flex min-w-[76px] flex-col items-start gap-1.5">
      {canViewUser && (
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onViewUser(record.counterparty)}>
          查看用户
        </Button>
      )}
      {unlockNo && canViewCommercial && (
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onViewUnlock(unlockNo)}>
          查看解锁
        </Button>
      )}
    </div>
  );
}

function relationTableRow(
  tab: RelationTabKey,
  record: RelationRecord,
  canViewCommercial: boolean,
  onViewUser: (counterparty: RelationCounterpartyVO) => void,
  onViewUnlock: (unlockNo: string) => void,
): DemoTableRow {
  if (tab === 'likes') {
    const row = record as AppUserRelationLikeVO;
    return { key: row.recordNo, cells: [row.recordNo, row.direction === 'OUTBOUND' ? '当前用户发起' : '当前用户接收', counterpartyText(row),
      RELATION_SOURCE_LABELS[row.sourceScene] || row.sourceScene, relationStateText(row.status), relationReasonText(row.invalidReason),
      row.invalidTime || '-', row.likedTime || '-', row.unlockNo || '-',
      relationActions(row, row.unlockNo, canViewCommercial, onViewUser, onViewUnlock)] };
  }
  if (tab === 'visitors') {
    const row = record as AppUserRelationVisitVO;
    return { key: row.recordNo, cells: [row.recordNo, row.direction === 'OUTBOUND' ? '当前用户访问' : '当前用户被访问', counterpartyText(row),
      RELATION_SOURCE_LABELS[row.sourceScene] || row.sourceScene, relationStateText(row.status), relationReasonText(row.invalidReason),
      row.invalidTime || '-', row.lastVisitTime || '-', String(row.visitCount ?? 0), row.unlockNo || '-',
      relationActions(row, row.unlockNo, canViewCommercial, onViewUser, onViewUnlock)] };
  }
  if (tab === 'matches') {
    const row = record as AppUserRelationMatchVO;
    return { key: row.recordNo, cells: [row.recordNo, counterpartyText(row), RELATION_SOURCE_LABELS[row.primarySource] || row.primarySource,
      (row.activeSources || []).map((item) => RELATION_SOURCE_LABELS[item] || item).join('、') || '-',
      relationStateText(row.status), relationReasonText(row.invalidReason), row.invalidTime || '-', row.matchedTime || '-',
      relationActions(row, undefined, canViewCommercial, onViewUser, onViewUnlock)] };
  }
  const row = record as AppUserRelationUnlockVO;
  return { key: row.unlockNo, cells: [row.unlockNo, [row.targetBizType, row.targetBizNo].filter(Boolean).join(' / ') || '-', counterpartyText(row),
    `${RELATION_SOURCE_LABELS[row.unlockScene] || row.unlockScene} / ${row.unlockMethod || '-'}`,
    ...(canViewCommercial && row.assetVisible ? [String(row.coinCost ?? 0)] : canViewCommercial ? ['-'] : []),
    relationStateText(row.status), relationReasonText(row.targetInvalidReason), row.targetInvalidTime || '-', row.effectiveTime || '-',
    row.expireTime || '-', relationActions(row, undefined, canViewCommercial, onViewUser, onViewUnlock)] };
}

function relationFilterOptions(tab: RelationTabKey) {
  const statusCodes = tab === 'likes' ? ['active', 'cancelled', 'invalid']
    : tab === 'visitors' ? ['visible', 'expired_window', 'invalid']
      : tab === 'matches' ? ['matched', 'invalid'] : ['active', 'expired', 'refunded'];
  const sourceCodes = tab === 'matches' ? ['double_like', 'featured_heart_return_like', 'whisper_reply']
    : tab === 'unlocks' ? ['likes_unlock_one', 'viewers_unlock_one']
      : ['fate', 'featured', 'ideal', 'profile', 'likes_me', 'recent_viewers'];
  return {
    statuses: [{ value: '', label: '全部状态' }, ...statusCodes.map((value) => ({ value, label: RELATION_STATUS_LABELS[value] || value }))],
    sources: [{ value: '', label: '全部来源' }, ...sourceCodes.map((value) => ({ value, label: RELATION_SOURCE_LABELS[value] || value }))],
  };
}

function vipStatusText(status?: string) {
  if (status === 'active') return 'VIP会员';
  if (status === 'expired') return '会员已过期';
  return '未开通';
}

function ProfileDrawer({
  user,
  canViewCommercial,
  canDeleteUser,
  elevated = false,
  onClose,
  onStatusChanged,
  onDeleted,
}: {
  user: AdminUserCardItem | null;
  canViewCommercial: boolean;
  canDeleteUser: boolean;
  elevated?: boolean;
  onClose: () => void;
  onStatusChanged?: (userId: number, status: string) => void;
  onDeleted?: (userId: number) => void;
}) {
  const [freezeConfirmOpen, setFreezeConfirmOpen] = useState(false);
  const [freezeProcessing, setFreezeProcessing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [commercial, setCommercial] = useState<UserCommercialAssetDetail | null>(null);
  const [commercialLoading, setCommercialLoading] = useState(false);
  const genderLabel = user?.genderLabel || '-';
  const score = Math.max(0, Math.min(user?.profileScore ?? 0, 100));
  const educationLevel = user?.educationLevelLabel || user?.educationText?.split('|')[0]?.trim() || '-';
  const heightWeight = [
    user?.height ? `${user.height}cm` : '',
    user?.weight ? `${user.weight}kg` : '',
  ].filter(Boolean).join(' / ') || '-';
  const industry = user?.industryLabel || '-';
  const annualIncome = user?.annualIncomeLabel || user?.annualIncome || '-';
  const maritalStatus = user?.maritalStatusLabel || user?.maritalStatus || '-';
  const emotionalStatus = user?.emotionalStatusLabel || '-';
  const datingGoal = user?.datingGoalLabel || user?.mateRequirement || '-';
  const photos = parseStringArray(user?.photos).slice(0, 6);
  const aboutMe = user?.aboutMe || '-';
  const voiceIntroText = user?.voiceIntroDuration ? `语音介绍 ${user.voiceIntroDuration}s` : '暂无语音介绍';
  const isFrozen = user?.accountStatus === 'FROZEN';
  const nextAccountStatus = isFrozen ? 'NORMAL' : 'FROZEN';
  const accountActionText = isFrozen ? '解冻账号' : '冻结账号';
  const accountConfirmTitle = isFrozen ? '解冻账号确认' : '冻结账号确认';
  const accountConfirmTip = isFrozen
    ? '解冻后用户将恢复正常账号状态，可继续按准入规则使用功能，操作人和时间会进入审计日志。'
    : '冻结后用户将无法继续使用核心准入能力，操作人、原因和时间会进入审计日志。';
  const accountConfirmButtonText = isFrozen ? '确认解冻' : '确认冻结';
  const deleteReady = deleteReason.trim().length >= 2;
  const locationStatus = user?.city && user.city !== '-' ? '已记录现居地' : '-';
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
    ['定位状态', locationStatus],
  ];
  const basicFields = [
    ['昵称', user?.nickname || '-'],
    ['身高/体重', heightWeight],
    ['家乡/户口', user?.city || '-'],
    ['行业/职业', `${industry} / ${user?.jobTitle || '-'}`],
    ['公司/年收入', `${user?.company || '-'} / ${annualIncome}`],
    ['婚姻状况', maritalStatus],
  ];

  useEffect(() => {
    setFreezeConfirmOpen(false);
    setDeleteConfirmOpen(false);
    setDeleteReason('');
  }, [user?.id]);

  useEffect(() => {
    let disposed = false;
    if (!user || !canViewCommercial) {
      setCommercial(null);
      setCommercialLoading(false);
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
  }, [canViewCommercial, user]);

  const confirmAccountStatusChange = async () => {
    if (!user) return;
    setFreezeProcessing(true);
    try {
      await updateAppUserStatus(user.id, nextAccountStatus);
      setFreezeConfirmOpen(false);
      onStatusChanged?.(user.id, nextAccountStatus);
      showToast(`${accountActionText}已提交，操作已写入审计日志。`, 'success');
    } finally {
      setFreezeProcessing(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (deleteProcessing) return;
    setDeleteConfirmOpen(false);
    setDeleteReason('');
  };

  const confirmHardDelete = async () => {
    if (!user || !deleteReady) return;
    setDeleteProcessing(true);
    try {
      await deleteAppUser(user.id, {
        reason: deleteReason.trim(),
      });
      showToast('用户已彻底删除，可使用原手机号重新注册', 'success');
      setDeleteConfirmOpen(false);
      onDeleted?.(user.id);
    } finally {
      setDeleteProcessing(false);
    }
  };

  return (
    <>
      <Dialog
        open={Boolean(user)}
        onClose={onClose}
        layer={elevated ? 'nested' : 'default'}
        closeOnEscape={!freezeConfirmOpen && !deleteConfirmOpen}
        lockBodyScroll={!elevated}
        className={elevated
          ? 'w-[calc(100vw-32px)] max-w-[960px] p-0'
          : 'w-[calc(100vw-64px)] max-w-[1080px] p-0'}
      >
        {user && (
          <div
            data-testid="profile-dialog-content"
            className={`flex flex-col bg-white ${elevated ? 'max-h-[82vh]' : 'max-h-[88vh]'}`}
          >
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
                {canViewCommercial && (
                  <div className="flex h-[68px] w-[188px] shrink-0 flex-col justify-center rounded-lg bg-[#343431] px-6 text-[#F7DFA6]">
                    <span className="text-sm font-semibold">{commercial?.vipStatus === 'active' ? 'VIP会员' : commercial?.vipStatus === 'expired' ? '会员已过期' : '非会员'}</span>
                    <span className="mt-1 text-xs">{commercial?.vipExpireTime || '-'}</span>
                  </div>
                )}
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
                    {user.mbtiType && (
                      <span className="rounded-full bg-[#E9F8EF] px-3 py-1 text-xs font-medium text-[#27A45D]">MBTI: {user.mbtiType}</span>
                    )}
                  </div>
                  <p><span className="font-medium text-[#1F2433]">关于我：</span>{aboutMe}</p>
                  <p><span className="font-medium text-[#1F2433]">脱单目标：</span>{datingGoal}；<span className="font-medium text-[#1F2433]">感情状态：</span>{emotionalStatus}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {photos.length > 0 ? photos.map((photo, index) => (
                      <img key={`${photo}-${index}`} src={photo} alt={`相册${index + 1}`} className="h-14 w-14 rounded-md object-cover" />
                    )) : (
                      <span className="text-sm text-[#7D8597]">暂无相册图片</span>
                    )}
                    <em className="text-[#4D5A6D] not-italic">
                      相册 {photos.length} 张 · {user.profileBgImage ? '背景图已上传' : '暂无背景图'} · {voiceIntroText}
                    </em>
                  </div>
                  {user.favoriteSongName && (
                    <p><span className="font-medium text-[#1F2433]">爱听的歌曲：</span>{user.favoriteSongName} {user.favoriteSongArtist ? ` / ${user.favoriteSongArtist}` : ''}</p>
                  )}
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

              {canViewCommercial && <ProfileConfirmSection title="千寻币/VIP">
                {commercialLoading ? <p className="p-5 text-sm text-[#667085]">商业化资产加载中...</p> : commercial ? (
                  <ProfileLogList rows={[
                    [`当前余额`, String(commercial.coinBalance ?? 0), `累计充值 ¥${Number(commercial.totalRecharge ?? 0).toFixed(2)}`, '千寻币'],
                    ...(commercial.recentFlows || []).map((item) => [item.createTime || '-', `${item.flowType} ${item.changeAmount}`, `余额${item.balanceAfter}`, item.bizDesc || item.bizScene || '-']),
                    ...(commercial.recentOrders || []).map((item) => [item.createTime || '-', item.orderType === 'coin' ? '千寻币订单' : '会员订单', item.orderStatus, item.packageName || '-']),
                  ]} />
                ) : <p className="p-5 text-sm text-[#667085]">暂无商业化资产记录</p>}
              </ProfileConfirmSection>}

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

          <div className="flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-t border-[#E6EDF7] bg-white px-6 py-3">
            {canDeleteUser ? (
              <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                彻底删除用户
              </Button>
            ) : <span />}
            <Button variant="primary" onClick={() => setFreezeConfirmOpen(true)}>{accountActionText}</Button>
          </div>
        </div>
      )}
      </Dialog>
      <Dialog
        open={Boolean(user) && deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        layer="confirmation"
        closeOnEscape={!deleteProcessing}
        lockBodyScroll={false}
        ariaLabel="彻底删除 App 用户"
        className="max-w-[520px]"
      >
        {user && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#B42318]">彻底删除 App 用户</DialogTitle>
            </DialogHeader>
            <div className="mt-5 space-y-5 text-sm text-[#4D5A6D]">
              <div className="rounded-lg border border-[#F3C5C5] bg-[#FFF3F1] p-4 text-[#912018]" role="alert">
                <strong className="block text-base">此操作不可恢复</strong>
                <p className="mt-1 leading-6">删除后，原手机号可重新注册并从登录页完整走一遍准入流程。</p>
              </div>

              <div className="rounded-lg border border-[#E6EDF7] p-4">
                <strong className="text-[#1F2433]">将永久删除以下数据</strong>
                <ul className="mt-3 grid list-disc gap-x-6 gap-y-2 pl-5 sm:grid-cols-2">
                  <li>账号和登录身份</li>
                  <li>认证信息</li>
                  <li>个人资料与媒体引用</li>
                  <li>关系、互动与社区内容</li>
                  <li>订单、资产与解锁记录</li>
                  <li>推荐、浏览与推广记录</li>
                  <li>登录会话</li>
                </ul>
              </div>

              <div className="rounded-lg bg-[#F7FAFE] p-4">
                <strong className="block text-[#1F2433]">{user.nickname} U{user.id}</strong>
                <span className="mt-1 block">手机号：{user.phone || '-'}</span>
              </div>

              <div>
                <label htmlFor="hard-delete-reason" className="mb-2 block font-medium text-[#1F2433]">
                  变更原因 <span className="text-[#D92D20]">*</span>
                </label>
                <textarea
                  id="hard-delete-reason"
                  rows={3}
                  maxLength={200}
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  disabled={deleteProcessing}
                  placeholder="请填写删除原因，例如：重复测试完整准入流程"
                  className="w-full resize-none rounded-md border border-input bg-white px-3 py-2 text-sm text-[#1F2433] outline-none transition focus:border-[#2876FF] focus:ring-2 focus:ring-[#2876FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-[#7D8597]">原因将进入后台审计日志，2–200 个字符。</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E6EDF7] pt-4">
                <Button variant="outline" onClick={closeDeleteConfirm} disabled={deleteProcessing}>取消</Button>
                <Button
                  variant="destructive"
                  onClick={confirmHardDelete}
                  disabled={!deleteReady || deleteProcessing}
                >
                  {deleteProcessing ? '删除中…' : '彻底删除'}
                </Button>
              </div>
            </div>
          </>
        )}
      </Dialog>
      <Dialog
        open={Boolean(user) && freezeConfirmOpen}
        onClose={() => setFreezeConfirmOpen(false)}
        layer="confirmation"
        lockBodyScroll={false}
        className="max-w-[440px]"
      >
        {user && (
          <>
            <DialogHeader>
              <DialogTitle>{accountConfirmTitle}</DialogTitle>
            </DialogHeader>
            <div className="mt-5 space-y-4 text-sm text-[#4D5A6D]">
              <div className="rounded-md bg-[#FFF7E8] p-4 text-[#8A5A00]">
                {accountConfirmTip}
              </div>
              <div className="rounded-md border border-[#E6EDF7] p-4">
                <strong className="block text-[#1F2433]">{user.nickname} U{user.id}</strong>
                <span className="mt-2 block">当前状态：{ACCOUNT_STATUS_MAP[user.accountStatus]?.label ?? user.accountStatus}</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFreezeConfirmOpen(false)} disabled={freezeProcessing}>取消</Button>
                <Button variant="primary" onClick={confirmAccountStatusChange} disabled={freezeProcessing}>
                  {freezeProcessing ? '处理中…' : accountConfirmButtonText}
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

function MessageListPanel({
  title,
  total,
  page,
  items,
  loading,
  error,
  onPageChange,
  onRetry,
}: {
  title: string;
  total: number;
  page: number;
  items: MessagePanelItem[];
  loading: boolean;
  error: string;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-[#DCE6F3] bg-white" data-testid={`message-panel-${title}`}>
      <div className="flex items-center justify-between border-b border-[#E6EDF7] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1F2433]">{title}</h3>
        <span className="text-xs text-muted-foreground">共 {total} 条</span>
      </div>
      <div className="min-h-[330px] divide-y divide-[#EEF2F7] px-4">
        {loading ? (
          <div className="flex h-[330px] items-center justify-center text-sm text-muted-foreground">加载中...</div>
        ) : error ? (
          <div className="flex h-[330px] items-center justify-center gap-3 text-sm text-[#B42318]">
            <span>{error}</span>
            {error !== '无权限查看' && <Button variant="outline" size="sm" onClick={onRetry}>重试</Button>}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-[330px] items-center justify-center text-sm text-muted-foreground">暂无数据</div>
        ) : items.map((item) => (
          <div key={item.key} className="grid min-h-[66px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
            <div className="min-w-0 text-xs">
              <div className="truncate font-medium text-[#0C3A78]" title={item.title}>{item.title}</div>
              <div className="mt-1 truncate text-[#526173]" title={item.subtitle}>{item.subtitle}</div>
              <div className="mt-1 flex min-w-0 gap-2 text-muted-foreground">
                <span className="shrink-0 text-[#2876FF]">{item.status}</span>
                <span className="truncate" title={item.detail}>{item.detail}</span>
              </div>
            </div>
            {item.action && <div className="shrink-0">{item.action}</div>}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-[#E6EDF7] px-4 py-3">
        <span className="text-xs text-muted-foreground">{MESSAGE_PAGE_SIZE}条/页</span>
        <Pagination
          current={page}
          total={total}
          pageSize={MESSAGE_PAGE_SIZE}
          onChange={onPageChange}
          showPageSizeSelector={false}
        />
      </div>
    </section>
  );
}

function AvatarAuditDialog({
  user,
  onClose,
  onGoAudit,
  onChanged,
}: {
  user: AdminUserCardItem | null;
  onClose: () => void;
  onGoAudit: () => void;
  onChanged?: () => void;
}) {
  const [detail, setDetail] = useState<VerificationAuditDetailVO | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | 'EXPIRE' | null>(null);
  const [confirmReason, setConfirmReason] = useState('');

  useEffect(() => {
    let disposed = false;
    setDetail(null);
    if (!user) return undefined;
    if (!user.avatarAuditRecordId) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    getAvatarDetail(user.avatarAuditRecordId, { historyPage: 1, historySize: 5 })
      .then((res) => {
        if (!disposed) setDetail(responseData<VerificationAuditDetailVO>(res, null as any));
      })
      .catch(() => {
        if (!disposed) setDetail(null);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => { disposed = true; };
  }, [user?.avatarAuditRecordId]);

  function requestAudit(action: 'APPROVE' | 'REJECT' | 'EXPIRE') {
    if (!detail) return;
    setConfirmAction(action);
    setConfirmReason('');
  }

  async function confirmAudit() {
    if (!detail) return;
    if (confirmAction !== 'APPROVE' && !confirmReason.trim()) {
      showToast(confirmAction === 'REJECT' ? '请输入驳回原因' : '请输入失效原因', 'error');
      return;
    }
    setProcessing(true);
    try {
      await auditAvatar(detail.id, {
        action: confirmAction!,
        rejectReason: confirmAction === 'APPROVE' ? undefined : confirmReason.trim(),
      });
      showToast(confirmAction === 'APPROVE' ? '头像审核已通过' : confirmAction === 'REJECT' ? '头像审核已驳回' : '头像审核已标记失效', 'success');
      const res = await getAvatarDetail(detail.id, { historyPage: 1, historySize: 5 });
      setDetail(responseData<VerificationAuditDetailVO>(res, null as any));
      setConfirmAction(null);
      setConfirmReason('');
      onChanged?.();
    } finally {
      setProcessing(false);
    }
  }

  const imageUrl = detail?.mediaUrl || detail?.thumbUrl || user?.avatar || '';
  const histories = detail?.historyPage?.records || [];

  const confirmTitle = confirmAction === 'REJECT' ? '驳回确认' : confirmAction === 'EXPIRE' ? '失效确认' : '通过确认';
  const confirmTip = confirmAction === 'REJECT'
    ? '驳回原因必填，确认后会写入审核历史。'
    : confirmAction === 'EXPIRE'
      ? '失效原因必填，确认后会把该审核记录标记为已失效。'
      : '确认后该头像审核记录会变为已通过。';

  return (
    <>
      <Dialog open={Boolean(user)} onClose={onClose} className="w-[calc(100vw-64px)] max-w-[1260px] p-0">
        {user && (
          <div className="flex max-h-[90vh] flex-col bg-white">
            <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#E6EDF7] px-6">
              <DialogHeader>
                <DialogTitle className="text-lg text-[#0C285A]">头像认证审核详情</DialogTitle>
              </DialogHeader>
              <button className="mr-8 text-sm text-[#2876FF]" onClick={onGoAudit}>进入审核列表</button>
            </div>

            {loading ? (
              <div className="flex h-[560px] items-center justify-center text-sm text-muted-foreground">审核详情加载中...</div>
            ) : !detail ? (
              <div className="flex h-[560px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <div className="rounded-md border border-dashed border-[#D8E2F0] px-8 py-6">暂无头像审核数据</div>
                <span>{user.nickname} · {user.avatarReviewStatus || '未认证'}</span>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto bg-white p-6">
                <div className="mb-4 flex items-center gap-4 rounded-lg bg-[#F8FAFC] p-4">
                  <Avatar className="h-14 w-14" src={detail.avatar || user.avatar} fallback={detail.nickname?.slice(0, 1) || user.nickname.slice(0, 1)} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#0C285A]">{detail.nickname || user.nickname}</div>
                    <div className="mt-1 text-sm text-[#667085]">用户ID: {detail.userId} · 认证等级: Lv.{detail.verifyLevel ?? 0}</div>
                  </div>
                  <Badge variant={STATUS_MAP[detail.status]?.variant ?? 'secondary'}>{STATUS_MAP[detail.status]?.label || detail.status}</Badge>
                </div>

                <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
                  <section className="rounded-md border border-[#D8E6F5] bg-white p-4">
                    <h3 className="mb-3 font-semibold text-[#0C285A]">头像预览</h3>
                    <div className="flex h-[260px] items-center justify-center overflow-hidden rounded-md bg-[#F4F7FB]">
                      {imageUrl ? <img src={imageUrl} alt="头像预览" className="h-full w-full object-contain" /> : <span className="text-sm text-muted-foreground">暂无图片</span>}
                    </div>
                  </section>

                  <section className="rounded-md border border-[#D8E6F5] bg-white p-4">
                    <h3 className="mb-3 font-semibold text-[#0C285A]">审核信息</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <AuditInfo label="提交时间" value={detail.submitTime || user.avatarAuditSubmitTime || '-'} />
                      <AuditInfo label="审核时间" value={detail.resultTime || '-'} />
                      <AuditInfo label="审核来源" value={auditSourceText(detail.auditSource)} />
                      <AuditInfo label="当前状态" value={STATUS_MAP[detail.status]?.label || detail.status || '-'} />
                    </div>
                    {(detail.rejectReason || user.avatarAuditRejectReason) && (
                      <div className="mt-3 rounded-md bg-[#FFF1F0] px-4 py-3 text-sm text-[#C0362C]">
                        驳回/失效原因：{detail.rejectReason || user.avatarAuditRejectReason}
                      </div>
                    )}
                  </section>
                </div>

                <section className="mt-5 rounded-md border border-[#D8E6F5] bg-white p-4">
                  <h3 className="mb-3 font-semibold text-[#0C285A]">审核历史记录</h3>
                  <div className="overflow-hidden rounded-md border border-[#E6EDF7]">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#F7FAFE] text-[#667085]">
                        <tr>
                          <th className="px-4 py-3">时间</th>
                          <th className="px-4 py-3">动作</th>
                          <th className="px-4 py-3">状态变化</th>
                          <th className="px-4 py-3">来源</th>
                          <th className="px-4 py-3">操作人</th>
                          <th className="px-4 py-3">原因</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6EDF7] bg-white">
                        {histories.length === 0 ? (
                          <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={6}>暂无历史记录</td></tr>
                        ) : histories.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-3">{row.createTime || '-'}</td>
                            <td className="px-4 py-3">{auditActionText(row.action)}</td>
                            <td className="px-4 py-3">{auditStatusText(row.fromStatus)} -&gt; {auditStatusText(row.toStatus)}</td>
                            <td className="px-4 py-3">{auditSourceText(row.auditSource)}</td>
                            <td className="px-4 py-3">{row.operatorName || '-'}</td>
                            <td className="px-4 py-3">{row.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">共{histories.length}条记录 第 1 / 1 页 · 固定每页 5 条</div>
                </section>
              </div>
            )}

            <div className="flex h-[72px] shrink-0 items-center justify-end gap-3 border-t border-[#E6EDF7] bg-white px-6">
              <Button variant="primary" disabled={!detail || processing} onClick={() => requestAudit('APPROVE')}>通过</Button>
              <Button variant="destructive" disabled={!detail || processing} onClick={() => requestAudit('REJECT')}>驳回</Button>
              <Button variant="outline" disabled={!detail || processing} onClick={() => requestAudit('EXPIRE')}>失效</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={Boolean(confirmAction)} onClose={() => setConfirmAction(null)} className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{confirmTitle}</DialogTitle>
        </DialogHeader>
        <div className="mt-5 space-y-4 text-sm text-[#4D5A6D]">
          <div className="rounded-md bg-[#FFF7E8] p-4 text-[#8A5A00]">{confirmTip}</div>
          {confirmAction !== 'APPROVE' && (
            <label className="block space-y-2">
              <span>{confirmAction === 'REJECT' ? '驳回原因' : '失效原因'}</span>
              <Input
                value={confirmReason}
                onChange={(event) => setConfirmReason(event.target.value)}
                placeholder={confirmAction === 'REJECT' ? '请输入驳回原因' : '请输入失效原因'}
              />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={processing}>取消</Button>
            <Button variant="primary" onClick={confirmAudit} disabled={processing}>{processing ? '处理中...' : '确认'}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function AuditInfo({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md bg-[#F7FAFE] px-4 py-3 text-sm">
      <span className="text-[#667085]">{label}：</span>
      <strong className="font-semibold text-[#1F2433]">{value || '-'}</strong>
    </div>
  );
}

function auditActionText(action?: string) {
  const map: Record<string, string> = {
    SUBMIT: '提交审核',
    MACHINE_PASS: '机审通过',
    MACHINE_REJECT: '机审驳回',
    MANUAL_PASS: '人工通过',
    MANUAL_REJECT: '人工驳回',
    MANUAL_EXPIRE: '人工失效',
  };
  return action ? map[action] || action : '-';
}

function auditStatusText(status?: string) {
  return status ? STATUS_MAP[status]?.label || status : '-';
}

function auditSourceText(source?: string) {
  const map: Record<string, string> = { MACHINE: '机审', MANUAL: '人工审核', MOCK: 'Mock' };
  return source ? map[source] || source : '-';
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

function WorkflowImportResponse({ result }: { result: ImportBatchVO | null }) {
  const errors = parseImportErrors(result?.errorSummaryJson);
  return (
    <div className="grid gap-2 rounded-md border border-[#E6EDF7] p-4">
      <strong className="text-[#1F2433]">导入接口响应结果</strong>
      {result ? (
        <>
          <span>批次号：{result.batchNo} / 状态：{result.status}</span>
          <span>原文件：{result.fileName || '-'}</span>
          <span>
            总行数 {result.totalCount ?? 0} / 可导入 {result.successCount ?? 0} / 失败 {result.failCount ?? 0} / 重复 {result.duplicateCount ?? 0}
          </span>
          <span>已真实入库：{result.importedCount ?? 0} 个用户</span>
          <span>{result.message || '导入预校验完成，结果来自后端接口。'}</span>
          {errors.length > 0 && (
            <div className="max-h-24 overflow-auto rounded bg-[#FFF7E8] p-2 text-[#8A5A00]">
              {errors.map((error, index) => (
                <div key={`${error}-${index}`}>{error}</div>
              ))}
            </div>
          )}
        </>
      ) : (
        <span>选择文件后点击确认导入，这里会展示后端返回的批次号、行数统计和错误摘要。</span>
      )}
    </div>
  );
}

function WorkflowExportResponse({ result }: { result: ExportTaskVO }) {
  return (
    <div className="grid gap-2 rounded-md border border-[#E6EDF7] bg-[#F7FAFE] p-4">
      <strong className="text-[#1F2433]">导出接口响应结果</strong>
      <span>任务号：{result.taskNo}</span>
      <span>类型：{result.exportType} / 状态：{result.status}</span>
      <span>文件名：{result.fileName || '-'}</span>
      <span>导出行数：{result.rowCount ?? 0}</span>
      <span>筛选条件：{result.filterSummary || '全部用户'}</span>
      <span>创建时间：{result.createTime || '-'}</span>
      <span>{result.message || '导出任务已由后端创建。'}</span>
      {result.downloadContent && (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTextFile(result.fileName || 'app-users-export.csv', result.downloadContent || '')}
          >
            下载导出文件
          </Button>
        </div>
      )}
    </div>
  );
}

function WorkflowHistoryDialog({
  open,
  historyPage,
  loading,
  onPageChange,
  onClose,
}: {
  open: boolean;
  historyPage: PageResult<AppUserWorkflowHistoryVO>;
  loading: boolean;
  onPageChange: (page: number) => void;
  onClose: () => void;
}) {
  const records = historyPage.records || [];
  return (
    <Dialog open={open} onClose={onClose} className="max-w-[760px]">
      <DialogHeader>
        <DialogTitle>导入导出结果</DialogTitle>
      </DialogHeader>
      <div className="mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1 text-sm text-[#5F6675]">
        {loading && (
          <div className="rounded-md border border-dashed border-[#D8E2F0] p-6 text-center">
            加载导入导出结果中...
          </div>
        )}
        {!loading && records.length === 0 && (
          <div className="rounded-md border border-dashed border-[#D8E2F0] p-6 text-center">
            暂无导入导出结果
          </div>
        )}
        {!loading && records.map((item) => {
          const isImport = item.type === 'import';
          const importResult = isImport ? item.importResult || null : null;
          const exportResult = !isImport ? item.exportResult || null : null;
          return (
            <div
              key={item.id}
              data-testid={`workflow-history-${item.type}-${item.id}`}
              className="rounded-lg border border-[#E6EDF7] bg-white p-4 shadow-sm"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_112px] items-start gap-3">
                <div className="min-w-0 space-y-1 break-words">
                  <strong className="text-[#1F2433]">{isImport ? '批量导入' : '字段导出'}</strong>
                  <div>{item.createTime || '-'}</div>
                  {isImport && importResult && (
                    <>
                      <div>批次号：{importResult.batchNo || '-'}</div>
                      <div>状态：{importResult.status || '-'}；真实入库：{importResult.importedCount ?? 0} 个；失败：{importResult.failCount ?? 0} 行</div>
                      <div>{importResult.message || '-'}</div>
                    </>
                  )}
                  {!isImport && exportResult && (
                    <>
                      <div>任务号：{exportResult.taskNo || '-'}</div>
                      <div>状态：{exportResult.status || '-'}；导出行数：{exportResult.rowCount ?? 0}</div>
                      <div>文件名：{exportResult.fileName || '-'}</div>
                      <div>筛选条件：{exportResult.filterSummary || '全部用户'}</div>
                      <div>{exportResult.message || '-'}</div>
                    </>
                  )}
                </div>
                <div className="flex w-28 justify-end">
                  {isImport && importResult && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-28"
                      onClick={() => downloadTextFile(`app-users-import-errors-${importResult.batchNo || 'latest'}.csv`, buildImportErrorReportCsv(importResult))}
                    >
                      下载错误报告
                    </Button>
                  )}
                  {!isImport && exportResult?.downloadContent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-28"
                      onClick={() => downloadTextFile(exportResult.fileName || 'app-users-export.csv', exportResult.downloadContent || '')}
                    >
                      下载导出文件
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!loading && historyPage.total > 0 && (
          <Pagination
            current={historyPage.current || 1}
            total={historyPage.total || 0}
            pageSize={5}
            onChange={onPageChange}
            showPageSizeSelector={false}
            className="pt-1"
          />
        )}
      </div>
    </Dialog>
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

  function handleDownloadTemplate() {
    downloadTextFile('app-users-all-fields-template.csv', buildImportTemplateCsv());
    showToast('导入模板已下载', 'success');
  }

  function handleDownloadErrorReport() {
    if (!importResult) {
      showToast('请先上传文件并点击确认导入，拿到预校验结果后再下载错误报告', 'info');
      return;
    }
    downloadTextFile(`app-users-import-errors-${importResult.batchNo || 'latest'}.csv`, buildImportErrorReportCsv(importResult));
    showToast('错误报告已下载', 'success');
  }

  return (
    <Dialog open={Boolean(type)} onClose={onClose} className="max-w-[720px]">
      <DialogHeader>
        <DialogTitle>{isImport ? '批量导入 App 用户' : '导出 App 用户全部字段确认'}</DialogTitle>
      </DialogHeader>
      <div className="mt-5 space-y-4 text-sm text-[#5F6675]">
        <div className="rounded-md bg-[#F4F8FF] p-4">
          {isImport
            ? '上传 Excel/CSV 导入线下收集用户信息；不会发送短信验证码，也不会自动通过认证。必填项按准入与认证配置里的字段配置实时校验。'
            : '导出前二次确认并记录操作日志。导出用户全部字段，图片资料类字段输出对应 URL，导出文件不做掩码。'}
        </div>
        {isImport && (
          <>
            <div className="grid gap-2 rounded-md border border-[#E6EDF7] p-4">
              <strong className="text-[#1F2433]">全字段模板</strong>
              <span>支持填写：账号资料、基础资料、认证资料、头像/相册/背景图 URL、开放文本、语音 URL、歌曲、微信号等字段。</span>
              <span>必填：按后台字段配置校验；资料图片类字段填写对应图片 URL，多个 URL 用英文竖线 | 分隔。</span>
              <span>步骤：1 下载模板 / 2 上传 Excel / 3 预校验 / 4 确认导入</span>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>下载模板</Button>
                <Button variant="outline" size="sm" onClick={handleDownloadErrorReport}>下载错误报告</Button>
              </div>
            </div>
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            <WorkflowImportResponse result={importResult} />
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
              {[
                '账号字段', '基础资料字段', '地区编码/中文', '字典 code/中文', '实名资料',
                '学历资料', '头像 URL', '相册 URL', '背景图 URL', '开放文本',
                '语音 URL', '歌曲资料', '微信号', '认证状态/原因', '资料完整度',
              ].map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
            <div className="rounded-md bg-[#FFF7E8] p-4 text-[#8A5A00]">
              审计提示：导出行为将记录操作人、筛选条件、字段范围、导出时间和审计号。
            </div>
          </>
        )}
        {exportResult && <WorkflowExportResponse result={exportResult} />}
        <div className="flex items-center gap-3 rounded-md border border-[#E6EDF7] p-4">
          {isImport ? <Upload className="h-5 w-5 text-[#2876FF]" /> : <Download className="h-5 w-5 text-[#2876FF]" />}
          <span>{isImport ? (selectedFile?.name || '未选择导入文件') : '导出范围：当前列表筛选条件；字段：全部用户字段'}</span>
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

interface DemoTableRow {
  key: string;
  cells: ReactNode[];
}

function DemoTable({ headers, rows }: { headers: string[]; rows: DemoTableRow[] }) {
  return (
    <div className="p-5">
      <div className="overflow-x-auto rounded-lg border border-[#E6EDF7]">
        <table className="w-full text-left text-sm" style={{ minWidth: `${Math.max(720, headers.length * 116)}px` }}>
          <thead className="bg-white text-[#5F6B7A]">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header}
                  className={`whitespace-nowrap px-3 py-3 font-medium ${
                    index === headers.length - 1
                      ? 'sticky right-0 z-20 min-w-[104px] border-l border-[#E6EDF7] bg-white'
                      : ''
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EDF7] text-[#0C3A78]">
            {rows.map((row) => (
              <tr key={row.key} className="bg-white">
                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.key}-${index}`}
                    className={`whitespace-nowrap px-3 py-3 ${
                      index === row.cells.length - 1
                        ? 'sticky right-0 z-10 min-w-[104px] border-l border-[#E6EDF7] bg-white'
                        : ''
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
