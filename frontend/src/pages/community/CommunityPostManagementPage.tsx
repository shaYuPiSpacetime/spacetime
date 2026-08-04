import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { createCommunityExport, getCommunityPostDetail, getCommunityPostPage, getCommunityPostStats, handleCommunityPost, type CommunityPostAdminVO, type CommunityStatCard } from '@/api/community';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { showToast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/usePermission';
import {
  AuditTimeline,
  BodyCell,
  CommunityPage,
  CommunityPageHeader,
  ConfirmActionDialog,
  DataRowsState,
  DetailGrid,
  DetailSection,
  Field,
  FilterPanel,
  HeaderCell,
  Input,
  NativeSelect,
  PageFooter,
  PermissionState,
  StatGrid,
  TableFrame,
  TableHead,
  DEFAULT_PAGE_SIZE,
  metaCopy,
  metaLabel,
  metaOptions,
  normalizeStats,
  statusPill,
  unwrapData,
  useCommunityList,
  useCommunityMeta,
} from '@/features/community/communityUi';

type Variant = 'content' | 'moments';

interface PostQuery {
  page: number;
  size: number;
  keyword: string;
  userId: string;
  contentType: string;
  sourceScene: string;
  mediaType: string;
  status: string;
  machineResult: string;
  distributionScene: string;
  reported: string;
  startTime: string;
  endTime: string;
  scope: Variant;
}

const initialQueries: Record<Variant, PostQuery> = {
  content: { page: 1, size: DEFAULT_PAGE_SIZE, keyword: '', userId: '', contentType: '', sourceScene: '', mediaType: '', status: '', machineResult: '', distributionScene: '', reported: '', startTime: '', endTime: '', scope: 'content' },
  moments: { page: 1, size: DEFAULT_PAGE_SIZE, keyword: '', userId: '', contentType: 'community_post', sourceScene: '', mediaType: '', status: '', machineResult: '', distributionScene: '', reported: '', startTime: '', endTime: '', scope: 'moments' },
};

export default function CommunityPostManagementPage({ variant }: { variant: Variant }) {
  const { meta, loading: metaLoading } = useCommunityMeta();
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission(variant === 'content' ? 'community:content:list' : 'community:moments:list');
  const initialQuery = useMemo(() => initialQueries[variant], [variant]);
  const fetcher = useCallback((query: PostQuery) => getCommunityPostPage({
    ...query,
    reported: query.reported === '' ? undefined : query.reported === 'true',
  }), []);
  const list = useCommunityList<CommunityPostAdminVO, PostQuery>(initialQuery, fetcher, canView);
  const [stats, setStats] = useState<CommunityStatCard[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [current, setCurrent] = useState<CommunityPostAdminVO | null>(null);
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [mutePeriod, setMutePeriod] = useState('');
  const [notifyUser, setNotifyUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const title = variant === 'content' ? '内容管理' : '动态管理';
  const description = variant === 'content'
    ? '统一治理普通动态和诚意贴，查看来源场景、机审、风险与审核状态；所有处理动作在详情抽屉内完成。'
    : '管理普通动态流，查看媒体、关注/同城/热门分发、互动数据与展示状态。';
  const emptyCopyKey = variant === 'content' ? 'content_empty' : 'moment_empty';
  const configuredActions = metaOptions(meta, 'postAction');
  const actionOptions = configuredActions.length ? configuredActions : metaOptions(meta, 'contentStatus').filter((item) => ['published', 'rejected', 'blocked'].includes(item.code));
  const selectedAction = actionOptions.find((item) => item.code === action);
  const highRisk = Boolean(selectedAction?.extra?.highRisk) || selectedAction?.tone === 'danger' || /block|restore|mute|freeze|reject|remove/i.test(action) || (current?.status === 'blocked' && action === 'published');

  useEffect(() => {
    if (!canView) {
      setStatsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setStatsLoading(true);
    getCommunityPostStats(variant)
      .then((response) => { if (!cancelled) setStats(normalizeStats(response, meta, `${variant}_stat`)); })
      .catch(() => { if (!cancelled) setStats([]); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [canView, meta, variant]);

  if (!canView) {
    return <CommunityPage><CommunityPageHeader title={title} description={description} /><PermissionState copy={metaCopy(meta, 'permission_denied')} /></CommunityPage>;
  }

  async function openDetail(row: CommunityPostAdminVO) {
    setCurrent(row);
    setDrawerOpen(true);
    setAction('');
    setReason('');
    setMutePeriod('');
    setNotifyUser(true);
    setDetailLoading(true);
    try {
      setCurrent(unwrapData<CommunityPostAdminVO>(await getCommunityPostDetail(row.id), row));
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitAction() {
    if (!current || !action) return;
    setSaving(true);
    try {
      await handleCommunityPost(current.id, {
        action,
        version: Number(current.version ?? 0),
        reason: reason || undefined,
        notifyUser,
        mutePeriod: mutePeriod || undefined,
      });
      showToast(metaCopy(meta, 'post_action_success'), 'success');
      setConfirmOpen(false);
      setDrawerOpen(false);
      await list.load();
    } catch (cause) {
      if (cause instanceof Error && /version|版本|conflict/i.test(cause.message)) {
        showToast(metaCopy(meta, 'version_conflict'), 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  function requestSubmit() {
    if (!action) {
      showToast(metaCopy(meta, 'action_required'), 'error');
      return;
    }
    if ((selectedAction?.extra?.reasonRequired || highRisk) && !reason.trim()) {
      showToast(metaCopy(meta, 'reason_required'), 'error');
      return;
    }
    if ((selectedAction?.extra?.muteRequired || /mute/i.test(action)) && !mutePeriod) {
      showToast(metaCopy(meta, 'mute_period_required'), 'error');
      return;
    }
    if (highRisk) setConfirmOpen(true);
    else void submitAction();
  }

  async function createExport() {
    await createCommunityExport('posts', list.query);
    showToast(metaCopy(meta, 'export_created'), 'success');
  }

  const canHandle = hasAnyPermission('community:content:audit', 'community:moments:audit', 'community:post:audit');
  const canExport = hasAnyPermission('community:export:create');

  return (
    <CommunityPage>
      <CommunityPageHeader
        title={title}
        description={description}
        actions={canExport ? <Button variant="outline" onClick={() => void createExport()}><Download className="mr-1.5 h-4 w-4" />导出</Button> : undefined}
      />
      <StatGrid cards={stats} loading={statsLoading || metaLoading} />
      <FilterPanel onSearch={list.search} onReset={list.reset} busy={list.loading}>
        <Field label="关键词"><Input value={list.filters.keyword} onChange={(event) => list.setFilters({ ...list.filters, keyword: event.target.value })} placeholder="编号 / 正文 / 昵称" /></Field>
        <Field label="用户 ID"><Input value={list.filters.userId} onChange={(event) => list.setFilters({ ...list.filters, userId: event.target.value })} placeholder="请输入用户编号" /></Field>
        {variant === 'content' && <Field label="内容类型"><NativeSelect value={list.filters.contentType} onChange={(value) => list.setFilters({ ...list.filters, contentType: value })} options={metaOptions(meta, 'contentType')} /></Field>}
        {variant === 'content' && <Field label="来源场景"><NativeSelect value={list.filters.sourceScene} onChange={(value) => list.setFilters({ ...list.filters, sourceScene: value })} options={metaOptions(meta, 'sourceScene')} /></Field>}
        <Field label="媒体类型"><NativeSelect value={list.filters.mediaType} onChange={(value) => list.setFilters({ ...list.filters, mediaType: value })} options={metaOptions(meta, 'mediaType')} /></Field>
        {variant === 'content' ? (
          <Field label="机审结果"><NativeSelect value={list.filters.machineResult} onChange={(value) => list.setFilters({ ...list.filters, machineResult: value })} options={metaOptions(meta, 'machineResult')} /></Field>
        ) : (
          <Field label="分发场景"><NativeSelect value={list.filters.distributionScene} onChange={(value) => list.setFilters({ ...list.filters, distributionScene: value })} options={metaOptions(meta, 'distributionScene')} /></Field>
        )}
        <Field label={variant === 'content' ? '内容状态' : '展示状态'}><NativeSelect value={list.filters.status} onChange={(value) => list.setFilters({ ...list.filters, status: value })} options={metaOptions(meta, 'contentStatus')} /></Field>
        {variant === 'moments' && <Field label="是否被举报"><NativeSelect value={list.filters.reported} onChange={(value) => list.setFilters({ ...list.filters, reported: value })} options={metaOptions(meta, 'yesNo')} /></Field>}
        <Field label="开始日期"><Input type="date" value={list.filters.startTime} onChange={(event) => list.setFilters({ ...list.filters, startTime: event.target.value })} /></Field>
        <Field label="结束日期"><Input type="date" value={list.filters.endTime} onChange={(event) => list.setFilters({ ...list.filters, endTime: event.target.value })} /></Field>
      </FilterPanel>

      <TableFrame minWidth={variant === 'content' ? 1260 : 1180}>
        <TableHead><tr>
          {variant === 'content' ? <><HeaderCell>审核编号</HeaderCell><HeaderCell>内容 ID</HeaderCell><HeaderCell>内容类型</HeaderCell><HeaderCell>来源场景</HeaderCell></> : <><HeaderCell>动态 ID</HeaderCell><HeaderCell>分发场景</HeaderCell><HeaderCell>媒体类型</HeaderCell></>}
          <HeaderCell>内容预览</HeaderCell><HeaderCell>用户 ID/昵称</HeaderCell><HeaderCell>{variant === 'content' ? '提交时间' : '发布时间'}</HeaderCell>
          {variant === 'moments' && <HeaderCell>阅读/赞/评</HeaderCell>}
          <HeaderCell>{variant === 'content' ? '机审/风险' : '展示状态'}</HeaderCell><HeaderCell>{variant === 'content' ? '状态/违规标签' : '风险'}</HeaderCell><HeaderCell className="sticky right-0 bg-slate-50">操作</HeaderCell>
        </tr></TableHead>
        {list.loading || list.error || !list.pageData.records.length ? (
          <DataRowsState colSpan={variant === 'content' ? 10 : 10} loading={list.loading} error={list.error} emptyText={metaCopy(meta, emptyCopyKey)} onRetry={list.load} />
        ) : (
          <tbody>{list.pageData.records.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-slate-50/70">
              {variant === 'content' ? <><BodyCell>{row.auditNo || '-'}</BodyCell><BodyCell>{row.postNo || row.id}</BodyCell><BodyCell>{metaLabel(meta, 'contentType', row.contentType || row.postType)}</BodyCell><BodyCell>{metaLabel(meta, 'sourceScene', row.sourceScene || row.contentSourceScene)}</BodyCell></> : <><BodyCell>{row.postNo || row.id}</BodyCell><BodyCell>{(row.distributionScenes || []).map((code) => metaLabel(meta, 'distributionScene', code, metaLabel(meta, 'sourceScene', code))).join(' / ') || '-'}</BodyCell><BodyCell>{metaLabel(meta, 'mediaType', row.mediaType)}</BodyCell></>}
              <BodyCell className="max-w-[320px]"><div className="flex items-center gap-3">
                {Boolean(row.imageUrls?.length) && <div className="flex shrink-0 -space-x-2">{row.imageUrls?.slice(0, 3).map((url, index) => (
                  <img key={`${url}-${index}`} src={url} alt={`${row.postNo || row.id} 内容图片 ${index + 1}`} loading="lazy" className="h-11 w-11 rounded-lg border-2 border-white object-cover shadow-sm" />
                ))}</div>}
                <div className="line-clamp-2 min-w-0">{row.contentSummary || row.content || '-'}</div>
              </div></BodyCell>
              <BodyCell><div>{row.authorNo || row.authorId}</div><div className="mt-0.5 text-xs text-slate-400">{row.authorName || '-'}</div></BodyCell>
              <BodyCell className="whitespace-nowrap">{row.publishedTime || row.createTime || '-'}</BodyCell>
              {variant === 'moments' && <BodyCell className="whitespace-nowrap tabular-nums">{row.readCount ?? 0} / {row.likeCount ?? 0} / {row.commentCount ?? 0}</BodyCell>}
              <BodyCell>{variant === 'content' ? <div className="space-y-1"><div>{metaLabel(meta, 'machineResult', row.machineResult, row.machineLabel)}</div><div className="text-xs text-slate-400">{metaLabel(meta, 'riskLevel', row.riskLevel)}</div></div> : statusPill(meta, 'contentStatus', row.status, row.statusName)}</BodyCell>
              <BodyCell>{variant === 'content' ? <div className="space-y-1">{statusPill(meta, 'contentStatus', row.status, row.statusName)}<div className="text-xs text-rose-600">{row.violationLabels?.join(' / ') || '-'}</div></div> : <div>{metaLabel(meta, 'riskLevel', row.riskLevel)}{row.reportCount > 0 && <div className="text-xs text-rose-600">{row.reportCount}</div>}</div>}</BodyCell>
              <BodyCell className="sticky right-0 bg-white"><Button variant="ghost" size="sm" onClick={() => void openDetail(row)}><Eye className="mr-1 h-3.5 w-3.5" />详情</Button></BodyCell>
            </tr>
          ))}</tbody>
        )}
      </TableFrame>
      <PageFooter current={list.query.page} total={list.pageData.total} pageSize={list.query.size} onChange={list.setPage} onPageSizeChange={list.setPageSize} />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={variant === 'content' ? '内容详情' : '动态详情'}
        description={metaCopy(meta, 'post_detail_description')}
        footer={canHandle ? <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDrawerOpen(false)}>关闭</Button><Button onClick={requestSubmit} disabled={saving || detailLoading}>确认处理</Button></div> : undefined}
      >
        {detailLoading || !current ? <div className="py-20 text-center text-sm text-slate-400">加载中</div> : <div className="space-y-4">
          <DetailGrid items={[
            { label: '内容 ID', value: current.postNo || current.id },
            { label: '作者', value: `${current.authorNo || current.authorId} / ${current.authorName || '-'}` },
            { label: '内容类型', value: metaLabel(meta, 'contentType', current.contentType || current.postType) },
            { label: '来源场景', value: metaLabel(meta, 'sourceScene', current.sourceScene || current.contentSourceScene) },
            { label: '机审 / 风险', value: `${metaLabel(meta, 'machineResult', current.machineResult, current.machineLabel)} / ${metaLabel(meta, 'riskLevel', current.riskLevel)}` },
            { label: '阅读 / 赞 / 评', value: `${current.readCount ?? 0} / ${current.likeCount ?? 0} / ${current.commentCount ?? 0}` },
          ]} />
          <DetailSection title="正文全文"><p className="whitespace-pre-wrap">{current.content || '-'}</p>{Boolean(current.imageUrls?.length) && <div className="mt-3 grid grid-cols-3 gap-2">{current.imageUrls?.map((url) => <img key={url} src={url} alt="内容图片" className="aspect-square w-full rounded-lg object-cover" />)}</div>}</DetailSection>
          <DetailSection title="操作日志"><AuditTimeline logs={current.auditLogs} emptyText={metaCopy(meta, 'audit_log_empty')} /></DetailSection>
          {canHandle && <DetailSection title="审核操作"><div className="grid gap-3 sm:grid-cols-2">
            <Field label="处理结果"><NativeSelect includeAll={false} allLabel="请选择" value={action} onChange={setAction} options={actionOptions} /></Field>
            {(Boolean(selectedAction?.extra?.muteRequired) || /mute/i.test(action)) && <Field label="禁言周期"><NativeSelect includeAll={false} allLabel="请选择" value={mutePeriod} onChange={setMutePeriod} options={metaOptions(meta, 'mutePeriod')} /></Field>}
            <Field label="通知用户"><NativeSelect includeAll={false} value={String(notifyUser)} onChange={(value) => setNotifyUser(value === 'true')} options={metaOptions(meta, 'yesNo')} /></Field>
            <Field label="处理说明" className="sm:col-span-2"><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></Field>
          </div></DetailSection>}
        </div>}
      </Drawer>
      <ConfirmActionDialog open={confirmOpen} title={metaCopy(meta, 'high_risk_confirm_title')} description={selectedAction?.description || metaCopy(meta, 'high_risk_confirm_description')} confirmText={selectedAction?.label || metaCopy(meta, 'confirm_action')} cancelText={metaCopy(meta, 'cancel_action')} busyText={metaCopy(meta, 'processing')} busy={saving} danger onClose={() => setConfirmOpen(false)} onConfirm={() => void submitAction()} />
    </CommunityPage>
  );
}
