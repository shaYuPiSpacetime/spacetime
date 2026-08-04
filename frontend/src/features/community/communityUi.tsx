import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2, RefreshCcw, Search, ShieldAlert } from 'lucide-react';
import { getCommunityMeta, type CommunityAdminMeta, type CommunityAuditLogVO, type CommunityMetaOption, type CommunityStatCard, type CommunityTone, type PageResult } from '@/api/community';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

export const DEFAULT_PAGE_SIZE = 20;

export function unwrapData<T>(response: unknown, fallback: T): T {
  const value = (response as { data?: T } | null | undefined)?.data;
  return value ?? fallback;
}

export function normalizePage<T>(response: unknown): PageResult<T> {
  const data = unwrapData<Partial<PageResult<T>>>(response, {});
  return {
    records: Array.isArray(data.records) ? data.records : [],
    total: Number(data.total ?? 0),
    current: Number(data.current ?? 1),
    size: Number(data.size ?? DEFAULT_PAGE_SIZE),
  };
}

export function normalizeStats(response: unknown, meta: CommunityAdminMeta, copyPrefix: string): CommunityStatCard[] {
  const data = unwrapData<Record<string, unknown>>(response, {});
  if (Array.isArray(data.cards)) {
    return data.cards.map((item, index) => {
      const row = item as Record<string, unknown>;
      const code = String(row.code ?? index);
      return {
        code,
        label: String(row.label ?? meta.copy[`${copyPrefix}_${code}`] ?? code),
        value: row.value == null ? 0 : String(row.value),
        tone: row.tone as CommunityTone | undefined,
      };
    });
  }
  return Object.entries(data)
    .filter(([, value]) => typeof value === 'number' || typeof value === 'string')
    .map(([code, value]) => ({ code, label: meta.copy[`${copyPrefix}_${code}`] ?? code, value: String(value) }));
}

function normalizeOption(item: unknown): CommunityMetaOption | null {
  if (!item || typeof item !== 'object') return null;
  const value = item as Record<string, unknown>;
  const code = String(value.code ?? value.value ?? value.dictValue ?? '');
  if (!code) return null;
  return {
    code,
    label: String(value.label ?? value.name ?? value.dictLabel ?? code),
    tone: value.tone as CommunityTone | undefined,
    disabled: Boolean(value.disabled ?? false),
    description: value.description ? String(value.description) : undefined,
    extra: value.extra && typeof value.extra === 'object' ? value.extra as Record<string, unknown> : undefined,
  };
}

export function normalizeMeta(response: unknown): CommunityAdminMeta {
  const raw = unwrapData<Record<string, unknown>>(response, {});
  const source = (raw.options ?? raw.dicts ?? raw.dictionaries ?? {}) as Record<string, unknown>;
  const options: Record<string, CommunityMetaOption[]> = {};
  Object.entries(source).forEach(([key, value]) => {
    if (!Array.isArray(value)) return;
    options[key] = value.map(normalizeOption).filter((item): item is CommunityMetaOption => Boolean(item));
  });
  const copySource = (raw.copy ?? raw.copies ?? raw.texts ?? {}) as Record<string, unknown>;
  const copy = Object.fromEntries(Object.entries(copySource).map(([key, value]) => [key, String(value ?? '')]));
  return {
    options,
    copy,
    capabilities: raw.capabilities as Record<string, boolean> | undefined,
    configVersion: raw.configVersion == null ? undefined : Number(raw.configVersion),
  };
}

