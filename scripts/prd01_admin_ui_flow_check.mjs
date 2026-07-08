import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const requireFromFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = requireFromFrontend('@playwright/test');

const baseUrl = 'http://127.0.0.1:5173';
const outputFile = path.resolve('docs/测试文档/验收截图/full/prd01-admin-ui-flow-check.md');
const r = (data) => ({ code: 200, msg: 'ok', data });
const pageResult = (records, page, size) => ({
  records: records.slice((page - 1) * size, page * size),
  total: records.length,
  size,
  current: page,
});

const appUsers = Array.from({ length: 12 }, (_, index) => {
  const id = 930001 + index;
  const states = [
    ['APPROVED', 'APPROVED', 'APPROVED', 'NORMAL', 'full_access'],
    ['PENDING', 'APPROVED', 'APPROVED', 'NORMAL', 'browse_only'],
    ['REJECTED', 'PENDING', 'REJECTED', 'NORMAL', 'browse_only'],
    ['NOT_CERTIFIED', 'APPROVED', 'APPROVED', 'FROZEN', 'blocked'],
  ][index % 4];
  return {
    id,
    avatar: '',
    nickname: `验收用户${index + 1}`,
    gender: index % 2 ? 'MALE' : 'FEMALE',
    age: 25 + index,
    school: index % 2 ? '上海交通大学' : '浙江大学',
    realNameStatus: states[0],
    educationStatus: states[1],
    avatarVerifyStatus: states[2],
    firstLoginCompleted: 1,
    profileScore: 60 + index,
    accountStatus: states[3],
    accessStatus: states[4],
    registerTime: '2026.07.08',
    lastLoginTime: '2026.07.08 10:00',
  };
});

const verifyRows = [
  verifyRow(2201, '验收实名待审', 'PENDING', 'MACHINE'),
  verifyRow(2202, '验收实名已过', 'APPROVED', 'MANUAL'),
  verifyRow(2203, '验收实名驳回', 'REJECTED', 'MANUAL'),
  verifyRow(2204, '验收实名冲突', 'CONFLICT', 'MACHINE'),
];
const moderationRows = [
  moderationRow(3301, '验收内容待审', 'PENDING', 'MACHINE'),
  moderationRow(3302, '验收内容已过', 'APPROVED', 'MANUAL'),
  moderationRow(3303, '验收内容驳回', 'REJECTED', 'MANUAL'),
  moderationRow(3304, '验收内容敏感', 'SENSITIVE_HIT', 'MACHINE'),
];

await fs.mkdir(path.dirname(outputFile), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1180 }, deviceScaleFactor: 1 });
const requests = [];

await context.addInitScript(() => {
  localStorage.setItem('token', 'prd01-ui-flow-token');
  localStorage.setItem('auth', JSON.stringify({
    state: { token: 'prd01-ui-flow-token', user: { nickname: '验收账号', permissions: ['*:*:*'] } },
    version: 0,
  }));
});

await mockRoutes(context, requests);

const page = await context.newPage();
page.on('pageerror', (error) => console.error(`[pageerror] ${error.stack || error.message}`));

await checkAppUserPage(page, requests);
await checkAccessConfigPage(page);
await checkVerifyPage(page, requests);
await checkModerationPage(page, requests);

await browser.close();

const report = [
  '# PRD01 管理后台页面交互与页面接口检查',
  '',
  `生成时间：${new Date().toISOString()}`,
  '',
  '| 范围 | 覆盖点 | 结果 |',
  '|------|--------|------|',
  '| App 用户管理 | 查询、分页、卡片/表格、详情、冻结接口、导入接口、导出接口、重算提示 | 通过 |',
  '| 准入配置 | 7 个 Tab、变更日志、保存提示 | 通过 |',
  '| 三类认证审核 | 列表、分页、详情、通过/驳回二次确认、审核接口 | 通过 |',
  '| 两类内容审核 | 列表、分页、详情、通过/驳回二次确认、审核接口 | 通过 |',
  '',
  `接口调用数：${requests.length}`,
  '',
  ...summarizeRequests(requests).map((line) => `- ${line}`),
  '',
].join('\n');

