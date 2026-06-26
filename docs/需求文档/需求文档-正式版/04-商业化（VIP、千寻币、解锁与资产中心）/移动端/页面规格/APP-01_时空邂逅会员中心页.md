# 页面规格 - APP-04-PAGE-vip-center 时空邂逅会员中心页

> 涉及枚举/状态/规则/错误码/文案，一律引用全局定义、模块公共定义或模块端内定义。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-06-26 | Codex | 补充连续订阅管理入口 |
| 版本01 | 2026-06-25 | Codex | 版本 01：由旧版 VIP 会员中心页转写正式版 |

- **页面 ID**：`APP-04-PAGE-vip-center`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-04_商业化（VIP、千寻币、解锁与资产中心）.md`
- **页面路由**：`/pages/commerce/vip-center`
- **入口来源**：我的页「时空邂逅会员」；业务场景 VIP 引导弹窗；支付结果页
- **对应后台**：`ADM-04-PAGE-commerce-config`、`ADM-GLB-PAGE-copy-message-center`
- **对应设计稿**：待补

---

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：查看会员状态、理解会员权益、选择套餐并完成开通/续费
- **页面类型**：购买页

---

## 2. 布局

### 2.1 整体布局

```
┌─────────────────────────────────────────┐
│ 顶部状态区：会员状态 / 到期时间 / 受限提示 │
│ 连续订阅管理入口（有订阅时展示）            │
├─────────────────────────────────────────┤
│ 权益列表：权益图标 + 名称 + 说明          │
├─────────────────────────────────────────┤
│ 套餐类型 Tab：普通套餐 / 连续订阅套餐      │
├─────────────────────────────────────────┤
│ 套餐卡片区：价格 / 时长 / 标签 / 折算价    │
├─────────────────────────────────────────┤
│ 协议勾选区：会员协议 / 连续订阅协议         │
├─────────────────────────────────────────┤
│ 底部固定支付按钮                          │
└─────────────────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|-----------|----------------|
| 状态区 | 顶部 | `M04-ENUM-vip-status`、到期时间、核心准入提示 | 否 | 否 |
| 连续订阅入口 | 状态区下方 | 当前连续订阅状态、下次续费时间、管理入口 | 条件展示 | 否 |
| 权益列表 | 中部 | `M04-CFG-vip-benefit-list` 返回的权益项 | 否 | 否 |
| 套餐区 | 中部 | 普通套餐、连续订阅套餐卡片 | 否 | 是 |
| 协议区 | 底部按钮上方 | 会员协议、连续订阅协议勾选 | 否 | 否 |

---

## 4. 字段表

### 4.1 展示字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-04-PAGE-vip-center-FIELD-vip-status` | 会员状态 | enum | 是 | `M04-ENUM-vip-status` | 只展示中文名称 | `inactive` | 否 | 普通 | 用户资产摘要 |
| `APP-04-PAGE-vip-center-FIELD-expire-time` | 到期时间 | datetime | 条件必填（已开通） | `yyyy-MM-dd HH:mm:ss` | 已开通时必须返回 | 无 | 否 | 普通 | 用户资产摘要 |
| `APP-04-PAGE-vip-center-FIELD-core-access-tip` | 准入提示 | string | 否 | `M04-TXT-core-access-purchase-tip` | 未完成三重认证时展示 | 无 | 否 | 普通 | PRD-01 核心准入状态 |
| `APP-04-PAGE-vip-center-FIELD-subscription-entry` | 连续订阅管理入口 | json | 否 | 当前存在连续订阅关系 | 有连续订阅套餐/订阅状态时展示 | 无 | 否 | 普通 | 用户会员订阅状态 |
| `APP-04-PAGE-vip-center-FIELD-benefits` | 权益列表 | json | 是 | `M04-CFG-vip-benefit-list` | 仅展示启用权益，按后台排序 | 空列表 | 否 | 普通 | 后台商业化配置 |
| `APP-04-PAGE-vip-center-FIELD-package-type` | 套餐类型 | enum | 是 | `M04-ENUM-vip-package-type` | 连续订阅未接入时隐藏或置灰 | `normal` | 用户切换 | 普通 | 后台商业化配置 |
| `APP-04-PAGE-vip-center-FIELD-package-card` | 套餐卡片 | json | 是 | 上架套餐 | 价格、有效天数、套餐编号不能为空 | 无 | 用户选择 | 普通 | `M04-CFG-vip-package-list` / `M04-CFG-subscription-package-list` |
| `APP-04-PAGE-vip-center-FIELD-package-tag` | 套餐标签 | string | 否 | `M04-CFG-package-tag-list` | 最多展示 1-2 个标签，超出折叠 | 无 | 否 | 普通 | 后台商业化配置 |
| `APP-04-PAGE-vip-center-FIELD-agreement-checked` | 协议勾选 | bool | 是 | 是/否 | 未勾选不可支付 | 否 | 用户勾选 | 普通 | 用户操作 |

---

