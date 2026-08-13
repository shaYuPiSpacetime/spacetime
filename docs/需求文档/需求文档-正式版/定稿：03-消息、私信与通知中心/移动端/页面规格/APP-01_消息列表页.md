# 页面规格 - APP-03-PAGE-message-list 消息首页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本07 | 2026-08-12 | Codex | 首页与 TIM 解耦：列表仅返回平台渲染字段，点击会话后再获取 TIM 映射和详情态权限 |
| 版本06 | 2026-08-12 | Codex | 首页改为双入口卡片、三类固定摘要及全部有效私信会话游标分页，取消“最近 3 条/查看全部” |
| 版本05 | 2026-08-06 | Codex | 同步悄悄话回复迁移：待处理入口只统计 pending，回复后转入私信并更新发送方未读 |
| 版本01 | 2026-07-02 | Codex | 初稿 |

- **页面 ID**：`APP-03-PAGE-message-list`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-03_消息、私信与通知中心.md`
- **页面路由**：`/pages/message/index`
- **入口来源**：底部 Tab `消息`
- **对应移动端页面**：MVP-PAGE-033 / APP-PAGE-049

---

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：在一个页面查看悄悄话、喜欢我的人、官方助手、系统消息和全部有效普通私信会话
- **页面类型**：摘要入口 + 游标分页会话列表

仍为 `pending` 的悄悄话申请只进入悄悄话卡片和悄悄话页面，不混入普通私信会话行。接收方回复成功后，申请迁移为 `replied`，双方显示同一条普通私信会话。

---

## 2. 布局（给 UI）

### 2.1 整体布局

```text
┌──────────────────────────────┐
│ 标题：消息                     │
├──────────────┬───────────────┤
│ 悄悄话        │ 私信           │
│ 待处理数+头像  │ 私信未读数      │
├──────────────┴───────────────┤
│ 喜欢我的人  总数/新喜欢/最新头像 │
│ 官方小助手  最新摘要/时间/未读   │
│ 系统消息    最新摘要/时间/未读   │
├──────────────────────────────┤
│ 私信会话 1  最新消息/时间/未读   │
│ 私信会话 2  最新消息/时间/未读   │
│ ...游标加载更多                 │
└──────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 内容 | 点击行为 |
|------|------|----------|
| 悄悄话卡片 | 当前用户收到且仍有效的全部待处理数、最近 3 个申请人头像 | 进入“申请我的”悄悄话列表 |
| 私信卡片 | 当前有效普通私信未读总数 | 页面内定位到私信会话列表；无会话时保留空态 |
| 喜欢我的人 | PRD-02 当前有效喜欢总数、新喜欢数、最新头像和时间 | 进入 PRD-02“喜欢我的”列表 |
| 官方小助手 | 未读数、最新短摘要和时间 | 进入官方助手页 |
| 系统消息 | 未读数、最新短摘要和时间 | 进入系统消息页 |
| 私信会话列表 | 全部有效普通私信会话，按最新消息时间倒序游标分页 | 点击有效会话进入私信对话页 |

### 2.3 不建设内容

- 不建设“最近 3 条私信”和“查看全部”跳转。
- 不建设独立私信列表路由，原 `APP-03-PAGE-private-list` 仅保留废弃记录。
- 不把待处理悄悄话、官方助手或系统消息混入动态私信会话行。
- 本页不提供会话删除、全部已读、举报或拉黑操作。

---

## 3. 字段表

### 3.1 首页摘要

| 字段 | 类型 | 中文说明 | 数据来源 |
|------|------|----------|----------|
| `whisperSummary.pendingCount` | long | 收到且仍为 pending、未过期的全部待处理悄悄话数，包含已曝光和未曝光 | `app_message_whisper` |
| `whisperSummary.recentAvatarUrls` | string[] | 最近 3 个待处理申请人头像，按申请时间倒序 | 悄悄话 + 用户头像 |
| `unreadSummary.privateUnreadCount` | long | 当前有效普通私信会话未读消息数，同时用于私信卡片 | `app_message_record.receiver_read_status` |
| `likesMeSummary.totalCount` | long | 当前有效“喜欢我的”总数 | PRD-02 有效喜欢关系 |
| `likesMeSummary.newCount` | long | 晚于 PRD-02 新喜欢游标的有效喜欢数 | PRD-02 喜欢游标 |
| `likesMeSummary.latestAvatarUrl` | string/null | 最新有效喜欢人的头像 | PRD-02 喜欢关系 + 用户资料 |
| `likesMeSummary.latestLikedTime` | datetime/null | 最新有效喜欢时间 | PRD-02 喜欢关系 |
| `likesMeSummary.latestDisplayStatus` | enum/null | `clear/blur`，只控制头像样式 | VIP/单条解锁 |
| `assistantSummary` | object | 官方助手未读、最新 50 字短摘要、最新时间 | 助手收件箱与消息主表 |
| `systemSummary` | object | 系统消息未读、最新 50 字短摘要、最新时间 | 系统消息收件箱与消息主表 |

### 3.2 私信会话行

