const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadNavigation(taro, getSession = () => 1) {
  const source = fs.readFileSync(path.join(__dirname, '../src/utils/privateChatNavigation.ts'), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  Function('module', 'exports', 'require', output)(mod, mod.exports, name => {
    if (name === '@tarojs/taro') return { default: taro }
    if (name.includes('messageLifecycle')) return { getMessageAuthSessionVersion: getSession }
    throw Error(`Unexpected import ${name}`)
  })
  return mod.exports
}

function fixture(initialPages = []) {
  const calls = []
  let pages = initialPages
  const taro = {
    getCurrentPages: () => pages,
    navigateTo: async options => { calls.push(['to', options]); pages.push({ route: 'pages/message/private-chat', options: { conversationNo: decodeURIComponent(options.url.split('=')[1]) } }) },
    navigateBack: async options => { calls.push(['back', options]); pages = pages.slice(0, -options.delta) },
    redirectTo: async options => calls.push(['redirect', options]),
  }
  return { taro, calls, getPages: () => pages }
}

test('当前同会话保持原页面实例及阅读状态，零导航', async () => {
  const page = { route: '/pages/message/private-chat', options: { conversationNo: 'C1' }, readingAnchor: 'message-5' }
  const app = fixture([page])
  await loadNavigation(app.taro).openPrivateChat('C1')
  assert.deepEqual(app.calls, [])
  assert.equal(app.getPages()[0], page)
  assert.equal(page.readingAnchor, 'message-5')
})

test('深层页面栈返回最近同会话，保留原实例', async () => {
  const nearest = { route: 'pages/message/private-chat', options: { conversationNo: 'C1' } }
  const app = fixture([{ route: 'pages/message/private-chat', options: { conversationNo: 'C1' } }, nearest, { route: 'pages/heart/user' }, { route: 'pages/profile/edit' }])
  await loadNavigation(app.taro).openPrivateChat('C1')
  assert.deepEqual(app.calls, [['back', { delta: 2 }]])
  assert.equal(app.getPages().at(-1), nearest)
})

test('不同会话正常入栈，标识按URL参数编码', async () => {
  const app = fixture([{ route: 'pages/message/private-chat', options: { conversationNo: 'C1' } }])
  await loadNavigation(app.taro).openPrivateChat('C/2&extra')
  assert.deepEqual(app.calls, [['to', { url: '/pages/message/private-chat?conversationNo=C%2F2%26extra' }]])
})

test('同会话导航在途合并，完成后再次进入当前会话也不入栈', async () => {
  const app = fixture()
  let finish
  const actual = app.taro.navigateTo
  app.taro.navigateTo = options => { app.calls.push(['pending', options]); return new Promise(resolve => { finish = async () => { await actual(options); resolve() } }) }
  const nav = loadNavigation(app.taro)
  const first = nav.openPrivateChat('C1')
  const second = nav.openPrivateChat('C1')
  assert.equal(app.calls.length, 1)
  await finish()
  await Promise.all([first, second])
  await nav.openPrivateChat('C1')
  assert.equal(app.calls.length, 2, '仅一次底层导航记录和一次落地记录')
})

test('导航失败释放任务，可重试且不redirect重建现有会话', async () => {
  const app = fixture()
  let attempts = 0
  const actual = app.taro.navigateTo
  app.taro.navigateTo = async options => { if (++attempts === 1) throw Error('offline'); return actual(options) }
  const nav = loadNavigation(app.taro)
  await assert.rejects(nav.openPrivateChat('C1'), /offline/)
  await nav.openPrivateChat('C1')
  assert.equal(attempts, 2)
  assert.equal(app.calls.filter(([kind]) => kind === 'to').length, 1)
})

test('旧账号异步resolve完成后不能导航', async () => {
  const app = fixture()
  let version = 1
  const nav = loadNavigation(app.taro, () => version)
  const expected = version
  version++
  await nav.openPrivateChat('C1', expected)
  assert.deepEqual(app.calls, [])
})

test('空会话标识不导航', async () => {
  const app = fixture()
  await loadNavigation(app.taro).openPrivateChat('')
  assert.deepEqual(app.calls, [])
})
