import { useCallback, useEffect, useState } from 'react';
import { Copy, LoaderCircle, RefreshCcw } from 'lucide-react';
import { getPromotionRelationDetail } from '@/api/promotion';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import {
  formatDateTime,
  formatPromotionAmount,
  getErrorMessage,
  PromotionStatusBadge,
  sourceTypeLabel,
} from '@/features/promotion/shared/promotionUi';
import type { PromotionRelationDetail } from '@/types/promotion';

export function RelationDetailDrawer({
  relationNo,
  onClose,
}: {
  relationNo: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<PromotionRelationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!relationNo) return;
    setLoading(true);
    setError('');
    try {
      const response = await getPromotionRelationDetail(relationNo);
      setDetail(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [relationNo]);

  useEffect(() => {
    setDetail(null);
    if (relationNo) void fetchDetail();
  }, [fetchDetail, relationNo]);

  const copyRelationNo = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.relationNo);
      showToast('关系编号已复制', 'success');
    } catch {
      showToast(`复制失败，请手动复制：${detail.relationNo}`, 'error');
    }
  };

  return (
    <Drawer
      open={Boolean(relationNo)}
      onClose={onClose}
      title="邀请关系详情"
      description={relationNo || undefined}
      footer={<div className="flex justify-end"><Button variant="outline" onClick={onClose}>关闭</Button></div>}
    >
      {loading ? (
        <div className="grid h-64 place-items-center text-sm text-muted-foreground">
          <div className="text-center"><LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />正在加载关系详情…</div>
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
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryItem label="关系类型" value={`${sourceTypeLabel(detail.sourceType)}邀请`} />
            <SummaryItem
              label="当前已发放奖励"
              value={formatPromotionAmount(detail.paidRewardTotal, detail.sourceType)}
            />
            <div className="rounded-lg border bg-muted/40 p-3">
              <span className="text-xs text-muted-foreground">关系编号</span>
              <div className="mt-1 flex items-center gap-2">
                <strong className="truncate text-sm">{detail.relationNo}</strong>
                <button type="button" aria-label="复制关系编号" onClick={() => void copyRelationNo()}>
                  <Copy className="h-3.5 w-3.5 text-primary" />
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="font-semibold">关系信息</h3>
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <DetailItem label="来源对象" value={`${detail.sourceObjectName} · ${detail.sourceObjectNo}`} />
              <DetailItem
                label="被邀请用户"
                value={`${detail.inviteeNickname} · ${detail.inviteeUserNo}${detail.inviteeMobileMasked ? ` · ${detail.inviteeMobileMasked}` : ''}`}
              />
              <DetailItem label="绑定时间" value={formatDateTime(detail.registeredAt)} />
              <DetailItem label="关系说明" value="完成注册建立，永久有效" />
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="font-semibold">事件时间线</h3>
            <ol className="mt-4 space-y-3">
              <li className="relative border-l-2 border-blue-200 pl-5">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-blue-200 bg-primary" />
                <p className="text-sm font-medium">完成注册并建立邀请关系</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(detail.registeredAt)}</p>
              </li>
              {detail.rewardItems.map((item) => (
                <li key={item.rewardNo} className="relative border-l-2 border-blue-200 pl-5">
                  <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-blue-200 bg-primary" />
                  <p className="text-sm font-medium">{item.eventLabel}进入奖励流程</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="overflow-hidden rounded-lg border">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold">奖励记录</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 px-3 text-xs">奖励单号</TableHead>
                  <TableHead className="h-11 px-3 text-xs">事件</TableHead>
                  <TableHead className="h-11 px-3 text-xs">金额</TableHead>
                  <TableHead className="h-11 px-3 text-xs">状态</TableHead>
                  <TableHead className="h-11 px-3 text-xs">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.rewardItems.length ? detail.rewardItems.map((item) => (
                  <TableRow key={item.rewardNo}>
                    <TableCell className="h-12 px-3 text-xs">{item.rewardNo}</TableCell>
                    <TableCell className="h-12 px-3 text-xs">{item.eventLabel}</TableCell>
                    <TableCell className="h-12 px-3 text-xs font-medium">
                      {formatPromotionAmount(item.amount, detail.sourceType)}
                    </TableCell>
                    <TableCell className="h-12 px-3"><PromotionStatusBadge status={item.status} /></TableCell>
                    <TableCell className="h-12 px-3 text-xs">{formatDateTime(item.paidAt || item.createdAt)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">暂无奖励记录</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-sm">{value}</strong>
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
