# PRD-07 推广裂变与邀请奖励正式版技术方案设计

> 日期：2026-06-16
> 方案状态：正式版，作为 PRD-07 当前唯一技术方案
> 关联需求：
> - `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/PRD-07_模块公共定义.md`
> - `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/模块PRD文档/模块PRD_APP-07_推广裂变与邀请奖励.md`
> - `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/管理后台/模块PRD文档/模块PRD_ADM-07_推广管理.md`
> - `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/页面规格/`
> - `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/管理后台/页面规格/`
> - `docs/需求文档/需求文档-正式版/全局定义/共享层_项目级.md`
> - `docs/需求文档/需求文档-正式版/全局定义/端专属层_管理后台.md`
> - `docs/superpowers/specs/2026-05-09-chengjialiye-architecture-design.md`

## 0. 结论先行

本方案定义：**PRD-07 推广裂变与邀请奖励以正式版 PRD 为唯一依据，现有 promotion 代码不推倒删除，保留六层骨架并按正式 PRD 口径重构。**

| 层面 | 处理方式 | 原因 |
|------|----------|------|
| 后端实体/DAO/Mapper | 保留并迁移 | 已符合 `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` 基本架构 |
| 后端接口/Service | 保留模块，重构接口与状态流 | 现有接口可承载基础链路，但命名、枚举、状态机、规则配置不符合正式版 |
| 前端页面 | 拆页重构 | 现有 `PromotionManagement.tsx` 单页多 Tab 与正式版 9 个后台页面不一致 |
| SQL | 在 `backend/docs/sql/schema-promotion.sql` 基础上写迁移脚本 | 避免删表重建导致测试数据和历史数据不可控 |

## 1. 背景与目标

正式版 PRD-07 将推广裂变拆成两条业务线：

1. 普通用户邀请裂变：普通用户分享个人二维码，新用户首次注册登录后建立关系，并在注册登录、资料完善、认证完成、首次会员、首次充值 5 类节点上按后台规则发放成家币。
2. 校园代理推广：后台维护校园代理、专属二维码、推广归因、代理奖金、系统生成结算单，财务线下发放。

本技术方案目标：

| 目标 | 技术承接 |
|------|----------|
| 对齐正式版 PRD | 按 `M07-*` 枚举、状态机、配置项、页面 ID 重新定义接口、表与前端页面 |
| 复用现有实现资产 | 保留 promotion 相关 Entity、DAO、Mapper、Controller、Service、前端 API 的可用骨架 |
| 统一跨模块事件 | 注册、资料、认证、支付成功等模块通过推广统一入口触发奖励/代理奖金 |
| 降低返工风险 | 对现有旧口径做显式迁移，不在代码里继续保留默认金额、旧状态、旧路由页面 |
| 支持后续验收 | 输出 L1/L2/L3/L4 测试边界和迁移验收清单 |

## 2. 范围

| 模块 | 是否涉及 | 说明 |
|------|----------|------|
| 管理后台前端 | 是 | 按正式 PRD 拆成 9 个页面，复用现有 API 封装和 UI 组件 |
| 管理后台后端 | 是 | 规则配置、邀请关系、奖励流水、冻结处理、代理、素材二维码、结算台账、审计 |
| 管理后台后端-导出 | 需求保留，首版暂不实现 | PRD 导出要求正确保留；本期不写导出接口/服务/测试，后续由独立导出中心统一接入全后台导出 |
| 小程序后端 | 是 | 邀请首页、规则、记录、扫码来源、绑定、二维码、事件触发 |
| 小程序前端 | 否 | 本仓库不包含；本方案只输出接口契约和联调约束 |
| 数据库 | 是 | 现有 promotion 表结构迁移、补字段、补索引、补配置表使用约定 |
| 成家币/支付/通知/认证 | 是，联动 | 通过统一事件入口对接 PRD-01/03/04/06，未就绪时按降级策略处理 |
| 自动打款/多级分销/BI 平台 | 否 | 明确不纳入首版 |

## 3. 关键决策与实施口径

### 3.1 关键决策

| 类型 | 内容 | 决策/状态 | 来源 |
|------|------|---------------|------|
| 已决策 | 方案路线 | 本文件为当前唯一 PRD-07 技术方案；代码保留骨架并重构 | 本次评估 |
| 已决策 | 邀请来源枚举 | 对外与新表使用 `normal_user/campus_agent`；旧 `user_qr/agent_qr` 做迁移兼容 | `M07-ENUM-invite-source` |
| 已决策 | 奖励事件 | 固定 5 类，不保留旧 `ladder_reward` 事件；阶梯作为奖励计算策略，不作为独立事件 | 正式 PRD-07 |
| 已决策 | 奖励金额默认值 | 删除代码默认 10/20/30；未配置或未启用则不发放 | `M07-CFG-invite-*` |
| 已决策 | 成功邀请口径 | 后台可配，无默认值；未配置时移动端不展示成功邀请/阶梯进度 | `M07-RULE-invite-success` |
| 已决策 | 代理结算 | 结算单由系统任务生成，后台页面不提供手动生成入口 | `M07-RULE-agent-settlement-generate` |
| 已决策 | 审计 | 本期使用 `promotion_audit_log` 承载 PRD-07 审计；后续如统一 `sys_audit_log` 落地，再通过统一审计服务迁移 | 当前代码 + 正式 PRD |
| 已决策 | 接口实际前缀 | 后端实现继续遵守仓库架构：后台 `/admin/**`，小程序 `/miniapp/**`；PRD 中 `/admin/api`、`/api` 作为端侧网关映射文案 | `CLAUDE.md`、现有代码 |
| 已决策 | 导出实现边界 | PRD 中导出按钮、字段、权限、审计要求保留；首版代码和 L1/L2/L3/L4 测试均不实现导出，待全后台导出中心统一承接 | 用户确认 |
| 已决策 | 代理统计存储方式 | 新增 `promo_agent_stat` 预聚合表；列表/详情优先读取统计表，事件表和奖金流水作为事实源与补偿重算依据 | 用户确认 |

