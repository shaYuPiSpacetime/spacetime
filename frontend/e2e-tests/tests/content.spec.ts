import { test, expect, type Page } from '@playwright/test';
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

const complianceRows = [
  { id: 1, contentType: 'user_agreement', title: '用户协议', version: 'v1.0', status: 'ENABLED', effectiveTime: '2026-07-08 09:00', h5Url: 'https://m.example.com/agreement/user' },
  { id: 2, contentType: 'privacy_policy', title: '隐私政策', version: 'v1.0', status: 'ENABLED', effectiveTime: '2026-07-08 09:00', h5Url: 'https://m.example.com/agreement/privacy' },
  { id: 3, contentType: 'third_party_list', title: '第三方信息共享清单', version: 'v1.0', status: 'ENABLED', effectiveTime: '2026-07-08 09:00', h5Url: 'https://m.example.com/privacy/third-party' },
  { id: 4, contentType: 'announcement', title: '平台功能更新公告', version: 'v1.0', status: 'DISABLED', effectiveTime: '2026-07-07 18:00', h5Url: 'https://m.example.com/notice/update' },
];

const blockWordRows = [
  { id: 1, word: '约炮', blockType: 'SEARCH_VIOLATION', matchType: 'EXACT', reasonCode: 'illegal_word', status: 'ENABLED', updateByName: '风控管理员', updateTime: '2026-07-16 10:20:00' },
  { id: 2, word: '联系方式', blockType: 'RESULT_BLOCK', matchType: 'FUZZY', reasonCode: 'privacy_limited', status: 'ENABLED', updateByName: '系统管理员', updateTime: '2026-07-15 09:18:00' },
];

async function bootstrapPrd06Content(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'prd06-e2e-token');
    localStorage.setItem('auth', JSON.stringify({
      state: {
        token: 'prd06-e2e-token',
        user: { nickname: '系统管理员', permissions: ['content:blockWord:list', 'content:blockWord:add', 'content:blockWord:edit', 'mobile:compliance:list', 'mobile:compliance:edit'] },
      },
      version: 0,
    }));
  });
  await page.route('**/api/admin/routers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, msg: 'success', data: [] }),
  }));
  await page.route('**/api/admin/dict-data/children**', (route) => {
    const dictType = new URL(route.request().url()).searchParams.get('dictType');
    const rowsByType: Record<string, Array<Record<string, unknown>>> = {
      search_block_type: [
        { id: 1, dictType, dictLabel: '搜索词违规', dictValue: 'SEARCH_VIOLATION', dictSort: 10, status: 'ENABLED' },
        { id: 2, dictType, dictLabel: '搜索结果屏蔽', dictValue: 'RESULT_BLOCK', dictSort: 20, status: 'ENABLED' },
      ],
      search_block_match_type: [
        { id: 3, dictType, dictLabel: '包含匹配', dictValue: 'FUZZY', dictSort: 10, status: 'ENABLED' },
        { id: 4, dictType, dictLabel: '精确匹配', dictValue: 'EXACT', dictSort: 20, status: 'ENABLED' },
      ],
      search_block_reason: [
        { id: 5, dictType, dictLabel: '违规词', dictValue: 'illegal_word', dictSort: 10, status: 'ENABLED' },
        { id: 6, dictType, dictLabel: '隐私限制', dictValue: 'privacy_limited', dictSort: 40, status: 'ENABLED' },
      ],
      common_status: [
        { id: 7, dictType, dictLabel: '启用', dictValue: 'ENABLED', dictSort: 10, status: 'ENABLED' },
        { id: 8, dictType, dictLabel: '停用', dictValue: 'DISABLED', dictSort: 20, status: 'ENABLED' },
      ],
      compliance_content_type: [
        { id: 9, dictType, dictLabel: '协议', dictValue: 'user_agreement', dictSort: 10, status: 'ENABLED' },
        { id: 10, dictType, dictLabel: '隐私', dictValue: 'privacy_policy', dictSort: 20, status: 'ENABLED' },
        { id: 11, dictType, dictLabel: '清单', dictValue: 'third_party_list', dictSort: 50, status: 'ENABLED' },
        { id: 12, dictType, dictLabel: '公告', dictValue: 'announcement', dictSort: 80, status: 'ENABLED' },
      ],
    };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: rowsByType[dictType || ''] || [] }),
    });
  });
  await page.route('**/api/admin/mobile-config/compliance**', async (route) => {
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: payload }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: { records: complianceRows, total: complianceRows.length } }),
    });
  });
  await page.route('**/api/admin/content/search-block-words/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'success', data: { records: blockWordRows, total: blockWordRows.length } }),
    });
  });
  await page.route('**/api/admin/content/search-block-words', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, msg: 'success', data: 99 }) });
  });
}

