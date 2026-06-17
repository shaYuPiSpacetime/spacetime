# 推广裂变与邀请奖励 - 测试用例

> **关联文档**：
> - 技术方案：`docs/技术方案/2026-06-16-PRD-07推广裂变与邀请奖励正式版-tcdesign.md`
> - 模块公共定义：`docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/PRD-07_模块公共定义.md`
> - 移动端 PRD：`docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/模块PRD文档/模块PRD_APP-07_推广裂变与邀请奖励.md`
> - 管理后台 PRD：`docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/管理后台/模块PRD文档/模块PRD_ADM-07_推广管理.md`
> - 测试报告：`docs/测试文档/推广裂变-testreport.md`
>
> **创建日期**：2026-06-16
> **测试模式**：完整模式，正式版重写
> **目标项目**：后端 `backend/` / 前端 `frontend/`
> **状态**：测试设计已重写，尚未执行
> **导出测试**：需求保留但首版代码和测试暂不实现；后续由全后台导出中心统一接入后，再补导出接口、审计和文件内容校验用例。

---

## 1. 测试策略决策

### 后端评估

| 维度 | 评估结果 | 得分 |
|------|----------|------|
| A 新增/修改接口数 | 管理后台 9 页面接口 + 小程序 7 个接口 + 结算任务；导出接口需求保留但首版不实现 | 2 |
| B 状态流转逻辑 | 邀请关系、邀请奖励、代理合作、代理奖金、结算单均有状态机 | 2 |
| C 纯计算/规则逻辑 | 成功口径、阶梯、风控、单日上限、渠道优先、幂等、结算汇总 | 2 |
| D 数据关联复杂度 | 规则、配置、来源池、关系、奖励、代理、二维码、事件、奖金、结算、审计、资产、通知 | 2 |
| E 老代码影响范围 | 需重构现有 promotion 接口、枚举、状态、前端页面，并接入注册/认证/支付事件 | 2 |
| F 安全变更 | 新增/调整推广权限码、多角色按钮与接口权限；导出审计待导出中心统一实现 | 1 |
| **总分** |  | **11 -> L1 + L2 + L3** |

### 前端评估

| 条件 | 命中 | 说明 |
|------|------|------|
| G 多角色权限差异 | 是 | 运营、渠道运营、财务、风控、超管权限不同 |
| H 复杂交互流程 | 是 | 规则多 Tab、冻结处理、二维码重生成、结算状态流转 |
| I 多页面联动 | 是 | 代理列表/详情/素材/结算、邀请关系/奖励流水/冻结队列联动 |
| J 核心业务页面 | 是 | 推广管理是增长和结算核心后台模块 |

**最终策略：L1 + L2 + L3 + L4 + 手动验收。**

> 本文件只定义正式版“测什么”。执行测试前必须确认 `API_URL`、`BASE_URL`、Token、角色账号和可用测试数据；缺失时 L1/L4 对应写入用例跳过，不编造数据。

## 2. 测试数据准备

| 数据需求 | 用途 | 如何准备 | 是否幂等 |
|----------|------|----------|----------|
| 后台超管 Token | 规则读取、全量后台接口冒烟 | `.env` 或登录接口获取 | 是 |
| 运营 Token | 普通奖励规则配置、邀请/奖励查看 | 创建具备 `promotion:rule:invite:save`、`promotion:relation:list`、`promotion:reward:list` 的角色 | 是 |
| 渠道运营 Token | 代理、素材、结算确认 | 创建具备 `promotion:agent:*`、`promotion:material:*`、`promotion:settlement:confirm` 的角色 | 是 |
| 风控 Token | 风控参数配置、冻结处理 | 创建具备 `promotion:rule:risk:save`、`promotion:reward:review`、`promotion:relation:review` 的角色 | 是 |
| 财务 Token | 结算查看、标记已发放 | 创建具备 `promotion:settlement:list/pay` 的角色；导出权限待导出中心上线后补测 | 是 |
| 小程序邀请人 Token | 邀请首页、二维码、记录 | 用户准入模块创建或使用测试账号 | 否 |
| 小程序被邀请人 Token | 绑定关系、触发奖励 | 首次注册用户，不能复用老用户 | 否 |
| 普通奖励配置 | 奖励发放和进度展示 | 调规则配置接口设置 5 类事件、成功口径、阶梯 | 是 |
| 代理奖金规则组 | 新增代理和奖金生成 | 调代理奖励规则配置接口准备启用规则组 | 是 |
| 校园代理与二维码 | 渠道优先、素材页、代理统计 | 后台代理接口创建并生成二维码 | 否 |
| 冻结邀请关系/奖励 | 冻结队列和人工处理 | L3 Mock 风控命中；L1 可通过 SQL fixture 或测试环境预置 | 否 |
| 待结算代理奖金 | 系统结算任务、结算状态流转 | L3 Mock/fixture；L1 使用预置 `TEST_SETTLEMENT_ID` | 否 |
| PRD-04 资产流水 Mock | 奖励到账验证 | 资产模块未完成时 Mock `CoinLogService` | 是 |
| PRD-03 通知 Mock | 到账/冻结/无效通知 | 通知模块未完成时 Mock 通知服务 | 是 |

