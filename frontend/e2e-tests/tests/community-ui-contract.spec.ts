import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';

const meta = {
  options: {
    contentStatus: [
      { code: 'pending_manual', label: '待人工复核', tone: 'warning' },
      { code: 'published', label: '已公开', tone: 'success' },
    ],
    contentType: [{ code: 'community_post', label: '动态' }],
    sourceScene: [{ code: 'qianxun_chengjia', label: '千寻成家动态' }],
    mediaType: [{ code: 'image_text', label: '图文' }],
    machineResult: [{ code: 'pass', label: '通过' }],
    commentStatus: [{ code: 'published', label: '已公开', tone: 'success' }],
    reportStatus: [{ code: 'pending', label: '待处理', tone: 'warning' }],
    reportTargetType: [{ code: 'chat', label: '聊天' }],
    reportReason: [{ code: 'abuse', label: '攻击辱骂' }],
    punishAction: [{ code: 'warn_user', label: '警告用户' }],
    mutePeriod: [{ code: 'P1D', label: '1 天' }],
    ipBlockPeriod: [{ code: 'PT24H', label: '24 小时' }],
    writeScope: [{ code: 'post', label: '发布动态' }],
    topicStatus: [{ code: 'enabled', label: '启用', tone: 'success' }],
    yesNo: [
      { code: 'true', label: '是' },
      { code: 'false', label: '否' },
    ],
    interactionGateMode: [
      { code: 'LOGIN_ONLY', label: '仅登录' },
      { code: 'FULL_CERT', label: '需三项认证' },
    ],
  },
  copy: {
    content_empty: '暂无社区内容',
    moment_empty: '暂无动态记录',
    comment_empty: '暂无评论记录',
    report_empty: '暂无举报记录',
    topic_empty: '暂无家园话题',
    permission_denied: '当前测试账号无权访问该社区管理页面',
  },
};

const permissions = [
  'community:content:list',
  'community:moments:list',
  'community:post:list',
  'community:post:audit',
  'community:comment:list',
  'community:report:list',
  'community:topic:list',
  'community:config:view',
  'community:config:edit',
];

async function bootstrap(page: Page) {
  await page.route('**/api/admin/permissions', async (route) => {
    await route.fulfill({ json: { code: 200, data: permissions } });
  });
  await page.route('**/api/admin/routers', async (route) => {
    await route.fulfill({ json: { code: 200, data: [] } });
  });
  await page.route('**/api/admin/community/meta', async (route) => {
    await route.fulfill({ json: { code: 200, data: meta } });
  });
  await page.route('**/api/admin/community/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/meta')) {
      await route.fulfill({ json: { code: 200, data: meta } });
      return;
    }
    if (url.pathname.endsWith('/stats')) {
      await route.fulfill({ json: { code: 200, data: { cards: [] } } });
      return;
    }
    if (url.pathname.endsWith('/configs')) {
      await route.fulfill({ json: { code: 200, data: { version: 1, sections: [], changeLogs: [] } } });
      return;
    }
    await route.fulfill({ json: { code: 200, data: { records: [], total: 0, current: 1, size: 20 } } });
  });

  await page.goto(BASE_URL);
  await page.evaluate((grantedPermissions) => {
    const user = {
      nickname: 'UI 契约测试',
      permissions: grantedPermissions,
    };
    localStorage.setItem('token', 'community-ui-contract-token');
    localStorage.setItem('auth', JSON.stringify({ state: { token: 'community-ui-contract-token', user }, version: 0 }));
  }, permissions);
}

