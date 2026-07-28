# PRD-07 推广裂变与邀请奖励重构技术方案

> 日期：2026-07-27
> 状态：实施版
> 适用范围：`backend/`、`frontend/`、`miniapp/`、推广模块数据库与测试资产
> 结论：保留项目六层架构、通用数据访问组件和后台基础 UI；推广领域模型、接口、页面和测试按最新版 PRD 与 Demo 重写。

## 0. 结论先行

现有实现不适合继续以“补字段、改文案”的方式演进。旧代码围绕关系状态、冻结复核、风控、素材管理、代理多状态和打款状态构建，而最新版 PRD 已明确删除这些概念，并新增规则版本快照、阶梯精确命中、奖励失败补偿、永久代理二维码和月度两态结算。

本次选择“保留工程骨架、重写领域实现”的平衡方案：

| 资产 | 处理 |
|---|---|
| `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` 六层结构 | 保留 |
| `BaseEntity`、`R<T>`、RBAC、分页、后台通用组件、请求封装 | 保留 |
| promotion 旧实体字段、枚举、Service 业务逻辑、旧接口兼容路由 | 删除并重写 |
| 后台 1459 行 `PromotionManagement.tsx` | 拆分重写 |
| 小程序旧邀请码 Service | 删除并重写 |
| 冻结、无效、风险、素材页、独立详情路由、代理分组、已打款状态 | 从运行态删除 |
| 现有测试用例、L1、E2E、测试报告 | 全量重写 |

该方案比整体删除模块从零搭建更稳，因为数据访问、权限、响应封装和基础 UI 已经过项目验证；又比在旧业务模型上打补丁更可靠，因为所有核心状态和约束都从最新版公共定义重新推导。

## 1. 依据与解释优先级

### 1.1 单一事实源

1. `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/PRD-07_模块公共定义.md`
2. 同目录移动端、管理后台模块 PRD 与页面规格
3. `docs/静态Demo/07-推广裂变与邀请奖励/`
4. `TEAM_STANDARDS.md` 与仓库既有架构
5. 现有 promotion 代码，仅作为迁移输入，不作为业务定义

当旧技术方案、旧测试或旧代码与最新版 PRD 冲突时，以 1～3 为准。接口外部草案中的 `/api`、`/admin/api` 由网关/请求层映射；仓库 Controller 继续遵守 `/miniapp/**`、`/admin/**` 实际前缀。

### 1.2 本期固定口径

| 项 | 实施口径 |
|---|---|
| 邀请来源 | 仅 `normal_user`、`campus_agent` |
| 成功邀请 | 新用户完成注册并建立唯一关系 |
| 邀请关系 | 永久有效、无状态、不可覆盖、不可人工失效 |
| 普通奖励事件 | `register_reward`、`profile_complete_reward`、`verify_complete_reward`、`first_vip_reward`、`first_coin_recharge_reward`、`ladder_bonus` |
| 注册奖励 | 普通邀请和代理均固定启用，仅金额可改 |
| 普通奖励状态 | `pending`、`success`、`failed` |
| 自动重试 | 首次失败后 5 分钟、30 分钟、2 小时，最多 3 次 |
| 代理状态 | `enabled`、`disabled` |
| 代理结算 | 每月 1 日 01:00（Asia/Shanghai）生成上一个自然月，`pending_confirm -> confirmed` |
| 金额单位 | 普通邀请为千寻币整数；代理奖金为人民币元，最多两位小数 |
| 管理端运行态 | 5 个菜单页、2 个详情抽屉、1 个代理二维码弹窗 |
| 移动端运行态 | 邀请首页、邀请记录、邀请规则 H5 |

## 2. 现状差异与可复用性

### 2.1 后端

| 领域 | 当前实现 | 新版要求 | 结论 |
|---|---|---|---|
| 关系 | `registered/profile_completed/verify_success/frozen/invalid` | 无状态、永久唯一 | 重写实体、查询与接口 |
| 来源 | 兼容 `user_qr/agent_qr` | 仅正式两值，代理优先 | 删除旧值兼容 |
| 奖励 | 仅三类事件，创建 `pending` 后无真实发放 | 六类流水、真实入账、自动/人工重试 | 重写核心 Service |
| 阶梯 | 区间 `min/max` | 累计人数恰好命中阈值、独立流水 | 重写表与算法 |
| 规则 | 多项过时配置，无可靠不可变版本 | 双来源、五事件、动态阶梯、发布快照 | 重写规则模型 |
| 代理 | normal/paused/terminated、规则组 | enabled/disabled、统一当前规则 | 重写状态与字段 |
| 二维码 | 多版本、素材页、可停用 | 每代理一张永久复用二维码 | 收敛到代理列表 |
| 结算 | unsettled/confirmed/paid/cancelled | pending_confirm/confirmed | 重写状态机和任务 |
| 跨模块触发 | 无生产调用 | 注册、资料、认证、首次会员、首次充值 | 新增统一事件收件箱 |

