import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:5173').replace('localhost', '127.0.0.1');

test.describe('推广裂变 E2E 测试（已实现页面范围）', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('L4-01 推广规则配置页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/rules`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('navigation').getByText('推广裂变')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: '规则配置' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /新增规则/ })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('风控规则')).not.toBeVisible();
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
  });

  test('L4-02 新增规则 Dialog 交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/rules`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /新增规则/ }).click();
    await expect(page.getByRole('heading', { name: '新增规则' })).toBeVisible({ timeout: 5000 });

    await page.locator('label').filter({ hasText: '规则名称' }).getByRole('textbox').fill(`E2E规则${Date.now()}`);
    await page.locator('label').filter({ hasText: '奖励金额' }).getByRole('spinbutton').fill('10');
    await expect(page.getByText('代理组')).not.toBeVisible();

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: '新增规则' })).not.toBeVisible({ timeout: 5000 });
  });

  test('L4-03 邀请关系页面筛选区和表格加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/invites`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '邀请关系' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('邀请人姓名/手机号')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('被邀人姓名/手机号')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-04 奖励审核页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/rewards`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '奖励审核' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '全部事件' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
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
    await expect(page.getByText('规则组')).not.toBeVisible();

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: '新增代理' })).not.toBeVisible({ timeout: 5000 });
  });

  test('L4-06 代理结算页面不提供人工生成入口', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/settlements`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '代理结算' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('代理名称/联系人/手机号')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.getByRole('button', { name: /生成结算单/ })).not.toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-07 推广素材与二维码页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/material`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '推广素材与二维码' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('代理ID')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-08 代理详情页面展示统计与素材区域', async ({ page }) => {
    const agentId = process.env.TEST_AGENT_ID;
    test.skip(!agentId, '需要 TEST_AGENT_ID');

    await page.goto(`${BASE_URL}/promotion/agent/${agentId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '校园代理详情' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('代理编号')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('成功口径')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: '推广素材' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: '最近推广事件' })).toBeVisible({ timeout: 5000 });
  });

  test('L4-09 低权限角色写接口被拦截', async ({ page }) => {
    const { token, permissions } = await loginViaApi(page, 'promotion_low', '000000');
    expect(permissions).not.toContain('promotion:rule:edit');
    expect(permissions).not.toContain('promotion:agent:add');

    const riskResp = await page.request.put(`${process.env.API_URL}/admin/promotion/rule-config/risk`, {
      data: { dailyCap: 50, deviceThreshold: 5, phoneThreshold: 5, paymentThreshold: 3, freezeSwitch: true, reviewSwitch: true },
      headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
    });
    expect(riskResp.status()).toBe(403);

    const agentResp = await page.request.post(`${process.env.API_URL}/admin/promotion/agents`, {
      data: { agentName: '低权限代理' },
      headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
    });
    expect(agentResp.status()).toBe(403);
  });
});
