# 页面规格 - APP-02-PAGE-single-unlock-modal 单条解锁弹窗场景规格

> 本页不是新的支付组件。PRD-02 只定义喜欢/访客单条解锁的场景内容、字段和按钮组合；实际弹窗容器、扣千寻币、余额不足、快捷充值和支付结果统一复用 `APP-04-PAGE-paywall-modal`。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-02 | Codex | 正式版初稿，补齐原 PRD-02 第 10.5 节单条解锁弹窗场景要求 |

- **页面 ID**：`APP-02-PAGE-single-unlock-modal`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-02_关系反馈与互动链路.md`
- **页面路由**：弹窗场景规格，无独立路由；基础组件复用 `APP-04-PAGE-paywall-modal`
- **入口来源**：`APP-02-PAGE-likes-me`、`APP-02-PAGE-recent-viewers`
- **对应后台**：PRD-04 商业化配置页；PRD-02 不提供关系反馈配置页

---

## 1. 页面定位

- **目标用户**：点击喜欢我的/最近看过我的模糊卡片的普通用户
- **核心任务**：解释当前单条解锁对象，引导用户选择“只看 ta”或“解锁全部”
- **页面类型**：弹窗场景规格

---

## 2. 布局

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 喜欢我的单条解锁弹窗 | 点击喜欢我的模糊卡片 | 复用 PRD-04 半屏/居中弹窗 | 标题、喜欢我的副标题、模糊头像、所需千寻币、按钮组 | 取消/遮罩/系统返回 |
| 最近看过我的单条解锁弹窗 | 点击最近看过我的模糊卡片 | 复用 PRD-04 半屏/居中弹窗 | 标题、访客副标题、模糊头像、所需千寻币、按钮组 | 取消/遮罩/系统返回 |

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-02-single-unlock-01` | 喜欢我的-单条解锁弹窗 | “查看对方资料”“解锁喜欢你的人”、模糊头像、“只看 ta”“解锁全部” | 可与 PRD-04 付费弹窗共用组件 |
| `APP-02-single-unlock-02` | 最近看过我的-单条解锁弹窗 | “查看对方资料”“揭秘是谁来看过你”、模糊头像、“只看 ta”“解锁全部” | |
| `APP-02-single-unlock-03` | 单条解锁-余额不足态 | 余额不足时展示快捷充值入口 | 由 PRD-04 组件承接 |

---

## 3. 筛选与搜索

本页为弹窗场景规格，无筛选搜索。

---

## 4. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-02-PAGE-single-unlock-modal-FIELD-scene` | 解锁场景 | enum | 是 | `likes_unlock_one` / `viewers_unlock_one` | 必须由来源页传入 | 无 | 否 | 普通 | PRD-02/04 |
| `APP-02-PAGE-single-unlock-modal-FIELD-title` | 标题 | string | 是 | `M02-TXT-single-unlock-title` | 固定默认“查看对方资料” | 查看对方资料 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-single-unlock-modal-FIELD-subtitle` | 副标题 | string | 是 | `M02-TXT-like-unlock-subtitle` / `M02-TXT-viewer-unlock-subtitle` | 喜欢我的=解锁喜欢你的人；最近看过我的=揭秘是谁来看过你 | 按场景 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-single-unlock-modal-FIELD-blur-avatar` | 模糊头像 | image | 是 | URL/占位图 | 不得展示清晰头像 | 模糊头像 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-single-unlock-modal-FIELD-cost-coin` | 所需千寻币 | int | 是 | >=0 | 由 PRD-04 场景单价返回，前端不硬编码 | 无 | 否 | 普通 | PRD-04 |
| `APP-02-PAGE-single-unlock-modal-FIELD-balance` | 当前余额 | int | 是 | >=0 | 余额不足时切换 PRD-04 余额不足态 | 0 | 否 | 普通 | PRD-04 |
| `APP-02-PAGE-single-unlock-modal-FIELD-target-record-no` | 目标记录编号 | string | 是 | LIK/VIS 业务编号 | 用于扣币幂等和解锁绑定 | 无 | 否 | 普通 | PRD-02 |

---

## 5. 操作表

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-02-PAGE-single-unlock-modal-ACT-unlock-one` | 只看 ta | 主按钮 | 余额充足且记录未失效 | 已登录且核心准入开放 | 是，确认扣减千寻币 | 当前记录清晰，写 PRD-04 解锁记录和资产流水 | 余额不足、记录失效、扣币失败 |
| `APP-02-PAGE-single-unlock-modal-ACT-unlock-all` | 解锁全部 | 次按钮 | 普通用户非会员 | 已登录且核心准入开放 | 否 | 打开 PRD-04 会员引导 | PRD-04 服务不可用 |
| `APP-02-PAGE-single-unlock-modal-ACT-close` | 关闭 | 右上/遮罩/系统返回 | 任意 | 已登录 | 否 | 关闭弹窗，不变更资产 | 无 |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 解锁场景 | `likes_unlock_one` | 副标题 | 使用 `M02-TXT-like-unlock-subtitle` | |
| 解锁场景 | `viewers_unlock_one` | 副标题 | 使用 `M02-TXT-viewer-unlock-subtitle` | |
| 当前余额 | 小于所需千寻币 | 主按钮/充值入口 | 切换到 PRD-04 余额不足态，展示快捷充值 | `M04-ERR-balance-insufficient` |
| 目标记录状态 | 已失效 | 弹窗展示 | 不允许扣币，展示失效原因 | `M02-RULE-relation-invalid` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 查询单价/余额 | 按钮 loading | 无 | PRD-04 |
| 默认态 | 余额充足且记录有效 | 展示标题、副标题、模糊头像、按钮组 | 只看 ta/解锁全部 | `M02-RULE-single-unlock-modal-content` |
| 余额不足态 | balance < cost | 展示快捷充值 | 充值/更多套餐 | `APP-04-PAGE-paywall-modal` |
| 失效态 | 记录已失效 | 展示失效原因，不展示扣币按钮 | 关闭 | `M02-RULE-relation-invalid` |
| 无权限态 | 未登录或核心准入未开放 | 登录/认证引导 | 登录/认证 | `M02-RULE-core-access` |
| 错误态 | 单价或扣币失败 | toast + 重试 | 重试/关闭 | PRD-04 |

---

## 9. 验收标准

```text
AC-ID: APP-02-AC-single-unlock-like-copy
Given 普通用户点击喜欢我的模糊卡片
When  单条解锁弹窗展示
Then  标题为“查看对方资料”，副标题为“解锁喜欢你的人”，按钮为“只看 ta”和“解锁全部”

AC-ID: APP-02-AC-single-unlock-viewer-copy
Given 普通用户点击最近看过我的模糊卡片
When  单条解锁弹窗展示
Then  标题为“查看对方资料”，副标题为“揭秘是谁来看过你”，按钮为“只看 ta”和“解锁全部”

AC-ID: APP-02-AC-single-unlock-no-charge-invalid
Given 目标喜欢/访客记录已经失效
When  用户打开单条解锁弹窗
Then  页面展示失效原因，不允许扣千寻币
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖规则 | `M02-RULE-single-unlock-modal-content` / `M02-RULE-unlock-visibility` | 场景内容和解锁可见性 |
| 依赖商业化 | `APP-04-PAGE-paywall-modal` / `M04-CFG-coin-scene-price` | 扣币、余额不足、充值承接 |
