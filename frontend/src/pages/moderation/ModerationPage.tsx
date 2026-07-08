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
  auditPhoto,
  auditText,
  type ModerationVO,
  type ModerationDetailVO,
  type PageResult,
  type VerificationPageParams,
} from '@/api/verification';

type TabConfig = {
  key: string;
  title: string;
  fetchFn: (params: VerificationPageParams) => Promise<any>;
  detailFn: (id: number) => Promise<any>;
  auditFn: (id: number, data: { action: string; rejectReason?: string }) => Promise<any>;
  detailTitle: string;
};

type StatItem = { label: string; value: string; note: string };

const TABS: Record<string, TabConfig> = {
  '/moderation/photos': {
    key: 'photos',
    title: '资料图片审核',
    fetchFn: getPhotoModerationPage,
    detailFn: getPhotoModerationDetail,
    auditFn: auditPhoto,
    detailTitle: '照片审核详情',
  },
  '/moderation/texts': {
    key: 'texts',
    title: '开放性文字审核',
    fetchFn: getTextModerationPage,
    detailFn: getTextModerationDetail,
    auditFn: auditText,
    detailTitle: '开放性文字审核详情',
  },
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待审核' },
  { value: 'SENSITIVE_HIT', label: '敏感命中' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
];

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  PENDING: { label: '待审核', variant: 'warning' },
  SENSITIVE_HIT: { label: '敏感命中', variant: 'warning' },
  APPROVED: { label: '已通过', variant: 'success' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  NOT_SUBMITTED: { label: '未提交', variant: 'secondary' },
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

const CONTENT_TYPE_MAP: Record<string, string> = {
  '照片': '照片',
  '图片': '图片',
  '文字': '文字',
};

const SUBMIT_TIME_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: 'TODAY', label: '今天' },
  { value: 'LAST_7_DAYS', label: '近7天' },
];

const IMAGE_TYPE_OPTIONS = [
  { value: '', label: '相册/背景图' },
  { value: 'ALBUM', label: '相册' },
  { value: 'BACKGROUND', label: '背景图' },
];

const TEXT_TYPE_OPTIONS = [
  { value: '', label: '全部文本' },
  { value: 'ABOUT_ME', label: '关于我' },
  { value: 'HOPE_THEY_KNOW', label: '希望 TA 了解' },
  { value: 'PROFILE_QA', label: '资料问答' },
];

const MODULE_STATS: Record<string, { label: string; value: string; note: string }[]> = {
  photos: [
    { label: '待审核', value: '204', note: '内容审核' },
    { label: '背景图', value: '28', note: '独立字段' },
    { label: '今日通过', value: '712', note: '刷新' },
    { label: '今日驳回', value: '66', note: '通知' },
  ],
  texts: [
    { label: '待审核', value: '188', note: '内容审核' },
    { label: '敏感命中', value: '24', note: '复核' },
    { label: '今日通过', value: '603', note: '刷新' },
    { label: '今日驳回', value: '58', note: '通知' },
  ],
};

function QueryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="block text-xs font-medium text-[#5F6675]">{label}</span>
      {children}
    </label>
  );
}

function auditListActionLabel(moduleKey: string, record: ModerationVO): string {
  if (moduleKey === 'photos') {
    if (record.status === 'PENDING') return '查看大图';
    if (record.status === 'REJECTED') return '复核';
    if (record.status === 'APPROVED') return '详情';
    return '查看';
  }
  if (record.status === 'SENSITIVE_HIT') return '复核';
  if (record.status === 'APPROVED') return '详情';
  return '查看';
}

function canAuditAction(moduleKey: string, status?: string): boolean {
  if (status === 'PENDING') return true;
  if (moduleKey === 'texts' && status === 'SENSITIVE_HIT') return true;
  if (moduleKey === 'photos' && status === 'REJECTED') return true;
  return false;
}

