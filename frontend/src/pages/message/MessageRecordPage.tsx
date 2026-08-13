import { useCallback, useEffect, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { exportMessageRecords, getMessageRecordDetail, getMessageRecords, getMessageRecordStats, viewMessageRecordContent, type MessageRecordDetailVO, type MessageRecordQuery, type MessageRecordVO, type SensitiveMessageContent } from '@/api/message';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer } from '@/components/ui/drawer';
import { showToast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/usePermission';
import { BodyCell, CommunityPage, CommunityPageHeader, DataRowsState, DetailGrid, DetailSection, Field, FilterPanel, HeaderCell, Input, NativeSelect, PageFooter, PermissionState, StatGrid, TableFrame, TableHead, normalizePage, unwrapData } from '@/features/community/communityUi';

const initial: MessageRecordQuery = { page: 1, size: 20, keyword: '', recordType: '', messageType: '', systemCategory: '', status: '', startTime: '', endTime: '' };
const opts = (values: Array<[string,string]>) => values.map(([code,label]) => ({ code, label }));
const recordTypes = opts([['private_message','私信'],['whisper_message','悄悄话'],['system_message','系统消息'],['assistant_message','官方助手']]);
const statuses = opts([['sent','已发送'],['pending','等待回应'],['unread','未读'],['read','已读'],['failed','失败']]);
const messageTypes = opts([['text','文本'],['whisper','悄悄话'],['system','系统'],['assistant','助手']]);
const systemCategories = opts([['governance','治理'],['asset','资产'],['invite','邀请'],['community','社区运营'],['platform','平台安全']]);
const unwrap = <T,>(value: unknown, fallback: T) => unwrapData<T>(value, fallback);
const userText = (id?: number, name?: string) => id ? `${name ? `${name}（` : ''}U${id}${name ? '）' : ''}` : '-';
const dateTime = (value?: string, end = false) => value ? `${value} ${end ? '23:59:59' : '00:00:00'}` : undefined;

export default function MessageRecordPage() {
  const { hasAnyPermission } = usePermission(); const canView = hasAnyPermission('message:record:list');
  const canExport = hasAnyPermission('message:record:export'); const canSensitive = hasAnyPermission('message:sensitive-content:view');
  const [filters,setFilters]=useState(initial); const [query,setQuery]=useState(initial);
  const [records,setRecords]=useState<MessageRecordVO[]>([]); const [total,setTotal]=useState(0); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const [stats,setStats]=useState<any[]>([]); const [detail,setDetail]=useState<MessageRecordDetailVO|null>(null); const [detailOpen,setDetailOpen]=useState(false); const [detailLoading,setDetailLoading]=useState(false);
  const [sensitiveOpen,setSensitiveOpen]=useState(false); const [reason,setReason]=useState(''); const [sensitive,setSensitive]=useState<SensitiveMessageContent|null>(null); const [sensitiveLoading,setSensitiveLoading]=useState(false);
  const load=useCallback(async()=>{ if(!canView){setLoading(false);return;} setLoading(true);setError('');try{const page=normalizePage<MessageRecordVO>(await getMessageRecords(query));setRecords(page.records);setTotal(page.total);}catch(e:any){setError(e?.message||'查询失败');}finally{setLoading(false);}},[canView,query]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(!canView)return; getMessageRecordStats().then(r=>{const d=unwrap<Record<string,number>>(r,{});setStats([{code:'today',label:'今日私信',value:d.todayPrivateMessageCount||0},{code:'waiting',label:'等待回应悄悄话',value:d.waitingWhisperCount||0},{code:'system',label:'系统消息',value:d.systemMessageCount||0},{code:'case',label:'关联举报案件',value:d.caseLinkedCount||0}]);}).catch(()=>setStats([]));},[canView]);
  async function openDetail(row:MessageRecordVO){setDetailOpen(true);setDetailLoading(true);setSensitive(null);try{setDetail(unwrap(await getMessageRecordDetail(row.recordNo),row as MessageRecordDetailVO));}finally{setDetailLoading(false);}}
  async function exportRows(){const {page:_,size:__,...submittedFilters}=query;try{const task=unwrap<any>(await exportMessageRecords({...submittedFilters,confirmNoContent:true}),null);if(task?.downloadContent){const blob=new Blob([task.downloadContent],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=task.fileName||'消息记录.csv';a.click();URL.revokeObjectURL(a.href);}showToast(task?.message||'导出任务已创建','success');}catch{}}
  async function reveal(){if(!detail)return;if(reason.trim().length<5){showToast('查看原因至少填写5个字符','error');return;}setSensitiveLoading(true);try{setSensitive(unwrap(await viewMessageRecordContent(detail.recordNo,{viewReason:reason.trim(),requestId:`ADMIN-${Date.now()}-${Math.random().toString(36).slice(2,10)}`}),null as any));}finally{setSensitiveLoading(false);}}
  const closeDetail=()=>{setDetailOpen(false);setDetail(null);setSensitive(null);setReason('');};
  if(!canView)return <CommunityPage><CommunityPageHeader title="消息通知记录查询" description="按业务条件查询消息与通知记录。"/><PermissionState copy="无权限查看消息记录"/></CommunityPage>;
  return <CommunityPage>
    <CommunityPageHeader title="消息通知记录查询" description="查询消息业务记录；私信和悄悄话正文仅在独立权限和审计下查看。" actions={canExport?<Button onClick={()=>void exportRows()}><Download className="mr-1.5 h-4 w-4"/>导出记录</Button>:undefined}/>
    <StatGrid cards={stats}/>
    <FilterPanel busy={loading} onSearch={()=>setQuery({...filters,page:1,startTime:dateTime(filters.startTime),endTime:dateTime(filters.endTime,true)})} onReset={()=>{setFilters(initial);setQuery(initial);}}>
      <Field label="用户/编号搜索"><Input value={filters.keyword} onChange={e=>setFilters({...filters,keyword:e.target.value})} placeholder="记录编号 / 用户 / 会话编号"/></Field>
      <Field label="记录类型"><NativeSelect value={filters.recordType||''} onChange={v=>setFilters({...filters,recordType:v})} options={recordTypes}/></Field>
      <Field label="消息类型"><NativeSelect value={filters.messageType||''} onChange={v=>setFilters({...filters,messageType:v})} options={messageTypes}/></Field>
      <Field label="系统消息分类"><NativeSelect value={filters.systemCategory||''} onChange={v=>setFilters({...filters,systemCategory:v})} options={systemCategories}/></Field>
      <Field label="状态"><NativeSelect value={filters.status||''} onChange={v=>setFilters({...filters,status:v})} options={statuses}/></Field>
      <Field label="开始日期"><Input type="date" value={filters.startTime||''} onChange={e=>setFilters({...filters,startTime:e.target.value})}/></Field>
      <Field label="结束日期"><Input type="date" value={filters.endTime||''} onChange={e=>setFilters({...filters,endTime:e.target.value})}/></Field>
    </FilterPanel>
    <TableFrame minWidth={1100}><TableHead><tr><HeaderCell>记录编号</HeaderCell><HeaderCell>记录类型</HeaderCell><HeaderCell>用户</HeaderCell><HeaderCell>对方用户</HeaderCell><HeaderCell>消息类型</HeaderCell><HeaderCell>状态</HeaderCell><HeaderCell>创建时间</HeaderCell><HeaderCell>操作</HeaderCell></tr></TableHead>{loading||error||!records.length?<DataRowsState colSpan={8} loading={loading} error={error} emptyText="暂无消息记录" onRetry={load}/>:<tbody>{records.map(row=><tr key={row.recordNo}><BodyCell>{row.recordNo}</BodyCell><BodyCell>{recordTypes.find(x=>x.code===row.recordType)?.label||row.recordType}</BodyCell><BodyCell>{userText(row.userId,row.userNickname)}</BodyCell><BodyCell>{userText(row.peerUserId,row.peerNickname)}</BodyCell><BodyCell>{row.messageType||'-'}</BodyCell><BodyCell>{statuses.find(x=>x.code===row.status)?.label||row.status}</BodyCell><BodyCell>{row.createdTime||'-'}</BodyCell><BodyCell><Button variant="outline" size="sm" onClick={()=>void openDetail(row)}>详情</Button></BodyCell></tr>)}</tbody>}</TableFrame>
    <PageFooter current={query.page} total={total} pageSize={query.size} onChange={p=>setQuery({...query,page:p})} onPageSizeChange={s=>{setFilters({...filters,size:s,page:1});setQuery({...query,size:s,page:1});}}/>
    <Drawer open={detailOpen} onClose={closeDetail} title="消息记录详情" description={detail?.recordNo}>{detailLoading?<p>加载中...</p>:detail&&<div className="space-y-4"><DetailGrid items={[{label:'记录类型',value:recordTypes.find(x=>x.code===detail.recordType)?.label||detail.recordType},{label:'用户',value:userText(detail.userId,detail.userNickname)},{label:'对方用户',value:userText(detail.peerUserId,detail.peerNickname)},{label:'状态',value:detail.status},{label:'会话编号',value:detail.conversationNo},{label:'来源业务编号',value:detail.sourceBizNo},{label:'失败原因',value:detail.failureReason},{label:'关联举报',value:detail.caseCount}]}/>{detail.sensitiveContent?<DetailSection title="消息正文"><Button variant="outline" disabled={!canSensitive||!detail.contentAvailable} onClick={()=>setSensitiveOpen(true)}><Eye className="mr-1.5 h-4 w-4"/>{!detail.contentAvailable?'正文不可用':canSensitive?'查看高敏正文':'无查看权限'}</Button></DetailSection>:<DetailSection title={detail.title||'消息内容'}><div className="whitespace-pre-wrap break-words">{detail.content||'-'}</div>{detail.actionText&&<div className="mt-3 text-sm text-blue-600">{detail.actionText}</div>}</DetailSection>}</div>}</Drawer>
    <Dialog open={sensitiveOpen} onClose={()=>{setSensitiveOpen(false);setSensitive(null);setReason('');}} layer="nested" lockBodyScroll={false} className="max-w-[620px]"><DialogHeader><DialogTitle>查看高敏消息正文</DialogTitle></DialogHeader>{!sensitive?<div className="mt-4 space-y-4"><p className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">本次操作将记录管理员、原因、时间和访问结果。</p><Input value={reason} onChange={e=>setReason(e.target.value)} maxLength={100} placeholder="请填写客诉核查、风控复核等具体原因"/><div className="flex justify-end"><Button onClick={()=>void reveal()} disabled={sensitiveLoading}>{sensitiveLoading?'查询中...':'确认并查看'}</Button></div></div>:<div className="mt-4 space-y-3"><div className="text-xs text-slate-500">审计编号：{sensitive.accessNo}</div>{sensitive.items.map(i=><div key={`${i.role}-${i.messageNo}`} className="rounded-lg border p-4"><div className="mb-2 text-xs text-slate-500">{i.role==='request'?'原悄悄话':i.role==='reply'?'回复内容':'私信正文'} · {i.messageNo}</div><div className="whitespace-pre-wrap break-words">{i.content}</div></div>)}</div>}</Dialog>
  </CommunityPage>;
}