test.describe('PRD-05 管理后台六页前端契约', () => {
  test.beforeEach(async ({ page }) => bootstrap(page));

  for (const [path, heading] of [
    ['/community/content', '内容管理'],
    ['/community/moments', '动态管理'],
    ['/community/comment-audit', '评论管理'],
    ['/community/reports', '举报管理'],
    ['/community/topics', '家园话题管理'],
    ['/community/config', '审核规则配置'],
  ] as const) {
    test(`${path} 渲染真实业务页`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByText('筛选区').first()).toBeVisible();
    });
  }

  test('旧路由兼容重定向', async ({ page }) => {
    await page.goto(`${BASE_URL}/community/posts`);
    await expect(page).toHaveURL(/\/community\/content$/);
    await page.goto(`${BASE_URL}/community/comments`);
    await expect(page).toHaveURL(/\/community\/comment-audit$/);
    await page.goto(`${BASE_URL}/community/configs`);
    await expect(page).toHaveURL(/\/community\/config$/);
  });

  test('空态文案来自 meta 且不暴露旧硬编码状态', async ({ page }) => {
    await page.goto(`${BASE_URL}/community/content`);
    await expect(page.getByText(meta.copy.content_empty)).toBeVisible();
    await expect(page.getByText('PENDING')).toHaveCount(0);
  });

  test('内容列表行只保留详情并可进入抽屉', async ({ page }) => {
    await page.route('**/api/admin/community/posts/list**', async (route) => {
      await route.fulfill({ json: { code: 200, data: { current: 1, size: 20, total: 1, records: [{ id: 1, postNo: 'P-0001', auditNo: 'A-0001', authorId: 8, authorNo: 'U-0008', authorName: '测试用户', contentType: 'community_post', sourceScene: 'qianxun_chengjia', mediaType: 'image_text', content: '契约测试内容', contentSummary: '契约测试内容', likeCount: 1, commentCount: 2, reportCount: 0, machineResult: 'pass', riskLevel: 'low', status: 'pending_manual', statusName: '服务端不应覆盖 meta', version: 1, createTime: '2026-08-03 10:00:00' }] } } });
    });
    await page.route('**/api/admin/community/posts/1', async (route) => {
      await route.fulfill({ json: { code: 200, data: { id: 1, postNo: 'P-0001', authorId: 8, authorNo: 'U-0008', authorName: '测试用户', contentType: 'community_post', sourceScene: 'qianxun_chengjia', content: '契约测试内容全文', likeCount: 1, commentCount: 2, reportCount: 0, status: 'pending_manual', version: 1, auditLogs: [] } } });
    });

    await page.goto(`${BASE_URL}/community/content`);
    await expect(page.getByRole('button', { name: '详情' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /审核|下架|驳回|恢复/ })).toHaveCount(0);
    await page.getByRole('button', { name: '详情' }).click();
    await expect(page.getByRole('dialog', { name: '内容详情' })).toBeVisible();
    await expect(page.getByText('契约测试内容全文')).toBeVisible();
  });

  test('动态列表把来源场景显示为中文并展示最多三张内容图片', async ({ page }) => {
    await page.route('**/api/admin/community/posts/list**', async (route) => {
      await route.fulfill({
        json: {
          code: 200,
          data: {
            current: 1,
            size: 20,
            total: 1,
            records: [{
              id: 2,
              postNo: 'P-0002',
              authorId: 8,
              authorNo: 'U-0008',
              authorName: '测试用户',
              contentType: 'community_post',
              sourceScene: 'qianxun_chengjia',
              distributionScenes: ['qianxun_chengjia'],
              mediaType: 'image_text',
              content: '带图片的动态',
              contentSummary: '带图片的动态',
              imageUrls: [
                'https://cdn.example.com/community-1.webp',
                'https://cdn.example.com/community-2.webp',
                'https://cdn.example.com/community-3.webp',
                'https://cdn.example.com/community-4.webp',
              ],
              likeCount: 1,
              commentCount: 2,
              reportCount: 0,
              status: 'published',
              version: 1,
              createTime: '2026-08-03 10:00:00',
            }],
          },
        },
      });
    });

    await page.goto(`${BASE_URL}/community/moments`);
    await expect(page.getByText('千寻成家动态', { exact: true })).toBeVisible();
    await expect(page.getByText('qianxun_chengjia', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('img', { name: /P-0002 内容图片/ })).toHaveCount(3);
  });

  test('分组配置编辑后保持新值并启用保存', async ({ page }) => {
    const gateItem = {
      configKey: 'community.interaction_gate_mode',
      configValue: 'FULL_CERT',
      configGroup: 'COMMUNITY',
      configType: 'TEXT',
      sectionCode: 'entry',
      name: '社区互动使用三项认证准入',
      description: '社区互动使用三项认证准入',
      optionsKey: 'interactionGateMode',
      editable: true,
      highRisk: true,
      sort: 10,
    };
    await page.route('**/api/admin/community/configs/version', async (route) => {
      await route.fulfill({
        json: {
          code: 200,
          data: {
            version: 0,
            items: [gateItem],
            sections: [{ code: 'entry', name: '社区入口', items: [gateItem] }],
            changeLogs: [],
          },
        },
      });
    });

    await page.goto(`${BASE_URL}/community/config`);
    const configCard = page.getByRole('article').filter({ hasText: gateItem.name });
    const select = configCard.getByRole('combobox');
    await expect(select).toHaveValue('FULL_CERT');
    await select.selectOption('LOGIN_ONLY');
    await expect(select).toHaveValue('LOGIN_ONLY');
    await expect(page.getByRole('button', { name: '保存配置' })).toBeEnabled();
  });

  test('无页面权限时展示动态权限态且不请求业务列表', async ({ page }) => {
    let listRequestCount = 0;
    await page.unroute('**/api/admin/permissions');
    await page.route('**/api/admin/permissions', async (route) => {
      await route.fulfill({ json: { code: 200, data: [] } });
    });
    await page.route('**/api/admin/community/posts/list**', async (route) => {
      listRequestCount += 1;
      await route.fulfill({ json: { code: 403, message: 'forbidden' } });
    });
    await page.evaluate(() => {
      const user = { nickname: '无权限测试', permissions: [] };
      localStorage.setItem('auth', JSON.stringify({ state: { token: 'community-ui-contract-token', user }, version: 0 }));
    });

    await page.goto(`${BASE_URL}/community/content`);
    await expect(page.getByText(meta.copy.permission_denied)).toBeVisible();
    expect(listRequestCount).toBe(0);
  });
});
