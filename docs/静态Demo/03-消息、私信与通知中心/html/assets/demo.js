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

  const recordTypeText = {
    private_message: '私信记录',
    whisper_message: '悄悄话记录',
    official_message: '官方消息记录',
    notification: '站内通知记录'
  };

  const state = {
    messageListMode: 'default',
    chatMode: 'active',
    whisperMode: 'receiver',
    notificationFilter: '全部',
    currentRecordType: '全部',
    currentNotice: data.notifications?.[0] || null,
    currentRecord: data.records?.[0] || null,
    currentReport: data.reportRows?.[0] || null
  };

  function tag(text) {
    return `<span class="tag ${statusClass(text)}">${escapeHtml(text)}</span>`;
  }

  function setActiveButton(groupSelector, value) {
    qsa(groupSelector).forEach((button) => {
      button.classList.toggle('is-active', button.dataset.value === value);
      button.classList.toggle('is-selected', button.dataset.value === value);
    });
  }

  function renderConversations() {
    const target = qs('[data-render="conversations"]');
    if (!target) return;
    target.innerHTML = (data.conversations || []).map((item, index) => `
      <article class="message-row" data-open-chat="${escapeHtml(item.status)}">
        <div class="avatar ${index % 2 ? 'alt' : ''}">${escapeHtml(item.avatar)}</div>
        <div class="row-main">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.desc)}</span>
          <div class="status-row">${(item.tags || []).map(tag).join('')}</div>
        </div>
        <div>${item.unread ? `<span class="unread-dot">${escapeHtml(item.unread)}</span>` : tag(item.status)}</div>
      </article>
    `).join('');
  }

  function renderChatMessages() {
    const target = qs('[data-render="chat-messages"]');
    if (!target) return;
    target.innerHTML = (data.chatMessages || []).map((item) => {
      const side = item.side || 'left';
      return `
        <div class="bubble ${escapeHtml(side)}">
          ${item.name ? `<strong>${escapeHtml(item.name)}</strong>` : ''}
          <span>${escapeHtml(item.text)}</span>
          ${item.time ? `<span>${escapeHtml(item.time)}</span>` : ''}
          ${side.includes('failed') ? '<button class="btn full" type="button" data-retry-message>重试发送</button>' : ''}
        </div>
      `;
    }).join('');
  }

  function renderAssistantMessages() {
    const target = qs('[data-render="assistant-messages"]');
    if (!target) return;
    target.innerHTML = (data.assistantMessages || []).map((item) => `
      <article class="official-card">
        <div class="row-main">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.text)}</span>
          <span>${escapeHtml(item.time)}</span>
        </div>
        ${item.type === 'card' ? '<button class="btn primary" type="button" data-open-official-detail>查看详情</button>' : ''}
      </article>
    `).join('');
  }

  function renderOfficialDetail() {
    const target = qs('[data-render="official-detail"]');
    if (!target || !data.officialDetail) return;
    const item = data.officialDetail;
    target.innerHTML = `
      <article class="official-card">
        ${tag(item.source)}
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.content)}</p>
        <ul class="kv-list">
          <li><span>发送时间</span><strong>${escapeHtml(item.time)}</strong></li>
          <li><span>跳转类型</span><strong>${escapeHtml(item.jumpType)}</strong></li>
        </ul>
        <button class="btn primary" type="button" data-toast="跳转认证中心">查看详情</button>
      </article>
    `;
  }

  function visibleNotifications() {
    const rows = data.notifications || [];
    if (state.notificationFilter === '全部') return rows;
    if (state.notificationFilter === '邀请响应') return rows.filter((item) => item.bizType === 'invite_response');
    return rows.filter((item) => item.type === state.notificationFilter);
  }

  function renderNotifications() {
    const target = qs('[data-render="notifications"]');
    if (!target) return;
    const rows = visibleNotifications();
    if (!rows.length) {
      target.innerHTML = '<div class="empty-panel"><strong>未找到相关通知</strong><span>可切回全部通知。</span></div>';
      return;
    }
    target.innerHTML = rows.map((item) => `
      <article class="notification-row ${item.read ? 'is-read' : ''}" data-notice-id="${escapeHtml(item.id)}">
        <div class="icon-badge">${item.read ? '已' : '未'}</div>
        <div class="row-main">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.summary)}</span>
          <div class="status-row">${tag(item.type)}${tag(item.bizType)}</div>
        </div>
        <span>${escapeHtml(item.time)}</span>
      </article>
    `).join('');
  }

  function renderNotificationDetail() {
    const target = qs('[data-render="notification-detail"]');
    if (!target || !state.currentNotice) return;
    const item = state.currentNotice;
    target.innerHTML = `
      <article class="notice-panel">
        ${tag(item.read ? '已读' : '未读')}
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <ul class="kv-list">
          <li><span>通知编号</span><strong>${escapeHtml(item.id)}</strong></li>
          <li><span>业务类型</span><strong>${escapeHtml(item.bizType)}</strong></li>
          <li><span>跳转类型</span><strong>${escapeHtml(item.jumpType)}</strong></li>
        </ul>
        <button class="btn primary" type="button" data-open-notice-target="${escapeHtml(item.target)}">查看对应内容</button>
      </article>
    `;
  }

  function renderInviteResponse() {
    const target = qs('[data-render="invite-response"]');
    if (!target) return;
    const item = data.inviteResponse || {};
    target.innerHTML = `
      <article class="invite-card">
        ${tag('从通知进入')}
        <h3>邀请响应</h3>
        <ul class="kv-list">
          <li><span>邀请人</span><strong>${escapeHtml(item.inviter)}</strong></li>
          <li><span>邀请状态</span><strong>${escapeHtml(item.status)}</strong></li>
          <li><span>奖励提示</span><strong>${escapeHtml(item.reward)}</strong></li>
          <li><span>来源通知</span><strong>${escapeHtml(item.noticeNo)}</strong></li>
          <li><span>响应编号</span><strong>${escapeHtml(item.responseNo)}</strong></li>
        </ul>
        <div class="admin-actions">
          <button class="btn" type="button" data-toast="查看 PRD-07 活动规则">查看活动规则</button>
          <button class="btn primary" type="button" data-toast="进入推荐给好友页">推荐给好友</button>
        </div>
      </article>
    `;
  }

  function renderWhisper() {
    const target = qs('[data-render="whisper-card"]');
    if (!target) return;
    const item = data.whisper || {};
    const map = {
      receiver: {
        title: '收到一条悄悄话',
        desc: '接收方可回复或暂不回应；回复即同意匹配并开放普通私信。',
        actions: '<button class="btn primary" type="button" data-whisper-reply>回复并匹配</button><button class="btn" type="button" data-open-modal="ignoreWhisperModal">暂不回应</button>'
      },
      sender: {
        title: '等待对方回复',
        desc: '发送方 pending 状态不可重复发送悄悄话，可查看主页、举报或拉黑。',
        actions: '<button class="btn" type="button" data-toast="进入对方主页">查看主页</button><button class="btn" type="button" data-toast="进入举报流程">举报</button><button class="btn danger" type="button" data-toast="已拉黑，会话失效">拉黑</button>'
      },
      replied: {
        title: '对方已回复',
        desc: '回复、匹配成功和普通私信会话已一次完成；本次回复视为真实用户消息。',
        actions: '<button class="btn primary" type="button" data-toast="进入普通私信">去聊天</button>'
      },
      not_responded: {
        title: '本次悄悄话已结束',
        desc: `发送方只看到“对方暂未回应”，不展示明确拒绝、已读或处理时间；${escapeHtml(item.cooldown)} 后可再次发送。`,
        actions: '<button class="btn" type="button" data-toast="返回消息列表">返回</button>'
      },
      expired: {
        title: '本次悄悄话已超时',
        desc: '发送满 7 天未处理，双方不匹配且费用不退；发送方可重新发起，不叠加冷却。',
        actions: '<button class="btn primary" type="button" data-open-modal="whisperPayModal">重新发起</button>'
      },
      invalid: {
        title: '悄悄话已失效',
        desc: '账号异常、拉黑、处罚或认证失效导致不可处理；不向发送方披露具体原因。',
        actions: '<button class="btn" type="button" data-toast="查看历史记录">查看历史</button>'
      },
      refunded: {
        title: '本次消耗已退回',
        desc: '消息未有效送达，免费次数或千寻币已原路补回；重复补偿不会再次入账。',
        actions: '<button class="btn" type="button" data-toast="进入资产明细">查看资产明细</button>'
      }
    };
    const current = map[state.whisperMode] || map.receiver;
    target.innerHTML = `
      <article class="whisper-card">
        ${tag(state.whisperMode)}
        <h3>${escapeHtml(current.title)}</h3>
        <p>${escapeHtml(current.desc)}</p>
        <ul class="kv-list">
          <li><span>发送方</span><strong>${escapeHtml(item.senderName)}</strong></li>
          <li><span>内容</span><strong>${escapeHtml(item.content)}</strong></li>
          <li><span>发送时间</span><strong>${escapeHtml(item.sentTime)}</strong></li>
        </ul>
        <div class="admin-actions">${current.actions}</div>
      </article>
    `;
  }

  function filteredRecords() {
    const rows = data.records || [];
    if (state.currentRecordType === '全部') return rows;
    return rows.filter((row) => row.recordType === state.currentRecordType);
  }

  function renderRecords() {
    const target = qs('[data-render="records"]');
    if (!target) return;
    const rows = filteredRecords();
    target.innerHTML = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.recordNo)}</td>
        <td>${escapeHtml(recordTypeText[row.recordType] || row.recordType)}</td>
        <td>${escapeHtml(row.userNo)}</td>
        <td>${escapeHtml(row.targetUserNo)}</td>
        <td>${escapeHtml(row.preview)}</td>
        <td>${escapeHtml(row.title)}</td>
        <td>${tag(row.status)}</td>
        <td>${escapeHtml(row.time)}</td>
        <td><button class="btn" data-open-record="${escapeHtml(row.recordNo)}">详情</button></td>
      </tr>
    `).join('');
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
        <li><span>对方用户</span><strong>${escapeHtml(row.targetUserNo)}</strong></li>
        <li><span>状态</span><strong>${escapeHtml(row.status)}</strong></li>
        <li><span>创建时间</span><strong>${escapeHtml(row.time)}</strong></li>
      </ul>
      <div class="notice-panel">
        <strong>内容摘要</strong>
        <p>${escapeHtml(row.preview)}</p>
      </div>
    `;
  }

  function renderConfigLogs() {
    const target = qs('[data-render="config-logs"]');
    if (!target) return;
    target.innerHTML = (data.configLogs || []).map((item) => `
      <article class="admin-card">
        <h3>${escapeHtml(item.action)}</h3>
        <p>${escapeHtml(item.time)} / ${escapeHtml(item.user)}</p>
        <span>${escapeHtml(item.detail)}</span>
      </article>
    `).join('');
  }

  function renderReports() {
    const target = qs('[data-render="reports"]');
    if (!target) return;
    target.innerHTML = (data.reportRows || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.reportNo)}</td>
        <td>${escapeHtml(row.source)}</td>
        <td>${escapeHtml(row.reporter)}</td>
        <td>${escapeHtml(row.target)}</td>
        <td>${escapeHtml(row.reason)}</td>
        <td>${tag(row.status)}</td>
        <td>${escapeHtml(row.context)}</td>
        <td><button class="btn" data-open-report="${escapeHtml(row.reportNo)}">处理</button></td>
      </tr>
    `).join('');
  }

  function renderReportDrawer() {
    const target = qs('[data-render="report-detail"]');
    if (!target || !state.currentReport) return;
    const row = state.currentReport;
    target.innerHTML = `
      <ul class="kv-list">
        <li><span>举报编号</span><strong>${escapeHtml(row.reportNo)}</strong></li>
        <li><span>来源</span><strong>${escapeHtml(row.source)}</strong></li>
        <li><span>举报人</span><strong>${escapeHtml(row.reporter)}</strong></li>
        <li><span>被举报人</span><strong>${escapeHtml(row.target)}</strong></li>
        <li><span>原因</span><strong>${escapeHtml(row.reason)}</strong></li>
        <li><span>上下文</span><strong>${escapeHtml(row.context)}</strong></li>
      </ul>
      <div class="notice-panel">
        <strong>处罚联动</strong>
        <p>处理为封禁、禁言或拉黑时，联动会话失效并生成站内通知。</p>
      </div>
    `;
  }

  function setMessageMode(mode) {
    state.messageListMode = mode;
    qsa('[data-message-state]').forEach((node) => {
      node.classList.toggle('is-active', node.dataset.messageState === mode);
    });
    setActiveButton('[data-set-message-mode]', mode);
  }

  function setChatMode(mode) {
    state.chatMode = mode;
    qsa('[data-chat-state]').forEach((node) => {
      node.classList.toggle('is-active', node.dataset.chatState === mode);
    });
    setActiveButton('[data-set-chat-mode]', mode);
  }

  function setWhisperMode(mode) {
    state.whisperMode = mode;
    setActiveButton('[data-set-whisper-mode]', mode);
    renderWhisper();
  }

  function setNotificationFilter(value) {
    state.notificationFilter = value;
    setActiveButton('[data-set-notification-filter]', value);
    renderNotifications();
  }

  function markNoticeRead(id) {
    const item = (data.notifications || []).find((row) => row.id === id);
    if (!item) return;
    item.read = true;
    state.currentNotice = item;
    renderNotifications();
    renderNotificationDetail();
    if (item.jumpType === 'invite_response') {
      showToast('邀请响应通知已置为已读，进入邀请响应页');
      const target = qs('#APP-03-PAGE-notification-center');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      renderInviteResponse();
    } else {
      showToast('通知已置为已读，详情已刷新');
    }
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const toastNode = event.target.closest('[data-toast]');
      if (toastNode) showToast(toastNode.dataset.toast);

      const modalNode = event.target.closest('[data-open-modal]');
      if (modalNode) openModal(modalNode.dataset.openModal);

      const drawerNode = event.target.closest('[data-open-drawer]');
      if (drawerNode) openDrawer(drawerNode.dataset.openDrawer);

      const messageMode = event.target.closest('[data-set-message-mode]');
      if (messageMode) setMessageMode(messageMode.dataset.value);

      const chatMode = event.target.closest('[data-set-chat-mode]');
      if (chatMode) setChatMode(chatMode.dataset.value);

      const whisperMode = event.target.closest('[data-set-whisper-mode]');
      if (whisperMode) setWhisperMode(whisperMode.dataset.value);

      const noticeFilter = event.target.closest('[data-set-notification-filter]');
      if (noticeFilter) setNotificationFilter(noticeFilter.dataset.value);

      const noticeRow = event.target.closest('[data-notice-id]');
      if (noticeRow) markNoticeRead(noticeRow.dataset.noticeId);

      const noticeTarget = event.target.closest('[data-open-notice-target]');
      if (noticeTarget) {
        if (noticeTarget.dataset.openNoticeTarget === 'invite-response') {
          showToast('已携带 noticeNo 与 responseNo 进入邀请响应页');
        } else {
          showToast('跳转到对应业务页面');
        }
      }

      if (event.target.closest('[data-whisper-reply]')) {
        setWhisperMode('replied');
        showToast('悄悄话已回复，触发匹配成功');
      }

      if (event.target.closest('[data-confirm-whisper-pay]')) {
        common.closeModal?.(event.target);
        setWhisperMode('sender');
        showToast('支付成功，悄悄话已发送；等待对方回复后匹配');
      }

      if (event.target.closest('[data-confirm-ignore]')) {
        setWhisperMode('not_responded');
        common.closeModal?.(event.target);
        showToast('已暂不回应；对方仅看到本次已结束，写入 7 天冷却');
      }

      if (event.target.closest('[data-retry-message]')) {
        showToast('消息已重新发送');
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

      if (event.target.closest('[data-open-official-detail]')) {
        renderOfficialDetail();
        showToast('官方消息详情已展开');
      }

      if (event.target.closest('[data-save-config]')) {
        common.closeModal?.(event.target);
        showToast('配置已保存并写入审计日志');
      }

      if (event.target.closest('[data-export-records]')) {
        openModal('exportModal');
      }

      if (event.target.closest('[data-view-content]')) {
        openModal('contentConfirmModal');
      }

      if (event.target.closest('[data-confirm-content-view]')) {
        common.closeModal?.(event.target);
        showToast('已记录高敏内容查看审计');
      }
    });

    qsa('[data-record-type-filter]').forEach((select) => {
      select.addEventListener('change', () => {
        state.currentRecordType = select.value;
        renderRecords();
        showToast(`记录类型已切换为 ${select.options[select.selectedIndex].text}`);
      });
    });
  }

  function renderAll() {
    renderConversations();
    renderChatMessages();
    renderAssistantMessages();
    renderOfficialDetail();
    renderNotifications();
    renderNotificationDetail();
    renderInviteResponse();
    renderWhisper();
    renderRecords();
    renderRecordDrawer();
    renderConfigLogs();
    renderReports();
    renderReportDrawer();
    setMessageMode(state.messageListMode);
    setChatMode(state.chatMode);
    common.wireBackdropClose?.();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    bindEvents();
  });
})();
