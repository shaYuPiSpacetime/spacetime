# 消息、私信与通知中心 - 小程序接口对接文档

> 文档状态：`IMPLEMENTED`
> 更新日期：2026-08-15（字段说明与出入参示例补全）
> 需求模块：`03-消息、私信与通知中心`
> 关联技术方案：`docs/技术方案/2026-07-31-消息、私信与通知中心-tcdesign.md`
> 实现边界：后端接口、数据库迁移和自动化测试已实现；未编写小程序前端代码。普通私信实时收发及漫游历史由腾讯云 TIM SDK 承接。

## 1. 通用约定

| 项 | 约定 |
| --- | --- |
| 路由前缀 | `/miniapp`；若客户端 HTTP 基地址已含 `/api`，最终请求为 `{apiBase}/miniapp/...`，不得重复拼接 |
| 登录 Header | `X-Auth-Token: {token}` |
| 当前用户 | 从登录上下文取得，客户端不得提交当前用户 ID |
| 返回结构 | `R<T>`，成功时 `code=200`、`msg=success`、业务数据在 `data` |
| 时间格式 | `yyyy-MM-dd HH:mm:ss`，时区 `Asia/Shanghai` |
| 分页 | 不透明游标；首屏不传 `cursor`，续页原样回传 `nextCursor` |
| 空值 | Jackson 使用 `non_null`；文档中标记为可空的字符串、数字、对象无值时可能省略，前端类型必须声明为可选；空列表固定返回 `[]` |
| 业务编号 | 按字符串保存和传递，不得转换为 Number |
| 幂等 | 悄悄话发送和回复使用 `Idempotency-Key`；举报使用 `clientReportId` |
| 一期消息类型 | 普通文本、Unicode Emoji、悄悄话文本、系统提示 |
| 一期不支持 | 图片私信、语音、视频、文件、撤回、输入中状态、音视频通话 |

统一请求 Header：

| 字段 | 必填 | 中文说明 |
| --- | --- | --- |
| `X-Auth-Token` | 是 | 小程序登录 Token；示例统一写作 `{token}`，禁止在日志和文档中记录真实值 |
| `Content-Type: application/json` | POST/DELETE 有 JSON Body 时是 | 请求体编码固定为 UTF-8 JSON |
| `Idempotency-Key` | 仅悄悄话发送、回复时是 | 8-64 字符的客户端幂等编号，具体约束见对应接口 |

所有成功响应均使用以下 `R<T>` 外壳：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `code` | Integer | HTTP 请求成功且业务成功时为 `200` |
| `msg` | String | 成功固定为 `success`；失败时为可展示或可记录的错误摘要 |
| `data` | Object/Array/null | 当前接口业务数据；无业务返回值时为 `null` |

```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}
```

### 1.1 平台库与 TIM 分工

| 能力 | 负责方 | 说明 |
| --- | --- | --- |
| 消息首页、会话列表 | 平台后端 | 查询平台库，不要求当前用户或对方已建立 TIM 连接 |
| 最新消息摘要、发送状态、未读数 | 平台后端 | 来自 `app_message_record`，首页不实时查询 TIM |
| 普通私信完整历史、发送、接收、失败重试 | TIM SDK | 点击具体会话后才初始化 TIM 并拉取历史 |
| 本机尚未送达 TIM 的发送中/失败气泡 | 小程序本地 Outbox | 按当前登录用户和会话隔离保存；成功后由 TIM 消息替换并删除本地项 |
| 悄悄话预检、扣费、创建、到期、删除投影、回复匹配 | 平台后端 | 小程序禁止绕过后端直接用 TIM 发送悄悄话 |
| 悄悄话申请和回复投递 | 平台后端调用 TIM | 正文先写平台消息主表，再通过 Outbox 可靠投递 TIM |
| 悄悄话详情正文 | 平台后端 | 留存期内从 `app_message_record.content_text` 返回完整正文 |
| 举报 | 平台后端 | 举报不发送 TIM 消息；服务端按业务编号固化证据 |

消息首页和会话列表只返回最新一条消息的单行摘要，最多 50 个 Unicode 字符。完整普通私信历史仍从 TIM 拉取。首页不会因为对方尚未建立 TIM 账号而整体失败；只有进入具体私信会话时才校验 TIM 映射。

上线前必须在腾讯云控制台把 TIM 单聊漫游消息保留期配置为不短于产品承诺的聊天可见期，并验证套餐上限。平台归档表保存正文事实用于摘要、未读、举报和审计，但当前 C 端不提供“平台历史补拉”接口；因此 TIM 已清理的历史不会自动从平台表回灌聊天窗口。

普通私信发送时，小程序本地 Outbox 只补 TIM 服务端尚未收到的 `sending/failed` 消息，不是第二套聊天历史库。每个本地气泡使用小程序生成的 `localOutboxId` 去重；若 TIM SDK 返回本地消息标识，可一并保存为 `timLocalMessageId`。发送成功后使用当前发送 Promise/SDK 回调关联的 `localOutboxId` 删除本地气泡，并以 TIM 返回消息为准；发送失败保留原本地项供重试。`localOutboxId` 只存在小程序本地，平台接口不接收、不返回，也不能误用平台消息表的 `client_msg_id`。切换账号、退出登录或清理缓存时必须按产品策略清理对应本地 Outbox，禁止跨账号展示。

普通私信一期只允许一条 `TIMTextElem`，正文 trim 后为 1-500 个 Unicode 码点。TIM 发送前回调再次校验双方准入、匹配关系、拉黑、会话状态、全局发送开关和女性保护；即使前端按钮仍可点，回调也可能拒绝本次发送。TIM 回调响应使用腾讯协议，不是平台 `R<T>`：女性保护和会话失效分别映射为腾讯业务码 `120003`、`120004`。

### 1.2 业务状态枚举

| 字段 | code | 中文说明 |
| --- | --- | --- |
| `accessMode` | `normal` | 正常消息模式 |
| `accessMode` | `restricted` | 账号受限，仅展示必要安全系统消息 |
| `direction` | `received` | 申请我的，当前用户是接收方 |
| `direction` | `sent` | 我申请的，当前用户是发送方 |
| `bucket` | `pending` | 未处理：已送达、待回复且未到期 |
| `bucket` | `processed` | 已处理：已回复、已过期或已失效 |
| `status` | `pending` | 待回复 |
| `status` | `replied` | 已回复并完成匹配 |
| `status` | `expired` | 已过期 |
| `status` | `invalid` | 账号、关系或投递等原因导致失效 |
| `payType` | `vip_free` | 使用会员当日免费次数 |
| `payType` | `coin` | 使用千寻币 |
| `sendStatus` | `queued` | 平台消息已进入可靠投递流程，尚未收到 TIM 成功回调 |
| `sendStatus` | `sending` | 仅悄悄话创建响应或小程序本地 Outbox 使用，消息主表不保存该状态 |
| `sendStatus` | `sent` | 已发送 |
| `sendStatus` | `failed` | 发送失败 |
| `conversationStatus` | `active` | 有效私信会话 |
| `conversationStatus` | `blocked` | 已拉黑 |
| `conversationStatus` | `invalid` | 会话已失效 |
| `accessMode` | `safety_readonly` | 会话失效后的安全只读模式；有 TIM 映射时可查看历史，始终禁止发送和打开主页 |
| `readStatus` | `unread` | 未读 |
| `readStatus` | `read` | 已读 |
| `cardType` | `text/action/tip` | 助手纯文本卡片、行动卡片、提示卡片 |
| `contentFormat` | `plain_text/rich_text` | 系统消息纯文本或服务端白名单清洗后的富文本 |

### 1.3 悄悄话来源 `sourceScene`

| code | 中文说明 | `sourceBizNo` |
| --- | --- | --- |
| `recommendation` | 推荐页或推荐卡片 | 可不传 |
| `profile` | 用户主页 | 可不传 |
| `community_post` | 社区动态 | 必传帖子业务编号 |
| `community_comment` | 社区评论 | 必传评论业务编号 |
| `whisper_reverse` | 旧申请结束后的反向申请 | 必传原 `whisperNo` |

`sourceScene` 和 `sourceBizNo` 同时绑定在预检报价中。创建接口必须原样提交，不能更换来源。

## 2. 页面与接口总览

| ID | Method | Path | 页面或用途 |
| --- | --- | --- | --- |
| `MOB-03-01` | GET | `/miniapp/message/home` | 消息首页 |
| `MOB-03-02` | GET | `/miniapp/message/unread-summary` | 消息 Tab 未读 |
| `MOB-03-03` | GET | `/miniapp/message/conversations` | 普通私信会话分页 |
| `MOB-03-04` | GET | `/miniapp/message/conversations/{conversationNo}` | 进入私信前查询权限和 TIM 映射 |
| `MOB-03-05` | POST | `/miniapp/message/conversations/{conversationNo}/read` | 平台私信已读 |
| `MOB-03-06` | POST | `/miniapp/message/conversations/{conversationNo}/block` | 拉黑会话对方 |
| `MOB-03-07` | GET | `/miniapp/message/whispers` | 悄悄话分组列表 |
| `MOB-03-08` | GET | `/miniapp/message/whispers/{whisperNo}` | 悄悄话详情 |
| `MOB-03-09` | POST | `/miniapp/message/whispers/read-batch` | 悄悄话曝光已读 |
| `MOB-03-10` | DELETE | `/miniapp/message/whispers/{whisperNo}` | 接收方单条逻辑隐藏 |
| `MOB-03-11` | POST | `/miniapp/message/whispers/received/hide-all` | 接收方分组全部逻辑隐藏 |
| `MOB-03-12` | POST | `/miniapp/message/whispers/precheck` | 发送资格和报价 |
| `MOB-03-13` | POST | `/miniapp/message/whispers` | 扣费并发送悄悄话 |
| `MOB-03-14` | POST | `/miniapp/message/whispers/{whisperNo}/reply` | 回复、匹配并创建私信会话 |
| `MOB-03-15` | GET | `/miniapp/message/assistant/messages` | 官方助手消息 |
| `MOB-03-16` | POST | `/miniapp/message/assistant/messages/read-batch` | 官方助手曝光已读 |
| `MOB-03-17` | GET | `/miniapp/message/system-messages` | 系统消息 |
| `MOB-03-18` | POST | `/miniapp/message/system-messages/read-batch` | 系统消息曝光已读 |
| `MOB-03-19` | GET | `/miniapp/im/credentials` | TIM 登录凭证 |
| `MOB-03-20` | POST | `/miniapp/file/upload-ticket/report-evidence` | 举报图片直传凭证 |
| `MOB-03-21` | POST | `/miniapp/community/reports` | 提交举报 |
| `MOB-03-22` | GET | `/miniapp/community/config` | 举报入口开关与举报原因字典 |

