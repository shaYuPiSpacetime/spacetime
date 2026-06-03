import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RefreshCcw, Search, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/usePermission';
import {
  auditCommunityComment,
  auditCommunityPost,
  getCommunityCommentPage,
  getCommunityConfigs,
  getCommunityHomeTabs,
  getCommunityPostPage,
  getCommunityReportPage,
  handleCommunityReport,
  saveCommunityConfigs,
  type AppConfigVO,
  type CommunityCommentAdminVO,
  type CommunityPostAdminVO,
  type CommunityReportAdminVO,
  type MobileEntryConfigVO,
  type PageResult,
} from '@/api/community';
import { cn } from '@/lib/utils';

type TabKey = 'posts' | 'comments' | 'reports' | 'configs';

const TABS: { key: TabKey; title: string; path: string }[] = [
  { key: 'posts', title: '内容审核', path: '/community/posts' },
  { key: 'comments', title: '评论审核', path: '/community/comments' },
  { key: 'reports', title: '举报处理', path: '/community/reports' },
  { key: 'configs', title: '社区配置', path: '/community/configs' },
];

const POST_TYPE_OPTIONS = [
  { value: '', label: '全部内容类型' },
  { value: 'community', label: '社区动态' },
  { value: 'sincere_post', label: '诚意贴' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待发布/待处理' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'DELETED', label: '已删除' },
  { value: 'BLOCKED', label: '已屏蔽' },
];

const AUDIT_OPTIONS = [
  { value: '', label: '全部审核状态' },
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '审核通过' },
  { value: 'REJECTED', label: '审核驳回' },
];

const REPORT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待处理' },
  { value: 'RESOLVED', label: '已处理' },
  { value: 'REJECTED', label: '已驳回' },
];

const REPORT_TARGET_OPTIONS = [
  { value: '', label: '全部目标' },
  { value: 'post', label: '动态' },
  { value: 'comment', label: '评论' },
  { value: 'user', label: '用户' },
];

const REPORT_ACTION_OPTIONS = [
  { value: 'DISMISS', label: '驳回举报' },
  { value: 'BLOCK_POST', label: '下架动态' },
  { value: 'BLOCK_COMMENT', label: '屏蔽评论' },
  { value: 'WARN_USER', label: '警告用户' },
];

// ==================== 标签映射（英文值 → 中文展示） ====================

const CONTENT_STATUS_LABELS: Record<string, string> = {
  PENDING: '待发布',
  PUBLISHED: '已发布',
  REJECTED: '已驳回',
  DELETED: '已删除',
  BLOCKED: '已屏蔽',
};

const AUDIT_STATUS_LABELS: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '审核通过',
  REJECTED: '审核驳回',
};

const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: '待处理',
  RESOLVED: '已处理',
  REJECTED: '已驳回',
};

const POST_TYPE_LABELS: Record<string, string> = {
  community: '社区动态',
  sincere_post: '诚意贴',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  post: '动态',
  comment: '评论',
  user: '用户',
};

const HANDLE_ACTION_LABELS: Record<string, string> = {
  DISMISS: '驳回举报',
  BLOCK_POST: '下架动态',
  BLOCK_COMMENT: '屏蔽评论',
  WARN_USER: '警告用户',
};

const CONFIG_TYPE_LABELS: Record<string, string> = {
  TEXT: '文本',
  NUMBER: '数字',
  BOOLEAN: '开关',
};

const CONFIG_KEY_LABELS: Record<string, string> = {
  'community.interaction_gate_mode': '互动准入模式',
  'community.post_max_images': '动态图片上限',
  'community.post_max_text_length': '动态文字上限',
  'community.sincere_post_min_text_length': '诚意贴正文下限',
  'community.report_entry_enabled': '举报入口开关',
  'community.contact_info_allowed': '联系方式开关',
  'community.post_max_mentions': '@用户人数上限',
};

const GATE_MODE_OPTIONS = [
  { value: 'LOGIN_ONLY', label: '仅登录' },
  { value: 'FULL_CERT', label: '三项认证（未落地勿选）' },
];

const BOOL_OPTIONS = [
  { value: 'true', label: '开启' },
  { value: 'false', label: '关闭' },
];

function pageData<T>(res: unknown): PageResult<T> {
  return ((res as any).data ?? { records: [], total: 0, current: 1, size: 10 }) as PageResult<T>;
}

function getTabFromPath(pathname: string): TabKey {
  return TABS.find((tab) => pathname.startsWith(tab.path))?.key ?? 'posts';
}

function clabel(value: string | undefined, labels: Record<string, string>): string {
  if (!value) return '-';
  return labels[value] ?? value;
}

