(function () {
  'use strict';

  const data = window.PRD07_DATA || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = { mobileView: 'home', mobileState: 'normal', recordFilter: '全部', role: 'editor', pendingAction: null, qrAgentId: null };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  function showToast(message, type = 'success') {
    const mobileToast = $('.mobile-toast');
    if (mobileToast) {
      mobileToast.textContent = message;
      mobileToast.classList.add('is-showing');
      window.clearTimeout(showToast.mobileTimer);
      showToast.mobileTimer = window.setTimeout(() => mobileToast.classList.remove('is-showing'), 1800);
      return;
    }
    const stack = $('.toast-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    stack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  function showMobileView(view) {
    state.mobileView = view;
    $$('.mobile-view').forEach(element => element.classList.toggle('is-active', element.dataset.view === view));
    $$('[data-mobile-nav]').forEach(button => button.classList.toggle('is-active', button.dataset.mobileNav === view));
    if (window.location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  }

  function setMobileState(nextState) {
    state.mobileState = nextState;
    const phone = $('.phone');
    if (phone) phone.dataset.mobileState = nextState;
    $$('[data-mobile-state-button]').forEach(button => button.classList.toggle('is-active', button.dataset.mobileStateButton === nextState));
    if (nextState === 'reward-failed') showMobileView('records');
    if (nextState === 'h5-cache' || nextState === 'h5-unavailable') showMobileView('rules');
    if (nextState === 'qr-fail' || nextState === 'empty') showMobileView('home');
    setInviteRulesH5State(nextState);
  }

  function setInviteRulesH5State(nextState) {
    const version = $('[data-h5-version]');
    const updated = $('[data-h5-updated]');
    if (!version || !updated) return;
    if (nextState === 'h5-cache') {
      version.textContent = '邀请规则 · V4.0（缓存）';
      updated.textContent = '最近成功更新时间：2026-07-17';
      return;
    }
    version.textContent = '邀请规则 · V4.1';
    updated.textContent = '更新时间：2026-07-20';
  }

  function openMobileSheet(name) {
    const sheet = $(`[data-sheet="${name}"]`);
    if (!sheet) return;
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
  }

  function closeMobileSheets() {
    $$('.mobile-sheet').forEach(sheet => { sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); });
  }

  function filterMobileRecords(filter) {
    state.recordFilter = filter;
    $$('[data-record-filter]').forEach(button => button.classList.toggle('is-active', button.dataset.recordFilter === filter));
    let visible = 0;
    $$('[data-record-status]').forEach(card => {
      const match = filter === '全部' || card.dataset.recordStatus === filter;
      card.style.display = match ? '' : 'none';
      if (match) visible += 1;
    });
    const empty = $('.records-empty');
    if (empty) empty.style.display = visible ? 'none' : 'block';
  }

  function bindMobile() {
    if (!$('.phone')) return;
    const initial = ['home', 'records', 'rules'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
    showMobileView(initial);
    $$('[data-mobile-nav]').forEach(button => button.addEventListener('click', () => showMobileView(button.dataset.mobileNav)));
    $$('[data-mobile-state-button]').forEach(button => button.addEventListener('click', () => setMobileState(button.dataset.mobileStateButton)));
    $$('[data-record-filter]').forEach(button => button.addEventListener('click', () => filterMobileRecords(button.dataset.recordFilter)));
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.dataset.action;
      if (action === 'go-home') showMobileView('home');
      if (action === 'go-records') showMobileView('records');
      if (action === 'show-rules') showMobileView('rules');
      if (action === 'open-share') openMobileSheet('share');
      if (action === 'close-sheet') closeMobileSheets();
      if (action === 'copy-code') showToast('邀请码已复制');
      if (action === 'copy-link') { closeMobileSheets(); showToast('邀请链接已复制'); }
      if (action === 'save-poster') showToast('二维码已保存到相册（Demo）');
      if (action === 'share-done') { closeMobileSheets(); showToast('已调起分享演示'); }
      if (action === 'retry-qr') { setMobileState('normal'); showToast('二维码加载成功'); }
      if (action === 'retry-rules-h5') { setMobileState('normal'); showMobileView('rules'); showToast('已加载邀请规则 V4.1'); }
      if (action === 'contact-service') showToast('客服入口为 Demo 演示');
    });
    window.addEventListener('hashchange', () => {
      const view = location.hash.slice(1);
      if (['home', 'records', 'rules'].includes(view)) showMobileView(view);
    });
  }

  const pageTitles = {
    'promo-rule-config': '推广规则配置',
    'invite-relation-list': '邀请关系',
    'invite-reward-list': '邀请奖励流水',
    'agent-list': '校园代理',
    'agent-settlement': '代理结算'
  };

  function routeAdminPage() {
    if (!$('.admin-shell')) return;
    const requested = location.hash.slice(1);
    const page = pageTitles[requested] ? requested : 'promo-rule-config';
    $$('.admin-page').forEach(section => section.classList.toggle('is-route-active', section.dataset.adminPage === page));
    $$('[data-admin-link]').forEach(link => link.classList.toggle('is-active', link.dataset.adminLink === page));
    if ($('[data-admin-title]')) $('[data-admin-title]').textContent = pageTitles[page];
    if (!pageTitles[requested]) history.replaceState(null, '', `#${page}`);
  }

  function statusTag(status) {
    const type = ['已发放', '启用', '已确定'].includes(status) ? 'success' : ['待发放', '待确定'].includes(status) ? 'warning' : 'danger';
    return `<span class="tag ${type}">${escapeHtml(status)}</span>`;
  }

  function money(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function rewardAmount(value, isAgent) { return isAgent ? `¥${money(value)}` : `${Number(value || 0).toLocaleString()} 千寻币`; }

  function renderRelations(rows = data.relations || []) {
    const body = $('[data-relation-rows]');
    if (!body) return;
    body.innerHTML = rows.length ? rows.map(row => `<tr><td><b>${escapeHtml(row.id)}</b></td><td>${escapeHtml(row.sourceObject)}</td><td>${escapeHtml(row.invitee)}</td><td><span class="source-chip">${escapeHtml(row.sourceType)}</span></td><td>${escapeHtml(row.boundAt)}</td><td><b>${rewardAmount(row.paidReward, row.sourceType === '校园代理')}</b></td><td><button class="link-button" data-action="view-relation" data-id="${escapeHtml(row.id)}">详情</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty-row">没有符合条件的关系记录</td></tr>';
    if ($('[data-relation-count]')) $('[data-relation-count]').textContent = rows.length;
  }

  function filterRelations() {
    const keyword = $('[data-filter="relation-keyword"]')?.value.trim().toLowerCase() || '';
    const invitee = $('[data-filter="relation-invitee"]')?.value.trim().toLowerCase() || '';
    const source = $('[data-filter="relation-source"]')?.value || '';
    const rows = (data.relations || []).filter(row => (!keyword || row.sourceObject.toLowerCase().includes(keyword)) && (!invitee || row.invitee.toLowerCase().includes(invitee)) && (!source || row.sourceType === source));
    renderRelations(rows);
    showToast(`查询完成，共 ${rows.length} 条`);
  }

  function openRelationDrawer(id) {
    const row = (data.relations || []).find(item => item.id === id) || data.relations?.[0];
    if (!row) return;
    $('[data-relation-drawer-title]').textContent = row.id;
    const relatedRewards = (data.rewards || []).filter(item => item.relationId === row.id);
    $('[data-relation-detail-content]').innerHTML = `<div class="drawer-summary"><div><span>关系类型</span><strong>${escapeHtml(row.sourceType)}邀请</strong></div><div><span>当前已发放奖励</span><strong>${rewardAmount(row.paidReward, row.sourceType === '校园代理')}</strong></div></div><section class="drawer-section"><h3>关系信息</h3><dl class="description-grid"><div><dt>来源对象</dt><dd>${escapeHtml(row.sourceObject)}</dd></div><div><dt>被邀请用户</dt><dd>${escapeHtml(row.invitee)}</dd></div><div><dt>绑定时间</dt><dd>${escapeHtml(row.boundAt)}</dd></div><div><dt>关系说明</dt><dd>完成注册建立，永久有效</dd></div></dl></section><section class="drawer-section"><h3>事件时间线</h3><div class="drawer-timeline"><article><i></i><div><b>通过邀请入口进入</b><span>${escapeHtml(row.boundAt.slice(0, 10))} 20:15</span></div></article><article><i></i><div><b>完成注册并建立邀请关系</b><span>${escapeHtml(row.boundAt)}</span></div></article><article><i></i><div><b>基础奖励进入发放流程</b><span>${escapeHtml(row.boundAt)}</span></div></article></div></section><section class="drawer-section"><h3>奖励记录</h3><div class="table-wrap"><table><thead><tr><th>奖励单号</th><th>事件</th><th>金额</th><th>状态</th></tr></thead><tbody>${relatedRewards.length ? relatedRewards.map(reward => `<tr><td>${escapeHtml(reward.id)}</td><td>${escapeHtml(reward.event)}</td><td>${rewardAmount(reward.amount, row.sourceType === '校园代理')}</td><td>${statusTag(reward.status)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty-row">暂无奖励记录</td></tr>'}</tbody></table></div></section>`;
    openDrawer('relation-detail');
  }

  function renderRewards(rows = data.rewards || []) {
    const body = $('[data-reward-rows]');
    if (!body) return;
    body.innerHTML = rows.length ? rows.map(row => `<tr><td><b>${escapeHtml(row.id)}</b></td><td>${escapeHtml(row.rewardObject)}</td><td>${escapeHtml(row.event)}</td><td>${escapeHtml(row.relatedUser)}</td><td><b>${rewardAmount(row.amount, row.rewardObject.startsWith('A'))}</b></td><td>${escapeHtml(row.createdAt)}</td><td>${statusTag(row.status)}</td><td><button class="link-button" data-action="view-relation" data-id="${escapeHtml(row.relationId)}">查看关系</button>${row.status === '发放失败' ? `<button class="mini-action primary" data-action="retry-reward" data-id="${escapeHtml(row.id)}" data-write>重试</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="8" class="empty-row">没有符合条件的奖励流水</td></tr>';
    if ($('[data-reward-count]')) $('[data-reward-count]').textContent = rows.length;
  }

  function filterRewards() {
    const keyword = $('[data-filter="reward-keyword"]')?.value.trim().toLowerCase() || '';
    const event = $('[data-filter="reward-event"]')?.value || '';
    const status = $('[data-filter="reward-status"]')?.value || '';
    const rows = (data.rewards || []).filter(row => (!keyword || row.rewardObject.toLowerCase().includes(keyword)) && (!event || row.event === event) && (!status || row.status === status));
    renderRewards(rows);
    showToast(`查询完成，共 ${rows.length} 条`);
  }

  function renderAgents(rows = data.agents || []) {
    const body = $('[data-agent-rows]');
    if (!body) return;
    body.innerHTML = rows.length ? rows.map(row => `<tr><td><b>${escapeHtml(row.id)}</b></td><td><button class="link-button" data-action="view-agent" data-id="${escapeHtml(row.id)}">${escapeHtml(row.name)}</button></td><td>${escapeHtml(row.campus)}</td><td>${row.scans.toLocaleString()}</td><td>${row.registers.toLocaleString()}</td><td>¥${money(row.payable)}</td><td>¥${money(row.paid)}</td><td><b>¥${money(row.pending)}</b></td><td><button class="status-button ${row.status === '启用' ? 'is-enabled' : 'is-disabled'}" data-action="toggle-agent" data-id="${escapeHtml(row.id)}" data-write>${escapeHtml(row.status)}</button></td><td><button class="mini-action" data-action="view-agent" data-id="${escapeHtml(row.id)}">详情</button><button class="mini-action primary" data-action="show-qr" data-id="${escapeHtml(row.id)}">二维码</button></td></tr>`).join('') : '<tr><td colspan="10" class="empty-row">没有符合条件的校园代理</td></tr>';
    if ($('[data-agent-count]')) $('[data-agent-count]').textContent = rows.length;
  }

  function filterAgents() {
    const keyword = $('[data-filter="agent-keyword"]')?.value.trim().toLowerCase() || '';
    const campus = $('[data-filter="agent-campus"]')?.value.trim().toLowerCase() || '';
    const status = $('[data-filter="agent-status"]')?.value || '';
    const rows = (data.agents || []).filter(row => (!keyword || `${row.id}${row.name}`.toLowerCase().includes(keyword)) && (!campus || row.campus.toLowerCase().includes(campus)) && (!status || row.status === status));
    renderAgents(rows);
    showToast(`查询完成，共 ${rows.length} 人`);
  }

  function saveAgent() {
    const name = $('[data-new-agent-name]')?.value.trim();
    const school = $('[data-new-agent-school]')?.value.trim();
    const campus = $('[data-new-agent-campus]')?.value.trim();
    if (!name || !school || !campus) { showToast('请完整填写代理名称、学校和校区', 'danger'); return; }
    const id = `A${String(data.agents.length + 24).padStart(5, '0')}`;
    data.agents.unshift({ id, name, campus: `${school} / ${campus}`, scans: 0, registers: 0, payable: 0, paid: 0, pending: 0, status: '启用', qrCode: `AGENT-${id}` });
    renderAgents();
    closeModal();
    showToast('校园代理创建成功');
  }

  function openAgentDrawer(id) {
    const row = (data.agents || []).find(item => item.id === id) || data.agents?.[0];
    if (!row) return;
    $('[data-agent-drawer-title]').textContent = `${row.name} · ${row.id}`;
    const agentRewards = (data.rewards || []).filter(item => item.rewardObject.startsWith(row.id));
    const agentSettlements = (data.settlements || []).filter(item => item.agent.startsWith(row.id));
    $('[data-agent-detail-content]').innerHTML = `<div class="drawer-summary agent-summary"><div><span>学校/校区</span><strong>${escapeHtml(row.campus)}</strong></div><div><span>累计注册数</span><strong>${row.registers}</strong></div><div><span>累计应发奖金</span><strong>¥${money(row.payable)}</strong></div><div><span>累计待结算奖金</span><strong>¥${money(row.pending)}</strong></div></div><section class="drawer-section"><h3>奖金明细</h3><div class="table-wrap"><table><thead><tr><th>奖金明细订单号</th><th>奖金事件类型</th><th>对应用户</th><th>奖金金额</th><th>生成时间</th></tr></thead><tbody>${agentRewards.length ? agentRewards.map(item => `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.event)}</td><td>${escapeHtml(item.relatedUser)}</td><td>¥${money(item.amount)}</td><td>${escapeHtml(item.createdAt)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-row">暂无奖金明细</td></tr>'}</tbody></table></div></section><section class="drawer-section"><h3>结算记录</h3><div class="table-wrap"><table><thead><tr><th>结算单号</th><th>结算周期</th><th>结算金额</th><th>结算状态</th><th>结算时间</th></tr></thead><tbody>${agentSettlements.length ? agentSettlements.map(item => `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.period)}</td><td>¥${money(item.amount)}</td><td>${statusTag(item.status)}</td><td>${escapeHtml(item.confirmedAt)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-row">暂无结算记录</td></tr>'}</tbody></table></div></section>`;
    openDrawer('agent-detail');
  }

  function drawQrCode(canvas, seed) {
    const context = canvas.getContext('2d');
    const modules = 29;
    const cell = canvas.width / modules;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    let hash = 2166136261;
    for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    const finder = (x, y) => {
      context.fillStyle = '#111827'; context.fillRect(x * cell, y * cell, 7 * cell, 7 * cell);
      context.fillStyle = '#fff'; context.fillRect((x + 1) * cell, (y + 1) * cell, 5 * cell, 5 * cell);
      context.fillStyle = '#111827'; context.fillRect((x + 2) * cell, (y + 2) * cell, 3 * cell, 3 * cell);
    };
    for (let y = 0; y < modules; y += 1) for (let x = 0; x < modules; x += 1) {
      const reserved = (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20);
      hash = Math.imul(hash ^ (x + y * modules), 2246822519);
      if (!reserved && ((hash >>> 28) & 1)) { context.fillStyle = '#111827'; context.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell)); }
    }
    finder(1, 1); finder(21, 1); finder(1, 21);
  }

  function openQrModal(id) {
    const row = (data.agents || []).find(item => item.id === id);
    if (!row) return;
    state.qrAgentId = id;
    $('[data-qr-title]').textContent = `${row.name} · ${row.id}`;
    drawQrCode($('[data-qr-canvas]'), row.qrCode);
    $('[data-modal="qrcode"]').classList.add('is-open');
  }

  function qrBlob() {
    return new Promise((resolve, reject) => $('[data-qr-canvas]').toBlob(blob => blob ? resolve(blob) : reject(new Error('二维码生成失败')), 'image/png'));
  }

  async function downloadQrCode() {
    try {
      const blob = await qrBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.qrAgentId || 'agent'}-qrcode.png`;
      document.body.appendChild(link);
      link.click(); link.remove(); URL.revokeObjectURL(url);
      showToast('二维码图片已保存');
    } catch (error) { showToast(error.message, 'danger'); }
  }

  async function copyQrCode() {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('当前浏览器不支持复制图片，请使用保存成图片');
      const blob = await qrBlob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('二维码图片已复制');
    } catch (error) { showToast(error.message || '复制失败，请使用保存成图片', 'danger'); }
  }

  function renderSettlements(rows = data.settlements || []) {
    const body = $('[data-settlement-rows]');
    if (!body) return;
    body.innerHTML = rows.length ? rows.map(row => `<tr><td><b>${escapeHtml(row.id)}</b></td><td><button class="link-button" data-action="view-agent" data-id="${escapeHtml(row.agent.split(' / ')[0])}">${escapeHtml(row.agent)}</button></td><td>${escapeHtml(row.campus)}</td><td>${escapeHtml(row.period)}</td><td><b>¥${money(row.amount)}</b></td><td>${escapeHtml(row.generatedAt)}</td><td>${statusTag(row.status)}</td><td>${escapeHtml(row.confirmedAt)}</td><td>${row.status === '待确定' ? `<button class="mini-action primary" data-action="confirm-settlement" data-id="${escapeHtml(row.id)}" data-write>确定结算</button>` : '—'}</td></tr>`).join('') : '<tr><td colspan="9" class="empty-row">没有符合条件的结算单</td></tr>';
  }

  function confirmSettlement(id) {
    const row = (data.settlements || []).find(item => item.id === id);
    if (!row) return;
    row.status = '已确定';
    row.confirmedAt = '2026-07-17 16:42';
    renderSettlements();
    renderAgents();
    showToast('结算已确定');
  }

  function filterSettlements() {
    const id = $('[data-filter="settlement-id"]')?.value.trim().toLowerCase() || '';
    const agent = $('[data-filter="settlement-agent"]')?.value.trim().toLowerCase() || '';
    const status = $('[data-filter="settlement-status"]')?.value || '';
    const rows = (data.settlements || []).filter(row => (!id || row.id.toLowerCase().includes(id)) && (!agent || row.agent.toLowerCase().includes(agent)) && (!status || row.status === status));
    renderSettlements(rows);
    showToast(`查询完成，共 ${rows.length} 条`);
  }

  function toggleRewardMode(kind, mode) {
    const panel = $(`[data-ladder-panel="${kind}"]`);
    if (panel) panel.hidden = mode !== 'ladder';
  }

  function addLadder(kind) {
    const table = $(`[data-ladder-table="${kind}"]`);
    if (!table) return;
    const label = document.createElement('label');
    label.innerHTML = '<span>累计人数</span><input type="number" value="30" data-write><span>额外</span><input type="number" value="200" data-write><small>元</small>';
    table.appendChild(label);
    applyRole(state.role);
    showToast('已增加30人档位，请保存发布');
  }

  function savePromoRules() {
    const activePanel = $('.rule-panel.is-active');
    const values = $$('[data-ladder-table] input', activePanel).map(input => Number(input.value));
    if (values.some(value => !Number.isFinite(value) || value <= 0)) { showToast('阶梯人数和金额必须大于0', 'danger'); return; }
    openConfirm('保存并发布规则？', '发布后只影响新发生的奖励事件，历史档位不追溯。', () => showToast('规则 V4.1 已发布，审计记录已生成'));
  }

  function openConfirm(title, message, callback) {
    $('[data-dialog-title]').textContent = title;
    $('[data-dialog-message]').textContent = message;
    state.pendingAction = callback;
    $('[data-modal="confirm"]').classList.add('is-open');
  }

  function closeModal() {
    $$('.modal-backdrop').forEach(modal => modal.classList.remove('is-open'));
    state.pendingAction = null;
  }

  function openDrawer(name) { $(`[data-drawer="${name}"]`)?.classList.add('is-open'); }
  function closeDrawer() { $$('.drawer-backdrop').forEach(drawer => drawer.classList.remove('is-open')); }

  function applyRole(role) {
    state.role = role;
    $$('[data-write]').forEach(control => { control.disabled = role === 'viewer'; });
    if (role === 'viewer') showToast('已切换为只读权限，编辑操作被禁用', 'warning');
  }

  function bindAdmin() {
    if (!$('.admin-shell')) return;
    renderRelations(); renderRewards(); renderAgents(); renderSettlements(); routeAdminPage();
    window.addEventListener('hashchange', routeAdminPage);
    $('[data-role-select]')?.addEventListener('change', event => applyRole(event.target.value));
    $$('[data-rule-tab]').forEach(button => button.addEventListener('click', () => {
      $$('[data-rule-tab]').forEach(item => item.classList.toggle('is-active', item === button));
      $$('[data-rule-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.rulePanel === button.dataset.ruleTab));
    }));
    $$('[data-reward-mode]').forEach(input => input.addEventListener('change', () => toggleRewardMode(input.dataset.rewardMode, input.value)));
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger || trigger.disabled) return;
      const action = trigger.dataset.action;
      const id = trigger.dataset.id;
      if (action === 'save-promo-rules') savePromoRules();
      if (action === 'add-ladder') addLadder(trigger.dataset.ladderKind);
      if (action === 'filter-relations') filterRelations();
      if (action === 'reset-relations') { $$('[data-filter^="relation-"]').forEach(input => { input.value = ''; }); renderRelations(); }
      if (action === 'view-relation') openRelationDrawer(id);
      if (action === 'filter-rewards') filterRewards();
      if (action === 'reset-rewards') { $$('[data-filter^="reward-"]').forEach(input => { input.value = ''; }); renderRewards(); }
      if (action === 'retry-reward') openConfirm('确认重试发放？', `奖励单 ${id} 将重新进入待发放队列。`, () => { const row = data.rewards.find(item => item.id === id); row.status = '待发放'; renderRewards(); showToast('已重新提交发放'); });
      if (action === 'open-agent-modal') $('[data-modal="agent"]').classList.add('is-open');
      if (action === 'save-agent') saveAgent();
      if (action === 'filter-agents') filterAgents();
      if (action === 'reset-agents') { $$('[data-filter^="agent-"]').forEach(input => { input.value = ''; }); renderAgents(); }
      if (action === 'view-agent') openAgentDrawer(id);
      if (action === 'toggle-agent') openConfirm('确认调整代理状态？', '状态变更后不影响历史关系和结算单。', () => { const row = data.agents.find(item => item.id === id); row.status = row.status === '启用' ? '停用' : '启用'; renderAgents(); showToast('代理状态已更新'); });
      if (action === 'show-qr') openQrModal(id);
      if (action === 'download-qr') downloadQrCode();
      if (action === 'copy-qr') copyQrCode();
      if (action === 'filter-settlements') filterSettlements();
      if (action === 'reset-settlements') { $$('[data-filter^="settlement-"]').forEach(input => { input.value = ''; }); renderSettlements(); }
      if (action === 'confirm-settlement') openConfirm('确定本期结算？', `结算单 ${id} 确定后不可在本页回退。`, () => confirmSettlement(id));
      if (action === 'export-task') showToast('导出任务已创建');
      if (action === 'close-modal') closeModal();
      if (action === 'confirm-modal') { const callback = state.pendingAction; closeModal(); if (callback) callback(); }
      if (action === 'close-drawer') closeDrawer();
    });
  }

  bindMobile();
  bindAdmin();
})();