await fs.writeFile(outputFile, report, 'utf8');

console.log(`PRD01_ADMIN_UI_FLOW_CHECK=${outputFile}`);

async function checkAppUserPage(page, requests) {
  await page.goto(`${baseUrl}/users/app`, { waitUntil: 'networkidle' });
  await page.getByText('App 用户管理').waitFor({ state: 'visible' });
  assert.ok(countRequests(requests, 'users.list') >= 1, '用户列表应在页面加载时请求');

  await page.getByPlaceholder('姓名/昵称/手机号/身份证/标签').fill('验收用户');
  await page.getByRole('button', { name: /搜索/ }).click();
  await waitForRequestCount(requests, 'users.list', 2);

  await page.getByRole('button', { name: '2' }).click();
  await waitForUrlRequest(requests, 'users.list', (url) => url.searchParams.get('page') === '2');

  await page.getByRole('button', { name: '表格' }).click();
  await page.getByText('画像详情').first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '卡片' }).click();

  await page.getByRole('button', { name: '详情' }).first().click();
  await page.getByText('画像详情').last().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '冻结账号' }).click();
  await page.getByText('冻结账号确认').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '确认冻结' }).click();
  await waitForRequestCount(requests, 'users.status', 1);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '批量导入' }).click();
  await page.getByText('批量导入 App 用户').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '确认导入' }).click();
  await waitForRequestCount(requests, 'users.import', 1);

  await page.getByRole('button', { name: '导出字段' }).click();
  await page.getByText('导出固定字段确认').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '确认导出' }).click();
  await waitForRequestCount(requests, 'users.export', 1);

  await page.getByRole('button', { name: '重算准入' }).click();
  await page.getByText('已重算当前筛选用户准入状态').waitFor({ state: 'visible' });
}

async function checkAccessConfigPage(page) {
  await page.goto(`${baseUrl}/access/config`, { waitUntil: 'networkidle' });
  for (const tabName of ['准入门槛', '字段配置', '资料完整度', '上传限制', '审核 SLA', '文案配置', '安全策略']) {
    await page.getByRole('button', { name: tabName }).click();
    await page.getByText(tabName).first().waitFor({ state: 'visible' });
  }
  await page.getByRole('button', { name: '查看变更日志' }).click();
  await page.getByText('变更日志').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '准入门槛' }).click();
  await page.getByRole('button', { name: '保存年龄' }).click();
  await page.getByText(/已保存|等待高风险确认|进入待保存状态/).waitFor({ state: 'visible' });
}

async function checkVerifyPage(page, requests) {
  await page.goto(`${baseUrl}/verify/real-name`, { waitUntil: 'networkidle' });
  await page.getByText('实名认证审核').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /搜索/ }).click();
  await waitForRequestCount(requests, 'verify.real-name.list', 2);
  await page.getByRole('button', { name: '2' }).click();
  await waitForUrlRequest(requests, 'verify.real-name.list', (url) => url.searchParams.get('page') === '2');
  await page.getByRole('button', { name: /查看详情|复核|查看|详情/ }).first().click();
  await page.getByText('实名认证详情').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '通过' }).click();
  await page.getByText('通过确认').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '确认' }).click();
  await waitForRequestCount(requests, 'verify.real-name.audit', 1);

  await page.goto(`${baseUrl}/verify/education`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /查看详情|复核|查看|详情/ }).first().click();
  await page.getByText('学历认证详情').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '驳回' }).click();
  await page.getByPlaceholder('请输入驳回原因').fill('验收驳回原因');
  await page.getByRole('button', { name: '确认' }).click();
  await waitForRequestCount(requests, 'verify.education.audit', 1);

  await page.goto(`${baseUrl}/verify/avatar`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /查看详情|复核|查看|详情/ }).first().click();
  await page.getByText('头像认证详情').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '通过' }).click();
  await page.getByRole('button', { name: '确认' }).click();
  await waitForRequestCount(requests, 'verify.avatar.audit', 1);
}

