import { useState, useEffect, useCallback, Fragment } from 'react';
import { Pencil, Trash2, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  getMenuTree,
  getMenuDetail,
  createMenu,
  updateMenu,
  deleteMenu,
  type MenuVO,
} from '@/api/menu';

const MENU_TYPE_OPTIONS = [
  { value: 'M', label: '目录' },
  { value: 'C', label: '菜单' },
  { value: 'F', label: '按钮' },
];

const STATUS_OPTIONS = [
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '禁用' },
];

function flattenTree(nodes: MenuVO[], depth: number = 0): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  for (const n of nodes) {
    result.push({ value: String(n.id), label: '  '.repeat(depth) + n.menuName });
    if (n.children) result.push(...flattenTree(n.children, depth + 1));
  }
  return result;
}

export default function MenuManagement() {
  const [tree, setTree] = useState<MenuVO[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [parentOptions, setParentOptions] = useState<{ value: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ parentId: '', menuName: '', menuType: 'C', path: '', component: '', icon: '', perms: '', menuSort: 0, status: 'ENABLED', visible: 1, remark: '' });

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMenuTree();
      const data = (res as any).data ?? [];
      setTree(data);
      // Auto-expand all
      const allIds = new Set<number>();
      (function collect(nodes: MenuVO[]) {
        for (const n of nodes) { allIds.add(n.id); if (n.children) collect(n.children); }
      })(data);
      setExpandedIds(allIds);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  function openCreate(parentId?: number) {
    setEditingId(null);
    setForm({ parentId: parentId ? String(parentId) : '', menuName: '', menuType: 'C', path: '', component: '', icon: '', perms: '', menuSort: 0, status: 'ENABLED', visible: 1, remark: '' });
    setParentOptions([{ value: '', label: '顶级（无）' }, ...flattenTree(tree)]);
    setDialogOpen(true);
  }

  async function openEdit(id: number) {
    setEditingId(id);
    try {
      const res = await getMenuDetail(id);
      const m = (res as any).data as MenuVO;
      setForm({ parentId: m.parentId ? String(m.parentId) : '', menuName: m.menuName, menuType: m.menuType, path: m.path ?? '', component: m.component ?? '', icon: m.icon ?? '', perms: m.perms ?? '', menuSort: m.menuSort ?? 0, status: m.status, visible: m.visible ?? 1, remark: m.remark ?? '' });
      setParentOptions([{ value: '', label: '顶级（无）' }, ...flattenTree(tree)]);
      setDialogOpen(true);
    } catch { /* ignore */ }
  }

  async function handleSave() {
    if (!form.menuName.trim()) return;
    setSaving(true);
    try {
      const data = {
        parentId: form.parentId ? Number(form.parentId) : undefined,
        menuName: form.menuName.trim(),
        menuType: form.menuType,
        path: form.path.trim() || undefined,
        component: form.component.trim() || undefined,
        icon: form.icon.trim() || undefined,
        perms: form.perms.trim() || undefined,
        menuSort: form.menuSort,
        status: form.status,
        visible: form.visible,
        remark: form.remark.trim() || undefined,
      };
      if (editingId) {
        await updateMenu(editingId, data);
      } else {
        await createMenu(data);
      }
      setDialogOpen(false);
      fetchTree();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除该菜单？子菜单将一并删除。')) return;
    await deleteMenu(id);
    fetchTree();
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const isC = form.menuType === 'C' || form.menuType === 'M';

  function renderRow(node: MenuVO, depth: number = 0): React.ReactNode {
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
              <span className="font-medium">{node.menuName}</span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">{node.icon || '-'}</TableCell>
          <TableCell>
            <Badge variant={node.menuType === 'M' ? 'secondary' : node.menuType === 'C' ? 'default' : 'outline'}>
              {node.menuType === 'M' ? '目录' : node.menuType === 'C' ? '菜单' : '按钮'}
            </Badge>
          </TableCell>
          <TableCell><code className="text-xs bg-muted px-1 rounded">{node.perms || '-'}</code></TableCell>
          <TableCell>{node.menuSort}</TableCell>
          <TableCell>
            <Badge variant={node.visible === 1 ? 'success' : 'destructive'}>{node.visible === 1 ? '可见' : '隐藏'}</Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              {node.menuType !== 'F' && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCreate(node.id)} title="添加子节点">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>菜单管理</CardTitle>
          <Button onClick={() => openCreate()}>新增菜单</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>菜单名称</TableHead>
                <TableHead>图标</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>权限标识</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>可见</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">加载中…</TableCell></TableRow>
              ) : tree.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : tree.map((node) => renderRow(node))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-lg">
        <DialogHeader><DialogTitle>{editingId ? '编辑菜单' : '新增菜单'}</DialogTitle><DialogDescription>目录和菜单显示在侧边栏，按钮为权限控制点</DialogDescription></DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">上级菜单</label>
            <Select options={parentOptions} value={form.parentId} onChange={(v) => setForm({ ...form, parentId: v })} placeholder="选择上级菜单" />
          </div>
          <div>
            <label className="text-sm font-medium">菜单类型</label>
            <Select options={MENU_TYPE_OPTIONS} value={form.menuType} onChange={(v) => setForm({ ...form, menuType: v, path: '', component: '', perms: '' })} />
          </div>
          <div>
            <label className="text-sm font-medium">菜单名称</label>
            <Input value={form.menuName} onChange={(e) => setForm({ ...form, menuName: e.target.value })} placeholder="请输入菜单名称" />
          </div>
          {isC && (
            <>
              <div>
                <label className="text-sm font-medium">路由路径</label>
                <Input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="如 /system/user" />
              </div>
              <div>
                <label className="text-sm font-medium">组件路径</label>
                <Input value={form.component} onChange={(e) => setForm({ ...form, component: e.target.value })} placeholder="如 system/user/index" />
              </div>
              <div>
                <label className="text-sm font-medium">图标</label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Lucide 图标名，如 Settings, Users" />
              </div>
            </>
          )}
          <div>
            <label className="text-sm font-medium">权限标识</label>
            <Input value={form.perms} onChange={(e) => setForm({ ...form, perms: e.target.value })} placeholder={form.menuType === 'F' ? '如 system:user:create' : '可选，如 system:user:list'} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">排序</label>
              <Input type="number" value={form.menuSort} onChange={(e) => setForm({ ...form, menuSort: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium">状态</label>
              <Select options={STATUS_OPTIONS} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
            </div>
            <div>
              <label className="text-sm font-medium">可见</label>
              <Select options={[{ value: '1', label: '显示' }, { value: '0', label: '隐藏' }]} value={String(form.visible)} onChange={(v) => setForm({ ...form, visible: Number(v) })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">备注</label>
            <Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="请输入备注" />
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
