import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, setCsrfToken, type Activity, type Conversation, type Legal, type Message, type Registration, type Session, type UploadedMedia, type User } from './api'

const DESCRIPTION = '时空邂逅面向大学生提供线下活动信息与报名服务。在这里，你可以发布图文活动、浏览同学发起的活动、免费报名，也可以通过一对一私聊沟通活动细节。活动页面会展示发起人填写的线下预计费用，方便你提前了解安排。'

type SessionState = { session: Session | null; loading: boolean; signIn: (value: Session) => void; signOut: () => Promise<void> }
const SessionContext = createContext<SessionState | null>(null)
function useSession() { const value = useContext(SessionContext); if (!value) throw new Error('会话未初始化'); return value }
function errorText(error: unknown) { return error instanceof Error ? error.message : '操作失败，请稍后重试' }
function formatTime(value: string) { return value ? new Date(value.replace(' ', 'T')).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }) : '' }
function money(value: number) { return `¥${Number(value || 0).toFixed(2)}` }
function activityStatus(status: string) { return ({ PENDING: '审核中', APPROVED: '已发布', REJECTED: '未通过', OFFLINE: '已下架' } as Record<string, string>)[status] || '状态待更新' }

function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    api.me().then(value => { if (alive) { setCsrfToken(value.csrfToken); setSession(value) } })
      .catch(() => { if (alive) { setCsrfToken(''); setSession(null) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])
  const signIn = (value: Session) => { setCsrfToken(value.csrfToken); setSession(value) }
  const signOut = async () => { await api.logout(); setCsrfToken(''); setSession(null) }
  return <SessionContext.Provider value={{ session, loading, signIn, signOut }}>{children}</SessionContext.Provider>
}

function Shell({ children }: { children: ReactNode }) {
  const { session, signOut } = useSession()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const nav = [
    ['/', '首页'], ['/activities', '活动'], ['/publish', '发布活动'], ['/my', '我的报名'],
    ['/chats', '私聊'], ['/business', '业务介绍'], ['/about', '关于我们'],
  ]
  return <>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <header className="site-header"><div className="container header-inner">
      <Link className="brand" to="/" onClick={() => setOpen(false)} aria-label="时空邂逅官网首页"><span className="brand-mark">时</span><span>时空邂逅<small>线下活动平台</small></span></Link>
      <button className="mobile-menu" type="button" aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? '关闭菜单' : '打开菜单'}</button>
      <nav id="site-navigation" className={open ? 'site-nav open' : 'site-nav'} aria-label="主导航">{nav.map(([url, label]) => <NavLink key={url} to={url} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}</nav>
      <div className="account-area">{session ? <><span className="account-name">{session.user.nickname}</span><button type="button" className="text-button" onClick={() => void signOut().then(() => navigate('/'))}>退出</button></> : <Link className="button button-small" to="/login">注册 / 登录</Link>}</div>
    </div></header>
    <main id="main-content">{children}</main>
    <footer className="site-footer"><div className="container footer-content"><div><strong>时空邂逅 · 线下活动平台</strong><p>真实活动信息，自主报名，安心沟通。</p></div><div className="footer-links"><Link to="/legal/user-agreement">用户协议</Link><Link to="/legal/privacy-policy">隐私政策</Link><Link to="/report">不良信息举报与隐私联系</Link><a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">沪ICP备2026033427号-1</a></div></div><div className="container copyright">© {new Date().getFullYear()} 上海兴家立业网络科技有限公司</div></footer>
  </>
}

