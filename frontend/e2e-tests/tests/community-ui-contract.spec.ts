import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';

const meta = {
  options: {
    contentStatus: [
      { code: 'pending_manual', label: '待人工复核', tone: 'warning' },
      { code: 'published', label: '已公开', tone: 'success' },
    ],
    contentType: [
      { code: 'community_post', label: '动态' },
      { code: 'sincere_post', label: '诚意贴' },
    ],
    sourceScene: [{ code: 'qianxun_chengjia', label: '千寻成家动态' }],
    mediaType: [{ code: 'image_text', label: '图文' }],
    machineResult: [{ code: 'pass', label: '通过' }],
    postAction: [
      { code: 'published', label: '公开/恢复' },
      { code: 'rejected', label: '驳回' },
      { code: 'blocked', label: '下架' },
      { code: 'pending_manual', label: '转人工复核' },
    ],
    commentStatus: [{ code: 'published', label: '已公开', tone: 'success' }],
    commentAction: [
      { code: 'published', label: '公开/恢复' },
      { code: 'rejected', label: '驳回' },
      { code: 'blocked', label: '屏蔽' },
      { code: 'warn_user', label: '警告用户' },
      { code: 'mute_user', label: '禁言用户', tone: 'danger', extra: { muteRequired: true, highRisk: true } },
    ],
    reportStatus: [{ code: 'pending', label: '待处理', tone: 'warning' }],
    reportResult: [
      { code: 'processing', label: '处理中' },
      { code: 'valid', label: '举报成立' },
      { code: 'invalid', label: '举报不成立' },
      { code: 'merged', label: '合并举报' },
    ],
    reportTargetType: [{ code: 'chat', label: '聊天' }],
    reportReason: [{ code: 'abuse', label: '攻击辱骂' }],
    punishAction: [
      { code: 'none', label: '不处罚' },
      { code: 'warn_user', label: '警告用户' },
      { code: 'mute_user', label: '禁言用户', tone: 'danger' },
      { code: 'ip_block', label: 'IP 封禁', tone: 'danger' },
      { code: 'freeze_user', label: '冻结账号', tone: 'danger' },
    ],
    mutePeriod: [{ code: 'P1D', label: '1 天' }],
    ipBlockPeriod: [{ code: 'PT24H', label: '24 小时' }],
    writeScope: [{ code: 'post', label: '发布动态' }],
    topicStatus: [{ code: 'enabled', label: '启用', tone: 'success' }],
    topicDisplayScene: [
      { code: 'hot', label: '热门入口' },
      { code: 'topic_list', label: '话题列表' },
      { code: 'publish', label: '发布页' },
    ],
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
    action_required: '请选择处理结果',
    post_action_success: '处理成功',
    permission_denied: '当前测试账号无权访问该社区管理页面',
  },
};

