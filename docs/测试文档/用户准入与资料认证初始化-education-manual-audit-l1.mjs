import fs from 'node:fs';
import path from 'node:path';

const API = process.env.API_URL;
const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MODE = process.argv[2];
const statePath = process.env.TEST_STATE_FILE
  || path.resolve('backend/tmp/education-manual-audit-state.json');

if (!API || !ADMIN_ACCOUNT || !ADMIN_PASSWORD) {
  throw new Error('API_URL、ADMIN_ACCOUNT、ADMIN_PASSWORD 必须由执行环境提供');
}
if (!['submit', 'approve'].includes(MODE)) {
  throw new Error('用法: node ...education-manual-audit-l1.mjs submit|approve');
}

async function http(method, requestPath, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Auth-Token'] = token;
  const response = await fetch(`${API}${requestPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok || json.code !== 200) {
    throw new Error(`${method} ${requestPath} 失败: HTTP ${response.status}, code=${json.code}, msg=${json.msg}`);
  }
  return json.data;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected=${expected}, actual=${actual}`);
  }
}

async function loginMiniapp(phone) {
  const login = await http('POST', '/miniapp/auth/phone-login', {
    phone,
    smsCode: '0000',
    agreeProtocol: true,
  });
  if (!login?.token || !login?.userId) throw new Error('小程序登录未返回 token/userId');
  return login;
}

async function loginAdmin() {
  const login = await http('POST', '/admin/login', {
    account: ADMIN_ACCOUNT,
    password: ADMIN_PASSWORD,
  });
  if (!login?.token) throw new Error('后台登录未返回 token');
  return login.token;
}

async function submit() {
  const phone = `19${String(Date.now()).slice(-9)}`;
  const mini = await loginMiniapp(phone);
  const realNameStatus = await http('POST', '/miniapp/verify/real-name', {
    realName: '流程测试',
    idCardNo: '11010519960101001X',
    singleCommitmentChecked: true,
  }, mini.token);
  if (!['PENDING', 'REVIEWING', 'APPROVED'].includes(realNameStatus.realNameStatus)) {
    throw new Error(`实名认证前置状态异常: ${realNameStatus.realNameStatus}`);
  }

  const educationStatus = await http('POST', '/miniapp/verify/education', {
    educationUserType: 'MAINLAND_GRADUATE',
    educationMethod: 'CHSI',
    schoolName: '浙江工业大学',
    educationLevel: 'BACHELOR',
    chsiCode: `CHSI${String(Date.now()).slice(-8)}`,
    educationAgreementChecked: true,
  }, mini.token);
  assertEqual(educationStatus.educationStatus, 'PENDING', '小程序提交后学历状态');

  const adminToken = await loginAdmin();
  const page = await http('GET', `/admin/verify/education/list?page=1&size=20&userId=${mini.userId}`, undefined, adminToken);
  const records = page?.records || [];
  assertEqual(records.length, 1, '本次用户学历审核记录数');
  const record = records[0];
  assertEqual(record.status, 'PENDING', '后台列表学历状态');
  assertEqual(record.auditSource, 'MANUAL', '后台列表审核来源');

  const detail = await http('GET', `/admin/verify/education/${record.id}`, undefined, adminToken);
  assertEqual(detail.status, 'PENDING', '后台详情学历状态');
  assertEqual(detail.auditSource, 'MANUAL', '后台详情审核来源');
  if (!detail.historyPage?.records?.length) throw new Error('后台详情缺少提交审核历史');

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ phone, userId: mini.userId, recordId: record.id }, null, 2));
  console.log(JSON.stringify({ phase: 'submit', userId: mini.userId, recordId: record.id, status: record.status, auditSource: record.auditSource }));
}

async function approve() {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const mini = await loginMiniapp(state.phone);
  const adminToken = await loginAdmin();

  let detail = await http('GET', `/admin/verify/education/${state.recordId}`, undefined, adminToken);
  if (detail.status === 'PENDING' || detail.status === 'REVIEWING') {
    await http('POST', `/admin/verify/education/${state.recordId}/audit`, { action: 'APPROVE' }, adminToken);
    detail = await http('GET', `/admin/verify/education/${state.recordId}`, undefined, adminToken);
  }
  assertEqual(detail.status, 'APPROVED', '后台人工审核后详情状态');
  assertEqual(detail.auditSource, 'MANUAL', '后台人工审核后来源');
  if ((detail.historyPage?.records || []).length < 2) throw new Error('后台详情缺少人工审核历史');

  const status = await http('GET', '/miniapp/verify/status', undefined, mini.token);
  assertEqual(status.educationStatus, 'APPROVED', '小程序审核后认证状态');
  const education = await http('GET', '/miniapp/verify/education', undefined, mini.token);
  assertEqual(education.auditStatus, 'APPROVED', '小程序学历详情审核状态');

  console.log(JSON.stringify({ phase: 'approve', userId: state.userId, recordId: state.recordId, status: detail.status, auditSource: detail.auditSource }));
}

await (MODE === 'submit' ? submit() : approve());