| 字段 | 类型 | 中文说明 |
|------|------|----------|
| `conversationNo` | string | 平台会话编号 |
| `peerUser` | object | 对方用户 ID、头像、昵称及主页是否可进入 |
| `unreadCount` | long | 当前用户在该会话的未读接收消息数 |
| `lastMessage.messageNo` | string/null | 平台最新消息编号，供平台已读接口使用 |
| `lastMessage.messageType` | enum/null | `text/whisper_reply/system_tip` 等 |
| `lastMessage.direction` | enum/null | `incoming/outgoing` |
| `lastMessage.preview` | string/null | 最新消息单行短摘要，最多 50 个 Unicode 字符，不是聊天历史接口 |
| `lastMessage.messageTime` | datetime/null | 最新消息时间 |
| `lastMessage.sendStatus` | enum/null | `sending/sent/failed`；服务端列表通常投影已归档消息 |

---

## 4. 查询与分页

- 首屏调用 `GET /miniapp/message/home?size=20`，一次返回摘要和首屏会话。
- 加载更多优先调用 `GET /miniapp/message/conversations?cursor={nextCursor}&size=20`；也允许将同一游标传给首页接口。
- `size` 默认 20，最大 50；客户端不得解析或自行生成游标。
- 会话范围：当前用户是参与方且平台会话 `status=active`。
- 排序：`lastMessageTime DESC, conversationId DESC`。
- 每行最新摘要、发送状态和未读均来自平台消息主表；TIM 负责实时收发和漫游历史。
- 首页和会话分页不查询 TIM 账号映射，也不要求 TIM 已登录；点击行后只携带 `conversationNo` 调用会话详情，再取得 `timConversationId、canEnterConversation、canSend、sendBlockedReason`。

---

## 5. 数据联动

| 事件 | 首页变化 |
|------|----------|
| 收到新悄悄话 | 待处理数增加；若为未曝光记录，悄悄话未读同时增加 |
| 悄悄话回复并匹配成功 | 该申请退出双方悄悄话默认列表；双方显示同一私信会话；原发送方新增回复未读 |
| 收到普通私信 | 对应会话移到首位，更新最新摘要、时间和未读 |
| 当前用户发送成功 | 更新对应会话最新摘要和时间，不增加本人未读 |
| 进入会话并成功渲染 | TIM SDK 置已读，同时向平台提交 `lastMessage.messageNo` 推进平台未读 |
| 关系拉黑、账号冻结/注销、认证失效 | 关系生命周期将会话改为 `blocked/invalid`，下次查询不返回 |
| 仅临时发送受限 | 会话继续展示；点击后由会话详情返回 `canSend=false` 和原因 |

---

## 6. 状态与异常

| 状态 | 页面表现 |
|------|----------|
| 首次加载 | 摘要区和会话行骨架屏 |
| 无私信会话 | 五类摘要仍展示，会话区显示“暂无私信” |
| 加载更多失败 | 已有数据保留，列表底部提供重试 |
| 受限安全态 | 不返回真人互动、悄悄话、喜欢和助手；仅展示必要安全系统消息与认证/申诉引导 |
| 会话权限已变化 | 点击后服务端拒绝进入，刷新首页并移除失效会话 |

---

## 7. 验收标准

| AC ID | 场景 | 优先级 |
|-------|------|--------|
| `APP-03-AC-message-home-structure` | 双卡片、三类固定摘要和动态私信列表结构正确 | P0 |
| `APP-03-AC-message-home-page` | 全部有效私信按稳定游标分页，无最近 3 条限制 | P0 |
| `APP-03-AC-message-home-whisper-scope` | 待处理悄悄话只进卡片，不混入私信行 | P0 |
| `APP-03-AC-message-home-unread` | 四类未读与总红点使用平台事实源 | P0 |
| `APP-03-AC-message-home-restricted` | 受限用户不返回真人互动数据 | P0 |

```text
AC-ID: APP-03-AC-message-home-page
Given 当前用户存在 35 条 active 普通私信会话，其中部分对方 TIM 账号尚未同步
When 用户进入消息首页并连续使用 nextCursor 加载
Then 服务端不查询 TIM 映射，按 lastMessageTime DESC, conversationId DESC 无重复、无跳项返回全部 35 条，不出现“查看全部”入口

AC-ID: APP-03-AC-message-home-whisper-scope
Given 当前用户收到 4 条有效 pending 悄悄话，其中 1 条未曝光
When 用户进入消息首页
Then whisperSummary.pendingCount=4，whisperUnreadCount=1，最近头像最多返回 3 个，4 条申请均不进入 conversationPage.list
```

---

## 8. 关联

| 关联类型 | 引用 |
|----------|------|
| 模块规则 | `M03-RULE-message-home-structure` |
| 未读规则 | `M03-RULE-unread` |
| 悄悄话迁移 | `M03-RULE-whisper-to-conversation` |
| 私信对话页 | `APP-03-PAGE-private-chat` |
| 喜欢我的 | PRD-02 `APP-02-PAGE-likes-me` |
| 废弃页面 | `APP-03-PAGE-private-list` |
