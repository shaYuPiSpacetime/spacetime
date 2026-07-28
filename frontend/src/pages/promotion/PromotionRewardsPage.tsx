import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, RefreshCcw } from 'lucide-react';
import {
  exportPromotionRewards,
  getCurrentPromotionRule,
  getPromotionRewards,
  retryPromotionReward,
} from '@/api/promotion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import { RelationDetailDrawer } from '@/features/promotion/relations/RelationDetailDrawer';
import { RewardRetryDialog } from '@/features/promotion/rewards/RewardRetryDialog';
import {
  ConfirmActionDialog,
  formatDateTime,
  formatPromotionAmount,
  getErrorMessage,
  PromotionField,
  PromotionFilterPanel,
  PromotionPageHeader,
  PromotionPagination,
  PromotionStatusBadge,
  PromotionTableState,
} from '@/features/promotion/shared/promotionUi';
import { usePromotionExport } from '@/features/promotion/shared/usePromotionExport';
import { usePermission } from '@/hooks/usePermission';
import type {
  PromotionEventType,
  PromotionRewardListItem,
  PromotionRewardQuery,
  PromotionRewardStatus,
  PromotionSourceType,
} from '@/types/promotion';

const BASE_EVENT_OPTIONS: { value: PromotionEventType; label: string }[] = [
  { value: 'register_reward', label: '完成注册' },
  { value: 'profile_complete_reward', label: '完善资料' },
  { value: 'verify_complete_reward', label: '认证完成' },
  { value: 'first_vip_reward', label: '首次会员' },
  { value: 'first_coin_recharge_reward', label: '首次充值' },
];

const EMPTY_FILTERS = {
  rewardNo: '',
  rewardObjectKeyword: '',
  inviteeKeyword: '',
  sourceType: '',
  eventKey: '',
  status: '',
  createdStartDate: '',
  createdEndDate: '',
};

type RewardFilters = typeof EMPTY_FILTERS;

function toQuery(filters: RewardFilters, page: number, size: number): PromotionRewardQuery {
  const [eventType, threshold] = filters.eventKey.split(':');
  return {
    page,
    size,
    rewardNo: filters.rewardNo || undefined,
    rewardObjectKeyword: filters.rewardObjectKeyword || undefined,
    inviteeKeyword: filters.inviteeKeyword || undefined,
    sourceType: (filters.sourceType || undefined) as PromotionSourceType | undefined,
    eventType: (eventType || undefined) as PromotionEventType | undefined,
    ladderThreshold: threshold ? Number(threshold) : undefined,
    status: (filters.status || undefined) as PromotionRewardStatus | undefined,
    createdStartTime: filters.createdStartDate ? `${filters.createdStartDate}T00:00:00` : undefined,
    createdEndTime: filters.createdEndDate ? `${filters.createdEndDate}T23:59:59` : undefined,
  };
}

