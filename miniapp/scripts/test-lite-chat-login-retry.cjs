/* eslint-env node */
const assert = require('node:assert/strict')
const Module = require('node:module')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  })
  module._compile(output.outputText, filename)
}

test('登录超时后的重试销毁旧实例并忽略旧实例就绪事件', async () => {
  const instances = []
  const historyPlugin = { name: 'HistoryMessage', install() {} }
  const sdk = {
    EVENT: {
      SDK_READY: 'ready', SDK_NOT_READY: 'not_ready', KICKED_OUT: 'kicked_out',
      ERROR: 'error', MESSAGE_RECEIVED: 'received', CONVERSATION_LIST_UPDATED: 'updated',
    },
    create() {
      const handlers = new Map()
      const instance = {
        destroyed: false,
        on(event, handler) { handlers.set(event, handler) },
        emit(event) { handlers.get(event)?.() },
        plugins: [],
        use(plugin) { this.plugins.push(plugin) },
        login() { return instances.length === 1 ? new Promise(() => undefined) : Promise.resolve() },
        async destroy() { this.destroyed = true },
        async logout() {},
      }
      instances.push(instance)
      return instance
    },
  }
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === '@tencentcloud/lite-chat/basic') return { __esModule: true, default: sdk }
    if (request === '@tencentcloud/lite-chat/plugins/history-message') return { __esModule: true, default: historyPlugin }
    return originalLoad.call(this, request, parent, isMain)
  }
  let LiteChatMessageImGateway
  try {
    ;({ LiteChatMessageImGateway } = require(path.resolve(__dirname, '../src/im/LiteChatMessageImGateway.ts')))
  } finally {
    Module._load = originalLoad
  }

  const gateway = new LiteChatMessageImGateway(5)
  const credentials = { sdkAppId: 123, imUserId: 'tu_test', userSig: 'test' }
  await assert.rejects(gateway.initialize(credentials), /私信登录超时/)
  await gateway.initialize(credentials)
  assert.equal(instances.length, 2)
  assert.equal(instances[1].plugins[0], historyPlugin, '历史消息插件应在登录前注册')
  assert.equal(instances[0].destroyed, true)
  instances[0].emit('ready')
  assert.equal(gateway.isReady(), false)
  instances[1].emit('ready')
  assert.equal(gateway.isReady(), true)
  await gateway.logout()
})
