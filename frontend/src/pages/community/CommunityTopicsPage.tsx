import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, ImagePlus, Plus, RefreshCcw, Upload } from 'lucide-react';
import { createCommunityTopic, createCommunityTopicCoverTicket, getCommunityTopicDetail, getCommunityTopicPage, getCommunityTopicStats, updateCommunityTopic, uploadByOssTicket, type CommunityStatCard, type CommunityTopicAdminVO, type CommunityTopicSaveCommand, type OssDirectUploadTicket } from '@/api/community';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { showToast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/usePermission';
import { AuditTimeline, BodyCell, CommunityPage, CommunityPageHeader, ConfirmActionDialog, DataRowsState, DetailGrid, DetailSection, Field, FilterPanel, HeaderCell, Input, NativeSelect, PageFooter, PermissionState, StatGrid, TableFrame, TableHead, DEFAULT_PAGE_SIZE, metaCopy, metaLabel, metaOptions, normalizeStats, statusPill, unwrapData, useCommunityList, useCommunityMeta } from '@/features/community/communityUi';

interface TopicQuery {
  page: number;
  size: number;
  keyword: string;
  status: string;
  recommended: string;
  startTime: string;
  endTime: string;
}

interface TopicFormState {
  topicName: string;
  description: string;
  coverUrl: string;
  displayScenes: string[];
  recommended: boolean;
  sort: number;
  status: string;
  remark: string;
  version?: number;
}

const INITIAL_QUERY: TopicQuery = { page: 1, size: DEFAULT_PAGE_SIZE, keyword: '', status: '', recommended: '', startTime: '', endTime: '' };
const EMPTY_FORM: TopicFormState = { topicName: '', description: '', coverUrl: '', displayScenes: [], recommended: false, sort: 100, status: '', remark: '', version: undefined };

export default function CommunityTopicsPage() {
  const { meta, loading: metaLoading } = useCommunityMeta();
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission('community:topic:list');
  const initialQuery = useMemo(() => INITIAL_QUERY, []);
  const fetcher = useCallback((query: TopicQuery) => getCommunityTopicPage({ ...query, recommended: query.recommended === '' ? undefined : query.recommended === 'true' }), []);
  const list = useCommunityList<CommunityTopicAdminVO, TopicQuery>(initialQuery, fetcher, canView);
  const [stats, setStats] = useState<CommunityStatCard[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [current, setCurrent] = useState<CommunityTopicAdminVO | null>(null);
  const [form, setForm] = useState<TopicFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);
  const canEdit = hasAnyPermission('community:topic:manage', 'community:topic:edit');

  useEffect(() => {
    if (!canView) {
      setStatsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setStatsLoading(true);
    getCommunityTopicStats()
      .then((response) => { if (!cancelled) setStats(normalizeStats(response, meta, 'topic_stat')); })
      .catch(() => { if (!cancelled) setStats([]); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [canView, meta]);

  if (!canView) {
    return <CommunityPage><CommunityPageHeader title="家园话题管理" description="维护移动端家园话题入口、展示场景、推荐和排序，新增与编辑统一在抽屉内完成。" /><PermissionState copy={metaCopy(meta, 'permission_denied')} /></CommunityPage>;
  }

  async function openDetail(row: CommunityTopicAdminVO) {
    setCurrent(row);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = unwrapData<CommunityTopicAdminVO>(await getCommunityTopicDetail(row.id), row);
      setCurrent(detail);
      setForm({ topicName: detail.topicName, description: detail.description || '', coverUrl: detail.coverUrl || '', displayScenes: detail.displayScenes || [], recommended: detail.recommended, sort: detail.sort, status: detail.status, remark: '', version: detail.version });
    } finally {
      setDetailLoading(false);
    }
  }

  function openCreate() {
    const firstStatus = metaOptions(meta, 'topicStatus').find((item) => !item.disabled)?.code || '';
    setForm({ ...EMPTY_FORM, status: firstStatus });
    setCurrent(null);
    setCreateOpen(true);
  }

  async function uploadCover(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const ticket = unwrapData<OssDirectUploadTicket>(await createCommunityTopicCoverTicket(file), {} as OssDirectUploadTicket);
      if (!ticket.uploadUrl || !ticket.fileUrl) throw new Error(metaCopy(meta, 'topic_cover_ticket_invalid'));
      const coverUrl = await uploadByOssTicket(ticket, file);
      setForm((value) => ({ ...value, coverUrl }));
      showToast(metaCopy(meta, 'topic_cover_uploaded'), 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : metaCopy(meta, 'topic_cover_upload_failed'), 'error');
    } finally {
      setUploading(false);
    }
  }

  function toCommand(): CommunityTopicSaveCommand | null {
    if (!form.topicName.trim()) {
      showToast(metaCopy(meta, 'topic_name_required'), 'error');
      return null;
    }
    if (!form.coverUrl) {
      showToast(metaCopy(meta, 'topic_cover_required'), 'error');
      return null;
    }
    if (!form.displayScenes.length) {
      showToast(metaCopy(meta, 'topic_scene_required'), 'error');
      return null;
    }
    return { topicName: form.topicName.trim(), description: form.description.trim() || undefined, coverUrl: form.coverUrl, displayScenes: form.displayScenes, recommended: form.recommended, sort: Number(form.sort), status: form.status, version: form.version, remark: form.remark.trim() || undefined };
  }

  async function saveCreate() {
    const command = toCommand();
    if (!command) return;
    setSaving(true);
    try {
      await createCommunityTopic(command);
      showToast(metaCopy(meta, 'topic_created'), 'success');
      setCreateOpen(false);
      await list.load();
    } finally {
      setSaving(false);
    }
  }

  async function saveDetail() {
    const command = toCommand();
    if (!command || !current) return;
    setSaving(true);
    try {
      await updateCommunityTopic(current.id, command);
      showToast(metaCopy(meta, 'topic_saved'), 'success');
      setDetailOpen(false);
      await list.load();
    } catch (cause) {
      if (cause instanceof Error && /version|版本|conflict/i.test(cause.message)) showToast(metaCopy(meta, 'version_conflict'), 'error');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  function requestSaveDetail() {
    const statusChanged = current && form.status !== current.status;
    if (statusChanged) {
      pendingSaveRef.current = saveDetail;
      setConfirmOpen(true);
    } else void saveDetail();
  }

  function toggleScene(code: string) {
    setForm((value) => ({ ...value, displayScenes: value.displayScenes.includes(code) ? value.displayScenes.filter((item) => item !== code) : [...value.displayScenes, code] }));
  }

  const editor = (
    <div className="space-y-4">
      <DetailSection title="基础信息"><div className="grid gap-3 sm:grid-cols-2"><Field label="话题名称"><Input value={form.topicName} onChange={(event) => setForm({ ...form, topicName: event.target.value })} maxLength={12} disabled={!canEdit} /></Field><Field label="排序"><Input type="number" value={form.sort} onChange={(event) => setForm({ ...form, sort: Number(event.target.value) })} min={1} max={999} disabled={!canEdit} /></Field><Field label="话题简介" className="sm:col-span-2"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={40} rows={3} disabled={!canEdit} className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" /></Field><Field label="话题封面" className="sm:col-span-2"><div className="flex flex-wrap items-center gap-3">{form.coverUrl ? <img src={form.coverUrl} alt="话题封面预览" className="h-24 w-36 rounded-lg border object-cover" /> : <div className="flex h-24 w-36 items-center justify-center rounded-lg border border-dashed bg-slate-50"><ImagePlus className="h-6 w-6 text-slate-400" /></div>}<label className="inline-flex cursor-pointer items-center rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Upload className="mr-1.5 h-4 w-4" />{uploading ? '上传中...' : '上传封面'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!canEdit || uploading} onChange={(event) => void uploadCover(event.target.files?.[0])} /></label></div></Field></div></DetailSection>
      <DetailSection title="展示配置"><div className="grid gap-3 sm:grid-cols-2"><Field label="状态"><NativeSelect includeAll={false} value={form.status} onChange={(status) => setForm({ ...form, status })} options={metaOptions(meta, 'topicStatus')} disabled={!canEdit} /></Field><Field label="推荐入口"><NativeSelect includeAll={false} value={String(form.recommended)} onChange={(value) => setForm({ ...form, recommended: value === 'true' })} options={metaOptions(meta, 'yesNo')} disabled={!canEdit} /></Field><Field label="展示场景" className="sm:col-span-2"><div className="flex flex-wrap gap-2">{metaOptions(meta, 'topicDisplayScene').map((option) => <label key={option.code} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal"><input type="checkbox" checked={form.displayScenes.includes(option.code)} disabled={!canEdit} onChange={() => toggleScene(option.code)} />{option.label}</label>)}</div></Field><Field label="变更说明" className="sm:col-span-2"><textarea value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} rows={3} disabled={!canEdit} className="w-full rounded-md border border-input px-3 py-2 text-sm disabled:opacity-50" /></Field></div></DetailSection>
    </div>
  );

  return (
    <CommunityPage>
      <CommunityPageHeader title="家园话题管理" description="维护移动端家园话题入口、话题列表和发布页话题选择；新增与详情使用独立抽屉，停用后历史内容保留话题快照。" actions={<><Button variant="outline" onClick={() => void list.load()}><RefreshCcw className="mr-1.5 h-4 w-4" />刷新</Button>{canEdit && <Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />新增话题</Button>}</>} />
      <StatGrid cards={stats} loading={statsLoading || metaLoading} />
      <FilterPanel onSearch={list.search} onReset={list.reset} busy={list.loading}>
        <Field label="关键词"><Input value={list.filters.keyword} onChange={(event) => list.setFilters({ ...list.filters, keyword: event.target.value })} placeholder="话题名称 / 编码" /></Field><Field label="状态"><NativeSelect value={list.filters.status} onChange={(value) => list.setFilters({ ...list.filters, status: value })} options={metaOptions(meta, 'topicStatus')} /></Field><Field label="是否推荐"><NativeSelect value={list.filters.recommended} onChange={(value) => list.setFilters({ ...list.filters, recommended: value })} options={metaOptions(meta, 'yesNo')} /></Field><Field label="开始日期"><Input type="date" value={list.filters.startTime} onChange={(event) => list.setFilters({ ...list.filters, startTime: event.target.value })} /></Field><Field label="结束日期"><Input type="date" value={list.filters.endTime} onChange={(event) => list.setFilters({ ...list.filters, endTime: event.target.value })} /></Field>
      </FilterPanel>
      <TableFrame minWidth={1080}><TableHead><tr><HeaderCell>话题编码</HeaderCell><HeaderCell>封面</HeaderCell><HeaderCell>名称/简介</HeaderCell><HeaderCell>推荐</HeaderCell><HeaderCell>内容/热度</HeaderCell><HeaderCell>排序</HeaderCell><HeaderCell>状态</HeaderCell><HeaderCell>更新时间</HeaderCell><HeaderCell className="sticky right-0 bg-slate-50">操作</HeaderCell></tr></TableHead>
        {list.loading || list.error || !list.pageData.records.length ? <DataRowsState colSpan={9} loading={list.loading} error={list.error} emptyText={metaCopy(meta, 'topic_empty')} onRetry={list.load} /> : <tbody>{list.pageData.records.map((row) => <tr key={row.id} className="hover:bg-slate-50/70"><BodyCell>{row.topicCode}</BodyCell><BodyCell>{row.coverUrl ? <img src={row.coverUrl} alt={`${row.topicName}封面`} className="h-12 w-20 rounded-md border object-cover" /> : '-'}</BodyCell><BodyCell><div className="font-medium text-slate-800">{row.topicName}</div><div className="mt-0.5 max-w-[260px] truncate text-xs text-slate-400">{row.description || '-'}</div></BodyCell><BodyCell>{metaLabel(meta, 'yesNo', row.recommended)}</BodyCell><BodyCell>{row.contentCount ?? '--'} / {row.heatValue ?? '--'}</BodyCell><BodyCell>{row.sort}</BodyCell><BodyCell>{statusPill(meta, 'topicStatus', row.status, row.statusName)}</BodyCell><BodyCell className="whitespace-nowrap">{row.updateTime || '-'}</BodyCell><BodyCell className="sticky right-0 bg-white"><Button variant="ghost" size="sm" onClick={() => void openDetail(row)}><Eye className="mr-1 h-3.5 w-3.5" />详情</Button></BodyCell></tr>)}</tbody>}
      </TableFrame>
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm leading-6 text-blue-700"><strong className="mr-2">页面定位</strong>{metaCopy(meta, 'topic_page_notice')}</div>
      <PageFooter current={list.query.page} total={list.pageData.total} pageSize={list.query.size} onChange={list.setPage} onPageSizeChange={list.setPageSize} />

      <Drawer open={detailOpen} onClose={() => setDetailOpen(false)} title="家园话题详情" description={metaCopy(meta, 'topic_detail_description')} footer={canEdit ? <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button><Button onClick={requestSaveDetail} disabled={saving || uploading || detailLoading}>保存话题</Button></div> : undefined}>
        {detailLoading || !current ? <div className="py-20 text-center text-sm text-slate-400">加载中</div> : <div className="space-y-4"><DetailGrid items={[{ label: '话题编码', value: current.topicCode }, { label: '当前状态', value: statusPill(meta, 'topicStatus', current.status, current.statusName) }, { label: '推荐标记', value: metaLabel(meta, 'yesNo', current.recommended) }, { label: '内容 / 热度', value: `${current.contentCount ?? '--'} / ${current.heatValue ?? '--'}` }]} />{editor}<DetailSection title="操作日志"><AuditTimeline logs={current.auditLogs} emptyText={metaCopy(meta, 'audit_log_empty')} /></DetailSection></div>}
      </Drawer>
      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="新增家园话题" description={metaCopy(meta, 'topic_create_description')} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button><Button onClick={() => void saveCreate()} disabled={saving || uploading}>保存新增</Button></div>}>{editor}<div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">{metaCopy(meta, 'topic_create_notice')}</div></Drawer>
      <ConfirmActionDialog open={confirmOpen} title={metaCopy(meta, 'topic_status_confirm_title')} description={metaCopy(meta, 'topic_status_confirm_description')} confirmText={metaCopy(meta, 'topic_status_confirm_action')} cancelText={metaCopy(meta, 'cancel_action')} busyText={metaCopy(meta, 'processing')} busy={saving} danger onClose={() => setConfirmOpen(false)} onConfirm={() => void pendingSaveRef.current?.()} />
    </CommunityPage>
  );
}
