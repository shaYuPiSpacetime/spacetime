# 页面规格 - APP-04-PAGE-coin-recharge 千寻币充值页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本04 | 2026-07-02 | Codex | 千寻币消费场景列表新增移动端图标取值口径：图标取后台 `M04-CFG-coin-scene-price.mobileIcon` 配置 |
| 版本03 | 2026-07-01 | Codex | 补充值协议勾选，千寻币用途按后台 6 个消费场景收口 |
| 版本02 | 2026-07-01 | Codex | 明确千寻币为 PRD-04 唯一付费虚拟币，充值页不展示积分或其他虚拟币套餐 |
| 版本01 | 2026-06-25 | Codex | 版本 01：由旧版千寻币充值页转写正式版 |

- **页面 ID**：`APP-04-PAGE-coin-recharge`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-04_商业化（VIP、千寻币、解锁与资产中心）.md`
- **页面路由**：`/pages/commerce/coin-recharge`
- **入口来源**：我的页「千寻币」；余额不足弹窗；单条解锁/悄悄话/理想型/精选付费触点
- **对应后台**：`ADM-04-PAGE-commerce-config`

---

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：查看当前千寻币余额，选择充值套餐并完成支付；千寻币为 PRD-04 唯一付费虚拟币，不展示积分、虚拟积分或其他付费币种
- **页面类型**：购买页

---

## 2. 布局

```text
顶部余额区 -> 套餐卡片区 -> 消费场景说明区 -> 购买说明区 -> 充值协议勾选 -> 底部固定支付按钮
```

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|-----------|----------------|
| 余额区 | 顶部 | 当前千寻币余额、来源场景提示 | 否 | 否 |
| 套餐区 | 中部 | 后台配置的套餐卡片，默认推荐档高亮 | 否 | 否 |
| 消费场景说明区 | 中部 | 后台配置的 6 个千寻币消费场景，含移动端图标、展示名和单价 | 否 | 否 |
| 说明区 | 下部 | 千寻币用途、不过期说明、购买限制；不出现积分兑换/积分规则说明 | 是 | 否 |
| 协议区 | 底部按钮上方 | 千寻币充值协议勾选 | 否 | 否 |

---

## 4. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-04-PAGE-coin-recharge-FIELD-balance` | 当前余额 | int | 是 | ≥0 | 整数 | 0 | 否 | 普通 | 用户资产摘要 |
| `APP-04-PAGE-coin-recharge-FIELD-source-scene` | 来源场景 | enum/string | 否 | `M04-ENUM-coin-biz-scene` 或页面来源 | 仅用于回跳和提示，不参与价格计算 | 无 | 否 | 普通 | 路由参数/业务上下文 |
| `APP-04-PAGE-coin-recharge-FIELD-package-card` | 充值套餐 | json | 是 | `M04-CFG-coin-package-list` | 上架套餐必须有套餐编号、支付金额、到账币数；套餐类型固定为千寻币套餐，不允许积分/其他付费虚拟币套餐 | 无 | 用户选择 | 普通 | 后台商业化配置 |
| `APP-04-PAGE-coin-recharge-FIELD-pay-amount` | 支付金额 | decimal | 是 | ≥0 | 以订单快照为准，不用前端计算覆盖 | 无 | 否 | 普通 | 后台套餐配置 |
| `APP-04-PAGE-coin-recharge-FIELD-coin-count` | 到账币数 | int | 是 | ≥0 | 到账币数 + 赠送币数共同写入余额 | 无 | 否 | 普通 | 后台套餐配置 |
| `APP-04-PAGE-coin-recharge-FIELD-package-tag` | 套餐标签 | string | 否 | `M04-CFG-package-tag-list` | 超长省略 | 无 | 否 | 普通 | 后台商业化配置 |
| `APP-04-PAGE-coin-recharge-FIELD-use-scenes` | 千寻币消费场景 | json | 是 | `M04-CFG-coin-scene-price` 的 6 个消费场景 | 仅展示启用消费场景；每项必须返回 `mobileIcon`；不展示 `invite_*` 奖励场景和积分用途 | 6 个消费场景 | 否 | 普通 | 后台商业化配置 |
| `APP-04-PAGE-coin-recharge-FIELD-recharge-agreement-checked` | 充值协议勾选 | bool | 是 | 是/否 | 未勾选不可支付 | 否 | 用户勾选 | 普通 | 用户操作 |

---

