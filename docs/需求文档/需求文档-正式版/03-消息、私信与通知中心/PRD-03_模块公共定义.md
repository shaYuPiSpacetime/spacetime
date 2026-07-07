# PRD-03 模块公共定义 - 消息、私信与通知中心

> 本文件登记 PRD-03 在移动端与管理后台共用的术语、枚举、状态机、规则、配置、通知、事件、错误码与接口草案。
> 页面规格引用本文 `M03-*` ID，禁止把 PRD-03 专属定义写入全局共享层。
> 核心准入引用 PRD-01；匹配成功与关系来源引用 PRD-02；千寻币、会员与扣费引用 PRD-04；举报处理承接 PRD-05/后台社区互动管理统一举报处理。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-07-02 | Codex | 按评审意见新增后台记录类型枚举与未读展示口径 |
| 版本01 | 2026-07-02 | Codex | 由原移动端/管理后台 PRD-03 与一期上线目标转写正式版，收口普通私信、悄悄话、女性保护、通知中心、邀请响应和后台承接边界 |

---

## 1. 已确认产品结论

| 编号 | 结论 | 文档落点 |
|------|------|----------|
| M03-01 | `消息` Tab 对已登录用户可见；未完成三重认证用户仅可查看官方消息、通知中心与认证引导，不展示用户私信会话 | `M03-RULE-message-tab-scope` |
| M03-02 | 普通私信必须在双方相互喜欢/匹配成功后才开放；不再沿用互相关注即可私信、任意人私信等旧口径 | `M03-RULE-private-chat-open`、`M02-SM-mutual-match` |
| M03-03 | 悄悄话是匹配成功前的破冰消息；接收方回复悄悄话后触发 PRD-02 生成 `whisper_reply` 匹配成功记录 | `M03-SM-whisper`、`M03-EVT-whisper-replied` |
| M03-04 | 女性保护机制首版保留：匹配成功后前 3 天，男方向女方发送普通私信前需等待女性先发送真实用户消息 | `M03-RULE-female-protection`、`M03-CFG-female-protection-days` |
| M03-05 | 一期不做用户自助通知设置页，也不做后台完整通知偏好中心；保留业务节点通知、站内通知与微信订阅消息模板申请前置项 | `M03-RULE-notification-setting-scope` |
| M03-06 | 聊天举报与悄悄话举报纳入一期，统一由后台举报处理承接，按来源区分上下文与处罚联动 | `M03-RULE-report-handoff`、`ADM-03-PAGE-report-chat-fields` |
| M03-07 | 首版消息类型只支持文本、悄悄话卡片、官方/系统提示；图片、语音、视频/通话、撤回、输入中状态均不纳入一期 | `M03-RULE-message-type-scope` |
| M03-08 | 通知中心首版承接匹配成功、收到悄悄话、三项认证结果、举报处理结果、违规警告、充值成功、千寻币变动、会员到期、活动通知与邀请响应 | `M03-RULE-notification-scope` |
| M03-09 | 悄悄话扣费统一引用 PRD-04：普通用户可用千寻币发送，时空邂逅会员每日默认 1 次免费悄悄话，用完后继续走千寻币 | `M04-RULE-whisper-pay`、`M03-CFG-vip-free-whisper-daily` |
| M03-10 | 管理后台不新增独立 IM 会话运营工作台；首版通过 ADM-01 App 用户管理卡片“模块补充”弹窗的消息互动 Tab、消息通知记录查询、文案模板、规则配置、举报处理和操作日志承接 | `ADM-03-RULE-admin-scope` |
| M03-11 | 通知开关关闭的旧口径被一期目标收敛：本期无用户侧通知开关；如业务节点未授权微信订阅消息，只影响外部提醒，不影响站内消息落库和通知中心可查 | `M03-RULE-notification-subscribe` |

### 1.1 本模块产出

