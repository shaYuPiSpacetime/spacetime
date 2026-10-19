const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')
const { act } = React
const dom = new JSDOM('<html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true
const root = path.resolve(__dirname, '../src')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const compile = code => ts.transpileModule(code, { compilerOptions: {
  target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
function extract(file, start, end, deps, name) {
  const source = read(file), a = source.indexOf(start), b = source.indexOf(end, a)
  assert.ok(a >= 0 && b > a)
  return Function(...Object.keys(deps), `${compile(source.slice(a, b))};return ${name}`)(...Object.values(deps))
}

function tabPress(currentRoute) {
  const calls = [], storage = new Map([['prd08RecommendActiveTab', 'ideal'], ['prd08RecommendTab', 'ideal']])
  const Taro = { setStorageSync: (k, v) => storage.set(k, v), eventCenter: { trigger: name => calls.push(name) },
    switchTab: p => calls.push(p.url) }
  const handle = extract('components/AppTabBar/index.tsx', '  const handlePress =', '\n  return (', {
    Taro, getCurrentRoute: () => currentRoute, TABS: [{ key: 'index', path: '/pages/index/index' }], active: 'index',
    tabSwitchInFlight: false, tabSwitchSourceRoute: '', tabSwitchGeneration: 0,
    releaseTabSwitch() {}, updateActive: key => calls.push(key),
  }, 'handlePress')
  handle({ key: 'recommend', path: '/pages/recommend/index' })
  return { calls, storage }
}

test('冷启动推荐不读取旧理想型选中态，显式理想型路由仍可打开', () => {
  for (const params of [{}, { tab: 'ideal' }]) {
    const selected = extract('pages/recommend/index.tsx', '  const [activeTab, setActiveTab]', '  const [page, setPage]', {
      router: { params }, Taro: { getStorageSync: () => 'ideal' }, useState: fn => [fn(), () => {}],
    }, 'activeTab')
    assert.equal(selected, params.tab === 'ideal' ? 'ideal' : 'recommend')
  }
})

test('从其他页面点击底部推荐时，覆盖遗留的理想型请求', () => {
  const result = tabPress('pages/index/index')
  assert.equal(result.storage.get('prd08RecommendTab'), 'recommend')
  assert.ok(result.calls.includes('/pages/recommend/index'))
})

test('在理想型面板重选底部推荐时发出推荐重选事件', () => {
  const result = tabPress('pages/recommend/index')
  assert.ok(result.calls.includes('recommendTabReselect'))
  assert.ok(!result.calls.includes('/pages/recommend/index'))
})

test('推荐页消费显式入口请求，理想型子页返回不重置面板', () => {
  for (const requested of [undefined, 'recommend']) {
    const activeTabRef = { current: 'ideal' }
    let selected = 'ideal', removed = false
    const show = extract('pages/recommend/index.tsx', '  useDidShow(() => {', '  useDidHide(() => {', {
      useDidShow: fn => fn(), setActiveTabKey() {}, pageVisibleRef: {}, setPageVisible() {},
      Taro: { getStorageSync: key => key === 'prd08RecommendTab' ? requested : undefined,
        removeStorageSync: () => { removed = true } },
      RECOMMEND_TAB_STORAGE_KEY: 'prd08RecommendTab', initialIdealTabHandled: { current: true }, router: { params: {} },
      activeTabRef, setActiveTab: value => { selected = value }, RECOMMEND_PREFERENCE_REFRESH_STORAGE_KEY: 'preference',
      RECOMMEND_REFRESH_STORAGE_KEY: 'refresh', RECOMMEND_EXHAUSTED_CYCLE_STORAGE_KEY: 'exhausted',
      loadIdealTab() {}, page: {}, hasRecommendCycleExpired: () => false, shouldShowRecommendWaiting: () => false,
    }, 'activeTabRef.current')
    assert.equal(show, requested || 'ideal')
    assert.equal(selected, requested || 'ideal')
    assert.equal(removed, requested !== undefined)
  }
})

async function fixture(t, options = {}) {
  const calls = [], lifecycle = { show: [], hide: [] }, cache = new Map()
  const taro = { navigateTo: async p => calls.push(['navigate', p.url]), hideKeyboard: async () => {},
    showToast: async p => calls.push(['toast', p.title]), previewImage: async p => calls.push(['preview', p.current]),
    nextTick: fn => fn(), getWindowInfo: () => ({ windowWidth: 375 }),
    createSelectorQuery: () => { const q = { select: () => q, boundingClientRect: fn => { fn({ height: 20 }); return q }, exec() {} }; return q } }
  for (const [hook, event] of [['useDidShow', 'show'], ['useDidHide', 'hide']]) {
    taro[hook] = fn => { const ref = React.useRef(fn); ref.current = fn
      React.useEffect(() => { const run = () => ref.current(); lifecycle[event].push(run)
        return () => { lifecycle[event] = lifecycle[event].filter(x => x !== run) } }, []) }
  }
  const native = name => ({ children, onClick, style, ...props }) => React.createElement(name === 'Image' ? 'img' : 'div', {
    id: props.id, className: props.className, onClick, role: props.role, 'data-native': name,
    'data-visible': style?.visibility, 'data-role': props['data-role'],
  }, children)
  const components = Object.fromEntries(['View', 'Text', 'Image', 'ScrollView', 'Textarea'].map(name => [name, native(name)]))
  const actual = new Set(['@/components/CommunityWhisperSheet', '@/components/QianxunCommunityIcons',
    '@/domain/whisperRuntime', '@/domain/qianxunInteractionPresentation', '@/constants/qianxunTypography'])
  function load(file, extra = '') {
    if (cache.has(file)) return cache.get(file)
    const mod = { exports: {} }
    const req = name => {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name)
      if (name === '@tarojs/taro') return { default: taro, ...taro }
      if (name === '@tarojs/components') return components
      if (name === '@/constants/ossIcons') return { miniappOssIcons: {} }
      if (name === '@/domain/messageLifecycle') return { getMessageAuthSessionVersion: () => 1 }
      if (name === '@/utils/privateChatNavigation') return { openPrivateChat: async no => calls.push(['chat', no]) }
      if (name === '@/services/message') return { precheckWhisper: () => options.precheck.promise,
        resolveConversationByPeerUserId: async () => ({ conversationNo: 'CON-1' }) }
      if (name === '@/services/community') return { COMMUNITY_COPY_KEYS: {}, resolveCommunityCopy: () => '', resolveCommunityStatusLabel: (_, __, label) => label,
        getCommunityComments: async () => ({ records: [] }) }
      if (actual.has(name)) {
        const base = name.slice(2), extension = ['.tsx', '.ts', '.js'].find(ext => fs.existsSync(path.join(root, base + ext)))
        return load(base + extension)
      }
      return { default: () => null }
    }
    Function('module', 'exports', 'require', compile(read(file) + extra))(mod, mod.exports, req)
    cache.set(file, mod.exports)
    return mod.exports
  }
  const container = document.createElement('div'); document.body.append(container)
  const renderer = createRoot(container)
  t.after(async () => { await act(async () => renderer.unmount()); container.remove() })
  const render = async element => act(async () => { renderer.render(element) })
  const click = async selector => act(async () => {
    const node = container.querySelector(selector); assert.ok(node, selector)
    node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })
  return { load, calls, render, container, click, lifecycle }
}

const target = { targetUserNo: 'USR-000000000008', sourceScene: 'community_post', sourceBizNo: 'POST-1', nickname: '用户' }
const quote = { canSend: true, free: false, payType: 'coin', coinAmount: 10, coinBalance: 50,
  freeWhisperDailyQuota: 4, freeWhisperRemain: 0, contentMaxLength: 60, quoteToken: 'quote-1', targetUserNo: target.targetUserNo }

for (const kind of ['matched', 'pending', 'new']) {
  test(`预检${kind}：关系确认前不闪新建面板，确认后进入正确入口`, async t => {
    const precheck = deferred(), f = await fixture(t, { precheck })
    const Sheet = f.load('components/WhisperComposeSheet.tsx').default
    await f.render(React.createElement(Sheet, { visible: true, target, onClose: () => f.calls.push(['close']) }))
    const mountedSheet = f.container.querySelector('#global-whisper-compose-sheet')
    assert.equal(mountedSheet.dataset.visible, 'hidden')
    await act(async () => precheck.resolve(kind === 'matched'
      ? { ...quote, canSend: false, reasonCode: 'MATCHED_PRIVATE_CHAT', existingConversationNo: 'CON-8' }
      : kind === 'pending' ? { ...quote, canSend: false, existingWhisperNo: 'WSP-8' } : quote))
    if (kind === 'matched') assert.ok(f.calls.some(c => c[0] === 'chat' && c[1] === 'CON-8'))
    if (kind === 'pending') assert.ok(f.calls.some(c => c[0] === 'navigate' && c[1].endsWith('whisperNo=WSP-8')))
    assert.equal(f.container.querySelector('#global-whisper-compose-sheet'), mountedSheet, '预检结束不重建弹层根节点')
    assert.equal(mountedSheet.dataset.visible, kind === 'new' ? 'visible' : 'hidden')
  })
}

for (const cancelled of ['close', 'hide']) {
  test(`预检返回前${cancelled}，迟到的已匹配响应不能跳转`, async t => {
    const precheck = deferred(), f = await fixture(t, { precheck })
    const Sheet = f.load('components/WhisperComposeSheet.tsx').default
    const props = { visible: true, target, onClose() {} }
    await f.render(React.createElement(Sheet, props))
    if (cancelled === 'close') await f.render(React.createElement(Sheet, { ...props, visible: false }))
    else await act(async () => f.lifecycle.hide.forEach(run => run()))
    await act(async () => precheck.resolve({ ...quote, reasonCode: 'MATCHED_PRIVATE_CHAT', existingConversationNo: 'CON-8' }))
    assert.deepEqual(f.calls, [])
  })
}

test('会员次数用尽与非会员收费显示明确，免费第 4 次仍显示余量', async t => {
  const f = await fixture(t), Sheet = f.load('components/CommunityWhisperSheet.tsx').default
  const props = { nickname: '用户', meta: '', content: '你好', loading: false, submitting: false, onClose() {} }
  await f.render(React.createElement(Sheet, { ...props, precheck: { ...quote, freeWhisperExhausted: true,
    confirmText: '今日免费次数已用完（4/4），本次消耗 10 千寻币' } }))
  assert.match(f.container.textContent, /今日免费次数已用完/)
  assert.match(f.container.textContent, /10\s*千寻币/)
  assert.doesNotMatch(f.container.textContent, /开通时空邂逅会员/)
  await f.render(React.createElement(Sheet, { ...props, precheck: { ...quote, free: true, coinAmount: 0, freeWhisperRemain: 1 } }))
  assert.match(f.container.textContent, /剩余1\/4次/)
  await f.render(React.createElement(Sheet, { ...props, precheck: quote }))
  assert.doesNotMatch(f.container.textContent, /今日免费次数已用完/)
  assert.match(f.container.textContent, /10\s*千寻币/)
})

const post = { id: 'POST-18', postId: 18, status: 'published', content: '短动态', imageUrls: ['photo.jpg'],
  createdAt: '2026-10-19 10:00:00', commentCount: 0, likeCount: 1 }
for (const area of ['body', 'comment', 'image', 'like', 'more', 'rejected', 'pending']) {
  test(`我的动态 ${area} 入口执行对应操作且不冒泡误跳`, async t => {
    const f = await fixture(t)
    const Card = f.load('pages/qianxun/interactions.tsx', '\nexport { MyPostSnapshotCard }').MyPostSnapshotCard
    const item = ['rejected', 'pending'].includes(area) ? { ...post, status: area, statusName: '审核中' } : post
    await f.render(React.createElement(Card, { item, liking: false,
      onLike: () => f.calls.push(['like']), onManage: () => f.calls.push(['more']), onFailure: () => f.calls.push(['failure']) }))
    const selector = { body: '.qianxun-interaction-body', comment: '.qianxun-comment-icon', image: '.qianxun-my-post-content-column img',
      like: '.qianxun-like-icon', more: '.qianxun-my-post-more', rejected: '.qianxun-my-post-card', pending: '.qianxun-my-post-card' }[area]
    await f.click(selector)
    if (area === 'body') assert.deepEqual(f.calls, [['navigate', '/pages/qianxun/post-detail?id=18']])
    else if (area === 'comment') assert.deepEqual(f.calls, [['navigate', '/pages/qianxun/post-detail?id=18&focus=comment']])
    else if (area === 'image') assert.deepEqual(f.calls, [['preview', 'photo.jpg']])
    else if (area === 'rejected') assert.deepEqual(f.calls, [['failure']])
    else if (area === 'pending') assert.deepEqual(f.calls, [['toast', '审核中']])
    else assert.deepEqual(f.calls, [[area]])
  })
}
