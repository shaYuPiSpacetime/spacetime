import { expect, test, type APIRequestContext, type Dialog as NativeDialog, type Locator, type Page } from '@playwright/test';

const API_URL = (process.env.API_URL || 'http://127.0.0.1:8080').replace('localhost', '127.0.0.1');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const suffix = Date.now().toString().slice(-10);

const data = {
  user: `codex_e2e_user_${suffix}`,
  userNickname: `全功能用户${suffix}`,
  userNicknameUpdated: `全功能用户已编辑${suffix}`,
  userPassword: `Codex${suffix}!`,
  userPasswordUpdated: `Updated${suffix}!`,
  roleName: `全功能角色A${suffix}`,
  roleNameUpdated: `全功能角色A已编辑${suffix}`,
  roleCode: `codex_e2e_role_a_${suffix}`,
  roleNameB: `全功能角色B${suffix}`,
  roleCodeB: `codex_e2e_role_b_${suffix}`,
  menuRoot: `全功能目录${suffix}`,
  menuPage: `全功能页面${suffix}`,
  menuPageUpdated: `全功能页面已编辑${suffix}`,
  menuButton: `全功能按钮${suffix}`,
  dictName: `全功能字典${suffix}`,
  dictNameUpdated: `全功能字典已编辑${suffix}`,
  dictType: `codex_e2e_dict_${suffix}`,
  dictTypeUpdated: `codex_e2e_dict_updated_${suffix}`,
  dictRoot: `根节点${suffix}`,
  dictChild: `子节点${suffix}`,
  dictGrandchild: `孙节点${suffix}`,
};

type JsonRecord = Record<string, unknown>;

async function apiLogin(request: APIRequestContext, account = ADMIN_USERNAME, password = ADMIN_PASSWORD) {
  const response = await request.post(`${API_URL}/admin/login`, { data: { account, password } });
  const body = await response.json();
  if (body.code !== 200 || !body.data?.token) throw new Error(`API 登录失败：${body.msg || response.status()}`);
  return body.data.token as string;
}

async function apiCall<T>(
  request: APIRequestContext,
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await request.fetch(`${API_URL}${path}`, {
    method,
    data: body,
    headers: { 'X-Auth-Token': token, 'Content-Type': 'application/json' },
  });
  const payload = await response.json();
  if (payload.code !== 200) throw new Error(`${method} ${path} 失败：${payload.msg || response.status()}`);
  return payload.data as T;
}

async function loginByBrowser(page: Page, account: string, password: string) {
  if (!new URL(page.url()).pathname.endsWith('/login')) await page.goto('/login');
  await expect(page.getByPlaceholder('请输入用户名/手机号')).toBeVisible();
  await page.getByPlaceholder('请输入用户名/手机号').fill(account);
  await page.getByPlaceholder('请输入密码').fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('token')))).toBe(true);
}

async function logoutByBrowser(page: Page) {
  await page.getByRole('button', { name: '退出', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBeNull();
}

function dialog(page: Page, title: string) {
  return page.getByRole('heading', { name: title, exact: true }).locator('..').locator('..');
}

async function chooseCustomSelect(scope: Locator, label: string, option: string) {
  const field = scope.getByText(label, { exact: true }).locator('..');
  const trigger = field.getByRole('button').first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const choice = field.getByRole('button', { name: option, exact: true });
  await expect(choice).toHaveCount(1);
  await choice.click();
}

function rowByText(page: Page, text: string) {
  return page.locator('tbody tr').filter({ hasText: text });
}

async function expectSingleRow(page: Page, text: string) {
  const row = rowByText(page, text);
  await expect(row).toHaveCount(1);
  await expect(row).toBeVisible();
  return row;
}

async function expectAdminResponse(page: Page, method: string, pathname: string, action: () => Promise<void>) {
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === method && url.pathname === `/api${pathname}`;
  });
  await action();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.code, body.msg).toBe(200);
  return body.data;
}

function flattenMenus(nodes: JsonRecord[]): JsonRecord[] {
  return nodes.flatMap((node) => [node, ...flattenMenus((node.children as JsonRecord[]) || [])]);
}

async function cleanupAll(request: APIRequestContext) {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return;
  let token = '';
  try {
    token = await apiLogin(request);
  } catch {
    return;
  }

  const safeDelete = async (path: string) => {
    try {
      await apiCall(request, token, 'DELETE', path);
    } catch {
      // 清理流程继续处理其他临时数据，最终由残留核对暴露异常。
    }
  };

  try {
    const users = await apiCall<{ records: JsonRecord[] }>(request, token, 'GET', `/admin/user/list?page=1&size=100&keyword=${data.user}`);
    for (const user of users.records || []) {
      if (user.username === data.user) await safeDelete(`/admin/user/${user.id}`);
    }
  } catch { /* 继续清理 */ }

  try {
    const roles = await apiCall<{ records: JsonRecord[] }>(request, token, 'GET', `/admin/role/list?page=1&size=100&keyword=codex_e2e_role_`);
    for (const role of roles.records || []) {
      if (String(role.roleCode).startsWith('codex_e2e_role_')) await safeDelete(`/admin/role/${role.id}`);
    }
  } catch { /* 继续清理 */ }

  try {
    const tree = await apiCall<JsonRecord[]>(request, token, 'GET', '/admin/menu/tree');
    for (const menu of flattenMenus(tree || [])) {
      if (String(menu.menuName).startsWith('全功能目录')) await safeDelete(`/admin/menu/${menu.id}`);
    }
  } catch { /* 继续清理 */ }

  try {
    const types = await apiCall<{ records: JsonRecord[] }>(request, token, 'GET', '/admin/dict-type/list?page=1&size=100&keyword=codex_e2e_dict_');
    for (const type of types.records || []) {
      if (String(type.dictType).startsWith('codex_e2e_dict_')) await safeDelete(`/admin/dict-type/${type.id}`);
    }
  } catch { /* 继续清理 */ }
}

