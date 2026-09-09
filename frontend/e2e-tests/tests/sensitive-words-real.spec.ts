import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Real requests only. Credentials remain in the private env file/process memory.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const envPath = path.join(root, 'frontend/e2e-tests/.env');
const cfg: Record<string, string> = {};
for (const line of fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
  if (!line.trim() || line.trimStart().startsWith('#') || !line.includes('=')) continue;
  const at = line.indexOf('=');
  cfg[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
}
const base = cfg.BASE_URL?.replace(/\/$/, '');
const api = cfg.API_URL?.replace(/\/$/, '');
const username = process.env.SENSITIVE_WORD_ADMIN_USERNAME || cfg.ADMIN_USERNAME;
const password = process.env.SENSITIVE_WORD_ADMIN_PASSWORD || cfg.ADMIN_PASSWORD;
const suppliedToken = process.env.SENSITIVE_WORD_ADMIN_TOKEN || cfg.TOKEN;
const artifacts = path.join(root, 'docs/test-artifacts');
test.use({ trace: 'off', video: 'off' });

async function login(page: Page): Promise<string> {
  if (username && password) {
    await page.goto(`${base}/login`);
    await page.getByPlaceholder('请输入用户名/手机号').fill(username);
    await page.getByPlaceholder('请输入密码').fill(password);
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    return (await page.evaluate(() => localStorage.getItem('token')))!;
  }
  const response = await page.request.get(`${api}/admin/permissions`, { headers: { 'X-Auth-Token': suppliedToken! } });
  const result = await response.json();
  expect(response.status()).toBe(200);
  expect(result.code).toBe(200);
  expect(Array.isArray(result.data)).toBe(true);
  await page.goto(`${base}/login`);
  await page.evaluate(({ token, permissions }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('auth', JSON.stringify({ state: { token, user: { nickname: '验收会话', permissions } }, version: 0 }));
  }, { token: suppliedToken!, permissions: result.data });
  return suppliedToken!;
}

test('real unauthenticated route redirects to login without requesting vocabulary', async ({ page }) => {
  test.skip(!base || !api, 'BASE_URL / API_URL must be configured');
  const wordRequests: string[] = [];
  page.on('request', req => { if (req.url().includes('/admin/sensitive-words')) wordRequests.push(req.method()); });
  await page.goto(`${base}/sensitive-words`);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByPlaceholder('请输入用户名/手机号')).toBeVisible();
  await expect(page.getByPlaceholder('请输入密码')).toBeVisible();
  expect(wordRequests).toEqual([]);
  await page.screenshot({ path: path.join(artifacts, 'sensitive-word-real-login-required.png'), fullPage: true });
});

