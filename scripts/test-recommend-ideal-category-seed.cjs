const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const sqlPath = path.join(
  root,
  'deploy/sql/ops/2026-08-16-seed-recommend-ideal-category-regression.sql'
)

function readSql() {
  assert.equal(fs.existsSync(sqlPath), true, '缺少推荐与理想型分类回归数据脚本')
  return fs.readFileSync(sqlPath, 'utf8')
}

test('脚本只通过固定验收手机号定位主账号，并在缺失时停止', () => {
  const sql = readSql()
  assert.match(sql, /phone\s*=\s*'17366629764'/)
  assert.match(sql, /SIGNAL SQLSTATE '45000'/)
  assert.doesNotMatch(sql, /@target_user_id\s*:=\s*\d+/i, '不得写死目标用户主键')
})

test('脚本使用事务和稳定业务键保证幂等且不删除数据', () => {
  const sql = readSql()
  assert.match(sql, /START TRANSACTION;/)
  assert.match(sql, /COMMIT;/)
  assert.match(sql, /ON DUPLICATE KEY UPDATE/)
  assert.match(sql, /REG-RI-USER-13/)
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i)
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i)
})

test('至少新增 12 名不可联系的完整候选', () => {
  const sql = readSql()
  const users = new Set(sql.match(/REG-RI-USER-\d{2}/g) || [])
  assert.ok(users.size >= 12, `新增候选不足 12 名，当前 ${users.size}`)
  assert.match(sql, /'REAL_NAME'/)
  assert.match(sql, /'AVATAR'/)
  assert.match(sql, /'EDUCATION'/)
  assert.match(sql, /'PROFILE_BG'/)
  assert.match(sql, /'ALBUM_PHOTO'/)
  assert.match(sql, /'ABOUT_ME'/)
  assert.doesNotMatch(sql, /REG-RI-USER-\d{2}'[^\n]*1[3-9]\d{9}/, '虚构候选不得写手机号')
})

test('推荐动作覆盖 view、detail、skip、like、never', () => {
  const sql = readSql()
  for (const action of ['VIEW', 'DETAIL', 'SKIP', 'LIKE', 'NEVER']) {
    assert.match(
      sql,
      new RegExp(`SELECT\\s+'${action}'(?:\\s+action_code|,)`),
      `缺少推荐动作 ${action}`
    )
  }
  assert.match(sql, /app_user_relation_block/, 'never 动作必须同步不再推荐关系')
})

test('理想型六大分类每类至少有 4 条快照候选', () => {
  const sql = readSql()
  const categories = [
    ['APPEARANCE', '外在条件'],
    ['EDUCATION', '教育背景'],
    ['ECONOMY', '经济实力'],
    ['FAMILY', '家庭背景'],
    ['INTEREST', '兴趣爱好'],
    ['RELATIONSHIP', '感情与经历'],
  ]
  for (const [code, label] of categories) {
    assert.match(sql, new RegExp(`REG-RI-SNAPSHOT-${code}`), `缺少${label}快照`)
    assert.match(sql, new RegExp(`'category','${label}'`), `缺少${label}分类载荷`)
    const items = new Set(sql.match(new RegExp(`REG-RI-${code}-ITEM-\\d{2}`, 'g')) || [])
    assert.ok(items.size >= 4, `${label}候选不足 4 条，当前 ${items.size}`)
  }
})

test('不再推荐的候选不进入六大分类有效快照', () => {
  const sql = readSql()
  const candidateSection = sql
    .split('-- 分类候选清单。每条 item_no 由分类和序号组成，便于接口回归定位。')[1]
    .split('-- 三条有效、三条过期的历史解锁')[0]
  const activeItemLines = candidateSection.split('\n').filter((line) => (
    /REG-RI-(?:APPEARANCE|EDUCATION|ECONOMY|FAMILY|INTEREST|RELATIONSHIP)-ITEM-\d{2}/.test(line)
    && /^\s*SELECT\s+/.test(line)
  ))
  assert.equal(activeItemLines.length, 24, '六大分类候选明细应恰好 24 条')
  for (const line of activeItemLines) {
    assert.doesNotMatch(line, /,2[1-3],/, 'never 候选不得出现在有效理想型快照')
  }
})

test('理想型覆盖有效/过期快照和有效/失效解锁历史', () => {
  const sql = readSql()
  assert.match(sql, /REG-RI-SNAPSHOT-EXPIRED/)
  assert.match(sql, /REG-RI-UNLOCK-ACTIVE-/)
  assert.match(sql, /REG-RI-UNLOCK-EXPIRED-/)
  assert.match(sql, /'active'/)
  assert.match(sql, /'expired'/)
  assert.match(sql, /active_marker/)
})

test('脚本提供分类、重复键和状态分布核验', () => {
  const sql = readSql()
  for (const metric of [
    'recommend_new_candidates',
    'recommend_action_types',
    'ideal_category_snapshots',
    'ideal_category_candidates',
    'ideal_snapshot_statuses',
    'ideal_unlock_statuses',
    'duplicate_business_keys',
  ]) {
    assert.match(sql, new RegExp(`'${metric}'`), `缺少核验指标 ${metric}`)
  }
})