export default function PromotionRewardsPage() {
  const { hasPermission } = usePermission();
  const [draftFilters, setDraftFilters] = useState<RewardFilters>({ ...EMPTY_FILTERS });
  const [filters, setFilters] = useState<RewardFilters>({ ...EMPTY_FILTERS });
  const [rows, setRows] = useState<PromotionRewardListItem[]>([]);
  const [tierThresholds, setTierThresholds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailNo, setDetailNo] = useState<string | null>(null);
  const [retryReward, setRetryReward] = useState<PromotionRewardListItem | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const { exporting, startExport } = usePromotionExport();

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPromotionRewards(toQuery(filters, page, pageSize));
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

  useEffect(() => {
    Promise.all([
      getCurrentPromotionRule('normal_user'),
      getCurrentPromotionRule('campus_agent'),
    ]).then((responses) => {
      const thresholds = responses.flatMap((response) => response.data.tiers || []).map((item) => item.threshold);
      setTierThresholds([...new Set(thresholds)].sort((a, b) => a - b));
    }).catch(() => {
      // 阶梯筛选项加载失败不影响流水主列表。
    });
  }, []);

  const eventOptions = useMemo(() => [
    ...BASE_EVENT_OPTIONS,
    ...tierThresholds.map((threshold) => ({
      value: `ladder_bonus:${threshold}` as const,
      label: `阶梯奖励-累计${threshold}人`,
    })),
  ], [tierThresholds]);

  const retry = async () => {
    if (!retryReward) return;
    setRetrying(true);
    try {
      await retryPromotionReward(retryReward.rewardNo);
      setRetryReward(null);
      showToast('已使用原奖励单重新提交发放', 'success');
      await fetchList();
    } catch {
      // 请求层统一展示错误，保留弹窗便于重试。
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <PromotionPageHeader
        title="邀请奖励流水"
        description="基础奖励与命中阶梯的额外奖励分开记录；普通奖励支持三态查询与失败重试。"
        actions={hasPermission('promotion:reward:export') && (
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
        <PromotionField label="奖励单号">
          <Input
            placeholder="奖励单号"
            value={draftFilters.rewardNo}
            onChange={(event) => setDraftFilters((current) => ({ ...current, rewardNo: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="奖励对象">
          <Input
            placeholder="用户 / 代理编号或名称"
            value={draftFilters.rewardObjectKeyword}
            onChange={(event) => setDraftFilters((current) => ({ ...current, rewardObjectKeyword: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="对应用户">
          <Input
            placeholder="用户编号 / 昵称 / 手机号"
            value={draftFilters.inviteeKeyword}
            onChange={(event) => setDraftFilters((current) => ({ ...current, inviteeKeyword: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="来源类型">
          <select
            aria-label="来源类型"
            className="h-9 rounded-md border bg-card px-3 text-sm"
            value={draftFilters.sourceType}
            onChange={(event) => setDraftFilters((current) => ({ ...current, sourceType: event.target.value }))}
          >
            <option value="">全部来源</option>
            <option value="normal_user">普通用户</option>
            <option value="campus_agent">校园代理</option>
          </select>
        </PromotionField>
        <PromotionField label="奖励事件">
          <select
            aria-label="奖励事件"
            className="h-9 rounded-md border bg-card px-3 text-sm"
            value={draftFilters.eventKey}
            onChange={(event) => setDraftFilters((current) => ({ ...current, eventKey: event.target.value }))}
          >
            <option value="">全部事件</option>
            {eventOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </PromotionField>
        <PromotionField label="奖励状态">
          <select
            aria-label="奖励状态"
            className="h-9 rounded-md border bg-card px-3 text-sm"
            value={draftFilters.status}
            onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">全部状态</option>
            <option value="pending">待发放</option>
            <option value="success">已发放</option>
            <option value="failed">发放失败</option>
          </select>
        </PromotionField>
        <PromotionField label="生成开始日期">
          <Input
            type="date"
            value={draftFilters.createdStartDate}
            onChange={(event) => setDraftFilters((current) => ({ ...current, createdStartDate: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="生成结束日期">
          <Input
            type="date"
            value={draftFilters.createdEndDate}
            onChange={(event) => setDraftFilters((current) => ({ ...current, createdEndDate: event.target.value }))}
          />
        </PromotionField>
      </PromotionFilterPanel>

      <Card className="min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">奖励流水</h2>
          <span className="text-xs text-muted-foreground">共 {total} 条</span>
        </div>
        <Table className="min-w-[1320px]">
          <TableHeader>
            <TableRow>
              <TableHead>奖励单号</TableHead>
              <TableHead>奖励对象</TableHead>
              <TableHead>奖励事件</TableHead>
              <TableHead>对应用户</TableHead>
              <TableHead>奖励金额</TableHead>
              <TableHead>奖励状态</TableHead>
              <TableHead>生成时间</TableHead>
              <TableHead>发放时间</TableHead>
              <TableHead className="w-40">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <PromotionTableState
              loading={loading}
              error={error}
              empty={!rows.length}
              colSpan={9}
              onRetry={() => void fetchList()}
              emptyText="没有符合条件的奖励流水"
            />
            {!loading && !error && rows.map((row) => (
              <TableRow key={row.rewardNo}>
                <TableCell className="font-medium">{row.rewardNo}</TableCell>
                <TableCell>
                  <span className="block font-medium">{row.rewardObjectName}</span>
                  <span className="text-xs text-muted-foreground">{row.rewardObjectNo}</span>
                </TableCell>
                <TableCell>
                  <span className="block">{row.eventLabel}</span>
                  <span className="text-xs text-muted-foreground">规则 V{row.ruleVersion}</span>
                </TableCell>
                <TableCell>
                  <span className="block">{row.inviteeNickname}</span>
                  <span className="text-xs text-muted-foreground">{row.inviteeUserNo}</span>
                </TableCell>
                <TableCell className="font-medium">{formatPromotionAmount(row.amount, row.amountUnit)}</TableCell>
                <TableCell>
                  <PromotionStatusBadge status={row.status} />
                  {row.status === 'failed' && row.failureReason && (
                    <span className="mt-1 block max-w-40 truncate text-xs text-destructive" title={row.failureReason}>
                      {row.failureReason}
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDateTime(row.createdAt)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDateTime(row.paidAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="link" className="h-auto px-0" onClick={() => setDetailNo(row.relationNo)}>
                      <Eye className="mr-1 h-4 w-4" />
                      查看关系
                    </Button>
                    {row.sourceType === 'normal_user'
                      && row.status === 'failed'
                      && hasPermission('promotion:reward:retry') && (
                      <Button variant="outline" size="sm" onClick={() => setRetryReward(row)}>
                        <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                        重试
                      </Button>
                    )}
                  </div>
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
      <RewardRetryDialog
        reward={retryReward}
        loading={retrying}
        onClose={() => setRetryReward(null)}
        onConfirm={() => void retry()}
      />
      <ConfirmActionDialog
        open={exportOpen}
        title="确认导出奖励流水？"
        description="将按当前筛选条件创建异步导出任务，阶梯奖励会保留具体人数档位和规则快照。"
        confirmText="创建导出任务"
        loading={exporting}
        onCancel={() => setExportOpen(false)}
        onConfirm={() => {
          const { page: ignoredPage, size: ignoredSize, ...query } = toQuery(filters, 1, 20);
          void ignoredPage;
          void ignoredSize;
          setExportOpen(false);
          void startExport(() => exportPromotionRewards(query));
        }}
      />
    </div>
  );
}
