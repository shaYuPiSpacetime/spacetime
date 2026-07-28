import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { PromotionAgentListItem, PromotionAgentSaveRequest } from '@/types/promotion';

const EMPTY_FORM = {
  agentName: '',
  school: '',
  campus: '',
  contactName: '',
  contactPhone: '',
  remark: '',
};

export function AgentFormDialog({
  open,
  agent,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  agent: PromotionAgentListItem | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (data: PromotionAgentSaveRequest) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(agent ? {
      agentName: agent.agentName,
      school: agent.school,
      campus: agent.campus,
      contactName: agent.contactName || '',
      contactPhone: '',
      remark: '',
    } : { ...EMPTY_FORM });
    setError('');
  }, [agent, open]);

  const submit = () => {
    if (!form.agentName.trim() || !form.school.trim() || !form.campus.trim()) {
      setError('请填写代理名称、学校和校区');
      return;
    }
    if (form.contactPhone && !/^1\d{10}$/.test(form.contactPhone)) {
      setError('联系电话需为11位手机号');
      return;
    }
    setError('');
    onSubmit({
      agentName: form.agentName.trim(),
      school: form.school.trim(),
      campus: form.campus.trim(),
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone || undefined,
      remark: form.remark.trim() || undefined,
    });
  };

  const title = agent ? '编辑校园代理' : '新增校园代理';

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl" closeOnEscape={!loading}>
      <div role="dialog" aria-modal="true" aria-label={title}>
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            代理编号由系统生成；代理名称、学校和校区为必填项。
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            代理名称
            <Input
              aria-label="代理名称"
              value={form.agentName}
              onChange={(event) => setForm((current) => ({ ...current, agentName: event.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            联系人
            <Input
              aria-label="联系人"
              value={form.contactName}
              onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            学校
            <Input
              aria-label="学校"
              value={form.school}
              onChange={(event) => setForm((current) => ({ ...current, school: event.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            校区
            <Input
              aria-label="校区"
              value={form.campus}
              onChange={(event) => setForm((current) => ({ ...current, campus: event.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            联系电话
            <Input
              aria-label="联系电话"
              inputMode="numeric"
              maxLength={11}
              placeholder={agent ? '留空表示不修改' : '请输入11位手机号（选填）'}
              value={form.contactPhone}
              onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
            />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            备注
            <textarea
              aria-label="备注"
              rows={3}
              className="rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              value={form.remark}
              onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
            />
          </label>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>取消</Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            保存代理
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
