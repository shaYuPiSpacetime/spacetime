# 页面规格 - ADM-02-PAGE-user-relation-section App 用户详情-关系记录区块

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-07-02 | Codex | 补齐明细 Tab 表格列属性，明确列宽、排序、固定列和溢出处理 |
| 版本01 | 2026-07-01 | Codex | 正式版初稿 |

- **页面 ID**：`ADM-02-PAGE-user-relation-section`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_ADM-02_关系反馈与互动链路.md`
- **页面路由**：不作为独立菜单页；嵌入 App 用户管理详情页/抽屉
- **入口来源**：用户管理中心 -> App 用户管理 -> 查看详情
- **对应移动端**：`APP-02-PAGE-likes-me`、`APP-02-PAGE-recent-viewers`、`APP-02-PAGE-mutual-matches`

---

## 1. 页面定位

- **目标用户**：客服、运营、风控、超级管理员
- **核心任务**：在用户详情中查看该用户的关系反馈摘要与明细，解释前台展示、失效和解锁问题
- **页面类型**：详情页内区块 / Tab

---

## 2. 布局

```text
App 用户详情
├─ 基础资料/认证/资产等既有区块
└─ 关系记录区块
   ├─ 摘要卡：核心准入、被喜欢数、最近 7 天访客 UV/PV、相互喜欢数
   ├─ Tab：喜欢记录
   ├─ Tab：访客记录
   ├─ Tab：匹配记录
   └─ Tab：解锁记录摘要
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 关系反馈摘要 | 关系记录区块顶部 | 核心准入、统计、最近匹配时间 | 否 | 否 |
| 喜欢记录 Tab | 摘要下方 | 用户作为发起方/接收方的喜欢记录 | 否 | 是 |
| 访客记录 Tab | 摘要下方 | 用户作为访问者/被访问者的访客记录 | 否 | 是 |
| 匹配记录 Tab | 摘要下方 | 用户参与的匹配成功记录 | 否 | 是 |
| 解锁记录摘要 Tab | 摘要下方 | 与喜欢/访客相关的解锁记录摘要，资产流水跳 PRD-04 | 否 | 是 |

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `ADM-02-user-relation-01` | 用户详情-关系记录摘要 | 摘要卡 + Tab | 缺设计稿时需补 |
| `ADM-02-user-relation-02` | 用户详情-喜欢记录 Tab | 表格、筛选、状态 | |
| `ADM-02-user-relation-03` | 用户详情-访客记录 Tab | 表格、筛选、隐藏访问标识 | |
| `ADM-02-user-relation-04` | 用户详情-匹配记录 Tab | 来源、状态、失效原因 | |
| `ADM-02-user-relation-05` | 用户详情-解锁记录摘要 Tab | 解锁记录与 PRD-04 跳转 | |

---

## 3. 筛选与搜索

### 3.1 搜索

本区块嵌入单个用户详情，不提供全局搜索；用户定位由 App 用户管理页承接。

### 3.2 筛选条件

| 筛选 ID | 筛选名 | 类型 | 选项来源 | 是否多选 | 默认值 | 是否可清除 |
|---------|--------|------|----------|----------|--------|------------|
| `ADM-02-PAGE-user-relation-section-FILTER-relation-type` | 关系方向 | 下拉 | 我发起/我接收/全部 | 否 | 全部 | 是 |
| `ADM-02-PAGE-user-relation-section-FILTER-status` | 状态 | 下拉 | `M02-ENUM-like-status` / `M02-ENUM-visit-status` / `M02-ENUM-match-status` | 否 | 全部 | 是 |
| `ADM-02-PAGE-user-relation-section-FILTER-source` | 来源场景 | 下拉 | `M02-ENUM-relation-source-scene` / `M02-ENUM-match-source` | 否 | 全部 | 是 |
| `ADM-02-PAGE-user-relation-section-FILTER-time` | 时间范围 | 日期范围 | 用户选择 | 否 | 最近 7 天（访客 Tab）/全部（其他 Tab） | 是 |

---

## 4. 字段表