export function useCommunityMeta() {
  const [meta, setMeta] = useState<CommunityAdminMeta>({ options: {}, copy: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMeta(normalizeMeta(await getCommunityMeta()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'meta_load_failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { meta, loading, error, reload };
}

const optionAliases: Record<string, string[]> = {
  contentStatus: ['contentStatus', 'content_status', 'community_content_status', 'postStatus', 'post_status'],
  contentType: ['contentType', 'content_type', 'community_content_type', 'postType', 'post_type'],
  sourceScene: ['sourceScene', 'source_scene', 'contentSourceScene', 'content_source_scene'],
  mediaType: ['mediaType', 'media_type'],
  machineResult: ['machineResult', 'machine_result', 'securityResult'],
  riskLevel: ['riskLevel', 'risk_level'],
  postAction: ['postAction', 'post_action', 'contentAction', 'content_action'],
  distributionScene: ['distributionScene', 'distribution_scene', 'feedScene'],
  commentStatus: ['commentStatus', 'comment_status', 'community_comment_status'],
  commentAction: ['commentAction', 'comment_action'],
  reportStatus: ['reportStatus', 'report_status'],
  reportResult: ['reportResult', 'report_result'],
  replyStatus: ['replyStatus', 'reply_status'],
  reportTargetType: ['reportTargetType', 'report_target_type', 'targetType'],
  reportReason: ['reportReason', 'report_reason', 'reportReasons'],
  punishAction: ['punishAction', 'punish_action'],
  mutePeriod: ['mutePeriod', 'mute_period', 'mutePeriods'],
  ipBlockPeriod: ['ipBlockPeriod', 'ip_block_period'],
  writeScope: ['writeScope', 'write_scope', 'ipBlockWriteScope'],
  topicStatus: ['topicStatus', 'topic_status'],
  topicDisplayScene: ['topicDisplayScene', 'topic_display_scene'],
  yesNo: ['yesNo', 'yes_no', 'boolean'],
  configSection: ['configSection', 'config_section'],
};

export function metaOptions(meta: CommunityAdminMeta, key: string): CommunityMetaOption[] {
  for (const alias of optionAliases[key] ?? [key]) {
    if (Array.isArray(meta.options[alias])) return meta.options[alias];
  }
  return [];
}

export function metaLabel(meta: CommunityAdminMeta, key: string, code?: string | number | boolean | null, explicit?: string) {
  if (code === undefined || code === null || code === '') return explicit || '-';
  const normalized = String(code);
  return metaOptions(meta, key).find((item) => item.code === normalized)?.label ?? explicit ?? normalized;
}

export function metaTone(meta: CommunityAdminMeta, key: string, code?: string | number | boolean | null): CommunityTone {
  if (code === undefined || code === null) return 'default';
  const normalized = String(code).toLowerCase();
  const configured = metaOptions(meta, key).find((item) => item.code === String(code))?.tone;
  if (configured) return configured;
  if (['published', 'enabled', 'valid', 'approved', 'success', 'sent'].includes(normalized)) return 'success';
  if (normalized.startsWith('pending') || ['processing', 'review'].includes(normalized)) return 'warning';
  if (['rejected', 'deleted', 'blocked', 'disabled', 'failed'].includes(normalized)) return 'danger';
  if (['merged', 'draft'].includes(normalized)) return 'info';
  return 'default';
}

export function metaCopy(meta: CommunityAdminMeta, key: string) {
  return meta.copy[key] || meta.copy.generic_error || key;
}

export function statusPill(meta: CommunityAdminMeta, key: string, code?: string, explicit?: string) {
  const tone = metaTone(meta, key, code);
  const classes: Record<CommunityTone, string> = {
    default: 'border-slate-200 bg-slate-50 text-slate-600',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', classes[tone])}>{metaLabel(meta, key, code, explicit)}</span>;
}

export function CommunityPageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CommunityPage({ children }: { children: ReactNode }) {
  return <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:p-6">{children}</section>;
}

export function StatGrid({ cards, loading }: { cards: CommunityStatCard[]; loading?: boolean }) {
  if (loading) {
    return <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border bg-slate-50" />)}</div>;
  }
  if (!cards.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.code} className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-4">
          <div className="text-xs font-medium text-slate-500">{card.label}</div>
          <strong className="mt-2 block text-2xl font-semibold tabular-nums text-slate-950">{card.value}</strong>
        </article>
      ))}
    </div>
  );
}

export function FilterPanel({ children, onSearch, onReset, busy, extraActions }: { children: ReactNode; onSearch: () => void; onReset: () => void; busy?: boolean; extraActions?: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800">筛选区</h2>
        <div className="flex items-center gap-2">
          {extraActions}
          <Button variant="outline" size="sm" onClick={onReset} disabled={busy}><RefreshCcw className="mr-1.5 h-3.5 w-3.5" />重置</Button>
          <Button size="sm" onClick={onSearch} disabled={busy}><Search className="mr-1.5 h-3.5 w-3.5" />查询</Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <label className={cn('space-y-1.5 text-xs font-medium text-slate-600', className)}><span>{label}</span>{children}</label>;
}

export function NativeSelect({ value, onChange, options, includeAll = true, allLabel = '全部', disabled, className }: { value: string; onChange: (value: string) => void; options: CommunityMetaOption[]; includeAll?: boolean; allLabel?: string; disabled?: boolean; className?: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={cn('h-9 w-full rounded-md border border-input bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50', className)}>
      {includeAll && <option value="">{allLabel}</option>}
      {options.map((item) => <option key={item.code} value={item.code} disabled={item.disabled}>{item.label}</option>)}
    </select>
  );
}

export function TableFrame({ children, minWidth = 980 }: { children: ReactNode; minWidth?: number }) {
  return <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>{children}</table></div>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50 text-xs font-semibold text-slate-600">{children}</thead>;
}

export function HeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('whitespace-nowrap border-b border-slate-200 px-3 py-3', className)}>{children}</th>;
}

