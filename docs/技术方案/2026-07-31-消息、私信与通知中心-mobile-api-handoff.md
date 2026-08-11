# 消息、私信与通知中心 - 移动端 API 对接文档

> 日期：2026-07-31
> 需求编号：PRD-03
> 面向对象：小程序前端与联调测试人员
> 技术方案：`docs/技术方案/2026-07-31-消息、私信与通知中心-tcdesign.md`
> 当前状态：2026-08-11 后端接口、TIM Provider/回调、14 表、私信已读同步、四类未读汇总、可靠任务及本地自动化测试已完成；按“普通私信 SDK 直发、悄悄话后端编排后经 TIM REST 投递、平台消息主表明文归档并同步已读事实”对接
> 交付边界：本轮没有编写或修改小程序前端；真实 TIM 双账号及生产 KMS 联调仍需外部环境

## 1. 对接边界

本文件只定义移动端调用后端的稳定契约，不代表本轮实现小程序前端。业务口径以冻结 PRD 和主技术
方案为准；移动端正式 UI 图缺失时，不得用旧 Mock 状态反推业务。

以下旧能力禁止继续调用或保留 UI：

- 悄悄话 `ignore`、`cancel`、批量隐藏；
- 悄悄话 `ignored/cancelled/matched` 状态；
- 独立通知详情、邀请响应、全部已读；
- 图片、视频、语音、文件、自定义贴纸等富媒体发送；首版只开放文本和 Unicode Emoji；
- 互相关注或任意人直接私信；
- 普通私信继续调用平台旧发送接口，形成与 TIM 并行的第二条消息通道。

腾讯云 TIM 是普通私信和悄悄话的消息传输通道。普通私信由 LiteChat SDK 发送、接收和拉取历史，
平台消息前回调执行最终业务权限校验；悄悄话必须先调用平台接口完成资格、扣费、
状态和幂等编排，再由后端通过 TIM REST 投递自定义消息。平台与 TIM 云端审核均不对本期日常
私信、悄悄话执行发送前文本内容审核。

平台数据库会把日常私信、悄悄话申请和回复的完整明文归档到 `app_message_record.content_text`，但平台
移动端 HTTP 接口不返回该归档字段。小程序按平台返回的 TIM 会话/消息标识从 LiteChat 取得正文和
最后消息，再与平台业务状态合并。平台消息主表同时保存接收方已读状态，未读汇总接口直接返回
私信、悄悄话、官方助手和系统消息四类未读及总数。`whisper_request` 投递时不计入 TIM
会话未读且不更新最近会话，悄悄话待处理未读由平台维护，避免同一申请被重复计数。

申请和回复的 TIM messageId/MsgKey 只保存在各自的 `app_message_record`。平台接口虽然仍按页面契约
返回 `requestTimMessageId/requestTimMsgKey/replyTimMessageId/replyTimMsgKey`，但这些字段由
`app_message_whisper.request_message_id/reply_message_id` 关联消息主表组装，不是悄悄话表中的重复字段。

举报不走 TIM：用户点击举报后调用 PRD-05 平台举报接口。TIM 会话/消息编号只用于定位被举报消息
并固化最小必要证据，不用于发送举报或创建举报工单。

### 1.1 目标对接范围

移动端应对接以下能力：

- `GET /miniapp/im/credentials`
- `GET /miniapp/message/whispers`
- `GET /miniapp/message/whispers/{whisperNo}`
- `POST /miniapp/message/whispers/precheck`
- `POST /miniapp/message/whispers`
- `POST /miniapp/message/whispers/{whisperNo}/reply`
- `GET /miniapp/message/conversations`
- `GET /miniapp/message/conversations/{conversationNo}`
- `POST /miniapp/message/conversations/{conversationNo}/read`
- LiteChat SDK：普通私信发送、历史、会话和腾讯侧已读

上述平台后端接口已在当前分支实现并通过 Controller/Service 自动化测试；旧的普通私信发送和历史
HTTP 接口视为退役契约，不再新增调用。小程序端仍需按本文接入 LiteChat SDK、平台已读确认和这些 HTTP API。

生产环境必须完成腾讯云 TIM SDKAppID、UserSig、REST API、消息前/后回调和账号映射配置后才能
开放真实聊天；不得回退为平台自建消息通道。平台系统/助手消息和独立举报证据仍按项目 KMS 规则加密，
该规则不适用于 `app_message_record.content_text` 中的日常聊天明文归档。

## 2. 7 个页面与 API

| 页面 ID | 当前小程序路由建议 | API |
|---------|--------------------|-----|
| `APP-03-PAGE-message-list` | `/pages/chat/index` | home、unread-summary；总红点直接使用 `messageUnreadCount` |
| `APP-03-PAGE-private-list` | `/pages/message/private-list` | conversations + LiteChat conversation/history |
| `APP-03-PAGE-private-chat` | `/pages/message/private-chat?conversationNo=...` | detail + LiteChat history/send/read + 平台 read + block + report |
| `APP-03-PAGE-official-assistant` | `/pages/message/channel?channel=assistant` | assistant list/read-batch |
| `APP-03-PAGE-whisper-message` | `/pages/message/whisper-list` | whispers/read-batch |
| `APP-03-PAGE-whisper-detail` | `/pages/message/whisper-detail?whisperNo=...` | detail、precheck、send、reply、report |
| `APP-03-PAGE-notification-center` | `/pages/message/channel?channel=system` | system list/read-batch |

路由由小程序维护，后端只返回 `entryType/jumpType/jumpValue`，不得信任后端字符串绕过小程序路由白名单。

## 3. 通用协议

