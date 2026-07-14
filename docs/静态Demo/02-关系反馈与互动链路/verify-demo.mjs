import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const htmlDir = join(moduleDir, 'html');
const failures = [];

function check(label, verify) {
  try {
    verify();
    process.stdout.write(`PASS ${label}\n`);
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    process.stdout.write(`FAIL ${label}\n`);
  }
}

function read(relativePath) {
  const absolutePath = join(htmlDir, relativePath);
  assert.equal(existsSync(absolutePath), true, `missing ${relativePath}`);
  return readFileSync(absolutePath, 'utf8');
}

const requiredFiles = [
  'index.html',
  'miniapp.html',
  'admin.html',
  'assets/demo.css',
  'assets/demo.js',
  'assets/images/heart-person.webp',
  'assets/images/heart-person-blur.webp',
  'assets/images/heart-avatar.webp',
  'assets/images/heart-mutual-likes.png',
  'assets/images/coin-gold.png',
  'mock/demo-data.js'
];

check('required files and current Lanhu assets exist', () => {
  requiredFiles.forEach((file) => {
    assert.equal(existsSync(join(htmlDir, file)), true, `missing ${file}`);
  });
});

const indexHtml = existsSync(join(htmlDir, 'index.html')) ? read('index.html') : '';
const miniappHtml = existsSync(join(htmlDir, 'miniapp.html')) ? read('miniapp.html') : '';
const adminHtml = existsSync(join(htmlDir, 'admin.html')) ? read('admin.html') : '';
const css = existsSync(join(htmlDir, 'assets/demo.css')) ? read('assets/demo.css') : '';
const demoJs = existsSync(join(htmlDir, 'assets/demo.js')) ? read('assets/demo.js') : '';
const mockJs = existsSync(join(htmlDir, 'mock/demo-data.js')) ? read('mock/demo-data.js') : '';
const runtime = `${indexHtml}\n${css}\n${demoJs}\n${mockJs}`;

check('all included page IDs are reachable from the first screen', () => {
  [
    'APP-02-PAGE-likes-me',
    'APP-02-PAGE-recent-viewers',
    'APP-02-PAGE-mutual-matches',
    'APP-02-PAGE-single-unlock-modal',
    'APP-04-PAGE-paywall-modal'
  ].forEach((id) => assert.match(indexHtml, new RegExp(`id=["']${id}["']`), `missing ${id}`));
  ['likes', 'viewers', 'mutual'].forEach((page) => {
    assert.match(indexHtml, new RegExp(`data-page-target=["']${page}["']`), `missing page target ${page}`);
  });
});

