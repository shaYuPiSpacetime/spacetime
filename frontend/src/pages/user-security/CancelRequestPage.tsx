import { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCcw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  getCancelRequestDetail,
  getCancelRequestList,
  updateCancelRequestRemark,
  type AdminCancelRequestVO,
} from '@/api/userSecurity';

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'COOLING_OFF', label: '后悔期' },
  { value: 'REVOKED', label: '已撤销' },
  { value: 'CANCELLED', label: '已注销' },
  { value: 'BLOCKED', label: '已阻断' },
];

function statusBadge(status: string) {
  const variant = status === 'BLOCKED' ? 'destructive' : status === 'COOLING_OFF' ? 'secondary' : 'success';
  return <Badge variant={variant as any}>{STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}</Badge>;
}

function pageData(res: unknown) {
  return ((res as any).data ?? { records: [], total: 0 }) as { records: AdminCancelRequestVO[]; total: number };
}

export default function CancelRequestPage() {
  const [list, setList] = useState<AdminCancelRequestVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ userId: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AdminCancelRequestVO | null>(null);
  const [remark, setRemark] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData(await getCancelRequestList({
        page,
        size: 10,
        userId: query.userId ? Number(query.userId) : undefined,
        status: query.status || undefined,
      }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function openDetail(id: number) {
    const res = await getCancelRequestDetail(id);
    const data = (res as any).data as AdminCancelRequestVO;
    setDetail(data);
    setRemark(data.remark ?? '');
    setBlockReason(data.blockReason ?? '');
  }

  async function handleSave() {
    if (!detail) return;
    await updateCancelRequestRemark(detail.id, { remark: remark.trim() || undefined, blockReason: blockReason.trim() || undefined });
    setDetail(null);
    fetchList();
  }

  function handleSearch() { setPage(1); setQuery(filters); }
  function handleReset() {
    const empty = { userId: '', status: '' };
    setFilters(empty);
    setQuery(empty);
    setPage(1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>注销申请</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-36" placeholder="用户ID" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} />
          <Select className="w-32" options={STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>后悔期结束</TableHead>
              <TableHead>阻断原因</TableHead>
              <TableHead>申请时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.nickname} <span className="text-xs text-muted-foreground">#{row.userId}</span></TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{row.coolingEndTime ?? '-'}</TableCell>
                <TableCell className="max-w-[260px] truncate">{row.blockReason || '-'}</TableCell>
                <TableCell>{row.createTime ?? '-'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(row.id)} title="查看详情">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
      <Dialog open={!!detail} onClose={() => setDetail(null)} className="max-w-2xl">
        {detail && (
          <>
            <DialogHeader>
              <DialogTitle>注销申请详情</DialogTitle>
              <DialogDescription>{detail.nickname} #{detail.userId}</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>状态：{statusBadge(detail.status)}</div>
                <div>申请时间：{detail.createTime ?? '-'}</div>
                <div>后悔期结束：{detail.coolingEndTime ?? '-'}</div>
                <div>撤销时间：{detail.revokedTime ?? '-'}</div>
              </div>
              <label className="space-y-1 text-sm font-medium">注销原因<Input value={detail.reason ?? ''} disabled /></label>
              <label className="space-y-1 text-sm font-medium">后台备注<Input value={remark} onChange={(e) => setRemark(e.target.value)} /></label>
              <label className="space-y-1 text-sm font-medium">阻断原因<Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} /></label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetail(null)}>取消</Button>
                <Button onClick={handleSave}>保存</Button>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </Card>
  );
}
