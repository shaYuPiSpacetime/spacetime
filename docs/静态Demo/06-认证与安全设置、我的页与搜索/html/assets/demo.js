(function () {
  const data = window.PRD06_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let activeContentTab = "policies";

  function badge(text) {
    const tone = text.includes("启用") || text.includes("已") || text.includes("通过") ? "success" : text.includes("待") || text.includes("中") ? "warning" : "muted";
    return `<span class="tag ${tone}">${text}</span>`;
  }

  function icon(name, className = "") {
    const icons = {
      shield: '<path d="M12 3.5 18 6v5.1c0 3.7-2.4 6.8-6 8.1-3.6-1.3-6-4.4-6-8.1V6l6-2.5Z" fill="currentColor" opacity=".95"/><path d="m9.4 11.7 1.7 1.7 3.7-4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      chevron: '<path d="m9 5 6 7-6 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      diamond: '<path d="M6.5 5.5h11L22 10l-10 9.5L2 10l4.5-4.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M2 10h20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      bolt: '<path d="M13.5 2 5 13h5l-1.5 9L19 9h-5.2l-.3-7Z" fill="currentColor"/>',
      coin: '<path d="M5.5 16.5 16.5 5.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M7 8.5c1.2-1.2 3.2-1.2 4.4 0l4.1 4.1c1.2 1.2 1.2 3.2 0 4.4-1.2 1.2-3.2 1.2-4.4 0L7 12.9c-1.2-1.2-1.2-3.2 0-4.4Z" fill="currentColor" opacity=".18"/><path d="M6 18h11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
      invite: '<path d="M6.2 6.4 12 3.8l5.8 2.6 2.2 5.7-3.8 5.2H7.8L4 12.1l2.2-5.7Z" fill="currentColor" opacity=".85"/><path d="M12 9.2c1.5-1.8 4.4-.6 4.4 1.8 0 2.5-3.6 4.2-4.4 5-.8-.8-4.4-2.5-4.4-5 0-2.4 2.9-3.6 4.4-1.8Z" fill="#fff"/>',
      heart: '<path d="M12 19.5c-.4-.3-7-4.3-7-9.1 0-2.5 1.8-4.4 4.2-4.4 1.4 0 2.4.7 2.8 1.5.4-.8 1.4-1.5 2.8-1.5 2.4 0 4.2 1.9 4.2 4.4 0 4.8-6.6 8.8-7 9.1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
      service: '<path d="M5.5 12a6.5 6.5 0 1 1 3.2 5.6L5 18.5l.9-3.4A6.4 6.4 0 0 1 5.5 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12.2c.9 1.6 2.9 1.6 3.8.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 9.4h.1M15 9.4h.1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
      settings: '<path d="M12 4.2 18.6 8v8L12 19.8 5.4 16V8L12 4.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      home: '<path d="M4 11.3 12 4l8 7.3V20h-5v-5.5H9V20H4v-8.7Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
      pulse: '<path d="M5 12h3l1.6-3.2 3 7.2L15 12h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 20c-.3-.2-7-4.4-7-9.2 0-2.3 1.8-4 4-4 1.4 0 2.4.7 3 1.7.6-1 1.6-1.7 3-1.7 2.2 0 4 1.7 4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
      star: '<path d="m12 3.8 2.1 4.2 4.7.7-3.4 3.3.8 4.7L12 14.5l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L12 3.8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10.1 10.8c.8 1.1 3 1.1 3.8 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      message: '<path d="M5 6.5h14v10H9.3L5 20v-3.5h0v-10Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 11.5h.1M12 11.5h.1M15 11.5h.1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
      mine: '<circle cx="10" cy="9" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.7 19c.8-3.2 2.7-5 5.3-5 2.7 0 4.5 1.8 5.3 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 16.2c1-1.2 3-.4 3 1.1 0 1.7-2.4 2.8-3 3.3-.6-.5-3-1.6-3-3.3 0-1.5 2-2.3 3-1.1Z" fill="currentColor"/>'
    };
    return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || ""}</svg>`;
  }

  function renderMini() {
    const my = $('[data-screen="my"]');
    if (my) {
      const profile = data.user.profile;
      my.innerHTML = `
        <div class="mini-my-page">
          <div class="ios-status" aria-label="小程序状态栏">
            <span>12:00</span>
            <span class="status-cluster"><i class="signal"></i><i class="wifi"></i><i class="battery"></i></span>
          </div>
          <div class="mini-capsule" aria-label="小程序菜单"><span class="capsule-dots">•••</span><span class="capsule-line"></span><span class="capsule-circle"></span></div>
          <header class="mine-hero">
            <div class="mine-avatar" role="img" aria-label="头像"></div>
            <div class="mine-info">
              <div class="mine-name-row"><h2>${profile.name}</h2><span class="verify-badge">${icon("shield")} ${profile.verification}</span></div>
              <p>${profile.city}｜${profile.age}｜${profile.zodiac}</p>
            </div>
            <button class="edit-profile" data-toast="进入编辑资料">编辑资料 ${icon("chevron", "mini-chevron")}</button>
          </header>
          <section class="mine-stats-card">
            ${profile.stats.map(([n, l]) => `<div class="mine-stat"><strong>${n}</strong><span>${l}</span></div>`).join("")}
            <button class="boost-pill" data-toast="已打开提升人气">${icon("bolt")}<span>${profile.boost}</span></button>
          </section>
          <section class="vip-banner">
            <span class="vip-icon">${icon("diamond")}</span>
            <strong>${profile.vipText}</strong>
            <button data-toast="进入会员开通">${profile.vipCta}</button>
          </section>
          <section class="wallet-cards">
            ${profile.cards.map(([title, desc, type]) => `
              <button class="wallet-card ${type}" data-toast="${desc}">
                <span><strong>${title}</strong><em>${desc}</em></span>
                <i>${icon(type)}</i>
              </button>`).join("")}
          </section>
          <section class="mine-menu">
            ${profile.menu.map(([label, iconName, toast]) => `
              <button class="mine-row" data-toast="${toast}">
                <span class="row-left">${icon(iconName)}<span>${label}</span></span>
                ${icon("chevron", "row-chevron")}
              </button>`).join("")}
          </section>
          <nav class="mine-tabbar" aria-label="底部导航">
            ${profile.tabs.map(([label, iconName]) => `<button class="${label === "推荐" ? "is-featured" : ""} ${label === "我的" ? "is-current" : ""}" data-toast="切换到${label}">${icon(iconName)}<span>${label}</span></button>`).join("")}
          </nav>
        </div>`;
    }

    const settings = $('[data-screen="settings"]');
    if (settings) {
      settings.innerHTML = data.user.settings.map(([k, v]) => `<button class="list-row" data-setting="${k}"><span>${k}</span><strong>${v}</strong></button>`).join("") +
        `<button class="logout">退出登录</button>`;
    }

    const searchHome = $('[data-screen="search"]');
    if (searchHome) {
      searchHome.innerHTML = `
        <label class="search-box" for="mini-search-input"><input id="mini-search-input" name="keyword" data-search-input value="旅行" aria-label="搜索关键词"><button data-run-search>搜索</button></label>
        <h3>搜索历史</h3><div class="chip-row">${data.search.history.map((w) => `<span>${w}</span>`).join("")}</div>
        <div class="tabs"><button class="active" data-result-tab="users">用户</button><button data-result-tab="posts">动态</button><button data-result-tab="topics">话题</button></div>
        <div data-search-results></div>`;
      renderSearch("users");
    }
  }

  function renderSearch(tab) {
    const box = $('[data-search-results]');
    if (!box) return;
    const rows = data.search[tab].map((item) => `
      <article class="result-row">
        <span class="avatar small">${item[0].slice(0, 1)}</span>
        <div><strong>${item[0]}</strong><p>${item[1]}</p></div>
        ${item[2] ? `<button>${item[2]}</button>` : ""}
      </article>`).join("");
    box.innerHTML = rows;
    $$('[data-result-tab]').forEach((btn) => btn.classList.toggle("active", btn.dataset.resultTab === tab));
  }

  function tableRows(rows, actions = "查看") {
    const statusWords = ["启用", "停用", "待处理", "处理中", "已回复", "后悔期", "已撤销", "公开"];
    return rows.map((row) => `<tr>${row.map((cell) => `<td>${statusWords.includes(cell) ? badge(cell) : cell}</td>`).join("")}<td><button class="link-btn">${actions}</button></td></tr>`).join("");
  }

  function plainRows(rows) {
    const statusWords = ["启用", "停用", "待处理", "处理中", "已回复", "后悔期", "已撤销", "公开"];
    return rows.map((row) => `<tr>${row.map((cell) => `<td>${statusWords.includes(cell) ? badge(cell) : cell}</td>`).join("")}</tr>`).join("");
  }

  function filterComplianceByTab(tab = activeContentTab) {
    activeContentTab = tab;
    $$('[data-content-tab]').forEach((button) => {
      const active = button.dataset.contentTab === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const notice = $('[data-business-rule-notice]');
    if (notice) notice.hidden = tab !== "business-rules";
    return data.compliance.filter((item) => item.group === tab);
  }

  function renderAdmin() {
    const compliance = $('[data-table="compliance"]');
    if (compliance) {
      const rows = filterComplianceByTab();
      compliance.innerHTML = rows.map((item) => {
        const index = data.compliance.indexOf(item);
        return `<tr data-content-key="${item.key}"><td>${item.type}</td><td><b>${item.title}</b></td><td>${item.sourceModule}</td><td>${item.version}</td><td>${badge(item.status)}</td><td>${item.effectiveAt}</td><td><button class="link-btn" data-preview-compliance="${index}">预览</button><button class="link-btn" data-edit-compliance="${index}">编辑</button></td></tr>`;
      }).join("");
    }
    const cancellations = $('[data-table="cancellations"]');
    if (cancellations) cancellations.innerHTML = data.cancellations.map((item, index) => `<tr><td>${item.requestNo}</td><td>${item.user}</td><td>${item.reason}</td><td>${badge(item.status)}</td><td>${item.requestedAt}</td><td><button class="link-btn" data-view-cancellation="${index}">查看详情</button></td></tr>`).join("");
    const blockWords = $('[data-table="blockWords"]');
    if (blockWords) blockWords.innerHTML = data.blockWords.map((row, index) => `<tr>${row.map((cell) => `<td>${["启用", "停用"].includes(cell) ? badge(cell) : cell}</td>`).join("")}<td><button class="link-btn" data-edit-blockword="${index}">编辑</button></td></tr>`).join("");
  }

  function openDialog(id) {
    const dialog = $("#" + id);
    if (dialog) { dialog.classList.add("open"); dialog.setAttribute("aria-hidden", "false"); }
  }

  function closeDialog(node) {
    const dialog = node.closest(".admin-dialog-backdrop");
    if (dialog) { dialog.classList.remove("open"); dialog.setAttribute("aria-hidden", "true"); }
  }

  function nextVersion(version) {
    const match = /^v(\d+)\.(\d+)$/.exec(version) || [null, "1", "0"];
    let major = Number(match[1]);
    let minor = Number(match[2]) + 1;
    if (minor >= 10) { major += 1; minor = 0; }
    return `v${major}.${minor}`;
  }

  function toast(text) {
    let node = $(".toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "toast";
      document.body.appendChild(node);
    }
    node.textContent = text;
    node.classList.add("show");
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => node.classList.remove("show"), 1800);
  }

  document.addEventListener("click", (event) => {
    const contentTab = event.target.closest("[data-content-tab]");
    if (contentTab) {
      activeContentTab = contentTab.dataset.contentTab;
      renderAdmin();
    }
    const tab = event.target.closest("[data-result-tab]");
    if (tab) renderSearch(tab.dataset.resultTab);
    if (event.target.closest("[data-run-search]")) {
      const keyword = ($("[data-search-input]") || {}).value || "";
      if (keyword.includes("加微信")) toast("搜索内容不支持展示");
      else {
        renderSearch("users");
        toast("搜索完成，已写入本地历史");
      }
    }
    const modalButton = event.target.closest("[data-modal]");
    if (modalButton) {
      const modal = $("#" + modalButton.dataset.modal);
      if (modal) modal.classList.add("open");
    }
    if (event.target.closest("[data-close]")) {
      event.target.closest(".modal").classList.remove("open");
    }
    if (event.target.closest(".link-btn")) {
      const button = event.target.closest(".link-btn");
      if (button.dataset.editCompliance !== undefined) {
        const item = data.compliance[Number(button.dataset.editCompliance)];
        const form = $("[data-compliance-form]");
        form.elements.rowIndex.value = button.dataset.editCompliance;
        ["type", "sourceModule", "title", "version", "status", "url"].forEach((key) => { form.elements[key].value = item[key]; });
        form.dataset.originalUrl = item.url;
        const boundaryNote = $('[data-dialog-boundary-note]');
        if (boundaryNote) boundaryNote.hidden = item.key !== "invite_rules";
        openDialog("complianceEditModal");
      } else if (button.dataset.previewCompliance !== undefined) {
        const item = data.compliance[Number(button.dataset.previewCompliance)];
        $("#compliancePreviewTitle").textContent = item.title;
        $("[data-preview-meta]").textContent = `${item.type} · ${item.sourceModule}`;
        $("[data-preview-version]").textContent = item.version;
        $("[data-preview-url]").textContent = item.url;
        const frame = $("[data-preview-frame]");
        frame.removeAttribute("src");
        frame.srcdoc = item.previewHtml || `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;padding:32px;color:#25324a}h1{font-size:24px}p{color:#6b7890;line-height:1.8}.url{margin-top:22px;padding:12px;border-radius:8px;background:#f4f7fb;font-size:12px}</style><h1>${item.title}</h1><p>此处模拟移动端 H5 内容预览。正式环境将加载已配置并通过业务域名校验的页面。</p><div class="url">${item.url}</div></html>`;
        openDialog("compliancePreviewModal");
      } else if (button.dataset.editBlockword !== undefined) {
        const row = data.blockWords[Number(button.dataset.editBlockword)];
        const form = $("[data-blockword-form]");
        form.elements.rowIndex.value = button.dataset.editBlockword;
        form.elements.word.value = row[0]; form.elements.type.value = row[1]; form.elements.match.value = row[2]; form.elements.status.value = row[3];
        $("#blockwordTitle").textContent = "编辑屏蔽词";
        openDialog("blockwordModal");
      } else if (button.dataset.viewCancellation !== undefined) {
        const item = data.cancellations[Number(button.dataset.viewCancellation)];
        $("[data-cancellation-detail]").innerHTML = Object.entries({"申请编号":item.requestNo,"用户":item.user,"脱敏手机号":item.phone,"申请原因":item.reason,"当前状态":item.status,"申请时间":item.requestedAt,"后悔期截止":item.coolingEnd,"剩余时间":item.remaining,"会员状态":item.vip,"千寻币余额":item.coin,"退款状态":item.refund,"付费争议":item.dispute,"处罚状态":item.penalty,"风险与确认":item.risks,"系统执行记录":item.execution,"历史备注":item.remarks}).map(([label, value]) => `<p><span>${label}</span><strong>${value}</strong></p>`).join("");
        openDialog("cancellationDetailModal");
      }
    }
    const addBlockword = event.target.closest("[data-open-blockword]");
    if (addBlockword) {
      const form = $("[data-blockword-form]"); form.reset(); form.elements.rowIndex.value = ""; $("#blockwordTitle").textContent = "新增屏蔽词"; openDialog("blockwordModal");
    }
    if (event.target.closest("[data-close-dialog]")) closeDialog(event.target);
    if (event.target.closest("[data-save-remark]")) { const input = $("[name='remark']"); if (input && input.value.trim()) { toast("内部备注已追加"); input.value = ""; } else toast("请填写内部备注"); }
    const action = event.target.closest("[data-toast]");
    if (action) toast(action.dataset.toast);
  });

  const complianceForm = $("[data-compliance-form]");
  if (complianceForm) complianceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget; const index = Number(form.elements.rowIndex.value); const item = data.compliance[index];
    if (item.key === "invite_rules" && form.elements.status.value === "停用") {
      toast("邀请入口启用中，请先关闭入口后再停用");
      return;
    }
    const changedUrl = form.elements.url.value !== form.dataset.originalUrl;
    item.title = form.elements.title.value; item.status = form.elements.status.value; item.url = form.elements.url.value;
    if (changedUrl) item.version = nextVersion(item.version);
    renderAdmin(); closeDialog(form); toast(changedUrl ? `保存成功，版本升级为 ${item.version}` : "保存成功，版本不变");
  });

  const blockwordForm = $("[data-blockword-form]");
  if (blockwordForm) blockwordForm.addEventListener("submit", (event) => {
    event.preventDefault(); const form = event.currentTarget; const row = [form.elements.word.value, form.elements.type.value, form.elements.match.value, form.elements.status.value];
    if (form.elements.rowIndex.value === "") data.blockWords.push(row); else data.blockWords[Number(form.elements.rowIndex.value)] = row;
    renderAdmin(); closeDialog(form); toast("屏蔽词已保存");
  });

  renderMini();
  renderAdmin();
})();
