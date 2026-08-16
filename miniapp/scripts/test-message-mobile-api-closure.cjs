/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
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

function read(relativePath) {
  return fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
}

function requireDomain(relativePath) {
  const absolutePath = path.join(miniappRoot, relativePath)
  assert.ok(fs.existsSync(absolutePath), `消息闭环实现尚不存在：${relativePath}`)
  return require(absolutePath)
}

test('未读角标只使用后端真值并安全格式化', () => {
  const { formatMessageBadge } = requireDomain('src/domain/messageRuntime.ts')
  assert.equal(formatMessageBadge(-1), '')
  assert.equal(formatMessageBadge(0), '')
  assert.equal(formatMessageBadge(1), '1')
  assert.equal(formatMessageBadge(99), '99')
  assert.equal(formatMessageBadge(100), '99+')
  assert.equal(formatMessageBadge(Number.NaN), '')
})

test('未知会话状态、协议和系统跳转默认安全降级', () => {
  const {
    isSupportedMessageProtocol,
    isSafeSystemJump,
    normalizeConversationStatus,
  } = requireDomain('src/domain/messageRuntime.ts')

  assert.equal(normalizeConversationStatus('active'), 'active')
  assert.equal(normalizeConversationStatus('blocked'), 'blocked')
  assert.equal(normalizeConversationStatus('future_state'), 'invalid')
  assert.equal(isSupportedMessageProtocol(1), true)
  assert.equal(isSupportedMessageProtocol(2), false)
  assert.equal(isSafeSystemJump('none'), true)
  assert.equal(isSafeSystemJump('miniapp_page', '/pages/profile/index'), true)
  assert.equal(isSafeSystemJump('miniapp_page', 'https://evil.example'), false)
  assert.equal(isSafeSystemJump('future_jump', '/pages/profile/index'), false)
})

test('30001 至 30024 错误码返回明确且保守的页面动作', () => {
  const { resolveMessageError } = requireDomain('src/domain/messageRuntime.ts')

  assert.equal(resolveMessageError({ code: 30001 }).action, 'restrict')
  assert.equal(resolveMessageError({ code: 30007 }).action, 'recharge')
  assert.equal(resolveMessageError({ code: 30011 }).action, 'refresh')
  assert.equal(resolveMessageError({ code: 30015 }).action, 'read_only')
  assert.equal(resolveMessageError({ code: 30020 }).action, 'stop_retry')
  assert.equal(resolveMessageError({ code: 30021 }).action, 'reprecheck')
  assert.equal(resolveMessageError({ code: 30023 }).action, 'im_read_only')
  assert.equal(resolveMessageError({ code: 39999 }).action, 'retry')
})

test('真实 HTTP Provider 覆盖 handoff 全部消息接口且禁用退役动作', () => {
  const source = read('src/services/message.ts')
  const requiredRoutes = [
    '/miniapp/im/credentials',
    '/miniapp/message/home',
    '/miniapp/message/unread-summary',
    '/miniapp/message/conversations',
    '/miniapp/message/whispers',
    '/miniapp/message/assistant/messages',
    '/miniapp/message/system-messages',
    '/miniapp/community/reports',
  ]

  for (const route of requiredRoutes) assert.match(source, new RegExp(route.replaceAll('/', '\\/')))
  assert.match(source, /class RealMessageService/)
  assert.match(source, /Idempotency-Key/)
  assert.doesNotMatch(source, /ignoreWhisper|cancelWhisper|batchHideWhispers/)
  assert.doesNotMatch(source, /真实 Provider 尚未接入/)
})

