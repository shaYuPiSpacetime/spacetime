# 推广裂变 - 测试用例

> **关联文档**：
> - 技术方案：`docs/技术方案/2026-05-22-推广裂变与邀请奖励-tcdesign.md`
> - 移动端 PRD：`docs/需求文档/移动端/细化PRD-07_推广裂变与邀请奖励.md`
> - 管理后台 PRD：`docs/需求文档/管理后台/管理后台细化PRD-07_推广管理.md`
> - 测试报告：`docs/测试文档/推广裂变-testreport.md`
>
> **创建日期**：2026-05-22
> **测试模式**：完整模式
> **目标项目**：后端 `backend/` / 前端 `frontend/`

---

## 1. 测试策略决策

### 后端评估

| 维度 | 评估结果 | 得分 |
|------|----------|------|
| A 新增/修改接口数 | 小程序 7 个接口，后台规则/邀请/奖励/代理/结算/导出约 25+ 个接口 | 2 |
| B 状态流转逻辑 | 邀请关系、奖励、代理、奖金、结算均有多状态流转 | 2 |
| C 纯计算/规则逻辑 | 阶梯奖励、代理奖金、风控冻结、幂等、防重复发放 | 2 |
| D 数据关联复杂度 | 规则、来源、关系、奖励、代理、事件、奖金、结算、成家币、通知 | 2 |
| E 老代码影响范围 | 需接入注册登录、资料完成、三项认证、支付成功等核心 Service | 2 |
| F 安全变更 | 新增大量后台权限码、冻结/结算/导出等敏感操作 | 1 |
| **总分** |  | **11 → L1 + L2 + L3** |

### 前端评估

| 条件 | 命中 | 说明 |
|------|------|------|
| G 多角色权限差异 | ✅ | 运营、渠道运营、风控、财务权限不同 |
| H 复杂交互流程 | ✅ | 规则配置、冻结复核、二维码、结算状态流转 |
| I 多页面联动 | ✅ | 代理列表、代理详情、奖金明细、结算单联动 |
| J 核心业务页面 | ✅ | 推广管理是增长与结算核心后台模块 |

**最终策略：L1 + L2 + L3 + 手动 + L4**

> 当前仅生成测试用例设计，不生成脚本、不执行测试。PRD-04/03/06 相关资产、认证、通知基础能力由其他同学负责，本用例中统一标为“联动前置/Mock 接入点”。

## 2. 测试数据准备

| 数据需求 | 用途 | 如何准备 | 是否幂等 |
|----------|------|----------|----------|
| 后台管理员 Token | 后台 L1/L4 权限接口 | 执行前从 `frontend/e2e-tests/.env` 或登录接口获取 | 是 |
| 运营 Token | 规则配置、邀请关系查询 | 创建具备 `promotion:rule:*`、`promotion:invite:list` 的角色 | 是 |
| 风控 Token | 冻结奖励处理 | 创建具备 `promotion:reward:review` 的角色 | 是 |
| 渠道运营 Token | 代理与二维码管理 | 创建具备 `promotion:agent:*` 的角色 | 是 |
| 财务 Token | 结算确认与发放 | 创建具备 `promotion:settlement:*` 的角色 | 是 |
| 普通邀请人用户 | 小程序邀请首页、关系绑定、奖励归属 | PRD-06 用户基础能力完成后通过注册接口创建；未完成前 L3 使用 Mock userId | 否 |
| 被邀请新用户 | 绑定与奖励触发 | PRD-06 注册登录完成后自构建；未完成前 L3 使用 Mock userId | 否 |
| 老用户 | 验证老用户不建立邀请关系 | 通过已有用户或测试夹具准备 | 是 |
| 校园代理 | 校园代理二维码、代理统计、结算 | 后台接口自构建 | 否 |
| 推广规则 | 奖励计算和代理奖金 | 后台接口自构建或 SQL fixture | 否 |
| 冻结奖励流水 | 风控复核 | L3 Mock 风控命中；L1 通过测试接口链制造或测试夹具准备 | 否 |
| 待结算奖金明细 | 生成结算单 | 代理事件触发生成或 SQL fixture | 否 |
| PRD-04 成家币流水 Mock | 奖励到账验证 | 资产模块未完成前使用 Service Mock；完成后查 `app_user_coin_log` | 是 |
| PRD-03 通知 Mock | 到账/冻结/无效通知验证 | 通知模块未完成前使用 Service Mock；完成后查通知记录 | 是 |

