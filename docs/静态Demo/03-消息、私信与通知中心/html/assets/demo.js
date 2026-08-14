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
  const state = {
    whisperMode: 'received',
    currentWhisperId: 'W01',
    currentRecordType: '全部',
    currentRecord: data.records?.[0],
    currentReport: data.reportRows?.[0],
    safetyEnabled: true
  };

  const recordTypeText = {
    private_message: '私信记录',
    whisper_message: '悄悄话记录',
    system_message: '系统消息记录'
  };

  const whisperStatusText = {
    pending: '等待回应',
    replied: '已回复',
    expired: '申请已结束',
    invalid: '申请已结束'
  };

  function tag(text) {
    return `<span class="tag ${statusClass(text)}">${escapeHtml(text)}</span>`;
  }

  function allWhispers() {
    return [
      ...(data.whisperApplications?.received || []),
      ...(data.whisperApplications?.sent || [])
    ];
  }

  function setState(screenSelector, buttonSelector, value, attribute) {
    qsa(screenSelector).forEach((screen) => {
      screen.classList.toggle('is-active', screen.getAttribute(attribute) === value);
    });
    qsa(buttonSelector).forEach((button) => {
      button.classList.toggle('is-active', button.dataset.value === value);
    });
  }

  function renderConversationRows(selector) {
    const target = qs(selector);
    if (!target) return;
    const limit = Number(target.dataset.limit || 0);
    const rows = limit ? (data.conversations || []).slice(0, limit) : (data.conversations || []);
    target.innerHTML = rows.map((item, index) => `
      <article class="message-row" data-toast="进入与${escapeHtml(item.name)}的普通私信">
        <div class="avatar ${index % 2 ? 'alt' : ''}">${escapeHtml(item.avatar)}</div>
        <div class="row-main">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.desc)}</span>
          ${item.protectStatus ? `<small>${escapeHtml(item.protectStatus)}</small>` : ''}
        </div>
        <div>${item.unread ? `<span class="unread-dot">${escapeHtml(item.unread)}</span>` : `<span>${escapeHtml(item.time)}</span>`}</div>
      </article>`).join('');
  }

  function renderChatMessages() {
    const target = qs('[data-render="chat-messages"]');
    if (!target) return;
    target.innerHTML = (data.chatMessages || []).map((item) => `
      <div class="bubble ${escapeHtml(item.side || 'left')}" data-message-id="${escapeHtml(item.id)}">
        ${item.name ? `<strong>${escapeHtml(item.name)}</strong>` : ''}
        <span>${escapeHtml(item.text)}</span>
        ${item.time ? `<span>${escapeHtml(item.time)}</span>` : ''}
        ${item.reportable ? `<button class="icon-action" type="button" title="举报这条消息" aria-label="举报这条消息" data-report-message="${escapeHtml(item.id)}">⋯</button>` : ''}
        ${(item.side || '').includes('failed') ? '<button class="btn full" type="button" data-toast="消息已重新发送">重试发送</button>' : ''}
      </div>`).join('');
  }

  function renderAssistantMessages() {
    const target = qs('[data-render="assistant-messages"]');
    if (!target) return;
    target.innerHTML = (data.assistantMessages || []).map((item) => `
      <article class="official-card">
        <span>${escapeHtml(item.time)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.text)}</p>
        ${item.action ? `<button class="btn primary" type="button" data-toast="${escapeHtml(item.action)}">${escapeHtml(item.action)}</button>` : ''}
      </article>`).join('');
  }

  function renderWhisperApplications() {
    const target = qs('[data-render="whisper-applications"]');
    if (!target) return;
    const rows = data.whisperApplications?.[state.whisperMode] || [];
    const pending = rows.filter((item) => item.status === 'pending');
    const handled = rows.filter((item) => item.status !== 'pending');
    const group = (title, items) => items.length ? `
      <h3>${title}（${items.length}）</h3>
      ${items.map((item) => `
        <article class="whisper-application-row" data-select-whisper-detail="${escapeHtml(item.id)}">
          <div class="avatar">缘</div>
          <div class="row-main">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.content)}</span>
          </div>
          <span>${escapeHtml(item.action || whisperStatusText[item.status])}</span>
        </article>`).join('')}` : '';
    target.innerHTML = group(state.whisperMode === 'received' ? '待处理' : '等待中', pending) + group('已结束', handled);
  }

  function renderWhisperDetail(id = state.currentWhisperId) {
    const target = qs('[data-render="whisper-detail"]');
    if (!target) return;
    const item = allWhispers().find((row) => row.id === id) || allWhispers()[0];
    if (!item) return;
    state.currentWhisperId = item.id;
    qsa('.whisper-detail-controls [data-select-whisper-detail]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.selectWhisperDetail === item.id);
    });

    let action = '';
    if (item.status === 'pending' && item.direction === 'received') {
      action = `
        <label class="field">回复内容<textarea rows="3">你好，很高兴认识你，我们可以先从站内聊起。</textarea></label>
        ${item.replyWillFail ? '<div class="notice-panel is-error">上次提交未完成，回复、匹配和会话均未生成；申请仍为等待回应。</div>' : ''}
        <button class="btn primary full" type="button" data-whisper-reply>回复并匹配</button>`;
    } else if (item.status === 'pending') {
      action = '<div class="notice-panel">等待对方回应。发送方看不到已读状态，也不能再次发送。</div>';
    } else if (item.status === 'replied') {
      action = '<button class="btn primary full" type="button" data-toast="进入唯一普通私信会话">去私信</button>';
    } else {
      action = item.canReverse
        ? '<button class="btn primary full" type="button" data-open-modal="whisperPayModal">申请认识</button>'
        : '<div class="notice-panel">申请已结束，不展示具体原因。</div>';
    }

    target.innerHTML = `
      <article class="whisper-card">
        <div class="message-row">
          <div class="avatar">缘</div>
          <div class="row-main">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(whisperStatusText[item.status])}</span>
          </div>
          <button class="icon-action" type="button" title="举报悄悄话" aria-label="举报悄悄话" data-report-whisper="${escapeHtml(item.id)}">⋯</button>
        </div>
        <p>${escapeHtml(item.content)}</p>
        <div class="timeline"><span>统一状态</span><strong>${escapeHtml(whisperStatusText[item.status])}</strong></div>
        ${action}
      </article>`;
  }

  function renderSystemMessageFlow(mode = 'default') {
    const target = qs('[data-render="system-message-flow"]');
    if (!target) return;
    const rows = mode === 'restricted'
      ? (data.notifications || []).filter((item) => item.restrictedVisible)
      : (data.notifications || []);
    target.innerHTML = rows.map((item) => `
      <article class="official-card system-message-card" data-notice-id="${escapeHtml(item.id)}">
        <div class="system-message-meta">
          <span>${escapeHtml(item.category)}</span>
          <time>${escapeHtml(item.time)}</time>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.content)}</p>
        ${item.actionLabel ? `<button class="btn primary full" type="button" data-toast="${escapeHtml(item.actionLabel)}">${escapeHtml(item.actionLabel)}</button>` : ''}
      </article>`).join('');
    const readNote = qs('[data-render="system-read-note"]');
    if (readNote) readNote.textContent = `本次成功加载并曝光 ${rows.length} 条，按消息 ID 批量置已读`;
  }

  function filteredRecords() {
    return state.currentRecordType === '全部'
      ? (data.records || [])
      : (data.records || []).filter((row) => row.recordType === state.currentRecordType);
  }

  function renderRecords() {
    const target = qs('[data-render="records"]');
    if (!target) return;
    target.innerHTML = filteredRecords().map((row) => `
      <tr>
        <td>${escapeHtml(row.recordNo)}</td>
        <td>${escapeHtml(recordTypeText[row.recordType] || row.recordType)}</td>
        <td>${escapeHtml(row.userNo)}</td>
        <td>${escapeHtml(row.targetUserNo)}</td>
        <td>${escapeHtml(row.messageType)}</td>
        <td>${tag(row.status)}</td>
        <td>${escapeHtml(row.time)}</td>
        <td><button class="btn" data-open-record="${escapeHtml(row.recordNo)}">元数据</button></td>
      </tr>`).join('');
  }

  function renderRecordDrawer() {
    const target = qs('[data-render="record-detail"]');
    if (!target || !state.currentRecord) return;
    const row = state.currentRecord;
    target.innerHTML = `
      <ul class="kv-list">
        <li><span>记录编号</span><strong>${escapeHtml(row.recordNo)}</strong></li>
        <li><span>记录类型</span><strong>${escapeHtml(recordTypeText[row.recordType])}</strong></li>
        <li><span>用户编号</span><strong>${escapeHtml(row.userNo)}</strong></li>
        <li><span>消息类型</span><strong>${escapeHtml(row.messageType)}</strong></li>
        <li><span>状态</span><strong>${escapeHtml(row.status)}</strong></li>
        <li><span>创建时间</span><strong>${escapeHtml(row.time)}</strong></li>
      </ul>
      <div class="notice-panel">
        <strong>最小权限返回</strong>
        <p>通用查询接口只返回业务编号、参与方脱敏标识、类型、状态和时间，不返回正文、正文片段或内容摘要。</p>
      </div>`;
  }

  function renderConfigLogs() {
    const target = qs('[data-render="config-logs"]');
    if (!target) return;
    target.innerHTML = (data.configLogs || []).map((item) => `
      <article class="admin-card">
        <h3>${escapeHtml(item.action)}</h3>
        <p>${escapeHtml(item.time)} / ${escapeHtml(item.user)}</p>
        <span>${escapeHtml(item.detail)}</span>
      </article>`).join('');
  }

  function renderReports() {
    const target = qs('[data-render="reports"]');
    if (!target) return;
    target.innerHTML = (data.reportRows || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.reportNo)}</td>
        <td>${escapeHtml(row.caseNo)}</td>
        <td>${escapeHtml(row.source)}</td>
        <td>${escapeHtml(row.reporter)}</td>
        <td>${escapeHtml(row.target)}</td>
        <td>${escapeHtml(row.reason)}</td>
        <td>${tag(row.status)}</td>
        <td><button class="btn" data-open-report="${escapeHtml(row.reportNo)}">案件详情</button></td>
      </tr>`).join('');
  }

  function renderReportDrawer() {
    const target = qs('[data-render="report-detail"]');
    if (!target || !state.currentReport) return;
    const row = state.currentReport;
    target.innerHTML = `
      <ul class="kv-list">
        <li><span>案件编号</span><strong>${escapeHtml(row.caseNo)}</strong></li>
        <li><span>举报编号</span><strong>${escapeHtml(row.reportNo)}</strong></li>
        <li><span>来源</span><strong>${escapeHtml(row.source)}</strong></li>
        <li><span>举报原因</span><strong>${escapeHtml(row.reason)}</strong></li>
        <li><span>处理状态</span><strong>${escapeHtml(row.status)}</strong></li>
      </ul>
      <div class="notice-panel">
        <strong>案件上下文</strong>
        <p>${escapeHtml(row.context)}</p>
        <p>${escapeHtml(row.evidencePreview)}</p>
      </div>
      <button class="btn" type="button" data-view-case-content>按案件权限查看冻结正文</button>`;
  }

  function openReportModal(context) {
    const node = qs('[data-render="report-context"]');
    if (node) node.textContent = context;
    openModal('reportSubmitModal');
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const toastNode = event.target.closest('[data-toast]');
      if (toastNode) showToast(toastNode.dataset.toast);

      const modalNode = event.target.closest('[data-open-modal]');
      if (modalNode) openModal(modalNode.dataset.openModal);

      const scrollNode = event.target.closest('[data-scroll-target]');
      if (scrollNode) document.getElementById(scrollNode.dataset.scrollTarget)?.scrollIntoView({ behavior: 'smooth' });

      const messageState = event.target.closest('[data-set-message-state]');
      if (messageState) setState('[data-message-state]', '[data-set-message-state]', messageState.dataset.value, 'data-message-state');

      const chatState = event.target.closest('[data-set-chat-state]');
      if (chatState) setState('[data-chat-state]', '[data-set-chat-state]', chatState.dataset.value, 'data-chat-state');

      const privateListState = event.target.closest('[data-set-private-list-state]');
      if (privateListState) setState('[data-private-list-state]', '[data-set-private-list-state]', privateListState.dataset.value, 'data-private-list-state');

      const systemState = event.target.closest('[data-set-system-state]');
      if (systemState) {
        setState('[data-system-state]', '[data-set-system-state]', systemState.dataset.value, 'data-system-state');
        renderSystemMessageFlow(systemState.dataset.value);
      }

      const whisperTab = event.target.closest('[data-set-whisper-mode]');
      if (whisperTab) {
        state.whisperMode = whisperTab.dataset.value;
        qsa('[data-set-whisper-mode]').forEach((button) => button.classList.toggle('is-active', button === whisperTab));
        renderWhisperApplications();
      }

      const whisperRow = event.target.closest('[data-select-whisper-detail]');
      if (whisperRow) {
        renderWhisperDetail(whisperRow.dataset.selectWhisperDetail);
        document.getElementById('APP-03-PAGE-whisper-detail')?.scrollIntoView({ behavior: 'smooth' });
      }

      if (event.target.closest('[data-whisper-reply]')) {
        const item = allWhispers().find((row) => row.id === state.currentWhisperId);
        if (item?.replyWillFail) {
          showToast('回复未发送，匹配与会话均未生成；申请仍为等待回应', 'error');
          renderWhisperDetail(item.id);
        } else {
          showToast('回复、匹配和普通会话已原子提交成功');
          renderWhisperDetail('W04');
        }
      }

      const messageReport = event.target.closest('[data-report-message]');
      if (messageReport) openReportModal(`具体消息 ${messageReport.dataset.reportMessage}`);

      const whisperReport = event.target.closest('[data-report-whisper]');
      if (whisperReport) openReportModal(`悄悄话 ${whisperReport.dataset.reportWhisper}`);

      const safetyAction = event.target.closest('[data-safety-action]');
      if (safetyAction) {
        const action = safetyAction.dataset.safetyAction;
        if (action === 'report') {
          common.closeModal?.(safetyAction);
          openReportModal('当前私信会话');
        }
        if (action === 'block') {
          common.closeModal?.(safetyAction);
          showToast('已拉黑，对方会话立即移出正常列表');
        }
        if (action === 'block-report') {
          common.closeModal?.(safetyAction);
          openReportModal('当前私信会话；拉黑已先行生效');
        }
      }

      if (event.target.closest('[data-confirm-report]')) {
        common.closeModal?.(event.target);
        showToast('举报已提交至 PRD-05，证据快照已冻结');
      }

      if (event.target.closest('[data-delete-all-whispers]')) {
        data.whisperApplications[state.whisperMode] = [];
        common.closeModal?.(event.target);
        renderWhisperApplications();
        showToast('当前列表记录已删除，不影响对方记录和业务状态');
      }

      if (event.target.closest('[data-confirm-whisper-pay]')) {
        common.closeModal?.(event.target);
        showToast('权益核销与悄悄话送达成功，申请进入等待回应');
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
        renderReportDrawer();
        openDrawer('reportDrawer');
      }

      if (event.target.closest('[data-view-case-content]')) openModal('caseContentConfirmModal');

      if (event.target.closest('[data-confirm-case-content]')) {
        common.closeModal?.(event.target);
        showToast('案件冻结正文已按条解密，本次查看已写入 3 年审计日志');
      }

      if (event.target.closest('[data-save-config]')) {
        common.closeModal?.(event.target);
        showToast('配置版本已发布；普通规则只影响新对象');
      }

      if (event.target.closest('[data-confirm-safety-toggle]')) {
        state.safetyEnabled = !state.safetyEnabled;
        qsa('[data-safety-switch-label]').forEach((node) => {
          node.textContent = state.safetyEnabled ? '开启' : '关闭';
          node.classList.toggle('off', !state.safetyEnabled);
        });
        common.closeModal?.(event.target);
        showToast(state.safetyEnabled ? '全局发送已立即恢复' : '全局发送已立即阻断，历史对象未改写');
      }

      if (event.target.closest('[data-export-records]')) openModal('exportModal');
    });

    qsa('[data-record-type-filter]').forEach((select) => select.addEventListener('change', () => {
      state.currentRecordType = select.value;
      renderRecords();
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    qsa('[data-render="conversations"], [data-render="private-conversations"]').forEach((target) => {
      renderConversationRows(`[data-render="${target.dataset.render}"]`);
    });
    renderChatMessages();
    renderAssistantMessages();
    renderWhisperApplications();
    renderWhisperDetail();
    renderSystemMessageFlow();
    renderRecords();
    renderRecordDrawer();
    renderConfigLogs();
    renderReports();
    renderReportDrawer();
    bindEvents();
    common.wireBackdropClose?.();
  });
})();
