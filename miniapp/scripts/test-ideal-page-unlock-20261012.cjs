const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('理想型每次只保留一页，上一页和下一页使用服务端游标', () => {
  const source = read('src/components/IdealResultsContent/index.tsx')
  assert.match(source, /setItems\(data\.items \|\| \[\]\)/)
  assert.doesNotMatch(source, /onScrollToLower|\.\.\.current,|changeBatch/)
  assert.match(source, /changePage\(-1\)/)
  assert.match(source, /changePage\(1\)/)
  assert.match(source, /pageCursors\.current\[nextPage - 1\]/)
  assert.match(source, /setSelection\(\{ snapshotNo, itemNos: \[\] \}\)/)
})

test('本页全部报价明确传入当前页范围，不使用整份快照人数', () => {
  const source = read('src/components/IdealResultsContent/index.tsx')
  assert.match(source, /quoteAllIdealUnlock\(snapshotNo, currentItemNos\)/)
  assert.match(source, /解锁本页/)
  assert.doesNotMatch(source, /page\?\.unlockableCount/)
  assert.match(read('src/services/ideal.ts'), /'\/miniapp\/ideal\/unlock-all\/quote', \{ snapshotNo, itemNos \}/)
})

test('分页报价与旧全量报价隔离，充值返回按当前页刷新', () => {
  const source = read('src/components/IdealResultsContent/index.tsx')
  assert.match(source, /prd08IdealPagePendingQuote/)
  assert.doesNotMatch(source, /'prd08IdealPendingQuote'/)
  assert.match(source, /load\(pageCursors\.current\[currentPageNumber\.current - 1\], currentPageNumber\.current\)/)
})