## 3. L1 - 接口测试用例

### 3.1 小程序推广接口

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F1-P0-01 | P0 | 获取邀请首页 | `GET /miniapp/promotion/invite/home` | 邀请人已登录，规则已配置 | 小程序 Token | 返回 `successInviteCount/arrivedCoin/qrCode/recentRecords` | 响应断言 |
| F1-P0-02 | P0 | 获取活动规则 | `GET /miniapp/promotion/invite/rules` | 已配置推广文案或有兜底文案 | 小程序 Token | 返回规则文案、成功口径、奖励说明 | 响应断言 |
| F1-P0-03 | P0 | 查询邀请记录 | `GET /miniapp/promotion/invite/records` | 邀请人存在关系 | 小程序 Token | 分页返回脱敏记录，状态为正式枚举中文名 | 响应断言 |
| F1-P0-04 | P0 | 记录普通用户来源 | `POST /miniapp/promotion/invite/share-log` | 有邀请人 | 接口自构建 | 返回 `traceNo`，sourceType=`normal_user` | 响应断言 |
| F1-P0-05 | P0 | 记录校园代理来源 | `POST /miniapp/promotion/invite/share-log` | 代理二维码存在 | 链式代理二维码 | 返回 `traceNo`，sourceType=`campus_agent` | 响应断言 |
| F1-P0-06 | P0 | 新用户绑定普通邀请 | `POST /miniapp/promotion/invite/bind` | 被邀请人为首次注册用户，普通来源有效 | 链式 | 建立关系，状态 `registered`，触发注册奖励判定 | 查询关系 |
| F1-P0-07 | P0 | 新用户绑定代理来源 | `POST /miniapp/promotion/invite/bind` | 被邀请人为首次注册用户，代理来源有效 | 链式 | 建立代理归属，不给普通邀请人发币 | 查询关系/代理事件 |
| F1-P1-01 | P1 | 邀请首页（未配置规则） | `GET /miniapp/promotion/invite/home` | 邀请人已登录，后台推广规则未配置 | 小程序 Token | `successInviteCount`=0，`nextLadderText` 为空或不展示，不报错 | 响应断言 |
| F1-P1-02 | P1 | 获取活动规则（文案配置缺失或加载失败） | `GET /miniapp/promotion/invite/rules` | 后台未配置推广文案，或文案服务加载失败 | 小程序 Token | 返回内置兜底规则文案，不返回空白规则页，不报错 | 响应断言 |
| F1-P1-03 | P1 | 邀请记录按状态筛选 | `GET /miniapp/promotion/invite/records?status=registered` | 邀请人存在多个不同状态的关系 | 小程序 Token | 只返回 status=registered 的记录，分页正确 | 响应断言 |
| F1-P1-04 | P1 | 普通和代理同时命中 | `POST /miniapp/promotion/invite/bind` | 同一新用户注册前命中两类来源 | 链式 | 永远归属 `campus_agent` | 查询关系 |
| F1-P1-05 | P1 | 获取普通用户二维码 | `GET /miniapp/promotion/invite/qr-code` | 邀请人已登录 | 小程序 Token | 返回二维码信息或可重试降级态 | 响应断言 |
| F1-P1-06 | P1 | 解析代理二维码来源 | `GET /miniapp/promotion/invite/qr-source` | 代理二维码编号有效 | 链式 | 返回 available=true、miniappPath | 响应断言 |
| F1-P2-01 | P2 | 无效来源绑定 | `POST /miniapp/promotion/invite/bind` | trace/qrCode 均无效 | 固定值 | 返回业务错误 `M07-ERR-7001` 或等价错误 | 响应断言 |
| F1-P2-02 | P2 | 老用户绑定邀请 | `POST /miniapp/promotion/invite/bind` | 当前用户非新用户 | 测试夹具 | 不建立新关系，不发奖 | 查询关系 |
| F1-P2-03 | P2 | 自邀请 | `POST /miniapp/promotion/invite/bind` | inviterId 等于当前用户 | 测试夹具 | 拒绝或置 invalid，原因 `self_invite` | 响应/查询断言 |
| F1-P2-04 | P2 | 重复绑定同一被邀请人 | `POST /miniapp/promotion/invite/bind` | 被邀请人已有有效关系 | 链式重复 | 不覆盖首次关系 | 查询关系 |
| F1-P3-01 | P3 | 未登录访问邀请首页 | `GET /miniapp/promotion/invite/home` | 无 Token | 无需数据 | 返回 401 | HTTP 断言 |
| F1-P3-02 | P3 | 未登录访问邀请记录 | `GET /miniapp/promotion/invite/records` | 无 Token | 无需数据 | 返回 401 | HTTP 断言 |

