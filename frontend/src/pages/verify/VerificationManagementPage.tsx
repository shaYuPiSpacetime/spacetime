import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, RotateCcw, CheckCircle, XCircle, Eye } from 'lucide-react';
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
  getRealNamePage,
  getEducationPage,
  getAvatarPage,
  getRealNameDetail,
  getEducationDetail,
  getAvatarDetail,
  auditRealName,
  auditEducation,
  auditAvatar,
  type VerificationVO,
  type VerificationAuditDetailVO,
  type PageResult,
  type FieldEntry,
} from '@/api/verification';

type TabConfig = {
  key: string;
  title: string;
  fetchFn: (params: { page: number; size: number; keyword?: string; status?: string }) => Promise<any>;
  detailFn: (id: number) => Promise<any>;
  auditFn: (id: number, data: { action: string; rejectReason?: string }) => Promise<any>;
  statusOptions: { value: string; label: string }[];
  detailTitle: string;
};

const TABS: Record<string, TabConfig> = {
  '/verify/real-name': {
    key: 'real-name',
    title: '实名认证审核',
    fetchFn: getRealNamePage,
    detailFn: getRealNameDetail,
    auditFn: auditRealName,
    statusOptions: [
      { value: '', label: '全部状态' },
      { value: 'PENDING', label: '待审核' },
      { value: 'APPROVED', label: '已通过' },
      { value: 'REJECTED', label: '已驳回' },
    ],
    detailTitle: '实名认证详情',
  },
  '/verify/education': {
    key: 'education',
    title: '学历认证审核',
    fetchFn: getEducationPage,
    detailFn: getEducationDetail,
    auditFn: auditEducation,
    statusOptions: [
      { value: '', label: '全部状态' },
      { value: 'PENDING', label: '待审核' },
      { value: 'APPROVED', label: '已通过' },
      { value: 'REJECTED', label: '已驳回' },
    ],
    detailTitle: '学历认证详情',
  },
  '/verify/avatar': {
    key: 'avatar',
    title: '头像认证审核',
    fetchFn: getAvatarPage,
    detailFn: getAvatarDetail,
    auditFn: auditAvatar,
    statusOptions: [
      { value: '', label: '全部状态' },
      { value: 'PENDING', label: '待审核' },
      { value: 'APPROVED', label: '已通过' },
      { value: 'REJECTED', label: '已驳回' },
    ],
    detailTitle: '头像认证详情',
  },
};

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  PENDING: { label: '待审核', variant: 'warning' },
  APPROVED: { label: '已通过', variant: 'success' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  NOT_CERTIFIED: { label: '未认证', variant: 'secondary' },
  EXPIRED: { label: '已失效', variant: 'secondary' },
};

const EDUCATION_METHOD_MAP: Record<string, string> = {
  CHSI: '学信网',
  ONLINE_CODE: '在线验证码',
  DIPLOMA_NO: '学历证书编号',
};

function formatFieldValue(label: string, value: string): string {
  if (!value) return '-';
  if (label === '认证方式') return EDUCATION_METHOD_MAP[value] || value;
  if (label === '人脸核身状态' || label === '认证状态') return STATUS_MAP[value]?.label || value;
  return value;
}

export default function VerificationManagementPage() {
  const location = useLocation();
  const currentPath = Object.keys(TABS).find((p) => location.pathname.startsWith(p)) || '/verify/real-name';
  const tab = TABS[currentPath];

  const [list, setList] = useState<VerificationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<VerificationVO | null>(null);
  const [auditAction, setAuditAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectReason, setRejectReason] = useState('');
  const [auditing, setAuditing] = useState(false);

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<VerificationAuditDetailVO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tab.fetchFn({
        page,
        size: 10,
        keyword: keyword || undefined,
        status: status || undefined,
      });
      const data = res.data as PageResult<VerificationVO>;
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [tab, page, keyword, status]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openApprove(record: VerificationVO) {
    setAuditTarget(record);
    setAuditAction('APPROVE');
    setRejectReason('');
    setAuditOpen(true);
  }

  function openReject(record: VerificationVO) {
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
      setDetailOpen(false);
      fetchList();
    } finally {
      setAuditing(false);
    }
  }

  async function openDetail(record: VerificationVO) {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await tab.detailFn(record.id);
      setDetail(res.data as VerificationAuditDetailVO);
    } finally {
      setDetailLoading(false);
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
              placeholder="搜索昵称"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="w-40"
            />
            <Select
              options={tab.statusOptions}
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              className="w-32"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setKeyword(''); setStatus(''); setPage(1); }}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> 重置
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>驳回原因</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">加载中…</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
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
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{v.submitTime || '-'}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{v.rejectReason || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(v)}>
                          <Eye className="h-4 w-4 mr-1" /> 查看
                        </Button>
                        {v.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openApprove(v)}>
                              <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> 通过
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openReject(v)}>
                              <XCircle className="h-4 w-4 mr-1 text-red-600" /> 驳回
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Pagination current={page} total={total} onChange={setPage} />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{tab.detailTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {detailLoading ? (
            <p className="text-center text-muted-foreground py-4">加载中…</p>
          ) : detail ? (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-md">
                <Avatar className="h-10 w-10" src={detail.avatar || undefined} fallback={detail.nickname?.[0] || 'U'} />
                <div>
                  <p className="font-medium">{detail.nickname}</p>
                  <p className="text-xs text-muted-foreground">用户ID: {detail.userId} · 认证等级: Lv.{detail.verifyLevel ?? 0}</p>
                </div>
              </div>

              {/* Verification content */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">认证内容</h4>
                {detail.fields && detail.fields.length > 0 ? (
                  detail.fields.map((f: FieldEntry, i: number) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[90px]">{f.label}:</span>
                      <span className="font-medium">{formatFieldValue(f.label, f.value)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">暂无认证内容</p>
                )}
              </div>

              {/* Audit info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">审核信息</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">提交时间:</span> {detail.submitTime || '-'}</div>
                  <div><span className="text-muted-foreground">审核时间:</span> {detail.resultTime || '-'}</div>
                </div>
                {detail.rejectReason && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">驳回原因:</span> <span className="text-red-600">{detail.rejectReason}</span>
                  </div>
                )}
              </div>

              {/* Audit actions (only for PENDING) */}
              {detail.status === 'PENDING' && (
                <div className="space-y-3 border-t pt-4">
                  {auditTarget == null ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">审核操作</label>
                        <div className="flex gap-2 mt-1">
                          <Button size="sm" onClick={() => { setAuditTarget({ id: detail.id } as VerificationVO); setAuditAction('APPROVE'); setRejectReason(''); setAuditOpen(true); }}>
                            <CheckCircle className="h-4 w-4 mr-1" /> 通过
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => { setAuditTarget({ id: detail.id } as VerificationVO); setAuditAction('REJECT'); setRejectReason(''); setAuditOpen(true); }}>
                            <XCircle className="h-4 w-4 mr-1" /> 驳回
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-4">加载详情失败</p>
          )}
        </div>
      </Dialog>

      {/* Audit confirm dialog */}
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
