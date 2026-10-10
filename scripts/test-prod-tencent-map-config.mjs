import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const script = read('deploy/scripts/deploy-prod-local.sh').replace(/\r\n/g, '\n');
const writer = script.match(/^write_runtime_env\(\) \{\n[\s\S]*?^\}/m)?.[0];
assert.ok(writer);
const bash = process.env.BASH_BIN || (process.platform === 'win32'
  ? ['C:/Program Files/Git/bin/bash.exe', 'D:/Program Files (x86)/Git/bin/bash.exe'].find(existsSync) || 'bash'
  : 'bash');
for (const key of ['fixture-map-key', '']) {
  const run = spawnSync(bash, ['-s'], {
    input: `set -eu\n${writer}\nRUNTIME_ENV_FILE=$(mktemp)\ntrap 'rm -f "$RUNTIME_ENV_FILE"' EXIT\nwrite_runtime_env\ncat "$RUNTIME_ENV_FILE"\n`,
    encoding: 'utf8',
    env: { ...process.env, TENCENT_MAP_KEY: key, TENCENT_MAP_CONNECT_TIMEOUT_MILLIS: '3000', TENCENT_MAP_REQUEST_TIMEOUT_MILLIS: '5000' },
  });
  assert.equal(run.status, 0, '运行环境生成函数应正常执行');
  const values = Object.fromEntries(run.stdout.trim().split('\n').map(line => {
    const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)];
  }));
  assert.equal(values.TENCENT_MAP_KEY, key, '地图 Key 必须传入真实容器环境文件');
  assert.equal(values.TENCENT_MAP_CONNECT_TIMEOUT_MILLIS, '3000');
  assert.equal(values.TENCENT_MAP_REQUEST_TIMEOUT_MILLIS, '5000');
}
for (const key of ['TENCENT_MAP_KEY', 'TENCENT_MAP_CONNECT_TIMEOUT_MILLIS', 'TENCENT_MAP_REQUEST_TIMEOUT_MILLIS']) {
  assert.ok(read('backend/src/main/resources/application.yml').includes(`\${${key}:`));
  assert.match(read('deploy/server.prod.env.example'), new RegExp(`^${key}=`, 'm'));
}
assert.match(read('.github/workflows/deploy-backend-prod.yml'), /node scripts\/test-prod-tencent-map-config\.mjs/);
assert.match(read('deploy/server.prod.env.example'), /^TENCENT_MAP_KEY=$/m);
console.log('地图生产配置：真实环境文件生成、空配置及发布门禁均通过');