### 3.1 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| `X-Auth-Token` | 是 | 小程序登录 Token |
| `Idempotency-Key` | 平台写接口条件必填 | 悄悄话发送/回复和其他平台幂等写入，8-64 字符；普通私信由 TIM SDK 自身消息随机号去重 |
| `X-Request-Id` | 否 | 客户端链路号；缺失时服务端生成 |
| `Content-Type` | POST 必填 | `application/json` |

悄悄话发送把 Header 值作为 `sendRequestId`；回复要求 Header 值等于 `body.requestId`。

### 3.2 统一响应

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

- 平台业务接口成功以 `code=200` 为准；普通私信发送结果以 LiteChat SDK 返回为准，但消息前回调
  拒绝时必须按平台业务错误映射提示，不能在本地伪造发送成功。
- HTTP 状态仍应正确表达 400/401/403/404/409/422/429/500/503。
- 腾讯回调不是小程序接口，不使用本返回体。

### 3.3 时间、编号和空值

- 时间：`yyyy-MM-dd HH:mm:ss`，时区 `Asia/Shanghai`。
- `conversationNo/messageNo/whisperNo/noticeNo/userNo` 全部为 string。
- 前端不得把业务号转 Number/BigInt。
- 可空字段统一返回 JSON `null`，不使用空字符串代替未知时间或业务号。
- 未知枚举显示通用文案并禁止危险操作，不应抛异常或默认视为可发送。

### 3.4 游标分页

请求：

```http
GET /miniapp/message/conversations?cursor=opaque-value&size=20
```

响应数据：

```json
{
  "list": [],
  "nextCursor": "opaque-next-value",
  "hasMore": true
}
```

- `cursor` 不透明，前端只原样保存和回传。
- `size` 默认 20，范围 1-50。
- 刷新时清空 cursor；加载更多时使用上次 `nextCursor`。
- 普通私信历史分页遵循 LiteChat SDK 游标；本节 HTTP 游标只适用于平台业务列表、悄悄话、助手和系统消息。

## 4. 领域枚举

### 4.1 会话与消息

| 枚举 | 值 | 前端处理 |
|------|----|----------|
| `conversationStatus` | `active` | 可进入；是否可发送只看 `canSend` |
|  | `blocked` | 只读安全记录，保留举报 |
|  | `invalid` | 只读安全记录，保留举报 |
| `messageType` | `text` | 普通文本 |
|  | `whisper` | 原悄悄话卡片 |
|  | `whisper_reply` | 悄悄话回复 |
|  | `system_tip` | 会话内系统提示 |
| `sendStatus` | `sending` | 展示发送中，不允许生成新 clientMsgId 重发 |
|  | `sent` | 已发送 |
|  | `failed` | 显示重试；沿用原 clientMsgId |

### 4.2 悄悄话

| 枚举 | 值 | 前端处理 |
|------|----|----------|
| `status` | `pending` | 接收方可回复；发送方显示等待回应 |
|  | `replied` | 可进入生成的私信会话 |
|  | `expired` | 对用户统一显示申请已结束 |
|  | `invalid` | 对用户统一显示申请已结束 |
| `direction` | `received/sent` | 收到/已发 Tab |
| `payType` | `vip_free/coin` | 免费权益/千寻币 |
| `paymentStatus` | `paid/refunding/refunded` | 补偿中需明确提示，不允许再次扣费 |

前端永远不会收到 `receiverReadAt`、明确拒绝、拉黑原因、处罚原因或具体 invalid 原因。

### 4.3 系统消息

| 字段 | 值 |
|------|----|
| `notificationType` | `governance/asset/invite/community/platform` |
| `bizType` | `report_result/violation_result/content_review_result/asset_result/invite_result/community_interaction_summary/community_hot_topic/featured_content/community_activity/community_recall/platform_announcement/account_security` |
| `jumpType` | `none/chat/profile/auth_center/asset/invite_center/community/appeal/h5` |
| `readStatus` | `unread/read` |

无 `notification_detail` 和 `invite_response` 跳转。

## 5. 接口总表

| 场景 | Method | Path | 幂等 | 页面 |
|------|--------|------|------|------|
| 消息首页 | GET | `/miniapp/message/home` | 只读 | 消息首页 |
| 四类未读汇总 | GET | `/miniapp/message/unread-summary` | 只读 | Tab/首页，直接返回私信、悄悄话、助手、系统及总数 |
| 完整私信列表 | GET | `/miniapp/message/conversations` | 只读 | 私信列表 |
| 会话业务详情/TIM 映射 | GET | `/miniapp/message/conversations/{conversationNo}` | 只读 | 私信对话 |
| 普通私信发送 | TIM SDK | `C2C text / sendMessage` | SDK 消息随机号 | 私信对话 |
| 私信历史与腾讯侧已读 | TIM SDK | C2C conversation/history/read | SDK 契约 | 私信列表/对话 |
| 平台私信已读确认 | POST | `/miniapp/message/conversations/{conversationNo}/read` | 天然幂等 | 私信对话成功渲染后 |
| 拉黑对方 | POST | `/miniapp/message/conversations/{conversationNo}/block` | 结果幂等 | 私信对话 |
| 悄悄话列表 | GET | `/miniapp/message/whispers` | 只读 | 悄悄话列表 |
| 悄悄话详情 | GET | `/miniapp/message/whispers/{whisperNo}` | 只读 | 悄悄话详情 |
| 悄悄话预检 | POST | `/miniapp/message/whispers/precheck` | 只读语义 | 发送弹窗 |
| 发送悄悄话 | POST | `/miniapp/message/whispers` | Header | 发送弹窗 |
| 回复悄悄话 | POST | `/miniapp/message/whispers/{whisperNo}/reply` | Header + requestId | 悄悄话详情 |
| 悄悄话批次已读 | POST | `/miniapp/message/whispers/read-batch` | 天然幂等 | 悄悄话列表 |
| 助手消息 | GET | `/miniapp/message/assistant/messages` | 只读 | 官方助手 |
| 助手批次已读 | POST | `/miniapp/message/assistant/messages/read-batch` | 天然幂等 | 官方助手 |
| 系统消息 | GET | `/miniapp/message/system-messages` | 只读 | 系统消息 |
| 系统消息批次已读 | POST | `/miniapp/message/system-messages/read-batch` | 天然幂等 | 系统消息 |
| 举报 | POST | `/miniapp/community/reports` | clientReportId | 对话/悄悄话 |
| IM 凭证 | GET | `/miniapp/im/credentials` | 只读 | App 生命周期 |

