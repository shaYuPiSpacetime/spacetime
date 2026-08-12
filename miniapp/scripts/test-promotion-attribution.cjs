/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const miniappRoot = path.resolve(__dirname, '..')
const domainPath = path.join(miniappRoot, 'src/domain/promotionAttribution.js')

async function loadDomainModule() {
  assert.ok(fs.existsSync(domainPath), '缺少推广归因领域层')
  const source = fs.readFileSync(domainPath, 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('优先解析 query 对象中的合法来源，并兼容页面 path 查询串', async () => {
  const { parsePromotionSource, resolveInviteShareTarget } = await loadDomainModule()

  assert.deepEqual(
    parsePromotionSource({
      sourceType: 'normal_user',
      sourceToken: 'TRC-1234567890abcdef',
    }),
    {
      sourceType: 'normal_user',
      sourceToken: 'TRC-1234567890abcdef',
    },
  )

  const target = resolveInviteShareTarget({
    title: '邀请好友',
    path: '/pages/promotion/invite-home?sourceType=campus_agent&sourceToken=path-token-123',
    link: 'https://example.com/invite',
    query: {
      sourceType: 'normal_user',
      sourceToken: 'TRC-query-token-123',
    },
  })

  assert.equal(target.source.sourceType, 'normal_user')
  assert.equal(target.source.sourceToken, 'TRC-query-token-123')
  assert.match(target.path, /sourceType=normal_user/)
  assert.match(target.path, /sourceToken=TRC-query-token-123/)
  assert.doesNotMatch(target.path, /path-token-123/)
  assert.match(target.link, /sourceType=normal_user/)
})

test('启动二维码 scene 支持 URL 编码，非法来源不会触发归因', async () => {
  const { parsePromotionSource } = await loadDomainModule()

  assert.deepEqual(
    parsePromotionSource({
      scene: encodeURIComponent('sourceType=campus_agent&sourceToken=agent-token-123'),
    }),
    {
      sourceType: 'campus_agent',
      sourceToken: 'agent-token-123',
    },
  )
  assert.equal(
    parsePromotionSource({
      sourceType: 'unknown',
      sourceToken: 'agent-token-123',
    }),
    undefined,
  )
  assert.equal(
    parsePromotionSource({
      sourceType: 'normal_user',
      sourceToken: '<script>alert(1)</script>',
    }),
    undefined,
  )
})

test('待提交 traceNo 去重、过滤非法值并仅保留最近十条', async () => {
  const { appendPendingTraceNo, normalizePendingTraceNos } = await loadDomainModule()

  assert.deepEqual(
    appendPendingTraceNo(
      ['TRC-a1234567', 'TRC-b1234567', 'TRC-a1234567', '', '<script>'],
      'TRC-c1234567',
    ),
    ['TRC-a1234567', 'TRC-b1234567', 'TRC-c1234567'],
  )

  const traces = Array.from({ length: 12 }, (_, index) => `TRC-${String(index).padStart(8, '0')}`)
  assert.deepEqual(normalizePendingTraceNos(traces), traces.slice(-10))
  assert.deepEqual(
    appendPendingTraceNo(['TRC-a1234567', 'TRC-b1234567'], 'TRC-a1234567'),
    ['TRC-b1234567', 'TRC-a1234567'],
  )
})

test('换 traceNo 失败时可安全持久化合法 raw source，重试成功后可精确移除', async () => {
  const {
    appendPendingSource,
    normalizePendingSources,
    removePendingSource,
  } = await loadDomainModule()

  const normalSource = {
    sourceType: 'normal_user',
    sourceToken: 'TRC-source-token-123',
  }
  const agentSource = {
    sourceType: 'campus_agent',
    sourceToken: 'agent-token-123',
  }
  assert.deepEqual(
    normalizePendingSources([
      normalSource,
      { sourceType: 'unknown', sourceToken: 'bad-token-123' },
      normalSource,
      agentSource,
    ]),
    [normalSource, agentSource],
  )
  assert.deepEqual(appendPendingSource([normalSource], agentSource), [normalSource, agentSource])
  assert.deepEqual(removePendingSource([normalSource, agentSource], normalSource), [agentSource])
})

test('推广归因等待受时间预算约束，不得长期阻塞登录请求', async () => {
  const { waitWithinBudget } = await loadDomainModule()
  let completed = false
  const pendingTask = new Promise(resolve => {
    setTimeout(() => {
      completed = true
      resolve('done')
    }, 80)
  })

  const startedAt = Date.now()
  const finishedInBudget = await waitWithinBudget(pendingTask, 20)
  const elapsed = Date.now() - startedAt

  assert.equal(finishedInBudget, false)
  assert.ok(elapsed < 70, `登录前归因等待超出预算：${elapsed}ms`)
  await pendingTask
  assert.equal(completed, true, '超时后归因任务仍应在后台完成')
})