现有 Entity/DAO/Mapper 数量完整，但字段语义已错位；只保留六层组织形式和可用查询写法，不保留旧领域 API。

### 2.2 管理后台

当前一个单体组件承载 7 个菜单和 2 个独立详情路由，仍展示风控、冻结、素材、代理规则组和打款操作。新版必须拆成 5 个页面，详情在当前页抽屉打开，关闭后保留筛选、分页和滚动上下文。

### 2.3 小程序

当前只有“推荐给好友”入口卡片，点击提示“即将开放”；旧 Service 仍请求邀请码接口。三个生产页面、分享归因、规则 H5 降级均需新增。

### 2.4 测试与环境

现有 promotion 测试验证的是旧模型，不可迁移复用。方案调研时本机前后端端口未监听、远端 MySQL/Redis 连接超时且 `application-dev.yml` 缺失；实施开始后已建立隔离的本地开发库、启动本机 Redis，并补充仅本地生效且不入库的 `application-dev.yml`。真实浏览器验收仍须以服务成功启动、新迁移完成和受控 fixture 就绪为前提。

## 3. 方案比较

| 方案 | 做法 | 优点 | 风险/成本 | 结论 |
|---|---|---|---|---|
| 最小补丁 | 保留旧表、旧 Service、旧单页，条件隐藏废弃能力 | 初期改动少 | 状态机互相污染；测试难以证明废弃能力不可达；继续累积兼容债务 | 不选 |
| 平衡重构 | 保留工程骨架，重写规则、关系、奖励、代理、结算和三端页面；一次迁移旧测试数据 | 业务边界清晰；可测试；改动可控 | 需要集中修改三个工程 | **选择** |
| 全新子系统 | 新模块名、新表、新接口、消息中间件、独立导出中心 | 隔离最彻底 | 超出单体架构和一期范围；引入部署与运维复杂度 | 不选 |

平衡方案满足 YAGNI：不引入 MQ、风控引擎、自动打款或独立 BI；通过数据库事件收件箱和定时任务保证关键事件可恢复。

## 4. 总体架构

```text
管理后台 React                     小程序 Taro
      │                                │
      ├── /admin/promotion/**           ├── /miniapp/promotion/**
      │                                │
Admin Controller                  Miniapp Controller
      │                                │
Admin Service                    Miniapp Query Service
      └──────────────┬─────────────────┘
                     │
              common 领域服务
     ┌───────────────┼───────────────────────┐
     │               │                       │
归因/关系服务    规则与奖励服务        代理奖金/结算服务
     │               │                       │
     └───────────────┴───────────────────────┘
       DAO -> DAOImpl -> Mapper -> MySQL
                    │
                 Redis
         仅缓存首页/H5元数据，不作事实源
```

`admin/` 和 `miniapp/` 不互相依赖。跨端复用的归因、规则、奖励发放、代理奖金、结算和任务处理全部放入 `common/`。

## 5. 关键业务链路与一致性

### 5.1 来源记录与注册绑定

```text
打开普通分享链接/代理二维码
  -> 匿名 POST source-traces，生成不可猜测 traceNo
  -> 客户端保存本次 traceNo
  -> 新用户登录注册请求携带 promotionTraceNos
  -> 主注册事务写 app_user + promotion_event_inbox(register)
  -> 事件处理器选择有效来源：campus_agent 优先，否则取最近 normal_user
  -> 校验新用户/自邀/重复关系/代理启用状态
  -> INSERT 唯一永久关系
  -> 生成完成注册奖励/代理奖金
  -> 若累计人数恰好命中档位，再生成独立 ladder_bonus
```

注册接口不再暴露由客户端登录后主动调用的“绑定关系”写接口，避免老用户伪造首次注册。旧 `/bind` 路由删除。弱网重复注册或事件重放由 `invitee_id` 唯一键返回同一关系结果。

### 5.2 事件收件箱

新增 `promotion_event_inbox`，承接注册、资料、认证、首次会员、首次充值五类事实事件。业务模块在自身成功事务中写入事件记录，推广处理器异步消费：

| 字段 | 作用 |
|---|---|
| `event_key` | 全局唯一幂等键，如 `register:{userId}`、`payment:{orderNo}` |
| `event_type` | 对应五类正式事件 |
| `user_id` / `biz_no` | 被邀请人和主业务编号 |
| `payload_json` | 注册来源 traceNo 等必要上下文，不存敏感明文 |
| `rule_id` | 非注册事件发生时锁定的规则版本；注册事件保存普通/代理两个候选版本 |
| `status` | `pending/processing/success/failed` |
| `retry_count/next_retry_time/last_error` | 技术补偿 |

选择数据库收件箱而不是进程内事件的原因：注册或支付提交后即使进程重启，事件仍可恢复；同库单体不需要引入 MQ。事件在主业务事务中锁定规则版本，消费延迟时不得改用最新配置。事务提交后监听器立即尝试处理，Job 扫描作为兜底；推广消费失败只改变收件箱状态，不逆向回滚已完成的注册、认证或支付。