| 产出 ID | 产出项 | 说明 | 主要承接页面/规则 |
|---------|--------|------|------------------|
| `M03-OUT-conversation` | 会话与消息记录 | 私信会话、官方助手会话、悄悄话消息、系统提示消息 | `APP-03-PAGE-message-list`、`APP-03-PAGE-private-chat`、`M03-SM-conversation` |
| `M03-OUT-whisper` | 悄悄话破冰链路 | 发送、待回复、回复、忽略、冷却期和匹配成功事件 | `APP-03-PAGE-whisper-message`、`M03-SM-whisper` |
| `M03-OUT-notification` | 站内通知中心 | 通知列表、通知详情、官方消息详情、已读/未读、跳转 | `APP-03-PAGE-notification-center`、`APP-03-PAGE-notification-detail` |
| `M03-OUT-official-assistant` | 官方助手 | 官方助手聊天页、官方消息详情和系统公告类触达 | `APP-03-PAGE-official-assistant`、`APP-03-PAGE-official-message-detail` |
| `M03-OUT-invite-response` | 邀请响应 | 邀请消息在消息 Tab 内的查看与响应入口；邀请关系归 PRD-07 | `APP-03-PAGE-invite-response` |
| `M03-OUT-admin-query` | 后台排查能力 | 模块补充弹窗消息互动 Tab、消息通知记录查询和举报上下文 | `ADM-03-PAGE-user-message-section`、`ADM-03-PAGE-message-record-query` |

---

## 2. 模块术语

| 术语 ID | 统一术语 | 禁用旧称/别名 | 定义 | 是否需提升全局 |
|---------|----------|----------------|------|----------------|
| `M03-TERM-conversation` | 会话 | 聊天房间、IM 房间 | 两名用户或用户与官方助手之间承载消息记录、未读数、发送权限和状态的业务对象 | 否 |
| `M03-TERM-private-message` | 普通私信 | 私聊、聊天消息 | 匹配成功后双方可发送的文本消息 | 否 |
| `M03-TERM-whisper` | 悄悄话 | 小纸条、留言 | 匹配成功前用于破冰的特殊消息，回复后触发匹配成功 | 否 |
| `M03-TERM-official-message` | 官方消息 | 系统消息入口 | 平台向用户发送的官方站内消息，用户不可在该入口回复 | 否 |
| `M03-TERM-official-assistant` | 官方助手 | 客服助手、系统助手 | 承接平台提示、规则说明、客服引导的官方聊天页；首版不等同人工客服 IM | 否 |
| `M03-TERM-notification` | 站内通知 | 通知、消息通知 | 业务事件生成的站内可追溯通知记录 | 否 |
| `M03-TERM-female-protection` | 女性保护机制 | 女生保护、保护期 | 匹配成功后限定时间内保护女方先发权的发送约束 | 否 |
| `M03-TERM-invite-response` | 邀请响应 | 邀请消息 | 被邀请人进入小程序后的邀请承接消息与响应入口；邀请归因和奖励归 PRD-07 | 否 |

### 2.1 引用的跨模块定义

| 引用 ID | 名称 | 使用场景 |
|---------|------|----------|
| `M01-RULE-core-access` | 核心准入门槛 | 普通私信、悄悄话发送和私信会话展示 |
| `M02-SM-mutual-match` | 匹配成功状态机 | 普通私信开放前置、匹配成功通知 |
| `M02-ENUM-match-source=whisper_reply` | 悄悄话回复匹配来源 | 悄悄话回复触发匹配成功 |
| `M04-RULE-whisper-pay` | 悄悄话扣费规则 | 发送悄悄话时免费次数、千寻币扣费和余额不足 |
| `M04-CFG-vip-free-whisper-daily` | 会员每日免费悄悄话次数 | 默认 1 次，后台配置来源 |
| `ADM-GLB-PAGE-copy-message-center` | 文案与消息中心 | 后台配置官方消息、通知模板和提示文案 |

---

## 3. 模块枚举

### 3.1 `M03-ENUM-conversation-type` 会话类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `private` | 私信会话 | 匹配成功后两名用户之间的普通私信 | 1 | 是 | 启用 |
| `whisper` | 悄悄话会话 | 悄悄话待回复或已回复链路承载会话 | 2 | 否 | 启用 |
| `official_assistant` | 官方助手 | 用户与官方助手的系统提示/客服引导页 | 3 | 否 | 启用 |
| `official_message` | 官方消息 | 官方消息详情与站内通知入口 | 4 | 否 | 启用 |

### 3.2 `M03-ENUM-conversation-status` 会话状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `active` | 可聊天 | 已满足普通私信开放条件，可发送文本消息 | 1 | 是 | 启用 |
| `pending_whisper` | 悄悄话待回复 | 已发送悄悄话，接收方尚未回复或忽略 | 2 | 否 | 启用 |
| `protected_waiting_female` | 保护期等待女方 | 命中女性保护机制，男性侧暂不可发送 | 3 | 否 | 启用 |
| `blocked` | 已拉黑 | 任一方拉黑另一方，历史保留但不可发送 | 4 | 否 | 启用 |
| `invalid` | 已失效 | 账号冻结、封禁、注销、认证失效等导致不可继续互动 | 5 | 否 | 启用 |

