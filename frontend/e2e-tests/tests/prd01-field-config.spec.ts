import { test, expect } from '@playwright/test';

const MOCK_TOKEN = 'mock-admin-token';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((token: string) => {
    localStorage.setItem('auth', JSON.stringify({
      state: { token, user: { nickname: 'peter', permissions: ['*:*:*'] } },
      version: 0,
    }));
    localStorage.setItem('token', token);
  }, MOCK_TOKEN);

  await page.route('**/api/admin/routers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: [] }),
  }));
  await page.route('**/api/admin/prd01/config/logs*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: { records: [], total: 0, current: 1, size: 5 } }),
  }));
  await page.route('**/api/admin/prd01/config*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 200,
      data: [{
        configKey: 'prd01.profile.scoreWeights',
        status: 'ENABLED',
        configValue: JSON.stringify({
          rows: [
            { fieldId: 'aboutMe', studentScore: 5, workerScore: 5 },
            { fieldId: 'tags', studentScore: 3, workerScore: 3 },
            { fieldId: 'mbtiType', studentScore: 2, workerScore: 2 },
            { fieldId: 'qaList', studentScore: 5, workerScore: 5 },
          ],
        }),
      }],
    }),
  }));
});

test('字段配置隐藏废弃字段并将必填状态统一展示为选填', async ({ page }) => {
  await page.goto('/access/config');
  await page.getByRole('button', { name: '字段配置' }).click();

  const identityRow = page.getByRole('row').filter({ hasText: 'identityType' });
  await expect(identityRow).toContainText('展示');
  await expect(identityRow).toContainText('选填');
  await expect(identityRow.getByRole('button', { name: '展示' })).toHaveCount(0);
  await expect(identityRow.getByRole('button', { name: '选填' })).toHaveCount(0);

  const districtRow = page.getByRole('row').filter({ hasText: 'locationDistrict' });
  await expect(districtRow).toContainText('选填');

  const heightRow = page.getByRole('row').filter({ hasText: 'height' });
  await expect(heightRow.getByRole('button', { name: '选填' })).toBeEnabled();
  await expect(heightRow.getByRole('button', { name: '展示' })).toHaveCount(0);

  for (const fieldId of ['mbtiType', 'qaList']) {
    await expect(page.getByRole('row').filter({ hasText: fieldId })).toHaveCount(0);
  }

  await page.getByRole('button', { name: '资料完整度' }).click();
  await expect(page.getByText('在校生当前总分 100，职场人当前总分 100')).toBeVisible();
  for (const fieldId of ['mbtiType', 'qaList']) {
    await expect(page.getByRole('row').filter({ hasText: fieldId })).toHaveCount(0);
  }

  await page.screenshot({ path: 'test-results/prd01-field-config.png', fullPage: true });
});