## 3. 前端总流程

### 3.1 消息首页

```text
进入消息 Tab
  -> GET /miniapp/message/home?size=20
  -> 渲染悄悄话卡片、喜欢我的人、官方助手、系统消息、普通私信会话
  -> 不初始化 TIM，不查询 TIM 历史
  -> 私信列表续页调用 GET /miniapp/message/conversations?cursor=...

点击某个普通私信会话
  -> GET /miniapp/message/conversations/{conversationNo}
  -> canEnterConversation=true 时 GET /miniapp/im/credentials
  -> 登录 TIM，使用 timConversationId 拉完整历史
  -> 合并当前账号+会话的本地 sending/failed Outbox
  -> TIM 会话已读上报触发平台 C2C.CallbackAfterMsgReport 回调
  -> 回调暂不可用时，使用 POST /miniapp/message/conversations/{conversationNo}/read 幂等补偿
```

消息首页动态行只展示有效普通私信会话。悄悄话只在顶部卡片和悄悄话页面展示，不混入普通私信会话行。

### 3.2 悄悄话列表双分组

进入“申请我的”时同时发起两次独立查询：

```text
GET /miniapp/message/whispers?direction=received&bucket=pending&size=20
GET /miniapp/message/whispers?direction=received&bucket=processed&size=20
```

页面维护两套独立状态：

| 分组 | 列表状态 | 游标状态 | 加载状态 |
| --- | --- | --- | --- |
| 未处理 | `pendingList` | `pendingNextCursor` | `pendingLoading/pendingHasMore` |
| 已处理 | `processedList` | `processedNextCursor` | `processedLoading/processedHasMore` |

手机页面可以是同一个纵向滚动容器。滚动到“未处理”分组底部时加载未处理下一页；继续滚动到“已处理”分组底部时加载已处理下一页。两组不能共用游标，也不能把两个响应拼成一个服务端分页。

“我申请的”只调用：

```text
GET /miniapp/message/whispers?direction=sent&bucket=pending&size=20
```

发送方不展示历史已处理列表，也不提供删除。

### 3.3 回复并匹配

```text
申请我的详情 actions.canReply=true
  -> 用户填写回复内容
  -> POST /miniapp/message/whispers/{whisperNo}/reply
  -> 后端写回复消息主表并通过 TIM 可靠投递
  -> 同一业务编排完成匹配和唯一私信会话
  -> 返回 conversationNo
  -> 刷新悄悄话两组列表
  -> GET /miniapp/message/conversations/{conversationNo}
  -> 进入该用户的聊天窗口
```

接收方回复一次即表示接受申请并完成匹配，不需要发送方再次确认。原悄悄话保留为 `replied` 业务事实，但退出双方待处理列表。

### 3.4 删除

- 只有“申请我的”支持删除。
- 单条删除和“全部删除”都是接收方视角逻辑隐藏，不修改悄悄话业务状态，不物理删除。
- 删除后接收方列表和详情不可见；发送方自己的待处理记录不受影响。
- 后台仍能查询原始申请、真实状态、隐藏时间和隐藏方式。
- 已删除的待处理申请不能绕过列表直接回复。

## 4. 消息首页与普通私信

### 4.1 GET `/miniapp/message/home`

用途：一次返回消息首页所需摘要和普通私信首屏。首页只查询平台数据库，不依赖 TIM 登录或对方 TIM 账号。

请求参数：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `cursor` | String | 否 | 普通私信续页游标，首屏不传 |
| `size` | Integer | 否 | 普通私信每页数量，默认 20，最大 50 |

顶层返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `accessMode` | String | `normal` 正常、`restricted` 受限只读 |
| `restrictionPrompt` | String/null | 受限模式提示文案 |
| `unreadSummary` | Object | 四类未读汇总 |
| `whisperSummary` | Object | 悄悄话卡片摘要 |
| `likesMeSummary` | Object | 喜欢我的人摘要 |
| `assistantSummary` | Object | 官方助手摘要 |
| `systemSummary` | Object | 系统消息摘要 |
| `conversationPage` | Object | 普通私信会话首屏或续页 |

`unreadSummary` 字段：

与 4.2 `GET /miniapp/message/unread-summary` 的返回结构、字段含义和查询口径完全一致。消息首页不维护第二套未读定义。

`whisperSummary` 字段：

| 字段 | 类型 | 中文说明 | 查询范围 |
| --- | --- | --- | --- |
| `pendingCount` | Long | 申请我的待处理总数 | 已送达、待回复、未到期、未隐藏，已读和未读都计入 |
| `recentAvatarUrls` | Array<String> | 最近申请人头像 | 按申请倒序最多 3 个审核通过头像 |

`likesMeSummary` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `totalCount` | Long | 当前有效“喜欢我的”总数 |
| `newCount` | Long | 尚未确认查看的新喜欢数 |
| `latestAvatarUrl` | String/null | 最近一人的头像 |
| `latestLikedTime` | String/null | 最近喜欢时间 |
| `latestDisplayStatus` | String/null | `clear` 清晰、`blur` 模糊，由 PRD-02 权益决定 |

`assistantSummary` 和 `systemSummary` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `unreadCount` | Long | 当前未读数 |
| `latestPreview` | String/null | 最新一条单行摘要，最多 50 字符 |
| `latestTime` | String/null | 最新一条时间 |

`conversationPage` 字段：

与 4.3 `GET /miniapp/message/conversations` 返回结构一致，即 `list/nextCursor/hasMore` 以及该节定义的 `list[]/peerUser/lastMessage`。首页不额外扩展会话字段。

查询和排序：

1. 只查当前用户参与且 `conversation.status=active` 的普通私信会话。
2. 按 `last_message_time DESC, id DESC` 稳定排序。
3. 对方未建立 TIM 账号不会影响首页返回。
4. 悄悄话申请不进入 `conversationPage.list`。
5. `restricted` 模式返回空悄悄话、喜欢、助手和真人会话，只保留必要安全系统消息。

请求示例：

```http
GET /api/miniapp/message/home?size=20 HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "accessMode": "normal",
    "unreadSummary": {
      "privateUnreadCount": 4,
      "whisperUnreadCount": 3,
      "assistantUnreadCount": 3,
      "systemUnreadCount": 4,
      "messageUnreadCount": 14,
      "snapshotTime": "2026-08-15 12:00:10"
    },
    "whisperSummary": {
      "pendingCount": 3,
      "recentAvatarUrls": [
        "https://cdn.example.com/avatar/140.webp",
        "https://cdn.example.com/avatar/141.webp",
        "https://cdn.example.com/avatar/142.webp"
      ]
    },
    "likesMeSummary": {
      "totalCount": 9,
      "newCount": 1,
      "latestAvatarUrl": "https://cdn.example.com/avatar/78.webp",
      "latestLikedTime": "2026-08-15 12:00:11",
      "latestDisplayStatus": "clear"
    },
    "assistantSummary": {
      "unreadCount": 3,
      "latestPreview": "欢迎使用消息中心，悄悄话回复成功后会自动进入私信会话。",
      "latestTime": "2026-08-15 11:21:36"
    },
    "systemSummary": {
      "unreadCount": 4,
      "latestPreview": "你的头像、实名认证和学历认证均已通过。",
      "latestTime": "2026-08-15 11:08:36"
    },
    "conversationPage": {
      "list": [
        {
          "conversationNo": "CV-2087485877996027904",
          "peerUser": {
            "userId": 131,
            "nickname": "清禾",
            "avatarUrl": "https://cdn.example.com/avatar/131.webp",
            "profileAvailable": true
          },
          "unreadCount": 1,
          "lastMessage": {
            "messageNo": "MSG-8F21F0C30B7C4E88A001",
            "messageType": "text",
            "direction": "incoming",
            "preview": "周末有空一起去看展吗？",
            "messageTime": "2026-08-15 11:53:36",
            "sendStatus": "sent"
          }
        }
      ],
      "nextCursor": "eyJ0IjoiMjAyNi0wOC0xNSAxMTo1MzozNiIsImlkIjozM30",
      "hasMore": true
    }
  }
}
```

受限账号会额外返回 `restrictionPrompt`，并将真人关系内容投影为空：

```json
{
  "accessMode": "restricted",
  "restrictionPrompt": "当前仅可查看账号安全、处罚和申诉消息"
}
```

### 4.2 GET `/miniapp/message/unread-summary`

无业务入参。消息 Tab 直接使用 `messageUnreadCount`；前端不把 TIM 全局未读再叠加一次。

返回字段：

| 字段 | 类型 | 中文说明 | 查询范围 |
| --- | --- | --- | --- |
| `privateUnreadCount` | Long | 普通私信未读数 | 接收人为当前用户、`send_status=sent`、`receiver_read_status=unread`、未隔离的普通私信 |
| `whisperUnreadCount` | Long | 悄悄话未读数 | 申请我的、已送达、待回复、未到期、未隐藏且未曝光 |
| `assistantUnreadCount` | Long | 官方助手未读数 | 当前用户可见、未过可见期且未读的助手消息 |
| `systemUnreadCount` | Long | 系统消息未读数 | 当前用户可见、未过可见期且未读的系统消息；受限账号只计安全类消息 |
| `messageUnreadCount` | Long | 消息 Tab 总未读数 | 上述四项相加，服务端直接计算 |
| `snapshotTime` | String | 统计快照时间 | 服务端本次计算时间 |

