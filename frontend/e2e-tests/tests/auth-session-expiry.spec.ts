import { test, expect, type Page, type Route } from '@playwright/test';

// Derived from docs/测试文档/后台登录过期-testcase.md.
// Controlled boundary tests use the Vite application modules; all /api traffic is intercepted.
const OLD = 'fixture-old-session';
const NEW = 'fixture-new-session';
const user = { nickname: '认证回归', permissions: ['current-permission'] };
test.use({ trace: 'off', video: 'off' });

async function respond(route: Route, code = 200, data: unknown = [], status = 200) {
  await route.fulfill({ status, json: { code, msg: code === 401 ? '登录已过期' : 'success', data } });
}
async function defaults(page: Page) {
  await page.route(/^https?:\/\/[^/]+\/api\//, route => {
    if (new URL(route.request().url()).pathname === '/api/admin/login') {
      return respond(route, 200, { ...user, token: NEW });
    }
    return respond(route, 200, new URL(route.request().url()).pathname.endsWith('/permissions') ? user.permissions : []);
  });
}
async function seed(page: Page, token: string | null = OLD, persisted: string | null = OLD) {
  await page.goto('/login');
  // Seed ONCE, so a real reload cannot silently restore test authentication.
  await page.evaluate(({ token, persisted, user }) => {
    if (token) localStorage.setItem('token', token);
    if (persisted) localStorage.setItem('auth', JSON.stringify({ state: { token: persisted, user }, version: 0 }));
    localStorage.setItem('unrelated-preference', 'keep-me');
  }, { token, persisted, user });
}
async function boot(page: Page) {
  await defaults(page);
  await seed(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: '首页概览' })).toBeVisible();
}
async function modules(page: Page) {
  return page.evaluate(() => {
    // Reuse the exact loaded URLs (including Vite HMR timestamps), not duplicate store instances.
    const find = (path: string) => {
      const resource = performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === path);
      if (!resource) throw new Error(`Application module was not loaded: ${path}`);
      return resource.name;
    };
    return { request: find('/src/api/request.ts'), auth: find('/src/stores/authStore.ts'), menu: find('/src/stores/menuStore.ts') };
  });
}
async function callApi(page: Page, url: string) {
  return page.evaluate(async ({ url, module }) => {
    const { default: request } = await import(module);
    try { await request.get(url); } catch { /* The assertions inspect session/UI state. */ }
  }, { url, module: (await modules(page)).request });
}
async function queueApi(page: Page, url: string) {
  await page.evaluate(async ({ url, module }) => {
    const { default: request } = await import(module);
    void request.get(url).catch(() => {});
  }, { url, module: (await modules(page)).request });
}
async function cleared(page: Page) {
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => ({ token: localStorage.getItem('token'), auth: localStorage.getItem('auth'), preference: localStorage.getItem('unrelated-preference') })))
    .toEqual({ token: null, auth: null, preference: 'keep-me' });
}
async function login(page: Page) {
  await page.getByPlaceholder('请输入用户名/手机号').fill('fixture-account');
  await page.getByPlaceholder('请输入密码').fill('fixture-password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '首页概览' })).toBeVisible();
}
function documents(page: Page) {
  const requests: string[] = [];
  page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) requests.push(r.url()); });
  return requests;
}

test('AUTH-01 HTTP401 clears both caches and does not reload the document', async ({ page }) => {
  await defaults(page);
  await seed(page);
  await page.route('**/api/admin/permissions', route => respond(route, 401, null, 401));
  const navigations = documents(page);
  await page.goto('/dashboard');
  await page.waitForTimeout(1000);
  expect(navigations).toHaveLength(1);
  await cleared(page);
  await page.getByPlaceholder('请输入用户名/手机号').fill('can-type-after-expiry');
  await page.waitForTimeout(1000); // Observe stability, rather than only a transient /login URL.
  expect(navigations).toHaveLength(1);
  await expect(page.getByPlaceholder('请输入用户名/手机号')).toHaveValue('can-type-after-expiry');
});

for (const [name, token, persisted] of [
  ['auth only', null, OLD], ['mismatched caches', NEW, OLD], ['token only', OLD, null],
] as const) {
  test(`AUTH-02 repairs historical ${name}`, async ({ page }) => {
    await defaults(page);
    await seed(page, token, persisted);
    await page.goto('/login');
    await cleared(page);
  });
}

