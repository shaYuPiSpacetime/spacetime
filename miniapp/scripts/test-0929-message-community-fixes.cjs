const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const readRepo = relative => fs.readFileSync(path.resolve(root, '..', relative), 'utf8')

test('community cards expose the real backend profile-completeness score', () => {
  const vo = readRepo('backend/src/main/java/com/spacetime/miniapp/dto/response/CommunityPostCardVO.java')
  const service = readRepo('backend/src/main/java/com/spacetime/miniapp/service/impl/CommunityServiceImpl.java')
  const types = read('src/services/community.ts')
  const detail = read('src/pages/qianxun/post-detail.tsx')

  assert.match(vo, /authorProfileCompletion/)
  assert.match(service, /Prd01ProfileCompletenessCalculator/)
  assert.match(service, /setAuthorProfileCompletion/)
  assert.match(types, /authorProfileCompletion\?: number/)
  assert.match(detail, /formatCommunityAuthorMeta/)
  assert.doesNotMatch(detail, /\|\|\s*['"]资料待完善['"]/)
})

test('private chat avatars open the peer profile', () => {
  const shared = read('src/pages/message/shared.tsx')
  const chat = read('src/pages/message/private-chat.tsx')

  assert.match(shared, /onProfileClick\?: \(\) => void/)
  assert.match(chat, /\/pages\/heart\/user\?targetUserId=/)
  assert.match(chat, /onProfileClick=/)
})

test('community rules open a full text page instead of a modal', () => {
  const channel = read('src/pages/message/channel.tsx')
  const config = read('src/app.config.ts')

  assert.match(channel, /pages\/message\/community-rules/)
  assert.doesNotMatch(channel, /showModal\(\{\s*title:\s*['"]社区规则['"]/)
  assert.match(config, /community-rules/)
  assert.ok(fs.existsSync(path.join(root, 'src/pages/message/community-rules.tsx')))
})

test('reading a conversation clears its cached red dot immediately', () => {
  const store = read('src/stores/messageRuntimeStore.ts')
  const chat = read('src/pages/message/private-chat.tsx')

  assert.match(store, /markConversationRead: \(conversationNo: string, lastMessageNo\?: string\) => void/)
  assert.match(store, /unreadCount:\s*0/)
  assert.match(chat, /markConversationRead\(conversationNo,/)
})

test('ideal-type profile resolves a conversation directly through the backend', () => {
  const profile = read('src/pages/heart/user.tsx')
  const messageService = read('src/services/message.ts')
  const backendService = readRepo('backend/src/main/java/com/spacetime/miniapp/service/MiniappMessageService.java')

  assert.match(profile, /resolveConversationByPeerUserId/)
  assert.match(messageService, /resolveConversationByPeerUserId/)
  assert.match(backendService, /resolveConversation/)
})

test('first whisper reply keeps the input visible above the keyboard', () => {
  const chat = read('src/pages/message/private-chat.tsx')
  const pending = chat.slice(chat.indexOf('function PendingWhisperChat'), chat.indexOf('function EstablishedPrivateChatPage'))

  assert.match(pending, /keyboardHeight/)
  assert.match(pending, /adjustPosition=\{false\}/)
  assert.match(pending, /holdKeyboard/)
  assert.match(pending, /onKeyboardHeightChange/)
  assert.match(pending, /bottom:\s*keyboardHeight/)
})
