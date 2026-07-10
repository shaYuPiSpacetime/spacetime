import { useState, useEffect, useCallback, type ReactNode } from 'react';
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
  getPhotoModerationPage,
  getTextModerationPage,
  getPhotoModerationDetail,
  getTextModerationDetail,
  getPhotoModerationStats,
  getTextModerationStats,
  auditPhoto,
  auditText,
  type ModerationVO,
  type ModerationDetailVO,
  type PageResult,
  type VerificationPageParams,
  type VerificationStatsVO,
} from '@/api/verification';

type DetailParams = { historyPage?: number; historySize?: number };

type TabConfig = {
  key: 'photos' | 'texts';
  title: string;
  listTitle: string;
  fetchFn: (params: VerificationPageParams) => Promise<any>;
  statsFn: () => Promise<any>;
  detailFn: (id: number, params?: DetailParams) => Promise<any>;
  auditFn: (id: number, data: { action: string; rejectReason?: string }) => Promise<any>;
  detailTitle: string;
  bottomTip: string;
};

type StatItem = { label: string; value: string };

const TABS: Record<string, TabConfig> = {
  '/moderation/photos': {
    key: 'photos',
    title: '资料图片审核',
    listTitle: '资料图片审核列表',
    fetchFn: getPhotoModerationPage,
    statsFn: getPhotoModerationStats,
    detailFn: getPhotoModerationDetail,
    auditFn: auditPhoto,
    detailTitle: '资料图片审核详情',
    bottomTip: '相册图片与资料背景图，不影响主头像认证',
  },
  '/moderation/texts': {
    key: 'texts',
    title: '文字内容审核',
    listTitle: '文字内容审核列表',
    fetchFn: getTextModerationPage,
    statsFn: getTextModerationStats,
    detailFn: getTextModerationDetail,
    auditFn: auditText,
    detailTitle: '文字内容审核详情',
    bottomTip: '关于我、希望 TA 了解、资料问答等开放文本，暂不支持语音转文字',
  },
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待审核' },
  { value: 'REVIEWING', label: '审核中' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'EXPIRED', label: '已失效' },
];

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  PENDING: { label: '待审核', variant: 'warning' },
  REVIEWING: { label: '审核中', variant: 'warning' },
  APPROVED: { label: '已通过', variant: 'success' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  EXPIRED: { label: '已失效', variant: 'secondary' },
};

const AUDIT_SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'MACHINE', label: '机审' },
  { value: 'MANUAL', label: '人工审核' },
];

const AUDIT_SOURCE_MAP: Record<string, string> = {
  MACHINE: '机审',
  MANUAL: '人工审核',
};

const AUDIT_ACTION_MAP: Record<string, string> = {
  SUBMIT: '提交审核',
  MACHINE_START: '机审开始',
  MACHINE_PASS: '机审通过',
  MACHINE_REJECT: '机审驳回',
  MANUAL_APPROVE: '人工通过',
  MANUAL_REJECT: '人工驳回',
  MANUAL_EXPIRE: '人工失效',
  SYSTEM_EXPIRE: '系统失效',
};

const SUBMIT_TIME_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: 'TODAY', label: '今天' },
  { value: 'LAST_7_DAYS', label: '近7天' },
];

const IMAGE_TYPE_OPTIONS = [
  { value: '', label: '全部图片' },
  { value: 'ALBUM', label: '相册图片' },
  { value: 'BACKGROUND', label: '资料背景图' },
];

const TEXT_TYPE_OPTIONS = [
  { value: '', label: '全部文本' },
  { value: 'ABOUT_ME', label: '关于我' },
  { value: 'HOPE_THEY_KNOW', label: '希望 TA 了解' },
  { value: 'PROFILE_QA', label: '资料问答' },
];

function QueryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="block text-xs font-medium text-[#5F6675]">{label}</span>
      {children}
    </label>
  );
}

function buildStats(stats: VerificationStatsVO): StatItem[] {
  return [
    { label: '待审核', value: String(stats.pendingCount ?? 0) },
    { label: '审核中', value: String(stats.reviewingCount ?? 0) },
    { label: '今日通过', value: String(stats.approvedTodayCount ?? 0) },
    { label: '今日驳回', value: String(stats.rejectedTodayCount ?? 0) },
  ];
}

function badgeOf(status?: string) {
  return STATUS_MAP[status || ''] || { label: status || '-', variant: 'secondary' as const };
}

