import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { createCommunityExport, getCommunityReportDetail, getCommunityReportEvidence, getCommunityReportPage, getCommunityReportStats, handleCommunityReport, viewCommunityReportEvidenceContent, type CommunityReportAdminVO, type CommunityStatCard, type ReportEvidenceVO, type ReportSensitiveContentVO } from '@/api/community';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer } from '@/components/ui/drawer';
import { showToast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/usePermission';
import { AuditTimeline, BodyCell, CommunityPage, CommunityPageHeader, ConfirmActionDialog, DataRowsState, DetailGrid, DetailSection, Field, FilterPanel, HeaderCell, Input, NativeSelect, PageFooter, PermissionState, StatGrid, TableFrame, TableHead, DEFAULT_PAGE_SIZE, metaCopy, metaLabel, metaOptions, normalizeStats, statusPill, unwrapData, useCommunityList, useCommunityMeta } from '@/features/community/communityUi';

interface ReportQuery {
  page: number;
  size: number;
  keyword: string;
  targetType: string;
  status: string;
  reasonCode: string;
  startTime: string;
  endTime: string;
}

const INITIAL_QUERY: ReportQuery = { page: 1, size: DEFAULT_PAGE_SIZE, keyword: '', targetType: '', status: '', reasonCode: '', startTime: '', endTime: '' };

export default function CommunityReportsPage() {
  const { meta, loading: metaLoading } = useCommunityMeta();
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission('community:report:list');
  const initialQuery = useMemo(() => INITIAL_QUERY, []);
  const fetcher = useCallback((query: ReportQuery) => getCommunityReportPage({ ...query }), []);
  const list = useCommunityList<CommunityReportAdminVO, ReportQuery>(initialQuery, fetcher, canView);
  const [stats, setStats] = useState<CommunityStatCard[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [current, setCurrent] = useState<CommunityReportAdminVO | null>(null);
  const [result, setResult] = useState('');
  const [punishAction, setPunishAction] = useState('');
  const [handleRemark, setHandleRemark] = useState('');
  const [mutePeriod, setMutePeriod] = useState('');
  const [riskIp, setRiskIp] = useState('');
  const [ipBlockPeriod, setIpBlockPeriod] = useState('');
  const [ipBlockScopes, setIpBlockScopes] = useState<string[]>([]);
  const [mergeIntoReportNo, setMergeIntoReportNo] = useState('');
  const [replyReporter, setReplyReporter] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [evidence, setEvidence] = useState<ReportEvidenceVO[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceTarget, setEvidenceTarget] = useState<ReportEvidenceVO | null>(null);
  const [evidenceReason, setEvidenceReason] = useState('');
  const [evidenceContent, setEvidenceContent] = useState<ReportSensitiveContentVO | null>(null);
  const [evidenceContentLoading, setEvidenceContentLoading] = useState(false);
  const canRiskHandle = hasAnyPermission('community:report:risk');
  const configuredResults = metaOptions(meta, 'reportResult');
  const resultOptions = configuredResults.length ? configuredResults : metaOptions(meta, 'reportStatus').filter((item) => ['valid', 'invalid', 'merged'].includes(item.code));
  const punishOptions = metaOptions(meta, 'punishAction').filter((item) => canRiskHandle || !['mute_user', 'ip_block', 'freeze_user'].includes(item.code));
  const punish = punishOptions.find((item) => item.code === punishAction);
  const muteSelected = Boolean(punish?.extra?.muteRequired) || punishAction === 'mute_user';
  const ipBlockSelected = Boolean(punish?.extra?.ipRequired) || punishAction === 'ip_block';
  const highRisk = punish?.tone === 'danger' || Boolean(punish?.extra?.highRisk) || ['block_content', 'block_comment', 'mute_user', 'ip_block', 'freeze_user'].includes(punishAction);

  useEffect(() => {
    if (!canView) {
      setStatsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setStatsLoading(true);
    getCommunityReportStats()
      .then((response) => { if (!cancelled) setStats(normalizeStats(response, meta, 'report_stat')); })
      .catch(() => { if (!cancelled) setStats([]); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [canView, meta]);

  if (!canView) {
    return <CommunityPage><CommunityPageHeader title="举报管理" description="统一处理内容、评论、用户和聊天来源举报，查看可信上下文并执行合并、下架、屏蔽、警告、禁言、IP 封禁或账号冻结。" /><PermissionState copy={metaCopy(meta, 'permission_denied')} /></CommunityPage>;
  }

  async function openDetail(row: CommunityReportAdminVO) {
    setCurrent(row);
    setDrawerOpen(true);
    setDetailLoading(true);
    setResult('');
    setPunishAction('');
    setHandleRemark('');
    setMutePeriod('');
    setRiskIp('');
    setIpBlockPeriod('');
    setIpBlockScopes([]);
    setMergeIntoReportNo('');
    setReplyReporter(true);
    setEvidence([]);
    setEvidenceTarget(null);
    setEvidenceContent(null);
    try {
      const value = unwrapData<CommunityReportAdminVO>(await getCommunityReportDetail(row.id), row);
      setCurrent(value);
      if (value.reportNo && ['chat', 'message', 'conversation', 'whisper'].includes(value.targetType)) {
        setEvidenceLoading(true);
        try {
          setEvidence(unwrapData<ReportEvidenceVO[]>(await getCommunityReportEvidence(value.reportNo), []));
        } finally {
          setEvidenceLoading(false);
        }
      }
    } finally {
      setDetailLoading(false);
    }
  }

  async function revealEvidence() {
    if (!current?.reportNo || !evidenceTarget) return;
    if (evidenceReason.trim().length < 5) return showToast('查看原因至少填写5个字符', 'error');
    setEvidenceContentLoading(true);
    try {
      setEvidenceContent(unwrapData<ReportSensitiveContentVO>(await viewCommunityReportEvidenceContent(
        current.reportNo, evidenceTarget.evidenceNo, {
          viewReason: evidenceReason.trim(),
          requestId: `ADMIN-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        }), null as any));
    } finally {
      setEvidenceContentLoading(false);
    }
  }

  async function submitHandle() {
    if (!current || !result) return;
    setSaving(true);
    try {
      await handleCommunityReport(current.id, {
        action: result,
        reason: handleRemark,
        result,
        punishAction: punishAction || undefined,
        version: Number(current.version ?? 0),
        handleRemark,
        mutePeriod: mutePeriod || undefined,
        riskIp: riskIp || undefined,
        ipBlockPeriod: ipBlockPeriod || undefined,
        ipBlockScopes: ipBlockScopes.length ? ipBlockScopes : undefined,
        mergeIntoReportNo: mergeIntoReportNo || undefined,
        replyReporter,
      });
      showToast(metaCopy(meta, 'report_action_success'), 'success');
      setConfirmOpen(false);
      closeDrawer();
      await list.load();
    } catch (cause) {
      if (cause instanceof Error && /version|版本|conflict/i.test(cause.message)) showToast(metaCopy(meta, 'version_conflict'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function requestSubmit() {
    if (!result) return showToast(metaCopy(meta, 'report_result_required'), 'error');
    const resultOption = resultOptions.find((item) => item.code === result);
    if ((resultOption?.extra?.punishRequired || result === 'valid') && !punishAction) return showToast(metaCopy(meta, 'punish_required'), 'error');
    if (muteSelected && !mutePeriod) return showToast(metaCopy(meta, 'mute_period_required'), 'error');
    if (ipBlockSelected && (!riskIp || !ipBlockPeriod || !ipBlockScopes.length)) return showToast(metaCopy(meta, 'ip_block_fields_required'), 'error');
    if ((resultOption?.extra?.mergeRequired || result === 'merged') && !mergeIntoReportNo.trim()) return showToast(metaCopy(meta, 'merge_report_required'), 'error');
    if (!handleRemark.trim()) return showToast(metaCopy(meta, 'reason_required'), 'error');
    if (highRisk || resultOption?.tone === 'danger') setConfirmOpen(true);
    else void submitHandle();
  }

  function toggleScope(code: string) {
    setIpBlockScopes((currentScopes) => currentScopes.includes(code) ? currentScopes.filter((item) => item !== code) : [...currentScopes, code]);
  }

  const canHandle = hasAnyPermission('community:report:handle');
  const canExport = hasAnyPermission('community:export:create');
  const reportEditable = Boolean(current && ['pending', 'processing'].includes(current.status));
  const canHandleCurrent = canHandle && reportEditable;
  const canViewEvidenceContent = hasAnyPermission('message:report-context:view');
  const closeDrawer = () => {
    setDrawerOpen(false);
    setEvidence([]);
    setEvidenceTarget(null);
    setEvidenceContent(null);
    setEvidenceReason('');
  };

  return (
    <CommunityPage>
      <CommunityPageHeader title="举报管理" description="统一处理内容、评论、用户和聊天来源举报，查看可信上下文并执行合并、下架、屏蔽、警告、禁言、IP 封禁或账号冻结。" actions={canExport ? <Button variant="outline" onClick={() => void createCommunityExport('reports', list.query).then(() => showToast(metaCopy(meta, 'export_created'), 'success'))}><Download className="mr-1.5 h-4 w-4" />导出</Button> : undefined} />
      <StatGrid cards={stats} loading={statsLoading || metaLoading} />
      <FilterPanel onSearch={list.search} onReset={list.reset} busy={list.loading}>
        <Field label="举报编号"><Input value={list.filters.keyword} onChange={(event) => list.setFilters({ ...list.filters, keyword: event.target.value })} placeholder="举报编号 / 用户 / 对象编号" /></Field>
        <Field label="举报对象"><NativeSelect value={list.filters.targetType} onChange={(value) => list.setFilters({ ...list.filters, targetType: value })} options={metaOptions(meta, 'reportTargetType')} /></Field>
        <Field label="处理状态"><NativeSelect value={list.filters.status} onChange={(value) => list.setFilters({ ...list.filters, status: value })} options={metaOptions(meta, 'reportStatus')} /></Field>
        <Field label="举报原因"><NativeSelect value={list.filters.reasonCode} onChange={(value) => list.setFilters({ ...list.filters, reasonCode: value })} options={metaOptions(meta, 'reportReason')} /></Field>
        <Field label="开始日期"><Input type="date" value={list.filters.startTime} onChange={(event) => list.setFilters({ ...list.filters, startTime: event.target.value })} /></Field>
        <Field label="结束日期"><Input type="date" value={list.filters.endTime} onChange={(event) => list.setFilters({ ...list.filters, endTime: event.target.value })} /></Field>
      </FilterPanel>
      <TableFrame minWidth={1120}>
        <TableHead><tr><HeaderCell>举报编号</HeaderCell><HeaderCell>类型/对象</HeaderCell><HeaderCell>举报人</HeaderCell><HeaderCell>被举报人</HeaderCell><HeaderCell>原因</HeaderCell><HeaderCell>状态</HeaderCell><HeaderCell>回复</HeaderCell><HeaderCell>时间</HeaderCell><HeaderCell className="sticky right-0 bg-slate-50">操作</HeaderCell></tr></TableHead>
        {list.loading || list.error || !list.pageData.records.length ? <DataRowsState colSpan={9} loading={list.loading} error={list.error} emptyText={metaCopy(meta, 'report_empty')} onRetry={list.load} /> : (
          <tbody>{list.pageData.records.map((row) => <tr key={row.id} className="hover:bg-slate-50/70"><BodyCell>{row.reportNo || row.id}</BodyCell><BodyCell><div>{metaLabel(meta, 'reportTargetType', row.targetType)}</div><div className="mt-0.5 text-xs text-slate-400">{row.targetNo || row.targetId}</div></BodyCell><BodyCell><div>{row.reporterNo || row.reporterId}</div><div className="mt-0.5 text-xs text-slate-400">{row.reporterName || '-'}</div></BodyCell><BodyCell><div>{row.targetUserNo || row.targetUserId || '-'}</div><div className="mt-0.5 text-xs text-slate-400">{row.targetUserName || '-'}</div></BodyCell><BodyCell>{metaLabel(meta, 'reportReason', row.reasonCode, row.reasonLabel)}</BodyCell><BodyCell>{statusPill(meta, 'reportStatus', row.status, row.statusName)}</BodyCell><BodyCell>{metaLabel(meta, 'replyStatus', row.replyStatus)}</BodyCell><BodyCell className="whitespace-nowrap">{row.createTime || '-'}</BodyCell><BodyCell className="sticky right-0 bg-white"><Button variant="ghost" size="sm" onClick={() => void openDetail(row)}><Eye className="mr-1 h-3.5 w-3.5" />详情</Button></BodyCell></tr>)}</tbody>
        )}
      </TableFrame>
      <PageFooter current={list.query.page} total={list.pageData.total} pageSize={list.query.size} onChange={list.setPage} onPageSizeChange={list.setPageSize} />

      <Drawer open={drawerOpen} onClose={closeDrawer} title="举报详情" description={metaCopy(meta, 'report_detail_description')} className="w-[760px]" footer={canHandleCurrent ? <div className="flex justify-end gap-2"><Button variant="outline" onClick={closeDrawer}>关闭</Button><Button onClick={requestSubmit} disabled={saving || detailLoading}>保存处理</Button></div> : undefined}>
        {detailLoading || !current ? <div className="py-20 text-center text-sm text-slate-400">加载中</div> : <div className="space-y-4">
          <DetailGrid items={[{ label: '举报编号', value: current.reportNo || current.id }, { label: '举报对象', value: `${metaLabel(meta, 'reportTargetType', current.targetType)} / ${current.targetNo || current.targetId}` }, { label: '举报人', value: `${current.reporterNo || current.reporterId} / ${current.reporterName || '-'}` }, { label: '被举报人', value: `${current.targetUserNo || current.targetUserId || '-'} / ${current.targetUserName || '-'}` }, { label: '举报原因', value: metaLabel(meta, 'reportReason', current.reasonCode, current.reasonLabel) }, { label: '当前状态', value: statusPill(meta, 'reportStatus', current.status, current.statusName) }]} />
          <DetailSection title="举报上下文">{current.context?.available === false ? <div className="rounded-lg bg-amber-50 p-3 text-amber-700">{current.context.unavailableReason || metaCopy(meta, 'report_context_unavailable')}</div> : <div className="space-y-2"><p className="whitespace-pre-wrap">{current.context?.content || current.context?.summary || current.extraText || '-'}</p>{current.context?.sourceNo && <p className="text-xs text-slate-400">{current.context.sourceNo}</p>}{Boolean(current.context?.imageUrls?.length) && <div className="grid grid-cols-3 gap-2">{current.context?.imageUrls?.map((url) => <img key={url} src={url} alt="举报证据" className="aspect-square rounded-lg object-cover" />)}</div>}</div>}</DetailSection>
          {['chat', 'message', 'conversation', 'whisper'].includes(current.targetType) && <DetailSection title="聊天举报冻结证据">{evidenceLoading ? <p>证据加载中...</p> : !evidence.length ? <p className="text-slate-400">暂无可用冻结证据</p> : <div className="space-y-3">{evidence.map(item => <div key={item.evidenceNo} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{item.evidenceNo}</strong><p className="mt-1 text-xs text-slate-500">{item.sourceBizNo || '-'} · {item.messageType || '-'} · {item.eventTime || '-'}</p></div><Button size="sm" variant="outline" disabled={!canViewEvidenceContent || !item.contentAvailable} title={!item.contentAvailable ? '正文不可用' : canViewEvidenceContent ? '查看冻结正文' : '无查看权限'} onClick={() => { setEvidenceTarget(item); setEvidenceReason(''); setEvidenceContent(null); }}>{!item.contentAvailable ? '正文不可用' : '查看冻结正文'}</Button></div><div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2"><span>会话：{item.conversationNo || '-'}</span><span>参与方：{item.senderMask || '-'} → {item.receiverMask || '-'}</span><span>快照：{item.snapshotAt || '-'}</span><span>留存至：{item.retainUntil || '-'}</span></div></div>)}</div>}</DetailSection>}
          <DetailSection title="操作日志"><AuditTimeline logs={current.auditLogs} emptyText={metaCopy(meta, 'audit_log_empty')} /></DetailSection>
          {canHandleCurrent ? <DetailSection title="举报处理"><div className="grid gap-3 sm:grid-cols-2">
            <Field label="处理结论"><NativeSelect includeAll={false} value={result} onChange={setResult} options={resultOptions} /></Field>
            <Field label="处罚动作"><NativeSelect includeAll={false} value={punishAction} onChange={setPunishAction} options={punishOptions} /></Field>
            {muteSelected && <Field label="禁言周期"><NativeSelect includeAll={false} value={mutePeriod} onChange={setMutePeriod} options={metaOptions(meta, 'mutePeriod')} /></Field>}
            {ipBlockSelected && <><Field label="风险 IP"><Input value={riskIp} onChange={(event) => setRiskIp(event.target.value)} placeholder={current.riskIpMasked || ''} /></Field><Field label="IP 封禁周期"><NativeSelect includeAll={false} value={ipBlockPeriod} onChange={setIpBlockPeriod} options={metaOptions(meta, 'ipBlockPeriod')} /></Field><Field label="封禁范围" className="sm:col-span-2"><div className="flex flex-wrap gap-2">{metaOptions(meta, 'writeScope').map((option) => <label key={option.code} className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-normal"><input type="checkbox" checked={ipBlockScopes.includes(option.code)} onChange={() => toggleScope(option.code)} />{option.label}</label>)}</div></Field></>}
            {(Boolean(resultOptions.find((item) => item.code === result)?.extra?.mergeRequired) || result === 'merged') && <Field label="主举报编号"><Input value={mergeIntoReportNo} onChange={(event) => setMergeIntoReportNo(event.target.value)} /></Field>}
            <Field label="回复举报人"><NativeSelect includeAll={false} value={String(replyReporter)} onChange={(value) => setReplyReporter(value === 'true')} options={metaOptions(meta, 'yesNo')} /></Field>
            <Field label="处理说明" className="sm:col-span-2"><textarea value={handleRemark} onChange={(event) => setHandleRemark(event.target.value)} rows={4} className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></Field>
          </div></DetailSection> : canHandle && <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">该举报已处理，处理结果仅供查看。</div>}
        </div>}
      </Drawer>
      <ConfirmActionDialog open={confirmOpen} title={metaCopy(meta, 'report_high_risk_title')} description={punish?.description || metaCopy(meta, 'report_high_risk_description')} confirmText={punish?.label || metaCopy(meta, 'confirm_punish')} cancelText={metaCopy(meta, 'cancel_action')} busyText={metaCopy(meta, 'processing')} busy={saving} danger onClose={() => setConfirmOpen(false)} onConfirm={() => void submitHandle()} />
      <Dialog open={Boolean(evidenceTarget)} onClose={() => { setEvidenceTarget(null); setEvidenceContent(null); setEvidenceReason(''); }} layer="nested" lockBodyScroll={false} className="max-w-[620px]" ariaLabel="查看冻结消息正文"><DialogHeader><DialogTitle>查看冻结消息正文</DialogTitle></DialogHeader>{!evidenceContent ? <div className="mt-4 space-y-4"><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">查看对象：{evidenceTarget?.evidenceNo}。本次访问将记录管理员、原因、时间和结果。</p><Input maxLength={100} value={evidenceReason} onChange={(event) => setEvidenceReason(event.target.value)} placeholder="请填写案件核查的具体原因"/><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEvidenceTarget(null)}>取消</Button><Button disabled={evidenceContentLoading} onClick={() => void revealEvidence()}>{evidenceContentLoading ? '查询中...' : '确认并查看'}</Button></div></div> : <div className="mt-4 space-y-3"><div className="text-xs text-slate-500">审计编号：{evidenceContent.accessNo}</div><div className="rounded-lg border p-4"><div className="mb-2 text-xs text-slate-500">{evidenceContent.evidenceNo} · {evidenceContent.eventTime || '-'}</div><div className="whitespace-pre-wrap break-words">{evidenceContent.content}</div></div></div>}</Dialog>
    </CommunityPage>
  );
}