test.describe('PRD-06 公告协议与搜索屏蔽词闭环', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapPrd06Content(page);
  });

  test('L4-PRD06-CONTENT-01 公告与协议配置只允许刷新、预览和编辑', async ({ page }) => {
    await page.goto(`${BASE_URL}/mobile-config/compliance`);

    await expect(page.getByRole('heading', { name: '公告与协议配置' })).toBeVisible();
    await expect(page.getByText('所有配置项预先初始化，只允许编辑和预览，不允许新增或删除。')).toBeVisible();
    await expect(page.getByRole('button', { name: '刷新' })).toBeVisible();
    await expect(page.getByRole('button', { name: /新增|删除/ })).toHaveCount(0);
    await expect(page.locator('th', { hasText: '内容类型' })).toBeVisible();
    await expect(page.locator('th', { hasText: '版本' })).toBeVisible();
    await expect(page.locator('th', { hasText: '生效时间' })).toBeVisible();
    await expect(page.getByText('协议', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '预览' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '编辑' }).first()).toBeVisible();

    await page.getByRole('button', { name: '编辑' }).first().click();
    await expect(page.getByRole('heading', { name: '编辑公告与协议' })).toBeVisible();
    await expect(page.getByLabel('内容类型')).toBeDisabled();
    await expect(page.getByLabel('当前版本')).toBeDisabled();
    await expect(page.getByLabel('状态').locator('option')).toHaveText(['启用', '停用']);
    await expect(page.getByText('替换 H5 地址后版本自动递增；仅修改标题或状态不升级版本。')).toBeVisible();
  });

  test('L4-PRD06-CONTENT-02 搜索屏蔽词仅支持精确和包含匹配且无删除入口', async ({ page }) => {
    await page.goto(`${BASE_URL}/operation/search-block-words`);

    await expect(page.getByRole('heading', { name: '搜索屏蔽词' })).toBeVisible();
    await expect(page.getByText('维护持续变化的搜索风控词库，支持精确和包含匹配。')).toBeVisible();
    await expect(page.getByRole('button', { name: '新增屏蔽词' })).toBeVisible();
    await expect(page.getByRole('button', { name: /删除/ })).toHaveCount(0);
    await expect(page.locator('th', { hasText: '最近修改人' })).toBeVisible();
    await expect(page.locator('th', { hasText: '最近修改时间' })).toBeVisible();

    await page.getByRole('button', { name: '新增屏蔽词' }).click();
    const dialog = page.getByRole('dialog', { name: '新增屏蔽词' });
    await expect(dialog).toBeVisible();
    const matchSelect = dialog.getByLabel('匹配方式');
    await expect(matchSelect.locator('option')).toHaveText(['包含匹配', '精确匹配']);
    await expect(dialog.getByLabel('屏蔽原因')).toBeVisible();
  });

  test('L4-PRD06-CONTENT-03 旧内容路由重定向到正式菜单路由', async ({ page }) => {
    await page.goto(`${BASE_URL}/content/search-block-words`);
    await expect(page).toHaveURL(/\/operation\/search-block-words$/);
  });
});
