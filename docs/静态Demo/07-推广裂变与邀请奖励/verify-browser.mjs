import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const screenshotDir = join(moduleDir, '截图证据');
mkdirSync(screenshotDir, { recursive: true });
const base = process.env.PRD07_DEMO_URL || 'http://127.0.0.1:4173/07-%E6%8E%A8%E5%B9%BF%E8%A3%82%E5%8F%98%E4%B8%8E%E9%82%80%E8%AF%B7%E5%A5%96%E5%8A%B1/html';

const bundledChromium = chromium.executablePath();
const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = existsSync(bundledChromium) ? bundledChromium : systemChrome;
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true });
const page = await context.newPage();
const runtimeErrors = [];
page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`); });
page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));

function assert(condition, message) { if (!condition) throw new Error(message); }
async function shot(name, fullPage = false) { await page.screenshot({ path: join(screenshotDir, name), fullPage }); }

try {
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  assert(await page.locator('.portal-links a').count() === 2, '模块总览端入口数量错误');
  await shot('PRD-07-00-模块总览.png', true);

  await page.goto(`${base}/miniapp.html#home`, { waitUntil: 'load' });
  await page.locator('.phone').waitFor({ state: 'visible' });
  assert(await page.locator('[data-view="home"].is-active').count() === 1, '移动端邀请首页未激活');
  const phoneSize = await page.locator('.phone').evaluate(element => ({ width: element.clientWidth, height: element.clientHeight }));
  assert(phoneSize.width === 376 && phoneSize.height === 830, `手机内容尺寸异常：${JSON.stringify(phoneSize)}`);
  assert((await page.locator('.phone').innerText()).includes('完成注册即邀请成功'), '移动端成功口径未更新');
  assert(!(await page.locator('.phone').innerText()).includes('冻结'), '移动端仍出现旧奖励状态');
  await shot('PRD-07-01-移动端邀请首页.png', true);

  await page.locator('[data-action="open-share"]').first().click();
  assert(await page.locator('[data-sheet="share"].is-open').count() === 1, '分享弹层未打开');
  await shot('PRD-07-01A-移动端分享弹层.png', true);
  await page.locator('[data-sheet="share"] [data-action="close-sheet"]').last().click();

  await page.locator('[data-mobile-state-button="qr-fail"]').click();
  assert(await page.locator('.qr-failure').isVisible(), '二维码失败态不可见');
  await shot('PRD-07-01B-移动端二维码失败.png', true);
  await page.locator('[data-action="retry-qr"]').click();

  await page.locator('[data-mobile-nav="records"]').click();
  assert(await page.locator('[data-record-filter]').allTextContents().then(values => values.join('|')) === '全部|待发放|已发放|发放失败', '移动端奖励筛选状态错误');
  await shot('PRD-07-02-移动端邀请记录.png', true);
  await page.locator('[data-mobile-state-button="reward-failed"]').click();
  assert(await page.locator('[data-record-status="发放失败"]').isVisible(), '发放失败态不可见');
  await shot('PRD-07-02A-移动端发放失败.png', true);

  await page.locator('[data-mobile-nav="rules"]').click();
  assert((await page.locator('[data-view="rules"]').innerText()).includes('第5位好友产生20+50两笔奖励'), '移动端 H5 阶梯示例缺失');
  assert((await page.locator('[data-view="rules"]').innerText()).includes('内容配置：PRD-06'), '移动端 H5 配置来源缺失');
  await page.waitForTimeout(1900);
  await shot('PRD-07-03-移动端邀请规则.png', true);
  await page.locator('[data-mobile-state-button="h5-cache"]').click();
  assert(await page.locator('[data-h5-cache-notice]').isVisible(), '邀请规则 H5 缓存提示不可见');
  assert((await page.locator('[data-h5-version]').innerText()).includes('V4.0（缓存）'), '邀请规则缓存版本错误');
  await page.locator('[data-mobile-state-button="h5-unavailable"]').click();
  assert(await page.locator('[data-h5-unavailable]').isVisible(), '邀请规则 H5 无缓存错误态不可见');
  await page.locator('[data-action="retry-rules-h5"]').first().click();
  assert((await page.locator('[data-h5-version]').innerText()).includes('V4.1'), '邀请规则 H5 重试未恢复当前版本');
  console.log('PASS 移动端 3 页、分享、H5缓存与异常状态');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/admin.html#promo-rule-config`, { waitUntil: 'load' });
  await page.locator('.admin-shell').waitFor({ state: 'visible' });
  assert(await page.locator('.admin-nav a[data-admin-link]').count() === 5, '后台菜单未收敛为5页');
  assert(await page.locator('[data-rule-tab]').count() === 2, '规则配置Tab数量错误');
  assert(await page.locator('[data-admin-page="promo-rule-config"] .metric-grid').count() === 0, '规则页仍有统计区域');
  await shot('PRD-07-04-管理端推广规则配置.png');

  await page.locator('[name="normalRewardMode"][value="fixed"]').check();
  assert(await page.locator('[data-ladder-panel="normal"]').isHidden(), '固定奖励模式仍显示阶梯配置');
  await page.locator('[name="normalRewardMode"][value="ladder"]').check();
  assert(await page.locator('[data-ladder-panel="normal"]').isVisible(), '阶梯奖励模式未显示配置');
  await page.locator('.tooltip-anchor .help-dot').hover();
  assert(await page.locator('.reward-tooltip').isVisible(), '阶梯规则提示未显示');
  assert((await page.locator('.reward-tooltip').innerText()).includes('第8人奖励20千寻币'), '阶梯提示缺少第8人示例');
  await shot('PRD-07-04A-阶梯规则提示.png');

  await page.locator('[data-action="save-promo-rules"]').click();
  assert(await page.locator('[data-modal="confirm"].is-open').count() === 1, '规则发布确认弹层未打开');
  await shot('PRD-07-04B-规则发布确认.png');
  await page.locator('[data-modal="confirm"] [data-action="close-modal"]').last().click();

  await page.locator('[data-admin-link="invite-relation-list"]').click();
  assert(await page.locator('[data-relation-rows] tr').count() === 4, '关系记录数量错误');
  await shot('PRD-07-05-管理端邀请关系.png');
  await page.locator('[data-action="view-relation"]').first().click();
  assert(await page.locator('[data-drawer="relation-detail"].is-open').count() === 1, '邀请关系详情抽屉未打开');
  assert(!(await page.locator('[data-drawer="relation-detail"]').innerText()).includes('设备'), '关系详情仍展示旧字段');
  await shot('PRD-07-05A-邀请关系详情抽屉.png');
  await page.locator('[data-drawer="relation-detail"] [data-action="close-drawer"]').click();

  await page.locator('[data-admin-link="invite-reward-list"]').click();
  assert((await page.locator('[data-filter="reward-event"]').locator('option').allTextContents()).includes('阶梯奖励-累计5人'), '奖励事件未包含阶梯档位');
  assert(await page.locator('[data-filter="reward-status"] option').allTextContents().then(values => values.join('|')) === '全部状态|待发放|已发放|发放失败', '奖励状态选项错误');
  await shot('PRD-07-06-管理端邀请奖励流水.png');

  await page.locator('[data-admin-link="agent-list"]').click();
  assert(await page.locator('[data-agent-rows] .status-button').count() === 4, '代理状态未使用可点击按钮');
  await shot('PRD-07-07-管理端校园代理.png');
  await page.locator('[data-action="view-agent"]').first().click();
  assert(await page.locator('[data-drawer="agent-detail"].is-open').count() === 1, '代理详情抽屉未打开');
  assert((await page.locator('[data-drawer="agent-detail"]').innerText()).includes('奖金明细订单号'), '代理详情缺少奖金明细');
  await shot('PRD-07-07A-校园代理详情抽屉.png');
  await page.locator('[data-drawer="agent-detail"] [data-action="close-drawer"]').click();

  await page.locator('[data-action="show-qr"]').first().click();
  assert(await page.locator('[data-modal="qrcode"].is-open').count() === 1, '二维码弹窗未打开');
  assert(await page.locator('[data-action="download-qr"]').isVisible(), '保存成图片按钮缺失');
  assert(await page.locator('[data-action="copy-qr"]').isVisible(), '复制按钮缺失');
  const qrPixels = await page.locator('[data-qr-canvas]').evaluate(canvas => Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).some((value, index) => index % 4 !== 3 && value < 40));
  assert(qrPixels, '二维码画布未绘制');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="download-qr"]').click();
  const download = await downloadPromise;
  assert((await download.suggestedFilename()).endsWith('-qrcode.png'), '二维码下载文件名错误');
  await shot('PRD-07-07B-校园代理二维码.png');
  await page.locator('[data-modal="qrcode"] [data-action="close-modal"]').click();

  await page.locator('[data-admin-link="agent-settlement"]').click();
  assert((await page.locator('[data-admin-page="agent-settlement"]').innerText()).includes('每月1日 01:00'), '自然月任务说明缺失');
  await shot('PRD-07-08-管理端代理结算.png');
  await page.locator('[data-action="confirm-settlement"]').first().click();
  assert(await page.locator('[data-modal="confirm"].is-open').count() === 1, '确定结算确认弹层未打开');
  await shot('PRD-07-08A-确定结算确认.png');
  await page.locator('[data-modal="confirm"] [data-action="confirm-modal"]').click();
  assert((await page.locator('[data-settlement-rows]').innerText()).includes('已确定'), '结算状态未更新');

  await page.locator('[data-role-select]').selectOption('viewer');
  await page.locator('[data-admin-link="agent-list"]').click();
  assert(await page.locator('[data-action="open-agent-modal"]').isDisabled(), '只读角色未禁用新增操作');

  const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  assert(overflow.width <= overflow.viewport, `管理页面出现横向溢出：${JSON.stringify(overflow)}`);
  assert(runtimeErrors.length === 0, runtimeErrors.join('\n'));
  console.log('PASS 管理端5页、2抽屉、二维码与结算交互');
  console.log('PASS 控制台无错误、页面无横向溢出');
} finally {
  await browser.close();
}
