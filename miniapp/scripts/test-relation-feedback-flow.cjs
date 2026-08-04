/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const miniappRoot = path.resolve(__dirname, '..')
const domainPath = path.join(miniappRoot, 'src/domain/relationFeedbackFlow.ts')

function read(relativePath) {
  return fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
}

async function loadDomainModule() {
  assert.ok(fs.existsSync(domainPath), '缺少关系反馈领域状态机')
  const source = fs.readFileSync(domainPath, 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('展示状态是强身份字段的唯一可见依据', async () => {
  const { isIdentityVisible } = await loadDomainModule()

  assert.equal(isIdentityVisible('clear'), true)
  assert.equal(isIdentityVisible('blur'), false)
  assert.equal(isIdentityVisible(undefined), false)
})

test('关系徽标在 0 时隐藏，超过 99 时显示 99+', async () => {
  const { formatRelationBadge } = await loadDomainModule()

  assert.equal(formatRelationBadge(0), '')
  assert.equal(formatRelationBadge(-1), '')
  assert.equal(formatRelationBadge(9), '9')
  assert.equal(formatRelationBadge(99), '99')
  assert.equal(formatRelationBadge(100), '99+')
})

test('同一报价重试复用 requestId，新报价生成新 requestId', async () => {
  const { ensureUnlockAttempt } = await loadDomainModule()
  const ids = ['request-1', 'request-2']
  const createId = () => ids.shift()

  const first = ensureUnlockAttempt(undefined, 'quote-a', createId)
  const retry = ensureUnlockAttempt(first, 'quote-a', createId)
  const nextQuote = ensureUnlockAttempt(first, 'quote-b', createId)

  assert.equal(first.requestId, 'request-1')
  assert.strictEqual(retry, first)
  assert.equal(nextQuote.requestId, 'request-2')
})

test('测试 API 只能显式切到本地回环地址', async () => {
  const { resolveRelationApiBaseUrl } = await loadDomainModule()
  const production = 'https://admin.shikongxiehou.com/api'

  assert.equal(resolveRelationApiBaseUrl(production, 'false', 'http://127.0.0.1:19090/api'), production)
  assert.equal(resolveRelationApiBaseUrl(production, 'true', 'https://example.com/api'), production)
  assert.equal(resolveRelationApiBaseUrl(production, 'true', 'http://127.0.0.1:19090/api'), 'http://127.0.0.1:19090/api')
  assert.equal(resolveRelationApiBaseUrl(production, 'true', 'http://localhost:19090/api/'), 'http://localhost:19090/api')
})

test('访客分组顺序固定为今天、昨天和更早', async () => {
  const { groupRecentVisitors } = await loadDomainModule()
  const records = [
    { recordNo: 'older', groupKey: 'recent7d' },
    { recordNo: 'today', groupKey: 'today' },
    { recordNo: 'yesterday', groupKey: 'yesterday' },
  ]

  assert.deepEqual(
    groupRecentVisitors(records).map(group => [group.key, group.records.map(item => item.recordNo)]),
    [
      ['today', ['today']],
      ['yesterday', ['yesterday']],
      ['earlier', ['older']],
    ],
  )
})

test('页面源码不得保留假数据、URL 会员覆盖或文案猜错误码', () => {
  const community = read('src/pages/community/index.tsx')
  const mutual = read('src/pages/heart/mutual.tsx')
  const request = read('src/services/request.ts')
  const config = read('src/constants/config.ts')
  const taroConfig = read('config/index.ts')

  assert.doesNotMatch(community, /fallbackLikes|fallbackVisitors|router\.params\.member/)
  assert.doesNotMatch(community, /\/(余额|5001)\//)
  assert.doesNotMatch(community, /只看ta\(100|解锁全部访客/)
  assert.doesNotMatch(mutual, /fallbackPeople|相互喜欢\(4人\)/)
  assert.match(request, /class ApiBusinessError/)
  assert.match(request, /code = code/)
  assert.match(config, /resolveRelationApiBaseUrl/)
  assert.match(taroConfig, /'process\.env\.MINIAPP_E2E_MODE'/)
  assert.match(taroConfig, /'process\.env\.MINIAPP_E2E_API_BASE_URL'/)
})

test('匹配弹窗必须先确认回执再关闭或跳转', () => {
  const community = read('src/pages/community/index.tsx')

  assert.match(community, /await markMatchPopupRead/)
  assert.match(community, /setMatchPopup\(null\)/)
  assert.doesNotMatch(community, /setMatchPopup\(null\)[\s\S]{0,180}markMatchPopupRead/)
})

test('公开资料必须成功加载后才上报访问', () => {
  const userPage = read('src/pages/heart/user.tsx')

  assert.match(userPage, /getPublicProfile/)
  assert.match(userPage, /await reportRelationVisit/)
  assert.match(userPage, /setProfile/)
  assert.doesNotMatch(userPage, /visitReported\.current = true[\s\S]{0,160}getPublicProfile/)
})

test('列表翻页使用同步防重锁，连续点击不得重复请求同一页', () => {
  const community = read('src/pages/community/index.tsx')
  const mutual = read('src/pages/heart/mutual.tsx')

  assert.match(community, /likesLoadingRef\.current/)
  assert.match(community, /visitorsLoadingRef\.current/)
  assert.match(mutual, /loadingMoreRef\.current/)
})
