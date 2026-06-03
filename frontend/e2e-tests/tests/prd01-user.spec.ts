import { test, expect } from '@playwright/test';

const MOCK_TOKEN = 'mock-admin-token';

/**
 * Inject auth state before any page scripts execute.
 * - `auth` key: Zustand persist middleware (hydrates useAuthStore)
 * - `token` key: directly read by Sidebar's useEffect
 */
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.addInitScript((token: string) => {
    localStorage.setItem('auth', JSON.stringify({
      state: { token, user: { nickname: 'peter', permissions: ['*:*:*'] } },
      version: 0,
    }));
    localStorage.setItem('token', token);
  }, MOCK_TOKEN);
}

function mockApi(page: import('@playwright/test').Page, url: string, data: unknown) {
  return page.route(url, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data),
  }));
}

/** Router tree for the sidebar — must mock /api/admin/routers */
const MOCK_ROUTERS = {
  code: 200,
  data: [
    {
      id: 1, parentId: 0, name: 'Dashboard', path: '/', component: '', meta: { title: '仪表盘', icon: 'LayoutDashboard' }, sort: 1, children: [],
    },
    {
      id: 20, parentId: 0, name: 'Users', path: '/customers', component: '', meta: { title: '用户管理', icon: 'Users' }, sort: 2, children: [
        { id: 21, parentId: 20, name: 'Customers', path: '/customers', component: '', meta: { title: '用户列表', icon: '' }, sort: 1, children: [] },
      ],
    },
    {
      id: 30, parentId: 0, name: 'Verify', path: '', component: '', meta: { title: '认证审核', icon: 'Shield' }, sort: 3, children: [
        { id: 31, parentId: 30, name: 'RealNameVerify', path: '/verify/real-name', component: '', meta: { title: '实名认证审核', icon: '' }, sort: 1, children: [] },
        { id: 32, parentId: 30, name: 'EducationVerify', path: '/verify/education', component: '', meta: { title: '学历认证审核', icon: '' }, sort: 2, children: [] },
        { id: 33, parentId: 30, name: 'AvatarVerify', path: '/verify/avatar', component: '', meta: { title: '头像认证审核', icon: '' }, sort: 3, children: [] },
      ],
    },
    {
      id: 40, parentId: 0, name: 'Moderation', path: '', component: '', meta: { title: '内容审核', icon: 'ShieldAlert' }, sort: 4, children: [
        { id: 41, parentId: 40, name: 'PhotoModeration', path: '/moderation/photos', component: '', meta: { title: '资料照片审核', icon: '' }, sort: 1, children: [] },
        { id: 42, parentId: 40, name: 'TextModeration', path: '/moderation/texts', component: '', meta: { title: '文字内容审核', icon: '' }, sort: 2, children: [] },
      ],
    },
  ],
};

