/* eslint-env node */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename)
}

function harness(t, slowLogin = false) {
  const root = path.resolve(__dirname, '../src')
  for (const file of ['domain/messageLifecycle.ts', 'im/loadMessageImGateway.ts', 'im/LiteChatMessageImGateway.ts', 'stores/authStore.ts']) {
    delete require.cache[path.join(root, file)]
  }
  const storage = new Map()
  const instances = []
  const sdk = {
    EVENT: { SDK_READY: 'ready', SDK_NOT_READY: 'not_ready', KICKED_OUT: 'kicked_out', ERROR: 'error', MESSAGE_RECEIVED: 'received', CONVERSATION_LIST_UPDATED: 'updated' },
    TYPES: { MSG_TEXT: 'text', CONV_C2C: 'C2C' },
    create() {
      const handlers = new Map()
      const instance = {
        userID: '', destroyed: false, sends: 0, creates: 0,
        on(event, fn) { handlers.set(event, fn) },
        emit(event, data) { handlers.get(event)?.({ data }) },
        use() {},
        async login({ userID }) {
          this.userID = userID
          if (slowLogin && instances.length === 1) await new Promise(resolve => { this.finishLogin = resolve })
          this.emit('ready')
        },
        async logout() {},
        async destroy() { this.destroyed = true },
        createTextMessage({ to, payload }) {
          this.creates += 1
          return { ID: `sdk-${instances.length}-${this.creates}`, conversationID: `C2C${to}`, from: this.userID, to, flow: 'out', type: 'text', payload, time: 1791767541, status: 'unSend' }
        },
        async sendMessage(message) { this.sends += 1; return { data: { message: { ...message, status: 'success' } } } },
        async resendMessage(message) { return this.sendMessage(message) },
      }
      instances.push(instance)
      return instance
    },
  }
  const original = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === '@tencentcloud/lite-chat/basic') return { __esModule: true, default: sdk }
    if (request === '@tencentcloud/lite-chat/plugins/history-message') return { __esModule: true, default: { install() {} } }
    if (request === '@tarojs/taro') return { __esModule: true, default: {
      getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value), removeStorageSync: key => storage.delete(key),
    } }
    if (request === '@/constants/config') return { TOKEN_KEY: 'token', USER_INFO_KEY: 'user' }
    if (request === './recommendBadgeStore') return { resetRecommendBadge() {} }
    return original.call(this, request, parent, isMain)
  }
  t.after(() => { Module._load = original })
  const auth = require(path.join(root, 'stores/authStore.ts')).useAuthStore
  const lifecycle = require(path.join(root, 'domain/messageLifecycle.ts'))
  const loader = require(path.join(root, 'im/loadMessageImGateway.ts'))
  const credentials = imUserId => ({ sdkAppId: 123, imUserId, userSig: 'test-only', protocolVersion: 1 })
  return { auth, lifecycle, loader, instances, credentials }
}

test('IM-AUTH-P0-01: 退出 A 后验证码登录 B，真正以 B 身份发给 A', async t => {
  const h = harness(t)
  h.auth.getState().setLogin('token-a', 120, 'A', '')
  const a = await h.loader.loadMessageImGateway()
  await a.initialize(h.credentials('tu_a'))
  const outgoingA = await a.sendText('C2Ctu_b', 'A 发给 B')
  assert.equal(outgoingA.senderUserNo, 'tu_a')
  assert.equal(outgoingA.conversationNo, 'C2Ctu_b')
  h.auth.getState().logout()
  h.auth.getState().setLogin('token-b', 1052, 'B', '')
  const b = await h.loader.loadMessageImGateway()
  assert.notEqual(b, a)
  assert.equal(h.instances[0].destroyed, true)
  await b.initialize(h.credentials('tu_b'))
  const message = await b.sendText('C2Ctu_a', '你好')
  assert.equal(message.senderUserNo, 'tu_b')
  assert.equal(message.conversationNo, 'C2Ctu_a')
  assert.equal(message.sendStatus, 'sent')
  await b.logout()
})