请求示例：

```http
GET /api/miniapp/message/unread-summary HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "privateUnreadCount": 4,
    "whisperUnreadCount": 3,
    "assistantUnreadCount": 3,
    "systemUnreadCount": 4,
    "messageUnreadCount": 14,
    "snapshotTime": "2026-08-15 12:00:10"
  }
}
```

### 4.3 GET `/miniapp/message/conversations`

用途：消息首页普通私信加载更多及独立私信列表。只查询当前用户参与、`status=active` 的会话，按 `last_message_time DESC, id DESC` 排序，不依赖 TIM 在线状态。

请求参数：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `cursor` | String | 否 | 上一页返回的不透明游标，首屏不传 |
| `size` | Integer | 否 | 每页数量，默认 20，最大 50 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `list` | Array<Object> | 当前页有效普通私信会话 |
| `nextCursor` | String/null | 下一页游标；无下一页时省略 |
| `hasMore` | Boolean | 是否还有下一页 |

`list[]` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `conversationNo` | String | 平台私信会话业务编号 |
| `peerUser.userId` | Long | 对方用户 ID |
| `peerUser.nickname` | String | 对方昵称；缺失时使用兜底名 |
| `peerUser.avatarUrl` | String/null | 对方审核通过头像 |
| `peerUser.profileAvailable` | Boolean | 当前是否允许打开对方主页 |
| `unreadCount` | Long | 当前会话平台未读投影 |
| `lastMessage.messageNo` | String | 最新平台消息编号 |
| `lastMessage.messageType` | String | `text/whisper/whisper_reply/system_tip` |
| `lastMessage.direction` | String | `incoming` 对方发来、`outgoing` 当前用户发出 |
| `lastMessage.preview` | String/null | 最新消息单行摘要，最多 50 个 Unicode 字符 |
| `lastMessage.messageTime` | String | 已发送时间；缺失时使用创建时间 |
| `lastMessage.sendStatus` | String | `queued/sent/failed` |

尚无归档消息时 `lastMessage` 整体省略。悄悄话申请不进入本列表。

查询范围与数据源：

1. `app_message_conversation_member` 定位当前用户参与的会话，`app_message_conversation` 只保留 `status=active`。
2. `app_message_record` 提供最后消息、发送状态和当前用户收到的未读数量；首页不请求 TIM。
3. 对方摘要来自用户资料及审核通过头像；对方 TIM 账号是否存在不影响本接口。
4. 游标绑定排序键和当前用户，按 `last_message_time DESC, id DESC` 稳定分页。

请求示例：

```http
GET /api/miniapp/message/conversations?size=20 HTTP/1.1
X-Auth-Token: {token}
```

续页请求示例：

```http
GET /api/miniapp/message/conversations?cursor=eyJ0IjoiMjAyNi0wOC0xNSAxMTo1MzozNiIsImlkIjozM30&size=20 HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "list": [
      {
        "conversationNo": "CV-2087485877996027904",
        "peerUser": {
          "userId": 131,
          "nickname": "清禾",
          "avatarUrl": "https://cdn.example.com/avatar/131.webp",
          "profileAvailable": true
        },
        "unreadCount": 1,
        "lastMessage": {
          "messageNo": "MSG-8F21F0C30B7C4E88A001",
          "messageType": "text",
          "direction": "incoming",
          "preview": "周末有空一起去看展吗？",
          "messageTime": "2026-08-15 11:53:36",
          "sendStatus": "sent"
        }
      }
    ],
    "nextCursor": "eyJ0IjoiMjAyNi0wOC0xNSAxMTo1MzozNiIsImlkIjozM30",
    "hasMore": true
  }
}
```

### 4.4 GET `/miniapp/message/conversations/{conversationNo}`

路径参数：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `conversationNo` | String | 平台私信会话编号 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `conversationNo` | String | 平台私信会话编号 |
| `timConversationId` | String/null | TIM C2C 会话编号；正常会话必有，失效会话若映射缺失则省略 |
| `conversationStatus` | String | `active/blocked/invalid` |
| `accessMode` | String | `normal` 正常会话；`safety_readonly` 失效后的安全只读会话 |
| `peerUser.userId` | Long | 对方用户 ID |
| `peerUser.nickname` | String | 正常会话返回当前昵称；安全只读固定返回“用户已不可互动” |
| `peerUser.avatarUrl` | String/null | 正常会话返回审核通过头像；安全只读不返回 |
| `peerUser.profileAvailable` | Boolean | 正常会话按账号状态计算；安全只读固定 false |
| `canEnterConversation` | Boolean | 是否允许进入聊天页查看历史 |
| `canSend` | Boolean | 当前是否允许发送 |
| `sendBlockedReason` | String/null | `female_protection` 或 `conversation_invalid` |
| `canReportChat` | Boolean | 当前是否存在可固化为证据的对方已发送正文 |
| `reportContext` | Object/null | 会话顶部举报所需的可信定位；不可举报时为 null |
| `femaleProtection.enabled` | Boolean | 是否启用女性保护 |
| `femaleProtection.waitingForFemaleFirstMessage` | Boolean | 是否等待女方先发送真实消息 |
| `femaleProtection.protectionUntil` | String/null | 女性保护截止时间；未启用或无截止时间时为 null |
| `safetyActions` | Array<String> | 当前可用操作：`report_chat`、`block`、`block_and_report` |

`reportContext` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `sourceType` | String | 固定 `private_chat`，表示举报整段私信会话 |
| `conversationNo` | String | 平台会话业务编号 |
| `timConversationId` | String/null | TIM C2C 会话编号；失效会话映射缺失时省略，举报仍可按 `conversationNo` 反查 |

状态规则：

1. `active` 会话返回 `accessMode=normal`；可发送时 `canSend=true`，女性保护期内男方为 `canSend=false`、`sendBlockedReason=female_protection`。
2. `blocked/invalid` 会话返回 `accessMode=safety_readonly`、`canSend=false`，不得继续打开对方主页，也不返回对方最新昵称、头像和账号状态。
3. 安全只读会话仍有 TIM 映射时 `canEnterConversation=true`，可查看 TIM 保留期内历史；映射缺失时为 false，但详情和会话顶部举报不报错。
4. 只有平台消息主表中存在当前用户收到、发送成功且正文仍可取证的对方消息时，`canReportChat=true`。
5. `normal` 模式可返回举报和拉黑动作；`safety_readonly` 只返回 `report_chat`。

正常会话对方 TIM 账号尚不可用时返回 `30023`。安全只读会话不会因此失败，而是返回 `canEnterConversation=false`。

请求示例：

```http
GET /api/miniapp/message/conversations/CV-2087485877996027904 HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "conversationNo": "CV-2087485877996027904",
    "timConversationId": "C2C_tu_000000000131",
    "conversationStatus": "active",
    "accessMode": "normal",
    "peerUser": {
      "userId": 131,
      "nickname": "清禾",
      "avatarUrl": "https://cdn.example.com/avatar/131.webp",
      "profileAvailable": true
    },
    "canEnterConversation": true,
    "canSend": true,
    "canReportChat": true,
    "reportContext": {
      "sourceType": "private_chat",
      "conversationNo": "CV-2087485877996027904",
      "timConversationId": "C2C_tu_000000000131"
    },
    "femaleProtection": {
      "enabled": true,
      "waitingForFemaleFirstMessage": false,
      "protectionUntil": "2026-08-16 12:00:00"
    },
    "safetyActions": ["report_chat", "block", "block_and_report"]
  }
}
```

当 `canSend=false` 时会返回 `sendBlockedReason`；字段值和前端处理见本节状态规则。

### 4.5 POST `/miniapp/message/conversations/{conversationNo}/read`

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `lastMessageNo` | String | 条件必填 | 当前页已成功渲染的最后一条平台消息编号；首页或平台摘要已提供时优先传此字段 |
| `timMessageId` | String | 条件必填 | TIM SDK 返回的最后已读消息 ID；不知道平台 `messageNo` 时可使用 |
| `timMsgKey` | String | 否 | TIM 服务端消息唯一键，可与 `timMessageId` 一并提交增强定位 |

`lastMessageNo`、`timMessageId`、`timMsgKey` 至少传一个。若同时提交多个定位字段，它们必须指向当前会话内同一条已归档消息，否则返回参数错误。

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `conversationNo` | String | 会话编号 |
| `lastReadMessageNo` | String | 服务端确认的最后已读消息编号 |
| `unreadCount` | Integer | 当前会话剩余未读数 |
| `readAt` | String | 平台已读确认时间 |

主链路由 TIM SDK 上报会话已读，腾讯回调 `C2C.CallbackAfterMsgReport` 按 `LastReadTime` 推进会话成员单调已读水位，再更新平台消息主表。该接口作为幂等补偿：回调延迟、丢失或需要立即刷新角标时，前端提交平台 `messageNo` 或 TIM 定位字段。服务端在一个事务中先推进同一水位、再标记历史消息；迟到的消息归档若早于水位会直接记为已读，两条链路重复执行不会重复计数。

TIM 发送后回调和已读回调都按消息发送时间或读水位时间查找当时所属的会话生命周期。旧会话失效后即使重新匹配产生新会话，迟到的旧回调也只能更新旧生命周期，不得污染新会话的最后消息、未读和已读水位。

请求示例：

```http
POST /api/miniapp/message/conversations/CV-2087485877996027904/read HTTP/1.1
X-Auth-Token: {token}
Content-Type: application/json

{
  "lastMessageNo": "MSG-8F21F0C30B7C4E88A001"
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "conversationNo": "CV-2087485877996027904",
    "lastReadMessageNo": "MSG-8F21F0C30B7C4E88A001",
    "unreadCount": 0,
    "readAt": "2026-08-15 12:05:20"
  }
}
```

### 4.6 POST `/miniapp/message/conversations/{conversationNo}/block`

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `sourceScene` | String | 否 | 来源场景，聊天菜单建议传 `chat_menu` |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `conversationNo` | String | 被操作会话编号 |
| `conversationStatus` | String | 固定返回 `blocked` |
| `blockNo` | String | 拉黑记录编号 |
| `canSend` | Boolean | 固定 false |

