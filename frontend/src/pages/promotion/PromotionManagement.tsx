import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Edit, Plus, QrCode, RefreshCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  approvePromotionReward,
  confirmPromotionSettlement,
  createPromotionAgent,
  createPromotionRule,
  getPromotionAgents,
  getPromotionInvites,
  getPromotionRewards,
  getPromotionRules,
  getPromotionSettlements,
  paidPromotionSettlement,
  regeneratePromotionAgentQrCode,
  rejectPromotionReward,
  updatePromotionAgent,
  updatePromotionAgentStatus,
  updatePromotionRule,
  updatePromotionRuleStatus,
  type PageResult,
  type PromotionAgentVO,
  type PromotionInviteRelationVO,
  type PromotionRewardLogVO,
  type PromotionRuleVO,
  type PromotionSettlementVO,
} from '@/api/promotion';
import { cn } from '@/lib/utils';

type TabKey = 'rules' | 'invites' | 'rewards' | 'agents' | 'settlements';

const TABS: { key: TabKey; title: string; path: string }[] = [
  { key: 'rules', title: '规则配置', path: '/promotion/rules' },
  { key: 'invites', title: '邀请关系', path: '/promotion/invites' },
  { key: 'rewards', title: '奖励审核', path: '/promotion/rewards' },
  { key: 'agents', title: '校园代理', path: '/promotion/agents' },
  { key: 'settlements', title: '代理结算', path: '/promotion/settlements' },
];

const RULE_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'user_invite', label: '普通邀请' },
  { value: 'agent_bonus', label: '代理奖金' },
];

const RULE_EVENT_OPTIONS = [
  { value: '', label: '全部事件' },
  { value: 'register_login_reward', label: '注册登录奖励' },
  { value: 'profile_complete_reward', label: '资料完善奖励' },
  { value: 'verify_complete_reward', label: '认证完成奖励' },
  { value: 'first_vip_reward', label: '首次会员奖励' },
  { value: 'first_coin_recharge_reward', label: '首次充值奖励' },
];

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'user_qr', label: '普通用户' },
  { value: 'agent_qr', label: '校园代理' },
];

const REWARD_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待发放' },
  { value: 'success', label: '已发放' },
  { value: 'frozen', label: '冻结' },
  { value: 'invalid', label: '无效' },
];

const INVITE_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'registered', label: '已注册' },
  { value: 'profile_completed', label: '已完善资料' },
  { value: 'verify_success', label: '已认证' },
];

const AGENT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'paused', label: '暂停' },
  { value: 'terminated', label: '终止' },
];

const SETTLEMENT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'paid', label: '已发放' },
  { value: 'cancelled', label: '已取消' },
];

function getTabFromPath(pathname: string): TabKey {
  return TABS.find((tab) => pathname.startsWith(tab.path))?.key ?? 'rules';
}

function pageData<T>(res: unknown): PageResult<T> {
  return ((res as any).data ?? { records: [], total: 0, current: 1, size: 10 }) as PageResult<T>;
}

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const label = labelOf(status, STATUS_LABELS);
  const success = ['ENABLED', 'normal', 'success', 'paid', 'enabled'].includes(status);
  const warning = ['pending', 'frozen', 'paused', 'confirmed'].includes(status);
  const danger = ['DISABLED', 'invalid', 'terminated', 'cancelled', 'disabled'].includes(status);
  return (
    <Badge variant={success ? 'success' : warning ? 'warning' : danger ? 'destructive' : 'secondary'}>
      {label}
    </Badge>
  );
}

const STATUS_LABELS: Record<string, string> = {
  ENABLED: '启用',
  DISABLED: '停用',
  enabled: '启用',
  disabled: '停用',
  normal: '正常',
  paused: '暂停',
  terminated: '终止',
  pending: '待处理',
  confirmed: '已确认',
  paid: '已发放',
  cancelled: '已取消',
  success: '成功',
  frozen: '冻结',
  invalid: '无效',
  registered: '已注册',
  profile_completed: '已完善资料',
  verify_success: '已认证',
};

