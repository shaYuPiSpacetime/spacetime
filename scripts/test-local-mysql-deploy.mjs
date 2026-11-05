import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const helper = resolve('deploy/scripts/local-mysql.sh');
const image = `fixture.invalid/mysql@sha256:${'a'.repeat(64)}`;

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'spacetime-mysql-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const path of ['mysql/data/auto.cnf', 'mysql/production-ready', 'secrets/mysql/server.cnf', 'secrets/mysql/root.cnf', 'secrets/mysql/app.cnf']) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), 'fixture-uuid\n');
  }
  const env = { ...process.env, PROJECT_DIR: dir, MYSQL_LOCAL_ENABLED: 'true', MYSQL_IMAGE: image,
    DB_HOST: 'mysql', DB_PORT: '3306', DB_NAME: 'shikongxiehou_prod', DB_USER: 'spacetime_prod', SPACETIME_DEPLOY_ENV: 'prod' };
  return { dir, env };
}

const dockerMock = `
docker() {
  if [ "$1" = inspect ] && [ "$2" = -f ]; then printf '%s' "$PROJECT_DIR/mysql/data";
  elif [ "$1" = port ]; then printf '%s' "\${TEST_PORT:-}";
  elif [ "$1" = exec ]; then printf '%s' fixture-uuid:0:0;
  elif [ "$1" = run ]; then printf '%s\\n' "$*" >> "$PROJECT_DIR/docker-run.log";
  elif [ "$1" = inspect ] && [ "\${TEST_MISSING_CONTAINER:-}" = true ]; then return 1;
  fi
}
`;

function run(env, command, mocks = dockerMock) {
  return spawnSync('bash', ['-c', `set -euo pipefail; fail() { echo "$*" >&2; exit 1; }; . "$1"; ${mocks}\n${command}`, '测试', helper], { env, encoding: 'utf8', timeout: 5000 });
}

test('远程测试环境不触碰本机数据库容器', t => {
  const { env } = fixture(t);
  const r = run({ ...env, MYSQL_LOCAL_ENABLED: 'false', SPACETIME_DEPLOY_ENV: 'test' }, 'ensure_mysql', 'docker() { exit 90; }');
  assert.equal(r.status, 0, r.stderr);
});

test('生产数据丢失时发布失败，不能自动生成空库', t => {
  const { dir, env } = fixture(t);
  rmSync(join(dir, 'mysql/data/auto.cnf'));
  const r = run(env, 'ensure_mysql', 'docker() { exit 90; }');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /禁止初始化空生产库/);
});

test('禁止测试环境启用生产数据库以及错误主机或浮动镜像', t => {
  const { env } = fixture(t);
  for (const change of [{ SPACETIME_DEPLOY_ENV: 'test' }, { DB_HOST: 'public.invalid' }, { MYSQL_IMAGE: 'mysql:latest' }, { SPRING_DATASOURCE_URL: 'jdbc:mysql://rds.invalid:3306/shikongxiehou_prod?useSSL=true' }]) {
    assert.equal(run({ ...env, ...change }, 'ensure_mysql').status, 1);
  }
});

test('既有生产实例校验通过，开放宿主端口则拒绝发布', t => {
  const { env } = fixture(t);
  assert.equal(run(env, 'ensure_mysql').status, 0);
  const r = run({ ...env, TEST_PORT: '3306/tcp -> 0.0.0.0:3306' }, 'ensure_mysql');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /不允许映射宿主端口/);
});

test('容器丢失时仅用已验收的持久化目录恢复容器壳', t => {
  const { dir, env } = fixture(t);
  const r = run({ ...env, TEST_MISSING_CONTAINER: 'true' }, 'ensure_mysql');
  assert.equal(r.status, 0, r.stderr);
  const args = readFileSync(join(dir, 'docker-run.log'), 'utf8');
  assert.ok(args.includes(`${dir}/mysql/data:/var/lib/mysql`));
  assert.ok(args.includes('--network-alias mysql'));
  assert.ok(args.includes(image));
  assert.doesNotMatch(args, /(?:^|\s)(-p|--publish)(?:\s|=)|MYSQL_ROOT_PASSWORD/);
});

test('本机 SQL 迁移通过容器客户端执行且保留文件正文', t => {
  const { dir, env } = fixture(t);
  for (const sub of ['deploy/scripts', 'deploy/sql/prod', 'bin']) mkdirSync(join(dir, sub), { recursive: true });
  cpSync(helper, join(dir, 'deploy/scripts/local-mysql.sh'));
  cpSync(resolve('deploy/scripts/migrate-prod-db.sh'), join(dir, 'deploy/scripts/migrate-prod-db.sh'));
  writeFileSync(join(dir, 'deploy/sql/prod/fixture.sql'), 'SELECT 42;\n');
  writeFileSync(join(dir, 'prod.env'), `DB_PASSWORD=fixture-only\n`);
  writeFileSync(join(dir, 'bin/docker'), `#!/bin/bash
printf '%s\\n' "$*" >> "$PROJECT_DIR/calls.log"
if [ "$1" = inspect ] && [ "$2" = -f ]; then printf '%s' "$PROJECT_DIR/mysql/data";
elif [ "$1" = exec ] && [[ "$*" = *'@@server_uuid'* ]]; then echo fixture-uuid:0:0;
elif [ "$1" = exec ] && [[ "$*" != *'CREATE DATABASE'* ]]; then cat >> "$PROJECT_DIR/sql.log";
fi
`, { mode: 0o755 });
  const r = spawnSync('bash', [join(dir, 'deploy/scripts/migrate-prod-db.sh'), 'deploy/sql/prod/fixture.sql'], {
    env: { ...env, SPACETIME_PROJECT_DIR: dir, SPACETIME_PROD_ENV_FILE: join(dir, 'prod.env'), PATH: `${dir}/bin:${process.env.PATH}` },
    encoding: 'utf8', timeout: 5000,
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(join(dir, 'sql.log'), 'utf8'), 'SELECT 42;\n');
  assert.match(readFileSync(join(dir, 'calls.log'), 'utf8'), /exec -i spacetime-mysql-prod mysql --defaults-extra-file=\/run\/mysql-secrets\/app.cnf/);
});

test('命令行 SQL 不读取 SSH 标准输入，文件 SQL 保留输入通道', t => {
  const { env } = fixture(t);
  const mock = 'docker() { printf "%s\\n" "$*"; }';
  const direct = run(env, "mysql_local_app -N shikongxiehou_prod -e 'SELECT 1'", mock);
  assert.equal(direct.status, 0, direct.stderr);
  assert.match(direct.stdout, /^exec spacetime-mysql-prod /);
  const file = run(env, 'mysql_local_app shikongxiehou_prod', mock);
  assert.equal(file.status, 0, file.stderr);
  assert.match(file.stdout, /^exec -i spacetime-mysql-prod /);
});

test('只读实例和错误实例标识都不能通过生产发布检查', t => {
  const { env } = fixture(t);
  for (const result of ['fixture-uuid:1:0', 'fixture-uuid:0:1', 'other-uuid:0:0']) {
    const mock = dockerMock.replace('fixture-uuid:0:0', result) + '\nsleep() { return 0; }';
    const r = run(env, 'ensure_mysql', mock);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /只读状态或实例标识/);
  }
});
