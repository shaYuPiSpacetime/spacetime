# 模块 PRD - ADM-07 推广裂变管理

> 模块公共口径见 `../../PRD-07_模块公共定义.md`；后台端内菜单、权限与状态见 `../ADM-07_端内定义.md`。

| 版本 | 日期 | 修改人 | 变更摘要 |
|---|---|---|---|
| 版本02 | 2026-07-17 | Codex | 收敛为五个菜单页；移除风控/冻结/素材；详情改抽屉；结算固定自然月 |
| 版本03 | 2026-07-27 | Codex | 普通邀请、推广员的完成注册奖励事件固定开启且不可关闭，金额仍可配置 |

## 1. 模块目标

为普通用户邀请和校园代理推广提供可配置奖励、可追踪关系与奖励流水、可查看代理转化以及可确定月度结算的首版后台闭环。

**核心指标：** 完成注册的成功邀请数、各奖励事件发放金额、阶梯额外奖励金额、代理扫码/点击数、代理注册数、应发/已发/待结算奖金。

## 2. 用户与角色

| 角色 | 核心职责 |
|---|---|
| 运营 | 发布普通邀请奖励，查看关系与奖励流水 |
| 渠道运营 | 发布代理奖励，新增/启停代理，管理代理二维码 |
| 财务 | 查看代理奖金并确定月度结算 |
| 超管 | 具备全部查看与操作权限 |

具体矩阵引用 `ADM-07_端内定义.md` 第 2 节。风险角色不属于本模块一期角色。

## 3. 关键流程

### 3.1 普通邀请奖励

```text
新用户完成注册
  -> 建立永久唯一邀请关系
  -> 生成“完成注册奖励”流水
  -> 若累计人数首次命中启用档位，再生成独立“阶梯奖励-累计N人”流水
  -> 资产服务成功：已发放
  -> 资产服务失败：发放失败，技术补偿使用原幂等键重试
```

完成注册奖励事件固定开启，运营只配置奖励金额；阶梯计算引用 `M07-RULE-invite-ladder`。无风控冻结、无关系作废、无每日封顶。

### 3.2 代理推广与二维码

```text
新增代理 -> 系统生成永久二维码 -> 保存/复制投放
用户扫码或点击 -> 计入扫码/点击数
用户完成注册 -> 建立永久代理关系 -> 计入累计注册数并生成代理奖金明细
其他启用奖励事件/阶梯档位命中 -> 继续生成独立奖金明细
```

### 3.3 月度结算

```text
每月1日01:00（北京时间）
  -> 汇总上一个自然月未归集奖金
  -> 生成“待确定”结算单
  -> 财务/超管点击“确定结算”并二次确认
  -> 状态变为“已确定”，记录确定人和确定时间
```

页面不提供手动生成、登记打款、打款流水或状态回退。

## 4. 核心数据模型

| 实体 | 建议表名 | 关键字段 |
|---|---|---|
| 奖励规则 | `promo_rule_config` | sourceType, eventType, rewardMode, amount, ladderJson, enabled, version |
| 邀请关系 | `promo_invite_relation` | relationNo, inviterId/agentId, inviteeId, sourceType, bindTime |
| 普通奖励流水 | `promo_invite_reward` | rewardNo, relationNo, eventType, eventLabelSnapshot, amount, status, failureReason |
| 校园代理 | `promo_agent` | agentNo, name, schoolCampus, contactMobile, status, qrCodeNo |
| 代理统计 | `promo_agent_stat` | scanClickCount, registerCount, payableAmount, paidAmount, pendingAmount |
| 代理奖金明细 | `promo_agent_bonus` | bonusOrderNo, agentNo, userUuid, eventType, eventLabelSnapshot, amount, generatedAt |
| 代理结算单 | `promo_agent_settlement` | settlementNo, agentNo, periodStart, periodEnd, amount, status, confirmedBy, confirmedAt |

### 4.1 唯一约束

- 被邀请人只能存在一条关系：`inviteeId` 唯一。
- 普通事件：`relationId + eventType` 唯一。
- 阶梯事件：`inviterId/agentId + ladderThreshold` 唯一。
- 月度结算：`agentId + settlementMonth` 唯一。

## 5. 本期范围

| 需求 ID | 能力 | 页面/视图 | 优先级 |
|---|---|---|---|
| `ADM-07-RULE-rule-config` | 普通邀请/代理双 Tab 奖励配置、完成注册固定开启及阶梯联动 | `ADM-07-PAGE-promo-rule-config` | P0 |
| `ADM-07-RULE-relation-list` | 邀请关系列表、已发奖励合计 | `ADM-07-PAGE-invite-relation-list` | P0 |
| `ADM-07-RULE-relation-drawer` | 关系基础信息、奖励触发时间线 | `ADM-07-PAGE-invite-relation-detail` 抽屉 | P0 |
| `ADM-07-RULE-reward-list` | 普通事件/阶梯额外奖励流水及三态查询 | `ADM-07-PAGE-invite-reward-list` | P0 |
| `ADM-07-RULE-agent-list` | 代理字段、统计、可点击状态与二维码弹窗 | `ADM-07-PAGE-agent-list` | P0 |
| `ADM-07-RULE-agent-drawer` | 代理资料、奖金明细、结算记录 | `ADM-07-PAGE-agent-detail` 抽屉 | P0 |
| `ADM-07-RULE-settlement` | 月度结算查询、确定、导出 | `ADM-07-PAGE-agent-settlement` | P0 |
| `ADM-07-RULE-audit` | 发布规则、启停代理、确定结算、导出审计 | 多页 | P0 |

