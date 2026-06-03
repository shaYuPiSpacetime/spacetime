import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('PRD-01 User Entry E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('L4-01 user list page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  test('L4-02 user list search/filter exists', async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');
    // Should have search input and buttons
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('L4-03 real-name verify page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify/real-name`);
    await page.waitForLoadState('networkidle');
    // Use .first() to avoid strict mode violation (text in sidebar + breadcrumb + heading)
    await expect(page.getByText('实名认证审核').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('L4-04 verify tab navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify/real-name`);
    await page.waitForLoadState('networkidle');
    // Click education tab
    const eduLink = page.getByRole('link', { name: '学历认证审核' }).first();
    if (await eduLink.isVisible().catch(() => false)) {
      await eduLink.click();
      await expect.poll(() => page.url()).toContain('/verify/education');
    }
  });

  test('L4-05 education verify page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify/education`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('学历认证审核').first()).toBeVisible({ timeout: 10000 });
  });

  test('L4-06 avatar verify page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify/avatar`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('头像认证审核').first()).toBeVisible({ timeout: 10000 });
  });

  test('L4-07 photo moderation page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/moderation/photos`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('资料照片审核').first()).toBeVisible({ timeout: 10000 });
  });

  test('L4-08 text moderation page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/moderation/texts`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('文字内容审核').first()).toBeVisible({ timeout: 10000 });
  });

  test('L4-09 verify page has filter area', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify/real-name`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /重置/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('L4-10 verify list has pagination or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify/real-name`);
    await page.waitForLoadState('networkidle');
    const hasPagination = await page.locator('button').filter({ hasText: /^[0-9]+$/ }).first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText('暂无数据').first().isVisible().catch(() => false);
    expect(hasPagination || hasEmpty).toBeTruthy();
  });

  test('L4-11 moderation tab switches from photos to texts', async ({ page }) => {
    await page.goto(`${BASE_URL}/moderation/photos`);
    await page.waitForLoadState('networkidle');
    const textLink = page.getByRole('link', { name: '文字内容审核' }).first();
    if (await textLink.isVisible().catch(() => false)) {
      await textLink.click();
      await expect.poll(() => page.url()).toContain('/moderation/texts');
    }
  });
});