### 3.2 后台规则配置接口

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F2-P0-01 | P0 | 获取规则配置聚合详情 | `GET /admin/promotion/rule-config` | 有后台 Token | 自动查询 | 返回普通奖励、代理奖励、有效期、风控参数四块 | 响应断言 |
| F2-P0-02 | P0 | 保存普通奖励配置 | `PUT /admin/promotion/rule-config/invite-reward` | 运营/超管权限 | 自构建 | 5 类事件、成功口径、奖励方式、阶梯保存成功 | 再查详情 |
| F2-P0-03 | P0 | 保存代理奖金规则组 | `PUT /admin/promotion/rule-config/agent-bonus` | 渠道运营/超管权限 | 自构建 | 规则组可被代理新增/编辑选择 | 再查详情 |
| F2-P0-04 | P0 | 保存风控参数 | `PUT /admin/promotion/rule-config/risk` | 风控/超管权限 | 自构建 | 阈值和开关保存成功，写审计 | 再查详情 |
| F2-P1-01 | P1 | 成功统计口径无默认值 | `GET /admin/promotion/rule-config` | 清空配置或新环境 | 测试环境 | 未配置时不返回默认成功口径 | 响应断言 |
| F2-P1-02 | P1 | 阶梯区间重叠 | `PUT /admin/promotion/rule-config/invite-reward` | 运营/超管权限 | 构造非法阶梯 | 返回参数/业务错误，不保存 | 响应断言 |
| F2-P1-03 | P1 | 启用事件但金额为空 | `PUT /admin/promotion/rule-config/invite-reward` | 运营/超管权限 | 构造非法事件 | 返回校验错误 | 响应断言 |
| F2-P1-04 | P1 | 奖励方式选阶梯+有效档位保存 | `PUT /admin/promotion/rule-config/invite-reward` | 运营/超管权限 | 自构建阶梯档位 | rewardMode=`ladder`，ladder 档位保存成功，查询回显正确 | 再查详情 |
| F2-P2-01 | P2 | 风控阈值非法 | `PUT /admin/promotion/rule-config/risk` | 风控/超管权限 | 阈值 0 或负数 | 返回校验错误 | 响应断言 |
| F2-P3-01 | P3 | 财务无权保存风控 | `PUT /admin/promotion/rule-config/risk` | 财务 Token | 多角色 Token | 返回 403 | HTTP 断言 |
| F2-P3-02 | P3 | 未登录读取规则 | `GET /admin/promotion/rule-config` | 无 Token | 无需数据 | 返回 401 | HTTP 断言 |

