import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = path => readFileSync(join(root, path), 'utf8');
const retired = '092_virtual_product_price_alignment.sql';
const newMigration = '093_virtual_product_flexible_price.sql';

test('部署清单仅同步并执行新迁移，旧固定价迁移不再自动运行', () => {
  const workflow = read('.github/workflows/deploy-backend-prod.yml');
  assert.doesNotMatch(workflow, /deploy\/sql\/prod\/092_virtual_product_price_alignment\.sql/, '工作流不能再同步或执行固定价迁移');
  assert.equal((workflow.match(/deploy\/sql\/prod\/093_virtual_product_flexible_price\.sql/g) || []).length, 2, '新迁移须同步并执行各一次');
  assert.match(workflow, /node scripts\/test-virtual-product-migration-guard\.mjs/, '部署前必须检查迁移防护');
});

test('迁移脚本在默认扫描与显式参数下均禁止重放 092', () => {
  const script = read('deploy/scripts/migrate-prod-db.sh');
  assert.match(script, /092_virtual_product_price_alignment\.sql/, '必须显式识别退役迁移');
  assert.match(script, /跳过已退役迁移/, '默认扫描须跳过退役迁移');
  assert.match(script, /禁止执行已退役迁移/, '显式调用须拒绝退役迁移');

  const temp = mkdtempSync(join(tmpdir(), 'spacetime-migration-guard-'));
  try {
    const envFile = join(temp, 'test.env');
    const fakeMysql = join(temp, 'mysql');
    writeFileSync(envFile, 'DB_HOST=localhost\nDB_PORT=3306\nDB_NAME=test_only\nDB_USER=test\nDB_PASSWORD=test_only\n');
    writeFileSync(fakeMysql, '#!/bin/sh\nexit 0\n');
    chmodSync(fakeMysql, 0o755);
    const env = { ...process.env, SPACETIME_PROD_ENV_FILE: envFile, PATH: `${temp}:${process.env.PATH}` };
    const explicit = spawnSync('bash', [join(root, 'deploy/scripts/migrate-prod-db.sh'), `deploy/sql/prod/${retired}`], { cwd: root, env, encoding: 'utf8' });
    assert.notEqual(explicit.status, 0, '显式执行 092 必须失败');
    assert.match(explicit.stderr, /禁止执行已退役迁移/, '显式失败原因须明确');

    const defaultRun = spawnSync('bash', [join(root, 'deploy/scripts/migrate-prod-db.sh')], { cwd: root, env, encoding: 'utf8' });
    assert.equal(defaultRun.status, 0, defaultRun.stderr);
    assert.match(defaultRun.stdout, /跳过已退役迁移/, '默认扫描须记录跳过 092');
    assert.doesNotMatch(defaultRun.stdout, /执行 092_virtual_product_price_alignment\.sql/, '默认扫描不得重放 092');
    assert.match(defaultRun.stdout, /执行 093_virtual_product_flexible_price\.sql/, '默认扫描须执行新迁移');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('新迁移只扩展商品发布与价格变更结构，不修改既有套餐价格', () => {
  const sql = read(`deploy/sql/prod/${newMigration}`);
  for (const table of ['app_coin_package', 'app_trade_order']) {
    assert.match(sql, new RegExp(`${table}[\\s\\S]*wechat_product_id VARCHAR\\(64\\)`), `${table} 缺少商品 ID 快照列`);
  }
  for (const column of ['package_type', 'package_id', 'old_product_id', 'new_product_id', 'target_price', 'status', 'upload_task_id', 'publish_task_id', 'published_at', 'active_at', 'last_error', 'version', 'create_time', 'update_time', 'created_by', 'updated_by', 'deleted']) {
    assert.match(sql, new RegExp(`\\b${column}\\b`), `价格变更表缺少 ${column}`);
  }
  assert.match(sql, /CREATE TABLE IF NOT EXISTS app_virtual_price_change/, '缺少价格变更表');
  assert.match(sql, /CONCAT\('vip_', id\)/, '既有会员商品 ID 未回填');
  assert.match(sql, /CONCAT\('coin_', id\)/, '既有千寻币商品 ID 未回填');
  assert.doesNotMatch(sql, /UPDATE\s+app_(?:vip|coin)_package\s+SET\s+(?:price|amount|discount_amount)\s*=/i, '新迁移不得重置运营价格');
});
