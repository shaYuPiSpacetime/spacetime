# 页面规格 - APP-04-PAGE-paywall-modal 业务场景付费引导弹窗

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-06-26 | Codex | 余额不足弹窗补充快捷充值套餐卡片和更多套餐入口 |
| 版本01 | 2026-06-25 | Codex | 版本 01：由旧版业务场景付费引导弹窗转写正式版 |

- **页面 ID**：`APP-04-PAGE-paywall-modal`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-04_商业化（VIP、千寻币、解锁与资产中心）.md`
- **页面路由**：弹窗组件，无独立路由；由各业务页面唤起
- **入口来源**：喜欢我的、最近看过我的、悄悄话、觅缘配额、高级筛选、理想型、精选主页等付费触点
- **对应后台**：`ADM-04-PAGE-commerce-config`

---

## 1. 页面定位

- **目标用户**：触发付费限制的已登录用户
- **核心任务**：解释当前限制，承接会员开通、千寻币充值或扣币确认
- **页面类型**：弹窗

---

## 2. 布局

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| VIP 引导弹窗 | 解锁全部、配额耗尽、高级筛选等 | 半屏/居中 | 标题、权益摘要、开通按钮、取消按钮 | 取消/遮罩/系统返回 |
| 千寻币引导弹窗 | 单条解锁、悄悄话、理想型、精选等 | 半屏/居中 | 所需币数、当前余额、确认扣币/充值按钮 | 取消/遮罩/系统返回 |
| 余额不足弹窗 | 扣币前余额不足 | 半屏/居中 | 所需币数、当前余额、推荐充值套餐卡片 1-2 档、更多套餐入口 | 取消/遮罩/系统返回 |

---

## 4. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-04-PAGE-paywall-modal-FIELD-scene` | 付费场景 | enum | 是 | `M04-ENUM-coin-biz-scene` 或 VIP 场景 | 必须由来源页传入 | 无 | 否 | 普通 | 来源页 |
| `APP-04-PAGE-paywall-modal-FIELD-pay-asset` | 承接资产 | enum | 是 | VIP/千寻币 | 喜欢/访客单条=千寻币，全量=VIP | 无 | 否 | 普通 | `M04-RULE-like-viewer-unlock` |
| `APP-04-PAGE-paywall-modal-FIELD-cost-coin` | 所需千寻币 | int | 条件必填（千寻币场景） | ≥0 | 由后台单价计算，前端不硬编码 | 无 | 否 | 普通 | `M04-CFG-coin-scene-price` |
| `APP-04-PAGE-paywall-modal-FIELD-balance` | 当前余额 | int | 条件必填（千寻币场景） | ≥0 | 实时余额 | 0 | 否 | 普通 | 用户资产摘要 |
| `APP-04-PAGE-paywall-modal-FIELD-quick-package-cards` | 快捷充值套餐 | json | 条件必填（余额不足） | 上架千寻币套餐 1-2 档 | 优先选择可覆盖缺口的最低档；不足 2 档时展示全部可用档 | 空列表 | 用户选择 | 普通 | `M04-CFG-coin-package-list` |
| `APP-04-PAGE-paywall-modal-FIELD-target-count` | 解锁数量 | int | 否 | 1-`M04-CFG-ideal-batch-max` | 批量理想型不可超过上限 | 1 | 来源页选择 | 普通 | 来源页 |
| `APP-04-PAGE-paywall-modal-FIELD-retention-note` | 保留期说明 | string | 否 | 场景规则文案 | 理想型/精选展示 | 无 | 否 | 普通 | `M04-CFG-*retention-days` |

---

