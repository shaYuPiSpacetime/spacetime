import { useState, useEffect, useCallback, Fragment } from 'react';
import { Pencil, Trash2, Plus, ChevronRight, ChevronDown, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  getAllDictTypes,
  getDictDataTree,
  createDictData,
  updateDictData,
  deleteDictData,
  type DictTypeVO,
  type DictDataVO,
} from '@/api/dict';
import { usePermission } from '@/hooks/usePermission';

const STATUS_OPTIONS = [
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '禁用' },
];

export default function DictDataManagement() {
  const { hasPermission } = usePermission();

  const [dictTypes, setDictTypes] = useState<DictTypeVO[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [tree, setTree] = useState<DictDataVO[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);
  const [form, setForm] = useState({ parentId: '', dictLabel: '', dictValue: '', dictSort: 0, status: 'ENABLED', remark: '' });

  // Load dict types for the selector
  useEffect(() => {
    getAllDictTypes().then((res: any) => {
      const types: DictTypeVO[] = res.data ?? [];
      setDictTypes(types);
      if (!selectedType && types.length > 0) setSelectedType(types[0].dictType);
    });
  }, []);

  const fetchTree = useCallback(async () => {
    if (!selectedType) return;
    setLoading(true);
    try {
      const res = await getDictDataTree(selectedType);
      const data = (res as any).data ?? [];
      setTree(data);
      const allIds = new Set<number>();
      (function collect(nodes: DictDataVO[]) {
        for (const n of nodes) { allIds.add(n.id); if (n.children) collect(n.children); }
      })(data);
      setExpandedIds(allIds);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  function flattenTree(nodes: DictDataVO[], depth: number = 0): { value: string; label: string }[] {
    const result: { value: string; label: string }[] = [];
    for (const n of nodes) {
      result.push({ value: String(n.id), label: '  '.repeat(depth) + n.dictLabel });
      if (n.children) result.push(...flattenTree(n.children, depth + 1));
    }
    return result;
  }

  function openCreate(parentId?: number) {
    setEditingId(null);
    setForm({ parentId: parentId ? String(parentId) : '', dictLabel: '', dictValue: '', dictSort: 0, status: 'ENABLED', remark: '' });
    setParentOptions([{ value: '', label: '顶级（无）' }, ...flattenTree(tree)]);
    setDialogOpen(true);
  }

  async function openEdit(id: number) {
    // Find node in tree by ID
    function findNode(nodes: DictDataVO[], targetId: number): DictDataVO | null {
      for (const n of nodes) {
        if (n.id === targetId) return n;
        if (n.children) { const found = findNode(n.children, targetId); if (found) return found; }
      }
      return null;
    }
    const node = findNode(tree, id);
    if (!node) return;
    setEditingId(id);
    setForm({ parentId: node.parentId ? String(node.parentId) : '', dictLabel: node.dictLabel, dictValue: node.dictValue, dictSort: node.dictSort, status: node.status, remark: node.remark ?? '' });
    setParentOptions([{ value: '', label: '顶级（无）' }, ...flattenTree(tree)]);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.dictLabel.trim() || !form.dictValue.trim()) return;
    setSaving(true);
    try {
      const data = {
        dictType: selectedType,
        parentId: form.parentId ? Number(form.parentId) : undefined,
        dictLabel: form.dictLabel.trim(),
        dictValue: form.dictValue.trim(),
        dictSort: form.dictSort,
        status: form.status,
        remark: form.remark.trim() || undefined,
      };
      if (editingId) {
        await updateDictData(editingId, data);
      } else {
        await createDictData(data);
      }
      setDialogOpen(false);
      fetchTree();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除该字典数据？子节点将一并删除。')) return;
    await deleteDictData(id);
    fetchTree();
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function renderRow(node: DictDataVO, depth: number = 0): React.ReactNode {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    return (
      <Fragment key={node.id}>
        <TableRow>
          <TableCell style={{ paddingLeft: depth * 24 + 16 }}>
            <div className="flex items-center gap-1">
              {hasChildren ? (
                <button onClick={() => toggleExpand(node.id)} className="w-5 h-5 flex items-center justify-center">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="w-5" />
              )}
              <span className="font-medium">{node.dictLabel}</span>
            </div>
          </TableCell>
          <TableCell><code className="text-xs bg-muted px-1 rounded">{node.dictValue}</code></TableCell>
          <TableCell>{node.dictSort}</TableCell>
          <TableCell>
            <Badge variant={node.status === 'ENABLED' ? 'success' : 'destructive'}>
              {node.status === 'ENABLED' ? '启用' : '禁用'}
            </Badge>
          </TableCell>
          <TableCell className="text-muted-foreground max-w-[200px] truncate">{node.remark || '-'}</TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCreate(node.id)} title="添加子节点">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(node.id)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(node.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && node.children!.map((child) => renderRow(child, depth + 1))}
      </Fragment>
    );
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
          <CardTitle>字典数据管理</CardTitle>
          <Button onClick={() => openCreate()} disabled={!selectedType}>新增字典数据</Button>
        </CardHeader>
        <CardContent>
          {/* Dict type selector */}
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium whitespace-nowrap">字典类型：</label>
            <Select
              options={dictTypes.map((t) => ({ value: t.dictType, label: t.dictName }))}
              value={selectedType}
              onChange={setSelectedType}
              placeholder="请选择字典类型"
              className="w-48"
            />
          </div>

          {/* Tree table */}
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
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">加载中…</TableCell></TableRow>
              ) : tree.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : tree.map((node) => renderRow(node))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingId ? '编辑字典数据' : '新增字典数据'}</DialogTitle>
          <DialogDescription>支持多级字典，选择上级可构建树形结构</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">上级字典</label>
            <Select options={parentOptions} value={form.parentId} onChange={(v) => setForm({ ...form, parentId: v })} placeholder="选择上级（可选）" />
          </div>
          <div>
            <label className="text-sm font-medium">字典标签</label>
            <Input value={form.dictLabel} onChange={(e) => setForm({ ...form, dictLabel: e.target.value })} placeholder="如：男、VIP1" />
          </div>
          <div>
            <label className="text-sm font-medium">字典键值</label>
            <Input value={form.dictValue} onChange={(e) => setForm({ ...form, dictValue: e.target.value })} placeholder="如：male、vip1" />
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
