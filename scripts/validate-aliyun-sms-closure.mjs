import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const pom = read('backend/pom.xml');
const application = read('backend/src/main/resources/application.yml');
const applicationProd = read('backend/src/main/resources/application-prod.yml');
const properties = read('backend/src/main/java/com/spacetime/common/provider/impl/AliyunSmsProperties.java');
const provider = read('backend/src/main/java/com/spacetime/common/provider/impl/AliyunSmsCodeProvider.java');
const mockProvider = read('backend/src/main/java/com/spacetime/common/provider/impl/MockSmsCodeProvider.java');
const envExample = read('deploy/server.prod.env.example');
const localEnvExample = read('backend/.env.local.example');
const deployScript = read('deploy/scripts/deploy-prod-local.sh');
const miniappApi = read('miniapp/src/constants/prd01ApiPaths.ts');
const authService = read('backend/src/main/java/com/spacetime/miniapp/service/impl/AuthMiniappServiceImpl.java');

assert.match(pom, /<artifactId>dysmsapi20170525<\/artifactId>[\s\S]*?<version>\$\{aliyun-sms\.version\}<\/version>/);
assert.match(pom, /<aliyun-sms\.version>4\.5\.1<\/aliyun-sms\.version>/);

for (const expected of [
  'provider: ${SMS_PROVIDER:mock}',
  'access-key-id: ${SMS_ACCESS_KEY_ID:${OSS_ACCESS_KEY_ID:${DEV_OSS_ACCESS_KEY_ID:}}}',
  'access-key-secret: ${SMS_ACCESS_KEY_SECRET:${OSS_ACCESS_KEY_SECRET:${DEV_OSS_ACCESS_KEY_SECRET:}}}',
  'sign-name: ${SMS_SIGN_NAME:上海兴家立业网络科技}',
  'template-code: ${SMS_TEMPLATE_CODE:SMS_336060313}',
]) {
  assert.ok(application.includes(expected), `application.yml 缺少 ${expected}`);
}
assert.ok(applicationProd.includes('provider: ${SMS_PROVIDER:aliyun}'), '生产环境必须默认启用 aliyun');

assert.ok(properties.includes('private String signName = "上海兴家立业网络科技";'), '签名默认值不正确');
assert.ok(properties.includes('private String templateCode = "SMS_336060313";'), '模板默认值不正确');
assert.ok(provider.includes('Map.of("code", code)'), '短信模板参数必须只包含 code');
assert.ok(provider.includes('SUCCESS_CODE.equals(body.getCode())'), '必须校验阿里云业务响应 Code=OK');
assert.ok(provider.includes('return "ALIYUN_SMS";'), '真实 Provider 编码不正确');
assert.ok(mockProvider.includes('havingValue = "mock", matchIfMissing = true'), 'mock 通道必须仅在 mock 环境启用');

for (const [file, content, providerDefault] of [
  ['deploy/server.prod.env.example', envExample, 'SMS_PROVIDER=aliyun'],
  ['backend/.env.local.example', localEnvExample, 'SMS_PROVIDER=mock'],
]) {
  for (const expected of [
    providerDefault,
    'SMS_ACCESS_KEY_ID=',
    'SMS_ACCESS_KEY_SECRET=',
    'SMS_ENDPOINT=dysmsapi.aliyuncs.com',
    'SMS_SIGN_NAME=上海兴家立业网络科技',
    'SMS_TEMPLATE_CODE=SMS_336060313',
  ]) {
    assert.ok(content.includes(expected), `${file} 缺少 ${expected}`);
  }
}

for (const expected of [
  'export SMS_ACCESS_KEY_ID="${SMS_ACCESS_KEY_ID:-$OSS_ACCESS_KEY_ID}"',
  'export SMS_ACCESS_KEY_SECRET="${SMS_ACCESS_KEY_SECRET:-$OSS_ACCESS_KEY_SECRET}"',
]) {
  assert.ok(deployScript.includes(expected), `部署脚本缺少 OSS RAM 凭证回退：${expected}`);
}

for (const expected of [
  'SMS_ACCESS_KEY_ID SMS_ACCESS_KEY_SECRET',
  'SMS_PROVIDER SMS_ENDPOINT SMS_SIGN_NAME SMS_TEMPLATE_CODE',
]) {
  const occurrences = deployScript.split(expected).length - 1;
  assert.ok(occurrences >= 2, `部署脚本必须同时校验并透传 ${expected}`);
}

assert.ok(miniappApi.includes("smsCode: '/miniapp/auth/sms-code'"), '小程序验证码接口未接入真实后端');
assert.ok(miniappApi.includes("phoneLogin: '/miniapp/auth/phone-login'"), '小程序手机号登录接口未接入真实后端');
assert.ok(authService.includes('private static final String FIXED_SMS_CODE = "0000";'), '体验版验证码必须固定为 0000');
assert.ok(authService.includes('vo.setProviderCode("FIXED")'), '发送接口必须标记为固定验证码模式');
assert.ok(!authService.includes('smsCodeProvider.sendLoginCode'), '固定验证码模式禁止调用短信网关');
assert.ok(!authService.includes('smsCodeProvider.generateCode'), '固定验证码模式禁止生成随机短信验证码');

for (const [file, content] of [
  ['application.yml', application],
  ['application-prod.yml', applicationProd],
  ['server.prod.env.example', envExample],
  ['.env.local.example', localEnvExample],
]) {
  assert.ok(!/LTAI[A-Za-z0-9]+/.test(content), `${file} 禁止包含真实 AccessKey ID`);
  assert.ok(!/SMS_ACCESS_KEY_SECRET=\S+/.test(content), `${file} 禁止包含真实短信密钥`);
}

console.log('阿里云短信手机号登录静态闭环校验通过');