### 3.3 后台邀请关系与奖励接口

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F3-P0-01 | P0 | 邀请关系列表 | `GET /admin/promotion/invite-relations/list` | 存在关系或空态 | 自动查询 | 返回分页，展示业务编号和中文状态 | 响应断言 |
| F3-P0-02 | P0 | 邀请关系详情 | `GET /admin/promotion/invite-relations/{id}` | 存在关系 | 自动查询/fixture | 返回时间线、奖励、风控、审计 | 响应断言 |
| F3-P0-03 | P0 | 奖励流水列表 | `GET /admin/promotion/invite-rewards/list` | 存在奖励或空态 | 自动查询 | 返回事件中文名、状态中文名、成家币数 | 响应断言 |
| F3-P0-04 | P0 | 冻结奖励队列 | `GET /admin/promotion/invite-rewards/frozen/list` | 存在 frozen 奖励 | fixture | 只返回 frozen 状态 | 响应断言 |
| F3-P0-05 | P0 | 冻结奖励确认发放 | `PUT /admin/promotion/invite-rewards/{id}/approve` | 奖励为 frozen | fixture | 状态转 success，写资产流水和审计 | 查询奖励/资产 |
| F3-P0-06 | P0 | 冻结奖励确认无效 | `PUT /admin/promotion/invite-rewards/{id}/reject` | 奖励为 frozen | fixture | 状态转 invalid，不写资产流水 | 查询奖励 |
| F3-P1-01 | P1 | 邀请关系解除冻结 | `PUT /admin/promotion/invite-relations/{id}/unfreeze` | 关系为 frozen | fixture | 恢复冻结前状态，关联奖励恢复处理 | 查询详情 |
| F3-P1-02 | P1 | 邀请关系人工判无效 | `PUT /admin/promotion/invite-relations/{id}/invalid` | 关系非终态 | fixture | 关系 invalid，关联奖励 invalid | 查询详情 |
| F3-P1-03 | P1 | 导出邀请关系 | 后续导出中心接口 | 有导出权限 | 查询条件 | **首版暂不测试**；待全后台导出中心上线。期望：返回导出任务或文件，写审计 | 响应/审计 |
| F3-P1-04 | P1 | 导出奖励流水 | 后续导出中心接口 | 有导出权限 | 查询条件 | **首版暂不测试**；待全后台导出中心上线。期望：返回导出任务或文件，写审计 | 响应/审计 |
| F3-P2-01 | P2 | 处理非 frozen 奖励 | `PUT /admin/promotion/invite-rewards/{id}/approve` | 奖励为 success/invalid | fixture | 返回状态不允许 | 响应断言 |
| F3-P2-02 | P2 | 不存在关系详情 | `GET /admin/promotion/invite-relations/999999999` | 无 | 固定值 | 返回业务错误或空数据 | 响应断言 |
| F3-P3-01 | P3 | 无权限处理冻结 | `PUT /admin/promotion/invite-rewards/{id}/approve` | 低权限 Token | 多角色 Token | 返回 403 | HTTP 断言 |

### 3.4 后台代理、素材与结算接口

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F4-P0-01 | P0 | 新增代理 | `POST /admin/promotion/agents` | 渠道运营/超管权限，规则组存在 | 自构建 | 返回代理 ID，生成 `AGT-*` 编号 | 查询详情 |
| F4-P0-02 | P0 | 代理列表 | `GET /admin/promotion/agents/list` | 代理存在或空态 | 自动查询 | 返回代理编号、名称、合作状态中文 | 响应断言 |
| F4-P0-03 | P0 | 代理详情 | `GET /admin/promotion/agents/{id}` | 代理存在 | 链式 | 返回基础信息、统计、奖金、结算摘要 | 响应断言 |
| F4-P0-04 | P0 | 素材二维码列表 | `GET /admin/promotion/materials/list` | 代理二维码存在或空态 | 自动查询 | 返回二维码编号、缩略图、路径、状态 | 响应断言 |
| F4-P0-05 | P0 | 重新生成二维码 | `POST /admin/promotion/materials/{id}/regenerate` | 二维码存在 | 链式 | version+1，新旧二维码均可追溯 | 查询列表/历史 |
| F4-P0-06 | P0 | 结算列表 | `GET /admin/promotion/settlements/list` | 结算单存在或空态 | 自动查询 | 返回 `unsettled/confirmed/paid` 中文状态 | 响应断言 |
| F4-P0-07 | P0 | 标记结算已确认 | `PUT /admin/promotion/settlements/{id}/confirm` | 结算单为 unsettled | fixture | 状态转 confirmed，写审计 | 查询结算 |
| F4-P0-08 | P0 | 标记结算已发放 | `PUT /admin/promotion/settlements/{id}/paid` | 结算单为 confirmed | fixture | 状态转 paid，写审计 | 查询结算 |
| F4-P1-01 | P1 | 暂停代理 | `PUT /admin/promotion/agents/{id}/status` | 代理 normal | 链式 | 状态转 paused，新用户仍可进入小程序 | 查询代理 |
| F4-P1-02 | P1 | 终止代理 | `PUT /admin/promotion/agents/{id}/status` | 代理 normal/paused | fixture | 状态转 terminated，停止新计奖 | 查询代理 |
| F4-P1-03 | P1 | 停用二维码展示 | `PUT /admin/promotion/materials/{id}/disable` | 二维码 enabled | 链式 | 状态停用展示；已生成二维码仍永久有效 | 查询二维码/扫码 |
| F4-P1-04 | P1 | 导出结算列表/明细 | 后续导出中心接口 | 财务/超管权限 | 查询条件 | **首版暂不测试**；待全后台导出中心上线。期望：返回导出任务或文件，写审计 | 响应/审计 |
| F4-P2-01 | P2 | pending_settlement 奖金重复结算 | 系统任务接口/Service | 同代理同周期重复触发 | L3/L1 fixture | 不重复生成结算单 | 查询数量 |
| F4-P2-02 | P2 | paid 结算单重复发放 | `PUT /admin/promotion/settlements/{id}/paid` | 结算单已 paid | fixture | 返回状态不允许 | 响应断言 |
| F4-P3-01 | P3 | 运营无权新增代理 | `POST /admin/promotion/agents` | 运营 Token | 多角色 Token | 返回 403 | HTTP 断言 |
| F4-P3-02 | P3 | 渠道运营无权标记 paid | `PUT /admin/promotion/settlements/{id}/paid` | 渠道运营 Token | 多角色 Token | 返回 403 | HTTP 断言 |