## 6. 消息首页与未读

### 6.1 `GET /miniapp/message/home`

正常用户示例：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "accessMode": "normal",
    "platformUnreadSummary": {
      "privateUnreadCount": 3,
      "whisperUnreadCount": 1,
      "assistantUnreadCount": 2,
      "systemUnreadCount": 4,
      "platformUnreadCount": 7,
      "messageUnreadCount": 10,
      "snapshotTime": "2026-07-31 10:10:00"
    },
    "fixedEntries": [
      {
        "entryType": "official_assistant",
        "title": "官方助手",
        "lastMessagePreview": "了解私信安全与女性保护规则",
        "unreadCount": 2,
        "enabled": true
      },
      {
        "entryType": "system_message",
        "title": "系统消息",
        "lastMessagePreview": "你的举报已处理，感谢反馈",
        "unreadCount": 4,
        "enabled": true
      },
      {
        "entryType": "whisper",
        "title": "悄悄话",
        "lastMessagePreview": "你收到一条待回复的悄悄话",
        "unreadCount": 1,
        "enabled": true
      }
    ],
    "recentConversationBindings": [
      {
        "conversationNo": "CV202607310001",
        "timConversationId": "C2C_tu_7Fx3A9",
        "targetUser": {
          "userNo": "U202607310021",
          "nickname": "小雨",
          "avatarUrl": "https://example.com/avatar.jpg"
        },
        "conversationStatus": "active",
        "canEnterConversation": true,
        "canSend": true,
        "sendBlockedReason": null,
        "lastBusinessActivityTime": "2026-07-31 10:10:00"
      }
    ],
    "recentConversationLimit": 3,
    "hasMoreConversations": true
  }
}
```

受限用户示例：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "accessMode": "restricted",
    "restrictionPrompt": "当前仅可查看账号安全、处罚和申诉消息",
    "platformUnreadSummary": {
      "privateUnreadCount": 0,
      "whisperUnreadCount": 0,
      "assistantUnreadCount": 0,
      "systemUnreadCount": 1,
      "platformUnreadCount": 1,
      "messageUnreadCount": 1,
      "snapshotTime": "2026-07-31 10:10:00"
    },
    "fixedEntries": [
      {
        "entryType": "system_message",
        "title": "系统消息",
        "lastMessagePreview": "你有一条账号安全消息",
        "unreadCount": 1,
        "enabled": true
      }
    ],
    "recentConversationBindings": [],
    "recentConversationLimit": 3,
    "hasMoreConversations": false
  }
}
```

前端不得在 `restricted` 模式保留之前缓存的真人会话/悄悄话，也不得把 LiteChat 缓存未读计入当前展示。

### 6.2 `GET /miniapp/message/unread-summary`

响应 `data` 与 home 内 `platformUnreadSummary` 同结构。字段名 `platformUnreadSummary` 为兼容保留，
对象实际包含四类未读。后端只统计有效业务范围：私信为有效会话中发给当前用户的 `sent + unread`；
悄悄话为已送达、待回复且当前用户未曝光；助手和系统消息按各自 `read_at`。小程序直接使用：

```text
platformUnreadCount = whisperUnreadCount + assistantUnreadCount + systemUnreadCount
messageUnreadCount = privateUnreadCount + platformUnreadCount
displayText = messageUnreadCount == 0 ? "" : min(messageUnreadCount, 99)；超过 99 显示 "99+"
```

最终 Tab 红点规则：

- 0：不显示；
- 1-99：显示数字；
- >99：显示 `99+`。

监听 LiteChat 新消息、平台刷新事件、会话已读成功或前后台切换时，节流重新调用本接口；不采用
TIM 全局未读、不做本地 `+1/-1` 猜测。进入 restricted、退出登录或切换账号时立即清空缓存并重新拉取。

## 7. 私信会话

### 7.1 `GET /miniapp/message/conversations`

该接口返回平台业务上允许展示的私信会话及 TIM 映射，不返回完整聊天历史。查询参数：
`cursor,size`。响应：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "list": [
      {
        "conversationNo": "CV202607310001",
        "timConversationId": "C2C_tu_7Fx3A9",
        "peerUser": {
          "userId": 21,
          "nickname": "小雨",
          "avatarUrl": "https://example.com/avatar.jpg",
          "profileAvailable": true
        },
        "conversationStatus": "active",
        "canSend": true,
        "sendBlockedReason": null,
        "lastBusinessActivityTime": "2026-07-31 11:20:00"
      }
    ],
    "nextCursor": null,
    "hasMore": false
  }
}
```

正常列表不返回 blocked/invalid 会话。小程序按 `timConversationId` 与 LiteChat 会话列表合并，
最后消息、未读数和实际会话排序以 TIM SDK 为准；平台接口负责决定哪些业务会话可以出现以及是否可发送。

### 7.2 `GET /miniapp/message/conversations/{conversationNo}`

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "conversationNo": "CV202607310001",
    "timConversationId": "C2C_tu_7Fx3A9",
    "conversationStatus": "active",
    "peerUser": {
      "userId": 21,
      "nickname": "小雨",
      "avatarUrl": "https://example.com/avatar.jpg",
      "profileAvailable": true
    },
    "canSend": true,
    "sendBlockedReason": null,
    "femaleProtection": {
      "enabled": true,
      "waitingForFemaleFirstMessage": false
    }
  }
}
```

