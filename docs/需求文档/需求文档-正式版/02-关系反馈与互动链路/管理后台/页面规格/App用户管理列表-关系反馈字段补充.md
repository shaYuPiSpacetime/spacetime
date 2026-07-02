# 页面规格 - ADM-02-PAGE-user-list-relation-fields App 用户管理列表-关系反馈字段补充

> 本页是对 `ADM-01-PAGE-app-user-management` 的字段增强说明，不新增独立后台菜单或全局关系列表。App 用户管理页主体布局、分页、导出和画像抽屉仍以 PRD-01 页面规格为准。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-02 | Codex | 正式版初稿，补齐原后台 PRD-02 第 4.1.1 对用户列表的关系反馈字段要求 |

- **页面 ID**：`ADM-02-PAGE-user-list-relation-fields`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_ADM-02_关系反馈与互动链路.md`
- **承载页面**：`ADM-01-PAGE-app-user-management`
- **页面路由**：沿用 App 用户管理页路由
- **入口来源**：用户管理中心 -> App 用户管理
- **对应移动端**：`APP-02-PAGE-likes-me`、`APP-02-PAGE-recent-viewers`、`APP-02-PAGE-mutual-matches`

---

## 1. 页面定位

- **目标用户**：客服、运营、风控、超级管理员
- **核心任务**：在用户列表快速识别用户关系反馈准入、访客、被喜欢和相互喜欢概况，辅助定位需要打开详情排查的用户
- **页面类型**：既有列表页字段补充

---

## 2. 布局

本补充不改变 `ADM-01-PAGE-app-user-management` 的卡片宫格/筛选区/分页结构，只在筛选区和卡片字段区补充关系反馈字段。

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `ADM-02-user-list-relation-01` | App 用户管理-关系反馈筛选字段 | 筛选区新增关系反馈准入、VIP、隐藏访问记录 | 可在 ADM-01 主列表画板上增量标注 |
| `ADM-02-user-list-relation-02` | App 用户管理-关系反馈列表字段 | 卡片/列表新增被访问、被喜欢、相互喜欢统计 | 不新增独立页面 |

---

## 3. 筛选与搜索

### 3.2 筛选条件

| 筛选 ID | 筛选名 | 类型 | 选项来源 | 是否多选 | 默认值 | 是否可清除 |
|---------|--------|------|----------|----------|--------|------------|
| `ADM-02-PAGE-user-list-relation-fields-FILTER-core-access-status` | 关系反馈准入状态 | 下拉 | `M01-ENUM-core-access-status` | 是 | 全部 | 是 |
| `ADM-02-PAGE-user-list-relation-fields-FILTER-vip-status` | VIP 状态 | 下拉 | `M04-ENUM-vip-status` | 是 | 全部 | 是 |
| `ADM-02-PAGE-user-list-relation-fields-FILTER-hidden-visit-enabled` | 是否开启隐藏访问记录 | 下拉 | 全部/是/否 | 否 | 全部 | 是 |

### 3.3 筛选交互

- 筛选项变化后：沿用 App 用户管理页查询触发方式。
- 重置后：清空关系反馈准入状态、VIP 状态、是否开启隐藏访问记录筛选。
- 权限不足时：VIP 状态可按 PRD-04 权限隐藏；关系反馈准入状态仍可展示。

---

## 4. 字段表

### 4.1 列表字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `ADM-02-PAGE-user-list-relation-fields-FIELD-relation-access-status` | 关系反馈准入状态 | enum | 是 | `M01-ENUM-core-access-status` | 只展示中文状态；用于判断用户能否进入关系反馈链路 | 无 | 否 | 普通 | PRD-01/02 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-vip-status` | VIP 状态 | enum | 是 | `M04-ENUM-vip-status` | 只展示中文状态；无 PRD-04 权限时隐藏 | `inactive` | 否 | 普通 | PRD-04 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-hidden-visit-enabled` | 隐藏访问记录 | bool | 是 | true/false | 需结合会员隐私权益是否有效；无权益时展示否 | false | 否 | 普通 | PRD-02/04 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-visitor-uv-7d` | 最近 7 天被访问人数 | int | 是 | >=0 | 统计最近 7 天访问当前用户婚恋主页的去重访客数 | 0 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-active-liked-count` | 当前有效被喜欢数 | int | 是 | >=0 | 只统计 `M02-SM-like-record=active` 且当前用户为接收方 | 0 | 否 | 普通 | PRD-02 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-active-mutual-count` | 当前有效相互喜欢数 | int | 是 | >=0 | 只统计 `M02-SM-mutual-match=matched` | 0 | 否 | 普通 | PRD-02 |