### 3.3 `M03-ENUM-message-type` 消息类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `text` | 文本消息 | 首版唯一普通用户可发送消息类型 | 1 | 是 | 启用 |
| `whisper` | 悄悄话卡片 | 发送方发出的悄悄话内容卡片 | 2 | 否 | 启用 |
| `whisper_reply` | 悄悄话回复 | 接收方对悄悄话的明确回复 | 3 | 否 | 启用 |
| `system_tip` | 系统提示 | 匹配成功、保护机制、会话失效等系统提示 | 4 | 否 | 启用 |
| `official` | 官方消息 | 平台公告、审核结果、违规通知等官方消息 | 5 | 否 | 启用 |

### 3.4 `M03-ENUM-send-status` 发送状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `sending` | 发送中 | 客户端已发起，服务端处理中 | 1 | 否 | 启用 |
| `sent` | 已发送 | 服务端已保存并投递 | 2 | 是 | 启用 |
| `read` | 已读 | 接收方进入会话或通知详情后标记已读 | 3 | 否 | 启用 |
| `failed` | 发送失败 | 校验、网络或服务端失败，可按场景重试 | 4 | 否 | 启用 |

### 3.5 `M03-ENUM-whisper-status` 悄悄话状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `pending` | 待回复 | 接收方尚未回复或忽略 | 1 | 是 | 启用 |
| `replied` | 已回复 | 接收方回复，触发匹配成功 | 2 | 否 | 启用 |
| `ignored` | 已忽略 | 接收方明确忽略，发送方进入冷却期 | 3 | 否 | 启用 |
| `expired` | 已失效 | 账号异常、会话失效或业务关闭导致不可处理 | 4 | 否 | 启用 |

### 3.6 `M03-ENUM-notification-type` 通知类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `interaction` | 互动通知 | 匹配成功、收到悄悄话、邀请响应 | 1 | 是 | 启用 |
| `system` | 系统通知 | 认证结果、举报处理、违规警告、版本更新 | 2 | 否 | 启用 |
| `asset` | 资产通知 | 充值成功、千寻币变动、会员到期 | 3 | 否 | 启用 |
| `activity` | 活动通知 | 活动上线、节日活动、运营通知 | 4 | 否 | 启用 |

### 3.7 `M03-ENUM-notification-biz-type` 通知业务类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `match_success` | 匹配成功 | PRD-02 生成匹配成功后通知双方 | 1 | 否 | 启用 |
| `whisper_received` | 收到悄悄话 | 接收方收到悄悄话 | 2 | 否 | 启用 |
| `auth_result` | 认证结果 | 实名、头像、学历认证结果 | 3 | 否 | 启用 |
| `report_result` | 举报处理结果 | 举报处理完成后通知举报人或被处理人 | 4 | 否 | 启用 |
| `violation_warning` | 违规警告 | 处罚、警告、禁言、封禁等结果 | 5 | 否 | 启用 |
| `coin_changed` | 千寻币变动 | 充值、消费、退款、奖励等资产变动 | 6 | 否 | 启用 |
| `vip_expire` | 会员到期 | 会员即将到期或已到期提醒 | 7 | 否 | 启用 |
| `activity_online` | 活动通知 | 运营活动上线或活动状态变化 | 8 | 否 | 启用 |
| `invite_response` | 邀请响应 | 邀请关系绑定、响应或奖励节点提醒 | 9 | 否 | 启用 |

### 3.8 `M03-ENUM-jump-type` 通知跳转类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `chat` | 会话页 | 跳转到私信或悄悄话会话 | 1 | 否 | 启用 |
| `notification_detail` | 通知详情 | 跳转到通知详情页 | 2 | 是 | 启用 |
| `profile` | 用户主页 | 跳转到婚恋用户主页 | 3 | 否 | 启用 |
| `auth_center` | 认证中心 | 跳转到我的认证页 | 4 | 否 | 启用 |
| `asset` | 资产明细 | 跳转到千寻币流水或订单记录 | 5 | 否 | 启用 |
| `invite_response` | 邀请响应 | 跳转到邀请响应页 | 6 | 否 | 启用 |
| `h5` | H5 活动页 | 跳转到已配置活动链接 | 7 | 否 | 启用 |