test('悄悄话来源严格对齐 handoff 且所有入口使用稳定用户编号', () => {
  const {
    buildWhisperCreatePayload,
    buildWhisperPrecheckPayload,
    resolveStableWhisperTargetUserNo,
    resolveWhisperErrorMessage,
    resolveWhisperRouteSourceScene,
  } = requireDomain('src/domain/whisperRuntime.ts')

  assert.deepEqual(
    buildWhisperPrecheckPayload({
      targetUserNo: 'USR-000000000140',
      sourceScene: 'community_post',
      sourceBizNo: 'POST-001',
    }),
    {
      targetUserNo: 'USR-000000000140',
      sourceScene: 'community_post',
      sourceBizNo: 'POST-001',
    },
  )
  assert.deepEqual(
    buildWhisperCreatePayload({
      targetUserNo: 'USR-000000000140',
      sourceScene: 'profile',
      content: '认真看过你的资料',
      quoteToken: 'quote-001',
    }),
    {
      targetUserNo: 'USR-000000000140',
      sourceScene: 'profile',
      content: '认真看过你的资料',
      quoteToken: 'quote-001',
    },
  )
  assert.throws(
    () => buildWhisperPrecheckPayload({
      targetUserNo: 'USR-000000000140',
      sourceScene: 'community_post',
    }),
    /申请入口信息不完整/,
  )
  assert.equal(resolveStableWhisperTargetUserNo(undefined, 140), 'USR-000000000140')
  assert.equal(resolveStableWhisperTargetUserNo('USR-000000000208', 208), 'USR-000000000208')
  assert.equal(resolveWhisperRouteSourceScene('fate'), 'recommendation')
  assert.equal(resolveWhisperRouteSourceScene(undefined), 'profile')
  assert.equal(
    resolveWhisperErrorMessage(new Error('sourceScene: 来源场景不能为空'), '预检失败'),
    '申请入口信息已失效，请返回后重新进入',
  )

  const service = read('src/services/message.ts')
  const types = read('src/types/message.ts')
  assert.match(service, /sourceScene:\s*WhisperSourceScene/)
  assert.match(service, /buildWhisperPrecheckPayload\(input\)/)
  assert.match(service, /buildWhisperCreatePayload\(input\)/)
  assert.doesNotMatch(service, /sourcePostNo/)
  assert.doesNotMatch(service, /\bscene\?:\s*'community_post'/)
  assert.doesNotMatch(types, /interface WhisperPrecheckResponse[\s\S]*?\n\s*allowed:/)
  assert.doesNotMatch(types, /interface WhisperPrecheckResponse[\s\S]*?\n\s*targetAvatarUrl:/)
  assert.doesNotMatch(service, /canSend:\s*true,\s*allowed:\s*true/)

  const detail = read('src/pages/message/whisper-detail.tsx')
  assert.match(detail, /sourceScene/)
  assert.match(detail, /resolveWhisperErrorMessage/)
  assert.doesNotMatch(detail, /scene:\s*'profile'/)
  assert.doesNotMatch(detail, /\.allowed\b/)

  const postDetail = read('src/pages/qianxun/post-detail.tsx')
  assert.match(postDetail, /precheck\?\.canSend/)
  assert.doesNotMatch(postDetail, /precheck\?\.allowed|whisperPrecheck\.allowed/)

  for (const relativePath of [
    'src/features/qianxun/QianxunFamilyPage.tsx',
    'src/features/qianxun/QianxunZhiyinTab.tsx',
    'src/pages/qianxun/topic.tsx',
  ]) {
    const source = read(relativePath)
    assert.match(source, /sourceScene=community_post/)
    assert.match(source, /sourceBizNo=/)
    assert.match(source, /resolveStableWhisperTargetUserNo/)
  }

  const recommendation = read('src/pages/recommend/index.tsx')
  assert.match(recommendation, /sourceScene=recommendation/)
})

