import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

const requiredFiles = [
  'index.html',
  'miniapp.html',
  'admin.html',
  'assets/demo.css',
  'assets/demo.js',
  'mock/demo-data.js',
];

const requiredMiniPages = [
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
  'miniapp.html': [
    '用户协议和隐私政策',
    '身份证号',
    '单身承诺',
    '0/4',
    '暂不支持认证',
    '完成三重认证后才可使用该功能',
    '资料完整度',
    '语音介绍',
    'data-open-modal',
    '模拟三重认证通过',
    'data-core-gaps',
    'data-status-education',
    'data-status-real-name',
    'data-flow-progress',
    'data-next-page',
    'data-flow-action',
    'data-mobile-page',
    '移动端用户旅程',
  ],
  'admin.html': [
    'App 用户管理',
    '批量导入 App 用户',
    '导出固定字段且不掩码',
    '画像详情',
    '准入门槛',
    '字段配置',
    '资料完整度',
    '审核通过-机审',
    '人工复核',
    '每页 10 条',
    'data-open-drawer',
    'data-open-modal',
    'data-admin-page',
    '查询条件',
    '头部数据统计',
    '列表字段',
    '详情字段',
    '分页',
    '可配置',
    '不可配置',
    '配置项',
    '当前值',
    '修改权限',
    '查看详情',
    '编辑备注',
    '冻结账号',
    'data-open-drawer="auditDrawer"',
  ],
  'assets/demo.js': [
    'showToast',
    'openModal',
    'openDrawer',
    'renderAuditRows',
    'renderUserCards',
    'renderAuditDetail',
    'applyMiniFlowAction',
  ],
};

const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

for (const file of requiredFiles) read(file);

const index = read('index.html');
for (const href of ['miniapp.html', 'admin.html']) {
  if (!index.includes(href)) failures.push(`index.html missing link to ${href}`);
}

const mini = read('miniapp.html');
for (const pageId of requiredMiniPages) {
  if (!mini.includes(`id="${pageId}"`)) failures.push(`miniapp.html missing page ${pageId}`);
  if (!mini.includes(`href="#${pageId}"`)) failures.push(`miniapp.html missing navigation href for ${pageId}`);
}

const admin = read('admin.html');
for (const pageId of requiredAdminPages) {
  if (!admin.includes(`id="${pageId}"`)) failures.push(`admin.html missing page ${pageId}`);
  if (!admin.includes(`href="#${pageId}"`)) failures.push(`admin.html missing navigation href for ${pageId}`);
}

for (const [file, snippets] of Object.entries(requiredSnippets)) {
  const content = read(file);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${file} missing required snippet: ${snippet}`);
  }
}

const data = read('mock/demo-data.js');
for (const key of ['window.DEMO_DATA', 'adminUsers', 'auditQueues', 'configTabs', 'miniUser']) {
  if (!data.includes(key)) failures.push(`mock/demo-data.js missing ${key}`);
}

if (failures.length > 0) {
  console.error('Static demo verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Static demo verification passed.');