import { expect, test } from '@playwright/test';

// 隔离 UI 合约测试：仅拦截浏览器请求，不写入共享数据库，不代替真实服务端验证。
test('待人工评论可通过，列表和待审统计刷新，机审历史保留', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const permissions = ['community:comment:list', 'community:comment:audit'];
  await page.addInitScript((perms) => {
    const token = 'isolated-comment-ui-fixture';
    localStorage.setItem('token', token);
    localStorage.setItem('auth', JSON.stringify({ state: { token, user: { nickname: '隔离审核测试', permissions: perms } }, version: 0 }));
  }, permissions);
  const comment = {
    id: 990001, commentNo: 'TEST-COMMENT-MANUAL', postId: 990002, postNo: 'TEST-POST',
    postType: 'moment', postContent: '隔离测试动态', authorId: 990003,
    authorName: '测试用户', content: '正常评论等待人工处理',
    status: 'pending', statusName: '待人工审核', machineResult: 'UNAVAILABLE', version: 0,
  };
  const actions: unknown[] = [];
  const unexpected: string[] = [];
  await page.route('**/api/admin/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api', '');
    let data: unknown;
    if (path === '/admin/permissions') data = permissions;
    else if (path === '/admin/routers') data = [];
    else if (path === '/admin/community/meta') data = {
      options: {
        commentStatus: [{ code: 'pending', label: '待人工审核' }, { code: 'published', label: '已公开' }],
        commentAction: [{ code: 'published', label: '通过并公开' }],
        machineResult: [{ code: 'UNAVAILABLE', label: '检测不可用' }],
        contentType: [{ code: 'moment', label: '动态' }],
      },
      copy: { comment_action_success: '处理成功', comment_detail_description: '查看最终状态和机审历史', comment_empty: '暂无评论', audit_log_empty: '暂无操作日志' },
    };
    else if (path === '/admin/community/comments/stats') data = { cards: [{ code: 'pending', label: '待人工审核总数', value: comment.status === 'pending' ? 1 : 0 }] };
    else if (path === '/admin/community/comments/list') data = { records: [comment], total: 1, current: 1, size: 20 };
    else if (path === `/admin/community/comments/${comment.id}`) data = comment;
    else if (path === `/admin/community/comments/${comment.id}/status` && request.method() === 'PUT') {
      const body = request.postDataJSON();
      actions.push(body);
      expect(body).toMatchObject({ action: 'published', version: 0, notifyUser: true });
      comment.status = 'published';
      comment.statusName = '已公开';
      comment.version += 1;
      data = null;
    } else {
      unexpected.push(`${request.method()} ${path}`);
      return route.fulfill({ status: 501, json: { code: 501, msg: '隔离测试未声明的请求' } });
    }
    await route.fulfill({ json: { code: 200, data } });
  });
  await page.goto('/community/comment-audit');
  await expect.poll(() => pageErrors).toEqual([]);
  const row = page.getByRole('row').filter({ hasText: comment.commentNo });
  await expect(row).toContainText('待人工审核');
  await row.getByRole('button', { name: '详情' }).click();
  await expect(page.getByText('机审历史结论', { exact: true })).toBeVisible();
  await expect(page.getByText('检测不可用', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('pending-manual.png'), fullPage: true });
  await page.locator('select').filter({ has: page.locator('option[value="published"]', { hasText: '通过并公开' }) }).selectOption('published');
  await page.getByRole('button', { name: '确认处理', exact: true }).click();
  await expect(row).toContainText('已公开');
  await expect(page.getByText('待人工审核总数').locator('..')).toContainText('0');
  await row.getByRole('button', { name: '详情' }).click();
  await expect(page.getByText('检测不可用', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('approved-history-retained.png'), fullPage: true });
  expect(actions).toHaveLength(1);
  expect(unexpected).toEqual([]);
  expect(pageErrors).toEqual([]);
});
