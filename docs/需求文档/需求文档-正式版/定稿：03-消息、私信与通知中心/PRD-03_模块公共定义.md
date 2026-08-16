# PRD-03 模块公共定义 - 消息、私信与通知中心

> 本文件登记 PRD-03 在移动端与管理后台共用的术语、枚举、状态机、规则、配置、通知、事件、错误码与接口草案。
> 页面规格引用本文 `M03-*` ID，禁止把 PRD-03 专属定义写入全局共享层。
> 核心准入引用 PRD-01；匹配成功与关系来源引用 PRD-02；千寻币、会员与扣费引用 PRD-04；举报处理承接 PRD-05/后台社区互动管理统一举报处理。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本15 | 2026-08-12 | Codex | 消息首页改为顶部悄悄话/私信卡片、喜欢我的人/官方助手/系统消息固定行及有效私信直接游标分页；平台消息主表统一承接私信摘要、发送状态和未读统计 |
| 版本14 | 2026-08-07 | Codex | 明确日常私信、悄悄话申请及回复完整明文归档至消息主表；普通移动端和后台接口只返回元数据，不返回正文或内容摘要 |
| 版本13 | 2026-08-07 | Codex | 明确平台与 TIM 均不做日常消息内容审核；普通私信未读只汇总平台有效会话映射，避免隐藏会话重复计数 |
| 版本12 | 2026-08-07 | Codex | 清理重复旧规则与旧研发清单，统一 TIM 已读、平台未读聚合和最新版接口边界 |
| 版本11 | 2026-08-06 | Codex | 确认普通私信与悄悄话统一通过腾讯云 TIM 收发，移除平台发送前文本内容审核与自建普通消息发送接口 |
| 版本10 | 2026-08-06 | Codex | 确认悄悄话回复后的前台归属：双方待回复列表移除，不建设已完成申请列表；唯一私信会话承接原悄悄话、回复与后续消息，后台保留完整关联记录 |
| 版本09 | 2026-07-31 | Codex | 按需求评审确认方案重基线：固定 7 个有效页面；拆分私信会话、悄悄话申请和发送权限；扩展系统消息业务范围；补齐批次已读、举报/拉黑、高敏权限、留存注销和配置快照规则 |
| 版本09 | 2026-07-31 | Codex | 明确举报双通道路由：用户/资料举报由个人主页发起，私信/悄悄话内容举报由详情页直接发起并复用 PRD-05 统一举报组件 |
| 版本08 | 2026-07-16 | Codex | 与 PRD-02 对齐聊天权限：关系侧返回 canEnterConversation，消息侧返回 canSend/protectStatus；女性保护只限制发送 |
| 版本07 | 2026-07-13 | Codex | 取消前台暂不回应；pending 到期自动结束并进入 7 天冷却；拆分私信会话、悄悄话申请和官方/系统消息 |
| 版本06 | 2026-07-13 | Codex | 移动端对齐蓝湖：通知改官方/系统全文消息流，移除全部已读、独立详情与邀请响应入口 |
| 版本04 | 2026-07-13 | Codex | 官方助手收口为操作引导，正式业务结果统一归档通知中心 |
| 版本03 | 2026-07-13 | Codex | 明确推荐页、社区与消息中心的悄悄话/私信入口分流 |
| 版本02 | 2026-07-02 | Codex | 按评审意见新增后台记录类型枚举与未读展示口径 |
| 版本01 | 2026-07-02 | Codex | 由原移动端/管理后台 PRD-03 与一期上线目标转写正式版，收口普通私信、悄悄话、女性保护、通知中心、邀请响应和后台承接边界 |

---

## 1. 已确认产品结论

| 编号 | 结论 | 文档落点 |
|------|------|----------|
| M03-01 | `消息` Tab 对已登录用户可见；资料未完成、核心准入失效或账号受限用户只读查看必要的账号安全、处罚和申诉消息，不展示真实用户私信/悄悄话内容，不允许互动 | `M03-RULE-message-tab-scope` |
| M03-02 | 普通私信必须在双方相互喜欢/匹配成功后才开放；不再沿用互相关注即可私信、任意人私信等旧口径 | `M03-RULE-private-chat-open`、`M02-SM-mutual-match` |
| M03-03 | 悄悄话是匹配成功前的破冰申请；接收方回复即接受申请并触发 PRD-02 生成 `whisper_reply` 匹配记录。回复成功后申请退出双方默认列表，原申请与回复转入唯一私信会话 | `M03-SM-whisper`、`M03-EVT-whisper-replied`、`M03-RULE-whisper-to-conversation` |
| M03-04 | 女性保护机制首版保留：匹配成功后前 3 天，男方向女方发送普通私信前需等待女性先发送真实用户消息 | `M03-RULE-female-protection`、`M03-CFG-female-protection-days` |
| M03-05 | 一期不做用户自助通知设置页，也不做后台完整通知偏好中心；保留业务节点通知、站内通知与微信订阅消息模板申请前置项 | `M03-RULE-notification-setting-scope` |
| M03-06 | 举报分为两条通道：用户资料/账号举报从个人主页发起并使用 `targetType=user`；私信/悄悄话内容举报从对应详情页直接发起并使用 `targetType=chat`。两者复用 PRD-05 统一举报组件和后台处理链路 | `M03-RULE-report-handoff`、`M03-RULE-report-context`、`APP-05-PAGE-report-modal`、`ADM-03-PAGE-report-chat-fields` |
| M03-07 | 首版消息类型只支持文本、悄悄话卡片、官方/系统提示；图片、语音、视频/通话、撤回、输入中状态均不纳入一期 | `M03-RULE-message-type-scope` |
| M03-08 | 认证结果留在 PRD-01 原流程；官方助手只做低频功能介绍、安全提示和帮助引导；系统消息承接治理、资产、邀请等重要业务结果，以及社区运营和平台公告 | `M03-RULE-review-result-in-flow`、`M03-RULE-assistant-scope`、`M03-RULE-notification-scope` |
| M03-09 | 悄悄话扣费统一引用 PRD-04：普通用户可用千寻币发送，时空邂逅会员每日默认 1 次免费悄悄话，用完后继续走千寻币 | `M04-RULE-whisper-pay`、`M03-CFG-vip-free-whisper-daily` |
| M03-10 | 推荐页是悄悄话主发起入口，社区是辅助发现入口；未匹配仅可付费发悄悄话，已匹配可直接发私信 | `M03-RULE-contact-entry-routing` |
| M03-11 | 消息中心是普通私信主入口，同时承接双方仍待回复的已发/已收悄悄话；回复成功后只在普通私信中继续交流，不在悄悄话页保留已完成记录 | `M03-RULE-contact-entry-routing`、`M03-RULE-private-chat-open`、`M03-RULE-whisper-to-conversation` |
| M03-12 | 聊天入口与发送权限拆分：PRD-02 判断 `canEnterConversation`；进入会话后 PRD-03 计算 `canSend`、`protectStatus`。女性保护不得阻止进入有效会话 | `M03-RULE-private-chat-open`、`M03-RULE-send-permission` |
| M03-13 | 消息首页顶部展示悄悄话、私信卡片，固定展示“喜欢我的人”、官方助手、系统消息，并在同页直接游标分页全部有效普通私信；待处理悄悄话不混入动态私信行 | `M03-RULE-message-home-structure` |
| M03-14 | 会话顶部提供举报、拉黑、拉黑并举报；具体消息支持长按举报。主页不可访问或关系失效时仍保留只读安全记录和举报入口 | `M03-RULE-report-handoff`、`M03-RULE-conversation-invalid` |
| M03-15 | 管理后台不新增独立 IM 工作台；正文仅可在举报案件或风控案件上下文中按最小权限查看，客服/运营无正文权限，任何导出均不含正文 | `ADM-03-RULE-admin-scope`、`M03-RULE-sensitive-content-access` |
| M03-16 | 消息内容、案件证据、审计和注销处理采用分类留存；普通规则配置对新对象生效并保存创建时快照，安全总开关可即时阻断新动作 | `M03-RULE-data-retention`、`M03-RULE-config-snapshot` |
| M03-17 | 本期无用户侧通知开关；业务节点未授权微信订阅消息只影响外部提醒，不影响站内系统消息落库、未读和查询 | `M03-RULE-notification-subscribe` |
| M03-18 | 一期不建设“已完成悄悄话”前台列表，也不提供用户删除申请记录；`replied/expired/invalid` 仅作为后台状态事实和详情幂等/安全校验依据，默认列表只查询 `pending` | `M03-RULE-whisper-to-conversation`、`M03-RULE-data-retention` |
| M03-19 | 普通私信与悄悄话统一使用腾讯云 TIM 收发，平台自建审核和 TIM 云端审核均不对本期日常消息执行发送前文本内容审核。普通私信由 TIM SDK 发送并通过消息前回调校验业务权限；悄悄话由后端完成资格、扣费、状态与幂等校验后通过 TIM REST 投递 | `M03-RULE-tencent-im-channel`、`M03-RULE-send-permission`、`M03-RULE-whisper-send` |
| M03-20 | 日常私信、悄悄话申请和回复的完整明文统一归档到 `app_message_record`；移动端会话列表仅可返回最新消息单行短摘要，聊天历史接口不返回正文；后台普通查询仍不得返回正文或内容摘要，只有有效案件处理人可在案件内查看独立冻结证据 | `M03-RULE-tencent-im-channel`、`M03-RULE-sensitive-content-access`、`M03-RULE-data-retention` |

