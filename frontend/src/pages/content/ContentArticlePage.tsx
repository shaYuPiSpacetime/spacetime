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
  getArticleList,
  createArticle,
  updateArticle,
  updateArticleStatus,
  deleteArticle,
  type ContentArticleVO,
} from '@/api/content';
import { cn } from '@/lib/utils';

type TabKey = 'notice' | 'help' | 'rule' | 'safety' | 'about';

const TABS: { key: TabKey; label: string; type: string }[] = [
  { key: 'notice', label: '公告', type: 'ANNOUNCEMENT' },
  { key: 'help', label: '帮助文档', type: 'HELP_DOC' },
  { key: 'rule', label: '规则', type: 'RULE' },
  { key: 'safety', label: '安全内容', type: 'SECURITY_CONTENT' },
  { key: 'about', label: '关于我们', type: 'ABOUT_US' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'H5', label: 'H5链接' },
  { value: 'NATIVE', label: '原生内容' },
];

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const isEnabled = status === 'ENABLED';
  return <Badge variant={isEnabled ? 'success' : 'destructive'}>{isEnabled ? '启用' : '停用'}</Badge>;
}

function pageData(res: unknown) {
  return ((res as any).data ?? { records: [], total: 0 }) as { records: ContentArticleVO[]; total: number };
}

function toDateTimeInput(value?: string) {
  if (!value) return '';
  return value.replace(' ', 'T').slice(0, 16);
}

function toBackendDateTime(value: string) {
  return value ? value + ':00' : undefined;
}

export default function ContentArticlePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('notice');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ArticlePanel type={TABS.find((t) => t.key === activeTab)!.type} />
    </div>
  );
}

function ArticlePanel({ type }: { type: string }) {
  const [list, setList] = useState<ContentArticleVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ title: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentArticleVO | null>(null);
  const [form, setForm] = useState({
    title: '',
    category: '',
    summary: '',
    coverUrl: '',
    contentType: 'NATIVE',
    contentUrl: '',
    contentBody: '',
    sort: '0',
    status: 'ENABLED',
    effectiveTime: '',
    expireTime: '',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData(await getArticleList({ type, title: query.title || undefined, status: query.status || undefined, page, size: 10 }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [type, page, query]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { setPage(1); setQuery({ title: '', status: '' }); setFilters({ title: '', status: '' }); }, [type]);

  function openCreate() {
    setEditing(null);
    setForm({ title: '', category: '', summary: '', coverUrl: '', contentType: 'NATIVE', contentUrl: '', contentBody: '', sort: '0', status: 'ENABLED', effectiveTime: '', expireTime: '' });
    setDialogOpen(true);
  }

  function openEdit(row: ContentArticleVO) {
    setEditing(row);
    setForm({
      title: row.title ?? '',
      category: row.category ?? '',
      summary: row.summary ?? '',
      coverUrl: row.coverUrl ?? '',
      contentType: row.contentType ?? 'NATIVE',
      contentUrl: row.contentUrl ?? '',
      contentBody: row.contentBody ?? '',
      sort: String(row.sort ?? 0),
      status: row.status ?? 'ENABLED',
      effectiveTime: toDateTimeInput(row.effectiveTime),
      expireTime: toDateTimeInput(row.expireTime),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = {
      ...form,
      type,
      sort: Number(form.sort || 0),
      effectiveTime: toBackendDateTime(form.effectiveTime),
      expireTime: toBackendDateTime(form.expireTime),
      contentUrl: form.contentType === 'H5' ? form.contentUrl : '',
      contentBody: form.contentType === 'NATIVE' ? form.contentBody : '',
    };
    if (editing) await updateArticle(editing.id, payload);
    else await createArticle(payload);
    setDialogOpen(false);
    fetchList();
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除该内容？')) return;
    await deleteArticle(id);
    fetchList();
  }

  function handleSearch() { setPage(1); setQuery(filters); }
  function handleReset() { const empty = { title: '', status: '' }; setFilters(empty); setPage(1); setQuery(empty); }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>内容列表</CardTitle>
        <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-48" placeholder="标题搜索" value={filters.title} onChange={(e) => setFilters({ ...filters, title: e.target.value })} />
          <Select className="w-32" options={STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead>内容类型</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>生效时间</TableHead>
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
                <TableCell><div className="font-medium">{row.title}</div><div className="text-xs text-muted-foreground">{row.summary || '-'}</div></TableCell>
                <TableCell><Badge variant="secondary">{row.contentType === 'H5' ? 'H5' : '原生'}</Badge></TableCell>
                <TableCell>{row.sort}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{row.effectiveTime ?? '-'}</TableCell>
                <TableCell>{row.createTime ?? '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => updateArticleStatus(row.id, row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED').then(fetchList)}>{row.status === 'ENABLED' ? '停用' : '启用'}</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? '编辑内容' : '新增内容'}</DialogTitle><DialogDescription>填写内容信息</DialogDescription></DialogHeader>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="col-span-2 space-y-1 text-sm font-medium">标题<Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">分类<Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">内容类型<Select options={CONTENT_TYPE_OPTIONS} value={form.contentType} onChange={(v) => setForm({ ...form, contentType: v })} /></label>
          <label className="col-span-2 space-y-1 text-sm font-medium">摘要<Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>
          <label className="col-span-2 space-y-1 text-sm font-medium">封面URL<Input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} /></label>
          {form.contentType === 'H5' ? (
            <label className="col-span-2 space-y-1 text-sm font-medium">H5链接<Input value={form.contentUrl} onChange={(e) => setForm({ ...form, contentUrl: e.target.value })} placeholder="https://" /></label>
          ) : (
            <label className="col-span-2 space-y-1 text-sm font-medium">内容正文
              <textarea className="min-h-[120px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.contentBody} onChange={(e) => setForm({ ...form, contentBody: e.target.value })} />
            </label>
          )}
          <label className="space-y-1 text-sm font-medium">排序<Input type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">状态<Select options={[{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} value={form.status} onChange={(v) => setForm({ ...form, status: v })} /></label>
          <label className="space-y-1 text-sm font-medium">生效时间<Input type="datetime-local" value={form.effectiveTime} onChange={(e) => setForm({ ...form, effectiveTime: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-medium">失效时间<Input type="datetime-local" value={form.expireTime} onChange={(e) => setForm({ ...form, expireTime: e.target.value })} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></div>
      </Dialog>
    </Card>
  );
}
