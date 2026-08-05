import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

const screenshotDir = path.resolve(process.cwd(), '../docs/验收报告/2026-07-10-商业化后台数据库闭环');

const configData = {
  configVersion: 'COMM-UI-20260710',
  vipBenefits: [],
  vipPackages: [
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
}

test.describe('商业化配置数据库闭环', () => {
  test('L4-01/L4-02 消费场景完整回显并携带 ID 保存', async ({ page, baseURL }) => {
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
    await row.getByRole('button', { name: '编辑' }).click();

    const modal = page.locator('#coinSceneEditModal.is-open');
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[readonly]')).toHaveValue('whisper');
    await expect(modal.getByLabel('场景移动端展示名称')).toHaveValue('送悄悄话');
    await expect(modal.getByLabel('移动端图标配置')).toHaveValue('coinUsageWhisper');
    await expect(modal.getByLabel('场景消费单价')).toHaveValue('12');
    await expect(modal.getByRole('button', { name: '确认' })).toBeInViewport();
    await page.screenshot({ path: path.join(screenshotDir, '后台-消费场景编辑回显.png'), fullPage: true });

    await modal.getByLabel('场景移动端展示名称').fill('送悄悄话测试');
    await modal.getByLabel('场景消费单价').fill('13');
    await modal.getByRole('button', { name: '确认' }).click();

    const requestsBeforeTabSwitch = getCount;
    await page.getByRole('button', { name: '千寻币套餐' }).click();
    await page.getByRole('button', { name: '千寻币消费场景' }).click();
    expect(getCount).toBe(requestsBeforeTabSwitch);
    await expect(row).toContainText('送悄悄话测试');

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
    expect(savedBody!.vipPackages[0]).toMatchObject({ packageType: 'normal', subscriptionType: 'once' });
    expect(savedBody!.vipPackages[0].wechatProductId).toBeUndefined();
    expect(savedBody!.vipPackages[0].agreementConfig).toBeUndefined();
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
