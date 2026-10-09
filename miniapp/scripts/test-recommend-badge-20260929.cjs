const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

test('推荐角标显示去重后的实际未浏览人数，受剩余额度限制', async () => {
  const domainPath = path.join(root, 'src/domain/recommendBadge.js')
  assert.ok(fs.existsSync(domainPath), '缺少推荐角标的统一计算规则')
  const source = fs.readFileSync(domainPath, 'utf8')
  const { resolveRecommendBadgeCount } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )

  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: 10, items: [] }), 0)
  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: 10, items: [{ candidateNo: '1' }] }), 1)
  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: 1, items: [{ candidateNo: '1' }, { candidateNo: '2' }] }), 1)
  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: null, items: [{ candidateNo: '1' }, { candidateNo: '1' }, { candidateNo: '2' }] }), 2)
  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: 0, items: [{}] }), 0)
  assert.equal(resolveRecommendBadgeCount(null), 0)

})

async function loadBadgeDomain() {
  const source = fs.readFileSync(path.join(root, 'src/domain/recommendBadge.js'), 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('切页刷新合并请求且网络失败保留最近一次推荐数字', async () => {
  const { createRecommendBadgeRuntime } = await loadBadgeDomain()
  assert.equal(typeof createRecommendBadgeRuntime, 'function', '推荐数字缺少跨页面共享运行态')
  let requests = 0
  let rejectRequest
  const runtime = createRecommendBadgeRuntime({
    fetchPage: () => {
      requests += 1
      return new Promise((_, reject) => { rejectRequest = reject })
    },
    now: () => 100000,
  })
  runtime.publishPage(7, { remainingBrowseCount: 8, items: [{ candidateNo: '1' }, { candidateNo: '2' }] })
  const first = runtime.refresh(7, true)
  const second = runtime.refresh(7, true)
  assert.equal(requests, 1)
  assert.equal(runtime.getSnapshot().count, 2)
  rejectRequest(new Error('短暂网络失败'))
  await Promise.all([first, second])
  assert.equal(runtime.getSnapshot().count, 2)
})

test('旧角标响应不覆盖浏览扣减结果，切换账号清空旧账号数字', async () => {
  const { createRecommendBadgeRuntime } = await loadBadgeDomain()
  assert.equal(typeof createRecommendBadgeRuntime, 'function')
  let resolveRequest
  const runtime = createRecommendBadgeRuntime({
    fetchPage: () => new Promise(resolve => { resolveRequest = resolve }),
    now: () => 100000,
  })
  const pending = runtime.refresh(7)
  runtime.publishPage(7, { remainingBrowseCount: 7, items: [{}] })
  resolveRequest({ remainingBrowseCount: 9, items: [{}] })
  await pending
  assert.equal(runtime.getSnapshot().count, 1)
  runtime.refresh(8)
  assert.equal(runtime.getSnapshot().ownerId, 8)
  assert.equal(runtime.getSnapshot().count, 0)
  runtime.reset()
  resolveRequest({ remainingBrowseCount: 9, items: [{}] })
  await Promise.resolve()
  assert.equal(runtime.getSnapshot().count, 0)
})

test('跨页和空扫描页收齐真实候选并去重', async () => {
  const { collectRecommendCandidatePages, resolveRecommendBadgeCount } = await loadBadgeDomain()
  const calls = []
  const pages = {
    first: { items: [{ candidateNo: '1' }], nextCursor: 'empty' },
    empty: { items: [], nextCursor: 'last' },
    last: { items: [{ candidateNo: '1' }, { candidateNo: '2' }], nextCursor: null },
  }
  const page = await collectRecommendCandidatePages(async cursor => {
    calls.push(cursor)
    return { ...pages[cursor || 'first'], remainingBrowseCount: 10 }
  })
  assert.deepEqual(calls, [undefined, 'empty', 'last'])
  assert.equal(resolveRecommendBadgeCount(page), 2)
  assert.equal(page.nextCursor, null)
})

test('收齐额度内候选后停止翻页，额度为零不继续查询', async () => {
  const { collectRecommendCandidatePages } = await loadBadgeDomain()
  let calls = 0
  const fetchPage = async () => {
    calls++
    return { items: [{ candidateNo: '1' }, { candidateNo: '2' }], nextCursor: 'next', remainingBrowseCount: 1 }
  }
  assert.equal((await collectRecommendCandidatePages(fetchPage)).items.length, 1)
  assert.equal(calls, 1)
  assert.equal((await collectRecommendCandidatePages(async () => ({ items: [], nextCursor: 'next', remainingBrowseCount: 0 }))).items.length, 0)
})

test('浏览成功按实际人数扣减，重复或不存在的候选不重复扣减', async () => {
  const { applyRecommendViewToPage, resolveRecommendBadgeCount } = await loadBadgeDomain()
  const page = { items: [{ candidateNo: '1' }, { candidateNo: '2' }], remainingBrowseCount: 10 }
  const viewed = applyRecommendViewToPage(page, '1')
  assert.equal(resolveRecommendBadgeCount(viewed), 1)
  assert.equal(viewed.remainingBrowseCount, 9)
  assert.equal(applyRecommendViewToPage(viewed, '1'), viewed)
  assert.equal(applyRecommendViewToPage(viewed, 'missing'), viewed)
  assert.equal(resolveRecommendBadgeCount(applyRecommendViewToPage(viewed, '2')), 0)
  assert.equal(resolveRecommendBadgeCount(applyRecommendViewToPage({ ...page, remainingBrowseCount: null }, '1')), 1)
})

test('重复游标、筛选版本变化、周期变化和分页失败拒绝不完整数字', async () => {
  const { collectRecommendCandidatePages, createRecommendBadgeRuntime } = await loadBadgeDomain()
  const first = { items: [], nextCursor: 'next', remainingBrowseCount: 10, preferenceVersion: 1, nextResetAt: '2026-10-10 12:00:00' }
  await assert.rejects(collectRecommendCandidatePages(async () => first), /获取失败/)
  for (const changes of [{ preferenceVersion: 2 }, { nextResetAt: '2026-10-11 12:00:00' }]) {
    await assert.rejects(collectRecommendCandidatePages(async cursor => cursor ? { ...first, ...changes } : first), /条件已变化/)
  }
  const runtime = createRecommendBadgeRuntime({ fetchPage: () => collectRecommendCandidatePages(async cursor => {
    if (cursor) throw new Error('分页失败')
    return first
  }), now: () => 100000 })
  runtime.publishPage(7, { items: [{ candidateNo: '1' }], remainingBrowseCount: 10 })
  await runtime.refresh(7, true)
  assert.equal(runtime.getSnapshot().count, 1)
})
