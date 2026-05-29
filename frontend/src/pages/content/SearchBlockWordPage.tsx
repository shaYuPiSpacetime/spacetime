import { useState, useEffect, useCallback } from 'react';
import { Edit, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  getBlockWordList,
  createBlockWord,
  updateBlockWord,
  updateBlockWordStatus,
  deleteBlockWord,
  type SearchBlockWordVO,
} from '@/api/content';

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const BLOCK_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'SEARCH_VIOLATION', label: '搜索词违规' },
  { value: 'RESULT_BLOCK', label: '搜索结果屏蔽' },
];

const MATCH_TYPE_OPTIONS = [
  { value: 'EXACT', label: '精确匹配' },
  { value: 'FUZZY', label: '包含匹配' },
  { value: 'PREFIX', label: '前缀匹配' },
];

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const isEnabled = status === 'ENABLED';
  return <Badge variant={isEnabled ? 'success' : 'destructive'}>{isEnabled ? '启用' : '停用'}</Badge>;
}

function pageData(res: unknown) {
  return ((res as any).data ?? { records: [], total: 0 }) as { records: SearchBlockWordVO[]; total: number };
}

export default function SearchBlockWordPage() {
  const [list, setList] = useState<SearchBlockWordVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ word: '', blockType: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SearchBlockWordVO | null>(null);
  const [form, setForm] = useState({ word: '', blockType: 'SEARCH_VIOLATION', matchType: 'FUZZY', reasonCode: '', hitMessage: '', status: 'ENABLED', remark: '' });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData(await getBlockWordList({ word: query.word || undefined, blockType: query.blockType || undefined, status: query.status || undefined, page, size: 10 }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({ word: '', blockType: 'SEARCH_VIOLATION', matchType: 'FUZZY', reasonCode: '', hitMessage: '', status: 'ENABLED', remark: '' });
    setDialogOpen(true);
  }

  function openEdit(row: SearchBlockWordVO) {
    setEditing(row);
    setForm({
      word: row.word ?? '',
      blockType: row.blockType ?? 'SEARCH_VIOLATION',
      matchType: row.matchType ?? 'FUZZY',
      reasonCode: row.reasonCode ?? '',
      hitMessage: row.hitMessage ?? '',
      status: row.status ?? 'ENABLED',
      remark: row.remark ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) await updateBlockWord(editing.id, form);
    else await createBlockWord(form);
    setDialogOpen(false);
    fetchList();
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除该屏蔽词？')) return;
    await deleteBlockWord(id);
    fetchList();
  }

  function handleSearch() { setPage(1); setQuery(filters); }
  function handleReset() { const empty = { word: '', blockType: '', status: '' }; setFilters(empty); setPage(1); setQuery(empty); }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>搜索屏蔽词</CardTitle>
        <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增屏蔽词</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-44" placeholder="屏蔽词搜索" value={filters.word} onChange={(e) => setFilters({ ...filters, word: e.target.value })} />
          <Select className="w-32" options={BLOCK_TYPE_OPTIONS} value={filters.blockType} onChange={(v) => setFilters({ ...filters, blockType: v })} />
          <Select className="w-32" options={STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>屏蔽词</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>匹配方式</TableHead>
              <TableHead>命中提示</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.word}</TableCell>
                <TableCell><Badge variant="secondary">{BLOCK_TYPE_OPTIONS.find((o) => o.value === row.blockType)?.label ?? row.blockType}</Badge></TableCell>
                <TableCell>{MATCH_TYPE_OPTIONS.find((o) => o.value === row.matchType)?.label ?? row.matchType}</TableCell>
                <TableCell>{row.hitMessage || '-'}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{row.createTime ?? '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => updateBlockWordStatus(row.id, row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED').then(fetchList)}>{row.status === 'ENABLED' ? '停用' : '启用'}</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? '编辑屏蔽词' : '新增屏蔽词'}</DialogTitle><DialogDescription>配置搜索屏蔽词</DialogDescription></DialogHeader>
        <div className="mt-4 space-y-4">
          <label className="space-y-1 text-sm font-medium">屏蔽词<Input value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-medium">类型<Select options={BLOCK_TYPE_OPTIONS.filter((o) => o.value)} value={form.blockType} onChange={(v) => setForm({ ...form, blockType: v })} /></label>
            <label className="space-y-1 text-sm font-medium">匹配方式<Select options={MATCH_TYPE_OPTIONS} value={form.matchType} onChange={(v) => setForm({ ...form, matchType: v })} /></label>
          </div>
          <label className="space-y-1 text-sm font-medium">命中提示<Input value={form.hitMessage} onChange={(e) => setForm({ ...form, hitMessage: e.target.value })} placeholder="用户触发时的提示信息" /></label>
          <label className="space-y-1 text-sm font-medium">状态<Select options={[{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} value={form.status} onChange={(v) => setForm({ ...form, status: v })} /></label>
          <label className="space-y-1 text-sm font-medium">备注<Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></div>
      </Dialog>
    </Card>
  );
}
