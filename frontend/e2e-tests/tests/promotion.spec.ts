import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('推广裂变 E2E 测试（已实现页面范围）', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('L4-01 推广规则配置页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/rules`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('推广裂变')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: '规则配置' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /新增规则/ })).toBeVisible({ timeout: 5000 });
  });

  test('L4-02 新增规则 Dialog 交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/rules`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /新增规则/ }).click();
    await expect(page.getByRole('heading', { name: '新增规则' })).toBeVisible({ timeout: 5000 });

    await page.locator('label').filter({ hasText: '规则名称' }).getByRole('textbox').fill(`E2E规则${Date.now()}`);
    await page.locator('label').filter({ hasText: '奖励金额' }).getByRole('spinbutton').fill('10');

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: '新增规则' })).not.toBeVisible({ timeout: 5000 });
  });

  test('L4-03 邀请关系页面筛选区和表格加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/invites`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '邀请关系' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('邀请人ID')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-04 奖励审核页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/rewards`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '奖励审核' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('事件类型')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-05 校园代理新增 Dialog 交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/agents`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '校园代理' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /新增代理/ }).click();
    await expect(page.getByRole('heading', { name: '新增代理' })).toBeVisible({ timeout: 5000 });

    await page.locator('label').filter({ hasText: '代理名称' }).getByRole('textbox').fill(`E2E代理${Date.now()}`);
    await page.locator('label').filter({ hasText: '学校' }).getByRole('textbox').fill('测试大学');

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: '新增代理' })).not.toBeVisible({ timeout: 5000 });
  });

  test('L4-06 代理结算生成 Dialog 交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/settlements`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '代理结算' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /生成结算单/ }).click();
    await expect(page.getByRole('heading', { name: '生成结算单' })).toBeVisible({ timeout: 5000 });

    await page.locator('label').filter({ hasText: '代理ID' }).getByRole('textbox').fill('1');
    await page.locator('label').filter({ hasText: '应发金额' }).getByRole('spinbutton').fill('100');

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: '生成结算单' })).not.toBeVisible({ timeout: 5000 });
  });
});