function Home() {
  return <>
    <section className="hero"><div className="container hero-grid"><div><span className="eyebrow">从线上发现，到线下同行</span><h1>和同学一起，<br/><em>把想做的事变成相聚。</em></h1><p className="lead">{DESCRIPTION}</p><div className="hero-actions"><Link className="button" to="/activities">发现活动 <span aria-hidden>→</span></Link><Link className="button button-outline" to="/publish">发布活动</Link></div><p className="hero-note">报名免费 · 线下预计费用由活动发起人填写</p></div><div className="hero-art" aria-label="活动平台功能介绍"><div className="art-orbit"/><div className="art-card art-main"><span className="art-tag">周末活动</span><div className="art-picture"><span>一起去探索</span></div><strong>一场活动，一段真实的相聚</strong><small>浏览活动 · 自主报名 · 沟通细节</small></div><div className="art-card art-float"><span>✓</span><div><strong>报名已记录</strong><small>可在我的报名中查看</small></div></div></div></div></section>
    <section className="section container"><div className="section-head"><span className="eyebrow">使用流程</span><h2>每一步都清楚可见</h2></div><div className="feature-grid"><div className="feature-card"><b>01</b><h3>浏览活动</h3><p>查看活动时间、地点、介绍和线下预计费用。</p></div><div className="feature-card"><b>02</b><h3>自主发布</h3><p>注册后上传图片并填写活动信息，审核通过后展示。</p></div><div className="feature-card"><b>03</b><h3>沟通与报名</h3><p>私聊确认细节，在网站免费报名并查看记录。</p></div></div></section>
    <section className="section section-band"><div className="container section-band-inner"><div><span className="eyebrow light">开始参与</span><h2>下一次线下活动，从这里开始。</h2><p>找一场适合自己的活动，或邀请同学一起加入。</p></div><Link className="button button-light" to="/activities">查看全部活动</Link></div></section>
  </>
}

function InfoPage({ kind }: { kind: 'about' | 'business' }) {
  const business = kind === 'business'
  return <div className="container content-page"><span className="eyebrow">{business ? '业务介绍' : '关于我们'}</span><h1>{business ? '线下活动信息与报名服务' : '连接大学生的线下活动'}</h1><p className="lead prose-lead">{DESCRIPTION}</p><div className="info-grid"><article className="surface"><h2>{business ? '活动发布与浏览' : '我们的服务'}</h2><p>{business ? '注册用户填写图文、时间、地点和线下预计费用；内容审核通过后，其他用户可浏览活动。' : '我们为大学生提供清晰的活动信息、免费报名与活动相关的一对一沟通入口。'}</p></article><article className="surface"><h2>{business ? '报名与沟通' : '内容与安全'}</h2><p>{business ? '报名免费。你可以通过私聊了解活动细节，并与发起人确认线下费用和安排。' : '网站对活动图片、帖子和私聊内容设置审核与举报渠道，由管理人员处理违规内容。'}</p></article></div><Link className="button" to="/activities">浏览活动</Link></div>
}

function ActivityCard({ activity }: { activity: Activity }) {
  return <Link className="activity-card" to={`/activities/${activity.id}`}><div className="activity-cover">{activity.images[0] ? <img src={activity.images[0].url} alt={activity.title} loading="lazy" /> : <span>线下活动</span>}</div><div className="activity-card-body"><span className="pill">免费报名</span><h3>{activity.title}</h3><p>{activity.content}</p><div className="activity-meta"><span>◷ {formatTime(activity.startTime)}</span><span>⌖ {activity.location}</span></div><div className="activity-card-foot"><span>线下预计费用 {money(activity.estimatedCost)}</span><strong>查看详情 →</strong></div></div></Link>
}

