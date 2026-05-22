import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Edit, Plus, RefreshCcw, Search, X } from 'lucide-react';
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
  createPromotionSettlement,
  getPromotionAgents,
  getPromotionInvites,
  getPromotionRewards,
  getPromotionRules,
  getPromotionSettlements,
  markPromotionInviteInvalid,
  paidPromotionSettlement,
  regeneratePromotionAgentCode,
  rejectPromotionReward,
  savePromotionRuleTiers,
  unfreezePromotionInvite,
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
  { value: 'risk_control', label: '风控规则' },
];

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'share_card', label: '分享卡片' },
  { value: 'poster', label: '邀请海报' },
  { value: 'invite_code', label: '邀请码' },
  { value: 'agent_code', label: '代理码' },
];

const REWARD_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待发放' },
  { value: 'success', label: '已发放' },
  { value: 'frozen', label: '冻结' },
  { value: 'invalid', label: '无效' },
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
  const success = ['ENABLED', 'normal', 'success', 'paid', 'enabled'].includes(status);
  const warning = ['pending', 'frozen', 'paused', 'confirmed'].includes(status);
  const danger = ['DISABLED', 'invalid', 'terminated', 'cancelled', 'disabled'].includes(status);
  return (
    <Badge variant={success ? 'success' : warning ? 'warning' : danger ? 'destructive' : 'secondary'}>
      {status}
    </Badge>
  );
}

function num(value?: number | string) {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
}