该接口只返回平台会话状态、权限和 TIM 映射。小程序使用 `timConversationId` 从 LiteChat SDK
拉取历史；由悄悄话回复生成的会话中，原申请和回复是 TIM 自定义消息，展示为开场上下文。

### 7.3 LiteChat SDK 发送普通私信

普通私信不再调用平台 `POST .../messages`。前端流程：

1. 调用 `GET /miniapp/im/credentials` 获取 `SDKAppID/userID/userSig/expireAt` 并登录 LiteChat。
2. 调用平台会话详情确认 `conversationStatus=active` 且 `canSend=true`，用于提前控制输入区。
3. 通过 LiteChat SDK 向 `timConversationId` 对应用户发送 C2C 文本消息。
4. 腾讯消息前回调再次校验开关、准入、匹配、会话、拉黑、处罚、保护期和限流；回调允许后 TIM 才真正投递。
5. 发送结果、失败重试和本地气泡状态按 LiteChat SDK 契约处理，同一重试沿用 SDK 原消息对象/随机号。

平台只校验非空、长度、消息类型和业务权限，不做发送前文本内容审核。前端不能只依赖
`canSend`，因为按钮展示后业务状态可能变化；消息前回调是最终授权。

回调拒绝原因按以下公开业务码映射到 SDK 错误信息：

- 30001：未完成核心准入；
- 30002：不存在有效匹配；
- 30003：命中女性保护；
- 30004：会话已失效；
- 30015：全局发送关闭；
- 30019：发送频率过高。

### 7.4 LiteChat SDK 历史与双重已读

- 会话列表和最后消息：调用 LiteChat 会话 API。
- 历史消息：调用 LiteChat C2C 历史接口，首屏取最新一页，滚动时沿用 SDK 游标加载更早消息。
- 进入会话且消息已成功渲染后：先调用 LiteChat 会话已读接口，再调用平台会话 read 接口提交当前页面最后一条 `messageNo`。
- 平台 read 失败时不得只在本地把角标清零；保留可重试状态并重新拉取 `unread-summary`。
- 发送普通私信时设置 `messageControlInfo.excludedFromContentModeration=true`；最终业务权限仍由 TIM 消息前回调裁决。
- 产品仍不展示“对方已读到哪一条”的逐条已读回执。

### 7.5 `POST /miniapp/message/conversations/{conversationNo}/read`

调用时机：当前会话消息已成功渲染，且已取得本页最后一条属于该会话的 `messageNo`。

```json
{
  "lastMessageNo": "MSG202608110001"
}
```

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "conversationNo": "CV202607310001",
    "lastReadMessageNo": "MSG202608110001",
    "unreadCount": 0,
    "readAt": "2026-08-11 15:30:00"
  }
}
```

- 服务端校验当前用户是会话成员，且 `lastMessageNo` 属于该会话。
- 只更新“发给当前用户、`send_status=sent`、当前为 unread、且业务时间不晚于游标”的消息。
- 重复提交同一或更早游标幂等；不会向对方返回或推送逐条已读状态。
- 成功后刷新 `/miniapp/message/unread-summary`，页面总角标以最新 `messageUnreadCount` 为准。

### 7.6 `POST /miniapp/message/conversations/{conversationNo}/block`

```json
{
  "sourceScene": "chat_menu"
}
```

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "conversationNo": "CV202607310001",
    "conversationStatus": "blocked",
    "blockNo": "BLK202607310001",
    "canSend": false
  }
}
```

解除拉黑不恢复本会话。前端收到成功后立即移出正常列表，但可保留只读安全页。

## 8. 悄悄话

> 本节描述最终对接契约。当前工作区的本地消息草稿仍包含平台普通私信发送、历史和已读游标，
> 不符合本契约，不能据此判断接口已完成；实现状态必须以真实路由与测试报告为准。

### 8.1 `GET /miniapp/message/whispers`

查询参数：

| 参数 | 必填 | 值 |
|------|------|----|
| `direction` | 是 | `received/sent` |
| `cursor` | 否 | 不透明游标 |
| `size` | 否 | 默认 20，最大 50 |

一期默认列表固定只返回“已有效送达、未过期、`status=pending`”的待处理申请，不提供终态筛选：

- A 的“我申请的”查询 `direction=sent`，显示“等待回应”；
- B 的“申请我的”查询 `direction=received`，显示“回复并匹配”；
- B 回复成功后，同一条记录保留在数据库并迁移为 `replied`，立即从双方默认列表移除；
- `replied/expired/invalid` 不建设前台“已完成悄悄话”列表，客服、举报和审计仍可按业务号追溯。

