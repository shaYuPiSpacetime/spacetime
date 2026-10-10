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

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

test('前台轮询未读、后台停止且慢请求不会重入', async () => {
  let unreadCalls = 0
  let concurrentUnreadCalls = 0
  let maxConcurrentUnreadCalls = 0
  const appliedUnread = []
  const store = {
    setLoading() {},
    applyHome() {},
    applyUnread(summary) { appliedUnread.push(summary.messageUnreadCount) },
    clear() {},
    setError() {},
  }
  const messageService = {
    async getHome() {
      return { accessMode: 'normal', restrictionPrompt: null }
    },
    async getUnreadSummary() {
      unreadCalls += 1
      concurrentUnreadCalls += 1
      maxConcurrentUnreadCalls = Math.max(maxConcurrentUnreadCalls, concurrentUnreadCalls)
      await wait(12)
      concurrentUnreadCalls -= 1
      return { messageUnreadCount: unreadCalls }
    },
  }

  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === '../domain/messageRuntime') {
      return { resolveMessageError: () => ({ message: 'error' }) }
    }
    if (request === './request') return { getApiErrorCode: () => undefined }
    if (request === './message') return { messageService }
    if (request === '../stores/messageRuntimeStore') {
      return { useMessageRuntimeStore: { getState: () => store } }
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  let MessagePlatformRuntime
  try {
    ;({ MessagePlatformRuntime } = require(path.resolve(__dirname, '../src/services/messagePlatformRuntime.ts')))
  } finally {
    Module._load = originalLoad
  }

  const runtime = new MessagePlatformRuntime(5)
  await runtime.onForeground()
  await wait(38)
  assert.ok(unreadCalls >= 2, '前台应持续刷新未读汇总')
  assert.equal(maxConcurrentUnreadCalls, 1, '轮询不得并发重入')
  assert.ok(appliedUnread.length >= 1)

  runtime.onBackground()
  await wait(15)
  const callsAfterBackgroundSettled = unreadCalls
  await wait(25)
  assert.equal(unreadCalls, callsAfterBackgroundSettled, '进入后台后必须停止新请求')
  runtime.stop()

  const stoppedRuntime = new MessagePlatformRuntime(5)
  await stoppedRuntime.onForeground()
  await wait(7)
  stoppedRuntime.stop()
  const appliedAtStop = appliedUnread.length
  await wait(20)
  assert.equal(appliedUnread.length, appliedAtStop, '退出登录后在途请求不得恢复已清空角标')
})

test('应用隐藏时通知平台运行时停止轮询', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../src/app.tsx'), 'utf8')
  assert.match(app, /useDidHide\(\(\) => \{[\s\S]*messagePlatformRuntime\.onBackground\(\)/)
})