#### 列表字段附加属性

| 字段 ID | 默认排序 | 是否可排序 | 列宽 | 是否固定 | 是否可拖拽调整列宽 | 溢出处理 |
|---------|----------|------------|------|----------|--------------------|----------|
| `ADM-02-PAGE-user-list-relation-fields-FIELD-relation-access-status` | 否 | 是 | 120px | 否 | 否 | 状态标签 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-vip-status` | 否 | 是 | 100px | 否 | 否 | 状态标签 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-hidden-visit-enabled` | 否 | 是 | 120px | 否 | 否 | 是/否 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-visitor-uv-7d` | 否 | 是 | 120px | 否 | 否 | 数字 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-active-liked-count` | 否 | 是 | 120px | 否 | 否 | 数字 |
| `ADM-02-PAGE-user-list-relation-fields-FIELD-active-mutual-count` | 否 | 是 | 120px | 否 | 否 | 数字 |

---

## 5. 操作表

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `ADM-02-PAGE-user-list-relation-fields-ACT-search` | 按关系反馈条件筛选 | App 用户管理筛选区 | 输入/选择筛选条件 | App 用户管理查看权限 | 否 | 刷新用户列表 | 查询失败保留筛选条件 |
| `ADM-02-PAGE-user-list-relation-fields-ACT-open-detail` | 查看关系记录详情 | App 用户卡片/列表行 | 用户存在 | 用户详情查看权限 | 否 | 打开用户详情并定位关系记录区块 | 无权限提示 |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 关系反馈准入状态 | 选择 | 用户列表 | 只返回对应核心准入状态用户 | 引用 PRD-01 |
| VIP 状态 | 选择 | 隐藏访问记录字段 | VIP 未生效用户通常隐藏访问记录为否 | 引用 PRD-04 |
| 最近 7 天被访问人数 | 点击用户详情 | 访客记录 Tab | 用户详情中可查看访客记录明细 | |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 筛选查询 | 沿用 App 用户管理页加载态 | 无 | ADM-01 |
| 空态 | 筛选无用户 | 未找到相关用户 | 重置筛选 | ADM-01 |
| 无权限态 | 无 PRD-04 权限 | VIP 字段隐藏或脱敏 | 无 | ADM-04 权限矩阵 |
| 业务态-无关系数据 | 用户无关系记录 | 统计字段展示 0 | 打开详情查看空态 | `ADM-02-PAGE-user-relation-section` |
| 降级态 | PRD-02 统计服务不可用 | 关系统计字段显示 `-`，列表主体不受影响 | 稍后刷新 | `M02-ERR-relation-stat-unavailable` |

---

## 8. 查询与列表

- **默认排序**：沿用 App 用户管理页默认排序。
- **可选排序**：关系反馈准入状态、最近 7 天被访问人数、当前有效被喜欢数、当前有效相互喜欢数。
- **分页**：沿用 App 用户管理页分页。
- **批量选择**：不新增批量操作。
- **导出**：首版不新增关系反馈字段导出；如后续导出需单独授权并记录审计。

---

## 9. 验收标准

```text
AC-ID: ADM-02-AC-user-list-relation-filters
Given 运营打开 App 用户管理页
When  查看筛选区
Then  可看到关系反馈准入状态、VIP 状态、是否开启隐藏访问记录筛选项

AC-ID: ADM-02-AC-user-list-relation-fields
Given 用户存在关系反馈数据
When  用户列表加载完成
Then  列表/卡片展示关系反馈准入状态、最近 7 天被访问人数、当前有效被喜欢数、当前有效相互喜欢数

AC-ID: ADM-02-AC-user-list-no-independent-menu
Given 后台首版菜单加载完成
When  查看用户管理中心菜单
Then  不出现独立“全局关系列表”菜单，关系字段只作为 App 用户管理页增强展示
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 承载页面 | `ADM-01-PAGE-app-user-management` | 既有 App 用户管理页 |
| 依赖规则 | `M02-RULE-admin-scope` | 不新增独立关系列表 |
| 依赖商业化 | `M04-ENUM-vip-status` / `M04-ENUM-vip-benefit-type=privacy` | VIP 与隐藏访问记录 |
