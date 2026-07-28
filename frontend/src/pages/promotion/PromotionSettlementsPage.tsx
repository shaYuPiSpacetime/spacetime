import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Download } from 'lucide-react';
import {
  confirmPromotionSettlement,
  exportPromotionSettlements,
  getPromotionSettlements,
} from '@/api/promotion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import { AgentDetailDrawer } from '@/features/promotion/agents/AgentDetailDrawer';
import {
  ConfirmActionDialog,
  formatDateTime,
  getErrorMessage,
  PromotionField,
  PromotionFilterPanel,
  PromotionPageHeader,
  PromotionPagination,
  PromotionStatusBadge,
  PromotionTableState,
} from '@/features/promotion/shared/promotionUi';
import { usePromotionExport } from '@/features/promotion/shared/usePromotionExport';
import { SettlementConfirmDialog } from '@/features/promotion/settlements/SettlementConfirmDialog';
import { usePermission } from '@/hooks/usePermission';
import type {
  PromotionSettlementListItem,
  PromotionSettlementQuery,
  PromotionSettlementStatus,
} from '@/types/promotion';

const EMPTY_FILTERS = {
  settlementNo: '',
  agentKeyword: '',
  periodMonth: '',
  status: '',
};

type SettlementFilters = typeof EMPTY_FILTERS;

function toQuery(filters: SettlementFilters, page: number, size: number): PromotionSettlementQuery {
  return {
    page,
    size,
    settlementNo: filters.settlementNo || undefined,
    agentKeyword: filters.agentKeyword || undefined,
    periodMonth: filters.periodMonth || undefined,
    status: (filters.status || undefined) as PromotionSettlementStatus | undefined,
  };
}

function money(value?: number) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

export default function PromotionSettlementsPage() {
  const { hasPermission } = usePermission();
  const [draftFilters, setDraftFilters] = useState<SettlementFilters>({ ...EMPTY_FILTERS });
  const [filters, setFilters] = useState<SettlementFilters>({ ...EMPTY_FILTERS });
  const [rows, setRows] = useState<PromotionSettlementListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmingRow, setConfirmingRow] = useState<PromotionSettlementListItem | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [detailNo, setDetailNo] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const { exporting, startExport } = usePromotionExport();

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPromotionSettlements(toQuery(filters, page, pageSize));
      setRows(response.data.records || []);
      setTotal(Number(response.data.total || 0));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const confirmSettlement = async () => {
    if (!confirmingRow) return;
    setConfirming(true);
    try {
      await confirmPromotionSettlement(confirmingRow.settlementNo);
      setConfirmingRow(null);
      showToast('结算已确定，代理累计已发奖金将同步刷新', 'success');
      await fetchList();
    } catch {
      // 保持原状态和弹窗，便于重试。
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <PromotionPageHeader
        title="代理结算管理"
        description="系统按北京时间自然月自动生成结算单；页面只负责查询、导出和确定金额。"
        actions={hasPermission('promotion:settlement:export') && (
          <Button variant="outline" onClick={() => setExportOpen(true)} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? '导出处理中' : '导出结算单'}
          </Button>
        )}
      />

      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <CalendarClock className="h-5 w-5 shrink-0 text-blue-600" />
        <strong>系统于每月1日 01:00（Asia/Shanghai）自动生成上一个自然月结算单，同一代理同一月份仅一张。</strong>
      </div>

      <PromotionFilterPanel
        loading={loading}
        onSearch={() => {
          setPage(1);
          setFilters({ ...draftFilters });
        }}
        onReset={() => {
          setPage(1);
          setDraftFilters({ ...EMPTY_FILTERS });
          setFilters({ ...EMPTY_FILTERS });
        }}
      >
        <PromotionField label="结算单号">
          <Input
            placeholder="结算单号"
            value={draftFilters.settlementNo}
            onChange={(event) => setDraftFilters((current) => ({ ...current, settlementNo: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="代理">
          <Input
            placeholder="代理编号 / 名称"
            value={draftFilters.agentKeyword}
            onChange={(event) => setDraftFilters((current) => ({ ...current, agentKeyword: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="结算月份">
          <Input
            type="month"
            value={draftFilters.periodMonth}
            onChange={(event) => setDraftFilters((current) => ({ ...current, periodMonth: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="结算状态">
          <select
            aria-label="结算状态"
            className="h-9 rounded-md border bg-card px-3 text-sm"
            value={draftFilters.status}
            onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">全部状态</option>
            <option value="pending_confirm">待确定</option>
            <option value="confirmed">已确定</option>
          </select>
        </PromotionField>
      </PromotionFilterPanel>

      <Card className="min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">结算单</h2>
          <span className="text-xs text-muted-foreground">共 {total} 条</span>
        </div>
        <Table className="min-w-[1240px]">
          <TableHeader>
            <TableRow>
              <TableHead>结算单号</TableHead>
              <TableHead>代理</TableHead>
              <TableHead>学校/校区</TableHead>
              <TableHead>结算周期</TableHead>
              <TableHead>结算金额</TableHead>
              <TableHead>生成时间</TableHead>
              <TableHead>结算状态</TableHead>
              <TableHead>结算时间</TableHead>
              <TableHead className="w-28">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <PromotionTableState
              loading={loading}
              error={error}
              empty={!rows.length}
              colSpan={9}
              onRetry={() => void fetchList()}
              emptyText="没有符合条件的结算单"
            />
            {!loading && !error && rows.map((row) => (
              <TableRow key={row.settlementNo}>
                <TableCell className="font-medium">{row.settlementNo}</TableCell>
                <TableCell>
                  <button type="button" className="text-left text-primary hover:underline" onClick={() => setDetailNo(row.agentNo)}>
                    <span className="block font-medium">{row.agentName}</span>
                    <span className="text-xs">{row.agentNo}</span>
                  </button>
                </TableCell>
                <TableCell>{row.school} / {row.campus}</TableCell>
                <TableCell className="whitespace-nowrap">{row.periodStart} 至 {row.periodEnd}</TableCell>
                <TableCell className="font-medium">{money(row.amount)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDateTime(row.generatedAt)}</TableCell>
                <TableCell><PromotionStatusBadge status={row.status} /></TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(row.confirmedAt)}
                  {row.confirmedByName && <span className="block text-xs text-muted-foreground">{row.confirmedByName}</span>}
                </TableCell>
                <TableCell>
                  {row.status === 'pending_confirm' && hasPermission('promotion:settlement:confirm')
                    ? <Button size="sm" variant="outline" onClick={() => setConfirmingRow(row)}>确定结算</Button>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PromotionPagination
          current={page}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPage(1);
            setPageSize(size);
          }}
        />
      </Card>

      <SettlementConfirmDialog
        settlement={confirmingRow}
        loading={confirming}
        onClose={() => setConfirmingRow(null)}
        onConfirm={() => void confirmSettlement()}
      />
      <AgentDetailDrawer agentNo={detailNo} onClose={() => setDetailNo(null)} />
      <ConfirmActionDialog
        open={exportOpen}
        title="确认导出代理结算？"
        description="将按当前筛选条件创建异步导出任务；导出内容只有待确定、已确定两种状态，不含打款字段。"
        confirmText="创建导出任务"
        loading={exporting}
        onCancel={() => setExportOpen(false)}
        onConfirm={() => {
          const { page: ignoredPage, size: ignoredSize, ...query } = toQuery(filters, 1, 20);
          void ignoredPage;
          void ignoredSize;
          setExportOpen(false);
          void startExport(() => exportPromotionSettlements(query));
        }}
      />
    </div>
  );
}