### 3.2 实施口径

| 项 | 最终口径 | 实施影响 |
|----|----------|----------|
| 后端接口前缀 | 继续使用 `/admin/**`、`/miniapp/**`；如端侧需要 `/api`，由网关或小程序请求层映射 | 保持现有仓库路由体系，减少无意义重命名 |
| 代理结算周期 | **实施决策**：首版按自然月结算；次月 1 日 02:00 生成上月结算单；同时保留任务服务供运维手动补偿触发。PRD 只规定"按结算周期"未指定单位，后续如需改为周/季度可调整任务调度 | `PromotionSettlementJob` 使用 `agentId + period` 幂等 |
| 规则默认值 | 奖励金额、成功统计口径、阶梯、代理奖金均无默认值；未配置或未启用时不发奖、不展示成功进度 | 严格对齐正式 PRD |
| 审计落表 | 本期 PRD-07 使用 `promotion_audit_log`；字段满足操作人、动作、对象、前后值、备注、时间 | 避免等待统一审计中心阻塞本模块 |
| 二维码停用 | 代理二维码“停用”只停止后台投放展示；已生成二维码仍永久有效。代理 `terminated` 后停止新计奖 | 对齐永久关系和素材页说明 |
| 导出范围 | **需求保留，首版代码/测试暂不实现**；PRD 要求导出邀请关系、奖励流水、结算列表/明细；代理素材下载不按导出任务处理 | 后续由独立导出中心统一接入，所有导出均需权限控制和审计 |
| 代理统计刷新 | 新增 `promo_agent_stat`，事件写入、奖金生成、结算状态变更后同步刷新；失败记录日志并由补偿任务按事实表重算 | 避免后台代理列表/详情实时大查询 |

## 4. 现状差异盘点

| 对象 | 当前实现 | 正式版要求 | 处理方式 |
|------|----------|------------|----------|
| 技术方案 | 现有 PRD-07 实现口径 | `2026-06-15` 正式版 PRD | 本文档作为唯一实现依据 |
| 来源枚举 | `user_qr/agent_qr` | `normal_user/campus_agent` | 数据迁移 + 接口兼容一版 |
| 邀请关系状态 | 缺少 `frozen/invalid` | `registered/profile_completed/verify_success/frozen/invalid` | 补枚举、状态前置校验、冻结前状态字段 |
| 风控原因 | `same_pay_account/abnormal_device` 等旧值 | `same_payment/same_identity/manual_rule` 等 | 统一按 `M07-ENUM-risk-hit-reason` |
| 奖励事件 | 含 `ladder_reward` | 仅 5 类奖励事件，阶梯是规则 | 删除独立阶梯奖励事件 |
| 奖励发放 | 默认 10/20/30，状态先 pending | 无默认值；命中且无风险可直接 success 并写资产流水 | 删除默认值，接入资产服务后直接发放 |
| 规则配置 | 规则列表 CRUD | 多 Tab 配置：普通、代理、有效期、风控 | 新增配置聚合接口，底层复用 `promotion_rule`、`promotion_rule_tier`、`app_config` |
| 代理结算 | 后台可 POST 生成 | 页面无生成入口，系统任务生成 | 删除前端入口，后端 create 改为内部任务服务 |
| 结算状态 | `pending/confirmed/paid/cancelled` | `unsettled/confirmed/paid` | SQL 与枚举迁移 |
| 后台页面 | 一个 `PromotionManagement.tsx` 承载 5 路由 | 9 个页面 | 拆页实现，保留通用 hooks/API |
| 后台菜单 | “推广裂变”及 5 个二级菜单 | “推广管理”下 9 个二级页面 | 菜单种子重写 |
| 移动端返回 | `Map<String,Object>` 和 Entity | 精确 VO，脱敏展示 | 补 Miniapp DTO/VO |

## 5. 方案选择

| 方案 | 内容 | 优点 | 缺点 | 结论 |
|------|------|------|------|------|
| 最小改动 | 继续沿用当前 5 页和旧表，仅补少数字段 | 快 | 继续偏离正式版，后续验收会大量返工 | 不选 |
| 平衡方案 | 保留 promotion 骨架，迁移枚举/状态/配置/接口，前端拆页，补系统任务和跨模块事件 | 对齐正式 PRD，风险可控，复用已有代码 | 需要一次集中重构 | **选择** |
| 完整方案 | 引入事件总线、风控引擎、统一审计中心、自动打款和 BI | 扩展性最好 | 超出首版范围和当前单体约束 | 后续再做 |

## 6. 总体架构与调用链

### 6.1 管理后台调用链

```text
React 管理后台页面
  -> frontend/src/api/promotion.ts
  -> /admin/promotion/**
  -> Promotion*Controller
  -> Promotion*AdminService
  -> Promotion*AdminServiceImpl
  -> common/dao/Promotion*Dao
  -> common/dao/impl/Promotion*DaoImpl
  -> common/mapper/Promotion*Mapper
  -> MySQL / OSS；导出由后续全后台导出中心统一接入
```

### 6.2 小程序邀请绑定链路

```text
小程序打开二维码或分享路径
  -> POST /miniapp/promotion/invite/share-log
  -> promotion_source_trace 记录注册前来源池
  -> 用户首次注册成功登录
  -> POST /miniapp/promotion/invite/bind 或注册服务内部调用 bindFromRegister
  -> 渠道优先判定：campus_agent > normal_user
  -> promotion_invite_relation 建立唯一关系
  -> 触发 register_login_reward
```

### 6.3 奖励/代理事件链路

```text
注册登录 / 头像认证通过 / 实名+学历完成 / 首次 VIP / 首次成家币充值
  -> PromotionInviteEventService.handleInviteEvent(userId, eventType, bizNo)
  -> 查询关系和规则配置
  -> 幂等校验 relationId + eventType
  -> 风控与单日上限判定
  -> 普通邀请：promotion_reward_log
  -> 代理渠道：promotion_agent_event + promotion_agent_bonus_log
  -> PromotionAgentStatService.refreshByEvent(agentId, eventType)
  -> 更新 promo_agent_stat（click/register/verify/firstVip/firstCoin 等累计字段）
  -> 成家币资产流水 / 通知中心 / 审计
```

