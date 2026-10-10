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

async function mount(t) {
  const lifecycle = { show: new Set(), hide: new Set() }
  const events = new Map(), timers = new Map(), requests = [], reads = []
  let clockId = 0, answer = null, pendingQuery, pendingRead, failRead = false
  let identity = { userId: 1052, accessStatus: { coreAccessStatus: 'CORE_ALLOWED' } }
  const taro = { navigateTo: async () => {}, showToast: async () => {}, eventCenter: {
    on: (key, fn) => { if (!events.has(key)) events.set(key, new Set()); events.get(key).add(fn) },
    off: (key, fn) => events.get(key)?.delete(fn),
  } }
  for (const [name, key] of [['useDidShow', 'show'], ['useDidHide', 'hide']]) {
    taro[name] = callback => {
      const latest = React.useRef(callback); latest.current = callback
      React.useEffect(() => { const run = () => latest.current(); lifecycle[key].add(run); return () => lifecycle[key].delete(run) }, [])
    }
  }
  const host = tag => props => React.createElement(tag, { id: props.id, onClick: props.onClick, style: props.style }, tag === 'img' ? undefined : props.children)
  const api = {
    getPendingMatchPopup: async () => { requests.push(identity.userId); return pendingQuery || answer },
    markMatchPopupRead: async (...args) => { reads.push(args); if (failRead) throw new Error('offline'); return pendingRead },
  }
  const stubs = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/taro': { ...taro, default: taro },
    '@tarojs/components': { View: host('div'), Text: host('span'), Image: host('img') },
    '@/stores/authStore': { useAuthStore: select => select(identity) },
    '@/services/relation': api,
    '@/services/message': { resolveConversationByPeerUserId: async () => ({ conversationNo: 'C1' }) },
    '@/domain/matchPopupRefresh': { MATCH_POPUP_POLL_MS: 5000, MATCH_POPUP_REFRESH_EVENT: 'refresh' },
    '@/domain/messageLifecycle': { MESSAGE_RUNTIME_BACKGROUND_EVENT: 'background' },
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/components/MatchPopupHost.tsx'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  Function('module', 'exports', 'require', 'setTimeout', 'clearTimeout', compiled)(mod, mod.exports,
    name => name.endsWith('.webp') ? 'avatar' : stubs[name],
    (fn, delay) => { assert.equal(delay, 5000); timers.set(++clockId, fn); return clockId }, id => timers.delete(id))
  const container = document.createElement('div'); document.body.append(container)
  const root = createRoot(container)
  const render = () => act(async () => root.render(React.createElement(mod.exports.default)))
  t.after(async () => { await act(async () => root.unmount()); container.remove(); assert.equal(timers.size, 0) })
  await render()
  return {
    container, requests, reads,
    setAnswer: value => { answer = value },
    tick: () => act(async () => { const queued = [...timers.values()]; timers.clear(); queued.forEach(fn => fn()) }),
    emit: key => act(async () => { events.get(key)?.forEach(fn => fn()) }),
    hide: () => act(async () => lifecycle.hide.forEach(fn => fn())),
    show: () => act(async () => lifecycle.show.forEach(fn => fn())),
    identity: async value => { identity = value; await render() },
    queryDeferred: () => { let resolve; pendingQuery = new Promise(r => { resolve = r }); return async value => { await act(async () => resolve(value)); pendingQuery = undefined } },
    readDeferred: () => { let resolve; pendingRead = new Promise(r => { resolve = r }); return () => act(async () => resolve()) },
    failRead: () => { failRead = true },
  }
}
const popup = { matchNo: 'MAT1', matchedUserId: 23, nickname: '嘉宾', mutualLiked: true, canEnterConversation: true }

test('进入立即检查，5 秒轮询发现匹配，喜欢成功事件立即刷新', async t => {
  const app = await mount(t)
  assert.equal(app.requests.length, 1)
  await app.tick()
  assert.equal(app.requests.length, 2)
  app.setAnswer(popup)
  await app.emit('refresh')
  assert.match(app.container.textContent, /匹配成功/)
  await app.tick()
  assert.equal(app.requests.length, 3, '弹窗已显示不重复取同一条')
})

test('隐藏/后台停止轮询并丢弃在途响应，返回立即重查', async t => {
  const app = await mount(t)
  const finish = app.queryDeferred()
  await app.tick()
  await app.hide()
  await finish(popup)
  assert.doesNotMatch(app.container.textContent, /匹配成功/)
  await app.tick()
  assert.equal(app.requests.length, 2)
  app.setAnswer(popup)
  await app.show()
  assert.match(app.container.textContent, /匹配成功/)
  await app.emit('background')
  await app.tick()
  assert.equal(app.requests.length, 3)
})

test('切换账号不接受旧账号的异步匹配结果', async t => {
  const app = await mount(t)
  const finish = app.queryDeferred()
  await app.tick()
  await app.identity({ userId: null, accessStatus: null })
  await finish(popup)
  assert.doesNotMatch(app.container.textContent, /匹配成功/)
})

test('回执失败保留弹窗，快速重复动作只提交一次', async t => {
  const app = await mount(t)
  app.setAnswer(popup)
  await app.tick()
  app.failRead()
  await act(async () => app.container.querySelector('#relation-match-popup').click())
  assert.match(app.container.textContent, /匹配成功/)
  assert.equal(app.reads.length, 1)
})

test('等待回执时重复点击只请求一次，确认后关闭', async t => {
  const app = await mount(t)
  app.setAnswer(popup); await app.tick()
  const finish = app.readDeferred()
  await act(async () => { app.container.querySelector('#relation-match-popup').click(); app.container.querySelector('#relation-match-popup').click() })
  assert.equal(app.reads.length, 1)
  assert.match(app.container.textContent, /匹配成功/)
  await finish()
  assert.doesNotMatch(app.container.textContent, /匹配成功/)
})
