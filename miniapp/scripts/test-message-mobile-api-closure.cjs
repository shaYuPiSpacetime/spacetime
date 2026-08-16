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
    resolveWhisperStatusDescription,
    shouldInlineWhisperSubmitError,
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
  assert.equal(resolveWhisperStatusDescription(true), '发送后等待对方回复')
  assert.equal(resolveWhisperStatusDescription(false, 'pending', 'received'), '回复后将开启私信会话')
  assert.equal(resolveWhisperStatusDescription(false, 'pending', 'sent'), '等待对方回复')
  assert.equal(resolveWhisperStatusDescription(false, 'expired', 'sent'), '该申请已结束')
  assert.equal(shouldInlineWhisperSubmitError(30015), true)
  assert.equal(shouldInlineWhisperSubmitError(30021), false)

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
  assert.match(detail, /resolveWhisperStatusDescription/)
  assert.match(detail, /shouldInlineWhisperSubmitError/)
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
  const c2cReadPlugin = read('src/im/LiteChatC2CReadPlugin.ts')
  const runtime = read('src/im/messageRuntime.ts')

  assert.equal(packageJson.dependencies['@tencentcloud/lite-chat'], '4.4.2')
  assert.match(gateway, /createTextMessage/)
  assert.match(gateway, /sendMessage/)
  assert.match(gateway, /getMessageList/)
  assert.match(gateway, /c2cReadPlugin\.markRead/)
  assert.match(c2cReadPlugin, /openim\.msgreaded/)
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

