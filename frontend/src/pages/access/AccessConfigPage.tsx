import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ui/toast';
import type { AppConfigVO, ContentOperationLogVO } from '@/api/content';
import {
  getPrd01Config,
  getPrd01ConfigLogs,
  savePrd01Config,
  type PageResult,
  type Prd01ConfigGroup,
} from '@/api/prd01Config';

type AccessConfigTab = Prd01ConfigGroup | 'SCORE' | 'SLA' | 'COPY' | 'SECURITY';
type ControlMode = 'configurable' | 'fixed' | 'conditional' | 'masked' | 'system' | 'none';

interface FieldConfigRow {
  group: string;
  label: string;
  fieldId: string;
  pageMenu: string;
  displayMode: ControlMode;
  requiredMode: ControlMode;
  scoreMode: ControlMode;
  visible: boolean;
  required: boolean;
  scoreEnabled: boolean;
  studentScore: string;
  workerScore: string;
}

interface LogPayload {
  category?: string;
  tabName?: string;
  summary?: string;
  changedCount?: number;
  changes?: LogChange[];
  [key: string]: unknown;
}

interface LogChange {
  category?: string;
  group?: string;
  label?: string;
  fieldId?: string;
  configKey?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
}

interface CopyConfigRow {
  group: string;
  scene: string;
  copyKey: string;
  content: string;
  enabled: boolean;
}

interface SecurityConfigItem {
  key: string;
  label: string;
  unit: string;
  defaultValue: string;
  description: string;
}

const GROUPS: { key: AccessConfigTab; label: string }[] = [
  { key: 'PRD01_ACCESS', label: '准入门槛' },
  { key: 'PRD01_PROFILE_FIELD', label: '字段配置' },
  { key: 'SCORE', label: '资料完整度' },
  { key: 'PRD01_UPLOAD', label: '上传限制' },
  { key: 'SLA', label: '审核 SLA' },
  { key: 'COPY', label: '文案配置' },
  { key: 'SECURITY', label: '安全策略' },
];

const BOOL_OPTIONS = [
  { value: 'true', label: '开启' },
  { value: 'false', label: '关闭' },
];

const TYPE_LABELS: Record<string, string> = {
  BOOLEAN: '开关',
  NUMBER: '数字',
  TEXT: '文本',
  JSON: 'JSON',
};

const ACCESS_CONFIG_KEYS = {
  minAge: 'prd01.access.minAge',
  maxAge: 'prd01.access.maxAge',
};

const PROFILE_FIELD_CONFIG_KEY = 'prd01.profile.fieldSettings';
const PROFILE_SCORE_CONFIG_KEY = 'prd01.profile.scoreWeights';
const EDUCATION_SLA_HOURS_KEY = 'prd01.audit.education.sla_hours';
const COPY_CONFIG_KEY = 'prd01.copy.rules';
const TEXT_LENGTH_CONFIG_KEY = 'prd01.text.length.rules';
const SMS_SECURITY_CONFIG_KEY = 'prd01.security.sms.rules';
const LOG_PAGE_SIZE = 5;
const REMOVED_SCORE_MIGRATIONS = [
  { fieldId: 'mbtiType', targetFieldId: 'tags', studentScore: 2, workerScore: 2 },
  { fieldId: 'qaList', targetFieldId: 'aboutMe', studentScore: 5, workerScore: 5 },
];

const DEFAULT_CONFIGS: Record<Prd01ConfigGroup, AppConfigVO[]> = {
  PRD01_ACCESS: [
    config('prd01.access.minAge', '18', 'NUMBER', '最小年龄'),
    config('prd01.access.maxAge', '60', 'NUMBER', '最大年龄'),
  ],
  PRD01_PROFILE_FIELD: [
    config(PROFILE_FIELD_CONFIG_KEY, JSON.stringify({ rows: [] }), 'JSON', '字段展示、必填、计分配置'),
    config(PROFILE_SCORE_CONFIG_KEY, JSON.stringify({ rows: [] }), 'JSON', '资料完整度分值配置'),
  ],
  PRD01_UPLOAD: [
    config('prd01.upload.album.maxCount', '9', 'NUMBER', '相册最多张数'),
    config('prd01.upload.education.maxCount', '4', 'NUMBER', '学历材料最多张数'),
    config('prd01.upload.profileBg.maxCount', '1', 'NUMBER', '资料背景图最多张数'),
  ],
  PRD01_AUDIT: [
    config(EDUCATION_SLA_HOURS_KEY, '24', 'NUMBER', '学历审核承诺时间（小时）'),
    config(COPY_CONFIG_KEY, JSON.stringify({ rows: [] }), 'JSON', '准入/认证文案配置'),
    config(TEXT_LENGTH_CONFIG_KEY, JSON.stringify({ rows: [] }), 'JSON', '开放文本长度文案配置'),
    config(SMS_SECURITY_CONFIG_KEY, JSON.stringify({ rows: [] }), 'JSON', '短信验证码安全策略'),
  ],
};

const SECURITY_CONFIG_ITEMS: SecurityConfigItem[] = [
  {
    key: 'sendCountdownSeconds',
    label: '发送倒计时',
    unit: '秒',
    defaultValue: '60',
    description: '同一个用户发送短信验证码后的倒计时',
  },
  {
    key: 'validMinutes',
    label: '有效期',
    unit: '分钟',
    defaultValue: '5',
    description: '短信验证码有效期',
  },
  {
    key: 'dailySendLimit',
    label: '每日上限',
    unit: '次',
    defaultValue: '10',
    description: '每日发送上限',
  },
];