请求示例：

```http
POST /api/miniapp/message/conversations/CV-2087485877996027904/block HTTP/1.1
X-Auth-Token: {token}
Content-Type: application/json

{
  "sourceScene": "chat_menu"
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "conversationNo": "CV-2087485877996027904",
    "conversationStatus": "blocked",
    "blockNo": "BLK-2089000000000000001",
    "canSend": false
  }
}
```

## 5. 悄悄话接口

### 5.1 GET `/miniapp/message/whispers`

请求参数：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `direction` | String | 是 | `received` 申请我的、`sent` 我申请的 |
| `bucket` | String | 否 | `pending` 未处理、`processed` 已处理；默认 pending |
| `cursor` | String | 否 | 当前方向和分组的下一页游标 |
| `size` | Integer | 否 | 默认 20，最大 20 |

约束：`sent` 只支持 `bucket=pending`；传 `sent+processed` 返回参数错误。

顶层返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `direction` | String | 本次查询方向 |
| `bucket` | String | 本次查询分组 |
| `totalCount` | Long | 当前方向和分组全部可见记录数 |
| `list` | Array<Object> | 当前页记录 |
| `nextCursor` | String/null | 当前方向和分组的下一页游标 |
| `hasMore` | Boolean | 当前方向和分组是否还有数据 |

`list[]` 返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `whisperNo` | String | 悄悄话业务编号 |
| `direction` | String | `received/sent` |
| `status` | String | `pending/replied/expired/invalid`；到期未迁移记录会投影为 expired |
| `displayStatus` | String | `等待你回应/等待回应/已回复并匹配/申请已结束` |
| `peerUser.userId` | Long | 对方用户 ID |
| `peerUser.nickname` | String | 对方昵称，缺失时使用兜底名 |
| `peerUser.avatarUrl` | String/null | 对方审核通过头像 |
| `peerUser.profileAvailable` | Boolean | 当前是否允许打开对方主页 |
| `payType` | String | `vip_free/coin` |
| `createdTime` | String | 申请时间 |
| `expireTime` | String | 到期时间 |
| `canReply` | Boolean | 当前记录是否允许回复 |
| `unread` | Boolean/null | 接收方未曝光为 true；发送方向为 null |

查询范围：

- `received + pending`：接收人为当前用户、未隐藏、`status=pending`、`delivery_status=sent`、未到期。
- `received + processed`：接收人为当前用户、未隐藏，状态为 `replied/expired/invalid`，或待回复但已到期。
- `sent + pending`：发送人为当前用户、`status=pending`、已送达、未到期。
- 各分组均按 `id DESC` 排序，游标与当前用户、方向和分组绑定。

请求示例（申请我的未处理首屏）：

```http
GET /api/miniapp/message/whispers?direction=received&bucket=pending&size=20 HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "direction": "received",
    "bucket": "pending",
    "totalCount": 3,
    "list": [
      {
        "whisperNo": "WSP-8F21F0C30B7C4E88A001",
        "direction": "received",
        "status": "pending",
        "displayStatus": "等待你回应",
        "peerUser": {
          "userId": 140,
          "nickname": "书妍",
          "avatarUrl": "https://cdn.example.com/avatar/140.webp",
          "profileAvailable": true
        },
        "payType": "coin",
        "createdTime": "2026-08-15 11:42:00",
        "expireTime": "2026-08-22 11:42:00",
        "canReply": true,
        "unread": true
      }
    ],
    "nextCursor": "eyJzY29wZSI6InJlY2VpdmVkOnBlbmRpbmciLCJpZCI6MTIzfQ",
    "hasMore": true
  }
}
```

### 5.2 GET `/miniapp/message/whispers/{whisperNo}`

路径参数：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `whisperNo` | String | 是 | 悄悄话业务编号，只能查询当前用户参与且当前视角未隐藏的记录 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `whisperNo` | String | 悄悄话业务编号 |
| `direction` | String | 当前用户视角 `received/sent` |
| `status` | String | 当前业务状态：`pending/replied/expired/invalid` |
| `displayStatus` | String | 可直接展示的中文状态 |
| `peerUser.userId` | Long | 对方用户 ID |
| `peerUser.nickname` | String | 对方昵称，缺失时使用兜底名 |
| `peerUser.avatarUrl` | String/null | 对方审核通过头像 |
| `peerUser.profileAvailable` | Boolean | 当前是否允许打开对方主页 |
| `content` | String/null | 申请完整正文；正文已按留存策略清理时为 null |
| `contentAvailable` | Boolean | 当前正文是否可用 |
| `requestMessageNo` | String/null | 申请对应的平台消息编号 |
| `createdTime` | String | 申请时间 |
| `expireTime` | String | 到期时间 |
| `processedTime` | String/null | 回复、过期或失效时间；未处理为 null |
| `remainingSeconds` | Long | 剩余有效秒数，已到期为 0 |
| `conversationNo` | String/null | 回复匹配后关联的私信会话编号 |
| `actions` | Object | 服务端计算的可操作项 |

`actions` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `canReply` | Boolean | 是否可回复并匹配 |
| `canDelete` | Boolean | 是否可从当前接收方列表逻辑删除；只有 received 为 true |
| `canReportWhisperContent` | Boolean | 是否可举报当前悄悄话正文；申请我的和我申请的均可，只要正文仍可用 |
| `canReportPeerUser` | Boolean | 是否可举报对方账号或资料 |
| `canReverseApply` | Boolean | 旧申请结束后，当前接收方是否可反向申请 |
| `canEnterConversation` | Boolean | 是否已匹配并可使用 `conversationNo` 进入私信 |
| `canOpenProfile` | Boolean | 是否可打开对方主页 |

正文直接由本接口返回，不需要前端再去 TIM 查询悄悄话申请正文。

请求示例：

```http
GET /api/miniapp/message/whispers/WSP-8F21F0C30B7C4E88A001 HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "whisperNo": "WSP-8F21F0C30B7C4E88A001",
    "direction": "received",
    "status": "pending",
    "displayStatus": "等待你回应",
    "peerUser": {
      "userId": 140,
      "nickname": "书妍",
      "avatarUrl": "https://cdn.example.com/avatar/140.webp",
      "profileAvailable": true
    },
    "content": "看到你也喜欢旅行，想和你认识一下。",
    "contentAvailable": true,
    "requestMessageNo": "MSG-0D7BE441A42F4BAAA001",
    "createdTime": "2026-08-15 11:42:00",
    "expireTime": "2026-08-22 11:42:00",
    "remainingSeconds": 604800,
    "actions": {
      "canReply": true,
      "canDelete": true,
      "canReportWhisperContent": true,
      "canReportPeerUser": true,
      "canReverseApply": false,
      "canEnterConversation": false,
      "canOpenProfile": true
    }
  }
}
```

`processedTime` 和 `conversationNo` 只在对应状态有值。例如已回复记录会返回：

```json
{
  "status": "replied",
  "processedTime": "2026-08-15 12:10:00",
  "conversationNo": "CV-2087485877996027904"
}
```

### 5.3 POST `/miniapp/message/whispers/read-batch`

用途：只确认本批已成功渲染的“申请我的”未处理卡片为已读，不改变业务状态。

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `whisperNos` | Array<String> | 是 | 成功渲染的悄悄话编号，1-50 条 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `acceptedNos` | Array<String> | 服务端确认属于当前用户且可置已读的编号 |
| `updatedCount` | Integer | 本次从未读变为已读的数量 |
| `platformUnreadSummary.privateUnreadCount` | Long | 更新后的普通私信未读数 |
| `platformUnreadSummary.whisperUnreadCount` | Long | 更新后的悄悄话未读数 |
| `platformUnreadSummary.assistantUnreadCount` | Long | 更新后的官方助手未读数 |
| `platformUnreadSummary.systemUnreadCount` | Long | 更新后的系统消息未读数 |
| `platformUnreadSummary.messageUnreadCount` | Long | 更新后的四类消息总未读数 |
| `platformUnreadSummary.snapshotTime` | String | 本次未读统计快照时间 |

前端应在卡片真正渲染成功后调用，不能在 GET 成功但页面未展示时提前清除未读。

请求示例：

```http
POST /api/miniapp/message/whispers/read-batch HTTP/1.1
X-Auth-Token: {token}
Content-Type: application/json

{
  "whisperNos": [
    "WSP-8F21F0C30B7C4E88A001",
    "WSP-8F21F0C30B7C4E88A002"
  ]
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "acceptedNos": [
      "WSP-8F21F0C30B7C4E88A001",
      "WSP-8F21F0C30B7C4E88A002"
    ],
    "updatedCount": 2,
    "platformUnreadSummary": {
      "privateUnreadCount": 4,
      "whisperUnreadCount": 1,
      "assistantUnreadCount": 3,
      "systemUnreadCount": 4,
      "messageUnreadCount": 12,
      "snapshotTime": "2026-08-15 12:06:00"
    }
  }
}
```

### 5.4 DELETE `/miniapp/message/whispers/{whisperNo}`

用途：接收方单条逻辑隐藏。发送方调用返回 403。

路径参数：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `whisperNo` | String | 是 | 要从“申请我的”当前用户视角隐藏的悄悄话编号 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `whisperNo` | String | 被隐藏的悄悄话编号 |
| `bucket` | String | 删除前所属 `pending/processed` 分组 |
| `hiddenCount` | Integer | 成功隐藏数量，正常为 1 |
| `hiddenTime` | String | 逻辑隐藏时间 |

请求示例：

```http
DELETE /api/miniapp/message/whispers/WSP-8F21F0C30B7C4E88A001 HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "whisperNo": "WSP-8F21F0C30B7C4E88A001",
    "bucket": "pending",
    "hiddenCount": 1,
    "hiddenTime": "2026-08-15 12:07:00"
  }
}
```

