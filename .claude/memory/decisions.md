# Architecture Decisions

Record significant design decisions using the ADR format below. Each entry is immutable — if a decision is revisited, append a new entry that supersedes the old one.

---

## YYYY-MM-DD: [Short descriptive title]

### Context
Why was this decision needed? What problem does it solve? What are the constraints?

### Options Considered
1. **Option A** — Pros / Cons
2. **Option B** — Pros / Cons

### Decision
Chosen option and the rationale behind it.

### Consequences
- Positive: what becomes easier
- Negative: what becomes harder
- Migration: what existing code needs to change

---

<!-- Template for new entries:
##

### Context

### Options Considered

### Decision

### Consequences
-->

## 2026-05-29: PRD-05 首批采用社区主链路闭环方案

### Context
PRD-05 需求覆盖朋友内容、社区动态、评论、关注、举报、后台审核、通知、机审与配置，但当前仓库尚未落地 PRD-01 三项认证和 PRD-03 通知中心，若强行做“全量闭环”会导致范围失控或伪实现。

### Options Considered
1. **只做文档和配置预留** — 优点是交付快；缺点是无法支撑真实开发联调。
2. **首批闭环方案** — 优点是能落真实社区表、接口、后台审核页；缺点是认证/通知只能降级。
3. **直接做全量社区系统** — 优点是功能完整；缺点是依赖过多，超出当前仓库基础能力。

### Decision
选择 **首批闭环方案**。本期实现社区动态/诚意贴、评论、点赞、关注、举报、后台审核和社区轻配置；对三项认证、通知中心、微信机审仅保留配置契约和接入点，不伪造完整实现。

### Consequences
- Positive: 社区主链路、后台审核和测试资产可真实落地。
- Negative: 认证准入与互动通知无法在本期完全验证。
- Migration: 后续 PRD-01/03 落地后，只需在统一准入校验和事务后通知生产处补接，不需推翻接口。

## 2026-07-13: 聊天基础设施采用腾讯云 IM，页面采用项目自绘

### Context

PRD-03 需要普通私信、悄悄话、官方消息、历史消息、未读、已读、举报和后台追溯能力。当前小程序使用 Taro 4.1.9，聊天列表仍是静态页面，尚未选择实时通信基础设施。腾讯云 IM 可以提供小程序 SDK、消息漫游、单聊回调和服务端 API，但业务匹配、认证、女性保护、扣费和处罚不属于 IM 基础能力。

### Options Considered

1. **腾讯云 IM + 无 UI SDK + 项目自绘 UI** — 保留腾讯云长连接和消息基础设施，同时完整匹配现有蓝湖视觉；需要自行实现聊天页面和自定义消息渲染。
2. **腾讯云 IM + TUIKit** — 基础会话和聊天 UI 交付更快，但与当前 Taro、设计稿和复杂业务状态存在兼容及定制成本，需要先做 POC。
3. **自建 WebSocket 和消息服务** — 自主性最高，但需要重复建设连接、漫游、未读、回调、扩容和风控能力。

### Decision

选择 **腾讯云 IM + 无 UI SDK + 项目自绘 UI**。后端使用 UserSig、IM REST API 和单聊消息前/后回调，把腾讯云 IM 作为实时消息基础设施；本项目后端保留业务状态和审计权威。TUIKit 暂不作为最终页面方案，除非 Taro 真机 POC 通过且其定制成本可接受。

### Consequences

- Positive: 不自建 IM 基础设施，现有小程序视觉和 PRD 状态可以继续由 Taro 组件实现。
- Negative: 需要自行实现气泡、消息列表、失败重试、悄悄话卡片和状态降级；需要维护腾讯云回调和本地消息副本。
- Migration: 先完成 Taro + 无 UI SDK POC，再添加 IM 账号、UserSig、回调、业务表和消息页面；任何 SecretKey 只通过后端私有环境变量提供。

## 2026-07-13: 聊天客户端 SDK 锁定 LiteChat V4 标准版

### Context

上一条决策确定采用腾讯云 IM 无 UI SDK，但未锁定具体 npm 包、功能档位和发送边界。PRD-03 需要会话列表、历史消息、未读和已读能力，基础版 LiteChat 不满足；专业版增加的好友、关注和黑名单能力与本项目已有业务模型重叠。普通文本若同时调用后端发送接口和客户端 SDK，会形成双发送链路和状态不一致。

### Options Considered

1. **`@tencentcloud/lite-chat/basic`** — 包体积较小，但缺少会话、历史和已读能力。
2. **`@tencentcloud/lite-chat` 标准版** — 覆盖会话、历史、未读、已读和自定义消息，能力边界与当前需求匹配。
3. **`@tencentcloud/lite-chat/professional`** — 功能更多，但社交关系能力重复且增加包体积。
4. **V3 `@tencentcloud/chat` 或 TUIKit** — V3 不是后续能力主线；TUIKit 不满足当前 Taro 高还原自绘要求。

### Decision

选择 **LiteChat V4 标准版默认入口 `@tencentcloud/lite-chat`**，POC 固定版本为 `4.4.1`。小程序不接入 TUIKit，UI 由 Taro 自绘。普通文本只通过 LiteChat 直发并由单聊消息前回调最终裁决；悄悄话和官方消息由后端事务、Outbox 和 IM REST API 编排。

### Consequences

- Positive: 会话、历史、未读和已读能力一次覆盖，避免自建实时通信和双发送链路。
- Negative: 标准版会增加小程序包体，且 Taro 构建、真机生命周期和 SDK 升级都必须经过 POC 门禁。
- Migration: 先以 4.4.1 完成 POC 并固定锁文件，再实现客户端适配层、版本化消息协议、统一回调入口和 Outbox；后续升级不得自动跟随 `latest`。
