import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const application = read('backend/src/main/resources/application.yml');
const envExample = read('deploy/server.prod.env.example');
const deployScript = read('deploy/scripts/deploy-prod-local.sh');
const workflow = read('.github/workflows/deploy-backend-prod.yml');

const keys = [
  'TENCENT_IM_ENABLED',
  'TENCENT_IM_SDK_APP_ID',
  'TENCENT_IM_SECRET_KEY',
  'TENCENT_IM_ADMINISTRATOR',
  'TENCENT_IM_REST_BASE_URL',
  'TENCENT_IM_CALLBACK_PATH_TOKEN',
  'TENCENT_IM_CALLBACK_AUTH_TOKEN',
  'TENCENT_IM_USER_SIG_EXPIRE_SECONDS',
  'TENCENT_IM_PROTOCOL_VERSION',
  'TENCENT_IM_CONNECT_TIMEOUT_MILLIS',
  'TENCENT_IM_REQUEST_TIMEOUT_MILLIS',
];

for (const key of keys) {
  assert.ok(application.includes(`\${${key}`), `application.yml 缺少 ${key} 绑定`);
  assert.match(envExample, new RegExp(`^${key}=`, 'm'), `生产环境示例缺少 ${key}`);
}

for (const expected of [
  'export TENCENT_IM_ENABLED="${TENCENT_IM_ENABLED:-false}"',
  'export TENCENT_IM_REST_BASE_URL="${TENCENT_IM_REST_BASE_URL:-https://console.tim.qq.com}"',
  'prod.env 缺少腾讯云 TIM 配置',
  'TENCENT_IM_ENABLED TENCENT_IM_SDK_APP_ID TENCENT_IM_SECRET_KEY',
  'TENCENT_IM_CALLBACK_PATH_TOKEN TENCENT_IM_CALLBACK_AUTH_TOKEN',
  'TENCENT_IM_USER_SIG_EXPIRE_SECONDS TENCENT_IM_PROTOCOL_VERSION',
  'TENCENT_IM_CONNECT_TIMEOUT_MILLIS TENCENT_IM_REQUEST_TIMEOUT_MILLIS',
  'prod.env 腾讯云 TIM 配置 ${key} 必须为正整数',
]) {
  assert.ok(deployScript.includes(expected), `部署脚本缺少 TIM 门禁或运行时透传：${expected}`);
}

assert.match(
  workflow,
  /node scripts\/test-prod-tencent-im-config\.mjs/,
  '后端发布流水线必须执行腾讯云 TIM 配置门禁',
);

assert.ok(
  !/^TENCENT_IM_SECRET_KEY=\S+/m.test(envExample),
  '生产环境示例禁止包含真实 TIM SecretKey',
);
assert.ok(
  !/^TENCENT_IM_CALLBACK_AUTH_TOKEN=\S+/m.test(envExample),
  '生产环境示例禁止包含真实回调鉴权 Token',
);

console.log('腾讯云 TIM 生产配置与运行时透传门禁测试通过');