export default function PromotionManagement() {
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>推广裂变</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <Link
                key={tab.key}
                to={tab.path}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm transition-colors',
                  activeTab === tab.key ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {tab.title}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

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
  const [ruleType, setRuleType] = useState('');
  const [eventType, setEventType] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRuleVO | null>(null);
  const [form, setForm] = useState({
    ruleName: '',
    ruleType: 'user_invite',
    eventType: 'login_success',
    rewardAmount: '0',
    rewardUnit: 'coin',
    dailyLimit: '',
    effectiveTime: '',
    expireTime: '',
    agentGroup: '',
    status: 'ENABLED',
    remark: '',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionRuleVO>(await getPromotionRules({ page, size: 10, ruleType: ruleType || undefined, eventType: eventType || undefined, status: status || undefined }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, ruleType, eventType, status]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({ ruleName: '', ruleType: 'user_invite', eventType: 'login_success', rewardAmount: '0', rewardUnit: 'coin', dailyLimit: '', effectiveTime: '', expireTime: '', agentGroup: '', status: 'ENABLED', remark: '' });
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
      agentGroup: row.agentGroup ?? '',
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
      agentGroup: form.agentGroup || undefined,
      remark: form.remark || undefined,
    };
    if (editing) await updatePromotionRule(editing.id, payload);
    else await createPromotionRule(payload);
    setDialogOpen(false);
    fetchList();
  }

  async function handleTiers(id: number) {
    const text = prompt('请输入阶梯 JSON，例如：[{\"minCount\":1,\"maxCount\":5,\"rewardAmount\":10,\"status\":\"ENABLED\"}]');
    if (!text) return;
    await savePromotionRuleTiers(id, JSON.parse(text));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>规则配置</CardTitle>
        <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增规则</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="w-36" options={RULE_TYPE_OPTIONS} value={ruleType} onChange={(v) => { setRuleType(v); setPage(1); }} />
          <Input className="w-44" placeholder="事件类型" value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} />
          <Select className="w-32" options={[{ value: '', label: '全部状态' }, { value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
          <Button variant="outline" size="sm" onClick={() => { setRuleType(''); setEventType(''); setStatus(''); setPage(1); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>规则</TableHead><TableHead>类型</TableHead><TableHead>事件</TableHead><TableHead>奖励</TableHead><TableHead>上限</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><div className="font-medium">{row.ruleName}</div><div className="text-xs text-muted-foreground">{row.remark || '-'}</div></TableCell>
                <TableCell>{row.ruleType}</TableCell>
                <TableCell>{row.eventType}</TableCell>
                <TableCell>{row.rewardAmount} {row.rewardUnit}</TableCell>
                <TableCell>{row.dailyLimit ?? '-'}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => updatePromotionRuleStatus(row.id, row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED').then(fetchList)}>{row.status === 'ENABLED' ? '停用' : '启用'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleTiers(row.id)}>阶梯</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? '编辑规则' : '新增规则'}</DialogTitle><DialogDescription>配置邀请奖励、代理奖金或风控规则</DialogDescription></DialogHeader>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="space-y-1 text-sm font-medium">规则名称<Input value={form.ruleName} onChange={(e) => setForm({ ...form, ruleName: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">规则类型<Select options={RULE_TYPE_OPTIONS.filter((o) => o.value)} value={form.ruleType} onChange={(v) => setForm({ ...form, ruleType: v })} /></label>
          <label className="space-y-1 text-sm font-medium">事件类型<Input value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">奖励单位<Select options={[{ value: 'coin', label: '成家币' }, { value: 'cash', label: '现金' }]} value={form.rewardUnit} onChange={(v) => setForm({ ...form, rewardUnit: v })} /></label>
          <label className="space-y-1 text-sm font-medium">奖励金额<Input type="number" value={form.rewardAmount} onChange={(e) => setForm({ ...form, rewardAmount: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">单日上限<Input type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">生效时间<Input type="datetime-local" value={form.effectiveTime} onChange={(e) => setForm({ ...form, effectiveTime: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">失效时间<Input type="datetime-local" value={form.expireTime} onChange={(e) => setForm({ ...form, expireTime: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">代理组<Input value={form.agentGroup} onChange={(e) => setForm({ ...form, agentGroup: e.target.value })} /></label>
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
  const [inviterId, setInviterId] = useState('');
  const [inviteeId, setInviteeId] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [status, setStatus] = useState('');

  const fetchList = useCallback(async () => {
    const data = pageData<PromotionInviteRelationVO>(await getPromotionInvites({ page, size: 10, inviterId: num(inviterId), inviteeId: num(inviteeId), sourceType: sourceType || undefined, status: status || undefined }));
    setList(data.records ?? []);
    setTotal(data.total ?? 0);
  }, [page, inviterId, inviteeId, sourceType, status]);
  useEffect(() => { fetchList(); }, [fetchList]);

  async function review(id: number, action: 'invalid' | 'unfreeze') {
    const remark = prompt(action === 'invalid' ? '请输入无效原因' : '请输入解除冻结备注') ?? undefined;
    if (action === 'invalid') await markPromotionInviteInvalid(id, remark);
    else await unfreezePromotionInvite(id, remark);
    fetchList();
  }

  return (
    <Card>
      <CardHeader><CardTitle>邀请关系</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="w-36" placeholder="邀请人ID" value={inviterId} onChange={(e) => { setInviterId(e.target.value); setPage(1); }} />
          <Input className="w-36" placeholder="被邀人ID" value={inviteeId} onChange={(e) => { setInviteeId(e.target.value); setPage(1); }} />
          <Select className="w-36" options={SOURCE_OPTIONS} value={sourceType} onChange={(v) => { setSourceType(v); setPage(1); }} />
          <Input className="w-40" placeholder="状态" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>关系编号</TableHead><TableHead>来源</TableHead><TableHead>邀请人</TableHead><TableHead>被邀请人</TableHead><TableHead>代理</TableHead><TableHead>奖励</TableHead><TableHead>状态</TableHead><TableHead>绑定时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.relationNo}</TableCell><TableCell>{row.sourceType}</TableCell><TableCell>{row.inviterId ?? '-'}</TableCell><TableCell>{row.inviteeId}</TableCell><TableCell>{row.agentCode ?? row.agentId ?? '-'}</TableCell><TableCell>{row.totalRewardCoin ?? 0}</TableCell><TableCell>{statusBadge(row.status)}</TableCell><TableCell>{row.bindTime ?? '-'}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => review(row.id, 'invalid')}>无效</Button><Button variant="ghost" size="sm" onClick={() => review(row.id, 'unfreeze')}>解冻</Button></div></TableCell>
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
  const [status, setStatus] = useState('frozen');
  const [eventType, setEventType] = useState('');

  const fetchList = useCallback(async () => {
    const data = pageData<PromotionRewardLogVO>(await getPromotionRewards({ page, size: 10, eventType: eventType || undefined, status: status || undefined }));
    setList(data.records ?? []);
    setTotal(data.total ?? 0);
  }, [page, status, eventType]);
  useEffect(() => { fetchList(); }, [fetchList]);

  async function handleReview(id: number, pass: boolean) {
    const remark = prompt(pass ? '请输入通过备注' : '请输入驳回原因') ?? undefined;
    if (pass) await approvePromotionReward(id, remark);
    else await rejectPromotionReward(id, remark);
    fetchList();
  }

  return (
    <Card>
      <CardHeader><CardTitle>奖励审核</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select className="w-36" options={REWARD_STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
          <Input className="w-44" placeholder="事件类型" value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} />
          <Button variant="outline" size="sm" onClick={fetchList}><Search className="mr-1 h-4 w-4" />查询</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>流水号</TableHead><TableHead>邀请人</TableHead><TableHead>被邀请人</TableHead><TableHead>事件</TableHead><TableHead>奖励</TableHead><TableHead>风险</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.rewardNo}</TableCell><TableCell>{row.inviterId}</TableCell><TableCell>{row.inviteeId}</TableCell><TableCell>{row.eventType}</TableCell><TableCell>{row.rewardCoin}</TableCell><TableCell>{row.riskReason || '-'}</TableCell><TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell><div className="flex gap-1"><Button disabled={row.status !== 'frozen'} variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReview(row.id, true)}><Check className="h-4 w-4" /></Button><Button disabled={row.status !== 'frozen'} variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReview(row.id, false)}><X className="h-4 w-4" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
    </Card>
  );
}

function AgentsPanel() {
  const [list, setList] = useState<PromotionAgentVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionAgentVO | null>(null);
  const [form, setForm] = useState({ agentName: '', contactName: '', contactPhone: '', school: '', campus: '', agentGroup: 'DEFAULT', status: 'normal', remark: '' });

  const fetchList = useCallback(async () => {
    const data = pageData<PromotionAgentVO>(await getPromotionAgents({ page, size: 10, keyword: keyword || undefined, status: status || undefined }));
    setList(data.records ?? []);
    setTotal(data.total ?? 0);
  }, [page, keyword, status]);
  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({ agentName: '', contactName: '', contactPhone: '', school: '', campus: '', agentGroup: 'DEFAULT', status: 'normal', remark: '' });
    setDialogOpen(true);
  }

  function openEdit(row: PromotionAgentVO) {
    setEditing(row);
    setForm({ agentName: row.agentName, contactName: row.contactName ?? '', contactPhone: '', school: row.school ?? '', campus: row.campus ?? '', agentGroup: row.agentGroup ?? 'DEFAULT', status: row.status ?? 'normal', remark: row.remark ?? '' });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) await updatePromotionAgent(editing.id, form);
    else await createPromotionAgent(form);
    setDialogOpen(false);
    fetchList();
  }

  async function handleCode(id: number) {
    const res = await regeneratePromotionAgentCode(id);
    const code = (res as any).data;
    alert(`代理码：${code.agentCode}\n路径：${code.miniappPath}`);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle>校园代理</CardTitle><Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增代理</Button></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="w-56" placeholder="代理/联系人/手机号" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} />
          <Select className="w-36" options={AGENT_STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>代理</TableHead><TableHead>联系人</TableHead><TableHead>学校/校区</TableHead><TableHead>规则组</TableHead><TableHead>状态</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><div className="font-medium">{row.agentName}</div><div className="text-xs text-muted-foreground">{row.remark || '-'}</div></TableCell><TableCell>{row.contactName || '-'}<div className="text-xs text-muted-foreground">{row.contactPhone || '-'}</div></TableCell><TableCell>{row.school || '-'} / {row.campus || '-'}</TableCell><TableCell>{row.agentGroup || '-'}</TableCell><TableCell>{statusBadge(row.status)}</TableCell><TableCell>{row.createTime || '-'}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="sm" onClick={() => updatePromotionAgentStatus(row.id, row.status === 'normal' ? 'paused' : 'normal').then(fetchList)}>{row.status === 'normal' ? '暂停' : '恢复'}</Button><Button variant="ghost" size="sm" onClick={() => handleCode(row.id)}>代理码</Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader><DialogTitle>{editing ? '编辑代理' : '新增代理'}</DialogTitle><DialogDescription>维护校园代理资料和奖金规则组</DialogDescription></DialogHeader>
        <div className="mt-4 space-y-4">
          <label className="space-y-1 text-sm font-medium">代理名称<Input value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm font-medium">联系人<Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label><label className="space-y-1 text-sm font-medium">联系电话<Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm font-medium">学校<Input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} /></label><label className="space-y-1 text-sm font-medium">校区<Input value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} /></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm font-medium">规则组<Input value={form.agentGroup} onChange={(e) => setForm({ ...form, agentGroup: e.target.value })} /></label><label className="space-y-1 text-sm font-medium">状态<Select options={AGENT_STATUS_OPTIONS.filter((o) => o.value)} value={form.status} onChange={(v) => setForm({ ...form, status: v })} /></label></div>
          <label className="space-y-1 text-sm font-medium">备注<Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></label>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></div>
        </div>
      </Dialog>
    </Card>
  );
}

function SettlementsPanel() {
  const [list, setList] = useState<PromotionSettlementVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [agentId, setAgentId] = useState('');
  const [status, setStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState({ agentId: '', periodStart: today, periodEnd: today, payableAmount: '0', statsDesc: '', remark: '' });

  const fetchList = useCallback(async () => {
    const data = pageData<PromotionSettlementVO>(await getPromotionSettlements({ page, size: 10, agentId: num(agentId), status: status || undefined }));
    setList(data.records ?? []);
    setTotal(data.total ?? 0);
  }, [page, agentId, status]);
  useEffect(() => { fetchList(); }, [fetchList]);

  async function handleCreate() {
    await createPromotionSettlement({ ...form, agentId: Number(form.agentId), payableAmount: Number(form.payableAmount || 0) } as any);
    setDialogOpen(false);
    fetchList();
  }

  async function handleConfirm(id: number) {
    await confirmPromotionSettlement(id, prompt('确认备注') ?? undefined);
    fetchList();
  }

  async function handlePaid(id: number) {
    const paidAmount = Number(prompt('请输入实发金额') || 0);
    if (!paidAmount) return;
    await paidPromotionSettlement(id, paidAmount, prompt('发放备注') ?? undefined);
    fetchList();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle>代理结算</CardTitle><Button onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />生成结算单</Button></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="w-36" placeholder="代理ID" value={agentId} onChange={(e) => { setAgentId(e.target.value); setPage(1); }} />
          <Select className="w-36" options={SETTLEMENT_STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>结算单</TableHead><TableHead>代理ID</TableHead><TableHead>周期</TableHead><TableHead>应发</TableHead><TableHead>实发</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><div className="font-medium">{row.settlementNo}</div><div className="text-xs text-muted-foreground">{row.statsDesc || row.remark || '-'}</div></TableCell><TableCell>{row.agentId}</TableCell><TableCell>{row.periodStart} 至 {row.periodEnd}</TableCell><TableCell>{row.payableAmount}</TableCell><TableCell>{row.paidAmount ?? 0}</TableCell><TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell><div className="flex gap-1"><Button disabled={row.status !== 'pending'} variant="ghost" size="sm" onClick={() => handleConfirm(row.id)}>确认</Button><Button disabled={row.status !== 'confirmed'} variant="ghost" size="sm" onClick={() => handlePaid(row.id)}>发放</Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader><DialogTitle>生成结算单</DialogTitle><DialogDescription>录入代理结算周期和应发金额</DialogDescription></DialogHeader>
        <div className="mt-4 space-y-4">
          <label className="space-y-1 text-sm font-medium">代理ID<Input value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm font-medium">开始日期<Input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} /></label><label className="space-y-1 text-sm font-medium">结束日期<Input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} /></label></div>
          <label className="space-y-1 text-sm font-medium">应发金额<Input type="number" value={form.payableAmount} onChange={(e) => setForm({ ...form, payableAmount: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">统计说明<Input value={form.statsDesc} onChange={(e) => setForm({ ...form, statsDesc: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">备注<Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></label>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleCreate}>生成</Button></div>
        </div>
      </Dialog>
    </Card>
  );
}
