import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const prodConfig = fs.readFileSync(path.join(root, 'backend/src/main/resources/application-prod.yml'), 'utf8')
const deployScript = fs.readFileSync(path.join(root, 'deploy/scripts/deploy-prod-local.sh'), 'utf8').replace(/\r\n/g, '\n')
const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy-backend-prod.yml'), 'utf8')
const prodEnvExample = fs.readFileSync(path.join(root, 'deploy/server.prod.env.example'), 'utf8')

// 执行部署脚本的支付配置段，验证遗留配置不能覆盖生产收费规则。
const paymentConfig = deployScript.slice(
  deployScript.indexOf('  # 正式环境统一按后台套餐价'),
  deployScript.indexOf('  export WECHAT_VIRTUAL_PAY_RECONCILE_DELAY_MS='),
)
assert.ok(paymentConfig.length > 0, '必须取得实际部署脚本的支付配置段')
const output = execFileSync('bash', ['-c', paymentConfig + `
  printf '%s\\n' "$WECHAT_PAY_FORCE_TEST_AMOUNT" "$WECHAT_PAY_TEST_AMOUNT" "$WECHAT_PAY_TEST_PAY_AMOUNT" "$WECHAT_VIRTUAL_PAY_ENABLED" "$WECHAT_VIRTUAL_PAY_ENV"
`], {
  encoding: 'utf8',
  env: {
    ...process.env,
    DEPLOY_ENV: 'prod',
    WECHAT_PAY_FORCE_TEST_AMOUNT: 'true',
    WECHAT_PAY_TEST_AMOUNT: '1.00',
    WECHAT_PAY_TEST_PAY_AMOUNT: '1.00',
    WECHAT_VIRTUAL_PAY_ENABLED: 'false',
    WECHAT_VIRTUAL_PAY_ENV: '1',
  },
})
assert.deepEqual(output.trimEnd().split('\n'), ['false', '', '', 'true', '0'],
  '生产部署必须清除测试价覆盖，统一启用正式虚拟支付')

const requiredConfigBlock = deployScript.slice(
  deployScript.indexOf('for key in \\\n    DB_HOST'),
  deployScript.indexOf('export SPRING_DATASOURCE_URL'),
)
for (const key of ['WECHAT_PAY_MCH_ID', 'WECHAT_PAY_API_V3_KEY', 'WECHAT_PAY_CERT_SERIAL_NO']) {
  assert.match(requiredConfigBlock, new RegExp(`\\b${key}\\b`), `部署前必须校验 ${key} 非空`)
}

assert.match(deployScript, /require_file "\$\{WECHAT_PAY_CERT_DIR\}\/apiclient_key\.pem"/, '部署前必须校验微信支付私钥存在')
assert.match(deployScript, /-v "\$\{WECHAT_PAY_CERT_DIR\}:\/app\/cert:ro"/, '后端容器必须只读挂载微信支付证书目录')
assert.match(workflow, /node scripts\/test-prod-wechat-pay-config\.mjs/, '后端发布流水线必须执行微信支付配置门禁')

assert.match(
  prodConfig,
  /wechat-virtual-pay:[\s\S]*enabled:\s*\$\{WECHAT_VIRTUAL_PAY_ENABLED:true\}/,
  '生产配置必须默认启用微信虚拟支付',
)
assert.match(prodConfig, /offer-id:\s*\$\{WECHAT_VIRTUAL_PAY_OFFER_ID:\}/, '生产配置必须绑定虚拟支付 OfferId')
assert.match(prodConfig, /app-key:\s*\$\{WECHAT_VIRTUAL_PAY_APP_KEY:\}/, '生产配置必须绑定虚拟支付 AppKey')
assert.match(prodConfig, /env:\s*\$\{WECHAT_VIRTUAL_PAY_ENV:0\}/, '生产虚拟支付必须默认使用正式环境')
assert.match(
  deployScript,
  /if \[ "\$\{WECHAT_VIRTUAL_PAY_ENABLED,,\}" = "true" \]; then[\s\S]*WECHAT_VIRTUAL_PAY_OFFER_ID[\s\S]*WECHAT_VIRTUAL_PAY_APP_KEY/,
  '仅在启用虚拟支付时校验 OfferId 与 AppKey',
)
for (const key of [
  'WECHAT_VIRTUAL_PAY_ENABLED',
  'WECHAT_VIRTUAL_PAY_OFFER_ID',
  'WECHAT_VIRTUAL_PAY_APP_KEY',
  'WECHAT_VIRTUAL_PAY_ENV',
]) {
  assert.match(deployScript, new RegExp(`\\b${key}\\b`), `部署脚本必须转发 ${key}`)
  assert.match(prodEnvExample, new RegExp(`^${key}=`, 'm'), `生产环境模板必须声明 ${key}`)
}

console.log('生产微信支付与虚拟支付配置检查通过（包含实际执行配置段验证）')