async function checkModerationPage(page, requests) {
  await page.goto(`${baseUrl}/moderation/photos`, { waitUntil: 'networkidle' });
  await page.getByText('资料图片审核').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '2' }).click();
  await waitForUrlRequest(requests, 'moderation.photos.list', (url) => url.searchParams.get('page') === '2');
  await page.getByRole('button', { name: /查看详情|查看大图|复核|查看|详情/ }).first().click();
  await page.getByText('照片审核详情').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '通过' }).click();
  await page.getByRole('button', { name: '确认' }).click();
  await waitForRequestCount(requests, 'moderation.photos.audit', 1);

  await page.goto(`${baseUrl}/moderation/texts`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /查看详情|查看大图|复核|查看|详情/ }).first().click();
  await page.getByText('开放性文字审核详情').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '驳回' }).click();
  await page.getByPlaceholder('请输入驳回原因').fill('验收文本驳回原因');
  await page.getByRole('button', { name: '确认' }).click();
  await waitForRequestCount(requests, 'moderation.texts.audit', 1);
}

async function mockRoutes(context, requests) {
  await context.route('**/api/admin/**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(r([])) }));

  await context.route('**/api/admin/routers**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r([
      section(1, '用户管理', 'Users', [
        item(101, '/users/app', 'App 用户管理', 'Users'),
        item(102, '/access/config', '准入配置', 'Settings'),
        item(103, '/verify/avatar', '头像审核', 'UserCheck'),
        item(104, '/verify/real-name', '实名认证', 'Shield'),
        item(105, '/verify/education', '学历审核', 'ClipboardList'),
      ]),
      section(2, '内容审核', 'ShieldAlert', [
        item(201, '/moderation/photos', '资料图片审核', 'PanelTop'),
        item(202, '/moderation/texts', '开放性文字审核', 'ScrollText'),
      ]),
    ])),
  }));

  await context.route('**/api/admin/users/app/list**', (route) => {
    const url = new URL(route.request().url());
    const page = Number(url.searchParams.get('page') || 1);
    const size = Number(url.searchParams.get('size') || 10);
    requests.push({ name: 'users.list', method: 'GET', url });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r(pageResult(appUsers, page, size))) });
  });
  await context.route('**/api/admin/users/app/*/status', (route) => {
    requests.push({ name: 'users.status', method: route.request().method(), url: new URL(route.request().url()) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r(null)) });
  });
  await context.route('**/api/admin/users/app/import**', (route) => {
    requests.push({ name: 'users.import', method: route.request().method(), url: new URL(route.request().url()) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r({ batchNo: 'IMP-UI-001', message: '导入预校验完成', totalCount: 3, successCount: 2, failCount: 1, duplicateCount: 1, status: 'PRECHECKED' })) });
  });
  await context.route('**/api/admin/users/app/export**', (route) => {
    requests.push({ name: 'users.export', method: route.request().method(), url: new URL(route.request().url()) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r({ taskNo: 'EXP-UI-001', exportType: 'APP_USER_FIXED_FIELDS', status: 'CREATED', message: '导出任务已创建' })) });
  });

  await context.route('**/api/admin/prd01/config**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(r([])) }));

  for (const type of ['real-name', 'education', 'avatar']) {
    await context.route(`**/api/admin/verify/${type}/list**`, (route) => {
      const url = new URL(route.request().url());
      const page = Number(url.searchParams.get('page') || 1);
      const size = Number(url.searchParams.get('size') || 10);
      requests.push({ name: `verify.${type}.list`, method: 'GET', url });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r(pageResult(verifyRows, page, size))) });
    });
    await context.route(`**/api/admin/verify/${type}/*/audit`, (route) => {
      requests.push({ name: `verify.${type}.audit`, method: route.request().method(), url: new URL(route.request().url()) });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r(null)) });
    });
    await context.route(`**/api/admin/verify/${type}/*`, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(r(verifyDetail(type))) }));
  }

  for (const type of ['photos', 'texts']) {
    await context.route(`**/api/admin/moderation/${type}/list**`, (route) => {
      const url = new URL(route.request().url());
      const page = Number(url.searchParams.get('page') || 1);
      const size = Number(url.searchParams.get('size') || 10);
      requests.push({ name: `moderation.${type}.list`, method: 'GET', url });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r(pageResult(moderationRows, page, size))) });
    });
    await context.route(`**/api/admin/moderation/${type}/*/audit`, (route) => {
      requests.push({ name: `moderation.${type}.audit`, method: route.request().method(), url: new URL(route.request().url()) });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r(null)) });
    });
    await context.route(`**/api/admin/moderation/${type}/*`, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(r(moderationDetail(type))) }));
  }
}