### 5.3 普通奖励发放

1. 先创建 `pending` 奖励流水并保存规则版本、事件名、金额、阶梯阈值快照。
2. `PromotionCoinGrantService` 对奖励行加锁；只有 `pending/failed` 可执行。
3. 在同一事务内原子增加邀请人千寻币余额、写 `UserCoinLog`、将奖励改为 `success`。
4. 任一步失败则事务回滚资产变更，外层将流水改为 `failed` 并计算下一次重试时间。
5. 自动和人工重试均使用原奖励单与原幂等键，不新建记录。
6. 金额为 0 时仍写入 0 值资产流水后标记成功，确保 `success` 始终满足“已写资产流水”的统一语义。

### 5.4 阶梯并发

关系建立成功后通过 `promotion_invite_counter` 对邀请对象加数据库互斥：

- 普通邀请锁定邀请人维度；
- 代理邀请锁定代理维度；
- 原子将 `success_count + 1` 并取得本次新计数；
- 仅在人数恰好等于当前已发布规则中的启用阈值时创建 `ladder_bonus`；
- 唯一键 `sourceType + rewardObjectId + ladderThreshold` 做最终防重。

规则发布后只影响新触发事件。历史奖励按快照展示，不追溯重算。

### 5.5 代理奖金与月度结算

代理来源不写千寻币资产，生成无独立状态的 `promotion_agent_bonus_log`。代理停用后：

- 旧二维码仍可打开小程序并记录点击；
- 不建立新的代理关系；
- 既有关系的后续事件不再生成新奖金。

每月 1 日 01:00（Asia/Shanghai）按代理汇总上一个自然月中 `settlement_id IS NULL` 的奖金明细；金额为 0 不建单。同一事务创建 `pending_confirm` 结算单并回填奖金明细的 `settlement_id`。唯一键 `agent_id + settlement_month` 保证任务重跑只有一张单。

确认结算使用条件更新 `pending_confirm -> confirmed`，记录确认人和时间。累计已发奖金定义为已确认结算单金额，不代表银行打款流水。

## 6. 领域模型

### 6.1 规则

| 表 | 职责 |
|---|---|
| `promotion_rule` | 一条已发布/历史规则版本头：来源、模式、版本、状态、发布人和时间 |
| `promotion_rule_event` | 五类基础事件的启用状态、金额和展示名快照 |
| `promotion_rule_tier` | 阶梯阈值、额外金额、启用状态 |
| `promotion_rule_current` | 每个来源一条当前版本指针与乐观锁版本 |

规则发布采用不可变版本：

- 客户端提交 `expectedVersion`，服务端锁定 `promotion_rule_current` 防止覆盖；
- 服务端强校验存在 `register_reward` 且 `enabled=true`；
- 普通金额为非负整数；
- 代理金额最多两位小数；
- 阶梯阈值为正整数、严格递增、不可重复；
- 阶梯模式至少一档，固定模式忽略并不发布阶梯；
- 一次事务插入新版本并将旧版本标记为 `superseded`。

### 6.2 关系

`promotion_source_trace` 保存匿名落地来源，不接受客户端直接传内部用户/代理 ID。普通分享的 `sourceToken` 解析为服务端预生成的原始 `trace_no`，代理分享的 `sourceToken` 解析为永久 `qr_token`，再由服务端复制出本次来源记录。客户端可传匿名 `visitorKey`；服务端以“来源类型 + 已解析来源对象 + visitorKey”生成不可逆 `request_key`。同一 `request_key` 重复或并发提交返回原记录，不重复累计代理点击；`visitorKey` 为空时每次生成新记录。停用代理的旧二维码仍可记录点击，但注册归因时不再选中。

`promotion_invite_relation` 只保存事实：

- `relation_no`
- `source_trace_id`
- `source_type`
- `inviter_id` 或 `agent_id`
- `invitee_id`
- `registered_at`

表中不再有 `status`、`frozen_before_status`、`invalid_reason`、风险或有效期字段。

`promotion_invite_counter` 以 `source_type + reward_object_id` 唯一，保存成功人数。它只负责并发下的精确计数和阶梯命中判定；真实关系仍是最终事实，可由关系表重建计数器。

### 6.3 普通奖励

`promotion_reward_log` 关键字段：

| 字段 | 说明 |
|---|---|
| `reward_no` | `IRW-yyyymmdd-xxxx` |
| `relation_id/inviter_id/invitee_id` | 关系与双方 |
| `event_type/event_label_snapshot` | 正式事件与动态阶梯名 |
| `rule_id/rule_version` | 触发时规则快照 |
| `ladder_threshold` | 仅阶梯事件 |
| `reward_coin` | 千寻币整数 |
| `status` | `pending/success/failed` |
| `idempotency_key` | 全局唯一 |
| `retry_count/next_retry_time/last_retry_time` | 补偿进度 |
| `failure_reason` | 最近失败原因 |
| `coin_log_id/success_time` | 入账证据 |

