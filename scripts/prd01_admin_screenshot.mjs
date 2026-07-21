import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const requireFromFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = requireFromFrontend('@playwright/test');

const baseUrl = 'http://127.0.0.1:5173';
const outputDir = path.resolve('docs/测试文档/验收截图');

const r = (data) => ({ code: 200, msg: 'ok', data });

const pageResult = (records) => ({
  records,
  total: records.length,
  size: 10,
  current: 1,
});

const verifyRows = [
  {
    id: 2001,
    userId: 920001,
    avatar: avatar('林晓雨', '#E8F4FF', '#2876FF'),
    nickname: '林晓雨',
    phone: '138****8000',
    realName: '林*雨',
    idCard: '1101**********1234',
    educationIdentity: '本科',
    educationMaterialSummary: 'CHSI / 浙江大学',
    avatarUrl: avatar('林晓雨', '#E8F4FF', '#2876FF'),
    status: 'PENDING',
    auditSource: 'MACHINE',
    rejectReason: '',
    submitTime: '2026-07-07 10:12:00',
  },
  {
    id: 2002,
    userId: 920002,
    avatar: avatar('陈一鸣', '#FFF3E8', '#F59E0B'),
    nickname: '陈一鸣',
    phone: '139****2831',
    realName: '陈*鸣',
    idCard: '3101**********8891',
    educationIdentity: '硕士',
    educationMaterialSummary: '学生证 / 上海交通大学',
    avatarUrl: avatar('陈一鸣', '#FFF3E8', '#F59E0B'),
    status: 'FACE_FAILED',
    auditSource: 'MACHINE',
    rejectReason: '人像识别失败',
    submitTime: '2026-07-07 09:44:00',
  },
  {
    id: 2003,
    userId: 920003,
    avatar: avatar('周语桐', '#EAFBF1', '#22C55E'),
    nickname: '周语桐',
    phone: '137****6612',
    realName: '周*桐',
    idCard: '3301**********6655',
    educationIdentity: '本科',
    educationMaterialSummary: 'CHSI / 浙江大学',
    avatarUrl: avatar('周语桐', '#EAFBF1', '#22C55E'),
    status: 'APPROVED',
    auditSource: 'MANUAL',
    rejectReason: '',
    submitTime: '2026-07-06 18:01:00',
  },
  {
    id: 2004,
    userId: 920004,
    avatar: avatar('王启航', '#F5EDFF', '#8B5CF6'),
    nickname: '王启航',
    phone: '136****5509',
    realName: '王*航',
    idCard: '1101**********7788',
    educationIdentity: '硕士',
    educationMaterialSummary: '毕业证编号 / 复旦大学',
    avatarUrl: avatar('王启航', '#F5EDFF', '#8B5CF6'),
    status: 'REJECTED',
    auditSource: 'MANUAL',
    rejectReason: '材料边缘缺失',
    submitTime: '2026-07-06 16:30:00',
  },
  {
    id: 2005,
    userId: 920005,
    avatar: avatar('陆清和', '#EDF7FF', '#0EA5E9'),
    nickname: '陆清和',
    phone: '135****2290',
    realName: '陆*和',
    idCard: '4401**********9910',
    educationIdentity: '本科',
    educationMaterialSummary: 'CHSI / 南京大学',
    avatarUrl: avatar('陆清和', '#EDF7FF', '#0EA5E9'),
    status: 'CONFLICT',
    auditSource: 'MACHINE',
    rejectReason: '身份证号存在历史绑定',
    submitTime: '2026-07-06 15:08:00',
  },
];

const appRows = [
  {
    id: 920001,
    avatar: avatar('筱脑虎', '#E8F4FF', '#2876FF'),
    nickname: '筱脑虎',
    gender: 'FEMALE',
    age: 28,
    school: '浙江工商管理大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'PENDING',
    firstLoginCompleted: 1,
    profileScore: 92,
    accountStatus: 'NORMAL',
    accessStatus: 'full_access',
    registerTime: '2026.05.16',
    lastLoginTime: '2026.06.26 22:18',
  },
  {
    id: 920002,
    avatar: avatar('许清越', '#FFF3E8', '#F59E0B'),
    nickname: '许清越',
    gender: 'MALE',
    age: 29,
    school: '上海交通大学',
    realNameStatus: 'APPROVED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'APPROVED',
    firstLoginCompleted: 1,
    profileScore: 88,
    accountStatus: 'NORMAL',
    accessStatus: 'full_access',
    registerTime: '2026.05.18',
    lastLoginTime: '2026.06.27 09:41',
  },
  {
    id: 920003,
    avatar: avatar('林初夏', '#F5EDFF', '#8B5CF6'),
    nickname: '林初夏',
    gender: 'FEMALE',
    age: 26,
    school: '南京大学',
    realNameStatus: 'REJECTED',
    educationStatus: 'PENDING',
    avatarVerifyStatus: 'REJECTED',
    firstLoginCompleted: 1,
    profileScore: 76,
    accountStatus: 'NORMAL',
    accessStatus: 'browse_only',
    registerTime: '2026.05.20',
    lastLoginTime: '2026.06.26 19:26',
  },
  {
    id: 920004,
    avatar: avatar('周慕白', '#EAFBF1', '#22C55E'),
    nickname: '周慕白',
    gender: 'MALE',
    age: 31,
    school: '复旦大学',
    realNameStatus: 'NOT_CERTIFIED',
    educationStatus: 'APPROVED',
    avatarVerifyStatus: 'APPROVED',
    firstLoginCompleted: 0,
    profileScore: 64,
    accountStatus: 'FROZEN',
    accessStatus: 'blocked',
    registerTime: '2026.05.22',
    lastLoginTime: '2026.06.25 13:18',
  },
];