function Activities() {
  const [items, setItems] = useState<Activity[]>([])
  const [error, setError] = useState('')
  const [page, setPage] = useState(1), [hasMore, setHasMore] = useState(false), [busy, setBusy] = useState(false)
  useEffect(() => { api.activities().then(value => { setItems(value); setHasMore(value.length === 50) }).catch(e => setError(errorText(e))) }, [])
  const loadMore = async () => {
    setBusy(true); setError('')
    try { const next = page + 1; const value = await api.activities(next); setItems(previous => [...previous, ...value]); setPage(next); setHasMore(value.length === 50) }
    catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  return <div className="container content-page"><span className="eyebrow">发现线下活动</span><h1>找到想一起参与的事</h1><p className="page-intro">浏览已审核通过的活动。报名免费；页面中的线下预计费用由发起人填写。</p>{error && <p className="notice error">{error}</p>}<div className="activity-grid">{items.map(item => <ActivityCard key={item.id} activity={item} />)}</div>{!error && items.length === 0 && <div className="empty-state">目前没有开放中的活动。<Link to="/publish">发布第一场活动</Link></div>}{hasMore && <div className="load-more"><button className="button button-outline" disabled={busy} type="button" onClick={() => void loadMore()}>{busy ? '加载中…' : '加载更多活动'}</button></div>}</div>
}

function ActivityDetail() {
  const { id } = useParams()
  const activityId = Number(id)
  const { session } = useSession()
  const navigate = useNavigate()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [participants, setParticipants] = useState<User[]>([])
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!Number.isSafeInteger(activityId)) { setError('活动编号无效'); return }
    setError('')
    api.activity(activityId).catch(() => session ? api.myActivity(activityId) : Promise.reject(new Error('活动不存在或待审核')))
      .then(setActivity).catch(e => setError(errorText(e)))
    if (session) api.myRegistrations().then(list => setRegistered(list.some(item => item.activity?.id === activityId && item.status === 'REGISTERED'))).catch(() => {})
  }, [activityId, session])
  useEffect(() => { if (session && (registered || session.user.id === activity?.authorId)) api.participants(activityId).then(setParticipants).catch(() => {}) }, [activityId, registered, session, activity?.authorId])
  const register = async () => {
    if (!session) { navigate('/login'); return }
    setBusy(true); setError('')
    try { await api.register(activityId); setRegistered(true) } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  const chat = async (peerId: number) => {
    if (!session) { navigate('/login'); return }
    setBusy(true); setError('')
    try { const value = await api.startConversation(activityId, peerId); navigate(`/chats/${value.id}`) }
    catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  if (error && !activity) return <div className="container content-page"><p className="notice error">{error}</p><Link to="/activities">返回活动列表</Link></div>
  if (!activity) return <div className="container content-page">正在加载活动…</div>
  const isOwner = session?.user.id === activity.authorId
  return <div className="container content-page"><Link className="back-link" to="/activities">← 返回活动列表</Link><div className="detail-grid"><article className="surface detail-main"><div className="detail-gallery">{activity.images.map(image => <img key={image.id} src={image.url} alt={`${activity.title}活动图片`} />)}</div><span className="pill">{activity.status === 'APPROVED' ? '免费报名' : activityStatus(activity.status)}</span><h1>{activity.title}</h1><p className="detail-text">{activity.content}</p><div className="detail-facts"><div><small>活动时间</small><strong>{formatTime(activity.startTime)}</strong></div><div><small>活动地点</small><strong>{activity.location}</strong></div><div><small>线下预计费用</small><strong>{money(activity.estimatedCost)}</strong></div></div><p className="fineprint">网站报名免费，线下预计费用由发起人填写；具体安排请与发起人沟通。</p>{activity.auditNote && <p className="notice">审核说明：{activity.auditNote}</p>}</article><aside className="surface detail-side"><h2>参与活动</h2><p>发布者：{activity.authorName}</p>{error && <p className="notice error">{error}</p>}{activity.status === 'APPROVED' && !isOwner && <><button className="button full-width" type="button" disabled={busy || registered} onClick={() => void register()}>{registered ? '已报名' : busy ? '处理中…' : '免费报名'}</button><button className="button button-outline full-width" type="button" disabled={busy} onClick={() => void chat(activity.authorId)}>联系发布者</button></>}{isOwner && <p className="notice">这是你发布的活动。审核通过后可在这里查看参与者。</p>}{(registered || isOwner) && participants.length > 0 && <div className="participants"><h3>同场参与者</h3>{participants.filter(person => person.id !== session?.user.id).map(person => <button key={person.id} type="button" onClick={() => void chat(person.id)}>{person.nickname}<span>发起私聊 →</span></button>)}</div>}<Link className="report-link" to={`/report?targetType=ACTIVITY&targetId=${activity.id}`}>举报此活动</Link></aside></div></div>
}

function Publish() {
  const { session, loading } = useSession()
  const navigate = useNavigate()
  const [title, setTitle] = useState(''), [content, setContent] = useState(''), [startTime, setStartTime] = useState(''), [location, setLocation] = useState(''), [estimatedCost, setEstimatedCost] = useState('0')
  const [media, setMedia] = useState<UploadedMedia[]>([])
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const upload = async (files: FileList | null) => {
    if (!files) return
    setBusy(true); setError('')
    try { for (const file of Array.from(files).slice(0, 9 - media.length)) { const value = await api.upload(file); setMedia(previous => [...previous, value]) } }
    catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { const value = await api.publish({ title, content, startTime, location, estimatedCost: Number(estimatedCost), imageIds: media.map(item => item.id) }); navigate(`/activities/${value.id}?submitted=1`) }
    catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  if (loading) return <div className="container content-page">正在确认登录状态…</div>
  if (!session) return <LoginRequired />
  return <div className="container content-page form-page"><span className="eyebrow">发布活动</span><h1>邀请同学参加你的活动</h1><p className="page-intro">请如实填写活动信息。内容经审核后公开展示，报名免费。</p><form className="surface form-card" onSubmit={e => void submit(e)}><label>活动标题<input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：周末校园骑行" /></label><label>活动介绍<textarea required maxLength={3000} rows={6} value={content} onChange={e => setContent(e.target.value)} placeholder="介绍集合方式、路线和注意事项" /></label><div className="form-grid"><label>活动时间<input type="datetime-local" required value={startTime} onChange={e => setStartTime(e.target.value)} /></label><label>活动地点<input required maxLength={200} value={location} onChange={e => setLocation(e.target.value)} placeholder="例如：大学城南门" /></label></div><label>线下预计费用（元）<input type="number" min="0" step="0.01" required value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} /><small>这是线下活动成本估计，网站不收取报名服务费。</small></label><label>活动图片（至少一张，最多九张）<input type="file" accept="image/png,image/jpeg" multiple onChange={e => void upload(e.target.files)} disabled={busy || media.length >= 9} /></label><div className="upload-preview">{media.map((item, index) => <div key={item.id}><img src={item.previewUrl} alt={`待审核图片 ${index + 1}`} /><button type="button" onClick={() => setMedia(previous => previous.filter(image => image.id !== item.id))}>移除</button></div>)}</div>{error && <p className="notice error">{error}</p>}<button className="button" type="submit" disabled={busy || media.length === 0}>{busy ? '处理中…' : '提交审核'}</button></form></div>
}

function MyPage() {
  const { session, loading } = useSession()
  const [activities, setActivities] = useState<Activity[]>([]), [registrations, setRegistrations] = useState<Registration[]>([]), [error, setError] = useState('')
  useEffect(() => { if (session) Promise.all([api.myActivities(), api.myRegistrations()]).then(([a, r]) => { setActivities(a); setRegistrations(r) }).catch(e => setError(errorText(e))) }, [session])
  if (loading) return <div className="container content-page">正在确认登录状态…</div>
  if (!session) return <LoginRequired />
  return <div className="container content-page"><span className="eyebrow">个人中心</span><h1>我的活动与报名</h1>{error && <p className="notice error">{error}</p>}<div className="my-grid"><section className="surface"><h2>我发布的活动</h2>{activities.length === 0 && <p>还没有发布活动。</p>}{activities.map(item => <Link className="list-row" key={item.id} to={`/activities/${item.id}`}><span>{item.title}<small>{formatTime(item.startTime)}</small></span><b>{activityStatus(item.status)}</b></Link>)}<Link className="text-link" to="/publish">发布新活动 →</Link></section><section className="surface"><h2>我的报名</h2>{registrations.length === 0 && <p>还没有报名活动。</p>}{registrations.filter(item => item.activity).map(item => <Link className="list-row" key={item.id} to={`/activities/${item.activity.id}`}><span>{item.activity.title}<small>{formatTime(item.activity.startTime)}</small></span><b>已报名</b></Link>)}</section></div></div>
}

function Chats() {
  const { session, loading } = useSession()
  const { id } = useParams()
  const selected = id ? Number(id) : undefined
  const [items, setItems] = useState<Conversation[]>([]), [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => { if (session) api.conversations().then(setItems).catch(e => setError(errorText(e))) }, [session])
  useEffect(() => {
    if (!session || !selected) return
    let alive = true
    const refresh = () => api.messages(selected).then(value => { if (alive) setMessages(value) }).catch(e => { if (alive) setError(errorText(e)) })
    void refresh(); const timer = window.setInterval(refresh, 3000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [session, selected])
  const sendText = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || !input.trim()) return
    setBusy(true); setError('')
    try { await api.sendMessage(selected, { type: 'TEXT', content: input }); setInput(''); setMessages(await api.messages(selected)) }
    catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  const sendImage = async (file: File | undefined) => {
    if (!selected || !file) return
    setBusy(true); setError('')
    try { const uploaded = await api.upload(file); await api.sendMessage(selected, { type: 'IMAGE', mediaId: uploaded.id }); setMessages(await api.messages(selected)) }
    catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  if (loading) return <div className="container content-page">正在确认登录状态…</div>
  if (!session) return <LoginRequired />
  const current = items.find(item => item.id === selected)
  return <div className="container content-page"><span className="eyebrow">活动相关沟通</span><h1>一对一私聊</h1><p className="page-intro">可联系活动发布者，或报名后联系同场参与者。图片审核通过后才会送达对方。</p>{error && <p className="notice error">{error}</p>}<div className="chat-layout"><aside className="surface chat-list"><h2>会话</h2>{items.length === 0 && <p>暂无会话。可从活动详情页联系发布者。</p>}{items.map(item => <Link className={selected === item.id ? 'chat-list-item active' : 'chat-list-item'} key={item.id} to={`/chats/${item.id}`}><strong>{item.peerName}</strong><small>{item.activityTitle}</small></Link>)}</aside><section className="surface chat-panel">{current ? <><div className="chat-heading"><strong>{current.peerName}</strong><small>关于：{current.activityTitle}</small></div><div className="chat-messages" aria-live="polite">{messages.map(message => <div key={message.id} className={message.senderId === session.user.id ? 'bubble mine' : 'bubble'}><small>{message.senderId === session.user.id ? '我' : current.peerName} · {formatTime(message.createTime)}</small>{message.type === 'IMAGE' && message.imageUrl ? <img src={message.imageUrl} alt="聊天图片" /> : <p>{message.content}</p>}{message.status === 'PENDING' && <em>图片待审核</em>}{message.senderId !== session.user.id && <Link to={`/report?targetType=MESSAGE&targetId=${message.id}`}>举报</Link>}</div>)}</div><form className="chat-compose" onSubmit={e => void sendText(e)}><input aria-label="输入消息" maxLength={500} value={input} onChange={e => setInput(e.target.value)} placeholder="沟通活动相关事宜…" /><label className="upload-button">图片<input type="file" accept="image/png,image/jpeg" onChange={e => { void sendImage(e.target.files?.[0]); e.target.value = '' }} disabled={busy} /></label><button className="button button-small" type="submit" disabled={busy || !input.trim()}>发送</button></form></> : <div className="empty-state">选择会话，开始沟通活动细节。</div>}</section></div></div>
}

function Login() {
  const { session, signIn } = useSession()
  const navigate = useNavigate()
  const [phone, setPhone] = useState(''), [code, setCode] = useState('')
  const [agreement, setAgreement] = useState<Legal | null>(null), [privacy, setPrivacy] = useState<Legal | null>(null)
  const [consentOpen, setConsentOpen] = useState(true), [accepted, setAccepted] = useState(false)
  const [error, setError] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => { Promise.all([api.legal('USER_AGREEMENT'), api.legal('PRIVACY_POLICY')]).then(([a, p]) => { setAgreement(a); setPrivacy(p) }).catch(e => setError(errorText(e))) }, [])
  useEffect(() => { if (session) navigate('/my', { replace: true }) }, [session, navigate])
  const sendCode = async () => { setBusy(true); setError(''); setInfo(''); try { await api.sendCode(phone); setInfo('验证码已发送，请在五分钟内输入。') } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { if (!agreement || !privacy) throw new Error('协议尚未加载完成'); const value = await api.login({ phone, code, agreementAccepted: accepted, agreementVersion: agreement.version, privacyVersion: privacy.version }); signIn(value); navigate('/my') }
    catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  return <div className="container content-page login-page"><div className="surface form-card"><span className="eyebrow">欢迎加入</span><h1>手机号注册 / 登录</h1><p>使用手机号验证码即可加入，发现活动、发布邀请并与同学沟通。</p><form onSubmit={e => void submit(e)}><label>手机号<input type="tel" inputMode="numeric" pattern="1[3-9][0-9]{9}" required value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="请输入本人手机号" /></label><label>短信验证码<div className="code-row"><input inputMode="numeric" required maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="请输入验证码" /><button className="button button-outline" type="button" disabled={busy || phone.length !== 11} onClick={() => void sendCode()}>获取验证码</button></div></label><label className="check-row"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>我已阅读并同意 <Link to="/legal/user-agreement" target="_blank">《用户协议》</Link> 和 <Link to="/legal/privacy-policy" target="_blank">《隐私政策》</Link></span></label>{info && <p className="notice">{info}</p>}{error && <p className="notice error">{error}</p>}<button className="button full-width" type="submit" disabled={busy || !accepted || !agreement || !privacy}>{busy ? '处理中…' : '注册 / 登录'}</button></form></div>{consentOpen && <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="consent-title"><span className="eyebrow">使用前请阅读</span><h2 id="consent-title">用户协议与隐私政策</h2><p>使用前请阅读服务条款，了解活动服务和个人信息处理方式。</p><p>请先阅读<Link to="/legal/user-agreement" target="_blank">《用户协议》</Link>和<Link to="/legal/privacy-policy" target="_blank">《隐私政策》</Link>。</p><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setConsentOpen(false)}>暂不同意</button><button type="button" className="button" disabled={!agreement || !privacy} onClick={() => { setAccepted(true); setConsentOpen(false) }}>{agreement && privacy ? '已阅读并同意' : '协议加载中…'}</button></div></div></div>}</div>
}

function LegalPage({ type }: { type: 'USER_AGREEMENT' | 'PRIVACY_POLICY' }) {
  const [document, setDocument] = useState<Legal | null>(null), [error, setError] = useState('')
  useEffect(() => { api.legal(type).then(setDocument).catch(e => setError(errorText(e))) }, [type])
  return <div className="container content-page legal-page">{error && <p className="notice error">{error}</p>}{document ? <><span className="eyebrow">版本 {document.version}</span><h1>{document.title}</h1><div className="surface legal-body">{document.content}</div></> : !error && <p>正在加载协议…</p>}</div>
}

function ReportPage() {
  const { session, loading } = useSession()
  const [search] = useSearchParams()
  const [reason, setReason] = useState(''), [contact, setContact] = useState(''), [error, setError] = useState(''), [done, setDone] = useState(false), [busy, setBusy] = useState(false)
  if (loading) return <div className="container content-page">正在确认登录状态…</div>
  const rawType = search.get('targetType')
  const targetType = rawType === 'ACTIVITY' || (session && (rawType === 'MESSAGE' || rawType === 'USER')) ? rawType : 'OTHER'
  const publicTargetType = targetType === 'ACTIVITY' ? 'ACTIVITY' : 'OTHER'
  const targetId = search.get('targetId') ? Number(search.get('targetId')) : undefined
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { if (session) await api.report({ targetType, targetId, reason }); else await api.publicReport({ targetType: publicTargetType, targetId, reason, contact: contact.trim() || undefined }); setDone(true) } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }
  const targetLabel = ({ ACTIVITY: '活动', MESSAGE: '私聊消息', USER: '用户' } as Record<string, string>)[targetType]
  return <div className="container content-page form-page"><span className="eyebrow">意见反馈</span><h1>不良信息举报与隐私联系</h1><p className="page-intro">无需登录也可举报公开活动或反馈隐私问题。请说明具体情况；如需回复，请留下手机号或邮箱。</p>{done ? <div className="surface form-card"><h2>反馈已提交</h2><p>感谢反馈，我们会按规则核查。</p><Link to="/activities">返回活动列表</Link></div> : <form className="surface form-card" onSubmit={e => void submit(e)}><p>反馈对象：{targetLabel ? `${targetLabel} #${targetId ?? ''}` : '网站服务、隐私或其他问题'}</p><label>具体情况<textarea required rows={7} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="请描述发现的问题、发生时间和相关内容" /></label>{!session && <label>联系方式（选填，申请个人信息处理时请填写）<input type="text" maxLength={120} value={contact} onChange={e => setContact(e.target.value)} placeholder="手机号或邮箱，仅用于回复本次反馈" /></label>}{error && <p className="notice error">{error}</p>}<button className="button" disabled={busy} type="submit">{busy ? '提交中…' : '提交反馈'}</button></form>}</div>
}

function LoginRequired() { return <div className="container content-page"><div className="surface empty-state"><h1>请先注册或登录</h1><p>登录后即可发布活动、报名和私聊。</p><Link className="button" to="/login">前往登录</Link></div></div> }

export default function App() {
  return <SessionProvider><Shell><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/activities" element={<Activities />} />
    <Route path="/activities/:id" element={<ActivityDetail />} />
    <Route path="/publish" element={<Publish />} />
    <Route path="/my" element={<MyPage />} />
    <Route path="/chats" element={<Chats />} />
    <Route path="/chats/:id" element={<Chats />} />
    <Route path="/login" element={<Login />} />
    <Route path="/business" element={<InfoPage kind="business" />} />
    <Route path="/about" element={<InfoPage kind="about" />} />
    <Route path="/legal/user-agreement" element={<LegalPage type="USER_AGREEMENT" />} />
    <Route path="/legal/privacy-policy" element={<LegalPage type="PRIVACY_POLICY" />} />
    <Route path="/report" element={<ReportPage />} />
    <Route path="*" element={<div className="container content-page"><h1>页面不存在</h1><Link to="/">返回首页</Link></div>} />
  </Routes></Shell></SessionProvider>
}
