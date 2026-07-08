import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ui/toast';
import type { AppConfigVO } from '@/api/content';
import { getPrd01Config, savePrd01Config, type Prd01ConfigGroup } from '@/api/prd01Config';

type AccessConfigTab = Prd01ConfigGroup | 'SCORE' | 'SLA' | 'COPY' | 'SECURITY';

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

const DEFAULT_CONFIGS: Record<Prd01ConfigGroup, AppConfigVO[]> = {
  PRD01_ACCESS: [
    config('prd01.access.requireRealName', 'true', 'BOOLEAN', '必须实名通过'),
    config('prd01.access.requireAvatar', 'true', 'BOOLEAN', '必须头像通过'),
    config('prd01.access.requireEducation', 'true', 'BOOLEAN', '必须学历通过'),
    config('prd01.access.minProfileScore', '80', 'NUMBER', '资料完整度最低分'),
  ],
  PRD01_PROFILE_FIELD: [
    config('prd01.profile.requireAboutMe', 'true', 'BOOLEAN', '关于我必填'),
    config('prd01.profile.requireHopeTheyKnow', 'true', 'BOOLEAN', '希望 TA 了解必填'),
    config('prd01.profile.requireQaCount', '3', 'NUMBER', '资料问答最少条数'),
    config('prd01.profile.allowOverseasRegion', 'false', 'BOOLEAN', '现居地/家乡不支持海外国家'),
  ],
  PRD01_UPLOAD: [
    config('prd01.upload.avatar.max_mb', '5', 'NUMBER', '头像最大 MB'),
    config('prd01.upload.album.max_count', '6', 'NUMBER', '相册最多张数'),
    config('prd01.upload.voice.min_duration', '10', 'NUMBER', '语音介绍最短秒数'),
    config('prd01.upload.voice.max_duration', '60', 'NUMBER', '语音介绍最长秒数'),
  ],
  PRD01_AUDIT: [
    config('prd01.audit.voice.provider', 'MOCK', 'TEXT', '语音 Provider 首版 mock 成功'),
    config('prd01.audit.text.provider', 'MOCK', 'TEXT', '文字 Provider 首版 mock 成功'),
    config('prd01.audit.open_text.types', 'ABOUT_ME,HOPE_THEY_KNOW,PROFILE_QA', 'TEXT', '开放性文字审核类型'),
    config('prd01.audit.show_source', 'true', 'BOOLEAN', '审核来源筛选与列表展示'),
  ],
};

const STATIC_TAB_ROWS: Record<Exclude<AccessConfigTab, Prd01ConfigGroup>, { title: string; rows: string[][]; note: string } > = {
  SCORE: {
    title: '资料完整度',
    note: '修改计分项需要二次确认，保存完整度配置后只影响后续评分重算。',
    rows: [
      ['头像', '10', '必填', '计分'],
      ['昵称/性别/生日', '20', '必填', '计分'],
      ['现居地/家乡', '15', '必填', '计分'],
      ['关于我/希望 TA 了解', '25', '必填', '计分'],
      ['资料问答 3 条', '30', '必填', '计分'],
    ],
  },
  SLA: {
    title: '审核 SLA',
    note: '学历材料承诺 24 小时内处理；实名认证和头像认证不提供催审入口。',
    rows: [
      ['学历审核时限', '24 小时', '临期 22h', '超时 28h'],
      ['实名认证审核', '系统优先', '无人工 SLA', '无催审'],
      ['头像认证审核', '机审优先', '人工复核', '无催审'],
    ],
  },
  COPY: {
    title: '文案配置',
    note: '编辑文案配置后写入变更日志；驳回提交时必须选择或填写原因。',
    rows: [
      ['准入拦截', '三重认证未达成', '请完成实名、头像、学历三重认证后继续使用', '启用'],
      ['认证提示', '实名认证页', '实名信息仅用于身份核验', '启用'],
      ['第三方不可用', '认证服务暂不可用，请稍后重试', '移动端弹窗', '启用'],
      ['头像驳回模板', '头像不符合展示规范，请重新上传', '头像审核', '启用'],
    ],
  },
  SECURITY: {
    title: '安全策略',
    note: '语音内容安全走 Provider 抽象，首版 mock 成功；保存必须填写变更原因。',
    rows: [
      ['短信验证码频控', '60 秒/次', '后台导入不触发短信校验', '启用'],
      ['验证码有效期', '5 分钟', '超过后需重新获取', '启用'],
      ['语音内容安全', 'Provider MOCK', '内容安全未通过', '启用'],
    ],
  },
};

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

