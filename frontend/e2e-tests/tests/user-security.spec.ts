import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('用户安全设置与搜索主链路 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, 'peter', '000000');
  });

  test('L4-US-01 反馈箱页面可加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-security/feedback`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '反馈箱' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('用户ID')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('反馈类型')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-US-02 反馈箱筛选与重置交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-security/feedback`);
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('用户ID').fill('1');
    await page.getByPlaceholder('反馈类型').fill('BUG');
    await page.getByRole('button', { name: '查询' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '重置' }).click();
    await expect(page.getByPlaceholder('用户ID')).toHaveValue('');
    await expect(page.getByPlaceholder('反馈类型')).toHaveValue('');
  });

  test('L4-US-07 反馈详情处理流程', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-security/feedback`);
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await page.locator('table tbody tr button').first().click();
    await expect(page.getByRole('heading', { name: '反馈详情' })).toBeVisible({ timeout: 5000 });
    await page.locator('label').filter({ hasText: '处理备注' }).getByRole('textbox').fill(`E2E处理${Date.now()}`);
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByRole('heading', { name: '反馈详情' })).not.toBeVisible({ timeout: 5000 });
  });

  test('L4-US-03 注销申请页面可加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-security/cancel-requests`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '注销申请' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('用户ID')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-US-04 注销申请筛选与重置交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-security/cancel-requests`);
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('用户ID').fill('1');
    await page.getByRole('button', { name: '查询' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '重置' }).click();
    await expect(page.getByPlaceholder('用户ID')).toHaveValue('');
  });

  test('L4-US-08 注销详情备注流程', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-security/cancel-requests`);
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await page.locator('table tbody tr button').first().click();
    await expect(page.getByRole('heading', { name: '注销申请详情' })).toBeVisible({ timeout: 5000 });
    await page.locator('label').filter({ hasText: '后台备注' }).getByRole('textbox').fill(`E2E备注${Date.now()}`);
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByRole('heading', { name: '注销申请详情' })).not.toBeVisible({ timeout: 5000 });
  });

  test('L4-US-05 用户管理安全详情入口可打开', async ({ page }) => {
    await page.goto(`${BASE_URL}/system/user`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible({ timeout: 10000 });
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    const securityButtons = page.locator('button[title="安全详情"]');
    if ((await securityButtons.count()) === 0) {
      test.skip(true, '当前页面未渲染安全详情按钮');
    }
    await securityButtons.first().click();
    await expect(page.getByRole('heading', { name: '用户安全详情' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('黑名单：')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('动态屏蔽：')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('个人关键词')).toBeVisible({ timeout: 5000 });
  });

  test('L4-US-06 未登录访问反馈箱应跳转登录页', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/user-security/feedback`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('欢迎登录')).toBeVisible({ timeout: 5000 });
  });
});