`app_user_coin_log` 增加业务幂等键唯一约束。资产发放事务同时锁定奖励行与用户资产行；奖励状态、余额和资产流水必须同事务提交，不能只依靠奖励表状态防止并发双发。

### 6.4 代理

| 表 | 关键规则 |
|---|---|
| `promotion_agent` | `agent_no` 唯一；名称、学校、校区必填；联系电话沿用项目现有 PII 存储规范，查询默认脱敏且日志不回显；状态仅两值 |
| `promotion_agent_qr_code` | `agent_id` 唯一，一代理一张永久二维码；不维护启停/版本历史 |
| `promotion_agent_bonus_log` | 奖金快照、`settlement_id` 可空，无独立业务状态 |
| `promo_agent_stat` | 可重算快照：点击、注册、应发、已确认、待结算 |
| `promotion_agent_settlement` | 自然月、金额快照、两态、确认信息 |

### 6.5 审计与导出

`promotion_audit_log` 记录规则发布、代理新增/修改/启停、二维码生成、奖励人工重试、结算确认和导出。前后值使用 JSON；不记录密码、Token、完整手机号或二维码私密参数。

当前仓库尚无可复用、可轮换密钥的通用 PII 字段加密器，因此本次不以数据库字段注释冒充“已加密”。一期硬门禁是：所有查询 VO 默认只返回 `contactPhoneMasked`；仅具备 `promotion:agent:sensitive` 的请求可额外返回完整 `contactPhone`，原始联系电话写入、读取均不得进入审计、异常或应用日志。导出同样按敏感权限决定是否保留原文。字段级加密作为全局 PII 治理统一演进，不能在 promotion 内私设固定密钥。

新增 `promotion_export_task` 记录页面、筛选条件、状态、文件名、行数、创建人和完成时间。导出服务复用后台现有 `ExportTaskVO` 交互，后台创建任务后轮询并下载；测试环境可由同步执行器立即完成，生产使用线程池异步执行，接口契约一致。

## 7. 数据库迁移

新增迁移：`backend/docs/sql/migration-20260727-prd07-promotion-rewrite.sql`。

迁移策略基于 PRD 已确认“尚未生产上线”：

1. 将冲突的旧 promotion 表重命名为 `_legacy_20260727` 只读留档，仅迁移可证明有效的代理基础资料与可复用永久二维码。
2. 新建规则事件、事件收件箱、导出任务等表。
3. 按本方案重建关系、奖励、二维码、奖金、结算表结构。
4. 旧冻结、无效、风险、paid/cancelled、素材版本测试数据不迁移。
5. 重写菜单和权限种子为 5 个菜单页面。
6. 更新 `schema-promotion.sql` 为新装环境的唯一标准结构。

关键唯一键：

| 约束 | 唯一键 |
|---|---|
| 被邀请人唯一关系 | `uk_invitee_id(invitee_id)` |
| 规则版本 | `uk_source_version(source_type, version_no)` |
| 当前规则 | `uk_rule_current_source(source_type)` |
| 来源请求幂等 | `uk_trace_request(request_key)`；允许 `request_key` 为空 |
| 邀请计数器 | `uk_invite_counter(source_type, reward_object_id)` |
| 基础奖励 | `uk_reward_idempotency(idempotency_key)` |
| 阶梯奖励 | 同上，键值包含来源对象与阈值 |
| 代理二维码 | `uk_agent_qr(agent_id)`、`uk_qr_token(qr_token)` |
| 代理奖金 | `uk_bonus_idempotency(idempotency_key)` |
| 月度结算 | `uk_agent_month(agent_id, settlement_month)` |
| 事件收件箱 | `uk_event_key(event_key)` |

所有业务表继承 `BaseEntity` 审计字段与逻辑删除；事实关系和财务类流水禁止业务侧物理删除。

## 8. 后端接口

### 8.1 管理后台

