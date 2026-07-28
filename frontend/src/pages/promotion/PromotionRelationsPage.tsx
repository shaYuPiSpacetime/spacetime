import { useCallback, useEffect, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { exportPromotionRelations, getPromotionRelations } from '@/api/promotion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RelationDetailDrawer } from '@/features/promotion/relations/RelationDetailDrawer';
import {
  ConfirmActionDialog,
  formatDateTime,
  formatPromotionAmount,
  getErrorMessage,
  PromotionField,
  PromotionFilterPanel,
  PromotionPageHeader,
  PromotionPagination,
  PromotionTableState,
  sourceTypeLabel,
} from '@/features/promotion/shared/promotionUi';
import { usePromotionExport } from '@/features/promotion/shared/usePromotionExport';
import { usePermission } from '@/hooks/usePermission';
import type { PromotionRelationListItem, PromotionRelationQuery, PromotionSourceType } from '@/types/promotion';

const EMPTY_FILTERS = {
  relationNo: '',
  sourceKeyword: '',
  inviteeKeyword: '',
  sourceType: '',
  registeredStartDate: '',
  registeredEndDate: '',
};

type RelationFilters = typeof EMPTY_FILTERS;

function toQuery(filters: RelationFilters, page: number, size: number): PromotionRelationQuery {
  return {
    page,
    size,
    relationNo: filters.relationNo || undefined,
    sourceKeyword: filters.sourceKeyword || undefined,
    inviteeKeyword: filters.inviteeKeyword || undefined,
    sourceType: (filters.sourceType || undefined) as PromotionSourceType | undefined,
    registeredStartTime: filters.registeredStartDate ? `${filters.registeredStartDate}T00:00:00` : undefined,
    registeredEndTime: filters.registeredEndDate ? `${filters.registeredEndDate}T23:59:59` : undefined,
  };
}

export default function PromotionRelationsPage() {
  const { hasPermission } = usePermission();
  const [draftFilters, setDraftFilters] = useState<RelationFilters>({ ...EMPTY_FILTERS });
  const [filters, setFilters] = useState<RelationFilters>({ ...EMPTY_FILTERS });
  const [rows, setRows] = useState<PromotionRelationListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailNo, setDetailNo] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const { exporting, startExport } = usePromotionExport();

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPromotionRelations(toQuery(filters, page, pageSize));
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

  return (
    <div className="min-w-0 space-y-4">
      <PromotionPageHeader
        title="邀请关系"
        description="只展示已完成注册并成功建立的永久关系，不存在冻结、失效或人工变更状态。"
        actions={hasPermission('promotion:relation:export') && (
          <Button variant="outline" onClick={() => setExportOpen(true)} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? '导出处理中' : '导出当前结果'}
          </Button>
        )}
      />

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
        <PromotionField label="关系编号">
          <Input
            placeholder="关系编号"
            value={draftFilters.relationNo}
            onChange={(event) => setDraftFilters((current) => ({ ...current, relationNo: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="来源对象">
          <Input
            placeholder="用户 / 代理编号或名称"
            value={draftFilters.sourceKeyword}
            onChange={(event) => setDraftFilters((current) => ({ ...current, sourceKeyword: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="被邀请用户">
          <Input
            placeholder="昵称 / 手机号 / 用户编号"
            value={draftFilters.inviteeKeyword}
            onChange={(event) => setDraftFilters((current) => ({ ...current, inviteeKeyword: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="来源类型">
          <select
            className="h-9 rounded-md border bg-card px-3 text-sm"
            value={draftFilters.sourceType}
            onChange={(event) => setDraftFilters((current) => ({ ...current, sourceType: event.target.value }))}
          >
            <option value="">全部来源</option>
            <option value="normal_user">普通用户</option>
            <option value="campus_agent">校园代理</option>
          </select>
        </PromotionField>
        <PromotionField label="绑定开始日期">
          <Input
            type="date"
            value={draftFilters.registeredStartDate}
            onChange={(event) => setDraftFilters((current) => ({ ...current, registeredStartDate: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="绑定结束日期">
          <Input
            type="date"
            value={draftFilters.registeredEndDate}
            onChange={(event) => setDraftFilters((current) => ({ ...current, registeredEndDate: event.target.value }))}
          />
        </PromotionField>
      </PromotionFilterPanel>

      <Card className="min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">关系记录</h2>
          <span className="text-xs text-muted-foreground">共 {total} 条</span>
        </div>
        <Table className="min-w-[1020px]">
          <TableHeader>
            <TableRow>
              <TableHead>关系编号</TableHead>
              <TableHead>来源对象</TableHead>
              <TableHead>被邀请用户</TableHead>
              <TableHead>来源类型</TableHead>
              <TableHead>绑定时间</TableHead>
              <TableHead>当前已发放奖励</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <PromotionTableState
              loading={loading}
              error={error}
              empty={!rows.length}
              colSpan={7}
              onRetry={() => void fetchList()}
              emptyText="没有符合条件的邀请关系"
            />
            {!loading && !error && rows.map((row) => (
              <TableRow key={row.relationNo}>
                <TableCell className="font-medium">{row.relationNo}</TableCell>
                <TableCell>
                  <span className="block font-medium">{row.sourceObjectName}</span>
                  <span className="text-xs text-muted-foreground">{row.sourceObjectNo}</span>
                </TableCell>
                <TableCell>
                  <span className="block">{row.inviteeNickname}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.inviteeUserNo}{row.inviteeMobileMasked ? ` · ${row.inviteeMobileMasked}` : ''}
                  </span>
                </TableCell>
                <TableCell>{sourceTypeLabel(row.sourceType)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDateTime(row.registeredAt)}</TableCell>
                <TableCell className="font-medium">{formatPromotionAmount(row.paidRewardTotal, row.sourceType)}</TableCell>
                <TableCell>
                  <Button variant="link" className="h-auto px-0" onClick={() => setDetailNo(row.relationNo)}>
                    <Eye className="mr-1 h-4 w-4" />
                    查看详情
                  </Button>
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

      <RelationDetailDrawer relationNo={detailNo} onClose={() => setDetailNo(null)} />
      <ConfirmActionDialog
        open={exportOpen}
        title="确认导出邀请关系？"
        description="将按当前筛选条件创建异步导出任务，导出数据遵循现有脱敏权限。"
        confirmText="创建导出任务"
        loading={exporting}
        onCancel={() => setExportOpen(false)}
        onConfirm={() => {
          const { page: ignoredPage, size: ignoredSize, ...query } = toQuery(filters, 1, 20);
          void ignoredPage;
          void ignoredSize;
          setExportOpen(false);
          void startExport(() => exportPromotionRelations(query));
        }}
      />
    </div>
  );
}
