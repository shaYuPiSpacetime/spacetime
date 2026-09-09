import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { usePermission } from '@/hooks/usePermission';
import { useSensitiveWords } from '@/hooks/useSensitiveWords';
import type { SensitiveWordStatus } from '@/types/sensitiveWord';

const statuses = [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }];

/** 所有文字机审共用的敏感词维护页。 */
export default function SensitiveWordManagement() {
  const { hasPermission } = usePermission();
  const canList = hasPermission('sensitive-word:list');
  const canEdit = hasPermission('sensitive-word:edit');
  const vm = useSensitiveWords(canList);
  const categoryOptions = vm.categories.map(item => ({ value: item.code, label: item.name }));
  if (!canList) return <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-muted-foreground">
    <ShieldAlert className="h-12 w-12" /><p>您没有访问该页面的权限</p>
  </div>;

  return <div className="space-y-4">
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div><CardTitle>敏感词管理</CardTitle><p className="mt-2 text-sm text-muted-foreground">统一维护文字审核使用的敏感词，停用的词条不参与本地拦截。</p></div>
        {hasPermission('sensitive-word:add') && <Button disabled={vm.busy} onClick={vm.openCreate}>新增敏感词</Button>}
      </CardHeader>
      <CardContent>
        <form className="mb-4 flex flex-wrap items-center gap-3" onSubmit={event => { event.preventDefault(); vm.search(); }}>
          <Input aria-label="搜索敏感词" placeholder="搜索敏感词" value={vm.filters.keyword} maxLength={256} className="max-w-xs"
            onChange={event => vm.setFilters({ ...vm.filters, keyword: event.target.value })} />
          <Select className="w-56" value={vm.filters.categoryCode} options={[{ value: '', label: '全部分类' }, ...categoryOptions]}
            onChange={categoryCode => vm.setFilters({ ...vm.filters, categoryCode })} />
          <Select className="w-32" value={vm.filters.status} options={[{ value: '', label: '全部状态' }, ...statuses]}
            onChange={status => vm.setFilters({ ...vm.filters, status })} />
          <Button type="submit" variant="outline">搜索</Button><Button type="button" variant="ghost" onClick={vm.reset}>重置</Button>
        </form>
        {vm.categoryError && <div role="alert" className="mb-3 flex items-center gap-3 text-sm text-destructive">
          分类加载失败：{vm.categoryError}<Button variant="outline" onClick={() => void vm.loadCategories()}>重试分类</Button>
        </div>}
        {vm.error && <div role="alert" className="mb-3 flex items-center gap-3 text-sm text-destructive">
          {vm.error}<Button variant="outline" onClick={() => void vm.refresh()}>重新加载</Button>
        </div>}
        <Table>
          <TableHeader><TableRow>
            <TableHead>敏感词</TableHead><TableHead>分类</TableHead><TableHead>状态</TableHead><TableHead>备注</TableHead>
            <TableHead>创建时间</TableHead><TableHead>更新时间</TableHead><TableHead className="min-w-40">操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {vm.loading ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">加载中…</TableCell></TableRow>
              : vm.records.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{vm.error ? '数据加载失败，请重试' : '暂无符合条件的敏感词'}</TableCell></TableRow>
              : vm.records.map(item => <TableRow key={item.id}>
                <TableCell className="max-w-64 break-all whitespace-pre-wrap font-medium">{item.word}</TableCell>
                <TableCell className="max-w-48">{item.categoryName}</TableCell>
                <TableCell><Badge variant={item.status === 'ENABLED' ? 'success' : 'secondary'}>{item.status === 'ENABLED' ? '启用' : '停用'}</Badge></TableCell>
                <TableCell className="max-w-52 break-words text-muted-foreground">{item.remark || '-'}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{item.createTime || '-'}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{item.updateTime || '-'}</TableCell>
                <TableCell><div className="flex gap-1">
                  {canEdit && <><Button size="sm" variant="ghost" disabled={vm.busy} onClick={() => void vm.openEdit(item)}>编辑</Button>
                    <Button size="sm" variant="ghost" disabled={vm.busy} onClick={() => void vm.toggleStatus(item)}>{item.status === 'ENABLED' ? '停用' : '启用'}</Button></>}
                  {hasPermission('sensitive-word:delete') && <Button size="sm" variant="ghost" disabled={vm.busy} className="text-destructive" onClick={() => vm.setDeleting(item)}>删除</Button>}
                </div></TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
        <div className="mt-4 overflow-x-auto"><Pagination total={vm.total} current={vm.page} pageSize={vm.size} onChange={vm.setPage} onPageSizeChange={vm.changeSize} /></div>
      </CardContent>
    </Card>
    <Dialog open={vm.dialogOpen} onClose={vm.closeDialog} ariaLabel={vm.editingId === null ? '新增敏感词' : '编辑敏感词'}>
      <DialogHeader><DialogTitle>{vm.editingId === null ? '新增敏感词' : '编辑敏感词'}</DialogTitle>
        <DialogDescription>选择一个分类；未删除的词条在整个词库中不能重复。</DialogDescription></DialogHeader>
      <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); void vm.save(); }}>
        <div className="space-y-2"><label htmlFor="sensitive-word" className="text-sm font-medium">敏感词</label>
          <Input id="sensitive-word" placeholder="请输入敏感词" value={vm.form.word} disabled={vm.busy}
            onChange={event => vm.setForm({ ...vm.form, word: event.target.value })} /></div>
        <div className="space-y-2"><span className="text-sm font-medium">分类</span>
          <Select placeholder="请选择分类" value={vm.form.categoryCode} options={categoryOptions} disabled={vm.busy}
            onChange={categoryCode => vm.setForm({ ...vm.form, categoryCode })} /></div>
        <div className="space-y-2"><span className="text-sm font-medium">状态</span>
          <Select value={vm.form.status} options={statuses} disabled={vm.busy} onChange={status => vm.setForm({ ...vm.form, status: status as SensitiveWordStatus })} /></div>
        <div className="space-y-2"><label htmlFor="sensitive-remark" className="text-sm font-medium">备注</label>
          <textarea id="sensitive-remark" className="min-h-20 w-full rounded-md border bg-card px-3 py-2 text-sm" maxLength={500}
            value={vm.form.remark ?? ''} disabled={vm.busy} onChange={event => vm.setForm({ ...vm.form, remark: event.target.value })} /></div>
        {vm.formError && <p role="alert" className="text-sm text-destructive">{vm.formError}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={vm.busy} onClick={vm.closeDialog}>取消</Button><Button type="submit" disabled={vm.busy}>{vm.busy ? '保存中…' : '保存'}</Button></div>
      </form>
    </Dialog>
    <Dialog open={vm.deleting !== null} onClose={() => { if (!vm.busy) vm.setDeleting(null); }} ariaLabel="删除敏感词">
      <DialogHeader><DialogTitle>删除敏感词</DialogTitle><DialogDescription>确认删除这个词条？删除后将不再参与本地拦截。</DialogDescription></DialogHeader>
      <p className="my-4 max-h-32 overflow-auto break-all whitespace-pre-wrap rounded-md bg-muted p-3">{vm.deleting?.word}</p>
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={vm.busy} onClick={() => vm.setDeleting(null)}>取消</Button>
        <Button variant="destructive" disabled={vm.busy} onClick={() => void vm.remove()}>{vm.busy ? '删除中…' : '确认删除'}</Button></div>
    </Dialog>
  </div>;
}
