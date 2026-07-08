import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const requireFromFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = requireFromFrontend('@playwright/test');

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5173';
const apiUrl = (process.env.API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const useMock = process.env.PRD01_SCREENSHOT_MOCK === '1';
const adminAccount = process.env.ADMIN_ACCOUNT || 'peter';
const adminPassword = process.env.ADMIN_PASSWORD || '000000';
const outputDir = path.resolve('docs/测试文档/验收截图/full');
const matrixFile = path.join(outputDir, 'prd01-admin-full-screenshot-matrix.md');

const r = (data) => ({ code: 200, msg: 'ok', data });
const pageResult = (records) => ({ records, total: records.length, size: 10, current: 1 });

const appRows = [
  appUser(920001, '筱脑虎', 'FEMALE', 28, '浙江杭州', '职场人', 'APPROVED', 'APPROVED', 'PENDING', 'NORMAL', 'full_access', 92, 7923),
  appUser(920002, '许清越', 'MALE', 29, '上海浦东', '职场人', 'APPROVED', 'APPROVED', 'APPROVED', 'NORMAL', 'full_access', 88, 3680),
  appUser(920003, '林初夏', 'FEMALE', 26, '江苏南京', '职场人', 'REJECTED', 'PENDING', 'REJECTED', 'NORMAL', 'browse_only', 76, 2150),
  appUser(920004, '周慕白', 'MALE', 31, '浙江杭州', '在校生', 'NOT_CERTIFIED', 'APPROVED', 'APPROVED', 'FROZEN', 'blocked', 64, 930),
];

const verifyRows = [
  verifyRow(2001, 920001, '林晓雨', 'PENDING', 'MACHINE', ''),
  verifyRow(2002, 920002, '陈一鸣', 'FACE_FAILED', 'MACHINE', '人像识别失败'),
  verifyRow(2003, 920003, '周语桐', 'APPROVED', 'MANUAL', ''),
  verifyRow(2004, 920004, '王启航', 'REJECTED', 'MANUAL', '材料边缘缺失'),
  verifyRow(2005, 920005, '陆清和', 'CONFLICT', 'MACHINE', '身份证号存在历史绑定'),
];

const photoRows = [
  photoRow(3101, 920001, '周语桐', '相册', '相册', 'PENDING', 'MACHINE', ''),
  photoRow(3102, 920002, '陈一鸣', '背景图', '资料背景图', 'APPROVED', 'MANUAL', ''),
  photoRow(3103, 920003, '陆清和', '相册', '相册', 'REJECTED', 'MANUAL', '图片含联系方式'),
];

const textRows = [
  textRow(3001, 920001, '王启航', '关于我', '喜欢稳定真诚的关系，工作之余会运动、看展...', 'PENDING', 'MACHINE', ''),
  textRow(3002, 920002, '陈一鸣', '希望 TA 了解', '可线下约咖啡，联...', 'SENSITIVE_HIT', 'MACHINE', ''),
  textRow(3003, 920003, '周语桐', '资料问答', '生活方式：不吸烟...', 'APPROVED', 'MANUAL', ''),
  textRow(3004, 920004, '王启航', '关于我', '存在营销导流表述...', 'REJECTED', 'MANUAL', '存在导流表达'),
];

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1180 }, deviceScaleFactor: 1 });
const authToken = useMock ? 'prd01-full-screenshot-token' : await loginAndGetToken(apiUrl, adminAccount, adminPassword);

await context.addInitScript((token) => {
  localStorage.setItem('token', token);
  localStorage.setItem('auth', JSON.stringify({
    state: {
      token,
      user: { nickname: '验收账号', permissions: ['*:*:*'] },
    },
    version: 0,
  }));
}, authToken);

if (useMock) {
  await mockAdminRoutes(context);
}

const page = await context.newPage();
page.on('pageerror', (error) => console.error(`[pageerror] ${error.stack || error.message}`));

const matrix = [];