test('AUTH-03 concurrent 401 responses do not repeatedly navigate', async ({ page }) => {
  await boot(page);
  await page.route('**/api/admin/**', route => respond(route, 401, null, 401));
  const navigations = documents(page);
  await Promise.all([callApi(page, '/admin/permissions'), callApi(page, '/admin/routers')]);
  await cleared(page);
  await page.waitForTimeout(500);
  expect(navigations).toHaveLength(0);
});

test('AUTH-04 business code 401 also expires the session', async ({ page }) => {
  await boot(page);
  await page.route('**/api/admin/permissions', route => respond(route, 401));
  await callApi(page, '/admin/permissions');
  await cleared(page);
});

test('AUTH-05 login 401 retains form and server error without navigation', async ({ page }) => {
  await defaults(page);
  await page.goto('/login');
  await page.route('**/api/admin/login', route => route.fulfill({ status: 401, json: { code: 401, msg: '用户名或密码错误' } }));
  await page.getByPlaceholder('请输入用户名/手机号').fill('fixture-account');
  await page.getByPlaceholder('请输入密码').fill('fixture-password');
  const navigations = documents(page);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByText('用户名或密码错误', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('请输入用户名/手机号')).toHaveValue('fixture-account');
  expect(navigations).toHaveLength(0);
});

for (const status of [401, 200]) {
  test(`AUTH-06 late old-session 401 (HTTP ${status}) cannot clear a new login`, async ({ page }) => {
    await boot(page);
    let held: Route | undefined;
    await page.route('**/api/admin/permissions?late=1', route => { held = route; });
    await queueApi(page, '/admin/permissions?late=1');
    await expect.poll(() => !!held).toBe(true);
    expect(held!.request().headers()['x-auth-token']).toBe(OLD);
    await page.route('**/api/admin/permissions?expire=1', route => respond(route, 401, null, 401));
    await callApi(page, '/admin/permissions?expire=1');
    await cleared(page);
    await login(page);
    const navigations = documents(page);
    const response = page.waitForResponse(r => r.url().endsWith('permissions?late=1'));
    await respond(held!, 401, null, status);
    await response;
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(NEW);
    expect(navigations).toHaveLength(0);
  });
}

test('AUTH-07 manual logout clears immediately and sends its original token', async ({ page }) => {
  await boot(page);
  let held: Route | undefined;
  await page.route('**/api/admin/logout', route => { held = route; });
  await page.getByRole('button', { name: '退出', exact: true }).click();
  await cleared(page);
  await expect.poll(() => !!held).toBe(true);
  expect(held!.request().headers()['x-auth-token']).toBe(OLD);
  await login(page);
  await respond(held!, 401, null, 401);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(NEW);
  await expect(page).toHaveURL(/\/dashboard$/);
});

for (const status of [403, 500, 'network'] as const) {
  test(`AUTH-08 ${status} does not expire authentication`, async ({ page }) => {
    await boot(page);
    await page.route('**/api/admin/permissions?error=1', route => status === 'network' ? route.abort('failed') : respond(route, status, null, status));
    await callApi(page, '/admin/permissions?error=1');
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(OLD);
    await expect(page).toHaveURL(/\/dashboard$/);
  });
}

test('AUTH-10 late permissions and menus cannot overwrite the new session', async ({ page }) => {
  await boot(page);
  const held: Route[] = [];
  await page.route('**/api/admin/{permissions,routers}', route => {
    if (route.request().headers()['x-auth-token'] === OLD) held.push(route);
    else return respond(route, 200, route.request().url().endsWith('/permissions') ? user.permissions : []);
  });
  await page.evaluate(async modules => {
    const { useAuthStore } = await import(modules.auth);
    const { useMenuStore } = await import(modules.menu);
    void useAuthStore.getState().refreshPermissions();
    void useMenuStore.getState().fetchRouters();
  }, await modules(page));
  await expect.poll(() => held.length).toBe(2);
  await page.getByRole('button', { name: '退出', exact: true }).click();
  await cleared(page);
  await login(page);
  for (const route of held) await respond(route, 200, route.request().url().endsWith('/permissions') ? ['obsolete-permission'] : [{ id: 999, name: 'obsolete-menu', path: '/obsolete', meta: { title: '旧会话菜单' }, children: [] }]);
  await page.waitForTimeout(300);
  const state = await page.evaluate(async modules => {
    const { useAuthStore } = await import(modules.auth);
    const { useMenuStore } = await import(modules.menu);
    return { permissions: useAuthStore.getState().user?.permissions, menu: useMenuStore.getState().menuTree };
  }, await modules(page));
  expect(state).toEqual({ permissions: user.permissions, menu: [] });
});
