import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const requireFromFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = requireFromFrontend('@playwright/test');

const demoFile = path.resolve('docs/静态Demo/01-用户准入与资料认证初始化/html/admin.html');
const demoUrl = pathToFileURL(demoFile).href;
const outputDir = path.resolve('docs/测试文档/验收截图/demo');

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => console.error(`[demo pageerror] ${error.stack || error.message}`));

await openDemo(page);
await page.locator('#ADM-01-PAGE-app-user-management').scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, 'prd01-demo-users-app.png'), fullPage: false });

await openDemo(page);
await page.locator('[data-open-drawer="userDrawer"]').first().click();
await page.locator('#userDrawer').getByText('顶部概览').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-demo-user-detail.png'), fullPage: false });
await page.locator('#userDrawer [data-open-modal="freezeModal"]').click();
await page.locator('#freezeModal').getByText('冻结账号确认').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-demo-user-freeze-confirm.png'), fullPage: false });

await openDemo(page);
await page.locator('[data-open-modal="moduleSupplementModal"]').first().click();
await page.locator('#moduleSupplementModal.is-open').waitFor({ state: 'visible' });
await page.locator('#moduleSupplementModal').getByText('当前被喜欢').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-demo-user-module-supplement.png'), fullPage: false });
await page.locator('#moduleSupplementModal [data-module-tab="message"]').click();
await page.locator('#moduleSupplementModal [data-module-panel="message"].is-active').getByText('普通私信状态').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-demo-user-module-message.png'), fullPage: false });

await openDemo(page);
await page.locator('[data-open-modal="importModal"]').click();
await page.locator('#importModal').getByText('批量导入 App 用户').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-demo-user-import.png'), fullPage: false });

await openDemo(page);
await page.locator('[data-open-modal="exportModal"]').click();
await page.locator('#exportModal').getByText('导出固定字段确认').waitFor({ state: 'visible' });
await page.screenshot({ path: path.join(outputDir, 'prd01-demo-user-export.png'), fullPage: false });

await browser.close();

console.log(`PRD01_DEMO_SCREENSHOTS=${outputDir}`);

async function openDemo(targetPage) {
  await targetPage.goto(demoUrl, { waitUntil: 'load' });
  await targetPage.locator('#ADM-01-PAGE-app-user-management').waitFor({ state: 'visible' });
}