async function capture(feature, scenario, fileName, routePath, action) {
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'networkidle' });
  await action?.();
  await takeScreenshot(fileName);
  matrix.push({ feature, scenario, fileName });
}

async function takeScreenshot(fileName) {
  const target = path.join(outputDir, fileName);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.screenshot({ path: target, fullPage: false, animations: 'disabled' });
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.waitForTimeout(500);
      await page.setViewportSize({ width: 1440, height: 1180 });
    }
  }
}

async function openFirstDetail() {
  await page.getByRole('button', { name: /查看|复核|详情|查看详情|查看大图|画像详情/ }).first().click();
}

async function openAuditableDetail() {
  for (const name of ['复审', '复核', '查看大图', '查看详情', '查看']) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count()) {
      await button.click();
      return;
    }
  }
  throw new Error('No auditable detail entry found for current page');
}

async function openAuditConfirm(actionName) {
  await page.getByRole('button', { name: actionName }).click();
  await page.getByText(actionName === '通过' ? '通过确认' : '驳回确认').waitFor({ state: 'visible' });
}

async function closeModal() {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
}

await capture('App 用户管理', '卡片列表、查询条件、统计、分页、多状态用户卡片', 'prd01-full-users-card-list.png', '/users/app');
await capture('App 用户管理', '表格列表、列表列、行操作', 'prd01-full-users-table-list.png', '/users/app', async () => {
  await page.getByRole('button', { name: '表格' }).click();
});
await capture('App 用户管理', '用户详情顶部、轻量资料、基础资料、扩展资料', 'prd01-full-users-detail-top.png', '/users/app', async () => {
  await page.getByRole('button', { name: '详情' }).first().click();
  await page.getByText('顶部概览').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '用户详情底部、认证准入、千寻币/VIP、客服风控', 'prd01-full-users-detail-bottom.png', '/users/app', async () => {
  await page.getByRole('button', { name: '详情' }).first().click();
  await page.getByText('顶部概览').waitFor({ state: 'visible' });
  await page.getByText('客服/风控处理记录').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
});
await capture('App 用户管理', '冻结账号二次确认弹窗', 'prd01-full-users-freeze-confirm.png', '/users/app', async () => {
  await page.getByRole('button', { name: '详情' }).first().click();
  await page.getByText('顶部概览').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '冻结账号' }).click();
  await page.getByText('冻结账号确认').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '头像审核弹窗与进入审核列表入口', 'prd01-full-users-avatar-dialog.png', '/users/app', async () => {
  await page.getByRole('button', { name: '头像审核' }).first().click();
  await page.getByText('进入审核列表').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '模块补充弹窗 - 关系反馈 Tab', 'prd01-full-users-module-relation.png', '/users/app', async () => {
  await page.getByRole('button', { name: '模块补充' }).first().click();
  await page.getByText('当前被喜欢').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '模块补充弹窗 - 消息互动 Tab', 'prd01-full-users-module-message.png', '/users/app', async () => {
  await page.getByRole('button', { name: '模块补充' }).first().click();
  await page.getByRole('button', { name: '消息互动 Tab' }).click();
  await page.getByText('消息未读数').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '批量导入弹窗、模板、预校验、确认导入', 'prd01-full-users-import-dialog.png', '/users/app', async () => {
  await page.getByRole('button', { name: '批量导入' }).click();
  await page.getByText('预校验结果').first().waitFor({ state: 'visible' });
});
await capture('App 用户管理', '导出固定字段弹窗、字段范围、审计提示', 'prd01-full-users-export-dialog.png', '/users/app', async () => {
  await page.getByRole('button', { name: '导出字段' }).click();
  await page.getByText('字段范围', { exact: true }).waitFor({ state: 'visible' });
});
await capture('App 用户管理', '重算准入反馈提示', 'prd01-full-users-recalc-toast.png', '/users/app', async () => {
  await page.getByRole('button', { name: '重算准入' }).click();
  await page.waitForTimeout(300);
});

for (const tabName of ['准入门槛', '字段配置', '资料完整度', '上传限制', '审核 SLA', '文案配置', '安全策略']) {
  await capture('准入与认证配置', `${tabName} Tab 主体`, `prd01-full-access-tab-${slug(tabName)}.png`, '/access/config', async () => {
    await page.getByRole('button', { name: tabName }).click();
    await page.getByText(tabName).first().waitFor({ state: 'visible' });
  });
}
await capture('准入与认证配置', '变更日志弹窗/抽屉', 'prd01-full-access-change-log.png', '/access/config', async () => {
  await page.getByRole('button', { name: '查看变更日志' }).click();
  await page.getByText('变更日志抽屉页').waitFor({ state: 'visible' });
});
await capture('准入与认证配置', '保存按钮反馈提示', 'prd01-full-access-save-toast.png', '/access/config', async () => {
  await page.getByRole('button', { name: '保存年龄' }).click();
  await page.waitForTimeout(300);
});

await captureAuditPage('/verify/real-name', '实名认证审核', 'real-name');
await captureAuditPage('/verify/education', '学历认证审核', 'education');
await captureAuditPage('/verify/avatar', '头像认证审核', 'avatar');

await captureModerationPage('/moderation/photos', '资料图片审核', 'profile-photo');
await captureModerationPage('/moderation/texts', '开放性文字审核', 'open-text');

await writeMatrix();
await browser.close();

console.log(`PRD01_ADMIN_FULL_SCREENSHOTS=${outputDir}`);
console.log(`PRD01_ADMIN_FULL_SCREENSHOT_MATRIX=${matrixFile}`);

async function captureAuditPage(routePath, feature, slugName) {
  const detailTitle = {
    'real-name': '实名认证详情',
    education: '学历认证详情',
    avatar: '头像认证详情',
  }[slugName];

  await capture(feature, '列表、查询条件、统计、状态守卫、行操作', `prd01-full-${slugName}-list.png`, routePath);
  await capture(feature, '详情弹窗、认证内容、审核信息', `prd01-full-${slugName}-detail.png`, routePath, async () => {
    await openFirstDetail();
    await page.getByRole('heading', { name: detailTitle }).waitFor({ state: 'visible' });
  });
  await capture(feature, '通过二次确认弹窗', `prd01-full-${slugName}-pass-confirm.png`, routePath, async () => {
    await openAuditableDetail();
    await page.getByRole('heading', { name: detailTitle }).waitFor({ state: 'visible' });
    await openAuditConfirm('通过');
  });
  await capture(feature, '驳回二次确认弹窗与原因输入', `prd01-full-${slugName}-reject-confirm.png`, routePath, async () => {
    await openAuditableDetail();
    await page.getByRole('heading', { name: detailTitle }).waitFor({ state: 'visible' });
    await openAuditConfirm('驳回');
  });
  await closeModal();
}

async function captureModerationPage(routePath, feature, slugName) {
  const detailTitle = {
    'profile-photo': '照片审核详情',
    'open-text': '开放性文字审核详情',
  }[slugName];

  await capture(feature, '列表、查询条件、统计、状态守卫、行操作', `prd01-full-${slugName}-list.png`, routePath);
  await capture(feature, '详情弹窗、审核内容、审核信息', `prd01-full-${slugName}-detail.png`, routePath, async () => {
    await openFirstDetail();
    await page.getByRole('heading', { name: detailTitle }).waitFor({ state: 'visible' });
  });
  await capture(feature, '通过二次确认弹窗', `prd01-full-${slugName}-pass-confirm.png`, routePath, async () => {
    await openAuditableDetail();
    await page.getByRole('heading', { name: detailTitle }).waitFor({ state: 'visible' });
    await openAuditConfirm('通过');
  });
  await capture(feature, '驳回二次确认弹窗与原因输入', `prd01-full-${slugName}-reject-confirm.png`, routePath, async () => {
    await openAuditableDetail();
    await page.getByRole('heading', { name: detailTitle }).waitFor({ state: 'visible' });
    await openAuditConfirm('驳回');
  });
  await closeModal();
}

async function loginAndGetToken(apiBaseUrl, account, password) {
  if (!account || !password) {
    throw new Error('ADMIN_ACCOUNT and ADMIN_PASSWORD are required for real screenshot mode');
  }
  const response = await fetch(`${apiBaseUrl}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.code !== 200 || !payload?.data?.token) {
    throw new Error(`Admin login failed: http=${response.status}, code=${payload?.code ?? 'N/A'}, msg=${payload?.msg ?? 'N/A'}`);
  }
  return payload.data.token;
}

async function mockAdminRoutes(context) {
  await context.route('**/api/admin/**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r([])),
  }));

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

  await context.route('**/api/admin/users/app/list**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r(pageResult(appRows))),
  }));

  await context.route('**/api/admin/users/app/**/freeze', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r(null)),
  }));

  await context.route('**/api/admin/users/app/export**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r({ taskId: 'EXP-20260708-001', message: '导出任务已创建' })),
  }));

  await context.route('**/api/admin/users/app/import**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r({ batchNo: 'IMP-20260708-001', successCount: 274, failCount: 12 })),
  }));

  await context.route('**/api/admin/prd01/config**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r([])),
  }));

  for (const type of ['real-name', 'education', 'avatar']) {
    await context.route(`**/api/admin/verify/${type}/list**`, (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(r(pageResult(verifyRows))),
    }));
    await context.route(`**/api/admin/verify/${type}/2001`, (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(r(verifyDetail(type))),
    }));
  }

  await context.route('**/api/admin/verify/**/audit', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r(null)),
  }));

  await context.route('**/api/admin/moderation/photos/list**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r(pageResult(photoRows))),
  }));
  await context.route('**/api/admin/moderation/texts/list**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r(pageResult(textRows))),
  }));
  await context.route('**/api/admin/moderation/photos/3101', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r(photoDetail()),
  )}));
  await context.route('**/api/admin/moderation/texts/3001', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r(textDetail())),
  }));
  await context.route('**/api/admin/moderation/**/audit', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(r(null)),
  }));
}

function section(id, title, icon, children) {
  return { id, parentId: 0, name: title, path: `/${title}`, component: '', meta: { title, icon }, sort: id, children };
}

function item(id, routePath, title, icon) {
  return { id, parentId: 0, name: title, path: routePath, component: '', meta: { title, icon }, sort: id, children: [] };
}

function appUser(id, nickname, gender, age, city, identity, realNameStatus, educationStatus, avatarVerifyStatus, accountStatus, accessStatus, profileScore, coins) {
  return {
    id,
    avatar: avatar(nickname, '#E8F4FF', '#2876FF'),
    nickname,
    gender,
    age,
    phone: `187****${String(id).slice(-4)}`,
    school: '浙江工商管理大学',
    realNameStatus,
    educationStatus,
    avatarVerifyStatus,
    firstLoginCompleted: 1,
    profileScore,
    accountStatus,
    accessStatus,
    registerTime: '2026.05.16',
    lastLoginTime: '2026.07.07 22:18',
    city,
    identity,
    company: id % 2 === 0 ? '上海海天互联网科技有限公司' : '浙江某某某科技有限公司',
    jobTitle: id % 2 === 0 ? '产品经理' : '工程师',
    coins,
    memberLevel: id % 2 === 0 ? 'VIP' : 'NORMAL',
  };
}

function verifyRow(id, userId, nickname, status, auditSource, rejectReason) {
  return {
    id,
    userId,
    avatar: avatar(nickname, '#EAFBF1', '#22C55E'),
    nickname,
    phone: `13${id % 10}****${String(userId).slice(-4)}`,
    realName: nickname.slice(0, 1) + '*',
    idCard: '1101**********1234',
    educationIdentity: id % 2 === 0 ? '硕士' : '本科',
    educationMaterialSummary: 'CHSI / 浙江大学',
    avatarUrl: avatar(nickname, '#EAFBF1', '#22C55E'),
    status,
    auditSource,
    rejectReason,
    submitTime: '2026-07-07 10:12:00',
  };
}

function photoRow(id, userId, nickname, imageType, imageCategory, status, auditSource, rejectReason) {
  return {
    id,
    userId,
    avatar: avatar(nickname, '#EDF7FF', '#0EA5E9'),
    nickname,
    contentType: '图片',
    imageType,
    imageCategory,
    imageUrl: avatar('图', '#F2F8FF', '#2876FF'),
    contentPreview: avatar('图', '#F2F8FF', '#2876FF'),
    status,
    auditSource,
    rejectReason,
    submitTime: '2026-07-07 12:10:00',
  };
}

function textRow(id, userId, nickname, textType, textSummary, status, auditSource, rejectReason) {
  return {
    id,
    userId,
    avatar: avatar(nickname, '#FFF3E8', '#F59E0B'),
    nickname,
    contentType: '文字',
    textType,
    textSummary,
    contentPreview: textSummary,
    status,
    auditSource,
    rejectReason,
    submitTime: '2026-07-07 11:30:00',
  };
}

function verifyDetail(type) {
  const title = {
    'real-name': '实名认证详情',
    education: '学历认证详情',
    avatar: '头像认证详情',
  }[type];
  return {
    id: 2001,
    userId: 920001,
    nickname: '林晓雨',
    avatar: avatar('林晓雨', '#EAFBF1', '#22C55E'),
    verifyLevel: 2,
    fields: [
      { label: '审核模块', value: title },
      { label: '真实姓名', value: '林*' },
      { label: '身份证号', value: '1101**********1234' },
      { label: '认证方式', value: type === 'education' ? 'CHSI' : 'MACHINE' },
      { label: '认证状态', value: 'PENDING' },
    ],
    submitTime: '2026-07-07 10:12:00',
    resultTime: '',
    rejectReason: '',
    status: 'PENDING',
    auditSource: 'MACHINE',
  };
}

function photoDetail() {
  return {
    id: 3101,
    userId: 920001,
    nickname: '周语桐',
    avatar: avatar('周语桐', '#EDF7FF', '#0EA5E9'),
    contentType: '照片',
    contentField: 'ALBUM',
    contentFull: avatar('图', '#F2F8FF', '#2876FF'),
    submitTime: '2026-07-07 12:10:00',
    status: 'PENDING',
    auditSource: 'MACHINE',
    rejectReason: '',
  };
}

function textDetail() {
  return {
    id: 3001,
    userId: 920001,
    nickname: '王启航',
    avatar: avatar('王启航', '#FFF3E8', '#F59E0B'),
    contentType: '文字',
    contentField: 'ABOUT_ME',
    contentFull: '关于我：喜欢稳定而真诚的关系，工作之余会运动、看展，希望能认真了解彼此。',
    submitTime: '2026-07-07 11:30:00',
    status: 'PENDING',
    auditSource: 'MACHINE',
    rejectReason: '',
  };
}

function avatar(name, bg, color) {
  const label = name.slice(0, 1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="28" fill="${bg}"/><circle cx="120" cy="88" r="38" fill="${color}" opacity=".35"/><path d="M52 210c14-48 48-76 68-76s54 28 68 76" fill="${color}" opacity=".22"/><text x="120" y="105" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="44" font-weight="700" fill="${color}">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function slug(label) {
  return {
    准入门槛: 'access',
    字段配置: 'field',
    资料完整度: 'score',
    上传限制: 'upload',
    '审核 SLA': 'sla',
    文案配置: 'copy',
    安全策略: 'security',
  }[label] ?? label;
}

async function writeMatrix() {
  const lines = [
    '# PRD01 管理后台全量截图矩阵',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    '| 功能 | 场景 | 截图 |',
    '|------|------|------|',
    ...matrix.map((item) => `| ${item.feature} | ${item.scenario} | \`docs/测试文档/验收截图/full/${item.fileName}\` |`),
    '',
    `合计：${matrix.length} 张截图。`,
  ];
  await fs.writeFile(matrixFile, lines.join('\n'), 'utf8');
}
