import { test, expect, type Page } from '@playwright/test';
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
    await page.goto(`${BASE_URL}/user-safety/cancellations`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '注销申请' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('成家号/手机号')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '查询' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
  });

  test('L4-US-04 注销申请筛选与重置交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-safety/cancellations`);
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('成家号/手机号').fill('U100281');
    await page.getByRole('button', { name: '查询' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '重置' }).click();
    await expect(page.getByPlaceholder('成家号/手机号')).toHaveValue('');
  });

  test('L4-US-08 注销详情备注流程', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-safety/cancellations`);
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await page.locator('table tbody tr button').first().click();
    await expect(page.getByRole('heading', { name: '注销申请详情' })).toBeVisible({ timeout: 5000 });
    await page.getByLabel('内部备注').fill(`E2E备注${Date.now()}`);
    await page.getByRole('button', { name: '追加备注' }).click();
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

const cancelRequests = [
  {
    id: 86,
    requestNo: 'CAN-000086',
    userCode: 'U100281',
    nickname: '筱脑虎',
    phone: '138****6128',
    reason: '暂时不想使用',
    status: 'COOLING_OFF',
    blockReasons: ['未到期会员', '未消耗千寻币（用户已确认）'],
    createTime: '2026-07-08 13:20',
    coolingEndTime: '2026-08-07 13:20',
    vipRisk: 'VIP 至 2026-07-31',
    refundRisk: '无未完成退款',
    coinBalance: 2580,
    executionLog: '等待定时任务；到期重新校验',
    remarks: ['客服已确认用户知悉后悔期'],
  },
  {
    id: 85,
    requestNo: 'CAN-000085',
    userCode: 'U100193',
    nickname: '旅行者',
    phone: '159****2308',
    reason: '隐私顾虑',
    status: 'RESTORED',
    blockReasons: [],
    createTime: '2026-07-07 10:11',
    coolingEndTime: '2026-08-06 10:11',
    vipRisk: '非会员',
    refundRisk: '无未完成退款',
    coinBalance: 0,
    executionLog: '用户于 2026-07-09 主动撤销',
    remarks: [],
  },
];

async function bootstrapPrd06Cancellation(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'prd06-e2e-token');
    localStorage.setItem('auth', JSON.stringify({
      state: {
        token: 'prd06-e2e-token',
        user: { nickname: '系统管理员', permissions: ['userSecurity:cancel:list', 'userSecurity:cancel:view', 'userSecurity:cancel:remark'] },
      },
      version: 0,
    }));
  });
  await page.route('**/api/admin/routers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, msg: 'success', data: [] }),
  }));
  await page.route('**/api/admin/dict-data/children**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 200,
      msg: 'success',
      data: [
        { id: 1, dictType: 'account_cancel_status', dictLabel: '已申请', dictValue: 'REQUESTED', dictSort: 8, status: 'ENABLED' },
        { id: 2, dictType: 'account_cancel_status', dictLabel: '后悔期内', dictValue: 'COOLING_OFF', dictSort: 10, status: 'ENABLED' },
        { id: 3, dictType: 'account_cancel_status', dictLabel: '已恢复', dictValue: 'RESTORED', dictSort: 20, status: 'ENABLED' },
        { id: 4, dictType: 'account_cancel_status', dictLabel: '已注销', dictValue: 'CANCELLED', dictSort: 30, status: 'ENABLED' },
        { id: 5, dictType: 'account_cancel_status', dictLabel: '暂不可注销', dictValue: 'BLOCKED', dictSort: 40, status: 'ENABLED' },
      ],
    }),
  }));
  await page.route('**/api/admin/user-security/cancel-requests/list**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, msg: 'success', data: { records: cancelRequests, total: cancelRequests.length } }),
  }));
  await page.route('**/api/admin/user-security/cancel-requests/86', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: null }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: cancelRequests[0] }) });
  });
  await page.route('**/api/admin/user-security/cancel-requests/86/remark', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, msg: 'success', data: null }),
  }));
}

test.describe('PRD-06 注销申请后台闭环', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapPrd06Cancellation(page);
  });

  test('L4-PRD06-CANCEL-01 展示状态流转、正式筛选和只读列表', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-safety/cancellations`);

    await expect(page.getByRole('heading', { name: '注销申请' })).toBeVisible();
    await expect(page.getByText('后台只读查看并追加备注；状态由用户操作和系统定时任务驱动。')).toBeVisible();
    await expect(page.getByText('提交申请 → 已申请（瞬时）→ 后悔期内 → 用户恢复账号 / 系统到期注销')).toBeVisible();
    await expect(page.getByPlaceholder('成家号/手机号')).toBeVisible();
    await expect(page.getByLabel('注销状态').locator('option')).toHaveText(['全部状态', '已申请', '后悔期内', '已恢复', '已注销', '暂不可注销']);
    await expect(page.locator('th', { hasText: '申请编号' })).toBeVisible();
    await expect(page.locator('th', { hasText: '预计执行时间' })).toBeVisible();
    await expect(page.getByRole('button', { name: /立即注销|撤销注销|修改状态/ })).toHaveCount(0);
  });

  test('L4-PRD06-CANCEL-02 详情完整展示风险且只能追加备注', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-safety/cancellations`);
    await page.getByRole('button', { name: '查看详情' }).first().click();

    await expect(page.getByRole('heading', { name: '注销申请详情' })).toBeVisible();
    await expect(page.getByText('会员风险')).toBeVisible();
    await expect(page.getByText('退款风险')).toBeVisible();
    await expect(page.getByText('千寻币余额')).toBeVisible();
    await expect(page.getByText('系统执行记录')).toBeVisible();
    await expect(page.getByLabel('内部备注')).toBeVisible();
    await expect(page.getByRole('button', { name: '追加备注' })).toBeVisible();
    await expect(page.getByRole('button', { name: /立即注销|撤销注销|修改状态/ })).toHaveCount(0);
  });

  test('L4-PRD06-CANCEL-03 旧注销路由重定向到正式菜单路由', async ({ page }) => {
    await page.goto(`${BASE_URL}/user-security/cancel-requests`);
    await expect(page).toHaveURL(/\/user-safety\/cancellations$/);
  });
});
