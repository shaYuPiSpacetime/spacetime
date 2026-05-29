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
  getHotWordList,
  createHotWord,
  updateHotWord,
  updateHotWordStatus,
  deleteHotWord,
  type SearchHotWordVO,
} from '@/api/content';

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const SCENE_OPTIONS = [
  { value: '', label: '全部场景' },
  { value: 'GLOBAL', label: '全局' },
  { value: 'USER', label: '用户' },
  { value: 'POST', label: '动态' },
  { value: 'TOPIC', label: '话题' },
];

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const isEnabled = status === 'ENABLED';
  return <Badge variant={isEnabled ? 'success' : 'destructive'}>{isEnabled ? '启用' : '停用'}</Badge>;
}

function pageData(res: unknown) {
  return ((res as any).data ?? { records: [], total: 0 }) as { records: SearchHotWordVO[]; total: number };
}

export default function SearchHotWordPage() {
  const [list, setList] = useState<SearchHotWordVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ word: '', scene: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SearchHotWordVO | null>(null);
  const [form, setForm] = useState({ word: '', scene: 'GLOBAL', sort: '0', status: 'ENABLED' });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData(await getHotWordList({ word: query.word || undefined, scene: query.scene || undefined, status: query.status || undefined, page, size: 10 }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({ word: '', scene: 'GLOBAL', sort: '0', status: 'ENABLED' });
    setDialogOpen(true);
  }

  function openEdit(row: SearchHotWordVO) {
    setEditing(row);
    setForm({ word: row.word ?? '', scene: row.scene ?? 'GLOBAL', sort: String(row.sort ?? 0), status: row.status ?? 'ENABLED' });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = { ...form, sort: Number(form.sort || 0) };
    if (editing) await updateHotWord(editing.id, payload);
    else await createHotWord(payload);
    setDialogOpen(false);
    fetchList();
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除该热词？')) return;
    await deleteHotWord(id);
    fetchList();
  }

  function handleSearch() { setPage(1); setQuery(filters); }
  function handleReset() { const empty = { word: '', scene: '', status: '' }; setFilters(empty); setPage(1); setQuery(empty); }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>搜索热词</CardTitle>
        <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增热词</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-44" placeholder="热词搜索" value={filters.word} onChange={(e) => setFilters({ ...filters, word: e.target.value })} />
          <Select className="w-32" options={SCENE_OPTIONS} value={filters.scene} onChange={(v) => setFilters({ ...filters, scene: v })} />
          <Select className="w-32" options={STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>热词</TableHead>
              <TableHead>场景</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.word}</TableCell>
                <TableCell>{SCENE_OPTIONS.find((o) => o.value === row.scene)?.label ?? row.scene}</TableCell>
                <TableCell>{row.sort}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{row.createTime ?? '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => updateHotWordStatus(row.id, row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED').then(fetchList)}>{row.status === 'ENABLED' ? '停用' : '启用'}</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader><DialogTitle>{editing ? '编辑热词' : '新增热词'}</DialogTitle><DialogDescription>配置搜索热词</DialogDescription></DialogHeader>
        <div className="mt-4 space-y-4">
          <label className="space-y-1 text-sm font-medium">热词<Input placeholder="请输入热词" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">场景<Select options={SCENE_OPTIONS.filter((o) => o.value)} value={form.scene} onChange={(v) => setForm({ ...form, scene: v })} /></label>
          <label className="space-y-1 text-sm font-medium">排序<Input type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">状态<Select options={[{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} value={form.status} onChange={(v) => setForm({ ...form, status: v })} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></div>
      </Dialog>
    </Card>
  );
}
