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
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const profile = id => ({ userId: id, avatar: `https://example.test/approved-${id}.png`, currentCity: '杭州', age: 28 })
const locked = id => ({ itemNo: `IDI-${id}`, unlocked: false, blurAvatarUrl: 'https://example.test/blurred.png', matchedConditionNames: ['硕士学历'] })
const unlocked = id => ({ ...locked(id), unlocked: true, candidateNo: String(id), profile: profile(id) })
const page = items => ({ snapshotNo: 'IDS-1', items, resultCount: items.length, unlockableCount: items.filter(x => !x.unlocked).length, pricing: { discountPercent: 10 } })
const receipt = (ids, withProfile = true) => ({ snapshotNo: 'IDS-1', unlockedItems: ids.map(id => ({ itemNo: `IDI-${id}`, candidateNo: String(id), profile: withProfile ? profile(id) : null, communicationMode: 'PRIVATE_MESSAGE' })) })

async function mount(t, options = {}) {
  const calls = [], storage = new Map(), show = new Set()
  let loads = 0
  const taro = {
    getStorageSync: k => storage.get(k), setStorageSync: (k, v) => storage.set(k, v), removeStorageSync: k => storage.delete(k),
    showModal: async () => ({ confirm: true }), showToast: async p => calls.push(['toast', p.title]),
    navigateTo: async p => calls.push(['navigate', p.url]),
    useDidShow: fn => { const latest = React.useRef(fn); latest.current = fn
      React.useEffect(() => { const run = () => latest.current(); show.add(run); return () => show.delete(run) }, []) },
  }
  const api = {
    getIdealResults: async () => {
      calls.push(['load']); loads++
      return loads === 1 ? page(options.initial || [locked(8)]) : options.reload ? options.reload(loads) : page([unlocked(8)])
    },
    quoteIdealUnlock: async (_, ids) => { calls.push(['quote', ids]); return { quoteToken: 'QUOTE-1', candidateCount: ids.length, balanceEnough: true } },
    quoteAllIdealUnlock: async (_, ids) => { calls.push(['quote-all', ids]); return { quoteToken: 'QUOTE-ALL', candidateCount: ids.length, balanceEnough: true } },
    confirmIdealUnlock: async () => { calls.push(['confirm']); return options.confirm ? options.confirm() : receipt([8]) },
  }
  const native = name => ({ children, onClick, ...props }) => React.createElement(name === 'Image' ? 'img' : 'div', {
    id: props.id, onClick, src: props.src, 'data-native': name,
  }, children)
  const components = Object.fromEntries(['View', 'Image', 'Text', 'ScrollView'].map(name => [name, native(name)]))
  const dependencies = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/taro': { default: taro, ...taro }, '@tarojs/components': components,
    '@/services/ideal': api, '@/constants/tabBarLayout': { getTabBarBottom: () => 0 },
    '@/constants/ossIcons': { miniappOssIcons: {} },
    '@/components/AppTabBar': { default: () => null, getCapsuleLeftActionsLayout: () => ({}) },
    '@/components/NativeNavigation': { getNativeNavigationMetrics: () => ({ menuTop: 40, menuHeight: 32, navigationHeight: 88 }) },
    '@/hooks/useRetainedScroll': { useRetainedScroll: () => ({ scrollTop: 320, onScroll() {}, reset: () => calls.push(['reset']) }) },
  }
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/IdealResultsContent/index.tsx'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  const mod = { exports: {} }
  Function('require', 'module', 'exports', compiled)(name => { assert.ok(dependencies[name], name); return dependencies[name] }, mod, mod.exports)
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container)
  await act(async () => root.render(React.createElement(mod.exports.default, { snapshotNo: 'IDS-1', embedded: true })))
  t.after(async () => { await act(async () => root.unmount()); container.remove() })
  const click = async (label, scope = container) => {
    const node = [...scope.querySelectorAll('div')].find(n => n.textContent === label && ![...n.children].some(c => c.textContent === label))
    assert.ok(node, `找不到操作：${label}`)
    await act(async () => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })))
  }
  const card = id => container.querySelector(`#ideal-candidate-IDI-${id}`)
  return { calls, container, click, card }
}

