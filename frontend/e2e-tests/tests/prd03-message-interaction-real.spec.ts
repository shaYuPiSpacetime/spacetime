import { expect, test, type Locator } from '@playwright/test';
import { loginViaApi } from './helpers/auth';

const DEMO_USER_KEYWORD = process.env.PRD03_DEMO_USER_KEYWORD || '小红';
const SECOND_DEMO_USER_KEYWORD = process.env.PRD03_SECOND_DEMO_USER_KEYWORD || '小刚';

async function expectFiveRows(panel: Locator) {
  await expect(panel.getByText('5条/页')).toBeVisible();
  const rows = panel.locator(':scope > div').nth(1).locator(':scope > div');
  await expect(rows).toHaveCount(5);
}

test('消息互动按真实数据展示四个固定分页列表并受控查看高敏正文', async ({ page }) => {
  test.skip(
    !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD,
    '需要通过安全环境变量提供真实管理员账号',
  );

  const { permissions } = await loginViaApi(page);
  expect(permissions).toEqual(expect.arrayContaining([
    'message:summary:view',
    'message:conversation:list',
    'message:whisper:list',
    'message:system:list',
    'community:report:list',
    'message:sensitive-content:view',
  ]));

  await page.goto('/customers');
  await page.getByPlaceholder('姓名/昵称/手机号/身份证/标签').fill(DEMO_USER_KEYWORD);
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByText(DEMO_USER_KEYWORD).first()).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: '心动 & 消息' }).first().click();
  const supplementDialog = page.getByTestId('module-supplement-dialog-content');
  await expect(supplementDialog).toBeVisible();
  await supplementDialog.getByRole('button', { name: '消息互动' }).click();

  await expect(supplementDialog.getByText('消息未读数')).toBeVisible();
  await expect(supplementDialog.getByText('系统/助手未读')).toBeVisible();
  await expect(supplementDialog.getByText('高敏查看审计')).toHaveCount(0);

  const privatePanel = page.getByTestId('message-panel-私信消息');
  const whisperPanel = page.getByTestId('message-panel-悄悄话');
  const platformPanel = page.getByTestId('message-panel-系统/助手消息');
  const reportPanel = page.getByTestId('message-panel-举报');

  await expect(privatePanel).toContainText('MSG-DEMO-PRD03');
  await expect(whisperPanel).toContainText('WSP-DEMO-PRD03');
  await expect(privatePanel).toContainText(/（U\d+）/);
  await expect(whisperPanel).toContainText(/（U\d+）/);
  await expect(privatePanel).not.toContainText('USR-********');
  await expect(whisperPanel).not.toContainText('USR-********');
  await expect(platformPanel).toContainText(/NTF-DEMO-PRD03|AST-DEMO-PRD03/);
  await expect(reportPanel).toContainText('RPT-DEMO-PRD03');
  await expectFiveRows(privatePanel);
  await expectFiveRows(whisperPanel);
  await expectFiveRows(platformPanel);
  await expectFiveRows(reportPanel);

  await page.screenshot({
    path: '../docs/测试文档/证据/消息互动后台真实数据.png',
    fullPage: true,
  });

  await expect(privatePanel).not.toContainText('你好，很高兴认识你。');
  await privatePanel.getByRole('button', { name: '查看高敏' }).first().click();
  const sensitiveDialog = page.getByRole('dialog', { name: '查看高敏消息正文' });
  await expect(sensitiveDialog).toBeVisible();
  await sensitiveDialog.getByPlaceholder('请填写客诉核查、风控复核等具体原因').fill('自动化测试：核对高敏查看权限与审计闭环');
  await page.screenshot({
    path: '../docs/测试文档/证据/消息互动查看高敏二次确认.png',
    fullPage: true,
  });
  await sensitiveDialog.getByRole('button', { name: '确认并查看' }).click();
  await expect(sensitiveDialog.getByText(/审计编号：/)).toBeVisible();
  await expect(sensitiveDialog.getByText(/私信正文/).first()).toBeVisible();
  await sensitiveDialog.getByRole('button', { name: '关闭', exact: true }).click();

  await expect(sensitiveDialog).toBeHidden();
  await expect(supplementDialog).toBeVisible();
  await expect(page.getByTestId('message-panel-私信消息')).toBeVisible();

  await reportPanel.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: '../docs/测试文档/证据/消息互动后台真实数据-下半区.png',
    fullPage: true,
  });
});