## 3. L1 - 接口测试用例

> 本章节描述“测什么”，不含 cURL 脚本。可执行脚本后续派生到 `docs/测试文档/推广裂变-test-l1.sh`。

### 3.1 小程序推广接口

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F1-P0-01 | P0 | 获取邀请首页 | `GET /miniapp/promotion/invite/home` | 邀请人已登录 | 小程序 Token | 返回成功邀请数、已到账奖励、下一档说明 | 响应断言 |
| F1-P0-02 | P0 | 获取活动规则 | `GET /miniapp/promotion/invite/rules` | 无 | 无需数据 | 返回成功邀请定义、阶梯、风控说明 | 响应断言 |
| F1-P0-03 | P0 | 查询邀请记录 | `GET /miniapp/promotion/invite/records` | 邀请人已登录且存在邀请关系 | 链式或自动查询 | 返回分页 records，状态字段合法 | 响应断言 |
| F1-P0-04 | P0 | 记录普通用户二维码来源 | `POST /miniapp/promotion/invite/share-log` | 邀请人存在 | 自构建邀请人 | 返回 `traceNo`，来源状态 `unbound` | 重新查询验证状态 |
| F1-P0-05 | P0 | 记录校园代理二维码来源 | `POST /miniapp/promotion/invite/share-log` | 校园代理二维码启用 | 自构建代理和二维码 | 返回 `traceNo`，写入代理 click 事件 | 重新查询验证状态 |
| F1-P0-06 | P0 | 新用户绑定普通邀请关系 | `POST /miniapp/promotion/invite/bind` | 已有普通来源 trace，新用户首次注册 | 链式 | 建立关系，状态 `registered` | 查询邀请详情/记录 |
| F1-P0-07 | P0 | 新用户绑定代理关系 | `POST /miniapp/promotion/invite/bind` | 已有校园代理二维码来源 trace，新用户首次登录 | 链式 | 建立代理归属，不生成普通用户奖励 | 查询代理事件 |
| F1-P1-01 | P1 | 查询代理来源 | `GET /miniapp/promotion/invite/qr-source` | 校园代理二维码启用 | 自构建代理二维码 | 返回代理来源可用、小程序路径信息 | 响应断言 |
| F1-P1-02 | P1 | 获取普通用户二维码 | `GET /miniapp/promotion/invite/qr-code` | 邀请人已登录 | 小程序 Token | 返回二维码 URL 或可生成状态 | 响应断言 |
| F1-P1-03 | P1 | 邀请记录按状态筛选 | `GET /miniapp/promotion/invite/records?status=frozen` | 存在冻结记录 | fixture | 只返回冻结记录 | 响应断言 |
| F1-P2-01 | P2 | 二维码来源缺少来源类型 | `POST /miniapp/promotion/invite/share-log` | 无 | 缺参请求 | 返回参数错误 | 响应断言 |
| F1-P2-02 | P2 | 无效校园代理二维码查询 | `GET /miniapp/promotion/invite/qr-source` | 二维码不存在或停用 | 固定值 | 返回不可用或业务错误 | 响应断言 |
| F1-P2-03 | P2 | 老用户绑定邀请关系 | `POST /miniapp/promotion/invite/bind` | 用户已注册且已有账号 | 老用户 fixture | 不建立关系，不计奖 | 查询关系不存在 |
| F1-P2-04 | P2 | 自己邀请自己 | `POST /miniapp/promotion/invite/bind` | inviterId 等于当前用户 | 自构建 | 拒绝绑定或关系无效，原因 `self_invite` | 查询状态/原因 |
| F1-P2-05 | P2 | 重复绑定同一被邀请人 | `POST /miniapp/promotion/invite/bind` | 被邀请人已有有效关系 | 链式重复请求 | 第二次不覆盖原关系 | 查询原关系未变 |
| F1-P2-06 | P2 | 同时命中普通用户二维码和校园代理二维码 | `POST /miniapp/promotion/invite/bind` | 普通用户二维码和校园代理二维码均有效 | 自构建 | 归属代理，普通邀请不发币 | 查询关系和奖励流水 |
| F1-P3-01 | P3 | 未登录访问邀请首页 | `GET /miniapp/promotion/invite/home` | 无 Token | 无需数据 | 返回 401 | HTTP 状态断言 |
| F1-P3-02 | P3 | 未登录查询邀请记录 | `GET /miniapp/promotion/invite/records` | 无 Token | 无需数据 | 返回 401 | HTTP 状态断言 |