### 1.1 本模块产出

| 产出 ID | 产出项 | 说明 | 主要承接页面/规则 |
|---------|--------|------|------------------|
| `M03-OUT-conversation` | 会话与消息记录 | 私信会话、悄悄话消息、系统提示消息 | `APP-03-PAGE-message-list`、`APP-03-PAGE-private-chat`、`M03-SM-conversation` |
| `M03-OUT-whisper` | 悄悄话破冰链路 | 发送、待回复、回复、自动到期、冷却期和匹配成功事件 | `APP-03-PAGE-whisper-message`、`APP-03-PAGE-whisper-detail`、`M03-SM-whisper` |
| `M03-OUT-notification` | 系统消息全文流 | 治理、资产、邀请等重要业务结果与社区运营、平台公告直接全文展示；不提供移动端筛选、全部已读和独立详情 | `APP-03-PAGE-notification-center` |
| `M03-OUT-official-assistant` | 官方助手 | 低频功能介绍、安全规则、服务号/公众号关注引导 | `APP-03-PAGE-official-assistant`、`M03-RULE-assistant-scope` |
| `M03-OUT-invite-response` | 邀请响应（已移交） | PRD-03 不提供移动端入口；邀请关系与页面归 PRD-07 | `[已废弃]` |
| `M03-OUT-admin-query` | 后台排查能力 | 模块补充弹窗消息互动 Tab、消息通知记录查询和举报上下文 | `ADM-03-PAGE-user-message-section`、`ADM-03-PAGE-message-record-query` |

---

## 2. 模块术语

| 术语 ID | 统一术语 | 禁用旧称/别名 | 定义 | 是否需提升全局 |
|---------|----------|----------------|------|----------------|
| `M03-TERM-conversation` | 会话 | 聊天房间、IM 房间 | 两名用户或用户与官方助手之间承载消息记录、未读数、发送权限和状态的业务对象 | 否 |
| `M03-TERM-private-message` | 普通私信 | 私聊、聊天消息 | 匹配成功后双方可发送的文本消息 | 否 |
| `M03-TERM-whisper` | 悄悄话 | 小纸条、留言 | 匹配成功前用于破冰的特殊消息，回复后触发匹配成功 | 否 |
| `M03-TERM-official-message` | 系统消息 | 官方消息、通知中心、站内通知页 | 治理、资产、邀请等重要业务结果与社区运营内容组成的全文消息流；与“官方小助手”并列为固定入口 | 否，模块内统一称系统消息 |
| `M03-TERM-official-assistant` | 官方助手 | 客服助手、系统助手 | 仅提供下一步操作引导与帮助，不承担正式业务结果归档；首版不支持用户回复 | 否 |
| `M03-TERM-notification` | 系统消息记录 | 站内通知、消息通知、官方消息记录 | 跨模块业务事件或运营发布生成的、属于单一用户的可追溯系统消息记录 | 否 |
| `M03-TERM-female-protection` | 女性保护机制 | 女生保护、保护期 | 匹配成功后限定时间内保护女方先发权的发送约束 | 否 |
| `M03-TERM-invite-response` | 邀请响应 | 邀请消息 | 被邀请人进入小程序后的邀请承接消息与响应入口；邀请归因和奖励归 PRD-07 | 否 |
| `M03-TERM-tencent-im` | 腾讯云 TIM | 自建 IM、自建 WebSocket、平台消息通道 | 普通私信与悄悄话的实时收发、云端会话、历史、未读和投递通道；平台后端负责业务规则与必要映射 | 否 |

### 2.1 引用的跨模块定义

| 引用 ID | 名称 | 使用场景 |
|---------|------|----------|
| `M01-RULE-core-access` | 核心准入门槛 | 普通私信、悄悄话发送和私信会话展示 |
| `M02-SM-mutual-match` | 匹配成功状态机 | 普通私信开放前置、匹配成功通知 |
| `M02-ENUM-match-source=whisper_reply` | 悄悄话回复匹配来源 | 悄悄话回复触发匹配成功 |
| `M04-RULE-whisper-pay` | 悄悄话扣费规则 | 发送悄悄话时免费次数、千寻币扣费和余额不足 |
| `M04-CFG-vip-free-whisper-daily` | 会员每日免费悄悄话次数 | 默认 1 次，后台配置来源 |
| `M05-RULE-report-gate` | 统一举报准入 | 举报要求已登录且账号未冻结；聊天内容举报叠加 PRD-03 参与关系校验 |
| `M05-RULE-report-idempotency` | 举报提交幂等 | 同一举报人、对象类型和对象在待处理/处理中时禁止重复建单 |
| `M05-RULE-report-target-context` | 举报对象与上下文映射 | 统一定义 `targetType`、`targetId` 和白名单上下文字段 |
| `ADM-GLB-PAGE-copy-message-center` | 文案与消息中心 | 后台配置官方消息、通知模板和提示文案 |
| `M05-SM-report` | 统一举报状态机 | 聊天/悄悄话举报的受理、处理、处罚和结果通知 |
| `M07-EVT-*` | 邀请与奖励业务事件 | 生成邀请结果类系统消息，PRD-03 不承接邀请业务状态机 |
| `ADM-GLB-PAGE-copy-message-center` | 文案与消息中心 | 后台配置系统消息模板、官方助手内容和提示文案 |

---

## 3. 模块枚举

### 3.1 `M03-ENUM-conversation-type` 会话类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `private` | 私信会话 | 匹配成功后两名用户之间的普通私信 | 1 | 是 | 启用 |
| `official_assistant` | 官方助手 | 低频平台使用引导流，不支持用户回复；不进入私信会话状态机 | 2 | 否 | 启用 |
| `whisper` | 悄悄话会话 | `[已废弃]` 悄悄话改用独立申请对象，不创建会话 | 3 | 否 | 停用 |
| `official_message` | 官方消息 | `[已废弃]` 历史入口统一跳转系统消息全文页 | 4 | 否 | 停用 |

### 3.2 `M03-ENUM-conversation-status` 会话状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `active` | 有效会话 | 匹配关系有效且双方未拉黑；是否可发送必须另读 `canSend`，不得由本状态推导 | 1 | 是 | 启用 |
| `blocked` | 已拉黑 | 任一方拉黑另一方，退出正常会话列表并禁止双方继续联系 | 2 | 否 | 启用 |
| `invalid` | 已失效 | 关系失效、账号冻结/封禁/注销或核心准入失效导致不可继续互动 | 3 | 否 | 启用 |
| `pending_whisper` | 悄悄话待回复 | `[已废弃]` 迁移到 `M03-ENUM-whisper-status=pending` | 4 | 否 | 停用 |
| `protected_waiting_female` | 保护期等待女方 | `[已废弃]` 迁移到 `protectStatus.waitingFemaleReply`，不改变会话状态 | 5 | 否 | 停用 |

### 3.3 `M03-ENUM-message-type` 消息类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `text` | 文本消息 | 首版唯一普通用户可发送消息类型 | 1 | 是 | 启用 |
| `whisper` | 悄悄话卡片 | 发送方发出的悄悄话内容卡片 | 2 | 否 | 启用 |
| `whisper_reply` | 悄悄话回复 | 接收方对悄悄话的明确回复 | 3 | 否 | 启用 |
| `system_tip` | 系统提示 | 匹配成功、保护机制、会话失效等系统提示 | 4 | 否 | 启用 |
| `official` | 官方消息 | `[已废弃]` 平台结果统一写入系统消息记录 | 5 | 否 | 停用 |

### 3.4 `M03-ENUM-send-status` 发送状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `sending` | 发送中 | 客户端已发起，服务端处理中 | 1 | 否 | 启用 |
| `sent` | 已发送 | 服务端已保存并投递 | 2 | 是 | 启用 |
| `failed` | 发送失败 | 校验、网络或服务端失败，可按场景重试 | 3 | 否 | 启用 |

### 3.5 `M03-ENUM-whisper-status` 悄悄话状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `pending` | 等待回应 | 已发送并有效送达，接收方尚未回复 | 1 | 是 | 启用 |
| `replied` | 已回复 | 接收方回复并完成匹配；仅作为后台状态事实，不进入双方悄悄话默认列表 | 2 | 否 | 启用 |
| `expired` | 已超时 | 发送后 7 天内未回复，系统自动结束并进入冷却 | 3 | 否 | 启用 |
| `invalid` | 已失效 | 账号异常、拉黑、处罚、认证失效或业务关闭导致不可处理 | 4 | 否 | 启用 |