### 4.1 摘要字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `ADM-02-PAGE-user-relation-section-FIELD-core-access-status` | 关系反馈准入状态 | enum | 是 | `M01-ENUM-core-access-status` | 只展示中文状态 | 无 | 否 | 普通 | PRD-01 |
| `ADM-02-PAGE-user-relation-section-FIELD-liked-count` | 当前有效被喜欢数 | int | 是 | >=0 | 只统计 active 且当前用户为接收方 | 0 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-relation-section-FIELD-visitor-uv-7d` | 最近 7 天访客 UV | int | 是 | >=0 | 同一访客 7 天内计 1 UV | 0 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-relation-section-FIELD-visitor-pv-7d` | 最近 7 天访客 PV | int | 是 | >=0 | 按 PV 统计 | 0 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-relation-section-FIELD-mutual-count` | 当前有效相互喜欢数 | int | 是 | >=0 | 只统计 matched | 0 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-relation-section-FIELD-hidden-visit` | 是否开启隐藏访问记录 | bool | 是 | true/false | 需结合会员权益是否有效 | false | 否 | 普通 | PRD-02/04 |
| `ADM-02-PAGE-user-relation-section-FIELD-last-match-time` | 最近匹配时间 | datetime | 否 | datetime | 无记录展示 `-` | 无 | 否 | 普通 | PRD-02 |

### 4.2 明细字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `ADM-02-PAGE-user-relation-section-FIELD-record-no` | 记录编号 | string | 是 | LIK/VIS/MAT/ULK 业务编号 | 列表展示业务编号 | 无 | 否 | 普通 | PRD-02/04 |
| `ADM-02-PAGE-user-relation-section-FIELD-counterparty` | 对方用户 | string | 是 | 用户 UUID + 昵称/脱敏手机号 | 按权限脱敏 | 无 | 否 | 敏感（手机号脱敏） | PRD-01 |
| `ADM-02-PAGE-user-relation-section-FIELD-source-scene` | 来源场景 | enum | 是 | `M02-ENUM-relation-source-scene` / `M02-ENUM-match-source` | 展示中文 | 无 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-relation-section-FIELD-status` | 状态 | enum | 是 | PRD-02 状态枚举 | 展示状态标签 | 无 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-relation-section-FIELD-invalid-reason` | 失效原因 | enum | 条件必填 | `M02-ENUM-invalid-reason` | 失效态必填 | 无 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-relation-section-FIELD-created-time` | 创建/访问/匹配时间 | datetime | 是 | yyyy-MM-dd HH:mm:ss | 展示到秒 | 无 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-relation-section-FIELD-unlock-no` | 解锁记录号 | string | 否 | ULK 业务编号 | 有解锁时展示 | 无 | 否 | 普通 | PRD-04 |

### 4.3 明细 Tab 列属性

| 列 ID | 对应字段 | 默认显示 | 是否可排序 | 列宽 | 是否固定 | 溢出处理 | 适用 Tab |
|-------|----------|----------|------------|------|----------|----------|----------|
| `ADM-02-PAGE-user-relation-section-COL-record-no` | 记录编号 | 是 | 否 | 150px | 左固定 | 中间省略，悬停展示完整编号 | 喜欢/访客/匹配/解锁 |
| `ADM-02-PAGE-user-relation-section-COL-counterparty` | 对方用户 | 是 | 否 | 180px | 否 | 手机号按权限脱敏，昵称超长省略 | 喜欢/访客/匹配/解锁 |
| `ADM-02-PAGE-user-relation-section-COL-source-scene` | 来源场景 | 是 | 否 | 140px | 否 | 状态标签展示 | 喜欢/访客/匹配 |
| `ADM-02-PAGE-user-relation-section-COL-status` | 状态 | 是 | 否 | 110px | 否 | 状态标签展示 | 喜欢/访客/匹配/解锁 |
| `ADM-02-PAGE-user-relation-section-COL-invalid-reason` | 失效原因 | 条件显示 | 否 | 160px | 否 | 仅失效态显示，超长换行 | 喜欢/访客/匹配 |
| `ADM-02-PAGE-user-relation-section-COL-created-time` | 创建/访问/匹配时间 | 是 | 是 | 170px | 否 | 不换行 | 喜欢/访客/匹配/解锁 |
| `ADM-02-PAGE-user-relation-section-COL-unlock-no` | 解锁记录号 | 条件显示 | 否 | 150px | 否 | 中间省略；无记录显示 `-` | 喜欢/访客/解锁 |
| `ADM-02-PAGE-user-relation-section-COL-action` | 操作 | 是 | 否 | 150px | 右固定 | 按权限隐藏不可用操作 | 喜欢/访客/匹配/解锁 |

