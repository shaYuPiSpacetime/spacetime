import type { Page } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:8080';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * 登录并注入 token 到浏览器 localStorage
 * 返回 token 和 permissions
 */
export async function loginViaApi(
  page: Page,
  account = 'peter',
  password = '000000'
): Promise<{ token: string; permissions: string[] }> {
  const resp = await page.request.post(`${API_URL}/admin/login`, {
    data: { account, password },
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await resp.json();
  const token = body.data?.token;
  const permissions = body.data?.permissions || [];

  // 注入 token 到 localStorage
  // token 键：axios 拦截器读取
  // auth 键：Zustand persist 水合恢复（格式: { state: { token, user }, version: 0 }）
  const authState = {
    state: {
      token,
      user: { nickname: body.data?.nickname, avatar: body.data?.avatar, permissions },
    },
    version: 0,
  };

  await page.goto(`${BASE_URL}/`);
  await page.evaluate(
    ({ t, a }) => {
      localStorage.setItem('token', t);
      localStorage.setItem('auth', JSON.stringify(a));
    },
    { t: token, a: authState }
  );

  return { token, permissions };
}

/**
 * 带 Token 的 API 请求帮助函数
 */
export function authHeaders(token: string) {
  return { 'X-Auth-Token': token, 'Content-Type': 'application/json' };
}