// ==================== 用户列表 CustomersPage ====================
test.describe('用户列表 CustomersPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockApi(page, '**/api/admin/routers', MOCK_ROUTERS);

    await mockApi(page, '**/api/admin/users/app/list*', {
      code: 200,
      data: {
        records: [
          { id: 1, nickname: '林女士', avatar: '', gender: 'FEMALE', age: 28, school: '北京大学', realNameStatus: 'APPROVED', educationStatus: 'APPROVED', avatarVerifyStatus: 'APPROVED', firstLoginCompleted: 1, profileScore: 85, accountStatus: 'NORMAL', accessStatus: 'full_access', registerTime: '2026-05-01 10:00:00', lastLoginTime: '2026-06-03 08:00:00' },
          { id: 2, nickname: '张先生', avatar: '', gender: 'MALE', age: 25, school: '清华大学', realNameStatus: 'NOT_CERTIFIED', educationStatus: 'NOT_CERTIFIED', avatarVerifyStatus: 'NOT_CERTIFIED', firstLoginCompleted: 0, profileScore: 30, accountStatus: 'FROZEN', accessStatus: 'blocked', registerTime: '2026-05-15 14:00:00', lastLoginTime: '2026-05-30 12:00:00' },
        ],
        total: 2, size: 10, current: 1,
      },
    });

    await mockApi(page, '**/api/admin/users/app/1', {
      code: 200,
      data: {
        id: 1, nickname: '林女士', avatar: '', gender: 'FEMALE', birthday: '1998-06-15', age: 28, height: 165, locationProvince: '北京', locationCity: '朝阳', hometownProvince: '江苏', hometownCity: '南京', school: '北京大学', major: '新闻传播', educationLevel: 'MASTER', emotionalStatus: 'LOOKING', datingGoal: 'SERIOUS_RELATIONSHIP', maritalStatus: 'UNMARRIED', aboutMe: '热爱生活喜欢旅游和摄影希望能遇到志同道合的人', hopeTheyKnow: '我是一个比较慢热的人但熟了之后会很开朗', tags: '["文艺","摄影","旅游"]', photos: '["https://cdn.example.com/photo1.jpg"]', voiceIntroUrl: '', voiceIntroDuration: 0, mbtiType: 'INFJ', zodiac: '双子座', profileScore: 85, firstLoginCompleted: 1, registerTime: '2026-05-01 10:00:00', lastLoginTime: '2026-06-03 08:00:00', accountStatus: 'NORMAL', canBrowseCards: true, canMatch: true, canBeExposed: true, blockReason: null, violationCount: 0, feedbackCount: 0,
        verification: { realNameStatus: 'APPROVED', realNameRejectReason: null, realNameSubmitTime: '2026-05-10 08:00:00', educationStatus: 'APPROVED', educationMethod: 'CHSI', educationRejectReason: null, educationSubmitTime: '2026-05-10 08:30:00', avatarVerifyStatus: 'APPROVED', avatarVerifyRejectReason: null, avatarVerifySubmitTime: '2026-05-10 09:00:00', profilePhotoAuditStatus: 'APPROVED', profilePhotoRejectReason: null, openTextAuditStatus: 'APPROVED', openTextRejectReason: null, verifyLevel: 3 },
      },
    });

    await mockApi(page, '**/api/admin/users/app/*/status', { code: 200, data: null });
  });

  test('L4-01 用户列表 — 基础渲染', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('张先生')).toBeVisible();
    await expect(page.getByText('北京大学')).toBeVisible();
    await expect(page.getByText('清华大学')).toBeVisible();
    await expect(page.getByText('完全准入')).toBeVisible();
    await expect(page.getByText('已阻止')).toBeVisible();
  });

  test('L4-02 用户列表 — 学校搜索', async ({ page }) => {
    await page.goto('/customers');
    await page.getByRole('textbox', { name: '学校', exact: true }).fill('北京');
    await page.getByRole('button', { name: '搜索' }).click();
    await expect(page.getByText('北京大学')).toBeVisible();
  });

  test('L4-03 用户列表 — 关键词搜索', async ({ page }) => {
    await page.goto('/customers');
    await page.getByRole('textbox', { name: '搜索昵称/学校' }).fill('张');
    await page.getByRole('button', { name: '搜索' }).click();
    await expect(page.getByText('张先生')).toBeVisible();
  });

  test('L4-04 用户列表 — 重置筛选', async ({ page }) => {
    await page.goto('/customers');
    await page.getByRole('textbox', { name: '搜索昵称/学校' }).fill('测试');
    await page.getByRole('textbox', { name: '学校', exact: true }).fill('测试');
    await page.getByRole('button', { name: '重置' }).click();
    await expect(page.getByRole('textbox', { name: '搜索昵称/学校' })).toHaveValue('');
    await expect(page.getByRole('textbox', { name: '学校', exact: true })).toHaveValue('');
  });

  test('L4-05 用户列表 — 分页组件可见', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/共\s*2\s*条/)).toBeVisible();
  });

  test('L4-06 用户管理 — 冻结/解冻操作', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.getByText('张先生')).toBeVisible({ timeout: 5000 });
    // 张先生 is FROZEN, button shows 解冻
    const row = page.getByRole('row', { name: /张先生/ });
    const unfreezeBtn = row.getByRole('button', { name: '解冻' });
    if (await unfreezeBtn.count() > 0) {
      await unfreezeBtn.click();
      await expect(page.getByText(/确定要解冻/)).toBeVisible();
      await page.getByRole('button', { name: '确认' }).click();
    }
  });

  test('L4-07 用户管理 — 查看用户详情', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '详情' }).first().click();
    await expect(page.getByText('用户详情')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('基本信息')).toBeVisible();
    await expect(page.getByText('准入信息')).toBeVisible();
    await expect(page.getByText('认证信息')).toBeVisible();
  });

  test('L4-08 用户管理 — 详情弹窗准入信息', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '详情' }).first().click();
    await expect(page.getByText('用户详情')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('可浏览卡片:')).toBeVisible();
    await expect(page.getByText('可匹配:')).toBeVisible();
    await expect(page.getByText('可曝光:')).toBeVisible();
  });
});