## 5. 操作表

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-04-PAGE-paywall-modal-ACT-open-vip` | 开通会员 | VIP 引导主按钮 | VIP 场景 | 已登录 | 否 | 跳 `APP-04-PAGE-vip-center` 并携带来源 | — |
| `APP-04-PAGE-paywall-modal-ACT-confirm-coin` | 确认支付千寻币 | 千寻币弹窗主按钮 | 余额充足 | 已登录 | 是，展示扣减数量 | 扣币成功，来源对象解锁/消息发送 | 余额不足 `M04-ERR-balance-insufficient`；核心准入受限 `M01-ERR-core-access-blocked` |
| `APP-04-PAGE-paywall-modal-ACT-quick-recharge` | 快捷充值 | 余额不足弹窗套餐卡片 | 余额不足且有上架套餐 | 已登录 | 否 | 直接创建对应千寻币订单并拉起支付；成功后回到来源弹窗继续扣币确认 | 支付不可用 `M04-ERR-pay-unavailable` |
| `APP-04-PAGE-paywall-modal-ACT-more-recharge` | 更多套餐 | 余额不足弹窗 | 余额不足 | 已登录 | 否 | 跳 `APP-04-PAGE-coin-recharge` 并携带来源 | — |
| `APP-04-PAGE-paywall-modal-ACT-cancel` | 取消 | 次按钮 | — | 已登录 | 否 | 关闭弹窗，不变更资产 | — |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 付费场景 | likes/viewers 单条 | 承接资产 | 固定为千寻币 | `M04-RULE-like-viewer-unlock` |
| 付费场景 | likes/viewers 全量 | 承接资产 | 固定为 VIP | `M04-RULE-like-viewer-unlock` |
| 当前余额 | 小于所需币数 | 主按钮/快捷充值套餐 | 隐藏确认扣币，展示 1-2 个推荐充值套餐卡片和更多套餐入口 | `M04-RULE-coin-balance` |
| 快捷充值套餐 | 选择 | 支付结果/来源弹窗 | 支付成功后刷新余额并回到当前业务场景；余额已充足时恢复确认扣币按钮 | |
| 核心准入状态 | 未开放 | 确认扣币/使用权益 | 使用时拦截并提示完成三重认证 | `M04-RULE-core-access-gate` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|---------------|------|
| 加载态 | 查询单价/余额 | 按钮 loading | 无 | — |
| 空态 | 来源对象不存在 | 不展示弹窗或展示对象失效 | 关闭 | — |
| 错误态 | 单价加载失败 | toast + 关闭/重试 | 重试 | `M04-ERR-config-missing` |
| 无权限态 | 未登录触发 | 登录弹窗 | 登录 | APP-04 端内定义 |
| 业务态-余额充足 | balance >= cost | 展示确认扣币 | 确认 | `M04-RULE-coin-balance` |
| 业务态-余额不足 | balance < cost | 展示快捷充值套餐卡片和更多套餐入口 | 快捷充值/更多套餐 | `M04-ERR-balance-insufficient` |
| 降级态 | 支付/扣币服务不可用 | 按钮置灰 | 稍后重试 | `M04-SRV-wechat-pay` |

---

## 9. 验收标准

```text
AC-ID: APP-04-AC-paywall-like-one
Given 已登录且核心准入开放的用户，千寻币余额充足
When  在喜欢我的列表点击单条模糊记录并确认扣币
Then  扣减对应千寻币，写 consume 流水，当前记录变清晰且永久可见

AC-ID: APP-04-AC-paywall-balance-insufficient
Given 用户余额小于当前场景所需千寻币
When  打开付费弹窗
Then  弹窗展示所需币数、当前余额、1-2 个推荐充值套餐卡片和更多套餐入口，不允许透支扣币
```

### 验收标准清单

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-04-AC-paywall-like-one` | 单条解锁扣币成功 | 正常 | P0 |
| `APP-04-AC-paywall-balance-insufficient` | 余额不足快捷充值 | 异常 | P0 |

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块规则 | `M04-RULE-like-viewer-unlock` / `M04-RULE-whisper-pay` / `M04-RULE-ideal-unlock` / `M04-RULE-featured-unlock` | 付费场景 |
| 依赖的模块配置项 | `M04-CFG-coin-scene-price` / `M04-CFG-ideal-batch-max` | 单价与批量 |
| 依赖的错误码 | `M04-ERR-balance-insufficient` / `M04-ERR-config-missing` | |
| 依赖的其他页面 | `APP-04-PAGE-vip-center` / `APP-04-PAGE-coin-recharge` | 购买承接 |
