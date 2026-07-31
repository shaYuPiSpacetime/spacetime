import { useCallback, useEffect, useState } from 'react';
import { Edit3, Eye, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toast';
import {
  getComplianceContentList,
  updateComplianceContent,
  type ComplianceContentVO,
} from '@/api/prd06';
import { getDictDataChildren, type DictDataVO } from '@/api/dict';

type DictOption = { value: string; label: string };

function toOptions(response: unknown): DictOption[] {
  const rows = ((response as { data?: DictDataVO[] })?.data ?? [])
    .filter((item) => item.status === 'ENABLED')
    .sort((left, right) => left.dictSort - right.dictSort);
  return rows.map((item) => ({ value: item.dictValue, label: item.dictLabel }));
}

function optionLabel(options: DictOption[], value?: string) {
  return options.find((item) => item.value === value)?.label || value || '-';
}

function contentTypeLabel(options: DictOption[], item: ComplianceContentVO) {
  return item.contentTypeLabel || optionLabel(options, item.contentType);
}

function contentUrlOf(item: ComplianceContentVO) {
  return item.contentUrl || item.h5Url || '';
}

function extractList(response: unknown) {
  const data = (response as { data?: unknown })?.data;
  if (Array.isArray(data)) return data as ComplianceContentVO[];
  return ((data as { records?: ComplianceContentVO[] })?.records ?? []);
}

export default function ComplianceContentPage() {
  const [rows, setRows] = useState<ComplianceContentVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ComplianceContentVO | null>(null);
  const [previewing, setPreviewing] = useState<ComplianceContentVO | null>(null);
  const [saving, setSaving] = useState(false);
  const [typeOptions, setTypeOptions] = useState<DictOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<DictOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [form, setForm] = useState({ title: '', status: '', contentUrl: '' });

  useEffect(() => {
    let active = true;
    void Promise.all([
      getDictDataChildren('compliance_content_type', 0),
      getDictDataChildren('common_status', 0),
    ]).then(([types, statuses]) => {
      if (!active) return;
      setTypeOptions(toOptions(types));
      setStatusOptions(toOptions(statuses));
    }).catch(() => {
      if (active) showToast('字典配置加载失败，请联系管理员', 'error');
    }).finally(() => {
      if (active) setOptionsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      setRows(extractList(await getComplianceContentList({ page: 1, size: 50 })));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  function openEdit(row: ComplianceContentVO) {
    setEditing(row);
    setForm({ title: row.title, status: row.status, contentUrl: contentUrlOf(row) });
  }

  async function handleSave() {
    if (!editing || !form.title.trim() || !form.contentUrl.trim() || !form.status) {
      showToast('请完整填写标题和 H5 链接', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateComplianceContent(editing.id, {
        title: form.title.trim(),
        status: form.status,
        contentUrl: form.contentUrl.trim(),
      });
      showToast('公告与协议配置已保存', 'success');
      setEditing(null);
      await fetchRows();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4" data-page="prd06-compliance">
      <section className="flex items-center justify-between gap-5 rounded-lg border bg-card px-[22px] py-5 shadow-[0_10px_24px_rgba(24,49,82,0.04)]">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-foreground">公告与协议配置</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">所有配置项预先初始化，只允许编辑和预览，不允许新增或删除。</p>
        </div>
        <Button variant="outline" onClick={fetchRows} disabled={loading} aria-label="刷新">
          <RefreshCcw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />刷新
        </Button>
      </section>

      <Card className="shadow-[0_10px_24px_rgba(24,49,82,0.04)]">
        <CardContent className="p-[18px]">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="h-10 text-xs font-semibold">内容类型</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">标题</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">版本</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">状态</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">生效时间</TableHead>
                  <TableHead className="h-10 text-xs font-semibold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">正在加载配置...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">配置初始化异常，请刷新或联系管理员</TableCell></TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="h-[50px] text-sm">{contentTypeLabel(typeOptions, row)}</TableCell>
                    <TableCell className="h-[50px] text-sm">{row.title}</TableCell>
                    <TableCell className="h-[50px] text-sm">{row.version}</TableCell>
                    <TableCell className="h-[50px]">
                      <Badge className="rounded-full px-2.5 py-1" variant={row.status === statusOptions[0]?.value ? 'success' : 'secondary'}>
                        {optionLabel(statusOptions, row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-[50px] text-sm">{row.effectiveTime || '-'}</TableCell>
                    <TableCell className="h-[50px]">
                      <div className="flex gap-1">
                        <Button variant="link" size="sm" className="px-2" onClick={() => setPreviewing(row)}>
                          <Eye className="mr-1 h-4 w-4" />预览
                        </Button>
                        <Button variant="link" size="sm" className="px-2" onClick={() => openEdit(row)} disabled={optionsLoading || statusOptions.length === 0}>
                          <Edit3 className="mr-1 h-4 w-4" />编辑
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)} className="max-h-[88vh] max-w-[560px] overflow-y-auto p-7">
        {editing && (
          <section role="dialog" aria-modal="true" aria-labelledby="compliance-edit-title">
            <DialogHeader>
              <DialogTitle id="compliance-edit-title" className="text-[22px]">编辑公告与协议</DialogTitle>
              <DialogDescription className="pt-1 text-sm">替换 H5 地址后版本自动递增；仅修改标题或状态不升级版本。</DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="compliance-type">
                <span>内容类型</span>
                <Input id="compliance-type" value={contentTypeLabel(typeOptions, editing)} disabled />
              </label>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="compliance-title">
                <span>标题</span>
                <Input id="compliance-title" maxLength={40} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="compliance-version">
                <span>当前版本</span>
                <Input id="compliance-version" value={editing.version} disabled />
              </label>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="compliance-status">
                <span>状态</span>
                <select id="compliance-status" className="h-9 w-full rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="compliance-url">
                <span>H5 链接</span>
                <Input id="compliance-url" type="url" value={form.contentUrl} onChange={(event) => setForm({ ...form, contentUrl: event.target.value })} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
            </div>
          </section>
        )}
      </Dialog>

      <Dialog open={!!previewing} onClose={() => setPreviewing(null)} className="max-h-[88vh] max-w-[820px] overflow-y-auto p-7">
        {previewing && (
          <section role="dialog" aria-modal="true" aria-labelledby="compliance-preview-title">
            <DialogHeader>
              <DialogTitle id="compliance-preview-title" className="text-[22px]">H5 内容预览</DialogTitle>
              <DialogDescription className="break-all pt-1">{contentUrlOf(previewing) || '该配置暂未填写 H5 链接'}</DialogDescription>
            </DialogHeader>
            <div className="mt-5 min-h-[360px] overflow-hidden rounded-xl border bg-slate-50">
              <div className="border-b bg-white px-4 py-3 text-[13px] text-muted-foreground">目标链接实际内容</div>
              {contentUrlOf(previewing) ? (
                <iframe className="block min-h-[420px] w-full bg-white" src={contentUrlOf(previewing)} title={`${previewing.title} H5 内容预览`} sandbox="allow-same-origin allow-scripts" />
              ) : (
                <div className="grid min-h-[320px] place-items-center text-sm text-muted-foreground">暂无可预览链接</div>
              )}
            </div>
          </section>
        )}
      </Dialog>
    </div>
  );
}
