# 页面规格 - APP-04-PAGE-vip-orders 会员订单记录页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-07-01 | Codex | 按蓝湖 UI 会员记录口径补齐订单字段，明确会员记录就是会员订单记录页 |
| 版本01 | 2026-06-25 | Codex | 版本 01：由旧版会员订单记录页转写正式版 |

- **页面 ID**：`APP-04-PAGE-vip-orders`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-04_商业化（VIP、千寻币、解锁与资产中心）.md`
- **页面路由**：`/pages/commerce/vip-orders`
- **入口来源**：资产中心页
- **对应后台**：`ADM-04-PAGE-commerce-order-list`

---

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：查看本人会员购买订单、支付状态和退款状态；蓝湖 UI 的“会员记录”即本页，不另建独立页面
- **页面类型**：列表页

---

## 4. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-04-PAGE-vip-orders-FIELD-order-no` | 订单号 | string | 是 | 平台订单号 | 仅展示本人订单 | 无 | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-vip-orders-FIELD-package-name` | 套餐名称 | string | 是 | — | 取订单快照，不随后台改名回刷 | 无 | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-vip-orders-FIELD-package-type` | 套餐类型 | enum | 是 | `M04-ENUM-vip-package-type` | 只展示中文名称 | 无 | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-vip-orders-FIELD-duration` | 套餐时长/周期 | string/int | 是 | 天/月/年/连续订阅周期 | 取订单快照 | 无 | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-vip-orders-FIELD-original-amount` | 原价 | decimal | 否 | ≥0 | 展示人民币金额；无原价展示 `-` | 无 | 否 | 普通 | 订单快照 |
| `APP-04-PAGE-vip-orders-FIELD-pay-amount` | 优惠价/实付金额 | decimal | 是 | ≥0 | 展示人民币金额，以订单实付为准 | 0 | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-vip-orders-FIELD-pay-channel` | 支付渠道 | enum/string | 是 | 微信支付/渠道返回值 | 只展示渠道中文名称 | 微信支付 | 否 | 普通 | 支付订单 |
| `APP-04-PAGE-vip-orders-FIELD-order-status` | 订单状态 | enum | 是 | `M04-ENUM-order-status` | 只展示中文名称 | `unpaid` | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-vip-orders-FIELD-created-time` | 创建时间 | datetime | 是 | `yyyy-MM-dd HH:mm:ss` | 按创建时间倒序 | 无 | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-vip-orders-FIELD-pay-time` | 支付时间 | datetime | 否 | `yyyy-MM-dd HH:mm:ss` | 未支付展示 `-` | 无 | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-vip-orders-FIELD-expire-time` | 到期时间 | datetime | 否 | `yyyy-MM-dd HH:mm:ss` | 支付成功会员订单展示 | 无 | 否 | 普通 | 商业化订单 |
| `APP-04-PAGE-vip-orders-FIELD-refund-status` | 退款状态/说明 | enum/string | 否 | 退款中/已退款/无退款 | 退款相关订单展示说明，不提供前台主动退款按钮 | 无 | 否 | 普通 | 退款记录 |
| `APP-04-PAGE-vip-orders-FIELD-subscription-flag` | 连续订阅标识 | bool/string | 否 | 普通/连续订阅 | 连续订阅订单展示协议和扣款方式快照入口 | 普通 | 否 | 普通 | 订单快照 |
| `APP-04-PAGE-vip-orders-FIELD-agreement-snapshot` | 协议/扣款方式快照 | string/json | 否 | 协议名称、扣款方式、周期 | 连续订阅订单可展开查看 | 无 | 否 | 普通 | 订单快照 |

---

## 5. 操作表

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-04-PAGE-vip-orders-ACT-load-more` | 加载更多 | 列表底部 | 有下一页 | 已登录 | 否 | 追加下一页订单 | 失败可重试 |
| `APP-04-PAGE-vip-orders-ACT-view-refund-note` | 查看退款说明 | 订单卡片 | 状态为 `refunding`/`refunded` | 已登录 | 否 | 展开退款状态说明 | — |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|---------------|------|
| 加载态 | 首次加载 | 列表骨架屏 | 无 | — |
| 空态 | 无订单 | 居中空态「暂无会员订单」 | 去会员中心 | — |
| 错误态 | 请求失败 | toast + 重试 | 重试 | — |
| 无权限态 | 未登录 | 引导登录 | 登录 | APP-04 端内定义 |
| 业务态-支付成功 | `orderStatus=success` | 展示支付时间和到期时间 | 查看 | `M04-SM-trade-order` |
| 业务态-退款中 | `orderStatus=refunding` | 展示退款中说明 | 查看说明 | `M04-SM-trade-order` |
| 业务态-已退款 | `orderStatus=refunded` | 展示已退款 | 查看说明 | `M04-SM-trade-order` |
| 降级态 | 状态字典加载失败 | 展示 code + toast | 刷新 | `M04-ENUM-order-status` |

---

## 8. 查询与列表

- **默认排序**：创建时间倒序
- **分页方式**：移动端加载更多
- **每页条数**：20
- **列表为空时的引导**：去会员中心

---

## 9. 验收标准

```text
AC-ID: APP-04-AC-vip-orders-refund
Given 用户存在一条状态为 refunding 的会员订单
When  进入会员订单记录页
Then  订单卡片展示退款中状态和退款说明入口，不展示主动申请退款按钮

AC-ID: APP-04-AC-vip-orders-fields
Given 用户存在一条支付成功的会员订单
When  进入会员订单记录页
Then  订单卡片至少展示订单号、套餐名称、套餐类型、套餐时长/周期、原价、优惠价/实付金额、支付渠道、订单状态、创建时间、支付时间、会员有效期；若为退款或连续订阅订单，额外展示退款状态/说明和连续订阅标识
```

### 验收标准清单

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-04-AC-vip-orders-refund` | 退款状态展示 | 正常 | P0 |
| `APP-04-AC-vip-orders-fields` | 会员记录字段完整展示 | 正常 | P0 |

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块枚举 | `M04-ENUM-order-status` / `M04-ENUM-vip-package-type` | 订单展示 |
| 依赖的模块规则 | `M04-RULE-refund-display` | 退款展示 |
| 对应后台页面 | `ADM-04-PAGE-commerce-order-list` | 后台订单 |