function imageUrls(content?: string) {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    // 单 URL 按原值展示。
  }
  return [content];
}

export default function ModerationPage() {
  const location = useLocation();
  const currentPath = Object.keys(TABS).find((path) => location.pathname.startsWith(path)) || '/moderation/photos';
  const tab = TABS[currentPath];

  const [list, setList] = useState<ModerationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<StatItem[]>(buildStats({ pendingCount: 0, reviewingCount: 0, approvedTodayCount: 0, rejectedTodayCount: 0, expiredCount: 0 }));
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [auditSource, setAuditSource] = useState('');
  const [submitTime, setSubmitTime] = useState('');
  const [imageType, setImageType] = useState('');
  const [textType, setTextType] = useState('');
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ModerationDetailVO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<'APPROVE' | 'REJECT' | 'EXPIRE'>('APPROVE');
  const [rejectReason, setRejectReason] = useState('');
  const [auditing, setAuditing] = useState(false);

  useEffect(() => {
    setPage(1);
    setKeyword('');
    setStatus('');
    setAuditSource('');
    setSubmitTime('');
    setImageType('');
    setTextType('');
    setDetailOpen(false);
  }, [tab.key]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tab.fetchFn({
        page,
        size: 10,
        keyword: keyword || undefined,
        status: status || undefined,
        auditSource: auditSource || undefined,
        submitTime: submitTime || undefined,
        imageType: tab.key === 'photos' ? imageType || undefined : undefined,
        textType: tab.key === 'texts' ? textType || undefined : undefined,
      });
      const data = res.data as PageResult<ModerationVO>;
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [auditSource, imageType, keyword, page, status, submitTime, tab, textType]);

  const fetchStats = useCallback(async () => {
    const res = await tab.statsFn();
    setStats(buildStats(res.data as VerificationStatsVO));
  }, [tab]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function loadDetail(id: number, nextHistoryPage = 1) {
    setDetailOpen(true);
    setDetailLoading(true);
    setHistoryPage(nextHistoryPage);
    try {
      const res = await tab.detailFn(id, { historyPage: nextHistoryPage, historySize: 5 });
      setDetail(res.data as ModerationDetailVO);
    } finally {
      setDetailLoading(false);
    }
  }

  function openAudit(action: 'APPROVE' | 'REJECT' | 'EXPIRE') {
    setAuditAction(action);
    setRejectReason('');
    setAuditOpen(true);
  }

  async function handleAudit() {
    if (!detail) return;
    if ((auditAction === 'REJECT' || auditAction === 'EXPIRE') && !rejectReason.trim()) return;
    setAuditing(true);
    try {
      await tab.auditFn(detail.id, {
        action: auditAction,
        rejectReason: auditAction === 'REJECT' || auditAction === 'EXPIRE' ? rejectReason.trim() : undefined,
      });
      setAuditOpen(false);
      await loadDetail(detail.id, historyPage);
      await fetchList();
      await fetchStats();
    } finally {
      setAuditing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{tab.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">内容审核 / {tab.title}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="rounded-md border border-[#E6EDF7] bg-[#F7FAFE] p-4">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-xl font-semibold text-[#1F2433]">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <QueryField label="用户搜索">
              <Input
                placeholder="姓名/昵称/手机号/身份证/标签"
                value={keyword}
                onChange={(event) => { setKeyword(event.target.value); setPage(1); }}
              />
            </QueryField>
            <QueryField label={tab.key === 'photos' ? '图片类型' : '文本类型'}>
              {tab.key === 'photos' ? (
                <Select options={IMAGE_TYPE_OPTIONS} value={imageType} onChange={(value) => { setImageType(value); setPage(1); }} />
              ) : (
                <Select options={TEXT_TYPE_OPTIONS} value={textType} onChange={(value) => { setTextType(value); setPage(1); }} />
              )}
            </QueryField>
            <QueryField label="提交时间">
              <Select options={SUBMIT_TIME_OPTIONS} value={submitTime} onChange={(value) => { setSubmitTime(value); setPage(1); }} />
            </QueryField>
            <QueryField label="审核状态">
              <Select options={STATUS_OPTIONS} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
            </QueryField>
            <QueryField label="审核来源">
              <Select options={AUDIT_SOURCE_OPTIONS} value={auditSource} onChange={(value) => { setAuditSource(value); setPage(1); }} />
            </QueryField>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={fetchList}>
              <Search className="mr-1 h-4 w-4" /> 搜索
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setKeyword('');
                setStatus('');
                setAuditSource('');
                setSubmitTime('');
                setImageType('');
                setTextType('');
                setPage(1);
              }}
            >
              <RotateCcw className="mr-1 h-4 w-4" /> 重置
            </Button>
          </div>

          <h2 className="text-base font-semibold text-[#1F2433]">{tab.listTitle}</h2>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                {tab.key === 'photos' ? (
                  <>
                    <TableHead>类型</TableHead>
                    <TableHead>图片</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>类型</TableHead>
                    <TableHead>文本摘要</TableHead>
                  </>
                )}
                <TableHead>提交时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>驳回/失效原因</TableHead>
                <TableHead>审核来源</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : list.map((row) => {
                const statusBadge = badgeOf(row.status);
                const imageUrl = row.imageUrl || row.contentPreview;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9" src={row.avatar || undefined} fallback={row.nickname?.[0] || 'U'} />
                        <span className="text-sm font-medium">{row.nickname || '-'}</span>
                      </div>
                    </TableCell>
                    {tab.key === 'photos' ? (
                      <>
                        <TableCell>{row.imageType || '-'}</TableCell>
                        <TableCell>
                          {imageUrl ? (
                            <button type="button" onClick={() => setPreviewUrl(imageUrl)}>
                              <Avatar className="h-10 w-10 rounded-md" src={imageUrl} fallback="图" />
                            </button>
                          ) : '-'}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{row.textType || '-'}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-muted-foreground">
                          {row.textSummary || row.contentPreview || '-'}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-muted-foreground">{row.submitTime || '-'}</TableCell>
                    <TableCell><Badge variant={statusBadge.variant}>{statusBadge.label}</Badge></TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">{row.rejectReason || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{AUDIT_SOURCE_MAP[row.auditSource] || row.auditSource || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => loadDetail(row.id, 1)}>
                        <Eye className="mr-1 h-4 w-4" /> 详情
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <p className="text-sm text-muted-foreground">{tab.bottomTip}</p>
          <Pagination current={page} total={total} pageSize={10} onChange={setPage} showPageSizeSelector={false} />
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} className="!w-[calc(100vw-96px)] !max-w-[1280px] h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{tab.detailTitle}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pb-28">
          {detailLoading ? (
            <p className="py-4 text-center text-muted-foreground">加载中...</p>
          ) : detail ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11" src={detail.avatar || undefined} fallback={detail.nickname?.[0] || 'U'} />
                  <div>
                    <p className="font-medium">{detail.nickname}</p>
                    <p className="text-xs text-muted-foreground">用户ID: {detail.userId} · {detail.contentType}</p>
                  </div>
                </div>
                <Badge variant={badgeOf(detail.status).variant}>{badgeOf(detail.status).label}</Badge>
              </div>

              <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="h-full rounded-md border border-[#E6EDF7] bg-white p-4">
                  <h4 className="mb-3 text-sm font-medium">{tab.key === 'photos' ? '图片预览' : '文本内容'}</h4>
                  {tab.key === 'photos' ? (
                    <div className="space-y-3">
                      {imageUrls(detail.contentFull).length === 0 ? (
                        <p className="text-sm text-muted-foreground">暂无图片</p>
                      ) : imageUrls(detail.contentFull).map((url) => (
                        <button
                          key={url}
                          type="button"
                          className="flex h-[260px] w-full items-center justify-center overflow-hidden rounded-md bg-[#F7FAFE]"
                          onClick={() => setPreviewUrl(url)}
                        >
                          <img src={url} alt="审核图片" className="h-full w-full object-contain" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md bg-[#F7FAFE] p-3 text-sm leading-6 whitespace-pre-wrap">
                      <p className="mb-2 text-xs text-muted-foreground">字段：{detail.contentField || '-'}</p>
                      {detail.contentFull || '-'}
                    </div>
                  )}
                </div>

                <div className="min-w-0 rounded-md border border-[#E6EDF7] bg-white p-4">
                  <h4 className="text-sm font-medium">审核信息</h4>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded bg-[#F7FAFE] px-3 py-2"><span className="text-muted-foreground">提交时间:</span> {detail.submitTime || '-'}</div>
                    <div className="rounded bg-[#F7FAFE] px-3 py-2"><span className="text-muted-foreground">当前状态:</span> {badgeOf(detail.status).label}</div>
                    <div className="rounded bg-[#F7FAFE] px-3 py-2"><span className="text-muted-foreground">审核来源:</span> {AUDIT_SOURCE_MAP[detail.auditSource] || detail.auditSource || '-'}</div>
                    <div className="rounded bg-[#F7FAFE] px-3 py-2"><span className="text-muted-foreground">内容类型:</span> {tab.key === 'photos' ? detail.imageType || '-' : detail.contentField || '-'}</div>
                  </div>
                  {detail.rejectReason && (
                    <div className="mt-3 rounded bg-[#FFF5F5] px-3 py-2 text-sm">
                      <span className="text-muted-foreground">驳回/失效原因:</span> <span className="text-red-600">{detail.rejectReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {detail.historyPage && (
                <div className="rounded-md border border-[#E6EDF7] bg-white p-4">
                  <h4 className="text-sm font-medium">审核历史记录</h4>
                  <Table className="mt-2 w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">时间</TableHead>
                        <TableHead className="w-[140px]">动作</TableHead>
                        <TableHead className="w-[180px]">状态变化</TableHead>
                        <TableHead className="w-[110px]">来源</TableHead>
                        <TableHead className="w-[110px]">操作人</TableHead>
                        <TableHead>原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail.historyPage.records || []).length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无历史</TableCell></TableRow>
                      ) : detail.historyPage.records.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell className="text-muted-foreground">{history.createTime || '-'}</TableCell>
                          <TableCell>{AUDIT_ACTION_MAP[history.action] || history.action || '-'}</TableCell>
                          <TableCell>{(STATUS_MAP[history.fromStatus]?.label || history.fromStatus || '-') + ' -> ' + (STATUS_MAP[history.toStatus]?.label || history.toStatus || '-')}</TableCell>
                          <TableCell>{AUDIT_SOURCE_MAP[history.auditSource] || history.auditSource || '-'}</TableCell>
                          <TableCell>{history.operatorName || '-'}</TableCell>
                          <TableCell className="truncate">{history.reason || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    current={historyPage}
                    total={detail.historyPage.total || 0}
                    pageSize={5}
                    onChange={(nextPage) => loadDetail(detail.id, nextPage)}
                    showPageSizeSelector={false}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="py-4 text-center text-muted-foreground">加载详情失败</p>
          )}
        </div>

        {!detailLoading && detail && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-[#E6EDF7] bg-card px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" onClick={() => openAudit('APPROVE')}>
                <CheckCircle className="mr-1 h-4 w-4" /> 通过
              </Button>
              <Button variant="destructive" size="sm" onClick={() => openAudit('REJECT')}>
                <XCircle className="mr-1 h-4 w-4" /> 驳回
              </Button>
              <Button variant="outline" size="sm" onClick={() => openAudit('EXPIRE')}>
                失效
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!previewUrl} onClose={() => setPreviewUrl(null)} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>图片预览</DialogTitle>
        </DialogHeader>
        {previewUrl && (
          <div className="mt-4 overflow-hidden rounded-md border border-[#E6EDF7] bg-[#F7FAFE]">
            <img src={previewUrl} alt="图片预览" className="max-h-[70vh] w-full object-contain" />
          </div>
        )}
      </Dialog>

      <Dialog open={auditOpen} onClose={() => setAuditOpen(false)}>
        <DialogHeader>
          <DialogTitle>{auditAction === 'APPROVE' ? '通过确认' : auditAction === 'REJECT' ? '驳回确认' : '失效确认'}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="rounded-md bg-[#FFF7E8] p-3 text-sm text-[#8A5A00]">
            {auditAction === 'APPROVE'
              ? '确认通过后会写入审核结果和审核历史。'
              : auditAction === 'REJECT'
                ? '驳回原因必填，确认后会写入审核历史。'
                : '失效原因必填，确认后会把该审核记录标记为已失效。'}
          </div>
          {(auditAction === 'REJECT' || auditAction === 'EXPIRE') && (
            <div>
              <label className="text-sm font-medium">{auditAction === 'REJECT' ? '驳回原因' : '失效原因'}</label>
              <Input
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder={auditAction === 'REJECT' ? '请输入驳回原因' : '请输入失效原因'}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAuditOpen(false)}>取消</Button>
            <Button onClick={handleAudit} disabled={auditing || ((auditAction === 'REJECT' || auditAction === 'EXPIRE') && !rejectReason.trim())}>
              {auditing ? '处理中...' : '确认'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