function verifyRow(id, nickname, status, auditSource) {
  return {
    id,
    userId: id + 1000,
    avatar: '',
    nickname,
    phone: '138****1234',
    realName: `${nickname.slice(0, 1)}*`,
    idCard: '330********1234',
    educationIdentity: '职场人',
    educationMaterialSummary: '学信网验证码 + 学历材料',
    avatarUrl: '',
    status,
    auditSource,
    rejectReason: status === 'REJECTED' ? '材料不清晰' : '',
    submitTime: '2026-07-08 10:00',
  };
}

function moderationRow(id, nickname, status, auditSource) {
  return {
    id,
    userId: id + 1000,
    avatar: '',
    nickname,
    contentType: 'PROFILE_PHOTO',
    imageType: '相册',
    imageCategory: '相册',
    imageUrl: '',
    textType: 'ABOUT_ME',
    textSummary: '喜欢稳定真诚的关系...',
    contentPreview: '喜欢稳定真诚的关系...',
    status,
    auditSource,
    rejectReason: status === 'REJECTED' ? '存在导流表达' : '',
    submitTime: '2026-07-08 10:00',
  };
}

function verifyDetail(type) {
  return {
    id: 2201,
    userId: 3201,
    nickname: type === 'education' ? '验收学历待审' : type === 'avatar' ? '验收头像待审' : '验收实名待审',
    avatar: '',
    verifyLevel: 1,
    fields: [
      { label: '真实姓名', value: '验收用户' },
      { label: '身份证号', value: '330********1234' },
      { label: '材料', value: type },
    ],
    submitTime: '2026-07-08 10:00',
    resultTime: '',
    rejectReason: '',
    status: 'PENDING',
    auditSource: 'MACHINE',
  };
}

function moderationDetail(type) {
  return {
    id: 3301,
    userId: 4301,
    nickname: type === 'texts' ? '验收文字待审' : '验收图片待审',
    avatar: '',
    contentType: type === 'texts' ? 'ABOUT_ME' : 'PROFILE_PHOTO',
    contentFull: '喜欢稳定真诚的关系，希望认真了解彼此。',
    contentField: type === 'texts' ? '关于我' : '相册图片',
    submitTime: '2026-07-08 10:00',
    status: 'PENDING',
    auditSource: 'MACHINE',
    rejectReason: '',
  };
}

function section(id, title, icon, children) {
  return { id, title, icon, path: null, children };
}

function item(id, path, title, icon) {
  return { id, path, title, icon, children: [] };
}

function countRequests(requests, name) {
  return requests.filter((item) => item.name === name).length;
}

async function waitForRequestCount(requests, name, expected) {
  await waitUntil(() => countRequests(requests, name) >= expected, `${name} count >= ${expected}`);
}

async function waitForUrlRequest(requests, name, predicate) {
  await waitUntil(() => requests.some((item) => item.name === name && predicate(item.url)), `${name} url predicate`);
}

async function waitUntil(predicate, label, timeoutMs = 4000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(`等待超时：${label}`);
}

function summarizeRequests(requests) {
  const grouped = new Map();
  for (const request of requests) {
    const key = `${request.method} ${request.name}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  return Array.from(grouped.entries()).map(([key, count]) => `${key}: ${count}`);
}