### 5.5 POST `/miniapp/message/whispers/received/hide-all`

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `bucket` | String | 是 | 只支持 `pending/processed`，表示清空哪个接收方分组 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `whisperNo` | null | 批量操作没有单条编号 |
| `bucket` | String | 被清空分组 |
| `hiddenCount` | Integer | 实际逻辑隐藏数量 |
| `hiddenTime` | String | 批量隐藏时间 |

请求示例：

```http
POST /api/miniapp/message/whispers/received/hide-all HTTP/1.1
X-Auth-Token: {token}
Content-Type: application/json

{
  "bucket": "processed"
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "bucket": "processed",
    "hiddenCount": 6,
    "hiddenTime": "2026-08-15 12:08:00"
  }
}
```

批量响应不会序列化值为 null 的 `whisperNo`，前端不得依赖该字段存在。

### 5.6 POST `/miniapp/message/whispers/precheck`

用途：发送或反向申请前检查资格、费用、免费权益、有效天数和冷却天数。预检不扣费、不占次数、不创建申请。

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `targetUserNo` | String | 是 | 目标用户稳定编号，格式 `USR-` + 12 位数字 |
| `sourceScene` | String | 是 | 来源枚举见 1.3 |
| `sourceBizNo` | String | 条件必填 | 社区动态、评论和反向申请必传 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `canSend` | Boolean | 当前是否可以继续确认发送 |
| `reasonCode` | String/null | 不可发送原因编码 |
| `reasonText` | String/null | 不可发送中文原因 |
| `contentMaxLength` | Integer | 正文最大长度，当前 60 |
| `payType` | String | `vip_free/coin` |
| `coinAmount` | Integer | 本次需要千寻币数量；免费为 0 |
| `free` | Boolean | 是否使用会员免费权益 |
| `coinBalance` | Integer | 当前千寻币余额 |
| `freeWhisperRemain` | Integer | 当日剩余免费次数 |
| `quoteToken` | String/null | 可发送时返回的不透明报价令牌 |
| `quoteExpireTime` | String/null | 报价过期时间，当前 10 分钟 |
| `whisperExpireDays` | Integer | 本次申请有效天数 |
| `cooldownDays` | Integer | 到期后原发送方再次申请的冷却天数 |
| `confirmText` | String | 确认弹层文案 |
| `targetUserNo` | String | 目标用户编号 |
| `targetNickname` | String | 目标用户昵称 |

有效天数和冷却天数不是代码写死值。服务端读取当前已发布的 `app_message_rule_version`，管理后台通过 `GET /admin/message/config` 查看，通过 `POST /admin/message/config/versions` 发布新版本；每次发送时把配置快照写入悄悄话记录。

请求示例：

```http
POST /api/miniapp/message/whispers/precheck HTTP/1.1
X-Auth-Token: {token}
Content-Type: application/json

{
  "targetUserNo": "USR-000000000140",
  "sourceScene": "profile"
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "canSend": true,
    "contentMaxLength": 60,
    "payType": "coin",
    "coinAmount": 100,
    "free": false,
    "coinBalance": 520,
    "freeWhisperRemain": 0,
    "quoteToken": "wq_7sY3Jp9sQm2xK4nL8vR6",
    "quoteExpireTime": "2026-08-15 12:20:00",
    "whisperExpireDays": 7,
    "cooldownDays": 7,
    "confirmText": "将消耗100千寻币发送悄悄话",
    "targetUserNo": "USR-000000000140",
    "targetNickname": "书妍"
  }
}
```

不可发送时 `canSend=false`，同时返回 `reasonCode/reasonText`，并可能省略 `quoteToken/quoteExpireTime`：

```json
{
  "canSend": false,
  "reasonCode": "existing_pending_whisper",
  "reasonText": "你已经发送过申请，请等待对方回复"
}
```

### 5.7 POST `/miniapp/message/whispers`

Header：

| 字段 | 必填 | 中文说明 |
| --- | --- | --- |
| `Idempotency-Key` | 是 | 8-64 字符；同一次点击和网络重试必须复用 |

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `targetUserNo` | String | 是 | 必须与预检对象一致 |
| `quoteToken` | String | 是 | 预检返回的未过期报价令牌 |
| `sourceScene` | String | 是 | 必须与预检一致 |
| `sourceBizNo` | String | 条件必填 | 必须与预检一致 |
| `content` | String | 是 | 悄悄话正文，1-60 字 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `whisperNo` | String | 新申请编号 |
| `sendStatus` | String | 当前投递状态：`sending/sent/failed`；可靠投递尚未完成时统一返回 `sending` |
| `whisperStatus` | String/null | 当前业务状态；投递未确认时可为 null |
| `paymentStatus` | String | 支付状态：`paid`-已支付、`refunding`-退款处理中、`refunded`-已退款 |
| `targetUserNo` | String | 目标用户编号 |
| `payType` | String | `vip_free/coin` |
| `coinAmount` | Integer | 本次计价数量 |
| `coinBalance` | Integer | 操作后千寻币余额 |
| `charged` | Boolean | 本次调用是否真实扣除千寻币；幂等重放不会重复扣费 |
| `createdTime` | String | 创建时间 |
| `expireTime` | String | 申请到期时间 |

实现顺序：核验报价和关系 -> 锁定资产 -> 核销免费次数或扣币 -> 写 `app_message_record` 明文正文 -> 写 `app_message_whisper` -> 写投递 Outbox -> 后端投递 TIM。前端不得再自行向 TIM 发送同一条申请。

请求示例：

```http
POST /api/miniapp/message/whispers HTTP/1.1
X-Auth-Token: {token}
Idempotency-Key: whisper-send-20260815-0001
Content-Type: application/json

{
  "targetUserNo": "USR-000000000140",
  "quoteToken": "wq_7sY3Jp9sQm2xK4nL8vR6",
  "sourceScene": "profile",
  "content": "看到你也喜欢旅行，想和你认识一下。"
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "whisperNo": "WSP-8F21F0C30B7C4E88A001",
    "sendStatus": "sent",
    "whisperStatus": "pending",
    "paymentStatus": "paid",
    "targetUserNo": "USR-000000000140",
    "payType": "coin",
    "coinAmount": 100,
    "coinBalance": 420,
    "charged": true,
    "createdTime": "2026-08-15 12:11:00",
    "expireTime": "2026-08-22 12:11:00"
  }
}
```

### 5.8 POST `/miniapp/message/whispers/{whisperNo}/reply`

路径参数：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `whisperNo` | String | 是 | 当前用户收到且仍允许回复的悄悄话编号 |

Header 与请求字段：

| 位置 | 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- | --- |
| Header | `Idempotency-Key` | String | 是 | 必须与 body `requestId` 完全一致 |
| Body | `requestId` | String | 是 | 8-64 字符幂等编号 |
| Body | `content` | String | 是 | 回复内容，1-500 字 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `whisperNo` | String | 原申请编号 |
| `status` | String | 成功为 `replied` |
| `matchNo` | String | 创建或复用的匹配编号 |
| `conversationNo` | String | 创建或复用的唯一私信会话编号 |
| `replyMessageNo` | String | 回复对应的平台消息编号 |
| `repliedTime` | String | 回复、匹配和会话完成时间 |

回复内容由小程序提交给平台后端，后端写消息主表并通过 TIM 发送。只有回复投递、匹配和会话业务编排成功后接口才返回成功。前端收到成功后使用 `conversationNo` 打开这个人的聊天窗口，不是停留在悄悄话页。

请求示例：

```http
POST /api/miniapp/message/whispers/WSP-8F21F0C30B7C4E88A001/reply HTTP/1.1
X-Auth-Token: {token}
Idempotency-Key: whisper-reply-20260815-0001
Content-Type: application/json

{
  "requestId": "whisper-reply-20260815-0001",
  "content": "你好呀，很高兴认识你。"
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "whisperNo": "WSP-8F21F0C30B7C4E88A001",
    "status": "replied",
    "matchNo": "MAT-52E77BBF73A64E5AB1DDBA25CE63932B",
    "conversationNo": "CV-2087485877996027904",
    "replyMessageNo": "MSG-3C16E21186E34F08A002",
    "repliedTime": "2026-08-15 12:12:00"
  }
}
```

## 6. 官方助手、系统消息与 TIM 凭证

### 6.1 GET `/miniapp/message/assistant/messages`

用途：查询官方助手站内消息。正常用户首次查询前，后端按模板幂等补齐应存在的助手消息；受限账号返回空列表。

请求参数：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `cursor` | String | 否 | 上一页返回的不透明游标，首屏不传 |
| `size` | Integer | 否 | 默认 20，最大 50 |

顶层返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `list` | Array<Object> | 当前页助手消息，按 `id DESC` 排序 |
| `nextCursor` | String/null | 下一页游标；无下一页时省略 |
| `hasMore` | Boolean | 是否还有下一页 |

`list[]` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `assistantMessageNo` | String | 助手消息编号 |
| `topicCode` | String | 助手主题编码 |
| `title` | String | 标题 |
| `content` | String | 完整正文 |
| `cardType` | String | `text/action/tip`，决定助手卡片结构 |
| `actionType` | String | `none/h5/wechat_service/help` |
| `actionText` | String/null | 行动按钮文案；无行动时为 null，最多 10 个字符 |
| `actionValue` | String/null | 操作参数 |
| `readStatus` | String | `unread/read` |
| `createdTime` | String | 创建时间 |

`actionType/actionValue` 对接规则：

| `actionType` | `actionValue` 含义 | 前端处理 |
| --- | --- | --- |
| `none` | 不返回 | 不展示行动按钮 |
| `h5` | 已通过后端域名白名单校验的 HTTPS URL | 使用受控 WebView 打开，不自行改写 URL |
| `wechat_service` | 后台配置的客服目标参数 | 交给小程序客服适配器解析 |
| `help` | 后台配置的帮助主题或路由参数 | 交给客户端白名单帮助路由解析 |

除 `h5` 外，`actionValue` 是后台生成的受控不透明值。前端必须按 `actionType` 分发到已注册处理器，禁止把任意值直接当 URL 或页面路径执行。

请求示例：

