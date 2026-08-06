import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

const screenshotDir = path.resolve(process.cwd(), '../docs/验收报告/2026-07-10-商业化后台数据库闭环');

const configData = {
  configVersion: 'COMM-UI-20260710',
  vipBenefits: [
    { id: 10, benefitCode: 'heart_list', benefitName: '心动名单一键揭晓', benefitType: '心动名单', benefitDesc: '有人对你心动了，看到喜欢的，立即发起对话', mobileIcon: 'heart-list', fixedFlag: 1, displayOrder: 1, status: 'ENABLED' },
    { id: 11, benefitCode: 'visitor_list', benefitName: '谁来看过你', benefitType: '访客', benefitDesc: '访客全公开，别让在意你的人白等', mobileIcon: 'visitor-eye', fixedFlag: 1, displayOrder: 2, status: 'ENABLED' },
    { id: 12, benefitCode: 'free_whisper', benefitName: '每日专属悄悄话', benefitType: '免费悄悄话', benefitDesc: '消息直接弹到对方主页，第一时间抓住 ta 的目光', mobileIcon: 'yo-message', benefitValue: 2, fixedFlag: 0, displayOrder: 3, status: 'ENABLED' },
    { id: 13, benefitCode: 'extra_browse', benefitName: '每日额外浏览', benefitType: '额外浏览', benefitDesc: '每天额外浏览更多嘉宾，发现更契合的人', mobileIcon: 'extra-browse', benefitValue: 10, fixedFlag: 0, displayOrder: 4, status: 'ENABLED' },
    { id: 14, benefitCode: 'advanced_filter', benefitName: '精准筛选功能', benefitType: '高级筛选', benefitDesc: '按你条件定向筛选，只看最合心意的人', mobileIcon: 'filter', fixedFlag: 1, displayOrder: 5, status: 'ENABLED' },
    { id: 15, benefitCode: 'exposure_score', benefitName: '曝光度拉满', benefitType: '曝光', benefitDesc: '资料优先展示给活跃用户和你心仪的对象', mobileIcon: 'exposure', benefitValue: 80, fixedFlag: 0, displayOrder: 6, status: 'ENABLED' },
    { id: 16, benefitCode: 'privacy', benefitName: '隐身模式', benefitType: '隐私权益', benefitDesc: '只对你选中的人可见，主动权完全在你手上', mobileIcon: 'stealth', fixedFlag: 1, displayOrder: 7, status: 'ENABLED' },
    { id: 17, benefitCode: 'three_day_replay', benefitName: '三天回放功能', benefitType: '三天回放', benefitDesc: '最近 3 天错过的缘分都能找回，手滑也不怕', mobileIcon: 'replay', fixedFlag: 1, displayOrder: 8, status: 'ENABLED' },
    { id: 18, benefitCode: 'daily_heart_chance', benefitName: '每日心动机会', benefitType: '每日心动机会', benefitDesc: '每天额外获得更多心动机会，让缘分不被错过', mobileIcon: 'daily-heart', benefitValue: 5, fixedFlag: 0, displayOrder: 9, status: 'ENABLED' },
  ],
  vipPackages: [
    { id: 8, packageName: '年卡会员', packageType: 'normal', subscriptionType: 'once', price: 568, originPrice: 568, durationDays: 365, recommendFlag: 1, packageTag: '专属2.4折', sortOrder: 1, status: 'ENABLED' },
    { id: 10, packageName: '季卡会员', packageType: 'normal', subscriptionType: 'once', price: 318, originPrice: 318, durationDays: 90, recommendFlag: 0, packageTag: '专属5.4折', sortOrder: 2, status: 'ENABLED' },
    { id: 7, packageName: '连续包月', packageType: 'continuous', subscriptionType: 'month', price: 198, originPrice: 198, durationDays: 30, recommendFlag: 0, packageTag: '尝鲜首选', wechatProductId: 'legacy-product', agreementConfig: 'legacy-agreement', sortOrder: 3, status: 'ENABLED' },
  ],
  coinPackages: [
    { id: 10, packageName: '1000千寻币', amount: 99, originAmount: 0, discountAmount: 99, coinCount: 1000, bonusCoinCount: 0, recommendFlag: 0, packageTag: '尝鲜首选', sortOrder: 1, status: 'ENABLED' },
    { id: 11, packageName: '3000千寻币', amount: 268, originAmount: 301.12, discountAmount: 268, coinCount: 3000, bonusCoinCount: 0, recommendFlag: 1, packageTag: '热销推荐', mobileTag: '8.9折', sortOrder: 2, status: 'ENABLED' },
    { id: 12, packageName: '6000千寻币', amount: 428, originAmount: 602.82, discountAmount: 428, coinCount: 6000, bonusCoinCount: 0, recommendFlag: 0, packageTag: '节省最多', mobileTag: '7.1折', sortOrder: 3, status: 'ENABLED' },
  ],
  coinScenes: [
    { id: 9, sceneCode: 'whisper', mobileName: '送悄悄话', mobileIcon: 'coinUsageWhisper', sceneDesc: '单次发送悄悄话', unitPrice: 12, retentionDays: 0, sortOrder: 1, status: 'ENABLED' },
    { id: 10, sceneCode: 'likes_unlock_one', mobileName: '心动信号', mobileIcon: 'coinUsageHeartbeat', sceneDesc: '查看单条喜欢我的清晰信息', unitPrice: 8, retentionDays: 0, sortOrder: 2, status: 'ENABLED' },
    { id: 11, sceneCode: 'viewers_unlock_one', mobileName: '解锁理想型', mobileIcon: 'coinUsageIdealUnlock', sceneDesc: '查看单条访客清晰信息', unitPrice: 8, retentionDays: 0, sortOrder: 3, status: 'ENABLED' },
    { id: 12, sceneCode: 'ideal_user_unlock', mobileName: '提升人气', mobileIcon: 'coinUsageBoost', sceneDesc: '单个理想型用户解锁', unitPrice: 18, retentionDays: 90, sortOrder: 4, status: 'ENABLED' },
    { id: 13, sceneCode: 'ideal_batch_unlock', mobileName: '解锁精选', mobileIcon: 'coinUsageCuratedUnlock', sceneDesc: '多个理想型用户批量解锁', unitPrice: 15, retentionDays: 90, sortOrder: 5, status: 'ENABLED' },
    { id: 14, sceneCode: 'compatible_person_unlock_one', mobileName: '更多推荐', mobileIcon: 'coinUsageRecommend', sceneDesc: '由测评结果推荐的人', unitPrice: 20, retentionDays: 90, sortOrder: 6, status: 'ENABLED' },
    { id: 15, sceneCode: 'soulmate_mizhiyin_unlock_one', mobileName: '匿名解锁', mobileIcon: 'coinUsageAnonymousUnlock', sceneDesc: '单个解锁知音对象', unitPrice: 28, retentionDays: 90, sortOrder: 7, status: 'ENABLED' },
    { id: 16, sceneCode: 'career_recommend_unlock_one', mobileName: '限定活动', mobileIcon: 'coinUsageLimitedActivity', sceneDesc: '职业推荐单次解锁', unitPrice: 26, retentionDays: 0, sortOrder: 8, status: 'ENABLED' },
  ],
  settings: {
    idealBatchMax: 5,
    idealBatchDiscountPercent: 10,
    idealRetentionDays: 90,
    normalViewQuota: 10,
    vipViewQuota: 20,
    vipExpireRemindDays: 3,
    refundDisplay: true,
    exposureReserveEnabled: false,
    exposureReserveDescription: '首版仅预留，不开放购买',
  },
  latestLogs: [],
};

