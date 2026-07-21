import { useCallback, useEffect, useState } from 'react';
import { Edit3, Plus, RefreshCcw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import {
  createPrd06BlockWord,
  getPrd06BlockWordList,
  updatePrd06BlockWord,
  updatePrd06BlockWordStatus,
  type SearchBlockWordVO,
} from '@/api/prd06';
import { getDictDataChildren, type DictDataVO } from '@/api/dict';

type DictOption = { value: string; label: string };

type BlockWordOptions = {
  types: DictOption[];
  matches: DictOption[];
  reasons: DictOption[];
  statuses: DictOption[];
};

const EMPTY_OPTIONS: BlockWordOptions = {
  types: [],
  matches: [],
  reasons: [],
  statuses: [],
};

function pageData(response: unknown) {
  const data = (response as { data?: unknown })?.data;
  if (Array.isArray(data)) return { records: data as SearchBlockWordVO[], total: data.length };
  return {
    records: (data as { records?: SearchBlockWordVO[] })?.records ?? [],
    total: (data as { total?: number })?.total ?? 0,
  };
}

function optionLabel(options: { value: string; label: string }[], value?: string) {
  return options.find((item) => item.value === value)?.label || value || '-';
}

function toOptions(response: unknown): DictOption[] {
  const rows = ((response as { data?: DictDataVO[] })?.data ?? [])
    .filter((item) => item.status === 'ENABLED')
    .sort((left, right) => left.dictSort - right.dictSort);
  return rows.map((item) => ({ value: item.dictValue, label: item.dictLabel }));
}

function emptyForm(options: BlockWordOptions) {
  return {
    word: '',
    blockType: options.types[0]?.value || '',
    matchType: options.matches[0]?.value || '',
    reasonCode: options.reasons[0]?.value || '',
    status: options.statuses[0]?.value || '',
  };
}

export default function SearchBlockWordPage() {
  const [rows, setRows] = useState<SearchBlockWordVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<BlockWordOptions>(EMPTY_OPTIONS);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [filters, setFilters] = useState({ word: '', blockType: '', reasonCode: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [editing, setEditing] = useState<SearchBlockWordVO | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm(EMPTY_OPTIONS));

  useEffect(() => {
    let active = true;
    void Promise.all([
      getDictDataChildren('search_block_type', 0),
      getDictDataChildren('search_block_match_type', 0),
      getDictDataChildren('search_block_reason', 0),
      getDictDataChildren('common_status', 0),
    ]).then(([types, matches, reasons, statuses]) => {
      if (!active) return;
      setOptions({
        types: toOptions(types),
        matches: toOptions(matches),
        reasons: toOptions(reasons),
        statuses: toOptions(statuses),
      });
    }).catch(() => {
      if (active) showToast('字典配置加载失败，请联系管理员', 'error');
    }).finally(() => {
      if (active) setOptionsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData(await getPrd06BlockWordList({
        word: query.word || undefined,
        blockType: query.blockType || undefined,
        reasonCode: query.reasonCode || undefined,
        status: query.status || undefined,
        page,
        size: 10,
      }));
      setRows(data.records);
      setTotal(data.total);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  function openCreate() {
    if (optionsLoading || Object.values(options).some((items) => items.length === 0)) {
      showToast('字典配置尚未加载完成', 'error');
      return;
    }
    setEditing(null);
    setForm(emptyForm(options));
    setDialogOpen(true);
  }

  function openEdit(row: SearchBlockWordVO) {
    setEditing(row);
    setForm({
      word: row.word,
      blockType: row.blockType,
      matchType: row.matchType,
      reasonCode: row.reasonCode,
      status: row.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.word.trim()) {
      showToast('请输入屏蔽词', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, word: form.word.trim() };
      if (editing) await updatePrd06BlockWord(editing.id, payload);
      else await createPrd06BlockWord(payload);
      showToast(editing ? '屏蔽词已更新' : '屏蔽词已新增', 'success');
      setDialogOpen(false);
      await fetchRows();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: SearchBlockWordVO) {
    const enabledStatus = options.statuses[0];
    const disabledStatus = options.statuses[1];
    if (!enabledStatus || !disabledStatus) {
      showToast('启停状态字典配置不完整', 'error');
      return;
    }
    const nextStatus = row.status === enabledStatus.value ? disabledStatus.value : enabledStatus.value;
    const action = optionLabel(options.statuses, nextStatus);
    if (!window.confirm(`确认${action}屏蔽词“${row.word}”？变更后将立即影响搜索过滤。`)) return;
    await updatePrd06BlockWordStatus(row.id, nextStatus);
    showToast(`屏蔽词已${action}`, 'success');
    fetchRows();
  }

  function handleSearch() {
    setPage(1);
    setQuery(filters);
  }

  function handleReset() {
    const empty = { word: '', blockType: '', reasonCode: '', status: '' };
    setFilters(empty);
    setQuery(empty);
    setPage(1);
  }

  return (
    <div className="space-y-4" data-page="prd06-search-block-words">
      <section className="flex items-center justify-between gap-5 rounded-lg border bg-card px-[22px] py-5 shadow-[0_10px_24px_rgba(24,49,82,0.04)]">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-foreground">搜索屏蔽词</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">维护持续变化的搜索风控词库，支持精确和包含匹配。</p>
        </div>
        <Button onClick={openCreate} disabled={optionsLoading}><Plus className="mr-1.5 h-4 w-4" />新增屏蔽词</Button>
      </section>

      <Card className="shadow-[0_10px_24px_rgba(24,49,82,0.04)]">
        <CardContent className="space-y-3 p-[18px]">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-[170px]" placeholder="请输入屏蔽词" value={filters.word} onChange={(event) => setFilters({ ...filters, word: event.target.value })} />
            <label className="sr-only" htmlFor="block-word-type-filter">屏蔽词类型</label>
            <select id="block-word-type-filter" className="h-9 w-[132px] rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filters.blockType} onChange={(event) => setFilters({ ...filters, blockType: event.target.value })}>
              <option value="">全部类型</option>
              {options.types.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label className="sr-only" htmlFor="block-word-reason-filter">屏蔽原因</label>
            <select id="block-word-reason-filter" className="h-9 w-[132px] rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filters.reasonCode} onChange={(event) => setFilters({ ...filters, reasonCode: event.target.value })}>
              <option value="">全部原因</option>
              {options.reasons.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label className="sr-only" htmlFor="block-word-status-filter">启停状态</label>
            <select id="block-word-status-filter" className="h-9 w-[116px] rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">全部状态</option>
              {options.statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
            <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="h-10 text-xs font-semibold">屏蔽词</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">类型</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">匹配方式</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">屏蔽原因</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">状态</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">最近修改人</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">最近修改时间</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">正在查询屏蔽词...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">暂无屏蔽词，可点击新增屏蔽词创建</TableCell></TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="h-[50px] font-medium">{row.word}</TableCell>
                    <TableCell className="h-[50px]">{optionLabel(options.types, row.blockType)}</TableCell>
                    <TableCell className="h-[50px]">{optionLabel(options.matches, row.matchType)}</TableCell>
                    <TableCell className="h-[50px]">{optionLabel(options.reasons, row.reasonCode)}</TableCell>
                    <TableCell className="h-[50px]"><Badge className="rounded-full px-2.5 py-1" variant={row.status === options.statuses[0]?.value ? 'success' : 'secondary'}>{optionLabel(options.statuses, row.status)}</Badge></TableCell>
                    <TableCell className="h-[50px]">{row.updateByName || row.updatedBy || '-'}</TableCell>
                    <TableCell className="h-[50px]">{row.updateTime || row.createTime || '-'}</TableCell>
                    <TableCell className="h-[50px]">
                      <div className="flex items-center gap-1">
                        <Button variant="link" size="sm" className="px-2" onClick={() => openEdit(row)}><Edit3 className="mr-1 h-4 w-4" />编辑</Button>
                        <Button variant="link" size="sm" className="px-2" onClick={() => toggleStatus(row)}>{row.status === options.statuses[0]?.value ? options.statuses[1]?.label : options.statuses[0]?.label}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination current={page} total={total} onChange={setPage} className="justify-end" />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-h-[88vh] max-w-[560px] overflow-y-auto p-7">
        <section role="dialog" aria-modal="true" aria-labelledby="block-word-dialog-title">
          <DialogHeader>
            <DialogTitle id="block-word-dialog-title" className="text-[22px]">{editing ? '编辑屏蔽词' : '新增屏蔽词'}</DialogTitle>
            <DialogDescription className="pt-1">启用后将立即进入搜索风控过滤。</DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <label className="block space-y-1.5 text-sm font-medium" htmlFor="block-word-input"><span>屏蔽词</span><Input id="block-word-input" maxLength={30} value={form.word} onChange={(event) => setForm({ ...form, word: event.target.value })} /></label>
            <label className="block space-y-1.5 text-sm font-medium" htmlFor="block-word-type"><span>类型</span><select id="block-word-type" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={form.blockType} onChange={(event) => setForm({ ...form, blockType: event.target.value })}>{options.types.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block space-y-1.5 text-sm font-medium" htmlFor="block-word-match"><span>匹配方式</span><select id="block-word-match" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={form.matchType} onChange={(event) => setForm({ ...form, matchType: event.target.value })}>{options.matches.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block space-y-1.5 text-sm font-medium" htmlFor="block-word-reason"><span>屏蔽原因</span><select id="block-word-reason" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={form.reasonCode} onChange={(event) => setForm({ ...form, reasonCode: event.target.value })}>{options.reasons.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block space-y-1.5 text-sm font-medium" htmlFor="block-word-status"><span>状态</span><select id="block-word-status" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{options.statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button></div>
        </section>
      </Dialog>
    </div>
  );
}