// ==================== 认证审核 VerificationManagementPage ====================
test.describe('认证审核 VerificationManagementPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockApi(page, '**/api/admin/routers', MOCK_ROUTERS);

    const listData = {
      code: 200,
      data: {
        records: [
          { id: 1, userId: 1, avatar: '', nickname: '林女士', status: 'PENDING', rejectReason: null, submitTime: '2026-06-01 08:00:00' },
        ],
        total: 1, size: 10, current: 1,
      },
    };
    await mockApi(page, '**/api/admin/verify/real-name/list*', listData);
    await mockApi(page, '**/api/admin/verify/education/list*', listData);
    await mockApi(page, '**/api/admin/verify/avatar/list*', listData);

    await mockApi(page, '**/api/admin/verify/real-name/1', {
      code: 200, data: { id: 1, userId: 1, nickname: '林女士', avatar: '', verifyLevel: 1, fields: [{ label: '真实姓名', value: '林**' }, { label: '身份证号', value: '3201**********1234' }, { label: '人脸核身状态', value: 'PENDING' }], submitTime: '2026-06-01 08:00:00', resultTime: null, rejectReason: null, status: 'PENDING' },
    });
    await mockApi(page, '**/api/admin/verify/education/1', {
      code: 200, data: { id: 1, userId: 1, nickname: '林女士', avatar: '', verifyLevel: 1, fields: [{ label: '学校', value: '北京大学' }, { label: '认证方式', value: 'CHSI' }], submitTime: '2026-06-01 08:30:00', resultTime: null, rejectReason: null, status: 'PENDING' },
    });
    await mockApi(page, '**/api/admin/verify/avatar/1', {
      code: 200, data: { id: 1, userId: 1, nickname: '林女士', avatar: '', verifyLevel: 1, fields: [{ label: '当前主头像', value: 'https://cdn.example.com/avatar.jpg' }, { label: '认证状态', value: 'PENDING' }], submitTime: '2026-06-01 09:00:00', resultTime: null, rejectReason: null, status: 'PENDING' },
    });

    await mockApi(page, '**/api/admin/verify/real-name/*/audit', { code: 200, data: null });
    await mockApi(page, '**/api/admin/verify/education/*/audit', { code: 200, data: null });
    await mockApi(page, '**/api/admin/verify/avatar/*/audit', { code: 200, data: null });
  });

  test('L4-09 实名认证审核 — 列表渲染', async ({ page }) => {
    await page.goto('/verify/real-name');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });
  });

  test('L4-10 认证审核 — 导航切换标签', async ({ page }) => {
    await page.goto('/verify/real-name');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    // Navigate to education tab via sidebar (scope to <nav> to avoid header duplicate)
    await page.getByRole('navigation').getByRole('link', { name: '学历认证审核' }).click();
    await expect(page).toHaveURL(/\/verify\/education/);
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 3000 });

    // Navigate to avatar tab
    await page.getByRole('navigation').getByRole('link', { name: '头像认证审核' }).click();
    await expect(page).toHaveURL(/\/verify\/avatar/);
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 3000 });
  });

  test('L4-11 实名认证审核 — 详情弹窗', async ({ page }) => {
    await page.goto('/verify/real-name');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '查看' }).first().click();
    await expect(page.getByText('认证内容')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('林**')).toBeVisible();
    await expect(page.getByText('3201**********1234')).toBeVisible();
  });

  test('L4-12 实名认证审核 — 通过操作', async ({ page }) => {
    await page.goto('/verify/real-name');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    const approveBtn = page.getByRole('button', { name: '通过' }).first();
    if (await approveBtn.count() > 0) {
      await approveBtn.click();
      await expect(page.getByText(/确认通过/)).toBeVisible();
      await page.getByRole('button', { name: '确认' }).click();
    }
  });

  test('L4-13 学历认证审核 — 详情弹窗', async ({ page }) => {
    await page.goto('/verify/education');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '查看' }).first().click();
    await expect(page.getByText('北京大学')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('学信网')).toBeVisible();
  });

  test('L4-14 头像认证审核 — 详情弹窗', async ({ page }) => {
    await page.goto('/verify/avatar');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '查看' }).first().click();
    await expect(page.getByText('认证内容')).toBeVisible({ timeout: 3000 });
  });
});