const photoRows = [
  {
    id: 3101,
    userId: 920001,
    avatar: avatar('周语桐', '#E8F4FF', '#2876FF'),
    nickname: '周语桐',
    contentType: '图片',
    imageType: '相册',
    imageCategory: '相册',
    imageUrl: avatar('图', '#F2F8FF', '#2876FF'),
    contentPreview: avatar('图', '#F2F8FF', '#2876FF'),
    status: 'PENDING',
    auditSource: 'MACHINE',
    rejectReason: '',
    submitTime: '2026-07-07 12:10:00',
  },
  {
    id: 3102,
    userId: 920002,
    avatar: avatar('陈一鸣', '#FFF3E8', '#F59E0B'),
    nickname: '陈一鸣',
    contentType: '图片',
    imageType: '背景图',
    imageCategory: '资料背景图',
    imageUrl: avatar('景', '#FFF7ED', '#F97316'),
    contentPreview: avatar('景', '#FFF7ED', '#F97316'),
    status: 'APPROVED',
    auditSource: 'MANUAL',
    rejectReason: '',
    submitTime: '2026-07-07 10:02:00',
  },
  {
    id: 3103,
    userId: 920003,
    avatar: avatar('陆清和', '#EDF7FF', '#0EA5E9'),
    nickname: '陆清和',
    contentType: '图片',
    imageType: '相册',
    imageCategory: '相册',
    imageUrl: avatar('照', '#EEF2FF', '#6366F1'),
    contentPreview: avatar('照', '#EEF2FF', '#6366F1'),
    status: 'REJECTED',
    auditSource: 'MANUAL',
    rejectReason: '图片含联系方式',
    submitTime: '2026-07-06 18:02:00',
  },
];

const textRows = [
  {
    id: 3001,
    userId: 920001,
    avatar: avatar('王启航', '#FFF3E8', '#F59E0B'),
    nickname: '王启航',
    contentType: '文字',
    textType: '关于我',
    textSummary: '喜欢稳定真诚的关系...',
    contentPreview: '关于我：喜欢稳定真诚的关系...',
    status: 'PENDING',
    auditSource: 'MACHINE',
    rejectReason: '',
    submitTime: '2026-07-07 11:30:00',
  },
  {
    id: 3002,
    userId: 920002,
    avatar: avatar('陈一鸣', '#FFF3E8', '#F59E0B'),
    nickname: '陈一鸣',
    contentType: '文字',
    textType: '资料问答',
    textSummary: '可线下约咖啡，联...',
    contentPreview: '资料问答：可线下约咖啡...',
    status: 'SENSITIVE_HIT',
    auditSource: 'MACHINE',
    rejectReason: '',
    submitTime: '2026-07-07 09:44:00',
  },
  {
    id: 3003,
    userId: 920003,
    avatar: avatar('周语桐', '#EAFBF1', '#22C55E'),
    nickname: '周语桐',
    contentType: '文字',
    textType: '资料问答',
    textSummary: '生活方式：不吸烟...',
    contentPreview: '资料问答：生活方式不吸烟...',
    status: 'APPROVED',
    auditSource: 'MANUAL',
    rejectReason: '',
    submitTime: '2026-07-06 18:01:00',
  },
  {
    id: 3004,
    userId: 920004,
    avatar: avatar('王启航', '#F5EDFF', '#8B5CF6'),
    nickname: '王启航',
    contentType: '文字',
    textType: '关于我',
    textSummary: '存在营销导流表述...',
    contentPreview: '关于我：存在营销导流表述...',
    status: 'REJECTED',
    auditSource: 'MANUAL',
    rejectReason: '存在导流表达',
    submitTime: '2026-07-06 16:30:00',
  },
];

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });

await context.addInitScript(() => {
  localStorage.setItem('token', 'prd01-screenshot-token');
  localStorage.setItem('auth', JSON.stringify({
    state: {
      token: 'prd01-screenshot-token',
      user: { nickname: '验收账号', permissions: ['*:*:*'] },
    },
    version: 0,
  }));
});

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
      item(104, '/verify/real-name', '实名审核', 'Shield'),
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

await context.route('**/api/admin/prd01/config**', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r([])),
}));

await context.route('**/api/admin/verify/real-name/list**', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r(pageResult(verifyRows))),
}));

await context.route('**/api/admin/verify/education/list**', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r(pageResult(verifyRows))),
}));

