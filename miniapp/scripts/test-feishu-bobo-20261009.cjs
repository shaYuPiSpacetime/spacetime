const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '../src')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

function evaluateSnippet(source, deps, expression) {
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
  return Function(...Object.keys(deps), `${output}; return ${expression}`)(...Object.values(deps))
}

function findNode(node, id) {
  if (!node || typeof node !== 'object') return undefined
  if (node.props?.id === id) return node
  const children = node.props?.children
  for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
    const found = findNode(child, id)
    if (found) return found
  }
}

function createTabBar(Taro) {
  const output = ts.transpileModule(read('components/AppTabBar/index.tsx'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports = {}
  const jsx = (type, props) => ({ type, props })
  const requireMock = name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
    if (name === 'react') return { useEffect: () => {} }
    if (name === '@tarojs/taro') return { default: Taro, useDidShow: () => {} }
    if (name === '@tarojs/components') return { View: 'View', Text: 'Text', Image: 'Image' }
    if (name.includes('authStore')) return { useAuthStore: selector => selector({ userId: 7, isLoggedIn: false }) }
    if (name.includes('messageRuntimeStore')) return { useMessageRuntimeStore: selector => selector({ unreadSummary: { messageUnreadCount: 0 } }) }
    if (name.includes('recommendBadgeStore')) return { useRecommendBadgeStore: () => ({ count: 0 }), refreshRecommendBadge: () => {} }
    if (name.includes('messageRuntime')) return { formatMessageBadge: () => '' }
    return { default: 'icon' }
  }
  Function('require', 'exports', output)(requireMock, exports)
  return () => exports.default({ active: 'profile' })
}

function loadNavigation(Taro) {
  const output = ts.transpileModule(read('utils/navigation.ts'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
  const exports = {}
  Function('require', 'exports', output)(() => ({ default: Taro }), exports)
  return exports
}

test('N-01: 同一入口并发点击只入栈一次，导航结束后重复当前主页也不入栈', async () => {
  let finish
  let pages = [{ route: 'pages/message/private-chat' }]
  let calls = 0
  const nav = loadNavigation({
    getCurrentPages: () => pages,
    navigateTo: () => { calls++; return new Promise(resolve => { finish = resolve }) },
    redirectTo: async () => assert.fail('成功导航无需兜底'),
  })
  const url = '/pages/heart/user?targetUserId=42&sourceScene=profile'
  const first = nav.navigateToOrRedirect(url)
  const second = nav.navigateToOrRedirect(url)
  assert.equal(calls, 1)
  pages = [{ route: 'pages/heart/user', options: { targetUserId: '42', sourceScene: 'profile' } }]
  finish()
  await Promise.all([first, second])
  await nav.navigateToOrRedirect(url)
  assert.equal(calls, 1)
})

test('N-01: 失败释放导航锁，可再次打开不同目标', async () => {
  let redirects = 0
  let calls = 0
  const nav = loadNavigation({
    getCurrentPages: () => [{ route: 'pages/message/private-chat' }],
    navigateTo: async () => { if (++calls === 1) throw Error('页面栈已满') },
    redirectTo: async () => { redirects++ },
  })
  await nav.navigateToOrRedirect('/pages/heart/user?targetUserId=42')
  await nav.navigateToOrRedirect('/pages/heart/user?targetUserId=43')
  assert.equal(calls, 2)
  assert.equal(redirects, 1)
})

test('N-01: 等待页两个往日推荐入口使用同一防重复导航', async () => {
  const source = read('pages/prd08/recommend/waiting/index.tsx')
  const handlers = [...source.matchAll(/onClick=\{\(\) => void navigateToOrRedirect\('([^']+)'\)\}/g)]
    .filter(match => match[1] === '/pages/prd08/recommend/replay/index')
  assert.equal(handlers.length, 2)
  let calls = 0
  let finish
  const nav = loadNavigation({
    getCurrentPages: () => [{ route: 'pages/prd08/recommend/waiting/index' }],
    navigateTo: () => { calls++; return new Promise(resolve => { finish = resolve }) },
  })
  const tasks = handlers.map(match => nav.navigateToOrRedirect(match[1]))
  assert.equal(calls, 1)
  finish()
  await Promise.all(tasks)
})

test('N-01: 微信回退同时返回 fail 和 rejected promise 时只兜底一次', async () => {
  let redirects = 0
  const nav = loadNavigation({
    getCurrentPages: () => [{ route: 'pages/profile/index' }, { route: 'pages/profile-edit/tags' }],
    navigateBack: options => { options.fail?.(); return Promise.reject(Error('返回失败')) },
    redirectTo: async () => { redirects++ },
    navigateTo: async () => { redirects++ },
  })
  await nav.navigateBackOrRedirect()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(redirects, 1)
})

test('R-01: 取消喜欢成功仅从我喜欢列表来源返回，失败不返回', async () => {
  const source = read('pages/heart/user.tsx')
  const start = source.indexOf('  const toggleLike =')
  const end = source.indexOf('  const openConversation =', start)
  const snippet = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText
  for (const [fromMyLikes, fails, expected] of [[true, false, 1], [false, false, 0], [true, true, 0]]) {
    let backs = 0
    const deps = {
      profile: { matched: true }, likeSubmitting: false, liked: true, targetUserId: 42,
      sourceScene: 'profile', returnAfterUnlike: fromMyLikes,
      router: { params: { from: fromMyLikes ? 'my-likes' : undefined } },
      setLikeSubmitting: () => {}, setLiked: () => {}, setProfile: () => {},
      likeRequestId: { current: null },
      cancelRelationLike: async () => { if (fails) throw Error('网络错误'); return { matched: true, canEnterConversation: true } },
      getApiErrorCode: () => undefined,
      goBack: () => { backs++ },
      Taro: { showModal: async () => ({ confirm: true }), showToast: async () => {}, setStorageSync: () => {}, navigateBack: async () => { backs++ } },
    }
    await Function(...Object.keys(deps), `${snippet}; return toggleLike()`)(...Object.values(deps))
    assert.equal(backs, expected)
  }
})

test('I-01: 换一批只请求当前快照的下一游标且替换结果', async () => {
  const source = read('components/IdealResultsContent/index.tsx')
  const start = source.indexOf('  const changeBatch =')
  const end = source.indexOf('  const refreshResults =', start)
  assert.ok(start >= 0 && end > start)
  const snippet = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText
  const calls = []
  const deps = {
    page: { nextCursor: 'next-20' }, loading: false, loadingMore: false, resolvingSnapshot: false,
    load: async (...args) => calls.push(args),
    Taro: { showToast: async () => {}, redirectTo: () => assert.fail('不能重新筛选') },
  }
  await Function(...Object.keys(deps), `${snippet}; return changeBatch()`)(...Object.values(deps))
  assert.deepEqual(calls, [['next-20', false]])
})

test('N-02: 旧 Tab 成功回调不能解除后一次切换的锁', () => {
  let route = 'pages/profile/index'
  const calls = []
  const render = createTabBar({ getCurrentPages: () => [{ route }], switchTab: options => calls.push(options), eventCenter: { trigger: () => {} } })
  findNode(render(), 'app-tab-chat').props.onClick()
  route = 'pages/chat/index'
  findNode(render(), 'app-tab-community').props.onClick()
  calls[0].success()
  findNode(render(), 'app-tab-community').props.onClick()
  assert.equal(calls.length, 2)
  calls[1].success()
})

test('N-03: 在心动页重选底栏心动只触发重选事件', () => {
  const events = []
  const render = createTabBar({
    getCurrentPages: () => [{ route: 'pages/community/index' }],
    switchTab: () => assert.fail('不能重复切换同一个 Tab'),
    eventCenter: { trigger: event => events.push(event) },
  })
  findNode(render(), 'app-tab-community').props.onClick()
  assert.deepEqual(events, ['heartTabReselect'])
})

test('N-02: 等待页重选推荐不切回主路由再重新入栈', () => {
  const render = createTabBar({
    getCurrentPages: () => [{ route: 'pages/prd08/recommend/waiting/index' }],
    switchTab: () => assert.fail('等待页应保留当前推荐状态'),
  })
  findNode(render(), 'app-tab-recommend').props.onClick()
})

test('N-04: 等待页切理想型立即废弃旧刷新且连续点击只切一次', async () => {
  const source = read('pages/prd08/recommend/waiting/index.tsx')
  const start = source.indexOf('  const openIdeal =')
  const snippet = source.slice(start, source.indexOf('  return (', start))
  let finish
  let calls = 0
  const generation = { current: 1 }
  const deps = {
    openingIdealRef: { current: false }, refreshGeneration: generation,
    RECOMMEND_TAB_STORAGE_KEY: 'prd08RecommendTab', refreshRecommendation: async () => {},
    Taro: { setStorageSync: () => {}, showToast: async () => {}, switchTab: () => { calls++; return new Promise(resolve => { finish = resolve }) } },
  }
  const open = evaluateSnippet(snippet, deps, 'openIdeal')
  const first = open()
  const second = open()
  assert.equal(generation.current, 2)
  assert.equal(calls, 1)
  finish()
  await Promise.all([first, second])
})

test('N-04: 页面重新创建保留理想型，显式推荐入口优先于缓存', () => {
  const source = read('pages/recommend/index.tsx')
  const snippet = source.slice(source.indexOf('  const [activeTab,'), source.indexOf('  const [page,'))
  for (const [tab, cached, expected] of [[undefined, 'ideal', 'ideal'], ['recommend', 'ideal', 'recommend'], ['ideal', '', 'ideal'], [undefined, '', 'recommend']]) {
    const actual = evaluateSnippet(snippet, { router: { params: { tab } }, Taro: { getStorageSync: () => cached }, useState: init => [typeof init === 'function' ? init() : init, () => {}] }, 'activeTab')
    assert.equal(actual, expected)
  }
})

test('N-05: 无刷新标记的页面重显保留候选，到新周期才重取', () => {
  const source = read('pages/recommend/index.tsx')
  const start = source.indexOf('  useDidShow(')
  const snippet = source.slice(start, source.indexOf('  usePullDownRefresh(', start))
  for (const expired of [false, true]) {
    let show
    let loads = 0
    evaluateSnippet(snippet, {
      useDidShow: handler => { show = handler },
      useDidHide: () => {}, pageVisibleRef: { current: true }, setPageVisible: () => {},
      Taro: { getStorageSync: () => undefined, removeStorageSync: () => {} },
      RECOMMEND_TAB_STORAGE_KEY: 'tab', RECOMMEND_PREFERENCE_REFRESH_STORAGE_KEY: 'preference',
      RECOMMEND_REFRESH_STORAGE_KEY: 'refresh', RECOMMEND_EXHAUSTED_CYCLE_STORAGE_KEY: 'exhausted',
      initialIdealTabHandled: { current: true }, router: { params: {} }, activeTabRef: { current: 'recommend' },
      setActiveTab: () => {}, loadIdealTab: () => {}, page: { items: [{ candidateNo: 'CURRENT' }] },
      hasRecommendCycleExpired: () => expired, shouldShowRecommendWaiting: () => false,
      retryCandidateCursorRef: { current: null }, loadCandidates: () => { loads++ },
      openWaitingPage: () => assert.fail('当前有候选时不跳等待页'),
    }, 'undefined')
    show()
    assert.equal(loads, expired ? 1 : 0)
  }
})

test('I-04: 拉黑、解锁过期与账号不可访问显示不同原因且不允许进入主页', () => {
  const source = read('pages/prd08/ideal/unlocks/index.tsx')
  const start = source.indexOf('function UnlockCard(')
  const output = ts.transpileModule(source.slice(start), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const jsx = (type, props) => ({ type, props })
  const card = Function('require', 'exports', 'View', 'Text', 'Image', 'formatTime', 'Taro', `${output};return UnlockCard`)(
    () => ({ jsx, jsxs: jsx }), {}, 'View', 'Text', 'Image', () => '', { navigateTo: () => assert.fail('不可访问项不能跳转') },
  )
  for (const [reason, expected] of [['blocked', '存在拉黑关系，暂不可查看'], ['unlock_inactive', '解锁已过期或退还'], ['account_unavailable', '该用户当前不可访问']]) {
    const tree = card({ item: { available: false, unavailableReason: reason } })
    assert.ok(JSON.stringify(tree).includes(expected))
    assert.ok(!JSON.stringify(tree).includes('已失效用户'))
  }
})

test('R-03: 付费解锁或未知来源的匹配弹窗不能冒称相互喜欢', () => {
  const source = read('pages/community/index.tsx')
  const start = source.indexOf('function MatchPopupSheet(')
  const output = ts.transpileModule(source.slice(start), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const jsx = (type, props) => ({ type, props })
  const sheet = Function('require', 'exports', 'View', 'Text', 'Image', 'personImage', `${output};return MatchPopupSheet`)(
    () => ({ jsx, jsxs: jsx }), {}, 'View', 'Text', 'Image', 'avatar',
  )
  for (const [mutualLiked, expected] of [[false, '你已与嘉宾建立匹配'], [undefined, '你已与嘉宾建立匹配'], [true, '你和嘉宾互相喜欢了']]) {
    const tree = sheet({ popup: { nickname: '嘉宾', matchSource: 'ideal_unlock', mutualLiked }, submitting: false, onAction: () => {} })
    assert.ok(JSON.stringify(tree).includes(expected))
  }
})

test('S-01: 每次回到隐私设置重取注销状态，旧响应不能盖回冷静期', async () => {
  const source = read('pages/settings/privacy.tsx')
  const start = source.indexOf('  useDidShow(')
  const snippet = source.slice(start, source.indexOf('  async function loadBlacklist', start))
  let callback
  let oldReply
  let calls = 0
  let status
  evaluateSnippet(snippet, {
    useDidShow: handler => { callback = handler }, statusRequestRef: { current: 0 }, setLoading: () => {},
    settingsApi: { cancelStatus: () => ++calls === 1 ? new Promise(resolve => { oldReply = resolve }) : Promise.resolve({ status: 'RESTORED' }) },
    setStatus: value => { status = value }, loadBlacklist: async () => {}, Taro: { showToast: async () => {} },
  }, 'undefined')
  callback()
  callback()
  await new Promise(resolve => setImmediate(resolve))
  oldReply({ status: 'COOLING_OFF' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls, 2)
  assert.equal(status.status, 'RESTORED')
})

test('C-01: 他人话题动态打开可原生分享的面板，分享目标保留所选动态', async () => {
  const source = read('pages/qianxun/topic.tsx')
  const start = source.indexOf('  const openPostActions =')
  let selected
  const handler = evaluateSnippet(source.slice(start, source.indexOf('  const manageSelectedPost =', start)), {
    setSelectedOwnPost: post => { selected = post },
  }, 'openPostActions')
  await handler({ id: 42, authorId: 9, content: '所选动态' })
  let share
  const shareStart = source.indexOf('  useShareAppMessage(')
  evaluateSnippet(source.slice(shareStart, source.indexOf('  const loadTopic', shareStart)), {
    useShareAppMessage: callback => { share = callback }, selectedOwnPost: selected, topic: { name: '某话题' }, topicId: 1,
    shareMessage: value => value,
    postShare: post => ({ path: `/pages/qianxun/post-detail?id=${post.id}` }),
    topicShare: id => ({ path: `/pages/qianxun/topic?topicId=${id}` }),
  }, 'undefined')
  assert.equal(share({ from: 'button' }).path, '/pages/qianxun/post-detail?id=42')
  assert.equal(share({ from: 'menu' }).path, '/pages/qianxun/topic?topicId=1')
  assert.match(read('components/CommunityPostActionSheet.tsx'), /openType="share"/)
})

test('C-04: 服务端本人头像为空时不回填缓存的旧女性照片', () => {
  const source = read('pages/qianxun/interactions.tsx')
  const start = source.indexOf('  const profile: ProfileSummary =')
  const profile = evaluateSnippet(source.slice(start, source.indexOf('  const [loading', start)), {
    summary: { avatar: '', nickname: '本人' },
    auth: { avatar: 'https://cdn.test/stale-female.png' },
    resolveOwnAvatar: value => value, emptyProfile: {}, readNonNegativeNumber: value => Number(value || 0),
  }, 'profile')
  assert.equal(profile.avatar, '')
})
