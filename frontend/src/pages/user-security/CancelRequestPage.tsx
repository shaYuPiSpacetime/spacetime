import { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCcw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import {
  appendPrd06CancelRequestRemark,
  getPrd06CancelRequestDetail,
  getPrd06CancelRequestList,
  type CancelRequestVO,
} from '@/api/prd06';
import { getDictDataChildren, type DictDataVO } from '@/api/dict';

type DictOption = { value: string; label: string };

function toOptions(response: unknown): DictOption[] {
  const rows = ((response as { data?: DictDataVO[] })?.data ?? [])
    .filter((item) => item.status === 'ENABLED')
    .sort((left, right) => left.dictSort - right.dictSort);
  return rows.map((item) => ({ value: item.dictValue, label: item.dictLabel }));
}

function statusLabel(options: DictOption[], status: string) {
  return options.find((option) => option.value === status)?.label || status;
}

function statusBadge(options: DictOption[], status: string) {
  const variant = status === 'BLOCKED' ? 'destructive' : status === 'COOLING_OFF' || status === 'REQUESTED' ? 'secondary' : 'success';
  return <Badge className="rounded-full px-2.5 py-1" variant={variant}>{statusLabel(options, status)}</Badge>;
}

function pageData(response: unknown) {
  const data = (response as { data?: unknown })?.data;
  if (Array.isArray(data)) return { records: data as CancelRequestVO[], total: data.length };
  return {
    records: (data as { records?: CancelRequestVO[] })?.records ?? [],
    total: (data as { total?: number })?.total ?? 0,
  };
}

function blockReasonsOf(row: CancelRequestVO) {
  if (Array.isArray(row.blockReasons)) return row.blockReasons;
  return row.blockReason ? [row.blockReason] : [];
}

function remarksOf(row: CancelRequestVO) {
  if (Array.isArray(row.remarks)) return row.remarks;
  return row.remark ? [row.remark] : [];
}

function DetailItem({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="grid min-h-[48px] grid-cols-[120px_1fr] gap-3 bg-white px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <strong className="font-medium text-foreground">{value === undefined || value === '' ? '-' : value}</strong>
    </div>
  );
}

export default function CancelRequestPage() {
  const [rows, setRows] = useState<CancelRequestVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [detail, setDetail] = useState<CancelRequestVO | null>(null);
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusOptions, setStatusOptions] = useState<DictOption[]>([]);

  useEffect(() => {
    let active = true;
    void getDictDataChildren('account_cancel_status', 0)
      .then((response) => {
        if (active) setStatusOptions(toOptions(response));
      })
      .catch(() => {
        if (active) showToast('注销状态字典加载失败，请联系管理员', 'error');
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData(await getPrd06CancelRequestList({
        page,
        size: 10,
        keyword: query.keyword || undefined,
        status: query.status || undefined,
      }));
      setRows(data.records);
      setTotal(data.total);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  async function openDetail(row: CancelRequestVO) {
    try {
      const response = await getPrd06CancelRequestDetail(row.id);
      setDetail(((response as { data?: CancelRequestVO }).data ?? row));
    } catch {
      setDetail(row);
    }
    setRemark('');
  }

  async function handleRemarkSave() {
    if (!detail || !remark.trim()) {
      showToast('请输入要追加的内部备注', 'error');
      return;
    }
    setSaving(true);
    try {
      await appendPrd06CancelRequestRemark(detail.id, remark.trim());
      showToast('内部备注已追加', 'success');
      setDetail(null);
      setRemark('');
      await fetchRows();
    } finally {
      setSaving(false);
    }
  }

  function handleSearch() {
    setPage(1);
    setQuery(filters);
  }

  function handleReset() {
    const empty = { keyword: '', status: '' };
    setFilters(empty);
    setQuery(empty);
    setPage(1);
  }

  return (
    <div className="space-y-4" data-page="prd06-cancellations">
      <section className="flex items-center justify-between gap-5 rounded-lg border bg-card px-[22px] py-5 shadow-[0_10px_24px_rgba(24,49,82,0.04)]">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-foreground">注销申请</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">后台只读查看并追加备注；状态由用户操作和系统定时任务驱动。</p>
        </div>
        <Button variant="outline" onClick={fetchRows} disabled={loading}><RefreshCcw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />刷新</Button>
      </section>

      <Card className="shadow-[0_10px_24px_rgba(24,49,82,0.04)]">
        <CardContent className="space-y-2 p-[18px]">
          <strong className="text-sm">状态流转</strong>
          <p className="text-sm font-semibold text-[#2258c7]">提交申请 → 已申请（瞬时）→ 后悔期内 → 用户恢复账号 / 系统到期注销</p>
          <p className="text-xs leading-7 text-muted-foreground">前置校验不通过仅展示阻断原因，不形成有效申请；到期复核出现新阻断时保持“后悔期内”并暂停，定时任务后续重试。后台不提供审批或手工变更状态。</p>
        </CardContent>
      </Card>

      <Card className="shadow-[0_10px_24px_rgba(24,49,82,0.04)]">
        <CardContent className="space-y-3 p-[18px]">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-[170px]" placeholder="成家号/手机号" value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} />
            <label className="sr-only" htmlFor="cancellation-status-filter">注销状态</label>
            <select id="cancellation-status-filter" className="h-9 w-[132px] rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">全部状态</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
            <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="h-10 text-xs font-semibold">申请编号</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">用户</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">手机号</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">申请原因</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">状态</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">申请时间</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">预计执行时间</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">正在查询注销申请...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">暂无符合条件的注销申请</TableCell></TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="h-[50px]">{row.requestNo || `CAN-${String(row.id).padStart(6, '0')}`}</TableCell>
                    <TableCell className="h-[50px]">{row.nickname || '-'} <span className="text-xs text-muted-foreground">{row.userCode || (row.userId ? `U${row.userId}` : '')}</span></TableCell>
                    <TableCell className="h-[50px]">{row.phone || '-'}</TableCell>
                    <TableCell className="h-[50px]">{row.reason || '-'}</TableCell>
                    <TableCell className="h-[50px]">{statusBadge(statusOptions, row.status)}</TableCell>
                    <TableCell className="h-[50px]">{row.createTime || '-'}</TableCell>
                    <TableCell className="h-[50px]">{row.coolingEndTime || '-'}</TableCell>
                    <TableCell className="h-[50px]"><Button variant="link" size="sm" className="px-2" aria-label="查看详情" onClick={() => openDetail(row)}><Eye className="mr-1 h-4 w-4" />查看详情</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination current={page} total={total} onChange={setPage} className="justify-end" />
        </CardContent>
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} className="max-h-[88vh] max-w-[820px] overflow-y-auto p-7">
        {detail && (
          <section role="dialog" aria-modal="true" aria-labelledby="cancellation-detail-title">
            <DialogHeader>
              <DialogTitle id="cancellation-detail-title" className="text-[22px]">注销申请详情</DialogTitle>
              <DialogDescription className="pt-1">{detail.requestNo || `CAN-${String(detail.id).padStart(6, '0')}`} · {detail.nickname || detail.userCode || '-'}</DialogDescription>
            </DialogHeader>
            <div className="my-5 grid overflow-hidden rounded-[10px] border bg-border md:grid-cols-2 md:gap-px">
              <DetailItem label="注销状态" value={statusLabel(statusOptions, detail.status)} />
              <DetailItem label="申请时间" value={detail.createTime} />
              <DetailItem label="预计执行时间" value={detail.coolingEndTime} />
              <DetailItem label="手机号" value={detail.phone} />
              <DetailItem label="申请原因" value={detail.reason} />
              <DetailItem label="阻断原因" value={blockReasonsOf(detail).join('；') || '无'} />
              <DetailItem label="会员风险" value={detail.vipRisk || '无'} />
              <DetailItem label="退款风险" value={detail.refundRisk || '无'} />
              <DetailItem label="千寻币余额" value={detail.coinBalance ?? 0} />
              <DetailItem label="系统执行记录" value={detail.executionLog || '暂无执行记录'} />
              <DetailItem label="历史内部备注" value={remarksOf(detail).join('；') || '无'} />
              <DetailItem label="最终注销时间" value={detail.finalCancelTime} />
            </div>
            <label className="block space-y-1.5 text-sm font-medium" htmlFor="cancellation-remark">
              <span>内部备注</span>
              <textarea id="cancellation-remark" className="min-h-[88px] w-full resize-y rounded-lg border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" maxLength={500} placeholder="仅后台可见，追加保存" value={remark} onChange={(event) => setRemark(event.target.value)} />
            </label>
            <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setDetail(null)}>关闭</Button><Button onClick={handleRemarkSave} disabled={saving}>{saving ? '保存中...' : '追加备注'}</Button></div>
          </section>
        )}
      </Dialog>
    </div>
  );
}