### 3.2 后台规则与邀请管理接口

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F2-P0-01 | P0 | 新增普通邀请奖励规则 | `POST /admin/promotion/rules` | 有 `promotion:rule:add` | 管理员 Token | 返回规则 ID | 详情查询 |
| F2-P0-02 | P0 | 编辑规则并启用 | `PUT /admin/promotion/rules/{id}` | 规则存在 | 链式 | 规则字段更新 | 详情查询 |
| F2-P0-03 | P0 | 保存阶梯规则 | `PUT /admin/promotion/rules/{id}/tiers` | 规则存在 | 链式 | 4 档阶梯保存成功 | 详情查询 |
| F2-P0-04 | P0 | 查询规则列表 | `GET /admin/promotion/rules/list` | 规则存在 | 自动查询 | 分页返回规则 | 响应断言 |
| F2-P0-05 | P0 | 查询邀请关系列表 | `GET /admin/promotion/invites/list` | 存在邀请关系 | fixture | 返回邀请人、被邀请人、状态、奖励 | 响应断言 |
| F2-P0-06 | P0 | 查询邀请关系详情 | `GET /admin/promotion/invites/{id}` | 存在邀请关系 | 自动查询 | 返回点击、注册、登录、资料、认证、奖励、风控记录 | 响应断言 |
| F2-P1-01 | P1 | 启停规则 | `PUT /admin/promotion/rules/{id}/status` | 规则存在 | 链式 | 状态切换成功，禁用后不再匹配奖励 | 详情 + L3 验证 |
| F2-P1-02 | P1 | 人工标记邀请关系无效 | `PUT /admin/promotion/invites/{id}/invalid` | 关系非 invalid | fixture | 状态变为 `invalid`，写审计日志 | 详情查询 |
| F2-P1-03 | P1 | 人工解除邀请关系冻结 | `PUT /admin/promotion/invites/{id}/unfreeze` | 关系为 `frozen` | fixture | 状态恢复，写审计日志 | 详情查询 |
| F2-P1-04 | P1 | 导出邀请关系 | `GET /admin/promotion/invites/export` | 有导出权限 | 自动查询 | 返回文件流，筛选条件生效 | 响应头/内容断言 |
| F2-P2-01 | P2 | 新增规则金额为负数 | `POST /admin/promotion/rules` | 有权限 | 构造负数 | 返回参数错误或业务错误 | 响应断言 |
| F2-P2-02 | P2 | 保存阶梯区间重叠 | `PUT /admin/promotion/rules/{id}/tiers` | 规则存在 | 构造重叠区间 | 返回业务错误 | 响应断言 |
| F2-P2-03 | P2 | 查询不存在的邀请详情 | `GET /admin/promotion/invites/999999999` | 有权限 | 固定值 | 返回业务错误或空数据 | 响应断言 |
| F2-P3-01 | P3 | 无 Token 查询规则 | `GET /admin/promotion/rules/list` | 无 Token | 无需数据 | 返回 401 | HTTP 状态断言 |
| F2-P3-02 | P3 | 无权限新增规则 | `POST /admin/promotion/rules` | Token 缺少 `promotion:rule:add` | 低权限 Token | 返回 403 | HTTP 状态断言 |
| F2-P3-03 | P3 | 无权限导出邀请关系 | `GET /admin/promotion/invites/export` | Token 缺少导出权限 | 低权限 Token | 返回 403 | HTTP 状态断言 |