```http
GET /api/miniapp/message/assistant/messages?size=20 HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "list": [
      {
        "assistantMessageNo": "AST-7E28CB77A1E34C9DA001",
        "topicCode": "chat_safety",
        "title": "聊天安全提醒",
        "content": "请勿向陌生人转账或透露验证码，遇到骚扰可在聊天页举报。",
        "cardType": "action",
        "actionType": "help",
        "actionText": "安全指南",
        "actionValue": "chat-safety",
        "readStatus": "unread",
        "createdTime": "2026-08-15 11:54:00"
      }
    ],
    "nextCursor": "eyJzY29wZSI6ImFzc2lzdGFudCIsImlkIjo1MDF9",
    "hasMore": true
  }
}
```

### 6.2 POST `/miniapp/message/assistant/messages/read-batch`

用途：页面成功渲染助手卡片后确认曝光已读，不改变助手消息业务内容。

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `messageNos` | Array<String> | 是 | 已成功渲染的 `assistantMessageNo`，1-50 条，重复编号会去重 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `acceptedNos` | Array<String> | 属于当前用户、仍可见且允许置已读的助手消息编号 |
| `updatedCount` | Integer | 本次从未读变为已读的数量；幂等重放可为 0 |
| `platformUnreadSummary.privateUnreadCount` | Long | 更新后的普通私信未读数 |
| `platformUnreadSummary.whisperUnreadCount` | Long | 更新后的悄悄话未读数 |
| `platformUnreadSummary.assistantUnreadCount` | Long | 更新后的助手未读数 |
| `platformUnreadSummary.systemUnreadCount` | Long | 更新后的系统消息未读数 |
| `platformUnreadSummary.messageUnreadCount` | Long | 更新后的四类总未读数 |
| `platformUnreadSummary.snapshotTime` | String | 本次统计时间 |

请求示例：

```http
POST /api/miniapp/message/assistant/messages/read-batch HTTP/1.1
X-Auth-Token: {token}
Content-Type: application/json

{
  "messageNos": [
    "AST-7E28CB77A1E34C9DA001",
    "AST-7E28CB77A1E34C9DA002"
  ]
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "acceptedNos": [
      "AST-7E28CB77A1E34C9DA001",
      "AST-7E28CB77A1E34C9DA002"
    ],
    "updatedCount": 2,
    "platformUnreadSummary": {
      "privateUnreadCount": 4,
      "whisperUnreadCount": 3,
      "assistantUnreadCount": 1,
      "systemUnreadCount": 4,
      "messageUnreadCount": 12,
      "snapshotTime": "2026-08-15 12:15:00"
    }
  }
}
```

### 6.3 GET `/miniapp/message/system-messages`

用途：查询平台系统通知。正常账号查询前幂等补齐全局公告；受限账号只返回允许在安全场景展示的系统消息。

请求参数：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `cursor` | String | 否 | 上一页返回的不透明游标，首屏不传 |
| `size` | Integer | 否 | 默认 20，最大 50 |

顶层返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `list` | Array<Object> | 当前页系统消息，按 `id DESC` 排序 |
| `nextCursor` | String/null | 下一页游标；无下一页时省略 |
| `hasMore` | Boolean | 是否还有下一页 |
| `readAck.noticeNos` | Array<String> | 本页已返回、前端渲染成功后可提交已读的系统消息编号 |

`list[]` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `noticeNo` | String | 系统消息编号 |
| `notificationType` | String | `governance/asset/invite/community/platform` |
| `bizType` | String | 具体业务类型编码 |
| `title` | String | 标题 |
| `content` | String | 完整正文 |
| `contentFormat` | String | `plain_text` 或 `rich_text`；富文本已由服务端按白名单清洗 |
| `readStatus` | String | `unread/read` |
| `jumpType` | String | `none/miniapp/h5/service/chat/profile/community/auth_center/asset/invite_center/appeal` |
| `actionText` | String/null | 跳转按钮文案；无跳转时为 null，最多 10 个字符 |
| `jumpValue` | String/null | 白名单跳转参数 |
| `createdTime` | String | 创建时间 |

`readAck.noticeNos` 是本页可确认已读的系统消息编号列表。它不是自动已读结果，前端成功渲染后把该数组提交 6.4。

`jumpType/jumpValue` 对接规则：

| `jumpType` | `jumpValue` 含义 | 前端处理 |
| --- | --- | --- |
| `none` | 不返回 | 不展示行动按钮 |
| `h5` | 后端白名单校验后的 HTTPS URL | 使用受控 WebView 打开 |
| `miniapp` | 小程序内部白名单路由参数 | 交给统一路由器解析 |
| `chat` | 私信会话业务编号 | 进入会话前仍先调用会话详情校验 |
| `profile` | 用户稳定业务编号 | 进入主页前重新校验可访问性 |
| `community` | 社区内容业务编号 | 交给社区白名单路由解析 |
| `service/auth_center/asset/invite_center/appeal` | 对应业务模块的受控目标参数 | 交给对应模块处理器解析 |

`jumpValue` 是后台模板渲染快照。前端不得拼接任意页面路径，也不得绕过对应业务接口的权限校验。

请求示例：

```http
GET /api/miniapp/message/system-messages?size=20 HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "list": [
      {
        "noticeNo": "NTF-72B0F4AC39834A36A001",
        "notificationType": "governance",
        "bizType": "profile_review",
        "title": "资料审核结果",
        "content": "你的头像、实名认证和学历认证均已通过。",
        "contentFormat": "plain_text",
        "readStatus": "unread",
        "jumpType": "auth_center",
        "actionText": "查看认证",
        "jumpValue": "verification-home",
        "createdTime": "2026-08-15 11:08:36"
      }
    ],
    "nextCursor": "eyJzY29wZSI6InN5c3RlbSIsImlkIjo2MDF9",
    "hasMore": true,
    "readAck": {
      "noticeNos": ["NTF-72B0F4AC39834A36A001"]
    }
  }
}
```

### 6.4 POST `/miniapp/message/system-messages/read-batch`

用途：页面成功渲染系统卡片后确认曝光已读。GET 返回不等于已读，必须在渲染成功后调用。

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `noticeNos` | Array<String> | 是 | 已成功渲染的系统消息编号，1-50 条，通常直接使用本页 `readAck.noticeNos` |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `acceptedNos` | Array<String> | 属于当前用户、仍可见且允许置已读的系统消息编号 |
| `updatedCount` | Integer | 本次从未读变为已读的数量；幂等重放可为 0 |
| `platformUnreadSummary.privateUnreadCount` | Long | 更新后的普通私信未读数 |
| `platformUnreadSummary.whisperUnreadCount` | Long | 更新后的悄悄话未读数 |
| `platformUnreadSummary.assistantUnreadCount` | Long | 更新后的助手未读数 |
| `platformUnreadSummary.systemUnreadCount` | Long | 更新后的系统消息未读数 |
| `platformUnreadSummary.messageUnreadCount` | Long | 更新后的四类总未读数 |
| `platformUnreadSummary.snapshotTime` | String | 本次统计时间 |

请求示例：

```http
POST /api/miniapp/message/system-messages/read-batch HTTP/1.1
X-Auth-Token: {token}
Content-Type: application/json

{
  "noticeNos": [
    "NTF-72B0F4AC39834A36A001",
    "NTF-72B0F4AC39834A36A002"
  ]
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "acceptedNos": [
      "NTF-72B0F4AC39834A36A001",
      "NTF-72B0F4AC39834A36A002"
    ],
    "updatedCount": 2,
    "platformUnreadSummary": {
      "privateUnreadCount": 4,
      "whisperUnreadCount": 3,
      "assistantUnreadCount": 3,
      "systemUnreadCount": 2,
      "messageUnreadCount": 12,
      "snapshotTime": "2026-08-15 12:16:00"
    }
  }
}
```

### 6.5 GET `/miniapp/im/credentials`

无业务入参。返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `sdkAppId` | Long | 腾讯云 TIM 应用 ID |
| `imUserId` | String | 当前用户 TIM UserID |
| `userSig` | String | 短期登录签名，禁止写日志和持久化 |
| `expireAt` | String | 凭证过期时间 |
| `protocolVersion` | Integer | 自定义消息协议版本 |

请求示例：

```http
GET /api/miniapp/im/credentials HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "sdkAppId": 1600151690,
    "imUserId": "tu_000000000123",
    "userSig": "{short-lived-user-sig}",
    "expireAt": "2026-08-16 12:17:00",
    "protocolVersion": 1
  }
}
```

`userSig` 仅用于当前登录用户初始化 TIM SDK。不得上传到业务日志、埋点、错误平台或持久化存储；过期后重新请求本接口。

### 6.6 私信对接顺序与本地 Outbox

```text
进入聊天页
  -> GET 会话详情，读取 accessMode/canSend/timConversationId
  -> canEnterConversation=true：获取 TIM 凭证
  -> 登录 TIM，拉取 timConversationId 的漫游历史
  -> 读取本机当前用户+conversationNo 的 Outbox 并合并 sending/failed 气泡

发送文本（仅 canSend=true）
  -> 生成当前账号+conversationNo 内唯一的 localOutboxId
  -> 先写本机 Outbox，状态 sending；SDK 有本地消息 ID 时记录 timLocalMessageId
  -> 调 TIM SDK 发送文本
  -> SDK 成功：按当前 Promise/回调关联的 localOutboxId 移除本地项，以 TIM 返回消息为准
  -> SDK 失败：本地项变 failed，展示重试入口
  -> 用户重试：复用原 localOutboxId 和正文，避免生成两个本地气泡

阅读消息
  -> 调 TIM SDK 会话已读
  -> TIM 回调同步平台未读投影
  -> 需要立即对账或回调异常时，再调平台会话 /read 接口补偿
```

平台接口不接收 `localOutboxId/timLocalMessageId` 或本地 Outbox 正文，也不返回 `sending/failed` 本地气泡。TIM 服务端没有收到的失败消息，平台无法可靠感知；因此失败气泡只在原设备本地存在，清理缓存或换设备后可能消失，这是本地未发送草稿的正常边界。TIM 已成功接收的消息由 TIM 漫游历史返回，并通过发送后回调归档到 `app_message_record`，不依赖小程序缓存。平台归档不是 C 端历史备份接口；TIM 漫游过期后，当前小程序不会自动从平台归档补回聊天记录。