const FIELD_CONFIG_ROWS: FieldConfigRow[] = [
  fieldRow('账号流程', '登录方式', 'loginMethod', '登录授权页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('账号流程', '手机号', 'phone', '登录授权页、绑定手机号页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('账号流程', '短信验证码', 'smsCode', '登录授权页、绑定手机号页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('账号流程', '微信授权信息', 'wechatAuth', '登录授权页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('账号流程', '登录协议/隐私协议同意', 'agreementAccepted', '登录授权页', 'fixed', 'fixed', 'none', true, true, '0', '0'),

  fieldRow('轻量资料', '性别', 'gender', '性别选择页、基本资料页', 'fixed', 'fixed', 'configurable', true, true, '3', '3'),
  fieldRow('轻量资料', '出生日期', 'birthday', '出生日期页、基本资料页', 'fixed', 'fixed', 'configurable', true, true, '3', '3'),
  fieldRow('轻量资料', '身份', 'identityType', '身份选择页、基本资料页', 'fixed', 'fixed', 'configurable', true, true, '2', '2'),
  fieldRow('轻量资料', '最高学历', 'educationLevel', '学历选择页、基本资料页', 'fixed', 'fixed', 'configurable', true, true, '4', '4'),
  fieldRow('轻量资料', '现居省份', 'locationProvince', '现居地选择页、基本资料页', 'fixed', 'fixed', 'configurable', true, true, '2', '2'),
  fieldRow('轻量资料', '现居城市', 'locationCity', '现居地选择页、基本资料页', 'fixed', 'fixed', 'configurable', true, true, '2', '2'),
  fieldRow('轻量资料', '现居区县（历史兼容）', 'locationDistrict', '不再采集', 'fixed', 'none', 'none', false, false, '0', '0'),
  fieldRow('轻量资料', '经度', 'longitude', '定位能力', 'fixed', 'none', 'none', true, false, '0', '0'),
  fieldRow('轻量资料', '纬度', 'latitude', '定位能力', 'fixed', 'none', 'none', true, false, '0', '0'),

  fieldRow('基础资料', '昵称', 'nickname', '基本资料页、基础资料编辑页', 'configurable', 'configurable', 'configurable', true, true, '3', '3'),
  fieldRow('基础资料', '身高', 'height', '基本资料页、基础资料编辑页', 'fixed', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('基础资料', '体重', 'weight', '基本资料页、基础资料编辑页', 'fixed', 'configurable', 'configurable', true, false, '1', '1'),
  fieldRow('基础资料', '家乡省份', 'hometownProvince', '家乡选择页、基础资料编辑页', 'fixed', 'configurable', 'configurable', true, false, '1', '1'),
  fieldRow('基础资料', '家乡城市', 'hometownCity', '家乡选择页、基础资料编辑页', 'fixed', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('基础资料', '家乡区县（历史兼容）', 'hometownDistrict', '不再采集', 'fixed', 'none', 'none', false, false, '0', '0'),
  fieldRow('基础资料', '户口所在地', 'residence', '基础资料编辑页', 'configurable', 'configurable', 'configurable', true, false, '1', '1'),
  fieldRow('基础资料', '行业', 'industry', '基础资料编辑页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('基础资料', '职业', 'occupation', '基本资料页、基础资料编辑页', 'configurable', 'configurable', 'configurable', true, false, '3', '4'),
  fieldRow('基础资料', '公司', 'company', '基础资料编辑页', 'configurable', 'configurable', 'configurable', true, false, '2', '3'),
  fieldRow('基础资料', '年收入', 'annualIncomeRange', '基础资料编辑页', 'configurable', 'configurable', 'configurable', true, false, '2', '4'),
  fieldRow('基础资料', '学校', 'school', '基本资料页、基础资料编辑页', 'configurable', 'configurable', 'configurable', true, false, '4', '1'),
  fieldRow('基础资料', '专业', 'major', '基础资料编辑页', 'configurable', 'configurable', 'configurable', true, false, '2', '1'),
  fieldRow('基础资料', '婚姻状况', 'maritalStatus', '基础资料编辑页', 'configurable', 'configurable', 'configurable', true, false, '1', '1'),

  fieldRow('扩展资料', '脱单目标', 'datingGoal', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('扩展资料', '感情状态', 'emotionalStatus', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('扩展资料', '关于我/自我描述', 'aboutMe', '自我介绍页、编辑资料页', 'configurable', 'configurable', 'configurable', true, true, '5', '5'),
  fieldRow('扩展资料', '个人标签', 'tags', '标签页、编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '3', '3'),
  fieldRow('扩展资料', '相册/附加照片', 'photos', '相册页、编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '4', '4'),
  fieldRow('扩展资料', '资料背景图', 'profileBgImage', '资料编辑页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('扩展资料', '语音介绍文件', 'voiceIntroUrl', '资料编辑页、用户详情页', 'configurable', 'configurable', 'configurable', true, false, '3', '3'),
  fieldRow('扩展资料', '语音介绍时长', 'voiceIntroDuration', '资料编辑页、用户详情页', 'configurable', 'configurable', 'configurable', true, false, '1', '1'),
  fieldRow('扩展资料', '爱听的歌曲', 'favoriteSong', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('扩展资料', '见面偏好', 'meetingPreference', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('扩展资料', '喜欢的见面活动', 'preferredActivities', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('扩展资料', '住房情况', 'housingStatus', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '1', '1'),
  fieldRow('扩展资料', '购车情况', 'carStatus', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('扩展资料', '是否想要孩子', 'childrenPlan', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('扩展资料', '有无子女', 'hasChild', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '2', '2'),
  fieldRow('扩展资料', '结婚计划', 'marriagePlan', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '1', '1'),
  fieldRow('扩展资料', '宗教信仰', 'religion', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '1', '1'),
  fieldRow('扩展资料', '吸烟情况', 'smoking', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '1', '1'),
  fieldRow('扩展资料', '饮酒情况', 'drinking', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '1', '1'),
  fieldRow('扩展资料', '宠物态度', 'pets', '编辑资料页', 'configurable', 'configurable', 'configurable', true, false, '1', '1'),

  fieldRow('联系方式', '微信号', 'wechatId', '联系方式页', 'configurable', 'configurable', 'none', true, false, '0', '0'),

  fieldRow('头像认证', '头像来源', 'avatarSource', '头像认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('头像认证', '裁剪后主头像', 'avatarImage', '头像认证页', 'fixed', 'fixed', 'configurable', true, true, '4', '4'),

  fieldRow('实名认证', '真实姓名', 'realName', '实名认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('实名认证', '身份证号', 'idCardNo', '实名认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('实名认证', '单身承诺/认证协议勾选', 'singleCommitmentChecked', '实名认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),

  fieldRow('学历认证', '学历人群', 'educationUserType', '学历认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('学历认证', '学校名称', 'schoolName', '学历认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('学历认证', '学生证/在读证明', 'studentMaterials', '学历认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('学历认证', '认证方式', 'educationMethod', '学历认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('学历认证', '学信网在线验证码', 'chsiCode', '学历认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('学历认证', '毕业证或学位证书编号', 'diplomaNo', '学历认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('学历认证', '证书姓名', 'certificateName', '学历认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('学历认证', '毕业证/学位证材料', 'certificateMaterials', '学历认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
  fieldRow('学历认证', '学历协议勾选', 'educationAgreementChecked', '学历认证页', 'fixed', 'fixed', 'none', true, true, '0', '0'),
];

const COPY_CONFIG_ROWS: CopyConfigRow[] = [
  copyRow('准入拦截文案', '未完成资料', 'core_access_profile_incomplete', '请先完善基础资料后继续使用该功能'),
  copyRow('准入拦截文案', '三重认证未通过', 'core_access_triple_not_passed', '请完成实名、头像、学历三重认证后继续使用'),
  copyRow('准入拦截文案', '账号异常', 'core_access_account_abnormal', '账号状态异常，暂无法使用该功能，请联系客服'),
  copyRow('认证提示文案', '实名认证说明', 'real_name_notice', '实名认证信息仅用于身份核验，请填写真实姓名和身份证号'),
  copyRow('认证提示文案', '头像认证说明', 'avatar_notice', '请上传本人清晰头像，避免遮挡、多人合照或明显修图'),
  copyRow('认证提示文案', '学历认证说明', 'education_notice', '学历认证用于提升资料可信度，审核通过后将在资料中展示认证标识'),
  copyRow('认证提示文案', '材料示例/上传说明', 'education_upload_notice', '请上传清晰、完整、无遮挡的学历证明材料'),
  copyRow('协议文案', '用户协议', 'agreement_user', '请阅读并同意《用户协议》后继续使用'),
  copyRow('协议文案', '隐私政策', 'agreement_privacy', '请阅读并同意《隐私政策》后继续使用'),
  copyRow('协议文案', '单身承诺函', 'agreement_single_commitment', '本人承诺当前为单身状态，并对提交信息真实性负责'),
  copyRow('协议文案', '学历认证协议', 'agreement_education', '本人授权平台对学校、学历、证书编号和学历材料进行认证审核'),
  copyRow('驳回模板', '头像驳回', 'reject_avatar', '头像不符合展示规范，请重新上传本人清晰头像'),
  copyRow('驳回模板', '实名驳回', 'reject_real_name', '实名信息与身份证号不一致，请核对后重新提交'),
  copyRow('驳回模板', '学历驳回', 'reject_education', '学历材料不清晰或信息不完整，请重新提交'),
  copyRow('驳回模板', '资料图片驳回', 'reject_profile_photo', '图片内容不符合资料展示规范，请重新上传'),
  copyRow('驳回模板', '开放文字驳回', 'reject_open_text', '文字内容不符合社区规范，请修改后重新提交'),
  copyRow('异常文案', '年龄不符', 'error_age_not_allowed', '当前年龄不符合平台准入要求'),
  copyRow('异常文案', '定位失败', 'error_location_failed', '定位失败，请手动选择所在地区'),
  copyRow('异常文案', '上传失败', 'error_upload_failed', '上传失败，请检查网络后重试'),
  copyRow('异常文案', '第三方不可用', 'error_provider_unavailable', '认证服务暂不可用，请稍后重试，已填写内容会保留'),
  copyRow('内容安全文案', '文本安全不通过', 'safety_text_failed', '文本内容未通过安全审核，请修改后重新提交'),
  copyRow('内容安全文案', '图片安全不通过', 'safety_image_failed', '图片内容未通过安全审核，请重新上传'),
  copyRow('内容安全文案', '语音安全不通过', 'safety_voice_failed', '语音内容未通过安全审核，请重新录制'),
  copyRow('开放文本长度', '关于我', 'text_length_about_me', '关于我建议 20-300 字，请控制在配置范围内'),
  copyRow('开放文本长度', '资料问答', 'text_length_profile_qa', '资料问答回答建议 1-200 字，请控制在配置范围内'),
];

function config(configKey: string, configValue: string, configType: string, remark: string): AppConfigVO {
  return {
    id: 0,
    configKey,
    configValue,
    configGroup: '',
    configType,
    publicVisible: 0,
    status: 'ENABLED',
    remark,
    updateTime: '',
  };
}

function fieldRow(
  group: string,
  label: string,
  fieldId: string,
  pageMenu: string,
  displayMode: ControlMode,
  requiredMode: ControlMode,
  scoreMode: ControlMode,
  visible: boolean,
  required: boolean,
  studentScore: string,
  workerScore: string,
): FieldConfigRow {
  return {
    group,
    label,
    fieldId,
    pageMenu,
    displayMode,
    requiredMode,
    scoreMode,
    visible,
    required,
    scoreEnabled: scoreMode === 'configurable',
    studentScore,
    workerScore,
  };
}

function copyRow(group: string, scene: string, copyKey: string, content: string, enabled = true): CopyConfigRow {
  return {
    group,
    scene,
    copyKey,
    content,
    enabled,
  };
}

function responseData<T>(res: unknown, fallback: T): T {
  return (res as any)?.data ?? fallback;
}

function pageData<T>(res: unknown): PageResult<T> {
  const data = (res as any)?.data ?? {};
  return {
    records: data.records ?? [],
    total: Number(data.total ?? 0),
    current: Number(data.current ?? 1),
    size: Number(data.size ?? LOG_PAGE_SIZE),
  };
}

function isConfigGroup(group: AccessConfigTab): group is Prd01ConfigGroup {
  return group.startsWith('PRD01_');
}

export default function AccessConfigPage() {
  const [activeGroup, setActiveGroup] = useState<AccessConfigTab>('PRD01_ACCESS');
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0C285A]">准入与认证配置</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            准入与认证配置 / {GROUPS.find((item) => item.key === activeGroup)?.label} Tab
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLogOpen(true)}>
          查看变更日志
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {GROUPS.map((group) => (
          <button
            key={group.key}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeGroup === group.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveGroup(group.key)}
          >
            {group.label}
          </button>
        ))}
      </div>

      <ConfigPanel group={activeGroup} />
      <ConfigLogDialog open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}

function ConfigPanel({ group }: { group: AccessConfigTab }) {
  const [items, setItems] = useState<AppConfigVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  const load = useCallback(async () => {
    if (!isConfigGroup(group)) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getPrd01Config(group);
      const data = responseData<AppConfigVO[]>(res, []);
      const nextItems = data.length > 0 ? data : DEFAULT_CONFIGS[group].map((item) => ({ ...item, configGroup: group }));
      setItems(nextItems);
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    load();
  }, [load]);

  function updateItem(index: number, field: keyof AppConfigVO, value: any) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  async function save() {
    if (!isConfigGroup(group)) return;
    setSaving(true);
    try {
      const label = GROUPS.find((item) => item.key === group)?.label ?? '配置';
      await savePrd01Config(
        items.map((item) => ({
          configKey: item.configKey,
          configValue: item.configValue,
          configGroup: group,
          configType: item.configType,
          publicVisible: item.publicVisible,
          status: item.status,
          remark: item.remark,
        })),
        {
          tabName: label,
          changeReason,
          summary: `保存${label}`,
        },
      );
      showToast('配置已保存', 'success');
      setConfirmOpen(false);
      setChangeReason('');
      load();
    } finally {
      setSaving(false);
    }
  }

  if (group === 'PRD01_ACCESS') {
    return <AccessGatePanel />;
  }

  if (group === 'PRD01_PROFILE_FIELD') {
    return <FieldConfigPanel />;
  }

  if (group === 'SCORE') {
    return <ScoreConfigPanel />;
  }

  if (group === 'PRD01_UPLOAD') {
    return <UploadConfigPanel />;
  }

  if (group === 'SLA') {
    return <AuditSlaConfigPanel />;
  }

  if (group === 'COPY') {
    return <CopyConfigPanel />;
  }

  if (group === 'SECURITY') {
    return <SecurityConfigPanel />;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>配置项</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : items.map((item, index) => (
          <div key={item.configKey} className="grid items-center gap-3 rounded-md border border-[#E6EDF7] p-4 lg:grid-cols-[260px_minmax(240px,1fr)_80px_90px_90px]">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[#1F2433]">{item.configKey}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.remark || '-'}</div>
            </div>
            {item.configType === 'BOOLEAN' ? (
              <Select options={BOOL_OPTIONS} value={item.configValue} onChange={(value) => updateItem(index, 'configValue', value)} />
            ) : (
              <Input
                type={item.configType === 'NUMBER' ? 'number' : 'text'}
                value={item.configValue}
                onChange={(event) => updateItem(index, 'configValue', event.target.value)}
              />
            )}
            <Badge variant="secondary">{TYPE_LABELS[item.configType] ?? item.configType}</Badge>
            <label className="flex items-center gap-2 text-xs text-[#5F6675]">
              <input type="checkbox" checked={item.publicVisible === 1} onChange={(event) => updateItem(index, 'publicVisible', event.target.checked ? 1 : 0)} />
              公开
            </label>
            <label className="flex items-center gap-2 text-xs text-[#5F6675]">
              <input type="checkbox" checked={item.status === 'ENABLED'} onChange={(event) => updateItem(index, 'status', event.target.checked ? 'ENABLED' : 'DISABLED')} />
              启用
            </label>
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={loading || saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </CardContent>
      <ConfirmSaveDialog
        open={confirmOpen}
        title="高风险配置保存确认"
        description="保存后会写入配置版本和审计记录。"
        reason={changeReason}
        saving={saving}
        onReasonChange={setChangeReason}
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
      />
    </Card>
  );
}

function AccessGatePanel() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('60');
  const [initialAge, setInitialAge] = useState({ minAge: '18', maxAge: '60' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPrd01Config('PRD01_ACCESS');
      const data = responseData<AppConfigVO[]>(res, []);
      const nextMinAge = findConfigValue(data, ACCESS_CONFIG_KEYS.minAge, '18');
      const nextMaxAge = findConfigValue(data, ACCESS_CONFIG_KEYS.maxAge, '60');
      setMinAge(nextMinAge);
      setMaxAge(nextMaxAge);
      setInitialAge({ minAge: nextMinAge, maxAge: nextMaxAge });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function validateAgeRange() {
    if (!isPositiveInteger(minAge) || !isPositiveInteger(maxAge)) {
      showToast('最小年龄和最大年龄只能填写正整数', 'error');
      return false;
    }
    if (Number(maxAge) < Number(minAge)) {
      showToast('最大年龄不能小于最小年龄', 'error');
      return false;
    }
    return true;
  }

  async function saveAccessConfig() {
    if (!validateAgeRange()) {
      return;
    }
    setSaving(true);
    try {
      const changes = [
        buildConfigChange('年龄范围', '最小年龄', ACCESS_CONFIG_KEYS.minAge, initialAge.minAge, minAge.trim()),
        buildConfigChange('年龄范围', '最大年龄', ACCESS_CONFIG_KEYS.maxAge, initialAge.maxAge, maxAge.trim()),
      ].filter(Boolean) as LogChange[];
      await savePrd01Config(
        [
          accessConfig(ACCESS_CONFIG_KEYS.minAge, minAge.trim(), '最小年龄'),
          accessConfig(ACCESS_CONFIG_KEYS.maxAge, maxAge.trim(), '最大年龄'),
        ],
        {
          tabName: '准入门槛',
          changeReason,
          summary: `保存准入门槛，变更 ${changes.length} 项`,
          changeDetailsJson: JSON.stringify({
            category: '准入门槛',
            tabName: '准入门槛',
            summary: `保存准入门槛，变更 ${changes.length} 项`,
            changedCount: changes.length,
            changes,
          }),
        },
      );
      showToast('准入门槛已保存', 'success');
      setConfirmOpen(false);
      setChangeReason('');
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>配置项</CardTitle>
        <p className="text-sm text-muted-foreground">核心准入说明写死为三重认证通过，不作为运营配置开关。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-[#E6EDF7] p-4">
            <h3 className="font-semibold text-[#1F2433]">年龄范围</h3>
            <div className="mt-3 grid gap-2 text-sm text-[#5F6675]">
              <label>
                最小年龄
                <Input
                  value={minAge}
                  className="mt-1"
                  inputMode="numeric"
                  type="text"
                  disabled={loading || saving}
                  onChange={(event) => setMinAge(onlyDigits(event.target.value))}
                />
              </label>
              <label>
                最大年龄
                <Input
                  value={maxAge}
                  className="mt-1"
                  inputMode="numeric"
                  type="text"
                  disabled={loading || saving}
                  onChange={(event) => setMaxAge(onlyDigits(event.target.value))}
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">只能填写正整数，最大年龄不能小于最小年龄。</p>
          </div>
          <div className="rounded-md border border-[#E6EDF7] p-4">
            <h3 className="font-semibold text-[#1F2433]">核心准入门槛</h3>
            <p className="mt-3 text-sm text-[#5F6675]">默认要求：实名认证通过、头像认证通过、学历认证通过。</p>
            <p className="mt-2 text-sm text-[#5F6675]">该规则不提供开关，不允许降级为单项实名或双认证。</p>
          </div>
          <div className="rounded-md border border-[#E6EDF7] p-4">
            <h3 className="font-semibold text-[#1F2433]">账号状态限制</h3>
            <p className="mt-3 text-sm text-[#5F6675]">正常账号可用</p>
            <p className="mt-2 text-sm text-[#5F6675]">冻结、注销状态拦截核心能力</p>
          </div>
        </div>
        <div className="rounded-md bg-[#F4F8FF] p-4 text-sm text-[#4D5A6D]">
          <strong>准入拦截能力</strong>
          <p className="mt-2">未达到年龄配置、三重认证门槛、账号异常、未完善资料时，社区发布等核心能力保持拦截。</p>
          <p className="mt-2">保存前填写变更原因，确认保存后写入配置版本和审计日志。</p>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => validateAgeRange() && setConfirmOpen(true)} disabled={loading || saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? '保存中...' : '保存准入门槛'}
          </Button>
        </div>
      </CardContent>
      <ConfirmSaveDialog
        open={confirmOpen}
        title="高风险配置保存确认"
        description="保存后会更新年龄准入配置；核心准入仍为实名、头像、学历三项认证通过。"
        reason={changeReason}
        saving={saving}
        onReasonChange={setChangeReason}
        onClose={() => setConfirmOpen(false)}
        onConfirm={saveAccessConfig}
      />
    </Card>
  );
}

function FieldConfigPanel() {
  const [rows, setRows] = useState<FieldConfigRow[]>(FIELD_CONFIG_ROWS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPrd01Config('PRD01_PROFILE_FIELD');
      const data = responseData<AppConfigVO[]>(res, []);
      const saved = findConfigValue(data, PROFILE_FIELD_CONFIG_KEY, '');
      const savedScore = findConfigValue(data, PROFILE_SCORE_CONFIG_KEY, '');
      const nextRows = mergeScoresIntoRows(mergeSavedFieldRows(saved), savedScore);
      setRows(nextRows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateRow(fieldId: string, patch: Partial<FieldConfigRow>) {
    if (saving) return;
    const current = rows.find((row) => row.fieldId === fieldId);
    if (!current) return;
    if ((patch.scoreEnabled === false || patch.visible === false) && current.scoreEnabled && hasConfiguredScore(current)) {
      showToast(`「${current.label}」仍配置了完整度分值，请先到资料完整度把分数清 0 并分配给其他字段，再关闭计分`, 'error');
      return;
    }
    const nextPatch = { ...patch };
    if (patch.scoreEnabled === true && !current.scoreEnabled) {
      nextPatch.studentScore = '0';
      nextPatch.workerScore = '0';
    }
    const nextRows = rows.map((row) => (row.fieldId === fieldId ? { ...row, ...nextPatch } : row));
    setRows(nextRows);
    setSaving(true);
    try {
      const fieldChanges = buildFieldChanges(rows, nextRows);
      const scoreChanges = buildScoreChanges(rows, nextRows);
      const changes = [...fieldChanges, ...scoreChanges];
      const summary = `字段配置实时切换，变更 ${changes.length} 项`;
      await savePrd01Config(
        [
          jsonConfig(PROFILE_FIELD_CONFIG_KEY, nextRows, '字段展示、必填、计分配置'),
          jsonConfig(PROFILE_SCORE_CONFIG_KEY, nextRows.filter((row) => row.scoreMode === 'configurable'), '资料完整度分值配置'),
        ],
        {
          tabName: '字段配置',
          changeReason: '字段配置实时切换',
          summary,
          changeDetailsJson: JSON.stringify({ category: '字段配置', tabName: '字段配置', summary, changedCount: changes.length, changes }),
        },
      );
      showToast('字段配置已保存', 'success');
    } catch {
      setRows(rows);
      showToast('字段配置保存失败，请稍后重试', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>字段配置</CardTitle>
        <p className="text-sm text-muted-foreground">同一字段全端共用一份配置；展示、必填、计分三个属性分别按字段规则锁定或开放编辑。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[620px] overflow-auto rounded-md border border-[#E6EDF7]">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 bg-[#F7FAFE] text-[#5F6675]">
              <tr>
                <th className="px-4 py-3 font-medium">字段组</th>
                <th className="px-4 py-3 font-medium">显示名 / 字段 ID</th>
                <th className="px-4 py-3 font-medium">页面菜单</th>
                <th className="px-4 py-3 font-medium">展示</th>
                <th className="px-4 py-3 font-medium">必填</th>
                <th className="px-4 py-3 font-medium">计分</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EDF7]">
              {rows.map((row) => (
                <tr key={row.fieldId} className="bg-white odd:bg-white even:bg-[#F8FBFF]">
                  <td className="px-4 py-3 text-[#2B3043]">{row.group}</td>
                  <td className="px-4 py-3 text-[#2B3043]">
                    <div className="font-medium">{row.label}</div>
                    <div className="text-xs text-muted-foreground">{row.fieldId}</div>
                  </td>
                  <td className="px-4 py-3 text-[#2B3043]">{row.pageMenu}</td>
                  <td className="px-4 py-3">{renderFieldSwitch(row, 'visible', updateRow, loading || saving)}</td>
                  <td className="px-4 py-3">{renderFieldSwitch(row, 'required', updateRow, loading || saving)}</td>
                  <td className="px-4 py-3">{renderFieldSwitch(row, 'scoreEnabled', updateRow, loading || saving)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-md bg-[#F7FAFE] p-3 text-sm text-[#4D5A6D]">
          灰色状态表示固定规则：登录关键字段固定展示且固定必填，身高、体重、家乡仅固定展示；关闭计分前，必须先到资料完整度把该字段分值清 0 并分配给其他字段。
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreConfigPanel() {
  const [rows, setRows] = useState<FieldConfigRow[]>(FIELD_CONFIG_ROWS.filter((row) => row.scoreMode === 'configurable'));
  const [initialRows, setInitialRows] = useState<FieldConfigRow[]>(FIELD_CONFIG_ROWS.filter((row) => row.scoreMode === 'configurable'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  const enabledRows = useMemo(() => rows.filter((row) => row.scoreMode === 'configurable' && row.scoreEnabled), [rows]);
  const studentTotal = useMemo(() => sumScores(enabledRows, 'studentScore'), [enabledRows]);
  const workerTotal = useMemo(() => sumScores(enabledRows, 'workerScore'), [enabledRows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPrd01Config('PRD01_PROFILE_FIELD');
      const data = responseData<AppConfigVO[]>(res, []);
      const savedField = findConfigValue(data, PROFILE_FIELD_CONFIG_KEY, '');
      const savedScore = findConfigValue(data, PROFILE_SCORE_CONFIG_KEY, '');
      const fieldRows = mergeSavedFieldRows(savedField);
      const nextRows = mergeSavedScoreRows(savedScore, fieldRows);
      setRows(nextRows);
      setInitialRows(nextRows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateScore(fieldId: string, field: 'studentScore' | 'workerScore', value: string) {
    setRows((prev) => prev.map((row) => (row.fieldId === fieldId ? { ...row, [field]: onlyDigits(value) } : row)));
  }

  function validateScores() {
    const invalid = enabledRows.find((row) => !isNonNegativeInteger(row.studentScore) || !isNonNegativeInteger(row.workerScore));
    if (invalid) {
      showToast(`「${invalid.label}」分值只能填写 0 或正整数`, 'error');
      return false;
    }
    if (studentTotal !== 100 || workerTotal !== 100) {
      showToast(`资料完整度总分必须为 100：在校生 ${studentTotal}，职场人 ${workerTotal}`, 'error');
      return false;
    }
    return true;
  }

  async function saveScoreConfig() {
    if (!validateScores()) {
      return;
    }
    setSaving(true);
    try {
      const changes = buildScoreChanges(initialRows, rows);
      const summary = `保存资料完整度配置，变更 ${changes.length} 项`;
      await savePrd01Config(
        [jsonConfig(PROFILE_SCORE_CONFIG_KEY, rows, '资料完整度分值配置')],
        {
          tabName: '资料完整度',
          changeReason,
          summary,
          changeDetailsJson: JSON.stringify({
            category: '资料完整度',
            tabName: '资料完整度',
            summary,
            changedCount: changes.length,
            studentTotal,
            workerTotal,
            changes,
          }),
        },
      );
      showToast('资料完整度配置已保存', 'success');
      setConfirmOpen(false);
      setChangeReason('');
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>资料完整度</CardTitle>
        <p className="text-sm text-muted-foreground">
          字段来源与字段配置保持一致；在校生当前总分 {studentTotal}，职场人当前总分 {workerTotal}。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[620px] overflow-auto rounded-md border border-[#E6EDF7]">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="sticky top-0 bg-[#F7FAFE] text-[#5F6675]">
              <tr>
                <th className="px-4 py-3 font-medium">字段组</th>
                <th className="px-4 py-3 font-medium">显示名 / 字段 ID</th>
                <th className="px-4 py-3 font-medium">页面菜单</th>
                <th className="px-4 py-3 font-medium">在校生分值</th>
                <th className="px-4 py-3 font-medium">职场人分值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EDF7]">
              {enabledRows.map((row) => (
                <tr key={row.fieldId} className="bg-white even:bg-[#F8FBFF]">
                  <td className="px-4 py-3 text-[#2B3043]">{row.group}</td>
                  <td className="px-4 py-3 text-[#2B3043]">
                    <div className="font-medium">{row.label}</div>
                    <div className="text-xs text-muted-foreground">{row.fieldId}</div>
                  </td>
                  <td className="px-4 py-3 text-[#2B3043]">{row.pageMenu}</td>
                  <td className="px-4 py-3">
                    <Input
                      className="w-24 text-center font-medium"
                      inputMode="numeric"
                      value={row.studentScore}
                      disabled={loading || saving}
                      onChange={(event) => updateScore(row.fieldId, 'studentScore', event.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      className="w-24 text-center font-medium"
                      inputMode="numeric"
                      value={row.workerScore}
                      disabled={loading || saving}
                      onChange={(event) => updateScore(row.fieldId, 'workerScore', event.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => validateScores() && setConfirmOpen(true)} disabled={loading || saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? '保存中...' : '保存完整度配置'}
          </Button>
        </div>
      </CardContent>
      <ConfirmSaveDialog
        open={confirmOpen}
        title="资料完整度保存确认"
        description="保存后会触发后续资料完整度重算，变更明细会写入 JSON 日志。"
        reason={changeReason}
        saving={saving}
        onReasonChange={setChangeReason}
        onClose={() => setConfirmOpen(false)}
        onConfirm={saveScoreConfig}
      />
    </Card>
  );
}

function UploadConfigPanel() {
  const defaultRules = [
    { key: 'education', title: '学历材料', maxCount: '4', maxMb: '10', format: 'jpg / jpeg / png' },
    { key: 'album', title: '相册照片', maxCount: '9', maxMb: '10', format: 'jpg / jpeg / png' },
    { key: 'profileBg', title: '资料背景图', maxCount: '1', maxMb: '10', format: 'jpg / jpeg / png' },
  ];
  const [rules, setRules] = useState(defaultRules);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPrd01Config('PRD01_UPLOAD');
      const data = responseData<AppConfigVO[]>(res, []);
      const saved = findConfigValue(data, 'prd01.upload.rules', '');
      setRules(mergeSavedUploadRules(defaultRules, saved));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateRule(key: string, field: 'maxCount' | 'maxMb', value: string) {
    setRules((prev) => prev.map((rule) => (rule.key === key ? { ...rule, [field]: onlyDigits(value) } : rule)));
  }

  function validateRules() {
    const invalid = rules.find((rule) => !isPositiveInteger(rule.maxCount) || !isPositiveInteger(rule.maxMb));
    if (invalid) {
      showToast(`「${invalid.title}」数量上限和单张大小只能填写正整数`, 'error');
      return false;
    }
    return true;
  }

  async function saveUploadConfig() {
    if (!validateRules()) return;
    setSaving(true);
    try {
      await savePrd01Config(
        [jsonConfig('prd01.upload.rules', rules, '上传限制配置')],
        {
          tabName: '上传限制',
          summary: '保存上传限制',
          changeDetailsJson: JSON.stringify({
            category: '上传限制',
            tabName: '上传限制',
            summary: '保存上传限制',
            changedCount: rules.length,
            changes: rules.map((rule) => ({
              group: '上传限制',
              label: rule.title,
              afterValue: `数量上限 ${rule.maxCount} 张；单张大小 ${rule.maxMb} MB；格式：${rule.format}`,
            })),
          }),
        },
      );
      showToast('上传限制已保存', 'success');
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>上传限制</CardTitle>
        <p className="text-sm text-muted-foreground">图片上传限制按资料类型拆分；语音介绍按固定内容安全规则处理。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {rules.map((rule) => (
            <div key={rule.key} className="rounded-md border border-[#E6EDF7] p-4">
              <h3 className="font-semibold text-[#1F2433]">{rule.title}</h3>
              <div className="mt-3 space-y-3 text-sm text-[#2B3043]">
                <label className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[#5F6675]">数量上限</span>
                  <CompactNumberInput
                    value={rule.maxCount}
                    disabled={loading || saving}
                    onChange={(value) => updateRule(rule.key, 'maxCount', value)}
                  />
                  <span className="text-[#5F6675]">张</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[#5F6675]">单张大小</span>
                  <CompactNumberInput
                    value={rule.maxMb}
                    disabled={loading || saving}
                    onChange={(value) => updateRule(rule.key, 'maxMb', value)}
                  />
                  <span className="text-[#5F6675]">MB</span>
                </label>
                <p className="text-[#5F6675]">格式：{rule.format}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-md bg-[#F4F8FF] p-4 text-sm text-[#4D5A6D]">
          文件格式与提示文案：文件过大 / 格式不支持 / 内容安全失败 / 上传失败可重试。
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={saveUploadConfig} disabled={loading || saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? '保存中...' : '保存上传限制'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactNumberInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="h-8 shrink-0 rounded-md border border-input bg-card px-2 text-center text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      style={{ width: 56 }}
      inputMode="numeric"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function SecurityConfigPanel() {
  const [values, setValues] = useState<Record<string, string>>(() => defaultSecurityValues());
  const [initialValues, setInitialValues] = useState<Record<string, string>>(() => defaultSecurityValues());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPrd01Config('PRD01_AUDIT');
      const data = responseData<AppConfigVO[]>(res, []);
      const saved = findConfigValue(data, SMS_SECURITY_CONFIG_KEY, '');
      const nextValues = mergeSavedSecurityValues(saved);
      setValues(nextValues);
      setInitialValues(nextValues);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: onlyDigits(value) }));
  }

  function validateSecurityValues() {
    const invalid = SECURITY_CONFIG_ITEMS.find((item) => !isPositiveInteger(values[item.key] ?? ''));
    if (invalid) {
      showToast(`「${invalid.label}」只能填写大于 0 的整数`, 'error');
      return false;
    }
    return true;
  }

  async function saveSecurityConfig() {
    if (!validateSecurityValues()) return;
    setSaving(true);
    try {
      const rows = SECURITY_CONFIG_ITEMS.map((item) => ({
        key: item.key,
        label: item.label,
        value: values[item.key],
        unit: item.unit,
        description: item.description,
      }));
      const changes = buildSecurityChanges(initialValues, values);
      const summary = `保存安全策略，变更 ${changes.length} 项`;
      await savePrd01Config(
        [jsonConfig(SMS_SECURITY_CONFIG_KEY, rows, '短信验证码安全策略', 'PRD01_AUDIT')],
        {
          tabName: '安全策略',
          changeReason,
          summary,
          changeDetailsJson: JSON.stringify({
            category: '安全策略',
            tabName: '安全策略',
            summary,
            changedCount: changes.length,
            changes,
          }),
        },
      );
      showToast('安全策略已保存', 'success');
      setConfirmOpen(false);
      setChangeReason('');
      setInitialValues(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>安全策略</CardTitle>
        <p className="text-sm text-muted-foreground">仅配置短信验证码频控；语音内容安全和微信授权失败兜底按固定业务规则执行。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
              <div className="rounded-md border border-[#E6EDF7] p-4">
                <h3 className="font-semibold text-[#1F2433]">短信验证码频控</h3>
                <div className="mt-4 space-y-3 text-sm text-[#2B3043]">
                  {SECURITY_CONFIG_ITEMS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-[#5F6675]">{item.label}</span>
                      <CompactNumberInput
                        value={values[item.key] ?? item.defaultValue}
                        disabled={loading || saving}
                        onChange={(value) => updateValue(item.key, value)}
                      />
                      <span className="text-[#5F6675]">{item.unit}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-md bg-[#F4F8FF] p-4 text-sm text-[#4D5A6D]">
                <strong>生效说明</strong>
                <div className="mt-3 space-y-2">
                  {SECURITY_CONFIG_ITEMS.map((item) => (
                    <p key={item.key}>
                      {item.label}：{item.description}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => validateSecurityValues() && setConfirmOpen(true)} disabled={loading || saving}>
                <Save className="mr-1 h-4 w-4" />
                {saving ? '保存中...' : '保存安全策略'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
      <ConfirmSaveDialog
        open={confirmOpen}
        title="安全策略保存确认"
        description="保存后会影响登录授权页短信验证码发送与校验频控，并记录配置变更日志。"
        reason={changeReason}
        saving={saving}
        onReasonChange={setChangeReason}
        onClose={() => setConfirmOpen(false)}
        onConfirm={saveSecurityConfig}
      />
    </Card>
  );
}

function AuditSlaConfigPanel() {
  const [hours, setHours] = useState('24');
  const [originHours, setOriginHours] = useState('24');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPrd01Config('PRD01_AUDIT');
      const data = responseData<AppConfigVO[]>(res, []);
      const savedHours = findConfigValue(data, EDUCATION_SLA_HOURS_KEY, '24');
      const nextHours = isPositiveInteger(savedHours) ? savedHours : '24';
      setHours(nextHours);
      setOriginHours(nextHours);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAuditSlaConfig() {
    if (!isPositiveInteger(hours)) {
      showToast('学历审核承诺时间必须是大于 0 的整数', 'error');
      return;
    }
    setSaving(true);
    try {
      const summary = `保存审核 SLA，学历审核承诺时间 ${hours} 小时`;
      await savePrd01Config(
        [numberConfig(EDUCATION_SLA_HOURS_KEY, hours, '学历审核承诺时间（小时）', 'PRD01_AUDIT')],
        {
          tabName: '审核 SLA',
          changeReason: '保存学历审核承诺时间',
          summary,
          changeDetailsJson: JSON.stringify({
            category: '审核 SLA',
            tabName: '审核 SLA',
            summary,
            changedCount: originHours === hours ? 0 : 1,
            changes: originHours === hours ? [] : [{
              group: '学历审核',
              label: '承诺处理时间',
              configKey: EDUCATION_SLA_HOURS_KEY,
              beforeValue: `${originHours} 小时`,
              afterValue: `${hours} 小时`,
            }],
          }),
        },
      );
      showToast('审核 SLA 已保存', 'success');
      setOriginHours(hours);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>审核 SLA</CardTitle>
        <p className="text-sm text-muted-foreground">仅配置学历审核承诺处理时间；移动端展示时间从该配置读取。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
              <div className="rounded-md border border-[#E6EDF7] p-4">
                <h3 className="font-semibold text-[#1F2433]">学历审核时限</h3>
                <label className="mt-4 flex items-center gap-3 text-sm text-[#4D5A6D]">
                  <span className="w-24">承诺处理时间</span>
                  <CompactNumberInput
                    value={hours}
                    disabled={loading || saving}
                    onChange={(value) => setHours(onlyDigits(value))}
                  />
                  <span>小时</span>
                </label>
                <p className="mt-3 text-xs text-muted-foreground">只能填写大于 0 的整数。</p>
              </div>
              <div className="rounded-md border border-[#E6EDF7] p-4">
                <h3 className="font-semibold text-[#1F2433]">展示口径</h3>
                <p className="mt-3 text-sm text-[#4D5A6D]">移动端学历认证审核中状态展示：预计 {hours || '24'} 小时内完成审核。</p>
                <p className="mt-2 text-sm text-[#4D5A6D]">头像、实名认证不配置 SLA，不展示催审入口。</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveAuditSlaConfig} disabled={loading || saving}>
                <Save className="mr-1 h-4 w-4" />
                {saving ? '保存中...' : '保存审核 SLA'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CopyConfigPanel() {
  const [rows, setRows] = useState<CopyConfigRow[]>(COPY_CONFIG_ROWS);
  const [originRows, setOriginRows] = useState<CopyConfigRow[]>(COPY_CONFIG_ROWS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPrd01Config('PRD01_AUDIT');
      const data = responseData<AppConfigVO[]>(res, []);
      const savedCopy = findConfigValue(data, COPY_CONFIG_KEY, '');
      const savedTextLength = findConfigValue(data, TEXT_LENGTH_CONFIG_KEY, '');
      const nextRows = mergeSavedCopyRows(COPY_CONFIG_ROWS, savedCopy, savedTextLength);
      setRows(nextRows);
      setOriginRows(nextRows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateRow(copyKey: string, patch: Partial<CopyConfigRow>) {
    setRows((prev) => prev.map((row) => (row.copyKey === copyKey ? { ...row, ...patch } : row)));
  }

  async function persistRows(nextRows: CopyConfigRow[], changeReason: string) {
    if (saving) return;
    const emptyEnabled = nextRows.find((row) => row.enabled && !row.content.trim());
    if (emptyEnabled) {
      showToast(`「${emptyEnabled.group} / ${emptyEnabled.scene}」启用时文案不能为空`, 'error');
      return;
    }
    const changes = buildCopyChanges(originRows, nextRows);
    if (changes.length === 0) {
      setRows(nextRows);
      return;
    }
    const rollbackRows = rows;
    setRows(nextRows);
    setSaving(true);
    try {
      const copyRows = nextRows.filter((row) => row.group !== '开放文本长度');
      const textLengthRows = nextRows.filter((row) => row.group === '开放文本长度');
      const summary = `更新文案配置，变更 ${changes.length} 项`;
      await savePrd01Config(
        [
          jsonConfig(COPY_CONFIG_KEY, copyRows, '准入/认证文案配置', 'PRD01_AUDIT'),
          jsonConfig(TEXT_LENGTH_CONFIG_KEY, textLengthRows, '开放文本长度文案配置', 'PRD01_AUDIT'),
        ],
        {
          tabName: '文案配置',
          changeReason,
          summary,
          changeDetailsJson: JSON.stringify({
            category: '文案配置',
            tabName: '文案配置',
            summary,
            changedCount: changes.length,
            changes,
          }),
        },
      );
      showToast('文案配置已更新', 'success');
      setOriginRows(nextRows);
    } catch {
      setRows(rollbackRows);
      showToast('文案配置保存失败，请稍后重试', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleContentBlur(copyKey: string, content: string) {
    const nextRows = rows.map((row) => (row.copyKey === copyKey ? { ...row, content } : row));
    void persistRows(nextRows, '编辑文案');
  }

  function handleToggle(copyKey: string, enabled: boolean) {
    const nextRows = rows.map((row) => (row.copyKey === copyKey ? { ...row, enabled } : row));
    void persistRows(nextRows, enabled ? '启用文案' : '关闭文案');
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>文案配置</CardTitle>
        <p className="text-sm text-muted-foreground">配置准入拦截、认证提示、协议、驳回模板、异常、内容安全与开放文本长度提示。</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#E6EDF7]">
            <table className="min-w-[1300px] w-full table-fixed text-left text-sm">
              <colgroup>
                <col style={{ width: 150 }} />
                <col style={{ width: 360 }} />
                <col />
                <col style={{ width: 110 }} />
              </colgroup>
              <thead className="bg-[#F7FAFE] text-[#5F6675]">
                <tr>
                  <th className="px-4 py-3 font-medium">文案组</th>
                  <th className="px-4 py-3 font-medium">使用场景</th>
                  <th className="px-4 py-3 font-medium">当前文案</th>
                  <th className="px-4 py-3 text-center font-medium">启用</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EDF7]">
                {rows.map((row) => (
                  <tr key={row.copyKey} className="bg-white align-top">
                    <td className="px-4 py-3 font-medium text-[#1F2433]">{row.group}</td>
                    <td className="px-4 py-3 text-[#4D5A6D]">
                        <div>{row.scene}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{row.copyKey}</div>
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        className="block h-[64px] min-w-[760px] w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm leading-5 shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        rows={2}
                        value={row.content}
                        disabled={saving}
                        onChange={(event) => updateRow(row.copyKey, { content: event.target.value })}
                        onBlur={(event) => handleContentBlur(row.copyKey, event.currentTarget.value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleButton
                        checked={row.enabled}
                        labels={{ active: '启用', inactive: '关闭' }}
                        disabled={saving}
                        onChange={(enabled) => handleToggle(row.copyKey, enabled)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfigLogDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<ContentOperationLogVO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ContentOperationLogVO | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await getPrd01ConfigLogs(page);
      const data = pageData<ContentOperationLogVO>(res);
      setLogs(data.records);
      setTotal(data.total);
      setSelected((prev) => {
        if (prev && data.records.some((item) => item.id === prev.id)) {
          return prev;
        }
        return data.records[0] ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [open, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (open) {
      setPage(1);
      setSelected(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} className="max-h-[86vh] max-w-[920px] overflow-hidden">
      <DialogHeader>
        <DialogTitle>变更日志</DialogTitle>
      </DialogHeader>
      <div className="mt-4 grid max-h-[74vh] gap-4 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col rounded-md border border-[#E6EDF7]">
          <div className="border-b border-[#E6EDF7] px-4 py-3 text-sm font-semibold text-[#1F2433]">
            日志列表
          </div>
          <div className="min-h-[300px] flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">加载中...</div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">暂无变更日志</div>
            ) : logs.map((log) => {
              const payload = parseLogPayload(log.afterValue);
              const active = selected?.id === log.id;
              return (
                <button
                  key={log.id}
                  type="button"
                  className={cn(
                    'mb-3 w-full rounded-md border p-3 text-left text-sm transition-colors',
                    active ? 'border-primary bg-primary/5' : 'border-[#E6EDF7] bg-white hover:bg-[#F7FAFE]',
                  )}
                  onClick={() => setSelected(log)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[#1F2433]">{payload.category || payload.tabName || actionLabel(log.action)}</span>
                    <Badge variant="secondary">{actionLabel(log.action)}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{log.createTime || '-'} · {log.operatorName || '-'}</div>
                  <div className="mt-2 line-clamp-2 text-[#4D5A6D]">{payload.summary || log.remark || '-'}</div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-[#E6EDF7] px-3 py-2 text-xs text-muted-foreground">
            <span>共 {total} 条，第 {page} / {totalPages} 页</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>上一页</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>下一页</Button>
            </div>
          </div>
        </div>

        <LogDetail log={selected} />
      </div>
    </Dialog>
  );
}

function LogDetail({ log }: { log: ContentOperationLogVO | null }) {
  const [selectedChangeIndex, setSelectedChangeIndex] = useState('0');

  useEffect(() => {
    setSelectedChangeIndex('0');
  }, [log?.id]);

  if (!log) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-[#D8E2F1] text-sm text-muted-foreground">
        暂无日志详情
      </div>
    );
  }

  const payload = parseLogPayload(log.afterValue);
  const changes = Array.isArray(payload.changes) ? payload.changes : [];
  const category = payload.category || payload.tabName || '配置';
  const selectedIndex = Math.min(Number(selectedChangeIndex) || 0, Math.max(changes.length - 1, 0));
  const selectedChange = changes[selectedIndex];
  const showDropdown = changes.length > 5;

  return (
    <div className="min-h-0 overflow-y-auto rounded-md border border-[#E6EDF7] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-[#1F2433]">{category}</div>
          <div className="mt-1 text-xs text-muted-foreground">{log.createTime || '-'} · {log.operatorName || '-'}</div>
        </div>
        <Badge variant="secondary">{actionLabel(log.action)}</Badge>
      </div>
      <div className="mt-4 grid gap-3 rounded-md bg-[#F7FAFE] p-3 text-sm text-[#4D5A6D] sm:grid-cols-2">
        <InfoLine label="配置分类" value={category} />
        <InfoLine label="变更项数" value={String(payload.changedCount ?? changes.length)} />
        <InfoLine className="sm:col-span-2" label="变更摘要" value={payload.summary || '-'} />
        {log.remark ? <InfoLine className="sm:col-span-2" label="变更原因" value={log.remark} /> : null}
      </div>

      {showDropdown ? (
        <div className="mt-4 space-y-3 rounded-md border border-[#E6EDF7] p-3">
          <div className="grid gap-2 text-sm">
            <label className="font-medium text-[#1F2433]">变更明细</label>
            <Select
              value={String(selectedIndex)}
              onChange={setSelectedChangeIndex}
              options={changes.map((change, index) => ({
                value: String(index),
                label: `${index + 1}. ${change.group || category} / ${change.label || change.configKey || '变更项'}`,
              }))}
            />
          </div>
          {selectedChange ? <ChangeDetailCard change={selectedChange} category={category} /> : <EmptyChangeDetail />}
        </div>
      ) : (
        <ChangeTable changes={changes} category={category} />
      )}
    </div>
  );
}

function InfoLine({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <span className="text-muted-foreground">{label}：</span>
      <span className="font-medium text-[#1F2433]">{value}</span>
    </div>
  );
}

function ChangeTable({ changes, category }: { changes: LogChange[]; category: string }) {
  return (
    <div className="mt-4 max-h-[360px] overflow-auto rounded-md border border-[#E6EDF7]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[#F7FAFE] text-[#5F6675]">
          <tr>
            <th className="px-3 py-2 font-medium">字段</th>
            <th className="px-3 py-2 font-medium">所属分类</th>
            <th className="px-3 py-2 font-medium">变更前</th>
            <th className="px-3 py-2 font-medium">变更后</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6EDF7]">
          {changes.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">暂无字段级明细</td>
            </tr>
          ) : changes.map((change, index) => (
            <tr key={`${change.fieldId ?? change.configKey ?? index}-${index}`}>
              <td className="px-3 py-2">
                <div className="font-medium text-[#1F2433]">{change.label || change.configKey || '-'}</div>
                <div className="text-xs text-muted-foreground">{change.fieldId || change.configKey || '-'}</div>
              </td>
              <td className="px-3 py-2 text-[#4D5A6D]">{change.group || change.category || category}</td>
              <td className="px-3 py-2 text-[#4D5A6D]">{formatValue(change.beforeValue)}</td>
              <td className="px-3 py-2 text-[#4D5A6D]">{formatValue(change.afterValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeDetailCard({ change, category }: { change: LogChange; category: string }) {
  return (
    <div className="rounded-md bg-[#F7FAFE] p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoLine label="字段" value={change.label || change.configKey || '-'} />
        <InfoLine label="所属分类" value={change.group || change.category || category} />
        <InfoLine className="sm:col-span-2" label="字段 ID" value={change.fieldId || change.configKey || '-'} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-[#E6EDF7] bg-white p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">变更前</div>
          <div className="text-[#4D5A6D]">{formatValue(change.beforeValue)}</div>
        </div>
        <div className="rounded-md border border-[#E6EDF7] bg-white p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">变更后</div>
          <div className="text-[#4D5A6D]">{formatValue(change.afterValue)}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyChangeDetail() {
  return <div className="rounded-md border border-dashed border-[#D8E2F1] p-8 text-center text-sm text-muted-foreground">暂无字段级明细</div>;
}

function ConfirmSaveDialog({
  open,
  title,
  description,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  reason: string;
  saving: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 space-y-4 text-sm text-[#5F6675]">
        <div className="rounded-md bg-[#FFF7E8] p-4 text-[#8A5A00]">{description}</div>
        <Input
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="请输入变更原因"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
          <Button variant="primary" onClick={onConfirm} disabled={saving || !reason.trim()}>
            {saving ? '保存中...' : '确认保存'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function renderFieldSwitch(
  row: FieldConfigRow,
  field: 'visible' | 'required' | 'scoreEnabled',
  updateRow: (fieldId: string, patch: Partial<FieldConfigRow>) => void,
  disabled = false,
) {
  const mode = field === 'visible' ? row.displayMode : field === 'required' ? row.requiredMode : row.scoreMode;
  const labels = field === 'required'
    ? { active: '选填', inactive: '选填' }
    : fieldControlLabels(field);
  if (mode !== 'configurable') {
    const fixedLabels = mode === 'conditional' && field !== 'required'
      ? { active: '条件必填', inactive: '条件选填' }
      : labels;
    return <FixedBadge active={Boolean(row[field])} labels={fixedLabels} reason={fixedControlReason(row, field, mode)} />;
  }
  return (
    <ToggleButton
      checked={Boolean(row[field])}
      labels={labels}
      disabled={disabled}
      onChange={(checked) => {
        if (field === 'visible' && !checked) {
          updateRow(row.fieldId, { visible: false, required: false, scoreEnabled: false });
          return;
        }
        updateRow(row.fieldId, { [field]: checked });
      }}
    />
  );
}

function fieldControlLabels(field: 'visible' | 'required' | 'scoreEnabled') {
  if (field === 'visible') return { active: '展示', inactive: '隐藏' };
  if (field === 'required') return { active: '必填', inactive: '选填' };
  return { active: '计分', inactive: '不计' };
}

function ToggleButton({
  checked,
  labels,
  disabled,
  onChange,
}: {
  checked: boolean;
  labels: { active: string; inactive: string };
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      className={cn(
        'inline-flex h-7 min-w-[46px] items-center justify-center rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
        checked
          ? 'border-primary bg-primary text-white hover:bg-primary/90'
          : 'border-[#C8D5E8] bg-white text-[#64748B] hover:border-primary/50 hover:bg-[#F7FAFF]',
        disabled && 'cursor-not-allowed opacity-60 hover:border-[#C8D5E8] hover:bg-white',
      )}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      {checked ? labels.active : labels.inactive}
    </button>
  );
}

function fixedControlReason(row: FieldConfigRow, field: 'visible' | 'required' | 'scoreEnabled', mode: ControlMode) {
  if (mode === 'conditional') return '按业务条件决定是否必填，不提供人工开关';
  if (field === 'visible' && ['height', 'weight', 'hometownProvince', 'hometownCity'].includes(row.fieldId)) {
    return '编辑资料基础信息固定展示，必填和计分仍可单独配置';
  }
  if (field === 'visible') return '登录或认证流程字段固定展示，不允许关闭';
  if (field === 'required') return '登录或认证流程字段固定必填，不允许改为选填';
  return '该属性由系统流程固定，不提供人工配置';
}

function FixedBadge({ active, labels, reason }: { active: boolean; labels: { active: string; inactive: string }; reason: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-[46px] cursor-not-allowed items-center justify-center rounded-full px-3 text-xs font-semibold',
        active ? 'bg-[#EEF3F9] text-[#98A6B8]' : 'bg-[#F6F8FB] text-[#B6C0CC]',
      )}
      title={reason}
    >
      {active ? labels.active : labels.inactive}
    </span>
  );
}

function findConfigValue(items: AppConfigVO[], configKey: string, fallback: string) {
  return items.find((item) => item.configKey === configKey && item.status !== 'DISABLED')?.configValue ?? fallback;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isPositiveInteger(value: string) {
  return /^[1-9]\d*$/.test(value.trim());
}

function isNonNegativeInteger(value: string) {
  return /^(0|[1-9]\d*)$/.test(value.trim());
}

function accessConfig(configKey: string, configValue: string, remark: string): Partial<AppConfigVO> {
  return {
    configKey,
    configValue,
    configGroup: 'PRD01_ACCESS',
    configType: 'NUMBER',
    publicVisible: 0,
    status: 'ENABLED',
    remark,
  };
}

function numberConfig(configKey: string, configValue: string, remark: string, configGroup: Prd01ConfigGroup): Partial<AppConfigVO> {
  return {
    configKey,
    configValue,
    configGroup,
    configType: 'NUMBER',
    publicVisible: 0,
    status: 'ENABLED',
    remark,
  };
}

function jsonConfig(configKey: string, rows: unknown, remark: string, configGroup: Prd01ConfigGroup = 'PRD01_PROFILE_FIELD'): Partial<AppConfigVO> {
  return {
    configKey,
    configValue: JSON.stringify({ rows }),
    configGroup: configKey.startsWith('prd01.upload') ? 'PRD01_UPLOAD' : configGroup,
    configType: 'JSON',
    publicVisible: 0,
    status: 'ENABLED',
    remark,
  };
}

function mergeSavedFieldRows(saved: string) {
  const savedRows = parseSavedRows(saved);
  if (savedRows.length === 0) return FIELD_CONFIG_ROWS;
  return FIELD_CONFIG_ROWS.map((row) => {
    const match = savedRows.find((item: any) => item.fieldId === row.fieldId);
    if (!match) return row;
    return {
      ...row,
      visible: row.displayMode === 'configurable' && typeof match.visible === 'boolean' ? match.visible : row.visible,
      required: row.requiredMode === 'configurable' && typeof match.required === 'boolean' ? match.required : row.required,
      scoreEnabled: row.scoreMode === 'configurable' && typeof match.scoreEnabled === 'boolean' ? match.scoreEnabled : row.scoreEnabled,
    };
  });
}

function mergeSavedScoreRows(saved: string, baseRows: FieldConfigRow[] = FIELD_CONFIG_ROWS) {
  const scoreRows = baseRows.filter((row) => row.scoreMode === 'configurable');
  const savedRows = parseSavedRows(saved);
  return scoreRows.map((row) => {
    const scores = mergeSavedScoreValues(row, savedRows);
    return {
      ...row,
      ...scores,
    };
  });
}

function mergeScoresIntoRows(rows: FieldConfigRow[], saved: string) {
  const savedRows = parseSavedRows(saved);
  return rows.map((row) => {
    const scores = mergeSavedScoreValues(row, savedRows);
    return {
      ...row,
      ...scores,
    };
  });
}

function mergeSavedScoreValues(row: FieldConfigRow, savedRows: any[]) {
  const match = savedRows.find((item: any) => item.fieldId === row.fieldId);
  let studentScore = Number(match?.studentScore ?? row.studentScore) || 0;
  let workerScore = Number(match?.workerScore ?? row.workerScore) || 0;

  for (const migration of REMOVED_SCORE_MIGRATIONS) {
    if (migration.targetFieldId !== row.fieldId) continue;
    const legacy = savedRows.length === 0
      ? migration
      : savedRows.find((item: any) => item.fieldId === migration.fieldId);
    if (!legacy) continue;
    studentScore += Number(legacy.studentScore ?? migration.studentScore) || 0;
    workerScore += Number(legacy.workerScore ?? migration.workerScore) || 0;
  }

  return { studentScore: String(studentScore), workerScore: String(workerScore) };
}

function mergeSavedUploadRules<T extends { key: string; maxCount: string; maxMb: string; format: string }>(defaults: T[], saved: string): T[] {
  const savedRows = parseSavedRows(saved);
  if (savedRows.length === 0) return defaults;
  return defaults.map((rule) => {
    const match = savedRows.find((item: any) => item.key === rule.key);
    if (!match) return rule;
    return {
      ...rule,
      maxCount: String(match.maxCount ?? rule.maxCount),
      maxMb: String(match.maxMb ?? rule.maxMb),
      format: String(match.format ?? rule.format),
    };
  });
}

function defaultSecurityValues() {
  return SECURITY_CONFIG_ITEMS.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = item.defaultValue;
    return acc;
  }, {});
}

function mergeSavedSecurityValues(saved: string) {
  const defaults = defaultSecurityValues();
  const savedRows = parseSavedRows(saved);
  if (savedRows.length === 0) return defaults;
  return SECURITY_CONFIG_ITEMS.reduce<Record<string, string>>((acc, item) => {
    const match = savedRows.find((row: any) => row.key === item.key);
    acc[item.key] = String(match?.value ?? item.defaultValue);
    return acc;
  }, {});
}

function mergeSavedCopyRows(defaults: CopyConfigRow[], savedCopy: string, savedTextLength: string): CopyConfigRow[] {
  const savedRows = [...parseSavedRows(savedCopy), ...parseSavedRows(savedTextLength)];
  if (savedRows.length === 0) return defaults;
  return defaults.map((row) => {
    const match = savedRows.find((item: any) => item.copyKey === row.copyKey);
    if (!match) return row;
    return {
      ...row,
      content: String(match.content ?? row.content),
      enabled: typeof match.enabled === 'boolean' ? match.enabled : row.enabled,
    };
  });
}

function hasConfiguredScore(row: FieldConfigRow) {
  return (Number(row.studentScore) || 0) > 0 || (Number(row.workerScore) || 0) > 0;
}

function parseSavedRows(saved: string): any[] {
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.rows)) return parsed.rows;
    return [];
  } catch {
    return [];
  }
}

function buildFieldChanges(beforeRows: FieldConfigRow[], afterRows: FieldConfigRow[]) {
  const beforeMap = new Map(beforeRows.map((row) => [row.fieldId, row]));
  const changes: LogChange[] = [];
  afterRows.forEach((row) => {
    const before = beforeMap.get(row.fieldId);
    if (!before) return;
    const beforeValue = fieldConfigSnapshot(before);
    const afterValue = fieldConfigSnapshot(row);
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes.push({
        category: '字段配置',
        group: row.group,
        label: row.label,
        fieldId: row.fieldId,
        beforeValue,
        afterValue,
      });
    }
  });
  return changes;
}

function buildScoreChanges(beforeRows: FieldConfigRow[], afterRows: FieldConfigRow[]) {
  const beforeMap = new Map(beforeRows.map((row) => [row.fieldId, row]));
  const changes: LogChange[] = [];
  afterRows.forEach((row) => {
    const before = beforeMap.get(row.fieldId);
    if (!before) return;
    const beforeValue = { 在校生: before.studentScore, 职场人: before.workerScore };
    const afterValue = { 在校生: row.studentScore, 职场人: row.workerScore };
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes.push({
        category: '资料完整度',
        group: row.group,
        label: row.label,
        fieldId: row.fieldId,
        beforeValue,
        afterValue,
      });
    }
  });
  return changes;
}

function buildSecurityChanges(beforeValues: Record<string, string>, afterValues: Record<string, string>) {
  return SECURITY_CONFIG_ITEMS.flatMap((item) => {
    const beforeValue = beforeValues[item.key] ?? item.defaultValue;
    const afterValue = afterValues[item.key] ?? item.defaultValue;
    const change = buildConfigChange(
      '短信验证码频控',
      item.label,
      `${SMS_SECURITY_CONFIG_KEY}.${item.key}`,
      `${beforeValue} ${item.unit}`,
      `${afterValue} ${item.unit}`,
    );
    return change ? [change] : [];
  });
}

function buildCopyChanges(beforeRows: CopyConfigRow[], afterRows: CopyConfigRow[]) {
  const beforeMap = new Map(beforeRows.map((row) => [row.copyKey, row]));
  const changes: LogChange[] = [];
  afterRows.forEach((row) => {
    const before = beforeMap.get(row.copyKey);
    if (!before) return;
    const beforeValue = copyConfigSnapshot(before);
    const afterValue = copyConfigSnapshot(row);
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes.push({
        category: '文案配置',
        group: row.group,
        label: row.scene,
        configKey: row.copyKey,
        beforeValue,
        afterValue,
      });
    }
  });
  return changes;
}

function fieldConfigSnapshot(row: FieldConfigRow) {
  return {
    展示: controlText('visible', row.visible),
    必填: controlText('required', row.required),
    计分: controlText('scoreEnabled', row.scoreEnabled),
  };
}

function copyConfigSnapshot(row: CopyConfigRow) {
  return {
    文案: row.content,
    启用状态: row.enabled ? '启用' : '关闭',
  };
}

function controlText(field: 'visible' | 'required' | 'scoreEnabled', active: boolean) {
  const labels = fieldControlLabels(field);
  return active ? labels.active : labels.inactive;
}

function buildConfigChange(group: string, label: string, configKey: string, beforeValue: string, afterValue: string): LogChange | null {
  if (beforeValue === afterValue) return null;
  return { group, label, configKey, beforeValue, afterValue };
}

function sumScores(rows: FieldConfigRow[], field: 'studentScore' | 'workerScore') {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function parseLogPayload(value: string): LogPayload {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : { summary: String(parsed) };
  } catch {
    return { summary: value };
  }
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    BATCH_SAVE: '批量保存',
    UPDATE: '更新',
    CREATE: '新增',
    DELETE: '删除',
  };
  return map[action] ?? action ?? '-';
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.map(formatValue).join('；');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}：${formatValue(item)}`)
      .join('；');
  }
  return String(value);
}
