const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { act } = React
const dom = new JSDOM('<html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true
const root = path.resolve(__dirname, '../src')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
function extract(file, start, end, deps, name) {
  const source = read(file), begin = source.indexOf(start), finish = source.indexOf(end, begin)
  assert.ok(begin >= 0 && finish > begin)
  return Function(...Object.keys(deps), `${compile(source.slice(begin, finish))};return ${name}`)(...Object.values(deps))
}
function simpleModule(file, stubs = {}, extra = '') {
  const mod = { exports: {} }
  Function('module', 'exports', 'require', compile(read(file) + extra))(mod, mod.exports, name => stubs[name] || {})
  return mod.exports
}

for (const width of [320, 375, 393, 414]) for (const mode of ['正常', '零值', '抛错']) {
  test(`${width}px 胶囊${mode}时推荐操作区与头像都保留安全间距`, () => {
    const menu = { left: width - 104, right: width - 8, top: 58, bottom: 90, width: 96, height: 32 }
    const taro = { ENV_TYPE: { WEAPP: 'weapp' }, getEnv: () => 'weapp', getWindowInfo: () => ({ windowWidth: width, windowHeight: 896, statusBarHeight: 50 }),
      getMenuButtonBoundingClientRect: () => { if (mode === '抛错') throw Error('未就绪'); return mode === '零值' ? { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 } : menu } }
    const system = simpleModule('utils/system.ts', { '@tarojs/taro': { default: taro } })
    const native = simpleModule('components/NativeNavigation.tsx', { '@tarojs/taro': { default: taro }, '@/utils/system': system, 'react/jsx-runtime': require('react/jsx-runtime') })
    const metrics = native.getNativeNavigationMetrics()
    assert.ok(metrics.menuLeft >= 480 && metrics.menuLeft <= menu.left * 750 / width)
    assert.ok(metrics.menuTop >= 50 * 750 / width)
    assert.ok(metrics.menuLeft - 12 - 140 >= 250, '推荐操作区不得覆盖左侧两个标题')
    const header = simpleModule('features/qianxun/QianxunHeader.tsx', { '@tarojs/taro': { default: taro }, '@/utils/system': system, '@/components/NativeNavigation': native, 'react/jsx-runtime': require('react/jsx-runtime') })
    const q = header.getQianxunHeaderMetrics()
    assert.ok(q.avatarLeft + 64 + 12 <= menu.left * 750 / width + 0.01, '头像点击区不得覆盖原生胶囊')
  })
}

test('旧基础库缺少窗口新 API 时使用真实系统宽度', () => {
  const taro = { getSystemInfoSync: () => ({ windowWidth: 393, windowHeight: 852, statusBarHeight: 54 }) }
  const system = simpleModule('utils/system.ts', { '@tarojs/taro': { default: taro } })
  assert.equal(system.getWindowMetrics().windowWidth, 393)
})

test('分享单页面中拉黑成功后正确落地，不误报操作失败', async () => {
  const calls = []
  const taro = { getCurrentPages: () => [{ route: 'pages/heart/user' }],
    showActionSheet: async () => ({ tapIndex: 2 }), showModal: async () => ({ confirm: true }),
    showToast: async p => calls.push(['toast', p.title]), navigateBack: async () => { throw { errMsg: 'navigateBack:fail cannot navigate back at first page' } },
    switchTab: async p => calls.push(['switch', p.url]), reLaunch: async p => calls.push(['relaunch', p.url]) }
  const navigation = simpleModule('utils/navigation.ts', { '@tarojs/taro': { default: taro } })
  const goBack = extract('pages/heart/user.tsx', '  const goBack =', '  const runCertifiedAction =', {
    Taro: taro, isLoggedIn: true, openLogin: async () => {}, ...navigation,
  }, 'goBack')
  const action = extract('pages/heart/user.tsx', '  const openSafetyActions =', '  if (profileLoading', {
    Taro: taro, isLoggedIn: true, openLogin: async () => {}, goBack,
    targetUserId: 8, sourceScene: 'profile', settingsApi: { addBlacklist: async () => { calls.push(['block']) } },
    neverRecommendCandidate: async () => {}, reportUser: async () => {}, createRequestId: () => 'id',
  }, 'openSafetyActions')
  await action()
  assert.ok(calls.some(c => c[0] === 'block'))
  assert.ok(calls.some(c => c[0] === 'switch' && c[1] === '/pages/index/index'))
  assert.ok(!calls.some(c => String(c[1]).includes('操作失败')))
})

for (const cancelled of [true, false]) {
  test(cancelled ? '取消拉黑不修改关系也不跳转' : '拉黑接口失败显示实际错误且保留当前页面', async () => {
    const calls = []
    const taro = { showActionSheet: async () => ({ tapIndex: 2 }), showModal: async () => ({ confirm: !cancelled }),
      showToast: async p => calls.push(p.title) }
    const action = extract('pages/heart/user.tsx', '  const openSafetyActions =', '  if (profileLoading', {
      Taro: taro, isLoggedIn: true, openLogin: async () => {}, goBack: async () => calls.push('back'),
      targetUserId: 8, sourceScene: 'profile', settingsApi: { addBlacklist: async () => { calls.push('block'); throw Error('网络暂不可用') } },
      neverRecommendCandidate: async () => {}, reportUser: async () => {}, createRequestId: () => 'id',
    }, 'openSafetyActions')
    await action()
    assert.deepEqual(calls, cancelled ? [] : ['block', '网络暂不可用'])
  })
}

test('学历认证返回真实上一页，不进入首次认证自动跳首页流程', async () => {
  const calls = []
  const taro = { getCurrentPages: () => [{ route: 'pages/verification/my-certification' }, { route: 'pages/verification/education-mainland' }],
    navigateBack: async () => calls.push('back'), redirectTo: async p => calls.push(p.url) }
  const navigation = simpleModule('utils/navigation.ts', { '@tarojs/taro': { default: taro } })
  const back = extract('pages/verification/components/VerificationSubShell.tsx', '  const handleBack =', '  const content =', { Taro: taro, onBack: undefined, ...navigation }, 'handleBack')
  await back()
  assert.deepEqual(calls, ['back'])
})

test('学历认证单页进入时返回资料页', async () => {
  const calls = []
  const taro = { getCurrentPages: () => [{ route: 'pages/verification/education-mainland' }], redirectTo: async p => calls.push(p.url) }
  const navigation = simpleModule('utils/navigation.ts', { '@tarojs/taro': { default: taro } })
  const back = extract('pages/verification/components/VerificationSubShell.tsx', '  const handleBack =', '  const content =', { Taro: taro, onBack: undefined, ...navigation }, 'handleBack')
  await back()
  assert.deepEqual(calls, ['/pages/profile/edit'])
})

async function mount(t, file, options = {}) {
  const lifecycle = { show: new Set(), hide: new Set(), refresh: new Set() }, calls = [], modules = new Map(), nativeProps = {}
  const taro = { getStorageSync: () => undefined, setStorageSync() {}, removeStorageSync() {}, nextTick: fn => fn(),
    navigateTo: async p => { calls.push(['navigate', p.url]) }, navigateBack: async () => {}, redirectTo: async p => { calls.push(['redirect', p.url]) },
    showToast: async () => {}, stopPullDownRefresh() {}, getWindowInfo: () => ({ windowWidth: 375 }),
    getCurrentPages: () => [{ route: file.replace(/\.tsx$/, '') }], useRouter: () => ({ params: options.route || {} }),
    eventCenter: { on() {}, off() {} } }
  for (const [hook, event] of [['useDidShow', 'show'], ['useDidHide', 'hide'], ['usePullDownRefresh', 'refresh']]) {
    taro[hook] = fn => {
      const latest = React.useRef(fn); latest.current = fn
      React.useEffect(() => { const run = () => latest.current(); lifecycle[event].add(run); return () => lifecycle[event].delete(run) }, [])
    }
  }
  taro.useLoad = fn => { React.useEffect(() => { fn(options.route || {}) }, []) }
  const auth = selector => selector({ userId: 1, isLoggedIn: true })
  auth.getState = () => ({ userId: 1, nickname: '本人' })
  const api = {
    getCommunityMeta: async () => ({}), getCommunityInteractions: async () => ({ records: [] }), getMyCommunityPosts: async () => ({ records: [] }),
    getCommunityFollowRelations: async () => { calls.push(['roster']); return options.roster() },
    resolveCommunityCopy: (_, key) => key || '', resolveCommunityFeedback: (_, __, e) => e.message,
    COMMUNITY_COPY_KEYS: {},
  }
  const summary = { nickname: '本人', avatar: '', stats: { postCount: 1, followingCount: 2, followerCount: 2, receivedLikeCount: 10 } }
  function native(kind) {
    return ({ children, onClick, onScroll, ...props }) => {
      nativeProps[kind] = { children, onClick, onScroll, ...props }
      return React.createElement(kind === 'Image' ? 'img' : 'div', { id: props.id, onClick, 'data-native': kind,
        'data-role': props['data-role'], 'data-scroll-top': props.scrollTop, style: props.style,
      }, children)
    }
  }
  const components = Object.fromEntries(['View', 'Text', 'Image', 'ScrollView', 'Button'].map(kind => [kind, native(kind)]))
  function load(relative) {
    if (modules.has(relative)) return modules.get(relative)
    const mod = { exports: {} }; modules.set(relative, mod.exports)
    const req = name => {
      if (name === '@tarojs/taro') return { default: taro, ...taro }
      if (name === '@tarojs/components') return components
      if (name === '@/services/community') return api
      if (name === '@/services/ideal') return { getIdealUnlocks: async (...args) => { calls.push(['unlocks', ...args]); return options.unlocks(...args) } }
      if (name === '@/stores/authStore') return { useAuthStore: auth }
      if (name === '@/hooks/useCommunityPersonalSummary') return { useCommunityPersonalSummary: () => ({ summary }) }
      if (name === '@/constants/ossIcons') return { miniappOssIcons: {} }
      if (name === '@/utils/avatar') return { normalizeAvatarUrl: (url, fallback) => url || fallback }
      if (name === '@/components/CommunityLikeSummary') return load('components/CommunityLikeSummary.tsx')
      if (name.includes('/components/') || name === '@/components/NativeNavigation') return { default: () => null, QianxunActionStat: () => null, QianxunGenderIcon: () => null }
      if (/\.(webp|png)$/.test(name)) return ''
      if (name.startsWith('@/')) {
        const base = name.slice(2), found = ['.ts', '.tsx', '.js'].find(ext => fs.existsSync(path.join(root, base + ext)))
        if (found) return load(base + found)
        throw Error(`未配置测试依赖：${name}`)
      }
      return require(name)
    }
    Function('require', 'module', 'exports', compile(read(relative)))(req, mod, mod.exports)
    modules.set(relative, mod.exports); return mod.exports
  }
  const Page = load(file).default
  const element = document.createElement('div'); document.body.append(element)
  const reactRoot = createRoot(element)
  await act(async () => { reactRoot.render(React.createElement(Page)) })
  t.after(async () => { await act(async () => reactRoot.unmount()); element.remove() })
  const fire = async event => { await act(async () => { for (const fn of lifecycle[event]) fn() }) }
  const change = async event => { await act(async () => { await load('domain/communityPersonalEvents.ts').withCommunityPersonalRefresh(Promise.resolve(), event) }) }
  const click = async label => {
    const node = [...element.querySelectorAll('div')].find(n => n.textContent === label && ![...n.children].some(c => c.textContent === label))
    assert.ok(node, `找不到 ${label}`)
    await act(async () => { node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  }
  await fire('show')
  return { element, calls, nativeProps, fire, change, click }
}

for (const roster of ['following', 'followers']) {
  test(`${roster} 返回刷新且旧请求不能复活被拉黑对象`, async t => {
    const late = deferred(); let phase = 'initial'
    const user = { userId: 8, nickname: '已拉黑对象', description: '简介' }
    const app = await mount(t, 'pages/qianxun/interactions.tsx', { route: { roster }, roster: () => phase === 'late' ? late.promise : Promise.resolve({ records: phase === 'blocked' ? [] : [user] }) })
    assert.ok(app.element.textContent.includes(user.nickname))
    phase = 'late'; await app.fire('show')
    await app.fire('hide')
    phase = 'blocked'; await app.change({ kind: 'block', authorId: 8 })
    await app.fire('show')
    await act(async () => { late.resolve({ records: [user] }) })
    assert.ok(!app.element.textContent.includes(user.nickname))
    assert.ok(app.calls.filter(c => c[0] === 'roster').length >= 2)
  })
}

const unlocked = id => ({ unlockNo: `unlock-${id}`, available: true, profile: { userId: id, age: 20, currentCity: `城市${id}` }, unlockedAt: '2026-10-18T10:00:00' })
test('历史解锁从主页返回保留两页数据、游标和滚动位置', async t => {
  const app = await mount(t, 'pages/prd08/ideal/unlocks/index.tsx', { unlocks: async (_, cursor) => ({ items: [unlocked(cursor ? 9 : 8)], nextCursor: cursor ? null : 'page2' }) })
  await act(async () => { app.nativeProps.ScrollView.onScrollToLower() })
  await act(async () => { app.nativeProps.ScrollView.onScroll?.({ detail: { scrollTop: 870 } }) })
  const before = app.calls.length
  await app.fire('hide'); await app.fire('show')
  assert.equal(app.calls.length, before, '普通返回不重复请求第一页')
  assert.ok(app.element.textContent.includes('城市8') && app.element.textContent.includes('城市9'))
  assert.equal(app.nativeProps.ScrollView.scrollTop, 870)
  await app.fire('refresh')
  assert.equal(app.calls.length, before + 1, '主动刷新仍请求第一页')
  assert.equal(app.nativeProps.ScrollView.scrollTop, 0)
  assert.ok(!app.element.textContent.includes('城市9'))
})
test('历史解锁拉黑即时移除，重复触底只请求一次', async t => {
  const late = deferred()
  const app = await mount(t, 'pages/prd08/ideal/unlocks/index.tsx', { unlocks: async (_, cursor) => cursor ? late.promise : { items: [unlocked(8)], nextCursor: 'page2' } })
  await act(async () => { app.nativeProps.ScrollView.onScrollToLower(); app.nativeProps.ScrollView.onScrollToLower() })
  assert.equal(app.calls.filter(c => c[0] === 'unlocks').length, 2)
  await app.change({ kind: 'block', authorId: 8 })
  await act(async () => { late.resolve({ items: [unlocked(8), unlocked(9)], nextCursor: null }) })
  assert.ok(!app.element.textContent.includes('城市8'))
  assert.ok(app.element.textContent.includes('城市9'))
})
test('我的动态获赞直接打开本页一个弹窗，关闭不新增页面', async t => {
  const app = await mount(t, 'pages/qianxun/my-posts.tsx')
  await app.click('获赞'); await app.click('获赞')
  assert.equal(app.calls.filter(c => c[0] === 'navigate').length, 0)
  assert.ok(app.element.textContent.includes('共获得10个赞'))
  await app.click('我知道了')
  assert.ok(!app.element.textContent.includes('共获得10个赞'))
})