### 3.3 后台奖励流水、代理与结算接口

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F3-P0-01 | P0 | 查询奖励流水列表 | `GET /admin/promotion/rewards/list` | 存在奖励流水 | fixture | 返回事件、币数、状态、到账时间 | 响应断言 |
| F3-P0-02 | P0 | 查询冻结队列 | `GET /admin/promotion/rewards/frozen` | 存在冻结奖励 | fixture | 只返回 `frozen` 奖励 | 响应断言 |
| F3-P0-03 | P0 | 确认冻结奖励有效并发放 | `PUT /admin/promotion/rewards/{id}/approve` | 奖励为 frozen | fixture | 状态 `success`，写成家币流水，写审计日志 | 查询奖励/资产 Mock |
| F3-P0-04 | P0 | 确认冻结奖励无效作废 | `PUT /admin/promotion/rewards/{id}/reject` | 奖励为 frozen | fixture | 状态 `invalid`，不写成家币流水，写审计日志 | 查询奖励 |
| F3-P0-05 | P0 | 新增代理 | `POST /admin/promotion/agents` | 有 `promotion:agent:add` | 管理员 Token | 返回代理 ID | 详情查询 |
| F3-P0-06 | P0 | 生成校园代理二维码 | `POST /admin/promotion/agents/{id}/qr-codes/regenerate` | 代理存在 | 链式 | 返回唯一二维码编号、小程序路径 | 查询代理详情 |
| F3-P0-07 | P0 | 查询代理统计 | `GET /admin/promotion/agent-stats/list` | 存在代理事件 | fixture | 返回点击、注册、登录、资料、三项认证、奖金统计 | 响应断言 |
| F3-P0-08 | P0 | 生成结算单 | `POST /admin/promotion/settlements` | 有待结算奖金 | fixture | 返回结算单 ID，奖金明细关联结算单 | 查询结算详情/奖金 |
| F3-P0-09 | P0 | 标记结算单已确认 | `PUT /admin/promotion/settlements/{id}/confirm` | 结算单 pending | 链式 | 状态 `confirmed` | 查询结算单 |
| F3-P0-10 | P0 | 标记结算单已发放 | `PUT /admin/promotion/settlements/{id}/paid` | 结算单 confirmed | 链式 | 状态 `paid`，记录已发金额和时间 | 查询结算单 |
| F3-P1-01 | P1 | 停用校园代理二维码 | `PUT /admin/promotion/agent-qr-codes/{id}/disable` | 二维码 enabled | 链式 | 状态 disabled，后续不建立新代理关系 | 查询二维码/绑定验证 |
| F3-P1-02 | P1 | 变更代理状态为 paused | `PUT /admin/promotion/agents/{id}/status` | 代理 normal | 链式 | 状态 paused，写审计日志 | 查询代理 |
| F3-P1-03 | P1 | 查询代理详情三 Tab | `GET /admin/promotion/agents/{id}` | 存在事件/奖金/结算 | fixture | 返回代理基础信息、推广明细、奖金明细、结算记录入口数据 | 响应断言 |
| F3-P1-04 | P1 | 导出结算明细 | `GET /admin/promotion/settlements/{id}/export` | 结算单存在 | 链式 | 返回文件流 | 响应头/内容断言 |
| F3-P2-01 | P2 | 重复生成同代理同周期结算单 | `POST /admin/promotion/settlements` | 周期已有结算单 | 链式重复请求 | 返回业务错误，不重复关联奖金 | 查询结算单数量 |
| F3-P2-02 | P2 | 已发放结算单再次标记发放 | `PUT /admin/promotion/settlements/{id}/paid` | 状态 paid | 链式重复请求 | 返回业务错误，状态不变 | 查询结算单 |
| F3-P2-03 | P2 | 审核非 frozen 奖励 | `PUT /admin/promotion/rewards/{id}/approve` | 奖励为 success/invalid | fixture | 返回状态不允许 | 响应断言 |
| F3-P2-04 | P2 | 新增代理缺少代理名称 | `POST /admin/promotion/agents` | 有权限 | 缺参请求 | 返回参数错误 | 响应断言 |
| F3-P3-01 | P3 | 无权限处理冻结奖励 | `PUT /admin/promotion/rewards/{id}/approve` | 缺少 `promotion:reward:review` | 低权限 Token | 返回 403 | HTTP 状态断言 |
| F3-P3-02 | P3 | 无权限标记结算已发放 | `PUT /admin/promotion/settlements/{id}/paid` | 缺少 `promotion:settlement:pay` | 低权限 Token | 返回 403 | HTTP 状态断言 |