### 3.9 `M03-ENUM-read-status` 已读状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `unread` | 未读 | 用户尚未进入会话或通知详情 | 1 | 是 | 启用 |
| `read` | 已读 | 用户进入详情或点击全部已读 | 2 | 否 | 启用 |

### 3.10 `M03-ENUM-admin-record-type` 后台记录类型

> 本枚举仅用于后台 `ADM-03-PAGE-message-record-query` 的跨表查询筛选，不替代会话类型、消息类型或通知类型枚举。

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `private_message` | 私信记录 | 匹配成功后的普通私信消息记录 | 1 | 是 | 启用 |
| `whisper_message` | 悄悄话记录 | 悄悄话发送、回复、忽略等破冰记录 | 2 | 否 | 启用 |
| `official_message` | 官方消息记录 | 官方助手、官方消息详情中的平台消息记录 | 3 | 否 | 启用 |
| `notification` | 站内通知记录 | 通知中心、通知详情承接的站内通知记录 | 4 | 否 | 启用 |

---

## 4. 模块状态机

### 4.1 `M03-SM-conversation` 会话状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| 无 | 匹配成功事件 | `active` | 双方满足 `M01-RULE-core-access` 且 `M02-SM-mutual-match=matched` | 创建或打开私信会话，生成匹配成功系统提示 |
| 无 | 悄悄话发送成功 | `pending_whisper` | 发送方满足 `M03-RULE-whisper-send` | 创建悄悄话会话，生成悄悄话卡片 |
| `pending_whisper` | 接收方回复悄悄话 | `active` | 悄悄话状态为 `pending` | 触发 `M03-EVT-whisper-replied`，PRD-02 生成匹配成功 |
| `active` | 命中女性保护且男性尝试发送 | `protected_waiting_female` | 匹配 3 天内且女性未发真实用户消息 | 男性侧输入框置灰，记录拦截埋点 |
| `protected_waiting_female` | 女性发送真实用户消息或保护期结束 | `active` | 女性真实消息或当前时间超过保护期 | 男性侧恢复发送能力 |
| `active`/`pending_whisper` | 任一方拉黑 | `blocked` | 拉黑关系生效 | 保留历史消息，禁止继续发送 |
| 任意 | 冻结、封禁、注销、认证失效 | `invalid` | 任一方账号或核心准入异常 | 会话失效，前台展示原因，后台保留记录 |

### 4.2 `M03-SM-whisper` 悄悄话状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| 无 | 发送悄悄话成功 | `pending` | 发送资格与扣费/免费次数校验通过 | 写消息、扣减免费次数或千寻币，通知接收方 |
| `pending` | 接收方回复 | `replied` | 会话未失效 | 触发匹配成功事件，开放普通私信 |
| `pending` | 接收方忽略 | `ignored` | 会话未失效 | 发送方对同一对象进入 7 天冷却期 |
| `pending` | 任一方账号异常/拉黑/认证失效 | `expired` | 异常事件生效 | 会话不可处理，保留记录 |

### 4.3 `M03-SM-notification-read` 通知已读状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| 无 | 业务事件生成通知 | `unread` | 命中 `M03-RULE-notification-scope` | 计入站内未读和消息 Tab 红点 |
| `unread` | 用户进入通知详情 | `read` | 通知属于当前用户 | 当前通知未读数减 1 |
| `unread` | 用户点击全部已读 | `read` | 当前通知列表存在未读 | 批量更新未读数，消息 Tab 红点刷新 |
| `read` | 再次进入详情 | `read` | 已读通知 | 幂等返回，不重复计数 |

---

## 5. 模块业务规则

