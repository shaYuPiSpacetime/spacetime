import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Shield, Search, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import {
  getUserList,
  getUserDetail,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  assignUserRoles,
  type UserVO,
  type UserDetailVO,
} from '@/api/user';
import { getAllRoles, type RoleVO } from '@/api/role';

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '禁用' },
];

export default function UserManagement() {
  // List state
  const [list, setList] = useState<UserVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', nickname: '', email: '', phone: '', status: 'ENABLED' });

  // Role dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleUserId, setRoleUserId] = useState<number | null>(null);
  const [allRoles, setAllRoles] = useState<RoleVO[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUserList({ page, size: 10, keyword: keyword || undefined, status: status || undefined });
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
    setForm({ username: '', password: '', nickname: '', email: '', phone: '', status: 'ENABLED' });
    setDialogOpen(true);
  }

  async function openEdit(id: number) {
    setEditingId(id);
    try {
      const res = await getUserDetail(id);
      const u = (res as any).data as UserDetailVO;
      setForm({ username: u.username, password: '', nickname: u.nickname, email: u.email ?? '', phone: u.phone ?? '', status: u.status });
      setDialogOpen(true);
    } catch { /* ignore */ }
  }

  async function handleSave() {
    if (!form.nickname.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateUser(editingId, { nickname: form.nickname.trim(), email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, status: form.status });
      } else {
        if (!form.username.trim() || !form.password.trim()) return;
        await createUser({ username: form.username.trim(), password: form.password, nickname: form.nickname.trim(), email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, status: form.status });
      }
      setDialogOpen(false);
      fetchList();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除该用户？')) return;
    await deleteUser(id);
    fetchList();
  }

  async function handleResetPwd(id: number) {
    const pwd = prompt('请输入新密码');
    if (!pwd) return;
    await resetUserPassword(id, pwd);
    alert('密码重置成功');
  }

  async function openRoleDialog(id: number) {
    setRoleUserId(id);
    setRoleDialogOpen(true);
    try {
      const [rolesRes, detailRes] = await Promise.all([getAllRoles(), getUserDetail(id)]);
      setAllRoles((rolesRes as any).data ?? []);
      setSelectedRoleIds((detailRes as any).data?.roleIds ?? []);
    } catch { /* ignore */ }
  }

  async function handleSaveRoles() {
    if (roleUserId == null) return;
    setRoleSaving(true);
    try {
      await assignUserRoles(roleUserId, selectedRoleIds);
      setRoleDialogOpen(false);
      fetchList();
    } finally {
      setRoleSaving(false);
    }
  }

  function toggleRole(roleId: number) {
    setSelectedRoleIds((prev) => prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>用户管理</CardTitle>
          <Button onClick={openCreate}>新增用户</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-center gap-3">
            <Input
              placeholder="用户名/昵称/邮箱"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="w-56"
            />
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              className="w-32"
            />
            <Button variant="outline" size="sm" onClick={() => { setKeyword(''); setStatus(''); setPage(1); }}>
              <RotateCcw className="h-4 w-4 mr-1" /> 重置
            </Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>昵称</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最后登录</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">加载中…</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.nickname}</TableCell>
                  <TableCell>{u.email || '-'}</TableCell>
                  <TableCell>{u.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roleNames?.map((r) => <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'ENABLED' ? 'success' : 'destructive'}>{u.status === 'ENABLED' ? '启用' : '禁用'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.lastLoginTime || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleResetPwd(u.id)} title="重置密码">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRoleDialog(u.id)} title="分配角色">
                        <Shield className="h-4 w-4" />
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
        <DialogHeader><DialogTitle>{editingId ? '编辑用户' : '新增用户'}</DialogTitle><DialogDescription>{editingId ? '修改用户信息' : '创建一个后台管理员账号'}</DialogDescription></DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">用户名</label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editingId} placeholder="请输入用户名" />
          </div>
          <div>
            <label className="text-sm font-medium">密码 {!!editingId && <span className="text-muted-foreground">(留空不修改)</span>}</label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingId ? '留空则不修改密码' : '请输入密码'} />
          </div>
          <div>
            <label className="text-sm font-medium">昵称</label>
            <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="请输入昵称" />
          </div>
          <div>
            <label className="text-sm font-medium">邮箱</label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="请输入邮箱" />
          </div>
          <div>
            <label className="text-sm font-medium">手机号</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="请输入手机号" />
          </div>
          <div>
            <label className="text-sm font-medium">状态</label>
            <Select options={[{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '禁用' }]} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
          </div>
        </div>
      </Dialog>

      {/* Assign Roles Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogHeader><DialogTitle>分配角色</DialogTitle><DialogDescription>选择用户拥有的角色</DialogDescription></DialogHeader>
        <div className="space-y-4 mt-4 max-h-80 overflow-y-auto">
          {allRoles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRoleIds.includes(r.id)}
                onChange={() => toggleRole(r.id)}
                className="w-4 h-4"
              />
              <span className="text-sm">{r.roleName}</span>
              <span className="text-xs text-muted-foreground">({r.roleCode})</span>
            </label>
          ))}
          {allRoles.length === 0 && <p className="text-sm text-muted-foreground">暂无可用角色</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveRoles} disabled={roleSaving}>{roleSaving ? '保存中…' : '保存'}</Button>
        </div>
      </Dialog>
    </div>
  );
}