## 7. 举报接口

### 7.1 GET `/miniapp/community/config`

用途：举报页打开前取得举报入口开关和原因字典。接口返回完整社区公共配置，消息举报主要消费 `reportEntryEnabled/reportReasons`。

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `interactionGateMode` | String | 社区互动准入模式编码 |
| `postMaxImages` | Integer | 动态最多图片数 |
| `postMaxTextLength` | Integer | 动态正文最大长度 |
| `postMaxMentions` | Integer | 单条动态最多提及人数 |
| `sincerePostMinTextLength` | Integer | 真诚帖最少正文长度 |
| `contactInfoAllowed` | Boolean | 社区正文是否允许公开联系方式 |
| `reportEntryEnabled` | Boolean | 是否开放举报入口；false 时隐藏提交入口 |
| `homeTabs` | Array<Object> | 社区首页入口配置 |
| `topics` | Array<Object> | 当前启用的话题字典 |
| `reportReasons` | Array<Object> | 当前启用的举报原因，已按后台排序 |

`homeTabs[]` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `entryKey` | String | 入口稳定业务键 |
| `entryName` | String | 入口展示名称 |
| `icon` | String/null | 入口图标标识或资源地址 |
| `jumpType` | String | 跳转类型编码 |
| `jumpTarget` | String | 跳转目标参数 |
| `badgeText` | String/null | 角标文案 |
| `badgeType` | String/null | 角标样式类型 |
| `loginRequired` | Integer | `0` 不要求登录、`1` 要求登录 |
| `sort` | Integer | 展示顺序 |

`topics[]` 与 `reportReasons[]` 使用同一字典结构：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `code` | String | 业务提交和存储使用的字典编码；举报时作为 `reasonCode` |
| `label` | String | 页面展示中文名称 |
| `sort` | Integer | 展示顺序 |
| `categoryCode` | String/null | 所属分类编码；普通举报原因通常省略 |
| `categoryLabel` | String/null | 所属分类中文；普通举报原因通常省略 |

前端不得写死举报原因编码。页面展示 `label`，提交 7.3 时传对应 `code`。

请求示例：

```http
GET /api/miniapp/community/config HTTP/1.1
X-Auth-Token: {token}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "interactionGateMode": "core_access",
    "postMaxImages": 9,
    "postMaxTextLength": 2000,
    "postMaxMentions": 10,
    "sincerePostMinTextLength": 100,
    "contactInfoAllowed": false,
    "reportEntryEnabled": true,
    "homeTabs": [
      {
        "entryKey": "recommend",
        "entryName": "推荐",
        "icon": "community-recommend",
        "jumpType": "miniapp",
        "jumpTarget": "community-recommend",
        "badgeText": "新",
        "badgeType": "new",
        "loginRequired": 1,
        "sort": 10
      }
    ],
    "topics": [
      {
        "code": "campus_life",
        "label": "校园生活",
        "sort": 10
      }
    ],
    "reportReasons": [
      {
        "code": "harassment",
        "label": "聊天内容不适/骚扰",
        "sort": 10
      }
    ]
  }
}
```

### 7.2 POST `/miniapp/file/upload-ticket/report-evidence`

用途：举报页面上传凭证图片前获取 OSS 直传凭证。支持 `jpg/jpeg/png`，单张最大 5 MB，单个举报最多 3 张。

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `fileName` | String | 是 | 原文件名，后缀用于格式校验 |
| `fileSizeBytes` | Long | 是 | 文件字节数 |

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `uploadUrl` | String | OSS 表单上传地址 |
| `key` | String | OSS 对象 Key |
| `formData` | Object | 直传表单字段，前端原样提交 |
| `expiresAt` | Long | 凭证过期时间，Unix 秒时间戳；前端比较当前时间时必须使用秒单位 |
| `fileUrl` | String | 上传成功后提交举报使用的公网 URL |
| `protectedFile` | Boolean | 是否为受保护文件 |

请求示例：

```http
POST /api/miniapp/file/upload-ticket/report-evidence HTTP/1.1
X-Auth-Token: {token}
Content-Type: application/json

{
  "fileName": "chat-evidence-01.png",
  "fileSizeBytes": 245760
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "uploadUrl": "https://example-bucket.oss-cn-shanghai.aliyuncs.com",
    "key": "miniapp/123/reportEvidence/2026/08/evidence-01.png",
    "formData": {
      "key": "miniapp/123/reportEvidence/2026/08/evidence-01.png",
      "policy": "{short-lived-policy}",
      "x-oss-signature-version": "OSS4-HMAC-SHA256",
      "x-oss-credential": "{temporary-credential}",
      "x-oss-date": "20260815T041800Z",
      "x-oss-signature": "{temporary-signature}",
      "success_action_status": "200"
    },
    "expiresAt": 1786767780,
    "fileUrl": "https://cdn.example.com/miniapp/123/reportEvidence/2026/08/evidence-01.png",
    "protectedFile": true
  }
}
```

前端使用 `multipart/form-data` 将文件和 `formData` 全部字段原样提交到 `uploadUrl`。上传成功后只把 `fileUrl` 放入举报请求，不能提交本地临时路径或 `key` 代替公网 URL。

### 7.3 POST `/miniapp/community/reports`

聊天举报只提交服务端可反查的业务编号和详情接口返回的最小定位字段；不提交聊天正文或被举报用户 ID。TIM 定位字段只做交叉校验，证据正文仍由服务端从平台归档表固化。新小程序统一使用 `targetId` 传业务编号；后端内部兼容字段 `targetBizNo` 不属于本次移动端契约，前端不要提交。

请求字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `targetType` | String | 是 | 私信和悄悄话内容举报统一固定为 `chat` |
| `targetId` | String | 是 | 私信填 `conversationNo`；悄悄话填 `whisperNo`；与下方对应业务编号一致 |
| `clientReportId` | String | 是 | 8-64 字符幂等编号，重试复用 |
| `sourceType` | String | 是 | 私信填 `private_chat`；悄悄话填 `whisper` |
| `conversationNo` | String | 私信举报是 | 私信会话业务编号 |
| `messageNo` | String | 否 | 用户明确选中某条对方私信且已知平台消息编号时提交；会话顶部举报不传 |
| `whisperNo` | String | 悄悄话举报是 | 被举报的悄悄话编号 |
| `timConversationId` | String | 否 | 详情返回的 TIM 会话编号，用于服务端交叉校验 |
| `timMessageId` | String | 否 | TIM SDK 返回的消息 ID；不知道平台 `messageNo` 时可单独用于定位 |
| `timMsgKey` | String | 否 | TIM 服务端消息唯一键，可单独定位或与 `timMessageId/messageNo` 交叉校验 |
| `reasonCode` | String | 是 | 举报原因字典编码 |
| `extraText` | String | 否 | 补充说明 |
| `evidenceImageUrls` | Array<String> | 否 | 7.2 上传成功后的 `fileUrl`，最多 3 张 |

聊天举报必传组合：

| 场景 | 必传字段 | 不传字段 |
| --- | --- | --- |
| 悄悄话正文 | `targetType=chat`、`clientReportId`、`targetId=whisperNo`、`sourceType=whisper`、`whisperNo`、`reasonCode` | 正文、被举报人 ID、`targetBizNo` |
| 单条私信 | 基础字段加 `messageNo`，或加 `timMessageId/timMsgKey`；至少有一种消息定位字段 | 正文、被举报人 ID、`targetBizNo` |
| 整段会话 | `targetType=chat`、`clientReportId`、`targetId=conversationNo`、`sourceType=private_chat`、`conversationNo`、`reasonCode` | 正文、被举报人 ID、`targetBizNo` |

请求示例（举报悄悄话正文）：

```json
{
  "targetType":"chat",
  "clientReportId":"report-20260813-0001",
  "targetId":"WSP-8F21F0C30B7C4E88A001",
  "sourceType":"whisper",
  "whisperNo":"WSP-8F21F0C30B7C4E88A001",
  "reasonCode":"harassment",
  "extraText":"持续发送不适当内容",
  "evidenceImageUrls":["https://cdn.example.com/miniapp/108/reportEvidence/a.png"]
}
```

请求示例（举报整段私信会话）：

```json
{
  "targetType":"chat",
  "clientReportId":"report-20260813-0002",
  "targetId":"CV-20260813-0001",
  "sourceType":"private_chat",
  "conversationNo":"CV-20260813-0001",
  "timConversationId":"C2C_tu_peer_2",
  "reasonCode":"harassment",
  "extraText":"对方在聊天中持续骚扰",
  "evidenceImageUrls":[]
}
```