test('real operations menu, vocabulary data, filters and reload', async ({ page }) => {
  test.skip(!base || !api, 'BASE_URL / API_URL must be configured');
  test.skip(!suppliedToken && !(username && password), 'A real administrator session is required');
  test.setTimeout(180000);
  const baselinePath = process.env.SENSITIVE_WORD_ACCEPTANCE_BASELINE || path.join(artifacts, 'sensitive-word-dev-data-verification-20260909.json');
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const token = await login(page);
  const get = async (query: string) => {
    const response = await page.request.get(`${api}/admin/sensitive-words${query}`, { headers: { 'X-Auth-Token': token } });
    const result = await response.json();
    expect(response.status()).toBe(200);
    expect(result.code).toBe(200);
    return result.data;
  };
  const categories = await get('/categories');
  expect(categories).toHaveLength(18);
  expect((await get('?page=1&size=20')).total).toBe(baseline.activeWords);
  expect((await get('?page=1&size=20&status=DISABLED')).total).toBe(baseline.statusCounts.DISABLED || 0);
  expect((await get('?page=1&size=20&status=ENABLED')).total).toBe(baseline.statusCounts.ENABLED || 0);
  for (let offset = 0; offset < categories.length; offset += 4) {
    await Promise.all(categories.slice(offset, offset + 4).map(async (item: any) => {
      expect((await get(`?page=1&size=1&categoryCode=${encodeURIComponent(item.code)}`)).total).toBe(baseline.categoryCounts[item.code] || 0);
    }));
  }
  const samples = baseline.representativeSamples;
  expect(samples.length).toBeGreaterThan(0);
  for (let offset = 0; offset < samples.length; offset += 4) {
    await Promise.all(samples.slice(offset, offset + 4).map(async (sample: any) => {
      const detail = await get('/' + sample.id);
      expect(detail.word).toBe(sample.word);
      expect(detail.categoryCode).toBe(sample.categoryCode);
      expect(detail.status).toBe(baseline.initialStatus);
    }));
  }
  await page.goto(`${base}/moderation/texts`);
  const operation = page.locator('aside').getByRole('button', { name: '运营中心', exact: true });
  const menu = page.locator('aside').getByRole('link', { name: '敏感词管理', exact: true });
  await expect(operation).toBeVisible();
  if (!(await menu.isVisible())) await operation.click();
  await expect(menu).toBeVisible();
  await operation.click();
  await expect(menu).toHaveCount(0);
  await operation.click();
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS('padding-left', '16px');
  const listResponse = page.waitForResponse(r => r.url().includes('/api/admin/sensitive-words?') && r.request().method() === 'GET', { timeout: 15000 });
  await menu.click();
  expect((await (await listResponse).json()).code).toBe(200);
  await expect(page).toHaveURL(/\/sensitive-words$/);
  await expect(page.getByText(`共${baseline.activeWords}条记录`, { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('tbody tr')).toHaveCount(20);
  await expect(page.locator('tbody tr').first().getByText(baseline.initialStatus === 'ENABLED' ? '启用' : '停用', { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'sensitive-word-real-initialized-list.png'), fullPage: true });
  await page.getByRole('button', { name: '全部状态', exact: true }).click();
  await page.getByRole('button', { name: baseline.initialStatus === 'ENABLED' ? '停用' : '启用', exact: true }).first().click();
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByText('暂无符合条件的敏感词', { exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '重置', exact: true }).click();
  await page.getByRole('textbox', { name: '搜索敏感词' }).fill(samples[0].word);
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByRole('cell').filter({ hasText: samples[0].word }).first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: path.join(artifacts, 'sensitive-word-real-source-search.png'), fullPage: true });
  await page.reload();
  await expect(page.getByText(`共${baseline.activeWords}条记录`, { exact: false })).toBeVisible({ timeout: 15000 });
  if (username && password) {
    const logout = await page.request.post(`${api}/admin/logout`, { headers: { 'X-Auth-Token': token } });
    expect((await logout.json()).code).toBe(200);
    await page.evaluate(() => localStorage.clear());
    await login(page);
    await page.goto(`${base}/sensitive-words`);
    await expect(page.getByText(`共${baseline.activeWords}条记录`, { exact: false })).toBeVisible({ timeout: 15000 });
  }
  fs.writeFileSync(path.join(artifacts, 'sensitive-word-real-page.json'), JSON.stringify({ result: 'PASS',
    authenticatedWith: username && password ? 'real browser login' : 'configured real token',
    baselineKind: baseline.baselineKind || 'initialization', archiveSha256: baseline.archiveSha256, activeWords: baseline.activeWords, enabledWords: baseline.statusCounts.ENABLED || 0,
    disabledWords: baseline.statusCounts.DISABLED || 0, categories: categories.length, populatedCategories: baseline.populatedCategoryCount,
    realCategoryTotalsVerified: true, menuParent: '运营中心', operationCollapseVerified: true, reload: true, relogin: Boolean(username && password), sourceSearch: true,
    responsesMocked: false, verifiedAt: new Date().toISOString() }, null, 2));
});


