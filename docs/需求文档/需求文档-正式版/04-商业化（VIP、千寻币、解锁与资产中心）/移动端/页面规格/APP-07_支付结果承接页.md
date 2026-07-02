# 页面规格 - APP-04-PAGE-payment-result 支付结果承接页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本03 | 2026-07-02 | Codex | 取消独立资产中心跳转，支付结果改为返回来源页或查看对应记录页 |
| 版本02 | 2026-06-30 | Codex | 补充未支付订单 30 分钟固定关闭口径 |
| 版本01 | 2026-06-25 | Codex | 版本 01：由旧版支付结果承接页转写正式版 |

- **页面 ID**：`APP-04-PAGE-payment-result`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-04_商业化（VIP、千寻币、解锁与资产中心）.md`
- **页面路由**：`/pages/commerce/payment-result`
- **入口来源**：会员支付、千寻币充值支付回跳
- **对应后台**：`ADM-04-PAGE-commerce-order-list`

---

## 1. 页面定位

- **目标用户**：刚完成或中断支付的已登录用户
- **核心任务**：确认支付结果，刷新资产，并返回来源页或查看对应记录页
- **页面类型**：结果页/弹窗

---

## 4. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-04-PAGE-payment-result-FIELD-order-no` | 订单号 | string | 是 | 平台订单号 | 必须属于当前用户 | 无 | 否 | 普通 | 路由参数/订单查询 |
| `APP-04-PAGE-payment-result-FIELD-order-type` | 订单类型 | enum | 是 | `M04-ENUM-order-type` | 只展示中文名称 | 无 | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-payment-result-FIELD-order-status` | 订单状态 | enum | 是 | `M04-ENUM-order-status` | 只展示中文名称 | `unpaid` | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-payment-result-FIELD-result-title` | 结果标题 | string | 是 | 成功/失败/取消/处理中 | 按订单状态生成 | 无 | 否 | 普通 | 系统 |
| `APP-04-PAGE-payment-result-FIELD-asset-summary` | 获得资产说明 | string/json | 条件必填（成功） | 会员有效期或到账千寻币 | 支付成功时展示 | 无 | 否 | 普通 | 订单快照/资产摘要 |
| `APP-04-PAGE-payment-result-FIELD-source-page` | 来源页 | string | 否 | APP 页面 ID | 用于回跳 | 无 | 否 | 普通 | 路由参数 |

---

## 5. 操作表

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-04-PAGE-payment-result-ACT-back-source` | 返回来源页 | 主按钮 | 有来源页 | 已登录 | 否 | 回到来源页并刷新权益/余额 | 来源页不可用则回会员中心或千寻币充值页 |
| `APP-04-PAGE-payment-result-ACT-go-records` | 查看记录 | 次按钮 | 已登录 | 已登录 | 否 | 会员订单跳 `APP-04-PAGE-vip-orders`；千寻币订单跳 `APP-04-PAGE-coin-flow` | — |
| `APP-04-PAGE-payment-result-ACT-repay` | 重新支付 | 主按钮 | 状态为 `failed` 或 `closed` 且订单可重建 | 已登录 | 否 | 回购买页或重新创建订单 | 订单过期 `M04-ERR-order-expired` |
| `APP-04-PAGE-payment-result-ACT-refresh` | 刷新结果 | 处理中/刷新失败 | 已登录 | 已登录 | 否 | 重新查询订单和资产 | 失败保留当前提示 |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 订单状态 | `success` | 获得资产说明 | 会员展示有效期；千寻币展示到账币数 | `M04-RULE-payment-result` |
| 订单状态 | `closed` | 结果标题 | 展示支付已取消/已关闭，资产不变；未支付订单固定 30 分钟自动关闭 | `M04-RULE-order-close-timeout` |
| 支付成功 | 回来源页 | 来源页数据 | 来源页必须刷新权益/余额 | |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|---------------|------|
| 加载态 | 查询订单结果 | loading | 无 | — |
| 空态 | 订单不存在 | 错误说明 | 返回来源页或查看记录页 | `M04-ERR-order-not-found` |
| 错误态 | 查询失败 | toast + 重试 | 重试 | — |
| 无权限态 | 订单不属于当前用户 | 无权限提示 | 返回 | — |
| 业务态-成功 | `orderStatus=success` | 成功标题 + 获得资产 | 回来源/查看记录 | `M04-SM-trade-order` |
| 业务态-失败 | `orderStatus=failed` | 失败标题 + 重新支付 | 重新支付 | `M04-SM-trade-order` |
| 业务态-取消/关闭 | `orderStatus=closed` | 取消提示 + 资产不变 | 重新选择 | `M04-TXT-pay-cancelled` |
| 降级态 | 支付成功但资产刷新失败 | 展示成功 + 刷新中提示 | 刷新资产 | `M04-EVT-payment-success` |

---

## 9. 验收标准

```text
AC-ID: APP-04-AC-payment-success-refresh
Given 用户完成千寻币订单支付，订单状态为 success
When  回到支付结果页
Then  页面展示支付成功和到账千寻币数量，并刷新资产摘要

AC-ID: APP-04-AC-payment-cancel
Given 用户取消支付
When  回到支付结果页
Then  页面展示 M04-TXT-pay-cancelled，不变更会员状态或千寻币余额
```

### 验收标准清单

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-04-AC-payment-success-refresh` | 支付成功刷新资产 | 正常 | P0 |
| `APP-04-AC-payment-cancel` | 支付取消不变更资产 | 异常 | P0 |

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块枚举 | `M04-ENUM-order-type` / `M04-ENUM-order-status` | 结果判断 |
| 依赖的模块状态机 | `M04-SM-trade-order` | 订单状态 |
| 依赖的模块规则 | `M04-RULE-payment-result` | 结果承接 |
| 依赖的其他页面 | `APP-04-PAGE-vip-orders` / `APP-04-PAGE-coin-flow` | 查看支付后记录 |
