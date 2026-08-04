import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { createCommunityExport, getCommunityCommentDetail, getCommunityCommentPage, getCommunityCommentStats, handleCommunityComment, type CommunityCommentAdminVO, type CommunityStatCard } from '@/api/community';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { showToast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/usePermission';
import { AuditTimeline, BodyCell, CommunityPage, CommunityPageHeader, ConfirmActionDialog, DataRowsState, DetailGrid, DetailSection, Field, FilterPanel, HeaderCell, Input, NativeSelect, PageFooter, PermissionState, StatGrid, TableFrame, TableHead, DEFAULT_PAGE_SIZE, metaCopy, metaLabel, metaOptions, normalizeStats, statusPill, unwrapData, useCommunityList, useCommunityMeta } from '@/features/community/communityUi';

interface CommentQuery {
  page: number;
  size: number;
  keyword: string;
  userId: string;
  postNo: string;
  status: string;
  reported: string;
  startTime: string;
  endTime: string;
}

const INITIAL_QUERY: CommentQuery = { page: 1, size: DEFAULT_PAGE_SIZE, keyword: '', userId: '', postNo: '', status: '', reported: '', startTime: '', endTime: '' };

function commentActionAllowed(status: string | undefined, action: string) {
  const allowed: Record<string, string[]> = {
    pending_machine: ['published', 'rejected', 'blocked', 'warn_user', 'mute_user'],
    published: ['rejected', 'blocked', 'warn_user', 'mute_user'],
    blocked: ['published', 'warn_user', 'mute_user'],
  };
  return Boolean(status && allowed[status]?.includes(action));
}

export default function CommunityCommentAuditPage() {
  const { meta, loading: metaLoading } = useCommunityMeta();
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission('community:comment:list');
  const initialQuery = useMemo(() => INITIAL_QUERY, []);
  const fetcher = useCallback((query: CommentQuery) => getCommunityCommentPage({ ...query, reported: query.reported === '' ? undefined : query.reported === 'true' }), []);
  const list = useCommunityList<CommunityCommentAdminVO, CommentQuery>(initialQuery, fetcher, canView);
  const [stats, setStats] = useState<CommunityStatCard[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [current, setCurrent] = useState<CommunityCommentAdminVO | null>(null);
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [mutePeriod, setMutePeriod] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canRiskHandle = hasAnyPermission('community:comment:risk');
  const configuredActions = metaOptions(meta, 'commentAction');
  const actionOptions = configuredActions.length ? configuredActions : metaOptions(meta, 'commentStatus').filter((item) => ['published', 'rejected', 'blocked'].includes(item.code));
  const availableActionOptions = current ? actionOptions.filter((item) =>
    commentActionAllowed(current.status, item.code) && (item.code !== 'mute_user' || canRiskHandle)) : actionOptions;
  const selectedAction = availableActionOptions.find((item) => item.code === action);
  const highRisk = selectedAction?.tone === 'danger' || Boolean(selectedAction?.extra?.highRisk) || /block|restore|mute|reject|remove/i.test(action) || (current?.status === 'blocked' && action === 'published');

  useEffect(() => {
    if (!canView) {
      setStatsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setStatsLoading(true);
    getCommunityCommentStats()
      .then((response) => { if (!cancelled) setStats(normalizeStats(response, meta, 'comment_stat')); })
      .catch(() => { if (!cancelled) setStats([]); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [canView, meta]);

  if (!canView) {
    return <CommunityPage><CommunityPageHeader title="评论管理" description="查询评论与回复，查看所属内容、机审摘要、点赞与举报；屏蔽、恢复和复核统一在详情抽屉完成。" /><PermissionState copy={metaCopy(meta, 'permission_denied')} /></CommunityPage>;
  }

  async function openDetail(row: CommunityCommentAdminVO) {
    setCurrent(row);
    setDrawerOpen(true);
    setDetailLoading(true);
    setAction('');
    setReason('');
    setMutePeriod('');
    try {
      setCurrent(unwrapData<CommunityCommentAdminVO>(await getCommunityCommentDetail(row.id), row));
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitAction() {
    if (!current || !action) return;
    setSaving(true);
    try {
      await handleCommunityComment(current.id, { action, reason: reason || undefined, version: Number(current.version ?? 0), mutePeriod: mutePeriod || undefined, notifyUser: true });
      showToast(metaCopy(meta, 'comment_action_success'), 'success');
      setConfirmOpen(false);
      setDrawerOpen(false);
      await list.load();
    } catch (cause) {
      if (cause instanceof Error && /version|版本|conflict/i.test(cause.message)) showToast(metaCopy(meta, 'version_conflict'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function requestSubmit() {
    if (!action) return showToast(metaCopy(meta, 'action_required'), 'error');
    if ((selectedAction?.extra?.reasonRequired || highRisk) && !reason.trim()) return showToast(metaCopy(meta, 'reason_required'), 'error');
    if ((selectedAction?.extra?.muteRequired || /mute/i.test(action)) && !mutePeriod) return showToast(metaCopy(meta, 'mute_period_required'), 'error');
    if (highRisk) setConfirmOpen(true);
    else void submitAction();
  }

  const canHandle = hasAnyPermission('community:comment:manage', 'community:comment:audit', 'community:comment:handle');
  const canExport = hasAnyPermission('community:export:create');
  const canHandleCurrent = canHandle && Boolean(current) && availableActionOptions.length > 0;

  function hasPostContext(value: CommunityCommentAdminVO) {
    return value.postAvailable !== false && Boolean(value.postNo || value.postType || value.postTitle || value.postSummary || value.postContent);
  }

  function postTypeLabel(value: CommunityCommentAdminVO) {
    return metaLabel(meta, 'contentType', value.postType) || '动态';
  }

  return (
    <CommunityPage>
      <CommunityPageHeader title="评论管理" description="查询评论与回复，查看所属内容、机审摘要、点赞与举报；屏蔽、恢复和复核统一在详情抽屉完成。" actions={canExport ? <Button variant="outline" onClick={() => void createCommunityExport('comments', list.query).then(() => showToast(metaCopy(meta, 'export_created'), 'success'))}><Download className="mr-1.5 h-4 w-4" />导出</Button> : undefined} />
      <StatGrid cards={stats} loading={statsLoading || metaLoading} />
      <FilterPanel onSearch={list.search} onReset={list.reset} busy={list.loading}>
        <Field label="评论内容"><Input value={list.filters.keyword} onChange={(event) => list.setFilters({ ...list.filters, keyword: event.target.value })} placeholder="评论编号 / 内容" /></Field>
        <Field label="用户 ID"><Input value={list.filters.userId} onChange={(event) => list.setFilters({ ...list.filters, userId: event.target.value })} placeholder="请输入用户编号" /></Field>
        <Field label="所属内容"><Input value={list.filters.postNo} onChange={(event) => list.setFilters({ ...list.filters, postNo: event.target.value })} placeholder="请输入内容编号" /></Field>
        <Field label="评论状态"><NativeSelect value={list.filters.status} onChange={(value) => list.setFilters({ ...list.filters, status: value })} options={metaOptions(meta, 'commentStatus')} /></Field>
        <Field label="是否被举报"><NativeSelect value={list.filters.reported} onChange={(value) => list.setFilters({ ...list.filters, reported: value })} options={metaOptions(meta, 'yesNo')} /></Field>
        <Field label="开始日期"><Input type="date" value={list.filters.startTime} onChange={(event) => list.setFilters({ ...list.filters, startTime: event.target.value })} /></Field>
        <Field label="结束日期"><Input type="date" value={list.filters.endTime} onChange={(event) => list.setFilters({ ...list.filters, endTime: event.target.value })} /></Field>
      </FilterPanel>
      <TableFrame minWidth={1080}>
        <TableHead><tr><HeaderCell>评论编号</HeaderCell><HeaderCell>归属内容</HeaderCell><HeaderCell>用户信息</HeaderCell><HeaderCell>评论内容</HeaderCell><HeaderCell>发布时间</HeaderCell><HeaderCell>点赞/举报</HeaderCell><HeaderCell>状态</HeaderCell><HeaderCell className="sticky right-0 bg-slate-50">操作</HeaderCell></tr></TableHead>
        {list.loading || list.error || !list.pageData.records.length ? <DataRowsState colSpan={8} loading={list.loading} error={list.error} emptyText={metaCopy(meta, 'comment_empty')} onRetry={list.load} /> : (
          <tbody>{list.pageData.records.map((row) => <tr key={row.id} className="hover:bg-slate-50/70">
            <BodyCell>{row.commentNo || row.id}</BodyCell>
            <BodyCell className="min-w-[250px]">
              {hasPostContext(row) ? <div className="flex items-start gap-2.5">
                {row.postImageUrls?.[0] && <img src={row.postImageUrls[0]} alt={`${row.postNo || row.postId} 所属动态封面`} className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover" />}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5"><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">{postTypeLabel(row)}</span><span className="text-xs text-slate-500">{row.postNo}</span></div>
                  {row.postTitle && <div className="mt-1 max-w-[180px] truncate text-sm font-medium text-slate-700">{row.postTitle}</div>}
                  <div className="mt-0.5 max-w-[180px] truncate text-xs text-slate-400">{row.postSummary || '-'}</div>
                </div>
              </div> : <span className="text-sm text-amber-600">内容已变化</span>}
            </BodyCell>
            <BodyCell><div>{row.authorNo || row.authorId}</div><div className="mt-0.5 text-xs text-slate-400">{row.authorName || '-'}</div></BodyCell><BodyCell className="max-w-[280px]"><div className="line-clamp-2">{row.content}</div></BodyCell><BodyCell className="whitespace-nowrap">{row.createTime || '-'}</BodyCell><BodyCell>{row.likeCount ?? 0} / {row.reportCount ?? 0}</BodyCell><BodyCell>{statusPill(meta, 'commentStatus', row.status, row.statusName)}</BodyCell><BodyCell className="sticky right-0 bg-white"><Button variant="ghost" size="sm" onClick={() => void openDetail(row)}><Eye className="mr-1 h-3.5 w-3.5" />详情</Button></BodyCell>
          </tr>)}</tbody>
        )}
      </TableFrame>
      <PageFooter current={list.query.page} total={list.pageData.total} pageSize={list.query.size} onChange={list.setPage} onPageSizeChange={list.setPageSize} />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="评论详情" description={metaCopy(meta, 'comment_detail_description')} footer={canHandleCurrent ? <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDrawerOpen(false)}>关闭</Button><Button onClick={requestSubmit} disabled={saving || detailLoading}>确认处理</Button></div> : undefined}>
        {detailLoading || !current ? <div className="py-20 text-center text-sm text-slate-400">加载中</div> : <div className="space-y-4">
          <DetailGrid items={[{ label: '评论 ID', value: current.commentNo || current.id }, { label: '归属内容', value: hasPostContext(current) ? `${postTypeLabel(current)} / ${current.postNo}` : '内容已变化' }, { label: '用户', value: `${current.authorNo || current.authorId} / ${current.authorName || '-'}` }, { label: '点赞 / 举报', value: `${current.likeCount ?? 0} / ${current.reportCount ?? 0}` }, { label: '当前状态', value: statusPill(meta, 'commentStatus', current.status, current.statusName) }, { label: '机审结果', value: metaLabel(meta, 'machineResult', current.machineResult) }]} />
          <DetailSection title="评论内容"><p className="whitespace-pre-wrap">{current.content}</p>{current.parentContent && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">{current.parentContent}</div>}</DetailSection>
          <DetailSection title={hasPostContext(current) && current.postType === 'sincere_post' ? '所属诚意贴' : '所属动态'}>
            {hasPostContext(current) ? <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700">{postTypeLabel(current)}</span>
                <span>{current.postNo}</span>
                {current.postSourceScene && <span>{metaLabel(meta, 'sourceScene', current.postSourceScene)}</span>}
                {current.postStatus && statusPill(meta, 'contentStatus', current.postStatus, current.postStatusName)}
              </div>
              {current.postTitle && <h4 className="text-base font-semibold text-slate-900">{current.postTitle}</h4>}
              <p className="whitespace-pre-wrap leading-6 text-slate-700">{current.postContent || current.postSummary || '-'}</p>
              {Boolean(current.postImageUrls?.length) && <div className="grid grid-cols-3 gap-2">
                {current.postImageUrls?.slice(0, 9).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${current.postNo || current.postId} 所属动态图片 ${index + 1}`} className="aspect-square w-full rounded-lg border border-slate-200 object-cover" />)}
              </div>}
            </div> : <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">内容已变化，所属内容可能已删除或不可查看。</div>}
          </DetailSection>
          <DetailSection title="操作日志"><AuditTimeline logs={current.auditLogs} emptyText={metaCopy(meta, 'audit_log_empty')} /></DetailSection>
          {canHandleCurrent ? <DetailSection title="评论处理"><div className="grid gap-3 sm:grid-cols-2"><Field label="处理结果"><NativeSelect includeAll={false} value={action} onChange={setAction} options={availableActionOptions} /></Field>{(Boolean(selectedAction?.extra?.muteRequired) || /mute/i.test(action)) && <Field label="禁言周期"><NativeSelect includeAll={false} value={mutePeriod} onChange={setMutePeriod} options={metaOptions(meta, 'mutePeriod')} /></Field>}<Field label="处理说明" className="sm:col-span-2"><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></Field></div></DetailSection> : canHandle && <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">当前状态无可执行操作</div>}
        </div>}
      </Drawer>
      <ConfirmActionDialog open={confirmOpen} title={metaCopy(meta, 'high_risk_confirm_title')} description={selectedAction?.description || metaCopy(meta, 'comment_high_risk_description')} confirmText={selectedAction?.label || metaCopy(meta, 'confirm_action')} cancelText={metaCopy(meta, 'cancel_action')} busyText={metaCopy(meta, 'processing')} busy={saving} danger onClose={() => setConfirmOpen(false)} onConfirm={() => void submitAction()} />
    </CommunityPage>
  );
}
