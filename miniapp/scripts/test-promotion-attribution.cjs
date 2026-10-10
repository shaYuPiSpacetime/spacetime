/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const miniappRoot = path.resolve(__dirname, '..')
const domainPath = path.join(miniappRoot, 'src/domain/promotionAttribution.js')
const read = relativePath => fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')

async function loadDomainModule() {
  assert.ok(fs.existsSync(domainPath), '缺少推广归因领域层')
  const source = fs.readFileSync(domainPath, 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('A-01 新邀请分享统一指向立即使用页并保留来源', async () => {
  const { resolveInviteShareTarget } = await loadDomainModule()
  for (const sharePath of [undefined, '/pages/promotion/invite-home', 'pages/promotion/invite-home', '/pages/profile/index']) {
    const target = resolveInviteShareTarget({
      path: sharePath,
      query: { sourceType: 'normal_user', sourceToken: 'fixture-source-123' },
    })
    assert.equal(target.path, '/pages/login/index?sourceType=normal_user&sourceToken=fixture-source-123')
  }
  assert.equal(resolveInviteShareTarget().path, '/pages/login/index')
})

async function mountInviteHome(params, token) {
  const ts = require('typescript')
  const vm = require('node:vm')
  const domain = await loadDomainModule()
  const effects = []
  const calls = []
  const taro = {
    ENV_TYPE: { WEAPP: 'WEAPP' },
    getEnv: () => 'WEAPP',
    getStorageSync: () => token,
    reLaunch: async value => { calls.push(['reLaunch', value.url]) },
    redirectTo: async value => { calls.push(['redirectTo', value.url]) },
    showShareMenu: async () => {},
    hideShareMenu: async () => {},
  }
  const mocks = {
    '@tarojs/taro': { default: taro, useRouter: () => ({ params }), useShareAppMessage: () => {} },
    '@tarojs/components': {},
    'react': {
      useState: initial => [initial, () => {}],
      useCallback: callback => callback,
      useMemo: callback => callback(),
      useEffect: callback => effects.push(callback),
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/constants/config': { TOKEN_KEY: 'test-token-key' },
    '@/utils/shareMessage': { shareMessage: value => value },
    '@/constants/ossIcons': { miniappOssIcons: {} },
    '@/domain/promotionAttribution': domain,
    '@/domain/promotionInvitePresentation': { displayedLadderStage: () => ({ ladders: [], max: 0, progress: 0 }) },
    '@/services/promotion': { getInviteHome: async () => { calls.push(['getInviteHome']); return {} } },
    '@/services/promotionAttribution': {
      capturePromotionSource: async (query, persist) => { calls.push(['capture', query, persist]) },
    },
    '@/stores/authStore': {
      useAuthStore: { getState: () => ({ isLoggedIn: Boolean(token), checkLogin: () => {} }) },
    },
    '@/components/NativeNavigation': {},
    '@/assets/lanhu/promotion/invite-empty.png': '',
    '@/assets/lanhu/promotion/invite-hero.png': '',
    './invite-home.scss': '',
  }
  const source = fs.readFileSync(path.join(miniappRoot, 'src/pages/promotion/invite-home.tsx'), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(mocks, name), `缺少页面依赖桩：${name}`)
      return mocks[name]
    },
  })
  const rendered = exports.default()
  effects.forEach(effect => effect())
  await new Promise(resolve => setImmediate(resolve))
  return { rendered, calls }
}

test('A-02/A-03/A-05 旧邀请入口忽略登录态，先采集来源再跳转且不请求邀请数据', async () => {
  for (const token of ['', 'fixture-cached-session']) {
    for (const params of [
      { sourceType: 'normal_user', sourceToken: 'fixture-source-123' },
      { scene: encodeURIComponent('sourceType=campus_agent&sourceToken=fixture-agent-123') },
      { sourceType: 'unknown', sourceToken: 'invalid' },
    ]) {
      const { rendered, calls } = await mountInviteHome(params, token)
      assert.equal(rendered, null, '邀请接收方不得显示邀请数据页')
      assert.deepEqual(calls, [
        ['capture', params, !token],
        ['reLaunch', '/pages/login/index'],
      ])
    }
  }
})

