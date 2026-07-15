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
    body: JSON.stringify({ code: 200, data: [] }),
  }));
});

test('字段固定矩阵按属性分别锁定', async ({ page }) => {
  await page.goto('/access/config');
  await page.getByRole('button', { name: '字段配置' }).click();

  const identityRow = page.getByRole('row').filter({ hasText: 'identityType' });
  await expect(identityRow).toContainText('展示');
  await expect(identityRow).toContainText('必填');
  await expect(identityRow.getByRole('button', { name: '展示' })).toHaveCount(0);
  await expect(identityRow.getByRole('button', { name: '必填' })).toHaveCount(0);

  const districtRow = page.getByRole('row').filter({ hasText: 'locationDistrict' });
  await expect(districtRow).toContainText('条件必填');

  const heightRow = page.getByRole('row').filter({ hasText: 'height' });
  await expect(heightRow.getByRole('button', { name: '选填' })).toBeEnabled();
  await expect(heightRow.getByRole('button', { name: '展示' })).toHaveCount(0);

  await page.screenshot({ path: 'test-results/prd01-field-config.png', fullPage: true });
});
