(function () {
  'use strict';

  const DemoData = window.DemoData;
  if (!DemoData) {
    throw new Error('DemoData is required before demo.js');
  }

  const pageTitles = {
    likes: '对我心动',
    viewers: '访客',
    mutual: '相互喜欢'
  };

  const groupLabels = {
    today: '今日',
    yesterday: '昨日',
    recent: '近 7 天'
  };

  const initialUnlocked = [...DemoData.initialUnlockedRecordNos];
  const state = {
    page: getPageFromHash(),
    pageMode: {
      likes: 'normal',
      viewers: 'normal',
      mutual: 'normal'
    },
    walletBalance: DemoData.wallet.balance,
    visibleCount: {
      likes: 6,
      viewers: 6,
      mutual: 4
    },
    unlockedRecordNos: new Set(initialUnlocked),
    vipActive: false,
    payShouldFail: false,
    selectedRecordNo: null,
    pendingScene: null,
    paywallMode: null,
    selectedPackageId: DemoData.quickPackages[0].id,
    lastTrigger: null
  };

  let toastTimer = null;
  let refreshTimer = null;

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

  function getPageFromHash() {
    const page = window.location.hash.replace('#', '');
    return Object.hasOwn(pageTitles, page) ? page : 'likes';
  }

  function getRecordNo(kind, record) {
    if (kind === 'likes') return record.recordNo;
    if (kind === 'viewers') return record.visitNo;
    return record.matchNo;
  }

  function getRecords(kind) {
    if (kind === 'likes') return DemoData.likes;
    if (kind === 'viewers') return DemoData.viewers;
    return DemoData.mutual;
  }

  function filterVisibleRecords(kind, records) {
    if (kind === 'likes') {
      return records.filter((record) => record.status === 'active');
    }
    if (kind === 'viewers') {
      return records.filter((record) => record.status === 'visible');
    }
    return records.filter((record) => record.status === 'matched');
  }

  function findRecord(kind, recordNo) {
    return getRecords(kind).find((record) => getRecordNo(kind, record) === recordNo) || null;
  }

  function isClearRecord(kind, record) {
    if (kind === 'mutual') return true;
    return state.vipActive || state.unlockedRecordNos.has(getRecordNo(kind, record));
  }

  function getScene(kind) {
    return kind === 'likes' ? 'likes_unlock_one' : 'viewers_unlock_one';
  }

  function renderCurrentPage() {
    const mode = state.pageMode[state.page];

    const isMutualPage = state.page === 'mutual';
    const heartTabs = qs('[data-heart-tabs]');
    const mutualHeading = qs('[data-mutual-heading]');
    if (heartTabs) heartTabs.hidden = isMutualPage;
    if (mutualHeading) mutualHeading.hidden = !isMutualPage;

    qsa('[data-page]').forEach((page) => {
      const active = page.dataset.page === state.page;
      page.hidden = !active;
      page.classList.toggle('is-active', active);
    });

    qsa('[data-page-target]').forEach((button) => {
      const active = button.dataset.pageTarget === state.page;
      button.classList.toggle('is-active', active);
      if (button.classList.contains('heart-tab')) {
        button.setAttribute('aria-selected', String(active));
      }
    });

    const appTitle = qs('[data-app-title]');
    const currentPageLabel = qs('[data-current-page-label]');
    const modeSelect = qs('[data-demo-mode]');
    if (appTitle) appTitle.textContent = pageTitles[state.page];
    if (currentPageLabel) currentPageLabel.textContent = pageTitles[state.page];
    if (modeSelect) modeSelect.value = mode;

    const content = qs(`[data-page-content="${state.page}"]`);
    if (!content) return;

    const networkBanner = qs('[data-network-banner]');
    if (networkBanner) networkBanner.hidden = mode !== 'network-error';

    if (mode === 'loading') {
      content.innerHTML = renderLoadingState();
    } else if (mode === 'core-blocked') {
      content.innerHTML = renderCoreBlockedState();
    } else if (mode === 'empty') {
      content.innerHTML = renderEmptyState(state.page);
    } else if (state.page === 'likes') {
      content.innerHTML = renderLikes(mode);
    } else if (state.page === 'viewers') {
      content.innerHTML = renderViewers(mode);
    } else {
      content.innerHTML = renderMutual(mode);
    }

    renderStickyAction(mode);
    updateRuntimeSummary();
  }

  function renderLoadingState() {
    return `
      <div class="loading-state" aria-label="页面加载中">
        <div class="skeleton-stack" aria-hidden="true">
          <div class="skeleton-block hero"></div>
          <div class="skeleton-block"></div>
          <div class="skeleton-block"></div>
          <div class="skeleton-block"></div>
        </div>
      </div>
    `;
  }

  function renderCoreBlockedState() {
    return `
      <div class="access-state">
        <div>
          <div class="access-state-visual" aria-hidden="true">✓</div>
          <h3>完成三重认证后开放</h3>
          <p>${escapeHtml(DemoData.config.copy.coreBlocked)}</p>
          <button class="primary-action" type="button" data-action="open-certification">去完成认证</button>
        </div>
      </div>
    `;
  }

  function renderEmptyState(page) {
    const emptyConfig = {
      likes: {
        icon: '♡',
        title: '还没有新的喜欢',
        copy: DemoData.config.copy.likesEmpty,
        action: '去完善资料'
      },
      viewers: {
        icon: '◉',
        title: '暂时没有新访客',
        copy: DemoData.config.copy.viewersEmpty,
        action: '去看看推荐'
      },
      mutual: {
        icon: '♥',
        title: '缘分正在路上',
        copy: DemoData.config.copy.mutualEmpty,
        action: '去推荐页看看'
      }
    }[page];

    return `
      <div class="empty-state">
        <div>
          <div class="empty-state-visual" aria-hidden="true">${emptyConfig.icon}</div>
          <h3>${escapeHtml(emptyConfig.title)}</h3>
          <p>${escapeHtml(emptyConfig.copy)}</p>
          <button class="primary-action" type="button" data-action="empty-primary">${escapeHtml(emptyConfig.action)}</button>
        </div>
      </div>
    `;
  }

  function renderLikes(mode) {
    const records = filterVisibleRecords('likes', DemoData.likes)
      .slice(0, DemoData.config.likesBlurLimit);
    const visibleRecords = records.slice(0, state.visibleCount.likes);
    const expiryNote = mode === 'vip-expired'
      ? '<div class="state-note">会员权益已到期：未单条购买的记录重新模糊，已购买记录保持永久清晰。</div>'
      : '';
    const avatarRecords = records.slice(0, 5);

    return `
      <section class="likes-summary" aria-label="新喜欢概览">
        <h2>${escapeHtml(DemoData.stats.newLikes)} 新喜欢</h2>
        <div class="new-like-row">
          ${avatarRecords.map((record) => `
            <span class="new-like-avatar"><img src="${escapeHtml(isClearRecord('likes', record) ? record.avatar : record.blurAvatar)}" alt="${isClearRecord('likes', record) ? `${escapeHtml(record.nickname)}的头像` : '模糊头像'}"></span>
          `).join('')}
        </div>
      </section>
      <h2 class="likes-count-heading">${escapeHtml(DemoData.stats.likesTotal)} 人新喜欢了我</h2>
      ${expiryNote}
      <div class="likes-grid">
        ${visibleRecords.map((record) => renderLikeCard(record)).join('')}
      </div>
      ${renderLoadMore('likes', records.length)}
    `;
  }

  function renderLikeCard(record) {
    const clear = isClearRecord('likes', record);
    const recordNo = escapeHtml(record.recordNo);
    const image = clear ? record.photo : record.blurPhoto;
    const summary = clear ? `${record.nickname}·${record.age}岁` : record.summary;
    const marker = clear
      ? `<span class="clear-marker">${state.unlockedRecordNos.has(record.recordNo) ? '单条已解锁' : '会员可见'}</span>`
      : '';

    return `
      <button class="person-card ${clear ? 'is-clear' : 'is-blurred'}" type="button"
        data-action="open-record" data-record-kind="likes" data-record-no="${recordNo}"
        aria-label="${clear ? `查看${escapeHtml(record.nickname)}的主页` : '解锁一条喜欢记录'}">
        <img src="${escapeHtml(image)}" alt="${clear ? `${escapeHtml(record.nickname)}的照片` : '独立模糊用户照片'}">
        ${marker}
        <span class="card-overlay">
          <span class="online-chip">${escapeHtml(record.onlineText)}</span>
          ${record.actionCopy ? `<span class="love-copy">${escapeHtml(record.actionCopy)}</span>` : ''}
          <strong>${escapeHtml(summary)}</strong>
        </span>
      </button>
    `;
  }

  function renderViewers(mode) {
    const records = filterVisibleRecords('viewers', DemoData.viewers);
    const visibleRecords = records.slice(0, state.visibleCount.viewers);
    const groups = ['today', 'yesterday', 'recent'];
    const expiryNote = mode === 'vip-expired'
      ? '<div class="state-note">会员权益已到期：全量清晰权益回退，千寻币单条购买仍保持清晰。</div>'
      : '';

    return `
      <div class="visitor-stat-grid" aria-label="访客统计">
        <div class="visitor-stat"><strong>${escapeHtml(DemoData.stats.viewers.totalPv)}</strong><span>总浏览量</span></div>
        <div class="visitor-stat"><strong>${escapeHtml(DemoData.stats.viewers.todayUv)}</strong><span>今日访客</span></div>
        <div class="visitor-stat"><strong>${escapeHtml(DemoData.stats.viewers.todayPv)}</strong><span>今日浏览量</span></div>
      </div>
      <p class="member-privacy-note">担心被认识的人看到？<a href="#member" data-action="unlock-all">开通会员</a>只让你喜欢的人看到你</p>
      ${expiryNote}
      ${groups.map((group) => renderViewerGroup(group, visibleRecords)).join('')}
      ${renderLoadMore('viewers', records.length)}
    `;
  }

  function renderViewerGroup(group, records) {
    const grouped = records.filter((record) => record.groupKey === group);
    if (grouped.length === 0) return '';

    return `
      <section class="visitor-group" aria-labelledby="viewer-group-${group}">
        <div class="group-heading">
          <h3 id="viewer-group-${group}">${escapeHtml(groupLabels[group])}</h3>
          <span>${group === 'today' ? `${DemoData.config.visitDedupMinutes} 分钟内去重` : `${grouped.length} 位访客`}</span>
        </div>
        <div class="viewer-grid">
          ${grouped.map((record) => renderViewerCard(record)).join('')}
        </div>
      </section>
    `;
  }

  function renderViewerCard(record) {
    const clear = isClearRecord('viewers', record);
    const recordNo = escapeHtml(record.visitNo);
    const image = clear ? record.photo : record.blurPhoto;
    const summary = clear ? `${record.nickname}·${record.age}岁` : record.summary;

    return `
      <button class="visitor-card ${clear ? 'is-clear' : 'is-blurred'}" type="button"
        data-action="open-record" data-record-kind="viewers" data-record-no="${recordNo}"
        aria-label="${clear ? `查看${escapeHtml(record.nickname)}的主页` : '解锁一条访客记录'}">
        <img src="${escapeHtml(image)}" alt="${clear ? `${escapeHtml(record.nickname)}的照片` : '独立模糊访客照片'}">
        ${clear ? '<span class="clear-marker">已解锁</span>' : ''}
        <span class="card-overlay">
          <span class="online-chip">${escapeHtml(record.onlineText)}</span>
          <strong>${escapeHtml(summary)}</strong>
        </span>
      </button>
    `;
  }

  function renderMutual() {
    const records = filterVisibleRecords('mutual', DemoData.mutual);
    const visibleRecords = records.slice(0, state.visibleCount.mutual);

    return `
      <div class="mutual-summary">
        <strong>相互喜欢(${records.length}人)</strong>
        <span>彼此表达过心动</span>
      </div>
      <div class="mutual-list">
        ${visibleRecords.map((record) => renderMutualCard(record)).join('')}
      </div>
      ${renderLoadMore('mutual', records.length)}
    `;
  }

  function renderMutualCard(record) {
    return `
      <article class="mutual-card">
        <span class="mutual-avatar"><img src="${escapeHtml(record.avatar)}" alt="${escapeHtml(record.nickname)}的头像"></span>
        <div class="mutual-main">
          <strong>${escapeHtml(record.nickname)}</strong>
          <p>现居${escapeHtml(record.currentCity)} · ${escapeHtml(record.hometown)}人</p>
        </div>
        <button class="row-action" type="button" data-action="open-profile" data-record-kind="mutual" data-record-no="${escapeHtml(record.matchNo)}">查看主页</button>
      </article>
    `;
  }

  function renderLoadMore(kind, total) {
    if (state.visibleCount[kind] >= total) return '';
    return `<div class="load-more-row"><button class="load-more-button" type="button" data-action="load-more">加载更多</button></div>`;
  }

  function renderStickyAction(mode) {
    const container = qs('[data-sticky-action]');
    if (!container) return;

    const shouldShow = ['likes', 'viewers'].includes(state.page)
      && ['normal', 'network-error', 'vip-expired'].includes(mode);

    if (!shouldShow) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <button class="primary-action" type="button" data-action="unlock-all">
        ${state.page === 'likes' ? '解锁全部喜欢我的人' : '解锁全部访客'}
      </button>
    `;
  }

  function switchPage(page, updateHash = true) {
    if (!Object.hasOwn(pageTitles, page)) return;
    state.page = page;
    if (updateHash && window.location.hash !== `#${page}`) {
      window.history.replaceState(null, '', `#${page}`);
    }
    renderCurrentPage();
    const appScroll = qs('[data-app-scroll]');
    if (appScroll) appScroll.scrollTop = 0;
  }

  function clearRelationshipContentForCoreBlock() {
    qsa('[data-page-content]').forEach((content) => content.replaceChildren());
    Object.keys(state.pageMode).forEach((page) => {
      state.pageMode[page] = 'core-blocked';
    });
  }

  function setDemoMode(mode) {
    if (mode === 'core-blocked') {
      clearRelationshipContentForCoreBlock();
    } else if (Object.values(state.pageMode).includes('core-blocked')) {
      Object.keys(state.pageMode).forEach((page) => {
        state.pageMode[page] = 'normal';
      });
    }
    state.pageMode[state.page] = mode;
    if (mode === 'vip-expired') {
      state.vipActive = false;
      showToast('会员权益已到期，单条购买记录仍保持清晰');
    }
    renderCurrentPage();
  }

  function refreshCurrentPage() {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    const previousMode = state.pageMode[state.page];
    state.pageMode[state.page] = 'loading';
    renderCurrentPage();
    refreshTimer = window.setTimeout(() => {
      state.pageMode[state.page] = previousMode === 'network-error' ? 'normal' : previousMode;
      renderCurrentPage();
      showToast('已刷新到最新关系数据');
    }, 520);
  }

  function openSingleUnlock(kind, recordNo, trigger) {
    const record = findRecord(kind, recordNo);
    const visible = record && filterVisibleRecords(kind, [record]).length === 1;
    if (!visible) {
      showToast('该对象暂不可访问，列表已刷新', 'error');
      renderCurrentPage();
      return;
    }

    state.selectedRecordNo = recordNo;
    state.pendingScene = getScene(kind);
    state.lastTrigger = trigger || null;

    const subtitle = kind === 'likes'
      ? DemoData.config.copy.likeUnlockSubtitle
      : DemoData.config.copy.viewerUnlockSubtitle;
    const cost = DemoData.config.prices[state.pendingScene];

    qs('[data-single-unlock-subtitle]').textContent = subtitle;
    qs('[data-single-cost]').textContent = String(cost);
    qs('[data-single-balance]').textContent = String(state.walletBalance);
    qs('[data-unlock-avatar]').src = record.blurAvatar;
    qs('[data-unlock-summary]').textContent = record.weakTags.slice(0, 2).join('·') || '同城·资料已认证';
    openModal('singleUnlockModal', trigger);
  }

  function openPaywall(mode, trigger) {
    state.paywallMode = mode;
    const content = qs('[data-paywall-content]');
    const actions = qs('[data-paywall-actions]');
    const kicker = qs('[data-paywall-kicker]');
    const title = qs('[data-paywall-title]');
    if (!content || !actions || !kicker || !title) return;

    if (mode === 'member') {
      kicker.textContent = '时空邂逅会员';
      title.textContent = '解锁全部心动名单';
      content.innerHTML = `
        <div class="paywall-content">
          <ul class="benefit-list">
            <li>喜欢我的名单全量清晰</li>
            <li>最近访客名单全量清晰</li>
            <li>隐私权益按会员有效期生效</li>
          </ul>
          <p class="paywall-note">会员到期后，未单条购买的记录会回退为模糊；已单条购买记录仍永久清晰。</p>
        </div>
      `;
      actions.innerHTML = `
        <button class="primary-action" type="button" data-action="open-member-center">开通会员</button>
        <button class="secondary-action" type="button" data-close-modal>暂不开通</button>
      `;
    } else {
      const cost = DemoData.config.prices[state.pendingScene];
      const enough = state.walletBalance >= cost;
      kicker.textContent = enough ? '千寻币确认' : '余额不足';
      title.textContent = enough ? '确认只看当前的 ta' : '补充千寻币后继续';

      if (enough) {
        content.innerHTML = `
          <div class="paywall-content">
            <div class="paywall-balance"><span>当前余额</span><strong>${state.walletBalance} 千寻币</strong></div>
            <div class="paywall-equation"><span>本次扣减</span><strong>-${cost} 千寻币</strong></div>
            <p class="paywall-note">确认后当前记录永久清晰；重复点击不会重复扣币。</p>
          </div>
        `;
        actions.innerHTML = `
          <button class="primary-action" type="button" data-action="confirm-coin">确认扣减 ${cost} 千寻币</button>
          <button class="secondary-action" type="button" data-close-modal>取消</button>
        `;
      } else {
        content.innerHTML = `
          <div class="paywall-content">
            <div class="paywall-balance"><span>需要 / 当前</span><strong>${cost} / ${state.walletBalance} 千寻币</strong></div>
            <div class="package-list">
              ${DemoData.quickPackages.map((item) => `
                <button class="package-option ${item.id === state.selectedPackageId ? 'is-selected' : ''}" type="button"
                  data-action="select-package" data-package-id="${escapeHtml(item.id)}">
                  <strong>¥${escapeHtml(item.priceYuan)}</strong>
                  <span>${escapeHtml(item.coin)} 千寻币 · ${escapeHtml(item.label)}</span>
                </button>
              `).join('')}
            </div>
            <p class="paywall-note">快捷充值仅作静态演示，不会创建真实订单或拉起支付。</p>
          </div>
        `;
        actions.innerHTML = `
          <button class="primary-action" type="button" data-action="quick-recharge">快捷充值</button>
          <button class="secondary-action" type="button" data-action="more-packages">更多套餐</button>
          <button class="secondary-action" type="button" data-close-modal>取消</button>
        `;
      }
    }

    closeModal('singleUnlockModal', false);
    openModal('paywallModal', trigger || state.lastTrigger);
  }

  function confirmCoinUnlock(button) {
    const cost = DemoData.config.prices[state.pendingScene];
    if (state.walletBalance < cost) {
      openPaywall('coin', button);
      return;
    }
    if (!state.selectedRecordNo || state.unlockedRecordNos.has(state.selectedRecordNo)) {
      closeModal('paywallModal');
      showToast('当前记录已经解锁');
      return;
    }

    button.disabled = true;
    button.textContent = '正在解锁...';
    window.setTimeout(() => {
      if (state.payShouldFail) {
        button.disabled = false;
        button.textContent = `确认扣减 ${cost} 千寻币`;
        showToast('扣币失败，请重试', 'error');
        return;
      }
      state.walletBalance -= cost;
      state.unlockedRecordNos.add(state.selectedRecordNo);
      closeModal('paywallModal');
      renderCurrentPage();
      const message = state.pendingScene === 'viewers_unlock_one'
        ? '该访客已解锁，仍受最近 7 天展示窗口限制'
        : '解锁成功，已为你展示清晰资料';
      showToast(message);
    }, 520);
  }

  function performQuickRecharge(button) {
    const selected = DemoData.quickPackages.find((item) => item.id === state.selectedPackageId);
    if (!selected) return;
    button.disabled = true;
    button.textContent = '正在模拟充值...';
    window.setTimeout(() => {
      state.walletBalance += selected.coin;
      updateRuntimeSummary();
      showToast('模拟充值成功，余额已刷新');
      openPaywall('coin', button);
    }, 520);
  }

  function openProfileHandoff(kind, recordNo, trigger) {
    const record = findRecord(kind, recordNo);
    if (!record) return;
    state.lastTrigger = trigger || null;

    qs('[data-profile-avatar]').src = record.avatar;
    qs('[data-profile-name]').textContent = `${record.nickname} · ${record.age}`;
    const result = qs('[data-profile-result]');
    if (kind === 'mutual') {
      result.innerHTML = `
        <strong>进入相互喜欢用户主页</strong>
        <span>本模块只负责“查看主页”跳转。主页内后续动作及保护规则由对应外部模块承接。</span>
      `;
    } else {
      result.innerHTML = `
        <strong>进入婚恋用户主页</strong>
        <span>主页由 PRD-05 承接；进入主页生成或更新访客展示记录，一期不提供隐藏访问能力。</span>
      `;
    }
    openModal('profileHandoffModal', trigger);
  }

  function openModal(id, trigger) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (trigger) state.lastTrigger = trigger;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const focusTarget = qs('button:not([disabled])', modal);
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function closeModal(target, restoreFocus = true) {
    const modal = typeof target === 'string'
      ? document.getElementById(target)
      : target?.closest('.modal-backdrop');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    const anyOpen = qsa('.modal-backdrop').some((item) => !item.hidden);
    if (!anyOpen) document.body.classList.remove('modal-open');
    if (restoreFocus && state.lastTrigger instanceof HTMLElement) {
      state.lastTrigger.focus({ preventScroll: true });
    }
  }

  function showToast(message, type = 'success') {
    const toast = qs('[data-toast]');
    if (!toast) return;
    if (toastTimer) window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle('is-error', type === 'error');
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2300);
  }

  function updateRuntimeSummary() {
    const balance = qs('[data-wallet-balance]');
    const unlocked = qs('[data-unlocked-count]');
    const vip = qs('[data-vip-status]');
    if (balance) balance.textContent = String(state.walletBalance);
    if (unlocked) unlocked.textContent = `${state.unlockedRecordNos.size} 条`;
    if (vip) vip.textContent = state.vipActive ? '生效中' : '未开通';

    qsa('[data-balance-value]').forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.balanceValue) === state.walletBalance);
    });
    qsa('[data-pay-result]').forEach((button) => {
      const shouldFail = button.dataset.payResult === 'failure';
      button.classList.toggle('is-active', shouldFail === state.payShouldFail);
    });
  }

  function resetDemo() {
    state.page = 'likes';
    state.pageMode = { likes: 'normal', viewers: 'normal', mutual: 'normal' };
    state.walletBalance = DemoData.wallet.balance;
    state.visibleCount = { likes: 6, viewers: 6, mutual: 4 };
    state.unlockedRecordNos = new Set(initialUnlocked);
    state.vipActive = false;
    state.payShouldFail = false;
    state.selectedRecordNo = null;
    state.pendingScene = null;
    state.selectedPackageId = DemoData.quickPackages[0].id;
    qsa('.modal-backdrop').forEach((modal) => {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open');
    window.history.replaceState(null, '', '#likes');
    renderCurrentPage();
    showToast('演示数据已重置');
  }

  document.addEventListener('click', (event) => {
    const pageTarget = event.target.closest('[data-page-target]');
    if (pageTarget) {
      switchPage(pageTarget.dataset.pageTarget);
      return;
    }

    const closeButton = event.target.closest('[data-close-modal]');
    if (closeButton) {
      closeModal(closeButton);
      return;
    }

    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) {
      const backdrop = event.target.closest('.modal-backdrop');
      if (backdrop && event.target === backdrop) closeModal(backdrop);
      const otherTab = event.target.closest('.app-tabbar button:not([data-bottom-tab="heart"])');
      if (otherTab) showToast('当前静态 Demo 仅展示心动链路');
      return;
    }

    const action = actionTarget.dataset.action;
    if (action === 'refresh') refreshCurrentPage();
    if (action === 'retry') {
      state.pageMode[state.page] = 'loading';
      renderCurrentPage();
      window.setTimeout(() => {
        state.pageMode[state.page] = 'normal';
        renderCurrentPage();
        showToast('已恢复连接');
      }, 520);
    }
    if (action === 'load-more') {
      state.visibleCount[state.page] += state.page === 'mutual' ? 2 : 4;
      renderCurrentPage();
      showToast('已加载更多');
    }
    if (action === 'open-record') {
      const kind = actionTarget.dataset.recordKind;
      const recordNo = actionTarget.dataset.recordNo;
      const record = findRecord(kind, recordNo);
      if (!record) return;
      if (isClearRecord(kind, record)) openProfileHandoff(kind, recordNo, actionTarget);
      else openSingleUnlock(kind, recordNo, actionTarget);
    }
    if (action === 'unlock-one') openPaywall('coin', actionTarget);
    if (action === 'unlock-all') openPaywall('member', actionTarget);
    if (action === 'confirm-coin') confirmCoinUnlock(actionTarget);
    if (action === 'select-package') {
      state.selectedPackageId = actionTarget.dataset.packageId;
      openPaywall('coin', actionTarget);
    }
    if (action === 'quick-recharge') performQuickRecharge(actionTarget);
    if (action === 'more-packages') showToast('更多套餐由 PRD-04 千寻币充值页承接');
    if (action === 'open-member-center') showToast('会员开通由 PRD-04 会员中心承接');
    if (action === 'open-profile') openProfileHandoff(actionTarget.dataset.recordKind, actionTarget.dataset.recordNo, actionTarget);
    if (action === 'open-certification') showToast('三重认证由 PRD-01 认证引导承接');
    if (action === 'empty-primary') showToast('已交由对应资料或推荐页面承接');
    if (action === 'reset-demo') resetDemo();
  });

  qs('[data-demo-mode]')?.addEventListener('change', (event) => {
    setDemoMode(event.target.value);
  });

  qsa('[data-balance-value]').forEach((button) => {
    button.addEventListener('click', () => {
      state.walletBalance = Number(button.dataset.balanceValue);
      updateRuntimeSummary();
      showToast(`当前演示余额已切换为 ${state.walletBalance} 千寻币`);
    });
  });

  qsa('[data-pay-result]').forEach((button) => {
    button.addEventListener('click', () => {
      state.payShouldFail = button.dataset.payResult === 'failure';
      updateRuntimeSummary();
      showToast(state.payShouldFail ? '下一次扣币将模拟失败' : '下一次扣币将模拟成功');
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openModals = qsa('.modal-backdrop').filter((modal) => !modal.hidden);
    if (openModals.length > 0) closeModal(openModals.at(-1));
  });

  window.addEventListener('hashchange', () => {
    switchPage(getPageFromHash(), false);
  });

  const phoneScreen = qs('.phone-screen');
  if (phoneScreen) {
    qsa('.modal-backdrop').forEach((modal) => phoneScreen.append(modal));
    const toast = qs('[data-toast]');
    if (toast) phoneScreen.append(toast);
  }

  renderCurrentPage();
})();
