import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface PaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  className?: string;
}

function Pagination({ current, total, pageSize = 10, onChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeCurrent = Math.min(Math.max(current, 1), totalPages);

  const pages = React.useMemo(() => {
    const items: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (safeCurrent > 3) items.push('ellipsis');
      for (let i = Math.max(2, safeCurrent - 1); i <= Math.min(totalPages - 1, safeCurrent + 1); i++) {
        items.push(i);
      }
      if (safeCurrent < totalPages - 2) items.push('ellipsis');
      items.push(totalPages);
    }
    return items;
  }, [safeCurrent, totalPages]);

  return (
    <div className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <span className="mr-4 text-xs">
        共{total}条记录 第 {safeCurrent} / {totalPages} 页
      </span>

      <Button variant="ghost" size="icon" className="h-[30px] w-[30px] bg-pagination rounded-none" disabled={safeCurrent === 1} onClick={() => onChange(1)}>
        <ChevronsLeft className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-[30px] w-[30px] bg-pagination rounded-none" disabled={safeCurrent === 1} onClick={() => onChange(safeCurrent - 1)}>
        <ChevronLeft className="h-3 w-3" />
      </Button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`e-${i}`} className="px-1 text-xs">…</span>
        ) : (
          <Button
            key={page}
            variant={page === safeCurrent ? 'default' : 'ghost'}
            size="icon"
            className={cn(
              'h-[30px] w-[30px] rounded-none text-xs font-normal',
              page === safeCurrent ? 'bg-primary text-primary-foreground' : 'bg-pagination text-muted-foreground',
            )}
            onClick={() => onChange(page)}
          >
            {page}
          </Button>
        ),
      )}

      <Button variant="ghost" size="icon" className="h-[30px] w-[30px] bg-pagination rounded-none" disabled={safeCurrent === totalPages} onClick={() => onChange(safeCurrent + 1)}>
        <ChevronRight className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-[30px] w-[30px] bg-pagination rounded-none" disabled={safeCurrent === totalPages} onClick={() => onChange(totalPages)}>
        <ChevronsRight className="h-3 w-3" />
      </Button>

      <span className="ml-4 text-xs">
        <select
          className="mx-1 bg-transparent text-xs outline-none"
          value={pageSize}
          onChange={(e) => {
            const newSize = Number(e.target.value);
            const newTotalPages = Math.ceil(total / newSize);
            onChange(Math.min(safeCurrent, Math.max(1, newTotalPages)));
          }}
        >
          <option value={10}>10条/页</option>
          <option value={20}>20条/页</option>
          <option value={50}>50条/页</option>
        </select>
      </span>
    </div>
  );
}

Pagination.displayName = 'Pagination';
export { Pagination };
