# 私信会话丝滑加载与滚动状态 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 私信页从列表进入时稳定落到最新消息，从个人主页返回时保持原阅读位置，并消除本地历史与腾讯 IM 分批到达造成的闪烁。

**Architecture:** 把消息语义合并和会话快照缓存抽到纯领域模块；聊天页将本地数据库作为完整历史主源，腾讯 IM 作为近期增量补充。滚动只由显式业务事件驱动，不再监听消息数量隐式跳转。

**Tech Stack:** React 18、TypeScript 5.6、Taro `ScrollView`、腾讯 LiteChat 4.4.2、Node `node:test`。

## Global Constraints

- 只在 `master` 修改，开始时必须与 `origin/master` 同步。
- 不提交工作区现有无关删除、构建缓存和测试产物。
- 本轮未获提交或推送授权，不执行 `git commit`、`git push`。
- 本地数据库历史是完整历史来源；腾讯 IM 只能补充近期与实时消息。
- 页面返回必须保持阅读位置；只有新入口、主动发送、接近底部收到新消息和键盘首次打开可以定位最新消息。

---

### Task 1: 建立可测试的消息合并与会话缓存

**Files:**
- Create: `miniapp/src/domain/privateChatSession.ts`
- Create: `miniapp/scripts/test-private-chat-session.cjs`
- Modify: `miniapp/package.json`

**Interfaces:**
- Consumes: `ChatMessage`、`MessageConversationDetail`。
- Produces: `mergePrivateChatMessages`、`readPrivateChatSession`、`writePrivateChatSession`、`clearPrivateChatSession`。

- [ ] **Step 1: 写失败测试**

测试脚本注册 TypeScript 转译后验证：

```js
const first = [message({ messageNo: 'M1', timMessageId: 'T1' })]
assert.equal(mergePrivateChatMessages(first, [message({ messageNo: 'M1', timMessageId: 'T1' })]), first)
const merged = mergePrivateChatMessages(first, [message({ messageNo: '', timMessageId: 'T2' })])
assert.deepEqual(merged.map(item => item.timMessageId), ['T1', 'T2'])
writePrivateChatSession('U1', 'C1', { messages: merged, initialLoaded: true })
assert.equal(readPrivateChatSession('U1', 'C1')?.messages, merged)
assert.equal(readPrivateChatSession('U2', 'C1'), undefined)
clearPrivateChatSession('U1', 'C1')
assert.equal(readPrivateChatSession('U1', 'C1'), undefined)
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd miniapp && node --test scripts/test-private-chat-session.cjs`

Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 实现纯领域模块**

模块包含以下公开契约：

```ts
export interface PrivateChatSessionSnapshot {
  detail?: MessageConversationDetail
  messages: ChatMessage[]
  historyCursor?: string
  historyCompleted: boolean
  initialLoaded: boolean
  scrollTop: number
  scrollHeight: number
  nearBottom: boolean
}

export function mergePrivateChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[]

export function readPrivateChatSession(
  userId: string,
  conversationNo: string,
): PrivateChatSessionSnapshot | undefined

export function writePrivateChatSession(
  userId: string,
  conversationNo: string,
  patch: Partial<PrivateChatSessionSnapshot>,
): PrivateChatSessionSnapshot

export function clearPrivateChatSession(userId: string, conversationNo: string): void
```

`mergePrivateChatMessages` 用 `messageNo`、`timMessageId`、`timMsgKey`、`clientMsgId` 任一稳定标识去重；合并后内容和顺序均无变化时返回原数组引用。

- [ ] **Step 4: 把测试接入消息闭环命令**

在 `validate:message-closure` 的 `node --test` 文件列表加入 `scripts/test-private-chat-session.cjs`。

- [ ] **Step 5: 运行测试确认通过**

Run: `cd miniapp && node --test scripts/test-private-chat-session.cjs`

Expected: PASS。