### 3.6 `M03-ENUM-whisper-payment-status` 悄悄话支付状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `unpaid` | 未支付 | 仅编辑内容，尚未核销免费次数或千寻币 | 1 | 是 | 启用 |
| `paying` | 支付中 | 正在核销权益或扣除千寻币 | 2 | 否 | 启用 |
| `paid` | 已支付 | 权益核销或扣费成功且消息创建成功 | 3 | 否 | 启用 |
| `refunding` | 退款中 | 已扣费但消息未有效送达，正在补回权益 | 4 | 否 | 启用 |
| `refunded` | 已退款 | 免费次数或千寻币已原路补回 | 5 | 否 | 启用 |

### 3.7 `M03-ENUM-notification-type` 系统消息类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `governance` | 治理结果 | 举报受理/处理、处罚、关系或内容治理等重要结果 | 1 | 是 | 启用 |
| `asset` | 资产结果 | 千寻币、会员、订单、退款或补偿等结果摘要 | 2 | 否 | 启用 |
| `invite` | 邀请结果 | 邀请绑定、奖励发放或失败等结果摘要 | 3 | 否 | 启用 |
| `community` | 社区运营 | 热点、精选、活动、召回等社区运营内容 | 4 | 否 | 启用 |
| `platform` | 平台与安全 | 服务维护、规则调整、账号安全和申诉提示 | 5 | 否 | 启用 |

### 3.8 `M03-ENUM-notification-biz-type` 通知业务类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `report_result` | 举报结果 | 举报已受理、已处理或需补充材料的通用结果，不泄露处罚细节 | 1 | 是 | 启用 |
| `violation_result` | 违规与处罚结果 | 当前用户受到的警告、禁言、冻结或申诉提示 | 2 | 否 | 启用 |
| `content_review_result` | 内容审核结果 | 动态、诚意贴、评论等内容审核结果，事实源归 PRD-05 | 3 | 否 | 启用 |
| `asset_result` | 资产结果 | 资产变动、退款、补偿或订单结果摘要，事实源归 PRD-04 | 4 | 否 | 启用 |
| `invite_result` | 邀请结果 | 邀请绑定与奖励结果摘要，事实源归 PRD-07 | 5 | 否 | 启用 |
| `community_interaction_summary` | 社区互动聚合 | 评论/回复、点赞、关注等按时间窗口聚合的摘要，不逐条推送点赞 | 6 | 否 | 启用 |
| `community_hot_topic` | 社区热点话题 | 今日热门、同城热议或用户可能感兴趣的话题 | 7 | 否 | 启用 |
| `featured_content` | 精选内容 | 热门动态、优质帖子与官方精选内容 | 8 | 否 | 启用 |
| `community_activity` | 社区活动 | 话题活动、征集活动、节日互动和活动结果 | 9 | 否 | 启用 |
| `community_recall` | 社区召回 | 关注话题更新、参与话题升温或互动聚合提醒 | 10 | 否 | 启用 |
| `platform_announcement` | 重要公告 | 平台规则重大调整、服务维护与重要公告 | 11 | 否 | 启用 |
| `account_security` | 账号安全 | 冻结、注销、登录风险和申诉相关必要消息 | 12 | 否 | 启用 |

### 3.9 `M03-ENUM-jump-type` 通知跳转类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `none` | 无跳转 | 全文已在系统消息卡片展示，卡片不可点击 | 1 | 是 | 启用 |
| `chat` | 会话页 | 目标会话仍有效时跳转私信会话 | 2 | 否 | 启用 |
| `profile` | 用户主页 | 目标用户仍可访问时跳转主页 | 3 | 否 | 启用 |
| `auth_center` | 认证中心 | 跳转到我的认证页或认证补全页 | 4 | 否 | 启用 |
| `asset` | 资产明细 | 跳转到千寻币流水、会员或订单记录 | 5 | 否 | 启用 |
| `invite_center` | 邀请中心 | 跳转 PRD-07 邀请记录或推广首页，不进入 PRD-03 邀请响应页 | 6 | 否 | 启用 |
| `community` | 社区内容 | 跳转仍有效的话题、动态或活动 | 7 | 否 | 启用 |
| `appeal` | 申诉入口 | 跳转账号处罚或安全申诉入口 | 8 | 否 | 启用 |
| `h5` | H5 页面 | 跳转已配置且通过白名单校验的 H5 | 9 | 否 | 启用 |
| `notification_detail` | 通知详情 | `[已废弃]` 不再创建此跳转 | 10 | 否 | 停用 |
| `invite_response` | 邀请响应 | `[已废弃]` 迁移到 `invite_center` | 11 | 否 | 停用 |

### 3.10 `M03-ENUM-read-status` 已读状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `unread` | 未读 | 私信未进入对应会话，或系统消息尚未进入已成功加载批次 | 1 | 是 | 启用 |
| `read` | 已读 | 私信会话已打开，或系统消息所在加载批次已成功曝光并批量确认 | 2 | 否 | 启用 |

### 3.11 `M03-ENUM-admin-record-type` 后台记录类型

> 本枚举仅用于后台 `ADM-03-PAGE-message-record-query` 的跨表查询筛选，不替代会话类型、消息类型或通知类型枚举。

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `private_message` | 私信记录 | 匹配成功后的普通私信消息记录 | 1 | 是 | 启用 |
| `whisper_message` | 悄悄话记录 | 悄悄话发送、回复、到期、失效和补偿记录 | 2 | 否 | 启用 |
| `assistant_message` | 官方助手记录 | 功能介绍、安全提示和帮助引导记录 | 3 | 否 | 启用 |
| `system_message` | 系统消息记录 | 治理、资产、邀请、社区和平台安全系统消息 | 4 | 否 | 启用 |
| `official_message` | 官方消息记录 | `[已废弃]` 历史数据兼容查询，迁移到 `system_message` | 5 | 否 | 停用 |
| `notification` | 站内通知记录 | `[已废弃]` 历史数据兼容查询，迁移到 `system_message` | 6 | 否 | 停用 |

### 3.12 `M03-ENUM-report-source-type` 聊天内容举报来源

| 值（code） | 显示名 | `targetType` | `targetId` | 必要上下文 | 状态 |
|------------|--------|--------------|------------|------------|------|
| `private_chat` | 私信内容 | `chat` | `conversationNo` | `conversationNo` 必填，`messageNo` 可选 | 启用 |
| `whisper` | 悄悄话内容 | `chat` | `whisperNo` | `whisperNo` 必填，`messageNo` 可选 | 启用 |

---

## 4. 模块状态机

### 4.1 `M03-SM-conversation` 会话状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| 无 | PRD-02 匹配成功事件 | `active` | 双方满足 `M01-RULE-core-access` 且 `M02-SM-mutual-match=matched` | 幂等创建或打开唯一私信会话，写入匹配成功 `system_tip` |
| 无 | 悄悄话回复事务完成 | `active` | `M03-SM-whisper` 已原子转为 `replied`，且 PRD-02 已生成或复用 `whisper_reply` 匹配记录 | 在同一事务内创建或复用唯一私信会话，依次写入原悄悄话和回复作为开场上下文；双方待回复列表移除该申请 |
| `active` | 任一方拉黑 | `blocked` | 拉黑关系已生效 | 从双方正常私信列表移除，禁止发送，保留只读安全记录与举报能力 |
| `active` | 关系或核心准入失效事件 | `invalid` | 收到 `M02-EVT-relation-invalidated`，或任一方冻结、封禁、注销、核心准入失效 | 从正常私信列表移除，禁止发送，按留存规则保留安全记录 |
| `blocked`/`invalid` | 重复失效事件 | 原状态 | 同一会话已处于终态 | 幂等返回，不重复扣未读、不重复通知 |

> 女性保护只影响 `canSend` 与 `protectStatus`，不改变 `conversationStatus`。一期 `blocked`、`invalid` 均为终态，不支持用户自助恢复原会话。

### 4.2 `M03-SM-whisper` 悄悄话状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| 无 | 支付成功且 TIM 有效投递悄悄话 | `pending` | 发送资格、免费次数/千寻币校验通过 | 写入独立悄悄话申请及 TIM 消息映射、通知接收方；同对象禁止重复发送 |
| `pending` | 接收方提交回复 | `replied` | 申请有效、双方仍满足匹配与聊天基础条件，TIM 回复消息可投递 | 以 `whisperId + requestId` 幂等，整体完成回复、PRD-02 匹配创建/复用、私信会话创建/复用、TIM 开场消息关联及未读更新；成功后申请退出双方默认列表，发送方新增 1 条私信未读；失败保持 `pending` 且不得展示半完成结果 |
| `pending` | 到期任务检测发送满 7 天仍未回复 | `expired` | 未发生回复；按 whisperNo 幂等执行 | 不匹配、不退款；从双方默认列表移除并从到期时间起进入 7 天冷却；旧缓存或合法历史详情只显示“申请已结束” |
| `pending` | 任一方账号异常/拉黑/处罚/认证失效 | `invalid` | 异常事件生效 | 申请不可继续处理并从待办列表移除；是否退款按有效送达判定 |