响应：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "list": [
      {
        "whisperNo": "WSP202607310001",
        "direction": "received",
        "status": "pending",
        "displayStatus": "等待你回应",
        "peerUser": {
          "userId": 31,
          "nickname": "晨风",
          "avatarUrl": "https://example.com/avatar-31.jpg"
        },
        "timConversationId": "C2C_tu_9Ab2Cd",
        "requestTimMessageId": "144115233701",
        "requestTimMsgKey": "TIM-WSP-REQ-001",
        "payType": "coin",
        "createdTime": "2026-07-31 09:20:00",
        "expireTime": "2026-08-07 09:20:00",
        "canReply": true,
        "unread": true
      }
    ],
    "nextCursor": null,
    "hasMore": false
  }
}
```

发送方收到的对象不含 `unread/receiverReadAt`。列表不返回 `content`；小程序按
`timConversationId + requestTimMessageId/requestTimMsgKey` 从 LiteChat 定位 `whisper_request` 自定义消息并渲染。
详情中的 expired 和 invalid 均用“申请已结束”，不得显示对方已读、拒绝、拉黑或处罚原因。

### 8.2 `GET /miniapp/message/whispers/{whisperNo}`

接收方 pending 示例：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "whisperNo": "WSP202607310001",
    "direction": "received",
    "status": "pending",
    "displayStatus": "等待你回应",
    "peerUser": {
      "userId": 31,
      "nickname": "晨风",
      "avatarUrl": "https://example.com/avatar-31.jpg",
      "profileAvailable": true
    },
    "timConversationId": "C2C_tu_9Ab2Cd",
    "requestTimMessageId": "144115233701",
    "requestTimMsgKey": "TIM-WSP-REQ-001",
    "createdTime": "2026-07-31 09:20:00",
    "expireTime": "2026-08-07 09:20:00",
    "remainingSeconds": 601200,
    "canReply": true,
    "conversationNo": null,
    "safetyActions": ["report_whisper", "block", "block_and_report"]
  }
}
```

平台详情不返回 `content/replyContent`。小程序按 TIM 映射取得原申请和已有回复正文；`replied` 时平台
返回 `conversationNo`、`replyMessageNo`、`replyTimMessageId/replyTimMsgKey`，发送方仍不接收接收方查看时间。

### 8.3 `POST /miniapp/message/whispers/precheck`

```json
{
  "targetUserNo": "U202607310031"
}
```

会员免费权益示例：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "canSend": true,
    "payType": "vip_free",
    "coinAmount": 0,
    "freeRemain": 1,
    "coinBalance": 36,
    "quoteToken": "signed-opaque-token",
    "quoteExpireTime": "2026-07-31 12:10:00",
    "whisperExpireDays": 7,
    "cooldownDays": 7,
    "confirmText": "本次使用会员今日免费悄悄话"
  }
}
```

千寻币示例：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "canSend": true,
    "payType": "coin",
    "coinAmount": 10,
    "freeRemain": 0,
    "coinBalance": 36,
    "quoteToken": "signed-opaque-token",
    "quoteExpireTime": "2026-07-31 12:10:00",
    "whisperExpireDays": 7,
    "cooldownDays": 7,
    "confirmText": "确认消耗 10 千寻币发送悄悄话"
  }
}
```

预检不扣费、不占额度、不创建悄悄话。发送时服务端会在资产行锁内重新校验。

### 8.4 `POST /miniapp/message/whispers`

```http
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440100
```

```json
{
  "targetUserNo": "U202607310031",
  "content": "看了你的资料，想认真认识一下",
  "quoteToken": "signed-opaque-token"
}
```

响应：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "whisperNo": "WSP202607310001",
    "sendStatus": "sending",
    "whisperStatus": null,
    "paymentStatus": "paid",
    "payType": "coin",
    "coinAmount": 10,
    "createdTime": "2026-07-31 12:06:00"
  }
}
```

- `sendStatus=sending` 表示已扣费并可靠入队，但尚未确认有效送达。
- 服务端在同一事务内创建悄悄话业务记录、`app_message_record(message_type=whisper, content_text=明文, send_status=queued)` 和只含消息主键、业务号及 TIM 投递参数的 Outbox；Outbox 不重复保存正文，Inbox 也不得把聊天正文作为临时载荷保存。
- Outbox 投递时按消息主键从 `app_message_record.content_text` 读取正文，通过 TIM REST 发送，并在消息主表回写 TIM 消息编号、MsgKey 与最终发送状态。
- 服务端投递 `whisper_request` 时固定使用 `SendMsgControl=["NoUnread","NoLastMsg","NoMsgCheck"]`。
- 有效送达后详情返回 `status=pending`。
- 永久投递失败时状态转 invalid 并进入 `refunding/refunded`；客户端不得再次扣费。
- 30021 时重新预检，不能自动接受变更后的价格。
- 同一 Idempotency-Key 重试返回同一 whisperNo。

### 8.5 `POST /miniapp/message/whispers/{whisperNo}/reply`

```http
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440200
```

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440200",
  "content": "你好呀，我也想认识你"
}
```

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "whisperNo": "WSP202607310001",
    "status": "replied",
    "matchNo": "MAT202607310011",
    "conversationNo": "CV202607310011",
    "replyMessageNo": "MSG202607310211",
    "replyTimMessageId": "144115233702",
    "replyTimMsgKey": "TIM-WSP-REPLY-001",
    "repliedTime": "2026-07-31 12:20:00"
  }
}
```

只有收到方、pending、已送达、未过期且双方仍可匹配时可回复。30014 表示状态竞争，
前端刷新详情；不得本地先显示成功回复。

回复成功采用“状态迁移”而非复制或物理删除。平台以稳定 `requestId` 编排 TIM 投递和业务最终确认：

1. 校验 B 的回复非空和 1-500 字长度，不做发送前文本内容审核；
2. 校验悄悄话仍为 `pending`、已送达、未过期且双方仍可匹配；
3. 以 `requestId` 预占本次回复，创建 `app_message_record(message_type=whisper_reply,content_text=明文,send_status=queued)` 和只含投递元数据的 TIM Outbox；重复请求复用原任务，不同请求不能并发回复同一申请；
4. Outbox 从消息主表读取正文，通过 TIM REST 以稳定 `MsgSeq/MsgRandom` 投递 B 的回复；投递失败时把消息记录标记为 `failed`，不创建匹配，申请保持/恢复 `pending`；
5. TIM 投递成功后，在同一 MySQL 事务内以 `sourceType=whisper_reply` 创建或复用唯一有效匹配和唯一私信会话，并把悄悄话迁移 `pending -> replied`、关联申请/回复 TIM 编号；
6. 本地事务提交成功后，双方悄悄话默认列表立即移除该记录，双方私信列表显示同一 TIM C2C 会话，接口才返回本节成功响应；
7. TIM 已送达而本地提交暂失败时按同一 `requestId + MsgKey` 继续最终确认，不重复投递；提交前客户端不展示半完成结果；
8. 原申请与 B 的回复作为 TIM 自定义消息保留为会话开场上下文，A 不需要再次回复才能匹配。

回复投递固定使用 `SendMsgControl=["NoMsgCheck"]`。若小程序先收到 `whisper_reply` TIM 事件、平台
业务会话尚未变为 `active`，只能暂存并刷新会话映射，不能提前展示、跳转或把它计入有效私信未读；
平台确认 `conversationNo + timConversationId + status=active` 后再合并展示。

同一 `Idempotency-Key/requestId` 重试返回首次成功结果；不同幂等键重复处理同一申请返回 30014，
不能重复创建匹配、会话或 TIM 消息。相同幂等键携带不同正文或悄悄话编号返回 30020；完全相同
的重放返回首次结果。未回复到期只迁移为 `expired`，绝不创建私信会话。

### 8.6 `POST /miniapp/message/whispers/read-batch`

```json
{
  "whisperNos": ["WSP202607310001"]
}
```

响应使用通用 `ReadBatchVO`。只允许接收方提交已经成功渲染的记录；已读事实不会返回发送方。

## 9. 官方助手和系统消息

### 9.1 `GET /miniapp/message/assistant/messages`

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "list": [
      {
        "assistantMessageNo": "AST202607310001",
        "topicCode": "private_chat_safety",
        "title": "安全聊天提示",
        "content": "请勿向陌生人转账或泄露验证码。",
        "actionType": "help",
        "actionValue": "chat-safety",
        "readStatus": "unread",
        "createdTime": "2026-07-31 08:00:00"
      }
    ],
    "nextCursor": null,
    "hasMore": false
  }
}
```

