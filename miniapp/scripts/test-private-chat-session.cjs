/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')

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

function message(overrides = {}) {
  return {
    messageNo: 'M1',
    clientMsgId: 'C1',
    conversationNo: 'CV1',
    senderUserNo: 'U2',
    direction: 'incoming',
    type: 'text',
    content: '你好',
    sentAt: '2026-10-10T10:00:00',
    timeText: '',
    sendStatus: 'received',
    timMessageId: 'T1',
    timMsgKey: 'K1',
    ...overrides,
  }
}

test('私信消息按所有稳定标识去重且语义无变化时保留原数组引用', () => {
  const {
    mergePrivateChatMessages,
  } = require(path.join(root, 'src/domain/privateChatSession.ts'))
  const first = [message()]

  assert.equal(mergePrivateChatMessages(first, [message()]), first)
  assert.equal(
    mergePrivateChatMessages(first, [message({ messageNo: '', clientMsgId: '', timMessageId: '', timMsgKey: 'K1' })]),
    first,
    '仅 timMsgKey 相同也必须识别为同一条消息'
  )

  const merged = mergePrivateChatMessages(first, [message({
    messageNo: 'M2',
    clientMsgId: 'C2',
    timMessageId: 'T2',
    timMsgKey: 'K2',
    sentAt: '2026-10-10T10:01:00',
  })])
  assert.notEqual(merged, first)
  assert.deepEqual(merged.map(item => item.timMessageId), ['T1', 'T2'])
})

test('私信会话缓存按登录用户和会话隔离并保存滚动快照', () => {
  const {
    clearPrivateChatSession,
    readPrivateChatSession,
    writePrivateChatSession,
  } = require(path.join(root, 'src/domain/privateChatSession.ts'))
  const messages = [message()]

  writePrivateChatSession('U1', 'CV1', {
    messages,
    initialLoaded: true,
    scrollTop: 320,
    scrollHeight: 1600,
    nearBottom: false,
  })

  const cached = readPrivateChatSession('U1', 'CV1')
  assert.equal(cached.messages, messages)
  assert.equal(cached.scrollTop, 320)
  assert.equal(cached.nearBottom, false)
  assert.equal(readPrivateChatSession('U2', 'CV1'), undefined)

  clearPrivateChatSession('U1', 'CV1')
  assert.equal(readPrivateChatSession('U1', 'CV1'), undefined)
})
