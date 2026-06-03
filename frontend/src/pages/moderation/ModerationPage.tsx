import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Avatar } from '@/components/ui/avatar';
import {
  getPhotoModerationPage,
  getTextModerationPage,
  auditPhoto,
  auditText,
  type ModerationVO,
  type PageResult,
} from '@/api/verification';

type TabConfig = {
  key: string;
  title: string;
  fetchFn: (params: { page: number; size: number; userId?: number; status?: string }) => Promise<any>;
  auditFn: (id: number, data: { action: string; rejectReason?: string }) => Promise<any>;
};

const TABS: Record<string, TabConfig> = {
  '/moderation/photos': {
    key: 'photos',
    title: '资料照片审核',
    fetchFn: getPhotoModerationPage,
    auditFn: auditPhoto,
  },
  '/moderation/texts': {
    key: 'texts',
    title: '文字内容审核',
    fetchFn: getTextModerationPage,
    auditFn: auditText,
  },
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
];

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  PENDING: { label: '待审核', variant: 'warning' },
  APPROVED: { label: '已通过', variant: 'success' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  NOT_SUBMITTED: { label: '未提交', variant: 'secondary' },
};

export default function ModerationPage() {
  const location = useLocation();
  const currentPath = Object.keys(TABS).find((p) => location.pathname.startsWith(p)) || '/moderation/photos';
  const tab = TABS[currentPath];

  const [list, setList] = useState<ModerationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<ModerationVO | null>(null);
  const [auditAction, setAuditAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectReason, setRejectReason] = useState('');
  const [auditing, setAuditing] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tab.fetchFn({
        page,
        size: 10,
        userId: userId ? Number(userId) : undefined,
        status: status || undefined,
      });
      const data = res.data as PageResult<ModerationVO>;
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [tab, page, userId, status]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openApprove(record: ModerationVO) {
    setAuditTarget(record);
    setAuditAction('APPROVE');
    setRejectReason('');
    setAuditOpen(true);
  }

  function openReject(record: ModerationVO) {
    setAuditTarget(record);
    setAuditAction('REJECT');
    setRejectReason('');
    setAuditOpen(true);
  }

  async function handleAudit() {
    if (!auditTarget) return;
    if (auditAction === 'REJECT' && !rejectReason.trim()) return;
    setAuditing(true);
    try {
      await tab.auditFn(auditTarget.id, {
        action: auditAction,
        rejectReason: auditAction === 'REJECT' ? rejectReason.trim() : undefined,
      });
      setAuditOpen(false);
      fetchList();
    } finally {
      setAuditing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{tab.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="用户ID"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setPage(1); }}
              className="w-32"
            />
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              className="w-32"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setUserId(''); setStatus(''); setPage(1); }}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> 重置
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>用户ID</TableHead>
                <TableHead>内容类型</TableHead>
                <TableHead>内容预览</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">加载中…</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : list.map((v) => {
                const st = STATUS_MAP[v.status] || { label: v.status, variant: 'secondary' as const };
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9" src={v.avatar || undefined} fallback={v.nickname?.[0] || 'U'} />
                        <span className="text-sm font-medium">{v.nickname || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{v.userId}</TableCell>
                    <TableCell>{v.contentType}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {v.contentPreview || '-'}
                    </TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{v.submitTime || '-'}</TableCell>
                    <TableCell>
                      {v.status === 'PENDING' && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openApprove(v)}>
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> 通过
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openReject(v)}>
                            <XCircle className="h-4 w-4 mr-1 text-red-600" /> 驳回
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Pagination current={page} total={total} onChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={auditOpen} onClose={() => setAuditOpen(false)}>
        <DialogHeader>
          <DialogTitle>{auditAction === 'APPROVE' ? '确认通过' : '确认驳回'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {auditAction === 'REJECT' && (
            <div>
              <label className="text-sm font-medium">驳回原因</label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入驳回原因"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAuditOpen(false)}>取消</Button>
            <Button onClick={handleAudit} disabled={auditing}>
              {auditing ? '处理中…' : '确认'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
