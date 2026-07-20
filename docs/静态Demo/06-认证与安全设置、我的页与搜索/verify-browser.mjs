import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const screenshotDir = join(moduleDir, '截图证据');
mkdirSync(screenshotDir, { recursive: true });
const base = process.env.PRD06_DEMO_URL || 'http://127.0.0.1:4173/06-%E8%AE%A4%E8%AF%81%E4%B8%8E%E5%AE%89%E5%85%A8%E8%AE%BE%E7%BD%AE%E3%80%81%E6%88%91%E7%9A%84%E9%A1%B5%E4%B8%8E%E6%90%9C%E7%B4%A2/html';

const bundledChromium = chromium.executablePath();
const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = existsSync(bundledChromium) ? bundledChromium : systemChrome;
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const runtimeErrors = [];
page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`); });
page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function shot(name) {
  await page.screenshot({ path: join(screenshotDir, name), fullPage: false });
}

try {
  await page.goto(`${base}/admin.html`, { waitUntil: 'load' });
  await page.locator('.adm-shell').waitFor({ state: 'visible' });
  assert(await page.locator('[data-content-tab]').count() === 3, 'H5 内容分组 Tab 数量不是 3');
  assert((await page.locator('h1').innerText()) === 'H5 内容配置', '页面标题未更新为 H5 内容配置');

  await page.locator('[data-content-tab="business-rules"]').click();
  assert(await page.locator('[data-business-rule-notice]').isVisible(), '业务规则归属提示不可见');
  assert(await page.locator('[data-content-key="invite_rules"]').count() === 1, '邀请规则预置行缺失');
  const businessText = await page.locator('.h5-config-card').innerText();
  assert(businessText.includes('PRD-07'), '邀请规则来源模块缺失');
  assert(await page.locator('[data-content-key="invite_rules"] input').count() === 0, '邀请规则列表不应出现奖励金额等业务字段');
  await shot('PRD-06-admin-desktop.png');

  await page.locator('[data-content-key="invite_rules"] [data-edit-compliance]').click();
  assert(await page.locator('[data-dialog-boundary-note]').isVisible(), '邀请规则编辑边界提示不可见');
  assert((await page.locator('[name="sourceModule"]').inputValue()) === 'PRD-07', '来源模块只读值错误');
  assert(await page.locator('[name="sourceModule"]').isEditable() === false, '来源模块不应可编辑');
  await shot('PRD-06-admin-invite-rules-edit.png');
  await page.locator('#complianceEditModal [data-close-dialog]').first().click();

  await page.locator('[data-content-key="invite_rules"] [data-preview-compliance]').click();
  const previewFrame = page.locator('[data-preview-frame]');
  await previewFrame.contentFrame().locator('body').waitFor({ state: 'visible' });
  const previewText = await previewFrame.contentFrame().locator('body').innerText();
  assert(previewText.includes('完成注册即邀请成功'), '邀请规则 H5 预览缺少成功口径');
  assert(previewText.includes('第5位好友产生20+50两笔奖励'), '邀请规则 H5 预览缺少阶梯示例');
  await shot('PRD-06-admin-invite-rules-preview.png');

  const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  assert(overflow.width <= overflow.viewport, `06 后台页面横向溢出：${JSON.stringify(overflow)}`);
  assert(runtimeErrors.length === 0, runtimeErrors.join('\n'));
  console.log('PASS PRD-06 H5 内容配置：3个Tab、邀请规则编辑/预览、归属边界');
  console.log('PASS 控制台错误0、页面无横向溢出');
} finally {
  await browser.close();
}