const permissions = [
  'community:content:list',
  'community:moments:list',
  'community:post:list',
  'community:post:audit',
  'community:comment:list',
  'community:comment:risk',
  'community:report:list',
  'community:report:handle',
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

  test('内容审核处理结果必须真实选择后才可提交', async ({ page }) => {
    const post = { id: 6, postNo: 'P-0006', authorId: 8, authorNo: 'U-0008', authorName: '测试用户', contentType: 'community_post', sourceScene: 'qianxun_chengjia', mediaType: 'image_text', content: '待审核内容', contentSummary: '待审核内容', likeCount: 0, commentCount: 0, reportCount: 0, machineResult: 'pass', riskLevel: 'low', status: 'pending_manual', version: 1, createTime: '2026-08-03 10:00:00', auditLogs: [] };
    let submittedAction = '';
    await page.route('**/api/admin/community/posts/list**', async (route) => {
      await route.fulfill({ json: { code: 200, data: { current: 1, size: 20, total: 1, records: [post] } } });
    });
    await page.route('**/api/admin/community/posts/6', async (route) => {
      await route.fulfill({ json: { code: 200, data: post } });
    });
    await page.route('**/api/admin/community/posts/6/status', async (route) => {
      submittedAction = String(route.request().postDataJSON()?.action || '');
      await route.fulfill({ json: { code: 200, data: true } });
    });

    await page.goto(`${BASE_URL}/community/content`);
    await page.getByRole('button', { name: '详情' }).click();
    const dialog = page.getByRole('dialog', { name: '内容详情' });
    const resultSelect = dialog.getByLabel('处理结果');
    await expect(resultSelect).toHaveValue('');
    await expect(resultSelect.locator('option[value=""]')).toHaveText('请选择');
    await expect(resultSelect.locator('option[value=""]')).toHaveAttribute('disabled', '');

    await dialog.getByRole('button', { name: '确认处理' }).click();
    await expect(page.getByText(meta.copy.action_required)).toBeVisible();
    expect(submittedAction).toBe('');

    await resultSelect.selectOption('published');
    await dialog.getByRole('button', { name: '确认处理' }).click();
    await expect.poll(() => submittedAction).toBe('published');
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

  test('评论列表和详情展示当前所属动态完整上下文及失效态', async ({ page }) => {
    const image = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    const validComment = {
      id: 31,
      commentNo: 'C-0031',
      postId: 11,
      postAvailable: true,
      postNo: 'P-0011',
      postType: 'community_post',
      postTitle: '周末露营计划',
      postSummary: '周末一起去露营',
      postContent: '周末一起去露营，欢迎带上你的宠物。这是所属动态完整正文。',
      postImageUrls: [image, image, image],
      postSourceScene: 'qianxun_chengjia',
      postStatus: 'published',
      postStatusName: '已公开',
      authorId: 8,
      authorNo: 'U-0008',
      authorName: '测试用户',
      content: '我报名参加',
      likeCount: 2,
      reportCount: 0,
      status: 'published',
      version: 1,
      createTime: '2026-08-04 10:00:00',
      auditLogs: [],
    };
    const missingComment = {
      ...validComment,
      id: 32,
      commentNo: 'C-0032',
      postId: 12,
      postAvailable: false,
      postNo: undefined,
      postType: undefined,
      postTitle: undefined,
      postSummary: undefined,
      postContent: undefined,
      postImageUrls: [],
      content: '原内容还在吗',
    };
    await page.route('**/api/admin/community/comments/list**', async (route) => {
      await route.fulfill({ json: { code: 200, data: { current: 1, size: 20, total: 2, records: [validComment, missingComment] } } });
    });
    await page.route('**/api/admin/community/comments/31', async (route) => {
      await route.fulfill({ json: { code: 200, data: validComment } });
    });

    await page.goto(`${BASE_URL}/community/comment-audit`);
    await expect(page.getByText('动态', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('周末一起去露营', { exact: true })).toBeVisible();
    await expect(page.getByText('内容已变化', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '详情' }).first().click();
    const dialog = page.getByRole('dialog', { name: '评论详情' });
    await expect(dialog.getByText('所属动态', { exact: true })).toBeVisible();
    await expect(dialog.getByText('周末一起去露营，欢迎带上你的宠物。这是所属动态完整正文。')).toBeVisible();
    await expect(dialog.getByRole('img', { name: /P-0011 所属动态图片/ })).toHaveCount(3);
  });

  test('家园话题封面在列表与编辑详情一致回显', async ({ page }) => {
    const coverUrl = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    const topic = {
      id: 71,
      topicCode: 'camp',
      topicName: '露营交友',
      description: '在自然里认识聊得来的人',
      coverUrl,
      displayScenes: ['hot', 'topic_list', 'publish'],
      recommended: true,
      sort: 10,
      status: 'enabled',
      contentCount: 12,
      heatValue: 86,
      version: 1,
      createTime: '2026-08-04 10:00:00',
      updateTime: '2026-08-04 10:00:00',
      auditLogs: [],
    };
    await page.route('**/api/admin/community/topics/list**', async (route) => {
      await route.fulfill({ json: { code: 200, data: { current: 1, size: 20, total: 1, records: [topic] } } });
    });
    await page.route('**/api/admin/community/topics/71', async (route) => {
      await route.fulfill({ json: { code: 200, data: topic } });
    });

    await page.goto(`${BASE_URL}/community/topics`);
    await expect(page.getByRole('img', { name: '露营交友封面' })).toBeVisible();
    await page.getByRole('button', { name: '详情' }).click();
    const dialog = page.getByRole('dialog', { name: '家园话题详情' });
    await expect(dialog.getByRole('img', { name: '话题封面预览' })).toBeVisible();
    await expect(dialog.locator('input[value="露营交友"]')).toBeVisible();
  });

  test('用户已删除内容不再提供重新公开等治理动作', async ({ page }) => {
    const deletedPost = {
      id: 81,
      postNo: 'P-0081',
      authorId: 8,
      authorNo: 'USR-000000000008',
      authorName: '测试用户',
      contentType: 'community_post',
      postType: 'community_post',
      content: '用户已经删除的动态',
      contentSummary: '用户已经删除的动态',
      imageUrls: [],
      likeCount: 0,
      commentCount: 0,
      reportCount: 0,
      status: 'deleted',
      version: 2,
      auditLogs: [],
    };
    await page.route('**/api/admin/community/posts/list**', async (route) => {
      await route.fulfill({ json: { code: 200, data: { current: 1, size: 20, total: 1, records: [deletedPost] } } });
    });
    await page.route('**/api/admin/community/posts/81', async (route) => {
      await route.fulfill({ json: { code: 200, data: deletedPost } });
    });

    await page.goto(`${BASE_URL}/community/content`);
    await page.getByRole('button', { name: '详情' }).click();
    const dialog = page.getByRole('dialog', { name: '内容详情' });
    await expect(dialog.getByRole('button', { name: '确认处理' })).toHaveCount(0);
    await expect(dialog.getByText('当前状态无可执行操作')).toBeVisible();
  });

  test('已结束举报只读展示且普通运营看不到高风险处罚', async ({ page }) => {
    const terminalReport = {
      id: 91,
      reportNo: 'RPT-0091',
      reporterId: 8,
      reporterNo: 'USR-000000000008',
      reporterName: '举报用户',
      targetType: 'post',
      targetId: 'P-0081',
      targetNo: 'P-0081',
      reasonCode: 'abuse',
      status: 'valid',
      version: 2,
      context: { available: true, content: '举报上下文' },
      auditLogs: [],
    };
    await page.route('**/api/admin/community/reports/list**', async (route) => {
      await route.fulfill({ json: { code: 200, data: { current: 1, size: 20, total: 1, records: [terminalReport] } } });
    });
    await page.route('**/api/admin/community/reports/91', async (route) => {
      await route.fulfill({ json: { code: 200, data: terminalReport } });
    });

    await page.goto(`${BASE_URL}/community/reports`);
    await page.getByRole('button', { name: '详情' }).click();
    const dialog = page.getByRole('dialog', { name: '举报详情' });
    await expect(dialog.getByRole('button', { name: '保存处理' })).toHaveCount(0);
    await expect(dialog.getByText('该举报已处理，处理结果仅供查看。')).toBeVisible();
    await expect(dialog.getByText('IP 封禁', { exact: true })).toHaveCount(0);
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