function statusBadge(status?: string) {
  if (!status) return <span>-</span>;
  const allLabels = { ...CONTENT_STATUS_LABELS, ...AUDIT_STATUS_LABELS, ...REPORT_STATUS_LABELS };
  const label = clabel(status, allLabels);
  const success = status === 'PUBLISHED' || status === 'APPROVED' || status === 'RESOLVED';
  const warning = status === 'PENDING';
  const danger = status === 'REJECTED' || status === 'DELETED' || status === 'BLOCKED';
  return (
    <Badge variant={success ? 'success' : warning ? 'warning' : danger ? 'destructive' : 'secondary'}>
      {label}
    </Badge>
  );
}

export default function CommunityManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getTabFromPath(location.pathname);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {activeTab === 'posts' && <PostsPanel />}
      {activeTab === 'comments' && <CommentsPanel />}
      {activeTab === 'reports' && <ReportsPanel />}
      {activeTab === 'configs' && <ConfigsPanel />}
    </div>
  );
}

function PostsPanel() {
  const { hasPermission } = usePermission();
  const [list, setList] = useState<CommunityPostAdminVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', postType: '', auditStatus: '' });
  const [query, setQuery] = useState(filters);
  const [auditOpen, setAuditOpen] = useState(false);
  const [current, setCurrent] = useState<CommunityPostAdminVO | null>(null);
  const [auditStatus, setAuditStatus] = useState('APPROVED');
  const [auditRemark, setAuditRemark] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<CommunityPostAdminVO>(await getCommunityPostPage({
        page,
        size: 10,
        keyword: query.keyword || undefined,
        postType: query.postType || undefined,
        auditStatus: query.auditStatus || undefined,
      }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openAudit(row: CommunityPostAdminVO) {
    setCurrent(row);
    setAuditStatus('APPROVED');
    setAuditRemark('');
    setAuditOpen(true);
  }

  async function submitAudit() {
    if (!current) return;
    await auditCommunityPost(current.id, { auditStatus, auditRemark: auditRemark || undefined });
    showToast('审核已提交', 'success');
    setAuditOpen(false);
    fetchList();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>内容审核</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-56" placeholder="搜索标题或正文" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
          <Select className="w-40" options={POST_TYPE_OPTIONS} value={filters.postType} onChange={(v) => setFilters({ ...filters, postType: v })} />
          <Select className="w-40" options={AUDIT_OPTIONS} value={filters.auditStatus} onChange={(v) => setFilters({ ...filters, auditStatus: v })} />
          <Button size="sm" onClick={() => { setPage(1); setQuery(filters); }}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const empty = { keyword: '', postType: '', auditStatus: '' }; setFilters(empty); setPage(1); setQuery(empty); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>作者</TableHead>
              <TableHead>内容类型</TableHead>
              <TableHead>内容摘要</TableHead>
              <TableHead>话题</TableHead>
              <TableHead>点赞/评论/举报</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>审核</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.authorName || '-'}<div className="text-xs text-muted-foreground">{row.authorPhone || '-'}</div></TableCell>
                <TableCell>{clabel(row.postType, POST_TYPE_LABELS)}</TableCell>
                <TableCell className="max-w-[260px] truncate">{row.title ? `${row.title} / ` : ''}{row.content}</TableCell>
                <TableCell>{row.topicName || '-'}</TableCell>
                <TableCell>{row.likeCount}/{row.commentCount}/{row.reportCount}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{statusBadge(row.auditStatus)}</TableCell>
                <TableCell>{row.createTime || '-'}</TableCell>
                <TableCell>
                  {hasPermission('community:post:audit') ? (
                    <Button variant="ghost" size="sm" onClick={() => openAudit(row)}>审核</Button>
                  ) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>

      <Dialog open={auditOpen} onClose={() => setAuditOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>内容审核</DialogTitle>
          <DialogDescription>审核结果会同步更新内容状态</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <Select options={[{ value: 'APPROVED', label: '审核通过' }, { value: 'REJECTED', label: '审核驳回' }]} value={auditStatus} onChange={setAuditStatus} />
          <Input placeholder="审核说明（可选）" value={auditRemark} onChange={(e) => setAuditRemark(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAuditOpen(false)}>取消</Button>
            <Button onClick={submitAudit}><Check className="mr-1 h-4 w-4" />提交</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

function CommentsPanel() {
  const { hasPermission } = usePermission();
  const [list, setList] = useState<CommunityCommentAdminVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', auditStatus: '' });
  const [query, setQuery] = useState(filters);
  const [auditOpen, setAuditOpen] = useState(false);
  const [current, setCurrent] = useState<CommunityCommentAdminVO | null>(null);
  const [auditStatus, setAuditStatus] = useState('APPROVED');
  const [auditRemark, setAuditRemark] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<CommunityCommentAdminVO>(await getCommunityCommentPage({
        page,
        size: 10,
        keyword: query.keyword || undefined,
        auditStatus: query.auditStatus || undefined,
      }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openAudit(row: CommunityCommentAdminVO) {
    setCurrent(row);
    setAuditStatus('APPROVED');
    setAuditRemark('');
    setAuditOpen(true);
  }

  async function submitAudit() {
    if (!current) return;
    await auditCommunityComment(current.id, { auditStatus, auditRemark: auditRemark || undefined });
    showToast('评论审核已提交', 'success');
    setAuditOpen(false);
    fetchList();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>评论审核</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-56" placeholder="搜索评论内容" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} />
          <Select className="w-40" options={AUDIT_OPTIONS} value={filters.auditStatus} onChange={(v) => setFilters({ ...filters, auditStatus: v })} />
          <Button size="sm" onClick={() => { setPage(1); setQuery(filters); }}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const empty = { keyword: '', auditStatus: '' }; setFilters(empty); setPage(1); setQuery(empty); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>作者</TableHead>
              <TableHead>所属动态</TableHead>
              <TableHead>评论内容</TableHead>
              <TableHead>举报数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>审核</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.authorName || '-'}<div className="text-xs text-muted-foreground">{row.authorPhone || '-'}</div></TableCell>
                <TableCell>{row.postId}</TableCell>
                <TableCell className="max-w-[320px] truncate">{row.content}</TableCell>
                <TableCell>{row.reportCount}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{statusBadge(row.auditStatus)}</TableCell>
                <TableCell>{row.createTime || '-'}</TableCell>
                <TableCell>
                  {hasPermission('community:comment:audit') ? (
                    <Button variant="ghost" size="sm" onClick={() => openAudit(row)}>审核</Button>
                  ) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>

      <Dialog open={auditOpen} onClose={() => setAuditOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>评论审核</DialogTitle>
          <DialogDescription>审核结果会同步更新评论状态</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <Select options={[{ value: 'APPROVED', label: '审核通过' }, { value: 'REJECTED', label: '审核驳回' }]} value={auditStatus} onChange={setAuditStatus} />
          <Input placeholder="审核说明（可选）" value={auditRemark} onChange={(e) => setAuditRemark(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAuditOpen(false)}>取消</Button>
            <Button onClick={submitAudit}><Check className="mr-1 h-4 w-4" />提交</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

function ReportsPanel() {
  const { hasPermission } = usePermission();
  const [list, setList] = useState<CommunityReportAdminVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ targetType: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [handleOpen, setHandleOpen] = useState(false);
  const [current, setCurrent] = useState<CommunityReportAdminVO | null>(null);
  const [status, setStatus] = useState('RESOLVED');
  const [action, setAction] = useState('DISMISS');
  const [remark, setRemark] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = pageData<CommunityReportAdminVO>(await getCommunityReportPage({
        page,
        size: 10,
        targetType: query.targetType || undefined,
        status: query.status || undefined,
      }));
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openHandle(row: CommunityReportAdminVO) {
    setCurrent(row);
    setStatus('RESOLVED');
    setAction('DISMISS');
    setRemark('');
    setHandleOpen(true);
  }

  async function submitHandle() {
    if (!current) return;
    await handleCommunityReport(current.id, {
      status,
      handleAction: status === 'RESOLVED' ? action : undefined,
      handleRemark: remark || undefined,
    });
    showToast('举报处理已提交', 'success');
    setHandleOpen(false);
    fetchList();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>举报处理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="w-36" options={REPORT_TARGET_OPTIONS} value={filters.targetType} onChange={(v) => setFilters({ ...filters, targetType: v })} />
          <Select className="w-36" options={REPORT_STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} />
          <Button size="sm" onClick={() => { setPage(1); setQuery(filters); }}><Search className="mr-1 h-4 w-4" />查询</Button>
          <Button variant="outline" size="sm" onClick={() => { const empty = { targetType: '', status: '' }; setFilters(empty); setPage(1); setQuery(empty); }}><RefreshCcw className="mr-1 h-4 w-4" />重置</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>举报人</TableHead>
              <TableHead>目标类型</TableHead>
              <TableHead>目标ID</TableHead>
              <TableHead>举报原因</TableHead>
              <TableHead>补充说明</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>处理结果</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : list.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.reporterName || '-'}<div className="text-xs text-muted-foreground">{row.reporterPhone || '-'}</div></TableCell>
                <TableCell>{clabel(row.targetType, TARGET_TYPE_LABELS)}</TableCell>
                <TableCell>{row.targetId}</TableCell>
                <TableCell>{row.reasonLabel || row.reasonCode}</TableCell>
                <TableCell className="max-w-[200px] truncate">{row.extraText || '-'}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell>{clabel(row.handleAction, HANDLE_ACTION_LABELS)}</TableCell>
                <TableCell>
                  {hasPermission('community:report:handle') ? (
                    <Button variant="ghost" size="sm" onClick={() => openHandle(row)}>处理</Button>
                  ) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} onChange={setPage} />
      </CardContent>

      <Dialog open={handleOpen} onClose={() => setHandleOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>举报处理</DialogTitle>
          <DialogDescription>处理举报并按需联动内容状态</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <Select options={[{ value: 'RESOLVED', label: '已处理' }, { value: 'REJECTED', label: '驳回举报' }]} value={status} onChange={setStatus} />
          {status === 'RESOLVED' && (
            <Select options={REPORT_ACTION_OPTIONS} value={action} onChange={setAction} />
          )}
          <Input placeholder="处理说明（可选）" value={remark} onChange={(e) => setRemark(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setHandleOpen(false)}>取消</Button>
            <Button onClick={submitHandle}><Check className="mr-1 h-4 w-4" />提交</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

/** 单个配置项：根据 configType 自动选择 Input 或 Select */
function ConfigItem({
  item,
  index,
  disabled,
  onChange,
}: {
  item: AppConfigVO;
  index: number;
  disabled: boolean;
  onChange: (index: number, value: string) => void;
}) {
  const configKey = item.configKey;
  const configType = item.configType;
  const chineseKey = CONFIG_KEY_LABELS[configKey] ?? configKey;

  // 布尔类型 → Select 下拉
  if (configType === 'BOOLEAN') {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{chineseKey}</div>
            <div className="text-xs text-muted-foreground">{item.remark || configKey}</div>
          </div>
          <Badge variant="secondary">{clabel(configType, CONFIG_TYPE_LABELS)}</Badge>
        </div>
        <div className="mt-3">
          <Select
            options={BOOL_OPTIONS}
            value={item.configValue}
            disabled={disabled}
            onChange={(v) => onChange(index, v)}
          />
        </div>
      </div>
    );
  }

  // 互动准入模式 → Select 下拉
  if (configKey === 'community.interaction_gate_mode') {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{chineseKey}</div>
            <div className="text-xs text-muted-foreground">{item.remark || configKey}</div>
          </div>
          <Badge variant="secondary">{clabel(configType, CONFIG_TYPE_LABELS)}</Badge>
        </div>
        <div className="mt-3">
          <Select
            options={GATE_MODE_OPTIONS}
            value={item.configValue}
            disabled={disabled}
            onChange={(v) => onChange(index, v)}
          />
        </div>
      </div>
    );
  }

  // TEXT / NUMBER 类型 → Input
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">{chineseKey}</div>
          <div className="text-xs text-muted-foreground">{item.remark || configKey}</div>
        </div>
        <Badge variant="secondary">{clabel(configType, CONFIG_TYPE_LABELS)}</Badge>
      </div>
      <div className="mt-3">
        <Input
          type={configType === 'NUMBER' ? 'number' : 'text'}
          value={item.configValue}
          disabled={disabled}
          onChange={(e) => onChange(index, e.target.value)}
        />
      </div>
    </div>
  );
}

function ConfigsPanel() {
  const { hasPermission } = usePermission();
  const [configs, setConfigs] = useState<AppConfigVO[]>([]);
  const [tabs, setTabs] = useState<MobileEntryConfigVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, tabRes] = await Promise.all([
        getCommunityConfigs(),
        getCommunityHomeTabs(),
      ]);
      setConfigs((configRes as any).data ?? []);
      setTabs((tabRes as any).data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabSummary = useMemo(
    () => tabs.map((item) => `${item.entryName}(${item.status === 'ENABLED' ? '启用' : '停用'})`).join(' / ') || '暂无首页Tab配置',
    [tabs],
  );

  async function saveConfigs() {
    setSaving(true);
    try {
      await saveCommunityConfigs(configs);
      showToast('社区配置已保存', 'success');
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  function updateConfig(index: number, value: string) {
    setConfigs((prev) => prev.map((item, i) => i === index ? { ...item, configValue: value } : item));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>社区配置</CardTitle>
        {hasPermission('community:config:edit') && (
          <Button onClick={saveConfigs} disabled={saving}>
            {saving ? '保存中...' : '保存配置'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="font-medium">社区首页 Tab 轻配置</div>
          <div className="mt-1 text-muted-foreground">{tabSummary}</div>
          <div className="mt-1 text-xs text-muted-foreground">首页 Tab 的增删改排序继续复用现有移动端入口配置表，本页只读展示。</div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">加载中...</div>
        ) : configs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">暂无配置数据</div>
        ) : (
          <div className="space-y-3">
            {configs.map((item, index) => (
              <ConfigItem
                key={item.configKey}
                item={item}
                index={index}
                disabled={!hasPermission('community:config:edit')}
                onChange={updateConfig}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
