import { useCallback, useEffect, useState } from 'react';
import { Edit, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  getVipPackages,
  createVipPackage,
  updateVipPackage,
  updateVipPackageStatus,
  type VipPackage,
} from '@/api/vip';

const PACKAGE_TYPE_OPTIONS = [
  { value: '', label: '请选择套餐类型' },
  { value: 'normal', label: '普通订阅' },
  { value: 'continuous', label: '连续订阅' },
];

const STATUS_OPTIONS = [
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  normal: '普通订阅',
  continuous: '连续订阅',
};

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const label = status === 'ENABLED' ? '启用' : '停用';
  return <Badge variant={status === 'ENABLED' ? 'success' : 'destructive'}>{label}</Badge>;
}

function recommendBadge(flag?: number) {
  if (flag === 1) return <Badge variant="success">推荐</Badge>;
  return <span className="text-muted-foreground">-</span>;
}

export default function VipPackageManagement() {
  const [list, setList] = useState<VipPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VipPackage | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    packageName: '',
    packageType: 'normal',
    price: '',
    originPrice: '',
    durationDays: '30',
    recommendFlag: '0',
    packageTag: '',
    sortOrder: '0',
    status: 'ENABLED',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVipPackages();
      setList((res as any).data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({
      packageName: '',
      packageType: 'normal',
      price: '',
      originPrice: '',
      durationDays: '30',
      recommendFlag: '0',
      packageTag: '',
      sortOrder: '0',
      status: 'ENABLED',
    });
    setDialogOpen(true);
  }

  function openEdit(row: VipPackage) {
    setEditing(row);
    setForm({
      packageName: row.packageName,
      packageType: row.packageType,
      price: String(row.price ?? ''),
      originPrice: row.originPrice ? String(row.originPrice) : '',
      durationDays: String(row.durationDays ?? 30),
      recommendFlag: String(row.recommendFlag ?? 0),
      packageTag: row.packageTag ?? '',
      sortOrder: String(row.sortOrder ?? 0),
      status: row.status ?? 'ENABLED',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.packageName.trim() || !form.price) return;
    setSaving(true);
    try {
      const data = {
        packageName: form.packageName.trim(),
        packageType: form.packageType,
        price: Number(form.price),
        originPrice: form.originPrice ? Number(form.originPrice) : undefined,
        durationDays: Number(form.durationDays || 30),
        recommendFlag: Number(form.recommendFlag || 0),
        packageTag: form.packageTag.trim() || undefined,
        sortOrder: Number(form.sortOrder || 0),
        status: form.status,
      };
      if (editing) {
        await updateVipPackage(editing.id, data);
      } else {
        await createVipPackage(data);
      }
      setDialogOpen(false);
      fetchList();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: VipPackage) {
    const nextStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    await updateVipPackageStatus(row.id, nextStatus);
    fetchList();
  }

  const filteredList = keyword
    ? list.filter(
        (item) =>
          item.packageName.includes(keyword) ||
          (item.packageTag && item.packageTag.includes(keyword)),
      )
    : list;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>VIP 套餐管理</CardTitle>
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            新增套餐
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              className="w-64"
              placeholder="搜索套餐名称或标签"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>套餐名称</TableHead>
                <TableHead>套餐类型</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>原价</TableHead>
                <TableHead>有效天数</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>推荐</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.packageName}</TableCell>
                    <TableCell>{PACKAGE_TYPE_LABELS[row.packageType] ?? row.packageType}</TableCell>
                    <TableCell>¥{(row.price ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {row.originPrice ? `¥${row.originPrice.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>{row.durationDays}天</TableCell>
                    <TableCell>{row.packageTag || '-'}</TableCell>
                    <TableCell>{recommendBadge(row.recommendFlag)}</TableCell>
                    <TableCell>{row.sortOrder}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(row)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(row)}>
                          {row.status === 'ENABLED' ? '停用' : '启用'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑套餐' : '新增套餐'}</DialogTitle>
          <DialogDescription>维护VIP会员套餐的配置信息</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-medium">
              套餐名称
              <Input
                value={form.packageName}
                onChange={(e) => setForm({ ...form, packageName: e.target.value })}
                placeholder="如：月度VIP"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              套餐类型
              <Select
                options={PACKAGE_TYPE_OPTIONS.filter((o) => o.value)}
                value={form.packageType}
                onChange={(v) => setForm({ ...form, packageType: v })}
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1 text-sm font-medium">
              价格
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="如：29.9"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              原价
              <Input
                type="number"
                value={form.originPrice}
                onChange={(e) => setForm({ ...form, originPrice: e.target.value })}
                placeholder="如：39.9"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              有效天数
              <Input
                type="number"
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                placeholder="30"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-medium">
              标签
              <Input
                value={form.packageTag}
                onChange={(e) => setForm({ ...form, packageTag: e.target.value })}
                placeholder="如：热门/限时优惠"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              是否推荐
              <Select
                options={[
                  { value: '0', label: '不推荐' },
                  { value: '1', label: '推荐' },
                ]}
                value={form.recommendFlag}
                onChange={(v) => setForm({ ...form, recommendFlag: v })}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-medium">
              排序
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              状态
              <Select
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
