import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const permissions = [
  'message:record:list', 'message:record:export', 'message:sensitive-content:view',
  'message:config:view', 'message:config:edit', 'community:report:list',
  'community:report:handle', 'message:report-context:view',
];

async function bootstrap(page: Page) {
  await page.addInitScript((grantedPermissions: string[]) => {
    const token = 'prd03-admin-closure-token';
    localStorage.setItem('token', token);
    localStorage.setItem('auth', JSON.stringify({
      state: { token, user: { nickname: 'PRD-03 验收员', permissions: grantedPermissions } },
      version: 0,
    }));
  }, permissions);
  await page.route('**/api/admin/permissions', route => route.fulfill({ json: { code: 200, data: permissions } }));
  await page.route('**/api/admin/routers', route => route.fulfill({ json: { code: 200, data: [] } }));
}

test.beforeEach(async ({ page }) => bootstrap(page));

test('消息记录统计固定口径、筛选导出复用已提交条件且详情分级展示', async ({ page }) => {
  let statsCalls = 0;
  let exported: Record<string, unknown> | undefined;
  let listed: Record<string, string> | undefined;
  await page.route('**/api/admin/message/records/stats', route => {
    statsCalls += 1;
    return route.fulfill({ json: { code: 200, data: {
      todayPrivateMessageCount: 12, waitingWhisperCount: 3, systemMessageCount: 8, caseLinkedCount: 2,
    } } });
  });
  await page.route('**/api/admin/message/records/export', async route => {
    exported = route.request().postDataJSON();
    await route.fulfill({ json: { code: 200, data: { message: '导出任务已创建' } } });
  });
  await page.route('**/api/admin/message/records/MSG-001/content-view', route => route.fulfill({ json: {
    code: 200, data: { accessNo: 'ACC-001', targetType: 'private_message', targetNo: 'MSG-001', items: [
      { role: 'message', messageNo: 'MSG-001', messageType: 'text', content: '完整私信正文' },
    ] },
  } }));
  await page.route('**/api/admin/message/records/WSP-001/content-view', route => route.fulfill({ json: {
    code: 200, data: { accessNo: 'ACC-002', targetType: 'whisper_message', targetNo: 'WSP-001', items: [
      { role: 'request', messageNo: 'WSP-001', messageType: 'whisper', content: '完整悄悄话正文' },
    ] },
  } }));
  await page.route('**/api/admin/message/records/MSG-001', route => route.fulfill({ json: { code: 200, data: {
    recordNo: 'MSG-001', recordType: 'private_message', userId: 100281, userNickname: '张三',
    peerUserId: 100392, peerNickname: '李四', messageType: 'text', status: 'sent',
    createdTime: '2026-08-13 10:20:00', sensitiveContent: true, contentAvailable: true,
  } } }));
  await page.route('**/api/admin/message/records/SYS-001', route => route.fulfill({ json: { code: 200, data: {
    recordNo: 'SYS-001', recordType: 'system_message', userId: 100281, userNickname: '张三',
    messageType: 'system', status: 'unread', createdTime: '2026-08-13 09:50:00',
    sensitiveContent: false, title: '治理结果', content: '举报处理结果已送达', contentFormat: 'plain_text',
    actionText: '查看详情',
  } } }));
  await page.route('**/api/admin/message/records/WSP-001', route => route.fulfill({ json: { code: 200, data: {
    recordNo: 'WSP-001', recordType: 'whisper_message', userId: 100281, userNickname: '张三',
    peerUserId: 100392, peerNickname: '李四', messageType: 'whisper', status: 'sent',
    createdTime: '2026-08-13 09:40:00', sensitiveContent: true, contentAvailable: true,
  } } }));
  await page.route('**/api/admin/message/records/AST-001', route => route.fulfill({ json: { code: 200, data: {
    recordNo: 'AST-001', recordType: 'assistant_message', userId: 100281, userNickname: '张三',
    messageType: 'assistant', systemCategory: 'assistant', status: 'unread', createdTime: '2026-08-13 09:30:00',
    sensitiveContent: false, title: '官方助手', content: '官方助手明文内容', contentFormat: 'plain_text',
    actionText: '查看详情',
  } } }));
  await page.route('**/api/admin/message/records**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/stats') || url.pathname.endsWith('/export') || url.pathname.endsWith('/content-view') || url.pathname.endsWith('/MSG-001') || url.pathname.endsWith('/SYS-001') || url.pathname.endsWith('/WSP-001') || url.pathname.endsWith('/AST-001')) return route.fallback();
    listed = Object.fromEntries(url.searchParams.entries());
    return route.fulfill({ json: { code: 200, data: { current: 1, size: 20, total: 4, records: [
      { recordNo: 'MSG-001', recordType: 'private_message', userId: 100281, userNickname: '张三', peerUserId: 100392, peerNickname: '李四', messageType: 'text', status: 'sent', createdTime: '2026-08-13 10:20:00' },
      { recordNo: 'SYS-001', recordType: 'system_message', userId: 100281, userNickname: '张三', messageType: 'system', status: 'unread', createdTime: '2026-08-13 09:50:00' },
      { recordNo: 'WSP-001', recordType: 'whisper_message', userId: 100281, userNickname: '张三', peerUserId: 100392, peerNickname: '李四', messageType: 'whisper', status: 'sent', createdTime: '2026-08-13 09:40:00' },
      { recordNo: 'AST-001', recordType: 'assistant_message', userId: 100281, userNickname: '张三', messageType: 'assistant', systemCategory: 'assistant', status: 'unread', createdTime: '2026-08-13 09:30:00' },
    ] } } });
  });

  await page.goto(`${BASE_URL}/operation/message-records`);
  await expect(page.getByText('今日私信')).toBeVisible();
  await expect(page.getByText('12')).toBeVisible();
  const initialStatsCalls = statsCalls;
  await page.getByLabel('开始日期').fill('2026-08-01');
  await page.getByLabel('结束日期').fill('2026-08-13');
  await page.getByLabel('用户/编号搜索').fill('张三');
  await expect(page.getByRole('button', { name: '查询' })).toHaveCount(0);
  await expect.poll(() => listed).toMatchObject({
    keyword: '张三', startTime: '2026-08-01 00:00:00', endTime: '2026-08-13 23:59:59', page: '1',
  });
  await expect(page.getByRole('cell', { name: '文本' })).toBeVisible();
  await page.getByRole('button', { name: '导出记录' }).click();
  await expect.poll(() => exported).toMatchObject({
    keyword: '张三', startTime: '2026-08-01 00:00:00', endTime: '2026-08-13 23:59:59', confirmNoContent: true,
  });
  expect(statsCalls).toBe(initialStatsCalls);

  await page.getByRole('button', { name: '详情' }).first().click();
  await page.getByRole('button', { name: '查看高敏正文' }).click();
  const sensitiveReasonInput = page.getByPlaceholder(/客诉核查/);
  await sensitiveReasonInput.pressSequentially('核查聊天举报完整证据');
  await expect(sensitiveReasonInput).toBeFocused();
  await expect(sensitiveReasonInput).toHaveValue('核查聊天举报完整证据');
  await page.getByRole('button', { name: '确认并查看' }).click();
  await expect(page.getByText('完整私信正文')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '详情' }).nth(1).click();
  await expect(page.getByText('举报处理结果已送达')).toBeVisible();
  await expect(page.getByText('查看详情')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '详情' }).nth(2).click();
  await page.getByRole('button', { name: '查看高敏正文' }).click();
  await page.getByPlaceholder(/客诉核查/).fill('核查悄悄话举报完整证据');
  await page.getByRole('button', { name: '确认并查看' }).click();
  await expect(page.getByText('完整悄悄话正文')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '详情' }).nth(3).click();
  await expect(page.getByText('官方助手明文内容')).toBeVisible();
  await expect(page.getByText('查看详情')).toHaveCount(0);
  await page.screenshot({ path: '../docs/测试文档/截图/PRD03后台补漏/消息通知记录查询.png', fullPage: true });
});

