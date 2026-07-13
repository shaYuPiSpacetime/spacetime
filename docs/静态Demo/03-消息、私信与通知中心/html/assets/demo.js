(function () {
  const data = window.DEMO_DATA || {};
  const common = window.DemoCommon || {};
  const qs = common.qs || ((selector, root = document) => root.querySelector(selector));
  const qsa = common.qsa || ((selector, root = document) => Array.from(root.querySelectorAll(selector)));
  const escapeHtml = common.escapeHtml || ((value) => String(value ?? ''));
  const showToast = common.showToast || (() => {});
  const openModal = common.openModal || (() => {});
  const openDrawer = common.openDrawer || (() => {});
  const statusClass = common.statusClass || (() => 'brand');
  const state = { whisperMode: 'received', currentRecordType: '全部', currentRecord: data.records?.[0], currentReport: data.reportRows?.[0] };

  const recordTypeText = {
    private_message: '私信记录',
    whisper_message: '悄悄话记录',
    official_message: '官方消息记录',
    notification: '站内通知记录'
  };

  function tag(text) {
    return `<span class="tag ${statusClass(text)}">${escapeHtml(text)}</span>`;
  }

  function renderConversationRows(selector) {
    const target = qs(selector);
    if (!target) return;
    target.innerHTML = (data.conversations || []).map((item, index) => `
      <article class="message-row" data-toast="进入与${escapeHtml(item.name)}的普通私信">
        <div class="avatar ${index % 2 ? 'alt' : ''}">${escapeHtml(item.avatar)}</div>
        <div class="row-main"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.desc)}</span></div>
        <div>${item.unread ? `<span class="unread-dot">${escapeHtml(item.unread)}</span>` : `<span>${escapeHtml(item.time)}</span>`}</div>
      </article>`).join('');
  }

  function renderChatMessages() {
    const target = qs('[data-render="chat-messages"]');
    if (!target) return;
    target.innerHTML = (data.chatMessages || []).map((item) => `
      <div class="bubble ${escapeHtml(item.side || 'left')}">
        ${item.name ? `<strong>${escapeHtml(item.name)}</strong>` : ''}<span>${escapeHtml(item.text)}</span>
        ${item.time ? `<span>${escapeHtml(item.time)}</span>` : ''}
        ${(item.side || '').includes('failed') ? '<button class="btn full" type="button" data-toast="消息已重新发送">重试发送</button>' : ''}
      </div>`).join('');
  }

  function renderAssistantMessages() {
    const target = qs('[data-render="assistant-messages"]');
    if (!target) return;
    target.innerHTML = (data.assistantMessages || []).map((item) => `
      <article class="official-card"><span>${escapeHtml(item.time)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p>
      ${item.action ? `<button class="btn primary" type="button" data-toast="${escapeHtml(item.action)}">${escapeHtml(item.action)}</button>` : ''}</article>`).join('');
  }

  function renderWhisperApplications() {
    const target = qs('[data-render="whisper-applications"]');
    if (!target) return;
    const rows = data.whisperApplications?.[state.whisperMode] || [];
    const pending = rows.filter((item) => item.status === '未处理');
    const handled = rows.filter((item) => item.status !== '未处理');
    const group = (title, items) => items.length ? `<h3>${title}（${items.length}）</h3>${items.map((item) => `
      <article class="whisper-application-row" data-whisper-id="${escapeHtml(item.id)}"><div class="avatar">缘</div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.action || item.status)}</span></article>`).join('')}` : '';
    target.innerHTML = state.whisperMode === 'received' ? group('未处理', pending) + group('已处理', handled) : group('申请记录', rows);
  }

  function renderWhisperDetail(id = 'W01') {
    const target = qs('[data-render="whisper-detail"]');
    if (!target) return;
    const rows = [...(data.whisperApplications?.received || []), ...(data.whisperApplications?.sent || [])];
    const item = rows.find((row) => row.id === id) || rows[0];
    if (!item) return;
    const action = item.expired
      ? '<button class="btn primary full" type="button" data-open-modal="whisperPayModal">申请认识</button>'
      : item.status === '未处理'
        ? '<button class="btn primary full" type="button" data-whisper-reply>回复并匹配</button>'
        : '<button class="btn full" type="button" data-toast="进入普通私信">去私信</button>';
    target.innerHTML = `<article class="whisper-card"><div class="message-row" data-toast="进入个人主页"><div class="avatar">缘</div><div class="row-main"><strong>${escapeHtml(item.name)}</strong><span>点击头像可进入主页举报或拉黑</span></div></div><p>你好，希望能和你认识一下～</p><div class="timeline"><span>申请已发送</span><strong>${escapeHtml(item.action || item.status)}</strong></div>${action}</article>`;
  }

  function renderSystemMessageFlow() {
    const target = qs('[data-render="system-message-flow"]');
    if (!target) return;
    target.innerHTML = (data.notifications || []).map((item) => {
      const actionText = item.bizType === 'platform_announcement' ? '' : item.category === '活动' ? '参加活动' : item.category === '精选' ? '查看精选' : '参与话题';
      return `<article class="official-card"><span>${escapeHtml(item.time)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}。欢迎进入社区参与讨论并分享你的真实想法。</p>${actionText ? `<button class="btn primary full" type="button" data-toast="进入对应社区内容">${actionText}</button>` : ''}</article>`;
    }).join('');
  }

  function filteredRecords() {
    return state.currentRecordType === '全部' ? (data.records || []) : (data.records || []).filter((row) => row.recordType === state.currentRecordType);
  }

  function renderRecords() {
    const target = qs('[data-render="records"]');
    if (!target) return;
    target.innerHTML = filteredRecords().map((row) => `<tr><td>${escapeHtml(row.recordNo)}</td><td>${escapeHtml(recordTypeText[row.recordType] || row.recordType)}</td><td>${escapeHtml(row.userNo)}</td><td>${escapeHtml(row.targetUserNo)}</td><td>${escapeHtml(row.preview)}</td><td>${escapeHtml(row.title)}</td><td>${tag(row.status)}</td><td>${escapeHtml(row.time)}</td><td><button class="btn" data-open-record="${escapeHtml(row.recordNo)}">详情</button></td></tr>`).join('');
  }

  function renderRecordDrawer() {
    const target = qs('[data-render="record-detail"]');
    if (!target || !state.currentRecord) return;
    const row = state.currentRecord;
    target.innerHTML = `<ul class="kv-list"><li><span>记录编号</span><strong>${escapeHtml(row.recordNo)}</strong></li><li><span>记录类型</span><strong>${escapeHtml(recordTypeText[row.recordType])}</strong></li><li><span>用户编号</span><strong>${escapeHtml(row.userNo)}</strong></li><li><span>状态</span><strong>${escapeHtml(row.status)}</strong></li></ul><div class="notice-panel"><strong>内容摘要</strong><p>${escapeHtml(row.preview)}</p></div>`;
  }

  function renderConfigLogs() {
    const target = qs('[data-render="config-logs"]');
    if (target) target.innerHTML = (data.configLogs || []).map((item) => `<article class="admin-card"><h3>${escapeHtml(item.action)}</h3><p>${escapeHtml(item.time)} / ${escapeHtml(item.user)}</p><span>${escapeHtml(item.detail)}</span></article>`).join('');
  }

  function renderReports() {
    const target = qs('[data-render="reports"]');
    if (!target) return;
    target.innerHTML = (data.reportRows || []).map((row) => `<tr><td>${escapeHtml(row.reportNo)}</td><td>${escapeHtml(row.source)}</td><td>${escapeHtml(row.reporter)}</td><td>${escapeHtml(row.target)}</td><td>${escapeHtml(row.reason)}</td><td>${tag(row.status)}</td><td>${escapeHtml(row.context)}</td><td><button class="btn" data-open-report="${escapeHtml(row.reportNo)}">处理</button></td></tr>`).join('');
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const toastNode = event.target.closest('[data-toast]');
      if (toastNode) showToast(toastNode.dataset.toast);
      const modalNode = event.target.closest('[data-open-modal]');
      if (modalNode) openModal(modalNode.dataset.openModal);
      const scrollNode = event.target.closest('[data-scroll-target]');
      if (scrollNode) document.getElementById(scrollNode.dataset.scrollTarget)?.scrollIntoView({ behavior: 'smooth' });
      const whisperTab = event.target.closest('[data-set-whisper-mode]');
      if (whisperTab) {
        state.whisperMode = whisperTab.dataset.value;
        qsa('[data-set-whisper-mode]').forEach((button) => button.classList.toggle('is-active', button === whisperTab));
        renderWhisperApplications();
      }
      const whisperRow = event.target.closest('[data-whisper-id]');
      if (whisperRow) renderWhisperDetail(whisperRow.dataset.whisperId);
      if (event.target.closest('[data-whisper-reply]')) {
        showToast('回复成功，已匹配并进入普通私信');
        renderWhisperDetail('W04');
      }
      const recordNode = event.target.closest('[data-open-record]');
      if (recordNode) {
        state.currentRecord = (data.records || []).find((row) => row.recordNo === recordNode.dataset.openRecord) || state.currentRecord;
        renderRecordDrawer();
        openDrawer('recordDrawer');
      }
      const reportNode = event.target.closest('[data-open-report]');
      if (reportNode) {
        state.currentReport = (data.reportRows || []).find((row) => row.reportNo === reportNode.dataset.openReport) || state.currentReport;
        openDrawer('reportDrawer');
      }
      if (event.target.closest('[data-save-config]')) showToast('配置已保存并写入审计日志');
      if (event.target.closest('[data-export-records]')) openModal('exportModal');
      if (event.target.closest('[data-view-content]')) openModal('contentConfirmModal');
    });
    qsa('[data-record-type-filter]').forEach((select) => select.addEventListener('change', () => { state.currentRecordType = select.value; renderRecords(); }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderConversationRows('[data-render="conversations"]');
    renderConversationRows('[data-render="private-conversations"]');
    renderChatMessages();
    renderAssistantMessages();
    renderWhisperApplications();
    renderWhisperDetail();
    renderSystemMessageFlow();
    renderRecords();
    renderRecordDrawer();
    renderConfigLogs();
    renderReports();
    bindEvents();
    common.wireBackdropClose?.();
  });
})();