const RULE_TYPE_LABELS = Object.fromEntries(RULE_TYPE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]));
const EVENT_LABELS = Object.fromEntries(RULE_EVENT_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]));
const SOURCE_LABELS = {
  ...Object.fromEntries(SOURCE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])),
};
const UNIT_LABELS: Record<string, string> = { coin: '成家币', cash: '现金' };
const RISK_LABELS: Record<string, string> = { self_invite: '自己邀请自己', same_phone: '手机号重复', abnormal_device: '设备异常' };

function labelOf(value: string | undefined, labels: Record<string, string>) {
  if (!value) return '-';
  return labels[value] ?? value;
}

function num(value?: number | string) {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
}

function qrImageUrl(text: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(text)}`;
}

export default function PromotionManagement() {
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);

  return (
    <div className="space-y-4">
      {activeTab === 'rules' && <RulesPanel />}
      {activeTab === 'invites' && <InvitesPanel />}
      {activeTab === 'rewards' && <RewardsPanel />}
      {activeTab === 'agents' && <AgentsPanel />}
      {activeTab === 'settlements' && <SettlementsPanel />}
    </div>
  );
}

function RulesPanel() {
  const [list, setList] = useState<PromotionRuleVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ ruleType: '', eventType: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRuleVO | null>(null);
  const [form, setForm] = useState({
    ruleName: '',
    ruleType: 'user_invite',
    eventType: 'register_login_reward',
    rewardAmount: '0',
    rewardUnit: 'coin',
    dailyLimit: '',
    effectiveTime: '',
    expireTime: '',
    status: 'ENABLED',
    remark: '',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionRuleVO>(await getPromotionRules({ page, size: 10, ruleType: query.ruleType || undefined, eventType: query.eventType || undefined, status: query.status || undefined }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({ ruleName: '', ruleType: 'user_invite', eventType: 'register_login_reward', rewardAmount: '0', rewardUnit: 'coin', dailyLimit: '', effectiveTime: '', expireTime: '', status: 'ENABLED', remark: '' });
    setDialogOpen(true);
  }

  function openEdit(row: PromotionRuleVO) {
    setEditing(row);
    setForm({
      ruleName: row.ruleName,
      ruleType: row.ruleType,
      eventType: row.eventType,
      rewardAmount: String(row.rewardAmount ?? 0),
      rewardUnit: row.rewardUnit ?? 'coin',
      dailyLimit: row.dailyLimit ? String(row.dailyLimit) : '',
      effectiveTime: row.effectiveTime?.slice(0, 16) ?? '',
      expireTime: row.expireTime?.slice(0, 16) ?? '',
      status: row.status ?? 'ENABLED',
      remark: row.remark ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = {
      ...form,
      rewardAmount: Number(form.rewardAmount || 0),
      dailyLimit: num(form.dailyLimit),
      effectiveTime: form.effectiveTime || undefined,
      expireTime: form.expireTime || undefined,
      remark: form.remark || undefined,
    };
    if (editing) await updatePromotionRule(editing.id, payload);
    else await createPromotionRule(payload);
    setDialogOpen(false);
    fetchList();
  }

  function handleSearch() {
    setPage(1);
    setQuery(filters);
  }

  function handleReset() {
    const empty = { ruleType: '', eventType: '', status: '' };
    setFilters(empty);
    setPage(1);
    setQuery(empty);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>规则配置</CardTitle>
        <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增规则</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="w-36" options={RULE_TYPE_OPTIONS} value={filters.ruleType} onChange={(v) => setFilters({ ...filters, ruleType: v })} />
          <Select className="w-44" options={RULE_EVENT_OPTIONS} value={filters.eventType} onChange={(v) => setFilters({ ...filters, eventType: v })} />
          <Select className="w-32" options={[{ value: '', label: '全部状态' }, { value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>规则</TableHead><TableHead>类型</TableHead><TableHead>事件</TableHead><TableHead>奖励</TableHead><TableHead>上限</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><div className="font-medium">{row.ruleName}</div><div className="text-xs text-muted-foreground">{row.remark || '-'}</div></TableCell>
                <TableCell>{labelOf(row.ruleType, RULE_TYPE_LABELS)}</TableCell>
                <TableCell>{labelOf(row.eventType, EVENT_LABELS)}</TableCell>
                <TableCell>{row.rewardAmount} {labelOf(row.rewardUnit, UNIT_LABELS)}</TableCell>
                <TableCell>{row.dailyLimit ?? '-'}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => updatePromotionRuleStatus(row.id, row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED').then(fetchList)}>{row.status === 'ENABLED' ? '停用' : '启用'}</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? '编辑规则' : '新增规则'}</DialogTitle><DialogDescription>配置普通邀请或代理奖金规则</DialogDescription></DialogHeader>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="space-y-1 text-sm font-medium">规则名称<Input value={form.ruleName} onChange={(e) => setForm({ ...form, ruleName: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">规则类型<Select options={RULE_TYPE_OPTIONS.filter((o) => o.value)} value={form.ruleType} onChange={(v) => setForm({ ...form, ruleType: v })} /></label>
          <label className="space-y-1 text-sm font-medium">奖励事件<Select options={RULE_EVENT_OPTIONS.filter((o) => o.value)} value={form.eventType} onChange={(v) => setForm({ ...form, eventType: v })} /></label>
          <label className="space-y-1 text-sm font-medium">奖励单位<Select options={[{ value: 'coin', label: '成家币' }, { value: 'cash', label: '现金' }]} value={form.rewardUnit} onChange={(v) => setForm({ ...form, rewardUnit: v })} /></label>
          <label className="space-y-1 text-sm font-medium">奖励金额<Input type="number" value={form.rewardAmount} onChange={(e) => setForm({ ...form, rewardAmount: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">单日上限<Input type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">生效时间<Input type="datetime-local" value={form.effectiveTime} onChange={(e) => setForm({ ...form, effectiveTime: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">失效时间<Input type="datetime-local" value={form.expireTime} onChange={(e) => setForm({ ...form, expireTime: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">状态<Select options={[{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} value={form.status} onChange={(v) => setForm({ ...form, status: v })} /></label>
          <label className="col-span-2 space-y-1 text-sm font-medium">备注<Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></div>
      </Dialog>
    </Card>
  );
}

function InvitesPanel() {
  const [list, setList] = useState<PromotionInviteRelationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ inviterKeyword: '', inviteeKeyword: '', sourceType: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionInviteRelationVO>(await getPromotionInvites({
        page,
        size: 10,
        inviterKeyword: query.inviterKeyword || undefined,
        inviteeKeyword: query.inviteeKeyword || undefined,
        sourceType: query.sourceType || undefined,
        status: query.status || undefined,
      }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);
  useEffect(() => { fetchList(); }, [fetchList]);

  function handleSearch() {
    setPage(1);
    setQuery(filters);
  }

  function handleReset() {
    const empty = { inviterKeyword: '', inviteeKeyword: '', sourceType: '', status: '' };
    setFilters(empty);
    setPage(1);
    setQuery(empty);
  }

  return (
    <Card>
      <CardHeader><CardTitle>邀请关系</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-44" placeholder="邀请人姓名/手机号" value={filters.inviterKeyword} onChange={(e) => setFilters({ ...filters, inviterKeyword: e.target.value })} />
          <Input className="w-44" placeholder="被邀人姓名/手机号" value={filters.inviteeKeyword} onChange={(e) => setFilters({ ...filters, inviteeKeyword: e.target.value })} />
          <Select className="w-36" options={SOURCE_OPTIONS} value={filters.sourceType} onChange={(v) => setFilters({ ...filters, sourceType: v })} />
          <Select className="w-40" options={INVITE_STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>关系编号</TableHead><TableHead>来源</TableHead><TableHead>邀请来源</TableHead><TableHead>被邀请人</TableHead><TableHead>状态</TableHead><TableHead>绑定时间</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.relationNo}</TableCell><TableCell>{labelOf(row.sourceType, SOURCE_LABELS)}</TableCell><TableCell>{row.sourceType === 'agent_qr' ? (row.agentName || '-') : (row.inviterName || '-')}</TableCell><TableCell>{row.inviteeName || '-'}</TableCell><TableCell>{statusBadge(row.status)}</TableCell><TableCell>{row.bindTime ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
    </Card>
  );
}

function RewardsPanel() {
  const [list, setList] = useState<PromotionRewardLogVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: 'frozen', eventType: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{ row: PromotionRewardLogVO; pass: boolean } | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionRewardLogVO>(await getPromotionRewards({ page, size: 10, eventType: query.eventType || undefined, status: query.status || undefined }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);
  useEffect(() => { fetchList(); }, [fetchList]);

  function handleSearch() {
    setPage(1);
    setQuery(filters);
  }

  function openReviewDialog(row: PromotionRewardLogVO, pass: boolean) {
    setReviewDialog({ row, pass });
    setReviewRemark('');
  }

  async function submitReview() {
    if (!reviewDialog) return;
    if (!reviewDialog.pass && !reviewRemark.trim()) return;
    setReviewSaving(true);
    try {
      const remark = reviewRemark.trim() || undefined;
      if (reviewDialog.pass) await approvePromotionReward(reviewDialog.row.id, remark);
      else await rejectPromotionReward(reviewDialog.row.id, remark);
      setReviewDialog(null);
      setReviewRemark('');
      fetchList();
    } finally {
      setReviewSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>奖励审核</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select className="w-36" options={REWARD_STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Select className="w-44" options={RULE_EVENT_OPTIONS} value={filters.eventType} onChange={(v) => setFilters({ ...filters, eventType: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const next = { status: 'frozen', eventType: '' }; setFilters(next); setPage(1); setQuery(next); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>流水号</TableHead><TableHead>邀请人</TableHead><TableHead>被邀请人</TableHead><TableHead>事件</TableHead><TableHead>奖励</TableHead><TableHead>审核拒绝原因</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.rewardNo}</TableCell><TableCell>{row.inviterName || '-'}</TableCell><TableCell>{row.inviteeName || '-'}</TableCell><TableCell>{labelOf(row.eventType, EVENT_LABELS)}</TableCell><TableCell>{row.rewardCoin}</TableCell><TableCell>{row.reviewRemark || labelOf(row.riskReason, RISK_LABELS) || '-'}</TableCell><TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell><div className="flex gap-1"><Button disabled={row.status !== 'frozen'} variant="ghost" size="icon" className="h-8 w-8" onClick={() => openReviewDialog(row, true)}><Check className="h-4 w-4" /></Button><Button disabled={row.status !== 'frozen'} variant="ghost" size="icon" className="h-8 w-8" onClick={() => openReviewDialog(row, false)}><X className="h-4 w-4" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={!!reviewDialog} onClose={() => setReviewDialog(null)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{reviewDialog?.pass ? '通过奖励审核' : '拒绝奖励审核'}</DialogTitle>
          <DialogDescription>{reviewDialog?.pass ? '确认后奖励将标记为已通过' : '请填写审核拒绝原因'}</DialogDescription>
        </DialogHeader>
        {reviewDialog && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">邀请人</span><span>{reviewDialog.row.inviterName || '-'}</span></div>
              <div className="mt-2 flex justify-between gap-4"><span className="text-muted-foreground">被邀请人</span><span>{reviewDialog.row.inviteeName || '-'}</span></div>
              <div className="mt-2 flex justify-between gap-4"><span className="text-muted-foreground">事件</span><span>{labelOf(reviewDialog.row.eventType, EVENT_LABELS)}</span></div>
              <div className="mt-2 flex justify-between gap-4"><span className="text-muted-foreground">奖励</span><span>{reviewDialog.row.rewardCoin}</span></div>
            </div>
            <label className="space-y-1 text-sm font-medium">
              {reviewDialog.pass ? '审核备注' : '审核拒绝原因'}
              <textarea
                className="min-h-[96px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={reviewRemark}
                onChange={(e) => setReviewRemark(e.target.value)}
                placeholder={reviewDialog.pass ? '可选' : '请输入拒绝原因'}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewDialog(null)}>取消</Button>
              <Button onClick={submitReview} disabled={reviewSaving || (!reviewDialog.pass && !reviewRemark.trim())}>{reviewSaving ? '提交中...' : '确认'}</Button>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

function AgentsPanel() {
  const [list, setList] = useState<PromotionAgentVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ keyword: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [codeDialog, setCodeDialog] = useState<{ qrCode: string; miniappPath: string; qrUrl?: string } | null>(null);
  const [editing, setEditing] = useState<PromotionAgentVO | null>(null);
  const [form, setForm] = useState({ agentName: '', contactName: '', contactPhone: '', school: '', campus: '', status: 'normal', remark: '' });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionAgentVO>(await getPromotionAgents({ page, size: 10, keyword: query.keyword || undefined, status: query.status || undefined }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);
  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({ agentName: '', contactName: '', contactPhone: '', school: '', campus: '', status: 'normal', remark: '' });
    setDialogOpen(true);
  }

  function openEdit(row: PromotionAgentVO) {
    setEditing(row);
    setForm({ agentName: row.agentName, contactName: row.contactName ?? '', contactPhone: row.contactPhone ?? '', school: row.school ?? '', campus: row.campus ?? '', status: row.status ?? 'normal', remark: row.remark ?? '' });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) await updatePromotionAgent(editing.id, form);
    else await createPromotionAgent(form);
    setDialogOpen(false);
    fetchList();
  }

  async function handleCode(id: number) {
    const res = await regeneratePromotionAgentQrCode(id);
    const code = (res as any).data;
    setCodeDialog({ qrCode: code.qrCode, miniappPath: code.miniappPath, qrUrl: code.qrUrl });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle>校园代理</CardTitle><Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增代理</Button></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="w-56" placeholder="代理/联系人/手机号" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
          <Select className="w-36" options={AGENT_STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={() => { setPage(1); setQuery(filters); }}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const empty = { keyword: '', status: '' }; setFilters(empty); setPage(1); setQuery(empty); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>代理</TableHead><TableHead>联系人</TableHead><TableHead>学校/校区</TableHead><TableHead>状态</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><div className="font-medium">{row.agentName}</div><div className="text-xs text-muted-foreground">{row.remark || '-'}</div></TableCell><TableCell>{row.contactName || '-'}<div className="text-xs text-muted-foreground">{row.contactPhone || '-'}</div></TableCell><TableCell>{row.school || '-'} / {row.campus || '-'}</TableCell><TableCell>{statusBadge(row.status)}</TableCell><TableCell>{row.createTime || '-'}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="sm" onClick={() => updatePromotionAgentStatus(row.id, row.status === 'normal' ? 'paused' : 'normal').then(fetchList)}>{row.status === 'normal' ? '暂停' : '恢复'}</Button><Button variant="ghost" size="sm" onClick={() => handleCode(row.id)}><QrCode className="mr-1 h-4 w-4" />二维码</Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader><DialogTitle>{editing ? '编辑代理' : '新增代理'}</DialogTitle><DialogDescription>维护校园代理资料</DialogDescription></DialogHeader>
        <div className="mt-4 space-y-4">
          <label className="space-y-1 text-sm font-medium">代理名称<Input value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm font-medium">联系人<Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label><label className="space-y-1 text-sm font-medium">联系电话<Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm font-medium">学校<Input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} /></label><label className="space-y-1 text-sm font-medium">校区<Input value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} /></label></div>
          <label className="space-y-1 text-sm font-medium">状态<Select options={AGENT_STATUS_OPTIONS.filter((o) => o.value)} value={form.status} onChange={(v) => setForm({ ...form, status: v })} /></label>
          <label className="space-y-1 text-sm font-medium">备注<Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></label>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></div>
        </div>
      </Dialog>
      <Dialog open={!!codeDialog} onClose={() => setCodeDialog(null)} className="max-w-sm">
        <DialogHeader><DialogTitle>校园代理二维码</DialogTitle><DialogDescription>扫码进入小程序后归属该校园代理</DialogDescription></DialogHeader>
        {codeDialog && (
          <div className="mt-4 space-y-4">
            <div className="flex justify-center">
              <img className="h-[180px] w-[180px] rounded border border-border" src={codeDialog.qrUrl || qrImageUrl(codeDialog.miniappPath || codeDialog.qrCode)} alt="校园代理二维码" />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <div>二维码编号：{codeDialog.qrCode}</div>
              <div className="mt-1 break-all text-muted-foreground">路径：{codeDialog.miniappPath}</div>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

function SettlementsPanel() {
  const [list, setList] = useState<PromotionSettlementVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ agentKeyword: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [settlementDialog, setSettlementDialog] = useState<{ row: PromotionSettlementVO; action: 'confirm' | 'paid' } | null>(null);
  const [settlementRemark, setSettlementRemark] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [settlementSaving, setSettlementSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionSettlementVO>(await getPromotionSettlements({ page, size: 10, agentKeyword: query.agentKeyword || undefined, status: query.status || undefined }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);
  useEffect(() => { fetchList(); }, [fetchList]);

  function openSettlementDialog(row: PromotionSettlementVO, action: 'confirm' | 'paid') {
    setSettlementDialog({ row, action });
    setSettlementRemark('');
    setPaidAmount(action === 'paid' ? String(row.payableAmount ?? '') : '');
  }

  async function submitSettlementAction() {
    if (!settlementDialog) return;
    const remark = settlementRemark.trim() || undefined;
    const amount = Number(paidAmount);
    if (settlementDialog.action === 'paid' && (!amount || amount <= 0)) return;
    setSettlementSaving(true);
    try {
      if (settlementDialog.action === 'confirm') {
        await confirmPromotionSettlement(settlementDialog.row.id, remark);
      } else {
        await paidPromotionSettlement(settlementDialog.row.id, amount, remark);
      }
      setSettlementDialog(null);
      setSettlementRemark('');
      setPaidAmount('');
      fetchList();
    } finally {
      setSettlementSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>代理结算</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="w-56" placeholder="代理名称/联系人/手机号" value={filters.agentKeyword} onChange={(e) => setFilters({ ...filters, agentKeyword: e.target.value })} />
          <Select className="w-36" options={SETTLEMENT_STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={() => { setPage(1); setQuery(filters); }}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const empty = { agentKeyword: '', status: '' }; setFilters(empty); setPage(1); setQuery(empty); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>结算单</TableHead><TableHead>代理</TableHead><TableHead>周期</TableHead><TableHead>应发</TableHead><TableHead>实发</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><div className="font-medium">{row.settlementNo}</div><div className="text-xs text-muted-foreground">{row.statsDesc || row.remark || '-'}</div></TableCell><TableCell>{row.agentName || '-'}</TableCell><TableCell>{row.periodStart} 至 {row.periodEnd}</TableCell><TableCell>{row.payableAmount}</TableCell><TableCell>{row.paidAmount ?? 0}</TableCell><TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell><div className="flex gap-1"><Button disabled={row.status !== 'pending'} variant="ghost" size="sm" onClick={() => openSettlementDialog(row, 'confirm')}>确认</Button><Button disabled={row.status !== 'confirmed'} variant="ghost" size="sm" onClick={() => openSettlementDialog(row, 'paid')}>发放</Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={!!settlementDialog} onClose={() => setSettlementDialog(null)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{settlementDialog?.action === 'confirm' ? '确认结算单' : '发放结算款'}</DialogTitle>
          <DialogDescription>{settlementDialog?.action === 'confirm' ? '确认后结算单进入待发放状态' : '请填写实际发放金额'}</DialogDescription>
        </DialogHeader>
        {settlementDialog && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">代理</span><span>{settlementDialog.row.agentName || '-'}</span></div>
              <div className="mt-2 flex justify-between gap-4"><span className="text-muted-foreground">周期</span><span>{settlementDialog.row.periodStart} 至 {settlementDialog.row.periodEnd}</span></div>
              <div className="mt-2 flex justify-between gap-4"><span className="text-muted-foreground">应发金额</span><span>{settlementDialog.row.payableAmount}</span></div>
            </div>
            {settlementDialog.action === 'paid' && (
              <label className="space-y-1 text-sm font-medium">
                实发金额
                <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </label>
            )}
            <label className="space-y-1 text-sm font-medium">
              {settlementDialog.action === 'confirm' ? '确认备注' : '发放备注'}
              <textarea
                className="min-h-[88px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={settlementRemark}
                onChange={(e) => setSettlementRemark(e.target.value)}
                placeholder="可选"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSettlementDialog(null)}>取消</Button>
              <Button onClick={submitSettlementAction} disabled={settlementSaving || (settlementDialog.action === 'paid' && (!Number(paidAmount) || Number(paidAmount) <= 0))}>{settlementSaving ? '提交中...' : '确认'}</Button>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