### 4.3 `M03-SM-whisper-payment` 悄悄话支付状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| `unpaid` | 用户确认支付并发送 | `paying` | 发送资格预校验通过 | 锁定一次请求幂等键 |
| `paying` | 扣费且消息创建成功 | `paid` | 免费次数或千寻币核销成功，消息有效送达 | 生成 `pending` 悄悄话 |
| `paying` | 资格/内容/余额校验失败 | `unpaid` | 未完成有效扣费 | 不产生悄悄话，不扣费 |
| `paying`/`paid` | 已扣费但消息创建失败或未有效送达 | `refunding` | 可确认未形成有效触达 | 原路补回免费次数或千寻币 |
| `refunding` | 补偿成功 | `refunded` | 资产服务返回成功 | 生成资产变动通知；重复补偿幂等 |

### 4.4 `M03-SM-notification-read` 通知已读状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| 无 | 上游业务事件生成系统消息 | `unread` | 命中 `M03-RULE-notification-scope`，且 `producerEventId + receiverUserId + bizType` 未处理 | 计入系统消息未读和消息 Tab 红点 |
| `unread` | 客户端成功加载并曝光一批系统消息 | `read` | 批次内消息均属于当前用户；客户端只提交本次已成功渲染的 `noticeNo` | 按 ID 批量置已读并刷新未读汇总，不影响尚未加载的消息 |
| `read` | 重复提交已读批次 | `read` | 消息已读或请求重试 | 幂等返回，不重复扣减未读 |

> 系统消息不设独立详情页，也不提供“一键全部已读”。私信进入具体会话且消息成功渲染后，调用 TIM SDK 会话已读接口；平台不维护第二套普通私信已读游标。

---

## 5. 模块业务规则

| 规则 ID | 规则描述 | 涉及端/页面 | 判定逻辑 | 备注 |
|---------|----------|-------------|----------|------|
| `M03-RULE-message-tab-scope` | 消息 Tab 可见与分层展示 | APP | 已登录且核心准入有效的正常账号可见完整消息首页；资料未完成、核心准入失效或账号受限时，仅展示认证引导和与本人直接相关的账号安全、处罚、申诉系统消息，不返回真实用户私信/悄悄话摘要，不允许互动 | 受限态不泄露其他用户动态 |
| `M03-RULE-message-home-structure` | 消息首页固定结构 | APP | 首页顶部为“悄悄话”和“私信”两张入口卡片；其下固定展示“喜欢我的人”、官方助手、系统消息；再按 `lastMessageTime DESC, conversationId DESC` 游标分页当前用户参与且 `status=active` 的全部普通私信会话。首页只查询平台会话、用户公开摘要、平台最新消息和未读，不查询 TIM 账号映射，也不返回会话详情态权限；点击会话后再按 `conversationNo` 查询详情并取得 TIM 映射与进入/发送权限。悄悄话卡片只返回收到的全部待处理数及最近 3 个头像；仍为 `pending` 的悄悄话不混入动态会话行 | TIM 未登录或对方 TIM 账号尚未同步不得导致首页失败；首页不再提供“最近 3 条”和“查看全部” |
| `M03-RULE-private-chat-open` | 普通私信会话开放 | APP/ADM | 双方均满足 `M01-RULE-core-access`、账号正常、未拉黑且 `M02-SM-mutual-match=matched` 时，由 PRD-02 返回 `canEnterConversation=true`；PRD-03 幂等创建/打开会话。女性保护不得改变进入权限 | 废止互关或任意私信旧口径 |
| `M03-RULE-tencent-im-channel` | 腾讯云 TIM 消息通道 | APP/ADM | 普通私信使用小程序 TIM SDK 发送、接收和拉取漫游历史，腾讯消息前回调必须按平台关系和发送权限作最终校验，消息后回调归档消息主表并更新会话最新消息投影；悄悄话发送与回复先调用平台业务接口完成准入、扣费、状态和幂等编排，再由后端通过 TIM REST 投递自定义消息。平台与 TIM 均不做本期日常消息发送前文本内容审核 | TIM 负责实时传输与移动端漫游；平台消息主表负责业务编号映射、列表短摘要、发送状态、已读和未读统计。普通接口不得返回完整聊天正文；举报仍走 PRD-05 平台接口 |
| `M03-RULE-send-permission` | 会话发送权限 | APP/ADM | PRD-03 在会话详情和每次发送时分别计算 `canSend`、`sendBlockReason`、`protectStatus`；关系/账号失效、禁言、拉黑、安全总开关或女性保护均可阻断发送，但只有关系/账号/拉黑会令会话失效 | 服务端不得信任客户端权限 |
| `M03-RULE-relation-invalidated-consume` | 关系失效事件消费 | APP/ADM | 消费 PRD-02 `M02-EVT-relation-invalidated` 时以 `producerEventId` 幂等，将对应 `active` 会话转 `invalid`、清理正常列表和未读互动入口；处理失败进入重试/死信并告警 | PRD-02 是关系事实源 |
| `M03-RULE-whisper-send` | 悄悄话发送资格 | APP/ADM | 发送方完成三重认证；双方未匹配、账号正常、未拉黑、未受聊天处罚；无同对象 `pending`；不在到期冷却期；免费次数或千寻币可用；全局安全总开关开启 | 扣费引用 PRD-04 |
| `M03-RULE-whisper-repeat-limit` | 悄悄话重复发送限制 | APP | 同一发送方对同一接收方存在 `pending` 悄悄话时，不允许再次发送 | 防骚扰 |
| `M03-RULE-whisper-to-conversation` | 悄悄话回复后的前台迁移 | APP/ADM | “申请我的/我申请的”默认列表只查询当前用户参与的 `pending` 申请。接收方回复成功后，同一条申请只做 `pending -> replied` 状态迁移，不复制、不物理删除；立即从双方默认列表移除，并在双方私信列表展示同一唯一会话。会话历史首部按时间依次保留原悄悄话、接收方回复和后续普通私信；发送方因该回复新增 1 条私信未读，回复方不新增本人消息未读。一期不建设已完成悄悄话前台列表 | 后台保留 whisperNo、matchNo、conversationNo 及申请/回复的 TIM 消息映射，用于客服、举报和审计 |
| `M03-RULE-report-context` | 聊天举报最小上下文 | APP/ADM | 私信内容举报按 `sourceType=private_chat`、`targetId=conversationNo` 提交，`context` 允许 `conversationNo/timConversationId/messageNo/timMessageId/timMsgKey`；悄悄话内容举报按 `sourceType=whisper`、`targetId=whisperNo` 提交，`context` 允许 `whisperNo/timConversationId/messageNo/timMessageId/timMsgKey`。消息编号仅在明确选中对方消息时传入；服务端必须校验业务编号与 TIM 编号映射、参与关系、消息归属和发送方，优先从平台消息主表固化必要证据，本地归档缺失时再按 TIM 标识补证，不信任客户端上传的用户 ID、正文或任意上下文 | 举报调用 PRD-05 平台接口，TIM 编号只作证据定位或补证，不通过 TIM 提交举报；对象映射与幂等引用 `M05-RULE-report-target-context`、`M05-RULE-report-idempotency` |
| `M03-RULE-whisper-expire` | 悄悄话有效期与冷却 | APP/ADM | `pending` 满 7 天由定时任务或延迟队列幂等转 `expired`；从到期时间起 7 天内原发送方不可再次向同一对象发送 | 有效期与冷却期分别配置 |
| `M03-RULE-whisper-reply-atomic` | 悄悄话回复整体成功 | APP/ADM | 回复接口以 `whisperId + requestId` 幂等，编排回复业务记录、状态转 `replied`、PRD-02 匹配创建/复用、私信会话创建/复用、原申请与回复的 TIM 消息关联及发送方未读更新。对用户只返回整体成功或失败；TIM 调用通过幂等 Outbox、回调与补偿保证最终一致，相同请求重试返回原结果，不重复生成匹配、会话或消息 | 未完成 TIM 投递时不得向前台暴露已完成结果，失败保持或恢复 `pending` |
| `M03-RULE-whisper-read-privacy` | 已读与拒绝隐私 | APP | 服务端可记录接收方查看时间，但发送方始终只见“等待回应”或“申请已结束”；不得展示已读、明确拒绝、拉黑原因和具体处理时间 | 降低催促与骚扰 |
| `M03-RULE-whisper-payment-refund` | 悄悄话扣费与退款 | APP/ADM | 打开弹窗、编辑或资格失败均不扣费；发送成功后到期未回复不退款；已扣费但申请创建失败、TIM 未有效投递或平台主动下架时原路补回 | 与 PRD-04 资产流水联动 |
| `M03-RULE-female-protection` | 女性保护机制 | APP/ADM | 匹配成功后连续 3 天内，男方在女方未发送真实用户消息前 `canSend=false`，但会话保持 `active` 且可查看历史/安全菜单；悄悄话回复视为接收方真实用户消息 | 新会话保存配置快照 |
| `M03-RULE-message-type-scope` | 首版消息类型范围 | APP/ADM | 私信会话支持 `text`、转入会话的 `whisper`、`whisper_reply` 和 `system_tip`；匹配前悄悄话仍是独立申请对象，只有回复成功后才把原申请与回复投影为会话开场上下文。官方助手和系统消息使用各自记录模型；图片、语音、视频/通话、撤回、输入中状态均隐藏 | 不再使用 `official` 作为会话消息 |
| `M03-RULE-conversation-invalid` | 会话失效与安全访问 | APP/ADM | 拉黑后转 `blocked`；关系、账号或核心准入失效后转 `invalid`。终态会话退出正常列表并禁止发送；当对方主页不可访问时，用户仍可从历史安全记录发起举报，不可借此查看对方最新资料或在线状态 | 内容可见期遵循留存规则 |
| `M03-RULE-unread` | 未读与红点规则 | APP | 消息 Tab 红点 = 平台消息主表中有效私信会话的未读接收消息数 + 悄悄话待处理未读 + 官方助手未读 + 系统消息未读，超过 99 展示 `99+`。私信列表每行未读与总未读均以 `app_message_record.receiver_read_status` 为事实源，不采用 TIM 全局未读；进入会话成功渲染后同时调用 TIM SDK 置已读，并向平台提交当前最后已读 `messageNo`，平台按会话推进已读。`whisper_request` 不进入普通私信未读，回复转私信后发送方新增 1 条私信未读，双方不再计算该申请的悄悄话待处理未读 | 不提供全部已读；TIM 已读用于端侧同步，平台主表用于产品统计和后台查询 |
| `M03-RULE-review-result-in-flow` | 认证结果原流程承接 | APP/ADM | 实名、头像、学历等认证结果仍由 PRD-01 原页面与状态机展示；成功、失败和超时均不重复生成系统消息 | 避免双事实源 |
| `M03-RULE-notification-scope` | 系统消息一期范围 | APP/ADM | 系统消息覆盖举报/内容审核等治理结果、本人处罚与申诉、资产结果、邀请结果、社区互动聚合与运营、平台公告和账号安全；不承接认证结果、普通私信、悄悄话已读/到期、逐条点赞或低价值营销 | 上游模块提供业务事实 |
| `M03-RULE-assistant-scope` | 官方助手一期范围 | APP/ADM | 仅在首次功能使用时介绍悄悄话、私信、匹配和女性保护规则，推送安全提示、帮助入口及服务号/公众号关注引导；同一说明同一版本只推一次，不推正式业务结果和社区热点 | 低频、不可回复 |
| `M03-RULE-result-single-source` | 消息归属原则 | APP/ADM | 认证事实归 PRD-01；匹配/关系事实归 PRD-02；用户沟通归私信/悄悄话；举报事实归 PRD-05；资产事实归 PRD-04；邀请事实归 PRD-07；PRD-03 仅消费事件并生成面向用户的消息快照 | 系统消息不得反向修改上游状态 |
| `M03-RULE-notification-setting-scope` | 通知设置范围收敛 | APP/ADM | 一期不做用户侧通知管理页，也不做后台完整通知偏好中心；站内必要安全消息不可关闭，订阅消息模板在对应业务节点申请授权 | 与一期目标一致 |
| `M03-RULE-notification-subscribe` | 微信订阅消息授权 | APP/ADM | 业务节点触发订阅授权；未授权只影响微信外部提醒，不影响站内系统消息落库、已读、红点和全文消息流 | 外部提醒失败不回滚业务事件 |
| `M03-RULE-report-handoff` | 举报、拉黑与证据承接 | APP/ADM | 私信页顶部菜单提供举报、拉黑、拉黑并举报；消息长按可举报具体消息；悄悄话卡片可举报。举报提交 PRD-05 工单，并保存来源、目标用户、消息/悄悄话 ID、提交时必要上下文快照与哈希；拉黑先按幂等关系事实生效，举报失败可重试且不回滚已成功拉黑 | PRD-05 是举报状态与处置事实源 |
| `M03-RULE-sensitive-content-access` | 敏感正文最小权限 | ADM | 日常正文虽以明文保存在消息主表，客服、运营及所有普通查询只能见数量、编号、参与方脱敏信息、类型、时间和状态，接口字段白名单不得包含正文或内容摘要。正文只允许具备专门权限的举报案件处理人或风控案件处理人在对应有效案件上下文按条查看独立冻结证据。所有查看记录操作者、案件号、原因、时间和目标；导出永不包含正文 | 禁止全局正文浏览权限；禁止普通查询 `SELECT *` |
| `M03-RULE-data-retention` | 分类留存、注销与删除 | APP/ADM | 前台列表移除只改变可见范围或业务状态，用户操作不得物理删除悄悄话、匹配、会话和消息事实。日常正文完整明文归档于消息主表；解除匹配、拉黑或注销后立即对普通产品入口不可见，普通消息及正文隔离保留 180 天后由合规清理任务删除或不可逆匿名化；普通系统消息用户可见 2 年；举报证据 3 年，严重违规/永久封禁证据 5 年；网络安全日志不少于 6 个月；敏感访问及管理审计 3 年；注销后立即隐藏、30 天冷静期，期满删除普通数据，仅保留法律义务与安全所需最小证据 | 上线前须经法务/隐私复核，可配置只延长不可低于法定下限 |
| `M03-RULE-config-snapshot` | 配置版本与生效范围 | APP/ADM | 女性保护天数、悄悄话有效期/冷却等普通规则保存版本，创建新会话/申请时写入版本与关键值快照，修改仅影响新对象；全局发送安全总开关关闭后立即阻断所有新私信和悄悄话动作，不改写历史对象 | 配置修改需二次确认和审计 |
| `M03-RULE-contact-entry-routing` | 沟通入口分流 | APP | 推荐卡片/推荐详情是悄悄话主入口，社区动态、评论、用户主页是辅助入口；未匹配只展示“悄悄话”并进入付费确认，已匹配禁止再发悄悄话并进入唯一既有会话；消息中心的悄悄话入口只承接待处理申请，回复成功后统一进入私信 | 发现入口不复制会话页 |
| `ADM-03-RULE-admin-scope` | 后台承接范围 | ADM | 首版不建独立 IM 工作台；复用 ADM-01 用户模块补充弹窗、消息元数据查询、文案模板、规则配置、PRD-05 举报处理和操作日志；不得新增客服/运营正文或内容摘要查询入口 | 控制报价与隐私边界 |

