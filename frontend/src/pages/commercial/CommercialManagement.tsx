import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Banknote,
  Clock3,
  Download,
  Eye,
  FileClock,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import {
  exportCommercialFlows,
  exportCommercialOrders,
  exportCommercialReconcile,
  exportCommercialRefunds,
  getCommercialConfig,
  getCommercialFlowList,
  getCommercialOrderDetail,
  getCommercialOrderList,
  getCommercialReconcileDaily,
  getCommercialRefundDetail,
  getCommercialRefundList,
  refundCommercialOrder,
  saveCommercialConfig,
  type CoinFlow,
  type CoinSceneConfig,
  type CommercialConfig,
  type ReconcileDaily,
  type RefundRecord,
  type TradeOrder,
} from '@/api/commercial';
import { cn } from '@/lib/utils';

type WorkspaceKey = 'config' | 'orders' | 'flows' | 'refunds' | 'reconcile';

const WORKSPACES: { key: WorkspaceKey; title: string; path: string }[] = [
  { key: 'config', title: '商业化配置', path: '/commercial/config' },
  { key: 'orders', title: '商业化订单', path: '/commercial/orders' },
  { key: 'flows', title: '资产流水', path: '/commercial/flows' },
  { key: 'refunds', title: '退款记录', path: '/commercial/refunds' },
  { key: 'reconcile', title: '轻量对账', path: '/commercial/reconcile' },
];

const ORDER_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'vip', label: 'VIP' },
  { value: 'coin', label: '千寻币' },
];

const ORDER_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'unpaid', label: '待支付' },
  { value: 'success', label: '已支付' },
  { value: 'refunded', label: '已退款' },
  { value: 'closed', label: '已关闭' },
  { value: 'failed', label: '支付失败' },
];

const FLOW_TYPE_OPTIONS = [
  { value: '', label: '全部流水' },
  { value: 'recharge', label: '充值' },
  { value: 'consume', label: '消费' },
  { value: 'gift', label: '赠送' },
  { value: 'refund', label: '退款' },
];

const ORDER_TYPE_LABELS: Record<string, string> = {
  vip: 'VIP',
  coin: '千寻币',
};

const STATUS_LABELS: Record<string, string> = {
  unpaid: '待支付',
  success: '已支付',
  refunded: '已退款',
  refunding: '退款中',
  closed: '已关闭',
  failed: '支付失败',
  processing: '处理中',
};

function currentWorkspace(pathname: string): WorkspaceKey {
  return WORKSPACES.find((item) => pathname.startsWith(item.path))?.key ?? 'config';
}

function pageRecords<T>(res: unknown): T[] {
  return ((res as any).data?.records ?? []) as T[];
}

function pageTotal(res: unknown): number {
  return Number((res as any).data?.total ?? 0);
}

function responseData<T>(res: unknown, fallback: T): T {
  return ((res as any).data ?? fallback) as T;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value?: number) {
  return `¥${Number(value ?? 0).toFixed(2)}`;
}

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const variant =
    status === 'success' || status === 'ENABLED'
      ? 'success'
      : status === 'unpaid' || status === 'processing' || status === 'refunding'
        ? 'warning'
        : status === 'failed' || status === 'closed' || status === 'DISABLED'
          ? 'destructive'
          : 'secondary';
  return <Badge variant={variant as any}>{STATUS_LABELS[status] ?? status}</Badge>;
}

export default function CommercialManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = currentWorkspace(location.pathname);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        {WORKSPACES.map((item) => (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              active === item.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.title}
          </button>
        ))}
      </div>

      {active === 'config' && <ConfigWorkspace />}
      {active === 'orders' && <OrderWorkspace />}
      {active === 'flows' && <FlowWorkspace />}
      {active === 'refunds' && <RefundWorkspace />}
      {active === 'reconcile' && <ReconcileWorkspace />}
    </div>
  );
}

