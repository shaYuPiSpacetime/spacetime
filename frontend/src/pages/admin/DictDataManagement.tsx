import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  createDictData,
  deleteDictData,
  getAllDictTypes,
  getDictDataChildren,
  updateDictData,
  type DictDataVO,
  type DictTypeVO,
} from '@/api/dict';
import { usePermission } from '@/hooks/usePermission';

const STATUS_OPTIONS = [
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '禁用' },
];

type DictNode = DictDataVO & {
  children?: DictNode[];
  childrenLoaded?: boolean;
};

function replaceNode(nodes: DictNode[], id: number, updater: (node: DictNode) => DictNode): DictNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    if (!node.children?.length) return node;
    return { ...node, children: replaceNode(node.children, id, updater) };
  });
}

function asLazyNodes(nodes: DictDataVO[]): DictNode[] {
  return nodes.map((node) => ({ ...node, children: undefined, childrenLoaded: false }));
}

export default function DictDataManagement() {
  const { hasPermission } = usePermission();
  const canList = hasPermission('system:dict:list');
  const [dictTypes, setDictTypes] = useState<DictTypeVO[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [tree, setTree] = useState<DictNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);
  const [form, setForm] = useState({
    parentId: '',
    dictLabel: '',
    dictValue: '',
    dictSort: 0,
    status: 'ENABLED',
    remark: '',
  });

  useEffect(() => {
    if (!canList) return;
    getAllDictTypes().then((res: any) => {
      const types: DictTypeVO[] = res.data ?? [];
      setDictTypes(types);
      setSelectedType((current) => current || types[0]?.dictType || '');
    });
  }, [canList]);

  const fetchRoots = useCallback(async () => {
    if (!canList) return;
    if (!selectedType) {
      setTree([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getDictDataChildren(selectedType, 0);
      setTree(asLazyNodes((res as any).data ?? []));
      setExpandedIds(new Set());
      setLoadingIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [canList, selectedType]);

  useEffect(() => {
    fetchRoots();
  }, [fetchRoots]);

  async function toggleExpand(node: DictNode) {
    if (!node.hasChildren) return;
    if (expandedIds.has(node.id)) {
      setExpandedIds((previous) => {
        const next = new Set(previous);
        next.delete(node.id);
        return next;
      });
      return;
    }

    if (!node.childrenLoaded) {
      setLoadingIds((previous) => new Set(previous).add(node.id));
      try {
        const res = await getDictDataChildren(selectedType, node.id);
        const children = asLazyNodes((res as any).data ?? []);
        setTree((previous) => replaceNode(previous, node.id, (current) => ({
          ...current,
          children,
          childrenLoaded: true,
          hasChildren: children.length > 0,
        })));
      } finally {
        setLoadingIds((previous) => {
          const next = new Set(previous);
          next.delete(node.id);
          return next;
        });
      }
    }

    setExpandedIds((previous) => new Set(previous).add(node.id));
  }

  function flattenTree(nodes: DictNode[], excludedIds: Set<number> = new Set(), depth: number = 0): { value: string; label: string }[] {
    const result: { value: string; label: string }[] = [];
    for (const node of nodes) {
      if (excludedIds.has(node.id)) continue;
      result.push({ value: String(node.id), label: `${'　'.repeat(depth)}${node.dictLabel}` });
      if (node.children?.length) result.push(...flattenTree(node.children, excludedIds, depth + 1));
    }
    return result;
  }

  function collectSubtreeIds(node: DictNode): Set<number> {
    const ids = new Set<number>();
    (function collect(current: DictNode) {
      ids.add(current.id);
      current.children?.forEach(collect);
    })(node);
    return ids;
  }

  function findNode(nodes: DictNode[], targetId: number): DictNode | null {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      const found = node.children?.length ? findNode(node.children, targetId) : null;
      if (found) return found;
    }
    return null;
  }

  function openCreate(parentId?: number) {
    setEditingId(null);
    setForm({
      parentId: parentId ? String(parentId) : '',
      dictLabel: '',
      dictValue: '',
      dictSort: 0,
      status: 'ENABLED',
      remark: '',
    });
    setParentOptions([{ value: '', label: '顶级（无）' }, ...flattenTree(tree)]);
    setDialogOpen(true);
  }

  function openEdit(id: number) {
    const node = findNode(tree, id);
    if (!node) return;
    setEditingId(id);
    setForm({
      parentId: node.parentId ? String(node.parentId) : '',
      dictLabel: node.dictLabel,
      dictValue: node.dictValue,
      dictSort: node.dictSort,
      status: node.status,
      remark: node.remark ?? '',
    });
    setParentOptions([{ value: '', label: '顶级（无）' }, ...flattenTree(tree, collectSubtreeIds(node))]);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.dictLabel.trim() || !form.dictValue.trim()) {
      showToast('请填写字典标签和字典键值', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = {
        dictType: selectedType,
        parentId: form.parentId ? Number(form.parentId) : 0,
        dictLabel: form.dictLabel.trim(),
        dictValue: form.dictValue.trim(),
        dictSort: form.dictSort,
        status: form.status,
        remark: form.remark.trim() || undefined,
      };
      if (editingId) await updateDictData(editingId, data);
      else await createDictData(data);
      setDialogOpen(false);
      await fetchRoots();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除该字典数据？子节点将一并删除。')) return;
    await deleteDictData(id);
    await fetchRoots();
  }

  function renderRow(node: DictNode, depth: number = 0): React.ReactNode {
    const isExpanded = expandedIds.has(node.id);
    const isNodeLoading = loadingIds.has(node.id);
    return (
      <Fragment key={node.id}>
        <TableRow>
          <TableCell style={{ paddingLeft: depth * 24 + 16 }}>
            <div className="flex items-center gap-1">
              {node.hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(node)}
                  className="flex h-6 w-6 items-center justify-center"
                  title={isExpanded ? '收起' : '展开并加载下一级'}
                  disabled={isNodeLoading}
                >
                  {isNodeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="h-6 w-6" />
              )}
              <span className="font-medium">{node.dictLabel}</span>
            </div>
          </TableCell>
          <TableCell><code className="rounded bg-muted px-1 text-xs">{node.dictValue}</code></TableCell>
          <TableCell>{node.dictSort}</TableCell>
          <TableCell>
            <Badge variant={node.status === 'ENABLED' ? 'success' : 'destructive'}>
              {node.status === 'ENABLED' ? '启用' : '禁用'}
            </Badge>
          </TableCell>
          <TableCell className="max-w-[200px] truncate text-muted-foreground">{node.remark || '-'}</TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              {hasPermission('system:dict:add') && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCreate(node.id)} title="添加子节点">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {hasPermission('system:dict:edit') && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(node.id)} title="编辑">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {hasPermission('system:dict:delete') && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(node.id)} title="删除">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && node.children?.map((child) => renderRow(child, depth + 1))}
      </Fragment>
    );
  }

  if (!canList) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-3 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">您没有访问该页面的权限</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>字典数据管理</CardTitle>
          {hasPermission('system:dict:add') && (
            <Button onClick={() => openCreate()} disabled={!selectedType}>新增字典数据</Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <label className="whitespace-nowrap text-sm font-medium">字典类型：</label>
            <Select
              options={dictTypes.map((item) => ({ value: item.dictType, label: item.dictName }))}
              value={selectedType}
              onChange={setSelectedType}
              placeholder="请选择字典类型"
              className="w-48"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>字典标签</TableHead>
                <TableHead>字典键值</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedType ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">请先选择字典类型</TableCell></TableRow>
              ) : loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
              ) : tree.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : tree.map((node) => renderRow(node))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingId ? '编辑字典数据' : '新增字典数据'}</DialogTitle>
          <DialogDescription>支持多级字典，选择上级可构建树形结构</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">上级字典</label>
            <Select options={parentOptions} value={form.parentId} onChange={(value) => setForm({ ...form, parentId: value })} placeholder="选择上级（可选）" />
          </div>
          <div>
            <label className="text-sm font-medium">字典标签</label>
            <Input value={form.dictLabel} onChange={(event) => setForm({ ...form, dictLabel: event.target.value })} placeholder="如：男、VIP1" />
          </div>
          <div>
            <label className="text-sm font-medium">字典键值</label>
            <Input value={form.dictValue} onChange={(event) => setForm({ ...form, dictValue: event.target.value })} placeholder="如：male、vip1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">排序</label>
              <Input type="number" value={form.dictSort} onChange={(event) => setForm({ ...form, dictSort: Number(event.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium">状态</label>
              <Select options={STATUS_OPTIONS} value={form.status} onChange={(value) => setForm({ ...form, status: value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">备注</label>
            <Input value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} placeholder="可选" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
