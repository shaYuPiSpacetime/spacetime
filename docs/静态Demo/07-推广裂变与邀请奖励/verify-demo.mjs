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

function read(relative) {
  const file = join(htmlDir, relative);
  assert.equal(existsSync(file), true, `missing ${relative}`);
  return readFileSync(file, 'utf8');
}

const required = ['index.html', 'miniapp.html', 'admin.html', 'assets/demo.css', 'assets/demo.js', 'mock/demo-data.js'];
check('required implementation files exist', () => required.forEach(file => assert.equal(existsSync(join(htmlDir, file)), true, `missing ${file}`)));

let indexHtml = '';
let mobileHtml = '';
let adminHtml = '';
let css = '';
let js = '';
let mock = '';
check('implementation files are readable', () => {
  indexHtml = read('index.html'); mobileHtml = read('miniapp.html'); adminHtml = read('admin.html');
  css = read('assets/demo.css'); js = read('assets/demo.js'); mock = read('mock/demo-data.js');
});

check('three mobile pages are present', () => {
  ['home', 'records', 'rules'].forEach(view => assert.match(mobileHtml, new RegExp(`data-view=["']${view}["']`), `missing mobile ${view}`));
});

check('five admin menu pages are present', () => {
  ['promo-rule-config', 'invite-relation-list', 'invite-reward-list', 'agent-list', 'agent-settlement']
    .forEach(page => {
      assert.match(adminHtml, new RegExp(`data-admin-page=["']${page}["']`), `missing admin ${page}`);
      assert.match(adminHtml, new RegExp(`href=["']#${page}["']`), `missing hash link ${page}`);
    });
  ['invite-relation-detail', 'invite-reward-frozen', 'agent-detail', 'promo-material'].forEach(page => {
    assert.doesNotMatch(adminHtml, new RegExp(`data-admin-page=["']${page}["']`), `obsolete admin page ${page}`);
    assert.doesNotMatch(adminHtml, new RegExp(`href=["']#${page}["']`), `obsolete admin link ${page}`);
  });
  ['relation-detail', 'agent-detail'].forEach(drawer => assert.match(adminHtml, new RegExp(`data-drawer=["']${drawer}["']`), `missing drawer ${drawer}`));
  assert.match(adminHtml, /data-modal=["']qrcode["']/);
});

check('shared Demo shells are reused', () => {
  [indexHtml, mobileHtml, adminHtml].forEach(html => assert.match(html, /\.\.\/\.\.\/shared\/base\.css/));
  assert.match(adminHtml, /\.\.\/\.\.\/shared\/admin\.css/);
  assert.match(adminHtml, /\.\.\/\.\.\/shared\/admin-state\.css/);
  assert.match(indexHtml, /class="[^"]*\bshell\b[^"]*"/); assert.match(mobileHtml, /class="shell mobile-shell"/); assert.match(adminHtml, /class="admin-shell"/);
});

check('mobile requirements and states are covered', () => {
  ['累计邀请成功', '累计到账', '下一阶梯', '邀请二维码', '邀请码', '最近邀请', '全部', '待发放', '已发放', '发放失败', '什么算邀请成功', '完成注册即成功', '关系永久有效', '内容配置：PRD-06', '业务规则：PRD-07', '当前内容加载失败，正在展示最近成功版本']
    .forEach(text => assert.match(mobileHtml, new RegExp(text), `missing ${text}`));
  ['normal', 'empty', 'qr-fail', 'reward-failed', 'h5-cache', 'h5-unavailable'].forEach(state => assert.match(mobileHtml + js, new RegExp(state), `missing state ${state}`));
  assert.match(mobileHtml, /data-h5-content="invite-rules"/);
  ['冻结', '无效'].forEach(text => assert.doesNotMatch(mobileHtml, new RegExp(text), `obsolete mobile text ${text}`));
});

check('admin core fields and tabs are covered', () => {
  ['普通邀请奖励', '推广员奖励', '固定奖励', '阶梯奖励', '阶梯奖励为命中档位时的一次性额外奖励', '累计5人奖励50千寻币', '第5人奖励20+50=70千寻币', '当前已发放奖励', '普通用户', '校园代理', '保存成图片', '复制', '确定结算']
    .forEach(text => assert.equal((adminHtml + js).includes(text), true, `missing ${text}`));
  ['关系归属规则', '风控参数', '邀请有效期', '单用户每日封顶', '推广员分组', '打款流水', '登记打款', '推广素材管理', '冻结奖励处理'].forEach(text => {
    assert.doesNotMatch(adminHtml, new RegExp(text), `obsolete admin text ${text}`);
  });
});

check('real controls and interaction units exist', () => {
  assert.match(mobileHtml, /<button/); assert.match(adminHtml, /<input/); assert.match(adminHtml, /<select/); assert.match(adminHtml, /<button/);
  ['showMobileView', 'setMobileState', 'setInviteRulesH5State', 'routeAdminPage', 'filterRelations', 'savePromoRules', 'toggleRewardMode', 'openRelationDrawer', 'openAgentDrawer', 'openQrModal', 'downloadQrCode', 'copyQrCode', 'confirmSettlement', 'showToast']
    .forEach(name => assert.match(js, new RegExp(`function\\s+${name}`), `missing ${name}`));
});

check('mock covers every business collection', () => {
  ['config', 'mobile', 'relations', 'rewards', 'agents', 'settlements', 'auditLogs']
    .forEach(key => assert.match(mock, new RegExp(`${key}:`), `missing mock ${key}`));
  assert.doesNotMatch(mock, /materials:/);
  assert.match(mock, /window\.PRD07_DATA/);
});

check('runtime has stable dimensions and no screenshot trick', () => {
  assert.match(css, /--phone-width:\s*390px/); assert.match(css, /--phone-height:\s*844px/); assert.match(css, /min-height:\s*44px/);
  assert.doesNotMatch(css + mobileHtml + adminHtml, /opacity:\s*0|usemap|background-image:\s*url\(/i);
});

check('no real network or remote runtime dependency', () => {
  assert.doesNotMatch(indexHtml + mobileHtml + adminHtml, /<(?:script|link)[^>]+https?:\/\//i);
  assert.doesNotMatch(js, /\bfetch\s*\(/);
  assert.doesNotMatch(mock, /https?:\/\//);
});

if (failures.length) {
  process.stderr.write(`\n${failures.length} verification failure(s):\n`);
  failures.forEach(failure => process.stderr.write(`- ${failure}\n`));
  process.exit(1);
}

process.stdout.write('\nAll PRD-07 static Demo gates passed.\n');