| 规则 ID | 规则描述 | 涉及端/页面 | 判定逻辑 | 备注 |
|---------|----------|-------------|----------|------|
| `M03-RULE-message-tab-scope` | 消息 Tab 可见与分层展示 | APP | 已登录用户可进入消息 Tab；未完成三重认证只展示官方消息、通知中心和认证引导，不展示用户私信列表 | 继承一期上线目标 |
| `M03-RULE-private-chat-open` | 普通私信开放 | APP/ADM | 双方均满足 `M01-RULE-core-access`、账号正常、未拉黑、`M02-SM-mutual-match=matched`，才可发送普通文本消息 | 废止互关私信旧口径 |
| `M03-RULE-whisper-send` | 悄悄话发送资格 | APP/ADM | 发送方完成三重认证；目标用户正常可见；无未处理同对象悄悄话；无忽略冷却；扣费或免费次数可用 | 扣费引用 PRD-04 |
| `M03-RULE-whisper-repeat-limit` | 悄悄话重复发送限制 | APP | 同一发送方对同一接收方存在 `pending` 悄悄话时，不允许再次发送 | 防骚扰 |
| `M03-RULE-whisper-ignore-cooldown` | 悄悄话忽略冷却 | APP | 接收方忽略后，发送方 7 天内不可再次向同一对象发送悄悄话 | 默认固定参数 |
| `M03-RULE-female-protection` | 女性保护机制 | APP/ADM | 匹配成功后连续 3 天内，男方在女方未发送真实用户消息前不可发送普通私信；系统提示不算真实消息 | 后台可配置开关和天数 |
| `M03-RULE-message-type-scope` | 首版消息类型范围 | APP/ADM | 只支持 `text`、`whisper`、`whisper_reply`、`system_tip`、`official`；图片、语音、撤回、通话、输入中隐藏入口 | 本期不做清单同步 |
| `M03-RULE-conversation-invalid` | 会话失效规则 | APP/ADM | 任一方拉黑、冻结、停用、封禁、注销中、已注销或核心准入失效后，会话不可发送但历史保留 | 与举报处罚联动 |
| `M03-RULE-unread` | 未读与红点规则 | APP | 消息 Tab 红点 = 私信未读 + 官方消息未读 + 通知中心未读；超过 99 展示 `99+`；进入会话或通知详情后置已读 | 无用户自助通知开关 |
| `M03-RULE-notification-scope` | 通知中心一期范围 | APP/ADM | 首版只纳入 `M03-ENUM-notification-biz-type` 启用项；社区评论/点赞/关注类通知由 PRD-05 展开 | 避免社区通知提前泛化 |
| `M03-RULE-notification-setting-scope` | 通知设置范围收敛 | APP/ADM | 一期不做用户侧通知管理页，不做后台完整通知偏好中心；通知模板和订阅消息申请作为前置/后台模板能力 | 与一期目标一致 |
| `M03-RULE-notification-subscribe` | 微信订阅消息授权 | APP/ADM | 业务节点触发订阅授权；未授权只影响微信外部提醒，不影响站内消息落库、已读、红点和通知详情 | 上线前置风险 |
| `M03-RULE-report-handoff` | 聊天举报承接 | APP/ADM | 聊天页、悄悄话卡片举报统一生成举报工单，后台举报处理按来源展示上下文、处罚联动会话失效 | 不新建聊天举报中心 |
| `ADM-03-RULE-admin-scope` | 后台承接范围 | ADM | 首版不建独立 IM 工作台；在 ADM-01 App 用户管理卡片“模块补充”弹窗、消息通知记录查询、文案模板、规则配置、举报处理、操作日志中承接 | 控制报价边界 |

---

## 6. 模块配置项

| 配置 ID | 配置项 | 默认值 | 类型 | 配置路径 | 修改后是否立即生效 | 高风险（需二次确认） |
|---------|--------|--------|------|----------|-------------------|---------------------|
| `M03-CFG-female-protection-enabled` | 女性保护机制开关 | true | bool | 移动端配置管理 -> 社交权限与消息配置 | 是 | 是 |
| `M03-CFG-female-protection-days` | 女性保护期天数 | 3 | int | 移动端配置管理 -> 社交权限与消息配置 | 是，新会话即时按新值计算；历史会话按创建时快照 | 是 |
| `M03-CFG-whisper-ignore-cooldown-days` | 悄悄话忽略后冷却天数 | 7 | int | 移动端配置管理 -> 社交权限与消息配置 | 是 | 是 |
| `M03-CFG-vip-free-whisper-daily` | 会员每日免费悄悄话次数 | 1 | int | 复用 PRD-04 商业化配置 | 是 | 是 |
| `M03-CFG-unread-max-display` | 未读数最大展示 | 99+ | string | 代码固定/前端展示基线 | 是 | 否 |
| `M03-CFG-message-page-size` | 会话历史分页条数 | 20 | int | 代码固定 | 是 | 否 |
| `M03-CFG-notification-page-size` | 通知列表分页条数 | 20 | int | 代码固定 | 是 | 否 |
| `M03-CFG-notification-template-list` | 通知模板列表 | 见 `M03-ENUM-notification-biz-type` | json | 文案与消息中心 -> PRD-03 分组 | 是 | 是 |
| `M03-CFG-official-assistant-enabled` | 官方助手入口开关 | true | bool | 移动端配置管理 -> 消息入口配置 | 是 | 否 |

