const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const sqlPath = path.join(
  root,
  'deploy/sql/ops/2026-08-12-seed-recommend-qianxun-heart-rich-data.sql'
)

test('丰富数据脚本存在且只通过手机号定位验收账号', () => {
  assert.equal(fs.existsSync(sqlPath), true, '缺少推荐/千寻/心动丰富数据脚本')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  assert.match(sql, /phone\s*=\s*'17366629764'/, '必须通过手机号定位目标账号')
  assert.match(sql, /SIGNAL SQLSTATE '45000'/, '目标账号不存在时必须停止执行')
  assert.doesNotMatch(sql, /TARGET_USER_ID\s*=\s*\d+/i, '不得写死目标用户主键')
})

test('脚本以事务和固定种子标识保证可重复执行', () => {
  const sql = fs.readFileSync(sqlPath, 'utf8')
  assert.match(sql, /START TRANSACTION;/)
  assert.match(sql, /COMMIT;/)
  assert.match(sql, /RICH-QX-USER-01/)
  assert.match(sql, /ON DUPLICATE KEY UPDATE/)
  assert.doesNotMatch(sql, /DELETE\s+FROM/i, '丰富数据脚本不得删除既有业务数据')
  assert.doesNotMatch(sql, /TRUNCATE\s+/i, '丰富数据脚本不得清空业务表')
})

test('推荐和理想型至少准备 12 名完整候选以及三天回看和筛选快照', () => {
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const users = new Set(sql.match(/RICH-QX-USER-\d{2}/g) || [])
  assert.ok(users.size >= 12, `候选用户不足 12 名，当前 ${users.size}`)
  for (const certification of ['REAL_NAME', 'AVATAR', 'EDUCATION']) {
    assert.match(sql, new RegExp(`'${certification}'`), `候选缺少 ${certification} 认证`)
  }
  assert.match(sql, /ct_recommend_view_log/, '必须准备三天回看数据')
  assert.match(sql, /ct_ideal_filter_snapshot/, '必须准备理想型筛选记录')
  assert.match(sql, /ct_ideal_snapshot_candidate/, '必须准备理想型候选快照')
})

test('千寻至少准备 12 条图文动态、24 条评论回复和多图素材', () => {
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const posts = new Set(sql.match(/RICH-QX-POST-\d{2}/g) || [])
  assert.match(sql, /RICH-QX-COMMENT-01 至 RICH-QX-COMMENT-24/, '必须登记 24 条评论/回复种子')
  const images = new Set(
    sql.match(/https:\/\/shikongxiehou\.oss-cn-shanghai\.aliyuncs\.com\/community\/demo\/[^'"\s]+/g) || []
  )
  assert.ok(posts.size >= 12, `千寻动态不足 12 条，当前 ${posts.size}`)
  assert.ok(images.size >= 10, `社区图片不足 10 张，当前 ${images.size}`)
  assert.match(sql, /community_like/, '必须准备动态点赞')
  assert.match(sql, /community_comment_like/, '必须准备评论点赞')
})

test('心动覆盖喜欢我的、我喜欢的、访客和互相心动', () => {
  const sql = fs.readFileSync(sqlPath, 'utf8')
  for (const marker of [
    'RICH-QX-LIKE-IN-',
    'RICH-QX-LIKE-OUT-',
    'RICH-QX-VISIT-',
    'RICH-QX-MATCH-',
  ]) {
    assert.match(sql, new RegExp(marker), `心动数据缺少 ${marker}`)
  }
  assert.match(sql, /app_relation_like/)
  assert.match(sql, /app_relation_visit/)
  assert.match(sql, /app_relation_match/)
})

test('脚本末尾提供各模块执行后数量核验', () => {
  const sql = fs.readFileSync(sqlPath, 'utf8')
  for (const label of [
    'recommend_candidates',
    'recommend_replay',
    'qianxun_posts',
    'qianxun_comments',
    'heart_incoming_likes',
    'heart_outgoing_likes',
    'heart_visitors',
    'heart_matches',
  ]) {
    assert.match(sql, new RegExp(`'${label}'`), `缺少 ${label} 核验查询`)
  }
})