function responseData<T>(res: unknown, fallback: T): T {
  return (res as any)?.data ?? fallback;
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
            <span className="sr-only">准入与认证配置 / 准入门槛 Tab</span>
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
      <Dialog open={logOpen} onClose={() => setLogOpen(false)} className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>变更日志抽屉页</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3 text-sm text-[#4D5A6D]">
          {[
            ['2026-07-07 17:30', '系统管理员', '保存安全策略', '语音 Provider=MOCK，审计单号 CFG-20260707-001'],
            ['2026-07-07 16:42', '运营主管', '保存上传限制', '相册最多 6 张，背景图不计入相册数量'],
            ['2026-07-07 15:18', '系统管理员', '保存准入门槛', '三重认证不可降级为单项实名'],
          ].map((row) => (
            <div key={row.join('-')} className="rounded-md border border-[#E6EDF7] p-3">
              <div className="font-medium text-[#1F2433]">{row[2]}</div>
              <div className="mt-1 text-xs text-muted-foreground">{row[0]} · {row[1]}</div>
              <div className="mt-2">{row[3]}</div>
            </div>
          ))}
        </div>
      </Dialog>
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
      await savePrd01Config(items.map((item) => ({
        configKey: item.configKey,
        configValue: item.configValue,
        configGroup: group,
        configType: item.configType,
        publicVisible: item.publicVisible,
        status: item.status,
        remark: item.remark,
      })));
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

  if (group === 'PRD01_UPLOAD') {
    return <UploadConfigPanel />;
  }

  if (!isConfigGroup(group)) {
    return <StaticConfigPanel group={group} />;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>配置项</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading || saving}>
            <RotateCcw className="mr-1 h-4 w-4" />
            重置
          </Button>
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={loading || saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
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
      </CardContent>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>高风险配置保存确认</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4 text-sm text-[#5F6675]">
          <div className="rounded-md bg-[#FFF7E8] p-4 text-[#8A5A00]">
            保存后会写入配置版本和审计记录；准入门槛不允许降低为单项实名。
          </div>
          <Input
            value={changeReason}
            onChange={(event) => setChangeReason(event.target.value)}
            placeholder="请输入变更原因"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>取消</Button>
            <Button variant="primary" onClick={save} disabled={saving || !changeReason.trim()}>
              {saving ? '保存中...' : '确认保存'}
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

function AccessGatePanel() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>配置项</CardTitle>
        <p className="text-sm text-muted-foreground">核心准入默认三重认证通过，不允许降低为单项实名。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-[#E6EDF7] p-4">
            <h3 className="font-semibold text-[#1F2433]">年龄范围</h3>
            <div className="mt-3 grid gap-2 text-sm text-[#5F6675]">
              <label>最小年龄 <Input defaultValue="18" className="mt-1" /></label>
              <label>最大年龄 <Input defaultValue="60" className="mt-1" /></label>
            </div>
            <Button className="mt-3" size="sm" onClick={() => showToast('年龄范围已进入待保存状态', 'success')}>保存年龄</Button>
          </div>
          <div className="rounded-md border border-[#E6EDF7] p-4">
            <h3 className="font-semibold text-[#1F2433]">核心准入门槛</h3>
            <p className="mt-3 text-sm text-[#5F6675]">实名、头像、学历</p>
            <p className="mt-2 text-sm text-[#5F6675]">资料：填写、相册、标签、社区</p>
            <strong className="mt-3 block text-sm text-[#C47A00]">不可配置为单项实名</strong>
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
          <p className="mt-2">高风险配置保存确认：保存前填写变更原因，确认保存后写入配置版本和审计单号。</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldConfigPanel() {
  const rows = [
    ['轻量资料', '性别 gender', '性别选择页、基本资料页', '展示', '必填', '计分'],
    ['轻量资料', '最高学历 education', '学历选择页、基本资料页', '展示', '可选', '计分'],
    ['基础资料', '职业 occupation', '基本资料页、基础资料编辑页', '展示', '可选', '计分'],
    ['扩展资料', '个人标签 tags', '标签页、编辑资料页', '展示', '可选', '计分'],
    ['实名认证', '身份证号 idCardNo', '实名认证页', '脱敏', '必填', '不计'],
    ['学历认证', '学信网验证码 / 学生证材料', '学历认证页', '展示', '必填', '不计'],
  ];
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>字段配置</CardTitle>
        <p className="text-sm text-muted-foreground">关闭「展示」会同步关联「必填」与「计分」。</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-[#E6EDF7]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F7FAFE] text-[#5F6675]">
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
                <tr key={row.join('-')} className="bg-white">
                  {row.map((cell) => <td key={cell} className="px-4 py-3 text-[#2B3043]">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadConfigPanel() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>上传限制</CardTitle>
        <p className="text-sm text-muted-foreground">图片上传限制按资料类型拆分，音频介绍由安全策略控制。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['学历材料', '数量上限 4 张', '单张大小 10 MB', '格式：jpg / jpeg / png'],
            ['相册照片', '数量上限 9 张', '移动端：资料编辑页展示', '方式：jpg / jpeg / png'],
            ['资料背景图', '数量上限 1 张', '单张大小 10 MB', '进入资料图片审核，不计入相册计数'],
          ].map((card) => (
            <div key={card[0]} className="rounded-md border border-[#E6EDF7] p-4">
              <h3 className="font-semibold text-[#1F2433]">{card[0]}</h3>
              <div className="mt-3 space-y-2 text-sm text-[#5F6675]">
                {card.slice(1).map((line) => <p key={line}>{line}</p>)}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-md bg-[#F4F8FF] p-4 text-sm text-[#4D5A6D]">
          文件格式与提示文案：文件过大 / 格式不支持 / 内容安全失败 / 上传失败可重试。
        </div>
        <Button size="sm" onClick={() => showToast('上传限制已保存，等待高风险确认', 'success')}>保存上传限制</Button>
      </CardContent>
    </Card>
  );
}

function StaticConfigPanel({ group }: { group: Exclude<AccessConfigTab, Prd01ConfigGroup> }) {
  const panel = STATIC_TAB_ROWS[group];
  const saveLabelMap: Record<Exclude<AccessConfigTab, Prd01ConfigGroup>, string> = {
    SCORE: '保存完整度配置',
    SLA: '保存审核 SLA',
    COPY: '保存文案配置',
    SECURITY: '保存安全策略',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{panel.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{panel.note}</p>
        </div>
        <Button size="sm" onClick={() => showToast('请在二次确认后保存配置', 'success')}>
          <Save className="mr-1 h-4 w-4" />
          {saveLabelMap[group]}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-[#E6EDF7]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F7FAFE] text-[#5F6675]">
              <tr>
                <th className="px-4 py-3 font-medium">配置项</th>
                <th className="px-4 py-3 font-medium">当前值</th>
                <th className="px-4 py-3 font-medium">规则</th>
                <th className="px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EDF7]">
              {panel.rows.map((row) => (
                <tr key={row.join('-')} className="bg-white">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3 text-[#2B3043]">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