---

## 7. 模块通知、事件与文案

| 通知/事件/文案 ID | 类型 | 触发时机 / 所属场景 | 渠道 | 内容/变量/默认文案 | 是否后台可配 |
|------------------|------|---------------------|------|-------------------|--------------|
| `M03-EVT-message-sent` | 事件 | 普通文本消息发送成功 | 内部事件 | conversationId, senderUserId, receiverUserId, messageId | 否 |
| `M03-EVT-whisper-sent` | 事件 | 悄悄话发送成功 | 内部事件/站内通知 | senderUserId, receiverUserId, whisperId, payType | 否 |
| `M03-EVT-whisper-replied` | 事件 | 接收方回复悄悄话 | 内部事件 | whisperId, senderUserId, receiverUserId; 触发 PRD-02 匹配成功 | 否 |
| `M03-EVT-conversation-invalidated` | 事件 | 会话因拉黑/处罚/账号异常失效 | 内部事件 | conversationId, invalidReason, operatorType | 否 |
| `M03-NTF-match-success` | 通知 | 匹配成功 | 站内通知/订阅消息 | 你们已成功匹配，快开始聊天吧 | 是 |
| `M03-NTF-whisper-received` | 通知 | 收到悄悄话 | 站内通知/订阅消息 | 你收到一条悄悄话，回复后即可开始聊天 | 是 |
| `M03-NTF-report-result` | 通知 | 举报处理完成 | 站内通知 | 你的举报已处理，感谢反馈 | 是 |
| `M03-NTF-violation-warning` | 通知 | 违规处罚生效 | 站内通知 | 你的账号因违规已受到处理，请遵守平台规范 | 是 |
| `M03-NTF-asset-change` | 通知 | 千寻币或会员资产变动 | 站内通知 | 你的资产有新的变动，请查看明细 | 是 |
| `M03-NTF-invite-response` | 通知 | 邀请关系绑定或邀请响应 | 站内通知 | 你的邀请有新的响应 | 是 |
| `M03-TXT-core-access-chat-block` | 文案 | 未完成三重认证进入私信区 | APP | 完成实名、头像、学历认证后，才可开启真实聊天 | 是 |
| `M03-TXT-no-conversation-empty` | 文案 | 消息列表无私信会话 | APP | 还没有新的聊天，去成家看看谁和你更有缘 | 是 |
| `M03-TXT-female-protection-block` | 文案 | 男性保护期内禁发 | APP | 已开启女生保护机制，待对方回复后即可继续聊天 | 是 |
| `M03-TXT-whisper-waiting` | 文案 | 悄悄话发送方等待回复 | APP | 你已发送悄悄话，等待对方回复 | 是 |
| `M03-TXT-whisper-ignored` | 文案 | 悄悄话被忽略 | APP | 对方暂未回应，7 天后可再次发送悄悄话 | 是 |
| `M03-TXT-conversation-invalid` | 文案 | 会话失效 | APP | 当前会话暂不可继续聊天 | 是 |

---

## 8. 模块错误码

| 错误码 ID | HTTP code | 业务 code | 含义 | 用户提示文案 | 是否可重试 |
|-----------|-----------|-----------|------|--------------|------------|
| `M03-ERR-core-access-blocked` | 403 | 30001 | 未完成核心准入，不能使用真实聊天 | 完成认证后即可开启聊天 | 否 |
| `M03-ERR-private-chat-not-matched` | 403 | 30002 | 未匹配成功，不能发送普通私信 | 相互喜欢后才能聊天 | 否 |
| `M03-ERR-female-protection-blocked` | 403 | 30003 | 命中女性保护机制 | 等待对方先回复后即可继续聊天 | 否 |
| `M03-ERR-conversation-invalid` | 409 | 30004 | 会话已失效 | 当前会话暂不可继续聊天 | 否 |
| `M03-ERR-whisper-duplicate-pending` | 409 | 30005 | 同一对象已有待回复悄悄话 | 对方回复或忽略前不能重复发送 | 否 |
| `M03-ERR-whisper-cooldown` | 409 | 30006 | 悄悄话忽略冷却期内 | 过几天再试试吧 | 否 |
| `M03-ERR-whisper-quota-insufficient` | 402 | 30007 | 免费次数和千寻币余额不足 | 千寻币余额不足，请先充值 | 否 |
| `M03-ERR-message-send-failed` | 500 | 30008 | 消息发送失败 | 发送失败，请稍后重试 | 是 |
| `M03-ERR-notification-not-found` | 404 | 30009 | 通知不存在或不属于当前用户 | 通知不存在 | 否 |
| `M03-ERR-template-disabled` | 409 | 30010 | 通知模板停用 | 当前通知暂不可发送 | 是 |

