import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Edit, Plus, QrCode, RefreshCcw, Search, X } from 'lucide-react';
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
  disablePromotionMaterial,
  getPromotionAgents,
  getPromotionAgentDetail,
  getPromotionInviteDetail,
  getPromotionInvites,
  getPromotionMaterials,
  getPromotionRuleConfig,
  getPromotionRewards,
  getPromotionRules,
  getPromotionSettlements,
  paidPromotionSettlement,
  regeneratePromotionAgentQrCode,
  regeneratePromotionMaterial,
  savePromotionAgentBonusConfig,
  savePromotionInviteRewardConfig,
  savePromotionRiskConfig,
  unfreezePromotionInvite,
  invalidatePromotionInvite,
  rejectPromotionReward,
  updatePromotionAgent,
  updatePromotionAgentStatus,
  updatePromotionRule,
  updatePromotionRuleStatus,
  type PageResult,
  type PromotionAgentQrCodeVO,
  type PromotionAgentVO,
  type PromotionInviteRelationVO,
  type PromotionRewardLogVO,
  type PromotionRuleConfigVO,
  type PromotionRuleVO,
  type PromotionSettlementVO,
} from '@/api/promotion';
import { cn } from '@/lib/utils';

type TabKey = 'rules' | 'invites' | 'rewards' | 'frozenRewards' | 'agents' | 'materials' | 'settlements';

const TABS: { key: TabKey; title: string; path: string }[] = [
  { key: 'rules', title: '推广规则配置', path: '/promotion/rule-config' },
  { key: 'invites', title: '普通邀请关系', path: '/promotion/invite-relation' },
  { key: 'rewards', title: '普通邀请奖励流水', path: '/promotion/invite-reward' },
  { key: 'frozenRewards', title: '冻结奖励处理页', path: '/promotion/invite-reward/frozen' },
  { key: 'agents', title: '代理列表', path: '/promotion/agent' },
  { key: 'materials', title: '推广素材与二维码管理', path: '/promotion/material' },
  { key: 'settlements', title: '代理结算管理', path: '/promotion/settlement' },
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

const REWARD_EVENTS = RULE_EVENT_OPTIONS.filter((option) => option.value).map((option) => ({
  eventType: option.value,
  label: option.label,
}));

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'normal_user', label: '普通用户' },
  { value: 'campus_agent', label: '校园代理' },
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
  { value: 'frozen', label: '冻结' },
  { value: 'invalid', label: '无效' },
];

const AGENT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'normal', label: '正常推广' },
  { value: 'paused', label: '暂停推广' },
  { value: 'terminated', label: '终止合作' },
];

const SETTLEMENT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'unsettled', label: '待结算' },
  { value: 'confirmed', label: '已确认' },
  { value: 'paid', label: '已发放' },
];

function getTabFromPath(pathname: string): TabKey {
  if (pathname.startsWith('/promotion/invite-reward/frozen')) {
    return 'frozenRewards';
  }
  return TABS.find((tab) => pathname.startsWith(tab.path))?.key ?? 'rules';
}

function pageData<T>(res: unknown): PageResult<T> {
  return ((res as any).data ?? { records: [], total: 0, current: 1, size: 10 }) as PageResult<T>;
}

function responseData<T>(res: unknown): T {
  return (res as any).data as T;
}

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const label = labelOf(status, STATUS_LABELS);
  const success = ['ENABLED', 'normal', 'success', 'paid', 'enabled'].includes(status);
  const warning = ['pending', 'unsettled', 'frozen', 'paused', 'confirmed'].includes(status);
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
  normal: '正常推广',
  paused: '暂停推广',
  terminated: '终止合作',
  pending: '待处理',
  unsettled: '待结算',
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

function userLine(uuid?: string, name?: string, phone?: string) {
  return (
    <div className="space-y-0.5">
      <div className="font-medium">{uuid || '-'}</div>
      <div className="text-xs text-muted-foreground">{[name, phone].filter(Boolean).join(' / ') || '-'}</div>
    </div>
  );
}

function amount(value?: number) {
  return value ?? 0;
}

function periodText(row: PromotionSettlementVO) {
  return row.periodText || `${row.periodStart || '-'} 至 ${row.periodEnd || '-'}`;
}

function monthEnd(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  if (!year || !monthIndex) return undefined;
  return new Date(year, monthIndex, 0).toISOString().slice(0, 10);
}

export default function PromotionManagement() {
  const location = useLocation();
  const params = useParams();
  const activeTab = getTabFromPath(location.pathname);

  if (activeTab === 'invites' && params.id) {
    return <InviteDetailPanel id={Number(params.id)} />;
  }
  if (activeTab === 'agents' && params.id) {
    return <AgentDetailPanel id={Number(params.id)} />;
  }

  return (
    <div className="space-y-4">
      {activeTab === 'rules' && <RulesPanel />}
      {activeTab === 'invites' && <InvitesPanel />}
      {activeTab === 'rewards' && <RewardsPanel />}
      {activeTab === 'frozenRewards' && <RewardsPanel frozenOnly />}
      {activeTab === 'agents' && <AgentsPanel />}
      {activeTab === 'materials' && <MaterialsPanel />}
      {activeTab === 'settlements' && <SettlementsPanel />}
    </div>
  );
}

