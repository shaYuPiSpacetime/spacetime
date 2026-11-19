const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')

function load(file, dependencies) {
  const module = { exports: {} }
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  Function('require', 'module', 'exports', compiled)(name => dependencies[name] || require(name), module, module.exports)
  return module.exports
}

test('相同准入状态和本人资料不反复通知各个 Tab，真实变化立即发布', () => {
  const storage = new Map()
  let writes = 0
  const { useAuthStore: store } = load('stores/authStore.ts', {
    '@tarojs/taro': {
      getStorageSync: key => storage.get(key),
      setStorageSync: (key, value) => { writes++; storage.set(key, value) },
      removeStorageSync: key => storage.delete(key),
    },
    '@/constants/config': { TOKEN_KEY: 'token', USER_INFO_KEY: 'userInfo' },
    './recommendBadgeStore': { resetRecommendBadge() {} },
    '../domain/messageLifecycle': { invalidateMessageAuthSession() {} },
  })
  store.getState().setLogin('测试会话', 7, '用户', 'avatar.png')
  const status = { coreAccessStatus: 'CORE_ALLOWED', canMessage: true, blockReasons: [] }
  store.getState().setAccessStatus(status)
  writes = 0
  let updates = 0
  store.subscribe(() => updates++)
  store.getState().setAccessStatus({ ...status, blockReasons: [] })
  store.getState().updateIdentity(7, '用户', 'avatar.png')
  assert.equal(updates, 0)
  assert.equal(writes, 0)
  store.getState().setAccessStatus({ ...status, coreAccessStatus: 'CORE_BLOCKED', canMessage: false, blockReasons: ['账号受限'] })
  store.getState().updateIdentity(7, '新昵称', 'new-avatar.png')
  assert.equal(updates, 2)
  assert.equal(writes, 2)
  assert.equal(store.getState().accessStatus.canMessage, false)
})

test('已经加载的页面配置不重复触发全局重绘，强制刷新仍能生效', async () => {
  let calls = 0
  const { usePrd01Store: store } = load('stores/prd01Store.ts', {
    '@/domain/prd01Runtime': {
      createCopyReader: () => () => '',
      createPrd01Loader: () => ({ bootstrap: async () => { calls++; return { config: { copywriting: {} }, profileOptions: {} } } }),
    },
    '@/services/prd01': { prd01Api: {} },
    '@/utils/errorMessage': { getErrorMessage: error => error.message },
  })
  await store.getState().bootstrap()
  let updates = 0
  store.subscribe(() => updates++)
  await store.getState().bootstrap()
  assert.equal(calls, 1)
  assert.equal(updates, 0)
  await store.getState().bootstrap(true)
  assert.equal(calls, 2)
  assert.ok(updates > 0)
  store.setState({ error: '上次刷新失败' })
  await store.getState().bootstrap()
  assert.equal(calls, 3)
  assert.equal(store.getState().error, undefined)
})

function deferred() {
  let resolve
  const promise = new Promise(yes => { resolve = yes })
  return { promise, resolve }
}

for (const allowed of [true, false]) {
  test(`我的资料与配置并行，地区不阻塞资产读取，准入=${allowed}`, async t => {
    const dom = new JSDOM('<div id="root"></div>')
    global.window = dom.window
    global.document = dom.window.document
    global.IS_REACT_ACT_ENVIRONMENT = true
    const config = deferred(), home = deferred(), regions = deferred()
    const calls = []
    const auth = { isLoggedIn: true, userId: 7, nickname: '', avatar: '', accessStatus: null, setAccessStatus() {}, updateIdentity() {} }
    const { useProfile } = load('hooks/useProfile.ts', {
      '@tarojs/taro': {},
      '@/custom-tab-bar/tabHost': { switchMainTab: () => {} },
      '@/stores/authStore': { useAuthStore: { getState: () => auth } },
      '@/stores/prd01Store': { usePrd01Store: { getState: () => ({
        bootstrap: () => { calls.push('配置'); return config.promise },
        provinceCities: () => { calls.push('地区'); return regions.promise },
      }) } },
      '@/services/prd01': { prd01Api: {
        getHomeDetail: () => { calls.push('资料'); return home.promise },
        getBasicProfile: async () => ({}), getIntroduction: async () => ({}),
      } },
      '@/services/payment': {
        getVipStatus: async () => { calls.push('会员'); return { vipStatus: 'none' } },
        getCoinBalance: async () => { calls.push('余额'); return { coinBalance: 12 } },
      },
    })
    let latest, task
    function Component() { latest = useProfile(); return React.createElement('span', null, latest.data.location) }
    const root = createRoot(document.getElementById('root'))
    t.after(async () => { await React.act(async () => root.unmount()); dom.window.close() })
    await React.act(async () => root.render(React.createElement(Component)))
    await React.act(async () => { task = latest.fetch() })
    assert.deepEqual(calls, ['配置', '资料'])
    await React.act(async () => {
      config.resolve()
      home.resolve({ profile: { locationProvince: '330000', locationCity: '330100' }, accessStatus: { coreAccessStatus: allowed ? 'CORE_ALLOWED' : 'NON_CORE_ONLY' } })
    })
    assert.ok(calls.includes('地区'))
    assert.equal(calls.includes('会员'), allowed)
    assert.equal(calls.includes('余额'), allowed)
    await React.act(async () => {
      regions.resolve([{ code: '330000', name: '浙江省', children: [{ code: '330100', name: '杭州市' }] }])
      await task
    })
    assert.equal(latest.data.location, '杭州市')
    assert.equal(latest.data.coinBalance?.balance ?? null, allowed ? 12 : null)
    assert.equal(latest.error, null)
  })
}

