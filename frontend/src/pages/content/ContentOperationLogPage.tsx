import { useState, useEffect, useCallback } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getOperationLogList, type ContentOperationLogVO } from '@/api/content';

const BIZ_TYPE_OPTIONS = [
  { value: '', label: '全部业务' },
  { value: 'ARTICLE', label: '内容文章' },
  { value: 'APP_CONFIG', label: '应用配置' },
  { value: 'MOBILE_ENTRY', label: '移动入口' },
  { value: 'HOT_WORD', label: '搜索热词' },
  { value: 'BLOCK_WORD', label: '屏蔽词' },
];

const ACTION_OPTIONS = [
  { value: '', label: '全部操作' },
  { value: 'CREATE', label: '创建' },
  { value: 'UPDATE', label: '更新' },
  { value: 'DELETE', label: '删除' },
  { value: 'STATUS_CHANGE', label: '状态变更' },
];

function pageData(res: unknown) {
  return ((res as any).data ?? { records: [], total: 0 }) as { records: ContentOperationLogVO[]; total: number };
}

export default function ContentOperationLogPage() {
  const [list, setList] = useState<ContentOperationLogVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ bizType: '', action: '' });
  const [query, setQuery] = useState(filters);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData(await getOperationLogList({ bizType: query.bizType || undefined, action: query.action || undefined, page, size: 10 }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function handleSearch() { setPage(1); setQuery(filters); }
  function handleReset() { const empty = { bizType: '', action: '' }; setFilters(empty); setPage(1); setQuery(empty); }

  return (
    <Card>
      <CardHeader>
        <CardTitle>操作日志</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="w-36" options={BIZ_TYPE_OPTIONS} value={filters.bizType} onChange={(v) => setFilters({ ...filters, bizType: v })} />
          <Select className="w-36" options={ACTION_OPTIONS} value={filters.action} onChange={(v) => setFilters({ ...filters, action: v })} />
          <Button size="sm" onClick={handleSearch}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={handleReset}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>业务类型</TableHead>
              <TableHead>操作人</TableHead>
              <TableHead>操作</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{BIZ_TYPE_OPTIONS.find((o) => o.value === row.bizType)?.label ?? row.bizType}</TableCell>
                <TableCell>{row.operatorName || '-'}</TableCell>
                <TableCell>{ACTION_OPTIONS.find((o) => o.value === row.action)?.label ?? row.action}</TableCell>
                <TableCell className="max-w-[300px] truncate">{row.remark || '-'}</TableCell>
                <TableCell>{row.createTime ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>
    </Card>
  );
}
