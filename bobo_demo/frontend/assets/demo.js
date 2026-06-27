(function () {
  const data = window.BOBO_DEMO || {};
  const state = {
    mobilePage: 'APP-01-PAGE-login-auth',
    adminPage: 'ADM-01-PAGE-app-user-management',
    auditType: 'avatar',
    verification: { ...(data.verification || {}) },
  };

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function tagClass(text) {
    if (/通过|开放|正常|完成|成功/.test(text)) return 'success';
    if (/驳回|冻结|未开放|未完成|失败|阻断/.test(text)) return 'danger';
    if (/审核|待|未提交|临近/.test(text)) return 'warning';
    return '';
  }

  function showToast(message) {
    let stack = qs('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const item = document.createElement('div');
    item.className = 'toast';
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 2400);
  }

  function openModal(id) {
    qs(`#${id}`)?.classList.add('open');
  }

  function closeModal(target) {
    target.closest('.modal-backdrop')?.classList.remove('open');
  }

  function openDrawer(id) {
    qs(`#${id}`)?.classList.add('open');
  }

  function closeDrawer(target) {
    target.closest('.drawer-backdrop')?.classList.remove('open');
  }

  function renderMobileStatus() {
    const progress = qs('[data-flow-progress]');
    const gaps = qs('[data-core-gaps]');
    if (progress) {
      const passed = ['已完成', '审核中', '待审核'].filter((status) => Object.values(state.verification).includes(status)).length;
      progress.textContent = state.verification.coreAccess === '已开放'
        ? '流程进度：16/16，三重认证通过，核心准入已开放'
        : `流程进度：10/16，资料完整度 ${data.profile?.profileScore || 76}%，等待三重认证`;
      progress.dataset.value = String(passed);
    }
    if (gaps) {
      const blockers = state.verification.coreAccess === '已开放' ? [] : (state.verification.blockers || []);
      gaps.textContent = blockers.length ? `当前缺口：${blockers.join('、')}` : '当前缺口：无，喜欢/私信/曝光已开放';
    }
    qsa('[data-status-key]').forEach((node) => {
      const value = state.verification[node.dataset.statusKey] || node.textContent;
      node.textContent = value;
      node.className = `tag ${tagClass(value)}`;
    });
  }

  function showMobilePage(pageId) {
    state.mobilePage = pageId;
    qsa('.mini-page').forEach((page) => page.classList.toggle('active', page.id === pageId));
    qsa('[data-mobile-page]').forEach((button) => button.classList.toggle('active', button.dataset.mobilePage === pageId));
  }

  function applyMiniFlowAction(action) {
    if (action === 'submit-real-name') {
      state.verification.realName = '审核中';
      state.verification.blockers = ['学历认证未通过'];
      showToast('实名认证已提交，返回三重认证页查看状态');
      showMobilePage('APP-01-PAGE-verify-triple');
    }
    if (action === 'submit-education') {
      state.verification.education = '审核中';
      state.verification.blockers = ['实名认证未通过'];
      showToast('学历资料已提交，等待人工审核');
      showMobilePage('APP-01-PAGE-verify-triple');
    }
    if (action === 'pass-triple') {
      state.verification.avatar = '已通过';
      state.verification.realName = '已通过';
      state.verification.education = '已通过';
      state.verification.coreAccess = '已开放';
      state.verification.blockers = [];
      showToast('模拟三重认证通过，核心准入已开放');
      showMobilePage('APP-01-PAGE-profile-edit-home');
    }
    if (action === 'trigger-block') {
      showToast('完成三重认证后才可使用该功能');
      showMobilePage('APP-01-PAGE-core-access-block');
    }
    renderMobileStatus();
  }

  function renderUserCards() {
    const target = qs('[data-render="users"]');
    if (!target) return;
    target.innerHTML = (data.users || []).map((user) => `
      <article class="card user-card">
        <div class="user-head">
          <div class="avatar">${esc(user.name.slice(0, 1))}</div>
          <div>
            <strong>${esc(user.name)} <span class="tag ${tagClass(user.accountStatus)}">${esc(user.accountStatus)}</span></strong>
            <div class="muted">${esc(user.gender)} / ${esc(user.age)}岁 / ${esc(user.identity)} / ${esc(user.city)}</div>
          </div>
        </div>
        <div class="muted">${esc(user.job)} · ${esc(user.company)} · ${esc(user.phone)}</div>
        <div class="progress"><span style="width:${Number(user.score) || 0}%"></span></div>
        <div>
          <span class="tag ${tagClass(user.avatarStatus)}">头像 ${esc(user.avatarStatus)}</span>
          <span class="tag ${tagClass(user.realNameStatus)}">实名 ${esc(user.realNameStatus)}</span>
          <span class="tag ${tagClass(user.educationStatus)}">学历 ${esc(user.educationStatus)}</span>
          <span class="tag ${tagClass(user.accessStatus)}">${esc(user.accessStatus)}</span>
        </div>
        <div class="action-row">
          <button class="btn primary" data-user-detail="${esc(user.id)}" data-open-drawer="userDrawer">画像详情</button>
          <button class="btn" data-open-modal="importModal">导入</button>
          <button class="btn danger" data-toast="已模拟冻结账号：${esc(user.name)}">冻结账号</button>
        </div>
      </article>
    `).join('');
  }

  function renderUserDrawer(userId) {
    const user = (data.users || []).find((item) => item.id === userId) || (data.users || [])[0];
    const target = qs('[data-render="drawer-user"]');
    if (!target || !user) return;
    target.innerHTML = `
      <div class="user-head">
        <div class="avatar">${esc(user.name.slice(0, 1))}</div>
        <div>
          <h2>${esc(user.name)}（${esc(user.nickname)}）</h2>
          <p class="muted">${esc(user.gender)} / ${esc(user.age)}岁 / ${esc(user.city)} / ${esc(user.identity)}</p>
        </div>
      </div>
      <div class="card-grid two-col" style="margin-top:16px">
        <div class="card"><strong>资料完整度</strong><p>${esc(user.score)} 分</p></div>
        <div class="card"><strong>资产会员</strong><p>${esc(user.coins)} 牵线币 / ${esc(user.vip)}</p></div>
        <div class="card"><strong>认证缺口</strong><p>${user.missing.length ? user.missing.map(esc).join('、') : '无，核心准入已开放'}</p></div>
        <div class="card"><strong>高敏脱敏</strong><p>${esc(user.phone)} / 身份证号需二次确认查看</p></div>
      </div>
      <div class="section flat">
        <h3>画像详情</h3>
        <p class="muted">轻量资料、基础资料、扩展资料、认证状态、资产摘要和处理记录聚合展示。</p>
        <p>${esc(user.note)}</p>
      </div>
      <div class="action-row">
        <button class="btn" data-open-modal="remarkModal">编辑备注</button>
        <button class="btn danger" data-toast="已模拟冻结账号并刷新卡片状态">冻结账号</button>
      </div>
    `;
  }

  function renderAuditRows(type = state.auditType) {
    state.auditType = type;
    const rows = (data.audits && data.audits[type]) || [];
    qsa('[data-render="audits"]').forEach((target) => {
      target.innerHTML = rows.map((row) => `
        <tr>
          <td>${esc(row.id)}</td>
          <td>${esc(row.user)}</td>
          <td>${esc(row.target)}</td>
          <td><span class="tag ${tagClass(row.status)}">${esc(row.status)}</span></td>
          <td>${esc(row.source)}</td>
          <td>${esc(row.time)}</td>
          <td>${esc(row.reason)}</td>
          <td><button class="btn primary" data-audit-detail="${esc(row.id)}" data-open-drawer="auditDrawer">查看详情</button></td>
        </tr>
      `).join('');
    });
  }

  function renderAuditDetail(auditId) {
    const allRows = Object.values(data.audits || {}).flat();
    const row = allRows.find((item) => item.id === auditId) || allRows[0];
    const target = qs('[data-render="audit-detail"]');
    if (!target || !row) return;
    target.innerHTML = `
      <div class="card">
        <strong>审核详情</strong>
        <p class="muted">${esc(row.id)} / ${esc(row.user)} / ${esc(row.target)}</p>
        <p>${esc(row.detail)}</p>
        <p><span class="tag ${tagClass(row.status)}">${esc(row.status)}</span><span class="tag">${esc(row.source)}</span></p>
      </div>
      <label class="field"><span>驳回原因</span><textarea rows="3" placeholder="驳回时必填原因">${row.reason === '-' ? '' : esc(row.reason)}</textarea></label>
      <div class="action-row">
        <button class="btn success" data-toast="审核通过-机审记录保留，列表已刷新">审核通过-机审</button>
        <button class="btn danger" data-toast="已驳回并通知用户，驳回原因已回填到移动端">驳回</button>
        <button class="btn" data-toast="已进入人工复核，审核历史新增一条记录">人工复核</button>
      </div>
    `;
  }

  function showAdminPage(pageId) {
    state.adminPage = pageId;
    qsa('.admin-page').forEach((page) => page.classList.toggle('active', page.id === pageId));
    qsa('[data-admin-page]').forEach((button) => button.classList.toggle('active', button.dataset.adminPage === pageId));
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-toast],[data-open-modal],[data-close-modal],[data-open-drawer],[data-close-drawer],[data-user-detail],[data-audit-type],[data-audit-detail],[data-mobile-page],[data-next-page],[data-flow-action],[data-admin-page]');
    if (!target) return;

    if (target.dataset.toast) showToast(target.dataset.toast);
    if (target.dataset.openModal) openModal(target.dataset.openModal);
    if (target.dataset.closeModal) closeModal(target);
    if (target.dataset.userDetail) renderUserDrawer(target.dataset.userDetail);
    if (target.dataset.auditDetail) renderAuditDetail(target.dataset.auditDetail);
    if (target.dataset.openDrawer) openDrawer(target.dataset.openDrawer);
    if (target.dataset.closeDrawer) closeDrawer(target);
    if (target.dataset.auditType) renderAuditRows(target.dataset.auditType);
    if (target.dataset.mobilePage) showMobilePage(target.dataset.mobilePage);
    if (target.dataset.nextPage) {
      showMobilePage(target.dataset.nextPage);
      showToast('已保存当前步骤 demo 数据');
    }
    if (target.dataset.flowAction) applyMiniFlowAction(target.dataset.flowAction);
    if (target.dataset.adminPage) showAdminPage(target.dataset.adminPage);
  });

  renderUserCards();
  renderAuditRows('avatar');
  renderMobileStatus();
  if (qs('.mini-page')) showMobilePage(state.mobilePage);
  if (qs('.admin-page')) showAdminPage(state.adminPage);
})();