## 5. 操作表

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-04-PAGE-vip-center-ACT-select-package` | 选择套餐 | 套餐卡片区 | 套餐状态=`on` | 已登录 | 否 | 高亮选中套餐，底部按钮刷新价格 | 套餐下架则提示 `M04-ERR-package-offline` 并刷新套餐 |
| `APP-04-PAGE-vip-center-ACT-switch-package-type` | 切换套餐类型 | 套餐类型 Tab | 对应类型有可售套餐 | 已登录 | 否 | 展示对应套餐列表 | 连续订阅未接入则提示 `M04-ERR-subscription-unsupported` |
| `APP-04-PAGE-vip-center-ACT-manage-subscription` | 管理连续订阅 | 状态区下方 | 存在连续订阅关系或曾购买连续订阅套餐 | 已登录 | 否 | 跳 `APP-04-PAGE-subscription-manage` | 连续订阅未接入时展示说明态 |
| `APP-04-PAGE-vip-center-ACT-open-agreement` | 查看协议 | 协议区 | — | 已登录 | 否 | 打开协议页/弹窗 | 协议加载失败可重试 |
| `APP-04-PAGE-vip-center-ACT-pay` | 立即开通/续费 | 底部固定 | 已选套餐且协议已勾选 | 已登录 | 否 | 创建订单并拉起微信支付；成功后跳 `APP-04-PAGE-payment-result` | 未勾协议字段提示；支付不可用 `M04-ERR-pay-unavailable` |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 套餐类型 | 切换为连续订阅 | 协议勾选 | 必须额外展示连续订阅服务协议 | `M04-TBC-subscription-pay` |
| 连续订阅状态 | 存在订阅关系 | 连续订阅管理入口 | 状态区展示管理入口和下次续费/状态摘要 | `APP-04-PAGE-subscription-manage` |
| 选中套餐 | 变化 | 底部支付按钮 | 展示选中套餐价格和开通/续费文案 | |
| 核心准入状态 | 未开放 | 准入提示 | 展示购买与使用分离提示，不阻塞购买 | `M04-RULE-core-access-gate` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|---------------|------|
| 加载态 | 页面首次加载 | 骨架屏 | 无 | — |
| 空态 | 无可售套餐 | 套餐区空态，支付按钮隐藏 | 返回/刷新 | `M04-ERR-config-missing` |
| 错误态（网络） | 套餐或状态加载失败 | toast + 重试 | 重试 | — |
| 无权限态 | 未登录进入 | 引导登录 | 登录 | APP-04 端内定义 |
| 业务态-未开通 | `vipStatus=inactive` | 展示立即开通 | 选择套餐支付 | `M04-SM-vip-status` |
| 业务态-生效中 | `vipStatus=active` | 展示有效期和续费 | 续费 | `M04-SM-vip-status` |
| 业务态-已过期 | `vipStatus=expired` | 展示已过期和续费提示 | 续费 | `M04-SM-vip-status` |
| 降级态 | 支付服务不可用 | 支付按钮置灰 | 稍后重试 | `M04-SRV-wechat-pay` |
| 降级态 | 连续订阅服务未接入 | 连续订阅 Tab 隐藏或置灰；管理入口展示说明态 | 选择普通套餐 | `M04-SRV-wechat-subscription` |

---

## 9. 验收标准

```text
AC-ID: APP-04-AC-vip-pay-success
Given 已登录用户，选择一个状态为 on 的普通会员套餐并勾选会员协议
When  点击立即开通并完成微信支付
Then  订单状态进入 M04-SM-trade-order=success，会员状态进入 M04-SM-vip-status=active，跳转支付结果成功态并刷新会员有效期

AC-ID: APP-04-AC-vip-core-access-tip
Given 已登录用户未完成 M01-RULE-core-access
When  进入会员中心
Then  页面展示 M04-TXT-core-access-purchase-tip，允许购买但不承诺立即开放社交权益

AC-ID: APP-04-AC-vip-package-offline
Given 用户停留会员中心期间选中套餐被后台下架
When  点击立即开通
Then  阻止创建订单，提示 M04-ERR-package-offline，并刷新套餐列表
```

### 验收标准清单

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-04-AC-vip-pay-success` | 会员支付成功并生效 | 正常 | P0 |
| `APP-04-AC-vip-core-access-tip` | 未完成核心准入提示 | 正常 | P0 |
| `APP-04-AC-vip-package-offline` | 套餐下架拦截 | 异常 | P0 |

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块枚举 | `M04-ENUM-vip-status` / `M04-ENUM-vip-package-type` | 状态与套餐 |
| 依赖的模块状态机 | `M04-SM-vip-status` / `M04-SM-trade-order` | 支付生效 |
| 依赖的模块规则 | `M04-RULE-core-access-gate` / `M04-RULE-vip-benefit` | 购买与权益 |
| 依赖的模块配置项 | `M04-CFG-vip-benefit-list` / `M04-CFG-vip-package-list` / `M04-CFG-vip-free-whisper-daily` / `M04-CFG-subscription-package-list` | 套餐与权益 |
| 依赖的错误码 | `M04-ERR-package-offline` / `M04-ERR-pay-unavailable` / `M04-ERR-subscription-unsupported` | |
| 依赖的第三方服务 | `M04-SRV-wechat-pay` / `M04-SRV-wechat-subscription` | 支付 |
| 依赖的其他页面 | `APP-04-PAGE-subscription-manage` | 连续订阅管理 |
| 对应后台页面 | `ADM-04-PAGE-commerce-config` | 配置来源 |