## 4. L2 - Controller 测试用例

| 用例ID | 测试方法 | 验证点 | 期望 |
|--------|----------|--------|------|
| L2-01 | `PromotionRuleControllerTest.list_shouldBindPageReq` | 规则列表路由、分页参数、`R<Page<PromotionRuleVO>>` | HTTP 200，返回 `code=200` |
| L2-02 | `PromotionRuleControllerTest.create_shouldValidateBody` | 新增规则必填校验 | 缺少 `ruleName/eventType` 返回参数错误 |
| L2-03 | `PromotionRuleControllerTest.updateStatus_shouldRequirePermission` | 启停规则权限注解 | 无权限返回 403 |
| L2-04 | `PromotionInviteAdminControllerTest.detail_shouldReturnDetailVO` | 邀请详情路径参数绑定 | 返回详情 VO |
| L2-05 | `PromotionInviteAdminControllerTest.invalid_shouldValidateReviewRemark` | 人工标记无效备注校验 | 备注缺失时返回参数错误 |
| L2-06 | `PromotionRewardControllerTest.frozen_shouldFilterFrozenStatus` | 冻结队列接口固定过滤 frozen | Service 入参包含 `status=frozen` |
| L2-07 | `PromotionRewardControllerTest.approve_shouldRequireReviewPermission` | 确认有效发放权限 | 无权限返回 403 |
| L2-08 | `PromotionAgentControllerTest.create_shouldValidateAgentName` | 新增代理参数校验 | 缺少代理名称返回参数错误 |
| L2-09 | `PromotionAgentControllerTest.regenerateCode_shouldReturnQrCodeVO` | 校园代理二维码生成接口路由 | 返回二维码编号和小程序路径 |
| L2-10 | `PromotionSettlementControllerTest.create_shouldValidatePeriod` | 结算周期参数校验 | 开始日期晚于结束日期返回参数错误 |
| L2-11 | `PromotionSettlementControllerTest.paid_shouldRequireFinancePermission` | 标记已发放权限 | 无权限返回 403 |
| L2-12 | `PromotionInviteControllerTest.shareLog_shouldAllowAnonymous` | 小程序分享记录可匿名 | 无 Token 不返回 401 |
| L2-13 | `PromotionInviteControllerTest.home_shouldRequireLogin` | 小程序邀请首页需登录 | 无 Token 返回 401 |
| L2-14 | `PromotionInviteControllerTest.bind_shouldValidateSource` | 绑定接口 trace/inviteCode/qrCode 至少一个有效 | 全空返回参数错误 |

## 5. L3 - Service 单元测试用例