test('LiteChat 网关固定精确版本并具备凭证刷新、文本发送、历史、事件和已读', () => {
  const packageJson = JSON.parse(read('package.json'))
  const gateway = read('src/im/LiteChatMessageImGateway.ts')
  const runtime = read('src/im/messageRuntime.ts')

  assert.equal(packageJson.dependencies['@tencentcloud/lite-chat'], '4.4.2')
  assert.match(gateway, /createTextMessage/)
  assert.match(gateway, /sendMessage/)
  assert.match(gateway, /getMessageList/)
  assert.match(gateway, /setMessageRead/)
  assert.match(runtime, /MESSAGE_RECEIVED/)
  assert.match(runtime, /CONVERSATION_LIST_UPDATED/)
  assert.match(runtime, /10\s*\*\s*60/)
  assert.doesNotMatch(runtime, /setStorageSync[^\n]*userSig/i)

  const app = read('src/app.tsx')
  const home = read('src/pages/chat/index.tsx')
  assert.doesNotMatch(app, /from ['"]\.\/im\//)
  assert.doesNotMatch(home, /from ['"]@\/im/)
  assert.match(app, /messagePlatformRuntime/)
})

test('旧聊天页重发遇到 TIM 20003 时先触发账号自愈再安全重发', () => {
  const { isTimAccountMissingError } = requireDomain('src/domain/messageRuntime.ts')
  assert.equal(typeof isTimAccountMissingError, 'function')
  assert.equal(isTimAccountMissingError({ code: 20003 }), true)
  assert.equal(
    isTimAccountMissingError({
      message: 'Unknown failed. error: {"message":"invalid UserID","code":20003}',
    }),
    true,
  )
  assert.equal(isTimAccountMissingError({ code: 30023 }), false)
  assert.equal(isTimAccountMissingError({ code: Symbol('invalid') }), false)
  assert.equal(isTimAccountMissingError({ message: '{"code":120003}' }), false)

  const page = read('src/pages/message/private-chat.tsx')
  assert.match(page, /isTimAccountMissingError\(error\)/)
  assert.match(page, /await service\.getConversation\(conversationNo\)/)
  assert.match(
    page,
    /gateway\.retry\(\s*recoveredTimConversationId,\s*retryTarget\.clientMsgId,?\s*\)/,
  )
  assert.match(page, /私信账号同步失败，请重新进入会话/)
  assert.doesNotMatch(page, /title:\s*error instanceof Error \? error\.message : '重发失败'/)
})

test('普通私信显式遵循已确认的不做发送前文本审核决策', () => {
  const gateway = read('src/im/LiteChatMessageImGateway.ts')
  const technicalDesign = read('../docs/技术方案/2026-07-31-消息、私信与通知中心-tcdesign.md')

  assert.match(gateway, /excludedFromContentModeration:\s*true/)
  assert.match(technicalDesign, /平台与 TIM 均不做本期普通私信和悄悄话的发送前文本内容审核/)
})

test('同一私信会话的并发首屏加载必须合并为一次请求', async () => {
  const { createKeyedSingleFlight } = requireDomain('src/domain/messageRuntime.ts')
  assert.equal(typeof createKeyedSingleFlight, 'function')

  let callCount = 0
  let release
  const blocker = new Promise(resolve => { release = resolve })
  const singleFlight = createKeyedSingleFlight()
  const first = singleFlight.run('conversation-1', async () => {
    callCount += 1
    await blocker
    return 'loaded'
  })
  const second = singleFlight.run('conversation-1', async () => {
    callCount += 1
    return 'duplicate'
  })

  assert.equal(first, second)
  assert.equal(callCount, 1)
  release()
  assert.deepEqual(await Promise.all([first, second]), ['loaded', 'loaded'])
  assert.equal(await singleFlight.run('conversation-1', async () => {
    callCount += 1
    return 'refreshed'
  }), 'refreshed')
  assert.equal(callCount, 2)

  const privateChat = read('src/pages/message/private-chat.tsx')
  assert.match(privateChat, /createKeyedSingleFlight/)
  assert.match(privateChat, /loadSingleFlight\.run\(conversationNo/)
  assert.doesNotMatch(privateChat, /\[conversationNo, gateway, timConversationId\]/)
})

test('悄悄话详情直接使用平台正文且不扫描 TIM 历史', () => {
  const types = read('src/types/message.ts')
  const detail = read('src/pages/message/whisper-detail.tsx')
  const gatewayContract = read('src/im/MessageImGateway.ts')
  const liteChatGateway = read('src/im/LiteChatMessageImGateway.ts')

  assert.match(types, /interface MessageWhisperDetail[\s\S]*content:\s*string\s*\|\s*null/)
  assert.match(types, /interface MessageWhisperDetail[\s\S]*contentAvailable:\s*boolean/)
  assert.match(detail, /setMessageContent\(nextRecord\.contentAvailable\s*\?\s*nextRecord\.content\s*\|\|\s*''\s*:\s*''\)/)
  assert.doesNotMatch(detail, /gateway\.findMessage/)
  assert.doesNotMatch(detail, /requestTimMessageId|requestTimMsgKey|timConversationId/)
  assert.doesNotMatch(gatewayContract, /findMessage/)
  assert.doesNotMatch(liteChatGateway, /findMessage/)
})

test('页面移除硬编码私信和退役悄悄话交互，接入受限态与精确已读', () => {
  const home = read('src/pages/chat/index.tsx')
  const privateList = read('src/pages/message/private-list.tsx')
  const privateChat = read('src/pages/message/private-chat.tsx')
  const whisperList = read('src/pages/message/whisper-list.tsx')
  const whisperDetail = read('src/pages/message/whisper-detail.tsx')
  const channel = read('src/pages/message/channel.tsx')
  const report = read('src/pages/message/report.tsx')

  assert.match(home, /accessMode/)
  assert.doesNotMatch(privateList, /const designRows/)
  assert.match(privateChat, /canSend/)
  assert.match(privateChat, /lastMessageNo/)
  assert.match(privateChat, /onLongPress/)
  assert.match(privateChat, /targetType\s*=\s*message\s*\?\s*'message'/)
  assert.match(whisperList, /readWhispers/)
  assert.match(channel, /readAck|acceptedNos/)
  assert.match(report, /已拉黑并提交举报/)
  assert.doesNotMatch(report, /chooseMedia|上传凭证图片|处罚细则页面待接入/)

  for (const source of [whisperList, whisperDetail]) {
    assert.doesNotMatch(source, /ignoreWhisper|cancelWhisper|batchHideWhispers/)
    assert.doesNotMatch(source, /忽略|取消申请|批量隐藏/)
  }
})