### 6.4 代理结算链路

```text
系统定时任务 PromotionSettlementJob
  -> 汇总 promotion_agent_bonus_log(status=pending_settlement)
  -> 按 agentId + period 唯一生成 promotion_agent_settlement(status=unsettled)
  -> 后台确认 confirmed
  -> 刷新 promo_agent_stat confirmed/待结算金额
  -> 财务线下打款后标记 paid
  -> 刷新 promo_agent_stat 已发/待结算金额
  -> 写审计日志
```

## 7. 后端设计

### 7.1 管理后台接口清单

| 页面/功能 | URL | Method | 权限码 | 入参 | 出参 | 说明 |
|-----------|-----|--------|--------|------|------|------|
| 规则配置详情 | `/admin/promotion/rule-config` | GET | `promotion:rule:list` | 无 | `PromotionRuleConfigVO` | 聚合普通奖励、代理奖励、有效期、风控参数 |
| 保存普通奖励 | `/admin/promotion/rule-config/invite-reward` | PUT | `promotion:rule:invite:save` | `InviteRewardRuleSaveReq` | `Void` | 5 类奖励、成功口径、奖励方式、阶梯 |
| 保存代理奖励 | `/admin/promotion/rule-config/agent-bonus` | PUT | `promotion:rule:agent:save` | `AgentBonusRuleSaveReq` | `Void` | 代理奖金规则组 |
| 保存风控参数 | `/admin/promotion/rule-config/risk` | PUT | `promotion:rule:risk:save` | `PromotionRiskConfigSaveReq` | `Void` | 阈值、冻结开关、人工复核开关 |
| 关系有效期 | — | — | — | — | — | Tab3 只读展示「永久有效」，无独立保存接口；后续新增奖励事件可复用归因 |
| 邀请关系列表 | `/admin/promotion/invite-relations/list` | GET | `promotion:relation:list` | `InviteRelationPageReq` | `Page<InviteRelationVO>` | 替代旧 `/invites/list` |
| 邀请关系详情 | `/admin/promotion/invite-relations/{id}` | GET | `promotion:relation:list` | `id` | `InviteRelationDetailVO` | 时间线、奖励、风控、操作日志 |
| 解除关系冻结 | `/admin/promotion/invite-relations/{id}/unfreeze` | PUT | `promotion:relation:review` | `PromotionReviewReq` | `Void` | 恢复冻结前状态 |
| 标记关系无效 | `/admin/promotion/invite-relations/{id}/invalid` | PUT | `promotion:relation:review` | `PromotionReviewReq` | `Void` | 关联奖励置 invalid |
| 奖励流水列表 | `/admin/promotion/invite-rewards/list` | GET | `promotion:reward:list` | `InviteRewardPageReq` | `Page<InviteRewardVO>` | 替代旧 `/rewards/list` |
| 冻结奖励队列 | `/admin/promotion/invite-rewards/frozen/list` | GET | `promotion:reward:review` | `FrozenRewardPageReq` | `Page<InviteRewardVO>` | 固定过滤 frozen |
| 冻结确认发放 | `/admin/promotion/invite-rewards/{id}/approve` | PUT | `promotion:reward:review` | `PromotionReviewReq` | `Void` | success + 资产流水 |
| 冻结确认无效 | `/admin/promotion/invite-rewards/{id}/reject` | PUT | `promotion:reward:review` | `PromotionReviewReq` | `Void` | invalid |
| 代理列表 | `/admin/promotion/agents/list` | GET | `promotion:agent:list` | `AgentPageReq` | `Page<AgentVO>` | 展示代理编号，不展示内部主键 |
| 代理详情 | `/admin/promotion/agents/{id}` | GET | `promotion:agent:list` | `id` | `AgentDetailVO` | 基础信息、统计、奖金、结算摘要 |
| 新增代理 | `/admin/promotion/agents` | POST | `promotion:agent:add` | `AgentSaveReq` | `Long` | 生成 `AGT-*` 编号 |
| 编辑代理 | `/admin/promotion/agents/{id}` | PUT | `promotion:agent:edit` | `AgentSaveReq` | `Void` | 已绑定规则组仅允许停用不删除 |
| 代理状态变更 | `/admin/promotion/agents/{id}/status` | PUT | `promotion:agent:edit` | `StatusUpdateReq` | `Void` | normal/paused/terminated |
| 素材二维码列表 | `/admin/promotion/materials/list` | GET | `promotion:material:list` | `MaterialPageReq` | `Page<AgentQrCodeVO>` | 新页面 |
| 重新生成二维码 | `/admin/promotion/materials/{id}/regenerate` | POST | `promotion:material:manage` | 无 | `AgentQrCodeVO` | 旧二维码仍永久有效 |
| 停用二维码展示 | `/admin/promotion/materials/{id}/disable` | PUT | `promotion:material:manage` | `PromotionReviewReq` | `Void` | 只停用展示，不破坏归因 |
| 结算列表 | `/admin/promotion/settlements/list` | GET | `promotion:settlement:list` | `SettlementPageReq` | `Page<SettlementVO>` | 状态 `unsettled/confirmed/paid` |
| 标记已确认 | `/admin/promotion/settlements/{id}/confirm` | PUT | `promotion:settlement:confirm` | `PromotionReviewReq` | `Void` | unsettled -> confirmed |
| 标记已发放 | `/admin/promotion/settlements/{id}/paid` | PUT | `promotion:settlement:pay` | `SettlementPaidReq` | `Void` | confirmed -> paid |
| 导出（后续导出中心） | `/admin/promotion/*/export` 占位约定，首版不建 Controller | GET/POST | 对应 `*:export` | 查询条件 | 导出任务 ID | **需求保留，首版暂不实现**；后续独立导出中心统一接入。PRD 要求导出字段含手机号/收款信息且不脱敏，操作必须审计 |

