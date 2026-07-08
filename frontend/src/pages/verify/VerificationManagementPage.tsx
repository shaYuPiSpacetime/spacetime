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
  type VerificationPageParams,
} from '@/api/verification';

type TabConfig = {
  key: string;
  title: string;
  fetchFn: (params: VerificationPageParams) => Promise<any>;
  detailFn: (id: number) => Promise<any>;
  auditFn: (id: number, data: { action: string; rejectReason?: string }) => Promise<any>;
  statusOptions: { value: string; label: string }[];
  detailTitle: string;
};

type StatItem = { label: string; value: string; note: string };

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
  FACE_FAILED: { label: '人像失败', variant: 'warning' },
  CONFLICT: { label: '冲突', variant: 'warning' },
  NOT_CERTIFIED: { label: '未认证', variant: 'secondary' },
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

const SUBMIT_TIME_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: 'TODAY', label: '今天' },
  { value: 'LAST_7_DAYS', label: '近7天' },
];

const FACE_RECOGNITION_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'PORTRAIT', label: '是人像' },
  { value: 'FAILED', label: '人像失败' },
];

const CORE_ACCESS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'CORE_ALLOWED', label: '已开放' },
  { value: 'CORE_PENDING', label: '未开放' },
];

const EDUCATION_METHOD_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'CHSI', label: '学信网验证码' },
  { value: 'STUDENT_CARD', label: '学生证材料' },
];

const MODULE_STATS: Record<string, { label: string; value: string; note: string }[]> = {
  avatar: [
    { label: '待审核', value: '318', note: '优先' },
    { label: '人像失败', value: '27', note: '复核' },
    { label: '今日通过', value: '1,204', note: '刷新' },
    { label: '今日驳回', value: '96', note: '通知' },
  ],
  'real-name': [
    { label: '待审核', value: '142', note: '三要素' },
    { label: '冲突记录', value: '9', note: '复核' },
    { label: '今日通过', value: '526', note: '站内信' },
    { label: '今日驳回', value: '31', note: '通知' },
  ],
  education: [
    { label: '待审核', value: '96', note: '材料' },
    { label: '临近 SLA', value: '18', note: '提醒' },
    { label: '今日通过', value: '402', note: '刷新' },
    { label: '今日驳回', value: '22', note: '通知' },
  ],
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

function auditListActionLabel(moduleKey: string, record: VerificationVO): string {
  if (moduleKey === 'avatar') {
    if (record.status === 'PENDING') return '查看大图';
    if (record.status === 'FACE_FAILED') return '复核';
    if (record.status === 'APPROVED') return '历史';
    return '查看';
  }
  if (moduleKey === 'real-name') {
    if (record.status === 'PENDING') return '查看详情';
    if (record.status === 'CONFLICT' || record.status === 'REJECTED') return '复审';
    if (record.status === 'APPROVED') return '详情';
    return '查看';
  }
  if (record.status === 'PENDING') return '查看';
  if (record.status === 'APPROVED') return '详情';
  if (record.status === 'REJECTED') return '查看';
  return '复核';
}

function canAuditAction(moduleKey: string, status?: string): boolean {
  if (status === 'PENDING') return true;
  if (moduleKey === 'avatar' && status === 'FACE_FAILED') return true;
  if (moduleKey === 'real-name' && (status === 'CONFLICT' || status === 'REJECTED')) return true;
  return false;
}

function QueryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="block text-xs font-medium text-[#5F6675]">{label}</span>
      {children}
    </label>
  );
}

