(function () {
  const data = window.DEMO_DATA || {};
  const common = window.DemoCommon || {};
  const qs = common.qs || ((selector, root = document) => root.querySelector(selector));
  const qsa = common.qsa || ((selector, root = document) => Array.from(root.querySelectorAll(selector)));
  const escapeHtml = common.escapeHtml || ((value) => String(value ?? ''));
  const statusClass = common.statusClass || (() => 'brand');
  const showToast = common.showToast || (() => {});
  const openModal = common.openModal || (() => {});
  const openDrawer = common.openDrawer || (() => {});

  const state = {
    packageType: 'normal',
    selectedVip: data.vipPackages?.[0],
    selectedCoin: data.coinPackages?.find((item) => item.recommended) || data.coinPackages?.[0],
    paymentState: 'success',
    coinFlowFilter: '全部',
    coinBalance: data.appAsset?.coinBalance || 0,
    currentRefundOrder: null,
  };

  function money(value) {
    return `¥${escapeHtml(value)}`;
  }

  function tag(text) {
    return `<span class="tag ${statusClass(text)}">${escapeHtml(text)}</span>`;
  }

  function amountClass(value) {
    return String(value).includes('-') ? 'amount-minus' : 'amount-plus';
  }

  function syncAssetText() {
    qsa('[data-vip-status]').forEach((node) => {
      node.textContent = data.appAsset?.vipStatusText || '未开通';
    });
    qsa('[data-coin-balance]').forEach((node) => {
      node.textContent = state.coinBalance;
    });
    qsa('[data-free-whisper]').forEach((node) => {
      node.textContent = `${data.appAsset?.freeWhisperRemain ?? 0} 次`;
    });
    qsa('[data-core-access-tip]').forEach((node) => {
      node.textContent = data.appAsset?.coreAccessTip || '';
    });
  }

  function renderVipBenefits() {
    const target = qs('[data-render="vip-benefits"]');
    if (!target) return;
    target.innerHTML = (data.vipBenefits || []).map((item) => `
      <div class="benefit-item">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.desc)}</span>
        ${tag(item.type)}
      </div>
    `).join('');
  }

  function currentVipPackages() {
    return state.packageType === 'subscription' ? (data.subscriptionPackages || []) : (data.vipPackages || []);
  }

  function renderVipPackages() {
    const target = qs('[data-render="vip-packages"]');
    if (!target) return;
    const packages = currentVipPackages();
    if (!packages.length) {
      target.innerHTML = '<div class="empty-state">暂无可购买套餐</div>';
      return;
    }
    if (!packages.includes(state.selectedVip)) state.selectedVip = packages[0];
    target.innerHTML = packages.map((item) => {
      const selected = state.selectedVip?.id === item.id ? ' is-selected' : '';
      const disabled = item.status !== 'on' || item.wxProductReady === false ? ' is-disabled' : '';
      return `
        <button class="package-card${selected}${disabled}" data-select-vip="${escapeHtml(item.id)}" type="button">
          <span class="package-tag">${escapeHtml(item.tag)}</span>
          <span>${escapeHtml(item.name)}</span>
          <strong>${money(item.price)}</strong>
          <span>${escapeHtml(item.duration)}</span>
          <span class="helper">${escapeHtml(item.unit)}</span>
        </button>
      `;
    }).join('');
    const payButton = qs('[data-pay-vip]');
    if (payButton && state.selectedVip) {
      payButton.textContent = `${state.selectedVip.type === 'subscription' ? '开通连续订阅' : '立即续费'} ${state.selectedVip.price} 元`;
    }
  }

  function renderCoinPackages() {
    const targets = qsa('[data-render="coin-packages"]');
    targets.forEach((target) => {
      target.innerHTML = (data.coinPackages || []).map((item) => {
        const selected = state.selectedCoin?.id === item.id ? ' is-selected' : '';
        return `
          <button class="package-card${selected}" data-select-coin="${escapeHtml(item.id)}" type="button">
            <span class="package-tag">${escapeHtml(item.tag)}</span>
            <span>${escapeHtml(item.name)}</span>
            <strong>${money(item.payAmount)}</strong>
            <span>到账 ${escapeHtml(item.coinCount + item.bonusCoin)} 千寻币</span>
            <span class="helper">含赠送 ${escapeHtml(item.bonusCoin)} 千寻币</span>
          </button>
        `;
      }).join('');
    });
    const payButton = qs('[data-pay-coin]');
    if (payButton && state.selectedCoin) payButton.textContent = `立即充值 ${state.selectedCoin.payAmount} 元`;
  }

  function renderSubscriptionGuide() {
    const target = qs('[data-render="subscription-guide"]');
    if (!target) return;
    target.innerHTML = (data.subscription?.cancelGuide || []).map((step, index) => `
      <div class="guide-step">
        <strong>步骤 ${index + 1}</strong>
        <span>${escapeHtml(step)}</span>
      </div>
    `).join('');
  }

  function renderCoinFlows(filter = state.coinFlowFilter) {
    const target = qs('[data-render="coin-flows"]');
    if (!target) return;
    const rows = filter === '全部' ? data.coinFlows || [] : (data.coinFlows || []).filter((row) => row.type === filter);
    if (!rows.length) {
      target.innerHTML = '<div class="empty-state">暂无千寻币流水<br><button class="btn primary" data-jump="#APP-04-PAGE-coin-recharge">去充值</button></div>';
      return;
    }
    target.innerHTML = rows.map((row) => `
      <div class="flow-item">
        <div>
          <strong>${escapeHtml(row.type)} · ${escapeHtml(row.scene)}</strong>
          <span>${escapeHtml(row.desc)}</span>
          <span class="helper">${escapeHtml(row.time)}</span>
        </div>
        <strong class="${amountClass(row.amount)}">${row.amount > 0 ? '+' : ''}${escapeHtml(row.amount)}</strong>
      </div>
    `).join('');
  }

  function renderVipOrders() {
    const target = qs('[data-render="vip-orders"]');
    if (!target) return;
    target.innerHTML = (data.vipOrders || []).map((row) => `
      <article class="order-card">
        <div>
          <strong>${escapeHtml(row.packageName)} · ${escapeHtml(row.orderNo)}</strong>
          <span>${escapeHtml(row.packageType)} / ${money(row.amount)}</span>
          <span class="helper">支付时间：${escapeHtml(row.payTime)} / 到期：${escapeHtml(row.expireTime)}</span>
          ${row.refundNote ? `<div class="notice"><strong>退款说明</strong>${escapeHtml(row.refundNote)}</div>` : ''}
        </div>
        ${tag(row.status)}
      </article>
    `).join('');
  }

  function renderPaymentResult() {
    const target = qs('[data-render="payment-result"]');
    if (!target) return;
    const item = data.paymentResults?.[state.paymentState] || data.paymentResults?.success;
    target.innerHTML = `
      <span class="tag ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.desc)}</p>
      <ul class="kv-list">
        <li><span>订单号</span><strong>${escapeHtml(item.orderNo)}</strong></li>
        <li><span>订单类型</span><strong>${escapeHtml(item.orderType)}</strong></li>
      </ul>
    `;
  }

  function paywallContent(scenario) {
    if (scenario.id === 'vip-all') {
      return `
        <h2>${escapeHtml(scenario.title)}</h2>
        <p>${escapeHtml(scenario.desc)}</p>
        <div class="notice"><strong>承接资产</strong>解锁全部走时空邂逅会员，不做“千寻币解锁全部”。</div>
        <div class="modal-actions">
          <button class="btn" onclick="DemoCommon.closeModal(this)">取消</button>
          <button class="btn primary" data-jump="#APP-04-PAGE-vip-center" data-close-current-modal>开通会员</button>
        </div>
      `;
    }
    if (scenario.id === 'core-blocked') {
      return `
        <h2>${escapeHtml(scenario.title)}</h2>
        <p>${escapeHtml(scenario.desc)}</p>
        <div class="notice"><strong>核心准入受限</strong>${escapeHtml(data.appAsset?.coreAccessTip)}</div>
        <div class="modal-actions">
          <button class="btn" onclick="DemoCommon.closeModal(this)">稍后再说</button>
          <button class="btn primary" onclick="DemoCommon.closeModal(this);showToast('请先完成三重认证','warning')">去认证</button>
        </div>
      `;
    }
    if (scenario.balance < scenario.cost) {
      const quick = (data.coinPackages || []).filter((item) => item.coinCount + item.bonusCoin >= scenario.cost - scenario.balance).slice(0, 2);
      return `
        <h2>千寻币余额不足</h2>
        <p>${escapeHtml(scenario.title)} 需要 ${escapeHtml(scenario.cost)} 千寻币，当前余额 ${escapeHtml(scenario.balance)}。</p>
        <div class="package-grid">
          ${quick.map((item) => `
            <button class="package-card" data-quick-recharge="${escapeHtml(item.id)}" type="button">
              <span class="package-tag">${escapeHtml(item.tag)}</span>
              <span>${escapeHtml(item.name)}</span>
              <strong>${money(item.payAmount)}</strong>
              <span>到账 ${escapeHtml(item.coinCount + item.bonusCoin)} 千寻币</span>
            </button>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn" onclick="DemoCommon.closeModal(this)">取消</button>
          <button class="btn primary" data-jump="#APP-04-PAGE-coin-recharge" data-close-current-modal>更多套餐</button>
        </div>
      `;
    }
    return `
      <h2>${escapeHtml(scenario.title)}</h2>
      <p>${escapeHtml(scenario.desc)}</p>
      <ul class="kv-list">
        <li><span>所需千寻币</span><strong>${escapeHtml(scenario.cost)}</strong></li>
        <li><span>当前余额</span><strong>${escapeHtml(scenario.balance)}</strong></li>
        <li><span>保留期</span><strong>单条永久可见</strong></li>
      </ul>
      <div class="modal-actions">
        <button class="btn" onclick="DemoCommon.closeModal(this)">取消</button>
        <button class="btn primary" data-confirm-unlock="${escapeHtml(scenario.cost)}">确认扣币</button>
      </div>
    `;
  }

  function openPaywall(id) {
    const scenario = (data.paywallScenarios || []).find((item) => item.id === id) || data.paywallScenarios?.[0];
    const target = qs('[data-render="paywall-modal"]');
    if (!target || !scenario) return;
    target.innerHTML = paywallContent(scenario);
    openModal('paywallModal');
  }

  function renderAdminBenefits() {
    const target = qs('[data-render="admin-benefits"]');
    if (!target) return;
    target.innerHTML = (data.vipBenefits || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.desc)}</td>
        <td><span class="mini-switch">启用</span></td>
        <td>${item.code === 'message' ? `<input type="number" value="${escapeHtml(item.dailyCount || 1)}" style="width:88px"> 次/日` : '<span class="helper">不适用</span>'}</td>
      </tr>
    `).join('');
  }

  function renderAdminPackages() {
    const vipTarget = qs('[data-render="admin-vip-packages"]');
    if (vipTarget) {
      const rows = [...(data.vipPackages || []), ...(data.subscriptionPackages || [])];
      vipTarget.innerHTML = rows.map((item) => `
        <tr>
          <td>${escapeHtml(item.id)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.type === 'subscription' ? '连续订阅套餐' : '普通套餐')}</td>
          <td>${money(item.originalPrice || item.price)}</td>
          <td>${money(item.price)}</td>
          <td>${escapeHtml(item.duration)}</td>
          <td>${tag(item.tag)}</td>
          <td>${tag(item.status === 'on' ? '上架' : '下架')}</td>
          <td><button class="btn" data-open-modal="vipPackageEditModal">编辑</button> <button class="btn danger" data-toast="套餐已下架，历史订单保留" data-toast-type="warning">下架</button></td>
        </tr>
      `).join('');
    }
    const coinTarget = qs('[data-render="admin-coin-packages"]');
    if (coinTarget) {
      coinTarget.innerHTML = (data.coinPackages || []).map((item) => `
        <tr>
          <td>${escapeHtml(item.id)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${money(item.originalPrice || item.payAmount)}</td>
          <td>${money(item.payAmount)}</td>
          <td>${escapeHtml(item.coinCount)}</td>
          <td>${escapeHtml(item.bonusCoin)}</td>
          <td>${tag(item.tag)}</td>
          <td>${item.recommended ? tag('推荐档') : '-'}</td>
          <td>${tag(item.status === 'on' ? '上架' : '下架')}</td>
          <td><button class="btn" data-open-modal="coinPackageEditModal">编辑</button></td>
        </tr>
      `).join('');
    }
  }

  function renderScenePrices() {
    const target = qs('[data-render="admin-scene-prices"]');
    if (!target) return;
    target.innerHTML = (data.config?.scenePrices || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.scene)}</td>
        <td>${escapeHtml(item.code)}</td>
        <td><input type="number" value="${escapeHtml(item.price)}" style="width:88px"> 千寻币</td>
        <td><span class="mini-switch">${item.enabled ? '启用' : '停用'}</span></td>
        <td>APP 付费弹窗 / 来源业务页</td>
      </tr>
    `).join('');
  }

  function renderUserAssetSummary() {
    const target = qs('[data-render="user-asset-summary"]');
    const item = data.userAssetDetail;
    if (!target || !item) return;
    const cards = [
      ['会员状态', item.vipStatus],
      ['千寻币余额', item.coinBalance],
      ['累计充值', money(item.totalRecharge)],
      ['累计消费千寻币', item.totalConsumeCoin],
      ['最近购买', item.lastPurchaseTime],
      ['最近解锁', item.lastUnlockTime],
    ];
    target.innerHTML = cards.map(([label, value]) => `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
  }

  function renderUserTables() {
    const ordersTarget = qs('[data-render="user-orders"]');
    if (ordersTarget) {
      ordersTarget.innerHTML = (data.orders || []).slice(0, 3).map((row) => `
        <tr><td>${escapeHtml(row.orderNo)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.packageName)}</td><td>${money(row.amount)}</td><td>${tag(row.status)}</td><td>${escapeHtml(row.payTime)}</td><td><button class="btn" data-open-order="${escapeHtml(row.orderNo)}">详情</button></td></tr>
      `).join('');
    }
    const flowsTarget = qs('[data-render="user-flows"]');
    if (flowsTarget) {
      flowsTarget.innerHTML = (data.assetFlows || []).map((row) => `
        <tr><td>${escapeHtml(row.flowNo)}</td><td>${escapeHtml(row.flowType)}</td><td class="${amountClass(row.amount)}">${escapeHtml(row.amount)}</td><td>${escapeHtml(row.scene)}</td><td>${escapeHtml(row.time)}</td><td><button class="btn" data-open-flow="${escapeHtml(row.flowNo)}">详情</button></td></tr>
      `).join('');
    }
    const unlockTarget = qs('[data-render="unlock-records"]');
    if (unlockTarget) {
      unlockTarget.innerHTML = (data.unlockRecords || []).map((row) => `
        <tr><td>${escapeHtml(row.no)}</td><td>${escapeHtml(row.scene)}</td><td>${escapeHtml(row.target)}</td><td>${escapeHtml(row.method)}</td><td>${escapeHtml(row.coin)}</td><td>${tag(row.status)}</td><td>${escapeHtml(row.expire)}</td></tr>
      `).join('');
    }
    const refundsTarget = qs('[data-render="user-refunds"]');
    if (refundsTarget) {
      refundsTarget.innerHTML = (data.refunds || []).slice(0, 2).map((row) => `
        <tr><td>${escapeHtml(row.refundNo)}</td><td>${escapeHtml(row.orderNo)}</td><td>${money(row.amount)}</td><td>${tag(row.status)}</td><td>${escapeHtml(row.reversal)}</td><td><button class="btn" data-open-refund="${escapeHtml(row.refundNo)}">详情</button></td></tr>
      `).join('');
    }
  }

  function renderOrderStats() {
    const target = qs('[data-render="order-stats"]');
    if (!target) return;
    const rows = [
      ['订单总数', '128'],
      ['支付成功金额', '18,420.00'],
      ['已退款', String((data.refunds || []).length)],
      ['今日订单', '42'],
    ];
    target.innerHTML = rows.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join('');
  }

  function renderOrders() {
    const target = qs('[data-render="orders"]');
    if (!target) return;
    target.innerHTML = (data.orders || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.orderNo)}</td><td>${escapeHtml(row.user)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.packageName)}</td>
        <td>${money(row.amount)}</td><td>${tag(row.status)}</td><td>${escapeHtml(row.createTime)}</td><td>${escapeHtml(row.payTime)}</td>
        <td><button class="btn" data-open-order="${escapeHtml(row.orderNo)}">详情</button></td>
      </tr>
    `).join('');
  }

  function renderAssetFlows() {
    const target = qs('[data-render="asset-flows"]');
    if (!target) return;
    target.innerHTML = (data.assetFlows || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.flowNo)}</td><td>${escapeHtml(row.user)}</td><td>${escapeHtml(row.assetType)}</td><td>${escapeHtml(row.flowType)}</td>
        <td class="${amountClass(row.amount)}">${escapeHtml(row.amount)}</td><td>${escapeHtml(row.scene)}</td><td>${escapeHtml(row.orderNo)}</td><td>${escapeHtml(row.time)}</td>
        <td><button class="btn" data-open-flow="${escapeHtml(row.flowNo)}">详情</button></td>
      </tr>
    `).join('');
  }

  function renderRefunds() {
    const target = qs('[data-render="refunds"]');
    if (!target) return;
    target.innerHTML = (data.refunds || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.refundNo)}</td><td>${escapeHtml(row.orderNo)}</td><td>${escapeHtml(row.user)}</td><td>${money(row.amount)}</td><td>${tag(row.status)}</td>
        <td>${escapeHtml(row.initiator || '-')}</td><td>${escapeHtml(row.reason)}</td><td>${escapeHtml(row.reversal)}</td><td>${escapeHtml(row.createdTime)}</td><td>${escapeHtml(row.finishedTime)}</td>
        <td><button class="btn" data-open-refund="${escapeHtml(row.refundNo)}">详情</button></td>
      </tr>
    `).join('');
  }

  function renderReconcile() {
    const summaryTarget = qs('[data-render="reconcile-summary"]');
    if (summaryTarget && data.reconcileSummary) {
      const item = data.reconcileSummary;
      const rows = [
        ['会员支付金额', item.vipAmount],
        ['千寻币支付金额', item.coinAmount],
        ['退款金额', item.refundAmount],
        ['净收入', item.netAmount],
        ['更新时间', item.updatedAt],
      ];
      summaryTarget.innerHTML = rows.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
    }
    const rowTarget = qs('[data-render="reconcile-rows"]');
    if (rowTarget) {
      rowTarget.innerHTML = (data.reconcileRows || []).map((row) => `
        <tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.vipCount)}</td><td>${money(row.vipAmount)}</td><td>${escapeHtml(row.coinCount)}</td><td>${money(row.coinAmount)}</td><td>${escapeHtml(row.refundCount)}</td><td>${money(row.refundAmount)}</td><td>${money(row.netAmount)}</td></tr>
      `).join('');
    }
  }

  function renderConfigLogs() {
    const target = qs('[data-render="config-logs"]');
    if (!target) return;
    target.innerHTML = (data.config?.logs || []).map((row) => `
      <div class="drawer-section">
        <h3>${escapeHtml(row.id)}</h3>
        <div class="drawer-kv"><span>操作人</span><strong>${escapeHtml(row.operator)}</strong></div>
        <div class="drawer-kv"><span>配置项</span><strong>${escapeHtml(row.item)}</strong></div>
        <div class="drawer-kv"><span>变更前</span><strong>${escapeHtml(row.before)}</strong></div>
        <div class="drawer-kv"><span>变更后</span><strong>${escapeHtml(row.after)}</strong></div>
        <div class="drawer-kv"><span>时间</span><strong>${escapeHtml(row.time)}</strong></div>
      </div>
    `).join('');
  }

  function renderDetail(targetSelector, item, fields) {
    const target = qs(targetSelector);
    if (!target || !item) return;
    target.innerHTML = fields.map(([label, key]) => `
      <div class="drawer-section">
        <div class="drawer-kv"><span>${escapeHtml(label)}</span><strong>${escapeHtml(item[key])}</strong></div>
      </div>
    `).join('');
  }

  function openOrderDetail(orderNo) {
    const item = (data.orders || []).find((row) => row.orderNo === orderNo) || data.orders?.[0];
    state.currentRefundOrder = item;
    renderDetail('[data-render="order-detail"]', item, [
      ['订单号', 'orderNo'], ['用户', 'user'], ['订单类型', 'type'], ['套餐名称', 'packageName'], ['支付金额', 'amount'], ['订单状态', 'status'], ['渠道流水', 'channelNo'], ['来源场景', 'source'],
    ]);
    const detailTarget = qs('[data-render="order-detail"]');
    if (detailTarget) {
      detailTarget.insertAdjacentHTML('beforeend', '<div class="notice"><strong>退款入口</strong>支付成功且未退款订单可在详情抽屉内发起退款；提交后默认生成已退款记录。</div>');
    }
    const refundButton = qs('[data-refund-from-drawer]');
    if (refundButton && item) {
      const canRefund = item.status === '支付成功';
      refundButton.disabled = !canRefund;
      refundButton.textContent = canRefund ? '发起退款' : '已退款/不可退款';
    }
    openDrawer('orderDrawer');
  }

  function fillRefundModal(order) {
    if (!order) return;
    const orderInput = qs('[data-refund-order-no]');
    const amountInput = qs('[data-refund-amount]');
    const reasonInput = qs('[data-refund-reason]');
    if (orderInput) orderInput.value = order.orderNo;
    if (amountInput) amountInput.value = order.amount;
    if (reasonInput) reasonInput.value = `${order.packageName} 重复购买，客服核实后特批退款。`;
    openModal('refundApplyModal');
  }

  function submitRefund() {
    const order = state.currentRefundOrder;
    if (!order) {
      showToast('请先打开订单详情', 'warning');
      return;
    }
    const amount = qs('[data-refund-amount]')?.value?.trim();
    const reason = qs('[data-refund-reason]')?.value?.trim();
    const reversal = qs('[data-refund-reversal]')?.value || '回收会员权益';
    if (!amount || !reason) {
      showToast('请填写退款金额和退款原因', 'warning');
      return;
    }
    if (Number(amount) > Number(order.amount)) {
      showToast('退款金额不能大于订单实付金额', 'warning');
      return;
    }
    const nextNo = `RFD-20260630-${String((data.refunds || []).length + 1).padStart(3, '0')}`;
    const refund = {
      refundNo: nextNo,
      orderNo: order.orderNo,
      user: order.user,
      amount,
      status: '已退款',
      initiator: '财务-李青',
      reason,
      reversal,
      remark: '订单详情内发起，申请即默认已退款',
      createdTime: '2026-06-30 11:58:00',
      finishedTime: '2026-06-30 11:58:00',
    };
    data.refunds = data.refunds || [];
    data.refunds.unshift(refund);
    order.status = '已退款';
    renderOrders();
    renderRefunds();
    renderOrderStats();
    const modal = qs('#refundApplyModal');
    if (modal) modal.classList.remove('is-open');
    const drawer = qs('#orderDrawer');
    if (drawer) drawer.classList.remove('is-open');
    showToast(`退款已完成，生成退款单 ${nextNo}`);
    window.location.hash = 'ADM-04-PAGE-refund-list';
  }

  function openFlowDetail(flowNo) {
    const item = (data.assetFlows || []).find((row) => row.flowNo === flowNo) || data.assetFlows?.[0];
    renderDetail('[data-render="flow-detail"]', item, [
      ['流水号', 'flowNo'], ['用户', 'user'], ['资产类型', 'assetType'], ['流水类型', 'flowType'], ['变动数量', 'amount'], ['业务场景', 'scene'], ['变动前余额', 'before'], ['变动后余额', 'after'], ['幂等键', 'idempotencyKey'], ['备注', 'remark'],
    ]);
    openDrawer('flowDrawer');
  }

  function openRefundDetail(refundNo) {
    const item = (data.refunds || []).find((row) => row.refundNo === refundNo) || data.refunds?.[0];
    renderDetail('[data-render="refund-detail"]', item, [
      ['退款单号', 'refundNo'], ['关联订单', 'orderNo'], ['用户', 'user'], ['退款金额', 'amount'], ['退款状态', 'status'], ['发起人', 'initiator'], ['退款原因', 'reason'], ['资产回退', 'reversal'], ['处理备注', 'remark'], ['发起时间', 'createdTime'], ['完成时间', 'finishedTime'],
    ]);
    const target = qs('[data-render="refund-detail"]');
    if (target) target.insertAdjacentHTML('beforeend', '<div class="notice"><strong>只读边界</strong>退款记录由订单详情发起后生成，本期申请即默认已退款；退款记录页不提供状态筛选和人工改状态按钮。</div>');
    openDrawer('refundDrawer');
  }

  function setActiveButton(button, groupSelector, activeClass = 'is-active') {
    qsa(groupSelector).forEach((item) => item.classList.remove(activeClass));
    button.classList.add(activeClass);
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('button, a');
      if (!target) return;

      if (target.matches('[data-toast]')) {
        showToast(target.dataset.toast, target.dataset.toastType || 'success');
      }
      if (target.matches('[data-open-modal]')) {
        const exportType = target.dataset.exportType;
        if (exportType) {
          const title = qs('[data-export-title]');
          if (title) title.textContent = exportType;
        }
        openModal(target.dataset.openModal);
      }
      if (target.matches('[data-open-drawer]')) openDrawer(target.dataset.openDrawer);
      if (target.matches('[data-refund-from-drawer]')) {
        if (!state.currentRefundOrder || target.disabled) {
          showToast('当前订单不可发起退款', 'warning');
        } else {
          fillRefundModal(state.currentRefundOrder);
        }
      }
      if (target.matches('[data-submit-refund]')) submitRefund();
      if (target.matches('[data-jump]')) {
        const href = target.dataset.jump;
        if (target.dataset.closeCurrentModal !== undefined) {
          const modal = target.closest('.modal-backdrop');
          if (modal) modal.classList.remove('is-open');
        }
        window.location.hash = href.replace('#', '');
      }

      if (target.matches('[data-package-type]')) {
        state.packageType = target.dataset.packageType;
        setActiveButton(target, '[data-package-type]');
        renderVipPackages();
        if (state.packageType === 'subscription') showToast('连续订阅套餐接入微信真实自动续费');
      }
      if (target.matches('[data-select-vip]')) {
        const item = currentVipPackages().find((row) => row.id === target.dataset.selectVip);
        if (!item) return;
        if (item.status !== 'on' || item.wxProductReady === false) {
          showToast('连续订阅商品或协议未配置，暂不可上架', 'warning');
          return;
        }
        state.selectedVip = item;
        renderVipPackages();
      }
      if (target.matches('[data-select-coin]')) {
        const item = (data.coinPackages || []).find((row) => row.id === target.dataset.selectCoin);
        if (!item) return;
        state.selectedCoin = item;
        renderCoinPackages();
      }
      if (target.matches('[data-pay-vip]')) {
        if (!qs('[data-vip-agreement]')?.checked) {
          showToast('请先勾选会员协议', 'warning');
          return;
        }
        state.paymentState = 'success';
        renderPaymentResult();
        showToast('会员已开通，有效期至 2026-12-31');
        window.location.hash = 'APP-04-PAGE-payment-result';
      }
      if (target.matches('[data-pay-coin]')) {
        const add = (state.selectedCoin?.coinCount || 0) + (state.selectedCoin?.bonusCoin || 0);
        state.coinBalance += add;
        syncAssetText();
        state.paymentState = 'success';
        renderPaymentResult();
        showToast(`千寻币已到账：${add}`);
        window.location.hash = 'APP-04-PAGE-payment-result';
      }
      if (target.matches('[data-flow-filter]')) {
        state.coinFlowFilter = target.dataset.flowFilter;
        setActiveButton(target, '[data-flow-filter]');
        renderCoinFlows();
      }
      if (target.matches('[data-render-empty-flow]')) {
        state.coinFlowFilter = '不存在';
        renderCoinFlows(state.coinFlowFilter);
      }
      if (target.matches('[data-payment-state]')) {
        state.paymentState = target.dataset.paymentState;
        setActiveButton(target, '[data-payment-state]');
        renderPaymentResult();
      }
      if (target.matches('[data-open-paywall]')) openPaywall(target.dataset.openPaywall);
      if (target.matches('[data-confirm-unlock]')) {
        const cost = Number(target.dataset.confirmUnlock || 0);
        state.coinBalance = Math.max(0, state.coinBalance - cost);
        syncAssetText();
        const modal = target.closest('.modal-backdrop');
        if (modal) modal.classList.remove('is-open');
        showToast(`已扣除 ${cost} 千寻币，记录已解锁`);
      }
      if (target.matches('[data-quick-recharge]')) {
        const item = (data.coinPackages || []).find((row) => row.id === target.dataset.quickRecharge);
        if (item) {
          state.coinBalance += item.coinCount + item.bonusCoin;
          syncAssetText();
          showToast(`快捷充值成功，到账 ${item.coinCount + item.bonusCoin} 千寻币`);
        }
        const modal = target.closest('.modal-backdrop');
        if (modal) modal.classList.remove('is-open');
      }

      if (target.matches('[data-config-tab]')) {
        setActiveButton(target, '[data-config-tab]');
        qsa('[data-config-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.configPanel === target.dataset.configTab));
      }
      if (target.matches('[data-detail-tab]')) {
        setActiveButton(target, '[data-detail-tab]');
        qsa('[data-detail-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.detailPanel === target.dataset.detailTab));
      }
      if (target.matches('[data-save-config]')) {
        const modal = target.closest('.modal-backdrop');
        if (modal) modal.classList.remove('is-open');
        const now = { id: 'CFG-20260630-004', operator: '运营-沈青', item: '社交与订单参数', before: '会员配额 20', after: '会员配额 20；退款展示开', time: '2026-06-30 11:42' };
        data.config.logs.unshift(now);
        renderConfigLogs();
        showToast('保存成功，审计单号 CFG-20260630-004');
      }
      if (target.matches('[data-open-order]')) openOrderDetail(target.dataset.openOrder);
      if (target.matches('[data-open-flow]')) openFlowDetail(target.dataset.openFlow);
      if (target.matches('[data-open-refund]')) openRefundDetail(target.dataset.openRefund);
      if (target.matches('[data-refresh-reconcile]')) {
        const summary = data.reconcileSummary;
        if (summary) summary.updatedAt = '2026-06-30 11:45:00';
        renderReconcile();
        showToast('轻量对账已按当前日期范围刷新');
      }
    });

    common.wireBackdropClose?.();
  }

  function renderAll() {
    syncAssetText();
    renderVipBenefits();
    renderVipPackages();
    renderCoinPackages();
    renderSubscriptionGuide();
    renderCoinFlows();
    renderVipOrders();
    renderPaymentResult();
    renderAdminBenefits();
    renderAdminPackages();
    renderScenePrices();
    renderUserAssetSummary();
    renderUserTables();
    renderOrderStats();
    renderOrders();
    renderAssetFlows();
    renderRefunds();
    renderReconcile();
    renderConfigLogs();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    bindEvents();
  });
})();