## 5. 操作表

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-04-PAGE-coin-recharge-ACT-select-package` | 选择套餐 | 套餐区 | 套餐状态=`on` | 已登录 | 否 | 高亮选中套餐，支付按钮刷新金额 | 套餐下架提示 `M04-ERR-package-offline` |
| `APP-04-PAGE-coin-recharge-ACT-pay` | 立即充值 | 底部固定 | 已选套餐且已勾选充值协议 | 已登录 | 否 | 创建订单并拉起微信支付；成功后跳支付结果页 | 未勾选协议阻断；支付不可用 `M04-ERR-pay-unavailable`；订单过期 `M04-ERR-order-expired` |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 来源场景 | 来自余额不足弹窗 | 支付成功回跳 | 支付成功后优先返回来源场景并继续原动作 | `M04-RULE-payment-result` |
| 选中套餐 | 变化 | 支付金额/到账币数 | 使用订单快照展示，不做本地价格计算 | |
| 支付成功 | 订单成功 | 当前余额 | 刷新余额并写 `M04-EVT-coin-recharged` | |
| 套餐类型 | 返回积分/其他付费虚拟币套餐 | 套餐区 | 不展示该套餐，视为配置越界并提示刷新 | `M04-RULE-paid-coin-scope` |
| 充值协议 | 未勾选点击支付 | 支付按钮/字段提示 | 阻断支付并提示先阅读并勾选千寻币充值协议 | |
| 消费场景 | 加载配置 | 用途说明区 | 仅展示 `whisper`、`likes_unlock_one`、`viewers_unlock_one`、`ideal_user_unlock`、`ideal_batch_unlock`、`featured_profile_unlock` 6 个消费场景；图标取 `M04-CFG-coin-scene-price.mobileIcon` | `M04-RULE-coin-consume-price-scope` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|---------------|------|
| 加载态 | 首次加载 | 骨架屏 | 无 | — |
| 空态 | 无上架套餐 | 套餐区空态，支付按钮隐藏 | 刷新/返回 | `M04-ERR-config-missing` |
| 错误态 | 套餐加载失败 | toast + 重试 | 重试 | — |
| 无权限态 | 未登录 | 引导登录 | 登录 | APP-04 端内定义 |
| 业务态-余额不足来源 | sourceScene 有待继续动作 | 顶部提示充值后继续当前操作 | 选择套餐支付 | `M04-RULE-coin-balance` |
| 降级态 | 微信支付不可用 | 支付按钮置灰 | 稍后重试 | `M04-SRV-wechat-pay` |
| 边界态 | 返回积分/其他虚拟币套餐 | 不展示该套餐，保留千寻币充值口径 | 刷新/返回 | `M04-RULE-paid-coin-scope` |

---

## 9. 验收标准

```text
AC-ID: APP-04-AC-coin-pay-success
Given 已登录用户选择一个上架千寻币套餐
When  点击立即充值并完成微信支付
Then  订单状态为 success，千寻币余额增加到账币数，写 recharge 流水，支付结果页展示成功

AC-ID: APP-04-AC-coin-return-source
Given 用户从喜欢我的单条解锁余额不足弹窗进入充值页
When  充值成功并点击返回来源页
Then  返回原业务上下文，并可继续执行该单条解锁动作

AC-ID: APP-04-AC-coin-only-paid-currency
Given 后台存在千寻币套餐且历史 demo 曾出现积分管理入口
When  用户进入千寻币充值页
Then  页面只展示千寻币余额和千寻币充值套餐，不展示积分余额、积分充值或积分兑换入口

AC-ID: APP-04-AC-coin-agreement-and-scenes
Given 已登录用户进入千寻币充值页
When  未勾选千寻币充值协议点击立即充值
Then  阻断支付并提示勾选协议；页面用途说明只展示后台配置的 6 个千寻币消费场景，且每个场景图标取后台 `mobileIcon` 配置
```

### 验收标准清单

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-04-AC-coin-pay-success` | 千寻币充值到账 | 正常 | P0 |
| `APP-04-AC-coin-return-source` | 充值后回跳来源场景 | 正常 | P0 |
| `APP-04-AC-coin-only-paid-currency` | 千寻币唯一付费虚拟币 | 边界 | P0 |
| `APP-04-AC-coin-agreement-and-scenes` | 协议勾选、消费场景收口与图标展示 | 正常 | P0 |

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块枚举 | `M04-ENUM-coin-biz-scene` | 来源场景 |
| 依赖的模块规则 | `M04-RULE-coin-balance` / `M04-RULE-payment-result` / `M04-RULE-paid-coin-scope` | 余额、支付与唯一付费虚拟币口径 |
| 依赖的模块配置项 | `M04-CFG-coin-package-list` / `M04-CFG-coin-scene-price` | 套餐、消费场景与移动端图标 |
| 依赖的错误码 | `M04-ERR-package-offline` / `M04-ERR-pay-unavailable` | |
| 对应后台页面 | `ADM-04-PAGE-commerce-config` | 套餐配置 |