## 4. L2 - Controller 测试用例

| 用例ID | 测试方法 | 验证点 | 期望 |
|--------|----------|--------|------|
| L2-01 | `PromotionRuleConfigControllerTest.getConfig_shouldReturnRConfigVO` | 聚合配置路由和返回类型 | HTTP 200，`R<PromotionRuleConfigVO>` |
| L2-02 | `PromotionRuleConfigControllerTest.saveInviteReward_shouldValidateBody` | 普通奖励保存参数校验 | 非法阶梯/金额返回参数错误 |
| L2-03 | `PromotionRuleConfigControllerTest.saveRisk_shouldRequirePermission` | 风控保存权限注解 | 无权限返回 403 |
| L2-04 | `PromotionRelationControllerTest.list_shouldBindPageReq` | 关系列表分页/筛选绑定 | 返回 `Page<InviteRelationVO>` |
| L2-05 | `PromotionRelationControllerTest.detail_shouldReturnDetailVO` | 关系详情路径参数 | 返回 `InviteRelationDetailVO` |
| L2-06 | `PromotionRelationControllerTest.reviewActions_shouldValidateRemark` | 解除冻结/判无效备注 | 缺少备注返回参数错误 |
| L2-07 | `PromotionRewardControllerTest.frozen_shouldFilterFrozen` | 冻结队列固定过滤 | Service 入参包含 frozen |
| L2-08 | `PromotionRewardControllerTest.approve_shouldRequireReviewPermission` | 冻结发放权限 | 无权限返回 403 |
| L2-09 | `PromotionAgentControllerTest.create_shouldValidateRequiredFields` | 新增代理必填校验 | 缺代理名称返回参数错误 |
| L2-10 | `PromotionMaterialControllerTest.regenerate_shouldReturnQrCodeVO` | 二维码重生成路由 | 返回 `AgentQrCodeVO` |
| L2-11 | `PromotionSettlementControllerTest.confirm_shouldValidateStateAction` | 结算确认路由 | 调用 Service 并返回 `R<Void>` |
| L2-12 | `PromotionSettlementControllerTest.paid_shouldRequireFinancePermission` | 标记已发放权限 | 无权限返回 403 |
| L2-13 | `PromotionInviteControllerTest.home_shouldRequireLogin` | 小程序邀请首页登录态 | 无 Token 返回 401 |
| L2-14 | `PromotionInviteControllerTest.shareLog_shouldAllowAnonymous` | 分享来源允许匿名 | 无 Token 可记录来源 |
| L2-15 | `PromotionInviteControllerTest.bind_shouldValidateSource` | 绑定来源必填 | 无来源返回参数错误 |
| L2-16 | `PromotionInviteControllerTest.records_shouldReturnRecordVOPage` | 小程序记录不返回 Entity | 返回 `Page<InviteRecordVO>` |
| L2-17 | `PromotionInviteControllerTest.shareLog_shouldBindReqAndReturnTraceVO` | 分享来源路由与参数绑定 | 入参绑定正确，返回 `InviteSourceTraceVO` |
| L2-18 | `PromotionInviteControllerTest.qrCode_shouldRequireLoginAndReturnQrVO` | 二维码接口登录态与返回类型 | 无 Token 返回 401；有 Token 返回 `InviteQrCodeVO` |
| L2-19 | `PromotionInviteControllerTest.qrSource_shouldAllowAnonymousAndReturnSourceVO` | 二维码来源解析匿名可访问 | 返回 `InviteQrSourceVO`，scene 参数绑定正确 |
| L2-20 | `PromotionInviteControllerTest.bind_shouldRequireLoginAndValidateBody` | 绑定接口登录态与参数校验 | 无 Token 返回 401；inviteTraceId/qrCode 必填校验 |