| 用例ID | 测试方法 | 输入 | 期望输出 |
|--------|----------|------|----------|
| L3-01 | `PromotionInviteServiceTest.bind_normalInvite_shouldCreateRelation` | 新用户、普通 trace、有效 inviter | 创建 `promotion_invite_relation`，状态 `registered` |
| L3-02 | `PromotionInviteServiceTest.bind_oldUser_shouldIgnore` | 老用户、有效 trace | 不创建有效关系，来源状态 `ignored` |
| L3-03 | `PromotionInviteServiceTest.bind_selfInvite_shouldInvalid` | inviterId 等于 inviteeId | 拒绝绑定或置 `invalid`，原因 `self_invite` |
| L3-04 | `PromotionInviteServiceTest.bind_duplicateInvitee_shouldKeepFirstRelation` | 同一 invitee 两次绑定不同来源 | 第二次不覆盖第一次 |
| L3-05 | `PromotionInviteServiceTest.bind_agentPriority_shouldPreferAgent` | 同时命中普通用户来源和校园代理来源 | 关系归属代理，普通邀请不发币 |
| L3-06 | `PromotionRewardServiceTest.handleRegisterLogin_shouldCreateRewardOnce` | 注册登录事件重复触发两次 | 只生成一条注册登录奖励 |
| L3-07 | `PromotionRewardServiceTest.handleProfileComplete_shouldUpdateStatusAndReward` | 已绑定关系、资料完成事件 | 状态 `profile_completed`，生成资料奖励 |
| L3-08 | `PromotionRewardServiceTest.handleVerifySuccess_shouldCountSuccessInvite` | 三项认证完成事件 | 状态 `verify_success`，成功邀请数 +1 |
| L3-09 | `PromotionRewardServiceTest.handleVerifySuccess_shouldCreateLadderReward` | 成功邀请数达到阶梯 | 生成三项认证奖励和阶梯奖励 |
| L3-10 | `PromotionRewardServiceTest.disabledRule_shouldNotReward` | 对应规则 disabled | 不生成奖励流水 |
| L3-11 | `PromotionRewardServiceTest.riskHit_shouldFreezeReward` | 风控命中同设备阈值 | 奖励状态 `frozen`，不写成家币流水 |
| L3-12 | `PromotionRewardServiceTest.approveFrozen_shouldCreditCoinAndNotify` | frozen 奖励人工通过 | 状态 `success`，调用成家币流水 Mock 和通知 Mock |
| L3-13 | `PromotionRewardServiceTest.rejectFrozen_shouldInvalidWithoutCoin` | frozen 奖励人工驳回 | 状态 `invalid`，不调用成家币流水 |
| L3-14 | `PromotionAgentServiceTest.createAgent_shouldGenerateUniqueCode` | 新增代理并生成码 | qrCode 唯一，状态 enabled |
| L3-15 | `PromotionAgentServiceTest.disabledQrCode_shouldRejectNewRelation` | 停用校园代理二维码后绑定 | 不建立代理关系 |
| L3-16 | `PromotionAgentEventServiceTest.handleVerifySuccess_shouldCreateBonusOnce` | 代理用户三项认证完成重复触发 | 只生成一条代理奖金 |
| L3-17 | `PromotionAgentStatsServiceTest.stats_shouldAggregateByEventType` | click/register/login/profile/verify/paid 事件 | 统计字段准确 |
| L3-18 | `PromotionSettlementServiceTest.createSettlement_shouldAttachPendingBonus` | 待结算奖金明细 | 生成结算单并关联明细 |
| L3-19 | `PromotionSettlementServiceTest.createDuplicatePeriod_shouldReject` | 同代理同周期重复生成 | 抛业务异常 |
| L3-20 | `PromotionSettlementServiceTest.paidFromPending_shouldReject` | pending 结算单直接 paid | 抛业务异常，必须先 confirmed |
| L3-21 | `PromotionAuditServiceTest.reviewActions_shouldWriteAuditLog` | 规则修改、冻结处理、代理停用、结算发放 | 均写推广审计日志 |