export function BodyCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('border-b border-slate-100 px-3 py-3 align-top text-slate-700', className)}>{children}</td>;
}

export function DataRowsState({ colSpan, loading, error, emptyText, onRetry }: { colSpan: number; loading: boolean; error?: string; emptyText: string; onRetry: () => void }) {
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan} className="h-48 text-center">
          {loading ? (
            <div className="inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />加载中</div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-sm text-rose-600"><AlertTriangle className="h-6 w-6" /><span>{error}</span><Button variant="outline" size="sm" onClick={onRetry}>重试</Button></div>
          ) : (
            <div className="text-sm text-slate-400">{emptyText}</div>
          )}
        </td>
      </tr>
    </tbody>
  );
}

export function PageFooter({ current, total, pageSize, onChange, onPageSizeChange }: { current: number; total: number; pageSize: number; onChange: (page: number) => void; onPageSizeChange: (size: number) => void }) {
  return <div className="flex justify-end overflow-x-auto"><Pagination current={current} total={total} pageSize={pageSize} onChange={onChange} onPageSizeChange={onPageSizeChange} /></div>;
}

export function DetailGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
      {items.map((item, index) => <div key={`${item.label}-${index}`} className="min-w-0"><dt className="text-xs text-slate-500">{item.label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{item.value || '-'}</dd></div>)}
    </dl>
  );
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 p-4"><h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3><div className="text-sm leading-6 text-slate-700">{children}</div></section>;
}

export function AuditTimeline({ logs, emptyText }: { logs?: CommunityAuditLogVO[]; emptyText: string }) {
  if (!logs?.length) return <p className="text-sm text-slate-400">{emptyText}</p>;
  return (
    <ol className="space-y-3 border-l border-slate-200 pl-4">
      {logs.map((log, index) => (
        <li key={String(log.id ?? index)} className="relative">
          <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-primary" />
          <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm font-medium text-slate-800">{log.operatorName || '-'} · {log.actionName || log.action || '-'}</strong><time className="text-xs text-slate-400">{log.createTime || '-'}</time></div>
          {log.remark && <p className="mt-1 text-xs text-slate-500">{log.remark}</p>}
        </li>
      ))}
    </ol>
  );
}

export function PermissionState({ copy }: { copy: string }) {
  return <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center"><ShieldAlert className="h-8 w-8 text-slate-400" /><h2 className="text-base font-semibold text-slate-800">{copy}</h2></div>;
}

export function ConfirmActionDialog({ open, title, description, confirmText, cancelText, busyText, busy, danger, onClose, onConfirm }: { open: boolean; title: string; description: string; confirmText: string; cancelText: string; busyText: string; busy?: boolean; danger?: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} layer="confirmation" className="max-w-md">
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription className="pt-2 leading-6">{description}</DialogDescription></DialogHeader>
      <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>{cancelText}</Button><Button variant={danger ? 'destructive' : 'default'} onClick={onConfirm} disabled={busy}>{busy ? busyText : confirmText}</Button></div>
    </Dialog>
  );
}

export function useCommunityList<T, Q extends { page: number; size: number }>(initialQuery: Q, fetcher: (query: Q) => Promise<unknown>, enabled = true) {
  const [filters, setFilters] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [pageData, setPageData] = useState<PageResult<T>>({ records: [], total: 0, current: 1, size: initialQuery.size });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setPageData(normalizePage<T>(await fetcher(query)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'request_failed');
    } finally {
      setLoading(false);
    }
  }, [enabled, fetcher, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const actions = useMemo(() => ({
    search: () => setQuery({ ...filters, page: 1 }),
    reset: () => {
      setFilters(initialQuery);
      setQuery(initialQuery);
    },
    setPage: (page: number) => setQuery((current) => ({ ...current, page })),
    setPageSize: (size: number) => {
      setFilters((current) => ({ ...current, size, page: 1 }));
      setQuery((current) => ({ ...current, size, page: 1 }));
    },
  }), [filters, initialQuery]);

  return { filters, setFilters, query, pageData, loading, error, load, ...actions };
}

export { Input };