页面不显示输入框。认证/审核正式结果不得出现在官方助手。

### 9.2 `POST /miniapp/message/assistant/messages/read-batch`

```json
{
  "messageNos": ["AST202607310001"]
}
```

只在消息卡片已成功渲染后调用。

### 9.3 `GET /miniapp/message/system-messages`

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "list": [
      {
        "noticeNo": "NTF202607310001",
        "notificationType": "governance",
        "bizType": "report_result",
        "title": "举报处理结果",
        "content": "你的举报已处理，感谢你帮助维护社区环境。",
        "readStatus": "unread",
        "jumpType": "none",
        "jumpValue": null,
        "createdTime": "2026-07-31 09:00:00"
      }
    ],
    "nextCursor": "opaque-next",
    "hasMore": true,
    "readAck": {
      "noticeNos": ["NTF202607310001"]
    }
  }
}
```

- 卡片直接展示完整标题和正文。
- 不点击进入通知详情；合法 `jumpType` 才显示行动按钮。
- `readAck.noticeNos` 只是本批候选，前端必须等渲染成功再提交。

### 9.4 `POST /miniapp/message/system-messages/read-batch`

```json
{
  "noticeNos": ["NTF202607310001"]
}
```

服务端只更新属于当前用户且本批存在的消息。无“一键全部已读”接口。

### 9.5 系统消息生产与补偿流程

| 来源业务 | `bizType` | 生产方式 | 失败恢复 |
|----------|-----------|----------|----------|
| 订单、退款、悄悄话补偿 | `asset_result` | 上游事务提交后发布稳定事件 | `MessageFactReconcileJob` 按订单/补偿事实补齐 |
| 邀请奖励 | `invite_result` | 奖励处理完成后发布稳定事件 | 按奖励日志状态补齐 |
| 账号冻结、注销申请/完成 | `account_security` | 状态事务提交后发布，同时失效关系和会话 | 按账号状态及更新时间补齐 |
| 举报、内容治理、处罚 | `report_result/violation_result/content_review_result` | 消费 `community_event_outbox` | Outbox 7 段退避，dead 告警 |
| 社区互动、热点、精选、活动、召回 | 五类 `community_*` | 消费社区聚合 Outbox | Outbox 7 段退避，dead 告警 |
| 平台公告 | `platform_announcement` | 用户读取消息中心时按文章 ID + 版本幂等补齐 | 下次读取继续尝试，不重复生成 |

所有来源先进入 `app_message_event_inbox`，再按已发布模板生成 `app_system_message`；
`producerEventId + receiverUserId + bizType` 保证幂等。上游业务成功不因通知失败而回滚。

## 10. 举报与“拉黑并举报”

### 10.1 `POST /miniapp/community/reports`

举报具体消息：

```json
{
  "clientReportId": "report-550e8400-e29b-41d4-a716-446655440300",
  "targetType": "message",
  "targetBizNo": "MSG202607310088",
  "timConversationId": "C2C_tu_7Fx3A9",
  "timMessageId": "144115233553",
  "timMsgKey": "TIM-MSG-KEY-01",
  "reasonCode": "harassment",
  "extraText": "持续发送不适当内容"
}
```

举报会话：

```json
{
  "clientReportId": "report-550e8400-e29b-41d4-a716-446655440301",
  "targetType": "conversation",
  "targetBizNo": "CV202607310001",
  "timConversationId": "C2C_tu_7Fx3A9",
  "reasonCode": "fraud",
  "extraText": "疑似诱导转账"
}
```

举报悄悄话：

```json
{
  "clientReportId": "report-550e8400-e29b-41d4-a716-446655440302",
  "targetType": "whisper",
  "targetBizNo": "WSP202607310001",
  "timConversationId": "C2C_tu_7Fx3A9",
  "timMessageId": "144115233501",
  "timMsgKey": "TIM-MSG-KEY-WSP-01",
  "reasonCode": "harassment",
  "extraText": null
}
```

统一响应：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "reportNo": "RPT202607310001",
    "status": "PENDING",
    "snapshotStatus": "complete",
    "createdTime": "2026-07-31 12:30:00"
  }
}
```

