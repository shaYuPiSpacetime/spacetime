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

check('all nine mobile page states are present', () => {
  ['home','filter','meeting','detail','waiting','replay','results','records','unlocks'].forEach(view => assert.match(mobileHtml, new RegExp(`data-view=["']${view}["']`), `missing ${view}`));
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
check('all confirmed recommendation filters exist', () => {
  ['对方所在城市','对方年龄','允许推荐周边城市','身高范围','体重范围','最高学历','家乡','学校','专业'].forEach(text => assert.match(mobileHtml, new RegExp(text)));
});
check('all seventeen ideal conditions exist exactly once in mock definitions', () => {
  const labels = ['身高165+','985/211','博士学历','留学海归','校友','已购房','已购车','独生子女','体制内家庭','本地人','有运动习惯','喜欢小动物','喜欢美食','喜欢旅行','兴趣相似','感情观相合','想2年内结婚'];
  labels.forEach(label => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.equal((mock.match(new RegExp(`\\['[a-z0-9_]+'\\s*,\\s*'${escaped}'`, 'g')) || []).length, 1, `${label} definition count`);
  });
});
check('dependent profile conditions have explicit dependency codes', () => {
  ['school','interest','relationship'].forEach(code => assert.match(mock, new RegExp(`['"]${code}['"]`)));
  assert.match(js, /function dependencyUnavailable/); assert.match(js, /profileModal/);
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
  assert.match(mobileHtml, /<button/); assert.match(mobileHtml, /type="range"/); assert.match(mobileHtml, /type="checkbox"/); assert.match(mobileHtml, /type="radio"/);
  assert.doesNotMatch(css, /background-image:\s*url\(/i); assert.doesNotMatch(mobileHtml, /usemap|opacity:\s*0/);
});
check('stable phone dimensions and touch target are defined', () => {
  assert.match(css, /--phone-width:390px/); assert.match(css, /--phone-height:844px/); assert.match(css, /button\{min-height:44px\}/);
});
check('no remote script or stylesheet dependency', () => {
  assert.doesNotMatch(indexHtml + mobileHtml + adminHtml, /<(?:script|link)[^>]+https?:\/\//i); assert.doesNotMatch(js, /\bfetch\s*\(/);
  const urls = [...mock.matchAll(/https?:\/\/([^/'"]+)/g)].map(match => match[1]); assert.ok(urls.every(host => host === 'images.unsplash.com'), `unexpected hosts ${urls.join(',')}`);
});

if (failures.length) {
  process.stderr.write(`\n${failures.length} verification failure(s):\n`); failures.forEach(failure => process.stderr.write(`- ${failure}\n`)); process.exit(1);
}
process.stdout.write('\nAll PRD-08 static Demo gates passed.\n');