---

## 6. 模块配置项

| 配置 ID | 配置项 | 默认值 | 类型 | 配置路径 | 修改后是否立即生效 | 高风险（需二次确认） |
|---------|--------|--------|------|----------|-------------------|---------------------|
| `M03-CFG-global-send-enabled` | 新互动安全总开关 | true | bool | 移动端配置管理 -> 社交权限与消息配置 | 是，关闭后即时阻断全部新私信和悄悄话动作 | 是 |
| `M03-CFG-female-protection-enabled` | 女性保护机制开关 | true | bool | 移动端配置管理 -> 社交权限与消息配置 | 否，仅新会话按新版本写快照 | 是 |
| `M03-CFG-female-protection-days` | 女性保护期天数 | 3 | int | 移动端配置管理 -> 社交权限与消息配置 | 否，仅新会话按新版本写快照 | 是 |
| `M03-CFG-whisper-expire-days` | 悄悄话有效期天数 | 7 | int | 移动端配置管理 -> 社交权限与消息配置 | 否，仅新申请按新版本写快照 | 是 |
| `M03-CFG-whisper-expire-cooldown-days` | 悄悄话到期后冷却天数 | 7 | int | 移动端配置管理 -> 社交权限与消息配置 | 否，仅新申请按新版本写快照 | 是 |
| `M03-CFG-vip-free-whisper-daily` | 会员每日免费悄悄话次数 | 1 | int | 复用 PRD-04 商业化配置 | 按 PRD-04 当前结算日规则生效 | 是 |
| `M03-CFG-unread-max-display` | 未读数最大展示 | 99+ | string | 代码固定/前端展示基线 | 是 | 否 |
| `M03-CFG-message-page-size` | 会话历史分页条数 | 20 | int | 代码固定 | 是 | 否 |
| `M03-CFG-private-list-page-size` | 完整私信列表分页条数 | 20 | int | 代码固定 | 是 | 否 |
| `M03-CFG-message-home-recent-count` | `[已废弃]` 消息首页最近私信条数 | - | int | 首页已改为直接游标分页 | 否 | 否 |
| `M03-CFG-notification-page-size` | 系统消息分页条数 | 20 | int | 代码固定 | 是 | 否 |
| `M03-CFG-notification-template-list` | 系统消息模板列表 | 见 `M03-ENUM-notification-biz-type` | json | 文案与消息中心 -> PRD-03 分组 | 是，仅影响新生成消息 | 是 |
| `M03-CFG-official-assistant-enabled` | 官方助手入口开关 | true | bool | 移动端配置管理 -> 消息入口配置 | 是 | 否 |
| `M03-CFG-ordinary-message-retain-days` | 失效后普通消息隔离保留天数 | 180 | int | 数据治理配置 -> 消息留存 | 否，仅影响到期计算且不得缩短已承诺期限 | 是 |
| `M03-CFG-system-message-visible-days` | 普通系统消息用户可见天数 | 730 | int | 数据治理配置 -> 消息留存 | 否，仅影响新消息到期时间 | 是 |
| `M03-CFG-report-evidence-retain-days` | 普通举报证据保留天数 | 1095 | int | 数据治理配置 -> 安全证据 | 否，仅可按法务结论延长 | 是 |
| `M03-CFG-severe-evidence-retain-days` | 严重违规/永久封禁证据保留天数 | 1825 | int | 数据治理配置 -> 安全证据 | 否，仅可按法务结论延长 | 是 |
| `M03-CFG-sensitive-audit-retain-days` | 敏感访问与管理审计保留天数 | 1095 | int | 数据治理配置 -> 审计留存 | 否，仅可按法务结论延长 | 是 |
| `M03-CFG-cancel-cooling-days` | 账号注销冷静期 | 30 | int | 账号治理配置 | 依 PRD-01 注销流程生效 | 是 |

