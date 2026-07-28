import { useCallback, useEffect, useState } from 'react';
import { Download, Edit3, Eye, Plus, QrCode } from 'lucide-react';
import {
  createPromotionAgent,
  exportPromotionAgents,
  getPromotionAgents,
  updatePromotionAgent,
  updatePromotionAgentStatus,
} from '@/api/promotion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import { AgentDetailDrawer } from '@/features/promotion/agents/AgentDetailDrawer';
import { AgentFormDialog } from '@/features/promotion/agents/AgentFormDialog';
import { AgentQrDialog } from '@/features/promotion/agents/AgentQrDialog';
import {
  ConfirmActionDialog,
  getErrorMessage,
  PromotionField,
  PromotionFilterPanel,
  PromotionPageHeader,
  PromotionPagination,
  PromotionStatusBadge,
  PromotionTableState,
} from '@/features/promotion/shared/promotionUi';
import { usePromotionExport } from '@/features/promotion/shared/usePromotionExport';
import { usePermission } from '@/hooks/usePermission';
import type {
  PromotionAgentListItem,
  PromotionAgentQuery,
  PromotionAgentSaveRequest,
  PromotionAgentStatus,
} from '@/types/promotion';

const EMPTY_FILTERS = {
  keyword: '',
  school: '',
  campus: '',
  status: '',
};

type AgentFilters = typeof EMPTY_FILTERS;

function toQuery(filters: AgentFilters, page: number, size: number): PromotionAgentQuery {
  return {
    page,
    size,
    keyword: filters.keyword || undefined,
    school: filters.school || undefined,
    campus: filters.campus || undefined,
    status: (filters.status || undefined) as PromotionAgentStatus | undefined,
  };
}

function money(value?: number) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

