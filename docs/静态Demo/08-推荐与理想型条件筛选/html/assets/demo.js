(() => {
  const data = window.PRD08_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = {
    view: 'home', backStack: [], mainTab: 'recommend', waitingReason: 'empty',
    isVip: data.profile.isVip, isCertified: data.profile.isCertified, profileComplete: data.profile.profileComplete,
    balanceMode: 'enough', balance: data.profile.balance, candidateIndex: 0,
    failNextAction: false, candidateUnavailable: false, failReplayView: false,
    liked: new Set(), selectedIdeal: new Set(), selectedResults: new Set(), unlocked: new Set(),
    filter: { cities: new Set([data.profile.city]), neighbor: true, ageMin: data.profile.ageMin, ageMax: data.profile.ageMax },
    savedFilter: null, pendingConfirm: null, pendingCancel: null
  };

  function cloneFilter(filter) {
    return { cities: new Set(filter.cities), neighbor: filter.neighbor, ageMin: filter.ageMin, ageMax: filter.ageMax };
  }
  function filterSignature(filter) {
    return JSON.stringify({ cities:[...filter.cities].sort(), neighbor:filter.neighbor, ageMin:filter.ageMin, ageMax:filter.ageMax });
  }
  state.savedFilter = cloneFilter(state.filter);

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }
  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 1900);
  }
  function hideToast() {
    const toast = $('#toast'); clearTimeout(showToast.timer); toast.textContent = ''; toast.classList.remove('show');
  }
  function showView(next, push = true) {
    if (!$(`[data-view="${next}"]`)) return;
    if (push && state.view !== next) state.backStack.push(state.view);
    state.view = next;
    $$('.screen').forEach(screen => screen.classList.toggle('active', screen.dataset.view === next));
    $$('[data-shell-view]').forEach(button => button.classList.toggle('is-active', button.dataset.shellView === next));
    $('#viewSelect').value = next;
    if (next === 'detail') renderDetail();
    if (next === 'waiting') renderWaiting();
    if (next === 'replay') renderReplay();
    if (next === 'results') renderResults();
    if (next === 'records') renderRecords();
    if (next === 'unlocks') renderUnlockHistory();
    const screen = $(`[data-view="${next}"]`); if (screen) screen.scrollTop = 0;
  }
  function goBack(skipFilterConfirm = false) {
    if (!skipFilterConfirm && state.view === 'filter' && isFilterDirty()) { openFilterBackConfirm(); return; }
    showView(state.backStack.pop() || 'home', false);
  }
  function openModal({ title, text, confirm = '确认', cancel = '取消', icon = '✦', onConfirm, onCancel }) {
    $('#modalTitle').textContent = title; $('#modalText').textContent = text; $('#modalConfirm').textContent = confirm; $('#modalCancel').textContent = cancel; $('#modalIcon').textContent = icon;
    state.pendingConfirm = onConfirm || null; state.pendingCancel = onCancel || null;
    $('#confirmModal').classList.add('open'); $('#confirmModal').setAttribute('aria-hidden', 'false');
  }
  function closeModal(modal) {
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
    if (modal === $('#confirmModal')) { state.pendingConfirm = null; state.pendingCancel = null; }
  }
  function openVipCenter() {
    if (state.isVip) return;
    $('#vipModal').classList.add('open'); $('#vipModal').setAttribute('aria-hidden', 'false');
  }
  function ensureInteractionCertified() {
    if (state.isCertified) return true;
    $('#authModal').classList.add('open'); $('#authModal').setAttribute('aria-hidden', 'false');
    return false;
  }
  function consumeNetworkFailure() {
    if (!state.failNextAction) return false;
    state.failNextAction = false; syncConsole(); showToast('网络错误'); return true;
  }

  function setMainTab(tab) {
    state.mainTab = tab;
    $$('[data-main-tab]').forEach(button => button.classList.toggle('active', button.dataset.mainTab === tab));
    $$('[data-main-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.mainPanel === tab));
    if (tab === 'ideal') renderIdealGroups();
  }
  function renderCandidate() {
    const candidate = data.candidates[state.candidateIndex];
    if (!candidate) { showView('waiting'); return; }
    $('#candidateName').textContent = candidate.name; $('#candidateAge').textContent = `${candidate.age}岁`; $('#candidateCity').textContent = candidate.city;
    $('#candidateMeta').textContent = `${candidate.school} · ${candidate.job} · ${candidate.height}`;
    $('#candidateTags').innerHTML = candidate.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
    const image = $('#candidatePhoto'); image.src = candidate.photo; image.alt = `${candidate.name}的公开照片`; image.style.display = '';
    image.onerror = () => { image.style.display = 'none'; $('#photoFallback').textContent = candidate.name.slice(0, 1); };
    $('#likeCandidate').classList.toggle('liked', state.liked.has(candidate.no));
  }
  function moveToNextCandidate(successMessage) {
    state.candidateIndex += 1;
    if (state.candidateIndex >= data.candidates.length) { state.waitingReason = 'empty'; showView('waiting'); return; }
    renderCandidate(); if (successMessage) showToast(successMessage);
  }
  function handleCandidateUnavailable({ silent = false } = {}) {
    if (!state.candidateUnavailable) return false;
    state.candidateUnavailable = false;
    if (state.view === 'detail') goBack(true);
    moveToNextCandidate();
    syncConsole();
    if (!silent) showToast('该用户已注销');
    return true;
  }
  function openCandidateDetail() {
    if (handleCandidateUnavailable()) return;
    showView('detail');
  }
  function skipCandidate() {
    if (handleCandidateUnavailable({ silent:true })) return;
    if (consumeNetworkFailure()) return;
    moveToNextCandidate('已跳过，筛选条件没有变化');
  }
  function skipFromDetail() {
    if (handleCandidateUnavailable({ silent:true })) return;
    if (consumeNetworkFailure()) return;
    goBack(); moveToNextCandidate('已跳过，筛选条件没有变化');
  }
  function whisperCandidate() {
    if (handleCandidateUnavailable()) return;
    if (!ensureInteractionCertified() || consumeNetworkFailure()) return;
    window.location.assign(data.routes.whisperMessageUrl);
  }
  function likeCandidate(fromDetail = false) {
    if (handleCandidateUnavailable()) return;
    if (!ensureInteractionCertified() || consumeNetworkFailure()) return;
    const candidate = data.candidates[state.candidateIndex]; if (!candidate) return;
    state.liked.add(candidate.no);
    if (fromDetail) goBack();
    moveToNextCandidate('已表达喜欢');
  }
  function renderDetail() {
    const candidate = data.candidates[Math.min(state.candidateIndex, data.candidates.length - 1)]; if (!candidate) return;
    $('#detailName').textContent = candidate.name; $('#detailLine').textContent = `${candidate.age}岁 · ${candidate.city} · ${candidate.height}`;
    $('#detailSchool').textContent = candidate.school; $('#detailJob').textContent = candidate.job;
    const image = $('#detailPhoto'); image.src = candidate.photo; image.alt = `${candidate.name}的公开照片`; image.style.display = '';
    image.onerror = () => { image.style.display = 'none'; };
  }

  function dependencyUnavailable(dependency) { return Boolean(dependency) && !state.profileComplete; }
  function visibleIdealGroups() {
    return data.idealGroups.map(group => ({ ...group, items: group.items.filter(([, , dependency]) => !dependencyUnavailable(dependency)) })).filter(group => group.items.length);
  }
  function renderIdealGroups() {
    $('#idealGroups').innerHTML = visibleIdealGroups().map(group => `<section class="ideal-group"><h3>${escapeHtml(group.name)}</h3><div class="chip-grid">${group.items.map(([code, label]) => {
      const selected = state.selectedIdeal.has(code);
      return `<button class="ideal-chip ${selected ? 'selected' : ''}" data-ideal-code="${code}">${escapeHtml(label)}</button>`;
    }).join('')}</div></section>`).join('');
    $('#idealSelectedCount').textContent = `已选 ${state.selectedIdeal.size} 项`;
  }
  function submitIdeal() {
    renderResults(); showView('results');
    if (state.selectedIdeal.size === 0) showToast('当前仅按位置和年龄筛选');
  }

  function isFilterDirty() { return filterSignature(state.filter) !== filterSignature(state.savedFilter); }
  function discardFilterDraft() { state.filter = cloneFilter(state.savedFilter); renderFilterState(); }
  function openFilterBackConfirm() {
    openModal({
      title:'温馨提示',
      text:'是否保存该设置？',
      cancel:'不保存',
      confirm:'保存',
      icon:'!',
      onCancel:() => { discardFilterDraft(); goBack(true); },
      onConfirm:saveFilter
    });
  }
  function renderFilterState() {
    $('#cityChoices').innerHTML = [...state.filter.cities].map(city => `<button class="selected" data-city="${escapeHtml(city)}">⌖ ${escapeHtml(city)} <span aria-hidden="true">×</span></button>`).join('');
    $('#cityCounter').textContent = `${state.filter.cities.size}/${data.config.targetCityMax}`;
    const addEntryHidden = state.filter.cities.size >= data.config.targetCityMax;
    $('#addCity').hidden = addEntryHidden;
    $('#cityHint').textContent = state.filter.cities.size ? (addEntryHidden ? '已达到 3 个城市上限' : `还可添加 ${data.config.targetCityMax - state.filter.cities.size} 个城市`) : '请至少添加一个城市后再保存';
    $('#cityHint').classList.toggle('error', !state.filter.cities.size);
    const saveButton = $('#saveFilter'); saveButton.disabled = !state.filter.cities.size;
    $('#neighborToggle').checked = state.filter.neighbor; $('#ageMin').value = state.filter.ageMin; $('#ageMax').value = state.filter.ageMax;
    $('#ageValue').textContent = `${state.filter.ageMin}–${state.filter.ageMax}`;
    $('#advancedForm').classList.toggle('locked', !state.isVip); $('#advancedForm').dataset.locked = String(!state.isVip); $$('#advancedForm select').forEach(input => { input.disabled = false; input.removeAttribute('aria-disabled'); });
    $('#vipBannerText').textContent = state.isVip ? '会员权益有效，高级条件将参与推荐' : '开通会员后可保存六项高级条件';
    $('#openVip').textContent = state.isVip ? '权益有效' : '去开通'; $('#openVip').disabled = state.isVip;
  }
  function addCity() {
    if (state.filter.cities.size >= data.config.targetCityMax) { showToast('最多选择 3 个城市'); return; }
    const nextCity = data.config.demoCities.find(city => !state.filter.cities.has(city));
    if (!nextCity) return;
    state.filter.cities.add(nextCity); renderFilterState(); hideToast();
  }
  function updateAge() {
    let min = Number($('#ageMin').value), max = Number($('#ageMax').value);
    if (min > max) { if (document.activeElement === $('#ageMin')) max = min; else min = max; }
    state.filter.ageMin = min; state.filter.ageMax = max; $('#ageMin').value = min; $('#ageMax').value = max; $('#ageValue').textContent = `${min}–${max}`;
  }
  function saveFilter() {
    if (!state.filter.cities.size) { showToast('请至少选择一个城市'); return; }
    data.profile.city = [...state.filter.cities].join('、'); data.profile.ageMin = state.filter.ageMin; data.profile.ageMax = state.filter.ageMax;
    state.savedFilter = cloneFilter(state.filter);
    $('#idealCity').textContent = data.profile.city; $('#idealAge').textContent = `${data.profile.ageMin}–${data.profile.ageMax}岁`;
    setMainTab('recommend'); showView('home'); showToast('筛选已保存，并同步到理想型');
  }

  function renderWaiting() {
    const limited = state.waitingReason === 'limit';
    $('#waitingIllustration').src = limited ? data.defaultAssets.noData : data.defaultAssets.emptyPerson;
    $('#waitingTitle').textContent = limited ? '今天的推荐已看完' : '当前条件下暂未找到推荐人';
    $('#waitingText').textContent = limited ? `下次重置时间：${data.config.nextRecommendResetAt}` : '已保留你的筛选条件，可前往千寻同城发现更多嘉宾。';
    $('#waitingPrimary').textContent = limited ? '看看三天回看' : '去千寻同城看看';
    $('#waitingSecondary').textContent = '稍后重试';
    $('#waitingSecondary').style.display = limited ? 'block' : 'none';
    $('#waitingVip').style.display = limited && !state.isVip ? 'inline-grid' : 'none';
  }

  function renderReplay() {
    $('#replayLock').style.display = state.isVip ? 'none' : 'grid'; $('#replayList').style.display = state.isVip ? 'grid' : 'none';
    $('#replayHint').textContent = state.isVip ? '最近 3 天' : 'VIP 权益';
    if (!state.isVip) return;
    $('#replayList').innerHTML = `${data.replayDays.map(day => `<section class="replay-day"><header><div><h2>${escapeHtml(day.date)}</h2><p><span>推荐 ${day.recommendedCount} 人</span><span>跳过 ${day.skippedCount} 人</span></p></div></header>${day.candidateIndexes.length ? day.candidateIndexes.map(index => { const candidate = data.candidates[index]; return `<article class="replay-item"><img src="${candidate.photo}" alt="${escapeHtml(candidate.name)}"><div><h3>${escapeHtml(candidate.name)}</h3><p>${candidate.birthYear}年 · ${escapeHtml(candidate.city)} · ${escapeHtml(candidate.job)}</p></div><button data-replay-index="${index}">查看</button></article>`; }).join('') : '<div class="replay-empty">这一天你没来，无推荐嘉宾</div>'}</section>`).join('')}<p class="replay-footnote">仅展示最近3天推荐嘉宾，珍惜当下</p>`;
  }

  function projectedResultCount() { return Math.max(0, 12 - Math.max(0, state.selectedIdeal.size - 2) * 2); }
  function renderResults() {
    const count = projectedResultCount(); $('#resultCount').textContent = `${count} 位`;
    $('#resultFilterSummary').textContent = `${data.profile.city} · ${data.profile.ageMin}–${data.profile.ageMax} · 已选 ${state.selectedIdeal.size} 项`;
    $('#balanceValue').textContent = state.balance;
    if (count === 0) {
      $('#resultList').innerHTML = '<div class="record-item" style="grid-column:1/-1;text-align:center;padding:50px 20px"><h2>没有人同时满足全部条件</h2><p>条件已完整保留，你可以返回修改；系统不会自动放宽。</p></div>';
      state.selectedResults.clear(); updateUnlockFooter(); return;
    }
    $('#resultList').innerHTML = data.idealResults.map(result => {
      const unlocked = state.unlocked.has(result.no), selected = state.selectedResults.has(result.no);
      const title = unlocked ? result.clearName : '匿名嘉宾';
      return `<article class="result-card ${unlocked ? 'unlocked' : 'locked'}" data-result-card="${result.no}">${unlocked ? '' : `<input class="result-check" type="checkbox" aria-label="选择匿名结果" data-result-id="${result.no}" ${selected ? 'checked' : ''}>`}<div class="result-avatar"><img src="${result.photo}" alt="${unlocked ? escapeHtml(result.clearName) : '模糊匿名头像'}"></div><div class="result-meta"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(result.ageBand)} · ${escapeHtml(result.city)}</p><div>${result.summary.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></div></article>`;
    }).join(''); updateUnlockFooter();
  }
  function updateUnlockFooter() {
    const size = state.selectedResults.size, total = size * data.config.unitUnlockPrice;
    $('#unlockSelection').textContent = `已选 ${size}/${data.config.batchMax}`; $('#unlockTotal').textContent = total; $('#unlockSelected').disabled = size === 0;
  }
  function requestUnlock() {
    const size = state.selectedResults.size; if (!size) return; const total = size * data.config.unitUnlockPrice;
    openModal({ title:'确认解锁所选嘉宾？', text:`本次共 ${size} 人，Demo 动态单价 ${data.config.unitUnlockPrice} 千寻币，合计 ${total} 千寻币。VIP 也需要支付。`, confirm:`支付 ${total}`, onConfirm:() => {
      if (state.balance < total) {
        openModal({ title:'千寻币余额不足', text:`当前余额 ${state.balance}，仍需 ${total - state.balance} 千寻币。失败不会清空已选结果。`, confirm:'模拟充值', icon:'◈', onConfirm:() => { state.balance = 500; state.balanceMode = 'enough'; syncConsole(); renderResults(); showToast('模拟充值成功，请再次确认解锁'); } });
        return;
      }
      state.balance -= total; state.selectedResults.forEach(no => state.unlocked.add(no)); state.selectedResults.clear(); renderResults(); showToast('解锁成功，已展示公开资料');
    }});
  }

  function renderRecords() {
    $('#recordList').innerHTML = data.filterRecords.map(record => `<article class="record-item"><header><span>${escapeHtml(record.date)}</span><span class="record-status ${record.status}">${record.status === 'active' ? '可查看' : '已过期'}</span></header><h2>${escapeHtml(record.summary)}</h2><p>${record.status === 'active' ? `共 ${record.count} 位符合条件` : '只保留条件摘要，结果已过期'}</p><div class="record-actions"><button data-reuse-record="${record.no}">再次筛选</button>${record.status === 'active' ? `<button class="primary" data-view-record="${record.no}">查看结果</button>` : ''}</div></article>`).join('');
  }
  function renderUnlockHistory() {
    const newly = [...state.unlocked].map(no => { const item = data.idealResults.find(result => result.no === no); return { no, name:item.clearName, time:'刚刚', status:'active', summary:`${item.city} · ${item.ageBand} · 已查看公开资料` }; });
    const records = [...newly, ...data.unlockedHistory];
    $('#unlockHistory').innerHTML = records.map(record => `<article class="record-item"><header><span>${escapeHtml(record.time)}</span><span class="record-status ${record.status}">${record.status === 'active' ? '有效' : '已失效'}</span></header><h2>${escapeHtml(record.name)}</h2><p>${escapeHtml(record.summary)}</p><div class="record-actions"><button ${record.status === 'active' ? 'class="primary" data-history-profile' : 'data-go="home" data-open-ideal'}>${record.status === 'active' ? '查看公开资料' : '重新筛选'}</button></div></article>`).join('');
  }

  function setVip(enabled) { state.isVip = enabled; data.profile.isVip = enabled; syncConsole(); renderFilterState(); renderWaiting(); renderReplay(); showToast(enabled ? '已切换为 VIP 权益' : '已切换为普通用户'); }
  function setCertified(enabled) { state.isCertified = enabled; data.profile.isCertified = enabled; syncConsole(); showToast(enabled ? '认证已完成，完成认证后请再次点击原操作' : '已切换为未认证用户'); }
  function setProfileComplete(enabled) { state.profileComplete = enabled; data.profile.profileComplete = enabled; syncConsole(); renderIdealGroups(); showToast(enabled ? '相关理想型条件已重新展示' : '资料依赖条件已隐藏'); }
  function setBalanceMode(mode) { state.balanceMode = mode; state.balance = mode === 'enough' ? 260 : 40; syncConsole(); renderResults(); }
  function setCandidateUnavailable(enabled) { state.candidateUnavailable = enabled; syncConsole(); showToast(enabled ? '当前候选已模拟注销' : '当前候选恢复有效'); }
  function setReplayFailure(enabled) { state.failReplayView = enabled; syncConsole(); showToast(enabled ? '下次回看查看将失败' : '回看查看恢复正常'); }
  function syncConsole() {
    $('#vipMode').textContent = state.isVip ? 'VIP 用户' : '普通用户'; $('#vipMode').setAttribute('aria-pressed', String(state.isVip));
    $('#authMode').textContent = state.isCertified ? '已认证' : '未认证'; $('#authMode').setAttribute('aria-pressed', String(state.isCertified));
    $('#profileMode').textContent = state.profileComplete ? '资料完整' : '资料缺失'; $('#profileMode').setAttribute('aria-pressed', String(state.profileComplete));
    $('#balanceMode').textContent = state.balanceMode === 'enough' ? '余额充足' : '余额不足'; $('#balanceMode').setAttribute('aria-pressed', String(state.balanceMode === 'enough'));
    $('#networkMode').textContent = state.failNextAction ? '下次操作网络失败' : '网络正常'; $('#networkMode').setAttribute('aria-pressed', String(state.failNextAction));
    $('#waitingMode').textContent = state.waitingReason === 'limit' ? '等待：达到上限' : '等待：无候选'; $('#waitingMode').setAttribute('aria-pressed', String(state.waitingReason === 'limit'));
    $('#candidateMode').textContent = state.candidateUnavailable ? '候选已注销' : '候选有效'; $('#candidateMode').setAttribute('aria-pressed', String(state.candidateUnavailable));
    $('#replayErrorMode').textContent = state.failReplayView ? '下次回看失败' : '回看正常'; $('#replayErrorMode').setAttribute('aria-pressed', String(state.failReplayView));
  }

  $$('[data-main-tab]').forEach(button => button.addEventListener('click', () => setMainTab(button.dataset.mainTab)));
  $$('[data-go]').forEach(button => button.addEventListener('click', () => { if (button.dataset.openIdeal !== undefined) setMainTab('ideal'); showView(button.dataset.go); }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => goBack()));
  $$('[data-shell-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.shellView)));
  $('#viewSelect').addEventListener('change', event => showView(event.target.value));
  $('#vipMode').addEventListener('click', () => setVip(!state.isVip)); $('#authMode').addEventListener('click', () => setCertified(!state.isCertified)); $('#profileMode').addEventListener('click', () => setProfileComplete(!state.profileComplete));
  $('#balanceMode').addEventListener('click', () => setBalanceMode(state.balanceMode === 'enough' ? 'insufficient' : 'enough'));
  $('#networkMode').addEventListener('click', () => { state.failNextAction = !state.failNextAction; syncConsole(); });
  $('#waitingMode').addEventListener('click', () => { state.waitingReason = state.waitingReason === 'empty' ? 'limit' : 'empty'; syncConsole(); renderWaiting(); showView('waiting'); });
  $('#candidateMode').addEventListener('click', () => setCandidateUnavailable(!state.candidateUnavailable));
  $('#replayErrorMode').addEventListener('click', () => setReplayFailure(!state.failReplayView));
  $('#candidateCard').addEventListener('click', openCandidateDetail);
  $('#skipCandidate').addEventListener('click', skipCandidate); $('#detailSkip').addEventListener('click', skipFromDetail);
  $('#whisperCandidate').addEventListener('click', whisperCandidate);
  $('#likeCandidate').addEventListener('click', () => likeCandidate(false));
  $('#detailLike').addEventListener('click', () => likeCandidate(true));
  $('#detailWhisper').addEventListener('click', whisperCandidate);
  $('#detailMore').addEventListener('click', () => {
    if (handleCandidateUnavailable()) return;
    $('#detailActionModal').classList.add('open'); $('#detailActionModal').setAttribute('aria-hidden', 'false');
  });
  $('#reportUser').addEventListener('click', () => { closeModal($('#detailActionModal')); $('#reportModal').classList.add('open'); $('#reportModal').setAttribute('aria-hidden', 'false'); });
  $('#neverRecommendAction').addEventListener('click', () => { closeModal($('#detailActionModal')); openModal({ title:'不再推荐这位嘉宾？', text:'确认后，该用户将不再出现在你的推荐和理想型结果中。', confirm:'确认不再推荐', icon:'×', onConfirm:() => { goBack(); skipCandidate(); } }); });
  $('#submitReport').addEventListener('click', () => { if (!$('#reportReason').value) { showToast('请选择举报原因'); return; } const submit = $('#submitReport'); submit.disabled = true; submit.textContent = '提交中…'; setTimeout(() => { submit.disabled = false; submit.textContent = '提交举报'; $('#reportReason').value = ''; closeModal($('#reportModal')); showToast('举报已提交，平台将尽快审核'); }, 350); });
  $('#idealGroups').addEventListener('click', event => { const button = event.target.closest('[data-ideal-code]'); if (!button) return; const code = button.dataset.idealCode; state.selectedIdeal.has(code) ? state.selectedIdeal.delete(code) : state.selectedIdeal.add(code); renderIdealGroups(); });
  $('#submitIdeal').addEventListener('click', submitIdeal);
  $('#cityChoices').addEventListener('click', event => { const button = event.target.closest('[data-city]'); if (!button) return; state.filter.cities.delete(button.dataset.city); renderFilterState(); if (!state.filter.cities.size) showToast('请至少选择一个城市'); });
  $('#addCity').addEventListener('click', addCity);
  $('#neighborToggle').addEventListener('change', event => { state.filter.neighbor = event.target.checked; }); $('#ageMin').addEventListener('input', updateAge); $('#ageMax').addEventListener('input', updateAge);
  $('#resetFilter').addEventListener('click', () => openModal({
    title:'恢复默认筛选？',
    text:'将恢复为当前城市和默认年龄范围，高级条件也会清空；保存后生效。',
    confirm:'恢复默认',
    icon:'↺',
    onConfirm:() => { state.filter = { cities:new Set(['杭州']), neighbor:true, ageMin:25, ageMax:31 }; renderFilterState(); showToast('已恢复默认草稿，保存后生效'); }
  }));
  $('#saveFilter').addEventListener('click', saveFilter); $('#openVip').addEventListener('click', openVipCenter); $('#replayVip').addEventListener('click', openVipCenter);
  $('#advancedForm').addEventListener('click', event => { if (state.isVip) return; event.preventDefault(); event.stopPropagation(); openVipCenter(); }, true);
  $('#advancedForm').addEventListener('change', event => { if (!state.isVip) { event.preventDefault(); renderFilterState(); openVipCenter(); } }, true);
  $('#waitingPrimary').addEventListener('click', () => {
    if (state.waitingReason === 'limit') showView('replay');
    else window.location.assign(data.routes.communityCityUrl);
  });
  $('#waitingSecondary').addEventListener('click', () => showToast('正在重新获取推荐…'));
  $('#waitingVip').addEventListener('click', openVipCenter);
  $('#replayList').addEventListener('click', event => {
    const button = event.target.closest('[data-replay-index]'); if (!button) return;
    if (state.failReplayView) { state.failReplayView = false; syncConsole(); showToast('查看失败，请返回后重新查看'); return; }
    state.candidateIndex = Number(button.dataset.replayIndex); showView('detail');
  });
  $('#resultList').addEventListener('change', event => { const checkbox = event.target.closest('[data-result-id]'); if (!checkbox) return; const no = checkbox.dataset.resultId; if (checkbox.checked && state.selectedResults.size >= data.config.batchMax) { checkbox.checked = false; showToast('单次最多选择 5 人'); return; } checkbox.checked ? state.selectedResults.add(no) : state.selectedResults.delete(no); updateUnlockFooter(); });
  $('#unlockSelected').addEventListener('click', requestUnlock);
  $('#recordList').addEventListener('click', event => { if (event.target.closest('[data-view-record]')) showView('results'); if (event.target.closest('[data-reuse-record]')) { setMainTab('ideal'); showView('home'); showToast('已载入有效条件草稿，尚未生成新结果'); } });
  $('#unlockHistory').addEventListener('click', event => { if (event.target.closest('[data-history-profile]')) { state.candidateIndex = 0; showView('detail'); } if (event.target.closest('[data-open-ideal]')) { setMainTab('ideal'); showView('home'); showToast('已返回理想型条件页'); } });
  $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop'))));
  $$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop); }));
  $('#modalCancel').addEventListener('click', () => { const action = state.pendingCancel; closeModal($('#confirmModal')); if (action) action(); });
  $('#modalConfirm').addEventListener('click', () => { const action = state.pendingConfirm; closeModal($('#confirmModal')); if (action) action(); });
  $('#finishAuth').addEventListener('click', () => { closeModal($('#authModal')); setCertified(true); });
  $('#activateVip').addEventListener('click', () => { closeModal($('#vipModal')); setVip(true); });

  renderCandidate(); renderIdealGroups(); renderFilterState(); renderWaiting(); renderRecords(); renderUnlockHistory(); syncConsole(); setMainTab('recommend');
})();
