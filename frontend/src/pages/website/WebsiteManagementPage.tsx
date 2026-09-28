import { useCallback, useEffect, useState } from 'react';
import { websiteAdminApi, type AdminActivity, type AdminMessage, type SensitiveMessage, type WebsiteAudit, type WebsiteReport } from '@/api/website';
import { usePermission } from '@/hooks/usePermission';
import { showToast } from '@/components/ui/toast';

type Tab = 'activities' | 'messages' | 'reports' | 'audits';
const tabNames: Record<Tab, string> = { activities: '活动审核', messages: '聊天审核', reports: '举报处置', audits: '操作日志' };
const statusNames: Record<string, string> = { PENDING: '待审核', APPROVED: '已通过', REJECTED: '已拒绝', OFFLINE: '已下架', REMOVED: '已移除', OPEN: '待处理', RESOLVED: '已处理' };
function label(status: string) { return statusNames[status] || status; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : '操作失败'; }
function askReason(action: string) { const reason = window.prompt(`请输入${action}原因（必填，最多 500 字）：`); return reason?.trim() || ''; }

export default function WebsiteManagementPage() {
  const { hasPermission } = usePermission();
  const [tab, setTab] = useState<Tab>('activities');
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [reports, setReports] = useState<WebsiteReport[]>([]);
  const [audits, setAudits] = useState<WebsiteAudit[]>([]);
  const [revealed, setRevealed] = useState<SensitiveMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const canAccess: Record<Tab, boolean> = {
    activities: hasPermission('website:activity:list'), messages: hasPermission('website:message:list'),
    reports: hasPermission('website:report:manage'), audits: hasPermission('website:audit:list'),
  };
  const load = useCallback(async (selected: Tab) => {
    setError(''); setRevealed(null);
    setPage(1);
    try {
      if (selected === 'activities' && canAccess.activities) { const items = await websiteAdminApi.activities(1); setActivities(items); setHasMore(items.length === 50); }
      if (selected === 'messages' && canAccess.messages) { const items = await websiteAdminApi.messages(1); setMessages(items); setHasMore(items.length === 50); }
      if (selected === 'reports' && canAccess.reports) { const items = await websiteAdminApi.reports(1); setReports(items); setHasMore(items.length === 50); }
      if (selected === 'audits' && canAccess.audits) { const items = await websiteAdminApi.audits(1); setAudits(items); setHasMore(items.length === 50); }
    } catch (cause) { setError(errorMessage(cause)); }
  }, [canAccess.activities, canAccess.messages, canAccess.reports, canAccess.audits]);
  useEffect(() => { void load(tab); }, [load, tab]);
  const loadMore = async () => {
    if (!hasMore || busy) return;
    setBusy(true); setError('');
    const nextPage = page + 1;
    try {
      if (tab === 'activities') { const items = await websiteAdminApi.activities(nextPage); setActivities(previous => [...previous, ...items]); setHasMore(items.length === 50); }
      if (tab === 'messages') { const items = await websiteAdminApi.messages(nextPage); setMessages(previous => [...previous, ...items]); setHasMore(items.length === 50); }
      if (tab === 'reports') { const items = await websiteAdminApi.reports(nextPage); setReports(previous => [...previous, ...items]); setHasMore(items.length === 50); }
      if (tab === 'audits') { const items = await websiteAdminApi.audits(nextPage); setAudits(previous => [...previous, ...items]); setHasMore(items.length === 50); }
      setPage(nextPage);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  };
  const run = async (action: string, task: (reason: string) => Promise<unknown>) => {
    const reason = askReason(action);
    if (!reason) return;
    if (reason.length > 500) { showToast('原因不能超过 500 字', 'error'); return; }
    setBusy(true);
    try { await task(reason); showToast(`${action}成功`, 'success'); if (action !== '查看聊天正文') await load(tab); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  };
  const exportMessages = () => void run('导出聊天记录', async reason => {
    const csv = await websiteAdminApi.exportMessages(reason);
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `官网聊天审核记录-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const btn = 'rounded-lg border border-emerald-700 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-50 disabled:opacity-50';
  const danger = 'rounded-lg border border-red-600 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50';
  return <div className="space-y-6 p-6">
    <div><h1 className="text-2xl font-bold text-slate-800">官网活动管理</h1><p className="mt-2 text-sm text-slate-600">审核网站活动、图片与私聊内容，处理举报并查看留存日志。聊天正文需要单独权限和查看原因。</p></div>
    <div className="flex flex-wrap gap-2 border-b pb-3">{(Object.keys(tabNames) as Tab[]).filter(value => canAccess[value]).map(value => <button key={value} type="button" aria-current={tab === value ? 'page' : undefined} className={tab === value ? 'rounded-lg bg-emerald-700 px-4 py-2 text-white' : btn} onClick={() => setTab(value)}>{tabNames[value]}</button>)}</div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
    {!canAccess[tab] && <p className="rounded-lg bg-amber-50 p-4">没有查看此模块的权限。</p>}
    {tab === 'activities' && canAccess.activities && <div className="space-y-4">{activities.length === 0 && <p>暂无活动。</p>}{activities.map(({ activity, authorName, imageUrls }) => <article key={activity.id} className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{activity.title}</h2><p className="text-sm text-slate-500">#{activity.id} · {authorName} · {label(activity.status)} · {activity.startTime} · {activity.location} · 线下预计费用 ¥{Number(activity.estimatedCost).toFixed(2)}</p></div><div className="flex gap-2">{activity.status === 'PENDING' && hasPermission('website:activity:audit') && <><button className={btn} disabled={busy} onClick={() => void run('通过活动', reason => websiteAdminApi.moderateActivity(activity.id, 'APPROVED', reason))}>通过</button><button className={danger} disabled={busy} onClick={() => void run('拒绝活动', reason => websiteAdminApi.moderateActivity(activity.id, 'REJECTED', reason))}>拒绝</button></>}{activity.status === 'APPROVED' && hasPermission('website:activity:audit') && <button className={danger} disabled={busy} onClick={() => void run('下架活动', reason => websiteAdminApi.moderateActivity(activity.id, 'OFFLINE', reason))}>下架</button>}</div></div><p className="mt-4 whitespace-pre-wrap text-sm">{activity.content}</p>{imageUrls.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{imageUrls.map(url => <img key={url} src={url} alt={`${activity.title}待审核图片`} className="h-24 w-24 rounded object-cover" />)}</div>}{activity.auditNote && <p className="mt-3 text-sm text-slate-500">审核说明：{activity.auditNote}</p>}</article>)}</div>}
    {tab === 'messages' && canAccess.messages && <div className="space-y-4"><div className="flex justify-end">{hasPermission('website:message:export') && <button className={btn} disabled={busy} onClick={exportMessages}>导出聊天记录</button>}</div>{messages.length === 0 && <p>暂无聊天记录。</p>}{messages.map(message => <article key={message.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div><strong>消息 #{message.id}</strong><p className="mt-1 text-sm text-slate-500">会话 #{message.conversationId} · 发送者 #{message.senderId} · {message.messageType} · {label(message.status)} · {message.createTime}</p></div><div className="flex gap-2">{hasPermission('website:message:content') && <button className={btn} disabled={busy} onClick={() => void run('查看聊天正文', async reason => { setRevealed(await websiteAdminApi.viewMessage(message.id, reason)); })}>查看正文</button>}{hasPermission('website:message:moderate') && message.status === 'PENDING' && <><button className={btn} disabled={busy} onClick={() => void run('通过图片', reason => websiteAdminApi.moderateMessage(message.id, 'APPROVED', reason))}>通过图片</button><button className={danger} disabled={busy} onClick={() => void run('拒绝图片', reason => websiteAdminApi.moderateMessage(message.id, 'REJECTED', reason))}>拒绝图片</button></>}{hasPermission('website:message:moderate') && message.status === 'APPROVED' && <button className={danger} disabled={busy} onClick={() => void run('移除消息', reason => websiteAdminApi.moderateMessage(message.id, 'REMOVED', reason))}>移除</button>}</div></article>)}{revealed && <section className="rounded-xl border border-amber-300 bg-amber-50 p-5"><div className="flex justify-between"><h2 className="font-semibold">消息 #{revealed.id} 正文</h2><button className={btn} onClick={() => setRevealed(null)}>关闭</button></div>{revealed.imageUrl ? <img src={revealed.imageUrl} alt="审核中的聊天图片" className="mt-3 max-h-96 rounded object-contain" /> : <p className="mt-3 whitespace-pre-wrap">{revealed.content}</p>}</section>}</div>}
    {tab === 'reports' && canAccess.reports && <div className="space-y-4">{reports.length === 0 && <p>暂无举报。</p>}{reports.map(report => <article key={report.id} className="flex flex-wrap justify-between gap-3 rounded-xl border bg-white p-4"><div><strong>举报 #{report.id} · {label(report.status)}</strong><p className="mt-1 text-sm text-slate-500">举报人 #{report.reporterId} · {report.targetType} #{report.targetId ?? '—'} · {report.createTime}</p><p className="mt-2 whitespace-pre-wrap">{report.reason}</p>{report.resolution && <p className="text-sm text-emerald-700">处理说明：{report.resolution}</p>}</div>{report.status === 'OPEN' && <button className={btn} disabled={busy} onClick={() => void run('处理举报', reason => websiteAdminApi.resolveReport(report.id, reason))}>标记处理</button>}</article>)}</div>}
    {tab === 'audits' && canAccess.audits && <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">时间</th><th className="p-3">操作者</th><th className="p-3">动作</th><th className="p-3">对象</th><th className="p-3">原因</th><th className="p-3">留存至</th></tr></thead><tbody>{audits.map(item => <tr key={item.id} className="border-t"><td className="p-3">{item.createTime}</td><td className="p-3">{item.actorType} #{item.actorId ?? '—'}</td><td className="p-3">{item.action}</td><td className="p-3">{item.targetType} #{item.targetId ?? '—'}</td><td className="p-3">{item.remark || '—'}</td><td className="p-3">{item.retainUntil}</td></tr>)}</tbody></table>{audits.length === 0 && <p className="p-4">暂无记录。</p>}</div>}
    {canAccess[tab] && hasMore && <div className="text-center"><button type="button" className={btn} disabled={busy} onClick={() => void loadMore()}>{busy ? '加载中…' : '加载更多'}</button></div>}
  </div>;
}