| 方法 | 实际路径 | 权限 | 返回 |
|---|---|---|---|
| GET | `/admin/promotion/rules/current` | `promotion:rule:view` | `R<PromotionRuleConfigVO>` |
| POST | `/admin/promotion/rules/publish` | 按 `sourceType` 校验普通/代理发布权限 | `R<PromotionRuleConfigVO>` |
| GET | `/admin/promotion/relations/list` | `promotion:relation:view` | `R<Page<PromotionRelationListItemVO>>` |
| GET | `/admin/promotion/relations/{relationNo}` | `promotion:relation:view` | `R<PromotionRelationDetailVO>` |
| POST | `/admin/promotion/relations/export` | `promotion:relation:export` | `R<ExportTaskVO>` |
| GET | `/admin/promotion/rewards/list` | `promotion:reward:view` | `R<Page<PromotionRewardListItemVO>>` |
| POST | `/admin/promotion/rewards/{rewardNo}/retry` | `promotion:reward:retry` | `R<PromotionRewardListItemVO>` |
| POST | `/admin/promotion/rewards/export` | `promotion:reward:export` | `R<ExportTaskVO>` |
| GET | `/admin/promotion/agents/list` | `promotion:agent:view` | `R<Page<PromotionAgentListItemVO>>` |
| POST | `/admin/promotion/agents` | `promotion:agent:edit` | `R<PromotionAgentListItemVO>` |
| PUT | `/admin/promotion/agents/{agentNo}` | `promotion:agent:edit` | `R<PromotionAgentListItemVO>` |
| PUT | `/admin/promotion/agents/{agentNo}/status` | `promotion:agent:edit` | `R<PromotionAgentListItemVO>` |
| GET | `/admin/promotion/agents/{agentNo}` | `promotion:agent:view` | `R<PromotionAgentDetailVO>` |
| POST | `/admin/promotion/agents/{agentNo}/qr-code` | `promotion:agent:qrcode` | `R<PromotionAgentQrCodeVO>` |
| POST | `/admin/promotion/agents/export` | `promotion:agent:export` | `R<ExportTaskVO>` |
| GET | `/admin/promotion/settlements/list` | `promotion:settlement:view` | `R<Page<PromotionSettlementListItemVO>>` |
| POST | `/admin/promotion/settlements/{settlementNo}/confirm` | `promotion:settlement:confirm` | `R<PromotionSettlementListItemVO>` |
| POST | `/admin/promotion/settlements/export` | `promotion:settlement:export` | `R<ExportTaskVO>` |
| GET | `/admin/promotion/exports/{taskNo}` | 校验任务所属页面的导出权限及创建人/超管身份 | `R<ExportTaskVO>` |
| GET | `/admin/promotion/exports/{taskNo}/download` | 同上 | CSV/XLSX 二进制响应 |

旧 `/rules/list` CRUD、`/invite-relations/*/unfreeze`、`invalid`、`/rewards/frozen`、`approve/reject`、`/materials/**`、`/settlements/*/paid` 不保留兼容映射，访问应为 404。

### 8.2 小程序

| 方法 | 实际路径 | 鉴权 | 返回 |
|---|---|---|---|
| POST | `/miniapp/promotion/source-traces` | 匿名可用 | `R<InviteSourceTraceVO>` |
| GET | `/miniapp/promotion/invite/home` | 登录 | `R<InviteHomeVO>` |
| GET | `/miniapp/promotion/invite/records` | 登录 | `R<Page<InviteRecordVO>>` |
| GET | `/miniapp/promotion/invite/rules` | 登录 | `R<InviteRulesBusinessVO>` |
| GET | `/miniapp/app/h5-content/invite_rules` | 登录 | PRD-06 H5 元数据与可缓存快照 |

邀请首页返回：

- 当前完成注册奖励；
- 成功人数、已发放奖励合计；
- 全部启用阶梯及达成状态；
- 最近三条按注册时间倒序的邀请；
- 分享标题、路径、链接和匿名 trace 创建参数。

邀请记录按奖励聚合状态筛选 `pending/success/failed`；每条关系返回奖励明细，阶梯事件展示具体阈值。

## 9. 后端类设计

### 9.1 common

| 类 | 职责 |
|---|---|
| `PromotionRuleDomainService` | 规则校验、不可变版本发布、当前指针查询 |
| `PromotionAttributionService` | 来源记录、代理优先、注册唯一绑定 |
| `PromotionEventInboxService` | 事件入箱、领取、状态和恢复 |
| `PromotionRewardDomainService` | 普通奖励生成、阶梯精确命中 |
| `PromotionCoinGrantService` | 千寻币原子入账与幂等重试 |
| `PromotionAgentBonusService` | 消费统一事件收件箱、生成奖金并刷新统计 |
| `PromotionSettlementDomainService` | 自然月生成与确认 |
| `PromotionExportService` | 异步导出与审计 |
| `PromotionRetryJob` | 奖励 5m/30m/2h 自动重试 |
| `PromotionEventInboxJob` | 处理主业务事件 |
| `PromotionSettlementJob` | 每月结算 |
| `PromotionStatRebuildJob` | 统计补偿，不作为事实源 |

### 9.2 admin

按五个页面拆为规则、关系、奖励、代理、结算五组 Controller/Service。Controller 只做鉴权、校验和精确 `R<T>` 返回；ServiceImpl 组合 common 领域服务与 DAO，不直接操作 Mapper。

### 9.3 miniapp

`PromotionInviteQueryService` 负责首页、记录和规则数据；来源记录由 common 归因服务完成。旧 `PromotionInviteEventService` 从 miniapp 删除，跨模块事件统一移到 common。

## 10. 跨 PRD 接入

