import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const prodConfig = fs.readFileSync(path.join(root, 'backend/src/main/resources/application-prod.yml'), 'utf8')
const deployScript = fs.readFileSync(path.join(root, 'deploy/scripts/deploy-prod-local.sh'), 'utf8')
const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy-backend-prod.yml'), 'utf8')

assert.match(
  prodConfig,
  /force-test-amount:\s*\$\{WECHAT_PAY_FORCE_TEST_AMOUNT:false\}/,
  'prod 配置必须显式绑定是否启用测试扣款金额',
)
assert.match(
  prodConfig,
  /test-pay-amount:\s*\$\{WECHAT_PAY_TEST_PAY_AMOUNT:0\.01\}/,
  'prod 配置必须绑定 0.01 元测试扣款金额',
)
assert.match(
  deployScript,
  /WECHAT_PAY_TEST_AMOUNT="\$WECHAT_PAY_TEST_PAY_AMOUNT"/,
  '部署脚本必须兼容仍读取 WECHAT_PAY_TEST_AMOUNT 的后端镜像',
)

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

console.log('生产微信支付配置与证书挂载门禁测试通过：9/9')