function createTabNavigation() {
  const pages = [{ route: 'pages/index/index' }]
  const nativeCalls = []
  const taro = {
    ENV_TYPE: { WEAPP: 'WEAPP' },
    getEnv: () => 'WEAPP',
    getCurrentPages: () => pages,
    switchTab: options => {
      nativeCalls.push(options)
      return Promise.resolve({ errMsg: 'switchTab:ok' })
    },
  }
  return { ...load('custom-tab-bar/tabHost.ts', { '@tarojs/taro': taro }), pages, nativeCalls }
}

test('六个底栏入口首次及重复切换均保留同一微信页面', async () => {
  const navigation = createTabNavigation()
  const route = navigation.pages[0].route
  let active = 'index'
  navigation.registerTabHost(route, { selected: () => active, select: key => { active = key } })
  for (const key of ['community', 'recommend', 'chat', 'profile', 'index', 'kindred', 'chat', 'community']) {
    const url = '/pages/' + (key === 'kindred' ? 'index' : key) + '/index'
    let completed = 0
    await navigation.switchMainTab({ url, complete: () => { completed++ } }, key)
    assert.equal(navigation.getRouteTab(route), key)
    assert.equal(completed, 1)
  }
  assert.equal(navigation.nativeCalls.length, 0)
})

test('从详情页指定栏目时回到原宿主，失败不保留错误的目标栏目', async () => {
  const navigation = createTabNavigation()
  const host = 'pages/profile/index'
  navigation.pages[0].route = host
  navigation.registerTabHost(host, { selected: () => 'profile', select: () => assert.fail('详情页仍可见') })
  navigation.pages.push({ route: 'pages/message/channel' })
  await navigation.switchMainTab({ url: '/pages/chat/index' })
  assert.equal(navigation.nativeCalls[0].url, '/' + host)
  assert.equal(navigation.getRouteTab(host), 'chat')
  assert.equal(navigation.takeRequestedTab(host), 'chat')
  assert.equal(navigation.takeRequestedTab(host), undefined)
  let failed = false
  await navigation.switchMainTab({ url: '/pages/community/index', fail: () => { failed = true } })
  navigation.nativeCalls[1].fail({ errMsg: 'switchTab:fail' })
  assert.equal(failed, true)
  assert.equal(navigation.getRouteTab(host), 'profile')
})

test('单独打开旧入口时使用原生路由，注销旧页面不能误删新宿主', async () => {
  const navigation = createTabNavigation()
  navigation.pages[0].route = 'pages/login/index'
  const target = 'pages/chat/index'
  await navigation.switchMainTab({ url: '/' + target })
  assert.equal(navigation.nativeCalls[0].url, '/' + target)
  assert.equal(navigation.takeRequestedTab(target), 'chat')
  const removeOld = navigation.registerTabHost(target, { selected: () => 'chat', select() {} })
  const removeNew = navigation.registerTabHost(target, { selected: () => 'kindred', select() {} })
  removeOld()
  assert.equal(navigation.getRouteTab(target), 'kindred')
  removeNew()
  assert.equal(navigation.selectHostedTab(target, 'profile'), false)
})

test('底栏栏目保留节点，显隐各触发一次，直达参数只交给入口栏目', async t => {
  const dom = new JSDOM('<div id="root"></div>')
  global.window = dom.window
  global.document = dom.window.document
  global.IS_REACT_ACT_ENVIRONMENT = true
  const activity = load('features/main-tabs/activity.ts', {
    '@tarojs/taro': { useDidShow() {}, useDidHide() {}, useRouter: () => ({ params: { tab: 'visitors' } }) },
  })
  const events = []
  function Section({ name }) {
    activity.useDidShow(() => events.push('显示' + name))
    activity.useDidHide(() => events.push('隐藏' + name))
    return React.createElement('span', { id: name }, activity.useRouter().params.tab || '')
  }
  const root = createRoot(document.getElementById('root'))
  t.after(async () => { await React.act(async () => root.unmount()); dom.window.close() })
  const render = current => React.act(async () => {
    root.render(['community', 'chat'].map(name => React.createElement(activity.TabActivity.Provider,
      { key: name, value: { visible: name === current, isEntry: name === 'community' } }, React.createElement(Section, { name }))))
  })
  await render('community')
  const message = document.getElementById('chat')
  await render('chat')
  await render('chat')
  await render(null)
  await render('chat')
  assert.deepEqual(events, ['显示community', '隐藏community', '显示chat', '隐藏chat', '显示chat'])
  assert.equal(document.getElementById('chat'), message)
  assert.equal(message.textContent, '')
  assert.equal(document.getElementById('community').textContent, 'visitors')
})