check('runtime uses the current heart-message visual baseline', () => {
  assert.match(indexHtml, /data-blueprint=["']heart-message-2026-07-10["']/);
  assert.match(indexHtml, /对我心动/);
  assert.match(indexHtml, /访客/);
  assert.match(indexHtml, /data-mutual-entry/);
  assert.match(css, /--heart-blue:\s*#2876ff/i);
  assert.match(css, /--heart-title:\s*#0c285a/i);
  assert.match(css, /linear-gradient\(90deg,\s*rgba\(233,\s*253,\s*251/i);
  assert.match(mockJs, /heart-person-blur\.webp/);
  assert.match(mockJs, /heart-person\.webp/);
  assert.match(mockJs, /heart-avatar\.webp/);
  assert.doesNotMatch(runtime, /profile-primary|profile-secondary/);
});

check('required states and desktop scenario controls are represented', () => {
  ['normal', 'empty', 'loading', 'core-blocked', 'network-error', 'vip-expired'].forEach((mode) => {
    assert.match(indexHtml, new RegExp(`value=["']${mode}["']`), `missing mode ${mode}`);
  });
  assert.match(indexHtml, /data-balance-mode/);
  assert.match(indexHtml, /data-pay-result-mode/);
  assert.match(indexHtml, /data-action=["']refresh["']/);
  assert.match(demoJs, /data-action=\\?['"]load-more/);
  assert.match(indexHtml, /data-bottom-tab=["']heart["']/);
  assert.match(indexHtml, /aria-live=["']polite["']/);
});

check('coin failure remains retryable without mutating assets', () => {
  assert.match(indexHtml, /data-pay-result=["']failure["']/);
  assert.match(demoJs, /payShouldFail:\s*false/);
  assert.match(demoJs, /state\.payShouldFail/);
  assert.match(demoJs, /button\.disabled\s*=\s*false/);
  assert.match(demoJs, /showToast\([^\n]+['"]error['"]\)/);
});

check('core access block removes relationship content from every page', () => {
  assert.match(demoJs, /function\s+clearRelationshipContentForCoreBlock/);
  assert.match(demoJs, /qsa\(['"]\[data-page-content\]["']\)/);
  assert.match(demoJs, /Object\.keys\(state\.pageMode\)/);
});

check('single unlock copy follows current PRD', () => {
  assert.match(indexHtml, /解锁Ta是谁/);
  assert.match(indexHtml, /data-action=["']unlock-one["']/);
  assert.match(indexHtml, /data-action=["']unlock-all["']/);
  assert.match(mockJs, /送出喜欢，即刻开聊/);
  assert.match(mockJs, /看看是谁来过你/);
});

check('price is dynamic and the current visual demo value is configured once', () => {
  assert.match(mockJs, /likes_unlock_one\s*:\s*100/);
  assert.match(mockJs, /viewers_unlock_one\s*:\s*100/);
  assert.doesNotMatch(indexHtml, /100\s*(?:Q|千寻币)/i);
  assert.match(demoJs, /DemoData\.config\.prices/);
  assert.match(indexHtml, /data-unlock-price/);
});

check('private blurred cards never depend on a clear source image', () => {
  assert.match(mockJs, /blurAvatar:\s*['"]assets\/images\/heart-person-blur\.webp['"]/);
  assert.match(mockJs, /blurPhoto:\s*['"]assets\/images\/heart-person-blur\.webp['"]/);
  assert.match(demoJs, /record\.blurPhoto/);
  assert.match(demoJs, /record\.blurAvatar/);
});

check('visible records are filtered before rendering', () => {
  assert.match(demoJs, /function\s+filterVisibleRecords/);
  assert.match(demoJs, /status\s*===\s*['"]active['"]/);
  assert.match(demoJs, /status\s*===\s*['"]visible['"]/);
  assert.match(demoJs, /status\s*===\s*['"]matched['"]/);
  assert.match(mockJs, /status:\s*['"]invalid['"]/);
  assert.match(mockJs, /status:\s*['"]cancelled['"]/);
});

check('unlock, recovery, and rendering have named implementation units', () => {
  [
    'renderCurrentPage',
    'renderLikes',
    'renderViewers',
    'renderMutual',
    'openSingleUnlock',
    'openPaywall',
    'confirmCoinUnlock',
    'setDemoMode',
    'escapeHtml'
  ].forEach((name) => assert.match(demoJs, new RegExp(`function\\s+${name}`), `missing ${name}`));
});

check('removed product UI is absent from the runtime', () => {
  [
    'matchSuccessModal',
    '匹配成功弹窗',
    '海量曝光',
    '10倍曝光',
    'data-filter-chip',
    'data-mode="invalid"',
    'data-open-relation-modal'
  ].forEach((forbidden) => assert.equal(indexHtml.includes(forbidden), false, `found ${forbidden}`));
});

check('mutual match runtime only offers profile viewing', () => {
  assert.match(indexHtml, /data-mutual-list/);
  assert.match(demoJs, /查看主页/);
  assert.doesNotMatch(indexHtml, /data-action=["']chat["']/);
  assert.doesNotMatch(indexHtml, />\s*(?:去聊天|聊天)\s*</);
});

check('legacy entry and admin boundary remain accurate', () => {
  assert.match(miniappHtml, /index\.html#likes/);
  assert.match(adminHtml, /本轮不纳入静态 Demo/);
  assert.match(adminHtml, /后台能力 PRD 保留/);
  assert.match(adminHtml, /index\.html#likes/);
  assert.doesNotMatch(adminHtml, /关系反馈配置页[^\n]*可配置/);
});

check('layout has stable mobile dimensions and touch targets', () => {
  assert.match(css, /--phone-width:\s*390px/);
  assert.match(css, /--phone-height:\s*844px/);
  assert.match(css, /--design-width:\s*375/);
  assert.match(css, /min-height:\s*44px/);
  assert.doesNotMatch(css, /letter-spacing:\s*-/);
});

check('static package has no real API or external runtime dependency', () => {
  assert.doesNotMatch(indexHtml, /<script[^>]+https?:\/\//i);
  assert.doesNotMatch(indexHtml, /<link[^>]+https?:\/\//i);
  assert.doesNotMatch(demoJs, /\bfetch\s*\(/);
  assert.doesNotMatch(mockJs, /https?:\/\//);
});

if (failures.length > 0) {
  process.stderr.write(`\n${failures.length} verification failure(s):\n`);
  failures.forEach((failure) => process.stderr.write(`- ${failure}\n`));
  process.exit(1);
}

process.stdout.write('\nAll static Demo gates passed.\n');
