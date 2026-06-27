import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

const requiredFiles = [
  'frontend/index.html',
  'frontend/mobile.html',
  'frontend/admin.html',
  'frontend/assets/demo.css',
  'frontend/assets/demo.js',
  'frontend/mock/demo-data.js',
  'backend/mock-server.mjs',
  'backend/mock-data.mjs',
  'backend/api-contract.md',
  'README.md',
  '技术方案.md',
  '验收报告.md',
  '截图证据/index-desktop.png',
  '截图证据/mobile-triple-flow.png',
  '截图证据/admin-audit-drawer.png',
];

const requiredMobilePages = [
  'APP-01-PAGE-login-auth',
  'APP-01-PAGE-light-gender',
  'APP-01-PAGE-light-birthday',
  'APP-01-PAGE-light-identity',
  'APP-01-PAGE-light-education',
  'APP-01-PAGE-light-location',
  'APP-01-PAGE-verify-basic',
  'APP-01-PAGE-verify-avatar',
  'APP-01-PAGE-verify-intro',
  'APP-01-PAGE-verify-triple',
  'APP-01-PAGE-real-name',
  'APP-01-PAGE-education',
  'APP-01-PAGE-core-access-block',
  'APP-01-PAGE-profile-edit-home',
  'APP-01-PAGE-profile-basic-edit',
  'APP-01-PAGE-profile-extended-edit',
];

const requiredAdminPages = [
  'ADM-01-PAGE-app-user-management',
  'ADM-01-PAGE-access-config',
  'ADM-01-PAGE-avatar-audit',
  'ADM-01-PAGE-real-name-audit',
  'ADM-01-PAGE-education-audit',
  'ADM-01-PAGE-profile-photo-audit',
  'ADM-01-PAGE-open-text-audit',
];

const requiredSnippets = {
  'frontend/index.html': [
    '移动端 / 管理后台 / 接口说明 / 技术方案',
    '端到端闭环',
    'mobile.html',
    'admin.html',
    '../backend/api-contract.md',
    '../技术方案.md',
  ],
  'frontend/mobile.html': [
    '移动端用户旅程',
    '用户协议和隐私政策',
    '手机号验证码',
    'data-flow-progress',
    'data-core-gaps',
    'data-flow-action',
    'data-next-page',
    'data-mobile-page',
    '身份证号',
    '单身承诺',
    '0/4',
    '暂不支持认证',
    '完成三重认证后才可使用该功能',
    '资料完整度',
    '语音介绍',
    '模拟三重认证通过',
  ],
  'frontend/admin.html': [
    'App 用户管理',
    '认证审核队列',
    '头像认证审核',
    '实名认证审核',
    '学历认证审核',
    '资料图片审核',
    '开放性文字审核',
    '准入门槛',
    '字段配置',
    '资料完整度',
    '批量导入 App 用户',
    '导出固定字段且不掩码',
    '画像详情',
    '审核详情',
    '变更日志',
    '每页 10 条',
    'data-admin-page',
    'data-open-drawer',
    'data-open-modal',
    'data-audit-type',
  ],
  'frontend/assets/demo.js': [
    'showToast',
    'openModal',
    'openDrawer',
    'renderUserCards',
    'renderAuditRows',
    'renderAuditDetail',
    'applyMiniFlowAction',
    'renderMobileStatus',
  ],
  'frontend/mock/demo-data.js': [
    'window.BOBO_DEMO',
    'users',
    'audits',
    'profile',
    'verification',
    'accessConfig',
    'mobileSteps',
    'auditStats',
  ],
  'backend/api-contract.md': [
    'GET /api/admin/users',
    'GET /api/admin/users/:id',
    'GET /api/admin/audits?type=avatar|realName|education',
    'GET /api/admin/access-config',
    'GET /api/miniapp/profile',
    'GET /api/miniapp/verification/status',
    'POST /api/demo/action',
  ],
};

const forbiddenPatterns = [
  /https?:\/\/(?!localhost|127\.0\.0\.1)/i,
  /sk-[A-Za-z0-9]/,
  /api[_-]?key/i,
  new RegExp(`author${'ization'}`, 'i'),
  new RegExp(`bear${'er'}`, 'i'),
];

const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`缺少文件：${relativePath}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

for (const file of requiredFiles) read(file);

const index = read('frontend/index.html');
for (const link of ['mobile.html', 'admin.html', '../backend/api-contract.md', '../技术方案.md']) {
  if (!index.includes(link)) failures.push(`frontend/index.html 缺少入口链接：${link}`);
}

const mobile = read('frontend/mobile.html');
for (const pageId of requiredMobilePages) {
  if (!mobile.includes(`id="${pageId}"`)) failures.push(`frontend/mobile.html 缺少移动端页面：${pageId}`);
  if (!mobile.includes(`data-mobile-page="${pageId}"`)) failures.push(`frontend/mobile.html 缺少移动端导航：${pageId}`);
}

const admin = read('frontend/admin.html');
for (const pageId of requiredAdminPages) {
  if (!admin.includes(`id="${pageId}"`)) failures.push(`frontend/admin.html 缺少后台页面：${pageId}`);
  if (!admin.includes(`data-admin-page="${pageId}"`)) failures.push(`frontend/admin.html 缺少后台导航：${pageId}`);
}

for (const [file, snippets] of Object.entries(requiredSnippets)) {
  const content = read(file);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${file} 缺少关键内容：${snippet}`);
  }
}

for (const file of requiredFiles) {
  if (file.endsWith('.png')) continue;
  const content = read(file);
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) failures.push(`${file} 命中禁止内容：${pattern}`);
  }
  const trailingLine = content.split('\n').findIndex((line) => /[ \t]+$/.test(line));
  if (trailingLine >= 0) failures.push(`${file} 第 ${trailingLine + 1} 行存在尾部空格`);
}

if (failures.length > 0) {
  console.error('bobo_demo verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('bobo_demo verification passed.');
