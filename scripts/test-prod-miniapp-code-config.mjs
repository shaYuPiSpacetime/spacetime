import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = fs.readFileSync(path.join(root, 'deploy/scripts/deploy-prod-local.sh'), 'utf8')
const config = fs.readFileSync(path.join(root, 'backend/src/main/resources/application-prod.yml'), 'utf8')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'spacetime-qr-config-'))

try {
  // 执行实际配置段和环境文件写入函数，验证容器收到的值而非只检查变量名。
  const configure = script.slice(script.indexOf('  # 生产推广码只进入正式版'), script.indexOf('  export WECHAT_PAY_APP_ID='))
  const writer = script.slice(script.indexOf('write_runtime_env() {'), script.indexOf('\nensure_runtime() {'))
  assert.ok(configure.length > 0 && writer.length > 0)
  for (const [environment, configured, expected] of [
    ['prod', '', 'release'],
    ['prod', 'trial', 'release'],
    ['test', 'trial', 'trial'],
  ]) {
    const filename = path.join(temp, `${environment}-${configured || 'default'}.env`)
    execFileSync('bash', ['-c', `set -eu\n${configure}\n${writer}\nwrite_runtime_env`], {
      env: {
        PATH: process.env.PATH,
        DEPLOY_ENV: environment,
        WECHAT_MINIAPP_CODE_ENV_VERSION: configured,
        RUNTIME_ENV_FILE: filename,
      },
    })
    const env = fs.readFileSync(filename, 'utf8').split('\n')
    assert.ok(env.includes(`WECHAT_MINIAPP_CODE_ENV_VERSION=${expected}`), `${environment} 二维码版本未正确写入容器环境文件`)
  }
  assert.match(config, /code-env-version:\s*\$\{WECHAT_MINIAPP_CODE_ENV_VERSION:release\}/, '生产未显式配置时也必须生成正式码')
  console.log('生产正式码默认值、旧体验配置覆盖及运行时变量转发验证通过')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