| 事实 | 接入点 | 事件键 |
|---|---|---|
| 新用户注册 | `AuthMiniappServiceImpl` 创建用户成功事务；登录请求补 `promotionTraceNos` | `register:{userId}` |
| 头像认证通过 | `AppUserAuditServiceImpl` 的机审/人工审核首次进入头像通过态 | `profile:{userId}` |
| 实名与学历均通过 | 实名或学历首次通过后查询二者均有效再入箱 | `verify:{userId}` |
| 首次会员支付成功 | `PaymentServiceImpl` 首个成功 VIP 订单 | `first-vip:{orderNo}` |
| 首次千寻币充值成功 | `PaymentServiceImpl` 首个成功充值订单 | `first-coin:{orderNo}` |

事件入箱前先判断“首次”事实，最终仍由事件键、奖励幂等键和数据库唯一键防重。通知失败不回滚奖励；通知由成功/失败事件异步触发。

## 11. 管理后台前端

### 11.1 路由

保留五条运行态路由：

- `/promotion/rules`
- `/promotion/relations`
- `/promotion/rewards`
- `/promotion/agents`
- `/promotion/settlements`

删除冻结、素材以及两个 `/:id` 独立详情路由。详情抽屉通过组件状态打开，不改变 URL 和列表上下文。

### 11.2 文件组织

```text
frontend/src/
├── api/promotion.ts
├── types/promotion.ts
├── pages/promotion/
│   ├── PromotionRulesPage.tsx
│   ├── PromotionRelationsPage.tsx
│   ├── PromotionRewardsPage.tsx
│   ├── PromotionAgentsPage.tsx
│   └── PromotionSettlementsPage.tsx
├── features/promotion/
│   ├── rules/
│   ├── relations/RelationDetailDrawer.tsx
│   ├── rewards/RewardRetryDialog.tsx
│   ├── agents/AgentDetailDrawer.tsx
│   ├── agents/AgentQrDialog.tsx
│   └── settlements/SettlementConfirmDialog.tsx
└── components/ui/drawer.tsx
```

规则页只有“普通邀请”“推广员”两个 Tab。完成注册开关始终选中、禁用并显示“固定开启”；金额仍可编辑。固定/阶梯模式联动动态档位编辑器，发布必须二次确认。

管理端视觉继续使用生产 `AdminLayout`、Tailwind 蓝白色系和既有表格/按钮，不复制静态 Demo 演示外壳。1280px 下表格在内容区内部滚动，根页面无横向溢出。

### 11.3 二维码

弹窗展示服务端生成或返回的真实图片。保存使用 Blob 下载 PNG；复制使用 Clipboard API 写图片，权限拒绝或浏览器不支持时明确提示使用保存，不伪造成功。

## 12. 小程序前端

新增 `pages/promotion` 分包：

```text
pages/promotion/
├── invite-home.tsx
├── invite-home.scss
├── invite-records.tsx
├── invite-records.scss
├── invite-rules.tsx
└── shared/
```

“我的-推荐给好友”入口改为登录守卫后跳转邀请首页。

### 12.1 邀请首页

唯一高保真视觉基线为 `设计基线/PRD-07-01-移动端邀请首页-UI基线.png`（674×1510）。实现使用真实 Taro 组件，不将整页图或交互控件烘焙进图片。

核心 Token：

| 用途 | Token |
|---|---|
| 页面背景 | `#9a67ee -> #8f62e5 -> #7450d8` |
| Hero | `#ad76f2/#9764ed/#8058df` |
| CTA | `#9b6af0 -> #7242df`，48px 高，10px 圆角 |
| 标题 | `#6d22b4` |
| 奖励 | `#ff8a1f` |
| 卡片 | 17px 圆角、3px 浅紫边、紫色阴影 |

页面顺序固定为主视觉、注册奖励、邀请进度、最近三条邀请、规则摘要。阶梯由数组动态渲染，不写死 5/10/20 或金额。普通首页不得出现二维码、邀请码、保存二维码或千寻币用途区。

人物插画没有独立无损切图，实施阶段登记素材缺口；可临时使用已确认基线中裁出的纯装饰区域，但裁图不得包含文字、按钮或热区，并在最终视觉报告中保留缺口说明。

### 12.2 邀请记录

支持全部、待发放、已发放、发放失败四个筛选；下拉刷新、触底分页；关系卡片可展开基础和阶梯明细。页面覆盖加载、空、错误、失败业务态。

### 12.3 邀请规则 H5

仅缓存 URL 不等于缓存正文。为满足 PRD 的最近成功版本降级，PRD-06 内容接口需要返回同域安全 HTML 快照或版本化快照代理地址；小程序缓存版本号、更新时间和正文快照。当前版本失败：

1. 有缓存：展示缓存正文并明确弱提示；
2. 无缓存：展示重试、返回和联系客服；
3. 不在客户端硬编码完整规则冒充最新版本。

## 13. 权限与审计

