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
  const events = new Map(), timers = new Map(), requests = [], reads = [], navigations = []
  let pages = []
  let clockId = 0, answer = null, pendingQuery, pendingRead, pendingConversation, failRead = false, sessionVersion = 1
  let identity = { userId: 1052, accessStatus: { coreAccessStatus: 'CORE_ALLOWED' } }
  const taro = { getCurrentPages: () => pages,
    navigateTo: async options => { navigations.push(['to', options]) },
    navigateBack: async options => { navigations.push(['back', options]) },
    redirectTo: async options => { navigations.push(['redirect', options]) },
    showToast: async () => {}, eventCenter: {
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
    '@/services/message': { resolveConversationByPeerUserId: async () => pendingConversation || ({ conversationNo: 'C1' }) },
    '@/domain/matchPopupRefresh': { MATCH_POPUP_POLL_MS: 5000, MATCH_POPUP_REFRESH_EVENT: 'refresh' },
    '@/domain/messageLifecycle': { MESSAGE_RUNTIME_BACKGROUND_EVENT: 'background', getMessageAuthSessionVersion: () => sessionVersion },
  }
  const navigationSource = fs.readFileSync(path.join(__dirname, '../src/utils/privateChatNavigation.ts'), 'utf8')
  const navigationCompiled = ts.transpileModule(navigationSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const navigationModule = { exports: {} }
  Function('module', 'exports', 'require', navigationCompiled)(navigationModule, navigationModule.exports,
    name => name === '@tarojs/taro' ? { default: taro } : stubs['@/domain/messageLifecycle'])
  stubs['@/utils/privateChatNavigation'] = navigationModule.exports
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
    container, requests, reads, navigations,
    setPages: value => { pages = value },
    invalidateSession: () => { sessionVersion++ },
    setAnswer: value => { answer = value },
    tick: () => act(async () => { const queued = [...timers.values()]; timers.clear(); queued.forEach(fn => fn()) }),
    emit: key => act(async () => { events.get(key)?.forEach(fn => fn()) }),
    hide: () => act(async () => lifecycle.hide.forEach(fn => fn())),
    show: () => act(async () => lifecycle.show.forEach(fn => fn())),
    identity: async value => { identity = value; await render() },
    queryDeferred: () => { let resolve; pendingQuery = new Promise(r => { resolve = r }); return async value => { await act(async () => resolve(value)); pendingQuery = undefined } },
    readDeferred: () => { let resolve; pendingRead = new Promise(r => { resolve = r }); return () => act(async () => resolve()) },
    conversationDeferred: () => { let resolve; pendingConversation = new Promise(r => { resolve = r }); return () => act(async () => resolve({ conversationNo: 'C1' })) },
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

test('当前已是同会话，匹配弹窗去聊天只确认并关闭，不再入栈或重建页面', async t => {
  const app = await mount(t)
  app.setPages([{ route: 'pages/message/private-chat', options: { conversationNo: 'C1' } }])
  app.setAnswer(popup)
  await app.tick()
  await act(async () => app.container.querySelector('#match-chat-button').click())
  assert.deepEqual(app.reads, [['MAT1', 'chat']])
  assert.doesNotMatch(app.container.textContent, /匹配成功/)
  assert.deepEqual(app.navigations, [], '当前聊天页必须原地保留，不触发任何导航动画')
})

test('匹配弹窗复用栈内已有聊天页，而不是创建重复页面', async t => {
  const app = await mount(t)
  app.setPages([{ route: 'pages/message/private-chat', options: { conversationNo: 'C1' } }, { route: 'pages/heart/user' }])
  app.setAnswer(popup); await app.tick()
  await act(async () => app.container.querySelector('#match-chat-button').click())
  assert.deepEqual(app.navigations, [['back', { delta: 1 }]])
})

test('匹配弹窗解析会话时切后台，迟到响应不打开新页', async t => {
  const app = await mount(t)
  const finish = app.conversationDeferred()
  app.setAnswer(popup); await app.tick()
  await act(async () => app.container.querySelector('#match-chat-button').click())
  await app.hide()
  await finish()
  assert.deepEqual(app.navigations, [])
})

test('同账号重新登录后旧弹窗解析响应也不能打开会话', async t => {
  const app = await mount(t)
  const finish = app.conversationDeferred()
  app.setAnswer(popup); await app.tick()
  await act(async () => app.container.querySelector('#match-chat-button').click())
  app.invalidateSession()
  await finish()
  assert.deepEqual(app.navigations, [])
})
