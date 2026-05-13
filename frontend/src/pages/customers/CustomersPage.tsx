import { useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Avatar } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

interface Customer {
  id: number;
  name: string;
  avatar: string;
  age: number;
  city: string;
  gender: '男' | '女';
  profession: string;
  vipLevel: string;
  matchmaker: string;
  status: string;
}

const mockData: Customer[] = [
  { id: 1, name: '林女士', avatar: '', age: 28, city: '北京', gender: '女', profession: '互联网运营', vipLevel: 'VIP1', matchmaker: '陈欣怡', status: '待跟进' },
  { id: 2, name: '林男士', avatar: '', age: 28, city: '北京', gender: '男', profession: '互联网运营', vipLevel: 'VIP1', matchmaker: '陈欣怡', status: '已牵线' },
  { id: 3, name: '张女士', avatar: '', age: 25, city: '上海', gender: '女', profession: '设计师', vipLevel: 'VIP2', matchmaker: '李明', status: '跟进中' },
];

const memberLevelOptions = [
  { value: '', label: '会员等级' },
  { value: 'vip1', label: 'VIP1' },
  { value: 'vip2', label: 'VIP2' },
  { value: 'vip3', label: 'VIP3' },
];

const statusOptions = [
  { value: '', label: '跟进状态' },
  { value: 'pending', label: '待跟进' },
  { value: 'following', label: '跟进中' },
  { value: 'matched', label: '已牵线' },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">客户管理</h1>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-[198px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-muted-foreground" />
              <Input
                placeholder="搜索客户"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select options={memberLevelOptions} className="w-[198px]" />
            <Select options={statusOptions} className="w-[198px]" />
            <Button variant="primary" size="sm" className="h-9 w-[78px]">
              搜索
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-[78px]">
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">客户</TableHead>
                <TableHead className="w-[120px]">性别</TableHead>
                <TableHead className="w-[150px]">职业</TableHead>
                <TableHead className="w-[120px]">会员</TableHead>
                <TableHead className="w-[150px]">负责红娘</TableHead>
                <TableHead className="w-[120px]">状态</TableHead>
                <TableHead className="w-[150px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-[38px] w-[38px]" fallback={customer.name[0]} />
                      <div>
                        <p className="text-sm font-medium text-[#0C285A]">{customer.name}</p>
                        <p className="text-xs text-[#C3C5C9]">{customer.age}岁·{customer.city}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.gender === '女' ? 'female' : 'male'} className="h-8 px-3 text-sm">
                      {customer.gender}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[#132E5F]">{customer.profession}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[#132E5F]">{customer.vipLevel}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[#132E5F]">{customer.matchmaker}</span>
                  </TableCell>
                  <TableCell>
                    <span className={customer.status === '待跟进' ? 'text-success text-sm' : 'text-primary text-sm'}>
                      {customer.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <button className="text-sm text-primary hover:underline">画像</button>
                      <button className="text-sm text-primary hover:underline">牵线</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex justify-end p-4 border-t border-border">
          <Pagination current={page} total={400} pageSize={10} onChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