### 7.2 小程序接口清单

| 功能 | URL | Method | 鉴权 | 入参 | 出参 | 说明 |
|------|-----|--------|------|------|------|------|
| 邀请首页 | `/miniapp/promotion/invite/home` | GET | 需要登录 | 无 | `InviteHomeVO` | 成功人数、到账币数、下一档位、二维码摘要、最近记录 |
| 活动规则 | `/miniapp/promotion/invite/rules` | GET | 需要登录 | 无 | `InviteRulesVO` | 优先取文案配置；文案为空或加载失败时返回内置兜底，不返回空白规则页 |
| 邀请记录 | `/miniapp/promotion/invite/records` | GET | 需要登录 | `page/size/status` | `Page<InviteRecordVO>` | 脱敏展示 |
| 分享/扫码来源 | `/miniapp/promotion/invite/share-log` | POST | 可匿名 | `InviteShareLogReq` | `InviteSourceTraceVO` | 注册前来源池 |
| 绑定邀请关系 | `/miniapp/promotion/invite/bind` | POST | 需要登录 | `InviteBindReq` | `InviteBindVO` | 首次注册登录后调用 |
| 个人二维码 | `/miniapp/promotion/invite/qr-code` | GET | 需要登录 | 无 | `InviteQrCodeVO` | 小程序码失败可降级 |
| 二维码来源解析 | `/miniapp/promotion/invite/qr-source` | GET | 可匿名 | `qrCode/scene` | `InviteQrSourceVO` | 代理来源识别 |

### 7.3 DTO/VO 字段设计

| 对象 | 关键字段 | 说明 |
|------|----------|------|
| `PromotionRuleConfigVO` | `inviteReward`, `agentBonusRules`, `relationValidity`, `riskConfig` | 推广规则配置页聚合 VO |
| `InviteRewardRuleSaveReq` | `events[]`, `successMetric`, `rewardMode`, `rewardCap`, `effectiveTime`, `expireTime`, `ladder[]` | 普通用户奖励 Tab |
| `AgentBonusRuleSaveReq` | `ruleGroups[]` | 每组含名称、启用状态、5 类奖金事件 |
| `PromotionRiskConfigSaveReq` | `dailyCap`, `deviceThreshold`, `phoneThreshold`, `paymentThreshold`, `freezeSwitch`, `reviewSwitch` | 风控参数 |
| `InviteRelationVO` | `relationNo`, `sourceTypeName`, `inviterDisplay`, `inviteeDisplay`, `statusName`, `bindTime`, `totalRewardCoin` | 后台列表，不直接展示内部 ID |
| `InviteRelationDetailVO` | `baseInfo`, `timeline[]`, `rewardList[]`, `riskList[]`, `auditList[]` | 详情页全链路 |
| `InviteRewardVO` | `rewardNo`, `relationNo`, `eventTypeName`, `rewardCoin`, `statusName`, `riskReasonName`, `arriveTime` | 奖励流水 |
| `AgentVO` | `agentNo`, `agentName`, `school`, `campus`, `bonusRuleGroup`, `coopStatusName`, `qrCodeNo`, `stat` | 代理列表；`stat` 来自 `promo_agent_stat` |
| `AgentDetailVO` | `baseInfo`, `stat`, `eventPage`, `bonusPage`, `settlementPage` | 代理详情多 Tab；统计概览来自 `promo_agent_stat`，明细页仍查事件/奖金/结算事实表 |
| `AgentQrCodeVO` | `qrCodeNo`, `agentNo`, `agentName`, `miniappPath`, `qrUrl`, `materialUrl`, `versionNo`, `statusName` | 素材二维码 |
| `SettlementVO` | `settlementNo`, `agentNo`, `agentName`, `period`, `statsDesc`, `payableAmount`, `paidAmount`, `statusName` | 结算单 |
| `InviteHomeVO` | `successInviteCount`, `arrivedCoin`, `nextLadderText`, `coinUsage`, `qrCode`, `miniPath`, `recentRecords[]` | 移动端邀请首页 |
| `InviteRecordVO` | `inviteeDisplay`, `relationStatusName`, `rewardStatusName`, `rewardCoin`, `bindTime`, `invalidReasonText` | 移动端记录 |

### 7.4 业务编号生成规则

> 后台列表、详情、搜索等用户可见展示层不直接展示数据库自增主键 ID，统一使用业务编号。后续导出中心也必须使用业务编号。路由参数和内部定位可继续使用内部 ID。

| 对象 | 编号格式 | 编号前缀 | 生成时机 | 说明 |
|------|----------|----------|----------|------|
| 代理 | `AGT-yyyymmdd-xxxx` | `AGT-` | 新增代理时系统生成 | 唯一，xxxx 为当日自增序号 |
| 邀请关系 | `REL-yyyymmdd-xxxx` | `REL-` | 关系建立时系统生成 | 唯一 |
| 普通邀请奖励流水 | `IRW-yyyymmdd-xxxx` | `IRW-` | 奖励记录创建时系统生成 | 唯一 |
| 代理奖金记录 | `ABN-yyyymmdd-xxxx` | `ABN-` | 奖金记录创建时系统生成 | 唯一 |
| 结算单 | `SET-yyyymm-xxxx` | `SET-` | 结算单生成时系统生成 | 唯一，按结算周期 |
| 二维码 | `QR-yyyymmdd-xxxx` | `QR-` | 二维码生成时系统生成 | 唯一 |

### 7.5 Service/DAO 设计

