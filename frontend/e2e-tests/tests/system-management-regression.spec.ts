import { expect, test, type Page, type Route } from '@playwright/test';

type ListKind = 'user' | 'role' | 'dict';

const ALL_SYSTEM_PERMISSIONS = [
  'system:user:list',
  'system:user:add',
  'system:user:edit',
  'system:user:delete',
  'system:role:list',
  'system:role:add',
  'system:role:edit',
  'system:role:delete',
  'system:menu:list',
  'system:menu:add',
  'system:menu:edit',
  'system:menu:delete',
  'system:dict:list',
  'system:dict:add',
  'system:dict:edit',
  'system:dict:delete',
  'user:security:view',
];

async function authenticate(page: Page, permissions: string[]) {
  await page.addInitScript((grantedPermissions) => {
    const token = 'system-management-regression-token';
    localStorage.setItem('token', token);
    localStorage.setItem('auth', JSON.stringify({
      state: {
        token,
        user: { nickname: '回归测试管理员', permissions: grantedPermissions },
      },
      version: 0,
    }));
  }, permissions);
  await page.route('**/api/admin/routers', (route) => fulfill(route, []));
}

function fulfill(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, msg: 'success', data }),
  });
}

function buildRecords(kind: ListKind, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    if (kind === 'user') {
      return {
        id,
        username: `user_${id}`,
        nickname: `用户${id}`,
        email: `user${id}@example.com`,
        phone: '',
        roleNames: [],
        status: 'ENABLED',
        lastLoginTime: null,
      };
    }
    if (kind === 'role') {
      return {
        id,
        roleName: `角色${id}`,
        roleCode: `role_${id}`,
        roleGroup: 'SYSTEM',
        roleSort: id,
        status: 'ENABLED',
        createTime: '2026-07-22T10:00:00',
      };
    }
    return {
      id,
      dictName: `字典${id}`,
      dictType: `dict_${id}`,
      dictSort: id,
      status: 'ENABLED',
      remark: '',
      createTime: '2026-07-22T10:00:00',
    };
  });
}

async function verifyPageSizeSwitch(
  page: Page,
  options: {
    pagePath: string;
    apiPath: string;
    title: string;
    kind: ListKind;
    permission: string;
  },
) {
  await authenticate(page, [options.permission]);
  const requests: Array<{ page: string | null; size: string | null }> = [];

  await page.route(`**/api${options.apiPath}**`, (route) => {
    const url = new URL(route.request().url());
    const pageNumber = url.searchParams.get('page');
    const pageSize = Number(url.searchParams.get('size') ?? '10');
    requests.push({ page: pageNumber, size: url.searchParams.get('size') });
    return fulfill(route, {
      records: buildRecords(options.kind, Math.min(pageSize, 60)),
      total: 60,
      current: Number(pageNumber ?? '1'),
      size: pageSize,
    });
  });

  await page.goto(options.pagePath);
  await expect(page.getByRole('heading', { name: options.title })).toBeVisible();
  await expect.poll(() => requests.at(-1)).toEqual({ page: '1', size: '10' });

  await page.getByRole('button', { name: '2', exact: true }).click();
  await expect.poll(() => requests.at(-1)).toEqual({ page: '2', size: '10' });

  const pageSizeSelect = page.locator('select').first();
  await pageSizeSelect.selectOption('20');
  await expect.poll(() => requests.at(-1)).toEqual({ page: '1', size: '20' });
  await expect(pageSizeSelect).toHaveValue('20');

  await pageSizeSelect.selectOption('50');
  await expect.poll(() => requests.at(-1)).toEqual({ page: '1', size: '50' });
  await expect(pageSizeSelect).toHaveValue('50');
}