test('LiteChat 单聊会话号严格使用 C2C 加 UserID 且兼容已下发的错误分隔符', () => {
  const {
    normalizeTimC2CConversationId,
    resolveTimC2CTargetUserId,
  } = requireDomain('src/domain/messageRuntime.ts')

  assert.equal(typeof normalizeTimC2CConversationId, 'function')
  assert.equal(typeof resolveTimC2CTargetUserId, 'function')
  assert.equal(normalizeTimC2CConversationId('C2Ctu_peer_2'), 'C2Ctu_peer_2')
  assert.equal(normalizeTimC2CConversationId('C2C_tu_peer_2'), 'C2Ctu_peer_2')
  assert.equal(resolveTimC2CTargetUserId('C2Ctu_peer_2'), 'tu_peer_2')
  assert.equal(resolveTimC2CTargetUserId('C2C_tu_peer_2'), 'tu_peer_2')
  assert.throws(() => resolveTimC2CTargetUserId('GROUP10001'), /TIM 单聊会话标识无效/)

  const gateway = read('src/im/LiteChatMessageImGateway.ts')
  assert.match(gateway, /normalizeTimC2CConversationId\(timConversationId\)/)
  assert.match(gateway, /resolveTimC2CTargetUserId\(timConversationId\)/)
  assert.match(gateway, /raw\.to !== targetUserId/)
  assert.match(gateway, /chat\.createTextMessage/)
  assert.doesNotMatch(gateway, /timConversationId\.slice\(3\)/)
  assert.doesNotMatch(gateway, /retry\(_timConversationId:/)
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

test('私信首屏按需加载轻量 TIM 且连接异常不会无限卡住交互', async () => {
  const { withMessageTimeout } = requireDomain('src/domain/messageRuntime.ts')
  const privateChat = read('src/pages/message/private-chat.tsx')
  const channel = read('src/pages/message/channel.tsx')
  const gatewayLoader = read('src/im/loadMessageImGateway.ts')
  const liteChatGateway = read('src/im/LiteChatMessageImGateway.ts')
  const c2cReadPlugin = read('src/im/LiteChatC2CReadPlugin.ts')
  const appConfig = read('src/app.config.ts')

  await assert.rejects(
    withMessageTimeout(new Promise(() => undefined), 5, '私信连接超时，请重试'),
    /私信连接超时，请重试/,
  )

  assert.doesNotMatch(privateChat, /from ['"]@\/im['"]/, '私信页面不得在模块加载阶段同步引入 TIM SDK')
  assert.match(privateChat, /loadMessageImGateway/)
  assert.match(privateChat, /connectionState/)
  assert.match(privateChat, /connectionPromiseRef/, '初始化与点击发送必须复用同一个连接任务')
  assert.match(privateChat, /sending \? '发送中' : '发送'/)
  assert.match(privateChat, /setInputValue\(value\)/, '发送失败必须恢复用户已经输入的正文')
  assert.doesNotMatch(channel, /@\/im\/messageRuntime/, '官方频道不得为了刷新未读而提前加载 TIM SDK')
  assert.match(channel, /messagePlatformRuntime/)
  assert.match(gatewayLoader, /import\(['"]\.\/LiteChatMessageImGateway['"]\)/)
  assert.match(liteChatGateway, /from ['"]@tencentcloud\/lite-chat\/basic['"]/, '文本私信只加载 LiteChat 基础包')
  assert.doesNotMatch(liteChatGateway, /@tencentcloud\/lite-chat\/plugins\/conversation/, '私信页不得引入 50 KiB 完整会话插件')
  assert.match(liteChatGateway, /createLiteChatC2CReadPlugin/, '基础包必须补齐单聊已读能力')
  assert.match(liteChatGateway, /chat\.use\(this\.c2cReadPlugin\)/, '登录前必须注册轻量单聊已读插件')
  assert.match(c2cReadPlugin, /servcmd:\s*['"]openim\.msgreaded['"]/, '轻量插件必须调用 TIM 单聊已读命令')
  assert.match(privateChat, /Promise\.allSettled\(\[\s*gateway\.markRead\(gatewayId\),\s*service\.markConversationRead\(/, 'TIM 与平台已读应独立上报')
  assert.match(appConfig, /preloadRule:[\s\S]*['"]pages\/chat\/index['"][\s\S]*packages:\s*\[['"]pages\/message['"]\]/)
})

test('轻量 TIM 单聊已读插件只上报当前会话最新消息时间', async () => {
  const {
    buildLiteChatC2CReadPayload,
    createLiteChatC2CReadPlugin,
  } = requireDomain('src/im/LiteChatC2CReadPlugin.ts')
  assert.deepEqual(buildLiteChatC2CReadPayload('C2Ctu_peer', 1_786_766_016), {
    C2CMsgReaded: {
      Cookie: '',
      C2CMsgReadedItem: [{
        To_Account: 'tu_peer',
        LastedMsgTime: 1_786_766_016,
        Receipt: 1,
      }],
    },
  })
  assert.throws(() => buildLiteChatC2CReadPayload('GROUPdemo', 1), /TIM 单聊会话号无效/)
  assert.throws(() => buildLiteChatC2CReadPayload('C2Ctu_peer', 0), /最新消息时间无效/)

  const packets = []
  const plugin = createLiteChatC2CReadPlugin()
  plugin.install({
    common: {
      buildAndSendPacket: async options => packets.push(options),
    },
  })
  await plugin.markRead('C2Ctu_peer', 1_786_766_016)
  assert.equal(plugin.name, 'SpacetimeC2CRead')
  assert.deepEqual(packets, [{
    servcmd: 'openim.msgreaded',
    data: buildLiteChatC2CReadPayload('C2Ctu_peer', 1_786_766_016),
  }])
})

test('TIM 登录返回早于 SDK_READY 时必须等待就绪后再拉取历史', async () => {
  const { waitForMessageGatewayReady } = requireDomain('src/domain/messageRuntime.ts')
  let ready = false
  let listener = () => undefined
  let unsubscribed = false
  const gateway = {
    isReady: () => ready,
    onEvent: callback => {
      listener = callback
      return () => {
        unsubscribed = true
      }
    },
  }

  const waiting = waitForMessageGatewayReady(gateway, 100, '私信连接超时，请重试')
  setTimeout(() => {
    ready = true
    listener({ type: 'ready' })
  }, 5)

  await waiting
  assert.equal(unsubscribed, true, 'SDK_READY 后必须清理临时事件监听')

  const privateChat = read('src/pages/message/private-chat.tsx')
  assert.match(privateChat, /waitForMessageGatewayReady\(\s*gateway/)
  assert.doesNotMatch(privateChat, /if \(!gateway\.isReady\(\)\) throw new Error\('私信仍在连接/)
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
  assert.match(privateChat, /const hasPlatformMessageNo = Boolean\(/, '存在平台 messageNo 时应以平台编号推进已读')
  assert.match(privateChat, /hasPlatformMessageNo \? undefined : lastIncoming\?\.timMessageId/, '历史迁移消息不得用旧 TIM 定位字段否决平台 messageNo')
  assert.match(privateChat, /onLongPress/)
  assert.match(privateChat, /sourceType=private_chat/)
  assert.match(privateChat, /targetId=\$\{encodeURIComponent\(conversationNo\)\}/)
  assert.match(whisperList, /readWhispers/)
  assert.match(channel, /readAck|acceptedNos/)
  assert.match(report, /已拉黑并提交举报/)
  assert.match(report, /chooseMedia/)
  assert.match(report, /evidenceImageUrls/)
  assert.doesNotMatch(report, /处罚细则页面待接入/)

  for (const source of [whisperList, whisperDetail]) {
    assert.doesNotMatch(source, /ignoreWhisper|cancelWhisper|batchHideWhispers/)
    assert.doesNotMatch(source, /忽略|取消申请|批量隐藏/)
  }
})

test('私信首页与列表严格消费生产 DTO 且列表不提前初始化 TIM', () => {
  const types = read('src/types/message.ts')
  const service = read('src/services/message.ts')
  const home = read('src/pages/chat/index.tsx')
  const privateList = read('src/pages/message/private-list.tsx')
  const runtimeStore = read('src/stores/messageRuntimeStore.ts')

  assert.match(types, /interface MessageHomeResponse[\s\S]*unreadSummary:\s*MessageUnreadSummary/)
  assert.match(types, /interface MessageHomeResponse[\s\S]*conversationPage:\s*MessageConversationPage/)
  assert.doesNotMatch(types, /interface MessageHomeResponse[\s\S]*recentConversationBindings:/)
  assert.match(home, /conversationPage\.list/)
  assert.match(home, /assistantSummary/)
  assert.match(home, /systemSummary/)
  assert.doesNotMatch(home, /fixedEntries|recentConversationBindings/)
  assert.match(runtimeStore, /home\.unreadSummary/)
  assert.doesNotMatch(runtimeStore, /home\.platformUnreadSummary/)

  assert.match(privateList, /page\.list/)
  assert.match(privateList, /lastMessage\?\.preview/)
  assert.doesNotMatch(privateList, /messageImGateway|messageRuntime|listConversations\(\)/)
  assert.doesNotMatch(service, /recentConversationBindings:\s*\(result\.recentConversationBindings/)
})

test('悄悄话双分组、隐藏、反向申请和幂等重试全部接入正式契约', () => {
  const {
    createWhisperIdempotencyCache,
  } = requireDomain('src/domain/whisperRuntime.ts')
  let sequence = 0
  const cache = createWhisperIdempotencyCache(() => `request-${++sequence}`)
  assert.equal(cache.get('create:USR-000000000140', '正文A'), 'request-1')
  assert.equal(cache.get('create:USR-000000000140', '正文A'), 'request-1')
  assert.equal(cache.get('create:USR-000000000140', '正文B'), 'request-2')
  cache.clear()
  assert.equal(cache.get('create:USR-000000000140', '正文B'), 'request-3')

  const types = read('src/types/message.ts')
  const service = read('src/services/message.ts')
  const list = read('src/pages/message/whisper-list.tsx')
  const detail = read('src/pages/message/whisper-detail.tsx')

  assert.match(types, /type WhisperBucket = 'pending' \| 'processed'/)
  assert.match(types, /interface MessageWhisperPage[\s\S]*bucket:\s*WhisperBucket/)
  assert.match(types, /interface MessageWhisperPage[\s\S]*totalCount:\s*number/)
  assert.doesNotMatch(types, /interface MessageWhisperItem[\s\S]*requestTimMessageId:/)
  assert.match(types, /interface WhisperCreateResponse[\s\S]*expireTime:\s*string/)
  assert.doesNotMatch(types, /interface WhisperCreateResponse[\s\S]*coinCost\?:/)
  assert.match(service, /listWhispers\([\s\S]*bucket:\s*WhisperBucket/)
  assert.match(service, /method:\s*'DELETE'/)
  assert.match(service, /\/miniapp\/message\/whispers\/received\/hide-all/)
  assert.match(list, /'pending'/)
  assert.match(list, /'processed'/)
  assert.match(list, /hideWhisper/)
  assert.match(list, /hideReceivedWhispers/)
  assert.match(list, /全部删除/)
  assert.match(detail, /whisper_reverse/)
  assert.match(detail, /createWhisperIdempotencyCache/)
})

test('私信和悄悄话举报使用动态原因与统一 chat 契约', () => {
  const service = read('src/services/message.ts')
  const report = read('src/pages/message/report.tsx')

  assert.match(service, /\/miniapp\/community\/config/)
  assert.match(service, /evidenceImageUrls\?:\s*string\[\]/)
  assert.match(report, /targetType:\s*'chat'/)
  assert.match(report, /targetId,/)
  assert.match(report, /getCommunityReportConfig/)
  assert.match(report, /report-evidence/)
  assert.match(report, /chooseMedia/)
  assert.doesNotMatch(report, /const REPORT_REASONS/)
  assert.doesNotMatch(report, /targetBizNo:/)
})