| 层 | 类/接口 | 方法 | 职责 |
|----|---------|------|------|
| Admin Service | `PromotionRuleConfigAdminService` | `getConfig`, `saveInviteReward`, `saveAgentBonus`, `saveRiskConfig` | 聚合配置读写与审计 |
| Admin Service | `PromotionRelationAdminService` | `list`, `detail`, `unfreeze`, `markInvalid` | 关系查询与人工处理 |
| Admin Service | `PromotionRewardAdminService` | `list`, `frozen`, `approve`, `reject` | 奖励流水与冻结队列 |
| Admin Service | `PromotionAgentAdminService` | `list`, `detail`, `create`, `update`, `updateStatus` | 代理管理 |
| Admin Service | `PromotionMaterialAdminService` | `list`, `regenerate`, `disable`, `history` | 二维码素材管理 |
| Admin Service | `PromotionSettlementAdminService` | `list`, `confirm`, `paid` | 结算台账 |
| Miniapp Service | `PromotionInviteService` | `home`, `rules`, `records`, `shareLog`, `bind`, `qrCode`, `qrSource` | 小程序推广接口 |
| Common Service | `PromotionInviteEventService` | `handleInviteEvent(userId, eventType, bizNo)` | 跨 PRD 统一事件入口；内部以 userId（被邀请人）反查 `promotion_invite_relation` 获取 relationId，再以 `relationId + eventType` 幂等；查不到关系时跳过不报错 |
| Common Service | `PromotionAgentStatService` | `initAgentStat`, `refreshByEvent`, `refreshByBonus`, `refreshBySettlement`, `rebuildAgentStat` | 维护 `promo_agent_stat` 预聚合统计；任何刷新失败不回滚主业务，记录日志后由补偿任务重算 |
| Common Service | `PromotionSettlementTaskService` | `generate(period)` | 系统结算任务，不暴露页面生成接口 |
| DAO | `Promotion*Dao` | `select/insert/update/page` | 数据访问；ServiceImpl 不直连 Mapper |

## 8. 数据库设计

### 8.1 表结构策略

| 表 | 当前状态 | 正式版处理 |
|----|----------|------------|
| `promotion_rule` | 已有 | 保留；用于普通奖励事件和代理奖金事件金额/启用/时间窗 |
| `promotion_rule_tier` | 已有 | 保留；补 `enabled` 语义，去掉固定档位假设 |
| `app_config` | 已有公共配置表 | 新增 `PROMOTION` 分组，用于成功口径、奖励方式、风控阈值、文案引用等 KV/JSON 配置 |
| `promotion_source_trace` | 已有 | source_type 迁移为 `normal_user/campus_agent`，补 `agent_code`、`source_priority` 可选字段 |
| `promotion_invite_relation` | 已有 | 补 `frozen_before_status`、`invalid_reason`、`success_metric_hit_time`、业务展示编号格式 |
| `promotion_reward_log` | 已有 | 保留；删除 `ladder_reward` 事件；补 `biz_no` 幂等字段、`asset_flow_type` |
| `promotion_agent` | 已有 | 补 `agent_no`、`bonus_rule_group`；首版不采集收款/税务/发票 |
| `promo_agent_stat` | 新增 | 代理统计预聚合表，1 个代理 1 行；列表/详情直接读取，事实源为 `promotion_agent_event`、`promotion_agent_bonus_log`、`promotion_agent_settlement` |
| `promotion_agent_qr_code` | 已有 | `qr_code` 展示为 `qr_code_no` 语义；补历史版本查询能力 |
| `promotion_agent_event` | 已有 | event_type 对齐 5 类事件 + `click`；字段含 `agent_id`, `user_id`, `event_type`, `biz_no`, `event_time`；用于代理统计与奖金触发 |
| `promotion_agent_bonus_log` | 已有 | 保留；状态按 `pending_settlement/confirmed/paid/cancelled` |
| `promotion_agent_settlement` | 已有 | 状态 `pending` 迁移为 `unsettled`，删除 `cancelled` 终态 |
| `promotion_audit_log` | 已有 | 先保留；后续如统一审计中心落地再迁移到 `sys_audit_log` |

### 8.1.1 `promo_agent_stat` 代理统计表

用户已确认采用新增 `promo_agent_stat` 预聚合表，不走首版实时聚合方案。该表只承载可重复计算的统计快照，`promotion_agent_event`、`promotion_agent_bonus_log`、`promotion_agent_settlement` 仍是事实源。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | bigint | 主键，继承 `BaseEntity` |
| `agent_id` | bigint | 代理内部 ID，唯一 |
| `agent_no` | varchar(64) | 代理展示编号，冗余便于列表和后续导出中心使用 |
| `click_cnt` | int | 累计扫码/点击数 |
| `register_cnt` | int | 累计注册数 |
| `profile_cnt` | int | 累计资料完善数 |
| `verify_cnt` | int | 累计认证完成数 |
| `success_cnt` | int | 累计成功邀请数，按 `M07-RULE-invite-success` 当前配置节点统计 |
| `first_vip_cnt` | int | 累计首次会员数 |
| `first_coin_recharge_cnt` | int | 累计首次充值成家币人数 |
| `bonus_due_amount` | int | 累计应发奖金，单位分或项目统一最小货币单位 |
| `bonus_pending_amount` | int | 累计待结算奖金 |
| `bonus_confirmed_amount` | int | 累计已确认待发奖金 |
| `bonus_paid_amount` | int | 累计已发奖金 |
| `last_event_time` | datetime | 最近一次代理事件时间 |
| `last_settlement_time` | datetime | 最近一次结算状态更新时间 |
| `last_rebuild_time` | datetime | 最近一次全量重算时间 |
| `stat_version` | int | 统计版本，补偿重算或配置口径变化时递增 |
| `remark` | varchar(255) | 统计备注或重算说明 |

刷新策略：

| 触发点 | 刷新动作 | 一致性策略 |
|--------|----------|------------|
| 新增代理 | 初始化 1 行 `promo_agent_stat`，所有计数/金额为 0 | 与代理创建同事务 |
| 代理二维码扫码/点击 | 写 `promotion_agent_event(click)` 后 `click_cnt + 1` | 事件幂等后再增量刷新 |
| 注册/资料/认证/首次会员/首次充值事件 | 写代理事件和奖金流水后刷新对应计数字段、成功人数、应发/待结算金额 | 主业务优先；统计刷新失败记录日志并进入补偿 |
| 生成结算单 | 按本期奖金流水刷新 `bonus_pending_amount`/`bonus_due_amount` | 结算单唯一键保证重复任务不重复累计 |
| 结算确认/标记已发放 | 刷新 confirmed/paid/pending 金额 | 状态前置校验通过后刷新 |
| 成功统计口径变更 | 触发 `rebuildAgentStat` 重算 `success_cnt` | 配置保存后异步/运维补偿执行 |

