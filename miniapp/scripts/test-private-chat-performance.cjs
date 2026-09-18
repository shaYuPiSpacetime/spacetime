const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const chat = fs.readFileSync(path.join(root, 'src/pages/message/private-chat.tsx'), 'utf8')
const service = fs.readFileSync(path.join(root, 'src/services/message.ts'), 'utf8')

test('private chat separates initial and history loading without moving content', () => {
  assert.match(chat, /initialLoading/)
  assert.match(chat, /historyLoading/)
  assert.match(chat, /scrollAnchoring/)
  assert.match(chat, /historyAnchorId/)
  assert.doesNotMatch(chat, /\{loading \? <Text className="message-empty-copy">加载中\.\.\.<\/Text> : null\}/)
})

test('ordinary text send uses the reliable platform API', () => {
  assert.match(service, /sendConversationMessage/)
  assert.match(service, /\/conversations\/\$\{encodeURIComponent\(conversationNo\)\}\/messages/)
  assert.match(chat, /service\.sendConversationMessage/)
  assert.doesNotMatch(chat, /gateway\.sendText\(timConversationId, value\)/)
})

test('message merge uses stable provider identities', () => {
  assert.match(chat, /function messageMergeKey/)
  assert.match(chat, /message\.messageNo \|\| message\.timMessageId \|\| message\.clientMsgId/)
})