test('社交权限配置只展示一期能力并通过版本接口保存', async ({ page }) => {
  let published: Record<string, unknown> | undefined;
  const config = {
    versionNo: 'MSG-CFG-003', status: 'published', femaleProtectionEnabled: true,
    femaleProtectionDays: 3, whisperExpireDays: 7, whisperCooldownDays: 7,
    ordinaryMessageRetainDays: 180, systemMessageVisibleDays: 730,
    reportEvidenceRetainDays: 1095, severeEvidenceRetainDays: 1825, sensitiveAuditRetainDays: 1095,
    globalSend: { controlKey: 'global_send_enabled', enabled: true, version: 3 },
  };
  await page.route('**/api/admin/message/config/logs**', route => route.fulfill({ json: { code: 200, data: { records: [], total: 0 } } }));
  await page.route('**/api/admin/message/config/versions', async route => {
    published = route.request().postDataJSON();
    await route.fulfill({ json: { code: 200, data: { ...config, ...published, versionNo: 'MSG-CFG-004' } } });
  });
  await page.route('**/api/admin/message/config', route => route.fulfill({ json: { code: 200, data: config } }));

  await page.goto(`${BASE_URL}/mobile-config/message-social`);
  await expect(page.getByRole('heading', { name: '社交权限与消息配置' })).toBeVisible();
  await expect(page.getByText('用户通知设置页')).toHaveCount(0);
  await expect(page.getByText('后台通知偏好中心')).toHaveCount(0);
  await page.getByLabel('女性保护期天数').fill('4');
  await page.getByRole('button', { name: '保存当前配置' }).click();
  await page.getByPlaceholder('填写5-100字变更原因').fill('按一期上线配置调整保护期');
  await page.getByRole('button', { name: '确认保存' }).click();
  await expect.poll(() => published).toMatchObject({ expectedVersion: 'MSG-CFG-003', femaleProtectionDays: 4 });
  await expect(page.getByText('当前配置版本')).toHaveCount(0);
  await expect(page.getByText('MSG-CFG-004')).toHaveCount(0);
  await page.screenshot({ path: '../docs/测试文档/截图/PRD03后台补漏/社交权限与消息配置.png', fullPage: true });
});