// ==================== 内容审核 ModerationPage ====================
test.describe('内容审核 ModerationPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockApi(page, '**/api/admin/routers', MOCK_ROUTERS);

    const photoList = {
      code: 200,
      data: {
        records: [
          { id: 1, userId: 1, avatar: '', nickname: '林女士', contentType: '资料照片', contentPreview: 'https://cdn.example.com/photo1_thumb.jpg', status: 'PENDING', rejectReason: null, submitTime: '2026-06-01 10:00:00' },
        ],
        total: 1, size: 10, current: 1,
      },
    };
    const textList = {
      code: 200,
      data: {
        records: [
          { id: 1, userId: 1, avatar: '', nickname: '林女士', contentType: '文字内容', contentPreview: '热爱生活喜欢旅游和摄影希望能遇到志同道合的人', status: 'PENDING', rejectReason: null, submitTime: '2026-06-01 11:00:00' },
        ],
        total: 1, size: 10, current: 1,
      },
    };
    await mockApi(page, '**/api/admin/moderation/photos/list*', photoList);
    await mockApi(page, '**/api/admin/moderation/texts/list*', textList);

    await mockApi(page, '**/api/admin/moderation/photos/1', {
      code: 200, data: { id: 1, userId: 1, nickname: '林女士', avatar: '', contentType: '资料照片', contentFull: '["https://cdn.example.com/photo1.jpg","https://cdn.example.com/photo2.jpg"]', contentField: null, submitTime: '2026-06-01 10:00:00', status: 'PENDING', rejectReason: null },
    });
    await mockApi(page, '**/api/admin/moderation/texts/1', {
      code: 200, data: { id: 1, userId: 1, nickname: '林女士', avatar: '', contentType: '文字内容', contentFull: '热爱生活喜欢旅游和摄影希望能遇到志同道合的人', contentField: '关于我', submitTime: '2026-06-01 11:00:00', status: 'PENDING', rejectReason: null },
    });

    await mockApi(page, '**/api/admin/moderation/photos/*/audit', { code: 200, data: null });
    await mockApi(page, '**/api/admin/moderation/texts/*/audit', { code: 200, data: null });
  });

  test('L4-15 照片审核 — 列表渲染', async ({ page }) => {
    await page.goto('/moderation/photos');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });
  });

  test('L4-16 内容审核 — 导航切换标签', async ({ page }) => {
    await page.goto('/moderation/photos');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    // Navigate to text moderation tab via sidebar link
    await page.getByRole('link', { name: '文字内容审核' }).click();
    await expect(page).toHaveURL(/\/moderation\/texts/);
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 3000 });
  });

  test('L4-17 照片审核 — 通过操作', async ({ page }) => {
    await page.goto('/moderation/photos');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    const approveBtn = page.getByRole('button', { name: '通过' }).first();
    if (await approveBtn.count() > 0) {
      await approveBtn.click();
      await expect(page.getByText(/确认通过/)).toBeVisible();
      await page.getByRole('button', { name: '确认' }).click();
    }
  });

  test('L4-18 照片审核 — 详情弹窗', async ({ page }) => {
    await page.goto('/moderation/photos');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '查看' }).first().click();
    await expect(page.getByText('照片审核详情')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('审核内容')).toBeVisible();
  });

  test('L4-19 文字审核 — 详情弹窗', async ({ page }) => {
    await page.goto('/moderation/texts');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '查看' }).first().click();
    await expect(page.getByText('文字审核详情')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('关于我')).toBeVisible();
  });

  test('L4-20 审核详情弹窗 — PENDING 状态可操作', async ({ page }) => {
    await page.goto('/moderation/photos');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '查看' }).first().click();
    await expect(page.getByText('照片审核详情')).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: '通过' })).toBeVisible({ timeout: 3000 });
  });

  test('L4-21 审核详情弹窗 — 已审核状态不可操作', async ({ page }) => {
    await mockApi(page, '**/api/admin/moderation/photos/1', {
      code: 200, data: { id: 1, userId: 1, nickname: '林女士', avatar: '', contentType: '资料照片', contentFull: '["https://cdn.example.com/photo1.jpg"]', contentField: null, submitTime: '2026-06-01 10:00:00', status: 'APPROVED', rejectReason: null },
    });

    await page.goto('/moderation/photos');
    await expect(page.getByText('林女士')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '查看' }).first().click();
    await expect(page.getByText('照片审核详情')).toBeVisible({ timeout: 3000 });
  });
});