| 页面/动作 | 权限码 |
|---|---|
| 查看规则 | `promotion:rule:view` |
| 发布普通规则 | `promotion:rule:normal:publish` |
| 发布代理规则 | `promotion:rule:agent:publish` |
| 查看/导出关系 | `promotion:relation:view/export` |
| 查看/重试/导出奖励 | `promotion:reward:view/retry/export` |
| 查看/编辑代理 | `promotion:agent:view/edit` |
| 查看代理敏感联系电话 | `promotion:agent:sensitive` |
| 代理二维码 | `promotion:agent:qrcode` |
| 导出代理 | `promotion:agent:export` |
| 查看/确认/导出结算 | `promotion:settlement:view/confirm/export` |

所有按钮显隐只是前端体验，后端必须使用 `@RequirePermission` 再校验。代理联系电话默认脱敏；完整查看需要项目现有敏感字段权限，且不可通过普通页面导出扩大权限。

## 14. 性能、调度与可观测性

- 列表默认 20、最大 100，禁止在 Service 循环逐条查用户或奖励。
- 关系/奖励列表使用聚合 Mapper 一次查询；代理统计读取可重算快照。
- 首页聚合接口目标 P95 < 500ms；规则可用 Redis 缓存，关系和奖励事实仍以 MySQL 为准。
- 任务日志只记录事件键、奖励单号、结算单号和错误摘要，不记录 Token、完整手机号或支付通知原文。
- 所有 Job 使用分布式锁或数据库抢占，单实例失败可恢复，多实例不重复执行。
- 时间统一用 `ZoneId.of("Asia/Shanghai")` 计算自然月边界。

## 15. 测试设计边界

新版 testcase 将只从 PRD 与 Demo 派生，并覆盖：

| 层级 | 重点 |
|---|---|
| L1 | 真实登录、五后台页面接口、小程序聚合接口、规则发布、人工重试、代理启停/二维码、结算确认、401/403、导出 |
| L2 | Controller 路由、`R<T>`、DTO 校验、权限注解、旧路由 404 |
| L3 | 来源优先、唯一关系、注册固定开启、规则版本、阶梯精确命中、资产原子入账、3 次补偿、代理停用、月度结算、并发幂等 |
| L4 | peter 账号页面登录，5 页/2 抽屉/二维码弹窗/二次确认/失败态；小程序 H5 三页与状态 |
| 视觉 | 邀请首页 375×812、414×896；后台 1440×900、1280×800 |

P0 不允许因“没有现成数据”跳过，应通过受控 fixture 创建。只有真实微信分享、scene、支付沙箱等确属外部条件的场景可在报告中记录阻塞，同时必须通过事件注入验证内部链路。

## 16. 实施文件范围

### 16.1 后端

- 重写 `backend/docs/sql/schema-promotion.sql`
- 新增 `backend/docs/sql/migration-20260727-prd07-promotion-rewrite.sql`
- 重写 promotion Entity、Enum、DAO、Mapper
- 重写 admin promotion Controller、DTO/VO、Service
- 重写 miniapp promotion Controller、DTO/VO、Service
- 新增 common 领域服务、事件收件箱与三个调度任务
- 修改注册、资料/认证和支付成功接入点
- 补充奖励资产流水枚举与 DAO 原子方法

### 16.2 管理后台

- 重写 `frontend/src/api/promotion.ts`
- 删除 `frontend/src/pages/promotion/PromotionManagement.tsx`
- 新增五个页面和共享抽屉/弹窗组件
- 修改 `frontend/src/router/index.tsx`

### 16.3 小程序

- 重写 `miniapp/src/services/promotion.ts`
- 新增 promotion 分包三页
- 修改 `miniapp/src/app.config.ts`
- 修改“我的”入口 hook
- 新增邀请首页样式、状态组件和必要装饰素材

### 16.4 测试与文档

- 重写 `docs/测试文档/推广裂变-testcase.md`
- 重写 `docs/测试文档/推广裂变-test-l1.sh`
- 重写 promotion L2/L3 测试
- 重写 `frontend/e2e-tests/tests/promotion.spec.ts`
- 执行后重写 `docs/测试文档/推广裂变-testreport.md`
- 新增实现计划 `docs/superpowers/plans/2026-07-27-prd07-promotion-rewrite.md`

## 17. 实施顺序与 TDD

1. 先写新版 testcase 和实现计划。
2. 规则值对象、校验和阶梯计算先写失败的 L3 测试，再实现。
3. 写关系绑定、来源优先和并发幂等测试，再实现数据模型和 Service。
4. 写奖励生成、资产发放、自动/人工重试测试，再接入资产 DAO。
5. 写代理、二维码、统计、月度结算测试，再实现任务。
6. 写 Controller 契约和权限测试，再替换后台接口。
7. 按 Demo 写前端 E2E 失败用例，再拆分 5 个后台页面。
8. 写小程序状态门禁，再实现 3 页与分享/H5 降级。
9. 接入注册、认证和支付事件，做跨模块回归。
10. 完成浏览器真实配置、循环修复和最终测试报告。