### Task 2: 首屏改为本地历史主导的一次性快照

**Files:**
- Modify: `miniapp/src/pages/message/private-chat.tsx`
- Modify: `miniapp/scripts/test-private-chat-performance.cjs`
- Modify: `miniapp/scripts/test-message-mobile-api-closure.cjs`

**Interfaces:**
- Consumes: Task 1 的缓存和合并函数。
- Produces: 页面首屏一次性提交 detail、messages、分页信息和底部滚动意图。

- [ ] **Step 1: 写失败契约测试**

测试必须断言：页面导入 `privateChatSession`；不再声明本地 `upsertMessages`；初始化状态读取会话缓存；不存在 `[keyboardHeight, messages.length, requestScrollToLatest]`；恢复页面不请求消息历史。

```js
assert.match(chat, /readPrivateChatSession/)
assert.match(chat, /mergePrivateChatMessages/)
assert.doesNotMatch(chat, /function upsertMessages/)
assert.doesNotMatch(chat, /\[keyboardHeight, messages\.length, requestScrollToLatest\]/)
assert.doesNotMatch(resumeBlock, /listConversationMessages|listHistory/)
```

- [ ] **Step 2: 运行消息闭环确认失败**

Run: `cd miniapp && npm run validate:message-closure`

Expected: FAIL，新契约尚未满足；旧的消息长度滚动断言也需要迁移。

- [ ] **Step 3: 用缓存初始化页面状态**

在组件创建时读取当前用户和会话快照：

```ts
const sessionUserId = String(useAuthStore.getState().userId || '')
const initialSessionRef = useRef(readPrivateChatSession(sessionUserId, conversationNo))
const initialSession = initialSessionRef.current
const [detail, setDetail] = useState(initialSession?.detail)
const [messages, setMessages] = useState<ChatMessage[]>(initialSession?.messages || [])
const [historyCursor, setHistoryCursor] = useState(initialSession?.historyCursor)
const [historyCompleted, setHistoryCompleted] = useState(initialSession?.historyCompleted || false)
const [scrollTarget, setScrollTarget] = useState<string | undefined>(
  initialSession?.messages.length ? 'chat-bottom-a' : undefined,
)
const [initialLoading, setInitialLoading] = useState(!initialSession?.initialLoaded)
```

所有消息更新统一使用 `mergePrivateChatMessages`；状态变化后把会话详情、消息、分页和滚动快照写回缓存。

- [ ] **Step 4: 首次无缓存时原子提交**

并行启动详情、本地历史和 IM 连接。本地历史与详情完成后，给 IM 近期历史一个短等待预算；预算内返回则先合并，超时则先用本地历史。通过一个 `commitInitialSnapshot` 同步提交：

```ts
const commitInitialSnapshot = (nextDetail: MessageConversationDetail, page: MessageHistoryPage, items: ChatMessage[]) => {
  const nextMessages = mergePrivateChatMessages([], items)
  messagesRef.current = nextMessages
  setDetail(nextDetail)
  setMessages(nextMessages)
  setHistoryCursor(page.nextCursor || undefined)
  setHistoryCompleted(!page.hasMore)
  requestScrollToLatest()
  setInitialLoading(false)
}
```

IM 延迟结果只进行语义增量合并；返回原数组时不触发状态更新或滚动。IM 失败只展示非阻塞错误，本地历史仍可查看。

- [ ] **Step 5: 防止旧异步请求污染新会话**

为每次首屏加载递增 `loadVersionRef`；每个 await 后检查版本、`mountedRef.current` 和当前 `conversationNo`。卸载时令版本失效并取消事件订阅。

- [ ] **Step 6: 运行消息闭环**

Run: `cd miniapp && npm run validate:message-closure`

Expected: PASS。

### Task 3: 用显式事件驱动滚动并保持返回位置

