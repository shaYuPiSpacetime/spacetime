import { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, Eye, ShieldOff, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  getAppUserList,
  getAppUserDetail,
  updateAppUserStatus,
  type AppUserListVO,
  type AppUserDetailVO,
  type PageResult,
} from '@/api/userApp';

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  PENDING: { label: '待审核', variant: 'warning' },
  APPROVED: { label: '已通过', variant: 'success' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  NOT_CERTIFIED: { label: '未认证', variant: 'secondary' },
  EXPIRED: { label: '已失效', variant: 'secondary' },
};

const EDUCATION_LEVEL_MAP: Record<string, string> = {
  HIGH_SCHOOL: '高中',
  ASSOCIATE: '大专',
  BACHELOR: '本科',
  MASTER: '硕士',
  DOCTOR: '博士',
};

const EMOTIONAL_STATUS_MAP: Record<string, string> = {
  LOOKING: '单身中',
  NOT_LOOKING: '暂不找',
  SECRET: '保密',
};

const DATING_GOAL_MAP: Record<string, string> = {
  SERIOUS_RELATIONSHIP: '认真恋爱',
  CASUAL: '随缘',
  UNSURE: '不确定',
  MAKING_FRIENDS: '交朋友',
};

const MARITAL_STATUS_MAP: Record<string, string> = {
  UNMARRIED: '未婚',
  MARRIED: '已婚',
  DIVORCED: '离异',
};

const ACCOUNT_STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  NORMAL: { label: '正常', variant: 'success' },
  FROZEN: { label: '已冻结', variant: 'destructive' },
  CANCELLING: { label: '注销中', variant: 'warning' },
  CANCELLED: { label: '已注销', variant: 'secondary' },
};

const ACCESS_STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  full_access: { label: '完全准入', variant: 'success' },
  browse_only: { label: '仅浏览', variant: 'warning' },
  blocked: { label: '已阻止', variant: 'destructive' },
};

const GENDER_OPTIONS = [
  { value: '', label: '全部性别' },
  { value: 'MALE', label: '男' },
  { value: 'FEMALE', label: '女' },
];

const ACCOUNT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'NORMAL', label: '正常' },
  { value: 'FROZEN', label: '已冻结' },
  { value: 'CANCELLING', label: '注销中' },
  { value: 'CANCELLED', label: '已注销' },
];

const REALNAME_STATUS_OPTIONS = [
  { value: '', label: '全部实名认证' },
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'NOT_CERTIFIED', label: '未认证' },
];

const FIRST_LOGIN_OPTIONS = [
  { value: '', label: '全部首登状态' },
  { value: '1', label: '已完成' },
  { value: '0', label: '未完成' },
];

