# 页面规格 - ADM-03-PAGE-user-message-section App 用户管理模块补充弹窗-消息互动 Tab

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-07-02 | Codex | 按确认口径从画像详情移出，改由 App 用户卡片模块补充弹窗的消息互动 Tab 承接 |
| 版本01 | 2026-07-02 | Codex | 初稿 |

- **页面 ID**：`ADM-03-PAGE-user-message-section`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_ADM-03_消息私信通知后台承接.md`
- **页面路由**：不作为独立菜单页；由 `ADM-01-PAGE-app-user-management` 用户卡片的“模块补充”按钮打开统一弹窗
- **入口来源**：App 用户管理列表 -> 用户卡片“模块补充” -> 消息互动 Tab
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端 / 技术方案**：消息列表、私信对话、悄悄话、通知中心

---

## 1. 页面定位

- **目标用户**：客服、运营、审核员、风控、超级管理员
- **核心任务**：在模块补充弹窗中查看消息互动摘要、会话、悄悄话、通知和举报记录
- **页面类型**：原页面卡片入口弹窗 / Tab

---

## 2. 布局（给 UI）

### 2.1 整体布局

```text
┌────────────────────────────────────────────┐
│ App 用户管理卡片                            │
├────────────────────────────────────────────┤
│ 按钮行：详情 | 模块补充 | 头像审核           │
├────────────────────────────────────────────┤
│ 模块补充弹窗：关系反馈 | 消息互动           │
├────────────────────────────────────────────┤
│ 消息互动：摘要卡 + 最近消息                │
├────────────────────────────────────────────┤
│ 记录区：私信 | 悄悄话 | 通知 | 举报           │
├────────────────────────────────────────────┤
│ 高敏内容仍需二次确认并写入审计               │
└────────────────────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 消息互动摘要 | 模块补充弹窗-消息互动 Tab 顶部 | 聊天资格、会话数、悄悄话待回复、未读通知、保护命中 | 否 | 否 |
| 私信会话 Tab | Tab 1 | 会话摘要、状态、最后消息、失效原因 | 否 | 是 |
| 悄悄话记录 Tab | Tab 2 | 悄悄话状态、消耗方式、冷却期 | 否 | 是 |
| 通知记录 Tab | Tab 3 | 通知类型、业务类型、已读状态、跳转目标 | 否 | 是 |
| 举报记录 Tab | Tab 4 | 聊天/悄悄话举报、处理状态、处罚结果 | 否 | 是 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 会话详情抽屉 | 点击会话查看 | 右侧 720px | 会话双方、状态、消息摘要、敏感内容查看入口 | 关闭按钮/ESC |
| 高敏内容确认 | 点击查看内容 | 居中弹窗 | 查看原因、审计提示、确认 | 取消/确认 |
| 通知详情抽屉 | 点击通知查看 | 右侧 640px | 通知正文、跳转参数、发送状态 | 关闭按钮/ESC |

> 模块补充弹窗承接的是 01 App 用户管理卡片入口；不把消息互动区块放回 01 画像详情抽屉。

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `ADM-03-user-detail-msg-01` | 模块补充弹窗-消息互动摘要 | 摘要卡和记录区 | P0 |
| `ADM-03-user-detail-msg-02` | 模块补充弹窗-私信记录 | 会话列表和状态 | P0 |
| `ADM-03-user-detail-msg-03` | 模块补充弹窗-悄悄话记录 | 悄悄话记录 | P0 |
| `ADM-03-user-detail-msg-04` | 模块补充弹窗-通知记录 | 通知记录 | P0 |
| `ADM-03-user-detail-msg-05` | 模块补充弹窗-举报记录 | 举报记录 | P0 |
| `ADM-03-user-detail-msg-06` | 模块补充弹窗-高敏内容确认 | 二次确认弹窗 | P0 |

### 2.5 编辑控件口径

本区块只读，不允许后台手工修改会话、悄悄话或通知状态。

---

## 3. 筛选与搜索

### 3.1 搜索

Tab 内不提供关键词搜索；按 Tab 筛选和分页。

### 3.2 筛选条件