## 6. 本期不做

| 能力 | 处理方式 |
|---|---|
| 统计卡/数据大屏 | 规则配置页不展示统计区域 |
| 成功口径、完成注册启停、有效期、每日封顶配置 | 代码固定完成注册成功、完成注册奖励事件启用、永久有效、不封顶；页面仅只读展示固定状态 |
| 关系归属规则 Tab | 代码实现 `M07-RULE-invite-bind`，页面无 Tab |
| 风控参数与冻结奖励处理 | 无数据源，不创建菜单、状态或人工操作 |
| 推广素材管理 | 不创建菜单；二维码在代理列表弹窗承接 |
| 代理分组/规则组、规则结算周期 | 页面无字段；所有代理使用当前代理奖励规则 |
| 自动打款、打款流水 | 页面不展示；结算只确定金额 |

已发布的 `ADM-07-PAGE-invite-reward-frozen`、`ADM-07-PAGE-promo-material` ID 保留墓碑，不注册菜单/路由。

## 7. 跨模块依赖

| 依赖 | 用途 | 兜底 |
|---|---|---|
| PRD-01 用户准入 | 注册、资料、认证事件 | 注册事件必须就绪；其他事件未就绪时不可启用 |
| PRD-04 资产与支付 | 千寻币发放、首次会员/充值事件 | 资产服务失败保留“发放失败”；支付事件未就绪时不可启用 |
| 微信小程序码 | 代理二维码 | 弹窗显示失败和重试，列表其余功能可用 |
| 系统 RBAC/审计 | 页面/按钮权限、敏感操作日志 | 不可用则阻塞后台上线 |

## 8. 非功能性需求

- 列表接口 P95 < 500ms，抽屉详情 P95 < 300ms；默认 20 条/页，最大 100 条。
- 所有发布、状态切换、确定结算使用版本号或状态前置校验避免并发覆盖。
- 二维码保存生成 PNG；复制优先写入图片剪贴板，不支持时提示用户使用保存图片。
- 导出为异步任务并记录筛选条件；首版不采集收款或打款字段。
- 规则发布、代理状态、二维码生成、结算确定保留至少一年审计记录。

## 9. 改动影响面

| 对象 | 变更 |
|---|---|
| 一期菜单树 | “奖励审核”改“奖励流水”，仍为五个推广菜单 |
| 资产流水 | 新增 `invite_ladder_reward` |
| 原冻结/素材页面 | 标废弃并取消入口 |
| 代理列表 | 增加二维码弹窗和新统计字段 |
| 定时任务 | 固定月度结算任务 |

## 10. 页面清单

| 页面 ID | 名称 | 形态 | 规格文件 | 优先级 |
|---|---|---|---|---|
| `ADM-07-PAGE-promo-rule-config` | 推广规则配置 | 菜单页 | `../页面规格/ADM-07-PAGE-promo-rule-config_推广规则配置页.md` | P0 |
| `ADM-07-PAGE-invite-relation-list` | 邀请关系 | 菜单页 | `../页面规格/ADM-07-PAGE-invite-relation-list_邀请关系列表页.md` | P0 |
| `ADM-07-PAGE-invite-relation-detail` | 邀请关系详情 | 右侧抽屉 | `../页面规格/ADM-07-PAGE-invite-relation-detail_邀请关系详情页.md` | P0 |
| `ADM-07-PAGE-invite-reward-list` | 邀请奖励流水 | 菜单页 | `../页面规格/ADM-07-PAGE-invite-reward-list_邀请奖励流水页.md` | P0 |
| `ADM-07-PAGE-agent-list` | 校园代理 | 菜单页 | `../页面规格/ADM-07-PAGE-agent-list_代理列表页.md` | P0 |
| `ADM-07-PAGE-agent-detail` | 代理详情 | 右侧抽屉 | `../页面规格/ADM-07-PAGE-agent-detail_代理详情页.md` | P0 |
| `ADM-07-PAGE-agent-settlement` | 代理结算 | 菜单页 | `../页面规格/ADM-07-PAGE-agent-settlement_代理结算管理页.md` | P0 |
| `ADM-07-PAGE-invite-reward-frozen` | 冻结奖励处理 | `[已废弃]` | 墓碑规格 | — |
| `ADM-07-PAGE-promo-material` | 推广素材管理 | `[已废弃]` | 墓碑规格 | — |

## 11. 上线、迁移与回滚

| 项 | 口径 |
|---|---|
| 存量数据 | 当前尚未生产上线；若已有 Demo/测试数据，冻结/无效记录不迁移为有效业务数据 |
| 初始化 | 规则无默认金额；上线前由运营填写并发布 |
| 回滚 | 停止生成新奖励/结算；已发放奖励和已确定结算不可逆 |
| 兼容 | 旧冻结/素材路由返回 404/无权限，不跳转到新页面 |

## 12. 评审结论

P0 范围、页面形态、字段、状态、计算规则与异常路径已明确；本模块无普通 `[待确认]`。
