import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, RotateCcw, Save, Search } from 'lucide-react';
import { getCommunityConfigs, saveCommunityConfigs, type CommunityConfigItemVO, type CommunityConfigSectionVO, type CommunityConfigVersionVO } from '@/api/community';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { showToast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/usePermission';
import { AuditTimeline, CommunityPage, CommunityPageHeader, ConfirmActionDialog, Field, Input, NativeSelect, PermissionState, metaCopy, metaOptions, unwrapData, useCommunityMeta } from '@/features/community/communityUi';
import { cn } from '@/lib/utils';

function configValueKey(items: CommunityConfigItemVO[]) {
  return JSON.stringify(items.map((item) => [item.configKey, item.configValue]));
}

function normalizeConfig(response: unknown): CommunityConfigVersionVO {
  const raw = unwrapData<CommunityConfigVersionVO>(response, { version: 0, items: [], sections: [], changeLogs: [] });
  const items = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.sections) ? raw.sections.flatMap((section) => section.items || []) : [];
  return { ...raw, version: Number(raw.version ?? 0), items, changeLogs: Array.isArray(raw.changeLogs) ? raw.changeLogs : [] };
}

export default function CommunityConfigPage() {
  const { meta } = useCommunityMeta();
  const { hasAnyPermission } = usePermission();
  const canView = hasAnyPermission('community:config:view');
  const [data, setData] = useState<CommunityConfigVersionVO>({ version: 0, items: [], changeLogs: [] });
  const [savedItems, setSavedItems] = useState<CommunityConfigItemVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const dirty = configValueKey(data.items || []) !== configValueKey(savedItems);
  const canEdit = hasAnyPermission('community:config:edit');

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const current = normalizeConfig(await getCommunityConfigs());
      setData(current);
      setSavedItems(current.items || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'request_failed');
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty) return undefined;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);

  const sections = useMemo<CommunityConfigSectionVO[]>(() => {
    if (data.sections?.length) {
      const currentItems = new Map((data.items || []).map((item) => [item.configKey, item]));
      return data.sections.map((section) => ({
        ...section,
        items: (section.items || []).map((item) => currentItems.get(item.configKey) || item),
      }));
    }
    const grouped = new Map<string, CommunityConfigItemVO[]>();
    (data.items || []).forEach((item) => {
      const code = item.sectionCode || item.configGroup || 'default';
      grouped.set(code, [...(grouped.get(code) || []), item]);
    });
    return Array.from(grouped.entries()).map(([code, items]) => ({ code, name: metaOptions(meta, 'configSection').find((option) => option.code === code)?.label || code, items }));
  }, [data.items, data.sections, meta]);

  useEffect(() => {
    if (!activeSection && sections.length) setActiveSection(sections[0].code);
  }, [activeSection, sections]);

  const visibleSections = useMemo(() => sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const matchesQuery = !query || `${item.name || ''}${item.configKey}${item.description || ''}`.toLowerCase().includes(query.toLowerCase());
      const valueStatus = String(item.configValue);
      return matchesQuery && (!status || valueStatus === status);
    }),
  })), [query, sections, status]);
  const currentSection = visibleSections.find((section) => section.code === activeSection) || visibleSections[0];

  if (!canView) {
    return <CommunityPage><CommunityPageHeader title="审核规则配置" description="维护社区入口、举报原因、内容安全、抽检、禁言和 IP 治理策略；高风险变更需要二次确认。" /><PermissionState copy={metaCopy(meta, 'permission_denied')} /></CommunityPage>;
  }

  function updateItem(configKey: string, value: unknown) {
    setData((current) => ({ ...current, items: (current.items || []).map((item) => item.configKey === configKey ? { ...item, configValue: value } : item) }));
  }

  function renderControl(item: CommunityConfigItemVO) {
    const type = (item.configType || '').toUpperCase();
    const disabled = !canEdit || item.editable === false;
    if (type === 'BOOLEAN') return <NativeSelect includeAll={false} value={String(item.configValue)} onChange={(value) => updateItem(item.configKey, value === 'true')} options={metaOptions(meta, 'yesNo')} disabled={disabled} />;
    if (item.optionsKey) return <NativeSelect includeAll={false} value={String(item.configValue ?? '')} onChange={(value) => updateItem(item.configKey, value)} options={metaOptions(meta, item.optionsKey)} disabled={disabled} />;
    if (type === 'JSON' || Array.isArray(item.configValue)) return <textarea value={typeof item.configValue === 'string' ? item.configValue : JSON.stringify(item.configValue, null, 2)} onChange={(event) => updateItem(item.configKey, event.target.value)} rows={5} disabled={disabled} className="w-full rounded-md border border-input bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" />;
    return <Input type={type === 'NUMBER' ? 'number' : 'text'} value={String(item.configValue ?? '')} onChange={(event) => updateItem(item.configKey, type === 'NUMBER' ? Number(event.target.value) : event.target.value)} disabled={disabled} />;
  }

  const highRiskChanged = (data.items || []).some((item) => item.highRisk && configValueKey([item]) !== configValueKey(savedItems.filter((saved) => saved.configKey === item.configKey)));

  async function save(highRiskConfirmed = false) {
    setSaving(true);
    try {
      const response = await saveCommunityConfigs({ version: data.version, items: data.items || [], changeSummary: metaCopy(meta, 'config_change_summary'), highRiskConfirmed });
      const saved = normalizeConfig(response);
      if (!saved.items?.length) {
        await load();
      } else {
        setData(saved);
        setSavedItems(saved.items || []);
      }
      setConfirmOpen(false);
      showToast(metaCopy(meta, 'config_save_success'), 'success');
    } catch (cause) {
      if (cause instanceof Error && /version|版本|conflict/i.test(cause.message)) showToast(metaCopy(meta, 'version_conflict'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function requestSave() {
    if (!dirty) return;
    if (highRiskChanged) setConfirmOpen(true);
    else void save(false);
  }

  return (
    <CommunityPage>
      <CommunityPageHeader title="审核规则配置" description="维护社区入口、举报原因、审核规则与治理策略；采用版本保存、未保存保护、高风险二次确认并记录每次变更。" actions={<><Button variant="outline" onClick={() => setLogsOpen(true)}><History className="mr-1.5 h-4 w-4" />变更记录</Button>{canEdit && <Button onClick={requestSave} disabled={!dirty || saving}><Save className="mr-1.5 h-4 w-4" />{saving ? '保存中...' : '保存配置'}</Button>}</>} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div><h2 className="text-sm font-semibold text-slate-800">筛选区</h2><p className="mt-1 text-xs text-slate-500">版本 {data.version}{dirty && <span className="ml-2 font-medium text-amber-600">存在未保存变更</span>}</p></div><div className="flex flex-1 flex-wrap justify-end gap-2"><div className="relative min-w-[240px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索配置名称或识别码" /></div><div className="w-36"><NativeSelect value={status} onChange={setStatus} options={metaOptions(meta, 'yesNo')} /></div>{canEdit && <Button variant="outline" onClick={() => setResetOpen(true)} disabled={!dirty}><RotateCcw className="mr-1.5 h-4 w-4" />重置</Button>}</div></div>
      {loading ? <div className="h-72 animate-pulse rounded-xl border bg-slate-50" /> : error ? <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-sm text-rose-600"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>重试</Button></div> : !sections.length ? <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed text-sm text-slate-400">{metaCopy(meta, 'config_empty')}</div> : <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2" aria-label="社区配置分区">{sections.map((section) => <button key={section.code} type="button" className={cn('w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors', activeSection === section.code ? 'bg-white font-medium text-primary shadow-sm' : 'text-slate-600 hover:bg-white/70')} onClick={() => setActiveSection(section.code)}>{section.name}</button>)}</nav>
        <section className="min-w-0 rounded-xl border border-slate-200 p-4"><div className="mb-4"><h2 className="text-base font-semibold text-slate-900">{currentSection?.name}</h2>{currentSection?.description && <p className="mt-1 text-sm text-slate-500">{currentSection.description}</p>}</div><div className="grid gap-3 xl:grid-cols-2">{currentSection?.items.length ? currentSection.items.map((item) => <article key={item.configKey} className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-sm font-medium text-slate-900">{item.name || item.configKey}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.description || item.configKey}</p></div>{item.highRisk && <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-[11px] text-rose-600">高风险</span>}</div>{renderControl(item)}</article>) : <div className="col-span-full py-16 text-center text-sm text-slate-400">{metaCopy(meta, 'config_search_empty')}</div>}</div>{currentSection?.code.toLowerCase().includes('audit') && <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-sm leading-6 text-amber-700">{metaCopy(meta, 'machine_disabled_notice')}</div>}</section>
      </div>}

      <Drawer open={logsOpen} onClose={() => setLogsOpen(false)} title="社区配置变更记录" description={metaCopy(meta, 'config_log_description')} className="w-[640px]"><AuditTimeline logs={data.changeLogs} emptyText={metaCopy(meta, 'config_log_empty')} /></Drawer>
      <ConfirmActionDialog open={confirmOpen} title={metaCopy(meta, 'config_high_risk_title')} description={metaCopy(meta, 'config_high_risk_description')} confirmText={metaCopy(meta, 'config_save_confirm_action')} cancelText={metaCopy(meta, 'cancel_action')} busyText={metaCopy(meta, 'processing')} busy={saving} danger onClose={() => setConfirmOpen(false)} onConfirm={() => void save(true)} />
      <ConfirmActionDialog open={resetOpen} title={metaCopy(meta, 'config_reset_title')} description={metaCopy(meta, 'config_reset_description')} confirmText={metaCopy(meta, 'config_reset_confirm_action')} cancelText={metaCopy(meta, 'cancel_action')} busyText={metaCopy(meta, 'processing')} onClose={() => setResetOpen(false)} onConfirm={() => { setData((current) => ({ ...current, items: savedItems })); setResetOpen(false); }} />
    </CommunityPage>
  );
}