| 筛选 ID | 筛选名 | 类型 | 选项来源 | 是否多选 | 默认值 | 是否可清除 |
|---------|--------|------|----------|----------|--------|------------|
| `ADM-03-PAGE-user-message-section-FILTER-conversation-status` | 会话状态 | 下拉 | `M03-ENUM-conversation-status` | 否 | 全部 | 是 |
| `ADM-03-PAGE-user-message-section-FILTER-whisper-status` | 悄悄话状态 | 下拉 | `M03-ENUM-whisper-status` | 否 | 全部 | 是 |
| `ADM-03-PAGE-user-message-section-FILTER-notice-type` | 通知类型 | 下拉 | `M03-ENUM-notification-type` | 否 | 全部 | 是 |
| `ADM-03-PAGE-user-message-section-FILTER-date-range` | 时间范围 | 日期范围 | 用户选择 | 否 | 最近 30 天 | 是 |

### 3.3 筛选交互

- 筛选项变化后：点击查询触发
- 是否显示当前筛选条件标签：否
- 筛选条件是否在 URL 上持久化：否

---

## 4. 字段表

### 4.1 列表字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `ADM-03-PAGE-user-message-section-FIELD-chat-eligible` | 真实聊天资格 | bool | 是 | 是/否 | 根据核心准入与账号状态计算 | 否 | 不可编辑 | 普通 | PRD-01/03 |
| `ADM-03-PAGE-user-message-section-FIELD-conversation-no` | 会话编号 | string | 条件必填 | 业务编号 | Tab 为私信会话时必填 | 无 | 不可编辑 | 普通 | 会话记录 |
| `ADM-03-PAGE-user-message-section-FIELD-conversation-status` | 会话状态 | enum | 条件必填 | `M03-ENUM-conversation-status` | 展示中文 | 无 | 系统流转 | 普通 | `M03-SM-conversation` |
| `ADM-03-PAGE-user-message-section-FIELD-last-message-preview` | 最后消息摘要 | string | 否 | 0-50 字 | 内容脱敏；无权限只显示类型 | 无 | 不可编辑 | 敏感，默认摘要脱敏 | 消息记录 |
| `ADM-03-PAGE-user-message-section-FIELD-whisper-status` | 悄悄话状态 | enum | 条件必填 | `M03-ENUM-whisper-status` | 展示中文 | 无 | 系统流转 | 普通 | 悄悄话记录 |
| `ADM-03-PAGE-user-message-section-FIELD-pay-type` | 消耗方式 | enum | 否 | 免费次数/千寻币 | 引用 PRD-04 | 无 | 不可编辑 | 普通 | PRD-04 |
| `ADM-03-PAGE-user-message-section-FIELD-notice-type` | 通知类型 | enum | 条件必填 | `M03-ENUM-notification-type` | 展示中文 | 无 | 系统生成 | 普通 | 通知记录 |
| `ADM-03-PAGE-user-message-section-FIELD-read-status` | 已读状态 | enum | 否 | `M03-ENUM-read-status` | 展示中文 | `unread` | 系统流转 | 普通 | 通知记录 |
| `ADM-03-PAGE-user-message-section-FIELD-report-status` | 举报处理状态 | enum | 否 | 引用举报处理状态 | 展示中文 | 无 | 举报流程流转 | 普通 | 举报记录 |
| `ADM-03-PAGE-user-message-section-FIELD-created-time` | 创建时间 | datetime | 是 | datetime | `yyyy-MM-dd HH:mm:ss` | 无 | 不可编辑 | 普通 | 各 Tab 记录 |

#### 列表字段附加属性

| 字段 ID | 默认排序 | 是否可排序 | 列宽 | 是否固定 | 是否可拖拽调整列宽 | 溢出处理 |
|---------|----------|------------|------|----------|--------------------|----------|
| `ADM-03-PAGE-user-message-section-FIELD-created-time` | 倒序 | 是 | 160px | 否 | 否 | 空值 `-` |
| `ADM-03-PAGE-user-message-section-FIELD-last-message-preview` | 无 | 否 | 240px | 否 | 否 | 省略号 |
| `ADM-03-PAGE-user-message-section-FIELD-conversation-status` | 无 | 否 | 120px | 否 | 否 | 状态胶囊 |

### 4.2 详情/表单字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `ADM-03-PAGE-user-message-section-FIELD-view-reason` | 查看原因 | string | 条件必填 | 5-100 字 | 查看高敏内容时必填 | 无 | 当前管理员填写 | 敏感，审计保留 >=1 年 | 后台输入 |

