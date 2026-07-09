import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.cwd();
const requireFromFrontend = createRequire(join(root, 'frontend/package.json'));
const { chromium } = requireFromFrontend('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://127.0.0.1:8080';
const ACCOUNT = process.env.ADMIN_ACCOUNT || 'peter';
const PASSWORD = process.env.ADMIN_PASSWORD || '000000';
const TODAY = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

const results = [];

function record(name, status, detail = '') {
  results.push({ name, status, detail });
  const icon = status === 'PASS' ? '✓' : '✗';
  console.log(`${icon} ${name}${detail ? ` - ${detail}` : ''}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function login() {
  const response = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: ACCOUNT, password: PASSWORD }),
  });
  assert(response.ok, `登录 HTTP 状态异常: ${response.status}`);
  const body = await response.json();
  const token = body.data?.token;
  assert(token, '登录响应缺少 token');
  return {
    token,
    user: {
      nickname: body.data?.nickname || ACCOUNT,
      avatar: body.data?.avatar || '',
      permissions: body.data?.permissions || ['*:*:*'],
    },
  };
}

async function apiGet(token, path, params = {}) {
  const url = new URL(path, API_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  const response = await fetch(url, { headers: { 'X-Auth-Token': token } });
  assert(response.ok, `${path} HTTP 状态异常: ${response.status}`);
  const body = await response.json();
  assert(body.code === 200, `${path} 业务码异常: ${body.code} ${body.msg || ''}`);
  return body.data;
}

async function runCase(name, fn) {
  try {
    await fn();
    record(name, 'PASS');
  } catch (error) {
    record(name, 'FAIL', error.message);
  }
}

function expectRecords(page, label) {
  assert(page && Array.isArray(page.records), `${label} 缺少 records`);
  return page.records;
}

async function runApiRegression(auth) {
  await runCase('订单列表：按订单号精确查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/orders/list', {
      page: 1,
      size: 10,
      orderNo: 'ADM04-ORDER-COIN-TODAY-001',
    });
    const records = expectRecords(page, '订单号查询');
    assert(page.total === 1, `期望 1 条，实际 ${page.total}`);
    assert(records[0]?.orderNo === 'ADM04-ORDER-COIN-TODAY-001', '返回订单号不匹配');
  });

  await runCase('订单列表：按用户 ID 查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/orders/list', {
      page: 1,
      size: 10,
      userId: 100281,
    });
    const records = expectRecords(page, '订单用户查询');
    assert(page.total >= 2, `期望至少 2 条，实际 ${page.total}`);
    assert(records.every((item) => Number(item.userId) === 100281), '存在非 100281 用户订单');
  });

  await runCase('订单列表：按订单类型查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/orders/list', {
      page: 1,
      size: 10,
      orderType: 'coin',
    });
    const records = expectRecords(page, '订单类型查询');
    assert(records.length > 0, '千寻币订单查询为空');
    assert(records.every((item) => item.orderType === 'coin'), '存在非 coin 订单');
  });

  await runCase('订单列表：按订单状态查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/orders/list', {
      page: 1,
      size: 10,
      orderStatus: 'refunded',
    });
    const records = expectRecords(page, '订单状态查询');
    assert(records.length > 0, '已退款订单查询为空');
    assert(records.every((item) => item.orderStatus === 'refunded'), '存在非 refunded 订单');
  });

  await runCase('订单列表：按支付日期查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/orders/list', {
      page: 1,
      size: 10,
      startTime: `${TODAY}T00:00:00`,
      endTime: `${TODAY}T23:59:59`,
    });
    assert(page.total >= 4, `期望当日至少 4 条订单，实际 ${page.total}`);
  });

  await runCase('资产流水：assetType=vip 返回空分页', async () => {
    const page = await apiGet(auth.token, '/admin/finance/flows/list', {
      page: 1,
      size: 10,
      assetType: 'vip',
    });
    const records = expectRecords(page, '会员权益流水查询');
    assert(page.total === 0, `期望 0 条，实际 ${page.total}`);
    assert(records.length === 0, `期望 records 为空，实际 ${records.length}`);
  });

  await runCase('资产流水：assetType=coin 返回千寻币流水', async () => {
    const page = await apiGet(auth.token, '/admin/finance/flows/list', {
      page: 1,
      size: 10,
      assetType: 'coin',
    });
    const records = expectRecords(page, '千寻币流水查询');
    assert(page.total > 0, '千寻币流水查询为空');
    assert(records.every((item) => item.assetType === 'coin'), '存在非 coin 资产类型');
  });

  await runCase('资产流水：按用户 ID 查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/flows/list', {
      page: 1,
      size: 10,
      userId: 100281,
    });
    const records = expectRecords(page, '流水用户查询');
    assert(records.length > 0, '100281 用户流水为空');
    assert(records.every((item) => Number(item.userId) === 100281), '存在非 100281 用户流水');
  });

  await runCase('资产流水：按流水类型查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/flows/list', {
      page: 1,
      size: 10,
      flowType: 'refund',
    });
    const records = expectRecords(page, '流水类型查询');
    assert(records.length > 0, '退款退回流水为空');
    assert(records.every((item) => item.flowType === 'refund'), '存在非 refund 流水');
  });

  await runCase('资产流水：按业务场景查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/flows/list', {
      page: 1,
      size: 10,
      bizScene: '订单退款',
    });
    const records = expectRecords(page, '流水业务场景查询');
    assert(records.length > 0, '订单退款流水为空');
    assert(records.every((item) => item.bizScene === '订单退款'), '存在非订单退款流水');
  });

  await runCase('退款记录：按订单号查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/refunds/list', {
      page: 1,
      size: 10,
      orderNo: 'ADM04-ORDER-COIN-TODAY-001',
    });
    const records = expectRecords(page, '退款订单号查询');
    assert(page.total === 1, `期望 1 条，实际 ${page.total}`);
    assert(records[0]?.orderNo === 'ADM04-ORDER-COIN-TODAY-001', '退款记录订单号不匹配');
  });

  await runCase('退款记录：按用户 ID 查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/refunds/list', {
      page: 1,
      size: 10,
      userId: 100281,
    });
    const records = expectRecords(page, '退款用户查询');
    assert(records.length > 0, '100281 用户退款为空');
    assert(records.every((item) => Number(item.userId) === 100281), '存在非 100281 用户退款');
  });

  await runCase('退款记录：按退款日期查询', async () => {
    const page = await apiGet(auth.token, '/admin/finance/refunds/list', {
      page: 1,
      size: 10,
      startTime: `${TODAY}T00:00:00`,
      endTime: `${TODAY}T23:59:59`,
    });
    assert(page.total >= 1, `期望当日至少 1 条退款，实际 ${page.total}`);
  });

  await runCase('轻量对账：按日期查询', async () => {
    const data = await apiGet(auth.token, '/admin/finance/reconcile/daily', { date: TODAY });
    assert(data.date === TODAY, `返回日期不匹配: ${data.date}`);
    assert(Number(data.orderAmount) > 0, `订单金额异常: ${data.orderAmount}`);
    assert(Number(data.refundAmount) > 0, `退款金额异常: ${data.refundAmount}`);
  });
}

async function runUiRegression(auth) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('auth', JSON.stringify({ state: { token, user }, version: 0 }));
  }, auth);

  try {
    await runCase('页面交互：资产类型选择会员权益发出 assetType=vip 并渲染空态', async () => {
      await page.goto(`${BASE_URL}/commercial/flows`, { waitUntil: 'networkidle' });
      await page.locator('.query-panel select').first().selectOption('vip');
      const responsePromise = page.waitForResponse((response) => (
        response.url().includes('/api/admin/finance/flows/list')
        && response.url().includes('assetType=vip')
      ));
      await page.getByRole('button', { name: '查询' }).click();
      const response = await responsePromise;
      const body = await response.json();
      assert(body.data?.total === 0, `会员权益流水应为空，实际 ${body.data?.total}`);
      await page.getByText('暂无后台返回数据').waitFor({ timeout: 5000 });
    });

    await runCase('页面交互：资产类型选择千寻币发出 assetType=coin 并渲染数据', async () => {
      await page.locator('.query-panel select').first().selectOption('coin');
      const responsePromise = page.waitForResponse((response) => (
        response.url().includes('/api/admin/finance/flows/list')
        && response.url().includes('assetType=coin')
      ));
      await page.getByRole('button', { name: '查询' }).click();
      const response = await responsePromise;
      const body = await response.json();
      assert(body.data?.total > 0, `千寻币流水应有数据，实际 ${body.data?.total}`);
      await page.locator('[data-render="asset-flows"] tr').first().waitFor({ timeout: 5000 });
    });

    await runCase('页面交互：订单页用户 ID 查询发出 userId=100281', async () => {
      await page.goto(`${BASE_URL}/commercial/orders`, { waitUntil: 'networkidle' });
      await page.locator('.query-panel input').nth(1).fill('100281');
      const responsePromise = page.waitForResponse((response) => (
        response.url().includes('/api/admin/finance/orders/list')
        && response.url().includes('userId=100281')
      ));
      await page.getByRole('button', { name: '查询' }).click();
      const response = await responsePromise;
      const body = await response.json();
      assert(body.data?.total >= 2, `用户 100281 订单应至少 2 条，实际 ${body.data?.total}`);
    });
  } finally {
    await browser.close();
  }
}

const auth = await login();
await runApiRegression(auth);
await runUiRegression(auth);

const failed = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
if (failed.length > 0) {
  process.exitCode = 1;
}
