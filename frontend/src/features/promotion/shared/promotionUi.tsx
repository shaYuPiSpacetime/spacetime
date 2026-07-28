import type { ReactNode } from 'react';
import { AlertCircle, Inbox, LoaderCircle, RotateCcw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import type {
  PromotionAgentStatus,
  PromotionRewardStatus,
  PromotionSettlementStatus,
  PromotionSourceType,
} from '@/types/promotion';

export function PromotionPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PromotionFilterPanel({
  children,
  onSearch,
  onReset,
  loading,
}: {
  children: ReactNode;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 p-4">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" onClick={onSearch} disabled={loading}>
            {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            查询
          </Button>
          <Button type="button" variant="outline" onClick={onReset} disabled={loading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            重置
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PromotionField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function PromotionPagination({
  current,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  current: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <Pagination
        current={current}
        total={total}
        pageSize={pageSize}
        onChange={onPageChange}
        showPageSizeSelector={false}
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        每页
        <select
          value={pageSize}
          className="h-8 rounded-md border bg-card px-2 text-xs text-foreground"
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          <option value={20}>20条</option>
          <option value={50}>50条</option>
          <option value={100}>100条</option>
        </select>
      </label>
    </div>
  );
}

export function PromotionTableState({
  loading,
  error,
  empty,
  colSpan,
  onRetry,
  emptyText,
}: {
  loading: boolean;
  error?: string;
  empty: boolean;
  colSpan: number;
  onRetry: () => void;
  emptyText: string;
}) {
  if (loading) {
    return (
      <tr>
        <td colSpan={colSpan} className="h-48 text-center text-sm text-muted-foreground">
          <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
          正在加载数据…
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={colSpan} className="h-48 text-center">
          <AlertCircle className="mx-auto mb-3 h-7 w-7 text-destructive" />
          <p className="text-sm text-foreground">加载失败，请重试</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>重新加载</Button>
        </td>
      </tr>
    );
  }

  if (empty) {
    return (
      <tr>
        <td colSpan={colSpan} className="h-48 text-center text-sm text-muted-foreground">
          <Inbox className="mx-auto mb-3 h-8 w-8 opacity-60" />
          {emptyText}
        </td>
      </tr>
    );
  }

  return null;
}

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmText = '确认',
  loading,
  destructive,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  loading?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} layer="confirmation" closeOnEscape={!loading}>
      <div role="dialog" aria-modal="true" aria-label={title}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2 leading-6">{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>取消</Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function PromotionStatusBadge({
  status,
}: {
  status: PromotionRewardStatus | PromotionAgentStatus | PromotionSettlementStatus | null | undefined;
}) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const map = {
    pending: { label: '待发放', variant: 'warning' as const },
    success: { label: '已发放', variant: 'success' as const },
    failed: { label: '发放失败', variant: 'destructive' as const },
    enabled: { label: '启用', variant: 'success' as const },
    disabled: { label: '停用', variant: 'secondary' as const },
    pending_confirm: { label: '待确定', variant: 'warning' as const },
    confirmed: { label: '已确定', variant: 'success' as const },
  };
  const current = map[status];
  return <Badge variant={current.variant}>{current.label}</Badge>;
}

export function sourceTypeLabel(sourceType: PromotionSourceType) {
  return sourceType === 'campus_agent' ? '校园代理' : '普通用户';
}

export function formatPromotionAmount(
  amount: number | null | undefined,
  sourceTypeOrUnit: PromotionSourceType | 'coin' | 'cny',
) {
  const value = Number(amount || 0);
  if (sourceTypeOrUnit === 'campus_agent' || sourceTypeOrUnit === 'cny') {
    return `¥${value.toFixed(2)}`;
  }
  return `${Math.trunc(value).toLocaleString('zh-CN')} 千寻币`;
}

export function formatDateTime(value?: string) {
  if (!value) return '—';
  return value.replace('T', ' ').replace(/(\.\d+)?(?:Z|[+-]\d\d:\d\d)?$/, '');
}

export function formatMonthPeriod(value?: string) {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(year, month, 0).getDate();
  return `${value}-01 至 ${value}-${String(lastDay).padStart(2, '0')}`;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return '请求失败，请稍后重试';
}
