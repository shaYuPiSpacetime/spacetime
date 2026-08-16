import { createHash, createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';

const DEFAULT_BASE_URL = 'https://admin.shikongxiehou.com';
const DEFAULT_ENV_FILE = 'deploy/scripts/prod.env';

function requiredText(value, label) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(`${label}不能为空`);
  return normalized;
}

function parsePlatformTime(value) {
  const normalized = requiredText(value, '消息时间');
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)
    ? `${normalized.replace(' ', 'T')}+08:00`
    : normalized;
  const milliseconds = Date.parse(iso);
  if (!Number.isFinite(milliseconds)) throw new Error(`消息时间格式无效：${normalized}`);
  return Math.floor(milliseconds / 1000);
}

export function stableUnsignedInt(namespace, ...values) {
  const digest = createHash('sha256')
    .update([namespace, ...values].join(':'))
    .digest();
  const value = digest.readUInt32BE(0);
  return value === 0 ? 1 : value;
}

export function generateTencentUserSig({
  sdkAppId,
  userId,
  secretKey,
  expireSeconds,
  issuedAtSeconds,
}) {
  const numericSdkAppId = Number(sdkAppId);
  const numericExpireSeconds = Number(expireSeconds);
  const numericIssuedAtSeconds = Number(issuedAtSeconds);
  const identifier = requiredText(userId, 'TIM 管理员账号');
  const key = requiredText(secretKey, 'TIM SecretKey');
  if (!Number.isInteger(numericSdkAppId) || numericSdkAppId <= 0) {
    throw new Error('TIM SDKAppID 必须为正整数');
  }
  if (!Number.isInteger(numericExpireSeconds) || numericExpireSeconds <= 0) {
    throw new Error('TIM UserSig 有效期必须为正整数');
  }
  if (!Number.isInteger(numericIssuedAtSeconds) || numericIssuedAtSeconds <= 0) {
    throw new Error('TIM UserSig 签发时间必须为正整数');
  }

  const signedContent = `TLS.identifier:${identifier}\n`
    + `TLS.sdkappid:${numericSdkAppId}\n`
    + `TLS.time:${numericIssuedAtSeconds}\n`
    + `TLS.expire:${numericExpireSeconds}\n`;
  const signature = createHmac('sha256', key).update(signedContent).digest('base64');
  const payload = JSON.stringify({
    'TLS.ver': '2.0',
    'TLS.identifier': identifier,
    'TLS.sdkappid': numericSdkAppId,
    'TLS.expire': numericExpireSeconds,
    'TLS.time': numericIssuedAtSeconds,
    'TLS.sig': signature,
  });
  return deflateSync(Buffer.from(payload, 'utf8'))
    .toString('base64')
    .replaceAll('+', '*')
    .replaceAll('/', '-')
    .replaceAll('=', '_');
}

export function selectDemoIncomingMessages(conversations) {
  if (!Array.isArray(conversations)) return [];
  return conversations.filter(item => {
    const message = item?.lastMessage;
    return typeof item?.conversationNo === 'string'
      && item.conversationNo.length > 0
      && typeof message?.messageNo === 'string'
      && message.messageNo.startsWith('DEMO-HOME-')
      && message.direction === 'incoming'
      && message.sendStatus === 'sent'
      && (message.messageType || 'text') === 'text'
      && typeof message.preview === 'string'
      && message.preview.trim().length > 0;
  });
}

export function buildImportPayload({
  messageNo,
  messageType = 'text',
  preview,
  messageTime,
  fromAccount,
  toAccount,
}) {
  const normalizedMessageNo = requiredText(messageNo, '平台消息编号');
  const content = requiredText(preview, '演示消息正文');
  const from = requiredText(fromAccount, '发送方 TIM 账号');
  const to = requiredText(toAccount, '接收方 TIM 账号');
  if (from === to) throw new Error('发送方与接收方 TIM 账号不能相同');
  const timestamp = parsePlatformTime(messageTime);
  return {
    SyncFromOldSystem: 2,
    From_Account: from,
    To_Account: to,
    MsgSeq: stableUnsignedInt('seq', normalizedMessageNo),
    MsgRandom: stableUnsignedInt('random', normalizedMessageNo),
    MsgTimeStamp: timestamp,
    MsgBody: [{
      MsgType: 'TIMTextElem',
      MsgContent: { Text: content },
    }],
    CloudCustomData: JSON.stringify({
      messageNo: normalizedMessageNo,
      messageType,
      protocolVersion: 1,
    }),
  };
}

