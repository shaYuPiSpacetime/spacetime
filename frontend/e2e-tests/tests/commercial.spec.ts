import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('PRD-04 商业化 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  // ==================== VIP 权益配置 ====================

  test('L4-01 VIP 权益配置页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/config/vip-benefits`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  // ==================== VIP 套餐配置 ====================

  test('L4-02 VIP 套餐配置页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/config/vip-packages`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  // ==================== 成家币套餐配置 ====================

  test('L4-03 成家币套餐配置页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/config/coin-packages`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  // ==================== 财务中心 ====================

  test('L4-04 财务订单管理页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/orders`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: '订单管理' })).toBeVisible({ timeout: 10000 });
  });

  test('L4-05 财务流水管理页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/flows`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: '流水管理' })).toBeVisible({ timeout: 10000 });
  });

  test('L4-06 财务退款管理页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/refunds`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: '退款管理' })).toBeVisible({ timeout: 10000 });
  });

  // ==================== Tab 切换 ====================

  test('L4-07 财务中心 Tab 切换', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/orders`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '流水管理' }).click();
    await page.waitForTimeout(500);
    // 验证 URL 已切换
    expect(page.url()).toContain('/finance/flows');

    await page.getByRole('button', { name: '退款管理' }).click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/finance/refunds');
  });

  // ==================== 筛选功能 ====================

  test('L4-08 订单管理筛选区存在', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/orders`);
    await page.waitForLoadState('networkidle');

    // 验证搜索区有输入框
    await expect(page.getByRole('button', { name: /查询/ })).toBeVisible({ timeout: 5000 });
  });

  test('L4-09 流水管理筛选区存在', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/flows`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /查询/ })).toBeVisible({ timeout: 5000 });
  });
});