---

## 9. 模块接口草案

> 接口路径为产品草案，最终技术方案可按项目后端路由规范调整；产品规则和 ID 不随接口路径变化。

| 端 | 方法 | 路径 | 说明 | 关联规则/状态 |
|----|------|------|------|---------------|
| APP | GET | `/api/app/message/conversations` | 查询消息列表、官方消息卡片与私信会话列表 | `M03-RULE-message-tab-scope` |
| APP | GET | `/api/app/message/unread-summary` | 查询消息 Tab 红点汇总 | `M03-RULE-unread` |
| APP | GET | `/api/app/message/conversations/{conversationId}` | 查询会话详情和历史消息 | `M03-SM-conversation` |
| APP | POST | `/api/app/message/send-text` | 发送普通文本私信 | `M03-RULE-private-chat-open` |
| APP | POST | `/api/app/message/messages/read` | 标记会话消息已读 | `M03-RULE-unread` |
| APP | POST | `/api/app/message/whispers` | 发送悄悄话 | `M03-RULE-whisper-send` |
| APP | POST | `/api/app/message/whispers/{whisperId}/reply` | 回复悄悄话 | `M03-SM-whisper` |
| APP | POST | `/api/app/message/whispers/{whisperId}/ignore` | 忽略悄悄话 | `M03-RULE-whisper-ignore-cooldown` |
| APP | GET | `/api/app/message/notifications` | 查询通知中心列表 | `M03-RULE-notification-scope` |
| APP | GET | `/api/app/message/notifications/{noticeId}` | 查询通知详情 | `M03-SM-notification-read` |
| APP | POST | `/api/app/message/notifications/read-all` | 通知中心全部已读 | `M03-RULE-unread` |
| APP | POST | `/api/app/message/report` | 聊天页/悄悄话举报 | `M03-RULE-report-handoff` |
| APP | GET | `/api/app/message/invite-response` | 查询邀请响应消息 | `M03-OUT-invite-response` |
| ADM | GET | `/api/admin/users/{userId}/messages/summary` | 查询用户消息互动摘要 | `ADM-03-PAGE-user-message-section` |
| ADM | GET | `/api/admin/users/{userId}/messages/conversations` | 查询用户详情私信会话 Tab | `M03-SM-conversation` |
| ADM | GET | `/api/admin/users/{userId}/messages/whispers` | 查询用户详情悄悄话记录 Tab | `M03-SM-whisper` |
| ADM | GET | `/api/admin/users/{userId}/messages/notifications` | 查询用户详情通知记录 Tab | `M03-SM-notification-read` |
| ADM | GET | `/api/admin/message/records` | 消息通知记录查询 | `ADM-03-PAGE-message-record-query` |
| ADM | GET/POST | `/api/admin/message/config` | 消息与通知规则配置查询/保存 | `M03-CFG-*` |

### 9.1 APP 响应结构草案

#### 9.1.1 消息列表

```json
{
  "unreadSummary": {
    "privateUnreadCount": 3,
    "officialUnreadCount": 2,
    "notificationUnreadCount": 4,
    "totalUnreadCount": 9,
    "displayText": "9"
  },
  "officialMessage": {
    "title": "官方消息",
    "lastMessagePreview": "你的学历认证已通过",
    "lastMessageTime": "2026-07-02 10:00:00",
    "unreadCount": 2
  },
  "conversationList": [
    {
      "conversationNo": "CV202607020001",
      "conversationType": "private",
      "targetUserNo": "U202607020001",
      "targetNickname": "小雨",
      "targetAvatar": "https://example.com/avatar.jpg",
      "lastMessageType": "text",
      "lastMessagePreview": "你好呀",
      "lastMessageTime": "2026-07-02 10:10:00",
      "unreadCount": 1,
      "conversationStatus": "active",
      "canSend": true
    }
  ]
}
```

说明：`totalUnreadCount` 用于逻辑计算和服务端校验，APP 展示红点数字时优先使用 `displayText`；当 `displayText` 为空时，前端才按 `M03-CFG-unread-max-display` 兜底格式化。

#### 9.1.2 私信会话

