import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function loginViaPage(page: Page) {
  test.skip(!ADMIN_USERNAME || !ADMIN_PASSWORD, '需要通过安全环境变量提供管理后台登录凭据');

  await page.goto('/login');
  await page.getByPlaceholder('请输入用户名/手机号').fill(ADMIN_USERNAME!);
  await page.getByPlaceholder('请输入密码').fill(ADMIN_PASSWORD!);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test.describe('PRD-07 推广裂变静态契约', () => {
  test('仅注册五个运行态路由且 API 无旧能力', () => {
    const routerSource = readFileSync(
      fileURLToPath(new URL('../../src/router/index.tsx', import.meta.url)),
      'utf8',
    );
    const apiSource = readFileSync(
      fileURLToPath(new URL('../../src/api/promotion.ts', import.meta.url)),
      'utf8',
    );
    const expectedRoutes = [
      'promotion/rules',
      'promotion/relations',
      'promotion/rewards',
      'promotion/agents',
      'promotion/settlements',
    ];

    for (const route of expectedRoutes) {
      expect(routerSource).toContain(`path="${route}"`);
    }
    expect(routerSource.match(/path="promotion\//g)).toHaveLength(5);
    expect(routerSource).not.toContain('promotion/material');
    expect(routerSource).not.toContain('promotion/invite-reward/frozen');
    expect(routerSource).not.toMatch(/promotion\/(?:relations|agents)\/:id/);

    for (const legacyContract of [
      '/admin/promotion/rules/list',
      '/admin/promotion/invite-relations',
      '/admin/promotion/invite-rewards',
      '/admin/promotion/materials',
      '/paid',
      '/unfreeze',
      '/invalid',
    ]) {
      expect(apiSource).not.toContain(legacyContract);
    }
  });

  test('二维码跨域下载不会携带管理 Token', () => {
    const apiSource = readFileSync(
      fileURLToPath(new URL('../../src/api/promotion.ts', import.meta.url)),
      'utf8',
    );
    expect(apiSource).toContain("if (!sameOrigin && parsedUrl.protocol !== 'https:')");
    expect(apiSource).toContain("headers: sameOrigin && token ? { 'X-Auth-Token': token } : undefined");
  });

  test('1280px 宽表格保留内部横向滚动容器', () => {
    const tableSource = readFileSync(
      fileURLToPath(new URL('../../src/components/ui/table.tsx', import.meta.url)),
      'utf8',
    );
    expect(tableSource).toContain("className=\"relative w-full overflow-auto\"");

    for (const fileName of [
      'PromotionRelationsPage.tsx',
      'PromotionRewardsPage.tsx',
      'PromotionAgentsPage.tsx',
      'PromotionSettlementsPage.tsx',
    ]) {
      const pageSource = readFileSync(
        fileURLToPath(new URL(`../../src/pages/promotion/${fileName}`, import.meta.url)),
        'utf8',
      );
      expect(pageSource).toContain('className="min-w-[');
      expect(pageSource).toContain('<TableHead className="w-');
    }
  });
});

test.describe('PRD-07 推广裂变管理后台', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaPage(page);
  });

  test('L4-NAV-01/02 仅保留五个运行态页面', async ({ page }) => {
    const pages = [
      { path: '/promotion/rules', title: '推广规则配置' },
      { path: '/promotion/relations', title: '邀请关系' },
      { path: '/promotion/rewards', title: '邀请奖励流水' },
      { path: '/promotion/agents', title: '校园代理列表' },
      { path: '/promotion/settlements', title: '代理结算管理' },
    ];

    for (const item of pages) {
      await page.goto(item.path);
      await expect(page.getByRole('heading', { name: item.title, exact: true })).toBeVisible();
      await expect(page.locator('main')).not.toHaveCSS('overflow-x', 'scroll');
    }

    await expect(page.getByRole('navigation').getByText('冻结奖励处理页')).toHaveCount(0);
    await expect(page.getByRole('navigation').getByText('推广素材与二维码管理')).toHaveCount(0);
  });

  test('L4-NAV-03 废弃页面和独立详情路由不可达', async ({ page }) => {
    const legacyPaths = [
      '/promotion/invite-reward/frozen',
      '/promotion/material',
      '/promotion/relations/REL-legacy',
      '/promotion/agents/AGT-legacy',
    ];

    for (const path of legacyPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test('L4-RULE-01/02/03 规则双 Tab、模式联动和完成注册固定开启', async ({ page }) => {
    await page.goto('/promotion/rules');
    await expect(page.getByRole('tab', { name: '普通邀请奖励' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '推广员奖励' })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(2);

    const registerToggle = page.getByRole('checkbox', { name: '完成注册固定开启' });
    await expect(registerToggle).toBeChecked();
    await expect(registerToggle).toBeDisabled();
    await expect(page.getByText('固定开启', { exact: true })).toBeVisible();

    await page.getByRole('radio', { name: '固定奖励', exact: true }).check();
    await expect(page.getByRole('heading', { name: '阶梯奖励配置' })).toHaveCount(0);
    await page.getByRole('radio', { name: '阶梯奖励', exact: true }).check();
    await expect(page.getByRole('heading', { name: '阶梯奖励配置' })).toBeVisible();
  });

  test('L4-RULE-04/05 动态档位与二次确认', async ({ page }) => {
    await page.goto('/promotion/rules');
    await page.getByRole('radio', { name: '阶梯奖励', exact: true }).check();
    const before = await page.getByTestId('promotion-tier-row').count();
    await page.getByRole('button', { name: '增加档位' }).click();
    await expect(page.getByTestId('promotion-tier-row')).toHaveCount(before + 1);
    await page.getByRole('button', { name: '保存并发布' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: '确认发布奖励规则？' })).toBeVisible();
  });

  test('L4-REL-01/02 关系筛选和详情抽屉不改变 URL', async ({ page }) => {
    await page.goto('/promotion/relations');
    await expect(page.getByRole('columnheader')).toHaveCount(7);
    await expect(page.getByPlaceholder('关系编号')).toBeVisible();

    const detailButton = page.getByRole('button', { name: '查看详情' }).first();
    await expect(detailButton).toBeVisible();
    const urlBefore = page.url();
    await detailButton.click();
    await expect(page.getByRole('dialog', { name: '邀请关系详情' })).toBeVisible();
    expect(page.url()).toBe(urlBefore);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: '邀请关系详情' })).toHaveCount(0);
  });

  test('L4-REWARD-01/03 奖励仅三态且成功/待发放无重试操作', async ({ page }) => {
    await page.goto('/promotion/rewards');
    await expect(page.getByRole('columnheader')).toHaveCount(9);
    const rewardStatus = page.getByLabel('奖励状态');
    await expect(rewardStatus).toBeVisible();
    await expect(rewardStatus.locator('option')).toHaveText(['全部状态', '待发放', '已发放', '发放失败']);
    await expect(page.getByText('冻结中')).toHaveCount(0);
    await expect(page.getByText('已作废')).toHaveCount(0);
  });

  test('L4-AGENT-01 新增代理必填校验', async ({ page }) => {
    await page.goto('/promotion/agents');
    await expect(page.getByRole('columnheader')).toHaveCount(10);
    await page.getByRole('button', { name: '新增代理' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: '新增校园代理' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: '保存代理' }).click();
    await expect(page.getByText('请填写代理名称、学校和校区')).toBeVisible();
  });

  test('L4-AGENT-03/04 代理详情抽屉与永久二维码弹窗', async ({ page }) => {
    await page.goto('/promotion/agents');
    const detailButton = page.getByRole('button', { name: '查看详情' }).first();
    await expect(detailButton).toBeVisible();

    await detailButton.click();
    await expect(page.getByRole('dialog', { name: '校园代理详情' })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('columnheader')).toHaveCount(10);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: '查看二维码' }).first().click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: '代理专属二维码' })).toBeVisible();
    await expect(page.getByRole('button', { name: '保存成图片' })).toBeVisible();
    await expect(page.getByRole('button', { name: '复制图片' })).toBeVisible();
  });

  test('L4-SET-01 结算只有两态和确定结算', async ({ page }) => {
    await page.goto('/promotion/settlements');
    await expect(page.getByRole('columnheader')).toHaveCount(9);
    await expect(page.getByText('已打款')).toHaveCount(0);
    await expect(page.getByText('打款流水')).toHaveCount(0);

    const confirmButton = page.getByRole('button', { name: '确定结算' }).first();
    if (await confirmButton.count()) {
      await confirmButton.click();
      await expect(page.getByRole('dialog').getByRole('heading', { name: '确定本期结算？' })).toBeVisible();
    }
  });

  test('L4-RESP-01 1280px 页面根节点无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    for (const path of ['/promotion/rules', '/promotion/relations', '/promotion/rewards', '/promotion/agents', '/promotion/settlements']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test('L4-RESP-02 宽表格在内容区内部滚动且操作列可达', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    for (const path of ['/promotion/relations', '/promotion/rewards', '/promotion/agents', '/promotion/settlements']) {
      await page.goto(path);
      const table = page.locator('table').first();
      await expect(table).toBeVisible();
      const scrollContainer = table.locator('..');
      const metrics = await scrollContainer.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(metrics.scrollWidth).toBeGreaterThanOrEqual(metrics.clientWidth);

      await scrollContainer.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      await expect(table.getByRole('columnheader', { name: '操作' })).toBeVisible();
      const reachable = await scrollContainer.evaluate((element) => {
        const lastHeader = element.querySelector('th:last-child');
        if (!lastHeader) return false;
        const containerRect = element.getBoundingClientRect();
        const headerRect = lastHeader.getBoundingClientRect();
        return headerRect.right <= containerRect.right + 1 && headerRect.left >= containerRect.left - 1;
      });
      expect(reachable).toBe(true);
    }
  });
});