补偿策略：提供 `PromotionAgentStatService.rebuildAgentStat(agentId)` 和按周期批量重算任务，从事实表重新汇总并覆盖 `promo_agent_stat`；补偿任务幂等，不改变事实表和结算单。

### 8.2 关键字段变更

| 表 | 字段 | 类型 | 说明 |
|----|------|------|------|
| `promotion_agent` | `agent_no` | varchar(64) unique | 展示编号 `AGT-yyyymmdd-xxxx` |
| `promotion_agent` | `bonus_rule_group` | varchar(64) | 对应规则配置页代理奖金规则组 |
| `promo_agent_stat` | `agent_id` | bigint unique | 代理统计唯一键 |
| `promo_agent_stat` | `agent_no` | varchar(64) | 代理展示编号冗余 |
| `promo_agent_stat` | `click_cnt/register_cnt/profile_cnt/verify_cnt/success_cnt/first_vip_cnt/first_coin_recharge_cnt` | int | 代理转化统计 |
| `promo_agent_stat` | `bonus_due_amount/bonus_pending_amount/bonus_confirmed_amount/bonus_paid_amount` | int | 代理奖金统计 |
| `promo_agent_stat` | `last_event_time/last_settlement_time/last_rebuild_time` | datetime | 刷新和补偿时间 |
| `promo_agent_stat` | `stat_version` | int | 统计版本 |
| `promotion_invite_relation` | `source_type` | varchar(30) | `normal_user/campus_agent` |
| `promotion_invite_relation` | `frozen_before_status` | varchar(30) | 解除冻结时恢复 |
| `promotion_invite_relation` | `invalid_reason` | varchar(100) | 无效原因 |
| `promotion_invite_relation` | `success_metric_hit_time` | datetime | 命中后台成功口径时间 |
| `promotion_reward_log` | `biz_no` | varchar(128) | 跨模块业务单号幂等 |
| `promotion_reward_log` | `asset_flow_type` | varchar(50) | PRD-04 成家币流水类型 |
| `promotion_agent_settlement` | `status` | varchar(30) | `unsettled/confirmed/paid` |

### 8.3 枚举迁移

| 枚举 | 正式值 | 旧值处理 |
|------|--------|----------|
| 邀请来源 | `normal_user/campus_agent` | `user_qr -> normal_user`，`agent_qr -> campus_agent` |
| 邀请关系状态 | `registered/profile_completed/verify_success/frozen/invalid` | 原有三态保留，新增冻结/无效 |
| 奖励事件 | `register_login_reward/profile_complete_reward/verify_complete_reward/first_vip_reward/first_coin_recharge_reward` | 删除 `ladder_reward` |
| 奖励状态 | `pending/success/frozen/invalid` | 保持 |
| 代理合作状态 | `normal/paused/terminated` | 保持 |
| 代理奖金状态 | `pending_settlement/confirmed/paid/cancelled` | 保持 |
| 结算状态 | `unsettled/confirmed/paid` | `pending -> unsettled`，`cancelled` 不再使用 |
| 风控原因 | `same_device/same_phone/self_invite/same_payment/same_identity/manual_rule` | `same_pay_account -> same_payment`，旧异常设备统一为 `same_device` |
| 奖励方式 | `fixed/ladder` | 新增枚举；fixed=固定金额，ladder=按阶梯档位；配置入口见 `M07-CFG-invite-reward-mode` |

### 8.4 索引与幂等

| 场景 | 索引/幂等键 |
|------|-------------|
| 被邀请人唯一关系 | `uk_invitee_active(invitee_id, deleted)` |
| 奖励事件幂等 | `uk_relation_event(relation_id, event_type, deleted)`，支付类补 `biz_no` |
| 代理奖金幂等 | `uk_agent_user_event(agent_id, user_id, event_type, deleted)` |
| 结算单周期唯一 | 新增 `uk_agent_period(agent_id, period_start, period_end, deleted)` |
| 代理统计唯一 | `uk_agent_stat(agent_id, deleted)` |
| 代理统计列表排序 | `idx_agent_stat_success(success_cnt, deleted)`、`idx_agent_stat_bonus(bonus_due_amount, deleted)` |
| 列表查询 | `idx_inviter_status_time`、`idx_agent_status_time`、`idx_status_time` |

## 9. 前端设计

### 9.1 页面与路由

| 页面 | 路由 | 权限 | 组件建议 |
|------|------|------|----------|
| 推广规则配置 | `/promotion/rule-config` | `promotion:rule:list` | `pages/promotion/RuleConfigPage.tsx` |
| 普通邀请关系列表 | `/promotion/invite-relation` | `promotion:relation:list` | `pages/promotion/InviteRelationListPage.tsx` |
| 邀请关系详情 | `/promotion/invite-relation/:id` | `promotion:relation:list` | `pages/promotion/InviteRelationDetailPage.tsx` |
| 普通邀请奖励流水 | `/promotion/invite-reward` | `promotion:reward:list` | `pages/promotion/InviteRewardListPage.tsx` |
| 冻结奖励处理 | `/promotion/invite-reward/frozen` | `promotion:reward:review` | `pages/promotion/FrozenRewardPage.tsx` |
| 代理列表 | `/promotion/agent` | `promotion:agent:list` | `pages/promotion/AgentListPage.tsx` |
| 代理详情 | `/promotion/agent/:id` | `promotion:agent:list` | `pages/promotion/AgentDetailPage.tsx` |
| 代理结算管理 | `/promotion/settlement` | `promotion:settlement:list` | `pages/promotion/SettlementPage.tsx` |
| 推广素材与二维码 | `/promotion/material` | `promotion:material:list` | `pages/promotion/MaterialPage.tsx` |