test.describe('系统管理真实浏览器全功能体验', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test.afterAll(async ({ request }) => {
    await cleanupAll(request);
  });

  test('完整体验所有可见功能及跨页面权限闭环', async ({ page, request }) => {
    test.setTimeout(360_000);
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      throw new Error('必须通过 ADMIN_USERNAME 和 ADMIN_PASSWORD 提供真实管理员账号');
    }

    let adminToken = '';
    let userId = 0;
    let roleId = 0;
    let roleIdB = 0;
    let menuRootId = 0;
    let dictTypeId = 0;

    await test.step('登录失败、成功与未登录路由保护', async () => {
      await page.goto('/system/user');
      await expect(page).toHaveURL(/\/login$/);

      await page.getByPlaceholder('请输入用户名/手机号').fill(ADMIN_USERNAME);
      await page.getByPlaceholder('请输入密码').fill(`${ADMIN_PASSWORD}-wrong`);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText(/登录失败|用户名或密码错误/).first()).toBeVisible();

      await loginByBrowser(page, ADMIN_USERNAME, ADMIN_PASSWORD);
      adminToken = (await page.evaluate(() => localStorage.getItem('token'))) || '';
      expect(adminToken).not.toBe('');
      await expect(page.getByRole('button', { name: '系统管理', exact: true })).toBeVisible();
    });

    await test.step('用户管理：筛选、分页、校验、新增、重复、编辑与安全详情', async () => {
      await page.goto('/system/user');
      await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();

      for (const size of ['20', '50']) {
        const responsePromise = page.waitForResponse((response) => {
          const url = new URL(response.url());
          return url.pathname === '/api/admin/user/list' && url.searchParams.get('size') === size;
        });
        await page.locator('select').selectOption(size);
        await responsePromise;
        await expect(page.locator('select')).toHaveValue(size);
      }

      await page.getByRole('button', { name: '全部状态', exact: true }).click();
      await page.getByRole('button', { name: '禁用', exact: true }).click();
      await expect(page.locator('tbody tr').filter({ hasText: '启用' })).toHaveCount(0);
      await page.getByRole('button', { name: '重置', exact: true }).click();

      await page.getByRole('button', { name: '新增用户' }).click();
      let userDialog = dialog(page, '新增用户');
      await userDialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText('请填写用户名、密码和昵称');
      await page.getByRole('alert').click();

      await userDialog.getByPlaceholder('请输入用户名').fill(data.user);
      await userDialog.getByPlaceholder('请输入密码').fill(data.userPassword);
      await userDialog.getByPlaceholder('请输入昵称').fill(data.userNickname);
      await userDialog.getByPlaceholder('请输入邮箱').fill(`${data.user}@example.test`);
      await userDialog.getByPlaceholder('请输入手机号').fill(`18${suffix.slice(-9)}`);
      userId = Number(await expectAdminResponse(page, 'POST', '/admin/user', async () => {
        await userDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(userId).toBeGreaterThan(0);

      await page.getByPlaceholder('用户名/昵称/邮箱').fill(data.user);
      let userRow = await expectSingleRow(page, data.user);
      await expect(userRow).toContainText(data.userNickname);

      await page.getByRole('button', { name: '新增用户' }).click();
      userDialog = dialog(page, '新增用户');
      await userDialog.getByPlaceholder('请输入用户名').fill(data.user);
      await userDialog.getByPlaceholder('请输入密码').fill(data.userPassword);
      await userDialog.getByPlaceholder('请输入昵称').fill(data.userNickname);
      await userDialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('用户名已存在');
      await page.getByRole('alert').click();
      await userDialog.getByRole('button', { name: '取消', exact: true }).click();

      userRow = await expectSingleRow(page, data.user);
      await userRow.getByTitle('编辑').click();
      userDialog = dialog(page, '编辑用户');
      await userDialog.getByPlaceholder('请输入昵称').fill(data.userNicknameUpdated);
      await userDialog.getByPlaceholder('请输入邮箱').fill(`${data.user}.updated@example.test`);
      await userDialog.getByPlaceholder('请输入手机号').fill(`17${suffix.slice(-9)}`);
      await chooseCustomSelect(userDialog, '状态', '禁用');
      await expectAdminResponse(page, 'PUT', `/admin/user/${userId}`, async () => {
        await userDialog.getByRole('button', { name: '保存', exact: true }).click();
      });
      userRow = await expectSingleRow(page, data.user);
      await expect(userRow).toContainText(data.userNicknameUpdated);
      await expect(userRow).toContainText('禁用');

      await userRow.getByTitle('安全详情').click();
      const securityDialog = dialog(page, '用户安全详情');
      await expect(securityDialog.getByText(/黑名单：/)).toBeVisible({ timeout: 10_000 });
      await securityDialog.getByRole('button').first().click();

      userRow = await expectSingleRow(page, data.user);
      await userRow.getByTitle('编辑').click();
      userDialog = dialog(page, '编辑用户');
      await chooseCustomSelect(userDialog, '状态', '启用');
      await expectAdminResponse(page, 'PUT', `/admin/user/${userId}`, async () => {
        await userDialog.getByRole('button', { name: '保存', exact: true }).click();
      });
    });

    let menuPageId = 0;
    let menuButtonId = 0;
    await test.step('菜单管理：三级树新增、动态字段、展开折叠、编辑与删除取消', async () => {
      await page.goto('/system/menu');
      await expect(page.getByRole('heading', { name: '菜单管理' })).toBeVisible();

      await page.getByRole('button', { name: '新增菜单' }).click();
      let menuDialog = dialog(page, '新增菜单');
      await menuDialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText('请填写菜单名称');
      await page.getByRole('alert').click();

      await chooseCustomSelect(menuDialog, '菜单类型', '按钮');
      await expect(menuDialog.getByPlaceholder('如 /system/user')).toHaveCount(0);
      await expect(menuDialog.getByPlaceholder('如 system/user/index')).toHaveCount(0);
      await chooseCustomSelect(menuDialog, '菜单类型', '目录');
      await expect(menuDialog.getByPlaceholder('如 /system/user')).toBeVisible();

      await menuDialog.getByPlaceholder('请输入菜单名称').fill(data.menuRoot);
      await menuDialog.getByPlaceholder('如 /system/user').fill(`/codex-e2e-${suffix}`);
      await menuDialog.getByPlaceholder('如 system/user/index').fill('admin/UserManagement');
      await menuDialog.getByPlaceholder('Lucide 图标名，如 Settings, Users').fill('Settings');
      await menuDialog.getByPlaceholder('可选，如 system:user:list').fill(`codex:e2e:${suffix}:root`);
      await menuDialog.getByPlaceholder('请输入备注').fill('Codex 全功能测试目录');
      menuRootId = Number(await expectAdminResponse(page, 'POST', '/admin/menu', async () => {
        await menuDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(menuRootId).toBeGreaterThan(0);

      let menuRootRow = await expectSingleRow(page, data.menuRoot);
      await menuRootRow.getByTitle('添加子节点').click();
      menuDialog = dialog(page, '新增菜单');
      await menuDialog.getByPlaceholder('请输入菜单名称').fill(data.menuPage);
      await menuDialog.getByPlaceholder('如 /system/user').fill(`/codex-e2e-${suffix}/page`);
      await menuDialog.getByPlaceholder('如 system/user/index').fill('admin/UserManagement');
      await menuDialog.getByPlaceholder('Lucide 图标名，如 Settings, Users').fill('Users');
      await menuDialog.getByPlaceholder('可选，如 system:user:list').fill(`codex:e2e:${suffix}:list`);
      await menuDialog.getByPlaceholder('请输入备注').fill('Codex 全功能测试页面');
      menuPageId = Number(await expectAdminResponse(page, 'POST', '/admin/menu', async () => {
        await menuDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(menuPageId).toBeGreaterThan(0);

      let menuPageRow = await expectSingleRow(page, data.menuPage);
      await menuPageRow.getByTitle('添加子节点').click();
      menuDialog = dialog(page, '新增菜单');
      await expect(menuDialog.getByText('按钮', { exact: true }).first()).toBeVisible();
      await menuDialog.getByPlaceholder('请输入菜单名称').fill(data.menuButton);
      await menuDialog.getByPlaceholder('如 system:user:create').fill(`codex:e2e:${suffix}:add`);
      await menuDialog.getByPlaceholder('请输入备注').fill('Codex 全功能测试按钮');
      menuButtonId = Number(await expectAdminResponse(page, 'POST', '/admin/menu', async () => {
        await menuDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(menuButtonId).toBeGreaterThan(0);

      menuRootRow = await expectSingleRow(page, data.menuRoot);
      await menuRootRow.getByRole('button').first().click();
      await expect(rowByText(page, data.menuPage)).toHaveCount(0);
      await menuRootRow.getByRole('button').first().click();
      menuPageRow = await expectSingleRow(page, data.menuPage);

      await menuPageRow.getByTitle('编辑').click();
      menuDialog = dialog(page, '编辑菜单');
      await menuDialog.getByPlaceholder('请输入菜单名称').fill(data.menuPageUpdated);
      await menuDialog.getByPlaceholder('如 /system/user').fill(`/codex-e2e-${suffix}/page-updated`);
      await menuDialog.getByPlaceholder('如 system/user/index').fill('admin/RoleManagement');
      await menuDialog.getByPlaceholder('Lucide 图标名，如 Settings, Users').fill('Shield');
      await menuDialog.getByPlaceholder('可选，如 system:user:list').fill(`codex:e2e:${suffix}:updated`);
      await chooseCustomSelect(menuDialog, '状态', '禁用');
      await chooseCustomSelect(menuDialog, '可见', '隐藏');
      await menuDialog.getByPlaceholder('请输入备注').fill('Codex 全功能测试页面已编辑');
      await expectAdminResponse(page, 'PUT', `/admin/menu/${menuPageId}`, async () => {
        await menuDialog.getByRole('button', { name: '保存', exact: true }).click();
      });
      menuPageRow = await expectSingleRow(page, data.menuPageUpdated);
      await expect(menuPageRow).toContainText('隐藏');
      await expect(menuPageRow).toContainText('禁用');
      await expect(menuPageRow).toContainText(`codex:e2e:${suffix}:updated`);

      await menuPageRow.getByTitle('编辑').click();
      menuDialog = dialog(page, '编辑菜单');
      await expect(menuDialog.getByPlaceholder('如 /system/user')).toHaveValue(`/codex-e2e-${suffix}/page-updated`);
      await expect(menuDialog.getByPlaceholder('如 system/user/index')).toHaveValue('admin/RoleManagement');
      await chooseCustomSelect(menuDialog, '状态', '启用');
      await chooseCustomSelect(menuDialog, '可见', '显示');
      await expectAdminResponse(page, 'PUT', `/admin/menu/${menuPageId}`, async () => {
        await menuDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      menuRootRow = await expectSingleRow(page, data.menuRoot);
      await menuRootRow.getByTitle('编辑').click();
      menuDialog = dialog(page, '编辑菜单');
      const parentField = menuDialog.getByText('上级菜单', { exact: true }).locator('..');
      await parentField.getByRole('button').first().click();
      await expect(parentField.getByRole('button', { name: data.menuRoot, exact: true })).toHaveCount(0);
      await expect(parentField.getByRole('button', { name: data.menuPageUpdated, exact: true })).toHaveCount(0);
      await menuDialog.getByRole('button', { name: '取消', exact: true }).click();

      menuRootRow = await expectSingleRow(page, data.menuRoot);
      page.once('dialog', async (nativeDialog) => nativeDialog.dismiss());
      await menuRootRow.getByTitle('删除').click();
      await expectSingleRow(page, data.menuRoot);
    });

    await test.step('角色管理：筛选、分页、校验、双角色 CRUD 与菜单树分配', async () => {
      await page.goto('/system/role');
      await expect(page.getByRole('heading', { name: '角色管理' })).toBeVisible();

      for (const size of ['20', '50']) {
        const responsePromise = page.waitForResponse((response) => {
          const url = new URL(response.url());
          return url.pathname === '/api/admin/role/list' && url.searchParams.get('size') === size;
        });
        await page.locator('select').selectOption(size);
        await responsePromise;
        await expect(page.locator('select')).toHaveValue(size);
      }

      await page.getByRole('button', { name: '全部状态', exact: true }).click();
      await page.getByRole('button', { name: '禁用', exact: true }).click();
      await expect(page.locator('tbody tr').filter({ hasText: '启用' })).toHaveCount(0);
      await page.getByRole('button', { name: '重置', exact: true }).click();

      await page.getByRole('button', { name: '新增角色' }).click();
      let roleDialog = dialog(page, '新增角色');
      await roleDialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText('请填写角色名称和角色编码');
      await page.getByRole('alert').click();
      await roleDialog.getByPlaceholder('请输入角色名称').fill(data.roleName);
      await roleDialog.getByPlaceholder('如 admin, editor').fill(data.roleCode);
      await roleDialog.getByPlaceholder('如 系统管理').fill('CODEX_E2E');
      await roleDialog.getByText('排序', { exact: true }).locator('..').locator('input').fill('71');
      await roleDialog.getByPlaceholder('请输入备注').fill('Codex 全功能角色 A');
      roleId = Number(await expectAdminResponse(page, 'POST', '/admin/role', async () => {
        await roleDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(roleId).toBeGreaterThan(0);

      await page.getByPlaceholder('角色名称/编码').fill(data.roleCode);
      let roleRow = await expectSingleRow(page, data.roleCode);
      await expect(roleRow).toContainText(data.roleName);
      await expect(roleRow).toContainText('启用');

      await page.getByRole('button', { name: '新增角色' }).click();
      roleDialog = dialog(page, '新增角色');
      await roleDialog.getByPlaceholder('请输入角色名称').fill(data.roleName);
      await roleDialog.getByPlaceholder('如 admin, editor').fill(data.roleCode);
      await roleDialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('角色编码已存在');
      await page.getByRole('alert').click();
      await roleDialog.getByRole('button', { name: '取消', exact: true }).click();

      roleRow = await expectSingleRow(page, data.roleCode);
      await roleRow.getByTitle('编辑').click();
      roleDialog = dialog(page, '编辑角色');
      await expect(roleDialog.getByPlaceholder('如 admin, editor')).toBeDisabled();
      await roleDialog.getByPlaceholder('请输入角色名称').fill(data.roleNameUpdated);
      await roleDialog.getByPlaceholder('如 系统管理').fill('CODEX_E2E_UPDATED');
      await roleDialog.getByText('排序', { exact: true }).locator('..').locator('input').fill('72');
      await roleDialog.getByPlaceholder('请输入备注').fill('Codex 全功能角色 A 已编辑');
      await chooseCustomSelect(roleDialog, '状态', '禁用');
      await expectAdminResponse(page, 'PUT', `/admin/role/${roleId}`, async () => {
        await roleDialog.getByRole('button', { name: '保存', exact: true }).click();
      });
      roleRow = await expectSingleRow(page, data.roleCode);
      await expect(roleRow).toContainText(data.roleNameUpdated);
      await expect(roleRow).toContainText('CODEX_E2E_UPDATED');
      await expect(roleRow).toContainText('72');
      await expect(roleRow).toContainText('禁用');

      await roleRow.getByTitle('编辑').click();
      roleDialog = dialog(page, '编辑角色');
      await chooseCustomSelect(roleDialog, '状态', '启用');
      await expectAdminResponse(page, 'PUT', `/admin/role/${roleId}`, async () => {
        await roleDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      await page.getByRole('button', { name: '新增角色' }).click();
      roleDialog = dialog(page, '新增角色');
      await roleDialog.getByPlaceholder('请输入角色名称').fill(data.roleNameB);
      await roleDialog.getByPlaceholder('如 admin, editor').fill(data.roleCodeB);
      await roleDialog.getByPlaceholder('如 系统管理').fill('CODEX_E2E');
      await roleDialog.getByText('排序', { exact: true }).locator('..').locator('input').fill('73');
      await roleDialog.getByPlaceholder('请输入备注').fill('Codex 全功能角色 B');
      roleIdB = Number(await expectAdminResponse(page, 'POST', '/admin/role', async () => {
        await roleDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(roleIdB).toBeGreaterThan(0);

      await page.getByPlaceholder('角色名称/编码').fill('');
      roleRow = await expectSingleRow(page, data.roleNameUpdated);
      await roleRow.getByRole('button', { name: '分配菜单', exact: true }).click();
      let menuPermissionDialog = dialog(page, '分配菜单权限');
      const systemLabel = menuPermissionDialog.getByText('系统管理', { exact: true }).locator('..');
      await systemLabel.getByRole('button').click();
      await expect(menuPermissionDialog.getByText('用户管理', { exact: true })).toHaveCount(0);
      await systemLabel.getByRole('button').click();
      const userMenuLabel = menuPermissionDialog.getByText('用户管理', { exact: true }).locator('..');
      await userMenuLabel.locator('input[type="checkbox"]').check();
      await expectAdminResponse(page, 'PUT', `/admin/role/${roleId}/menus`, async () => {
        await menuPermissionDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      roleRow = await expectSingleRow(page, data.roleNameB);
      await roleRow.getByRole('button', { name: '分配菜单', exact: true }).click();
      menuPermissionDialog = dialog(page, '分配菜单权限');
      const dictMenuLabel = menuPermissionDialog.getByText('字典管理', { exact: true }).locator('..');
      await dictMenuLabel.locator('input[type="checkbox"]').check();
      await expectAdminResponse(page, 'PUT', `/admin/role/${roleIdB}/menus`, async () => {
        await menuPermissionDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      const roleDetailA = await apiCall<JsonRecord>(request, adminToken, 'GET', `/admin/role/${roleId}`);
      const roleDetailB = await apiCall<JsonRecord>(request, adminToken, 'GET', `/admin/role/${roleIdB}`);
      expect((roleDetailA.menuIds as unknown[]).length).toBeGreaterThan(1);
      expect((roleDetailB.menuIds as unknown[]).length).toBeGreaterThan(1);

      roleRow = await expectSingleRow(page, data.roleNameB);
      page.once('dialog', async (nativeDialog) => nativeDialog.dismiss());
      await roleRow.getByTitle('删除').click();
      await expectSingleRow(page, data.roleNameB);
    });

    await test.step('用户管理：分配双角色、重置密码并验证新旧密码', async () => {
      await page.goto('/system/user');
      await page.getByPlaceholder('用户名/昵称/邮箱').fill(data.user);
      let userRow = await expectSingleRow(page, data.user);
      await userRow.getByTitle('分配角色').click();
      let roleAssignDialog = dialog(page, '分配角色');
      const roleLabelA = roleAssignDialog.getByText(data.roleNameUpdated, { exact: true }).locator('..');
      const roleLabelB = roleAssignDialog.getByText(data.roleNameB, { exact: true }).locator('..');
      await roleLabelA.locator('input[type="checkbox"]').check();
      await roleLabelB.locator('input[type="checkbox"]').check();
      await expectAdminResponse(page, 'PUT', `/admin/user/${userId}/roles`, async () => {
        await roleAssignDialog.getByRole('button', { name: '保存', exact: true }).click();
      });
      userRow = await expectSingleRow(page, data.user);
      await expect(userRow).toContainText(data.roleNameUpdated);
      await expect(userRow).toContainText(data.roleNameB);

      const userDetail = await apiCall<JsonRecord>(request, adminToken, 'GET', `/admin/user/${userId}`);
      expect((userDetail.roleIds as number[]).sort()).toEqual([roleId, roleIdB].sort());

      userRow = await expectSingleRow(page, data.user);
      let resetSuccessAlert = false;
      const passwordDialogHandler = async (nativeDialog: NativeDialog) => {
        if (nativeDialog.type() === 'prompt') {
          await nativeDialog.accept(data.userPasswordUpdated);
          return;
        }
        resetSuccessAlert = nativeDialog.message() === '密码重置成功';
        await nativeDialog.accept();
      };
      page.on('dialog', passwordDialogHandler);
      await expectAdminResponse(page, 'PUT', `/admin/user/${userId}/password`, async () => {
        await userRow.getByTitle('重置密码').click();
      });
      await expect.poll(() => resetSuccessAlert).toBe(true);
      page.off('dialog', passwordDialogHandler);

      await logoutByBrowser(page);
      await page.getByPlaceholder('请输入用户名/手机号').fill(data.user);
      await page.getByPlaceholder('请输入密码').fill(data.userPassword);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      await loginByBrowser(page, data.user, data.userPasswordUpdated);
    });

    await test.step('RBAC：双角色权限并集、未授权路由、移除角色后的权限收敛', async () => {
      const systemButton = page.getByRole('button', { name: '系统管理', exact: true });
      await expect(systemButton).toBeVisible();
      await systemButton.click();
      await expect(page.getByRole('link', { name: '用户管理', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: '角色管理', exact: true })).toHaveCount(0);
      await expect(page.getByRole('link', { name: '菜单管理', exact: true })).toHaveCount(0);
      const dictButton = page.getByRole('button', { name: '字典管理', exact: true });
      await expect(dictButton).toBeVisible();
      await dictButton.click();
      await expect(page.getByRole('link', { name: '字典类型', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: '字典数据', exact: true })).toBeVisible();

      await page.goto('/system/user');
      await expect(page.getByRole('button', { name: '新增用户' })).toBeVisible();
      await expect(page.getByTitle('删除').first()).toBeVisible();
      await page.goto('/system/role');
      await expect(page.getByText('您没有访问该页面的权限')).toBeVisible();
      await page.goto('/system/menu');
      await expect(page.getByText('您没有访问该页面的权限')).toBeVisible();

      await logoutByBrowser(page);
      await loginByBrowser(page, ADMIN_USERNAME, ADMIN_PASSWORD);
      adminToken = (await page.evaluate(() => localStorage.getItem('token'))) || adminToken;
      await page.goto('/system/user');
      await page.getByPlaceholder('用户名/昵称/邮箱').fill(data.user);
      let userRow = await expectSingleRow(page, data.user);
      await userRow.getByTitle('分配角色').click();
      let roleAssignDialog = dialog(page, '分配角色');
      const roleLabelB = roleAssignDialog.getByText(data.roleNameB, { exact: true }).locator('..');
      await roleLabelB.locator('input[type="checkbox"]').uncheck();
      await expectAdminResponse(page, 'PUT', `/admin/user/${userId}/roles`, async () => {
        await roleAssignDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      await logoutByBrowser(page);
      await loginByBrowser(page, data.user, data.userPasswordUpdated);
      const systemButtonAfterRoleRemoval = page.getByRole('button', { name: '系统管理', exact: true });
      await expect(systemButtonAfterRoleRemoval).toBeVisible();
      await systemButtonAfterRoleRemoval.click();
      await expect(page.getByRole('link', { name: '用户管理', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '字典管理', exact: true })).toHaveCount(0);
      await page.goto('/system/dict-type');
      await expect(page.getByText('您没有访问该页面的权限')).toBeVisible();

      await logoutByBrowser(page);
      await loginByBrowser(page, ADMIN_USERNAME, ADMIN_PASSWORD);
      adminToken = (await page.evaluate(() => localStorage.getItem('token'))) || adminToken;
      await page.goto('/system/role');
      await page.getByPlaceholder('角色名称/编码').fill(data.roleCode);
      const roleRow = await expectSingleRow(page, data.roleCode);
      await roleRow.getByRole('button', { name: '分配菜单', exact: true }).click();
      const menuPermissionDialog = dialog(page, '分配菜单权限');
      const deleteUserLabel = menuPermissionDialog.getByText('删除用户', { exact: true }).locator('..');
      await expect(deleteUserLabel.locator('input[type="checkbox"]')).toBeChecked();
      await deleteUserLabel.locator('input[type="checkbox"]').uncheck();
      await expectAdminResponse(page, 'PUT', `/admin/role/${roleId}/menus`, async () => {
        await menuPermissionDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      await logoutByBrowser(page);
      await loginByBrowser(page, data.user, data.userPasswordUpdated);
      await page.goto('/system/user');
      await expect(page.getByTitle('编辑').first()).toBeVisible();
      await expect(page.getByTitle('删除')).toHaveCount(0);
      const limitedToken = (await page.evaluate(() => localStorage.getItem('token'))) || '';
      const forbiddenDelete = await request.delete(`${API_URL}/admin/user/999999999`, {
        headers: { 'X-Auth-Token': limitedToken },
      });
      expect(forbiddenDelete.status()).toBe(403);
    });

    await test.step('RBAC：回收菜单、禁用角色与禁用用户均即时生效', async () => {
      await logoutByBrowser(page);
      await loginByBrowser(page, ADMIN_USERNAME, ADMIN_PASSWORD);
      adminToken = (await page.evaluate(() => localStorage.getItem('token'))) || adminToken;

      await page.goto('/system/role');
      await page.getByPlaceholder('角色名称/编码').fill(data.roleCode);
      let roleRow = await expectSingleRow(page, data.roleCode);
      await roleRow.getByRole('button', { name: '分配菜单', exact: true }).click();
      let menuPermissionDialog = dialog(page, '分配菜单权限');
      let userMenuLabel = menuPermissionDialog.getByText('用户管理', { exact: true }).locator('..');
      await expect(userMenuLabel.locator('input[type="checkbox"]')).toBeChecked();
      await userMenuLabel.locator('input[type="checkbox"]').uncheck();
      await expectAdminResponse(page, 'PUT', `/admin/role/${roleId}/menus`, async () => {
        await menuPermissionDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      await logoutByBrowser(page);
      await loginByBrowser(page, data.user, data.userPasswordUpdated);
      await expect(page.getByRole('button', { name: '系统管理', exact: true })).toHaveCount(0);
      await page.goto('/system/user');
      await expect(page.getByText('您没有访问该页面的权限')).toBeVisible();

      await logoutByBrowser(page);
      await loginByBrowser(page, ADMIN_USERNAME, ADMIN_PASSWORD);
      adminToken = (await page.evaluate(() => localStorage.getItem('token'))) || adminToken;
      await page.goto('/system/role');
      await page.getByPlaceholder('角色名称/编码').fill(data.roleCode);
      roleRow = await expectSingleRow(page, data.roleCode);
      await roleRow.getByRole('button', { name: '分配菜单', exact: true }).click();
      menuPermissionDialog = dialog(page, '分配菜单权限');
      userMenuLabel = menuPermissionDialog.getByText('用户管理', { exact: true }).locator('..');
      await userMenuLabel.locator('input[type="checkbox"]').check();
      await expectAdminResponse(page, 'PUT', `/admin/role/${roleId}/menus`, async () => {
        await menuPermissionDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      roleRow = await expectSingleRow(page, data.roleCode);
      await roleRow.getByTitle('编辑').click();
      let roleDialog = dialog(page, '编辑角色');
      await chooseCustomSelect(roleDialog, '状态', '禁用');
      await expectAdminResponse(page, 'PUT', `/admin/role/${roleId}`, async () => {
        await roleDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      await logoutByBrowser(page);
      await loginByBrowser(page, data.user, data.userPasswordUpdated);
      await expect(page.getByRole('button', { name: '系统管理', exact: true })).toHaveCount(0);

      await logoutByBrowser(page);
      await loginByBrowser(page, ADMIN_USERNAME, ADMIN_PASSWORD);
      adminToken = (await page.evaluate(() => localStorage.getItem('token'))) || adminToken;
      await page.goto('/system/role');
      await page.getByPlaceholder('角色名称/编码').fill(data.roleCode);
      roleRow = await expectSingleRow(page, data.roleCode);
      await roleRow.getByTitle('编辑').click();
      roleDialog = dialog(page, '编辑角色');
      await chooseCustomSelect(roleDialog, '状态', '启用');
      await expectAdminResponse(page, 'PUT', `/admin/role/${roleId}`, async () => {
        await roleDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      await page.goto('/system/user');
      await page.getByPlaceholder('用户名/昵称/邮箱').fill(data.user);
      let userRow = await expectSingleRow(page, data.user);
      await userRow.getByTitle('编辑').click();
      let userDialog = dialog(page, '编辑用户');
      await chooseCustomSelect(userDialog, '状态', '禁用');
      await expectAdminResponse(page, 'PUT', `/admin/user/${userId}`, async () => {
        await userDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      await logoutByBrowser(page);
      await page.getByPlaceholder('请输入用户名/手机号').fill(data.user);
      await page.getByPlaceholder('请输入密码').fill(data.userPasswordUpdated);
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText(/账号已禁用|登录失败/).first()).toBeVisible();

      await loginByBrowser(page, ADMIN_USERNAME, ADMIN_PASSWORD);
      adminToken = (await page.evaluate(() => localStorage.getItem('token'))) || adminToken;
      await page.goto('/system/user');
      await page.getByPlaceholder('用户名/昵称/邮箱').fill(data.user);
      userRow = await expectSingleRow(page, data.user);
      await userRow.getByTitle('编辑').click();
      userDialog = dialog(page, '编辑用户');
      await chooseCustomSelect(userDialog, '状态', '启用');
      await expectAdminResponse(page, 'PUT', `/admin/user/${userId}`, async () => {
        await userDialog.getByRole('button', { name: '保存', exact: true }).click();
      });
    });

    let dictRootId = 0;
    let dictChildId = 0;
    let dictGrandchildId = 0;
    await test.step('字典类型：搜索、状态、分页、校验、重复与编辑', async () => {
      await page.goto('/system/dict-type');
      await expect(page.getByRole('heading', { name: '字典类型管理' })).toBeVisible();

      for (const size of ['20', '50']) {
        const responsePromise = page.waitForResponse((response) => {
          const url = new URL(response.url());
          return url.pathname === '/api/admin/dict-type/list' && url.searchParams.get('size') === size;
        });
        await page.locator('select').selectOption(size);
        await responsePromise;
        await expect(page.locator('select')).toHaveValue(size);
      }

      await page.getByRole('button', { name: '全部状态', exact: true }).click();
      await page.getByRole('button', { name: '禁用', exact: true }).click();
      await page.getByRole('button', { name: '搜索', exact: true }).click();
      await expect(page.locator('tbody tr').filter({ hasText: '启用' })).toHaveCount(0);
      await page.getByRole('button', { name: '重置', exact: true }).click();

      await page.getByRole('button', { name: '新增字典类型' }).click();
      let dictTypeDialog = dialog(page, '新增字典类型');
      await dictTypeDialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText('请填写字典名称和字典编码');
      await page.getByRole('alert').click();
      await dictTypeDialog.getByPlaceholder('如：性别').fill(data.dictName);
      await dictTypeDialog.getByPlaceholder('如：gender（唯一，创建后谨慎修改）').fill(data.dictType);
      await dictTypeDialog.getByText('排序', { exact: true }).locator('..').locator('input').fill('81');
      await dictTypeDialog.getByPlaceholder('可选').fill('Codex 全功能字典');
      dictTypeId = Number(await expectAdminResponse(page, 'POST', '/admin/dict-type', async () => {
        await dictTypeDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(dictTypeId).toBeGreaterThan(0);

      const dictSearch = page.getByPlaceholder('搜索字典名称/编码');
      await dictSearch.fill(data.dictType);
      await dictSearch.press('Enter');
      let dictTypeRow = await expectSingleRow(page, data.dictType);
      await expect(dictTypeRow).toContainText(data.dictName);

      await page.getByRole('button', { name: '新增字典类型' }).click();
      dictTypeDialog = dialog(page, '新增字典类型');
      await dictTypeDialog.getByPlaceholder('如：性别').fill(data.dictName);
      await dictTypeDialog.getByPlaceholder('如：gender（唯一，创建后谨慎修改）').fill(data.dictType);
      await dictTypeDialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('字典类型编码已存在');
      await page.getByRole('alert').click();
      await dictTypeDialog.getByRole('button', { name: '取消', exact: true }).click();

      dictTypeRow = await expectSingleRow(page, data.dictType);
      await dictTypeRow.getByTitle('编辑').click();
      dictTypeDialog = dialog(page, '编辑字典类型');
      await dictTypeDialog.getByPlaceholder('如：性别').fill(data.dictNameUpdated);
      await dictTypeDialog.getByText('排序', { exact: true }).locator('..').locator('input').fill('82');
      await dictTypeDialog.getByPlaceholder('可选').fill('Codex 全功能字典已编辑');
      await chooseCustomSelect(dictTypeDialog, '状态', '禁用');
      await expectAdminResponse(page, 'PUT', `/admin/dict-type/${dictTypeId}`, async () => {
        await dictTypeDialog.getByRole('button', { name: '保存', exact: true }).click();
      });
      dictTypeRow = await expectSingleRow(page, data.dictType);
      await expect(dictTypeRow).toContainText(data.dictNameUpdated);
      await expect(dictTypeRow).toContainText('82');
      await expect(dictTypeRow).toContainText('禁用');

      await dictTypeRow.getByTitle('编辑').click();
      dictTypeDialog = dialog(page, '编辑字典类型');
      await chooseCustomSelect(dictTypeDialog, '状态', '启用');
      await expectAdminResponse(page, 'PUT', `/admin/dict-type/${dictTypeId}`, async () => {
        await dictTypeDialog.getByRole('button', { name: '保存', exact: true }).click();
      });
    });

    await test.step('字典数据：三级树新增、懒加载、父级限制、编辑与级联删除', async () => {
      await page.goto('/system/dict-data');
      await expect(page.getByRole('heading', { name: '字典数据管理' })).toBeVisible();
      const typeButton = page.getByRole('button', { name: data.dictNameUpdated, exact: true });
      if (await typeButton.count() === 0) {
        const typeTrigger = page.getByText('字典类型：', { exact: true }).locator('..').getByRole('button').first();
        await typeTrigger.click();
        await page.getByRole('button', { name: data.dictNameUpdated, exact: true }).click();
      }

      await page.getByRole('button', { name: '新增字典数据' }).click();
      let dictDataDialog = dialog(page, '新增字典数据');
      await dictDataDialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText('请填写字典标签和字典键值');
      await page.getByRole('alert').click();
      await dictDataDialog.getByPlaceholder('如：男、VIP1').fill(data.dictRoot);
      await dictDataDialog.getByPlaceholder('如：male、vip1').fill(`root_${suffix}`);
      await dictDataDialog.getByText('排序', { exact: true }).locator('..').locator('input').fill('1');
      await dictDataDialog.getByPlaceholder('可选').fill('Codex 根节点');
      dictRootId = Number(await expectAdminResponse(page, 'POST', '/admin/dict-data', async () => {
        await dictDataDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(dictRootId).toBeGreaterThan(0);

      let dictRootRow = await expectSingleRow(page, data.dictRoot);
      await dictRootRow.getByTitle('添加子节点').click();
      dictDataDialog = dialog(page, '新增字典数据');
      await dictDataDialog.getByPlaceholder('如：男、VIP1').fill(data.dictChild);
      await dictDataDialog.getByPlaceholder('如：male、vip1').fill(`child_${suffix}`);
      await dictDataDialog.getByText('排序', { exact: true }).locator('..').locator('input').fill('2');
      await dictDataDialog.getByPlaceholder('可选').fill('Codex 子节点');
      dictChildId = Number(await expectAdminResponse(page, 'POST', '/admin/dict-data', async () => {
        await dictDataDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(dictChildId).toBeGreaterThan(0);

      dictRootRow = await expectSingleRow(page, data.dictRoot);
      await dictRootRow.getByTitle('展开并加载下一级').click();
      let dictChildRow = await expectSingleRow(page, data.dictChild);
      await dictChildRow.getByTitle('添加子节点').click();
      dictDataDialog = dialog(page, '新增字典数据');
      await dictDataDialog.getByPlaceholder('如：男、VIP1').fill(data.dictGrandchild);
      await dictDataDialog.getByPlaceholder('如：male、vip1').fill(`grandchild_${suffix}`);
      await dictDataDialog.getByText('排序', { exact: true }).locator('..').locator('input').fill('3');
      await dictDataDialog.getByPlaceholder('可选').fill('Codex 孙节点');
      dictGrandchildId = Number(await expectAdminResponse(page, 'POST', '/admin/dict-data', async () => {
        await dictDataDialog.getByRole('button', { name: '保存', exact: true }).click();
      }));
      expect(dictGrandchildId).toBeGreaterThan(0);

      dictRootRow = await expectSingleRow(page, data.dictRoot);
      await dictRootRow.getByTitle('展开并加载下一级').click();
      dictChildRow = await expectSingleRow(page, data.dictChild);
      await dictChildRow.getByTitle('展开并加载下一级').click();
      let dictGrandchildRow = await expectSingleRow(page, data.dictGrandchild);
      await dictGrandchildRow.getByTitle('编辑').click();
      dictDataDialog = dialog(page, '编辑字典数据');
      await dictDataDialog.getByPlaceholder('如：男、VIP1').fill(`${data.dictGrandchild}已编辑`);
      await dictDataDialog.getByPlaceholder('如：male、vip1').fill(`grandchild_updated_${suffix}`);
      await dictDataDialog.getByText('排序', { exact: true }).locator('..').locator('input').fill('4');
      await dictDataDialog.getByPlaceholder('可选').fill('Codex 孙节点已编辑');
      await chooseCustomSelect(dictDataDialog, '状态', '禁用');
      await expectAdminResponse(page, 'PUT', `/admin/dict-data/${dictGrandchildId}`, async () => {
        await dictDataDialog.getByRole('button', { name: '保存', exact: true }).click();
      });

      dictRootRow = await expectSingleRow(page, data.dictRoot);
      await dictRootRow.getByTitle('展开并加载下一级').click();
      dictChildRow = await expectSingleRow(page, data.dictChild);
      await dictChildRow.getByTitle('展开并加载下一级').click();
      dictGrandchildRow = await expectSingleRow(page, `${data.dictGrandchild}已编辑`);
      await expect(dictGrandchildRow).toContainText(`grandchild_updated_${suffix}`);
      await expect(dictGrandchildRow).toContainText('4');
      await expect(dictGrandchildRow).toContainText('禁用');

      dictRootRow = await expectSingleRow(page, data.dictRoot);
      await dictRootRow.getByTitle('编辑').click();
      dictDataDialog = dialog(page, '编辑字典数据');
      const parentField = dictDataDialog.getByText('上级字典', { exact: true }).locator('..');
      await parentField.getByRole('button').first().click();
      await expect(parentField.getByRole('button', { name: data.dictRoot, exact: true })).toHaveCount(0);
      await expect(parentField.getByRole('button', { name: data.dictChild, exact: true })).toHaveCount(0);
      await expect(parentField.getByRole('button', { name: `${data.dictGrandchild}已编辑`, exact: true })).toHaveCount(0);
      await dictDataDialog.getByRole('button', { name: '取消', exact: true }).click();

      dictRootRow = await expectSingleRow(page, data.dictRoot);
      page.once('dialog', async (nativeDialog) => nativeDialog.dismiss());
      await dictRootRow.getByTitle('删除').click();
      await expectSingleRow(page, data.dictRoot);
    });

    await test.step('字典类型编码迁移后数据入口可用', async () => {
      await page.goto('/system/dict-type');
      const dictSearch = page.getByPlaceholder('搜索字典名称/编码');
      await dictSearch.fill(data.dictType);
      await page.getByRole('button', { name: '搜索', exact: true }).click();
      let dictTypeRow = await expectSingleRow(page, data.dictType);
      await dictTypeRow.getByTitle('编辑').click();
      let dictTypeDialog = dialog(page, '编辑字典类型');
      await dictTypeDialog.getByPlaceholder('如：gender（唯一，创建后谨慎修改）').fill(data.dictTypeUpdated);
      await expectAdminResponse(page, 'PUT', `/admin/dict-type/${dictTypeId}`, async () => {
        await dictTypeDialog.getByRole('button', { name: '保存', exact: true }).click();
      });
      await dictSearch.fill(data.dictTypeUpdated);
      await dictSearch.press('Enter');
      dictTypeRow = await expectSingleRow(page, data.dictTypeUpdated);
      await expect(dictTypeRow).toContainText(data.dictNameUpdated);

      await page.goto('/system/dict-data');
      const typeTrigger = page.getByText('字典类型：', { exact: true }).locator('..').getByRole('button').first();
      if ((await typeTrigger.textContent())?.trim() !== data.dictNameUpdated) {
        await typeTrigger.click();
        await page.getByRole('button', { name: data.dictNameUpdated, exact: true }).click();
      }
      let dictRootRow = await expectSingleRow(page, data.dictRoot);
      await dictRootRow.getByTitle('展开并加载下一级').click();
      const dictChildRow = await expectSingleRow(page, data.dictChild);
      await dictChildRow.getByTitle('展开并加载下一级').click();
      await expectSingleRow(page, `${data.dictGrandchild}已编辑`);

      page.once('dialog', async (nativeDialog) => nativeDialog.accept());
      await expectAdminResponse(page, 'DELETE', `/admin/dict-data/${dictRootId}`, async () => {
        await dictRootRow.getByTitle('删除').click();
      });
      await expect(rowByText(page, data.dictRoot)).toHaveCount(0);
      const childrenAfterDelete = await apiCall<JsonRecord[]>(request, adminToken, 'GET', `/admin/dict-data/children?dictType=${data.dictTypeUpdated}&parentId=0`);
      expect(childrenAfterDelete.some((item) => [dictRootId, dictChildId, dictGrandchildId].includes(Number(item.id)))).toBe(false);
    });

    await test.step('所有删除入口、取消确认、退出与临时数据清理', async () => {
      await page.goto('/system/user');
      await page.getByPlaceholder('用户名/昵称/邮箱').fill(data.user);
      let userRow = await expectSingleRow(page, data.user);
      page.once('dialog', async (nativeDialog) => nativeDialog.dismiss());
      await userRow.getByTitle('删除').click();
      await expectSingleRow(page, data.user);
      page.once('dialog', async (nativeDialog) => nativeDialog.accept());
      await expectAdminResponse(page, 'DELETE', `/admin/user/${userId}`, async () => {
        await userRow.getByTitle('删除').click();
      });
      await expect(rowByText(page, data.user)).toHaveCount(0);

      await page.goto('/system/role');
      for (const [name, id] of [[data.roleNameB, roleIdB], [data.roleNameUpdated, roleId]] as const) {
        await page.getByPlaceholder('角色名称/编码').fill(name);
        const roleRow = await expectSingleRow(page, name);
        page.once('dialog', async (nativeDialog) => nativeDialog.accept());
        await expectAdminResponse(page, 'DELETE', `/admin/role/${id}`, async () => {
          await roleRow.getByTitle('删除').click();
        });
        await expect(rowByText(page, name)).toHaveCount(0);
      }

      await page.goto('/system/menu');
      const menuRootRow = await expectSingleRow(page, data.menuRoot);
      page.once('dialog', async (nativeDialog) => nativeDialog.accept());
      await expectAdminResponse(page, 'DELETE', `/admin/menu/${menuRootId}`, async () => {
        await menuRootRow.getByTitle('删除').click();
      });
      await expect(rowByText(page, data.menuRoot)).toHaveCount(0);
      await expect(rowByText(page, data.menuPageUpdated)).toHaveCount(0);
      await expect(rowByText(page, data.menuButton)).toHaveCount(0);

      await page.goto('/system/dict-type');
      await page.getByPlaceholder('搜索字典名称/编码').fill(data.dictTypeUpdated);
      await page.getByRole('button', { name: '搜索', exact: true }).click();
      const dictTypeRow = await expectSingleRow(page, data.dictTypeUpdated);
      page.once('dialog', async (nativeDialog) => nativeDialog.dismiss());
      await dictTypeRow.getByTitle('删除').click();
      await expectSingleRow(page, data.dictTypeUpdated);
      page.once('dialog', async (nativeDialog) => nativeDialog.accept());
      await expectAdminResponse(page, 'DELETE', `/admin/dict-type/${dictTypeId}`, async () => {
        await dictTypeRow.getByTitle('删除').click();
      });
      await expect(rowByText(page, data.dictTypeUpdated)).toHaveCount(0);

      await logoutByBrowser(page);
    });

    await test.step('只读接口复核本轮临时数据无残留', async () => {
      const verificationToken = await apiLogin(request);
      const users = await apiCall<{ records: JsonRecord[] }>(request, verificationToken, 'GET', `/admin/user/list?page=1&size=100&keyword=${data.user}`);
      const roles = await apiCall<{ records: JsonRecord[] }>(request, verificationToken, 'GET', `/admin/role/list?page=1&size=100&keyword=codex_e2e_role_`);
      const menuTree = await apiCall<JsonRecord[]>(request, verificationToken, 'GET', '/admin/menu/tree');
      const types = await apiCall<{ records: JsonRecord[] }>(request, verificationToken, 'GET', '/admin/dict-type/list?page=1&size=100&keyword=codex_e2e_dict_');
      expect(users.records.some((item) => item.username === data.user)).toBe(false);
      expect(roles.records.some((item) => [data.roleCode, data.roleCodeB].includes(String(item.roleCode)))).toBe(false);
      expect(flattenMenus(menuTree).some((item) => String(item.menuName).includes(suffix))).toBe(false);
      expect(types.records.some((item) => [data.dictType, data.dictTypeUpdated].includes(String(item.dictType)))).toBe(false);
    });
  });
});
