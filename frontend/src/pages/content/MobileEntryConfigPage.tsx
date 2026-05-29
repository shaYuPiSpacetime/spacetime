import { useState, useEffect, useCallback } from 'react';
import { Edit, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  getMobileEntryList,
  createMobileEntry,
  updateMobileEntry,
  updateMobileEntryStatus,
  deleteMobileEntry,
  type MobileEntryConfigVO,
} from '@/api/content';
import { cn } from '@/lib/utils';

type PageCode = 'MY_PAGE' | 'SETTINGS_PAGE' | 'SECURITY_CENTER' | 'SEARCH_RESULT_TAB';

const PAGE_CODES: { key: PageCode; label: string }[] = [
  { key: 'MY_PAGE', label: '我的页面' },
  { key: 'SETTINGS_PAGE', label: '设置页面' },
  { key: 'SECURITY_CENTER', label: '安全中心' },
  { key: 'SEARCH_RESULT_TAB', label: '搜索结果Tab' },
];

const JUMP_TYPE_OPTIONS = [
  { value: 'NATIVE_ROUTE', label: '页面跳转' },
  { value: 'H5', label: 'H5链接' },
  { value: 'MINI_PROGRAM', label: '小程序' },
  { value: 'NONE', label: '无跳转' },
];

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const isEnabled = status === 'ENABLED';
  return <Badge variant={isEnabled ? 'success' : 'destructive'}>{isEnabled ? '启用' : '停用'}</Badge>;
}

export default function MobileEntryConfigPage() {
  const [activeTab, setActiveTab] = useState<PageCode>('MY_PAGE');
  const [list, setList] = useState<MobileEntryConfigVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MobileEntryConfigVO | null>(null);
  const [form, setForm] = useState({
    entryKey: '',
    entryName: '',
    icon: '',
    jumpType: 'NATIVE_ROUTE',
    jumpTarget: '',
    badgeText: '',
    badgeType: 'NONE',
    loginRequired: 0,
    sort: '0',
    status: 'ENABLED',
    extraJson: '',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMobileEntryList(activeTab);
      const data = (res as any).data;
      setList(Array.isArray(data) ? data : data?.records ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({ entryKey: '', entryName: '', icon: '', jumpType: 'NATIVE_ROUTE', jumpTarget: '', badgeText: '', badgeType: 'NONE', loginRequired: 0, sort: '0', status: 'ENABLED', extraJson: '' });
    setDialogOpen(true);
  }

  function openEdit(row: MobileEntryConfigVO) {
    setEditing(row);
    setForm({
      entryKey: row.entryKey ?? '',
      entryName: row.entryName ?? '',
      icon: row.icon ?? '',
      jumpType: row.jumpType ?? 'NATIVE_ROUTE',
      jumpTarget: row.jumpTarget ?? '',
      badgeText: row.badgeText ?? '',
      badgeType: row.badgeType ?? 'NONE',
      loginRequired: row.loginRequired ?? 0,
      sort: String(row.sort ?? 0),
      status: row.status ?? 'ENABLED',
      extraJson: row.extraJson ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = { ...form, pageCode: activeTab, sort: Number(form.sort || 0) };
    if (editing) await updateMobileEntry(editing.id, payload);
    else await createMobileEntry(payload);
    setDialogOpen(false);
    fetchList();
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除该入口？')) return;
    await deleteMobileEntry(id);
    fetchList();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        {PAGE_CODES.map((tab) => (
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
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>入口配置</CardTitle>
          <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />新增入口</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>入口名称</TableHead>
                <TableHead>入口Key</TableHead>
                <TableHead>跳转类型</TableHead>
                <TableHead>跳转目标</TableHead>
                <TableHead>角标</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.entryName}</TableCell>
                  <TableCell>{row.entryKey}</TableCell>
                  <TableCell><Badge variant="secondary">{JUMP_TYPE_OPTIONS.find((o) => o.value === row.jumpType)?.label ?? row.jumpType}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.jumpTarget || '-'}</TableCell>
                  <TableCell>{row.badgeText || '-'}</TableCell>
                  <TableCell>{row.sort}</TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => updateMobileEntryStatus(row.id, row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED').then(fetchList)}>{row.status === 'ENABLED' ? '停用' : '启用'}</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? '编辑入口' : '新增入口'}</DialogTitle><DialogDescription>配置移动端入口</DialogDescription></DialogHeader>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="space-y-1 text-sm font-medium">入口名称<Input value={form.entryName} onChange={(e) => setForm({ ...form, entryName: e.target.value })} /></label>
            <label className="space-y-1 text-sm font-medium">入口Key<Input value={form.entryKey} onChange={(e) => setForm({ ...form, entryKey: e.target.value })} /></label>
            <label className="space-y-1 text-sm font-medium">图标URL<Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
            <label className="space-y-1 text-sm font-medium">跳转类型<Select options={JUMP_TYPE_OPTIONS} value={form.jumpType} onChange={(v) => setForm({ ...form, jumpType: v })} /></label>
            <label className="col-span-2 space-y-1 text-sm font-medium">跳转目标<Input value={form.jumpTarget} onChange={(e) => setForm({ ...form, jumpTarget: e.target.value })} /></label>
            <label className="space-y-1 text-sm font-medium">角标文字<Input value={form.badgeText} onChange={(e) => setForm({ ...form, badgeText: e.target.value })} /></label>
            <label className="space-y-1 text-sm font-medium">角标类型<Input value={form.badgeType} onChange={(e) => setForm({ ...form, badgeType: e.target.value })} /></label>
            <label className="space-y-1 text-sm font-medium">排序<Input type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} /></label>
            <label className="space-y-1 text-sm font-medium">状态<Select options={[{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} value={form.status} onChange={(v) => setForm({ ...form, status: v })} /></label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.loginRequired === 1} onChange={(e) => setForm({ ...form, loginRequired: e.target.checked ? 1 : 0 })} />需要登录</label>
            <label className="col-span-2 space-y-1 text-sm font-medium">扩展JSON<Input value={form.extraJson} onChange={(e) => setForm({ ...form, extraJson: e.target.value })} placeholder='{"key":"value"}' /></label>
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></div>
        </Dialog>
      </Card>
    </div>
  );
}