export default function CustomersPage() {
  const [list, setList] = useState<AppUserListVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [school, setSchool] = useState('');
  const [gender, setGender] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [realNameStatus, setRealNameStatus] = useState('');
  const [firstLoginCompleted, setFirstLoginCompleted] = useState('');

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AppUserDetailVO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status change confirm
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<AppUserListVO | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAppUserList({
        page,
        size: 10,
        keyword: keyword || undefined,
        school: school || undefined,
        gender: gender || undefined,
        accountStatus: accountStatus || undefined,
        realNameStatus: realNameStatus || undefined,
        firstLoginCompleted: firstLoginCompleted ? Number(firstLoginCompleted) : undefined,
      });
      const data = res.data as PageResult<AppUserListVO>;
      setList(data.records ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, school, gender, accountStatus, realNameStatus, firstLoginCompleted]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function openDetail(user: AppUserListVO) {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await getAppUserDetail(user.id);
      setDetail(res.data as AppUserDetailVO);
    } finally {
      setDetailLoading(false);
    }
  }

  function openStatusChange(user: AppUserListVO) {
    setStatusTarget(user);
    setStatusOpen(true);
  }

  async function handleStatusChange() {
    if (!statusTarget) return;
    setStatusChanging(true);
    try {
      const newStatus = statusTarget.accountStatus === 'NORMAL' ? 'FROZEN' : 'NORMAL';
      await updateAppUserStatus(statusTarget.id, newStatus);
      setStatusOpen(false);
      fetchList();
    } finally {
      setStatusChanging(false);
    }
  }

  function handleSearch() {
    setPage(1);
    fetchList();
  }

  function handleReset() {
    setKeyword('');
    setSchool('');
    setGender('');
    setAccountStatus('');
    setRealNameStatus('');
    setFirstLoginCompleted('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">用户管理</h1>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-[198px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-muted-foreground" />
              <Input
                placeholder="搜索昵称/学校"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9 h-9 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
            </div>
            <Input
              placeholder="学校"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-[120px] h-9 text-sm"
            />
            <Select options={GENDER_OPTIONS} value={gender} onChange={setGender} className="w-[110px]" />
            <Select options={ACCOUNT_STATUS_OPTIONS} value={accountStatus} onChange={setAccountStatus} className="w-[110px]" />
            <Select options={REALNAME_STATUS_OPTIONS} value={realNameStatus} onChange={setRealNameStatus} className="w-[130px]" />
            <Select options={FIRST_LOGIN_OPTIONS} value={firstLoginCompleted} onChange={setFirstLoginCompleted} className="w-[130px]" />
            <Button variant="primary" size="sm" className="h-9 w-[78px]" onClick={handleSearch}>
              搜索
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-[78px]" onClick={handleReset}>
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
                <TableHead className="w-[200px]">用户</TableHead>
                <TableHead className="w-[80px]">性别</TableHead>
                <TableHead className="w-[70px]">年龄</TableHead>
                <TableHead className="w-[120px]">学校</TableHead>
                <TableHead className="w-[100px]">实名认证</TableHead>
                <TableHead className="w-[90px]">账号状态</TableHead>
                <TableHead className="w-[90px]">准入</TableHead>
                <TableHead className="w-[120px]">注册时间</TableHead>
                <TableHead className="w-[130px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">加载中…</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : list.map((user) => {
                const acctSt = ACCOUNT_STATUS_MAP[user.accountStatus] || { label: user.accountStatus, variant: 'secondary' as const };
                const accessSt = ACCESS_STATUS_MAP[user.accessStatus] || { label: user.accessStatus || '-', variant: 'secondary' as const };
                const realSt = STATUS_MAP[user.realNameStatus] || { label: user.realNameStatus || '-', variant: 'secondary' as const };
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-[38px] w-[38px]" src={user.avatar || undefined} fallback={user.nickname?.[0] || 'U'} />
                        <div>
                          <p className="text-sm font-medium text-[#0C285A]">{user.nickname || '-'}</p>
                          <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.gender === 'FEMALE' ? 'female' : 'male'} className="h-8 px-3 text-sm">
                        {user.gender === 'MALE' ? '男' : user.gender === 'FEMALE' ? '女' : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell><span className="text-sm">{user.age ?? '-'}</span></TableCell>
                    <TableCell><span className="text-sm text-muted-foreground">{user.school || '-'}</span></TableCell>
                    <TableCell><Badge variant={realSt.variant}>{realSt.label}</Badge></TableCell>
                    <TableCell><Badge variant={acctSt.variant}>{acctSt.label}</Badge></TableCell>
                    <TableCell><Badge variant={accessSt.variant}>{accessSt.label}</Badge></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{user.registerTime || '-'}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(user)}>
                          <Eye className="h-4 w-4 mr-1" /> 详情
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openStatusChange(user)}>
                          {user.accountStatus === 'NORMAL' ? (
                            <><ShieldOff className="h-4 w-4 mr-1 text-red-600" /> 冻结</>
                          ) : (
                            <><ShieldCheck className="h-4 w-4 mr-1 text-green-600" /> 解冻</>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end p-4 border-t border-border">
          <Pagination current={page} total={total} pageSize={10} onChange={setPage} />
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>用户详情</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto">
          {detailLoading ? (
            <p className="text-center text-muted-foreground py-4">加载中…</p>
          ) : detail ? (
            <>
              {/* User header */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-md">
                <Avatar className="h-12 w-12" src={detail.avatar || undefined} fallback={detail.nickname?.[0] || 'U'} />
                <div>
                  <p className="font-medium text-lg">{detail.nickname}</p>
                  <p className="text-xs text-muted-foreground">ID: {detail.id} · 资料分: {detail.profileScore ?? 0}</p>
                </div>
              </div>

              {/* Basic info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">基本信息</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground">性别:</span> {detail.gender === 'MALE' ? '男' : detail.gender === 'FEMALE' ? '女' : '-'}</div>
                  <div><span className="text-muted-foreground">年龄:</span> {detail.age ?? '-'}</div>
                  <div><span className="text-muted-foreground">身高:</span> {detail.height ? `${detail.height}cm` : '-'}</div>
                  <div><span className="text-muted-foreground">生日:</span> {detail.birthday || '-'}</div>
                  <div><span className="text-muted-foreground">学历:</span> {EDUCATION_LEVEL_MAP[detail.educationLevel] || detail.educationLevel || '-'}</div>
                  <div><span className="text-muted-foreground">学校:</span> {detail.school || '-'}</div>
                  <div><span className="text-muted-foreground">专业:</span> {detail.major || '-'}</div>
                  <div><span className="text-muted-foreground">MBTI:</span> {detail.mbtiType || '-'}</div>
                  <div><span className="text-muted-foreground">星座:</span> {detail.zodiac || '-'}</div>
                  <div><span className="text-muted-foreground">常居:</span> {detail.locationProvince || ''} {detail.locationCity || ''}</div>
                  <div><span className="text-muted-foreground">家乡:</span> {detail.hometownProvince || ''} {detail.hometownCity || ''}</div>
                  <div><span className="text-muted-foreground">感情状态:</span> {EMOTIONAL_STATUS_MAP[detail.emotionalStatus] || detail.emotionalStatus || '-'}</div>
                  <div><span className="text-muted-foreground">脱单目标:</span> {DATING_GOAL_MAP[detail.datingGoal] || detail.datingGoal || '-'}</div>
                  <div><span className="text-muted-foreground">婚姻状况:</span> {MARITAL_STATUS_MAP[detail.maritalStatus] || detail.maritalStatus || '-'}</div>
                </div>
              </div>

              {/* About me */}
              {detail.aboutMe && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">关于我</h4>
                  <p className="text-sm bg-muted/30 p-2 rounded-md">{detail.aboutMe}</p>
                </div>
              )}

              {/* Access info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">准入信息</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground">可浏览卡片:</span> {detail.canBrowseCards ? '是' : '否'}</div>
                  <div><span className="text-muted-foreground">可匹配:</span> {detail.canMatch ? '是' : '否'}</div>
                  <div><span className="text-muted-foreground">可曝光:</span> {detail.canBeExposed ? '是' : '否'}</div>
                  <div><span className="text-muted-foreground">账号状态:</span> {ACCOUNT_STATUS_MAP[detail.accountStatus]?.label || detail.accountStatus}</div>
                  <div><span className="text-muted-foreground">首登完成:</span> {detail.firstLoginCompleted ? '是' : '否'}</div>
                  {detail.blockReason && (
                    <div className="col-span-2"><span className="text-muted-foreground">限制原因:</span> <span className="text-red-600">{detail.blockReason}</span></div>
                  )}
                  <div><span className="text-muted-foreground">违规:</span> {detail.violationCount ?? 0}次</div>
                  <div><span className="text-muted-foreground">反馈:</span> {detail.feedbackCount ?? 0}次</div>
                </div>
              </div>

              {/* Login info */}
              <div className="space-y-1 text-sm">
                <h4 className="text-sm font-medium">登录信息</h4>
                <div className="grid grid-cols-2 gap-x-4">
                  <div><span className="text-muted-foreground">注册时间:</span> {detail.registerTime || '-'}</div>
                  <div><span className="text-muted-foreground">最近登录:</span> {detail.lastLoginTime || '-'}</div>
                </div>
              </div>

              {/* Verification info */}
              {detail.verification && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">认证信息</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div><span className="text-muted-foreground">实名认证:</span> {STATUS_MAP[detail.verification.realNameStatus]?.label || '-'}</div>
                    <div><span className="text-muted-foreground">学历认证:</span> {STATUS_MAP[detail.verification.educationStatus]?.label || '-'}</div>
                    <div><span className="text-muted-foreground">头像认证:</span> {STATUS_MAP[detail.verification.avatarVerifyStatus]?.label || '-'}</div>
                    <div><span className="text-muted-foreground">认证等级:</span> Lv.{detail.verification.verifyLevel ?? 0}</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-4">加载详情失败</p>
          )}
        </div>
      </Dialog>

      {/* Status change confirm dialog */}
      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)}>
        <DialogHeader>
          <DialogTitle>{statusTarget?.accountStatus === 'NORMAL' ? '确认冻结用户' : '确认解冻用户'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            {statusTarget?.accountStatus === 'NORMAL'
              ? `确定要冻结用户「${statusTarget?.nickname}」吗？冻结后该用户将无法使用小程序。`
              : `确定要解冻用户「${statusTarget?.nickname}」吗？解冻后该用户将恢复正常使用。`}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStatusOpen(false)}>取消</Button>
            <Button variant={statusTarget?.accountStatus === 'NORMAL' ? 'destructive' : 'primary'} onClick={handleStatusChange} disabled={statusChanging}>
              {statusChanging ? '处理中…' : '确认'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
