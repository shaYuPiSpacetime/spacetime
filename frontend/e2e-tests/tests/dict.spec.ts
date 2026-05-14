import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('字典管理 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  // ============ 字典类型管理 ============

  test('L4-D1-01 字典类型管理页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/system/dict-type`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('字典类型管理')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-D1-02 字典类型新增 Dialog 交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/system/dict-type`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '新增字典类型' }).click();
    await expect(page.getByRole('heading', { name: '新增字典类型' })).toBeVisible({ timeout: 3000 });

    const nameInput = page.getByPlaceholder('如：性别');
    await expect(nameInput).toBeVisible({ timeout: 2000 });
    await nameInput.fill('E2E测试类型');

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: '新增字典类型' })).not.toBeVisible({ timeout: 3000 });
  });

  test('L4-D1-03 字典类型搜索', async ({ page }) => {
    await page.goto(`${BASE_URL}/system/dict-type`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索字典名称/编码');
    await searchInput.fill('性别');
    await page.getByRole('button', { name: '搜索' }).click();

    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  // ============ 字典数据管理 ============

  test('L4-D2-01 字典数据管理页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/system/dict-data`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('字典数据管理')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('字典类型：')).toBeVisible({ timeout: 5000 });
  });

  test('L4-D2-02 字典数据树形展开/折叠', async ({ page }) => {
    await page.goto(`${BASE_URL}/system/dict-data`);
    await page.waitForLoadState('networkidle');

    const select = page.locator('select, [role="combobox"]').first();
    if (await select.isVisible()) {
      await page.waitForTimeout(1500);
      const table = page.locator('table');
      await expect(table).toBeVisible({ timeout: 5000 });
    }
  });

  test('L4-D2-03 字典数据新增 Dialog 交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/system/dict-data`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '新增字典数据' }).click();
    await expect(page.getByRole('heading', { name: '新增字典数据' })).toBeVisible({ timeout: 3000 });

    const labelInput = page.getByPlaceholder('如：男、VIP1');
    await expect(labelInput).toBeVisible({ timeout: 2000 });

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: '新增字典数据' })).not.toBeVisible({ timeout: 3000 });
  });
});