```json
{
  "conversationNo": "CV202607020001",
  "conversationStatus": "active",
  "canSend": true,
  "protectStatus": {
    "enabled": true,
    "waitingFemaleReply": false,
    "expireTime": "2026-07-05 10:20:00"
  },
  "list": [
    {
      "messageNo": "MSG202607020001",
      "messageType": "system_tip",
      "content": "你们已成功匹配，快开始聊天吧",
      "sendStatus": "read",
      "createdTime": "2026-07-02 10:20:00"
    }
  ]
}
```

#### 9.1.3 通知中心

```json
{
  "total": 12,
  "list": [
    {
      "noticeNo": "NTF202607020001",
      "noticeType": "system",
      "bizType": "auth_result",
      "title": "学历认证已通过",
      "summary": "你已获得学历认证徽章",
      "readStatus": "unread",
      "jumpType": "notification_detail",
      "jumpValue": "auth_result",
      "createdTime": "2026-07-02 09:00:00"
    }
  ]
}
```

---

## 10. 集中异常与边界场景

| 场景 | 处理口径 | 关联规则 |
|------|----------|----------|
| 未完成三重认证进入消息 Tab | 可看官方消息与通知中心，不展示私信会话，私信区展示认证引导 | `M03-RULE-message-tab-scope` |
| 未匹配成功尝试普通私信 | 拦截发送，提示相互喜欢后才能聊天 | `M03-RULE-private-chat-open` |
| 悄悄话发送成功但长期未回复 | 保持 `pending_whisper`，不自动转普通私信 | `M03-SM-whisper` |
| 同一对象上一条悄悄话未处理 | 不允许重复发送新的悄悄话 | `M03-RULE-whisper-repeat-limit` |
| 悄悄话被忽略 | 本次关闭，发送方 7 天内不可再次发送 | `M03-RULE-whisper-ignore-cooldown` |
| 悄悄话回复成功 | 立即触发 PRD-02 匹配成功并切换为普通私信态 | `M03-EVT-whisper-replied` |
| 男性保护期内先发消息 | 输入框置灰，展示女性保护提示 | `M03-RULE-female-protection` |
| 女性保护期内女方发送真实消息 | 男性侧立即恢复发送能力 | `M03-RULE-female-protection` |
| 任一方账号被冻结、封禁或注销 | 会话置为失效态，历史保留，不可继续发送 | `M03-RULE-conversation-invalid` |
| 聊天举报处理为封禁或禁言 | 后台处罚联动会话失效或发送能力受限，生成站内通知 | `M03-RULE-report-handoff` |
| 微信订阅消息未授权 | 不发外部提醒，站内通知照常落库、计入未读 | `M03-RULE-notification-subscribe` |

---

## 11. 首版研发分级

### 11.1 必做

| 编号 | 能力 | 说明 |
|------|------|------|
| M03-DEV-P0-01 | 消息列表与未读红点 | 底部消息 Tab、官方消息卡片、私信列表、未读汇总 |
| M03-DEV-P0-02 | 私信对话页 | 文本消息、历史分页、已读、发送失败重试 |
| M03-DEV-P0-03 | 悄悄话回复态 | 待回复、回复、忽略、冷却期、匹配事件 |
| M03-DEV-P0-04 | 通知中心与通知详情 | 列表、筛选、单条已读、全部已读、跳转 |
| M03-DEV-P0-05 | 官方助手与官方消息详情 | 官方消息入口、官方助手聊天页、不可回复说明 |
| M03-DEV-P0-06 | 女性保护机制 | 男性侧禁发、女方回复解锁、后台配置快照 |
| M03-DEV-P0-07 | 举报与拉黑承接 | 聊天页更多菜单、举报工单、拉黑会话失效 |
| M03-DEV-P0-08 | 邀请响应页 | 邀请消息查看与跳转 PRD-07 承接 |

### 11.2 可延后

| 编号 | 能力 | 本期处理方式 |
|------|------|--------------|
| M03-DEV-P2-01 | 图片消息 | 输入入口隐藏 |
| M03-DEV-P2-02 | 语音消息 | 输入入口隐藏 |
| M03-DEV-P2-03 | 消息撤回 | 不展示撤回操作 |
| M03-DEV-P2-04 | 输入中状态 | 不展示 |
| M03-DEV-P2-05 | 用户自助通知管理页 | 设置页不展示通知设置入口 |
| M03-DEV-P2-06 | 独立 IM 运营工作台 | 后台不建菜单 |
