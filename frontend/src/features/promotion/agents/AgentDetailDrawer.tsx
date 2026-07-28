import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, RefreshCcw } from 'lucide-react';
import { getPromotionAgentDetail } from '@/api/promotion';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  formatDateTime,
  formatMonthPeriod,
  getErrorMessage,
  PromotionStatusBadge,
} from '@/features/promotion/shared/promotionUi';
import { usePermission } from '@/hooks/usePermission';
import type { PromotionAgentDetail } from '@/types/promotion';

function money(value?: number) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

export function AgentDetailDrawer({
  agentNo,
  onClose,
}: {
  agentNo: string | null;
  onClose: () => void;
}) {
  const { hasPermission } = usePermission();
  const [detail, setDetail] = useState<PromotionAgentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!agentNo) return;
    setLoading(true);
    setError('');
    try {
      const response = await getPromotionAgentDetail(agentNo);
      setDetail(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [agentNo]);

  useEffect(() => {
    setDetail(null);
    if (agentNo) void fetchDetail();
  }, [agentNo, fetchDetail]);

  return (
    <Drawer
      open={Boolean(agentNo)}
      onClose={onClose}
      title="校园代理详情"
      description={detail ? `${detail.agentName} · ${detail.agentNo}` : agentNo || undefined}
      className="w-[860px]"
      footer={<div className="flex justify-end"><Button variant="outline" onClick={onClose}>关闭</Button></div>}
    >
      {loading ? (
        <div className="grid h-64 place-items-center text-sm text-muted-foreground">
          <div className="text-center"><LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />正在加载代理详情…</div>
        </div>
      ) : error ? (
        <div className="grid h-64 place-items-center text-center">
          <div>
            <p className="font-medium">详情加载失败</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => void fetchDetail()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              重试
            </Button>
          </div>
        </div>
      ) : detail ? (
        <div className="space-y-5">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="扫码/点击数" value={detail.scanClickCount.toLocaleString('zh-CN')} />
            <Metric label="累计注册数" value={detail.registerCount.toLocaleString('zh-CN')} />
            <Metric label="累计应发奖金" value={money(detail.payableBonus)} />
            <Metric label="累计待结算奖金" value={money(detail.pendingBonus)} />
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="font-semibold">代理资料</h3>
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <DetailItem label="代理编号" value={detail.agentNo} />
              <DetailItem label="代理名称" value={detail.agentName} />
              <DetailItem label="学校/校区" value={`${detail.school} / ${detail.campus}`} />
              <DetailItem
                label="联系电话"
                value={hasPermission('promotion:agent:sensitive') && detail.contactPhone
                  ? detail.contactPhone
                  : detail.contactPhoneMasked || '—'}
              />
              <DetailItem label="创建时间" value={formatDateTime(detail.createdAt)} />
              <DetailItem label="累计已发奖金" value={money(detail.paidBonus)} />
            </dl>
          </section>

          <section className="overflow-hidden rounded-lg border">
            <div className="border-b px-4 py-3"><h3 className="font-semibold">奖金明细</h3></div>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 px-3 text-xs">奖金明细订单号</TableHead>
                  <TableHead className="h-11 px-3 text-xs">奖金事件类型</TableHead>
                  <TableHead className="h-11 px-3 text-xs">对应用户</TableHead>
                  <TableHead className="h-11 px-3 text-xs">奖金金额</TableHead>
                  <TableHead className="h-11 px-3 text-xs">生成时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.bonusRecords.length ? detail.bonusRecords.map((item) => (
                  <TableRow key={item.bonusNo}>
                    <TableCell className="h-12 px-3 text-xs">{item.bonusNo}</TableCell>
                    <TableCell className="h-12 px-3 text-xs">{item.eventLabel}</TableCell>
                    <TableCell className="h-12 px-3 text-xs">{item.inviteeDisplayName}</TableCell>
                    <TableCell className="h-12 px-3 text-xs font-medium">{money(item.bonusAmount)}</TableCell>
                    <TableCell className="h-12 px-3 text-xs">{formatDateTime(item.occurredAt)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">暂无奖金明细</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <section className="overflow-hidden rounded-lg border">
            <div className="border-b px-4 py-3"><h3 className="font-semibold">结算记录</h3></div>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 px-3 text-xs">结算单号</TableHead>
                  <TableHead className="h-11 px-3 text-xs">结算周期</TableHead>
                  <TableHead className="h-11 px-3 text-xs">结算金额</TableHead>
                  <TableHead className="h-11 px-3 text-xs">结算状态</TableHead>
                  <TableHead className="h-11 px-3 text-xs">结算时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.settlementRecords.length ? detail.settlementRecords.map((item) => (
                  <TableRow key={item.settlementNo}>
                    <TableCell className="h-12 px-3 text-xs">{item.settlementNo}</TableCell>
                    <TableCell className="h-12 px-3 text-xs">
                      {item.periodStart && item.periodEnd
                        ? `${item.periodStart} 至 ${item.periodEnd}`
                        : formatMonthPeriod(item.periodStart)}
                    </TableCell>
                    <TableCell className="h-12 px-3 text-xs font-medium">{money(item.amount)}</TableCell>
                    <TableCell className="h-12 px-3"><PromotionStatusBadge status={item.status} /></TableCell>
                    <TableCell className="h-12 px-3 text-xs">{formatDateTime(item.confirmedAt)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">暂无结算记录</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-base">{value}</strong>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