test('单人解锁回执立即更新原卡片与头像，点击查看主页才跳转且不重置滚动', async t => {
  const confirm = deferred(), reload = deferred()
  const app = await mount(t, { confirm: () => confirm.promise, reload: () => reload.promise })
  await app.click('解锁ta ›')
  await act(async () => confirm.resolve(receipt([8])))
  assert.ok(app.container.textContent.includes('查看主页'))
  assert.equal(app.card(8).querySelector('img').getAttribute('src'), profile(8).avatar)
  assert.equal(app.calls.filter(x => x[0] === 'navigate').length, 0)
  assert.equal(app.calls.filter(x => x[0] === 'reset').length, 0)
  await app.click('查看主页', app.card(8))
  assert.deepEqual(app.calls.filter(x => x[0] === 'navigate'), [['navigate', '/pages/heart/user?targetUserId=8&sourceScene=ideal']])
  assert.equal(app.calls.filter(x => x[0] === 'quote').length, 1)
  await act(async () => reload.resolve(page([unlocked(8)])))
})

test('本页解锁只报价未解锁的人，成功后全部卡片保留并显示清晰头像', async t => {
  const app = await mount(t, { initial: [locked(8), locked(9), unlocked(10)],
    confirm: async () => receipt([8, 9], false), reload: async () => page([unlocked(8), unlocked(9), unlocked(10)]) })
  await app.click('解锁本页（2）')
  assert.deepEqual(app.calls.find(x => x[0] === 'quote-all'), ['quote-all', ['IDI-8', 'IDI-9']])
  for (const id of [8, 9, 10]) {
    assert.ok(app.card(id).textContent.includes('查看主页'))
    assert.equal(app.card(id).querySelector('img').getAttribute('src'), profile(id).avatar)
  }
  assert.ok(!app.container.textContent.includes('解锁本页'))
  assert.equal(app.calls.filter(x => x[0] === 'navigate').length, 0)
})

test('成功后刷新失败仍保留查看主页，重试只加载资料不重新解锁', async t => {
  const app = await mount(t, { reload: async loads => { if (loads === 2) throw Error('网络暂不可用'); return page([unlocked(8)]) } })
  await app.click('解锁ta ›')
  assert.ok(app.container.textContent.includes('查看主页'))
  await app.click('重新加载')
  assert.equal(app.calls.filter(x => x[0] === 'confirm').length, 1)
  assert.equal(app.calls.filter(x => x[0] === 'quote').length, 1)
  assert.equal(app.card(8).querySelector('img').getAttribute('src'), profile(8).avatar)
})

test('多人解锁回执尚未加载头像时，查看主页按已确认身份跳转而非重新报价', async t => {
  const reload = deferred()
  const app = await mount(t, { initial: [locked(8), locked(9)], confirm: async () => receipt([8, 9], false), reload: () => reload.promise })
  await app.click('解锁本页（2）')
  await app.click('查看主页', app.card(9))
  assert.ok(app.calls.some(x => x[1] === '/pages/heart/user?targetUserId=9&sourceScene=ideal'))
  assert.equal(app.calls.filter(x => x[0] === 'quote').length, 0)
  await act(async () => reload.resolve(page([unlocked(8), unlocked(9)])))
})

test('解锁失败不改变头像和解锁按钮，也不跳转主页', async t => {
  const app = await mount(t, { confirm: async () => { throw Error('余额不足') }, reload: async () => page([locked(8)]) })
  await app.click('解锁ta ›')
  assert.ok(app.container.textContent.includes('解锁ta ›'))
  assert.ok(!app.container.textContent.includes('查看主页'))
  assert.equal(app.card(8).querySelector('img').getAttribute('src'), locked(8).blurAvatarUrl)
  assert.equal(app.calls.filter(x => x[0] === 'navigate').length, 0)
})

test('重新进入结果页的已解锁对象直接显示清晰头像并进入对应主页', async t => {
  const app = await mount(t, { initial: [unlocked(8)] })
  await app.click('查看主页')
  assert.equal(app.card(8).querySelector('img').getAttribute('src'), profile(8).avatar)
  assert.equal(app.calls.filter(x => x[0] === 'quote' || x[0] === 'confirm').length, 0)
  assert.ok(app.calls.some(x => x[1] === '/pages/heart/user?targetUserId=8&sourceScene=ideal'))
})

test('已解锁卡片资料暂缺时提示重试，不能退回付费入口', async t => {
  const app = await mount(t, { initial: [{ ...locked(8), unlocked: true }] })
  await app.click('查看主页')
  assert.equal(app.calls.filter(x => x[0] === 'quote' || x[0] === 'confirm' || x[0] === 'navigate').length, 0)
  assert.ok(app.calls.some(x => x[0] === 'toast' && x[1].includes('稍后重试')))
})