---

## 5. 操作表

### 5.1 行级操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响 |
|---------|--------|----------|----------|----------|--------|--------|------|
| `ADM-02-PAGE-user-relation-section-ACT-view-user` | 查看对方用户 | 对方用户仍存在 | 查看用户权限 | 否 | 打开对方用户详情 | 无权限/用户不存在 | 不改变关系 |
| `ADM-02-PAGE-user-relation-section-ACT-view-unlock` | 查看解锁记录 | 存在解锁记录号 | PRD-04 资产查看权限 | 否 | 跳转或打开 PRD-04 解锁/流水详情 | 资产服务不可用 | 不改变关系 |
| `ADM-02-PAGE-user-relation-section-ACT-view-invalid-reason` | 查看失效原因 | 状态为失效 | 查看权限 | 否 | 展示失效原因和触发时间 | 无 | 不改变关系 |

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `ADM-02-PAGE-user-relation-section-ACT-refresh` | 刷新 | 区块右上 | 任意 | 查看权限 | 否 | 刷新摘要和当前 Tab | 加载失败提示 |

> 首版不提供手工制造、恢复、修改喜欢/访客/匹配记录的操作。

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 用户认证状态 | 回退 | 准入状态/记录状态 | 摘要显示未开放；相关前台能力不可用 | `M02-RULE-core-access` |
| 关系状态 | 失效 | 失效原因 | 明细表显示失效原因，前台也展示原因 | 已确认失效展示口径 |
| 解锁记录号 | 点击查看 | PRD-04 流水 | 跳转或打开商业化详情 | |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 打开用户详情 | 区块 skeleton | 无 | — |
| 空态 | 无关系记录 | Tab 表格空态 | 无 | ADM-02 端内定义 |
| 搜索无结果 | 筛选后无数据 | 清除筛选 | 重置 | |
| 无权限态 | 角色无权限 | Tab 隐藏或置灰 | 无 | ADM-02 权限矩阵 |
| 业务态-失效 | 记录失效 | 状态标签 + 原因 | 查看原因 | `M02-RULE-relation-invalid` |
| 降级态 | PRD-04 资产服务不可用 | 解锁记录入口置灰 | 稍后重试 | PRD-04 |

---

## 8. 查询与列表

- **默认排序**：各 Tab 按创建/访问/匹配时间倒序。
- **分页**：默认每页 10 条，可选 10/20/50。
- **批量选择**：不支持。
- **导出**：首版默认不开放。

---

## 9. 验收标准

```text
AC-ID: ADM-02-AC-user-relation-summary
Given 客服打开某用户详情
When  进入关系记录区块
Then  可看到核心准入、有效被喜欢数、最近 7 天访客 UV/PV、有效相互喜欢数和最近匹配时间

AC-ID: ADM-02-AC-user-relation-invalid
Given 某匹配记录因拉黑失效
When  客服查看匹配记录 Tab
Then  该记录状态为已失效，并展示失效原因“已拉黑”

AC-ID: ADM-02-AC-no-manual-recover
Given 超级管理员打开关系记录区块
When  查看任意失效记录
Then  页面不提供恢复关系、补喜欢、补访客、制造匹配操作
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖规则 | `M02-RULE-admin-scope` / `M02-RULE-admin-manual-boundary` | |
| 依赖移动端 | `APP-02-PAGE-likes-me` / `APP-02-PAGE-recent-viewers` / `APP-02-PAGE-mutual-matches` | |
| 依赖商业化 | PRD-04 解锁记录/资产流水 | |
