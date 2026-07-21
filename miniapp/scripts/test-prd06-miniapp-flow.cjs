const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const miniappRoot = path.resolve(__dirname, '..')
const flowPath = path.join(miniappRoot, 'src/domain/prd06Flow.js')

async function loadFlowModule() {
  assert.ok(fs.existsSync(flowPath), '缺少 PRD-06 小程序领域层')
  const source = fs.readFileSync(flowPath, 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('搜索来源场景只允许 global、community、recommend', async () => {
  const { normalizeSourceScene, searchTabsForScene } = await loadFlowModule()

  assert.equal(normalizeSourceScene('community'), 'community')
  assert.equal(normalizeSourceScene('recommend'), 'recommend')
  assert.equal(normalizeSourceScene('unknown'), 'global')
  assert.deepEqual(searchTabsForScene('global'), ['users', 'posts', 'topics'])
  assert.deepEqual(searchTabsForScene('community'), ['posts', 'topics'])
  assert.deepEqual(searchTabsForScene('recommend'), ['users'])
})

test('搜索历史按账号隔离、去重并只保留最近十条', async () => {
  const { searchHistoryStorageKey, pushSearchHistory } = await loadFlowModule()

  assert.equal(searchHistoryStorageKey('U100281'), 'prd06.search.history.U100281')
  assert.equal(searchHistoryStorageKey(''), 'prd06.search.history.guest')
  assert.deepEqual(
    pushSearchHistory(['旅行', '咖啡', ' 旅行 '], '  猫咪  '),
    ['猫咪', '旅行', '咖啡'],
  )
  assert.deepEqual(
    pushSearchHistory(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], '11'),
    ['11', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  )
})

test('空搜索词不发起请求，违规搜索不允许进入结果页', async () => {
  const { resolveSearchSubmission } = await loadFlowModule()

  assert.deepEqual(resolveSearchSubmission('   '), {
    allowed: false,
    keyword: '',
    reason: 'empty',
  })
  assert.deepEqual(resolveSearchSubmission(' 加微信 ', { blocked: true }), {
    allowed: false,
    keyword: '加微信',
    reason: 'blocked',
  })
  assert.deepEqual(resolveSearchSubmission(' 旅行 ', { blocked: false }), {
    allowed: true,
    keyword: '旅行',
    reason: '',
  })
})

test('合规内容优先使用 H5，缺失链接时回退原生正文', async () => {
  const { resolveCompliancePresentation } = await loadFlowModule()

  assert.deepEqual(
    resolveCompliancePresentation({
      contentCode: 'privacy_policy',
      title: '隐私政策',
      linkType: 'H5',
      contentUrl: 'https://example.com/privacy',
      contentBody: '原生兜底',
    }),
    {
      mode: 'h5',
      title: '隐私政策',
      url: 'https://example.com/privacy',
      body: '原生兜底',
      message: '',
    },
  )
  assert.equal(resolveCompliancePresentation({
    contentCode: 'privacy_policy',
    title: '隐私政策',
    linkType: 'H5',
    contentBody: '原生兜底',
  }).mode, 'native')
  assert.deepEqual(resolveCompliancePresentation(undefined), {
    mode: 'missing',
    title: '内容',
    url: '',
    body: '',
    message: '',
  })
})
