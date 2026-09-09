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
