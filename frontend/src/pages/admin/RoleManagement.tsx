import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Menu, Search, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import {
  getRoleList,
  getRoleDetail,
  createRole,
  updateRole,
  deleteRole,
  bindRoleMenus,
  type RoleVO,
  type RoleDetailVO,
} from '@/api/role';
import { getMenuTree, type MenuVO } from '@/api/menu';

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '禁用' },
];

export default function RoleManagement() {
  // List state
  const [list, setList] = useState<RoleVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ roleName: '', roleCode: '', roleGroup: '', roleSort: 0, status: 'ENABLED', remark: '' });

  // Menu bind dialog
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [menuRoleId, setMenuRoleId] = useState<number | null>(null);
  const [menuTree, setMenuTree] = useState<MenuVO[]>([]);
  const [checkedMenuIds, setCheckedMenuIds] = useState<number[]>([]);
  const [expandedMenuIds, setExpandedMenuIds] = useState<Set<number>>(new Set());
  const [menuSaving, setMenuSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRoleList({ page, size: 10, keyword: keyword || undefined, status: status || undefined });
      const data = (res as any).data;
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditingId(null);
    setForm({ roleName: '', roleCode: '', roleGroup: '', roleSort: 0, status: '0', remark: '' });
    setDialogOpen(true);
  }

  async function openEdit(id: number) {
    setEditingId(id);
    try {
      const res = await getRoleDetail(id);
      const r = (res as any).data as RoleDetailVO;
      setForm({ roleName: r.roleName, roleCode: r.roleCode, roleGroup: r.roleGroup ?? '', roleSort: r.roleSort ?? 0, status: r.status, remark: r.remark ?? '' });
      setDialogOpen(true);
    } catch { /* ignore */ }
  }

  async function handleSave() {
    if (!form.roleName.trim() || !form.roleCode.trim()) return;
    setSaving(true);
    try {
      const data = { roleName: form.roleName.trim(), roleCode: form.roleCode.trim(), roleGroup: form.roleGroup.trim() || undefined, roleSort: form.roleSort, status: form.status, remark: form.remark.trim() || undefined };
      if (editingId) {
        await updateRole(editingId, data);
      } else {
        await createRole(data);
      }
      setDialogOpen(false);
      fetchList();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除该角色？')) return;
    await deleteRole(id);
    fetchList();
  }

  async function openMenuDialog(id: number) {
    setMenuRoleId(id);
    setMenuDialogOpen(true);
    setExpandedMenuIds(new Set());
    try {
      const [treeRes, detailRes] = await Promise.all([getMenuTree(), getRoleDetail(id)]);
      const tree = (treeRes as any).data ?? [];
      setMenuTree(tree);
      setCheckedMenuIds((detailRes as any).data?.menuIds ?? []);
      // Expand all by default
      const allIds = new Set<number>();
      (function collect(nodes: MenuVO[]) {
        for (const n of nodes) { allIds.add(n.id); if (n.children) collect(n.children); }
      })(tree);
      setExpandedMenuIds(allIds);
    } catch { /* ignore */ }
  }

  async function handleSaveMenus() {
    if (menuRoleId == null) return;
    setMenuSaving(true);
    try {
      await bindRoleMenus(menuRoleId, checkedMenuIds);
      setMenuDialogOpen(false);
      fetchList();
    } finally {
      setMenuSaving(false);
    }
  }

  function handleCheckMenu(id: number, children: MenuVO[]) {
    setCheckedMenuIds((prev) => {
      const has = prev.includes(id);
      let next = has ? prev.filter((mid) => mid !== id) : [...prev, id];
      // Cascade to children
      const childIds = new Set<number>();
      (function collect(nodes: MenuVO[]) {
        for (const n of nodes) { childIds.add(n.id); if (n.children) collect(n.children); }
      })(children);
      if (has) {
        next = next.filter((mid) => !childIds.has(mid));
      } else {
        for (const cid of childIds) { if (!next.includes(cid)) next.push(cid); }
      }
      return next;
    });
  }

  function toggleMenuExpand(id: number) {
    setExpandedMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function renderMenuTree(nodes: MenuVO[], depth: number = 0) {
    return nodes.map((node) => (
      <div key={node.id}>
        <label className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-1" style={{ paddingLeft: depth * 20 + 4 }}>
          {node.children && node.children.length > 0 && (
            <button onClick={(e) => { e.preventDefault(); toggleMenuExpand(node.id); }} className="w-4 h-4 flex items-center justify-center text-muted-foreground text-xs">
              {expandedMenuIds.has(node.id) ? '▾' : '▸'}
            </button>
          )}
          {(!node.children || node.children.length === 0) && <span className="w-4" />}
          <input
            type="checkbox"
            checked={checkedMenuIds.includes(node.id)}
            onChange={() => handleCheckMenu(node.id, node.children ?? [])}
            className="w-4 h-4"
          />
          <span className="text-sm">{node.menuName}</span>
          <span className="text-xs text-muted-foreground">({node.menuType === 'M' ? '目录' : node.menuType === 'C' ? '菜单' : '按钮'})</span>
        </label>
        {node.children && node.children.length > 0 && expandedMenuIds.has(node.id) && (
          <div>{renderMenuTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>角色管理</CardTitle>
          <Button onClick={openCreate}>新增角色</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="角色名称/编码"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="w-56"
            />
            <Select options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} className="w-32" />
            <Button variant="outline" size="sm" onClick={() => { setKeyword(''); setStatus(''); setPage(1); }}>
              <RotateCcw className="h-4 w-4 mr-1" /> 重置
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色名称</TableHead>
                <TableHead>角色编码</TableHead>
                <TableHead>分组</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">加载中…</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.roleName}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1 rounded">{r.roleCode}</code></TableCell>
                  <TableCell>{r.roleGroup || '-'}</TableCell>
                  <TableCell>{r.roleSort}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'ENABLED' ? 'success' : 'destructive'}>{r.status === 'ENABLED' ? '启用' : '禁用'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.createTime || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => openMenuDialog(r.id)}>
                        <Menu className="h-4 w-4 mr-1" /> 分配菜单
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination current={page} total={total} onChange={setPage} />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader><DialogTitle>{editingId ? '编辑角色' : '新增角色'}</DialogTitle><DialogDescription>角色编码创建后不可修改</DialogDescription></DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">角色名称</label>
            <Input value={form.roleName} onChange={(e) => setForm({ ...form, roleName: e.target.value })} placeholder="请输入角色名称" />
          </div>
          <div>
            <label className="text-sm font-medium">角色编码</label>
            <Input value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })} disabled={!!editingId} placeholder="如 admin, editor" />
          </div>
          <div>
            <label className="text-sm font-medium">角色分组</label>
            <Input value={form.roleGroup} onChange={(e) => setForm({ ...form, roleGroup: e.target.value })} placeholder="如 系统管理" />
          </div>
          <div>
            <label className="text-sm font-medium">排序</label>
            <Input type="number" value={form.roleSort} onChange={(e) => setForm({ ...form, roleSort: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-medium">状态</label>
            <Select options={[{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '禁用' }]} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
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

      {/* Bind Menus Dialog */}
      <Dialog open={menuDialogOpen} onClose={() => setMenuDialogOpen(false)} className="max-w-md">
        <DialogHeader><DialogTitle>分配菜单权限</DialogTitle><DialogDescription>勾选角色可访问的菜单和权限</DialogDescription></DialogHeader>
        <div className="space-y-2 mt-4 max-h-96 overflow-y-auto border rounded p-3">
          {renderMenuTree(menuTree)}
          {menuTree.length === 0 && <p className="text-sm text-muted-foreground">暂无菜单数据</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setMenuDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveMenus} disabled={menuSaving}>{menuSaving ? '保存中…' : '保存'}</Button>
        </div>
      </Dialog>
    </div>
  );
}