## 18. 迁移、发布与回滚

### 18.1 发布门禁

- 普通邀请与代理两套规则均已发布，`register_reward.enabled=true`；
- migration 与 schema 契约测试通过；
- 旧冻结/素材/paid 路由均不可达；
- 注册、阶梯、失败补偿和结算 P0 全通过；
- 五菜单、两抽屉、三移动页真实浏览器通过；
- peter 账号登录、规则保存回显和刷新后数据一致。

### 18.2 回滚

- 关闭推广事件消费和月度结算 Job；
- 从菜单移除五个推广入口；
- 恢复 `_legacy_20260727` 仅用于诊断，不将旧状态数据重新解释为新关系；
- 已发放千寻币不得直接删除，需走资产冲正；
- 已确认结算不可页面回退，需人工审计处理；
- 规则回滚通过重新发布旧版本内容生成新版本，不修改历史快照。

## 19. 方案自审

### 19.1 需求可追溯性

| PRD 能力 | 技术承接 | 结论 |
|---|---|---|
| 完成注册即成功、永久唯一关系 | 注册事件收件箱 + 无状态关系表 + 唯一键 | 完整 |
| 校园代理来源优先 | 归因服务显式优先级 | 完整 |
| 五事件 + 阶梯独立流水 | 规则事件表 + 阶梯阈值 + 两类幂等键 | 完整 |
| 注册事件固定开启 | 前端禁用 + 服务端发布校验 | 完整 |
| 奖励三态与 5m/30m/2h | 奖励行补偿字段 + Retry Job + 人工接口 | 完整 |
| 代理启停和永久二维码 | 两态代理 + 一对一二维码 | 完整 |
| 上月自然月结算两态 | Asia/Shanghai Job + 月份唯一键 | 完整 |
| 5 菜单、2 抽屉、二维码弹窗 | 路由与组件拆分 | 完整 |
| 移动 3 页和分享降级 | promotion 分包 + 分享上下文 | 完整 |
| H5 最近成功缓存 | 安全正文快照/代理，不缓存裸 URL 冒充正文 | 完整，需同时补 PRD-06 接口 |
| 导出和审计 | promotion export task + audit log | 完整 |

### 19.2 可信性评分

| 维度 | 评分 | 说明 |
|---|---:|---|
| PRD 一致性 | 98/100 | 所有正式枚举、状态、页面和本期不做均有承接 |
| 架构一致性 | 96/100 | 保持六层和 admin/miniapp 隔离；跨域逻辑进入 common |
| 数据一致性 | 96/100 | 唯一键、行锁、不可变快照、事件收件箱、原子资产事务形成闭环 |
| 可测试性 | 97/100 | 核心算法与状态可在 L3 隔离，端到端可由 fixture 构造 |
| 运维复杂度 | 88/100 | 新增三个 Job 和事件收件箱；但避免引入 MQ，复杂度仍适合当前单体 |
| 前端可维护性 | 95/100 | 单体页面拆分，详情保留列表上下文 |
| **综合** | **95/100** | 达到实施条件 |

### 19.3 是否为当前最优方案

在当前单体、同库、首期无生产存量的约束下，本方案是最优平衡：

- 与最小补丁相比，消除了状态和路由的结构性冲突；
- 与全新子系统相比，不引入消息中间件、独立部署和双套鉴权；
- 事件收件箱补足进程内事件的丢失窗口，又能保持主业务与推广消费解耦；
- 不可变规则快照解决配置更新后的历史解释问题；
- 数据库唯一键与事务锁承担最终一致性，不依赖前端防重。

### 19.4 已识别风险

| 风险 | 处理 |
|---|---|
| 远端 DB/Redis 不可达 | 使用已恢复的隔离本地 MySQL/Redis 与仅本地生效的 dev 配置完成联调；不得改用生产数据或伪造报告 |
| H5 仅有 URL 无法缓存正文 | 同步补 PRD-06 安全快照接口，否则该验收不得标通过 |
| 微信分享/二维码依赖外部能力 | H5 验证降级，微信开发者工具补真实 scene；服务端事件注入覆盖内部 P0 |
| 旧测试数据语义错误 | 不迁移为新业务数据；保留 legacy 备份只供诊断 |
| 事件入箱极端写失败 | 调用方记录结构化错误，补偿任务按主业务事实扫描缺失事件 |
| 人物插画无独立源文件 | 临时仅裁纯装饰区并登记缺口，不使用整页背景和透明热区 |

## 20. 自审结论

方案通过实施前自审。选择“保留基础设施、重写推广领域”的方向正确；规则版本、事件收件箱、奖励原子入账和两类唯一幂等键是本轮相较旧方案的关键增强。本地隔离 MySQL、Redis 与 dev 配置已恢复，后续以新迁移、服务启动和受控 fixture 的实际执行结果作为真实浏览器与完整 P0 验收依据。