## 5. L3 - Service 单元测试用例

| 用例ID | 测试方法 | 输入 | 期望输出 |
|--------|----------|------|----------|
| L3-01 | `PromotionRuleConfigServiceTest.noConfig_shouldNotReturnDefaultReward` | 空配置 | 不返回默认金额/成功口径 |
| L3-02 | `PromotionRuleConfigServiceTest.saveInviteReward_shouldValidateLadderRange` | 重叠阶梯 | 抛业务异常 |
| L3-03 | `PromotionRuleConfigServiceTest.saveAgentBonus_shouldRejectDuplicateGroupName` | 重复规则组名 | 抛业务异常 |
| L3-04 | `PromotionRuleConfigServiceTest.saveRisk_shouldWriteAudit` | 合法风控配置 | 保存成功并写审计 |
| L3-05 | `PromotionRuleConfigServiceTest.saveRewardModeLadder_shouldValidateLadderRequired` | rewardMode=ladder 但未配置阶梯档位 | 抛业务异常，提示需配置阶梯 |
| L3-06 | `PromotionRuleConfigServiceTest.saveRewardModeFixed_shouldIgnoreLadder` | rewardMode=fixed 时附带阶梯数据 | 忽略阶梯配置，按固定金额发奖 |
| L3-07 | `PromotionInviteServiceTest.bindNormal_shouldCreateRegisteredRelation` | 新用户普通来源 | 创建 `normal_user` 关系 |
| L3-08 | `PromotionInviteServiceTest.bindCampusAgent_shouldPreferAgent` | 普通+代理来源 | 创建 `campus_agent` 关系 |
| L3-09 | `PromotionInviteServiceTest.bindOldUser_shouldRejectOrIgnore` | 老用户来源 | 不建立有效关系 |
| L3-10 | `PromotionInviteServiceTest.bindDuplicate_shouldKeepFirstRelation` | 同一 invitee 重复绑定 | 不覆盖首次关系 |
| L3-11 | `PromotionInviteServiceTest.selfInvite_shouldInvalid` | inviter=invitee | 拒绝或 invalid，原因 `self_invite` |
| L3-12 | `PromotionInviteEventServiceTest.registerReward_shouldBeIdempotent` | 注册事件重复触发 | 只生成一条奖励 |
| L3-13 | `PromotionInviteEventServiceTest.profileReward_shouldAdvanceStatus` | 头像认证通过 | 状态转 `profile_completed` |
| L3-14 | `PromotionInviteEventServiceTest.verifyReward_shouldAdvanceStatus` | 实名+学历完成 | 状态转 `verify_success` |
| L3-15 | `PromotionInviteEventServiceTest.firstVip_shouldRequireBizNo` | 首次 VIP 支付事件 | 使用 `bizNo` 幂等 |
| L3-16 | `PromotionInviteEventServiceTest.dailyCapExceeded_shouldNotReward` | 超出单日上限 | 不发放且不进入冻结 |
| L3-17 | `PromotionInviteEventServiceTest.totalCapExceeded_shouldNotReward` | 单邀请人累计奖励达 `M07-CFG-invite-reward-cap` 上限后再触发新奖励事件 | 超出部分不发放，不进入冻结队列 |
| L3-18 | `PromotionInviteEventServiceTest.riskHitSameDevice_shouldFreezeRewardAndRelation` | 命中同设备批量注册（≥阈值） | 奖励 frozen，关联关系也 frozen，记录风控原因 `same_device` |
| L3-19 | `PromotionInviteEventServiceTest.riskHitPayment_shouldFreezeRewardOnly` | 命中同支付账号异常（仅支付类奖励） | 仅该笔奖励 frozen，关系状态不变，记录风控原因 `same_payment` |
| L3-20 | `PromotionRewardAdminServiceTest.approveFrozen_shouldCreditCoinAndNotify` | frozen 奖励通过 | success，写资产流水，通知失败不回滚 |
| L3-21 | `PromotionRewardAdminServiceTest.rejectFrozen_shouldInvalidWithoutCoin` | frozen 奖励驳回 | invalid，不写资产流水 |
| L3-22 | `PromotionRelationAdminServiceTest.markInvalid_shouldInvalidateRewards` | 关系人工判无效 | 关系和关联奖励 invalid |
| L3-23 | `PromotionAgentServiceTest.create_shouldGenerateAgentNo` | 新增代理 | 生成 `AGT-*` 编号 |
| L3-24 | `PromotionAgentStatServiceTest.createAgent_shouldInitStatRow` | 新增代理 | 同事务初始化 `promo_agent_stat`，计数/金额均为 0 |
| L3-25 | `PromotionAgentStatServiceTest.agentEvent_shouldRefreshStatCounters` | 代理 click/register/verify/firstVip/firstCoin 事件 | 对应累计字段递增，`lastEventTime` 更新 |
| L3-26 | `PromotionAgentStatServiceTest.successMetricChange_shouldRebuildSuccessCount` | 成功统计口径变更后重算 | `success_cnt` 按新口径重算，`stat_version` 递增 |
| L3-27 | `PromotionAgentStatServiceTest.settlementStatus_shouldRefreshBonusAmounts` | 结算生成/确认/已发放 | 待结算/已确认/已发放金额统计正确 |
| L3-28 | `PromotionAgentStatServiceTest.rebuild_shouldBeIdempotentFromFacts` | 重复执行统计补偿任务 | 从事实表覆盖统计快照，不重复累计 |
| L3-29 | `PromotionInviteServiceTest.bindAgentPaused_shouldStillAttribute` | 代理 paused，新用户扫码注册 | 来源仍归代理渠道（渠道优先永久生效），但 paused 期间不计新奖金 |
| L3-30 | `PromotionInviteServiceTest.bindAgentTerminated_shouldStillAttributeButNoBonus` | 代理 terminated，新用户扫码注册 | 来源仍归代理渠道，但 terminated 后停止新计奖 |
| L3-31 | `PromotionMaterialServiceTest.regenerate_shouldKeepOldQrValid` | 重生成二维码 | version+1，旧码仍可归因 |
| L3-32 | `PromotionMaterialServiceTest.disable_shouldOnlyHideMaterial` | 停用二维码展示 | 不破坏已生成二维码归因 |
| L3-33 | `PromotionAgentEventServiceTest.agentBonus_shouldBeIdempotent` | 代理事件重复 | 只生成一条奖金，统计不重复累计 |
| L3-34 | `PromotionSettlementTaskServiceTest.generateMonthly_shouldCreateUnsettled` | 月度待结算奖金 | 生成 unsettled 结算单并刷新 `promo_agent_stat` |
| L3-35 | `PromotionSettlementTaskServiceTest.generateDuplicatePeriod_shouldReject` | 同代理同周期重复 | 不重复生成，统计金额不重复累计 |
| L3-36 | `PromotionSettlementAdminServiceTest.confirm_shouldOnlyAllowUnsettled` | confirmed/paid 结算单确认 | 非法状态拒绝 |
| L3-37 | `PromotionSettlementAdminServiceTest.paid_shouldOnlyAllowConfirmed` | unsettled 直接 paid | 抛业务异常 |
| L3-38 | `PromotionExportServiceTest.exportSensitiveData_shouldWriteAudit` | 导出关系/奖励/结算 | **首版暂不测试**；待全后台导出中心上线。期望：生成导出任务并写审计 |
| L3-39 | `PromotionEnumMigrationTest.legacyValues_shouldMapToFormalValues` | 旧枚举数据 | 映射为正式枚举 |
| L3-40 | `PromotionAuditLogTest.sensitiveOperation_shouldWriteAudit` | 修改规则/冻结处理/代理状态变更/结算状态变更 | `promotion_audit_log` 写入操作人、动作、对象、前后值、备注、时间 |
| L3-41 | `PromotionAuditLogTest.auditLog_shouldBeQueryable` | 按操作人/时间范围/动作查询审计日志 | 分页返回，字段完整 |