test.describe('系统管理缺陷回归', () => {
  test('L4-D1-04 字典类型切换每页 20/50 条应更新请求参数', async ({ page }) => {
    await verifyPageSizeSwitch(page, {
      pagePath: '/system/dict-type',
      apiPath: '/admin/dict-type/list',
      title: '字典类型管理',
      kind: 'dict',
      permission: 'system:dict:list',
    });
  });

  test('L4-15 用户管理切换每页 20/50 条应更新请求参数', async ({ page }) => {
    await verifyPageSizeSwitch(page, {
      pagePath: '/system/user',
      apiPath: '/admin/user/list',
      title: '用户管理',
      kind: 'user',
      permission: 'system:user:list',
    });
  });

  test('L4-16 角色管理切换每页 20/50 条应更新请求参数', async ({ page }) => {
    await verifyPageSizeSwitch(page, {
      pagePath: '/system/role',
      apiPath: '/admin/role/list',
      title: '角色管理',
      kind: 'role',
      permission: 'system:role:list',
    });
  });

  test('L4-17 新增角色默认状态应为 ENABLED', async ({ page }) => {
    await authenticate(page, ALL_SYSTEM_PERMISSIONS);
    await page.route('**/api/admin/role/list**', (route) => fulfill(route, {
      records: [], total: 0, current: 1, size: 10,
    }));

    let createPayload: Record<string, unknown> | null = null;
    await page.route('**/api/admin/role', async (route) => {
      createPayload = route.request().postDataJSON();
      await fulfill(route, 1001);
    });

    await page.goto('/system/role');
    await page.getByRole('button', { name: '新增角色' }).click();
    await page.getByPlaceholder('请输入角色名称').fill('分页回归角色');
    await page.getByPlaceholder('如 admin, editor').fill('pagination_regression');
    await page.getByRole('button', { name: '保存', exact: true }).click();

    await expect.poll(() => createPayload?.status).toBe('ENABLED');
  });

  test('L4-18 只有查询权限时不应展示写操作入口', async ({ page }) => {
    await authenticate(page, [
      'system:user:list',
      'system:role:list',
      'system:menu:list',
      'system:dict:list',
    ]);
    await page.route('**/api/admin/user/list**', (route) => fulfill(route, {
      records: buildRecords('user', 1), total: 1, current: 1, size: 10,
    }));
    await page.route('**/api/admin/role/list**', (route) => fulfill(route, {
      records: buildRecords('role', 1), total: 1, current: 1, size: 10,
    }));
    await page.route('**/api/admin/menu/tree', (route) => fulfill(route, [{
      id: 1,
      parentId: 0,
      menuName: '系统管理',
      menuType: 'M',
      path: '/system',
      component: '',
      icon: 'Settings',
      perms: 'system:menu:list',
      menuSort: 1,
      status: 'ENABLED',
      visible: 1,
      remark: '',
      children: [],
    }]));
    await page.route('**/api/admin/dict-type/list**', (route) => fulfill(route, {
      records: buildRecords('dict', 1), total: 1, current: 1, size: 10,
    }));
    await page.route('**/api/admin/dict-type/all', (route) => fulfill(route, buildRecords('dict', 1)));
    await page.route('**/api/admin/dict-data/children**', (route) => fulfill(route, [{
      id: 1,
      dictType: 'dict_1',
      parentId: 0,
      dictLabel: '字典数据',
      dictValue: 'value_1',
      dictSort: 1,
      status: 'ENABLED',
      hasChildren: false,
    }]));

    await page.goto('/system/user');
    await expect(page.getByRole('button', { name: '新增用户' })).toHaveCount(0);
    await expect(page.locator('tbody tr').first().getByRole('button')).toHaveCount(0);

    await page.goto('/system/role');
    await expect(page.getByRole('button', { name: '新增角色' })).toHaveCount(0);
    await expect(page.locator('tbody tr').first().getByRole('button')).toHaveCount(0);

    await page.goto('/system/menu');
    await expect(page.getByRole('button', { name: '新增菜单' })).toHaveCount(0);
    await expect(page.locator('tbody tr').first().getByRole('button')).toHaveCount(0);

    await page.goto('/system/dict-type');
    await expect(page.getByRole('button', { name: '新增字典类型' })).toHaveCount(0);
    await expect(page.locator('tbody tr').first().getByRole('button')).toHaveCount(0);

    await page.goto('/system/dict-data');
    await expect(page.getByRole('button', { name: '新增字典数据' })).toHaveCount(0);
    await expect(page.locator('tbody tr').first().getByRole('button')).toHaveCount(0);
  });

  test('L4-D1-05 字典搜索只在提交后生效，重置后回到空条件', async ({ page }) => {
    await authenticate(page, ['system:dict:list']);
    const keywords: Array<string | null> = [];
    await page.route('**/api/admin/dict-type/list**', (route) => {
      keywords.push(new URL(route.request().url()).searchParams.get('keyword'));
      return fulfill(route, { records: [], total: 0, current: 1, size: 10 });
    });

    await page.goto('/system/dict-type');
    await expect.poll(() => keywords.at(-1)).toBeNull();
    await page.waitForTimeout(250);
    const initialRequestCount = keywords.length;
    await page.getByPlaceholder('搜索字典名称/编码').fill('gender');
    await page.waitForTimeout(250);
    expect(keywords).toHaveLength(initialRequestCount);

    await page.getByRole('button', { name: '搜索' }).click();
    await expect.poll(() => keywords.at(-1)).toBe('gender');
    await page.getByRole('button', { name: '重置' }).click();
    await expect.poll(() => keywords.at(-1)).toBeNull();
  });

  test('L4-19 菜单移动到顶级时应明确提交 parentId=0', async ({ page }) => {
    await authenticate(page, ['system:menu:list', 'system:menu:edit']);
    const root = {
      id: 1, parentId: 0, menuName: '系统管理', menuType: 'M', path: '/system', component: '', icon: 'Settings',
      perms: 'system:menu:list', menuSort: 1, status: 'ENABLED', visible: 1, remark: '', children: [],
    };
    const child = {
      id: 2, parentId: 1, menuName: '用户管理', menuType: 'C', path: '/system/user', component: 'admin/UserManagement', icon: 'Users',
      perms: 'system:user:list', menuSort: 1, status: 'ENABLED', visible: 1, remark: '', children: [],
    };
    await page.route('**/api/admin/menu/tree', (route) => fulfill(route, [{ ...root, children: [child] }]));
    let updatePayload: Record<string, unknown> | null = null;
    await page.route('**/api/admin/menu/2', async (route) => {
      if (route.request().method() === 'GET') return fulfill(route, child);
      updatePayload = route.request().postDataJSON();
      return fulfill(route, null);
    });

    await page.goto('/system/menu');
    const row = page.locator('tbody tr').filter({ hasText: '用户管理' });
    await row.getByTitle('编辑').click();
    const parentField = page.getByText('上级菜单', { exact: true }).locator('..');
    await parentField.getByRole('button').click();
    await parentField.getByRole('button', { name: '顶级（无）' }).click();
    await page.getByRole('button', { name: '保存', exact: true }).click();

    await expect.poll(() => updatePayload?.parentId).toBe(0);
  });
});
