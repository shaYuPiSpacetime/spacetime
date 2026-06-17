import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:5173').replace('localhost', '127.0.0.1');
const API_URL = (process.env.API_URL || 'http://127.0.0.1:8080').replace('localhost', '127.0.0.1');

const formalMenuItems = [
  { title: '推广规则配置', path: '/promotion/rule-config' },
  { title: '普通邀请关系', path: '/promotion/invite-relation' },
  { title: '普通邀请奖励流水', path: '/promotion/invite-reward' },
  { title: '冻结奖励处理页', path: '/promotion/invite-reward/frozen' },
  { title: '代理列表', path: '/promotion/agent' },
  { title: '代理结算管理', path: '/promotion/settlement' },
  { title: '推广素材与二维码管理', path: '/promotion/material' },
];

test.describe('推广裂变 E2E 测试（正式版 ADM-07 页面树）', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('L4-00 推广管理菜单符合正式版页面树', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/rule-config`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('navigation').getByText('推广裂变')).toBeVisible({ timeout: 10000 });
    for (const item of formalMenuItems) {
      await expect(page.getByRole('navigation').getByText(item.title)).toBeVisible({ timeout: 10000 });
    }
    await expect(page.getByRole('navigation').getByText('奖励审核')).not.toBeVisible();
    await expect(page.getByRole('navigation').getByText('校园代理')).not.toBeVisible();
  });

  test('L4-01 推广规则配置页展示正式版四个 Tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/rule-config`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '推广规则配置' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: '普通用户奖励' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '代理奖励' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '关系有效期' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '风控参数' })).toBeVisible();
  });

  test('L4-03 普通邀请关系列表可筛选并进入详情', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/invite-relation`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '普通邀请关系' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('邀请人姓名/手机号')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('被邀人姓名/手机号')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-04 冻结奖励处理页独立存在', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/invite-reward/frozen`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '冻结奖励处理页' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.getByText('冻结中')).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-05 代理列表新增 Dialog 交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/agent`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '代理列表' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /新增代理/ }).click();
    await expect(page.getByRole('heading', { name: '新增代理' })).toBeVisible({ timeout: 5000 });

    await page.locator('label').filter({ hasText: '代理名称' }).getByRole('textbox').fill(`E2E代理${Date.now()}`);
    await page.locator('label').filter({ hasText: '学校' }).getByRole('textbox').fill('测试大学');

    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: '新增代理' })).not.toBeVisible({ timeout: 5000 });
  });

  test('L4-06 代理详情页面展示统计与素材区域', async ({ page }) => {
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

  test('L4-07 推广素材与二维码管理页面加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/material`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '推广素材与二维码管理' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('代理ID')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-08 代理结算管理不提供人工生成入口', async ({ page }) => {
    await page.goto(`${BASE_URL}/promotion/settlement`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '代理结算管理' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('代理名称/联系人/手机号')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.getByRole('button', { name: /生成结算单/ })).not.toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-09 低权限角色写接口被拦截', async ({ page }) => {
    const { token, permissions } = await loginViaApi(page, 'promotion_low', '000000');
    expect(permissions).not.toContain('promotion:rule:risk:save');
    expect(permissions).not.toContain('promotion:agent:add');

    const riskResp = await page.request.put(`${API_URL}/admin/promotion/rule-config/risk`, {
      data: { dailyCap: 50, deviceThreshold: 5, phoneThreshold: 5, paymentThreshold: 3, freezeSwitch: true, reviewSwitch: true },
      headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
    });
    expect(riskResp.status()).toBe(403);

    const agentResp = await page.request.post(`${API_URL}/admin/promotion/agents`, {
      data: { agentName: '低权限代理' },
      headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
    });
    expect(agentResp.status()).toBe(403);
  });
});