## 6. L4 - E2E 浏览器测试用例

| 用例ID | 优先级 | 页面 | 操作步骤 | 期望结果 |
|--------|--------|------|----------|----------|
| L4-01 | P0 | 推广规则配置 | 运营登录 → 进入 `/promotion/rules` → 新增普通邀请注册奖励规则 → 保存 | 列表出现新规则，状态启用 |
| L4-02 | P0 | 推广规则配置 | 编辑阶梯规则为 `0-2/3-8/9-20/21-50` → 保存 → 重新打开详情 | 四档阶梯回显准确 |
| L4-03 | P0 | 普通邀请关系 | 进入 `/promotion/invites` → 按邀请人/状态筛选 → 打开详情 | 详情展示点击、注册、认证、奖励、风控记录 |
| L4-04 | P0 | 冻结奖励处理 | 风控登录 → 进入冻结奖励页 → 选择一条 frozen → 确认有效并发放 | 页面提示成功，记录从冻结队列移除 |
| L4-05 | P0 | 代理列表 | 渠道运营登录 → 新增代理 → 生成校园代理二维码 | 列表出现代理，详情展示二维码编号和小程序路径 |
| L4-06 | P0 | 代理结算管理 | 财务登录 → 选择代理和周期 → 生成结算单 → 标记确认 → 标记已发放 | 结算状态依次变为 `pending/confirmed/paid` |
| L4-07 | P1 | 推广素材与二维码 | 渠道运营进入素材页 → 下载/停用校园代理二维码 | 二维码状态变化，按钮权限正确 |
| L4-08 | P1 | 代理详情 | 打开代理详情 → 切换推广明细/奖金明细/结算记录 Tab | 各 Tab 数据加载正常，空态友好 |
| L4-09 | P2 | 规则配置异常 | 新增规则输入负数金额或重叠阶梯 | 前端拦截或后端错误 toast，弹窗不关闭 |
| L4-10 | P3 | 权限差异 | 使用只读运营账号访问推广规则页 | 新增/编辑/删除/导出按钮不可见 |
| L4-11 | P3 | 权限差异 | 使用无推广权限账号访问 `/promotion/rules` | 显示无权限或路由不可达 |

## 7. 前端手动测试用例

| 用例ID | 优先级 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|--------|--------|----------|----------|----------|------|
| M-01 | P0 | 检查推广管理菜单及 8 个二级页展示 | 菜单名称、图标、排序、路由与技术方案一致 |  |  |
| M-02 | P0 | 检查规则配置页筛选、分页、空态、加载态 | 搜索和分页准确，空态文案清晰 |  |  |
| M-03 | P0 | 检查冻结处理二次确认弹窗 | 操作前必须确认并填写备注 |  |  |
| M-04 | P0 | 检查代理新增/编辑表单 | 必填项、状态、学校、校区、规则组校验正确 |  |  |
| M-05 | P1 | 检查结算单金额展示 | 金额保留两位或四位小数，字段不溢出 |  |  |
| M-06 | P1 | 检查导出按钮 | 无数据时给出提示，有数据时可下载 |  |  |
| M-07 | P1 | 检查长手机号/长学校名/长备注 | 表格不撑破布局，文本省略或换行合理 |  |  |
| M-08 | P2 | 检查多个页面返回和刷新 | 筛选条件、分页、Tab 状态符合预期 |  |  |
| M-09 | P2 | 检查接口失败态 | toast 显示错误，页面不白屏 |  |  |
| M-10 | P3 | 检查多角色按钮显隐 | 运营、渠道运营、风控、财务只看到各自权限按钮 |  |  |

## 8. 补充用例（来自审查报告）

> 暂无。后续 Code Review 发现 Critical/Warning 后，将追加到此章节并延续用例 ID。

| 用例ID | 来源 | 审查级别 | 场景 | 期望结果 |
|--------|------|----------|------|----------|
