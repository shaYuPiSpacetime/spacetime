import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('公共内容配置 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  // ============ 内容文章管理 ============

  test('L4-CA-01 内容文章页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/articles`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-CA-02 内容文章新增 Dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/articles`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /新增|新建/ }).click();
    await expect(page.getByRole('heading', { name: /新增内容/ })).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: /新增内容/ })).not.toBeVisible({ timeout: 3000 });
  });

  test('L4-CA-03 内容文章 Tab 切换', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/articles`);
    await page.waitForLoadState('networkidle');

    const tabs = page.locator('[role="tab"], button').filter({ hasText: /帮助/ });
    if (await tabs.count() > 0) {
      await tabs.first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
    }
  });

  // ============ 应用配置管理 ============

  test('L4-AC-01 应用配置页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/app-config`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: '协议' })).toBeVisible({ timeout: 5000 });
  });

  test('L4-AC-02 应用配置保存', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/app-config`);
    await page.waitForLoadState('networkidle');

    const saveBtn = page.getByRole('button', { name: /保存/ });
    if (await saveBtn.isVisible()) {
      await expect(saveBtn).toBeEnabled();
    }
  });

  // ============ 移动端入口配置 ============

  test('L4-ME-01 移动端入口页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/mobile-entries`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-ME-02 移动端入口 Tab 切换', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/mobile-entries`);
    await page.waitForLoadState('networkidle');

    const settingsTab = page.locator('[role="tab"], button').filter({ hasText: /设置页/ });
    if (await settingsTab.count() > 0) {
      await settingsTab.first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
    }
  });

  // ============ 搜索热词管理 ============

  test('L4-HW-01 搜索热词页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/search-hot-words`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-HW-02 搜索热词新增 Dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/search-hot-words`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /新增|新建/ }).click();
    await expect(page.getByRole('heading', { name: /新增/ })).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: /新增/ })).not.toBeVisible({ timeout: 3000 });
  });

  // ============ 搜索屏蔽词管理 ============

  test('L4-BW-01 搜索屏蔽词页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/search-block-words`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-BW-02 搜索屏蔽词新增 Dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/search-block-words`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /新增|新建/ }).click();
    await expect(page.getByRole('heading', { name: /新增/ })).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: /新增/ })).not.toBeVisible({ timeout: 3000 });
  });

  // ============ 操作日志 ============

  test('L4-OL-01 操作日志页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/operation-logs`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });
});