export default function PromotionAgentsPage() {
  const { hasPermission } = usePermission();
  const [draftFilters, setDraftFilters] = useState<AgentFilters>({ ...EMPTY_FILTERS });
  const [filters, setFilters] = useState<AgentFilters>({ ...EMPTY_FILTERS });
  const [rows, setRows] = useState<PromotionAgentListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<PromotionAgentListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusAgent, setStatusAgent] = useState<PromotionAgentListItem | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [detailNo, setDetailNo] = useState<string | null>(null);
  const [qrAgent, setQrAgent] = useState<PromotionAgentListItem | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const { exporting, startExport } = usePromotionExport();

  const canEdit = hasPermission('promotion:agent:edit');
  const canQrCode = hasPermission('promotion:agent:qrcode');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPromotionAgents(toQuery(filters, page, pageSize));
      setRows(response.data.records || []);
      setTotal(Number(response.data.total || 0));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const saveAgent = async (data: PromotionAgentSaveRequest) => {
    setSaving(true);
    try {
      if (editingAgent) {
        await updatePromotionAgent(editingAgent.agentNo, data);
        showToast('代理资料已更新', 'success');
      } else {
        await createPromotionAgent(data);
        showToast('校园代理已新增', 'success');
      }
      setFormOpen(false);
      setEditingAgent(null);
      await fetchList();
    } catch {
      // 请求层统一展示错误，保留表单内容。
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!statusAgent) return;
    setStatusSaving(true);
    const nextStatus: PromotionAgentStatus = statusAgent.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await updatePromotionAgentStatus(statusAgent.agentNo, nextStatus);
      setStatusAgent(null);
      showToast(`代理已${nextStatus === 'enabled' ? '启用' : '停用'}`, 'success');
      await fetchList();
    } catch {
      // 列表保持原状态，后端是最终事实源。
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <PromotionPageHeader
        title="校园代理列表"
        description="集中管理代理、推广转化、奖金汇总和一对一永久二维码。"
        actions={
          <>
            {hasPermission('promotion:agent:export') && (
              <Button variant="outline" onClick={() => setExportOpen(true)} disabled={exporting}>
                <Download className="mr-2 h-4 w-4" />
                {exporting ? '导出处理中' : '导出'}
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => {
                setEditingAgent(null);
                setFormOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                新增代理
              </Button>
            )}
          </>
        }
      />

      <PromotionFilterPanel
        loading={loading}
        onSearch={() => {
          setPage(1);
          setFilters({ ...draftFilters });
        }}
        onReset={() => {
          setPage(1);
          setDraftFilters({ ...EMPTY_FILTERS });
          setFilters({ ...EMPTY_FILTERS });
        }}
      >
        <PromotionField label="代理搜索">
          <Input
            placeholder="代理编号 / 名称"
            value={draftFilters.keyword}
            onChange={(event) => setDraftFilters((current) => ({ ...current, keyword: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="学校">
          <Input
            placeholder="学校"
            value={draftFilters.school}
            onChange={(event) => setDraftFilters((current) => ({ ...current, school: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="校区">
          <Input
            placeholder="校区"
            value={draftFilters.campus}
            onChange={(event) => setDraftFilters((current) => ({ ...current, campus: event.target.value }))}
          />
        </PromotionField>
        <PromotionField label="状态">
          <select
            aria-label="代理状态"
            className="h-9 rounded-md border bg-card px-3 text-sm"
            value={draftFilters.status}
            onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">全部状态</option>
            <option value="enabled">启用</option>
            <option value="disabled">停用</option>
          </select>
        </PromotionField>
      </PromotionFilterPanel>

      <Card className="min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">校园代理</h2>
          <span className="text-xs text-muted-foreground">共 {total} 人</span>
        </div>
        <Table className="min-w-[1450px]">
          <TableHeader>
            <TableRow>
              <TableHead>代理编号</TableHead>
              <TableHead>代理名称</TableHead>
              <TableHead>学校/校区</TableHead>
              <TableHead>累计扫码/点击数</TableHead>
              <TableHead>累计注册数</TableHead>
              <TableHead>累计应发奖金</TableHead>
              <TableHead>累计已发奖金</TableHead>
              <TableHead>累计待结算奖金</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-56">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <PromotionTableState
              loading={loading}
              error={error}
              empty={!rows.length}
              colSpan={10}
              onRetry={() => void fetchList()}
              emptyText="没有符合条件的校园代理"
            />
            {!loading && !error && rows.map((row) => (
              <TableRow key={row.agentNo}>
                <TableCell className="font-medium">{row.agentNo}</TableCell>
                <TableCell>
                  <button type="button" className="font-medium text-primary hover:underline" onClick={() => setDetailNo(row.agentNo)}>
                    {row.agentName}
                  </button>
                </TableCell>
                <TableCell>{row.school} / {row.campus}</TableCell>
                <TableCell>{row.scanClickCount.toLocaleString('zh-CN')}</TableCell>
                <TableCell>{row.registerCount.toLocaleString('zh-CN')}</TableCell>
                <TableCell>{money(row.payableBonus)}</TableCell>
                <TableCell>{money(row.paidBonus)}</TableCell>
                <TableCell className="font-medium">{money(row.pendingBonus)}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <button
                      type="button"
                      aria-label={`${row.agentName}当前${row.status === 'enabled' ? '启用' : '停用'}，点击修改`}
                      onClick={() => setStatusAgent(row)}
                    >
                      <PromotionStatusBadge status={row.status} />
                    </button>
                  ) : (
                    <PromotionStatusBadge status={row.status} />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDetailNo(row.agentNo)}>
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      查看详情
                    </Button>
                    {canQrCode && (
                      <Button variant="outline" size="sm" onClick={() => setQrAgent(row)}>
                        <QrCode className="mr-1 h-3.5 w-3.5" />
                        查看二维码
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="icon" aria-label={`编辑${row.agentName}`} onClick={() => {
                        setEditingAgent(row);
                        setFormOpen(true);
                      }}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PromotionPagination
          current={page}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPage(1);
            setPageSize(size);
          }}
        />
      </Card>

      <AgentFormDialog
        open={formOpen}
        agent={editingAgent}
        loading={saving}
        onClose={() => {
          setFormOpen(false);
          setEditingAgent(null);
        }}
        onSubmit={(data) => void saveAgent(data)}
      />
      <ConfirmActionDialog
        open={Boolean(statusAgent)}
        title={`确认${statusAgent?.status === 'enabled' ? '停用' : '启用'}代理？`}
        description={statusAgent?.status === 'enabled'
          ? '停用后二维码仍可打开并记录点击，但不会建立新的代理关系；历史关系和结算单不受影响。'
          : '启用后，新用户可通过该代理二维码建立推广关系并按当前规则计奖。'}
        confirmText={statusAgent?.status === 'enabled' ? '确认停用' : '确认启用'}
        destructive={statusAgent?.status === 'enabled'}
        loading={statusSaving}
        onCancel={() => setStatusAgent(null)}
        onConfirm={() => void toggleStatus()}
      />
      <AgentDetailDrawer agentNo={detailNo} onClose={() => setDetailNo(null)} />
      <AgentQrDialog agent={qrAgent} onClose={() => setQrAgent(null)} />
      <ConfirmActionDialog
        open={exportOpen}
        title="确认导出校园代理？"
        description="将按当前筛选条件创建异步导出任务；联系电话仍按页面权限保持脱敏。"
        confirmText="创建导出任务"
        loading={exporting}
        onCancel={() => setExportOpen(false)}
        onConfirm={() => {
          const { page: ignoredPage, size: ignoredSize, ...query } = toQuery(filters, 1, 20);
          void ignoredPage;
          void ignoredSize;
          setExportOpen(false);
          void startExport(() => exportPromotionAgents(query));
        }}
      />
    </div>
  );
}