## 6. L4 - E2E 浏览器测试用例

| 用例ID | 优先级 | 页面 | 操作步骤 | 期望结果 |
|--------|--------|------|----------|----------|
| L4-00 | P0 | 推广管理菜单树 | 超管进入任一推广页面，检查侧栏 `推广裂变` 下的正式版二级页 | 展示推广规则配置、普通邀请关系、普通邀请奖励流水、冻结奖励处理页、代理列表、代理结算管理、推广素材与二维码管理；不再展示旧版“奖励审核/校园代理”等入口 |
| L4-01 | P0 | 推广规则配置 | 运营进入 `/promotion/rule-config`，切换普通用户奖励 Tab，保存 5 类奖励配置 | 保存成功，二次确认出现，配置回显 |
| L4-02 | P0 | 推广规则配置 | 风控进入风控参数 Tab，修改阈值和开关 | 保存成功，财务角色只读或无权限 |
| L4-03 | P0 | 普通邀请关系列表 | 进入 `/promotion/invite-relation`，按状态和关键词查询，打开详情 | 列表展示中文状态，详情展示时间线/奖励/审计 |
| L4-04 | P0 | 冻结奖励处理 | 风控进入 `/promotion/invite-reward/frozen`，对 frozen 奖励确认发放/判无效 | 二次确认，处理后从队列移除 |
| L4-05 | P0 | 代理列表 | 渠道运营进入 `/promotion/agent`，新增代理并选择奖金规则组 | 列表出现代理编号，统计字段来自 `promo_agent_stat` 且默认 0，详情可打开 |
| L4-06 | P0 | 代理详情 | 从代理列表点击代理进入 `/promotion/agent/:id` | 展示基础信息、转化统计（注册/认证/首次会员/首次充值）、奖金汇总、结算摘要 |
| L4-07 | P0 | 推广素材与二维码 | 进入 `/promotion/material`，预览、重新生成、停用二维码展示 | version 变化，停用文案提示永久有效 |
| L4-08 | P0 | 代理结算管理 | 财务进入 `/promotion/settlement`，确认结算并标记已发放 | 状态 `待结算 -> 已确认 -> 已发放` |
| L4-09 | P1 | 多角色权限 | 使用运营/渠道/财务/风控 Token 分别访问对应页面 | 菜单和按钮只展示授权能力 |
| L4-10 | P1 | 错误/空态 | Mock 列表空数据和接口 500 | 展示“暂无数据”或 toast + 重试，不白屏 |