test('快速切换用户时旧消息请求不得覆盖当前用户', async ({ page }) => {
  test.setTimeout(45000);
  test.skip(
    !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD,
    '需要通过安全环境变量提供真实管理员账号',
  );

  await loginViaApi(page);
  let markFirstRequestStarted: (() => void) | undefined;
  const firstRequestStarted = new Promise<void>((resolve) => {
    markFirstRequestStarted = resolve;
  });
  let releaseFirstRequest: (() => void) | undefined;
  const firstRequestRelease = new Promise<void>((resolve) => {
    releaseFirstRequest = resolve;
  });
  let markFirstRequestFulfilled: (() => void) | undefined;
  const firstRequestFulfilled = new Promise<void>((resolve) => {
    markFirstRequestFulfilled = resolve;
  });
  let markSecondRecord: ((record: { messageNo: string; direction: string }) => void) | undefined;
  const secondRecord = new Promise<{ messageNo: string; direction: string }>((resolve) => {
    markSecondRecord = resolve;
  });
  let firstUserId: string | undefined;

  await page.route('**/api/admin/users/app/*/messages/private-messages*', async (route) => {
    const userId = new URL(route.request().url()).pathname
      .match(/\/admin\/users\/app\/(\d+)\/messages\/private-messages/)?.[1];

    if (!firstUserId) {
      firstUserId = userId;
      markFirstRequestStarted?.();
      const response = await route.fetch();
      await firstRequestRelease;
      await route.fulfill({ response });
      markFirstRequestFulfilled?.();
      return;
    }

    const response = await route.fetch();
    if (userId && userId !== firstUserId) {
      const body = await response.json();
      const record = body.data?.records?.[0];
      if (record?.messageNo && record?.direction) {
        markSecondRecord?.({ messageNo: record.messageNo, direction: record.direction });
      }
    }
    await route.fulfill({ response });
  });

  await page.goto('/customers');
  const searchInput = page.getByPlaceholder('姓名/昵称/手机号/身份证/标签');
  await searchInput.fill(DEMO_USER_KEYWORD);
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByText(DEMO_USER_KEYWORD).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '心动 & 消息' }).first().click();
  let supplementDialog = page.getByTestId('module-supplement-dialog-content');
  await supplementDialog.getByRole('button', { name: '消息互动' }).click();
  await firstRequestStarted;
  await supplementDialog.locator('xpath=ancestor::div[@role="dialog"][1]')
    .getByRole('button', { name: '关闭弹窗' }).click();

  await searchInput.fill(SECOND_DEMO_USER_KEYWORD);
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByText(SECOND_DEMO_USER_KEYWORD).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '心动 & 消息' }).first().click();
  supplementDialog = page.getByTestId('module-supplement-dialog-content');
  await supplementDialog.getByRole('button', { name: '消息互动' }).click();

  const privatePanel = page.getByTestId('message-panel-私信消息');
  const currentRecord = await secondRecord;
  const expectedDirection = currentRecord.direction === 'received' ? '当前用户收到' : '当前用户发出';
  const oppositeDirection = currentRecord.direction === 'received' ? '当前用户发出' : '当前用户收到';
  const newestMessage = privatePanel.getByText(currentRecord.messageNo)
    .locator('xpath=ancestor::div[contains(@class,"grid")][1]');
  await expect(newestMessage).toContainText(expectedDirection);

  releaseFirstRequest?.();
  await firstRequestFulfilled;
  await expect(newestMessage).toContainText(expectedDirection);
  await expect(newestMessage).not.toContainText(oppositeDirection);
});

test('无高敏权限时眼睛禁用并提示无查看权限', async ({ page }) => {
  test.skip(
    !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD,
    '需要通过安全环境变量提供真实管理员账号',
  );

  await loginViaApi(page);
  await page.evaluate(() => {
    const raw = localStorage.getItem('auth');
    if (!raw) return;
    const auth = JSON.parse(raw);
    auth.state.user.permissions = (auth.state.user.permissions || [])
      .filter((permission: string) => permission !== 'message:sensitive-content:view');
    localStorage.setItem('auth', JSON.stringify(auth));
  });
  await page.route('**/api/admin/permissions', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data = (body.data || [])
      .filter((permission: string) => permission !== 'message:sensitive-content:view');
    await route.fulfill({
      status: response.status(),
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.goto('/customers');
  await page.getByPlaceholder('姓名/昵称/手机号/身份证/标签').fill(DEMO_USER_KEYWORD);
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByText(DEMO_USER_KEYWORD).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '心动 & 消息' }).first().click();
  const supplementDialog = page.getByTestId('module-supplement-dialog-content');
  await supplementDialog.getByRole('button', { name: '消息互动' }).click();

  const privatePanel = page.getByTestId('message-panel-私信消息');
  const disabledEye = privatePanel.getByRole('button', { name: '无查看权限' }).first();
  await expect(disabledEye).toBeDisabled();
  await expect(disabledEye.locator('xpath=..')).toHaveAttribute('title', '无查看权限');
  await expect(supplementDialog.getByText('高敏查看审计')).toHaveCount(0);
});