async function bootstrap(page: Page) {
  await page.addInitScript(() => {
    const auth = { state: { token: 'e2e-token', user: { nickname: 'E2E', permissions: ['commercial:config:view', 'commercial:config:edit'] } }, version: 0 };
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('auth', JSON.stringify(auth));
  });
  await page.route('**/api/admin/routers', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: [] }) }));
  await page.route('**/api/admin/permissions', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: ['commercial:config:view', 'commercial:config:edit'] }) }));
}

test.describe('商业化配置数据库闭环', () => {
  test('L4-08 七个配置 Tab 的列、固定名称与字段说明对齐 Demo 契约', async ({ page, baseURL }, testInfo) => {
    await bootstrap(page);
    await page.route('**/api/admin/commercial/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: configData }) }));

    await page.goto(`${baseURL}/commercial/config`);

    const benefitPanel = page.locator('[data-config-panel="benefits"]');
    await expect(benefitPanel.locator('thead th')).toHaveText(['权益编码', '名称', '类型', '移动端图标配置', '说明', '启停', '次数/分数配置']);
    const heartBenefit = benefitPanel.locator('tbody tr', { hasText: 'heart_list' });
    await expect(heartBenefit.locator('td').nth(1)).toHaveText('心动名单');
    await expect(heartBenefit.locator('td').nth(2)).toHaveText('心动名单');
    await page.screenshot({ path: testInfo.outputPath('01-会员权益.png'), fullPage: true });

    await page.getByRole('button', { name: '会员套餐', exact: true }).click();
    const vipPanel = page.locator('[data-config-panel="vipPackages"]');
    await expect(vipPanel.locator('thead th')).toHaveText(['套餐编号', '套餐名称', '套餐类型', '购买方式', '原价', '优惠价', '有效天数', '标签', '状态', '操作']);
    await expect(vipPanel.getByText('普通套餐', { exact: true }).first()).toBeVisible();
    await expect(vipPanel.getByText('一次性购买', { exact: true }).first()).toBeVisible();
    await expect(vipPanel.getByText('连续订阅套餐')).toHaveCount(0);
    await expect(vipPanel.locator('tbody tr').first().getByRole('button', { name: '下架', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('02-会员套餐.png'), fullPage: true });

    await page.getByRole('button', { name: '千寻币套餐', exact: true }).click();
    const coinPanel = page.locator('[data-config-panel="coinPackages"]');
    await expect(coinPanel.locator('thead th')).toHaveText(['套餐编号', '名称', '原价', '优惠价', '到账币数', '赠送币', '标签', '推荐', '状态', '操作']);
    await expect(coinPanel.locator('tbody tr').first().getByRole('button', { name: '下架', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('03-千寻币套餐.png'), fullPage: true });

    await page.getByRole('button', { name: '千寻币消费场景', exact: true }).click();
    const scenePanel = page.locator('[data-config-panel="scenePrices"]');
    await expect(scenePanel.locator('thead th')).toHaveText(['消费场景', '场景 code', '移动端展示名称', '移动端图标配置', '说明', '单价', '启停', '影响页面']);
    const whisperScene = scenePanel.locator('tbody tr', { hasText: 'whisper' });
    await expect(whisperScene.locator('td').nth(0)).toHaveText('发送悄悄话');
    await expect(whisperScene.getByLabel('移动端展示名称')).toHaveValue('送悄悄话');
    await expect(whisperScene.getByLabel('移动端图标配置')).toHaveValue('coinUsageWhisper');
    await expect(whisperScene.getByLabel('消费单价')).toHaveValue('12');
    await expect(whisperScene.locator('td').nth(7)).toHaveText('APP 付费弹窗 / 来源业务页');
    await page.screenshot({ path: testInfo.outputPath('04-千寻币消费场景.png'), fullPage: true });

    await page.getByRole('button', { name: '解锁保留期', exact: true }).click();
    const retentionPanel = page.locator('[data-config-panel="retention"]');
    await expect(retentionPanel.getByText('理想型/合拍/知音保留天数', { exact: true })).toBeVisible();
    await expect(retentionPanel.getByText('理想型解锁全部折扣比例', { exact: true })).toBeVisible();
    await expect(retentionPanel.getByText('默认 5 个，保存后立即生效。', { exact: true })).toBeVisible();
    await expect(retentionPanel.getByText('默认 90 天，合拍的人与知音-觅知音复用。', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('05-解锁保留期.png'), fullPage: true });

    await page.getByRole('button', { name: '社交与订单参数', exact: true }).click();
    const socialPanel = page.locator('[data-config-panel="social"]');
    await expect(socialPanel.getByText('新访问判定生效。', { exact: true })).toBeVisible();
    await expect(socialPanel.getByText('不得低于普通用户配额。', { exact: true })).toBeVisible();
    await expect(socialPanel.getByText('影响后续提醒任务。', { exact: true })).toBeVisible();
    await expect(socialPanel.getByText('关闭后前台隐藏退款标签，后台台账保留。', { exact: true })).toBeVisible();
    await expect(socialPanel.getByText('未支付订单关闭', { exact: true })).toBeVisible();
    await expect(socialPanel.getByText('只读', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('06-社交与订单参数.png'), fullPage: true });

    await page.getByRole('button', { name: '曝光包预留', exact: true }).click();
    const exposurePanel = page.locator('[data-config-panel="exposure"]');
    await expect(exposurePanel.getByText('曝光包预留开关', { exact: true })).toBeVisible();
    await expect(exposurePanel.getByText('首版只保留说明，不允许购买。', { exact: true })).toBeVisible();
    await expect(exposurePanel.getByText('预留说明文案', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('07-曝光包预留.png'), fullPage: true });
  });

  test('L4-01/L4-02 消费场景内联完整回显并携带 ID 保存', async ({ page, baseURL }) => {
    await bootstrap(page);
    let getCount = 0;
    let savedBody: typeof configData & { changeSummary?: string } | null = null;
    await page.route('**/api/admin/commercial/config', async (route) => {
      if (route.request().method() === 'PUT') {
        savedBody = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: savedBody }) });
        return;
      }
      getCount += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: configData }) });
    });

    await page.goto(`${baseURL}/commercial/config?tab=scenePrices`);
    await expect(page.locator('[data-render="admin-scene-prices"]')).toContainText('送悄悄话');
    const row = page.locator('[data-render="admin-scene-prices"] tr', { hasText: 'whisper' });
    await expect(row.locator('td').nth(0)).toHaveText('发送悄悄话');
    await expect(row.getByLabel('移动端展示名称')).toHaveValue('送悄悄话');
    await expect(row.getByLabel('移动端图标配置')).toHaveValue('coinUsageWhisper');
    await expect(row.getByLabel('消费单价')).toHaveValue('12');
    await page.screenshot({ path: path.join(screenshotDir, '后台-消费场景编辑回显.png'), fullPage: true });

    await row.getByLabel('移动端展示名称').fill('送悄悄话测试');
    await row.getByLabel('消费单价').fill('13');

    const requestsBeforeTabSwitch = getCount;
    await page.getByRole('button', { name: '千寻币套餐' }).click();
    await page.getByRole('button', { name: '千寻币消费场景' }).click();
    expect(getCount).toBe(requestsBeforeTabSwitch);
    await expect(row.getByLabel('移动端展示名称')).toHaveValue('送悄悄话测试');

    await page.getByRole('button', { name: '保存当前配置' }).click();
    await page.locator('#configSaveModal textarea').fill('消费场景回显闭环测试');
    await page.locator('#configSaveModal').getByRole('button', { name: '确认保存' }).click();
    await expect.poll(() => savedBody).not.toBeNull();

    const savedScene = savedBody!.coinScenes.find((item) => item.sceneCode === 'whisper');
    expect(savedScene).toMatchObject({ id: 9, mobileName: '送悄悄话测试', unitPrice: 13 });
    expect(savedBody!.settings).toEqual(configData.settings);
  });

  test('L4-03 千寻币套餐编辑完整回显蓝湖价格字段', async ({ page, baseURL }) => {
    await bootstrap(page);
    await page.route('**/api/admin/commercial/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: configData }) }));

    await page.goto(`${baseURL}/commercial/config?tab=coinPackages`);
    const row = page.locator('[data-render="admin-coin-packages"] tr', { hasText: '3000千寻币' });
    await row.getByRole('button', { name: '编辑' }).click();
    const modal = page.locator('#coinPackageEditModal.is-open');
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel('套餐名称')).toHaveValue('3000千寻币');
    await expect(modal.getByLabel('原价')).toHaveValue('301.12');
    await expect(modal.getByLabel('优惠价')).toHaveValue('268');
    await expect(modal.getByLabel('到账币数')).toHaveValue('3000');
    await expect(modal.getByLabel('移动端标签')).toHaveValue('8.9折');
    await expect(modal.getByRole('button', { name: '确认' })).toBeInViewport();
    await page.screenshot({ path: path.join(screenshotDir, '后台-千寻币套餐编辑回显.png'), fullPage: true });
  });

  test('L4-07 历史连续订阅套餐统一按普通套餐一次性购买保存', async ({ page, baseURL }) => {
    await bootstrap(page);
    let savedBody: typeof configData & { changeSummary?: string } | null = null;
    await page.route('**/api/admin/commercial/config', async (route) => {
      if (route.request().method() === 'PUT') {
        savedBody = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: savedBody }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: configData }) });
    });

    await page.goto(`${baseURL}/commercial/config?tab=vipPackages`);
    const row = page.locator('[data-render="admin-vip-packages"] tr', { hasText: '连续包月' });
    await expect(row).toContainText('普通套餐');
    await expect(row).toContainText('一次性购买');
    await expect(page.getByText('连续订阅套餐')).toHaveCount(0);

    await row.getByRole('button', { name: '编辑' }).click();
    const modal = page.locator('#vipPackageEditModal.is-open');
    await expect(modal.getByLabel('套餐类型')).toHaveValue('普通套餐');
    await expect(modal.getByLabel('购买方式')).toHaveValue('一次性购买');
    await expect(modal.getByLabel('套餐类型')).toHaveAttribute('readonly', '');
    await expect(modal.getByLabel('购买方式')).toHaveAttribute('readonly', '');
    await modal.getByRole('button', { name: '确认' }).click();

    await page.getByRole('button', { name: '保存当前配置' }).click();
    await page.locator('#configSaveModal textarea').fill('会员套餐统一改为一次性购买');
    await page.locator('#configSaveModal').getByRole('button', { name: '确认保存' }).click();
    await expect.poll(() => savedBody).not.toBeNull();
    const normalizedLegacyPackage = savedBody!.vipPackages.find((item) => item.id === 7)!;
    expect(normalizedLegacyPackage).toMatchObject({ packageType: 'normal', subscriptionType: 'once' });
    expect(normalizedLegacyPackage.wechatProductId).toBeUndefined();
    expect(normalizedLegacyPackage.agreementConfig).toBeUndefined();
  });

  test('L4-04 推荐档切换后自动取消其他套餐推荐', async ({ page, baseURL }) => {
    await bootstrap(page);
    await page.route('**/api/admin/commercial/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: configData }) }));

    await page.goto(`${baseURL}/commercial/config?tab=coinPackages`);
    const firstRow = page.locator('[data-render="admin-coin-packages"] tr', { hasText: '1000千寻币' });
    const secondRow = page.locator('[data-render="admin-coin-packages"] tr', { hasText: '3000千寻币' });
    await firstRow.getByRole('button', { name: '编辑' }).click();
    const modal = page.locator('#coinPackageEditModal.is-open');
    await modal.getByLabel('是否推荐').selectOption('1');
    await modal.getByRole('button', { name: '确认' }).click();

    await expect(firstRow.locator('td').nth(7)).toContainText('推荐档');
    await expect(secondRow.locator('td').nth(7)).toHaveText('-');
  });

  test('L4-06 接口失败时展示空态且不回退 Demo 数据', async ({ page, baseURL }) => {
    await bootstrap(page);
    await page.route('**/api/admin/commercial/config', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 5000, msg: '测试接口失败', data: null }) }));

    await page.goto(`${baseURL}/commercial/config?tab=coinPackages`);
    await expect(page.locator('[data-render="admin-coin-packages"]')).toContainText('暂无后台返回数据');
    await expect(page.getByRole('button', { name: '保存当前配置' })).toBeDisabled();
    await expect(page.getByText('3000千寻币')).toHaveCount(0);
  });
});