function ConfigWorkspace() {
  const [config, setConfig] = useState<CommercialConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCommercialConfig();
      setConfig(responseData<CommercialConfig>(res, null as any));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateScene(index: number, patch: Partial<CoinSceneConfig>) {
    if (!config) return;
    const next = [...config.coinScenes];
    next[index] = { ...next[index], ...patch };
    setConfig({ ...config, coinScenes: next });
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await saveCommercialConfig({ ...config, changeSummary: '后台商业化工作台保存' });
      setConfig(responseData<CommercialConfig>(res, config));
      showToast('商业化配置已保存', 'success');
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    if (!config) return { benefits: 0, vipPackages: 0, coinPackages: 0, scenes: 0 };
    return {
      benefits: config.vipBenefits.length,
      vipPackages: config.vipPackages.length,
      coinPackages: config.coinPackages.length,
      scenes: config.coinScenes.length,
    };
  }, [config]);

  if (loading && !config) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">加载中...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="权益" value={stats.benefits} icon={<Settings2 className="h-4 w-4" />} />
        <Metric title="VIP 套餐" value={stats.vipPackages} icon={<Banknote className="h-4 w-4" />} />
        <Metric title="千寻币套餐" value={stats.coinPackages} icon={<Banknote className="h-4 w-4" />} />
        <Metric title="消费场景" value={stats.scenes} icon={<Clock3 className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>商业化配置</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{config?.configVersion ?? 'COMM-INIT'}</Badge>
            <Button variant="outline" onClick={load}>
              <RefreshCcw className="mr-1 h-4 w-4" />
              刷新
            </Button>
            <Button onClick={save} disabled={saving || !config}>
              <Save className="mr-1 h-4 w-4" />
              保存
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <ConfigTable
            title="VIP 权益"
            columns={['权益', '图标', '数值', '固定权益', '状态']}
            rows={(config?.vipBenefits ?? []).map((item) => [
              item.benefitName,
              item.mobileIcon || '-',
              item.benefitValue ?? '-',
              item.fixedFlag ? '是' : '否',
              statusBadge(item.status),
            ])}
          />
          <ConfigTable
            title="VIP 套餐"
            columns={['套餐', '订阅', '售价', '微信商品', '状态']}
            rows={(config?.vipPackages ?? []).map((item) => [
              item.packageName,
              item.subscriptionType || item.packageType,
              money(item.price),
              item.wechatProductId || '预留',
              statusBadge(item.status),
            ])}
          />
          <ConfigTable
            title="千寻币套餐"
            columns={['套餐', '币数', '售价', '移动标签', '状态']}
            rows={(config?.coinPackages ?? []).map((item) => [
              item.packageName,
              `${item.coinCount}+${item.bonusCoinCount ?? 0}`,
              money(item.amount),
              item.mobileTag || item.packageTag || '-',
              statusBadge(item.status),
            ])}
          />
          <div className="space-y-2">
            <div className="text-sm font-medium">千寻币消费场景</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>场景</TableHead>
                  <TableHead>图标</TableHead>
                  <TableHead>说明</TableHead>
                  <TableHead>单价</TableHead>
                  <TableHead>保留期</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(config?.coinScenes ?? []).map((scene, index) => (
                  <TableRow key={scene.sceneCode}>
                    <TableCell className="font-medium">{scene.mobileName}</TableCell>
                    <TableCell>{scene.mobileIcon || '-'}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">{scene.sceneDesc}</TableCell>
                    <TableCell>
                      <Input
                        className="w-20"
                        value={String(scene.unitPrice ?? 0)}
                        onChange={(e) => updateScene(index, { unitPrice: Number(e.target.value || 0) })}
                      />
                    </TableCell>
                    <TableCell>{scene.retentionDays ? `${scene.retentionDays} 天` : '永久'}</TableCell>
                    <TableCell>{statusBadge(scene.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ConfigTable
            title="配置变更日志"
            columns={['版本', '摘要', '操作人', '时间']}
            rows={(config?.latestLogs ?? []).map((item) => [
              item.configVersion,
              item.changeSummary,
              item.operatorName || '-',
              item.createTime || '-',
            ])}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function OrderWorkspace() {
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ orderNo: '', orderType: '', orderStatus: '' });
  const [selected, setSelected] = useState<TradeOrder | null>(null);
  const [refundReason, setRefundReason] = useState('运营后台人工退款');

  const load = useCallback(async () => {
    const res = await getCommercialOrderList({ page: 1, size: 20, ...filters });
    setOrders(pageRecords<TradeOrder>(res));
    setTotal(pageTotal(res));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(row: TradeOrder) {
    const res = await getCommercialOrderDetail(row.id);
    setSelected(responseData<TradeOrder>(res, row));
  }

  async function refund(row: TradeOrder) {
    await refundCommercialOrder(row.id, { reason: refundReason, refundAmount: row.payAmount });
    showToast('退款已提交并完成模拟回退', 'success');
    setSelected(null);
    load();
  }

  async function exportData() {
    const res = await exportCommercialOrders();
    showToast(responseData<any>(res, {}).message || '订单导出任务已创建', 'success');
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>商业化订单</CardTitle>
        <Button variant="outline" onClick={exportData}>
          <Download className="mr-1 h-4 w-4" />
          导出
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
          <Input placeholder="订单编号" value={filters.orderNo} onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })} />
          <Select options={ORDER_TYPE_OPTIONS} value={filters.orderType} onChange={(value) => setFilters({ ...filters, orderType: value })} />
          <Select options={ORDER_STATUS_OPTIONS} value={filters.orderStatus} onChange={(value) => setFilters({ ...filters, orderStatus: value })} />
          <Button onClick={load}>
            <Search className="mr-1 h-4 w-4" />
            查询
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单号</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>套餐</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>支付渠道</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                <TableCell>{row.userId}</TableCell>
                <TableCell>{ORDER_TYPE_LABELS[row.orderType] ?? row.orderType}</TableCell>
                <TableCell>{row.packageName || '-'}</TableCell>
                <TableCell>{money(row.payAmount)}</TableCell>
                <TableCell>{row.payChannel || 'mock'}</TableCell>
                <TableCell>{statusBadge(row.orderStatus)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openDetail(row)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="text-sm text-muted-foreground">共 {total} 条订单</div>
      </CardContent>

      <Dialog open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>订单详情</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <Info label="订单号" value={selected.orderNo} />
              <Info label="用户 ID" value={selected.userId} />
              <Info label="订单类型" value={ORDER_TYPE_LABELS[selected.orderType] ?? selected.orderType} />
              <Info label="支付金额" value={money(selected.payAmount)} />
              <Info label="支付渠道" value={selected.payChannel || 'mock'} />
              <Info label="渠道单号" value={selected.channelTradeNo || '真实支付预留'} />
            </div>
            <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>关闭</Button>
              <Button disabled={selected.orderStatus !== 'success'} onClick={() => refund(selected)}>
                <RotateCcw className="mr-1 h-4 w-4" />
                退款
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

function FlowWorkspace() {
  const [flows, setFlows] = useState<CoinFlow[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ userId: '', flowType: '', bizScene: '' });

  const load = useCallback(async () => {
    const res = await getCommercialFlowList({
      page: 1,
      size: 20,
      userId: filters.userId || undefined,
      flowType: filters.flowType,
      bizScene: filters.bizScene,
    });
    setFlows(pageRecords<CoinFlow>(res));
    setTotal(pageTotal(res));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function exportData() {
    const res = await exportCommercialFlows();
    showToast(responseData<any>(res, {}).message || '流水导出任务已创建', 'success');
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>资产流水</CardTitle>
        <Button variant="outline" onClick={exportData}>
          <Download className="mr-1 h-4 w-4" />
          导出
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[180px_160px_1fr_auto]">
          <Input placeholder="用户 ID" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} />
          <Select options={FLOW_TYPE_OPTIONS} value={filters.flowType} onChange={(value) => setFilters({ ...filters, flowType: value })} />
          <Input placeholder="业务场景" value={filters.bizScene} onChange={(e) => setFilters({ ...filters, bizScene: e.target.value })} />
          <Button onClick={load}>
            <Search className="mr-1 h-4 w-4" />
            查询
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>流水号</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>变动</TableHead>
              <TableHead>变动前</TableHead>
              <TableHead>变动后</TableHead>
              <TableHead>场景</TableHead>
              <TableHead>关联业务</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.flowNo}</TableCell>
                <TableCell>{row.userId}</TableCell>
                <TableCell>{statusBadge(row.flowType)}</TableCell>
                <TableCell className={row.changeAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{row.changeAmount}</TableCell>
                <TableCell>{row.balanceBefore ?? '-'}</TableCell>
                <TableCell>{row.balanceAfter}</TableCell>
                <TableCell>{row.bizScene || '-'}</TableCell>
                <TableCell>{row.refType || '-'} #{row.refId ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="text-sm text-muted-foreground">共 {total} 条流水</div>
      </CardContent>
    </Card>
  );
}

function RefundWorkspace() {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [orderNo, setOrderNo] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await getCommercialRefundList({ page: 1, size: 20, orderNo });
    setRefunds(pageRecords<RefundRecord>(res));
    setTotal(pageTotal(res));
  }, [orderNo]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(row: RefundRecord) {
    const res = await getCommercialRefundDetail(row.id);
    setDetail(responseData<any>(res, { refund: row }));
  }

  async function exportData() {
    const res = await exportCommercialRefunds();
    showToast(responseData<any>(res, {}).message || '退款导出任务已创建', 'success');
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>退款记录</CardTitle>
        <Button variant="outline" onClick={exportData}>
          <Download className="mr-1 h-4 w-4" />
          导出
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input placeholder="订单编号" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
          <Button onClick={load}>
            <Search className="mr-1 h-4 w-4" />
            查询
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>退款单</TableHead>
              <TableHead>订单号</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>原因</TableHead>
              <TableHead>资产回退</TableHead>
              <TableHead>渠道状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.refundNo}</TableCell>
                <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                <TableCell>{row.userId}</TableCell>
                <TableCell>{money(row.refundAmount)}</TableCell>
                <TableCell className="max-w-[180px] truncate">{row.refundReason || '-'}</TableCell>
                <TableCell>{row.assetRollbackAction || '-'}</TableCell>
                <TableCell>{statusBadge(row.channelRefundStatus || row.refundStatus)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openDetail(row)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="text-sm text-muted-foreground">共 {total} 条退款</div>
      </CardContent>
      <Dialog open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>退款详情</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <Info label="退款单" value={detail.refund?.refundNo} />
              <Info label="订单号" value={detail.refund?.orderNo} />
              <Info label="退款金额" value={money(detail.refund?.refundAmount)} />
              <Info label="退款状态" value={detail.refund?.refundStatus} />
              <Info label="资产回退" value={detail.assetRollbackDesc || '-'} />
              <Info label="渠道状态" value={detail.refund?.channelRefundStatus || 'mock_success'} />
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

function ReconcileWorkspace() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState<ReconcileDaily | null>(null);

  const load = useCallback(async () => {
    const res = await getCommercialReconcileDaily(date);
    setData(responseData<ReconcileDaily>(res, null as any));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function exportData() {
    const res = await exportCommercialReconcile();
    showToast(responseData<any>(res, {}).message || '对账导出任务已创建', 'success');
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="成功订单" value={data?.successOrderCount ?? 0} icon={<FileClock className="h-4 w-4" />} />
        <Metric title="订单金额" value={money(data?.orderAmount)} icon={<Banknote className="h-4 w-4" />} />
        <Metric title="退款金额" value={money(data?.refundAmount)} icon={<RotateCcw className="h-4 w-4" />} />
        <Metric title="净收入" value={money(data?.netAmount)} icon={<Banknote className="h-4 w-4" />} />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>轻量对账</CardTitle>
          <div className="flex items-center gap-2">
            <Input className="w-44" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button onClick={load}>查询</Button>
            <Button variant="outline" onClick={exportData}>
              <Download className="mr-1 h-4 w-4" />
              导出
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>VIP 订单</TableHead>
                <TableHead>千寻币订单</TableHead>
                <TableHead>退款订单</TableHead>
                <TableHead>订单金额</TableHead>
                <TableHead>退款金额</TableHead>
                <TableHead>净收入</TableHead>
                <TableHead>退款率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data && (
                <TableRow>
                  <TableCell>{data.date}</TableCell>
                  <TableCell>{data.vipOrderCount}</TableCell>
                  <TableCell>{data.coinOrderCount}</TableCell>
                  <TableCell>{data.refundOrderCount}</TableCell>
                  <TableCell>{money(data.orderAmount)}</TableCell>
                  <TableCell>{money(data.refundAmount)}</TableCell>
                  <TableCell>{money(data.netAmount)}</TableCell>
                  <TableCell>{`${Number((data.refundRate ?? 0) * 100).toFixed(2)}%`}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-1 text-xl font-semibold">{value}</div>
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ConfigTable({ title, columns, rows }: { title: string; columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${title}-${index}`}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{value ?? '-'}</div>
    </div>
  );
}