返回字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `reportId` | Long | 举报数据库 ID |
| `reportNo` | String | 举报业务编号 |
| `status` | String | 工单状态编码 |
| `statusName` | String | 工单状态中文 |
| `message` | String | 提交结果文案 |
| `snapshotStatus` | String/null | `complete/partial/not_required` 证据快照状态 |
| `createdTime` | String | 举报创建时间 |

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "reportId": 2089000000000000012,
    "reportNo": "RPT-8B975D423FE34E95A001",
    "status": "pending",
    "statusName": "待处理",
    "message": "举报已提交，我们会尽快处理",
    "snapshotStatus": "complete",
    "createdTime": "2026-08-15 12:20:00"
  }
}
```

前端流程：调用 7.1 取得原因字典 -> 最多选择 3 张图片 -> 每张调用 7.2 -> 使用返回凭证直传 OSS -> 收集 `fileUrl` -> 连同举报原因调用 7.3。举报本身不走 TIM，也不会给对方发送任何消息。

## 8. 主要错误码

| code | 场景 | 前端处理 |
| --- | --- | --- |
| `4001` | 参数、方向、分组或游标错误 | 修正参数，不自动重试 |
| `401` | 登录失效 | 重新登录并清理 TIM 登录态 |
| `403` | 非参与方或发送方尝试删除 | 关闭操作并刷新列表 |
| `404` | 记录不存在或接收方已删除 | 移除当前卡片并刷新 |
| `30001` | 准入或账号受限 | 进入认证或受限提示 |
| `30002` | 已匹配、拉黑或关系不可互动 | 刷新关系，已匹配则进入私信 |
| `30003` | 女性保护期内男方先发普通私信 | 保留输入内容，等待女方先发；TIM 回调码为 `120003` |
| `30004` | 普通私信会话已失效 | 切换到安全只读，不再发送；TIM 回调码为 `120004` |
| `30005` | 已有待处理悄悄话 | 定位现有申请 |
| `30006` | 冷却期未结束 | 展示稍后再试 |
| `30007` | 千寻币不足 | 展示充值或会员入口 |
| `30008` | TIM 投递失败 | 保留原幂等键，由可靠投递和补偿处理 |
| `30011` | 申请已过期 | 展示“申请已结束” |
| `30015` | 消息总开关关闭 | 保留草稿，稍后重试 |
| `30020` | 幂等键冲突 | 停止重试并刷新事实 |
| `30021` | 报价过期或变化 | 重新预检并再次确认 |
| `30022` | 举报目标不可用 | 刷新页面并提示不可举报 |
| `30023` | 正常会话 TIM 账号或凭证不可用 | 聊天页稍后重试；不影响首页和列表；安全只读详情降级为不可进入历史 |
| `505008` | 已有待处理举报 | 提示已提交，等待处理 |
| `505019` | 举报图片凭证无效 | 重新上传图片后提交 |

## 9. 对接边界

- 首页和悄悄话列表不返回 TIM 会话或原始消息定位字段。
- 悄悄话详情只返回平台消息编号，不返回 TIM 原始消息编号。
- 普通私信首页和列表不调用 TIM；只有进入具体会话才获取 TIM 凭证与历史。
- 平台归档表不向 C 端提供完整私信历史补拉；TIM 漫游保留期必须在上线前按产品可见期配置。
- 平台后端不提供普通私信发送和完整历史接口；小程序本地 Outbox 也不得上传平台冒充已发送消息。
- 活跃会话缺少当前接收方成员映射时，TIM 后回调返回失败并等待重试，不写入不完整消息事实。
- TIM 发送后和已读回调按事件业务时间绑定会话生命周期；旧生命周期的迟到回调不得更新重新匹配后的新会话。
- 助手和系统消息不走 TIM，正文、卡片类型、正文格式和行动文案都使用消息创建时快照。
- 预检和创建统一使用 `sourceScene/sourceBizNo`，不接历史兼容别名。
- `sent` 方向不提供已处理分组。
- 小程序不得直接使用 TIM SDK 发送悄悄话。
- 删除不得物理删除，也不得篡改为过期或失效状态。

## 10. 联调验收清单

- [ ] 首页不初始化 TIM 也能返回全部摘要和普通私信首屏。
- [ ] 对方没有 TIM 账号时首页正常；正常聊天详情提示不可用，安全只读详情返回 `canEnterConversation=false` 而不是整体失败。
- [ ] 首页动态行只展示有效普通私信，不混入悄悄话申请。
- [ ] 消息总未读严格等于普通私信、悄悄话、助手、系统四项之和。
- [ ] “申请我的”未处理和已处理使用两套独立游标下拉。
- [ ] “我申请的”只查询未处理，不展示删除入口。
- [ ] 悄悄话详情直接返回留存期内完整正文。
- [ ] 只有接收方可单条或分组逻辑隐藏，后台事实仍保留。
- [ ] 预检、创建的 `sourceScene/sourceBizNo` 完全一致。
- [ ] 有效天数和冷却天数来自当前已发布后台配置并写入快照。
- [ ] 回复内容经后端写库和 TIM 投递，成功后返回 `conversationNo` 并进入聊天页。
- [ ] 普通私信 TIM 发送失败时仅生成当前账号、当前会话的本地 Outbox 气泡；重试复用 `localOutboxId`，发送成功后按本次 SDK 回调去重移除。
- [ ] TIM 会话已读回调先推进单调已读水位再更新消息；平台 `/read` 重复补偿结果幂等，迟到归档不重新产生未读。
- [ ] 关系失效与消息后回调并发时，迟到消息只归档并隔离，不更新会话列表投影、不计未读；重新匹配后也不得污染新生命周期。
- [ ] 失效会话进入 `safety_readonly`，不能发送或打开主页，不泄露最新昵称头像；有 TIM 映射时可看历史，仍可对已有对方正文举报。
- [ ] 官方助手按 `cardType` 渲染，系统消息按 `contentFormat` 渲染，行动按钮使用 `actionText`。
- [ ] 申请我的和我申请的均可按详情 `actions` 举报正文或对方用户。
- [ ] 举报图片先获取上传凭证，最多 3 张，再提交 URL。
- [ ] 举报原因来自 `/miniapp/community/config.reportReasons`，页面展示 `label`、提交 `code`，不写死原因枚举。
- [ ] 文档第 9 节禁止项未出现在新小程序请求和响应模型中。

### 10.1 腾讯云 TIM 服务端部署配置

以下变量只配置在开发机私有 `backend/.env.local` 或服务器私有 `prod.env`，不得提交真实值：

| 环境变量 | 必填条件 | 中文说明 |
| --- | --- | --- |
| `TENCENT_IM_ENABLED` | 是 | 是否启用真实腾讯云 TIM；生产联调时为 `true` |
| `TENCENT_IM_SDK_APP_ID` | 启用时是 | 消息服务 Chat 应用的 SDKAppID，不是腾讯云主账号 ID |
| `TENCENT_IM_SECRET_KEY` | 启用时是 | 生成管理员/用户 UserSig 的应用 SecretKey |
| `TENCENT_IM_ADMINISTRATOR` | 启用时是 | TIM 控制台配置的 App 管理员账号，默认 `administrator` |
| `TENCENT_IM_REST_BASE_URL` | 启用时是 | TIM REST API 根地址，中国数据中心使用 `https://console.tim.qq.com` |
| `TENCENT_IM_CALLBACK_PATH_TOKEN` | 启用时是 | 回调 URL 路径中的随机不可猜令牌，仅作为第一层入口隔离 |
| `TENCENT_IM_CALLBACK_AUTH_TOKEN` | 启用时是 | 腾讯控制台“开启鉴权”填写的 Token；后端按 `sha256(Token + RequestTime)` 验签 |
| `TENCENT_IM_USER_SIG_EXPIRE_SECONDS` | 否 | 小程序短期 UserSig 有效秒数，默认 `86400` |
| `TENCENT_IM_PROTOCOL_VERSION` | 否 | 悄悄话自定义消息协议版本，默认 `1` |
| `TENCENT_IM_CONNECT_TIMEOUT_MILLIS` | 否 | TIM REST 建连超时，默认 `3000` 毫秒 |
| `TENCENT_IM_REQUEST_TIMEOUT_MILLIS` | 否 | TIM REST 整体请求超时，默认 `5000` 毫秒 |

腾讯控制台回调 URL 格式：

```text
https://admin.shikongxiehou.com/api/internal/tencent-im/callback/{TENCENT_IM_CALLBACK_PATH_TOKEN}
```

控制台只开启一期使用的三个单聊回调：

| 回调命令 | 作用 | 平台处理 |
| --- | --- | --- |
| `C2C.CallbackBeforeSendMsg` | 普通私信发送前鉴权 | 校验准入、匹配、拉黑、会话、总开关和女性保护；悄悄话仅允许后端 REST 投递 |
| `C2C.CallbackAfterSendMsg` | 消息发送结果归档 | 普通文本写 `app_message_record`；悄悄话确认 TIM 映射和 Outbox 送达，不复制正文到 Outbox |
| `C2C.CallbackAfterMsgReport` | 会话已读上报 | 单调推进会话成员读水位，并将对应接收消息更新为已读 |

发布流水线会执行 `scripts/test-prod-tencent-im-config.mjs`，并由
`deploy/scripts/deploy-prod-local.sh` 将以上变量从服务器 `prod.env` 写入容器 `runtime.env`。
当公网回调返回 `callback is not configured` 时，表示生产容器尚未取得启用开关、SDKAppID
或回调 Token；应重新发布后端并确认运行容器的变量名称存在，禁止在日志中打印变量值。

### 10.2 2026-08-13 真实联调记录

- 开发库真实用户 `U78（AACompleteUser01）` 与 `U79（AACompleteUser02）` 已完成账号导入和 UserSig 获取。
- U78 向 U79 发起悄悄话，U79 回复后生成真实匹配和私信会话；申请、回复两条消息均经 TIM REST 投递成功。
- 申请编号：`WSP-C16607A0532E475FB42609D2CBEA4380`。
- 匹配编号：`MAT-52E77BBF73A64E5AB1DDBA25CE63932B`。
- 会话编号：`CV-EE9B17E5742745279A77CD767453D63F`。
- 本地真实配置实例已验证正确签名、错误签名拒绝、重复发送后回调和重复已读回调；两条 Outbox 均已完成回调确认。
- 公网生产入口在本次发布前仍返回 `callback is not configured`；代码与部署脚本已修复，必须完成后端生产发布并在腾讯控制台再次执行“校验”，才能勾选公网回调验收。

后端自动化与真实联调结果见 `docs/测试文档/消息私信通知中心-testreport.md`。当前可标记真实 TIM
账号、UserSig、REST 投递和本地回调处理通过；公网生产回调、生产 OSS 和小程序 UI 联调完成前，
不标记为生产全量验收通过。

### 10.3 2026-08-14 消息存储口径

- 系统消息、官方助手、消息事件临时载荷和举报冻结证据不再依赖应用层 KMS。
- 系统消息与官方助手直接读取明文字段；消息首页不会因 KMS 配置缺失而失败。
- Inbox 仅保存有界临时业务 JSON，禁止写入聊天正文，成功、死信或到期后清空。
- 举报冻结证据保存受控明文；正文不出现在普通列表、导出或日志中，仅在有效案件权限、查看原因和审计约束下按条返回。
