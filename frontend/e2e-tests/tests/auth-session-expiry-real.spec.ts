import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// AUTH-09: real API and UI flow; never inject or mock authentication.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const cfg: Record<string, string> = {};
const envFile = path.join(root, 'frontend/e2e-tests/.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
  if (!line.trim() || line.trimStart().startsWith('#') || !line.includes('=')) continue;
  const at = line.indexOf('=');
  cfg[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
}
const base = (process.env.BASE_URL || cfg.BASE_URL)?.replace(/\/$/, '');
const api = (process.env.API_URL || cfg.API_URL)?.replace(/\/$/, '');
const account = process.env.ADMIN_USERNAME || cfg.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD || cfg.ADMIN_PASSWORD;
test.use({ trace: 'off', video: 'off' });

test('AUTH-09 real session invalidation recovers to login and can sign in again', async ({ page }) => {
  test.skip(!base || !api || !account || !password, 'Requires configured URLs and an authorized admin account');
  test.setTimeout(60000);
  const activeTokens = new Set<string>();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const signIn = async () => {
    await page.getByPlaceholder('请输入用户名/手机号').fill(account!);
    await page.getByPlaceholder('请输入密码').fill(password!);
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('heading', { name: '首页概览' })).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(Boolean(token)).toBe(true);
    activeTokens.add(token!);
    return token!;
  };
  try {
    await page.goto(`${base}/login`);
    const expiredToken = await signIn();
    const valid = await page.request.get(`${api}/admin/permissions`, { headers: { 'X-Auth-Token': expiredToken } });
    expect(valid.status()).toBe(200);
    expect((await valid.json()).code).toBe(200);
    // Only revoke this newly created test session, via the normal logout endpoint.
    const revoked = await page.request.post(`${api}/admin/logout`, { headers: { 'X-Auth-Token': expiredToken } });
    expect(revoked.status()).toBe(200);
    expect((await revoked.json()).code).toBe(200);
    activeTokens.delete(expiredToken);
    const invalid = await page.request.get(`${api}/admin/permissions`, { headers: { 'X-Auth-Token': expiredToken } });
    expect(invalid.status()).toBe(401);

    let documents = 0;
    let unauthorized = 0;
    page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) documents++; });
    page.on('response', r => { if (r.url().includes('/api/admin/') && r.status() === 401) unauthorized++; });
    await page.reload(); // Browser still holds the revoked token, reproducing an expired session.
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token') === null && localStorage.getItem('auth') === null)).toBe(true);
    await page.waitForTimeout(1000);
    expect(documents).toBe(1);
    expect(unauthorized).toBeGreaterThan(0);
    const artifactDir = path.join(root, 'docs/test-artifacts');
    fs.mkdirSync(artifactDir, { recursive: true });
    await page.screenshot({ path: path.join(artifactDir, 'admin-session-expired-login.png'), fullPage: true });

    const newToken = await signIn();
    expect(newToken !== expiredToken).toBe(true);
    expect(documents).toBe(1); // Re-login is a router transition, not a hard reload.
    const recoveryDocumentCount = documents;
    const listResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin/sensitive-words' && r.request().method() === 'GET');
    await page.goto(`${base}/sensitive-words`);
    await expect(page.getByRole('heading', { name: '敏感词管理', exact: true })).toBeVisible();
    const list = await listResponse;
    expect(list.status()).toBe(200);
    const result = await list.json();
    expect(result.code).toBe(200);
    expect(result.data.total).toBeGreaterThan(0);
    expect(result.data.records.length).toBeGreaterThan(0);
    await expect(page.getByRole('cell', { name: result.data.records[0].word, exact: true })).toBeVisible();
    await expect(page.getByText('加载中…', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Request failed', { exact: false })).toHaveCount(0);
    await page.screenshot({ path: path.join(artifactDir, 'admin-session-relogin-data.png'), fullPage: true });
    await page.getByRole('button', { name: '退出', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token') === null && localStorage.getItem('auth') === null)).toBe(true);
    expect(errors).toEqual([]);
    fs.writeFileSync(path.join(artifactDir, 'admin-session-expiry-real.json'), JSON.stringify({
      date: new Date().toISOString(), base, api, result: 'PASS', originalPermissionStatus: valid.status(),
      revokedPermissionStatus: invalid.status(), browserUnauthorizedResponses: unauthorized,
      documentsThroughRecoveryAndRelogin: recoveryDocumentCount, sensitiveWordTotal: result.data.total,
      reloginSuccess: true, manualLogoutSuccess: true, pageErrors: errors,
    }, null, 2));
  } finally {
    for (const token of activeTokens) await page.request.post(`${api}/admin/logout`, { headers: { 'X-Auth-Token': token } }).catch(() => {});
  }
});
