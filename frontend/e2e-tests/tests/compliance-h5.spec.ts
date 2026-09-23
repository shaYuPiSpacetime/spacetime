import { expect, test } from '@playwright/test';

const detail = (contentBody: string) => ({
  code: 200,
  data: {
    contentCode: 'single_commitment',
    title: '单身承诺函',
    version: 'v1.2',
    effectiveTime: '2026-09-23 10:00:00',
    contentBody,
  },
});

test.describe('协议同域 H5', () => {
  test('展示已配置正文与版本，并清理危险 HTML', async ({ page }) => {
    await page.route('**/api/miniapp/content/compliance/single_commitment', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detail('<h2>承诺内容</h2><p onclick="alert(1)">本人目前单身。</p><script>window.pwned=1</script>')),
    }));

    await page.goto('/h5/compliance/index.html?code=single_commitment');

    await expect(page.getByRole('heading', { name: '单身承诺函' })).toBeVisible();
    await expect(page.getByText('v1.2')).toBeVisible();
    await expect(page.getByRole('heading', { name: '承诺内容' })).toBeVisible();
    await expect(page.getByText('本人目前单身。')).toBeVisible();
    expect(await page.evaluate(() => (window as Window & { pwned?: number }).pwned)).toBeUndefined();
    expect(await page.locator('#compliance-content [onclick]').count()).toBe(0);
  });

  test('占位正文和非法编码均不冒充已发布协议', async ({ page }) => {
    await page.route('**/api/miniapp/content/compliance/single_commitment', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detail('请配置单身承诺函正文或H5地址。')),
    }));

    await page.goto('/h5/compliance/index.html?code=single_commitment');
    await expect(page.getByText('当前内容尚未发布')).toBeVisible();
    await expect(page.getByText('请配置单身承诺函正文或H5地址。')).toHaveCount(0);

    await page.goto('/h5/compliance/index.html?code=arbitrary');
    await expect(page.getByText('内容类型无效')).toBeVisible();
  });
});
