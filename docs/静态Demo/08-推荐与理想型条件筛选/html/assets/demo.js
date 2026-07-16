(() => {
  const data = window.PRD08_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = {
    view: 'home', backStack: [], mainTab: 'recommend', filterTab: 'basic',
    isVip: data.profile.isVip, profileComplete: data.profile.profileComplete,
    balanceMode: 'enough', balance: data.profile.balance, candidateIndex: 0,
    liked: new Set(), selectedIdeal: new Set(), selectedResults: new Set(), unlocked: new Set(),
    filter: { cities: new Set([data.profile.city]), neighbor: true, ageMin: data.profile.ageMin, ageMax: data.profile.ageMax },
    pendingConfirm: null
  };

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }
  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 1900);
  }
  function showView(next, push = true) {
    if (!$(`[data-view="${next}"]`)) return;
    if (push && state.view !== next) state.backStack.push(state.view);
    state.view = next;
    $$('.screen').forEach(screen => screen.classList.toggle('active', screen.dataset.view === next));
    $$('[data-shell-view]').forEach(button => button.classList.toggle('is-active', button.dataset.shellView === next));
    $('#viewSelect').value = next;
    if (next === 'detail') renderDetail();
    if (next === 'replay') renderReplay();
    if (next === 'results') renderResults();
    if (next === 'records') renderRecords();
    if (next === 'unlocks') renderUnlockHistory();
    const screen = $(`[data-view="${next}"]`); if (screen) screen.scrollTop = 0;
  }
  function goBack() { showView(state.backStack.pop() || 'home', false); }
  function openModal({ title, text, confirm = '确认', icon = '✦', onConfirm }) {
    $('#modalTitle').textContent = title; $('#modalText').textContent = text; $('#modalConfirm').textContent = confirm; $('#modalIcon').textContent = icon;
    state.pendingConfirm = onConfirm || null; $('#confirmModal').classList.add('open'); $('#confirmModal').setAttribute('aria-hidden', 'false');
  }
  function closeModal(modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }

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
  function skipCandidate() {
    state.candidateIndex += 1;
    if (state.candidateIndex >= data.candidates.length) { showView('waiting'); return; }
    renderCandidate(); showToast('已跳过，筛选条件没有变化');
  }
  function renderDetail() {
    const candidate = data.candidates[Math.min(state.candidateIndex, data.candidates.length - 1)]; if (!candidate) return;
    $('#detailName').textContent = candidate.name; $('#detailLine').textContent = `${candidate.age}岁 · ${candidate.city} · ${candidate.height}`;
    $('#detailSchool').textContent = candidate.school; $('#detailJob').textContent = candidate.job;
    const image = $('#detailPhoto'); image.src = candidate.photo; image.alt = `${candidate.name}的公开照片`; image.style.display = '';
    image.onerror = () => { image.style.display = 'none'; };
  }

  function dependencyUnavailable(dependency) { return Boolean(dependency) && !state.profileComplete; }
  function renderIdealGroups() {
    $('#idealGroups').innerHTML = data.idealGroups.map(group => `<section class="ideal-group"><h3>${escapeHtml(group.name)}</h3><div class="chip-grid">${group.items.map(([code, label, dependency]) => {
      const locked = dependencyUnavailable(dependency); const selected = state.selectedIdeal.has(code);
      return `<button class="ideal-chip ${selected ? 'selected' : ''}" data-ideal-code="${code}" ${locked ? `aria-disabled="true" data-dependency="${dependency}"` : ''}>${escapeHtml(label)}${locked ? '<span class="lock">待完善</span>' : ''}</button>`;
    }).join('')}</div></section>`).join('');
    $('#idealSelectedCount').textContent = `已选 ${state.selectedIdeal.size} 项`;
  }
  function submitIdeal() {
    renderResults(); showView('results');
    if (state.selectedIdeal.size === 0) showToast('当前仅按位置和年龄筛选');
  }

  function renderFilterState() {
    $$('#cityChoices [data-city]').forEach(button => button.classList.toggle('selected', state.filter.cities.has(button.dataset.city)));
    $('#cityCounter').textContent = `${state.filter.cities.size}/${data.config.targetCityMax}`;
    $('#neighborToggle').checked = state.filter.neighbor; $('#ageMin').value = state.filter.ageMin; $('#ageMax').value = state.filter.ageMax;
    $('#ageValue').textContent = `${state.filter.ageMin}–${state.filter.ageMax}`;
    $('#advancedForm').classList.toggle('locked', !state.isVip); $$('#advancedForm select').forEach(input => input.disabled = !state.isVip);
    $('#vipBannerText').textContent = state.isVip ? '会员权益有效，高级条件将参与推荐' : '开通会员后可保存六项高级条件';
    $('#openVip').textContent = state.isVip ? '权益有效' : '模拟开通'; $('#openVip').disabled = state.isVip;
  }
  function setFilterTab(tab) {
    state.filterTab = tab; $$('[data-filter-tab]').forEach(button => button.classList.toggle('active', button.dataset.filterTab === tab));
    $$('[data-filter-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.filterPanel === tab)); renderFilterState();
  }
  function updateAge() {
    let min = Number($('#ageMin').value), max = Number($('#ageMax').value);
    if (min > max) { if (document.activeElement === $('#ageMin')) max = min; else min = max; }
    state.filter.ageMin = min; state.filter.ageMax = max; $('#ageMin').value = min; $('#ageMax').value = max; $('#ageValue').textContent = `${min}–${max}`;
  }
  function saveFilter() {
    if (!state.filter.cities.size) { showToast('请至少选择一个城市'); return; }
    data.profile.city = [...state.filter.cities].join('、'); data.profile.ageMin = state.filter.ageMin; data.profile.ageMax = state.filter.ageMax;
    const summary = `${data.profile.city} · ${data.profile.ageMin}–${data.profile.ageMax}岁`;
    $('#recommendSummary').textContent = summary; $('#idealCity').textContent = data.profile.city; $('#idealAge').textContent = `${data.profile.ageMin}–${data.profile.ageMax}岁`;
    setMainTab('recommend'); showView('home'); showToast('筛选已保存，并同步到理想型');
  }

  function renderReplay() {
    $('#replayLock').style.display = state.isVip ? 'none' : 'grid'; $('#replayList').style.display = state.isVip ? 'grid' : 'none';
    $('#replayHint').textContent = state.isVip ? '最近 3 天' : 'VIP 权益';
    if (!state.isVip) return;
    $('#replayList').innerHTML = data.candidates.slice(0, 2).map((candidate, index) => `<article class="replay-item"><img src="${candidate.photo}" alt="${escapeHtml(candidate.name)}"><div><h3>${escapeHtml(candidate.name)} · ${candidate.age}</h3><p>${escapeHtml(candidate.city)} · ${index === 0 ? '今天浏览' : '昨天跳过'}</p></div><button data-replay-index="${index}">查看</button></article>`).join('');
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

  function setVip(enabled) { state.isVip = enabled; data.profile.isVip = enabled; syncConsole(); renderFilterState(); renderReplay(); showToast(enabled ? '已切换为 VIP 权益' : '已切换为普通用户'); }
  function setProfileComplete(enabled) { state.profileComplete = enabled; data.profile.profileComplete = enabled; syncConsole(); renderIdealGroups(); showToast(enabled ? '资料依赖条件已可选择' : '校友/相似条件已锁定'); }
  function setBalanceMode(mode) { state.balanceMode = mode; state.balance = mode === 'enough' ? 260 : 40; syncConsole(); renderResults(); }
  function syncConsole() {
    $('#vipMode').textContent = state.isVip ? 'VIP 用户' : '普通用户'; $('#vipMode').setAttribute('aria-pressed', String(state.isVip));
    $('#profileMode').textContent = state.profileComplete ? '资料完整' : '资料缺失'; $('#profileMode').setAttribute('aria-pressed', String(state.profileComplete));
    $('#balanceMode').textContent = state.balanceMode === 'enough' ? '余额充足' : '余额不足'; $('#balanceMode').setAttribute('aria-pressed', String(state.balanceMode === 'enough'));
  }

  $$('[data-main-tab]').forEach(button => button.addEventListener('click', () => setMainTab(button.dataset.mainTab)));
  $$('[data-filter-tab]').forEach(button => button.addEventListener('click', () => setFilterTab(button.dataset.filterTab)));
  $$('[data-go]').forEach(button => button.addEventListener('click', () => { if (button.dataset.openIdeal !== undefined) setMainTab('ideal'); showView(button.dataset.go); }));
  $$('[data-back]').forEach(button => button.addEventListener('click', goBack));
  $$('[data-shell-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.shellView)));
  $('#viewSelect').addEventListener('change', event => showView(event.target.value));
  $('#vipMode').addEventListener('click', () => setVip(!state.isVip)); $('#profileMode').addEventListener('click', () => setProfileComplete(!state.profileComplete));
  $('#balanceMode').addEventListener('click', () => setBalanceMode(state.balanceMode === 'enough' ? 'insufficient' : 'enough'));
  $('#skipCandidate').addEventListener('click', skipCandidate); $('#detailSkip').addEventListener('click', () => { goBack(); skipCandidate(); });
  $('#likeCandidate').addEventListener('click', () => { const no = data.candidates[state.candidateIndex].no; state.liked.has(no) ? state.liked.delete(no) : state.liked.add(no); renderCandidate(); showToast(state.liked.has(no) ? '已表达喜欢' : '已取消喜欢'); });
  $('#detailLike').addEventListener('click', () => { const no = data.candidates[state.candidateIndex].no; state.liked.add(no); showToast('已表达喜欢'); });
  $('#neverRecommend').addEventListener('click', () => openModal({ title:'不再推荐这位嘉宾？', text:'确认后会从推荐和理想型实时结果中剔除，历史解锁记录仍保留状态。', confirm:'不再推荐', icon:'×', onConfirm:() => { goBack(); skipCandidate(); } }));
  $('#idealGroups').addEventListener('click', event => { const button = event.target.closest('[data-ideal-code]'); if (!button) return; if (button.dataset.dependency) { $('#profileModal').classList.add('open'); $('#profileModal').setAttribute('aria-hidden','false'); return; } const code = button.dataset.idealCode; state.selectedIdeal.has(code) ? state.selectedIdeal.delete(code) : state.selectedIdeal.add(code); renderIdealGroups(); });
  $('#submitIdeal').addEventListener('click', submitIdeal);
  $('#cityChoices').addEventListener('click', event => { const button = event.target.closest('[data-city]'); if (!button) return; const city = button.dataset.city; if (state.filter.cities.has(city)) state.filter.cities.delete(city); else if (state.filter.cities.size < data.config.targetCityMax) state.filter.cities.add(city); else { showToast('最多选择 3 个城市'); return; } renderFilterState(); });
  $('#neighborToggle').addEventListener('change', event => { state.filter.neighbor = event.target.checked; }); $('#ageMin').addEventListener('input', updateAge); $('#ageMax').addEventListener('input', updateAge);
  $('#resetFilter').addEventListener('click', () => { state.filter = { cities:new Set(['杭州']), neighbor:true, ageMin:25, ageMax:31 }; renderFilterState(); showToast('已恢复默认草稿，保存后生效'); });
  $('#saveFilter').addEventListener('click', saveFilter); $('#openVip').addEventListener('click', () => setVip(true)); $('#replayVip').addEventListener('click', () => setVip(true));
  $('#saveMeeting').addEventListener('click', () => { data.profile.meeting = $('input[name="meeting"]:checked').value; showToast('见面偏好已保存，不参与筛选'); showView('home'); });
  $('.activity-choices').addEventListener('click', event => { const button = event.target.closest('button'); if (button) button.classList.toggle('selected'); });
  $('#replayList').addEventListener('click', event => { const button = event.target.closest('[data-replay-index]'); if (!button) return; state.candidateIndex = Number(button.dataset.replayIndex); showView('detail'); });
  $('#resultList').addEventListener('change', event => { const checkbox = event.target.closest('[data-result-id]'); if (!checkbox) return; const no = checkbox.dataset.resultId; if (checkbox.checked && state.selectedResults.size >= data.config.batchMax) { checkbox.checked = false; showToast('单次最多选择 5 人'); return; } checkbox.checked ? state.selectedResults.add(no) : state.selectedResults.delete(no); updateUnlockFooter(); });
  $('#unlockSelected').addEventListener('click', requestUnlock);
  $('#recordList').addEventListener('click', event => { if (event.target.closest('[data-view-record]')) showView('results'); if (event.target.closest('[data-reuse-record]')) { setMainTab('ideal'); showView('home'); showToast('已载入有效条件草稿，尚未生成新结果'); } });
  $('#unlockHistory').addEventListener('click', event => { if (event.target.closest('[data-history-profile]')) { state.candidateIndex = 0; showView('detail'); } if (event.target.closest('[data-open-ideal]')) { setMainTab('ideal'); showView('home'); showToast('已返回理想型条件页'); } });
  $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop'))));
  $$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop); }));
  $('#modalConfirm').addEventListener('click', () => { const action = state.pendingConfirm; state.pendingConfirm = null; closeModal($('#confirmModal')); if (action) action(); });
  $('#completeProfile').addEventListener('click', () => { closeModal($('#profileModal')); setProfileComplete(true); });

  renderCandidate(); renderIdealGroups(); renderFilterState(); renderRecords(); renderUnlockHistory(); syncConsole(); setMainTab('recommend');
})();
