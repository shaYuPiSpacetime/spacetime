import { test, expect } from '@playwright/test';
import { loginViaApi, authHeaders } from './helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:8080';

test.describe('RBAC 基础功能 E2E 测试', () => {
  let token: string;

  test.beforeEach(async ({ page }) => {
    const result = await loginViaApi(page);
    token = result.token;
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('L4-01 登录后侧边栏显示"系统管理"菜单分组', async ({ page }) => {
    // 验证侧边栏渲染了系统管理分组
    const sidebar = page.locator('nav, aside, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // 系统管理分组应可见
    await expect(page.getByText('系统管理')).toBeVisible({ timeout: 5000 });
  });

  test('L4-02 点击用户管理导航到 /system/user', async ({ page }) => {
    // 点击用户管理菜单
    await page.getByText('用户管理').first().click();
    await page.waitForURL('**/system/user**', { timeout: 5000 });

    // 验证页面标题或表格存在
    await expect(page.getByText('用户名')).toBeVisible({ timeout: 5000 });
  });

  test('L4-03 用户管理页：表格展示和数据加载', async ({ page }) => {
    await page.goto('/system/user');
    await page.waitForLoadState('networkidle');

    // 表格应该有行数据
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test('L4-04 角色管理页：表格展示', async ({ page }) => {
    await page.goto('/system/role');
    await page.waitForLoadState('networkidle');

    // 角色表格应有数据
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test('L4-05 菜单管理页：树形表格展示', async ({ page }) => {
    await page.goto('/system/menu');
    await page.waitForLoadState('networkidle');

    // 菜单树形表格应有数据（sidebar/header/breadcrumb 都会出现"系统管理"，用 table cell 定位）
    await expect(page.getByRole('cell', { name: '系统管理' })).toBeVisible({ timeout: 10000 });
  });

  test('L4-06 未登录访问管理页面应重定向到登录页', async ({ page }) => {
    // 清除 token
    await page.evaluate(() => localStorage.clear());
    await page.goto('/system/user');
    await page.waitForLoadState('networkidle');

    // 应重定向到登录页
    await expect(page.getByText('欢迎登录')).toBeVisible({ timeout: 5000 });
  });

  test('L4-07 创建用户流程（Dialog 交互）', async ({ page }) => {
    await page.goto('/system/user');
    await page.waitForLoadState('networkidle');

    // 点击新增按钮（按钮文本为"新增用户"）
    await page.getByRole('button', { name: '新增用户' }).click();

    // 自定义 Dialog 无 role="dialog" 属性，通过 placeholder 定位输入框验证 Dialog 已弹出
    const usernameInput = page.getByPlaceholder('请输入用户名');
    await expect(usernameInput).toBeVisible({ timeout: 3000 });

    // 填写表单
    await usernameInput.fill('test_e2e_user');

    // 取消关闭
    await page.getByRole('button', { name: '取消' }).click();
    await expect(usernameInput).not.toBeVisible({ timeout: 3000 });
  });

  test('L4-08 角色管理：分配菜单 Dialog', async ({ page }) => {
    await page.goto('/system/role');
    await page.waitForLoadState('networkidle');

    // 点击分配菜单按钮
    const assignBtn = page.getByRole('button', { name: /分配菜单/ }).first();
    await assignBtn.click();

    // 验证 Dialog 弹出（标题为"分配菜单权限"）
    await expect(page.getByText('分配菜单权限')).toBeVisible({ timeout: 3000 });

    // 取消关闭
    await page.getByRole('button', { name: '取消' }).first().click();
  });
});
