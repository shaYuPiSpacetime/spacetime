(function () {
  const data = window.DEMO_DATA || {};

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function statusClass(status) {
    if (/通过|开放|正常|完成|一致/.test(status)) return 'success';
    if (/驳回|冻结|失败|不可用|未完成/.test(status)) return 'danger';
    if (/审核|待|未提交|失效/.test(status)) return 'warning';
    return 'brand';
  }

  function showToast(message, type = 'success') {
    let stack = qs('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    stack.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
      if (!stack.children.length) stack.remove();
    }, 2600);
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(target) {
    const modal = target.closest('.modal-backdrop');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function openDrawer(id, userId) {
    const drawer = document.getElementById(id);
    if (!drawer) return;

    if (userId) renderDrawerUser(userId);
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer(target) {
    const drawer = target.closest('.drawer-backdrop');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }

  function renderUserCards() {
    const container = qs('[data-render="user-cards"]');
    if (!container || !data.adminUsers) return;

    container.innerHTML = data.adminUsers.map((user) => {
      const statuses = Object.entries(user.statuses)
        .map(([key, value]) => `<div class="status-cell">${escapeHtml(key)}：<strong>${escapeHtml(value)}</strong></div>`)
        .join('');

      return `
        <article class="user-card">
          <div class="user-card-head">
            <div class="user-photo">${escapeHtml(user.name.slice(0, 1))}</div>
            <div>
              <h3>${escapeHtml(user.name)} <span class="tag ${statusClass(user.accountStatus)}">${escapeHtml(user.accountStatus)}</span></h3>
              <p>${escapeHtml(user.id)} · ${escapeHtml(user.genderAge)} · ${escapeHtml(user.location)}</p>
            </div>
          </div>
          <p>${escapeHtml(user.summary)}</p>
          <div class="progress" aria-label="资料完整度 ${escapeHtml(user.score)}%">
            <span style="width:${Number(user.score) || 0}%"></span>
          </div>
          <div class="status-grid">${statuses}</div>
          <div class="action-row">
            <button class="btn primary" data-open-drawer="userDrawer" data-user-id="${escapeHtml(user.id)}">画像详情</button>
            <button class="btn" data-toast="已记录运营备注：${escapeHtml(user.name)}">运营备注</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderDrawerUser(userId) {
    const user = (data.adminUsers || []).find((item) => item.id === userId) || (data.adminUsers || [])[0];
    const target = qs('[data-render="drawer-user"]');
    if (!target || !user) return;

    target.innerHTML = `
      <div class="user-card-head">
        <div class="user-photo">${escapeHtml(user.name.slice(0, 1))}</div>
        <div>
          <h3>${escapeHtml(user.name)}（${escapeHtml(user.nickname)}）</h3>
          <p>${escapeHtml(user.id)} · ${escapeHtml(user.genderAge)} · ${escapeHtml(user.location)}</p>
        </div>
      </div>
      <ul class="kv-list">
        <li><span>手机号</span><strong>${escapeHtml(user.phone)}</strong></li>
        <li><span>微信号</span><strong>${escapeHtml(user.wechat)}</strong></li>
        <li><span>牵线币</span><strong>${escapeHtml(user.coin)}</strong></li>
        <li><span>会员状态</span><strong>${escapeHtml(user.vip)}</strong></li>
        <li><span>准入状态</span><strong>${escapeHtml(user.statuses.core)}</strong></li>
      </ul>
      <div class="notice">
        <strong>后台只展示固定字段且敏感信息脱敏</strong>
        当前静态 Demo 使用 mock 数据，不包含真实手机号、身份证号或证照材料。
      </div>
    `;
  }

  function findAuditRow(rowId) {
    const queues = data.auditQueues || {};
    for (const rows of Object.values(queues)) {
      const match = rows.find((row) => row.id === rowId);
      if (match) return match;
    }
    return null;
  }

  function renderAuditDetail(rowId) {
    const target = qs('[data-render="audit-detail"]');
    if (!target) return;
    const row = findAuditRow(rowId) || {};
    target.innerHTML = `
      <div class="notice"><strong>详情字段</strong>审核单、用户、对象、提交时间、展示标签、审核来源、机审信号、材料内容、历史记录、驳回原因。</div>
      <div class="settings-grid">
        <article class="setting-card"><h3>审核对象</h3><ul class="kv-list"><li><span>审核单</span><strong>${escapeHtml(row.id || '-')}</strong></li><li><span>用户</span><strong>${escapeHtml(row.user || '-')}</strong></li><li><span>对象</span><strong>${escapeHtml(row.object || '-')}</strong></li><li><span>提交时间</span><strong>${escapeHtml(row.submittedAt || '-')}</strong></li></ul></article>
        <article class="setting-card"><h3>审核判断</h3><ul class="kv-list"><li><span>展示标签</span><strong>${escapeHtml(row.display || '-')}</strong></li><li><span>审核来源</span><strong>${escapeHtml(row.source || '-')}</strong></li><li><span>机审信号</span><strong>${escapeHtml(row.signal || '-')}</strong></li><li><span>驳回原因</span><strong>${escapeHtml(row.reason || '-')}</strong></li></ul></article>
      </div>
      <div class="action-row"><button class="btn success" data-toast="审核单 ${escapeHtml(row.id || '')} 已通过">通过</button><button class="btn danger" data-open-modal="rejectModal" data-row-id="${escapeHtml(row.id || '')}">驳回</button><button class="btn" data-toast="审核单 ${escapeHtml(row.id || '')} 已转人工复核">人工复核</button></div>
    `;
  }

  function renderAuditRows() {
    qsa('[data-audit-queue]').forEach((tbody) => {
      const queueName = tbody.dataset.auditQueue;
      const rows = (data.auditQueues && data.auditQueues[queueName]) || [];

      tbody.innerHTML = rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.id)}</td>
          <td>${escapeHtml(row.user)}</td>
          <td>${escapeHtml(row.object)}</td>
          <td>${escapeHtml(row.submittedAt)}</td>
          <td><span class="tag ${statusClass(row.display)}">${escapeHtml(row.display)}</span></td>
          <td>${escapeHtml(row.source)}</td>
          <td>${escapeHtml(row.signal)}</td>
          <td>${escapeHtml(row.reason)}</td>
          <td>
            <div class="action-row">
              <button class="btn primary" data-open-drawer="auditDrawer" data-audit-id="${escapeHtml(row.id)}">查看详情</button>
              <button class="btn success" data-audit-action="approve" data-row-id="${escapeHtml(row.id)}">通过</button>
              <button class="btn danger" data-open-modal="rejectModal" data-row-id="${escapeHtml(row.id)}">驳回</button>
              <button class="btn" data-toast="已进入人工复核：${escapeHtml(row.id)}">人工复核</button>
            </div>
          </td>
        </tr>
      `).join('');
    });
  }

  const miniFlowState = {
    progress: 8,
    stage: '登录授权',
    next: '选择性别',
    profileScore: Number(data.miniUser?.profileScore) || 76,
    statuses: {
      avatar: '未提交',
      realName: '未提交',
      education: '未提交',
      core: '未开放',
    },
  };

  const flowPages = {
    'APP-01-PAGE-login-auth': ['登录授权', '选择性别'],
    'APP-01-PAGE-light-gender': ['轻量资料', '填写出生日期'],
    'APP-01-PAGE-light-birthday': ['轻量资料', '选择身份'],
    'APP-01-PAGE-light-identity': ['轻量资料', '选择最高学历'],
    'APP-01-PAGE-light-education': ['轻量资料', '填写现居地'],
    'APP-01-PAGE-light-location': ['轻量资料', '完善基础资料'],
    'APP-01-PAGE-verify-basic': ['资料认证', '头像认证'],
    'APP-01-PAGE-verify-avatar': ['资料认证', '自我介绍'],
    'APP-01-PAGE-verify-intro': ['资料认证', '三重认证'],
    'APP-01-PAGE-verify-triple': ['三重认证', '实名 / 学历 / 模拟通过'],
    'APP-01-PAGE-real-name': ['三重认证', '返回三重认证'],
    'APP-01-PAGE-education': ['三重认证', '返回三重认证'],
    'APP-01-PAGE-core-access-block': ['核心准入', '补齐认证缺口'],
    'APP-01-PAGE-profile-edit-home': ['资料编辑', '选择编辑分组'],
    'APP-01-PAGE-profile-basic-edit': ['资料编辑', '返回资料总页'],
    'APP-01-PAGE-profile-extended-edit': ['资料编辑', '返回资料总页'],
  };

  const flowActions = {
    login: { progress: 12, stage: '轻量资料', next: '填写出生日期' },
    gender: { progress: 18, stage: '轻量资料', next: '选择身份' },
    birthday: { progress: 24, stage: '轻量资料', next: '选择最高学历' },
    identity: { progress: 30, stage: '轻量资料', next: '填写现居地' },
    lightEducation: { progress: 36, stage: '轻量资料', next: '填写现居地' },
    location: { progress: 45, stage: '资料认证', next: '完善基础资料' },
    basicProfile: { progress: 54, stage: '资料认证', next: '头像认证', profileScore: 82 },
    avatar: { progress: 62, stage: '资料认证', next: '自我介绍', statuses: { avatar: '审核中' } },
    intro: { progress: 68, stage: '三重认证', next: '实名认证 / 学历认证', profileScore: 86 },
    goRealName: { stage: '三重认证', next: '提交实名认证' },
    realName: { progress: 78, stage: '三重认证', next: '学历认证', statuses: { realName: '已通过' } },
    goEducation: { stage: '三重认证', next: '提交学历认证' },
    education: { progress: 88, stage: '三重认证', next: '模拟三重认证通过', statuses: { education: '已通过' } },
    completeCert: { progress: 100, stage: '资料编辑', next: '编辑资料总页', profileScore: 92, statuses: { avatar: '已通过', realName: '已通过', education: '已通过', core: '已开放' } },
    coreBlock: { stage: '核心准入', next: '补齐认证缺口' },
    goProfileBasic: { stage: '资料编辑', next: '保存基础资料' },
    profileBasic: { stage: '资料编辑', next: '扩展资料', profileScore: 94 },
    goProfileExtended: { stage: '资料编辑', next: '保存扩展资料' },
    profileExtended: { stage: '资料编辑', next: '资料总页', profileScore: 96 },
  };

  function currentMiniPageId() {
    const hash = window.location.hash.replace('#', '');
    return hash && flowPages[hash] ? hash : 'APP-01-PAGE-login-auth';
  }

  function coreGaps() {
    const gaps = [];
    if (miniFlowState.statuses.avatar !== '已通过') gaps.push('头像');
    if (miniFlowState.statuses.realName !== '已通过') gaps.push('实名');
    if (miniFlowState.statuses.education !== '已通过') gaps.push('学历');
    return gaps.length ? gaps.join('、') : '无缺口';
  }

  function applyMiniFlowAction(action) {
    const patch = flowActions[action];
    if (!patch) return;
    if (typeof patch.progress === 'number') miniFlowState.progress = Math.max(miniFlowState.progress, patch.progress);
    if (patch.stage) miniFlowState.stage = patch.stage;
    if (patch.next) miniFlowState.next = patch.next;
    if (typeof patch.profileScore === 'number') miniFlowState.profileScore = Math.max(miniFlowState.profileScore, patch.profileScore);
    if (patch.statuses) Object.assign(miniFlowState.statuses, patch.statuses);
    if (miniFlowState.statuses.avatar === '已通过' && miniFlowState.statuses.realName === '已通过' && miniFlowState.statuses.education === '已通过') {
      miniFlowState.statuses.core = '已开放';
    }
    renderMiniFlow();
  }

  function goToMiniPage(pageId) {
    if (!pageId) return;
    window.location.hash = pageId;
    const target = document.getElementById(pageId);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderMiniFlow() {
    const pageInfo = flowPages[currentMiniPageId()] || [miniFlowState.stage, miniFlowState.next];
    qsa('[data-flow-current]').forEach((node) => { node.textContent = miniFlowState.stage || pageInfo[0]; });
    qsa('[data-flow-next]').forEach((node) => { node.textContent = miniFlowState.next || pageInfo[1]; });
    qsa('[data-flow-progress]').forEach((node) => { node.style.width = `${miniFlowState.progress}%`; });
    qsa('[data-core-access]').forEach((node) => { node.textContent = miniFlowState.statuses.core; });
    qsa('[data-status-avatar]').forEach((node) => { node.textContent = miniFlowState.statuses.avatar; });
    qsa('[data-status-real-name]').forEach((node) => { node.textContent = miniFlowState.statuses.realName; });
    qsa('[data-status-education]').forEach((node) => { node.textContent = miniFlowState.statuses.education; });
    qsa('[data-core-gaps]').forEach((node) => { node.textContent = coreGaps(); });
    qsa('[data-mini-score]').forEach((node) => { node.textContent = `${miniFlowState.profileScore}%`; });
    qsa('[data-mini-score-bar]').forEach((node) => { node.style.width = `${miniFlowState.profileScore}%`; });
    qsa('[data-flow-step]').forEach((node) => {
      node.classList.toggle('is-active', node.dataset.flowStep === miniFlowState.stage);
    });
  }

  function renderMiniData() {
    const user = data.miniUser;
    if (!user) return;

    qsa('[data-mini-name]').forEach((node) => {
      node.textContent = user.name;
    });
    qsa('[data-mini-score]').forEach((node) => {
      node.textContent = `${user.profileScore}%`;
    });
    qsa('[data-mini-score-bar]').forEach((node) => {
      node.style.width = `${user.profileScore}%`;
    });
  }

  function wireNav() {
    const links = qsa('a[href^="#"]');
    const targets = links
      .map((link) => qs(link.getAttribute('href')))
      .filter(Boolean);

    function setActive() {
      const current = targets
        .filter((target) => target.getBoundingClientRect().top <= 130)
        .pop() || targets[0];

      links.forEach((link) => {
        link.classList.toggle('is-active', current && link.getAttribute('href') === `#${current.id}`);
      });
    }

    setActive();
    document.addEventListener('scroll', setActive, { passive: true });
    window.addEventListener('hashchange', () => { setActive(); renderMiniFlow(); });
  }

  function wireButtons() {
    document.addEventListener('click', (event) => {
      const flowButton = event.target.closest('[data-flow-action]');
      if (flowButton && flowButton.dataset.nextPage && flowButton.tagName !== 'FORM') {
        event.preventDefault();
        applyMiniFlowAction(flowButton.dataset.flowAction);
        if (flowButton.dataset.toast) showToast(flowButton.dataset.toast, flowButton.dataset.toastType || 'success');
        const closeTarget = flowButton.closest('.modal-backdrop, .drawer-backdrop');
        if (closeTarget) closeTarget.classList.remove('is-open');
        goToMiniPage(flowButton.dataset.nextPage);
        return;
      }

      const modalButton = event.target.closest('[data-open-modal]');
      if (modalButton) {
        openModal(modalButton.dataset.openModal);
        if (modalButton.dataset.rowId) {
          const rowTarget = qs('[data-reject-row]');
          if (rowTarget) rowTarget.textContent = modalButton.dataset.rowId;
        }
      }

      const drawerButton = event.target.closest('[data-open-drawer]');
      if (drawerButton) {
        openDrawer(drawerButton.dataset.openDrawer, drawerButton.dataset.userId);
        if (drawerButton.dataset.auditId) renderAuditDetail(drawerButton.dataset.auditId);
      }

      const closeButton = event.target.closest('[data-close]');
      if (closeButton) {
        closeModal(closeButton);
        closeDrawer(closeButton);
      }

      const toastButton = event.target.closest('[data-toast]');
      if (toastButton) {
        showToast(toastButton.dataset.toast, toastButton.dataset.toastType || 'success');
      }

      const auditButton = event.target.closest('[data-audit-action]');
      if (auditButton) {
        const row = auditButton.closest('tr');
        const statusCell = row && row.querySelector('td:nth-child(5)');
        if (statusCell) statusCell.innerHTML = '<span class="tag success">审核通过-人工审核</span>';
        showToast(`审核单 ${auditButton.dataset.rowId} 已通过`, 'success');
      }

      const selectButton = event.target.closest('.segmented button, .chip');
      if (selectButton && !selectButton.matches('[data-open-modal], [data-open-drawer]')) {
        const group = selectButton.parentElement;
        if (group && (group.classList.contains('segmented') || group.classList.contains('chip-row'))) {
          qsa('.is-selected', group).forEach((node) => node.classList.remove('is-selected'));
          selectButton.classList.add('is-selected');
        }
      }
    });

    qsa('.modal-backdrop, .drawer-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
          backdrop.classList.remove('is-open');
          backdrop.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  function wireForms() {
    qsa('form[data-demo-form]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        applyMiniFlowAction(form.dataset.flowAction);
        showToast(form.dataset.success || '已保存当前页面状态', 'success');
        if (form.dataset.nextPage) goToMiniPage(form.dataset.nextPage);
      });
    });

    qsa('[data-char-count]').forEach((textarea) => {
      const target = qs(`[data-count-for="${textarea.id}"]`);
      const update = () => {
        if (target) target.textContent = `${textarea.value.length}/${textarea.maxLength || 500}`;
      };
      textarea.addEventListener('input', update);
      update();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const demoFlow = new URLSearchParams(window.location.search).get('flow');
    if (demoFlow === 'complete') applyMiniFlowAction('completeCert');
    renderUserCards();
    renderAuditRows();
    renderMiniData();
    renderMiniFlow();
    wireNav();
    wireButtons();
    wireForms();
  });

  window.showToast = showToast;
  window.openModal = openModal;
  window.openDrawer = openDrawer;
  window.renderAuditRows = renderAuditRows;
  window.applyMiniFlowAction = applyMiniFlowAction;
  window.renderAuditDetail = renderAuditDetail;
  window.renderUserCards = renderUserCards;
})();
