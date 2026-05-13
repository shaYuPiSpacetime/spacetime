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
  const totalPages = Math.ceil(total / pageSize);

  const pages = React.useMemo(() => {
    const items: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (current > 3) items.push('ellipsis');
      for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
        items.push(i);
      }
      if (current < totalPages - 2) items.push('ellipsis');
      items.push(totalPages);
    }
    return items;
  }, [current, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <span className="mr-4 text-xs">
        共{total}条记录 第 {current} / {totalPages} 页
      </span>

      <Button variant="ghost" size="icon" className="h-[30px] w-[30px] bg-pagination rounded-none" disabled={current === 1} onClick={() => onChange(1)}>
        <ChevronsLeft className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-[30px] w-[30px] bg-pagination rounded-none" disabled={current === 1} onClick={() => onChange(current - 1)}>
        <ChevronLeft className="h-3 w-3" />
      </Button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`e-${i}`} className="px-1 text-xs">…</span>
        ) : (
          <Button
            key={page}
            variant={page === current ? 'default' : 'ghost'}
            size="icon"
            className={cn(
              'h-[30px] w-[30px] rounded-none text-xs font-normal',
              page === current ? 'bg-primary text-primary-foreground' : 'bg-pagination text-muted-foreground',
            )}
            onClick={() => onChange(page)}
          >
            {page}
          </Button>
        ),
      )}

      <Button variant="ghost" size="icon" className="h-[30px] w-[30px] bg-pagination rounded-none" disabled={current === totalPages} onClick={() => onChange(current + 1)}>
        <ChevronRight className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-[30px] w-[30px] bg-pagination rounded-none" disabled={current === totalPages} onClick={() => onChange(totalPages)}>
        <ChevronsRight className="h-3 w-3" />
      </Button>

      <span className="ml-4 text-xs">
        <select
          className="mx-1 bg-transparent text-xs outline-none"
          value={pageSize}
          onChange={(e) => {
            const newSize = Number(e.target.value);
            const newTotalPages = Math.ceil(total / newSize);
            onChange(Math.min(current, newTotalPages));
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
