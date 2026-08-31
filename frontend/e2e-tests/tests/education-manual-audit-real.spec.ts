import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const statePath = process.env.TEST_STATE_FILE
  || path.resolve(process.cwd(), '../backend/tmp/education-manual-audit-state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as { userId: number; recordId: number };

test('管理后台页面应完成人工学历审核', async ({ page }) => {
  const account = process.env.ADMIN_ACCOUNT;
  const password = process.env.ADMIN_PASSWORD;
  if (!account || !password) throw new Error('ADMIN_ACCOUNT/ADMIN_PASSWORD 未配置');

  await page.goto('/login');
  await page.getByPlaceholder('请输入用户名/手机号').fill(account);
  await page.getByPlaceholder('请输入密码').fill(password);
  await Promise.all([
    page.waitForURL('**/dashboard'),
    page.getByRole('button', { name: '登录' }).click(),
  ]);

  const listResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/admin/verify/education/list') && response.request().method() === 'GET'
  );
  await page.goto('/verify/education');
  const listResponse = await listResponsePromise;
  const listJson = await listResponse.json();
  const records = listJson?.data?.records || [];
  const rowIndex = records.findIndex((record: { id: number }) => record.id === state.recordId);
  expect(rowIndex).toBeGreaterThanOrEqual(0);

  const row = page.locator('tbody tr').nth(rowIndex);
  await expect(row).toContainText('待审核');
  await expect(row).toContainText('人工审核');
  await row.getByRole('button', { name: /详情/ }).click();

  const detailDialog = page.getByRole('dialog').filter({ hasText: '学历认证审核详情' });
  await expect(detailDialog).toBeVisible();
  await expect(detailDialog).toContainText(`用户ID: ${state.userId}`);
  await expect(detailDialog).toContainText('当前状态: 待审核');
  await expect(detailDialog).toContainText('审核来源: 人工审核');

  await detailDialog.getByRole('button', { name: /通过/ }).click();
  const confirmDialog = page.getByRole('dialog').filter({ hasText: '通过确认' });
  await expect(confirmDialog).toBeVisible();
  const auditResponsePromise = page.waitForResponse((response) =>
    response.url().includes(`/admin/verify/education/${state.recordId}/audit`)
      && response.request().method() === 'POST'
  );
  await confirmDialog.getByRole('button', { name: '确认' }).click();
  const auditResponse = await auditResponsePromise;
  expect(auditResponse.ok()).toBeTruthy();

  await expect(detailDialog).toContainText('当前状态: 已通过');
  await expect(detailDialog).toContainText('审核来源: 人工审核');
  await expect(detailDialog).toContainText('人工通过');
  await page.screenshot({
    path: path.resolve(process.cwd(), '../backend/tmp/education-manual-audit-approved.png'),
    fullPage: true,
  });
});