---

## 5. 操作表

### 5.1 行级操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响（副作用） |
|---------|--------|----------|----------|----------|--------|--------|----------------|
| `ADM-03-PAGE-user-message-section-ACT-view-conversation` | 查看会话详情 | 私信会话 Tab | `ADM-03-PERM-conversation-list-view` | 否 | 打开会话详情抽屉 | 无权限时隐藏 | 记录访问日志 |
| `ADM-03-PAGE-user-message-section-ACT-view-content` | 查看消息内容 | 具备高敏权限 | `ADM-03-PERM-message-content-view` | 是，填写查看原因 | 展示内容详情 | 无权限或未填原因禁止 | 写 `ADM-03-AUDIT-message-content-view` |
| `ADM-03-PAGE-user-message-section-ACT-view-notice` | 查看通知详情 | 通知记录 Tab | `ADM-03-PERM-notification-view` | 否 | 打开通知详情抽屉 | 记录不存在提示 | 无 |

### 5.2 批量操作

本区块不提供批量操作和手工状态修改。

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `ADM-03-PAGE-user-message-section-ACT-query-tab` | 查询 | Tab 筛选栏 | 任意 | 对应 Tab 查看权限 | 否 | 刷新当前 Tab | 失败提示重试 |
| `ADM-03-PAGE-user-message-section-ACT-reset-tab` | 重置 | Tab 筛选栏 | 有筛选条件 | 对应 Tab 查看权限 | 否 | 清空筛选 | 无 |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| Tab 切换 | 切换到某 Tab | 筛选条件 | 重置为当前 Tab 默认筛选 | 提升可读性 |
| 角色权限 | 无高敏内容权限 | 查看内容按钮 | 按钮隐藏 | `ADM-03_端内定义.md` |
| 会话状态 | `invalid` | 详情抽屉 | 展示失效原因 | `M03-SM-conversation` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 打开模块补充弹窗或记录区查询 | 表格 loading | 等待 | 后台通用态 |
| 空态 | 当前 Tab 无记录 | 暂无记录 | 切换 Tab | 后台通用态 |
| 错误态 | 查询失败 | toast + 重试 | 重试 | 后台通用态 |
| 无权限态 | 无 Tab 权限 | Tab 隐藏或无权限提示 | 无 | `ADM-03_端内定义.md` |
| 业务态-可查看摘要 | 有摘要权限 | 展示脱敏摘要 | 查看详情 | `ADM-03-PERM-conversation-list-view` |
| 业务态-高敏查看 | 有内容权限 | 二次确认后展示 | 查看内容 | `ADM-03-AUDIT-message-content-view` |
| 降级态 | 消息服务不可用 | 区块显示服务不可用 | 重试 | `ADM-03-STATE-message-service-down` |

---

## 8. 查询与列表

- **默认排序**：各 Tab 创建时间倒序
- **分页**：私信、悄悄话、通知、举报列表均展示分页组件，默认每页 5 条。
- **分页方式**：传统分页
- **列表轮询/实时刷新**：不需要
- **批量选择**：不支持
- **列表为空时引导**：展示暂无记录

---

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `ADM-03-AC-user-message-section-summary` | 模块补充弹窗展示消息摘要 | 正常 | P0 |
| `ADM-03-AC-user-message-section-sensitive-audit` | 高敏内容查看审计 | 正常 | P0 |
| `ADM-03-AC-user-message-section-no-manual-edit` | 不允许手工改会话状态 | 正常 | P0 |

```text
AC-ID: ADM-03-AC-user-message-section-sensitive-audit
Given 风控人员具备 `ADM-03-PERM-message-content-view`
When  在模块补充弹窗的会话详情中点击查看消息内容并填写查看原因
Then  系统展示消息内容，并记录 `ADM-03-AUDIT-message-content-view` 审计日志
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 权限矩阵 | `ADM-03_端内定义.md` | 查看权限 |
| 状态机 | `M03-SM-conversation` | 会话状态 |
| 状态机 | `M03-SM-whisper` | 悄悄话状态 |
| 页面 | `ADM-03-PAGE-message-record-query` | 跨用户查询 |
