import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const evidenceDir = resolve(process.cwd(), '../docs/测试文档/截图证据/PRD05');
const account = process.env.ADMIN_ACCOUNT;
const password = process.env.ADMIN_PASSWORD;

const pages = [
  ['/community/content', '内容管理', '01-content'],
  ['/community/moments', '动态管理', '02-moments'],
  ['/community/comment-audit', '评论管理', '03-comments'],
  ['/community/reports', '举报管理', '04-reports'],
  ['/community/topics', '家园话题管理', '05-topics'],
  ['/community/config', '审核规则配置', '06-config'],
] as const;
const selectedPage = process.env.COMMUNITY_VISUAL_PAGE;
const visualPages = selectedPage ? pages.filter(([, , file]) => file === selectedPage) : pages;

async function login(page: Page) {
  if (!account || !password) throw new Error('缺少 ADMIN_ACCOUNT 或 ADMIN_PASSWORD');
  const response = await page.request.post('/api/admin/login', { data: { account, password } });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.code).toBe(200);
  await page.goto('/login');
  await page.evaluate((data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('auth', JSON.stringify({ state: { token: data.token, user: data }, version: 0 }));
  }, payload.data);
}

test('六个真实管理页面双尺寸截图与详情抽屉', async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await login(page);

  for (const viewport of [
    { width: 1440, height: 900, suffix: '1440x900' },
    { width: 1280, height: 800, suffix: '1280x800' },
  ]) {
    await page.setViewportSize(viewport);
    for (const [path, heading, file] of visualPages) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByText('筛选区').first()).toBeVisible();
      await expect(page.getByText('内容与动态管理').first()).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('加载中')).toHaveCount(0, { timeout: 30_000 });
      await page.screenshot({ path: resolve(evidenceDir, `${file}-${viewport.suffix}.png`), fullPage: true });
    }
  }

  if (!selectedPage || selectedPage === '01-content') {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/community/content');
    await page.waitForLoadState('networkidle');
    const detail = page.getByRole('button', { name: '详情' }).first();
    await expect(detail).toBeVisible({ timeout: 30_000 });
    await detail.click();
    const dialog = page.getByRole('dialog', { name: '内容详情' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('加载中')).toHaveCount(0, { timeout: 30_000 });
    await expect(dialog.getByText('正文全文')).toBeVisible();
    await page.screenshot({ path: resolve(evidenceDir, '07-content-detail-drawer-1440x900.png'), fullPage: true });
  }
});
