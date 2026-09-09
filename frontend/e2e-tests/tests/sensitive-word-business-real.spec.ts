import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const artifacts = path.join(root, 'docs/test-artifacts');
const config: Record<string, string> = {};
for (const line of fs.readFileSync(path.join(root, 'frontend/e2e-tests/.env'), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
  if (!line.trim() || line.trimStart().startsWith('#') || !line.includes('=')) continue;
  const at = line.indexOf('=');
  config[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
}
const base = config.BASE_URL?.replace(/\/$/, '');
test.use({ trace: 'off', video: 'off', viewport: { width: 1600, height: 1100 } });

test('E2E-10 real submissions appear in all three admin modules with historical evidence', async ({ page }) => {
  test.setTimeout(180000);
  const report = JSON.parse(fs.readFileSync(path.join(artifacts, 'sensitive-word-business-real-20260909.json'), 'utf8'));
  expect(report.failed).toBe(0);
  expect(report.responsesMocked).toBe(false);
  const username = process.env.SENSITIVE_WORD_ADMIN_USERNAME;
  const password = process.env.SENSITIVE_WORD_ADMIN_PASSWORD;
  test.skip(!base || !username || !password, 'Real administrator login is required');
  await page.goto(`${base}/login`);
  await page.getByPlaceholder('请输入用户名/手机号').fill(username!);
  await page.getByPlaceholder('请输入密码').fill(password!);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  const screenshots: string[] = [];
  async function screenshot(name: string) {
    screenshots.push(name);
    await page.screenshot({ path: path.join(artifacts, name), fullPage: true });
  }

  await page.goto(`${base}/moderation/texts`);
  await page.getByPlaceholder('姓名/昵称/手机号/身份证/标签').fill(String(report.userId));
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  const intro = page.locator('tbody tr').filter({ hasText: report.records.introduction_hit.label });
  await expect(intro).toBeVisible({ timeout: 20000 });
  await expect(intro.getByText('已驳回', { exact: true })).toBeVisible();
  const qaPass = page.locator('tbody tr').filter({ hasText: report.records.qa_pass.label });
  await expect(qaPass.getByText('已通过', { exact: true })).toBeVisible();
  await screenshot('sensitive-word-business-text-list.png');
  await intro.getByRole('button', { name: '详情', exact: true }).click();
  const textEvidence = page.getByText('机审来源: 本地敏感词', { exact: true });
  await expect(textEvidence).toBeVisible({ timeout: 20000 });
  await textEvidence.scrollIntoViewIfNeeded();
  await expect(page.getByText('命中词: ' + report.records.introduction_hit.machineEvidence.word, { exact: true })).toBeVisible();
  await screenshot('sensitive-word-business-text-evidence.png');

  await page.goto(`${base}/community/content`);
  await page.getByPlaceholder('编号 / 正文 / 昵称').fill(report.prefix);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  const posts = Object.values(report.records).filter((r: any) => r.type === 'post') as any[];
  for (const record of posts) {
    await expect(page.locator('tbody tr').filter({ hasText: record.postNo })).toBeVisible({ timeout: 20000 });
  }
  await screenshot('sensitive-word-business-content-list.png');
  const postHit = page.locator('tbody tr').filter({ hasText: report.records.post_hit.postNo });
  await postHit.getByRole('button', { name: '详情', exact: true }).click();
  await expect(page.getByText('本地敏感词', { exact: true }).first()).toBeVisible({ timeout: 20000 });
  await page.getByText('本地敏感词', { exact: true }).first().scrollIntoViewIfNeeded();
  await screenshot('sensitive-word-business-content-evidence.png');

  await page.goto(`${base}/community/comment-audit`);
  await page.getByPlaceholder('评论编号 / 内容').fill(report.prefix);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  const comments = Object.values(report.records).filter((r: any) => r.type === 'comment') as any[];
  for (const record of comments) {
    await expect(page.locator('tbody tr').filter({ hasText: record.commentNo })).toBeVisible({ timeout: 20000 });
  }
  await screenshot('sensitive-word-business-comment-list.png');
  const commentHit = page.locator('tbody tr').filter({ hasText: report.records.comment_hit.commentNo });
  await commentHit.getByRole('button', { name: '详情', exact: true }).click();
  await expect(page.getByText('本地敏感词', { exact: true }).first()).toBeVisible({ timeout: 20000 });
  await page.getByText('本地敏感词', { exact: true }).first().scrollIntoViewIfNeeded();
  await screenshot('sensitive-word-business-comment-evidence.png');
  await page.reload();
  await page.getByPlaceholder('评论编号 / 内容').fill(report.prefix);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(page.locator('tbody tr').filter({ hasText: report.records.comment_hit.commentNo })).toBeVisible({ timeout: 20000 });
  fs.writeFileSync(path.join(artifacts, 'sensitive-word-business-real-ui-20260909.json'), JSON.stringify({
    result: 'PASS', caseId: 'E2E-10', verifiedAt: new Date().toISOString(), responsesMocked: false,
    userId: report.userId, textRecords: 3, postRecords: posts.length, commentRecords: comments.length,
    historicalEvidenceVisible: true, reload: true, screenshots,
  }, null, 2));
});
