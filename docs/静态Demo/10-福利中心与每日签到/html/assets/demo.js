(() => {
  const data = window.PRD10_DATA;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const open = el => el && el.classList.add('open');
  const close = el => el && el.classList.remove('open');
  $$('[data-close]').forEach(btn => btn.addEventListener('click', () => close(btn.closest('.overlay'))));
  $$('.overlay').forEach(el => el.addEventListener('click', e => { if (e.target === el) close(el); }));

  const phone = $('#signinApp');
  if (phone) {
    let state = 'available';
    const rail = $('#rewardRail');
    const rewards = data.config.extras.map(x => x + data.config.baseReward);
    const renderRail = () => {
      const current = state === 'signed' || state === 'pending' ? 4 : 4;
      rail.innerHTML = rewards.map((reward, i) => `<div class="reward-day ${i < current - 1 ? 'signed' : ''} ${i === current - 1 ? 'today' : ''}"><span>第${i + 1}天</span><i>¥</i><b>${reward}</b><small>${i < current - 1 ? '已签到' : i === current - 1 ? (state === 'signed' || state === 'pending' ? '已签到' : '今日') : '待签到'}</small></div>`).join('');
    };
    const renderRecords = () => {
      $('#mobileRecords').innerHTML = data.records.slice(0, 4).map(r => `<div class="record-row"><span>${r.date}</span><span>连续第 ${r.streak} 天</span><strong>+${r.reward}</strong><em>${r.status === 'success' ? '已到账' : r.status === 'pending' ? '奖励发放中' : '系统重试中'}</em></div>`).join('');
    };
    const setState = next => {
      state = next; phone.classList.toggle('error', next === 'error');
      $$('.demo-switcher [data-demo-state]').forEach(b => b.classList.toggle('active', b.dataset.demoState === next));
      const button = $('#signButton'); const hint = $('#actionHint');
      const states = { available: ['立即签到', false, '今天签到可得 20 千寻币'], signed: ['今日已签到', true, '已获得 20 千寻币，明日继续'], pending: ['今日已签到', true, '奖励发放中，请稍后查看资产流水'], disabled: ['暂未开放', true, '签到活动暂未开放'] };
      if (states[next]) { button.textContent = states[next][0]; button.disabled = states[next][1]; hint.textContent = states[next][2]; }
      renderRail();
    };
    renderRail(); renderRecords();
    $$('.demo-switcher [data-demo-state]').forEach(b => b.addEventListener('click', () => setState(b.dataset.demoState)));
    $('#signButton').addEventListener('click', () => { if (state !== 'available') return; data.records.unshift({ user:'当前用户', date:'2026-07-15', streak:4, reward:20, status:'success' }); $('#streakValue').textContent='4'; $('#totalValue').textContent='55'; renderRecords(); setState('signed'); open($('#successModal')); });
    $('#openRules').addEventListener('click', () => { const content=data.config.ruleContent; $('#rulePageTitle').textContent=content.title; $('#ruleVersion').textContent=content.version; $('#fallbackBanner').style.display=content.published&&content.url?'none':'block'; open($('#rulesPage')); });
    $('#retryButton').addEventListener('click', () => setState('available'));
  }

  const editor = $('#rewardEditor');
  if (editor) {
    let pendingAction = null;
    const toast = msg => { const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1800); };
    const renderEditor = () => { const days=Math.max(1,Math.min(31,Number($('#cycleInput').value)||1)); const base=Number($('#baseInput').value)||0; while(data.config.extras.length<days)data.config.extras.push(0); data.config.extras=data.config.extras.slice(0,days); editor.innerHTML=data.config.extras.map((x,i)=>`<label class="reward-cell"><span>第 ${i+1} 天</span><input type="number" min="0" max="10000" value="${x}" data-extra="${i}"><b>总计 ${base+x}</b></label>`).join(''); };
    const renderRows = (rows=data.records) => { $('#recordRows').innerHTML=rows.map(r=>`<tr><td>${r.user}</td><td>${r.date} ${r.time||''}</td><td>第 ${r.streak} 天</td><td>${r.reward} 千寻币</td><td><span class="status ${r.status}">${{success:'已发放',pending:'待发放',failed:'发放失败'}[r.status]}</span></td><td>${r.flow}</td></tr>`).join(''); $('#tableEmpty').style.display=rows.length?'none':'block'; $('#recordCount').textContent=`共 ${rows.length} 条记录`; };
    const renderLogs=()=>{$('#logList').innerHTML=data.logs.map(l=>`<div class="log-row"><strong>${l.action}</strong><span>${l.time} · ${l.operator}</span><p>${l.detail}</p></div>`).join('');};
    renderEditor(); renderRows(); renderLogs();
    $('#cycleInput').addEventListener('input',renderEditor); $('#baseInput').addEventListener('input',renderEditor); editor.addEventListener('input',e=>{if(e.target.dataset.extra!==undefined){data.config.extras[Number(e.target.dataset.extra)]=Number(e.target.value)||0;renderEditor();}});
    $$('[data-tab]').forEach(b=>b.addEventListener('click',()=>{$$('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('.tab-panel').forEach(x=>x.classList.remove('active'));$(`#${b.dataset.tab}Tab`).classList.add('active');}));
    const confirm=(title,text,fn)=>{$('#confirmTitle').textContent=title;$('#confirmText').textContent=text;pendingAction=fn;open($('#confirmModal'));};
    $('#publishConfig').addEventListener('click',()=>confirm('确认发布奖励规则？','新规则仅影响发布后的签到，历史签到和奖励不会追溯或补差。',()=>{data.config.version+=1;$('#versionMetric').textContent=`v${data.config.version}`;data.logs.unshift({time:'2026-07-15 10:08:20',operator:'当前运营',action:'发布奖励规则',detail:`发布 v${data.config.version}，周期 ${$('#cycleInput').value} 天`});renderLogs();toast('奖励规则发布成功');}));
    $('#toggleActivity').addEventListener('click',()=>{const closing=data.config.enabled;confirm(closing?'确认关闭活动？':'确认开启活动？',closing?'关闭后用户将无法签到且连续签到中断。':'开启后用户可按当前规则签到。',()=>{data.config.enabled=!closing;$('#activityDot').classList.toggle('off',!data.config.enabled);$('#activityText').textContent=data.config.enabled?'活动已开启':'活动已关闭';$('#toggleActivity').textContent=data.config.enabled?'关闭活动':'开启活动';$('#enabledInput').checked=data.config.enabled;toast(data.config.enabled?'活动已开启':'活动已关闭');});});
    $('#confirmAction').addEventListener('click',()=>{if(pendingAction)pendingAction();pendingAction=null;close($('#confirmModal'));});
    $('#openLogs').addEventListener('click',()=>open($('#logsDrawer')));
    $('#previewRule').addEventListener('click',()=>{const url=$('#ruleUrlInput').value.trim();if(!url.startsWith('https://')){toast('请输入有效的 HTTPS 地址');return;}$('#previewTitle').textContent=$('#ruleTitleInput').value.trim()||'签到规则';try{$('#previewDomain').textContent=new URL(url).hostname;}catch{$('#previewDomain').textContent='H5 地址无效';}open($('#rulePreview'));});
    $('#publishRule').addEventListener('click',()=>{const title=$('#ruleTitleInput').value.trim(),url=$('#ruleUrlInput').value.trim();if(!title||!url.startsWith('https://')){toast('请填写标题和有效的 HTTPS 地址');return;}confirm('确认发布签到规则 H5？','发布后移动端签到规则将立即更新，奖励配置版本不会变化。',()=>{const parts=data.config.ruleContent.version.slice(1).split('.').map(Number);data.config.ruleContent={title,url,version:`v${parts[0]}.${parts[1]+1}`,published:true};$('#rulePublishedState').textContent=`已发布 · ${data.config.ruleContent.version}`;data.logs.unshift({time:'2026-07-15 10:18:20',operator:'当前运营',action:'发布签到规则 H5',detail:`内容版本 ${data.config.ruleContent.version}`});renderLogs();toast('签到规则 H5 已发布');});});
    const query=()=>{const user=$('#userFilter').value.trim();const date=$('#dateFilter').value;const status=$('#statusFilter').value;renderRows(data.records.filter(r=>(!user||r.user===user)&&(!date||r.date===date)&&(!status||r.status===status)));};
    $('#queryRecords').addEventListener('click',query); $('#resetRecords').addEventListener('click',()=>{$('#userFilter').value='';$('#dateFilter').value='';$('#statusFilter').value='';renderRows();});
  }
})();
