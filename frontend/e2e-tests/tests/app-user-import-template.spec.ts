import { test, expect } from '@playwright/test';
import { buildImportTemplateCsv } from '../../src/pages/customers/appUserImportTemplate';

// L4-P1-01：完全模拟 API 边界，只验证本地真实页面下载，不发送导入请求。
test.use({ video: 'off', trace: 'off' });

test('导入弹窗下载正确模板并展示替换与重复保护说明', async ({ page }) => {
  const permissions = ['user:app:view', 'user:app:import'];
  let importRequests = 0;
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/users/app/import')) {
      importRequests++;
      await route.abort('blockedbyclient');
      return;
    }
    let data: unknown = [];
    if (pathname.endsWith('/permissions')) data = permissions;
    if (pathname.endsWith('/users/app/list')) data = { records: [], current: 1, size: 9, total: 0 };
    if (pathname.endsWith('/users/app/stats')) data = { total: 0, coreAllowed: 0, relationshipOpen: 0, visitorUv7d: 0 };
    await route.fulfill({ status: 200, json: { code: 200, msg: 'success', data } });
  });
  await page.addInitScript(permissions => {
    const token = 'fixture-import-template-only';
    localStorage.setItem('token', token);
    localStorage.setItem('auth', JSON.stringify({
      state: { token, user: { nickname: '模板回归', permissions } }, version: 0,
    }));
  }, permissions);
  await page.goto('/users/app');
  await page.getByRole('button', { name: '批量导入', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/示例仅说明格式.*真实手机号/)).toBeVisible();
  await expect(dialog.getByText(/超过 500 字符/)).toBeVisible();
  await expect(dialog.getByText(/手机号已存在.*不覆盖/)).toBeVisible();
  await expect(dialog.getByText(/校验通过的行将直接入库/)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '下载模板', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('app-users-all-fields-template.csv');
  const stream = await download.createReadStream();
  if (!stream) throw new Error('模板下载流为空');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString('utf8')).toBe(`\uFEFF${buildImportTemplateCsv()}`);
  expect(importRequests).toBe(0);
  await page.screenshot({ path: test.info().outputPath('import-template-dialog.png'), fullPage: true });
});
