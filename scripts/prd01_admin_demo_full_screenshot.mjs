import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const requireFromFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = requireFromFrontend('@playwright/test');

const demoFile = path.resolve('docs/静态Demo/01-用户准入与资料认证初始化/html/admin.html');
const demoUrl = pathToFileURL(demoFile).href;
const outputDir = path.resolve('docs/测试文档/验收截图/demo-full');
const demoMatrixFile = path.join(outputDir, 'prd01-admin-demo-full-screenshot-matrix.md');
const pairMatrixFile = path.resolve('docs/测试文档/验收截图/full/prd01-admin-demo-implementation-pair-matrix.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(path.dirname(pairMatrixFile), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1180 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => console.error(`[demo pageerror] ${error.stack || error.message}`));

const matrix = [];

async function openDemo(sectionId = 'ADM-01-PAGE-app-user-management') {
  await page.goto(`${demoUrl}?shot=${Date.now()}#${sectionId}`, { waitUntil: 'load' });
  await page.locator(`#${sectionId}`).waitFor({ state: 'attached' });
  await page.waitForTimeout(120);
}

async function capture(feature, scenario, demoFileName, implementationFileName, action) {
  await openDemo();
  await action?.();
  await page.screenshot({ path: path.join(outputDir, demoFileName), fullPage: false });
  matrix.push({ feature, scenario, demoFileName, implementationFileName });
}

async function gotoSection(sectionId) {
  const id = sectionId.replace(/^#/, '');
  if (!page.url().endsWith(`#${id}`)) {
    await page.evaluate((targetId) => {
      window.location.hash = targetId;
    }, id);
    await page.waitForTimeout(120);
  }
  await page.locator(sectionId).waitFor({ state: 'attached' });
  await page.locator(sectionId).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(120);
}

async function openUserDrawer() {
  await page.locator('[data-open-drawer="userDrawer"]').first().click();
  await page.locator('#userDrawer.is-open').waitFor({ state: 'visible' });
  await page.locator('#userDrawer').getByText('顶部概览').waitFor({ state: 'visible' });
}

async function openModuleSupplement() {
  await page.locator('[data-open-modal="moduleSupplementModal"]').first().click();
  await page.locator('#moduleSupplementModal.is-open').waitFor({ state: 'visible' });
}

async function openAuditDetail(sectionId) {
  await gotoSection(sectionId);
  await page.locator(`${sectionId} [data-open-drawer="auditDrawer"]`).first().click();
  await page.locator('#auditDrawer.is-open').waitFor({ state: 'visible' });
  await page.locator('#auditDrawer').getByText('独立').first().waitFor({ state: 'visible' });
}

async function openAuditConfirm(sectionId, slugName, actionName) {
  await openAuditDetail(sectionId);
  if (slugName === 'avatar') {
    const modalId = actionName === '通过' ? 'avatarPassModal' : 'avatarFailModal';
    const buttonText = actionName === '通过' ? '审核通过' : '审核失败';
    await page.locator('#auditDrawer').getByText(buttonText).click();
    await page.locator(`#${modalId}.is-open`).waitFor({ state: 'visible' });
    return;
  }

  const modalId = actionName === '通过' ? 'auditApproveModal' : 'auditRejectConfirmModal';
  await page.locator(`#auditDrawer [data-open-modal="${modalId}"]`).first().click();
  await page.locator(`#${modalId}.is-open`).waitFor({ state: 'visible' });
}

async function captureAuditPage(sectionId, feature, slugName) {
  await capture(feature, '列表、查询条件、统计、状态守卫、行操作', `prd01-demo-full-${slugName}-list.png`, `prd01-full-${slugName}-list.png`, async () => {
    await gotoSection(sectionId);
  });
  await capture(feature, '详情弹窗、认证内容、审核信息', `prd01-demo-full-${slugName}-detail.png`, `prd01-full-${slugName}-detail.png`, async () => {
    await openAuditDetail(sectionId);
  });
  await capture(feature, '通过二次确认弹窗', `prd01-demo-full-${slugName}-pass-confirm.png`, `prd01-full-${slugName}-pass-confirm.png`, async () => {
    await openAuditConfirm(sectionId, slugName, '通过');
  });
  await capture(feature, '驳回二次确认弹窗与原因输入', `prd01-demo-full-${slugName}-reject-confirm.png`, `prd01-full-${slugName}-reject-confirm.png`, async () => {
    await openAuditConfirm(sectionId, slugName, '驳回');
  });
}

await capture('App 用户管理', '卡片列表、查询条件、统计、分页、多状态用户卡片', 'prd01-demo-full-users-card-list.png', 'prd01-full-users-card-list.png', async () => {
  await gotoSection('#ADM-01-PAGE-app-user-management');
});
await capture('App 用户管理', '表格列表、列表列、行操作', 'prd01-demo-full-users-table-list.png', 'prd01-full-users-table-list.png', async () => {
  await gotoSection('#ADM-01-PAGE-app-user-management');
  await page.locator('#ADM-01-PAGE-app-user-management').getByText('表格').click();
  await page.getByText('表格视图仅作入口展示').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '用户详情顶部、轻量资料、基础资料、扩展资料', 'prd01-demo-full-users-detail-top.png', 'prd01-full-users-detail-top.png', async () => {
  await openUserDrawer();
});
await capture('App 用户管理', '用户详情底部、认证准入、千寻币/VIP、客服风控', 'prd01-demo-full-users-detail-bottom.png', 'prd01-full-users-detail-bottom.png', async () => {
  await openUserDrawer();
  await page.locator('#userDrawer').getByText('客服/风控处理记录').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
});
await capture('App 用户管理', '冻结账号二次确认弹窗', 'prd01-demo-full-users-freeze-confirm.png', 'prd01-full-users-freeze-confirm.png', async () => {
  await openUserDrawer();
  await page.locator('#userDrawer [data-open-modal="freezeModal"]').click();
  await page.locator('#freezeModal.is-open').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '头像审核弹窗与进入审核列表入口', 'prd01-demo-full-users-avatar-dialog.png', 'prd01-full-users-avatar-dialog.png', async () => {
  await page.locator('[data-open-drawer="auditDrawer"]').first().click();
  await page.locator('#auditDrawer.is-open').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '模块补充弹窗 - 关系反馈 Tab', 'prd01-demo-full-users-module-relation.png', 'prd01-full-users-module-relation.png', async () => {
  await openModuleSupplement();
  await page.locator('#moduleSupplementModal').getByText('当前被喜欢').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '模块补充弹窗 - 消息互动 Tab', 'prd01-demo-full-users-module-message.png', 'prd01-full-users-module-message.png', async () => {
  await openModuleSupplement();
  await page.locator('#moduleSupplementModal [data-module-tab="message"]').click();
  await page.locator('#moduleSupplementModal [data-module-panel="message"].is-active').getByText('普通私信状态').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '批量导入弹窗、模板、预校验、确认导入', 'prd01-demo-full-users-import-dialog.png', 'prd01-full-users-import-dialog.png', async () => {
  await page.locator('[data-open-modal="importModal"]').click();
  await page.locator('#importModal.is-open').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '导出固定字段弹窗、字段范围、审计提示', 'prd01-demo-full-users-export-dialog.png', 'prd01-full-users-export-dialog.png', async () => {
  await page.locator('[data-open-modal="exportModal"]').click();
  await page.locator('#exportModal.is-open').waitFor({ state: 'visible' });
});
await capture('App 用户管理', '重算准入反馈提示', 'prd01-demo-full-users-recalc-toast.png', 'prd01-full-users-recalc-toast.png', async () => {
  await gotoSection('#ADM-01-PAGE-app-user-management');
  await page.getByText('重算准入').click();
  await page.getByText('已重算当前筛选用户准入状态').waitFor({ state: 'visible' });
});

for (const [tabName, tabKey] of [
  ['准入门槛', 'gate'],
  ['字段配置', 'fields'],
  ['资料完整度', 'score'],
  ['上传限制', 'upload'],
  ['审核 SLA', 'sla'],
  ['文案配置', 'copy'],
  ['安全策略', 'security'],
]) {
  await capture('准入与认证配置', `${tabName} Tab 主体`, `prd01-demo-full-access-tab-${slug(tabName)}.png`, `prd01-full-access-tab-${slug(tabName)}.png`, async () => {
    await gotoSection('#ADM-01-PAGE-access-config');
    await page.locator(`[data-config-tab="${tabKey}"]`).click();
    await page.locator(`[data-config-panel="${tabKey}"].is-active`).waitFor({ state: 'visible' });
  });
}
await capture('准入与认证配置', '变更日志弹窗/抽屉', 'prd01-demo-full-access-change-log.png', 'prd01-full-access-change-log.png', async () => {
  await gotoSection('#ADM-01-PAGE-access-config');
  await page.locator('[data-open-drawer="configLogDrawer"]').click();
  await page.locator('#configLogDrawer.is-open').waitFor({ state: 'visible' });
});
await capture('准入与认证配置', '保存按钮反馈提示', 'prd01-demo-full-access-save-toast.png', 'prd01-full-access-save-toast.png', async () => {
  await gotoSection('#ADM-01-PAGE-access-config');
  await page.getByText('保存年龄').click();
  await page.getByText('年龄范围已进入待保存状态').waitFor({ state: 'visible' });
});

await captureAuditPage('#ADM-01-PAGE-real-name-audit', '实名认证审核', 'real-name');
await captureAuditPage('#ADM-01-PAGE-education-audit', '学历认证审核', 'education');
await captureAuditPage('#ADM-01-PAGE-avatar-audit', '头像认证审核', 'avatar');
await captureAuditPage('#ADM-01-PAGE-profile-photo-audit', '资料图片审核', 'profile-photo');
await captureAuditPage('#ADM-01-PAGE-open-text-audit', '开放性文字审核', 'open-text');

await writeMatrices();
await browser.close();

console.log(`PRD01_ADMIN_DEMO_FULL_SCREENSHOTS=${outputDir}`);
console.log(`PRD01_ADMIN_DEMO_FULL_SCREENSHOT_MATRIX=${demoMatrixFile}`);
console.log(`PRD01_ADMIN_DEMO_IMPLEMENTATION_PAIR_MATRIX=${pairMatrixFile}`);

function slug(tabName) {
  return {
    准入门槛: 'access',
    字段配置: 'field',
    资料完整度: 'score',
    上传限制: 'upload',
    '审核 SLA': 'sla',
    文案配置: 'copy',
    安全策略: 'security',
  }[tabName] ?? tabName;
}

async function writeMatrices() {
  const demoRows = [
    '# PRD01 管理后台静态 Demo 全量截图矩阵',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    '| 功能 | 场景 | Demo 截图 |',
    '|------|------|-----------|',
    ...matrix.map((row) => `| ${row.feature} | ${row.scenario} | \`docs/测试文档/验收截图/demo-full/${row.demoFileName}\` |`),
    '',
    `合计：${matrix.length} 张 Demo 截图。`,
    '',
  ].join('\n');

  const pairRows = [
    '# PRD01 管理后台 Demo vs 实现成对截图矩阵',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    '| 功能 | 场景 | Demo 截图 | 实现截图 | 对齐口径 |',
    '|------|------|-----------|----------|----------|',
    ...matrix.map((row) => `| ${row.feature} | ${row.scenario} | \`docs/测试文档/验收截图/demo-full/${row.demoFileName}\` | \`docs/测试文档/验收截图/full/${row.implementationFileName}\` | 同场景逐项核对 |`),
    '',
    `合计：${matrix.length} 组 Demo/实现成对截图。`,
    '',
  ].join('\n');

  await fs.writeFile(demoMatrixFile, demoRows, 'utf8');
  await fs.writeFile(pairMatrixFile, pairRows, 'utf8');
}