export default function ModerationPage() {
  const location = useLocation();
  const currentPath = Object.keys(TABS).find((p) => location.pathname.startsWith(p)) || '/moderation/photos';
  const tab = TABS[currentPath];

  const [list, setList] = useState<ModerationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [auditSource, setAuditSource] = useState('');
  const [submitTime, setSubmitTime] = useState('');
  const [imageType, setImageType] = useState('');
  const [textType, setTextType] = useState('');
  const [loading, setLoading] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<ModerationVO | null>(null);
  const [auditAction, setAuditAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectReason, setRejectReason] = useState('');
  const [auditing, setAuditing] = useState(false);

  // 详情弹窗状态。
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ModerationDetailVO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
    const totalOf = async (params: Partial<VerificationPageParams>) => {
      const res = await tab.fetchFn({ page: 1, size: 1, ...params });
      const data = res.data as PageResult<ModerationVO>;
      return data.total ?? 0;
    };
    try {
      if (tab.key === 'photos') {
        const [pending, background, approvedToday, rejectedToday] = await Promise.all([
          totalOf({ status: 'PENDING' }),
          totalOf({ imageType: 'BACKGROUND' }),
          totalOf({ status: 'APPROVED', submitTime: 'TODAY' }),
          totalOf({ status: 'REJECTED', submitTime: 'TODAY' }),
        ]);
        setStats([
          { label: '待审核', value: String(pending), note: '内容审核' },
          { label: '背景图', value: String(background), note: '独立字段' },
          { label: '今日通过', value: String(approvedToday), note: '接口统计' },
          { label: '今日驳回', value: String(rejectedToday), note: '接口统计' },
        ]);
      } else {
        const [pending, sensitiveHit, approvedToday, rejectedToday] = await Promise.all([
          totalOf({ status: 'PENDING' }),
          totalOf({ status: 'SENSITIVE_HIT' }),
          totalOf({ status: 'APPROVED', submitTime: 'TODAY' }),
          totalOf({ status: 'REJECTED', submitTime: 'TODAY' }),
        ]);
        setStats([
          { label: '待审核', value: String(pending), note: '内容审核' },
          { label: '敏感命中', value: String(sensitiveHit), note: '复核' },
          { label: '今日通过', value: String(approvedToday), note: '接口统计' },
          { label: '今日驳回', value: String(rejectedToday), note: '接口统计' },
        ]);
      }
    } catch {
      setStats(MODULE_STATS[tab.key].map((item) => ({ ...item, value: '0' })));
    }
  }, [tab]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function openDetail(record: ModerationVO) {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await tab.detailFn(record.id);
      setDetail(res.data as ModerationDetailVO);
    } finally {
      setDetailLoading(false);
    }
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
      fetchStats();
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
          <Button variant="outline" size="sm">{tab.key === 'photos' ? '图库规则' : '文本规则'}</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="rounded-md border border-[#E6EDF7] bg-[#F7FAFE] p-4">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-xl font-semibold text-[#1F2433]">{item.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <QueryField label="用户搜索">
              <Input
                placeholder="姓名/昵称/手机号/身份证/标签"
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              />
            </QueryField>
            <QueryField label={tab.key === 'photos' ? '图片类型' : '文本类型'}>
              {tab.key === 'photos' ? (
                <Select
                  options={IMAGE_TYPE_OPTIONS}
                  value={imageType}
                  onChange={(v) => { setImageType(v); setPage(1); }}
                />
              ) : (
                <Select
                  options={TEXT_TYPE_OPTIONS}
                  value={textType}
                  onChange={(v) => { setTextType(v); setPage(1); }}
                />
              )}
            </QueryField>
            <QueryField label="提交时间">
              <Select
                options={SUBMIT_TIME_OPTIONS}
                value={submitTime}
                onChange={(v) => { setSubmitTime(v); setPage(1); }}
              />
            </QueryField>
            <QueryField label="审核状态">
              <Select
                options={STATUS_OPTIONS}
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
              />
            </QueryField>
            <QueryField label="审核来源">
              <Select
                options={AUDIT_SOURCE_OPTIONS}
                value={auditSource}
                onChange={(v) => { setAuditSource(v); setPage(1); }}
              />
            </QueryField>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={fetchList}>
              <Search className="h-4 w-4 mr-1" /> 搜索
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
              <RotateCcw className="h-4 w-4 mr-1" /> 重置
            </Button>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#1F2433]">{tab.key === 'photos' ? '资料图片审核列表' : '开放性文字审核列表'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab.key === 'photos' ? '相册图片与资料背景图，不影响主头像认证' : '关于我、希望 TA 了解、资料问答等开放文本，驳回原因必填'}
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                {tab.key === 'photos' ? (
                  <>
                    <TableHead>类型</TableHead>
                    <TableHead>分类</TableHead>
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
                <TableHead>审核来源</TableHead>
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
                    {tab.key === 'photos' ? (
                      <>
                        <TableCell>{v.imageType || CONTENT_TYPE_MAP[v.contentType] || '-'}</TableCell>
                        <TableCell>{v.imageCategory || '-'}</TableCell>
                        <TableCell>
                          {v.imageUrl || v.contentPreview ? (
                            <Avatar className="h-10 w-10 rounded-md" src={v.imageUrl || v.contentPreview} fallback="图" />
                          ) : '-'}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{v.textType || CONTENT_TYPE_MAP[v.contentType] || '-'}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">
                          {v.textSummary || v.contentPreview || '-'}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-muted-foreground">{v.submitTime || '-'}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{AUDIT_SOURCE_MAP[v.auditSource] || v.auditSource || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openDetail(v)}>
                        <Eye className="h-4 w-4 mr-1" /> {auditListActionLabel(tab.key, v)}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <p className="text-sm text-muted-foreground">
            {tab.key === 'photos'
              ? '单张原图只在审核弹窗内查看；资料背景图不计入相册计数。确认后写入审计日志。'
              : '开放性文字不展示联系方式原文；命中内容仅在详情弹窗脱敏展示。查看敏感二次确认后确认后写入审计日志。'}
          </p>

          <Pagination current={page} total={total} onChange={setPage} />
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{tab.detailTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {detailLoading ? (
            <p className="text-center text-muted-foreground py-4">加载中…</p>
          ) : detail ? (
            <>
              {/* 用户信息 */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-md">
                <Avatar className="h-10 w-10" src={detail.avatar || undefined} fallback={detail.nickname?.[0] || 'U'} />
                <div>
                  <p className="font-medium">{detail.nickname}</p>
                  <p className="text-xs text-muted-foreground">用户ID: {detail.userId} · {CONTENT_TYPE_MAP[detail.contentType] || detail.contentType}</p>
                </div>
              </div>

              {/* 完整审核内容 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">审核内容</h4>
                {detail.contentType === '照片' ? (
                  <div className="space-y-2">
                    {detail.contentFull ? (
                      (() => {
                        try {
                          const urls: string[] = JSON.parse(detail.contentFull);
                          return urls.map((url, i) => (
                            <img key={i} src={url} alt={`照片${i + 1}`} className="max-w-full rounded-md border" />
                          ));
                        } catch {
                          return <img src={detail.contentFull} alt="照片" className="max-w-full rounded-md border" />;
                        }
                      })()
                    ) : (
                      <p className="text-sm text-muted-foreground">暂无照片</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {detail.contentField && (
                      <p className="text-xs text-muted-foreground">字段: {detail.contentField}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                      {detail.contentFull || '-'}
                    </p>
                  </div>
                )}
              </div>

              {/* 审核信息 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">审核信息</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">提交时间:</span> {detail.submitTime || '-'}</div>
                  <div><span className="text-muted-foreground">状态:</span> <Badge variant={STATUS_MAP[detail.status]?.variant || 'secondary'}>{STATUS_MAP[detail.status]?.label || detail.status}</Badge></div>
                  <div><span className="text-muted-foreground">审核来源:</span> {AUDIT_SOURCE_MAP[detail.auditSource] || detail.auditSource || '-'}</div>
                </div>
                {detail.rejectReason && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">驳回原因:</span> <span className="text-red-600">{detail.rejectReason}</span>
                  </div>
                )}
              </div>

              {/* 只有待处理或需复核状态才展示审核动作。 */}
              {canAuditAction(tab.key, detail.status) && (
                <div className="space-y-3 border-t pt-4">
                  {tab.key === 'photos' && <Button variant="outline" size="sm">下载原图确认</Button>}
                  {tab.key === 'texts' && <Button variant="outline" size="sm">查看敏感二次确认</Button>}
                  <div>
                    <label className="text-sm font-medium">审核操作</label>
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" onClick={() => { setAuditTarget({ id: detail.id } as ModerationVO); setAuditAction('APPROVE'); setRejectReason(''); setAuditOpen(true); }}>
                        <CheckCircle className="h-4 w-4 mr-1" /> 通过
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => { setAuditTarget({ id: detail.id } as ModerationVO); setAuditAction('REJECT'); setRejectReason(''); setAuditOpen(true); }}>
                        <XCircle className="h-4 w-4 mr-1" /> 驳回
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-4">加载详情失败</p>
          )}
        </div>
      </Dialog>

      {/* 审核二次确认弹窗 */}
      <Dialog open={auditOpen} onClose={() => setAuditOpen(false)}>
        <DialogHeader>
          <DialogTitle>{auditAction === 'APPROVE' ? '通过确认' : '驳回确认'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="rounded-md bg-[#FFF7E8] p-3 text-sm text-[#8A5A00]">
            {auditAction === 'APPROVE' ? '通过后刷新内容状态并通知用户。' : '驳回原因必填，确认后同步 App 端。'}
            <strong className="ml-1">确认后写入审计日志</strong>
          </div>
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
