import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, RefreshCcw, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import {
  getOrderList,
  getOrderDetail,
  processRefund,
  getFlowList,
  getRefundList,
  type TradeOrder,
  type CoinFlow,
  type RefundRecord,
} from '@/api/finance';
import type { PageResult } from '@/api/promotion';
import { cn } from '@/lib/utils';

// ==================== 常量 ====================

type TabKey = 'orders' | 'flows' | 'refunds';

const TABS: { key: TabKey; title: string; path: string }[] = [
  { key: 'orders', title: '订单管理', path: '/finance/orders' },
  { key: 'flows', title: '流水管理', path: '/finance/flows' },
  { key: 'refunds', title: '退款管理', path: '/finance/refunds' },
];

const ORDER_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'vip', label: 'VIP会员' },
  { value: 'coin', label: '成家币' },
];

const ORDER_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'unpaid', label: '待支付' },
  { value: 'success', label: '已支付' },
  { value: 'closed', label: '已关闭' },
  { value: 'failed', label: '支付失败' },
  { value: 'refunding', label: '退款中' },
  { value: 'refunded', label: '已退款' },
];

const FLOW_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' },
];

const BIZ_SCENE_OPTIONS = [
  { value: '', label: '全部场景' },
  { value: 'recharge', label: '充值' },
  { value: 'vip_purchase', label: '购买VIP' },
  { value: 'invite_reward', label: '邀请奖励' },
  { value: 'sign_in', label: '签到' },
  { value: 'refund', label: '退款' },
  { value: 'admin_grant', label: '后台发放' },
  { value: 'system_deduct', label: '系统扣减' },
];

const ORDER_TYPE_LABELS: Record<string, string> = {
  vip: 'VIP会员',
  coin: '成家币',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  unpaid: '待支付',
  success: '已支付',
  closed: '已关闭',
  failed: '支付失败',
  refunding: '退款中',
  refunded: '已退款',
};

const FLOW_TYPE_LABELS: Record<string, string> = {
  income: '收入',
  expense: '支出',
};

const BIZ_SCENE_LABELS: Record<string, string> = {
  recharge: '充值',
  vip_purchase: '购买VIP',
  invite_reward: '邀请奖励',
  sign_in: '签到',
  refund: '退款',
  admin_grant: '后台发放',
  system_deduct: '系统扣减',
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  success: '已退款',
  rejected: '已拒绝',
};

// ==================== 工具函数 ====================

function getTabFromPath(pathname: string): TabKey {
  return TABS.find((tab) => pathname.startsWith(tab.path))?.key ?? 'orders';
}

function pageData<T>(res: unknown): PageResult<T> {
  return ((res as any).data ?? { records: [], total: 0, current: 1, size: 10 }) as PageResult<T>;
}

function labelOf(value: string | undefined, labels: Record<string, string>) {
  if (!value) return '-';
  return labels[value] ?? value;
}

/** 订单状态 Badge */
function orderStatusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const label = labelOf(status, ORDER_STATUS_LABELS);
  const success = status === 'success';
  const warning = status === 'unpaid' || status === 'refunding';
  const danger = status === 'failed' || status === 'closed';
  const info = status === 'refunded';
  return (
    <Badge
      variant={
        success ? 'success' : warning ? 'warning' : danger ? 'destructive' : info ? 'secondary' : 'secondary'
      }
    >
      {label}
    </Badge>
  );
}

/** 流水类型 Badge */
function flowTypeBadge(type?: string) {
  if (!type) return <span>-</span>;
  const label = labelOf(type, FLOW_TYPE_LABELS);
  const isIncome = type === 'income';
  const isExpense = type === 'expense';
  return (
    <Badge variant={isIncome ? 'success' : isExpense ? 'warning' : 'secondary'}>
      {label}
    </Badge>
  );
}

/** 退款状态 Badge */
function refundStatusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const label = labelOf(status, REFUND_STATUS_LABELS);
  const success = status === 'success';
  const warning = status === 'pending' || status === 'processing';
  const danger = status === 'rejected';
  return (
    <Badge variant={success ? 'success' : warning ? 'warning' : danger ? 'destructive' : 'secondary'}>
      {label}
    </Badge>
  );
}

// ==================== 主组件 ====================

export default function FinanceManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getTabFromPath(location.pathname);

  return (
    <div className="space-y-4">
      {/* 顶部 Tab 切换 */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && <OrdersPanel />}
      {activeTab === 'flows' && <FlowsPanel />}
      {activeTab === 'refunds' && <RefundsPanel />}
    </div>
  );
}

// ==================== 订单管理 Tab ====================

