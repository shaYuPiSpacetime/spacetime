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
  if (await page.locator('[data-view]').count() !== 8) throw new Error('移动端有效页面数量不是 8');
  if (await page.locator('[data-view="meeting"], [data-shell-view="meeting"], [data-go="meeting"], #viewSelect option[value="meeting"]').count() !== 0) throw new Error('见面偏好页面或入口仍存在');
  if (await page.locator('.filter-summary, [data-filter-tab]').count() !== 0) throw new Error('首页条件摘要或筛选分页仍存在');

  const invalidSkipCandidate = await page.locator('#candidateName').textContent();
  await page.locator('#candidateMode').click();
  await page.locator('#skipCandidate').click();
  if (await page.locator('#candidateName').textContent() === invalidSkipCandidate) throw new Error('失效候选点击跳过未静默切换下一位');
  if (await page.locator('#toast').textContent() === '该用户已注销') throw new Error('失效候选点击跳过不应提示注销');
  await page.reload({ waitUntil: 'load' });
  await page.locator('#candidateMode').click();
  await page.locator('#candidateCard').click();
  if (await page.locator('#toast').textContent() !== '该用户已注销') throw new Error('失效候选点击详情未提示用户已注销');
  if (await page.locator('[data-view="home"].active').count() !== 1) throw new Error('失效候选点击详情错误进入详情页');
  await page.reload({ waitUntil: 'load' });

  await page.locator('[data-main-tab="ideal"]').click();
  if (await page.locator('#idealGroups [data-ideal-code]').count() !== 17) throw new Error('资料完整时理想型条件数量不正确');
  await page.locator('#profileMode').click();
  if (await page.locator('#idealGroups [data-ideal-code]').count() !== 14) throw new Error('资料缺失时依赖条件未隐藏');
  if (await page.getByRole('button', { name: '校友', exact: true }).count() !== 0) throw new Error('资料缺失时仍展示校友条件');
  if (await page.locator('#profileModal').count() !== 0) throw new Error('资料完善弹窗仍存在');
  await page.locator('#profileMode').click();
  await page.locator('[data-main-tab="recommend"]').click();

  await page.locator('#authMode').click();
  if (await page.locator('#authMode').getAttribute('aria-pressed') !== 'false') throw new Error('未认证状态切换失败');
  const firstCandidate = await page.locator('#candidateName').textContent();
  await page.locator('#candidateCard').click();
  if (await page.locator('[data-view="detail"].active').count() !== 1) throw new Error('点击候选卡未进入详情');
  await page.locator('[data-view="detail"] [data-back]').click();
  if (await page.locator('[data-view="home"].active').count() !== 1) throw new Error('未认证用户不能从详情返回推荐');
  await page.locator('#likeCandidate').click();
  if (await page.locator('#authModal.open').count() !== 1) throw new Error('未认证喜欢未弹三项认证提示');
  if (await page.locator('#candidateName').textContent() !== firstCandidate) throw new Error('认证弹窗错误切换了候选人');
  await page.locator('#finishAuth').click();
  if (await page.locator('#authMode').getAttribute('aria-pressed') !== 'true') throw new Error('模拟认证完成失败');
  if (await page.locator('#candidateName').textContent() !== firstCandidate) throw new Error('认证返回后自动执行了喜欢');
  await page.locator('#likeCandidate').click();
  const secondCandidate = await page.locator('#candidateName').textContent();
  if (secondCandidate === firstCandidate) throw new Error('认证后再次点击喜欢未切换下一位');

  await page.locator('#networkMode').click();
  await page.locator('#likeCandidate').click();
  if (await page.locator('#toast').textContent() !== '网络错误') throw new Error('网络失败未直接提示网络错误');
  if (await page.locator('#candidateName').textContent() !== secondCandidate) throw new Error('网络失败后候选卡未保留');
  await page.locator('#likeCandidate').click();
  if (await page.locator('#candidateName').textContent() === secondCandidate) throw new Error('再次触发原操作未完成重试');

  await page.locator('#candidateCard').click();
  if (await page.locator('[data-view="detail"].active').count() !== 1) throw new Error('认证后点击候选卡未进入详情');
  await page.locator('#detailMore').click();
  await page.locator('#neverRecommendAction').click();
  if (await page.locator('#modalTitle').textContent() !== '不再推荐这位嘉宾？') throw new Error('不再推荐确认标题不正确');
  if (await page.locator('#modalText').textContent() !== '确认后，该用户将不再出现在你的推荐和理想型结果中。') throw new Error('不再推荐仍使用全局拉黑语义');
  if (await page.locator('#modalConfirm').textContent() !== '确认不再推荐') throw new Error('不再推荐确认按钮不正确');
  await page.locator('#modalCancel').click();
  await page.locator('#detailWhisper').click();
  await page.waitForLoadState('load');
  if (new URL(page.url()).hash !== '#APP-03-PAGE-whisper-message') throw new Error('悄悄话未跳转 PRD-03 悄悄话消息页');
  await page.goBack({ waitUntil: 'load' });
  await page.locator('#prd08App').waitFor({ state: 'visible' });
  await page.locator('[data-shell-view="filter"]').click();
  if (await page.locator('[data-view="filter"].active').count() !== 1) throw new Error('移动端筛选页切换失败');
  if (await page.locator('#viewSelect').inputValue() !== 'filter') throw new Error('快速页面下拉框未同步');
  if (await page.locator('[data-filter-panel="basic"]:visible, [data-filter-panel="advanced"]:visible').count() !== 2) throw new Error('基础与高级条件未在同一连续页面展示');
  await page.locator('#addCity').click();
  await page.locator('[data-view="filter"] [data-back]').click();
  if (await page.locator('#modalTitle').textContent() !== '温馨提示' || await page.locator('#modalText').textContent() !== '是否保存该设置？') throw new Error('筛选返回未显示保存确认');
  if (await page.locator('#modalCancel').textContent() !== '不保存' || await page.locator('#modalConfirm').textContent() !== '保存') throw new Error('筛选返回确认按钮不正确');
  await page.locator('#modalCancel').click();
  if (await page.locator('[data-view="filter"].active').count() !== 0) throw new Error('筛选不保存后未返回上一页');
  await page.locator('[data-shell-view="filter"]').click();
  await page.locator('#addCity').click();
  await page.locator('#addCity').click();
  if (await page.locator('#cityCounter').textContent() !== '3/3' || await page.locator('#addCity:visible').count() !== 0) throw new Error('城市达到 3 个后添加入口未隐藏');
  await page.locator('#cityChoices [data-city="宁波"]').click();
  if (await page.locator('#cityCounter').textContent() !== '2/3' || await page.locator('#addCity:visible').count() !== 1) throw new Error('删除城市后添加入口未恢复');
  await page.locator('#advancedForm label').first().click();
  if (await page.locator('#vipModal.open').count() !== 1) throw new Error('普通用户点击高级条件未进入会员承接');
  await page.locator('#activateVip').click();
  if (await page.locator('#vipMode').getAttribute('aria-pressed') !== 'true') throw new Error('会员开通返回未刷新权益');
  if (await page.locator('#cityCounter').textContent() !== '2/3') throw new Error('会员开通返回丢失基础城市草稿');
  await page.locator('#cityChoices [data-city]').first().click();
  await page.locator('#cityChoices [data-city]').first().click();
  if (await page.locator('#saveFilter').isEnabled()) throw new Error('城市为 0 时保存按钮仍可用');
  if (!await page.getByText('请至少添加一个城市后再保存', { exact: true }).isVisible()) throw new Error('城市为 0 时缺少提示');
  await page.locator('#addCity').click();
  if (await page.locator('#toast.show').count() !== 0) throw new Error('重新添加城市后仍残留零城市错误提示');
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(screenshotDir, 'PRD-08-filter-desktop.png'), fullPage: true });

  await page.locator('#viewSelect').selectOption('waiting');
  if (await page.locator('#waitingTitle').textContent() !== '当前条件下暂未找到推荐人') throw new Error('无候选未使用新版蓝湖文案');
  if (await page.locator('#waitingPrimary').textContent() !== '去千寻同城看看') throw new Error('无候选未展示同城承接入口');
  if (await page.locator('#waitingIllustration').getAttribute('src') === '') throw new Error('无候选未复用蓝湖缺省插画');
  await page.screenshot({ path: join(screenshotDir, 'PRD-08-waiting-empty-desktop.png'), fullPage: true });
  await page.locator('#waitingPrimary').click();
  await page.waitForLoadState('load');
  if (new URL(page.url()).hash !== '#APP-05-PAGE-community-city') throw new Error('无候选未跳转千寻同城');
  await page.goBack({ waitUntil: 'load' });
  await page.locator('#prd08App').waitFor({ state: 'visible' });
  if (await page.locator('#vipMode').getAttribute('aria-pressed') !== 'true') await page.locator('#vipMode').click();

  await page.locator('[data-shell-view="replay"]').click();
  if (await page.locator('.replay-day').count() !== 3) throw new Error('回看未展示最近三天分组');
  if (await page.getByText('推荐 10 人').count() !== 1 || await page.getByText('跳过 8 人').count() !== 1) throw new Error('回看首日汇总缺失');
  if (await page.getByText('这一天你没来，无推荐嘉宾').count() !== 1) throw new Error('回看空日期文案缺失');
  await page.locator('#replayErrorMode').click();
  await page.locator('[data-replay-index]').first().click();
  if (await page.locator('#toast').textContent() !== '查看失败，请返回后重新查看') throw new Error('回看查看失败提示不正确');
  if (await page.locator('[data-view="replay"].active').count() !== 1) throw new Error('回看查看失败后错误离开当前页');
  await page.screenshot({ path: join(screenshotDir, 'PRD-08-replay-desktop.png'), fullPage: true });
  await page.locator('#waitingMode').click();
  if (await page.locator('[data-view="waiting"].active').count() !== 1) throw new Error('等待原因切换未进入等待页');
  if (!await page.locator('#waitingText').getByText('下次重置时间：2026-08-10 00:00', { exact: true }).isVisible()) throw new Error('浏览上限未展示重置时间');
  if (await page.locator('#waitingVip:visible').count() !== 0) throw new Error('会员达到上限时仍显示开通入口');
  await page.screenshot({ path: join(screenshotDir, 'PRD-08-waiting-limit-desktop.png'), fullPage: true });
  await page.locator('#vipMode').click();
  if (await page.locator('#waitingVip:visible').count() !== 1) throw new Error('普通用户达到上限时会员入口缺失');
  await page.locator('[data-shell-view="results"]').click();
  if (await page.locator('[data-view="results"].active').count() !== 1) throw new Error('移动端理想型结果页切换失败');
  await page.locator('[data-shell-view="home"]').click();
  if (await page.locator('[data-view="home"].active').count() !== 1) throw new Error('移动端返回首页失败');
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