## 7. 前端手动测试用例

| 用例ID | 优先级 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|--------|--------|----------|----------|----------|------|
| M-01 | P0 | 检查推广管理 9 个二级页面菜单、路由、面包屑 | 与 ADM-07 页面规格一致 |  | 未执行 |
| M-02 | P0 | 检查规则配置四个 Tab 的只读/可编辑权限 | 运营、渠道、风控、超管权限符合矩阵 |  | 未执行 |
| M-03 | P0 | 检查所有状态和枚举展示 | 页面只展示中文名，不展示内部 code |  | 未执行 |
| M-04 | P0 | 检查冻结处理二次确认和备注 | 解除冻结/判无效均二次确认并写备注 |  | 未执行 |
| M-05 | P0 | 检查代理新增/编辑表单 | 代理编号、规则组、学校、状态校验正确 |  | 未执行 |
| M-06 | P0 | 检查代理统计展示 | 代理列表/详情统计与 `promo_agent_stat` 一致，结算状态变化后金额刷新 |  | 未执行 |
| M-07 | P1 | 检查二维码预览、下载、历史版本 | 图片、路径、版本和停用说明清晰 |  | 未执行 |
| M-08 | P1 | 检查结算导出 | **首版暂不测试**；待全后台导出中心上线。期望：导出动作权限正确并记录审计 |  | 跳过 |
| M-09 | P1 | 检查手机号等敏感字段 | 页面脱敏/明文展示符合角色权限；导出不脱敏由后续导出中心审计覆盖 |  | 未执行 |
| M-10 | P1 | 检查长学校名、长备注、长规则组名 | 表格和详情不撑破布局 |  | 未执行 |
| M-11 | P2 | 检查接口失败、网络慢、重复点击 | loading、toast、按钮禁用表现正常 |  | 未执行 |
| M-12 | P2 | 检查移动端接口返回字段 | 不直接返回 Entity，时间格式统一到秒 |  | 未执行 |
| M-13 | P3 | 检查无推广权限账号访问 | 页面不可见或无权限，接口返回 403 |  | 未执行 |

## 8. 补充用例（来自审查报告）

> 暂无。后续 Code Review 发现 Critical/Warning 后，将追加到本章节。

| 用例ID | 来源 | 审查级别 | 场景 | 期望结果 |
|--------|------|----------|------|----------|