> 所有后台可编辑项保存 `configVersion`、修改前后值、操作者、原因和时间。普通规则遵循 `M03-RULE-config-snapshot`；安全总开关为唯一即时覆盖项。

---

## 7. 模块通知、事件与文案

| 通知/事件/文案 ID | 类型 | 触发时机 / 所属场景 | 渠道 | 内容/变量/默认文案 | 是否后台可配 |
|------------------|------|---------------------|------|-------------------|--------------|
| `M03-EVT-message-sent` | 事件 | 普通文本消息发送成功 | 内部事件 | conversationId, senderUserId, receiverUserId, messageId | 否 |
| `M03-EVT-whisper-sent` | 事件 | 悄悄话申请发送成功 | 内部事件/订阅提醒 | producerEventId, senderUserId, receiverUserId, whisperId, payType | 否 |
| `M03-EVT-whisper-replied` | 事件 | 接收方回复、匹配及私信迁移事务成功后发布 | 内部事件 | producerEventId, whisperId, senderUserId, receiverUserId, matchId, conversationId, requestMessageId, replyMessageId | 否 |
| `M03-EVT-whisper-expired` | 事件 | 悄悄话满 7 天未处理 | 内部事件 | whisperId, senderUserId, receiverUserId, expiredTime | 否 |
| `M03-EVT-conversation-invalidated` | 事件 | 会话因拉黑/处罚/账号异常失效 | 内部事件 | conversationId, invalidReason, operatorType | 否 |
| `M03-NTF-match-success` | 通知 | 匹配成功 | 站内通知/订阅消息 | 你们已成功匹配，快开始聊天吧 | 是 |
| `M03-NTF-whisper-received` | 通知 | 收到悄悄话 | 站内通知/订阅消息 | 你收到一条悄悄话，回复后即可开始聊天 | 是 |
| `M03-NTF-report-result` | 通知承接别名 | PRD-05 产生 `M05-NTF-report-result` 后由消息中心投递 | 站内通知 | 你的举报已处理，感谢反馈 | 是；不得与 `M05-NTF-report-result` 重复生成 |
| `M03-NTF-violation-warning` | 通知 | 违规处罚生效 | 站内通知 | 你的账号因违规已受到处理，请遵守平台规范 | 是 |
| `M03-NTF-asset-change` | 通知 | 千寻币或会员资产变动 | 站内通知 | 你的资产有新的变动，请查看明细 | 是 |
| `M03-NTF-invite-response` | 通知 | 邀请关系绑定或邀请响应 | 站内通知 | 你的邀请有新的响应 | 是 |
| `M03-EVT-relation-invalidated-consumed` | 事件 | 成功消费 PRD-02 关系失效事件 | 内部事件 | producerEventId, relationId, conversationId, invalidReason | 否 |
| `M03-EVT-conversation-invalidated` | 事件 | 会话因拉黑、关系/账号异常失效 | 内部事件 | conversationId, sourceEventId, invalidReason, operatorType | 否 |
| `M03-CMD-system-message-create` | 入站命令 | PRD-04/05/07 或平台运营请求生成系统消息 | 内部事件 | producerEventId, receiverUserId, notificationType, bizType, bizNo, templateCode, variables, jumpType, jumpValue | 否 |
| `M03-EVT-system-message-created` | 事件 | 系统消息幂等落库成功 | 内部事件 | noticeId, producerEventId, receiverUserId, bizType, createdTime | 否 |
| `M03-NTF-match-success` | 提示 | 匹配成功 | 私信会话 `system_tip`/订阅消息 | 你们已成功匹配，快开始聊天吧 | 是 |
| `M03-NTF-whisper-received` | 提醒 | 收到悄悄话 | 悄悄话入口/订阅消息 | 你收到一条悄悄话，回复后即可开始聊天 | 是 |
| `M03-NTF-report-result` | 系统消息 | PRD-05 举报处理结果事件 | 站内系统消息 | 你的举报已处理，感谢反馈 | 是 |
| `M03-NTF-violation-warning` | 系统消息 | 违规处罚或申诉节点事件 | 站内系统消息 | 你的账号因违规已受到处理，请查看说明 | 是 |
| `M03-NTF-asset-change` | 系统消息 | PRD-04 资产结果事件 | 站内系统消息 | 你的资产有新的变动，请查看明细 | 是 |
| `M03-NTF-invite-result` | 系统消息 | PRD-07 邀请绑定或奖励结果事件 | 站内系统消息 | 你的邀请有新的进展 | 是 |
| `M03-TXT-core-access-chat-block` | 文案 | 未完成三重认证进入私信区 | APP | 完成实名、头像、学历认证后，才可开启真实聊天 | 是 |
| `M03-TXT-no-conversation-empty` | 文案 | 消息列表无私信会话 | APP | 还没有新的聊天，去成家看看谁和你更有缘 | 是 |
| `M03-TXT-female-protection-block` | 文案 | 男性保护期内禁发 | APP | 已开启女生保护机制，待对方回复后即可继续聊天 | 是 |
| `M03-TXT-whisper-waiting` | 文案 | 悄悄话发送方等待回复 | APP | 你已发送悄悄话，等待对方回复 | 是 |
| `M03-TXT-whisper-expired` | 文案 | 悄悄话到期 | APP | 申请已结束 | 是 |
| `M03-TXT-conversation-invalid` | 文案 | 会话失效 | APP | 当前会话暂不可继续聊天 | 是 |

`M03-CMD-system-message-create` 以 `producerEventId + receiverUserId + bizType` 建唯一约束。消费失败按指数退避重试，超过阈值进入死信并告警；模板停用、变量缺失和非法跳转只阻断消息生成，不得回滚上游业务事实。

---

## 8. 模块错误码

| 错误码 ID | HTTP code | 业务 code | 含义 | 用户提示文案 | 是否可重试 |
|-----------|-----------|-----------|------|--------------|------------|
| `M03-ERR-core-access-blocked` | 403 | 30001 | 未完成核心准入，不能使用真实聊天 | 完成认证后即可开启聊天 | 否 |
| `M03-ERR-private-chat-not-matched` | 403 | 30002 | 未匹配成功，不能发送普通私信 | 相互喜欢后才能聊天 | 否 |
| `M03-ERR-female-protection-blocked` | 403 | 30003 | 命中女性保护机制 | 等待对方先回复后即可继续聊天 | 否 |
| `M03-ERR-conversation-invalid` | 409 | 30004 | 会话已失效 | 当前会话暂不可继续聊天 | 否 |
| `M03-ERR-whisper-duplicate-pending` | 409 | 30005 | 同一对象已有待回复悄悄话 | 当前申请结束前不能重复发送 | 否 |
| `M03-ERR-whisper-cooldown` | 409 | 30006 | 悄悄话到期冷却期内 | 过几天再试试吧 | 否 |
| `M03-ERR-whisper-quota-insufficient` | 402 | 30007 | 免费次数和千寻币余额不足 | 千寻币余额不足，请先充值 | 否 |
| `M03-ERR-message-send-failed` | 500 | 30008 | 消息发送失败 | 发送失败，请稍后重试 | 是 |
| `M03-ERR-notification-not-found` | 404 | 30009 | 系统消息不存在或不属于当前用户 | 消息不存在 | 否 |
| `M03-ERR-template-disabled` | 409 | 30010 | 系统消息模板停用 | 当前消息暂不可生成 | 是 |
| `M03-ERR-whisper-expired` | 409 | 30011 | 悄悄话超过 7 天有效期 | 本次悄悄话已结束 | 否 |
| `M03-ERR-whisper-payment-processing` | 409 | 30012 | 同一发送请求正在扣费或补偿 | 正在处理中，请勿重复操作 | 是 |
| `M03-ERR-whisper-refund-failed` | 500 | 30013 | 悄悄话补偿退款暂未成功 | 退款处理中，请稍后查看资产明细 | 是 |
| `M03-ERR-whisper-reply-conflict` | 409 | 30014 | 回复事务与到期/失效事件冲突或已被处理 | 当前申请状态已变化，请刷新后查看 | 否 |
| `M03-ERR-global-send-disabled` | 503 | 30015 | 平台安全总开关已关闭新互动 | 当前暂不可发送，请稍后再试 | 是 |
| `M03-ERR-sensitive-context-required` | 403 | 30016 | 后台查看正文缺少有效案件上下文或专门权限 | 无权查看该内容 | 否 |