前端不提交 `reportedUserId`、证据正文或任意上下文文本；服务端校验 TIM 编号、消息归属和参与方后，
优先按本地消息编号/MsgKey 从 `app_message_record.content_text` 读取原消息并冻结最小必要证据；只有本地
归档缺失时，才根据双方账号与发送时间调用 TIM 单聊历史接口补证。若本地归档缺失且漫游期限、删除
或 TIM 暂不可用导致正文无法回查，仍创建举报工单并返回 `snapshotStatus=partial`，
由后台补证；不得采用客户端正文冒充证据。主页不可访问不影响历史目标举报。

该请求是普通平台 HTTP 举报接口，不会向对方发送 TIM 消息，也不会通过 TIM 创建举报工单。
TIM 编号只承担证据定位；举报编号、案件状态和处理结果均由 PRD-05 保存。

### 10.2 “拉黑并举报”顺序

```text
1. POST /conversations/{conversationNo}/block
2. block 成功后 POST /miniapp/community/reports
3. report 成功 -> 展示“已拉黑并提交举报”
4. report 失败 -> 展示“已拉黑，举报提交失败”，保留相同 clientReportId 重试
```

不得并行调用，也不得在举报失败后把拉黑状态回滚。

## 11. IM 凭证和实时事件

### 11.1 `GET /miniapp/im/credentials`

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "sdkAppId": 1400000000,
    "imUserId": "im_01K1ABCDEFGHJKMNPQRST",
    "userSig": "eJyrVgrx...",
    "expireAt": "2026-08-01 12:00:00",
    "protocolVersion": 1
  }
}
```

- `sdkAppId` 可为 number；`imUserId` 必须为 string。
- 不缓存 UserSig 到源码或长期日志。
- 距离过期不足 10 分钟时刷新；UserSig 无效或被踢下线时停止发送并重新登录。
- 30023 且无有效旧凭证时进入 API 只读模式。

### 11.2 SDK 使用边界

允许：

- 登录、连接状态、普通私信发送和实时接收；
- 获取 TIM 会话列表、历史、发送状态、已读与未读；
- 按 `timConversationId/timMessageId/timMsgKey` 与平台业务会话、悄悄话和举报目标关联；
- 网络恢复/回前台后使用 TIM SDK 重新同步会话、历史和未读，再刷新平台业务状态。

禁止：

- 调 SDK 直接发送悄悄话，绕过平台资格、扣费、pending/冷却和幂等校验；
- 在没有平台有效业务会话的情况下强行展示 TIM C2C 会话；
- 调用已经退役的平台普通私信发送、历史或已读接口；
- 把腾讯消息对象直接存进页面 Store。

### 11.3 实时事件

| 事件 | 关键字段 | 前端动作 |
|------|----------|----------|
| TIM 普通文本消息 | `timConversationId,timMessageId,timMsgKey` | 按 SDK 契约去重、渲染并更新 TIM 未读 |
| `whisper_received` | `v,whisperNo` | 刷新悄悄话入口与列表 |
| `system_message_refresh` | `v,noticeNo` | 节流刷新系统消息与未读 |
| `conversation_invalidated` | `v,conversationNo` | 当前页转只读并刷新详情 |
| TIM 消息状态变化 | `timMessageId,status` | 按 SDK 契约更新发送方气泡 |

协议版本未知时忽略事件正文并触发 API 全量刷新，不得按旧结构强行解析。

## 12. 错误码与前端动作

| code | HTTP | 场景 | 是否自动重试 | 前端动作 |
|------|------|------|--------------|----------|
| 30001 | 403 | 核心准入/账号受限 | 否 | 进入认证或受限只读模式 |
| 30002 | 403 | 未匹配发普通私信/不满足悄悄话关系 | 否 | 刷新关系状态 |
| 30003 | 403 | 女性保护 | 否 | 禁用输入，显示保护提示 |
| 30004 | 409 | 会话 blocked/invalid | 否 | 刷新并转只读 |
| 30005 | 409 | 已有 pending 悄悄话 | 否 | 跳转现有记录 |
| 30006 | 409 | 悄悄话冷却 | 否 | 显示可重试时间 |
| 30007 | 402 | 免费次数/千寻币不足 | 否 | 跳转充值/会员 |
| 30008 | 500 | 消息发送失败 | 是 | 沿用原幂等键 |
| 30009 | 404 | 系统消息不存在/不属于本人 | 否 | 从列表移除并刷新 |
| 30010 | 409 | 模板停用 | 是 | 不影响上游业务，刷新 |
| 30011 | 409 | 悄悄话已过期 | 否 | 刷新为申请已结束 |
| 30012 | 409 | 支付/补偿处理中 | 是，轮询状态 | 禁止重复扣费 |
| 30013 | 500 | 补偿暂失败 | 是，服务端主导 | 显示退款处理中 |
| 30014 | 409 | 回复与到期/失效冲突 | 否 | 刷新详情 |
| 30015 | 503 | 全局安全开关关闭 | 是，稍后 | 保留输入，显示平台提示 |
| 30016 | 403 | 后台案件正文权限错误 | 不适用于小程序 | 无 |
| 30019 | 429 | 频率过高 | 是，倒计时后 | 使用 `retryAfterSeconds` |
| 30020 | 409 | 幂等参数冲突/批次归属错误 | 否 | 刷新事实，停止自动重试 |
| 30021 | 409 | 报价过期/资产价格变化 | 否 | 重新预检和确认 |
| 30022 | 404 | 举报目标无效 | 否 | 提示不可举报 |
| 30023 | 503 | IM 凭证不可用 | 是 | 使用有效旧凭证或只读 |
| 30024 | 503 | 消息读取服务降级 | 是 | 显示失败态，禁止伪造空列表 |

项目通用错误码继续保留：4001 表示参数格式错误，401 表示 Token 失效，403 表示当前用户不是
资源参与方，404 表示业务号不存在；它们不得占用业务错误码语义。30017/30018 已退役，平台与
TIM 均不做本期日常消息发送前文本内容审核。错误日志和埋点不得带用户正文。

## 13. Store 与去重建议

建议页面 Store 使用项目领域对象：

```ts
type MessageKey = string // timMessageId 或 timMsgKey
type ConversationKey = string // conversationNo

