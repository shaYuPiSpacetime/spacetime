import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('PRD-05 社区互动后台 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('L4-01 社区内容审核页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/community/posts`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('内容审核')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('L4-02 社区管理 Tab 切换', async ({ page }) => {
    await page.goto(`${BASE_URL}/community/posts`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '评论审核' }).click();
    await expect.poll(() => page.url()).toContain('/community/comments');

    await page.getByRole('button', { name: '举报处理' }).click();
    await expect.poll(() => page.url()).toContain('/community/reports');

    await page.getByRole('button', { name: '社区配置' }).click();
    await expect.poll(() => page.url()).toContain('/community/configs');
  });

  test('L4-03 社区内容审核筛选区存在', async ({ page }) => {
    await page.goto(`${BASE_URL}/community/posts`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /查询/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /重置/ })).toBeVisible();
  });

  test('L4-04 举报处理页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/community/reports`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('举报处理')).toBeVisible({ timeout: 10000 });
  });

  test('L4-05 社区配置页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/community/configs`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('社区配置')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('社区首页 Tab 轻配置')).toBeVisible({ timeout: 10000 });
  });
});