await context.route('**/api/admin/verify/avatar/list**', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r(pageResult(verifyRows))),
}));

await context.route('**/api/admin/verify/real-name/2001', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r(verifyDetail('实名认证详情'))),
}));

await context.route('**/api/admin/verify/education/2001', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r(verifyDetail('学历认证详情'))),
}));

await context.route('**/api/admin/verify/avatar/2001', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r(verifyDetail('头像认证详情'))),
}));

await context.route('**/api/admin/moderation/texts/list**', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r(pageResult(textRows))),
}));

await context.route('**/api/admin/moderation/photos/list**', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r(pageResult(photoRows))),
}));

await context.route('**/api/admin/moderation/texts/3001', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r({
    id: 3001,
    userId: 920001,
    nickname: '王启航',
    avatar: textRows[0].avatar,
    contentType: '文字',
    contentField: 'ABOUT_ME',
    contentFull: '喜欢稳定真诚的关系，工作之余会运动、看展，希望能认真了解彼此。',
    submitTime: '2026-07-07 11:30:00',
    status: 'PENDING',
    auditSource: 'MACHINE',
    rejectReason: '',
  })),
}));

await context.route('**/api/admin/**/audit', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify(r(null)),
}));

const page = await context.newPage();
page.on('pageerror', (error) => console.error(`[pageerror] ${error.stack || error.message}`));

await capture(page, '/users/app', 'prd01-admin-users-app.png');
await page.getByRole('button', { name: '详情' }).first().click();
await page.getByText('顶部概览').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-admin-user-detail.png'), fullPage: false });
await page.getByRole('button', { name: '冻结账号' }).click();
await page.getByText('冻结账号确认').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-admin-user-freeze-confirm.png'), fullPage: false });
await page.goto(`${baseUrl}/users/app`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: '模块补充' }).first().click();
await page.getByText('当前被喜欢').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-admin-user-module-supplement.png'), fullPage: false });
await page.getByRole('button', { name: '消息互动 Tab' }).click();
await page.getByText('消息未读数').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-admin-user-module-message.png'), fullPage: false });
await page.goto(`${baseUrl}/users/app`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: '批量导入' }).click();
await page.getByText('下载错误报告').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-admin-user-import.png'), fullPage: false });
await page.goto(`${baseUrl}/users/app`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: '导出字段' }).click();
await page.getByText('导出固定字段确认').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-admin-user-export.png'), fullPage: false });
await capture(page, '/access/config', 'prd01-access-config-tabs.png');
await page.getByRole('button', { name: '查看变更日志' }).click();
await page.screenshot({ path: path.join(outputDir, 'prd01-access-config-confirm.png'), fullPage: false });

await capture(page, '/verify/real-name', 'prd01-real-name-list.png');
await page.getByRole('button', { name: /查看|复审|详情/ }).first().click();
await page.getByText('实名认证详情').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-real-name-detail.png'), fullPage: false });
await page.getByRole('button', { name: '通过' }).click();
await page.getByText('通过确认').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-real-name-confirm.png'), fullPage: false });

await capture(page, '/verify/education', 'prd01-education-list.png');
await capture(page, '/verify/avatar', 'prd01-avatar-list.png');
await capture(page, '/moderation/photos', 'prd01-profile-photo-list.png');
await capture(page, '/moderation/texts', 'prd01-open-text-list.png');
await page.getByRole('button', { name: /查看/ }).first().click();
await page.getByText('开放性文字审核详情').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-open-text-detail.png'), fullPage: false });

await browser.close();

console.log(`PRD01_ADMIN_SCREENSHOTS=${outputDir}`);

async function capture(page, route, fileName) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
}

function verifyDetail(title) {
  return {
    id: 2001,
    userId: 920001,
    nickname: '林晓雨',
    avatar: verifyRows[0].avatar,
    verifyLevel: 2,
    fields: [
      { label: '审核模块', value: title },
      { label: '真实姓名', value: '林*雨' },
      { label: '身份证号', value: '1101**********1234' },
      { label: '认证方式', value: 'CHSI' },
      { label: '认证状态', value: 'PENDING' },
    ],
    submitTime: '2026-07-07 10:12:00',
    resultTime: '',
    rejectReason: '',
    status: 'PENDING',
    auditSource: 'MACHINE',
  };
}

function section(id, title, icon, children) {
  return {
    id,
    parentId: 0,
    name: title,
    path: `/${title}`,
    component: '',
    meta: { title, icon },
    sort: id,
    children,
  };
}

function item(id, routePath, title, icon) {
  return {
    id,
    parentId: 0,
    name: title,
    path: routePath,
    component: '',
    meta: { title, icon },
    sort: id,
    children: [],
  };
}

function avatar(name, bg, color) {
  const label = name.slice(0, 1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="28" fill="${bg}"/><circle cx="120" cy="88" r="38" fill="${color}" opacity=".35"/><path d="M52 210c14-48 48-76 68-76s54 28 68 76" fill="${color}" opacity=".22"/><text x="120" y="105" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="44" font-weight="700" fill="${color}">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
