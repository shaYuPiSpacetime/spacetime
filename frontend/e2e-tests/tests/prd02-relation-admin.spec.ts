import { expect, test, type Page } from '@playwright/test';

const TOKEN = 'prd02-admin-token';

async function login(page: Page, permissions: string[], currentPermissions = permissions) {
  await page.route('**/api/admin/permissions', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: currentPermissions }),
  }));
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
    body: JSON.stringify({
      code: 200,
      data: {
        currentUserCount: 1,
        coreAccessAllowedCount: 1,
        relationshipAccessOpenCount: 1,
        visitorUv7d: 1,
      },
    }),
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
  const requestedPageSizes: number[] = [];

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
    requestedPageSizes.push(Number(new URL(route.request().url()).searchParams.get('size')));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: {
      records: [{ recordNo: 'LIK-001', direction: 'INBOUND', counterparty: { userId: 2, userNo: '2', nickname: '张同学', anonymous: false },
        sourceScene: 'profile', status: 'active', likedTime: '2026-07-20 10:00:00', unlockNo: 'ULK-001' }],
      total: 1, size: 5, current: 1,
    } }) });
  });
  await page.route('**/api/admin/users/app/1/relations/visits*', (route) => {
    calls.visits += 1;
    requestedPageSizes.push(Number(new URL(route.request().url()).searchParams.get('size')));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: {
      records: Array.from({ length: 5 }, (_, index) => {
        const suffix = String(index + 1).padStart(3, '0');
        return {
          recordNo: `VIS-${suffix}`,
          direction: 'INBOUND',
          counterparty: { userNo: `ANON-${suffix}`, anonymous: true },
          sourceScene: 'featured',
          status: 'visible',
          firstVisitTime: '2026-07-20 11:00:00',
          lastVisitTime: '2026-07-20 11:10:00',
          visitCount: 2,
        };
      }),
      total: 12, size: 5, current: 1,
    } }) });
  });
  await page.route('**/api/admin/users/app/1/relations/matches*', (route) => { calls.matches += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: { records: [], total: 0, size: 10, current: 1 } }) }); });
  await page.route('**/api/admin/users/app/1/relations/unlocks*', (route) => { calls.unlocks += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: { records: [], total: 0, size: 10, current: 1 } }) }); });

  await page.goto('/customers');
  await expect(page.getByText('林女士').first()).toBeVisible();
  await page.getByRole('button', { name: '心动 & 消息' }).first().click();
  await expect(page.getByRole('heading', { name: '林女士 1 · 心动 & 消息' })).toBeVisible();
  await expect(page.getByText('LIK-001')).toBeVisible();
  expect(requestedPageSizes).toEqual([5]);
  const dialogContent = page.getByTestId('module-supplement-dialog-content');
  await expect(dialogContent.locator('select')).toHaveCount(0);
  await expect(dialogContent.locator('..')).toHaveCSS('overflow-y', 'auto');
  expect(calls.summary).toBe(1);
  expect(calls.likes).toBe(1);
  expect(calls.visits).toBe(0);
  expect(calls.matches).toBe(0);
  expect(calls.unlocks).toBe(0);

  await page.getByRole('button', { name: '访客记录' }).click();
  await expect(page.getByText('VIS-001')).toBeVisible();
  await expect(page.getByText('VIS-005')).toBeVisible();
  await expect(page.getByText('VIS-006')).toHaveCount(0);
  await expect(page.getByText('ANON-001')).toBeVisible();
  await page.screenshot({ path: '../docs/测试文档/证据/关系反馈后台弹窗.png', fullPage: true });
  expect(calls.visits).toBe(1);
  expect(requestedPageSizes).toEqual([5, 5]);
  expect(calls.matches).toBe(0);
  expect(calls.unlocks).toBe(0);
});