function OrdersPanel() {
  const [list, setList] = useState<TradeOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    orderNo: '',
    orderType: '',
    orderStatus: '',
    startTime: '',
    endTime: '',
  });
  const [query, setQuery] = useState(filters);

  // 订单详情
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TradeOrder | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<TradeOrder>(
        await getOrderList({
          page,
          size: 10,
          orderNo: query.orderNo || undefined,
          orderType: query.orderType || undefined,
          orderStatus: query.orderStatus || undefined,
          startTime: query.startTime || undefined,
          endTime: query.endTime || undefined,
        }),
      );
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function handleSearch() {
    setPage(1);
    setQuery(filters);
  }

  function handleReset() {
    const empty = { orderNo: '', orderType: '', orderStatus: '', startTime: '', endTime: '' };
    setFilters(empty);
    setPage(1);
    setQuery(empty);
  }

  async function openDetail(id: number) {
    try {
      const res = await getOrderDetail(id);
      setDetail((res as any).data ?? null);
      setDetailOpen(true);
    } catch {
      showToast('获取订单详情失败', 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>订单管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索栏 */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-44"
            placeholder="订单号"
            value={filters.orderNo}
            onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
          />
          <Select
            className="w-36"
            options={ORDER_TYPE_OPTIONS}
            value={filters.orderType}
            onChange={(v) => setFilters({ ...filters, orderType: v })}
          />
          <Select
            className="w-36"
            options={ORDER_STATUS_OPTIONS}
            value={filters.orderStatus}
            onChange={(v) => setFilters({ ...filters, orderStatus: v })}
          />
          <Input
            className="w-40"
            type="date"
            placeholder="开始日期"
            value={filters.startTime}
            onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
          />
          <Input
            className="w-40"
            type="date"
            placeholder="结束日期"
            value={filters.endTime}
            onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
          />
          <Button size="sm" onClick={handleSearch}>
            <Search className="mr-1 h-4 w-4" />查询
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCcw className="mr-1 h-4 w-4" />重置
          </Button>
        </div>

        {/* 表格 */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单号</TableHead>
              <TableHead>用户ID</TableHead>
              <TableHead>订单类型</TableHead>
              <TableHead>套餐名称</TableHead>
              <TableHead>支付金额</TableHead>
              <TableHead>订单状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                  <TableCell>{row.userId}</TableCell>
                  <TableCell>{labelOf(row.orderType, ORDER_TYPE_LABELS)}</TableCell>
                  <TableCell>{row.packageName || '-'}</TableCell>
                  <TableCell>¥{(row.payAmount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{orderStatusBadge(row.orderStatus)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.createTime ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openDetail(row.id)}>
                      <Eye className="mr-1 h-4 w-4" />查看详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>

      {/* 订单详情弹窗 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>订单详情</DialogTitle>
          <DialogDescription>查看订单的详细信息</DialogDescription>
        </DialogHeader>
        {detail && (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">订单号</span>
                <span className="font-mono">{detail.orderNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">用户ID</span>
                <span>{detail.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">订单类型</span>
                <span>{labelOf(detail.orderType, ORDER_TYPE_LABELS)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">套餐名称</span>
                <span>{detail.packageName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">支付金额</span>
                <span className="font-medium">¥{(detail.payAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">订单状态</span>
                <span>{orderStatusBadge(detail.orderStatus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">支付成功时间</span>
                <span>{detail.successTime || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">过期时间</span>
                <span>{detail.expireTime || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">退款时间</span>
                <span>{detail.refundTime || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">退款原因</span>
                <span>{detail.refundReason || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">备注</span>
                <span>{detail.remark || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间</span>
                <span>{detail.createTime || '-'}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

// ==================== 流水管理 Tab ====================

function FlowsPanel() {
  const [list, setList] = useState<CoinFlow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    userId: '',
    flowType: '',
    bizScene: '',
    startTime: '',
    endTime: '',
  });
  const [query, setQuery] = useState(filters);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<CoinFlow>(
        await getFlowList({
          page,
          size: 10,
          userId: query.userId ? Number(query.userId) : undefined,
          flowType: query.flowType || undefined,
          bizScene: query.bizScene || undefined,
          startTime: query.startTime || undefined,
          endTime: query.endTime || undefined,
        }),
      );
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function handleSearch() {
    setPage(1);
    setQuery(filters);
  }

  function handleReset() {
    const empty = { userId: '', flowType: '', bizScene: '', startTime: '', endTime: '' };
    setFilters(empty);
    setPage(1);
    setQuery(empty);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>流水管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索栏 */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-32"
            type="number"
            placeholder="用户ID"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          />
          <Select
            className="w-32"
            options={FLOW_TYPE_OPTIONS}
            value={filters.flowType}
            onChange={(v) => setFilters({ ...filters, flowType: v })}
          />
          <Select
            className="w-36"
            options={BIZ_SCENE_OPTIONS}
            value={filters.bizScene}
            onChange={(v) => setFilters({ ...filters, bizScene: v })}
          />
          <Input
            className="w-40"
            type="date"
            placeholder="开始日期"
            value={filters.startTime}
            onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
          />
          <Input
            className="w-40"
            type="date"
            placeholder="结束日期"
            value={filters.endTime}
            onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
          />
          <Button size="sm" onClick={handleSearch}>
            <Search className="mr-1 h-4 w-4" />查询
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCcw className="mr-1 h-4 w-4" />重置
          </Button>
        </div>

        {/* 表格 */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>流水号</TableHead>
              <TableHead>用户ID</TableHead>
              <TableHead>流水类型</TableHead>
              <TableHead>变动数量</TableHead>
              <TableHead>变动后余额</TableHead>
              <TableHead>业务场景</TableHead>
              <TableHead>业务说明</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.flowNo}</TableCell>
                  <TableCell>{row.userId}</TableCell>
                  <TableCell>{flowTypeBadge(row.flowType)}</TableCell>
                  <TableCell
                    className={cn(
                      'font-medium',
                      (row.changeAmount ?? 0) >= 0 ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {(row.changeAmount ?? 0) >= 0 ? '+' : ''}
                    {row.changeAmount ?? 0}
                  </TableCell>
                  <TableCell>{row.balanceAfter ?? 0}</TableCell>
                  <TableCell>{labelOf(row.bizScene, BIZ_SCENE_LABELS)}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-muted-foreground">
                    {row.bizDesc || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.createTime ?? '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
    </Card>
  );
}

// ==================== 退款管理 Tab ====================

function RefundsPanel() {
  const [list, setList] = useState<RefundRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    orderNo: '',
    userId: '',
    startTime: '',
    endTime: '',
  });
  const [query, setQuery] = useState(filters);

  // 退款处理弹窗
  const [refundDialog, setRefundDialog] = useState<RefundRecord | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundSaving, setRefundSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<RefundRecord>(
        await getRefundList({
          page,
          size: 10,
          orderNo: query.orderNo || undefined,
          userId: query.userId ? Number(query.userId) : undefined,
          startTime: query.startTime || undefined,
          endTime: query.endTime || undefined,
        }),
      );
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function handleSearch() {
    setPage(1);
    setQuery(filters);
  }

  function handleReset() {
    const empty = { orderNo: '', userId: '', startTime: '', endTime: '' };
    setFilters(empty);
    setPage(1);
    setQuery(empty);
  }

  function openRefundDialog(row: RefundRecord) {
    setRefundDialog(row);
    setRefundReason('');
    setRefundAmount(String(row.payAmount ?? ''));
  }

  async function submitRefund() {
    if (!refundDialog) return;
    setRefundSaving(true);
    try {
      await processRefund(refundDialog.id, {
        refundReason: refundReason.trim(),
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
      });
      showToast('退款处理成功', 'success');
      setRefundDialog(null);
      setRefundReason('');
      setRefundAmount('');
      fetchList();
    } catch {
      // 错误已在 request 拦截器中处理
    } finally {
      setRefundSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>退款管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索栏 */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-44"
            placeholder="订单号"
            value={filters.orderNo}
            onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
          />
          <Input
            className="w-32"
            type="number"
            placeholder="用户ID"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          />
          <Input
            className="w-40"
            type="date"
            placeholder="开始日期"
            value={filters.startTime}
            onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
          />
          <Input
            className="w-40"
            type="date"
            placeholder="结束日期"
            value={filters.endTime}
            onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
          />
          <Button size="sm" onClick={handleSearch}>
            <Search className="mr-1 h-4 w-4" />查询
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCcw className="mr-1 h-4 w-4" />重置
          </Button>
        </div>

        {/* 表格 */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单号</TableHead>
              <TableHead>用户ID</TableHead>
              <TableHead>订单类型</TableHead>
              <TableHead>支付金额</TableHead>
              <TableHead>退款金额</TableHead>
              <TableHead>退款原因</TableHead>
              <TableHead>退款状态</TableHead>
              <TableHead>退款时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                  <TableCell>{row.userId}</TableCell>
                  <TableCell>{labelOf(row.orderType, ORDER_TYPE_LABELS)}</TableCell>
                  <TableCell>¥{(row.payAmount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>¥{(row.refundAmount ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{row.refundReason || '-'}</TableCell>
                  <TableCell>{refundStatusBadge(row.refundStatus)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.finishTime || row.applyTime || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={row.refundStatus !== 'pending'}
                      onClick={() => openRefundDialog(row)}
                    >
                      <RotateCcw className="mr-1 h-4 w-4" />
                      退款处理
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>

      {/* 退款处理弹窗 */}
      <Dialog open={!!refundDialog} onClose={() => setRefundDialog(null)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>退款处理</DialogTitle>
          <DialogDescription>确认退款后将按填写信息执行退款操作</DialogDescription>
        </DialogHeader>
        {refundDialog && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">订单号</span>
                <span className="font-mono">{refundDialog.orderNo}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-muted-foreground">用户ID</span>
                <span>{refundDialog.userId}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-muted-foreground">订单类型</span>
                <span>{labelOf(refundDialog.orderType, ORDER_TYPE_LABELS)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-muted-foreground">支付金额</span>
                <span>¥{(refundDialog.payAmount ?? 0).toFixed(2)}</span>
              </div>
            </div>
            <label className="space-y-1 text-sm font-medium">
              退款金额
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="请输入退款金额"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              退款原因
              <textarea
                className="min-h-[96px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="请输入退款原因"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundDialog(null)}>
                取消
              </Button>
              <Button
                onClick={submitRefund}
                disabled={refundSaving || !refundReason.trim()}
              >
                {refundSaving ? '提交中...' : '确认退款'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