---

## 9. 模块接口草案

> 接口路径为产品草案，最终技术方案可按项目后端路由规范调整；产品规则和 ID 不随接口路径变化。

| 端 | 方法 | 路径 | 说明 | 关联规则/状态 |
|----|------|------|------|---------------|
| APP | GET | `/miniapp/message/home?cursor=&size=20` | 查询首页五类摘要、统一未读和首屏/续页有效私信会话 | `M03-RULE-message-home-structure` |
| APP | GET | `/miniapp/message/conversations?cursor=&size=20` | 复用同一游标规则分页查询有效私信会话、最新消息短摘要、发送状态和未读数 | `M03-RULE-private-chat-open` |
| APP | GET | `/miniapp/message/unread-summary` | 查询私信、悄悄话、助手、系统四类平台未读及消息 Tab 总数 | `M03-RULE-unread` |
| APP | GET | `/miniapp/im/credentials` | 获取当前用户 TIM UserID、短期 UserSig 与 SDKAppID | `M03-RULE-tencent-im-channel` |
| APP | GET | `/miniapp/message/conversations/{conversationNo}` | 查询平台会话状态与 TIM 会话映射；历史消息由 TIM SDK 拉取 | `M03-SM-conversation`、`M03-RULE-tencent-im-channel` |
| TIM SDK | SEND | `C2C text` | 发送普通文本私信；TIM 消息前回调执行最终业务权限校验 | `M03-RULE-tencent-im-channel`、`M03-RULE-send-permission` |
| TIM SDK + APP | READ | `C2C read receipt` + `/miniapp/message/conversations/{conversationNo}/read` | TIM 同步端侧已读；平台接口按最后已读消息编号推进消息主表已读，作为列表与统计事实源 | `M03-RULE-unread` |
| APP | POST | `/api/app/message/send-text` | `[已废弃]` 普通私信改由 TIM SDK 发送，不再建设第二条平台发送通道 | `M03-RULE-tencent-im-channel` |
| APP | POST | `/miniapp/message/conversations/{conversationNo}/block` | 拉黑会话对方；支持独立拉黑和“拉黑并举报”前置动作 | `M03-RULE-report-handoff` |
| APP | GET | `/miniapp/message/whispers?direction=received|sent` | 分页查询当前用户收到/发出的 `pending` 悄悄话；不返回已完成列表 | `M03-RULE-whisper-to-conversation` |
| APP | POST | `/miniapp/message/whispers/precheck` | 查询悄悄话资格、免费次数、价格、余额和短期报价 | `M03-RULE-whisper-send` |
| APP | POST | `/miniapp/message/whispers` | 校验、扣费并通过 TIM REST 发送悄悄话自定义消息 | `M03-RULE-whisper-send`、`M03-RULE-tencent-im-channel` |
| APP | POST | `/miniapp/message/whispers/{whisperNo}/reply` | 回复并匹配，通过 TIM REST 投递回复并返回唯一匹配、私信会话和 TIM 消息映射 | `M03-SM-whisper`、`M03-RULE-whisper-reply-atomic` |
| APP | GET | `/miniapp/message/assistant/messages` | 查询官方助手消息 | `M03-RULE-assistant-scope` |
| APP | POST | `/miniapp/message/assistant/messages/read-batch` | 按成功曝光批次更新官方助手已读 | `M03-RULE-unread` |
| APP | GET | `/miniapp/message/system-messages` | 查询系统消息全文流 | `M03-RULE-notification-scope` |
| APP | POST | `/miniapp/community/reports` | 复用 PRD-05 统一举报接口；聊天只传业务编号和 TIM 定位编号白名单，举报提交本身不经过 TIM | `M03-RULE-report-handoff`、`M03-RULE-report-context`、`M05-RULE-report-target-context` |
| APP | POST | `/miniapp/message/system-messages/read-batch` | 按本次成功曝光的系统消息 ID 批量置已读 | `M03-SM-notification-read` |
| APP | POST | `/api/app/reports` | `[已废弃]` 统一改用 `/miniapp/community/reports`，不得形成第二条举报通道 | `M03-RULE-report-handoff` |
| APP | GET | `/api/app/message/notifications/{noticeId}` | `[已废弃]` 历史通知详情接口 | 不新增调用 |
| APP | POST | `/api/app/message/notifications/read-all` | `[已废弃]` 历史全部已读接口 | 不新增调用 |
| APP | GET | `/api/app/message/invite-response` | `[已废弃]` 邀请响应接口由 PRD-07 承接 | `M03-OUT-invite-response` |
| ADM | GET | `/admin/users/app/{userId}/messages/summary` | 查询用户消息互动摘要 | `ADM-03-PAGE-user-message-section` |
| ADM | GET | `/admin/users/app/{userId}/messages/conversations` | 查询用户详情私信会话 Tab | `M03-SM-conversation` |
| ADM | GET | `/admin/users/app/{userId}/messages/whispers` | 查询用户详情悄悄话记录 Tab | `M03-SM-whisper` |
| ADM | GET | `/admin/users/app/{userId}/messages/system-messages` | 查询用户详情系统消息记录 Tab | `M03-SM-notification-read` |
| ADM | GET | `/admin/message/records` | 查询脱敏消息/系统消息元数据 | `ADM-03-PAGE-message-record-query` |
| ADM | POST | `/admin/community/reports/{reportNo}/evidence/{evidenceNo}/content-view` | 在有效 PRD-05 举报案件上下文按条查看冻结证据并写审计 | `M03-RULE-sensitive-content-access` |
| ADM | GET/POST | `/admin/message/config` | 消息与通知规则配置查询/保存 | `M03-CFG-*` |

### 9.1 APP 响应结构草案

#### 9.1.1 消息列表

```json
{
  "accessMode": "normal",
  "restrictionPrompt": null,
  "unreadSummary": {
    "privateUnreadCount": 3,
    "whisperUnreadCount": 1,
    "assistantUnreadCount": 2,
    "systemUnreadCount": 4,
    "messageUnreadCount": 10,
    "snapshotTime": "2026-08-12 10:10:00"
  },
  "whisperSummary": {
    "pendingCount": 4,
    "recentAvatarUrls": [
      "https://cdn.example.com/avatar/101.jpg",
      "https://cdn.example.com/avatar/102.jpg",
      "https://cdn.example.com/avatar/103.jpg"
    ]
  },
  "likesMeSummary": {
    "totalCount": 119,
    "newCount": 3,
    "latestAvatarUrl": "https://cdn.example.com/avatar/108.jpg",
    "latestLikedTime": "2026-08-12 10:08:00",
    "latestDisplayStatus": "blur"
  },
  "assistantSummary": {
    "unreadCount": 2,
    "latestPreview": "你的学历认证已通过",
    "latestTime": "2026-08-12 09:40:00"
  },
  "systemSummary": {
    "unreadCount": 4,
    "latestPreview": "你们已成功匹配",
    "latestTime": "2026-08-12 09:30:00"
  },
  "conversationPage": {
    "list": [{
      "conversationNo": "CV-1000182600001",
      "peerUser": {
        "userId": 108,
        "nickname": "筱脑虎",
        "avatarUrl": "https://cdn.example.com/avatar/108.jpg",
        "profileAvailable": true
      },
      "unreadCount": 1,
      "lastMessage": {
        "messageNo": "TIM-202608120001",
        "messageType": "text",
        "direction": "incoming",
        "preview": "周末有空一起吃饭吗？",
        "messageTime": "2026-08-12 10:08:00",
        "sendStatus": "sent"
      }
    }],
    "nextCursor": "opaque-cursor",
    "hasMore": true
  }
}
```

说明：

