import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const htmlDir = join(moduleDir, 'html');
const failures = [];

function check(label, verify) {
  try { verify(); process.stdout.write(`PASS ${label}\n`); }
  catch (error) { failures.push(`${label}: ${error.message}`); process.stdout.write(`FAIL ${label}\n`); }
}
function read(relative) { const file = join(htmlDir, relative); assert.equal(existsSync(file), true, `missing ${relative}`); return readFileSync(file, 'utf8'); }

const required = ['index.html','miniapp.html','admin.html','assets/demo.css','assets/demo-shell.css','assets/demo.js','mock/demo-data.js'];
check('required files exist', () => required.forEach(file => assert.equal(existsSync(join(htmlDir, file)), true, `missing ${file}`)));

const indexHtml = read('index.html');
const mobileHtml = read('miniapp.html');
const adminHtml = read('admin.html');
const css = read('assets/demo.css');
const shellCss = read('assets/demo-shell.css');
const js = read('assets/demo.js');
const mock = read('mock/demo-data.js');
const runtime = `${mobileHtml}\n${css}\n${js}\n${mock}`;

check('all eight active mobile page states are present', () => {
  ['home','filter','detail','waiting','replay','results','records','unlocks'].forEach(view => assert.match(mobileHtml, new RegExp(`data-view=["']${view}["']`), `missing ${view}`));
  assert.equal((mobileHtml.match(/data-view=/g) || []).length, 8);
});
check('retired meeting preference page is absent from Demo runtime', () => {
  ['data-view="meeting"','data-shell-view="meeting"','value="meeting"','data-go="meeting"','saveMeeting','activity-choices','见面偏好'].forEach(text => assert.equal(runtime.includes(text), false, `found ${text}`));
});
check('all pages reuse the shared Demo shell', () => {
  [indexHtml, mobileHtml, adminHtml].forEach(html => assert.match(html, /\.\.\/\.\.\/shared\/base\.css/));
  assert.match(indexHtml, /class="shell"/); assert.match(indexHtml, /class="layout"/); assert.match(indexHtml, /class="side-nav"/);
  assert.match(mobileHtml, /class="shell mobile-shell"/); assert.match(mobileHtml, /data-shell-view="home"/); assert.match(mobileHtml, /class="section-body mobile-stage"/);
  assert.match(adminHtml, /\.\.\/\.\.\/shared\/admin\.css/); assert.match(adminHtml, /class="admin-shell"/); assert.match(adminHtml, /class="admin-nav"/);
  assert.match(shellCss, /--brand:\s*#2563eb/); assert.match(shellCss, /\.phone,\s*\n\.modal-backdrop/);
});
check('recommend and ideal tabs are the only main tabs', () => {
  assert.match(mobileHtml, /data-main-tab="recommend"/); assert.match(mobileHtml, /data-main-tab="ideal"/);
  assert.equal((mobileHtml.match(/data-main-tab=/g) || []).length, 2);
});
check('recommend first screen follows the confirmed Lanhu interaction', () => {
  assert.doesNotMatch(mobileHtml, /class="filter-summary"|id="recommendSummary"/);
  assert.match(mobileHtml, /<button class="candidate-card" id="candidateCard" type="button">/);
  assert.match(js, /\$\('#candidateCard'\)\.addEventListener\('click', openCandidateDetail\)/);
  const actions = mobileHtml.match(/<div class="card-actions"[\s\S]*?<\/div>/)?.[0] || '';
  ['skipCandidate','whisperCandidate','likeCandidate'].forEach(id => assert.match(actions, new RegExp(`id="${id}"`)));
  assert.doesNotMatch(actions, /详情|data-go="detail"/);
});
check('all confirmed recommendation filters exist', () => {
  ['对方所在城市','对方年龄','允许推荐周边城市','身高范围','体重范围','最高学历','家乡','学校','专业'].forEach(text => assert.match(mobileHtml, new RegExp(text)));
  assert.doesNotMatch(mobileHtml, /class="sub-tabs"|data-filter-tab=/);
  assert.match(mobileHtml, /data-filter-panel="basic" class="filter-panel active"/);
  assert.match(mobileHtml, /data-filter-panel="advanced" class="filter-panel active"/);
});
check('detail actions, waiting reasons and replay summary follow confirmed rules', () => {
  ['detailWhisper','reportUser','neverRecommendAction','reportReason','submitReport','waitingMode','waitingVip','candidateMode','replayErrorMode'].forEach(id => assert.match(mobileHtml, new RegExp(`id="${id}"`), `missing ${id}`));
  assert.match(js, /function renderWaiting/); assert.match(js, /下次重置时间/); assert.match(js, /稍后重试/);
  assert.match(mock, /replayDays:/); assert.match(js, /推荐 \$\{day\.recommendedCount\} 人/); assert.match(js, /跳过 \$\{day\.skippedCount\} 人/);
  assert.match(js, /这一天你没来，无推荐嘉宾/); assert.doesNotMatch(js, /今天浏览|昨天跳过/);
});
check('all seventeen ideal conditions exist exactly once in mock definitions', () => {
  const labels = ['身高165+','985/211','博士学历','留学海归','校友','已购房','已购车','独生子女','体制内家庭','本地人','有运动习惯','喜欢小动物','喜欢美食','喜欢旅行','兴趣相似','感情观相合','想2年内结婚'];
  labels.forEach(label => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.equal((mock.match(new RegExp(`\\['[a-z0-9_]+'\\s*,\\s*'${escaped}'`, 'g')) || []).length, 1, `${label} definition count`);
  });
});
check('dependent profile conditions are hidden instead of locked', () => {
  ['school','interest','relationship'].forEach(code => assert.match(mock, new RegExp(`['"]${code}['"]`)));
  assert.match(js, /function dependencyUnavailable/);
  assert.match(js, /function visibleIdealGroups/);
  assert.match(js, /group\.items\.filter/);
  assert.doesNotMatch(runtime, /profileModal|completeProfile|待完善|先完善你的资料|data-dependency/);
});
check('viewer authentication only gates like and whisper actions', () => {
  assert.match(mock, /isCertified:\s*true/);
  ['authMode','authModal','finishAuth'].forEach(id => assert.match(mobileHtml, new RegExp(`id="${id}"`), `missing ${id}`));
  assert.match(js, /function ensureInteractionCertified/);
  assert.match(js, /function setCertified/);
  assert.match(js, /完成认证后请再次点击/);
  assert.doesNotMatch(js, /pendingCertifiedAction|resumeCertifiedAction/);
});
check('target city draft enforces one to three cities and hides add entry at maximum', () => {
  assert.match(mobileHtml, /id="addCity"/);
  assert.match(js, /function addCity/);
  assert.match(js, /state\.filter\.cities\.size\s*>=\s*data\.config\.targetCityMax/);
  assert.match(js, /请至少选择一个城市/);
  assert.match(js, /saveButton\.disabled\s*=\s*!state\.filter\.cities\.size/);
});
check('locked advanced filters hand off to membership and preserve the draft', () => {
  ['vipModal','activateVip'].forEach(id => assert.match(mobileHtml, new RegExp(`id="${id}"`), `missing ${id}`));
  assert.match(js, /function openVipCenter/);
  assert.match(mobileHtml, /高级条件需要时空邂逅会员/);
  assert.match(js, /setVip\(true\)/);
  assert.match(css, /\.advanced-form\.locked\{[^}]*pointer-events\s*:\s*auto/);
});
check('single network failure keeps context and retries through the original action', () => {
  assert.match(mobileHtml, /id="networkMode"/);
  assert.match(js, /function consumeNetworkFailure/);
  assert.match(js, /showToast\('网络错误'\)/);
  assert.match(js, /state\.failNextAction\s*=\s*false/);
});
check('second-round Lanhu answers are represented without adding a ninth PRD-08 page', () => {
  assert.equal((mobileHtml.match(/data-view=/g) || []).length, 8);
  assert.match(mock, /communityCityUrl:\s*['"]\.\.\/\.\.\/05-推荐模块/);
  assert.match(mock, /whisperMessageUrl:\s*['"]\.\.\/\.\.\/03-消息、私信与通知中心/);
  assert.match(mock, /emptyPerson:\s*['"]https:\/\/lanhu-oss-2537-2\.lanhuapp\.com\//);
  assert.match(js, /function handleCandidateUnavailable/);
  assert.match(js, /showToast\('该用户已注销'\)/);
  assert.match(js, /function openFilterBackConfirm/);
  assert.match(js, /是否保存该设置？/);
  assert.match(mobileHtml, /id="modalCancel"/);
  assert.match(js, /cancel:\s*'不保存'/);
  assert.match(js, /当前条件下暂未找到推荐人/);
  assert.match(js, /去千寻同城看看/);
  assert.match(js, /查看失败，请返回后重新查看/);
  assert.match(js, /确认不再推荐/);
  assert.match(js, /window\.location\.assign\(data\.routes\.whisperMessageUrl\)/);
  assert.doesNotMatch(runtime, /将不再收到ta的消息|互相看不到对方的主页和动态|重新发送/);
  assert.doesNotMatch(js, /setInterval\([^)]*nextRecommendResetAt/);
});
check('unlock supports dynamic price, maximum five, balance failure and success', () => {
  assert.match(mock, /unitUnlockPrice:\s*80/); assert.match(mock, /batchMax:\s*5/);
  assert.match(js, /state\.balance < total/); assert.match(js, /千寻币余额不足/); assert.match(js, /解锁成功/); assert.match(js, /VIP 也需要支付/);
  assert.doesNotMatch(mobileHtml, />\s*80\s*</);
});
check('named interaction units exist', () => {
  ['showView','setMainTab','renderCandidate','renderIdealGroups','saveFilter','renderReplay','renderResults','requestUnlock','renderRecords','renderUnlockHistory','escapeHtml'].forEach(name => assert.match(js, new RegExp(`function\\s+${name}`), `missing ${name}`));
});
check('removed product concepts are absent from mobile runtime', () => {
  ['人脸认证','高颜值','收入可观','匹配分','测评结果','算法权重','精选 Tab'].forEach(text => assert.equal(runtime.includes(text), false, `found ${text}`));
});
check('admin page is read-only boundary instead of independent CRUD', () => {
  assert.match(adminHtml, /一期无独立算法配置后台/); assert.match(adminHtml, /系统字典承接/); assert.match(adminHtml, /商业化模块承接/);
  assert.doesNotMatch(adminHtml, />\s*(新增|编辑|删除|发布)\s*</); assert.doesNotMatch(adminHtml, /<input|<select|<textarea/);
});
check('runtime uses real visible controls and no screenshot background', () => {
  assert.match(mobileHtml, /<button/); assert.match(mobileHtml, /type="range"/); assert.match(mobileHtml, /type="checkbox"/);
  assert.doesNotMatch(css, /background-image:\s*url\(/i); assert.doesNotMatch(mobileHtml, /usemap|opacity:\s*0/);
});
check('stable phone dimensions and touch target are defined', () => {
  assert.match(css, /--phone-width:390px/); assert.match(css, /--phone-height:844px/); assert.match(css, /button\{min-height:44px\}/);
});
check('no remote script or stylesheet dependency', () => {
  assert.doesNotMatch(indexHtml + mobileHtml + adminHtml, /<(?:script|link)[^>]+https?:\/\//i); assert.doesNotMatch(js, /\bfetch\s*\(/);
  const urls = [...mock.matchAll(/https?:\/\/([^/'"]+)/g)].map(match => match[1]);
  const allowedHosts = new Set(['images.unsplash.com', 'lanhu-oss-2537-2.lanhuapp.com']);
  assert.ok(urls.every(host => allowedHosts.has(host)), `unexpected hosts ${urls.join(',')}`);
});

if (failures.length) {
  process.stderr.write(`\n${failures.length} verification failure(s):\n`); failures.forEach(failure => process.stderr.write(`- ${failure}\n`)); process.exit(1);
}
process.stdout.write('\nAll PRD-08 static Demo gates passed.\n');