### 9.2 前端文件组织

| 类型 | 路径 | 说明 |
|------|------|------|
| API | `frontend/src/api/promotion.ts` | 保留文件，重命名类型与接口方法 |
| 类型 | `frontend/src/types/promotion.ts` | 拆出页面共享类型，减少页面文件膨胀 |
| 页面 | `frontend/src/pages/promotion/*.tsx` | 按正式 PRD 页面拆分 |
| Hooks | `frontend/src/hooks/usePromotionTable.ts` | 可选，沉淀分页/查询逻辑 |
| 工具 | `frontend/src/utils/promotionFormat.ts` | 枚举中文、金额、时间、脱敏展示 |

### 9.3 交互原则

| 场景 | 设计 |
|------|------|
| 枚举展示 | 页面、筛选均展示中文名；code 只在接口内部使用；后续导出中心沿用中文展示 |
| 敏感信息 | 后台页面按权限展示；移动端始终脱敏；后续导出中心按 PRD 输出敏感字段并记审计 |
| 二次确认 | 修改规则、风控、冻结处理、代理停用/终止、结算状态变更均二次确认；后续导出中心负责导出审计 |
| 空态 | 按 ADM-07 端内定义展示“暂无数据/未找到相关记录” |
| 错误态 | toast + 重试；二维码生成失败展示占位 |
| 结算生成 | 页面不出现“生成结算单”按钮 |

## 10. 权限与安全

| 能力 | 权限码建议 | 角色 |
|------|------------|------|
| 普通奖励配置 | `promotion:rule:invite:save` | 运营、超管 |
| 代理奖励配置 | `promotion:rule:agent:save` | 渠道运营、超管 |
| 风控参数配置 | `promotion:rule:risk:save` | 风控、超管 |
| 邀请关系查看 | `promotion:relation:list` | 运营、渠道运营、财务、风控、超管 |
| 邀请关系冻结处理 | `promotion:relation:review` | 风控、超管 |
| 奖励流水查看 | `promotion:reward:list` | 运营、渠道运营、财务、风控、超管 |
| 奖励冻结处理 | `promotion:reward:review` | 风控、超管 |
| 代理管理 | `promotion:agent:add/edit/list` | 渠道运营、超管 |
| 素材二维码管理 | `promotion:material:list/manage` | 渠道运营、超管 |
| 结算查看/确认 | `promotion:settlement:list/confirm` | 渠道运营、财务、超管 |
| 标记已发放 | `promotion:settlement:pay` | 财务、超管 |
| 导出（后续导出中心） | `promotion:*:export` | 按页面，仅财务/超管或授权角色；首版代码不实现、不绑定接口测试 |

安全要求：

| 项 | 设计 |
|----|------|
| Token | 后台和小程序继续使用 `X-Auth-Token` |
| 数据权限 | 渠道运营默认只看本人/本组负责代理；财务看全部结算数据；运营看全部邀请数据 |
| 手机号/收款信息 | 页面按权限脱敏；后续导出中心按 PRD 可不脱敏但必须审计 |
| 操作审计 | 敏感操作保留 >= 1 年 |
| 并发控制 | 冻结处理、结算状态变更使用状态前置校验；必要时补乐观锁字段 |

## 11. PRD-07 推广裂变联动影响

| 项 | 设计 |
|----|------|
| 注册登录 | 首次注册成功登录后建立邀请关系，并触发 `register_login_reward` |
| 头像认证 | 头像认证通过后触发 `profile_complete_reward` |
| 实名+学历认证 | 两者均完成后触发 `verify_complete_reward` |
| VIP 支付 | PRD-04 支付成功后触发 `first_vip_reward` |
| 成家币充值 | PRD-04 支付成功后触发 `first_coin_recharge_reward` |
| 幂等键 | 普通奖励：`relationId + eventType`；支付类额外记录 `bizNo/orderNo`；代理奖金：`agentId + userId + eventType` |
| 失败策略 | 推广事件失败不回滚注册、认证、支付主流程；记录失败日志并支持补偿任务或人工排查 |
| 资产流水 | 成功发放写 PRD-04 `app_user_coin_log`，流水类型按 `invite_*` 映射 |
| 通知 | 到账/冻结/无效通知通过 PRD-03 通知中心写入；通知失败不回滚奖励状态 |
| OSS/小程序码 | 小程序码 scene 只放短码，完整来源落 `promotion_source_trace` |
| 测试覆盖 | 注册、认证、支付成功后分别验证奖励/代理奖金幂等生成 |

## 12. 测试方案

| 层级 | 覆盖内容 | 产物 |
|------|----------|------|
| L1 cURL | 后台 9 页面接口、小程序邀请接口、401/403、参数校验、状态流转 | 更新 `docs/测试文档/推广裂变-test-l1.sh` |
| L2 MockMvc | Controller 路由、权限注解、返回 `R<T>`、VO 精确类型 | `backend/src/test/java/com/spacetime/admin/controller/Promotion*ControllerTest.java` |
| L3 JUnit | 邀请绑定、渠道优先、风控冻结、单日上限、奖励幂等、代理统计刷新/补偿、结算任务 | `backend/src/test/java/com/spacetime/**/Promotion*ServiceTest.java` |
| L4 Playwright | 规则配置、冻结处理、代理列表/详情、素材二维码、结算状态流转 | `frontend/e2e-tests/tests/promotion.spec.ts` |
| 手动验收 | 多角色权限、二维码下载、长文本布局 | 更新测试报告 |
| 导出测试 | 导出文件/导出审计 | **需求保留，首版暂不测试**；待独立导出中心上线后补 |

必须更新：

| 文件 | 原因 |
|------|------|
| `docs/测试文档/推广裂变-testcase.md` | 当前测试用例需按正式版接口和页面重新对齐 |
| `docs/测试文档/推广裂变-testreport.md` | 新方案实现后需重新执行并更新报告 |

## 13. 变更文件清单

### 13.1 后端