interface MessageState {
  byTimKey: Record<MessageKey, MessageItem>
  orderedTimKeysByConversation: Record<ConversationKey, MessageKey[]>
  unreadSummary: MessageUnreadSummary
}

interface MessageUnreadSummary {
  privateUnreadCount: number // platform app_message_record
  whisperUnreadCount: number // platform app_message_whisper
  assistantUnreadCount: number // platform app_assistant_message
  systemUnreadCount: number // platform app_system_message
  platformUnreadCount: number // whisper + assistant + system，兼容字段
  messageUnreadCount: number // 四类总数，Tab 直接使用
  snapshotTime: string
}
```

规则：

1. 普通私信临时消息按 LiteChat SDK 消息随机号索引，收到 TIM messageId/MsgKey 后建立稳定映射。
2. SDK 实时事件、发送结果和 TIM 历史按 TIM 唯一键合并，不追加重复气泡。
3. SDK 的 `sending -> sent/failed` 单向更新；用户重试 failed 时复用原消息对象。
4. TIM 历史是小程序正文展示与漫游来源；平台消息主表保存同一正文的明文归档，但普通移动端接口只覆盖 `canSend/status` 等业务字段，不返回 `content_text`。
5. 悄悄话列表/详情的业务状态来自平台，正文按 TIM 映射合并；找不到对应 TIM 消息时显示显式加载失败，不能伪造空正文。
6. `MessageUnreadSummary` 完全采用后端返回值；任一消息事件、已读确认或前后台切换后节流重拉，不做增量猜测或采用 TIM 全局总数。
7. 切换账号、进入 restricted、Token 失效时清空真人消息缓存。
8. 不持久化 UserSig、案件敏感信息或腾讯原始消息对象。

## 14. 前端迁移清单

| 项 | 当前风险 | 必须改为 |
|----|----------|----------|
| 悄悄话状态 | 含 ignored/cancelled/matched | pending/replied/expired/invalid |
| 会话状态 | 保护期可能混入 status | active/blocked/invalid + protectStatus |
| 发送权限 | 页面本地推导 | 完全读取 `canEnterConversation/canSend/sendBlockReason` |
| 发送链路 | Mock 或平台旧 POST | 普通私信 LiteChat SDK 直发 + 消息前回调；悄悄话平台接口 + TIM REST |
| 已读 | 本地清零/全部已读 | 普通私信成功渲染后调用 LiteChat 已读并提交平台 `lastMessageNo`；悄悄话/助手/系统消息按平台精确曝光批次 POST |
| 系统消息 | 旧通知详情 | 列表全文，无详情 |
| 举报 | 可能只报 user | 调 PRD-05 平台接口，提交 conversation/message/whisper 业务号和 TIM 定位编号；不向 TIM 发举报 |
| 拉黑并举报 | 单一乐观成功提示 | 顺序执行并支持部分成功 |
| 分页 | 页码或本地切片 | 普通私信历史使用 TIM SDK 游标，平台业务列表使用不透明 cursor |
| 时间 | 旧 ISO 字符串 | `yyyy-MM-dd HH:mm:ss` |
| 真实服务 | `createMessageService('real')` 抛错 | 实现本文全部接口 |
| LiteChat | 未安装/未 POC | Taro 4.1.9 + 精确版本 4.4.2 POC 后接入 |

## 15. 联调验收清单

移动端接口完整度按以下 28 项计数，任一 P0 主链路缺失时总分不得达标：

1. 正常首页。
2. 受限首页。
3. 私信列表游标分页。
4. active 会话进入。
5. blocked/invalid 安全读取。
6. LiteChat 文本 sending/sent/failed。
7. SDK 原消息重试与重复回调幂等。
8. 未匹配/保护期/全局开关/处罚由消息前回调拦截。
9. 消息前回调超时或业务事实不可用时拒绝发送。
10. LiteChat 私信历史 + TIM/平台双重已读 + 后端四类未读总数。
11. 拉黑。
12. 拉黑成功、举报失败。
13. 免费悄悄话预检。
14. 千寻币报价/余额不足。
15. pending 与冷却。
16. 报价过期。
17. 投递失败补偿。
18. 回复原子成功。
19. 回复竞争回滚。
20. 悄悄话已读隐私。
21. 助手不可回复与已读。
22. 五类系统消息与跳转。
23. 系统消息曝光批次已读。
24. 无详情/无全部已读。
25. 三类聊天举报均调用 PRD-05 平台接口，TIM 编号仅用于证据定位。
26. 主页不可用举报。
27. IM 凭证刷新/失效。
28. 未知枚举/协议降级。

当前分支的后端契约和本地自动化测试已完成，结果见
`docs/测试文档/消息私信通知中心-testreport.md`。真实 TIM 双账号、公网回调、生产 KMS 和隔离数据库
测试仍必须在具备外部资源后执行；在此之前只能标记“后端本地验证通过”，不能标记“生产联调完成”。