function InviteDetailPanel({ id }: { id: number }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PromotionInviteRelationVO | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewAction, setReviewAction] = useState<'unfreeze' | 'invalid' | null>(null);
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(responseData<PromotionInviteRelationVO>(await getPromotionInviteDetail(id)));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  async function submitReview() {
    if (!reviewAction || !detail) return;
    if (reviewAction === 'invalid' && !remark.trim()) return;
    setSaving(true);
    try {
      if (reviewAction === 'unfreeze') await unfreezePromotionInvite(detail.id, remark.trim() || undefined);
      else await invalidatePromotionInvite(detail.id, remark.trim());
      setReviewAction(null);
      setRemark('');
      fetchDetail();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/promotion/invite-relation')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>邀请关系详情</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button disabled={!detail || detail.status !== 'frozen'} variant="outline" size="sm" onClick={() => setReviewAction('unfreeze')}>解除冻结</Button>
          <Button disabled={!detail || detail.status === 'invalid'} variant="outline" size="sm" onClick={() => setReviewAction('invalid')}>标记无效</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">加载中...</div>
        ) : !detail ? (
          <div className="py-12 text-center text-muted-foreground">暂无数据</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <InfoItem label="关系编号" value={detail.relationNo} />
              <InfoItem label="邀请来源" value={labelOf(detail.sourceType, SOURCE_LABELS)} />
              <InfoItem label="关系状态" value={statusBadge(detail.status)} />
              <InfoItem label="邀请人信息" value={userLine(detail.inviterUuid, detail.inviterName, detail.inviterPhone)} />
              <InfoItem label="被邀请人信息" value={userLine(detail.inviteeUuid, detail.inviteeName, detail.inviteePhone)} />
              <InfoItem label="代理信息" value={detail.agentNo || detail.agentName ? `${detail.agentNo || '-'} / ${detail.agentName || '-'}` : '-'} />
              <InfoItem label="累计已发放奖励" value={String(detail.totalRewardCoin ?? 0)} />
              <InfoItem label="冻结前状态" value={detail.frozenBeforeStatus ? labelOf(detail.frozenBeforeStatus, STATUS_LABELS) : '-'} />
              <InfoItem label="无效原因" value={detail.invalidReason || '-'} />
              <InfoItem label="二维码编号" value={detail.qrCode || '-'} />
            </div>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader><TableRow><TableHead>节点</TableHead><TableHead>时间</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell>首次点击</TableCell><TableCell>{detail.firstClickTime || '-'}</TableCell></TableRow>
                  <TableRow><TableCell>首次注册</TableCell><TableCell>{detail.registerTime || detail.bindTime || '-'}</TableCell></TableRow>
                  <TableRow><TableCell>首次成功登录</TableCell><TableCell>{detail.firstLoginTime || '-'}</TableCell></TableRow>
                  <TableRow><TableCell>资料完善</TableCell><TableCell>{detail.profileCompleteTime || '-'}</TableCell></TableRow>
                  <TableRow><TableCell>认证完成</TableCell><TableCell>{detail.verifySuccessTime || '-'}</TableCell></TableRow>
                  <TableRow><TableCell>首次会员</TableCell><TableCell>{detail.firstVipTime || '-'}</TableCell></TableRow>
                  <TableRow><TableCell>首次充值</TableCell><TableCell>{detail.firstCoinRechargeTime || '-'}</TableCell></TableRow>
                </TableBody>
              </Table>
            </div>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">奖励触发记录</h3>
              <Table>
                <TableHeader><TableRow><TableHead>奖励流水号</TableHead><TableHead>奖励事件</TableHead><TableHead>奖励币数</TableHead><TableHead>奖励状态</TableHead><TableHead>创建时间</TableHead><TableHead>到账时间</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.rewardRecords ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : detail.rewardRecords!.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.rewardNo || '-'}</TableCell>
                      <TableCell>{labelOf(row.eventType, EVENT_LABELS)}</TableCell>
                      <TableCell>{row.rewardCoin ?? 0}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell>{row.createTime || '-'}</TableCell>
                      <TableCell>{row.arriveTime || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">风控命中记录</h3>
              <Table>
                <TableHeader><TableRow><TableHead>命中原因</TableHead><TableHead>奖励状态</TableHead><TableHead>命中时间</TableHead><TableHead>处理备注</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.riskRecords ?? []).length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : detail.riskRecords!.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{labelOf(row.riskReason, RISK_LABELS)}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell>{row.createTime || '-'}</TableCell>
                      <TableCell>{row.reviewRemark || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">操作日志</h3>
              <Table>
                <TableHeader><TableRow><TableHead>动作</TableHead><TableHead>变更前</TableHead><TableHead>变更后</TableHead><TableHead>备注</TableHead><TableHead>时间</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.auditRecords ?? []).length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : detail.auditRecords!.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.action || '-'}</TableCell>
                      <TableCell>{row.beforeValue || '-'}</TableCell>
                      <TableCell>{row.afterValue || '-'}</TableCell>
                      <TableCell>{row.remark || '-'}</TableCell>
                      <TableCell>{row.createTime || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </>
        )}
      </CardContent>
      <Dialog open={!!reviewAction} onClose={() => setReviewAction(null)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{reviewAction === 'unfreeze' ? '解除邀请关系冻结' : '标记邀请关系无效'}</DialogTitle>
          <DialogDescription>{reviewAction === 'unfreeze' ? '解除后将恢复冻结前状态，并把冻结奖励转回待处理' : '标记无效后，关联奖励流水会同步置为无效'}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <label className="space-y-1 text-sm font-medium">
            {reviewAction === 'invalid' ? '无效原因' : '审核备注'}
            <textarea
              className="min-h-[96px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={reviewAction === 'invalid' ? '请输入无效原因' : '可选'}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReviewAction(null)}>取消</Button>
            <Button onClick={submitReview} disabled={saving || (reviewAction === 'invalid' && !remark.trim())}>{saving ? '提交中...' : '确认'}</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

function AgentDetailPanel({ id }: { id: number }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PromotionAgentVO | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeDialog, setCodeDialog] = useState<{ qrCode: string; miniappPath: string; qrUrl?: string } | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'promo' | 'bonus' | 'settlement'>('promo');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const agentRes = await getPromotionAgentDetail(id);
      setDetail(responseData<PromotionAgentVO>(agentRes));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  async function handleRegenerateAgentCode() {
    const res = await regeneratePromotionAgentQrCode(id);
    const code = responseData<PromotionAgentQrCodeVO>(res);
    setCodeDialog({ qrCode: code.qrCode, miniappPath: code.miniappPath, qrUrl: code.qrUrl });
    fetchDetail();
  }

  const stat = detail?.stat;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/promotion/agent')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>校园代理详情</CardTitle>
        </div>
        <Button size="sm" onClick={handleRegenerateAgentCode}><QrCode className="mr-1 h-4 w-4" />生成二维码</Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">加载中...</div>
        ) : !detail ? (
          <div className="py-12 text-center text-muted-foreground">暂无数据</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <InfoItem label="代理编号" value={detail.agentNo || '-'} />
              <InfoItem label="代理名称" value={detail.agentName} />
              <InfoItem label="联系人" value={`${detail.contactName || '-'} ${detail.contactPhone || ''}`.trim()} />
              <InfoItem label="合作状态" value={statusBadge(detail.status)} />
              <InfoItem label="学校" value={detail.school || '-'} />
              <InfoItem label="校区" value={detail.campus || '-'} />
              <InfoItem label="奖金规则组" value={detail.bonusRuleGroup || '-'} />
              <InfoItem label="创建时间" value={detail.createTime || '-'} />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="点击" value={stat?.clickCnt} />
              <Metric label="注册" value={stat?.registerCnt} />
              <Metric label="资料完善" value={stat?.profileCnt} />
              <Metric label="认证成功" value={stat?.verifyCnt} />
              <Metric label="成功口径" value={stat?.successCnt} />
              <Metric label="待结算" value={stat?.bonusPendingAmount} />
              <Metric label="已确认" value={stat?.bonusConfirmedAmount} />
              <Metric label="已发放" value={stat?.bonusPaidAmount} />
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="代理详情">
              {[
                { key: 'promo', label: '推广明细' },
                { key: 'bonus', label: '奖金明细' },
                { key: 'settlement', label: '结算记录' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeDetailTab === tab.key}
                  className={cn('h-9 rounded-md border px-3 text-sm', activeDetailTab === tab.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}
                  onClick={() => setActiveDetailTab(tab.key as typeof activeDetailTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeDetailTab === 'promo' && (
              <Table>
                <TableHeader><TableRow><TableHead>被推广用户 UUID</TableHead><TableHead>姓名/手机号</TableHead><TableHead>注册时间</TableHead><TableHead>首次成功登录时间</TableHead><TableHead>推广关系状态</TableHead><TableHead>当前用户状态</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.promotionEvents ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : detail.promotionEvents!.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.userUuid || '-'}</TableCell>
                      <TableCell>{[row.userName, row.userPhone].filter(Boolean).join(' / ') || '-'}</TableCell>
                      <TableCell>{row.eventType === 'register_login_reward' ? row.eventTime || '-' : '-'}</TableCell>
                      <TableCell>{row.eventTime || '-'}</TableCell>
                      <TableCell>{labelOf(row.eventType, EVENT_LABELS)}</TableCell>
                      <TableCell>{row.bonusGenerated ? '已生成奖金' : '未生成奖金'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {activeDetailTab === 'bonus' && (
              <Table>
                <TableHeader><TableRow><TableHead>奖金明细订单号</TableHead><TableHead>奖金事件类型</TableHead><TableHead>对应用户</TableHead><TableHead>奖金金额</TableHead><TableHead>生成时间</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.bonusRecords ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : detail.bonusRecords!.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.bonusNo || '-'}</TableCell>
                      <TableCell>{labelOf(row.eventType, EVENT_LABELS)}</TableCell>
                      <TableCell>{[row.userUuid, row.userName].filter(Boolean).join(' / ') || '-'}</TableCell>
                      <TableCell>{amount(row.bonusAmount)}</TableCell>
                      <TableCell>{row.createTime || '-'}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {activeDetailTab === 'settlement' && (
              <Table>
                <TableHeader><TableRow><TableHead>结算单号</TableHead><TableHead>结算周期</TableHead><TableHead>结算金额</TableHead><TableHead>结算方式</TableHead><TableHead>结算状态</TableHead><TableHead>结算时间</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.settlementRecords ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : detail.settlementRecords!.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.settlementNo}</TableCell>
                      <TableCell>{periodText(row)}</TableCell>
                      <TableCell>{row.payableAmount}</TableCell>
                      <TableCell>{row.settlementMethod || '线下发放'}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell>{row.paidTime || row.confirmTime || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
      <Dialog open={!!codeDialog} onClose={() => setCodeDialog(null)} className="max-w-sm">
        <DialogHeader><DialogTitle>校园代理二维码</DialogTitle><DialogDescription>二维码已生成并加入素材列表</DialogDescription></DialogHeader>
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

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value ?? 0}</div>
    </div>
  );
}

function RulesPanel() {
  const [list, setList] = useState<PromotionRuleVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeConfigTab, setActiveConfigTab] = useState<'invite' | 'agent' | 'validity' | 'risk'>('invite');
  const [config, setConfig] = useState<PromotionRuleConfigVO | null>(null);
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
  const [inviteConfig, setInviteConfig] = useState({
    successMetric: 'register_login_reward',
    rewardMode: 'fixed',
    rewardCap: '',
    effectiveTime: '',
    expireTime: '',
    events: REWARD_EVENTS.map((event) => ({ eventType: event.eventType, enabled: false, amount: '' })),
    ladder: [{ minCount: '1', maxCount: '5', amount: '', enabled: true }],
  });
  const [agentConfig, setAgentConfig] = useState({
    groupCode: 'default',
    groupName: '默认代理规则组',
    enabled: true,
    events: REWARD_EVENTS.map((event) => ({ eventType: event.eventType, enabled: false, amount: '' })),
  });
  const [riskConfig, setRiskConfig] = useState({
    dailyCap: '',
    deviceThreshold: '',
    phoneThreshold: '',
    paymentThreshold: '',
    freezeSwitch: true,
    reviewSwitch: true,
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionRuleVO>(await getPromotionRules({ page, size: 10, ruleType: query.ruleType || undefined, eventType: query.eventType || undefined, status: query.status || undefined }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
      setConfig(responseData<PromotionRuleConfigVO>(await getPromotionRuleConfig()));
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
      effectiveTime: form.effectiveTime ? form.effectiveTime + ':00' : undefined,
      expireTime: form.expireTime ? form.expireTime + ':00' : undefined,
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

  function updateInviteEvent(eventType: string, patch: Partial<{ enabled: boolean; amount: string }>) {
    setInviteConfig((current) => ({
      ...current,
      events: current.events.map((event) => event.eventType === eventType ? { ...event, ...patch } : event),
    }));
  }

  function updateAgentEvent(eventType: string, patch: Partial<{ enabled: boolean; amount: string }>) {
    setAgentConfig((current) => ({
      ...current,
      events: current.events.map((event) => event.eventType === eventType ? { ...event, ...patch } : event),
    }));
  }

  async function saveInviteConfig() {
    if (!window.confirm('确认修改规则？将立即生效')) return;
    await savePromotionInviteRewardConfig({
      events: inviteConfig.events.map((event) => ({ eventType: event.eventType, enabled: event.enabled, amount: Number(event.amount || 0) })),
      successMetric: inviteConfig.successMetric,
      rewardMode: inviteConfig.rewardMode,
      rewardCap: num(inviteConfig.rewardCap),
      effectiveTime: inviteConfig.effectiveTime ? `${inviteConfig.effectiveTime}:00` : undefined,
      expireTime: inviteConfig.expireTime ? `${inviteConfig.expireTime}:00` : undefined,
      ladder: inviteConfig.rewardMode === 'ladder'
        ? inviteConfig.ladder.map((tier) => ({ minCount: Number(tier.minCount), maxCount: Number(tier.maxCount), amount: Number(tier.amount || 0), enabled: tier.enabled }))
        : undefined,
    });
    fetchList();
  }

  async function saveAgentConfig() {
    if (!window.confirm('确认修改规则？将立即生效')) return;
    await savePromotionAgentBonusConfig({
      ruleGroups: [{
        groupCode: agentConfig.groupCode,
        groupName: agentConfig.groupName,
        enabled: agentConfig.enabled,
        events: agentConfig.events.map((event) => ({ eventType: event.eventType, enabled: event.enabled, amount: Number(event.amount || 0) })),
      }],
    });
    fetchList();
  }

  async function saveRiskConfig() {
    if (!window.confirm('确认修改规则？将立即生效')) return;
    await savePromotionRiskConfig({
      dailyCap: num(riskConfig.dailyCap),
      deviceThreshold: num(riskConfig.deviceThreshold),
      phoneThreshold: num(riskConfig.phoneThreshold),
      paymentThreshold: num(riskConfig.paymentThreshold),
      freezeSwitch: riskConfig.freezeSwitch,
      reviewSwitch: riskConfig.reviewSwitch,
    });
    fetchList();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>推广规则配置</CardTitle>
        <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增规则</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="推广规则配置">
          {[
            { key: 'invite', label: '普通用户奖励' },
            { key: 'agent', label: '代理奖励' },
            { key: 'validity', label: '关系有效期' },
            { key: 'risk', label: '风控参数' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeConfigTab === tab.key}
              className={cn(
                'h-9 rounded-md border px-3 text-sm',
                activeConfigTab === tab.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
              )}
              onClick={() => setActiveConfigTab(tab.key as typeof activeConfigTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeConfigTab === 'invite' && (
          <div className="space-y-4 rounded-md border border-border p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1 text-sm font-medium">成功邀请统计节点<Select options={RULE_EVENT_OPTIONS.filter((o) => o.value)} value={inviteConfig.successMetric} onChange={(v) => setInviteConfig({ ...inviteConfig, successMetric: v })} /></label>
              <label className="space-y-1 text-sm font-medium">奖励方式<Select options={[{ value: 'fixed', label: '固定' }, { value: 'ladder', label: '阶梯' }]} value={inviteConfig.rewardMode} onChange={(v) => setInviteConfig({ ...inviteConfig, rewardMode: v })} /></label>
              <label className="space-y-1 text-sm font-medium">奖励上限<Input type="number" value={inviteConfig.rewardCap} onChange={(e) => setInviteConfig({ ...inviteConfig, rewardCap: e.target.value })} /></label>
              <label className="space-y-1 text-sm font-medium">生效时间<Input type="datetime-local" value={inviteConfig.effectiveTime} onChange={(e) => setInviteConfig({ ...inviteConfig, effectiveTime: e.target.value })} /></label>
              <label className="space-y-1 text-sm font-medium">失效时间<Input type="datetime-local" value={inviteConfig.expireTime} onChange={(e) => setInviteConfig({ ...inviteConfig, expireTime: e.target.value })} /></label>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>奖励事件</TableHead><TableHead>启用</TableHead><TableHead>奖励币数</TableHead></TableRow></TableHeader>
              <TableBody>
                {inviteConfig.events.map((event) => (
                  <TableRow key={event.eventType}>
                    <TableCell>{labelOf(event.eventType, EVENT_LABELS)}</TableCell>
                    <TableCell><input type="checkbox" checked={event.enabled} onChange={(e) => updateInviteEvent(event.eventType, { enabled: e.target.checked })} /></TableCell>
                    <TableCell><Input className="w-32" type="number" disabled={!event.enabled} value={event.amount} onChange={(e) => updateInviteEvent(event.eventType, { amount: e.target.value })} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {inviteConfig.rewardMode === 'ladder' && (
              <div className="grid gap-3 md:grid-cols-4">
                <label className="space-y-1 text-sm font-medium">阶梯起始人数<Input type="number" value={inviteConfig.ladder[0].minCount} onChange={(e) => setInviteConfig({ ...inviteConfig, ladder: [{ ...inviteConfig.ladder[0], minCount: e.target.value }] })} /></label>
                <label className="space-y-1 text-sm font-medium">阶梯结束人数<Input type="number" value={inviteConfig.ladder[0].maxCount} onChange={(e) => setInviteConfig({ ...inviteConfig, ladder: [{ ...inviteConfig.ladder[0], maxCount: e.target.value }] })} /></label>
                <label className="space-y-1 text-sm font-medium">单人币数<Input type="number" value={inviteConfig.ladder[0].amount} onChange={(e) => setInviteConfig({ ...inviteConfig, ladder: [{ ...inviteConfig.ladder[0], amount: e.target.value }] })} /></label>
              </div>
            )}
            <div className="flex justify-end"><Button onClick={saveInviteConfig}>保存普通用户奖励</Button></div>
          </div>
        )}
        {activeConfigTab === 'agent' && (
          <div className="space-y-4 rounded-md border border-border p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm font-medium">规则组编码<Input value={agentConfig.groupCode} onChange={(e) => setAgentConfig({ ...agentConfig, groupCode: e.target.value })} /></label>
              <label className="space-y-1 text-sm font-medium">规则组名称<Input value={agentConfig.groupName} onChange={(e) => setAgentConfig({ ...agentConfig, groupName: e.target.value })} /></label>
              <label className="flex items-center gap-2 pt-6 text-sm font-medium"><input type="checkbox" checked={agentConfig.enabled} onChange={(e) => setAgentConfig({ ...agentConfig, enabled: e.target.checked })} />启用规则组</label>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>代理奖金事件</TableHead><TableHead>启用</TableHead><TableHead>单次金额</TableHead></TableRow></TableHeader>
              <TableBody>
                {agentConfig.events.map((event) => (
                  <TableRow key={event.eventType}>
                    <TableCell>{labelOf(event.eventType, EVENT_LABELS)}</TableCell>
                    <TableCell><input type="checkbox" checked={event.enabled} onChange={(e) => updateAgentEvent(event.eventType, { enabled: e.target.checked })} /></TableCell>
                    <TableCell><Input className="w-32" type="number" disabled={!event.enabled} value={event.amount} onChange={(e) => updateAgentEvent(event.eventType, { amount: e.target.value })} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end"><Button onClick={saveAgentConfig}>保存代理奖励</Button></div>
          </div>
        )}
        {activeConfigTab === 'validity' && (
          <div className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-3">
            <InfoItem label="普通邀请关系有效期" value="永久有效" />
            <InfoItem label="代理推广关系有效期" value="永久有效" />
            <InfoItem label="有效期说明" value={config?.relationValidityText || '奖励完成后通常无实际作用，后续新增奖励事件可复用归因'} />
          </div>
        )}
        {activeConfigTab === 'risk' && (
          <div className="space-y-4 rounded-md border border-border p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1 text-sm font-medium">单日奖励上限<Input type="number" value={riskConfig.dailyCap} onChange={(e) => setRiskConfig({ ...riskConfig, dailyCap: e.target.value })} /></label>
              <label className="space-y-1 text-sm font-medium">同设备邀请阈值<Input type="number" value={riskConfig.deviceThreshold} onChange={(e) => setRiskConfig({ ...riskConfig, deviceThreshold: e.target.value })} /></label>
              <label className="space-y-1 text-sm font-medium">同手机号异常阈值<Input type="number" value={riskConfig.phoneThreshold} onChange={(e) => setRiskConfig({ ...riskConfig, phoneThreshold: e.target.value })} /></label>
              <label className="space-y-1 text-sm font-medium">同支付账号异常阈值<Input type="number" value={riskConfig.paymentThreshold} onChange={(e) => setRiskConfig({ ...riskConfig, paymentThreshold: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={riskConfig.freezeSwitch} onChange={(e) => setRiskConfig({ ...riskConfig, freezeSwitch: e.target.checked })} />冻结开关</label>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={riskConfig.reviewSwitch} onChange={(e) => setRiskConfig({ ...riskConfig, reviewSwitch: e.target.checked })} />人工复核开关</label>
            </div>
            <div className="flex justify-end"><Button onClick={saveRiskConfig}>保存风控参数</Button></div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Select className="w-36" options={RULE_TYPE_OPTIONS} value={filters.ruleType} onChange={(v) => setFilters({ ...filters, ruleType: v })} />
          <Select className="w-44" options={RULE_EVENT_OPTIONS} value={filters.eventType} onChange={(v) => setFilters({ ...filters, eventType: v })} />
          <Select className="w-32" options={[{ value: '', label: '全部状态' }, { value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>规则</TableHead><TableHead>数据类型</TableHead><TableHead>事件</TableHead><TableHead>奖励</TableHead><TableHead>上限</TableHead><TableHead>状态</TableHead><TableHead>修改时间</TableHead><TableHead>创建时间</TableHead><TableHead>修改人</TableHead><TableHead>创建人</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><div className="font-medium">{row.ruleName}</div><div className="text-xs text-muted-foreground">{row.remark || '-'}</div></TableCell>
                <TableCell>{labelOf(row.ruleType, RULE_TYPE_LABELS)}</TableCell>
                <TableCell>{labelOf(row.eventType, EVENT_LABELS)}</TableCell>
                <TableCell>{row.rewardAmount} {labelOf(row.rewardUnit, UNIT_LABELS)}</TableCell>
                <TableCell>{row.dailyLimit ?? '-'}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{row.updateTime || '-'}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{row.createTime || '-'}</TableCell>
                <TableCell>{row.updatedByName || row.updatedBy || '-'}</TableCell>
                <TableCell>{row.createdByName || row.createdBy || '-'}</TableCell>
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
  const navigate = useNavigate();
  const [list, setList] = useState<PromotionInviteRelationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ relationNo: '', inviterKeyword: '', inviteeKeyword: '', sourceType: '', status: '', bindStartTime: '', bindEndTime: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionInviteRelationVO>(await getPromotionInvites({
        page,
        size: 10,
        relationNo: query.relationNo || undefined,
        inviterKeyword: query.inviterKeyword || undefined,
        inviteeKeyword: query.inviteeKeyword || undefined,
        sourceType: query.sourceType || undefined,
        status: query.status || undefined,
        bindStartTime: query.bindStartTime ? `${query.bindStartTime}T00:00:00` : undefined,
        bindEndTime: query.bindEndTime ? `${query.bindEndTime}T23:59:59` : undefined,
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
    const empty = { relationNo: '', inviterKeyword: '', inviteeKeyword: '', sourceType: '', status: '', bindStartTime: '', bindEndTime: '' };
    setFilters(empty);
    setPage(1);
    setQuery(empty);
  }

  async function handleInvalid(row: PromotionInviteRelationVO) {
    await invalidatePromotionInvite(row.id, '列表人工标记无效');
    fetchList();
  }

  async function handleUnfreeze(row: PromotionInviteRelationVO) {
    await unfreezePromotionInvite(row.id, '列表人工解除冻结');
    fetchList();
  }

  return (
    <Card>
      <CardHeader><CardTitle>普通邀请关系</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-44" placeholder="邀请关系编号" value={filters.relationNo} onChange={(e) => setFilters({ ...filters, relationNo: e.target.value })} />
          <Input className="w-52" placeholder="邀请人UUID/手机号" value={filters.inviterKeyword} onChange={(e) => setFilters({ ...filters, inviterKeyword: e.target.value })} />
          <Input className="w-52" placeholder="被邀请人UUID/手机号" value={filters.inviteeKeyword} onChange={(e) => setFilters({ ...filters, inviteeKeyword: e.target.value })} />
          <Select className="w-36" options={SOURCE_OPTIONS} value={filters.sourceType} onChange={(v) => setFilters({ ...filters, sourceType: v })} />
          <Select className="w-40" options={INVITE_STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Input className="w-40" type="date" value={filters.bindStartTime} onChange={(e) => setFilters({ ...filters, bindStartTime: e.target.value })} />
          <Input className="w-40" type="date" value={filters.bindEndTime} onChange={(e) => setFilters({ ...filters, bindEndTime: e.target.value })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>邀请关系编号</TableHead><TableHead>邀请人 UUID/昵称</TableHead><TableHead>被邀请人 UUID/手机号</TableHead><TableHead>来源类型</TableHead><TableHead>当前状态</TableHead><TableHead>当前已发放奖励</TableHead><TableHead>绑定时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><button className="font-medium text-primary hover:underline" onClick={() => navigate(`/promotion/invite-relation/${row.id}`)}>{row.relationNo}</button></TableCell>
                <TableCell>{userLine(row.inviterUuid, row.inviterName, undefined)}</TableCell>
                <TableCell>{userLine(row.inviteeUuid, row.inviteeName, row.inviteePhone)}</TableCell>
                <TableCell>{labelOf(row.sourceType, SOURCE_LABELS)}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{row.totalRewardCoin ?? 0}</TableCell>
                <TableCell>{row.bindTime ?? '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/promotion/invite-relation/${row.id}`)}>详情</Button>
                    <Button disabled={row.status !== 'frozen' && row.status !== 'invalid'} variant="ghost" size="sm" onClick={() => navigate(`/promotion/invite-relation/${row.id}`)}>风控</Button>
                    <Button disabled={row.status === 'invalid'} variant="ghost" size="sm" onClick={() => handleInvalid(row)}>标无效</Button>
                    <Button disabled={row.status !== 'frozen'} variant="ghost" size="sm" onClick={() => handleUnfreeze(row)}>解冻</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
    </Card>
  );
}

function RewardsPanel({ frozenOnly = false }: { frozenOnly?: boolean }) {
  const navigate = useNavigate();
  const [list, setList] = useState<PromotionRewardLogVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const defaultStatus = frozenOnly ? 'frozen' : '';
  const [filters, setFilters] = useState({ rewardNo: '', inviterKeyword: '', inviteeKeyword: '', status: defaultStatus, eventType: '', startTime: '', endTime: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{ row: PromotionRewardLogVO; pass: boolean } | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionRewardLogVO>(await getPromotionRewards({
        page,
        size: 10,
        rewardNo: query.rewardNo || undefined,
        inviterKeyword: query.inviterKeyword || undefined,
        inviteeKeyword: query.inviteeKeyword || undefined,
        eventType: query.eventType || undefined,
        status: query.status || undefined,
        startTime: query.startTime ? `${query.startTime}T00:00:00` : undefined,
        endTime: query.endTime ? `${query.endTime}T23:59:59` : undefined,
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
    setQuery(frozenOnly ? { ...filters, status: 'frozen' } : filters);
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
      <CardHeader><CardTitle>{frozenOnly ? '冻结奖励处理页' : '普通邀请奖励流水'}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="w-44" placeholder="奖励流水号" value={filters.rewardNo} onChange={(e) => setFilters({ ...filters, rewardNo: e.target.value })} />
          <Input className="w-48" placeholder="邀请人UUID/手机号" value={filters.inviterKeyword} onChange={(e) => setFilters({ ...filters, inviterKeyword: e.target.value })} />
          <Input className="w-52" placeholder="被邀请人UUID/手机号" value={filters.inviteeKeyword} onChange={(e) => setFilters({ ...filters, inviteeKeyword: e.target.value })} />
          {!frozenOnly && <Select className="w-36" options={REWARD_STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />}
          {frozenOnly && <Select className="w-40" options={[{ value: 'frozen', label: '冻结中' }]} value="frozen" onChange={() => undefined} />}
          <Select className="w-44" options={RULE_EVENT_OPTIONS} value={filters.eventType} onChange={(v) => setFilters({ ...filters, eventType: v })} />
          <Input className="w-40" type="date" value={filters.startTime} onChange={(e) => setFilters({ ...filters, startTime: e.target.value })} />
          <Input className="w-40" type="date" value={filters.endTime} onChange={(e) => setFilters({ ...filters, endTime: e.target.value })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const next = { rewardNo: '', inviterKeyword: '', inviteeKeyword: '', status: defaultStatus, eventType: '', startTime: '', endTime: '' }; setFilters(next); setPage(1); setQuery(next); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>奖励流水号</TableHead><TableHead>邀请人</TableHead><TableHead>被邀请人</TableHead><TableHead>奖励事件</TableHead><TableHead>奖励币数</TableHead>{frozenOnly ? <><TableHead>冻结原因</TableHead><TableHead>冻结时间</TableHead></> : <><TableHead>奖励状态</TableHead><TableHead>创建时间</TableHead><TableHead>到账时间</TableHead></>}<TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={frozenOnly ? 8 : 9} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={frozenOnly ? 8 : 9} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.rewardNo}</TableCell>
                <TableCell>{userLine(row.inviterUuid, row.inviterName, row.inviterPhone)}</TableCell>
                <TableCell>{userLine(row.inviteeUuid, row.inviteeName, row.inviteePhone)}</TableCell>
                <TableCell>{labelOf(row.eventType, EVENT_LABELS)}</TableCell>
                <TableCell>{row.rewardCoin}</TableCell>
                {frozenOnly ? (
                  <>
                    <TableCell>{labelOf(row.riskReason, RISK_LABELS)}</TableCell>
                    <TableCell>{row.frozenTime || row.createTime || '-'}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell>{row.createTime || '-'}</TableCell>
                    <TableCell>{row.arriveTime || '-'}</TableCell>
                  </>
                )}
                <TableCell>
                  <div className="flex gap-1">
                    {!frozenOnly && <Button variant="ghost" size="sm" onClick={() => row.relationId && navigate(`/promotion/invite-relation/${row.relationId}`)}>详情</Button>}
                    <Button disabled={row.status !== 'frozen'} variant="ghost" size="sm" onClick={() => openReviewDialog(row, true)}><Check className="mr-1 h-4 w-4" />确认发放</Button>
                    <Button disabled={row.status !== 'frozen'} variant="ghost" size="sm" onClick={() => openReviewDialog(row, false)}><X className="mr-1 h-4 w-4" />确认无效</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={!!reviewDialog} onClose={() => setReviewDialog(null)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{reviewDialog?.pass ? '确认有效并发放' : '确认无效并作废'}</DialogTitle>
          <DialogDescription>{reviewDialog?.pass ? '确认后奖励将写入发放流水，并移出冻结队列' : '作废后不可恢复，请填写处理备注'}</DialogDescription>
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
              {reviewDialog.pass ? '审核备注' : '处理备注'}
              <textarea
                className="min-h-[96px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={reviewRemark}
                onChange={(e) => setReviewRemark(e.target.value)}
                placeholder={reviewDialog.pass ? '可选' : '请输入处理备注'}
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
  const navigate = useNavigate();
  const [list, setList] = useState<PromotionAgentVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ agentNo: '', keyword: '', school: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [codeDialog, setCodeDialog] = useState<{ qrCode: string; miniappPath: string; qrUrl?: string } | null>(null);
  const [editing, setEditing] = useState<PromotionAgentVO | null>(null);
  const [form, setForm] = useState({ agentName: '', contactName: '', contactPhone: '', school: '', campus: '', bonusRuleGroup: '', status: 'normal', remark: '' });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionAgentVO>(await getPromotionAgents({ page, size: 10, agentNo: query.agentNo || undefined, keyword: query.keyword || undefined, school: query.school || undefined, status: query.status || undefined }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);
  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({ agentName: '', contactName: '', contactPhone: '', school: '', campus: '', bonusRuleGroup: '', status: 'normal', remark: '' });
    setDialogOpen(true);
  }

  function openEdit(row: PromotionAgentVO) {
    setEditing(row);
    setForm({ agentName: row.agentName, contactName: row.contactName ?? '', contactPhone: row.contactPhone ?? '', school: row.school ?? '', campus: row.campus ?? '', bonusRuleGroup: row.bonusRuleGroup ?? '', status: row.status ?? 'normal', remark: row.remark ?? '' });
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
      <CardHeader className="flex-row items-center justify-between"><CardTitle>代理列表</CardTitle><Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增代理</Button></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="w-44" placeholder="代理编号" value={filters.agentNo} onChange={(e) => setFilters({ ...filters, agentNo: e.target.value })} />
          <Input className="w-48" placeholder="代理名称" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
          <Input className="w-40" placeholder="学校" value={filters.school} onChange={(e) => setFilters({ ...filters, school: e.target.value })} />
          <Select className="w-36" options={AGENT_STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={() => { setPage(1); setQuery(filters); }}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const empty = { agentNo: '', keyword: '', school: '', status: '' }; setFilters(empty); setPage(1); setQuery(empty); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>代理编号</TableHead><TableHead>代理名称</TableHead><TableHead>学校</TableHead><TableHead>累计扫码/点击数</TableHead><TableHead>累计注册数</TableHead><TableHead>累计成功邀请人数</TableHead><TableHead>累计应发奖金</TableHead><TableHead>累计已发奖金</TableHead><TableHead>累计待结算奖金</TableHead><TableHead>合作状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><button className="font-medium text-primary hover:underline" onClick={() => navigate(`/promotion/agent/${row.id}`)}>{row.agentNo || '-'}</button></TableCell>
                <TableCell><div className="font-medium">{row.agentName}</div><div className="text-xs text-muted-foreground">{row.contactName || '-'} / {row.contactPhone || '-'}</div></TableCell>
                <TableCell>{row.school || '-'}<div className="text-xs text-muted-foreground">{row.campus || '-'}</div></TableCell>
                <TableCell>{row.stat?.clickCnt ?? 0}</TableCell>
                <TableCell>{row.stat?.registerCnt ?? 0}</TableCell>
                <TableCell>{row.stat?.successCnt ?? 0}</TableCell>
                <TableCell>{amount(row.bonusDueAmount ?? row.stat?.bonusDueAmount)}</TableCell>
                <TableCell>{amount(row.bonusPaidAmount ?? row.stat?.bonusPaidAmount)}</TableCell>
                <TableCell>{amount(row.bonusPendingAmount ?? row.stat?.bonusPendingAmount)}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1"><Button variant="ghost" size="sm" onClick={() => navigate(`/promotion/agent/${row.id}`)}>详情</Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button><Button disabled={row.status !== 'normal'} variant="ghost" size="sm" onClick={() => updatePromotionAgentStatus(row.id, 'paused').then(fetchList)}>暂停</Button><Button disabled={row.status !== 'paused'} variant="ghost" size="sm" onClick={() => updatePromotionAgentStatus(row.id, 'normal').then(fetchList)}>恢复</Button><Button disabled={row.status === 'terminated'} variant="ghost" size="sm" onClick={() => updatePromotionAgentStatus(row.id, 'terminated').then(fetchList)}>终止</Button><Button variant="ghost" size="sm" onClick={() => handleCode(row.id)}><QrCode className="mr-1 h-4 w-4" />二维码</Button></div></TableCell>
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
          <label className="space-y-1 text-sm font-medium">奖金规则组<Input value={form.bonusRuleGroup} onChange={(e) => setForm({ ...form, bonusRuleGroup: e.target.value })} /></label>
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

function MaterialsPanel() {
  const [list, setList] = useState<PromotionAgentQrCodeVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ agentKeyword: '', qrCode: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<PromotionAgentQrCodeVO>(await getPromotionMaterials({
        page,
        size: 10,
        agentKeyword: query.agentKeyword || undefined,
        qrCode: query.qrCode || undefined,
        status: query.status || undefined,
      }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function handleRegenerate(row: PromotionAgentQrCodeVO) {
    await regeneratePromotionMaterial(row.id);
    fetchList();
  }

  async function handleDisable(row: PromotionAgentQrCodeVO) {
    await disablePromotionMaterial(row.id, '停用展示');
    fetchList();
  }

  return (
    <Card>
      <CardHeader><CardTitle>推广素材与二维码管理</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="w-48" placeholder="代理编号/名称" value={filters.agentKeyword} onChange={(e) => setFilters({ ...filters, agentKeyword: e.target.value })} />
          <Input className="w-44" placeholder="二维码编号" value={filters.qrCode} onChange={(e) => setFilters({ ...filters, qrCode: e.target.value })} />
          <Select className="w-36" options={[{ value: '', label: '全部状态' }, { value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }]} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={() => { setPage(1); setQuery(filters); }}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const empty = { agentKeyword: '', qrCode: '', status: '' }; setFilters(empty); setPage(1); setQuery(empty); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>代理编号</TableHead><TableHead>所属代理</TableHead><TableHead>二维码编号</TableHead><TableHead>专属二维码</TableHead><TableHead>小程序专属路径</TableHead><TableHead>二维码素材模板</TableHead><TableHead>二维码状态</TableHead><TableHead>有效期</TableHead><TableHead>当前版本</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.agentNo || '-'}</TableCell>
                <TableCell>{row.agentName || '-'}</TableCell>
                <TableCell>
                  <div className="font-medium">{row.qrCode}</div>
                </TableCell>
                <TableCell><img className="h-16 w-16 rounded border border-border" src={row.qrUrl || qrImageUrl(row.miniappPath || row.qrCode)} alt="推广二维码" /></TableCell>
                <TableCell className="max-w-xs break-all text-xs text-muted-foreground">{row.miniappPath}</TableCell>
                <TableCell>{row.materialTemplate || '默认海报模板'}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{row.validityText || '永久有效'}</TableCell>
                <TableCell>{row.versionNo}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => window.open(row.qrUrl || qrImageUrl(row.miniappPath || row.qrCode), '_blank')}>下载</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRegenerate(row)}>重生成</Button>
                    <Button disabled={row.status === 'disabled'} variant="ghost" size="sm" onClick={() => handleDisable(row)}>停用</Button>
                    <Button disabled={(row.versionNo ?? 1) <= 1} variant="ghost" size="sm">历史</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
    </Card>
  );
}

function SettlementsPanel() {
  const [list, setList] = useState<PromotionSettlementVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ settlementNo: '', agentKeyword: '', period: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [settlementDialog, setSettlementDialog] = useState<{ row: PromotionSettlementVO; action: 'confirm' | 'paid' } | null>(null);
  const [settlementRemark, setSettlementRemark] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [settlementSaving, setSettlementSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const periodStart = query.period ? `${query.period}-01` : undefined;
      const periodEnd = query.period ? monthEnd(query.period) : undefined;
      const data = pageData<PromotionSettlementVO>(await getPromotionSettlements({ page, size: 10, settlementNo: query.settlementNo || undefined, agentKeyword: query.agentKeyword || undefined, status: query.status || undefined, periodStart, periodEnd }));
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
      <CardHeader><CardTitle>代理结算管理</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="w-44" placeholder="结算单号" value={filters.settlementNo} onChange={(e) => setFilters({ ...filters, settlementNo: e.target.value })} />
          <Input className="w-52" placeholder="代理编号/名称" value={filters.agentKeyword} onChange={(e) => setFilters({ ...filters, agentKeyword: e.target.value })} />
          <Input className="w-40" type="month" value={filters.period} onChange={(e) => setFilters({ ...filters, period: e.target.value })} />
          <Select className="w-36" options={SETTLEMENT_STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={() => { setPage(1); setQuery(filters); }}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const empty = { settlementNo: '', agentKeyword: '', period: '', status: '' }; setFilters(empty); setPage(1); setQuery(empty); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
          <Button variant="outline" size="sm" disabled={list.length === 0}>导出结算列表</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>结算单号</TableHead><TableHead>代理</TableHead><TableHead>结算周期</TableHead><TableHead>统计口径说明</TableHead><TableHead>应结算金额</TableHead><TableHead>已结算金额</TableHead><TableHead>结算状态</TableHead><TableHead>备注</TableHead><TableHead>收款相关信息</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">加载中...</TableCell></TableRow> : list.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow> : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell><div className="font-medium">{row.settlementNo}</div></TableCell>
                <TableCell>{row.agentDisplay || `${row.agentNo || '-'} / ${row.agentName || '-'}`}</TableCell>
                <TableCell>{periodText(row)}</TableCell>
                <TableCell>{row.caliberDesc || row.statsDesc || '-'}</TableCell>
                <TableCell>{row.payableAmount}</TableCell>
                <TableCell>{row.paidAmount ?? 0}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{row.remark || '-'}</TableCell>
                <TableCell>{row.payeeInfo || '首版不采集'}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1"><Button disabled={row.status !== 'unsettled'} variant="ghost" size="sm" onClick={() => openSettlementDialog(row, 'confirm')}>标记已确认</Button><Button disabled={row.status !== 'confirmed'} variant="ghost" size="sm" onClick={() => openSettlementDialog(row, 'paid')}>标记已发放</Button><Button variant="ghost" size="sm">导出明细</Button></div></TableCell>
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
