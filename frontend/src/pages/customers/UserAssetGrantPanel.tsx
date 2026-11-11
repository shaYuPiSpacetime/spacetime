import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/usePermission';
import { getUserAssetGrants, grantUserAssets, type AssetGrantReceipt } from '@/api/assetGrants';

/** 用户详情中的直接赠送与历史回执。 */
export default function UserAssetGrantPanel({ userId, nickname, onGranted }: {
  userId: number;
  nickname: string;
  onGranted: () => void;
}) {
  const { hasPermission } = usePermission();
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState('0');
  const [coins, setCoins] = useState('0');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [records, setRecords] = useState<AssetGrantReceipt[]>([]);
  const requestId = useRef('');

  const refresh = () => getUserAssetGrants(userId).then((res) => setRecords(res.data || []));
  useEffect(() => {
    let disposed = false;
    getUserAssetGrants(userId).then((res) => { if (!disposed) setRecords(res.data || []); })
      .catch(() => { if (!disposed) setNotice('赠送记录加载失败，请重新打开用户详情'); });
    return () => { disposed = true; };
  }, [userId]);

  const submit = async () => {
    if (busy) return;
    if (!/^\d+$/.test(days) || !/^\d+$/.test(coins)
      || Number(days) > 36500 || Number(coins) > 2147483647
      || Number(days) + Number(coins) <= 0 || !reason.trim()) {
      setNotice('请填写正整数会员天数或千寻币数量，并填写赠送原因；未赠送项填 0');
      return;
    }
    setBusy(true);
    try {
      const res = await grantUserAssets(userId, {
        requestId: requestId.current, vipDays: Number(days), coinAmount: Number(coins), reason: reason.trim(),
      });
      setEditing(false);
      setNotice(`赠送成功：会员 ${res.data.vipDays} 天，千寻币 ${res.data.coinAmount} 个。`);
      onGranted();
      await refresh().catch(() => setNotice('赠送已成功，记录刷新失败，请重新打开详情查看'));
    } catch {
      setNotice('赠送未确认成功，请重试；重试不会重复发放');
    } finally { setBusy(false); }
  };

  return <section className="space-y-3 rounded-lg border bg-white p-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">会员与千寻币赠送</h3>
      {hasPermission('commercial:user:grant') && !editing && <Button onClick={() => {
        requestId.current = crypto.randomUUID(); setDays('0'); setCoins('0'); setReason('');
        setNotice(''); setEditing(true);
      }}>赠送权益</Button>}
    </div>
    {editing && <div className="space-y-3 rounded-lg bg-slate-50 p-4">
      <p className="text-sm">赠送对象：{nickname}（U{userId}）。会员在有效期上顺延，千寻币立即入账，不产生付费订单。</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">VIP 会员天数<Input type="number" min="0" max="36500" step="1" value={days} disabled={busy} onChange={(e) => setDays(e.target.value)} /></label>
        <label className="space-y-1 text-sm">千寻币数量<Input type="number" min="0" max="2147483647" step="1" value={coins} disabled={busy} onChange={(e) => setCoins(e.target.value)} /></label>
      </div>
      <label className="block space-y-1 text-sm">赠送原因<Input maxLength={200} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} placeholder="必填，用于发放审计" /></label>
      <div className="flex gap-3"><Button disabled={busy} onClick={submit}>{busy ? '发放中…' : '确认赠送'}</Button><Button variant="outline" disabled={busy} onClick={() => setEditing(false)}>取消</Button></div>
    </div>}
    {notice && <p role="status" className="text-sm text-blue-700">{notice}</p>}
    <div className="max-h-60 overflow-auto">
      <table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="p-2">时间 / 操作人</th><th>赠送内容</th><th>原因</th></tr></thead>
        <tbody>{records.map((r) => <tr key={r.id} className="border-b"><td className="p-2">{r.createTime}<br />{r.operatorName || '系统'}</td><td>会员 {r.vipDays} 天 / {r.coinAmount} 千寻币</td><td className="max-w-60 break-words">{r.reason}</td></tr>)}</tbody>
      </table>{records.length === 0 && <p className="p-3 text-sm text-slate-500">暂无赠送记录</p>}
    </div>
    <p className="text-xs text-slate-500">展示最近 50 笔；认证奖励也记录在此，千寻币可在移动端收支明细查看。</p>
  </section>;
}
