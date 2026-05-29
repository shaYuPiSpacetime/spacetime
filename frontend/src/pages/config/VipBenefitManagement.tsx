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
  getVipBenefits,
  createVipBenefit,
  updateVipBenefit,
  updateVipBenefitStatus,
  type VipBenefit,
} from '@/api/vip';

const BENEFIT_TYPE_OPTIONS = [
  { value: '', label: '请选择权益类型' },
  { value: 'identity', label: '身份标识' },
  { value: 'discount', label: '折扣优惠' },
  { value: 'exclusive', label: '专属功能' },
  { value: 'priority', label: '优先特权' },
  { value: 'gift', label: '赠送福利' },
  { value: 'other', label: '其他' },
];

const STATUS_OPTIONS = [
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const BENEFIT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  BENEFIT_TYPE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
);

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const label = status === 'ENABLED' ? '启用' : '停用';
  return <Badge variant={status === 'ENABLED' ? 'success' : 'destructive'}>{label}</Badge>;
}

export default function VipBenefitManagement() {
  const [list, setList] = useState<VipBenefit[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  // 弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VipBenefit | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    benefitCode: '',
    benefitName: '',
    benefitType: '',
    benefitDesc: '',
    displayOrder: '0',
    status: 'ENABLED',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVipBenefits();
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
      benefitCode: '',
      benefitName: '',
      benefitType: '',
      benefitDesc: '',
      displayOrder: '0',
      status: 'ENABLED',
    });
    setDialogOpen(true);
  }

  function openEdit(row: VipBenefit) {
    setEditing(row);
    setForm({
      benefitCode: row.benefitCode,
      benefitName: row.benefitName,
      benefitType: row.benefitType,
      benefitDesc: row.benefitDesc,
      displayOrder: String(row.displayOrder ?? 0),
      status: row.status ?? 'ENABLED',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.benefitCode.trim() || !form.benefitName.trim() || !form.benefitType) return;
    setSaving(true);
    try {
      const data = {
        benefitCode: form.benefitCode.trim(),
        benefitName: form.benefitName.trim(),
        benefitType: form.benefitType,
        benefitDesc: form.benefitDesc.trim(),
        displayOrder: Number(form.displayOrder || 0),
        status: form.status,
      };
      if (editing) {
        await updateVipBenefit(editing.id, data);
      } else {
        await createVipBenefit(data);
      }
      setDialogOpen(false);
      fetchList();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: VipBenefit) {
    const nextStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    await updateVipBenefitStatus(row.id, nextStatus);
    fetchList();
  }

  // 前端过滤
  const filteredList = keyword
    ? list.filter(
        (item) =>
          item.benefitName.includes(keyword) ||
          item.benefitCode.includes(keyword) ||
          item.benefitDesc.includes(keyword),
      )
    : list;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>VIP 权益管理</CardTitle>
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            新增权益
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索栏 */}
          <div className="flex items-center gap-3">
            <Input
              className="w-64"
              placeholder="搜索权益名称、编码或描述"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {/* 表格 */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>权益编码</TableHead>
                <TableHead>权益名称</TableHead>
                <TableHead>权益类型</TableHead>
                <TableHead>权益描述</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.benefitCode}</TableCell>
                    <TableCell className="font-medium">{row.benefitName}</TableCell>
                    <TableCell>{BENEFIT_TYPE_LABELS[row.benefitType] ?? row.benefitType}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {row.benefitDesc || '-'}
                    </TableCell>
                    <TableCell>{row.displayOrder}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(row)}
                        >
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

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑权益' : '新增权益'}</DialogTitle>
          <DialogDescription>维护VIP会员的权益配置</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-medium">
              权益编码
              <Input
                value={form.benefitCode}
                onChange={(e) => setForm({ ...form, benefitCode: e.target.value })}
                placeholder="如：vip_badge"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              权益名称
              <Input
                value={form.benefitName}
                onChange={(e) => setForm({ ...form, benefitName: e.target.value })}
                placeholder="如：VIP专属标识"
              />
            </label>
          </div>
          <label className="space-y-1 text-sm font-medium">
            权益类型
            <Select
              options={BENEFIT_TYPE_OPTIONS}
              value={form.benefitType}
              onChange={(v) => setForm({ ...form, benefitType: v })}
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            权益描述
            <Input
              value={form.benefitDesc}
              onChange={(e) => setForm({ ...form, benefitDesc: e.target.value })}
              placeholder="如：个人主页展示VIP金色标识"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-medium">
              排序
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
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