test('real moderation data is visible in its existing module', async ({ page }) => {
  test.skip(!suppliedToken && !(username && password), 'A real administrator session is required');
  const token = await login(page);
  const response = await page.request.get(`${api}/admin/moderation/texts/list?page=1&size=10`, { headers: { 'X-Auth-Token': token } });
  const payload = await response.json();
  expect(payload.code).toBe(200);
  expect(payload.data.total).toBeGreaterThan(0);
  await page.goto(`${base}/moderation/texts`);
  await expect(page.getByText(`共${payload.data.total}条记录`, { exact: false })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(payload.data.records.length);
  await page.screenshot({ path: path.join(artifacts, 'sensitive-word-real-text-audits.png'), fullPage: true });
  const counts: Record<string, number> = { textAudits: payload.data.total };
  for (const [name, endpoint] of [
    ['contentPosts', '/admin/community/posts/list?scope=content&page=1&size=1'],
    ['moments', '/admin/community/posts/list?scope=moments&page=1&size=1'],
    ['comments', '/admin/community/comments/list?page=1&size=1'],
  ]) {
    const r = await page.request.get(`${api}${endpoint}`, { headers: { 'X-Auth-Token': token } });
    const body = await r.json();
    expect(body.code).toBe(200);
    counts[name] = body.data.total;
  }
  fs.writeFileSync(path.join(artifacts, 'sensitive-word-real-audit-pages.json'), JSON.stringify({ result: 'PASS', counts, responsesMocked: false, verifiedAt: new Date().toISOString() }, null, 2));
});


test('real role permissions protect menu buttons and all write APIs', async ({ browser }) => {
  test.skip(!(username && password), 'Administrator credentials are required to create isolated role fixtures');
  test.setTimeout(240000);
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const adminToken = await login(adminPage);
  const users: Array<{ id: number; account: string }> = [];
  const roles: Array<{ id: number; code: string }> = [];
  let wordId: number | null = null;
  const suffix = Math.random().toString(36).slice(2, 10);
  const word = '权限回归_' + suffix;
  const call = async (token: string, method: string, endpoint: string, data?: object) => {
    const r = await adminContext.request.fetch(`${api}${endpoint}`, { method, headers: { 'X-Auth-Token': token }, data });
    return { http: r.status(), body: await r.json() };
  };
  const ok = async (method: string, endpoint: string, data?: object) => {
    const r = await call(adminToken, method, endpoint, data);
    expect(r.http).toBe(200); expect(r.body.code).toBe(200); return r.body.data;
  };
  const modes = [
    { name: 'none', permissions: [] },
    { name: 'read', permissions: ['sensitive-word:list'] },
    { name: 'edit', permissions: ['sensitive-word:list', 'sensitive-word:edit'] },
    { name: 'delete', permissions: ['sensitive-word:list', 'sensitive-word:delete'] },
  ];
  try {
    const menus: any[] = [];
    const flatten = (nodes: any[]) => { for (const n of nodes) { menus.push(n); flatten(n.children || []); } };
    flatten(await ok('GET', '/admin/menu/tree'));
    wordId = await ok('POST', '/admin/sensitive-words', { word, categoryCode: 'OTHER', status: 'ENABLED' });
    for (const mode of modes) {
      const account = 'sw_' + mode.name + '_' + suffix;
      const pass = 'Sw!' + crypto.randomUUID();
      await ok('POST', '/admin/user', { username: account, password: pass, nickname: '敏感词权限验收', status: 'ENABLED' });
      const found = (await ok('GET', '/admin/user/list?page=1&size=20&keyword=' + account)).records.find((u: any) => u.username === account);
      expect(found).toBeTruthy(); users.push({ id: found.id, account });
      if (mode.permissions.length) {
        const code = 'sw_' + mode.name + '_' + suffix;
        await ok('POST', '/admin/role', { roleName: code, roleCode: code, status: 'ENABLED', remark: '本次敏感词权限验收临时角色' });
        const role = (await ok('GET', '/admin/role/list?page=1&size=20&keyword=' + code)).records.find((r: any) => r.roleCode === code);
        expect(role).toBeTruthy(); roles.push({ id: role.id, code });
        const ids = mode.permissions.map(perm => menus.find(m => m.perms === perm)?.id);
        ids.push(menus.find(m => m.menuName === '运营中心' && m.parentId === 0)?.id);
        expect(ids.every(Boolean)).toBe(true);
        await ok('PUT', `/admin/role/${role.id}/menus`, { roleId: role.id, menuIds: ids });
        await ok('PUT', `/admin/user/${found.id}/roles`, { userId: found.id, roleIds: [role.id] });
      }
      const context = await browser.newContext();
      try {
        const p = await context.newPage();
        await p.goto(`${base}/login`);
        await p.getByPlaceholder('请输入用户名/手机号').fill(account);
        await p.getByPlaceholder('请输入密码').fill(pass);
        await p.getByRole('button', { name: '登录', exact: true }).click();
        await expect(p).toHaveURL(/\/dashboard$/);
        const token = (await p.evaluate(() => localStorage.getItem('token')))!;
        let wordRequests = 0;
        p.on('request', r => { if (r.url().includes('/admin/sensitive-words')) wordRequests++; });
        await p.goto(`${base}/sensitive-words`);
        if (mode.name === 'none') {
          await expect(p.getByText('您没有访问该页面的权限')).toBeVisible();
          expect(wordRequests).toBe(0);
          await expect(p.getByRole('link', { name: '敏感词管理', exact: true })).toHaveCount(0);
          expect((await call(token, 'GET', '/admin/sensitive-words?page=1&size=1')).http).toBe(403);
        } else {
          await expect(p.getByRole('link', { name: '敏感词管理', exact: true })).toBeVisible();
          await expect(p.locator('tbody tr').first()).toBeVisible();
          await expect(p.getByRole('button', { name: '新增敏感词', exact: true })).toHaveCount(0);
          if (mode.name === 'edit') await expect(p.getByRole('button', { name: '编辑', exact: true }).first()).toBeVisible();
          else await expect(p.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0);
          if (mode.name === 'delete') await expect(p.getByRole('button', { name: '删除', exact: true }).first()).toBeVisible();
          else await expect(p.getByRole('button', { name: '删除', exact: true })).toHaveCount(0);
        }
        expect((await call(token, 'POST', '/admin/sensitive-words', { word: word + '_forbidden', categoryCode: 'OTHER', status: 'ENABLED' })).http).toBe(403);
        const edit = await call(token, 'PATCH', `/admin/sensitive-words/${wordId}/status`, { status: 'DISABLED' });
        expect(edit.http).toBe(mode.name === 'edit' ? 200 : 403);
        const remove = await call(token, 'DELETE', `/admin/sensitive-words/${wordId}`);
        expect(remove.http).toBe(mode.name === 'delete' ? 200 : 403);
        if (mode.name === 'delete') { expect(remove.body.code).toBe(200); wordId = null; }
      } finally { await context.close(); }
    }
  } finally {
    if (wordId !== null) await ok('DELETE', `/admin/sensitive-words/${wordId}`);
    for (const user of users) {
      expect((await ok('GET', `/admin/user/${user.id}`)).username).toBe(user.account);
      await ok('DELETE', `/admin/user/${user.id}`);
    }
    for (const role of roles) {
      expect((await ok('GET', `/admin/role/${role.id}`)).roleCode).toBe(role.code);
      await ok('DELETE', `/admin/role/${role.id}`);
    }
    await adminContext.close();
  }
  fs.writeFileSync(path.join(artifacts, 'sensitive-word-real-rbac.json'), JSON.stringify({ result: 'PASS', roles: modes.map(m => m.name), temporaryUsersCleaned: users.length, temporaryRolesCleaned: roles.length, ownTestWordDeleted: true, responsesMocked: false }, null, 2));
});
