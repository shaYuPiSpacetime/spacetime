const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')
const test = require('node:test')

test('R-03: 相互喜欢 SQL 排除单向解锁、撤销、注销关系和其他用户的数据', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../backend/src/main/java/com/spacetime/common/mapper/AppRelationMatchMapper.java'), 'utf8')
  const sql = source.match(/@Select\("""([\s\S]*?)"""\)\s+Page<AppRelationMatch> selectMutualLikePage/)[1]
    .replace(/#\{(\w+)\}/g, '$$$1')
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`
      CREATE TABLE app_relation_match (id INTEGER, user_low_id INTEGER, user_high_id INTEGER, match_status TEXT, active_marker INTEGER, deleted INTEGER, matched_time TEXT);
      CREATE TABLE app_relation_match_source (match_id INTEGER, source_type TEXT, source_status TEXT, deleted INTEGER);
      INSERT INTO app_relation_match VALUES
        (1,7,8,'matched',1,0,'2026-10-09'), (2,7,9,'matched',1,0,'2026-10-09'),
        (3,7,10,'matched',1,0,'2026-10-09'), (4,80,81,'matched',1,0,'2026-10-09'),
        (5,7,11,'matched',1,1,'2026-10-09'), (6,7,12,'invalid',NULL,0,'2026-10-09'),
        (7,7,13,'matched',1,0,'2026-10-09'), (8,7,14,'matched',1,0,'2026-10-09');
      INSERT INTO app_relation_match_source VALUES
        (1,'ideal_unlock','active',0), (2,'double_like','active',0),
        (3,'double_like','revoked',0), (4,'double_like','active',0),
        (5,'double_like','active',0), (6,'double_like','active',0),
        (7,'double_like','active',1), (8,'ideal_unlock','active',0), (8,'double_like','active',0);
    `)
    const rows = db.prepare(sql).all({ userId: 7, matchStatus: 'matched', sourceType: 'double_like', sourceStatus: 'active' })
    assert.deepEqual(rows.map(row => row.id), [8, 2])
  } finally {
    db.close()
  }
})
