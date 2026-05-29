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
import { showToast } from '@/components/ui/toast';
import {
  getFeedbackDetail,
  getFeedbackList,
  updateFeedbackStatus,
  type AdminFeedbackVO,
} from '@/api/userSecurity';

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待处理' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'RESOLVED', label: '已解决' },
  { value: 'CLOSED', label: '已关闭' },
];

function statusBadge(status: string) {
  const variant = status === 'RESOLVED' || status === 'CLOSED' ? 'success' : status === 'PENDING' ? 'secondary' : 'default';
  return <Badge variant={variant as any}>{STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}</Badge>;
}

function pageData(res: unknown) {
  return ((res as any).data ?? { records: [], total: 0 }) as { records: AdminFeedbackVO[]; total: number };
}

export default function FeedbackPage() {
  const [list, setList] = useState<AdminFeedbackVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ userId: '', feedbackType: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AdminFeedbackVO | null>(null);
  const [remark, setRemark] = useState('');
  const [nextStatus, setNextStatus] = useState('RESOLVED');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData(await getFeedbackList({
        page,
        size: 10,
        userId: query.userId ? Number(query.userId) : undefined,
        feedbackType: query.feedbackType || undefined,
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
    const res = await getFeedbackDetail(id);
    const data = (res as any).data as AdminFeedbackVO;
    setDetail(data);
    setNextStatus(data.status === 'PENDING' ? 'PROCESSING' : data.status);
    setRemark(data.handleRemark ?? '');
  }

  async function handleStatus() {
    if (!detail) return;
    if (!remark.trim()) {
      showToast('请填写处理备注', 'error');
      return;
    }
    await updateFeedbackStatus(detail.id, { status: nextStatus, remark: remark.trim() });
    setDetail(null);
    fetchList();
  }

  function handleSearch() { setPage(1); setQuery(filters); }
  function handleReset() {
    const empty = { userId: '', feedbackType: '', status: '' };
    setFilters(empty);
    setQuery(empty);
    setPage(1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>反馈箱</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-36" placeholder="用户ID" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} />
          <Input className="w-40" placeholder="反馈类型" value={filters.feedbackType} onChange={(e) => setFilters({ ...filters, feedbackType: e.target.value })} />
          <Select className="w-32" options={STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>内容</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>提交时间</TableHead>
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
                <TableCell>{row.feedbackType}</TableCell>
                <TableCell className="max-w-[360px] truncate">{row.content}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
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
              <DialogTitle>反馈详情</DialogTitle>
              <DialogDescription>{detail.nickname} #{detail.userId}</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="rounded-md border p-3 text-sm leading-6">{detail.content}</div>
              {detail.imageUrls?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {detail.imageUrls.map((url) => <a key={url} className="text-sm text-primary underline" href={url} target="_blank" rel="noreferrer">查看截图</a>)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm font-medium">处理状态<Select options={STATUS_OPTIONS.filter((o) => o.value)} value={nextStatus} onChange={setNextStatus} /></label>
                <label className="space-y-1 text-sm font-medium">联系方式<Input value={detail.contact ?? ''} disabled /></label>
              </div>
              <label className="space-y-1 text-sm font-medium">处理备注<Input value={remark} onChange={(e) => setRemark(e.target.value)} /></label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetail(null)}>取消</Button>
                <Button onClick={handleStatus}>保存</Button>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </Card>
  );
}
