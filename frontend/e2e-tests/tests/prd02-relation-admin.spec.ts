import { expect, test, type Page } from '@playwright/test';

const TOKEN = 'prd02-admin-token';

async function login(page: Page, permissions: string[]) {
  await page.addInitScript(({ token, perms }) => {
    localStorage.setItem('auth', JSON.stringify({
      state: { token, user: { nickname: '关系审核员', permissions: perms } },
      version: 0,
    }));
    localStorage.setItem('token', token);
  }, { token: TOKEN, perms: permissions });
}

async function mockBaseApis(page: Page) {
  await page.route('**/api/admin/routers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: [] }),
  }));
  await page.route('**/api/miniapp/dict/locations/two-level*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: [] }),
  }));
  await page.route('**/api/admin/users/app/stats', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: { currentUserCount: 1, coreAccessAllowedCount: 1 } }),
  }));
  await page.route('**/api/admin/users/app/list*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 200,
      data: {
        records: [{
          id: 1, nickname: '林女士', avatar: '', gender: 'FEMALE', genderLabel: '女', age: 28,
          school: '北京大学', realNameStatus: 'APPROVED', educationStatus: 'APPROVED',
          avatarVerifyStatus: 'APPROVED', firstLoginCompleted: 1, profileScore: 88,
          accountStatus: 'NORMAL', accessStatus: 'full_access', relationshipAccess: 'OPEN',
          vipVisible: true, vipStatus: 'active', coinBalance: 200,
          registerTime: '2026-07-01 10:00:00', lastLoginTime: '2026-07-21 09:00:00',
        }],
        total: 1, size: 9, current: 1,
      },
    }),
  }));
}

test('关系弹窗打开只加载摘要和喜欢，其他 Tab 首次切换时懒加载', async ({ page }) => {
  await login(page, ['user:app:list', 'user:app:relation:view', 'commercial:user:view']);
  await mockBaseApis(page);
  const calls = { summary: 0, likes: 0, visits: 0, matches: 0, unlocks: 0 };

  await page.route('**/api/admin/users/app/1/relations/summary', (route) => {
    calls.summary += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      code: 200,
      data: { userId: 1, relationshipAccess: 'OPEN', vipVisible: true, vipStatus: 'active', activeLikedCount: 3,
        visitorUv7d: 2, visitorPv7d: 6, activeMutualCount: 1, lastMatchTime: '2026-07-20 12:00:00' },
    }) });
  });
  await page.route('**/api/admin/users/app/1/relations/likes*', (route) => {
    calls.likes += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: {
      records: [{ recordNo: 'LIK-001', direction: 'INBOUND', counterparty: { userId: 2, userNo: '2', nickname: '张同学', anonymous: false },
        sourceScene: 'profile', status: 'active', likedTime: '2026-07-20 10:00:00', unlockNo: 'ULK-001' }],
      total: 1, size: 10, current: 1,
    } }) });
  });
  await page.route('**/api/admin/users/app/1/relations/visits*', (route) => {
    calls.visits += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: {
      records: [{ recordNo: 'VIS-001', direction: 'INBOUND', counterparty: { userNo: 'ANON-001', anonymous: true },
        sourceScene: 'featured', status: 'visible', firstVisitTime: '2026-07-20 11:00:00', lastVisitTime: '2026-07-20 11:10:00', visitCount: 2 }],
      total: 1, size: 10, current: 1,
    } }) });
  });
  await page.route('**/api/admin/users/app/1/relations/matches*', (route) => { calls.matches += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: { records: [], total: 0, size: 10, current: 1 } }) }); });
  await page.route('**/api/admin/users/app/1/relations/unlocks*', (route) => { calls.unlocks += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: { records: [], total: 0, size: 10, current: 1 } }) }); });

  await page.goto('/customers');
  await expect(page.getByText('林女士').first()).toBeVisible();
  await page.getByRole('button', { name: '模块补充' }).first().click();
  await expect(page.getByText('LIK-001')).toBeVisible();
  expect(calls.summary).toBe(1);
  expect(calls.likes).toBe(1);
  expect(calls.visits).toBe(0);
  expect(calls.matches).toBe(0);
  expect(calls.unlocks).toBe(0);

  await page.getByRole('button', { name: '访客记录' }).click();
  await expect(page.getByText('VIS-001')).toBeVisible();
  await expect(page.getByText('ANON-001')).toBeVisible();
  await page.screenshot({ path: '../docs/测试文档/证据/关系反馈后台弹窗.png', fullPage: true });
  expect(calls.visits).toBe(1);
  expect(calls.matches).toBe(0);
  expect(calls.unlocks).toBe(0);
});

test('无关系权限时隐藏关系 Tab 且不请求关系接口', async ({ page }) => {
  await login(page, ['user:app:list']);
  await mockBaseApis(page);
  let relationRequests = 0;
  let commercialRequests = 0;
  await page.route('**/api/admin/users/app/*/relations/**', (route) => {
    relationRequests += 1;
    return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 403, msg: '无权限' }) });
  });
  await page.route('**/api/admin/commercial/users/*/asset-detail', (route) => {
    commercialRequests += 1;
    return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 403, msg: '无权限' }) });
  });
  await page.route('**/api/admin/users/app/1', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: { id: 1, nickname: '林女士', profileScore: 88, accountStatus: 'NORMAL' } }),
  }));

  await page.goto('/customers');
  await expect(page.getByText('林女士').first()).toBeVisible();
  await expect(page.getByText('VIP 状态', { exact: true })).toHaveCount(0);
  await expect(page.getByText('千寻币', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '模块补充' }).first().click();
  await expect(page.getByRole('button', { name: '消息互动' })).toBeVisible();
  await expect(page.getByRole('button', { name: '关系反馈', exact: true })).toHaveCount(0);
  expect(relationRequests).toBe(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '详情' }).first().click();
  await expect(page.getByText('千寻币/VIP', { exact: true })).toHaveCount(0);
  expect(commercialRequests).toBe(0);
});
