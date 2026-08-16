/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const miniappRoot = path.resolve(__dirname, '..')

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

const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function resolveMiniappAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(
      this,
      path.join(miniappRoot, 'src', request.slice(2)),
      parent,
      isMain,
      options
    )
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}

function requireDomain(relativePath) {
  const absolutePath = path.join(miniappRoot, relativePath)
  assert.ok(fs.existsSync(absolutePath), `消息领域实现尚不存在：${relativePath}`)
  return require(absolutePath)
}

function freshStore() {
  const { useMessageStore } = requireDomain('src/stores/messageStore.ts')
  useMessageStore.getState().reset()
  return useMessageStore
}

test('初始夹具提供首页、会话、悄悄话和官方频道数据', () => {
  const { createInitialMessageState } = requireDomain('src/mocks/message/fixtures.ts')
  const state = createInitialMessageState()

  assert.equal(state.home.rows.length >= 4, true)
  assert.equal(state.conversations.length >= 1, true)
  assert.equal(state.whispers.length >= 3, true)
  assert.equal(state.channels.assistant.length >= 1, true)
  assert.equal(state.channels.system.length >= 1, true)
  assert.equal(state.contentMaxLength, 60)
})

test('失败消息重发复用 clientMsgId 并转为已发送', () => {
  const store = freshStore()
  const failed = store.getState().sendText('conversation-lin', '请再试一次', { shouldFail: true })

  assert.equal(failed.sendStatus, 'failed')
  const retried = store.getState().retryMessage('conversation-lin', failed.clientMsgId)
  assert.equal(retried.clientMsgId, failed.clientMsgId)
  assert.equal(retried.sendStatus, 'sent')
  assert.equal(
    store
      .getState()
      .messagesByConversation[
        'conversation-lin'
      ].filter(item => item.clientMsgId === failed.clientMsgId).length,
    1
  )
})

test('标记会话已读同时清零会话和首页未读数', () => {
  const store = freshStore()
  assert.equal(store.getState().unread.privateMessageCount > 0, true)

  store.getState().markConversationRead('conversation-lin')

  assert.equal(
    store.getState().conversations.find(item => item.conversationNo === 'conversation-lin')
      .unreadCount,
    0
  )
  assert.equal(store.getState().unread.privateMessageCount, 0)
})

test('悄悄话列表仅投影收发双方待回复记录', () => {
  const store = freshStore()
  const visiblePending = store
    .getState()
    .whispers.filter(item => item.visible && item.state === 'pending')

  assert.equal(visiblePending.some(item => item.direction === 'received'), true)
  assert.equal(visiblePending.some(item => item.direction === 'sent'), true)
  assert.equal(visiblePending.every(item => item.state === 'pending'), true)
})

test('悄悄话创建限制 60 字且相同 Idempotency-Key 不重复创建', () => {
  const store = freshStore()
  const payload = { receiverUserNo: 'user-xiaoyu', content: '想认识你', costCoins: 100 }
  const first = store.getState().createWhisper(payload, 'whisper-key-001')
  const second = store.getState().createWhisper(payload, 'whisper-key-001')

  assert.equal(second.whisperNo, first.whisperNo)
  assert.equal(
    store.getState().whispers.filter(item => item.whisperNo === first.whisperNo).length,
    1
  )
  assert.throws(
    () =>
      store.getState().createWhisper({ ...payload, content: '一'.repeat(61) }, 'whisper-key-002'),
    /60/
  )
})

test('Mock IM 网关提供历史、发送、重发和已读能力', async () => {
  const store = freshStore()
  const { MockMessageImGateway } = requireDomain('src/im/MockMessageImGateway.ts')
  const gateway = new MockMessageImGateway(store)

  const history = await gateway.listHistory('conversation-lin')
  assert.equal(history.list.length >= 1, true)
  const failed = await gateway.sendText('conversation-lin', '网络异常', { shouldFail: true })
  const retried = await gateway.retry('conversation-lin', failed.clientMsgId)
  await gateway.markRead('conversation-lin')

  assert.equal(retried.clientMsgId, failed.clientMsgId)
  assert.equal(retried.sendStatus, 'sent')
  assert.equal(
    store.getState().conversations.find(item => item.conversationNo === 'conversation-lin')
      .unreadCount,
    0
  )
})

test('18 个蓝湖设计状态完整映射到 7 个业务路由和稳定 mockScene', () => {
  const { messageDesignScenes } = requireDomain('src/mocks/message/designScenes.ts')
  const expectedDesignIds = [
    '626cd513-005e-4df8-8456-b5280872ba23',
    '4eefc2dd-05c7-4a0c-b095-f252741f3781',
    '955469c9-c067-4f6f-97c8-57fcb7fb6ee4',
    '57f51864-59c3-4deb-b990-0d946ed5275c',
    '797ff271-e45a-4262-bd99-9ddb58bfad56',
    '60f5f2a4-ed1b-4a73-8291-ce65dca97a21',
    '5cff0169-1e9c-4f1d-8021-cf19da353ece',
    'da4cd120-0250-4b6c-9d10-7704106317a2',
    '4ee98b8d-72b5-4c2b-b02e-3567afaf2600',
    'a3c5e11a-0c8f-4adb-b1f9-e507925d6b74',
    'fa13c6d0-7d00-4373-80d2-59821eeb6cc4',
    'aabf0ea4-b22c-4a5c-afc5-f48f291a4046',
    '798b68f9-fda4-4b5d-aca4-b363c29407e3',
    'e3ab4fcf-8f3a-44da-b997-e86d13a295fc',
    '4a0eaf37-162c-409a-ba83-a62eed00e9c4',
    '5e8feaf3-cd84-4ea5-93ba-b4e181b92a17',
    '38ecd723-33cd-4961-9b50-59d8c601a1ad',
    'ff867af1-fc44-45b9-b2bc-0f81e51187f9',
  ]

  assert.deepEqual(messageDesignScenes.map(item => item.designId).sort(), expectedDesignIds.sort())
  assert.equal(new Set(messageDesignScenes.map(item => item.route)).size, 7)
  assert.equal(new Set(messageDesignScenes.map(item => item.mockScene)).size, 18)
})

test('举报契约使用动态八类原因、稳定请求号、统一 chat 目标与 400 字限制', () => {
  const source = fs.readFileSync(path.join(miniappRoot, 'src/services/message.ts'), 'utf8')
  for (const reason of [
    'avatar_mismatch',
    'false_profile',
    'contact_disclosure',
    'marriage_agency',
    'spam_ad',
    'fraud',
    'harassment',
    'other',
  ]) {
    assert.match(source, new RegExp(`'${reason}'`))
  }
  assert.match(source, /clientReportId/)
  assert.match(source, /targetType:\s*'chat'/)
  assert.match(source, /targetId:\s*string/)
  assert.match(source, /getCommunityReportConfig/)
  assert.doesNotMatch(source, /targetBizNo/)
  assert.match(source, /length > 400/)
  assert.doesNotMatch(source, /reasonCode:\s*'AVATAR_MISMATCH'/)
})