test('A-04 正常进入邀请页保留原有登录检查和数据加载', async () => {
  for (const token of ['', 'fixture-cached-session']) {
    const { rendered, calls } = await mountInviteHome({}, token)
    assert.notEqual(rendered, null)
    assert.deepEqual(calls, [
      ['capture', {}, !token],
      token ? ['getInviteHome'] : ['redirectTo', '/pages/login/index'],
    ])
  }
})

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
  assert.deepEqual(
    parsePromotionSource({ scene: '1a7f66e3d9654c81813f3b2b0dafdb45' }),
    {
      sourceType: 'campus_agent',
      sourceToken: '1a7f66e3d9654c81813f3b2b0dafdb45',
    },
    '微信小程序码的 32 位 scene 必须识别为校园代理来源',
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

test('邀请来源换号完成前不得放行注册请求', () => {
  const attribution = read('src/services/promotionAttribution.ts')
  const auth = read('src/services/auth.ts')

  assert.doesNotMatch(attribution, /maxWaitMs\s*=\s*150/, '不得再用 150ms 超时放弃注册归因')
  assert.match(attribution, /await Promise\.allSettled\(allTasks\)/, '登录前必须等待来源换号结束')
  assert.match(auth, /const attributionReady = await waitForPromotionAttributionCapture\(\)/)
  assert.match(auth, /if \(!attributionReady\)[\s\S]*邀请来源/, '换号失败时必须阻止无归因注册')
})

function mountWechatUsageAuth({ capture, post }) {
  const ts = require('typescript')
  const vm = require('node:vm')
  const calls = []
  const mocks = {
    './prd01': { prd01Api: {} },
    './promotionAttribution': {
      waitForPromotionAttributionCapture: capture,
      getPendingPromotionTraceNos: () => ['TRC-agent12345678'],
      clearPendingPromotionTraceNos: () => calls.push('clear'),
    },
    './request': {
      post: async (url, body) => {
        calls.push({ url, body })
        return post(body)
      },
    },
  }
  const compiled = ts.transpileModule(read('src/services/auth.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(mocks, name), `缺少服务依赖桩：${name}`)
      return mocks[name]
    },
  })
  return { resolveWechatUsage: exports.resolveWechatUsage, calls }
}

test('BUG0930-P0-04 立即使用等待来源换号并随首次建号请求提交，成功后清理', async () => {
  let finishCapture
  const captureTask = new Promise(resolve => { finishCapture = resolve })
  const expected = { provisionalLogin: { userId: 233 } }
  const auth = mountWechatUsageAuth({ capture: () => captureTask, post: async () => expected })
  const task = auth.resolveWechatUsage('usage-code')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(auth.calls.length, 0, '归因完成前不得发送建号请求')
  finishCapture(true)
  assert.equal(await task, expected)
  assert.equal(auth.calls[0].url, '/miniapp/auth/wechat-usage')
  assert.equal(auth.calls[0].body.loginCode, 'usage-code')
  assert.deepEqual(auth.calls[0].body.promotionTraceNos, ['TRC-agent12345678'])
  assert.equal(auth.calls[1], 'clear')
})

test('BUG0930-P1-05 来源换号失败时阻止立即使用建号并保留待重试来源', async () => {
  const auth = mountWechatUsageAuth({ capture: async () => false, post: async () => ({}) })
  await assert.rejects(auth.resolveWechatUsage('usage-code'), /邀请来源加载失败/)
  assert.equal(auth.calls.length, 0)
})

test('BUG0930-P1-06 立即使用建号请求失败时保留推广来源', async () => {
  const auth = mountWechatUsageAuth({
    capture: async () => true,
    post: async () => { throw new Error('网络请求失败') },
  })
  await assert.rejects(auth.resolveWechatUsage('usage-code'), /网络请求失败/)
  assert.equal(auth.calls.length, 1)
  assert.equal(auth.calls[0].body.promotionTraceNos[0], 'TRC-agent12345678')
})