| 类型 | 文件路径 | 新增/修改 | 说明 |
|------|----------|-----------|------|
| SQL | `backend/docs/sql/schema-promotion.sql` | 修改 | 表结构、菜单、权限种子迁移到正式版 |
| SQL | `backend/docs/sql/migration-promotion-prd07-final.sql` | 新增 | 从旧值迁移到正式版 |
| Entity | `common/entity/Promotion*.java` | 修改 | 补字段、注释、枚举引用 |
| Enum | `common/enums/Promotion*.java` | 修改 | 按 `M07-*` 枚举统一 |
| DAO/Mapper | `common/dao/Promotion*Dao.java` | 修改 | 补查询方法与索引使用 |
| Admin DTO | `admin/dto/request/Promotion*.java` | 修改/新增 | 配置聚合、详情入参；导出入参后续由导出中心补 |
| Admin VO | `admin/dto/response/Promotion*.java` | 修改/新增 | 不直接返回 Entity |
| Admin Controller | `admin/controller/Promotion*Controller.java` | 修改/拆分 | 按 9 页面接口重组 |
| Admin Service | `admin/service/Promotion*AdminService.java` | 修改/新增 | 规则、关系、奖励、代理、素材、结算 |
| Miniapp DTO/VO | `miniapp/dto/**/Promotion*.java` | 新增 | 小程序接口精确返回 |
| Miniapp Service | `miniapp/service/PromotionInviteEventService.java` | 修改 | 增加 `bizNo` 和失败记录 |
| Task | `common/task/PromotionSettlementJob.java` | 新增 | 系统结算任务 |
| Task | `common/task/PromotionAgentStatRebuildJob.java` | 新增 | 代理统计补偿重算任务 |

### 13.2 前端

| 类型 | 文件路径 | 新增/修改 | 说明 |
|------|----------|-----------|------|
| API | `frontend/src/api/promotion.ts` | 修改 | 对齐正式版接口 |
| Types | `frontend/src/types/promotion.ts` | 新增 | 推广模块共享类型 |
| Router | `frontend/src/router/index.tsx` | 修改 | 新增 9 个正式路由 |
| Pages | `frontend/src/pages/promotion/*.tsx` | 新增/重构 | 拆分正式版页面 |
| Utils | `frontend/src/utils/promotionFormat.ts` | 新增 | 枚举中文、脱敏、金额格式 |
| E2E | `frontend/e2e-tests/tests/promotion.spec.ts` | 修改 | 按正式页面重写 |

## 14. 风险与回滚

| 风险 | 影响 | 应对 |
|------|------|------|
| 接口前缀与 PRD 文案不一致 | 小程序独立项目联调可能调错地址 | 在接口契约里明确后端实际 `/miniapp/**`，端侧请求层映射 |
| 成家币/通知/支付未完成 | 奖励到账、通知、付费归因无法闭环 | 事件和表先落，联动项在对应 PRD 方案中补齐；测试中标为跳过或 Mock |
| 规则无默认值 | 未配置时用户看不到奖励进度 | 后台上线前必须由运营初始化配置 |
| 结算任务执行失败 | 当期无法自动生成结算单 | 任务按 `agentId + period` 幂等，可由运维手动补偿触发 |
| 代理统计刷新失败 | 代理列表/详情统计短暂不准 | 主业务不回滚，记录刷新失败日志，`PromotionAgentStatRebuildJob` 按事实表重算 |
| 旧数据枚举迁移遗漏 | 列表展示异常或状态机错误 | 写迁移脚本 + L3 枚举迁移测试 |
| 前端拆页工作量较大 | 实现周期增加 | 复用旧页面表格/弹窗逻辑，优先完成 P0 页面 |

回滚策略：

| 对象 | 回滚方式 |
|------|----------|
| 规则配置 | 停用对应 `promotion_rule` 或回滚 `app_config` |
| 奖励发放 | 已到账成家币不可直接回滚；需走资产冲正/人工处理 |
| 代理结算 | 已标记 paid 的结算单不可自动回滚；需财务人工备注 |
| 代理统计 | `promo_agent_stat` 可从事实表重算，不单独作为资金或奖励事实依据 |
| 前端入口 | 下线菜单或按钮权限 |
| 结算任务 | 关闭调度开关，不影响已生成台账 |

## 15. 实施顺序

1. SQL 迁移：补字段、枚举值迁移、菜单权限种子重写。
2. 后端枚举与 DTO/VO：先消灭 Entity 直返和旧 enum。
3. 规则配置重构：实现聚合配置接口，删除默认奖励金额。
4. 邀请关系与奖励状态机：补 `frozen/invalid`、风控、单日上限、幂等。
5. 代理与统计：补代理编号，新增 `promo_agent_stat` 初始化、增量刷新和补偿重算。
6. 素材二维码：补二维码历史版本、停用展示语义。
7. 结算任务：移除页面生成入口，实现系统任务生成 `unsettled` 结算单，并刷新代理统计金额。
8. 小程序接口：补精确 VO、脱敏、二维码降级、文案配置。
9. 前端拆页：按正式 9 页面逐页替换旧 `PromotionManagement.tsx`。
10. 测试更新：重写推广裂变测试用例与报告，执行 L1/L2/L3/L4。

## 16. 方案自检

| 检查项 | 状态 |
|--------|------|
| 已读取项目规范、架构文档、正式 PRD-07 和现有代码 | 通过 |
| 遵守 `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` | 通过 |
| `admin/` 与 `miniapp/` 不互相 import | 通过 |
| Controller 返回精确 `R<T>` | 需在实现时修正小程序 `Map<String,Object>` |
| 数据库包含审计字段和逻辑删除 | 通过，迁移新增字段需保持 |
| 权限、菜单、按钮、401/403 已覆盖 | 通过 |
| 小程序前端独立项目边界已说明 | 通过 |
| 涉及注册、资料、认证、成家币、支付、通知、小程序码的联动已写入 | 通过 |
| 关键实施口径已写成明确决策 | 通过 |