- `whisperSummary.pendingCount` 是收到的全部有效待处理数，是否已曝光不影响待处理数；`whisperUnreadCount` 只统计未曝光记录。
- `likesMeSummary` 复用 PRD-02 有效关系、VIP/解锁展示状态和新喜欢游标。
- `conversationPage` 直接游标分页全部有效普通私信，不再限制最近 3 条，也不提供“查看全部”。
- `lastMessage.preview` 最多返回 50 个 Unicode 字符的单行短摘要，不是聊天历史或全文接口。
- 消息 Tab 总未读直接使用平台返回的 `messageUnreadCount`，不得与 TIM 全局未读重复相加。
- 首页和会话分页不查询或返回 TIM 映射与详情态权限；点击列表行后，以 `conversationNo` 查询会话详情。

#### 9.1.2 私信会话

```json
{
  "conversationNo": "CV202607020001",
  "timConversationId": "C2Ctu_7Fx3A9",
  "conversationStatus": "active",
  "canEnterConversation": true,
  "canSend": true,
  "sendBlockReason": null,
  "protectStatus": {
    "enabled": true,
    "waitingFemaleReply": false,
    "expireTime": "2026-07-05 10:20:00"
  }
}
```

`timConversationId` 使用 TIM SDK 标准格式 `C2C${userID}`。若 UserID 为 `tu_7Fx3A9`，则会话编号为
`C2Ctu_7Fx3A9`，不得在 `C2C` 与 UserID 之间再增加分隔符。

说明：平台会话详情不返回普通私信正文、历史或本地已读游标；小程序使用 `timConversationId`
调用 LiteChat 拉取历史、发送文本并设置会话已读。

#### 9.1.3 聊天内容举报请求

私信内容举报示例：

```json
{
  "targetType": "chat",
  "targetId": "CV202607020001",
  "reasonCode": "harassment",
  "context": {
    "sourceType": "private_chat",
    "conversationNo": "CV202607020001",
    "timConversationId": "C2Ctu_7Fx3A9",
    "messageNo": "MSG202607020088",
    "timMessageId": "144115233553",
    "timMsgKey": "TIM-MSG-KEY-01"
  }
}
```

悄悄话内容举报时，`targetId` 与 `context.whisperNo` 均使用当前 `whisperNo`，`sourceType=whisper`，
并携带该自定义消息的 TIM 定位编号。客户端不得上传被举报用户 ID 或拼接消息正文；服务端按
`M03-RULE-report-context` 校验映射并固化最小必要证据。举报请求调用平台接口，不向 TIM 发送消息。

#### 9.1.4 通知中心

```json
{
  "total": 12,
  "list": [
    {
      "noticeNo": "NTF202607020001",
      "noticeType": "governance",
      "bizType": "report_result",
      "title": "举报处理结果",
      "content": "你的举报已处理，感谢你帮助维护社区环境。",
      "readStatus": "unread",
      "jumpType": "none",
      "jumpValue": null,
      "createdTime": "2026-07-02 09:00:00"
    }
  ],
  "readAck": {
    "endpoint": "/miniapp/message/system-messages/read-batch",
    "noticeNos": ["NTF202607020001"]
  }
}
```

---

## 10. 集中异常与边界场景

| 场景 | 处理口径 | 关联规则 |
|------|----------|----------|
| 未完成三重认证或账号受限进入消息 Tab | 仅展示认证引导及与本人直接相关的安全、处罚、申诉系统消息；不返回真实用户私信/悄悄话内容 | `M03-RULE-message-tab-scope` |
| 未匹配成功尝试普通私信 | 拦截发送，提示相互喜欢后才能聊天 | `M03-RULE-private-chat-open` |
| 悄悄话发送成功但有效期内未回复 | 独立申请保持 `pending`，不创建会话、不自动转普通私信 | `M03-SM-whisper` |
| 同一对象上一条悄悄话未处理 | 不允许重复发送新的悄悄话 | `M03-RULE-whisper-repeat-limit` |
| 悄悄话到期未回复 | 后台自动结束，从到期时间起进入 7 天冷却 | `M03-RULE-whisper-expire` |
| 悄悄话回复任一步骤失败 | 回复、匹配、会话创建全部回滚，申请仍为 `pending`，不向双方展示不完整结果 | `M03-RULE-whisper-reply-atomic` |
| 悄悄话回复成功 | 原子创建/复用匹配与唯一私信会话，双方申请列表移除，原申请和回复作为会话开场上下文，发送方新增 1 条私信未读 | `M03-EVT-whisper-replied`、`M03-RULE-whisper-to-conversation` |
| 男性保护期内先发消息 | 输入框置灰，展示女性保护提示 | `M03-RULE-female-protection` |
| 女性保护期内女方发送真实消息 | 男性侧立即恢复发送能力 | `M03-RULE-female-protection` |
| 任一方账号被冻结、封禁或注销 | 会话置为失效态，历史保留，不可继续发送 | `M03-RULE-conversation-invalid` |
| 非会话/悄悄话参与方尝试举报 | 拒绝提交，不返回聊天内容或参与方信息 | `M03-RULE-report-handoff` |
| 用户举报本人发送内容或官方/系统消息 | 不展示入口；绕过前端提交时服务端拒绝 | `M03-RULE-report-handoff` |
| 会话已失效或悄悄话已过期，但历史仍可见 | 保留聊天内容举报入口，按当前可见历史生成举报工单 | `M03-RULE-report-handoff` |
| 同一聊天对象已有待处理/处理中举报 | 不新增工单，提示“你的举报已提交，请等待处理” | `M05-RULE-report-idempotency` |
| 聊天举报处理为封禁或禁言 | 后台处罚联动会话失效或发送能力受限，生成站内通知 | `M03-RULE-report-handoff` |
| 微信订阅消息未授权 | 不发外部提醒，站内通知照常落库、计入未读 | `M03-RULE-notification-subscribe` |
| 解除匹配、任一方账号冻结/封禁/注销 | 会话移出正常列表并禁止发送；保留只读安全记录和举报入口，普通内容按 180 天隔离留存处理 | `M03-RULE-conversation-invalid` |
| 拉黑并举报时举报提交失败 | 拉黑结果保持生效，提示举报提交失败并允许按同一幂等键重试 | `M03-RULE-report-handoff` |
| 对方主页已不可访问但需举报 | 从历史安全记录发起举报，不开放对方最新资料或在线状态 | `M03-RULE-conversation-invalid` |
| 系统消息只加载首批 20 条 | 仅将成功曝光的首批 ID 置已读，后续未加载消息保持未读 | `M03-SM-notification-read` |
| 重复收到上游业务事件 | 按 `producerEventId + receiverUserId + bizType` 幂等，不重复生成系统消息 | `M03-CMD-system-message-create` |
| 微信订阅消息未授权或发送失败 | 不发外部提醒，站内系统消息照常落库、计入未读 | `M03-RULE-notification-subscribe` |
| 安全总开关关闭 | 所有新私信和悄悄话发送即时失败；历史消息仍按权限可读，不改写对象状态 | `M03-RULE-config-snapshot` |

---

## 11. 首版研发分级

### 11.1 必做

| 编号 | 能力 | 说明 |
|------|------|------|
| M03-DEV-P0-01 | 消息首页与私信分页 | 双入口卡片、三类固定摘要、同页有效私信游标分页、最新消息状态和统一未读汇总 |
| M03-DEV-P0-02 | 私信对话页 | 文本消息、历史分页、已读、`canEnterConversation`/`canSend`、失败重试 |
| M03-DEV-P0-03 | 悄悄话独立申请链路 | 已发/已收列表、待回复、原子回复、到期、冷却、扣费补偿和匹配事件 |
| M03-DEV-P0-04 | 官方助手 | 固定入口、低频帮助/安全引导、版本去重、不可回复 |
| M03-DEV-P0-05 | 系统消息全文流 | 五类消息、批次已读、幂等事件消费、合法行动跳转，无独立详情页 |
| M03-DEV-P0-06 | 女性保护与配置快照 | 会话可进入、男性侧禁发、女方回复解锁、新对象配置版本快照 |
| M03-DEV-P0-07 | 举报、拉黑与安全记录 | 会话菜单、消息长按、PRD-05 工单、关系失效和主页不可用兜底 |
| M03-DEV-P0-08 | 后台最小权限与留存 | 仅元数据查询、案件上下文冻结证据查看、全量审计、无正文导出、分类清理任务 |
| M03-DEV-P0-09 | 全局安全总开关 | 即时阻断新私信与悄悄话，保留历史读取与审计 |

### 11.2 可延后

| 编号 | 能力 | 本期处理方式 |
|------|------|--------------|
| M03-DEV-P2-01 | 图片消息 | 输入入口隐藏 |
| M03-DEV-P2-02 | 语音消息 | 输入入口隐藏 |
| M03-DEV-P2-03 | 消息撤回 | 不展示撤回操作 |
| M03-DEV-P2-04 | 输入中状态 | 不展示 |
| M03-DEV-P2-05 | 用户自助通知管理页 | 设置页不展示通知设置入口 |
| M03-DEV-P2-06 | 独立 IM 运营工作台 | 后台不建菜单 |