function parseEnvFile(file) {
  const result = {};
  const source = readFileSync(file, 'utf8').replaceAll('\r', '');
  for (const line of source.split('\n')) {
    const normalized = line.trim();
    if (!normalized || normalized.startsWith('#')) continue;
    const separator = normalized.indexOf('=');
    if (separator <= 0) continue;
    const key = normalized.slice(0, separator).trim();
    let value = normalized.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function parseArguments(argv) {
  const options = {
    apply: false,
    useDevFixedToken: false,
    envFile: DEFAULT_ENV_FILE,
    baseUrl: DEFAULT_BASE_URL,
    conversationNo: undefined,
  };
  for (const argument of argv) {
    if (argument === '--apply') options.apply = true;
    else if (argument === '--use-dev-fixed-token') options.useDevFixedToken = true;
    else if (argument.startsWith('--env-file=')) options.envFile = argument.slice('--env-file='.length);
    else if (argument.startsWith('--base-url=')) options.baseUrl = argument.slice('--base-url='.length);
    else if (argument.startsWith('--conversation-no=')) {
      options.conversationNo = argument.slice('--conversation-no='.length);
    } else {
      throw new Error(`不支持的参数：${argument}`);
    }
  }
  return options;
}

function readDevFixedToken() {
  const source = readFileSync('miniapp/config/index.ts', 'utf8');
  const matched = source.match(/DEV_FIXED_LOGIN_TOKEN \|\| '([^']+)'/);
  if (!matched?.[1]) throw new Error('小程序开发固定登录 Token 未配置');
  return matched[1];
}

async function fetchPlatformData(baseUrl, path, token) {
  const response = await fetch(new URL(path, baseUrl), {
    headers: { 'X-Auth-Token': token },
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok || !body || body.code !== 200) {
    throw new Error(body?.msg || `平台接口请求失败：HTTP ${response.status}`);
  }
  return body.data;
}

async function importMessage({ baseUrl, sdkAppId, administrator, userSig, payload }) {
  const url = new URL('/v4/openim/importmsg', baseUrl);
  url.searchParams.set('sdkappid', String(sdkAppId));
  url.searchParams.set('identifier', administrator);
  url.searchParams.set('usersig', userSig);
  url.searchParams.set('random', String(randomBytes(4).readUInt32BE(0)));
  url.searchParams.set('contenttype', 'json');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok || !body || body.ErrorCode !== 0 || body.ActionStatus !== 'OK') {
    throw new Error(`TIM 导入失败：${body?.ErrorCode ?? response.status} ${body?.ErrorInfo || ''}`.trim());
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const fileEnv = parseEnvFile(options.envFile);
  const config = { ...fileEnv, ...process.env };
  const token = process.env.MINIAPP_TOKEN
    || (options.useDevFixedToken ? readDevFixedToken() : '');
  requiredText(token, 'MINIAPP_TOKEN');

  const credentials = await fetchPlatformData(
    options.baseUrl,
    '/api/miniapp/im/credentials',
    token,
  );
  const conversationPage = await fetchPlatformData(
    options.baseUrl,
    '/api/miniapp/message/conversations?size=20',
    token,
  );
  let candidates = selectDemoIncomingMessages(conversationPage?.list);
  if (options.conversationNo) {
    candidates = candidates.filter(item => item.conversationNo === options.conversationNo);
  }
  console.log(`发现 ${candidates.length} 条待对齐的 DEMO-HOME 入站消息`);
  if (candidates.length === 0) return;

  const sdkAppId = Number(requiredText(config.TENCENT_IM_SDK_APP_ID, 'TENCENT_IM_SDK_APP_ID'));
  if (sdkAppId !== Number(credentials.sdkAppId)) {
    throw new Error('生产配置 SDKAppID 与小程序凭证不一致，已停止导入');
  }
  const administrator = requiredText(config.TENCENT_IM_ADMINISTRATOR, 'TENCENT_IM_ADMINISTRATOR');
  const secretKey = requiredText(config.TENCENT_IM_SECRET_KEY, 'TENCENT_IM_SECRET_KEY');
  const restBaseUrl = requiredText(config.TENCENT_IM_REST_BASE_URL, 'TENCENT_IM_REST_BASE_URL');
  const expireSeconds = Number(config.TENCENT_IM_USER_SIG_EXPIRE_SECONDS || 86_400);
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const userSig = generateTencentUserSig({
    sdkAppId,
    userId: administrator,
    secretKey,
    expireSeconds,
    issuedAtSeconds,
  });

  for (const candidate of candidates) {
    const detail = await fetchPlatformData(
      options.baseUrl,
      `/api/miniapp/message/conversations/${encodeURIComponent(candidate.conversationNo)}`,
      token,
    );
    const timConversationId = requiredText(detail?.timConversationId, 'TIM 会话号');
    if (!timConversationId.startsWith('C2C') || timConversationId.length <= 3) {
      throw new Error(`会话 ${candidate.conversationNo} 的 TIM 会话号无效`);
    }
    const payload = buildImportPayload({
      ...candidate.lastMessage,
      fromAccount: timConversationId.slice(3),
      toAccount: credentials.imUserId,
    });
    if (options.apply) {
      await importMessage({
        baseUrl: restBaseUrl,
        sdkAppId,
        administrator,
        userSig,
        payload,
      });
      console.log(`已对齐 ${candidate.conversationNo} / ${candidate.lastMessage.messageNo}`);
    } else {
      console.log(`待对齐 ${candidate.conversationNo} / ${candidate.lastMessage.messageNo}`);
    }
  }

  if (!options.apply) console.log('当前为只读预检；确认后追加 --apply 执行导入');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'TIM 演示历史对账失败');
    process.exitCode = 1;
  });
}