test('现有举报处理兼容悄悄话冻结证据和受控正文查看', async ({ page }) => {
  const meta = { options: {
    reportStatus: [{ code: 'pending', label: '待处理' }],
    reportResult: [{ code: 'invalid', label: '举报不成立' }],
    reportTargetType: [{ code: 'whisper', label: '悄悄话' }],
    reportReason: [{ code: 'harassment', label: '骚扰' }],
    punishAction: [{ code: 'none', label: '不处罚' }],
    yesNo: [{ code: 'true', label: '是' }, { code: 'false', label: '否' }],
    mutePeriod: [], ipBlockPeriod: [], writeScope: [],
  }, copy: {} };
  const report = {
    id: 91, reportNo: 'RPT-WSP-001', targetType: 'whisper', targetNo: 'WSP-001',
    reporterId: 100281, reporterNo: 'U100281', reporterName: '举报用户',
    targetUserId: 100392, targetUserNo: 'U100392', targetUserName: '被举报用户',
    reasonCode: 'harassment', status: 'pending', version: 1,
    context: { available: true, summary: '悄悄话举报上下文' }, auditLogs: [],
  };
  await page.route('**/api/admin/community/meta', route => route.fulfill({ json: { code: 200, data: meta } }));
  await page.route('**/api/admin/community/reports/stats', route => route.fulfill({ json: { code: 200, data: { cards: [] } } }));
  await page.route('**/api/admin/community/reports/list**', route => route.fulfill({ json: { code: 200, data: { current: 1, size: 20, total: 1, records: [report] } } }));
  await page.route('**/api/admin/community/reports/91', route => route.fulfill({ json: { code: 200, data: report } }));
  await page.route('**/api/admin/community/reports/RPT-WSP-001/evidence/EVD-001/content-view', route => route.fulfill({ json: { code: 200, data: {
    accessNo: 'ACC-EVD-001', evidenceNo: 'EVD-001', messageType: 'whisper', content: '冻结的悄悄话原文', eventTime: '2026-08-13 09:00:00',
  } } }));
  await page.route('**/api/admin/community/reports/RPT-WSP-001/evidence', route => route.fulfill({ json: { code: 200, data: [{
    evidenceNo: 'EVD-001', targetType: 'whisper', sourceBizNo: 'WSP-001', messageType: 'whisper',
    conversationNo: 'CONV-001', senderMask: 'U100***', receiverMask: 'U100***',
    snapshotAt: '2026-08-13 09:01:00', retainUntil: '2029-08-13 09:01:00', contentAvailable: true,
  }] } }));

  await page.goto(`${BASE_URL}/community/reports`);
  await page.getByRole('button', { name: '详情' }).click();
  await expect(page.getByText('聊天举报冻结证据')).toBeVisible();
  await expect(page.getByText('EVD-001')).toBeVisible();
  await page.getByRole('button', { name: '查看冻结正文' }).click();
  await page.getByPlaceholder('请填写案件核查的具体原因').fill('核查悄悄话骚扰举报证据');
  await page.getByRole('button', { name: '确认并查看' }).click();
  await expect(page.getByText('冻结的悄悄话原文')).toBeVisible();
  await expect(page.getByText('ACC-EVD-001')).toBeVisible();
  await page.screenshot({ path: '../docs/测试文档/截图/PRD03后台补漏/悄悄话举报证据.png', fullPage: true });
});