**Files:**
- Modify: `miniapp/src/domain/messageRuntime.ts`
- Modify: `miniapp/src/pages/message/private-chat.tsx`
- Modify: `miniapp/scripts/test-message-mobile-api-closure.cjs`

**Interfaces:**
- Consumes: `resolvePrivateChatScrollIntent(cause, nearBottom)`。
- Produces: 新入口到底部、返回不动、键盘只在关闭到打开时滚动一次。

- [ ] **Step 1: 扩展滚动决策测试**

```js
assert.equal(resolvePrivateChatScrollIntent('keyboard_open'), 'latest')
assert.equal(resolvePrivateChatScrollIntent('supplement', true), 'latest')
assert.equal(resolvePrivateChatScrollIntent('supplement', false), 'preserve')
```

- [ ] **Step 2: 实现显式滚动原因**

将 `PrivateChatScrollCause` 增加 `keyboard_open` 和 `supplement`；`keyboard_open` 返回 `latest`，`supplement` 与 `incoming` 一样只在 `nearBottom` 时返回 `latest`。

- [ ] **Step 3: 键盘仅在关闭到打开时滚动**

```ts
const previousKeyboardHeightRef = useRef(0)
useEffect(() => {
  const wasOpen = previousKeyboardHeightRef.current > 0
  const isOpen = keyboardHeight > 0
  previousKeyboardHeightRef.current = keyboardHeight
  if (!wasOpen && isOpen && messagesRef.current.length > 0) requestScrollToLatest()
}, [keyboardHeight, requestScrollToLatest])
```

从输入框 `onFocus` 删除直接 `requestScrollToLatest()`，消息数量变化不再触发键盘滚动。

- [ ] **Step 4: 页面恢复只刷新详情**

将 `refreshPreservingPosition` 改为只请求 `service.getConversation(conversationNo)` 和未读聚合，不请求 `listConversationMessages`、不设置 `messages`、不清空 `scrollTarget`。`useDidHide` 仅记录页面不可见和滚动快照；`useDidShow` 不改变消息列表或滚动属性。

- [ ] **Step 5: 记录滚动快照并按事件决策**

`onScroll` 更新 `scrollTop`、`scrollHeight`、`nearBottom` 到 ref 和会话缓存。实时消息、IM 补齐、主动发送、上翻历史分别调用 `resolvePrivateChatScrollIntent`；只有返回 `latest` 时改变双底部锚点。

- [ ] **Step 6: 运行领域和页面契约测试**

Run: `cd miniapp && node --test scripts/test-message-mobile-api-closure.cjs scripts/test-private-chat-performance.cjs scripts/test-private-chat-session.cjs`

Expected: PASS。

### Task 4: 构建与差异回归

**Files:**
- Verify only: `miniapp/`

- [ ] **Step 1: 完整消息闭环**

Run: `cd miniapp && npm run validate:message-closure`

Expected: PASS，无失败用例。

- [ ] **Step 2: 小程序构建**

Run: `cd miniapp && npm run build:weapp`

Expected: Taro build、页面注册、固定登录和包体积检查全部 PASS。

- [ ] **Step 3: 静态核对任务差异**

Run: `git diff -- miniapp/src/domain/privateChatSession.ts miniapp/src/domain/messageRuntime.ts miniapp/src/pages/message/private-chat.tsx miniapp/scripts/test-private-chat-session.cjs miniapp/scripts/test-private-chat-performance.cjs miniapp/scripts/test-message-mobile-api-closure.cjs miniapp/package.json`

Expected: 不含后端接口、数据库、腾讯 IM 七天漫游策略或无关页面改动。

- [ ] **Step 4: 微信开发者工具复核**

复核四条路径：私信列表进入落到最新；聊天头像进入主页再返回保持位置；键盘打开后 IM 补齐不跳动；上拉历史保持视觉锚点。若当前环境无法自动操作开发者工具，在交付中明确标记此项为待实机验证，不将其宣称为通过。