test('IM-AUTH-P0-02/04: 直接切号立即使旧网关失效，旧页面不能继续发送', async t => {
  const h = harness(t)
  h.auth.getState().setLogin('token-a', 120, 'A', '')
  const a = await h.loader.loadMessageImGateway()
  await a.initialize(h.credentials('tu_a'))
  h.auth.getState().setLogin('token-b', 1052, 'B', '')
  assert.equal(a.isReady(), false)
  await assert.rejects(a.sendText('C2Ctu_b', '旧页发送'), /身份|登录|连接|初始化/)
  assert.equal(h.instances[0].sends, 0)
})

test('IM-AUTH-P0-03/07: 登录未完成时退出，迟到 ready 不能复活旧账号', async t => {
  const h = harness(t, true)
  h.auth.getState().setLogin('token-a', 120, 'A', '')
  const a = await h.loader.loadMessageImGateway()
  const login = a.initialize(h.credentials('tu_a'))
  const result = login.catch(error => error)
  h.auth.getState().logout()
  h.auth.getState().setLogin('token-b', 1052, 'B', '')
  const b = await h.loader.loadMessageImGateway()
  h.instances[0].finishLogin()
  await result
  assert.equal(a.isReady(), false)
  await b.initialize(h.credentials('tu_b'))
  assert.equal(b.isReady(), true)
  await b.logout()
})

test('IM-AUTH-P0-05: 自发目标在创建气泡和重试前拒绝', async t => {
  const h = harness(t)
  h.auth.getState().setLogin('token-a', 120, 'A', '')
  const a = await h.loader.loadMessageImGateway()
  await a.initialize(h.credentials('tu_a'))
  await assert.rejects(a.sendText('C2Ctu_a', '不应发给自己'), /自己|身份/)
  assert.equal(h.instances[0].creates, 0)
  await a.sendText('C2Ctu_b', '已发送')
  await assert.rejects(a.retry('C2Ctu_a', 'sdk-1-1'), /自己|身份/)
  assert.equal(h.instances[0].sends, 1)
  await a.logout()
})

test('IM-AUTH-P1-06: 同一登录态资料更新和返回复用网关，不重复登录', async t => {
  const h = harness(t)
  h.auth.getState().setLogin('token-a', 120, 'A', '')
  const a = await h.loader.loadMessageImGateway()
  await a.initialize(h.credentials('tu_a'))
  h.auth.getState().setLogin('token-a', 120, '新昵称', '')
  const returned = await h.loader.loadMessageImGateway()
  assert.equal(returned, a)
  assert.equal(a.isReady(), true)
  assert.equal(h.instances.length, 1)
  await a.logout()
})

test('同账号换 Token 也撤销旧连接；checkLogin 恢复切号登录态同样生效', async t => {
  const h = harness(t)
  h.auth.getState().setLogin('token-a', 120, 'A', '')
  const a = await h.loader.loadMessageImGateway()
  await a.initialize(h.credentials('tu_a'))
  h.auth.getState().setLogin('token-a-new', 120, 'A', '')
  assert.equal(a.isReady(), false)
  const fresh = await h.loader.loadMessageImGateway()
  await fresh.initialize(h.credentials('tu_a'))
  const taro = require('@tarojs/taro').default
  taro.setStorageSync('token', 'token-b')
  taro.setStorageSync('user', { userId: 1052, nickname: 'B' })
  h.auth.getState().checkLogin()
  assert.equal(fresh.isReady(), false)
  const b = await h.loader.loadMessageImGateway()
  await b.initialize(h.credentials('tu_b'))
  assert.equal((await b.sendText('C2Ctu_a', '切号')).senderUserNo, 'tu_b')
  await b.logout()
})

test('IM-AUTH-P1-08: 页面凭证等待前后校验认证代次，认证变更清理旧 refs', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../src/pages/message/private-chat.tsx'), 'utf8')
  assert.match(page, /getMessageAuthSessionVersion/)
  assert.match(page, /assertCurrentAuthSession\(\)[\s\S]*service\.getImCredentials\(\)[\s\S]*assertCurrentAuthSession\(\)[\s\S]*gateway\.initialize\(credentials\)/)
  assert.match(page, /gatewayRef\.current = undefined/)
  assert.match(page, /connectionPromiseRef\.current = undefined/)
})
