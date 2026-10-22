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

function deferred() {
  let resolve
  const promise = new Promise(value => { resolve = value })
  return { promise, resolve }
}

async function mount(t) {
  const lifecycle = { show: new Set(), hide: new Set() }
  const navigations = []
  const closes = []
  const prechecks = []
  const keyboardTasks = []
  let sessionVersion = 1
  let latestSheetProps

  const taro = {
    hideKeyboard: () => {
      const task = deferred()
      keyboardTasks.push(task)
      return task.promise
    },
    navigateTo: async options => { navigations.push(['to', options]) },
    showToast: async options => { navigations.push(['toast', options]) },
  }
  for (const [name, key] of [['useDidShow', 'show'], ['useDidHide', 'hide']]) {
    taro[name] = callback => {
      const latest = React.useRef(callback)
      latest.current = callback
      React.useEffect(() => {
        const run = () => latest.current()
        lifecycle[key].add(run)
        return () => lifecycle[key].delete(run)
      }, [])
    }
  }

  const stubs = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/taro': { ...taro, default: taro },
    '@/components/CommunityWhisperSheet': { default: props => { latestSheetProps = props; return null } },
    '@/domain/whisperRuntime': {
      createWhisperIdempotencyCache: () => ({ clear() {}, get: () => 'idem' }),
      resolveWhisperErrorMessage: (_error, fallback) => fallback,
    },
    '@/services/message': {
      precheckWhisper: () => {
        const task = deferred()
        prechecks.push(task)
        return task.promise
      },
      resolveConversationByPeerUserId: async () => ({ conversationNo: 'C-resolved' }),
      createWhisper: async () => ({ payType: 'vip_free', coinAmount: 0 }),
    },
    '@/domain/messageLifecycle': { getMessageAuthSessionVersion: () => sessionVersion },
    '@/services/request': { getApiErrorCode: error => error?.code },
    '@/utils/privateChatNavigation': {
      openPrivateChat: async (conversationNo, expectedSessionVersion) => {
        navigations.push(['chat', conversationNo, expectedSessionVersion])
      },
    },
  }

  const source = fs.readFileSync(path.join(__dirname, '../src/components/WhisperComposeSheet.tsx'), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const mod = { exports: {} }
  Function('module', 'exports', 'require', output)(mod, mod.exports, name => {
    if (!(name in stubs)) throw new Error(`Unexpected import: ${name}`)
    return stubs[name]
  })

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let target = null
  let visible = true
  const render = () => act(async () => root.render(React.createElement(mod.exports.default, {
    target,
    visible,
    onClose: () => closes.push(target?.targetUserNo || 'closed'),
  })))

  t.after(async () => {
    keyboardTasks.splice(0).forEach(task => task.resolve())
    prechecks.splice(0).forEach(task => task.resolve({ canSend: false, reasonCode: 'BLOCKED' }))
    await act(async () => root.unmount())
    container.remove()
  })

  await render()
  return {
    navigations,
    closes,
    prechecks,
    keyboardTasks,
    open: async (userNo = 'USR-23') => {
      target = { targetUserNo: userNo, sourceScene: 'recommendation', nickname: '测试用户' }
      visible = true
      await render()
    },
    closeTarget: async () => {
      target = null
      await render()
    },
    hide: () => act(async () => lifecycle.hide.forEach(callback => callback())),
    show: () => act(async () => lifecycle.show.forEach(callback => callback())),
    invalidateSession: () => { sessionVersion += 1 },
    getSheetProps: () => latestSheetProps,
  }
}

const matched = {
  reasonCode: 'MATCHED_PRIVATE_CHAT',
  targetUserNo: 'USR-23',
  existingConversationNo: 'C1',
}

test('悄悄话预检查完成前切后台，迟到响应不得打开聊天', async t => {
  const app = await mount(t)
  await app.open()
  assert.equal(app.prechecks.length, 1)
  await app.hide()
  await act(async () => app.prechecks[0].resolve(matched))
  assert.deepEqual(app.navigations, [])
  assert.deepEqual(app.closes, [])
})

test('页面隐藏再恢复后，旧代次预检查不能驱动新页面导航', async t => {
  const app = await mount(t)
  await app.open()
  const oldPrecheck = app.prechecks[0]
  await app.hide()
  await app.show()
  assert.equal(app.prechecks.length, 2, '恢复前台应发起当前代次的新预检查')
  await act(async () => oldPrecheck.resolve(matched))
  assert.deepEqual(app.navigations, [])
  assert.deepEqual(app.closes, [])
})

test('页面隐藏再恢复只刷新预检查，不清空同一目标的输入草稿', async t => {
  const app = await mount(t)
  await app.open()
  await act(async () => app.prechecks[0].resolve({
    reasonCode: 'ALLOWED', canSend: true, quoteToken: 'quote-1', contentMaxLength: 60,
  }))
  await act(async () => app.getSheetProps().onContentChange('保留这段草稿'))
  assert.equal(app.getSheetProps().content, '保留这段草稿')
  await app.hide()
  await app.show()
  assert.equal(app.prechecks.length, 2)
  assert.equal(app.getSheetProps().content, '保留这段草稿')
})

test('等待收起键盘期间目标被关闭，不得继续打开聊天', async t => {
  const app = await mount(t)
  await app.open()
  await act(async () => app.prechecks[0].resolve(matched))
  assert.equal(app.keyboardTasks.length, 1)
  await app.closeTarget()
  await act(async () => app.keyboardTasks[0].resolve())
  assert.deepEqual(app.navigations, [])
  assert.deepEqual(app.closes, [])
})

test('同账号有效匹配只关闭一次弹窗并打开一次私信会话', async t => {
  const app = await mount(t)
  await app.open()
  await act(async () => app.prechecks[0].resolve(matched))
  await act(async () => app.keyboardTasks[0].resolve())
  assert.deepEqual(app.closes, ['USR-23'])
  assert.deepEqual(app.navigations, [['chat', 'C1', 1]])
})

test('登录会话切换后旧预检查结果不得导航', async t => {
  const app = await mount(t)
  await app.open()
  app.invalidateSession()
  await act(async () => app.prechecks[0].resolve(matched))
  assert.deepEqual(app.navigations, [])
  assert.deepEqual(app.closes, [])
})

test('用户主页和推荐页都用页面代次废弃隐藏前的会话解析结果', () => {
  const profile = fs.readFileSync(path.join(__dirname, '../src/pages/heart/user.tsx'), 'utf8')
  const recommend = fs.readFileSync(path.join(__dirname, '../src/pages/recommend/index.tsx'), 'utf8')
  for (const [name, source] of [['用户主页', profile], ['推荐页', recommend]]) {
    assert.match(source, /pageGeneration(?:Ref)?\.current \+= 1/, `${name}隐藏时必须推进页面代次`)
    assert.match(source, /sourceGeneration !== pageGeneration(?:Ref)?\.current/, `${name}异步返回必须校验发起代次`)
    assert.match(source, /sessionVersion !== getMessageAuthSessionVersion\(\)/, `${name}异步返回必须校验登录会话`)
  }
})
