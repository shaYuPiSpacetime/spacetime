const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const chat = fs.readFileSync(path.join(root, 'src/pages/message/private-chat.tsx'), 'utf8')
const messageStyles = fs.readFileSync(path.join(root, 'src/pages/message/message.scss'), 'utf8')
const service = fs.readFileSync(path.join(root, 'src/services/message.ts'), 'utf8')

test('private chat separates initial and history loading without moving content', () => {
  assert.match(chat, /initialLoading/)
  assert.match(chat, /historyLoading/)
  assert.match(chat, /scrollAnchoring/)
  assert.match(chat, /historyAnchorId/)
  assert.doesNotMatch(chat, /\{loading \? <Text className="message-empty-copy">加载中\.\.\.<\/Text> : null\}/)
})

test('ordinary text send uses LiteChat SDK directly and relies on after-send callback', () => {
  assert.match(service, /sendConversationMessage/)
  assert.match(service, /\/conversations\/\$\{encodeURIComponent\(conversationNo\)\}\/messages/)
  assert.match(chat, /gateway\.sendText\(timConversationId, value\)/)
  assert.doesNotMatch(chat, /service\.sendConversationMessage\(conversationNo/)
})

test('ordinary text send clears composer before SDK network wait and never shows connection strip', () => {
  const establishedStart = chat.indexOf('  const canSend = Boolean(detail?.canSend)')
  const sendStart = chat.indexOf('  const send = async () => {', establishedStart)
  const retryStart = chat.indexOf('  const retry = async () => {', sendStart)
  const sendBlock = chat.slice(sendStart, retryStart)
  assert.match(sendBlock, /setInputValue\(''\)[\s\S]*await ensureConnected\(\)[\s\S]*gateway\.sendText/)
  assert.doesNotMatch(sendBlock, /!value \|\| sending/)
  assert.doesNotMatch(chat, /私信连接中，可先输入/)
  assert.doesNotMatch(chat, /chat-connection-state/)
  assert.doesNotMatch(messageStyles, /chat-connection-state/)
})

test('message merge uses stable provider identities', () => {
  assert.match(chat, /function messageMergeKey/)
  assert.match(chat, /message\.messageNo \|\| message\.timMessageId \|\| message\.clientMsgId/)
})
