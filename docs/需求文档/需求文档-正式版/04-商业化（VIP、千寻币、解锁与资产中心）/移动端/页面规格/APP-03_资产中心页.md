# 页面规格 - APP-04-PAGE-asset-center 资产中心页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-06-26 | Codex | 补充连续订阅管理入口 |
| 版本01 | 2026-06-25 | Codex | 版本 01：由旧版资产中心页转写正式版 |

- **页面 ID**：`APP-04-PAGE-asset-center`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-04_商业化（VIP、千寻币、解锁与资产中心）.md`
- **页面路由**：`/pages/commerce/asset-center`
- **入口来源**：我的页「资产中心」；支付结果页快捷入口
- **对应后台**：`ADM-04-PAGE-user-asset-detail`

---

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：统一查看会员状态、千寻币余额和资产记录入口
- **页面类型**：资产仪表盘

---

## 2. 布局

```text
会员状态卡 -> 千寻币余额卡 -> 今日权益摘要 -> 记录入口列表 -> 连续订阅管理入口（条件展示）
```

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|-----------|----------------|
| 会员状态卡 | 顶部 | 会员状态、到期时间、续费入口 | 否 | 否 |
| 余额卡 | 中部 | 当前千寻币余额、充值入口 | 否 | 否 |
| 权益摘要 | 中部 | 今日免费悄悄话剩余次数等 | 否 | 否 |
| 记录入口 | 下部 | 千寻币流水、会员订单记录 | 否 | 否 |
| 连续订阅入口 | 记录入口下方 | 查看连续订阅状态、取消续费入口/指引 | 条件展示 | 否 |

---

## 4. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-04-PAGE-asset-center-FIELD-vip-status` | 会员状态 | enum | 是 | `M04-ENUM-vip-status` | 只展示中文名称 | `inactive` | 否 | 普通 | 用户资产摘要 |
| `APP-04-PAGE-asset-center-FIELD-vip-expire-time` | 会员到期时间 | datetime | 条件必填 | `yyyy-MM-dd HH:mm:ss` | 已开通时展示 | 无 | 否 | 普通 | 用户资产摘要 |
| `APP-04-PAGE-asset-center-FIELD-coin-balance` | 千寻币余额 | int | 是 | ≥0 | 整数 | 0 | 否 | 普通 | 用户资产摘要 |
| `APP-04-PAGE-asset-center-FIELD-free-whisper-remain` | 今日免费悄悄话剩余次数 | int | 是 | ≥0 | 非会员为 0 | 0 | 否 | 普通 | 用户资产摘要 / `M04-CFG-vip-free-whisper-daily` |
| `APP-04-PAGE-asset-center-FIELD-core-access-tip` | 准入提示 | string | 否 | `M04-TXT-core-access-purchase-tip` | 未完成三重认证时展示 | 无 | 否 | 普通 | PRD-01 核心准入状态 |
| `APP-04-PAGE-asset-center-FIELD-subscription-entry` | 连续订阅管理入口 | json | 否 | 当前存在连续订阅关系 | 有连续订阅时展示状态和入口 | 无 | 否 | 普通 | 用户会员订阅状态 |

---

## 5. 操作表

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-04-PAGE-asset-center-ACT-goto-vip` | 去开通/续费会员 | 会员卡 | 已登录 | 已登录 | 否 | 跳 `APP-04-PAGE-vip-center` | — |
| `APP-04-PAGE-asset-center-ACT-goto-coin-recharge` | 去充值 | 余额卡 | 已登录 | 已登录 | 否 | 跳 `APP-04-PAGE-coin-recharge` | — |
| `APP-04-PAGE-asset-center-ACT-goto-coin-flow` | 千寻币流水 | 记录入口 | 已登录 | 已登录 | 否 | 跳 `APP-04-PAGE-coin-flow` | — |
| `APP-04-PAGE-asset-center-ACT-goto-vip-orders` | 会员订单 | 记录入口 | 已登录 | 已登录 | 否 | 跳 `APP-04-PAGE-vip-orders` | — |
| `APP-04-PAGE-asset-center-ACT-goto-subscription-manage` | 管理连续订阅 | 连续订阅入口 | 存在连续订阅关系或曾购买连续订阅套餐 | 已登录 | 否 | 跳 `APP-04-PAGE-subscription-manage` | 连续订阅未接入时展示说明态 |
| `APP-04-PAGE-asset-center-ACT-refresh` | 刷新资产 | 错误/刷新入口 | 已登录 | 已登录 | 否 | 重新拉取资产摘要 | 失败保留错误态 |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|---------------|------|
| 加载态 | 首次加载 | 骨架屏 | 无 | — |
| 空态 | 新用户无订单/流水 | 资产卡正常展示，记录入口展示暂无摘要 | 充值/开通会员 | — |
| 错误态 | 资产摘要请求失败 | toast + 重试 | 重试 | — |
| 无权限态 | 未登录 | 引导登录 | 登录 | APP-04 端内定义 |
| 业务态-会员生效 | `vipStatus=active` | 会员卡展示有效期与续费 | 续费 | `M04-SM-vip-status` |
| 业务态-会员过期 | `vipStatus=expired` | 会员卡展示已过期 | 续费 | `M04-SM-vip-status` |
| 降级态 | 订单/流水入口统计加载失败 | 入口仍展示，摘要显示 `-` | 进入详情页查看 | — |
| 降级态 | 连续订阅服务未接入 | 不展示管理入口或展示暂无连续订阅说明 | 开通普通会员 | `M04-SRV-wechat-subscription` |

---

## 9. 验收标准

```text
AC-ID: APP-04-AC-asset-show
Given 已登录用户拥有 active 会员和 180 千寻币余额
When  进入资产中心页
Then  页面展示会员生效中、到期时间、千寻币余额 180、免费悄悄话剩余次数和记录入口

AC-ID: APP-04-AC-asset-refresh-fail
Given 资产摘要接口超时
When  进入资产中心页
Then  页面展示加载失败提示和重试入口，不跳转崩溃
```

### 验收标准清单

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-04-AC-asset-show` | 资产摘要展示 | 正常 | P0 |
| `APP-04-AC-asset-refresh-fail` | 资产加载失败 | 异常 | P0 |

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块枚举 | `M04-ENUM-vip-status` | 会员状态 |
| 依赖的模块规则 | `M04-RULE-coin-balance` / `M04-RULE-vip-expire` | 资产展示 |
| 依赖的其他页面 | `APP-04-PAGE-vip-center` / `APP-04-PAGE-coin-recharge` / `APP-04-PAGE-coin-flow` / `APP-04-PAGE-vip-orders` / `APP-04-PAGE-subscription-manage` | 跳转 |
