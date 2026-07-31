import { expect, test } from '@playwright/test';

const rulesResponse = (version: number, registerReward: number, tiers: Array<[number, number]>) => ({
  code: 200,
  msg: 'success',
  data: {
    contentCode: 'invite_rules',
    contentType: 'H5',
    title: '邀请规则',
    version: 'v2.0',
    enabled: true,
    url: 'https://admin.shikongxiehou.com/h5/invite-rules/index.html',
    businessRule: {
      version,
      rewardMode: 'ladder',
      publishedAt: '2026-07-29T18:00:00',
      events: [
        { eventType: 'register_reward', eventLabel: '完成注册', amount: registerReward },
      ],
      tiers: tiers.map(([threshold, amount]) => ({ threshold, amount })),
    },
  },
});

test.describe('邀请规则同域 H5', () => {
  test('按当前已发布规则动态展示奖励与阶梯', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route('**/api/miniapp/app/h5-content/invite_rules', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rulesResponse(6, 20, [[1, 50], [3, 100]])),
    }));

    await page.goto('/h5/invite-rules/index.html');

    await expect(page.getByRole('heading', { name: '活动规则说明' })).toBeVisible();
    await expect(page.getByText(/普通邀请完成注册奖励 20 千寻币/)).toBeVisible();
    await expect(page.getByText(/累计成功邀请 1 人额外奖励 50 千寻币/)).toBeVisible();
    await expect(page.getByText(/累计 3 人额外奖励 100 千寻币/)).toBeVisible();
  });

  test('规则版本变化后重新打开即展示最新金额', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    let response = rulesResponse(6, 20, [[1, 50], [3, 100]]);
    await page.route('**/api/miniapp/app/h5-content/invite_rules', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    }));

    await page.goto('/h5/invite-rules/index.html');
    await expect(page.getByText(/普通邀请完成注册奖励 20 千寻币/)).toBeVisible();

    response = rulesResponse(7, 30, [[2, 80], [5, 200]]);
    await page.reload();

    await expect(page.getByText(/普通邀请完成注册奖励 30 千寻币/)).toBeVisible();
    await expect(page.getByText(/累计成功邀请 2 人额外奖励 80 千寻币/)).toBeVisible();
    await expect(page.getByText(/累计 5 人额外奖励 200 千寻币/)).toBeVisible();
    await expect(page.getByText(/累计成功邀请 1 人额外奖励 50 千寻币/)).toHaveCount(0);
  });
});
