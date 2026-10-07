const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

test('没有可浏览候选时推荐角标必须清零，仍有候选时显示剩余额度', async () => {
  const domainPath = path.join(root, 'src/domain/recommendBadge.js')
  assert.ok(fs.existsSync(domainPath), '缺少推荐角标的统一计算规则')
  const source = fs.readFileSync(domainPath, 'utf8')
  const { resolveRecommendBadgeCount } = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )

  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: 10, items: [] }), 0)
  assert.equal(resolveRecommendBadgeCount({ remainingBrowseCount: 9, items: [{}] }), 9)
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
  runtime.publishPage(7, { remainingBrowseCount: 8, items: [{}] })
  const first = runtime.refresh(7, true)
  const second = runtime.refresh(7, true)
  assert.equal(requests, 1)
  assert.equal(runtime.getSnapshot().count, 8)
  rejectRequest(new Error('短暂网络失败'))
  await Promise.all([first, second])
  assert.equal(runtime.getSnapshot().count, 8)
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
  assert.equal(runtime.getSnapshot().count, 7)
  runtime.refresh(8)
  assert.equal(runtime.getSnapshot().ownerId, 8)
  assert.equal(runtime.getSnapshot().count, 0)
  runtime.reset()
  resolveRequest({ remainingBrowseCount: 9, items: [{}] })
  await Promise.resolve()
  assert.equal(runtime.getSnapshot().count, 0)
})