export default function VerificationManagementPage() {
  const location = useLocation();
  const currentPath = Object.keys(TABS).find((p) => location.pathname.startsWith(p)) || '/verify/real-name';
  const tab = TABS[currentPath];

  const [list, setList] = useState<VerificationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [auditSource, setAuditSource] = useState('');
  const [submitTime, setSubmitTime] = useState('');
  const [faceRecognition, setFaceRecognition] = useState('');
  const [coreAccessStatus, setCoreAccessStatus] = useState('');
  const [educationMethod, setEducationMethod] = useState('');
  const [loading, setLoading] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<VerificationVO | null>(null);
  const [auditAction, setAuditAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectReason, setRejectReason] = useState('');
  const [auditing, setAuditing] = useState(false);

  // 详情弹窗状态。
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
        auditSource: auditSource || undefined,
        submitTime: submitTime || undefined,
        faceRecognition: tab.key === 'avatar' ? faceRecognition || undefined : undefined,
        coreAccessStatus: tab.key === 'real-name' ? coreAccessStatus || undefined : undefined,
        educationMethod: tab.key === 'education' ? educationMethod || undefined : undefined,
      });
      const data = res.data as PageResult<VerificationVO>;
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [auditSource, coreAccessStatus, educationMethod, faceRecognition, keyword, page, status, submitTime, tab]);

  const fetchStats = useCallback(async () => {
    const totalOf = async (params: Partial<VerificationPageParams>) => {
      const res = await tab.fetchFn({ page: 1, size: 1, ...params });
      const data = res.data as PageResult<VerificationVO>;
      return data.total ?? 0;
    };
    try {
      if (tab.key === 'avatar') {
        const [pending, faceFailed, approvedToday, rejectedToday] = await Promise.all([
          totalOf({ status: 'PENDING' }),
          totalOf({ status: 'FACE_FAILED' }),
          totalOf({ status: 'APPROVED', submitTime: 'TODAY' }),
          totalOf({ status: 'REJECTED', submitTime: 'TODAY' }),
        ]);
        setStats([
          { label: '待审核', value: String(pending), note: '实时' },
          { label: '人像失败', value: String(faceFailed), note: '复核' },
          { label: '今日通过', value: String(approvedToday), note: '接口统计' },
          { label: '今日驳回', value: String(rejectedToday), note: '接口统计' },
        ]);
      } else if (tab.key === 'real-name') {
        const [pending, conflict, approvedToday, rejectedToday] = await Promise.all([
          totalOf({ status: 'PENDING' }),
          totalOf({ status: 'CONFLICT' }),
          totalOf({ status: 'APPROVED', submitTime: 'TODAY' }),
          totalOf({ status: 'REJECTED', submitTime: 'TODAY' }),
        ]);
        setStats([
          { label: '待审核', value: String(pending), note: '三要素' },
          { label: '冲突记录', value: String(conflict), note: '复核' },
          { label: '今日通过', value: String(approvedToday), note: '接口统计' },
          { label: '今日驳回', value: String(rejectedToday), note: '接口统计' },
        ]);
      } else {
        const [pending, last7Days, approvedToday, rejectedToday] = await Promise.all([
          totalOf({ status: 'PENDING' }),
          totalOf({ submitTime: 'LAST_7_DAYS' }),
          totalOf({ status: 'APPROVED', submitTime: 'TODAY' }),
          totalOf({ status: 'REJECTED', submitTime: 'TODAY' }),
        ]);
        setStats([
          { label: '待审核', value: String(pending), note: '材料' },
          { label: '近7天提交', value: String(last7Days), note: '接口统计' },
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
      fetchStats();
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
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{tab.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">用户管理 / {tab.title}</p>
          </div>
          {tab.key === 'real-name' && <Button variant="outline" size="sm">高敏审计</Button>}
          {tab.key === 'education' && <Button variant="outline" size="sm">学历规则</Button>}
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
            <QueryField label="提交时间">
              <Select
                options={SUBMIT_TIME_OPTIONS}
                value={submitTime}
                onChange={(v) => { setSubmitTime(v); setPage(1); }}
              />
            </QueryField>
            <QueryField label="审核状态">
              <Select
                options={tab.statusOptions}
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
            {tab.key === 'avatar' && (
              <QueryField label="人像识别">
                <Select
                  options={FACE_RECOGNITION_OPTIONS}
                  value={faceRecognition}
                  onChange={(v) => { setFaceRecognition(v); setPage(1); }}
                />
              </QueryField>
            )}
            {tab.key === 'real-name' && (
              <QueryField label="核心准入">
                <Select
                  options={CORE_ACCESS_OPTIONS}
                  value={coreAccessStatus}
                  onChange={(v) => { setCoreAccessStatus(v); setPage(1); }}
                />
              </QueryField>
            )}
            {tab.key === 'education' && (
              <QueryField label="认证方式">
                <Select
                  options={EDUCATION_METHOD_OPTIONS}
                  value={educationMethod}
                  onChange={(v) => { setEducationMethod(v); setPage(1); }}
                />
              </QueryField>
            )}
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
                setFaceRecognition('');
                setCoreAccessStatus('');
                setEducationMethod('');
                setPage(1);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> 重置
            </Button>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#1F2433]">
              {tab.key === 'avatar' ? '头像审核列表' : tab.key === 'real-name' ? '实名审核列表' : '学历审核列表'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab.key === 'avatar' && '主列表展示列表和公共分页，不展开图片详情'}
              {tab.key === 'real-name' && '姓名、身份证号、手机号默认脱敏'}
              {tab.key === 'education' && '学信网验证码与学生证材料分开审核，海外学历暂不支持。'}
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                {tab.key === 'real-name' && (
                  <>
                    <TableHead>手机号</TableHead>
                    <TableHead>真实姓名</TableHead>
                    <TableHead>身份证号</TableHead>
                  </>
                )}
                {tab.key === 'education' && (
                  <>
                    <TableHead>身份</TableHead>
                    <TableHead>学历材料</TableHead>
                    <TableHead>提交时间</TableHead>
                  </>
                )}
                {tab.key === 'avatar' && (
                  <>
                    <TableHead>头像</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead>驳回原因</TableHead>
                  </>
                )}
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
                    {tab.key === 'real-name' && (
                      <>
                        <TableCell className="text-muted-foreground">{v.phone || '-'}</TableCell>
                        <TableCell>{v.realName || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{v.idCard || '-'}</TableCell>
                      </>
                    )}
                    {tab.key === 'education' && (
                      <>
                        <TableCell>{v.educationIdentity || '-'}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">{v.educationMaterialSummary || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{v.submitTime || '-'}</TableCell>
                      </>
                    )}
                    {tab.key === 'avatar' && (
                      <>
                        <TableCell>
                          <Avatar className="h-10 w-10 rounded-md" src={v.avatarUrl || v.avatar || undefined} fallback={v.nickname?.[0] || 'U'} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{v.submitTime || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{v.rejectReason || '-'}</TableCell>
                      </>
                    )}
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
            {tab.key === 'avatar' && '头像审核仅针对单张头像，不影响资料相册内容状态。'}
            {tab.key === 'real-name' && '后台不展示人脸核身；单条承诺仅校验三要素，不作为准入认证。查看高敏二次确认后确认后写入审计日志。'}
            {tab.key === 'education' && '学历通过后仅更新学历认证状态，不自动覆盖用户基础资料字段。'}
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
                  <p className="text-xs text-muted-foreground">用户ID: {detail.userId} · 认证等级: Lv.{detail.verifyLevel ?? 0}</p>
                </div>
              </div>

              {/* 认证内容 */}
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

              {/* 审核信息 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">审核信息</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">提交时间:</span> {detail.submitTime || '-'}</div>
                  <div><span className="text-muted-foreground">审核时间:</span> {detail.resultTime || '-'}</div>
                  <div><span className="text-muted-foreground">审核来源:</span> {AUDIT_SOURCE_MAP[detail.auditSource] || detail.auditSource || '-'}</div>
                </div>
                {detail.rejectReason && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">驳回原因:</span> <span className="text-red-600">{detail.rejectReason}</span>
                  </div>
                )}
              </div>

              {/* 只有可审核状态才展示通过/驳回，列表页只负责进入详情。 */}
              {canAuditAction(tab.key, detail.status) && (
                <div className="space-y-3 border-t pt-4">
                  {auditTarget == null ? (
                    <div className="space-y-3">
                      {tab.key === 'real-name' && (
                        <Button variant="outline" size="sm">查看高敏二次确认</Button>
                      )}
                      {tab.key === 'avatar' && (
                        <Button variant="outline" size="sm">下载原图确认</Button>
                      )}
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

      {/* 审核二次确认弹窗 */}
      <Dialog open={auditOpen} onClose={() => setAuditOpen(false)}>
        <DialogHeader>
          <DialogTitle>{auditAction === 'APPROVE' ? '通过确认' : '驳回确认'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="rounded-md bg-[#FFF7E8] p-3 text-sm text-[#8A5A00]">
            {auditAction === 'APPROVE' ? '通过后发送站内信，并重算核心准入状态。' : '驳回原因必填，确认后发送站内信。'}
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
