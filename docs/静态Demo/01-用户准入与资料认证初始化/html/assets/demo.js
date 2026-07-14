(function () {
  const data = window.DEMO_DATA || {};
  const common = window.DemoCommon || {};
  const qs = common.qs || ((selector, root = document) => root.querySelector(selector));
  const qsa = common.qsa || ((selector, root = document) => Array.from(root.querySelectorAll(selector)));
  const escapeHtml = common.escapeHtml || ((value) => String(value ?? ''));
  const statusClass = common.statusClass || (() => 'brand');
  const showToast = common.showToast || (() => {});
  const openModal = common.openModal || (() => {});
  const closeModal = common.closeModal || (() => {});
  const openDrawer = common.openDrawer || (() => {});
  const closeDrawer = common.closeDrawer || (() => {});
  const MODULE_PAGE_SIZE = 5;

  function relationProfile(user) {
    const profile = (data.relationProfiles && data.relationProfiles[user.id]) || {};
    return {
      relationAccessStatus: profile.relationAccessStatus || (user.statuses?.core === '已开放' ? '开放' : '未开放'),
      vipStatus: profile.vipStatus || (user.vip ? '生效中' : '未开通'),
      hiddenVisitStatus: profile.hiddenVisitStatus || (user.vip ? '未开启' : '权益不可用'),
      visitorUv7d: profile.visitorUv7d ?? 0,
      visitorPv7d: profile.visitorPv7d ?? 0,
      activeLikedCount: profile.activeLikedCount ?? 0,
      activeMutualCount: profile.activeMutualCount ?? 0,
      lastMatchTime: profile.lastMatchTime || '-',
      records: profile.records || { likes: [], visits: [], matches: [], unlocks: [] },
    };
  }

  function messageProfile(user) {
    const profile = (data.messageProfiles && data.messageProfiles[user.id]) || {};
    return {
      userNo: profile.userNo || user.profileNo || user.id,
      unreadTotal: profile.unreadTotal ?? 0,
      whisperPending: profile.whisperPending ?? 0,
      recentNotice: profile.recentNotice || '无未读通知',
      chatReportCount: profile.chatReportCount ?? 0,
      conversationStatus: profile.conversationStatus || '普通私信未开启',
      lastPrivateMessage: profile.lastPrivateMessage || '-',
      lastNotification: profile.lastNotification || '-',
      lastWhisper: profile.lastWhisper || '-',
      auditSummary: profile.auditSummary || '高敏内容查看需二次确认并记录审计',
      records: profile.records || { privateMessages: [], whispers: [], notifications: [], reports: [] },
    };
  }

  function relationClass(value) {
    if (/开放|生效|已开启|相互喜欢|全量可见|已解锁|正常展示/.test(value)) return 'success';
    if (/未开放|账号异常|权益不可用|已失效|冻结|失败|恢复默认/.test(value)) return 'danger';
    if (/未开通|未开启|未解锁|模糊|隐藏|已过期|待/.test(value)) return 'warning';
    return 'brand';
  }

  function renderModulePagination(total, pageSize = MODULE_PAGE_SIZE) {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const pageButtons = Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      return `<button class="${page === 1 ? 'is-active' : ''}" data-page-target="${page}" ${page === 1 ? 'aria-current="page"' : ''}>${page}</button>`;
    }).join('');

    return `
      <div class="module-pagination" data-module-pagination data-current-page="1" data-page-count="${pageCount}" aria-label="分页">
        <span>共 ${escapeHtml(total)} 条</span>
        <button data-page-action="prev" disabled>上一页</button>
        ${pageButtons}
        <button data-page-action="next" ${pageCount <= 1 ? 'disabled' : ''}>下一页</button>
        <em>${escapeHtml(pageSize)}条/页</em>
      </div>
    `;
  }

  function updateModulePagination(pagination, targetPage) {
    if (!pagination) return;
    const pageCount = Math.max(1, Number(pagination.dataset.pageCount) || 1);
    const nextPage = Math.min(Math.max(Number(targetPage) || 1, 1), pageCount);
    pagination.dataset.currentPage = String(nextPage);

    qsa('[data-page-target]', pagination).forEach((button) => {
      const isActive = Number(button.dataset.pageTarget) === nextPage;
      button.classList.toggle('is-active', isActive);
      if (isActive) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    qsa('[data-page-action="prev"]', pagination).forEach((button) => { button.disabled = nextPage <= 1; });
    qsa('[data-page-action="next"]', pagination).forEach((button) => { button.disabled = nextPage >= pageCount; });

    const scope = pagination.closest('[data-pagination-scope]');
    if (!scope) return;
    qsa('[data-page-index]', scope).forEach((row) => {
      row.hidden = Number(row.dataset.pageIndex) !== nextPage;
    });
  }

  function renderRelationRecordPanels(relation) {
    const configs = [
      {
        key: 'likes',
        label: '喜欢记录',
        columns: [
          ['记录编号', 'id'],
          ['对方用户', 'oppositeUser'],
          ['状态', 'status'],
          ['解锁状态', 'unlockStatus'],
          ['发生时间', 'happenedAt'],
          ['失效原因', 'invalidReason'],
        ],
      },
      {
        key: 'visits',
        label: '访客记录',
        columns: [
          ['记录编号', 'id'],
          ['对方用户', 'oppositeUser'],
          ['访问次数', 'visitCount'],
          ['最近访问', 'lastVisitAt'],
          ['解锁状态', 'unlockStatus'],
          ['展示状态', 'hiddenStatus'],
        ],
      },
      {
        key: 'matches',
        label: '相互喜欢',
        columns: [
          ['匹配编号', 'id'],
          ['对方用户', 'oppositeUser'],
          ['关系状态', 'status'],
          ['匹配时间', 'matchedAt'],
          ['主页联动', 'profileAction'],
        ],
      },
      {
        key: 'unlocks',
        label: '解锁记录',
        columns: [
          ['解锁单号', 'id'],
          ['关系类型', 'relationType'],
          ['关联记录', 'targetRecord'],
          ['支付方式', 'payType'],
          ['展示状态', 'displayStatus'],
          ['创建时间', 'createdAt'],
        ],
      },
    ];

    const tabs = configs.map((config, index) => `
      <button class="${index === 0 ? 'is-active' : ''}" data-user-relation-tab="${config.key}">${config.label}</button>
    `).join('');

    const panels = configs.map((config, index) => {
      const rows = relation.records?.[config.key] || [];
      const header = config.columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join('');
      const body = rows.map((row, rowIndex) => {
        const pageIndex = Math.floor(rowIndex / MODULE_PAGE_SIZE) + 1;
        return `
        <tr data-page-index="${pageIndex}" ${pageIndex > 1 ? 'hidden' : ''}>
          ${config.columns.map(([label, field]) => {
            const value = row[field] ?? '-';
            const isStatus = /status|Status|Reason|Action/.test(field);
            return `<td data-label="${escapeHtml(label)}">${isStatus ? `<span class="avatar-status ${relationClass(value)}">${escapeHtml(value)}</span>` : escapeHtml(value)}</td>`;
          }).join('')}
        </tr>
      `;
      }).join('');

      return `
        <section class="profile-relation-panel ${index === 0 ? 'is-active' : ''}" data-user-relation-panel="${config.key}" data-pagination-scope>
          ${rows.length ? `
            <table class="profile-relation-table">
              <thead><tr>${header}</tr></thead>
              <tbody>${body}</tbody>
            </table>
          ` : `<div class="profile-relation-empty">暂无${escapeHtml(config.label)}</div>`}
          ${renderModulePagination(rows.length)}
        </section>
      `;
    }).join('');

    return `
      <div class="profile-relation-block">
        <nav class="profile-relation-tabs" aria-label="关系记录 Tab">${tabs}</nav>
        <div class="profile-relation-panels">${panels}</div>
      </div>
    `;
  }

  function renderMessageRecordPanels(message) {
    const configs = [
      {
        key: 'privateMessages',
        label: '私信',
        empty: '暂无普通私信记录',
        render: (item) => `
          <span>${escapeHtml(item.id)}</span>
          <strong>${escapeHtml(item.oppositeUser)}</strong>
          <b>${escapeHtml(item.status)}</b>
          <em>${escapeHtml(item.preview)}</em>
          <time>${escapeHtml(item.time)}</time>
        `,
      },
      {
        key: 'whispers',
        label: '悄悄话',
        empty: '暂无悄悄话记录',
        render: (item) => `
          <span>${escapeHtml(item.id)}</span>
          <strong>${escapeHtml(item.oppositeUser)}</strong>
          <b>${escapeHtml(item.status)}</b>
          <em>${escapeHtml(item.preview)}</em>
          <time>${escapeHtml(item.time)}</time>
        `,
      },
      {
        key: 'notifications',
        label: '通知',
        empty: '暂无通知记录',
        render: (item) => `
          <span>${escapeHtml(item.id)}</span>
          <strong>${escapeHtml(item.type)} / ${escapeHtml(item.bizType)}</strong>
          <b>${escapeHtml(item.status)}</b>
          <em>${escapeHtml(item.title)}</em>
          <time>${escapeHtml(item.time)}</time>
        `,
      },
      {
        key: 'reports',
        label: '举报',
        empty: '暂无聊天举报记录',
        render: (item) => `
          <span>${escapeHtml(item.id)}</span>
          <strong>${escapeHtml(item.oppositeUser)}</strong>
          <b>${escapeHtml(item.status)}</b>
          <em>${escapeHtml(item.reason)}</em>
          <time>${escapeHtml(item.time)}</time>
        `,
      },
    ];

    return configs.map((config) => {
      const rows = message.records?.[config.key] || [];
      const body = rows.map((item, rowIndex) => {
        const pageIndex = Math.floor(rowIndex / MODULE_PAGE_SIZE) + 1;
        return `<p data-page-index="${pageIndex}" ${pageIndex > 1 ? 'hidden' : ''}>${config.render(item)}</p>`;
      }).join('');

      return `
        <article class="profile-message-panel" data-pagination-scope>
          <h4>${escapeHtml(config.label)} Tab</h4>
          ${rows.length ? body : `<div class="profile-relation-empty">${escapeHtml(config.empty)}</div>`}
          ${renderModulePagination(rows.length)}
        </article>
      `;
    }).join('');
  }

  function renderModuleSupplementModal(userId) {
    const user = (data.adminUsers || []).find((item) => item.id === userId) || (data.adminUsers || [])[0];
    const title = qs('[data-render="module-supplement-title"]');
    const body = qs('[data-render="module-supplement-body"]');
    if (!user || !body) return;

    const relation = relationProfile(user);
    const message = messageProfile(user);
    const profileNo = user.profileNo || message.userNo || user.id;

    if (title) title.textContent = `${user.name} ${profileNo} · 模块补充`;

    body.innerHTML = `
      <nav class="module-supplement-tabs" aria-label="模块补充 Tab">
        <button class="is-active" data-module-tab="relation">关系反馈</button>
        <button data-module-tab="message">消息互动</button>
      </nav>

      <section class="module-supplement-panel is-active" data-module-panel="relation">
        <div class="module-supplement-intro">
          <strong>PRD-02 关系反馈与互动链路</strong>
          <span>从用户卡片进入，仅在弹窗内承接跨模块运营与审计信息。</span>
        </div>
        <div class="profile-relation-summary">
          <article><span>关系反馈准入</span><strong class="${relationClass(relation.relationAccessStatus)}">${escapeHtml(relation.relationAccessStatus)}</strong></article>
          <article><span>VIP 状态</span><strong class="${relationClass(relation.vipStatus)}">${escapeHtml(relation.vipStatus)}</strong></article>
          <article><span>隐藏访问记录</span><strong class="${relationClass(relation.hiddenVisitStatus)}">${escapeHtml(relation.hiddenVisitStatus)}</strong></article>
          <article><span>7天访客 UV/PV</span><strong>${escapeHtml(relation.visitorUv7d)} / ${escapeHtml(relation.visitorPv7d)}</strong></article>
          <article><span>当前被喜欢</span><strong>${escapeHtml(relation.activeLikedCount)}</strong></article>
          <article><span>当前相互喜欢</span><strong>${escapeHtml(relation.activeMutualCount)}</strong></article>
          <article class="is-wide"><span>最近匹配成功时间</span><strong>${escapeHtml(relation.lastMatchTime)}</strong></article>
        </div>
        ${renderRelationRecordPanels(relation)}
      </section>

      <section class="module-supplement-panel" data-module-panel="message">
        <div class="module-supplement-intro">
          <strong>PRD-03 消息、私信与通知中心</strong>
          <span>消息互动信息不铺在列表或画像详情内，由本弹窗集中查看。</span>
        </div>
        <div class="profile-message-summary">
          <article><span>消息未读数</span><strong>${escapeHtml(message.unreadTotal)}</strong></article>
          <article><span>待回复悄悄话</span><strong>${escapeHtml(message.whisperPending)}</strong></article>
          <article><span>最近通知</span><strong>${escapeHtml(message.recentNotice)}</strong></article>
          <article><span>聊天举报数</span><strong>${escapeHtml(message.chatReportCount)}</strong></article>
          <article class="is-wide"><span>普通私信状态</span><strong>${escapeHtml(message.conversationStatus)}</strong></article>
          <article class="is-wide"><span>高敏查看审计</span><strong>${escapeHtml(message.auditSummary)}</strong></article>
        </div>
        <div class="profile-message-latest">
          <p><span>最近私信</span><strong>${escapeHtml(message.lastPrivateMessage)}</strong></p>
          <p><span>最近悄悄话</span><strong>${escapeHtml(message.lastWhisper)}</strong></p>
          <p><span>最近通知</span><strong>${escapeHtml(message.lastNotification)}</strong></p>
        </div>
        <div class="profile-message-tabs">
          ${renderMessageRecordPanels(message)}
        </div>
      </section>
    `;
  }

  function renderUserCards() {
    const container = qs('[data-render="user-cards"]');
    if (!container || !data.adminUsers) return;

    container.innerHTML = data.adminUsers.map((user) => {
      const verifyBadges = (user.verifyBadges || Object.values(user.statuses || {}))
        .slice(0, 3)
        .map((value) => `<span class="figma-verify-badge ${statusClass(value)}">${escapeHtml(value)}</span>`)
        .join('');

      const genderAge = user.genderAge || `${user.gender || ''} ${user.age || ''}`.trim();
      const city = user.city || user.location || '-';
      const roleLine = user.roleLine || user.summary || '-';
      const incomeLine = user.incomeLine || user.incomeLocation || '-';

      return `
        <article class="figma-user-card">
          <div class="figma-avatar" aria-label="${escapeHtml(user.name)}头像"></div>
          <div class="figma-user-main">
            <h3>${escapeHtml(user.name)}</h3>
            <p>${escapeHtml(genderAge)} · ${escapeHtml(city)}</p>
          </div>
          <span class="figma-user-tag identity">${escapeHtml(user.identity || '职场人')}</span>
          ${user.vip ? `<span class="figma-user-tag vip">${escapeHtml(user.vipLabel || 'VIP')}</span>` : ''}

          <div class="figma-summary-box">
            <strong>资料摘要</strong>
            <div>
              <b>${escapeHtml(roleLine)}</b>
              <span>${escapeHtml(incomeLine)}</span>
            </div>
          </div>

          <div class="figma-card-metrics">
            <div><span>完整度</span><strong>${escapeHtml(user.scoreLabel || `${user.score}/100`)}</strong></div>
            <div><span>千寻币</span><strong>${escapeHtml(user.coin)}</strong></div>
            <div><span>微信</span><strong>${escapeHtml(user.wechat)}</strong></div>
          </div>

          <div class="figma-card-footer">
            <div class="figma-verify-row">${verifyBadges}</div>
            <div class="figma-card-actions">
              <button class="figma-card-action primary" data-open-drawer="userDrawer" data-user-id="${escapeHtml(user.id)}">详情</button>
              <button class="figma-card-action tertiary" data-open-modal="moduleSupplementModal" data-user-id="${escapeHtml(user.id)}">模块补充</button>
              <button class="figma-card-action secondary" data-open-drawer="auditDrawer" data-audit-id="${escapeHtml(user.auditId || 'A-1001')}">头像审核</button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderDrawerUser(userId) {
    const user = (data.adminUsers || []).find((item) => item.id === userId) || (data.adminUsers || [])[0];
    const target = qs('[data-render="drawer-user"]');
    if (!target || !user) return;

    const detail = user.profileDetail || {};
    const score = Number(user.score) || 0;
    const profileNo = detail.profileNo || user.profileNo || user.id;
    const genderAge = detail.genderAge || user.genderAge || '-';
    const overviewGenderAge = genderAge.includes('|') ? genderAge : genderAge.replace(' ', ' | ');
    const identity = detail.identity || user.identity || '-';
    const city = detail.city || user.city || user.location || '-';
    const phone = detail.phone || user.phone || '-';
    const registeredAt = detail.registeredAt || '2026.05.16';
    const coreStatus = detail.coreStatus || '核心准入通过';
    const vipTitle = detail.vipTitle || 'VIP会员';
    const vipPeriod = detail.vipPeriod || '2026.02.15-03.14';
    const lightFields = detail.lightFields || [
      ['性别/年龄', genderAge.replace(' ', ' / ')],
      ['身份', identity],
      ['最高学历', '本科'],
      ['现居地', city],
      ['定位状态', '已授权定位'],
    ];
    const basicFields = detail.basicFields || [
      ['昵称', user.nickname || user.name],
      ['身高/体重', '165cm / 49kg'],
      ['家乡/户口', '浙江杭州 / 上海'],
      ['行业/职业', '互联网 / 产品经理'],
      ['公司/年收入', `${user.roleLine?.split(' · ')[1] || '星河科技'} / 30-50万`],
      ['婚姻状况', '未婚'],
    ];
    const profileTags = detail.profileTags || ['认真恋爱', '稳重', '温柔', 'MBTI: INFJ'];
    const verifyBadges = detail.verifyBadges || ['三重认证通过', '头像通过', '实名通过', '学历通过'];
    const assetLogs = detail.assetLogs || [
      ['2026.02.15 14:30', '收入 +100', '余额2580', '签到奖励'],
      ['2026.02.15 14:30', '支出 -100', '余额2480', '解锁用户'],
      ['VIP 月卡：2026.03.14 到期', '', '', ''],
    ];
    const riskLogs = detail.riskLogs || [
      ['陈依怡', '2026.02.15 14:30', '风控', '账号风险复核完成并记录审计'],
    ];
    const settingsSecurity = user.settingsSecurity || {
      cancellationStatus: '未申请',
      cancellationRisk: '无阻断原因',
      searchCount30d: '0 次',
      lastSearchTime: '-',
      lastSearchScene: '-',
    };
    const renderFields = (fields) => fields.map(([label, value]) => `
      <div class="profile-confirm-field">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join('');

    const renderSectionTitle = (title) => `
      <div class="profile-confirm-section-title"><span></span><strong>${escapeHtml(title)}</strong></div>
    `;

    target.innerHTML = `
      <div class="profile-confirm">
        ${renderSectionTitle('顶部概览')}
        <section class="profile-confirm-overview">
          <div class="profile-confirm-avatar" aria-label="${escapeHtml(user.name)}头像"></div>
          <div class="profile-confirm-user">
            <h3>${escapeHtml(user.name)} ${escapeHtml(profileNo)}</h3>
            <p>${escapeHtml(overviewGenderAge)} | ${escapeHtml(identity)} | ${escapeHtml(city)}</p>
            <p>手机号 ${escapeHtml(phone)} <span>注册 ${escapeHtml(registeredAt)}</span></p>
          </div>
          <span class="profile-confirm-core">${escapeHtml(coreStatus)}</span>
          <div class="profile-confirm-vip">
            <strong>${escapeHtml(vipTitle)}</strong>
            <span>${escapeHtml(vipPeriod)}</span>
          </div>
        </section>

        ${renderSectionTitle('基本信息 - 轻量资料')}
        <section class="profile-confirm-grid is-light">
          ${renderFields(lightFields)}
        </section>

        ${renderSectionTitle('基本信息 - 基础资料')}
        <section class="profile-confirm-grid">
          ${renderFields(basicFields)}
        </section>

        ${renderSectionTitle('扩展资料')}
        <section class="profile-confirm-extra">
          <div class="profile-confirm-tags">
            ${profileTags.map((tag, index) => `<span class="tone-${index + 1}">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <p>${escapeHtml(detail.about || '关于我：喜欢稳定而真诚的关系，工作之余会运动、看展，希望能认真了解彼此。')}</p>
          <p>${escapeHtml(detail.preference || '见面偏好：周末咖啡/展览；生活方式：不吸烟、少饮酒、可接受宠物；问答 3 条。')}</p>
          <div class="profile-confirm-media">
            <span></span>
            <span></span>
            <span></span>
            <em>${escapeHtml(detail.mediaSummary || '相册 6 张 · 背景图已上传 · 语音介绍 18s')}</em>
          </div>
        </section>

        ${renderSectionTitle('认证与准入')}
        <section class="profile-confirm-cert">
          <div class="profile-confirm-badges">
            ${verifyBadges.map((value) => `<span>${escapeHtml(value)}</span>`).join('')}
          </div>
          <div class="profile-confirm-score">
            <strong>资料完整度 ${escapeHtml(detail.scoreLabel || user.scoreLabel || `${score} / 100`)}</strong>
            <div class="profile-confirm-progress"><span style="width:${Math.max(0, Math.min(score, 100))}%"></span></div>
          </div>
        </section>

        ${renderSectionTitle('千寻币/VIP')}
        <section class="profile-confirm-logs">
          ${assetLogs.map((log) => `
            <p>
              <span>${escapeHtml(log[0])}</span>
              ${log[1] ? `<span>${escapeHtml(log[1])}</span>` : ''}
              ${log[2] ? `<span>${escapeHtml(log[2])}</span>` : ''}
              ${log[3] ? `<span>${escapeHtml(log[3])}</span>` : ''}
            </p>
          `).join('')}
        </section>

        ${renderSectionTitle('客服/风控处理记录')}
        <section class="profile-confirm-risk">
          ${riskLogs.map((log) => `
            <p>
              <span>${escapeHtml(log[0])}</span>
              <span>${escapeHtml(log[1])}</span>
              <span>${escapeHtml(log[2])}</span>
              <span>${escapeHtml(log[3])}</span>
            </p>
          `).join('')}
        </section>

        ${renderSectionTitle('设置与安全（PRD-06）')}
        <section class="profile-confirm-grid">
          ${renderFields([
            ['注销状态', settingsSecurity.cancellationStatus],
            ['注销阻断摘要', settingsSecurity.cancellationRisk],
            ['最近 30 天搜索次数', settingsSecurity.searchCount30d],
            ['最近搜索时间', settingsSecurity.lastSearchTime],
            ['最近搜索场景', settingsSecurity.lastSearchScene],
          ])}
        </section>

        <div class="profile-confirm-actions">
          <button class="profile-freeze-btn" data-open-modal="freezeModal">冻结账号</button>
        </div>
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

  function auditKind(row) {
    const prefix = String(row?.id || '').slice(0, 1);
    if (prefix === 'A') return 'avatar';
    if (prefix === 'R') return 'realName';
    if (prefix === 'E') return 'education';
    if (prefix === 'P') return 'photo';
    if (prefix === 'T') return 'text';
    return 'generic';
  }

  function setAuditDrawerMode(kind, title) {
    const drawer = document.getElementById('auditDrawer');
    const titleNode = qs('#auditDrawerTitle');
    if (!drawer) return;

    drawer.classList.add('audit-review-backdrop');
    drawer.classList.remove('is-avatar', 'is-document', 'is-photo', 'is-text');
    drawer.classList.add(kind === 'avatar' ? 'is-avatar' : `is-${kind}`);
    if (titleNode) titleNode.textContent = title;
  }

  function auditConfirmCopy(modalId, row) {
    const kind = auditKind(row);
    const subject = row?.confirmSubject || row?.object || row?.user || '审核内容';

    if (modalId === 'auditSensitiveModal') {
      if (kind === 'photo') {
        return {
          title: '下载原图确认',
          message: '下载资料图片原图需要授权，确认后记录审计。',
          toast: `资料图片原图下载已记录：${row?.id || ''}`,
          danger: false,
        };
      }
      if (kind === 'text') {
        return {
          title: '查看敏感二次确认',
          message: '即将查看脱敏后的命中内容和审核依据，确认后记录审计。',
          toast: `开放性文字敏感查看已记录：${row?.id || ''}`,
          danger: false,
        };
      }
      return {
        title: '查看高敏二次确认',
        message: '即将查看完整姓名、身份证号、手机号，确认后记录审计。',
        toast: `实名高敏查看已记录：${row?.id || ''}`,
        danger: false,
      };
    }

    if (modalId === 'auditRejectConfirmModal') {
      return {
        title: kind === 'avatar' ? '审核驳回确认' : '驳回确认',
        message: `${subject} 驳回原因必填，确认后发送站内信。`,
        toast: `审核已驳回：${row?.id || ''}`,
        danger: true,
      };
    }

    if (modalId === 'auditExpireModal') {
      return {
        title: '失效确认',
        message: `${subject} 失效原因必填，确认后发送站内信并重新计算展示状态。`,
        toast: `审核已标记失效：${row?.id || ''}`,
        danger: true,
      };
    }

    return {
      title: '通过确认',
      message: `${subject} 通过后发送站内信，并重算核心准入状态。`,
      toast: `审核已通过：${row?.id || ''}`,
      danger: false,
    };
  }

  function renderAuditConfirm(modalId, rowId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const row = findAuditRow(rowId) || {};
    const copy = auditConfirmCopy(modalId, row);
    const title = qs('[data-audit-confirm-title]', modal);
    const message = qs('[data-audit-confirm-message]', modal);
    const action = qs('[data-audit-confirm-action]', modal);
    const log = qs('[data-audit-confirm-log]', modal);

    if (title) title.textContent = copy.title;
    if (message) message.textContent = copy.message;
    if (log) {
      log.textContent = '确认后写入审计日志';
      log.classList.toggle('is-danger', copy.danger);
    }
    if (action) {
      action.dataset.toast = copy.toast;
      action.classList.toggle('is-danger', copy.danger);
    }
  }

  function renderAuditActionButtons(row, options = {}) {
    const id = escapeHtml(row.id || '');
    const sensitiveLabel = options.sensitiveLabel;
    return `
      <div class="avatar-review-actions audit-review-actions">
        ${sensitiveLabel ? `<button class="plain" data-open-modal="auditSensitiveModal" data-row-id="${id}">${escapeHtml(sensitiveLabel)}</button>` : ''}
        <button class="fail" data-open-modal="auditRejectConfirmModal" data-row-id="${id}">驳回</button>
        <button class="plain" data-open-modal="auditExpireModal" data-row-id="${id}">失效</button>
        <button class="pass" data-open-modal="auditApproveModal" data-row-id="${id}">通过</button>
      </div>
    `;
  }

  function renderAuditDetail(rowId) {
    const target = qs('[data-render="audit-detail"]');
    if (!target) return;
    const row = findAuditRow(rowId) || data.auditQueues?.avatar?.[0] || {};
    const kind = auditKind(row);
    if (kind === 'avatar') {
      setAuditDrawerMode('avatar', '图片审核');
      target.innerHTML = `
        <div class="avatar-modal-kicker">独立弹窗面板</div>
        <div class="avatar-image-preview">
          <span></span>
          <em>当前主头像</em>
        </div>
        <div class="avatar-ai-tag">人像识别：是人像 92%</div>
        <label class="avatar-reject-reason">
          <span>驳回原因</span>
          <input value="${escapeHtml(row.reason && row.reason !== '-' ? row.reason : '非人像/遮挡/严重裁剪可选')}">
        </label>
        ${renderAuditActionButtons(row, { sensitiveLabel: '下载原图' })}
      `;
      return;
    }

    if (kind === 'realName') {
      setAuditDrawerMode('document', '审核详情页');
      target.innerHTML = `
        <div class="avatar-modal-kicker">独立详情面板</div>
        <div class="audit-paper-panel">
          <p><strong>基本信息：</strong>${escapeHtml(row.user)} ${escapeHtml(row.profileNo || 'U100281')}</p>
          <p>手机号：${escapeHtml(row.phone || '-')}</p>
          <p>身份证号：${escapeHtml(row.idNo || '-')}</p>
          <p>提交内容：姓名 + 身份证号 + 已绑定手机号三要素核验。</p>
          <p>审核历史：${escapeHtml(row.history || '06-23 驳回，06-24 用户重新提交。')}</p>
          <span class="audit-pass-tag">身份验证通过</span>
        </div>
        <label class="avatar-reject-reason">
          <span>审核备注</span>
          <input value="${escapeHtml(row.note || '自由输入，需交同审计内容')}">
        </label>
        ${renderAuditActionButtons(row, { sensitiveLabel: '查看高敏' })}
      `;
      return;
    }

    if (kind === 'education') {
      setAuditDrawerMode('document', '学历审核详情');
      target.innerHTML = `
        <div class="avatar-modal-kicker">独立详情面板</div>
        <div class="audit-paper-panel">
          <p><strong>学历材料：</strong>${escapeHtml(row.object || '-')}</p>
          <p>用户身份：${escapeHtml(row.identity || '职场人')}</p>
          <p>学校/学历：${escapeHtml(row.school || '复旦大学 / 本科')}</p>
          <p>核验信号：${escapeHtml(row.signal || '-')}</p>
          <p>审核说明：${escapeHtml(row.history || '学历材料清晰，等待人工确认。')}</p>
          <span class="audit-pass-tag">材料完整</span>
        </div>
        <label class="avatar-reject-reason">
          <span>驳回原因</span>
          <input value="${escapeHtml(row.reason && row.reason !== '-' ? row.reason : '学历材料不清晰/信息不一致可选')}">
        </label>
        ${renderAuditActionButtons(row)}
      `;
      return;
    }

    if (kind === 'photo') {
      setAuditDrawerMode('photo', '图片预览弹窗');
      target.innerHTML = `
        <div class="avatar-modal-kicker">独立弹窗面板</div>
        <div class="avatar-image-preview audit-photo-preview">
          <span></span>
          <em>${escapeHtml(row.object || '相册图片 / 优存')}</em>
        </div>
        <p class="audit-preview-copy">资料图片审核原则：只影响该图片展示，不影响主头像认证和其他照片。</p>
        <label class="avatar-reject-reason">
          <span>驳回原因</span>
          <input value="${escapeHtml(row.reason && row.reason !== '-' ? row.reason : '违规/低俗/广告/联系方式导流')}">
        </label>
        ${renderAuditActionButtons(row, { sensitiveLabel: '下载原图' })}
      `;
      return;
    }

    if (kind === 'text') {
      setAuditDrawerMode('text', '文本审核详情');
      target.innerHTML = `
        <div class="avatar-modal-kicker">独立详情面板</div>
        <div class="audit-text-preview">
          <strong>开放性文字 / ${escapeHtml(row.object || '内容')}</strong>
          <p>${escapeHtml(row.fullText || row.summary || '喜欢真诚沟通，希望周末能一起看展、运动，慢慢了解彼此。')}</p>
        </div>
        <div class="avatar-ai-tag">命中信号：${escapeHtml(row.signal || '微信文本安全通过')}</div>
        <label class="avatar-reject-reason">
          <span>驳回原因</span>
          <input value="${escapeHtml(row.reason && row.reason !== '-' ? row.reason : '包含联系方式/营销导流/敏感词可选')}">
        </label>
        ${renderAuditActionButtons(row, { sensitiveLabel: '查看敏感' })}
      `;
      return;
    }

    setAuditDrawerMode('document', '审核详情页');
    target.innerHTML = `
      <div class="admin-section-title"><span></span><strong>详情字段</strong></div>
      <div class="audit-detail-grid">
        <article class="audit-detail-card">
          <h3>审核对象</h3>
          <dl>
            <div><dt>审核单</dt><dd>${escapeHtml(row.id || '-')}</dd></div>
            <div><dt>用户</dt><dd>${escapeHtml(row.user || '-')}</dd></div>
            <div><dt>对象</dt><dd>${escapeHtml(row.object || '-')}</dd></div>
            <div><dt>提交时间</dt><dd>${escapeHtml(row.submittedAt || '-')}</dd></div>
          </dl>
        </article>
        <article class="audit-detail-card">
          <h3>审核判断</h3>
          <dl>
            <div><dt>展示标签</dt><dd><span class="tag ${statusClass(row.display || '')}">${escapeHtml(row.display || '-')}</span></dd></div>
            <div><dt>审核来源</dt><dd>${escapeHtml(row.source || '-')}</dd></div>
            <div><dt>机审信号</dt><dd>${escapeHtml(row.signal || '-')}</dd></div>
            <div><dt>驳回原因</dt><dd>${escapeHtml(row.reason || '-')}</dd></div>
          </dl>
        </article>
      </div>
      <div class="audit-material-row">
        <article>
          <h3>材料内容</h3>
          <p>${escapeHtml(row.object || '主头像')} · 静态 Demo 不展示真实证照材料，仅保留材料摘要和机审信号。</p>
        </article>
        <article>
          <h3>历史记录</h3>
          <p>${escapeHtml(row.submittedAt || '-')} 提交；${escapeHtml(row.display || '-')}；操作结果写入审核历史。</p>
        </article>
      </div>
      <div class="admin-board-actions audit-actions">
        <button class="admin-primary-btn" data-open-modal="auditApproveModal" data-row-id="${escapeHtml(row.id || '')}">通过</button>
        <button class="admin-danger-btn" data-open-modal="auditRejectConfirmModal" data-row-id="${escapeHtml(row.id || '')}">驳回</button>
        <button class="admin-plain-btn" data-open-modal="auditExpireModal" data-row-id="${escapeHtml(row.id || '')}">失效</button>
      </div>
    `;
  }

  function renderAuditRows() {
    qsa('[data-audit-queue]').forEach((tbody) => {
      const queueName = tbody.dataset.auditQueue;
      const rows = (data.auditQueues && data.auditQueues[queueName]) || [];

      if (queueName === 'avatar') {
        tbody.innerHTML = rows.slice(0, 5).map((row) => {
          return `
            <tr>
              <td>${escapeHtml(row.user)}</td>
              <td>${escapeHtml(row.object)}</td>
              <td>${escapeHtml(row.submittedAt)}</td>
              <td><span class="avatar-status ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
              <td>${escapeHtml(row.source || '-')}</td>
              <td>${escapeHtml(row.reason || '-')}</td>
              <td><button class="avatar-link-btn" data-open-drawer="auditDrawer" data-audit-id="${escapeHtml(row.id)}">详情</button></td>
            </tr>
          `;
        }).join('');
        return;
      }

      if (queueName === 'realName') {
        tbody.innerHTML = rows.slice(0, 5).map((row) => `
          <tr>
            <td>${escapeHtml(row.user)}</td>
            <td>${escapeHtml(row.phone || '-')}</td>
            <td>${escapeHtml(row.realName || row.user)}</td>
            <td>${escapeHtml(row.idNo || '-')}</td>
            <td><span class="avatar-status ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
            <td>${escapeHtml(row.source || '-')}</td>
            <td><button class="avatar-link-btn" data-open-drawer="auditDrawer" data-audit-id="${escapeHtml(row.id)}">详情</button></td>
          </tr>
        `).join('');
        return;
      }

      if (queueName === 'education') {
        tbody.innerHTML = rows.slice(0, 5).map((row) => `
          <tr>
            <td>${escapeHtml(row.user)}</td>
            <td>${escapeHtml(row.identity || '-')}</td>
            <td>${escapeHtml(row.object || '-')}</td>
            <td>${escapeHtml(row.submittedAt)}</td>
            <td><span class="avatar-status ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
            <td>${escapeHtml(row.source || '-')}</td>
            <td><button class="avatar-link-btn" data-open-drawer="auditDrawer" data-audit-id="${escapeHtml(row.id)}">详情</button></td>
          </tr>
        `).join('');
        return;
      }

      if (queueName === 'photo') {
        tbody.innerHTML = rows.slice(0, 5).map((row) => `
          <tr>
            <td>${escapeHtml(row.user)}</td>
            <td>${escapeHtml(row.type || row.object || '-')}</td>
            <td>${escapeHtml(row.category || '-')}</td>
            <td>${escapeHtml(row.imageCount || '1张')}</td>
            <td>${escapeHtml(row.submittedAt)}</td>
            <td><span class="avatar-status ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
            <td>${escapeHtml(row.source || '-')}</td>
            <td><button class="avatar-link-btn" data-open-drawer="auditDrawer" data-audit-id="${escapeHtml(row.id)}">详情</button></td>
          </tr>
        `).join('');
        return;
      }

      if (queueName === 'text') {
        tbody.innerHTML = rows.slice(0, 5).map((row) => `
          <tr>
            <td>${escapeHtml(row.user)}</td>
            <td>${escapeHtml(row.object || '-')}</td>
            <td>${escapeHtml(row.summary || row.signal || '-')}</td>
            <td>${escapeHtml(row.submittedAt)}</td>
            <td><span class="avatar-status ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
            <td>${escapeHtml(row.source || '-')}</td>
            <td><button class="avatar-link-btn" data-open-drawer="auditDrawer" data-audit-id="${escapeHtml(row.id)}">详情</button></td>
          </tr>
        `).join('');
        return;
      }

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
              <button class="btn success" data-open-modal="auditApproveModal" data-row-id="${escapeHtml(row.id)}">通过</button>
              <button class="btn danger" data-open-modal="auditRejectConfirmModal" data-row-id="${escapeHtml(row.id)}">驳回</button>
              <button class="btn" data-open-modal="auditExpireModal" data-row-id="${escapeHtml(row.id)}">失效</button>
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
      const hash = window.location.hash;
      const hashTarget = hash ? qs(hash) : null;
      if (document.body.classList.contains('admin-demo') && hashTarget && hashTarget.classList.contains('admin-page')) {
        links.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === hash);
        });
        return;
      }

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
        if (modalButton.dataset.openModal === 'moduleSupplementModal') renderModuleSupplementModal(modalButton.dataset.userId);
        if (modalButton.dataset.rowId) renderAuditConfirm(modalButton.dataset.openModal, modalButton.dataset.rowId);
        openModal(modalButton.dataset.openModal);
        if (modalButton.dataset.rowId) {
          const rowTarget = qs('[data-reject-row]');
          if (rowTarget) rowTarget.textContent = modalButton.dataset.rowId;
        }
      }

      const drawerButton = event.target.closest('[data-open-drawer]');
      if (drawerButton) {
        if (drawerButton.dataset.openDrawer === 'userDrawer') renderDrawerUser(drawerButton.dataset.userId);
        if (drawerButton.dataset.auditId) renderAuditDetail(drawerButton.dataset.auditId);
        openDrawer(drawerButton.dataset.openDrawer);
      }

      const closeButton = event.target.closest('[data-close]');
      if (closeButton) {
        const closeTarget = closeButton.closest('.modal-backdrop, .drawer-backdrop');
        if (closeTarget && closeTarget.contains(document.activeElement)) document.activeElement.blur();
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

      const configTab = event.target.closest('[data-config-tab]');
      if (configTab) {
        const page = configTab.closest('.access-config-page');
        const tabName = configTab.dataset.configTab;
        qsa('[data-config-tab]', page).forEach((node) => node.classList.toggle('is-active', node === configTab));
        qsa('[data-config-panel]', page).forEach((node) => node.classList.toggle('is-active', node.dataset.configPanel === tabName));
        return;
      }

      const userRelationTab = event.target.closest('[data-user-relation-tab]');
      if (userRelationTab) {
        const block = userRelationTab.closest('.profile-relation-block');
        const tabName = userRelationTab.dataset.userRelationTab;
        qsa('[data-user-relation-tab]', block).forEach((node) => node.classList.toggle('is-active', node === userRelationTab));
        qsa('[data-user-relation-panel]', block).forEach((node) => node.classList.toggle('is-active', node.dataset.userRelationPanel === tabName));
        return;
      }

      const moduleTab = event.target.closest('[data-module-tab]');
      if (moduleTab) {
        const modal = moduleTab.closest('#moduleSupplementModal');
        const tabName = moduleTab.dataset.moduleTab;
        qsa('[data-module-tab]', modal).forEach((node) => node.classList.toggle('is-active', node === moduleTab));
        qsa('[data-module-panel]', modal).forEach((node) => node.classList.toggle('is-active', node.dataset.modulePanel === tabName));
        return;
      }

      const pageButton = event.target.closest('[data-page-action], [data-page-target]');
      if (pageButton) {
        const pagination = pageButton.closest('[data-module-pagination]');
        const currentPage = Number(pagination?.dataset.currentPage) || 1;
        const targetPage = pageButton.dataset.pageTarget
          ? Number(pageButton.dataset.pageTarget)
          : currentPage + (pageButton.dataset.pageAction === 'next' ? 1 : -1);
        updateModulePagination(pagination, targetPage);
        return;
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

    if (common.wireBackdropClose) common.wireBackdropClose();
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
