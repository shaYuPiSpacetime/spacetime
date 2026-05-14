import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  getDictTypeList,
  createDictType,
  updateDictType,
  deleteDictType,
  type DictTypeVO,
} from '@/api/dict';
import { usePermission } from '@/hooks/usePermission';

const STATUS_OPTIONS = [
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '禁用' },
];

export default function DictTypeManagement() {
  const { hasPermission } = usePermission();

  const [list, setList] = useState<DictTypeVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ dictName: '', dictType: '', dictSort: 0, status: 'ENABLED', remark: '' });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDictTypeList({ page, size: 10, keyword: keyword || undefined, status: status || undefined });
      const data = (res as any).data ?? {};
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditingId(null);
    setForm({ dictName: '', dictType: '', dictSort: 0, status: 'ENABLED', remark: '' });
    setDialogOpen(true);
  }

  function openEdit(item: DictTypeVO) {
    setEditingId(item.id);
    setForm({ dictName: item.dictName, dictType: item.dictType, dictSort: item.dictSort, status: item.status, remark: item.remark ?? '' });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.dictName.trim() || !form.dictType.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, dictName: form.dictName.trim(), dictType: form.dictType.trim(), remark: form.remark.trim() || undefined };
      if (editingId) {
        await updateDictType(editingId, data);
      } else {
        await createDictType(data);
      }
      setDialogOpen(false);
      fetchList();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除该字典类型？关联的字典数据将一并删除。')) return;
    await deleteDictType(id);
    fetchList();
  }

  function handleSearch() {
    setPage(1);
    fetchList();
  }

  function handleReset() {
    setKeyword('');
    setStatus('');
    setPage(1);
  }

  if (!hasPermission('system:dict:list')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">您没有访问该页面的权限</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>字典类型管理</CardTitle>
          <Button onClick={openCreate}>新增字典类型</Button>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="flex items-center gap-3 mb-4">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索字典名称/编码"
              className="max-w-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Select
              options={[{ value: '', label: '全部状态' }, ...STATUS_OPTIONS]}
              value={status}
              onChange={setStatus}
              placeholder="状态"
              className="w-32"
            />
            <Button variant="outline" onClick={handleSearch}>搜索</Button>
            <Button variant="ghost" onClick={handleReset}>重置</Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>字典名称</TableHead>
                <TableHead>字典编码</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">加载中…</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.dictName}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1 rounded">{item.dictType}</code></TableCell>
                  <TableCell>{item.dictSort}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'ENABLED' ? 'success' : 'destructive'}>
                      {item.status === 'ENABLED' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{item.remark || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{item.createTime?.replace('T', ' ').substring(0, 19) || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="mt-4">
            <Pagination
              total={total}
              current={page}
              pageSize={10}
              onChange={(p) => setPage(p)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingId ? '编辑字典类型' : '新增字典类型'}</DialogTitle>
          <DialogDescription>字典类型是字典数据的分类，如"性别"、"会员等级"</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">字典名称</label>
            <Input value={form.dictName} onChange={(e) => setForm({ ...form, dictName: e.target.value })} placeholder="如：性别" />
          </div>
          <div>
            <label className="text-sm font-medium">字典编码</label>
            <Input value={form.dictType} onChange={(e) => setForm({ ...form, dictType: e.target.value })} placeholder="如：gender（唯一，创建后谨慎修改）" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">排序</label>
              <Input type="number" value={form.dictSort} onChange={(e) => setForm({ ...form, dictSort: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium">状态</label>
              <Select options={STATUS_OPTIONS} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">备注</label>
            <Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="可选" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