test('关系明细展示状态原因并提供有效的查看用户和查看解锁操作', async ({ page }) => {
  await login(page, ['user:app:list', 'user:app:relation:view', 'commercial:user:view']);
  await mockBaseApis(page);
  let requestedUnlockNo = '';

  await page.route('**/api/admin/users/app/1/relations/summary', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: { userId: 1, relationshipAccess: 'OPEN', vipVisible: true } }),
  }));
  await page.route('**/api/admin/users/app/1/relations/likes*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: {
      records: [
        { recordNo: 'LIK-ACTIVE', direction: 'INBOUND', counterparty: { userId: 2, userNo: '2', nickname: '张同学', anonymous: false }, sourceScene: 'profile', status: 'active', likedTime: '2026-07-22 10:00:00', unlockNo: 'ULK-001' },
        { recordNo: 'LIK-CANCELLED', direction: 'OUTBOUND', counterparty: { userId: 3, userNo: '3', nickname: '李同学', anonymous: false }, sourceScene: 'featured', status: 'cancelled', invalidReason: 'like_cancelled', invalidTime: '2026-07-21 10:00:00', likedTime: '2026-07-20 10:00:00' },
        { recordNo: 'LIK-INVALID', direction: 'INBOUND', counterparty: { userId: 4, userNo: '4', nickname: '王同学', anonymous: false }, sourceScene: 'fate', status: 'invalid', invalidReason: 'blocked', invalidTime: '2026-07-21 11:00:00', likedTime: '2026-07-20 11:00:00' },
      ],
      total: 3, size: 5, current: 1,
    } }),
  }));
  await page.route('**/api/admin/users/app/1/relations/visits*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: {
      records: [
        { recordNo: 'VIS-VISIBLE', direction: 'INBOUND', counterparty: { userId: 2, userNo: '2', nickname: '张同学', anonymous: false }, sourceScene: 'profile', status: 'visible', firstVisitTime: '2026-07-22 09:00:00', lastVisitTime: '2026-07-22 09:10:00', visitCount: 2, unlockNo: 'ULK-002' },
        { recordNo: 'VIS-EXPIRED', direction: 'INBOUND', counterparty: { userId: 3, userNo: '3', nickname: '李同学', anonymous: false }, sourceScene: 'featured', status: 'expired_window', firstVisitTime: '2026-07-10 09:00:00', lastVisitTime: '2026-07-10 09:10:00', visitCount: 3 },
        { recordNo: 'VIS-INVALID', direction: 'OUTBOUND', counterparty: { userId: 4, userNo: '4', nickname: '王同学', anonymous: false }, sourceScene: 'fate', status: 'invalid', invalidReason: 'account_frozen', invalidTime: '2026-07-21 09:00:00', firstVisitTime: '2026-07-20 09:00:00', lastVisitTime: '2026-07-20 09:10:00', visitCount: 1 },
      ],
      total: 3, size: 5, current: 1,
    } }),
  }));
  await page.route('**/api/admin/users/app/1/relations/unlocks*', (route) => {
    requestedUnlockNo = new URL(route.request().url()).searchParams.get('unlockNo') || '';
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, data: {
        records: [{ unlockNo: 'ULK-001', targetBizType: 'like', targetBizNo: 'LIK-ACTIVE', counterparty: { userId: 2, userNo: '2', nickname: '张同学', anonymous: false }, unlockScene: 'likes_unlock_one', unlockMethod: 'coin', coinCost: 8, status: 'active', effectiveTime: '2026-07-22 10:05:00', targetAvailable: true, assetVisible: true }],
        total: 1, size: 5, current: 1,
      } }),
    });
  });
  await page.route('**/api/admin/users/app/2', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: { id: 2, nickname: '张同学', gender: 'MALE', genderLabel: '男', age: 29, profileScore: 90, accountStatus: 'NORMAL', canMatch: true, canBeExposed: true, canBrowseCards: true, verification: { realNameStatus: 'APPROVED', educationStatus: 'APPROVED', avatarVerifyStatus: 'APPROVED' } } }),
  }));
  await page.route('**/api/admin/commercial/users/2/asset-detail', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: { userId: 2, vipStatus: 'none', coinBalance: 0 } }),
  }));

  await page.goto('/customers');
  await page.getByRole('button', { name: '心动 & 消息' }).first().click();
  await expect(page.getByRole('columnheader', { name: '操作' })).toHaveCSS('position', 'sticky');
  await expect(page.getByRole('columnheader', { name: '失效原因' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '失效时间' })).toBeVisible();
  const cancelledLike = page.getByRole('row').filter({ hasText: 'LIK-CANCELLED' });
  await expect(cancelledLike).toContainText('已取消');
  await expect(cancelledLike).toContainText('取消喜欢');
  await expect(cancelledLike.getByRole('button', { name: '查看用户' })).toHaveCount(1);
  await expect(cancelledLike.getByRole('button', { name: '查看解锁' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看原因' })).toHaveCount(0);

  const activeLike = page.getByRole('row').filter({ hasText: 'LIK-ACTIVE' });
  await activeLike.getByRole('button', { name: '查看解锁' }).click();
  await expect(page.getByRole('columnheader', { name: '目标记录' })).toBeVisible();
  expect(requestedUnlockNo).toBe('ULK-001');
  const unlockRow = page.getByRole('row').filter({ hasText: 'ULK-001' });
  await expect(unlockRow).toBeVisible();
  await expect(unlockRow.getByRole('button', { name: '查看用户' })).toHaveCount(1);
  await expect(unlockRow.getByRole('button', { name: '查看解锁' })).toHaveCount(0);

  await page.getByRole('button', { name: '访客记录' }).click();
  const expiredVisit = page.getByRole('row').filter({ hasText: 'VIS-EXPIRED' });
  await expect(expiredVisit).toContainText('已超展示窗口');
  await expect(expiredVisit).not.toContainText('已失效');
  const invalidVisit = page.getByRole('row').filter({ hasText: 'VIS-INVALID' });
  await expect(invalidVisit).toContainText('账号冻结');
  await expect(invalidVisit).toContainText('2026-07-21 09:00:00');

  await page.getByRole('button', { name: '解锁记录' }).click();
  await expect(page.getByRole('columnheader', { name: '目标记录' })).toBeVisible();
  const relationDialog = page.getByTestId('module-supplement-dialog-content');
  await unlockRow.getByRole('button', { name: '查看用户' }).click();
  const profileDialog = page.getByTestId('profile-dialog-content');
  await expect(profileDialog.getByRole('heading', { name: '画像详情' })).toBeVisible();
  await expect(profileDialog.getByText('张同学 U2')).toBeVisible();
  await expect(relationDialog).toBeVisible();
  const relationBox = await relationDialog.boundingBox();
  const profileBox = await profileDialog.boundingBox();
  expect(profileBox?.width).toBeLessThan(relationBox?.width || 0);

  await page.keyboard.press('Escape');
  await expect(profileDialog).toBeHidden();
  await expect(relationDialog).toBeVisible();
  await expect(unlockRow).toBeVisible();
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
  await page.getByRole('button', { name: '心动 & 消息' }).first().click();
  await expect(page.getByRole('button', { name: '消息互动' })).toBeVisible();
  await expect(page.getByRole('button', { name: '关系反馈', exact: true })).toHaveCount(0);
  expect(relationRequests).toBe(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '详情' }).first().click();
  await expect(page.getByText('千寻币/VIP', { exact: true })).toHaveCount(0);
  expect(commercialRequests).toBe(0);
});

test('已登录会话自动刷新权限后展示关系反馈 Tab', async ({ page }) => {
  await login(
    page,
    ['user:app:list'],
    ['user:app:list', 'user:app:relation:view'],
  );
  await mockBaseApis(page);
  let permissionRequests = 0;
  await page.route('**/api/admin/permissions', (route) => {
    permissionRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, data: ['user:app:list', 'user:app:relation:view'] }),
    });
  });
  await page.route('**/api/admin/users/app/1/relations/summary', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: { userId: 1, relationshipAccess: 'OPEN' } }),
  }));
  await page.route('**/api/admin/users/app/1/relations/likes*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data: { records: [], total: 0, size: 10, current: 1 } }),
  }));

  await page.goto('/customers');
  await expect(page.getByText('林女士').first()).toBeVisible();
  await page.getByRole('button', { name: '心动 & 消息' }).first().click();
  await expect(page.getByRole('button', { name: '关系反馈', exact: true })).toBeVisible();
  expect(permissionRequests).toBeGreaterThan(0);
});
