const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

async function importSource(relativePath) {
  const source = read(relativePath)
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('只有当前仍展示的访客游标成功后才可清零角标', async () => {
  const domain = await importSource('src/domain/relationVisitorBadge.js')

  assert.equal(typeof domain.shouldApplyVisitorReadResult, 'function')
  assert.equal(domain.shouldApplyVisitorReadResult('cursor-b', 'cursor-b'), true)
  assert.equal(domain.shouldApplyVisitorReadResult('cursor-b', 'cursor-a'), false)
  assert.equal(domain.shouldApplyVisitorReadResult(null, 'cursor-a'), false)

  const community = read('src/pages/community/index.tsx')
  assert.match(community, /shouldApplyVisitorReadResult/, '异步确认结果必须经过当前展示游标校验')
})

test('最近访客翻页沿用第一页快照且不会替换可确认游标', () => {
  const relation = read('src/services/relation.ts')
  const community = read('src/pages/community/index.tsx')

  assert.match(relation, /getRecentViewersPage\([^)]*snapshotCursor\?/, '访客列表接口缺少可选快照游标')
  assert.match(community, /visitorSnapshotCursorRef/, '页面缺少第一页访客快照引用')
  assert.match(community, /getRecentViewersPage\(\s*page,\s*20,\s*page\s*>\s*1\s*\?\s*visitorSnapshotCursorRef\.current/, '后续页没有沿用第一页快照')
  assert.match(community, /if\s*\(page\s*===\s*1\)[\s\S]{0,420}setVisitorsPage\(pageData\)/, '只有第一页可以替换已读确认上下文')
})
