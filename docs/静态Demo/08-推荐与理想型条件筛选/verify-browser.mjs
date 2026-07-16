import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const htmlDir = join(moduleDir, 'html');
const screenshotDir = join(moduleDir, '截图证据');
const pageUrl = name => pathToFileURL(join(htmlDir, name)).href;

const bundledChromium = chromium.executablePath();
const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = existsSync(bundledChromium) ? bundledChromium : systemChrome;
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];

page.on('console', message => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));

try {
  await page.goto(pageUrl('index.html'), { waitUntil: 'load' });
  await page.locator('.shell .topbar').waitFor({ state: 'visible' });
  const indexBrand = await page.locator('.brand-mark').evaluate(element => getComputedStyle(element).backgroundColor);
  if (indexBrand !== 'rgb(37, 99, 235)') throw new Error(`总览品牌色不一致：${indexBrand}`);
  if (await page.locator('.side-nav').count() !== 1) throw new Error('总览左侧目录缺失');
  await page.screenshot({ path: join(screenshotDir, 'PRD-08-index-desktop.png'), fullPage: true });
  console.log('PASS 总览页共享外壳与截图');

  await page.goto(pageUrl('miniapp.html'), { waitUntil: 'load' });
  await page.locator('#prd08App').waitFor({ state: 'visible' });
  if (await page.locator('[data-view="home"].active').count() !== 1) throw new Error('移动端首页未激活');
  if (await page.locator('[data-shell-view="home"].is-active').count() !== 1) throw new Error('移动端目录首页未激活');
  await page.locator('[data-shell-view="filter"]').click();
  if (await page.locator('[data-view="filter"].active').count() !== 1) throw new Error('移动端筛选页切换失败');
  if (await page.locator('#viewSelect').inputValue() !== 'filter') throw new Error('快速页面下拉框未同步');
  await page.locator('#vipMode').click();
  if (await page.locator('#vipMode').getAttribute('aria-pressed') !== 'true') throw new Error('VIP 状态切换失败');
  await page.locator('[data-shell-view="results"]').click();
  if (await page.locator('[data-view="results"].active').count() !== 1) throw new Error('移动端理想型结果页切换失败');
  await page.locator('[data-shell-view="home"]').click();
  if (await page.locator('[data-view="home"].active').count() !== 1) throw new Error('移动端返回首页失败');
  await page.locator('#vipMode').click();
  if (await page.locator('#vipMode').getAttribute('aria-pressed') !== 'false') throw new Error('VIP 状态复位失败');
  await page.waitForFunction(() => !document.querySelector('#toast')?.classList.contains('show'));
  await page.reload({ waitUntil: 'load' });
  await page.locator('#prd08App').waitFor({ state: 'visible' });
  await page.waitForTimeout(350);
  const phonePrimary = await page.locator('#prd08App').evaluate(element => getComputedStyle(element).getPropertyValue('--primary').trim());
  if (phonePrimary !== '#087a5f') throw new Error(`手机产品色被外壳污染：${phonePrimary}`);
  await page.screenshot({ path: join(screenshotDir, 'PRD-08-miniapp-desktop.png'), fullPage: true });
  console.log('PASS 移动端外壳、目录联动、状态切换与截图');

  await page.goto(pageUrl('admin.html'), { waitUntil: 'load' });
  await page.locator('.admin-shell').waitFor({ state: 'visible' });
  if (await page.locator('.admin-nav a.is-active').count() !== 1) throw new Error('后台活动菜单缺失');
  if (await page.locator('main input, main select, main textarea').count() !== 0) throw new Error('后台只读边界出现表单控件');
  const adminBackground = await page.locator('.admin-content').evaluate(element => getComputedStyle(element).backgroundColor);
  if (adminBackground !== 'rgb(238, 243, 250)') throw new Error(`后台内容区颜色不一致：${adminBackground}`);
  await page.screenshot({ path: join(screenshotDir, 'PRD-08-admin-desktop.png'), fullPage: true });
  console.log('PASS 后台共享外壳、只读边界与截图');

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS 浏览器控制台与页面运行无错误');
} finally {
  await browser.close();
}
