# 页面规格 - ADM-03-PAGE-user-message-section App 用户管理模块补充弹窗-消息互动 Tab

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本06 | 2026-08-07 | Codex | 消息主表明文归档与后台展示解耦；本弹窗删除最近消息及脱敏内容摘要，只展示统计和业务元数据 |
| 版本05 | 2026-08-06 | Codex | 补充腾讯云 TIM 会话与消息映射元数据，明确不提供平台内容审核结果字段 |
| 版本04 | 2026-08-06 | Codex | 补充悄悄话回复迁移后的匹配、会话和开场消息关联字段，明确前台移除不删除后台事实 |
| 版本03 | 2026-07-31 | Codex | 历史口径：模块补充弹窗曾包含元数据/脱敏摘要；该摘要展示已由版本06删除 |
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
- **核心任务**：在模块补充弹窗中查看消息互动统计、会话/悄悄话元数据、系统消息状态和举报关联，不接触用户私信/悄悄话正文或内容摘要
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
│ 消息互动：统计卡                          │
├────────────────────────────────────────────┤
│ 记录区：私信 | 悄悄话 | 系统消息 | 举报关联    │
├────────────────────────────────────────────┤
│ 私信/悄悄话始终只显示业务元数据              │
└────────────────────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 消息互动统计 | 模块补充弹窗-消息互动 Tab 顶部 | 聊天资格、会话数、悄悄话待回复、未读系统消息、保护命中 | 否 | 否 |
| 私信会话 Tab | Tab 1 | 会话编号、参与方、状态、消息数量、最后活动时间、失效原因 | 否 | 是 |
| 悄悄话记录 Tab | Tab 2 | 悄悄话状态、消耗方式、冷却期 | 否 | 是 |
| 系统消息 Tab | Tab 3 | 消息编号、消息类型、业务类型、发送/已读状态、跳转目标；不展示标题或正文 | 否 | 是 |
| 举报关联 Tab | Tab 4 | PRD-05 聊天/悄悄话举报编号、处理状态、处罚结果 | 否 | 是 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 会话详情抽屉 | 点击会话查看 | 右侧 720px | 会话双方脱敏信息、状态、消息数量和失效原因，不提供正文入口 | 关闭按钮/ESC |
| 系统消息详情抽屉 | 点击系统消息查看 | 右侧 640px | 系统消息编号、业务编号、跳转参数、发送/已读状态；不展示标题或正文 | 关闭按钮/ESC |

> 模块补充弹窗承接的是 01 App 用户管理卡片入口；不把消息互动区块放回 01 画像详情抽屉。

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `ADM-03-user-detail-msg-01` | 模块补充弹窗-消息互动统计 | 统计卡和记录区 | P0 |
| `ADM-03-user-detail-msg-02` | 模块补充弹窗-私信记录 | 会话列表和状态 | P0 |
| `ADM-03-user-detail-msg-03` | 模块补充弹窗-悄悄话记录 | 悄悄话记录 | P0 |
| `ADM-03-user-detail-msg-04` | 模块补充弹窗-系统消息 | 系统消息记录 | P0 |
| `ADM-03-user-detail-msg-05` | 模块补充弹窗-举报关联 | PRD-05 举报关联记录 | P0 |

### 2.5 编辑控件口径

本区块只读，不允许后台手工修改会话、悄悄话或系统消息状态，也不提供用户消息正文查看能力。

---

## 3. 筛选与搜索

### 3.1 搜索

Tab 内不提供关键词搜索；按 Tab 筛选和分页。

### 3.2 筛选条件

| 筛选 ID | 筛选名 | 类型 | 选项来源 | 是否多选 | 默认值 | 是否可清除 |
|---------|--------|------|----------|----------|--------|------------|
| `ADM-03-PAGE-user-message-section-FILTER-conversation-status` | 会话状态 | 下拉 | `M03-ENUM-conversation-status` | 否 | 全部 | 是 |
| `ADM-03-PAGE-user-message-section-FILTER-whisper-status` | 悄悄话状态 | 下拉 | `M03-ENUM-whisper-status` | 否 | 全部 | 是 |
| `ADM-03-PAGE-user-message-section-FILTER-notice-type` | 系统消息类型 | 下拉 | `M03-ENUM-notification-type` | 否 | 全部 | 是 |
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
| `ADM-03-PAGE-user-message-section-FIELD-whisper-no` | 悄悄话编号 | string | 条件必填 | 业务编号 | Tab 为悄悄话记录时必填 | 无 | 不可编辑 | 普通 | 悄悄话记录 |
| `ADM-03-PAGE-user-message-section-FIELD-whisper-status` | 悄悄话状态 | enum | 条件必填 | `M03-ENUM-whisper-status` | 展示中文 | 无 | 系统流转 | 普通 | 悄悄话记录 |
| `ADM-03-PAGE-user-message-section-FIELD-whisper-match-no` | 关联匹配编号 | string | 否 | 业务编号 | `whisperStatus=replied` 时必填 | 无 | 不可编辑 | 普通 | PRD-02 匹配记录 |
| `ADM-03-PAGE-user-message-section-FIELD-whisper-conversation-no` | 关联会话编号 | string | 否 | 业务编号 | `whisperStatus=replied` 时必填，且双方指向同一会话 | 无 | 不可编辑 | 普通 | 私信会话 |
| `ADM-03-PAGE-user-message-section-FIELD-request-message-no` | 原申请消息编号 | string | 否 | 业务编号 | `whisperStatus=replied` 时必填 | 无 | 不可编辑 | 普通 | 私信开场消息 |
| `ADM-03-PAGE-user-message-section-FIELD-reply-message-no` | 回复消息编号 | string | 否 | 业务编号 | `whisperStatus=replied` 时必填 | 无 | 不可编辑 | 普通 | 私信开场消息 |
| `ADM-03-PAGE-user-message-section-FIELD-request-tim-message-id` | 原申请 TIM 消息编号 | string | 否 | 腾讯云 TIM messageId/MsgKey | TIM 投递成功时必填 | 无 | 不可编辑 | 普通 | TIM 消息映射 |
| `ADM-03-PAGE-user-message-section-FIELD-reply-tim-message-id` | 回复 TIM 消息编号 | string | 否 | 腾讯云 TIM messageId/MsgKey | `whisperStatus=replied` 且 TIM 投递成功时必填 | 无 | 不可编辑 | 普通 | TIM 消息映射 |
| `ADM-03-PAGE-user-message-section-FIELD-pay-type` | 消耗方式 | enum | 否 | 免费次数/千寻币 | 引用 PRD-04 | 无 | 不可编辑 | 普通 | PRD-04 |
| `ADM-03-PAGE-user-message-section-FIELD-notice-type` | 系统消息类型 | enum | 条件必填 | `M03-ENUM-notification-type` | 展示中文 | 无 | 系统生成 | 普通 | 系统消息记录 |
| `ADM-03-PAGE-user-message-section-FIELD-read-status` | 已读状态 | enum | 否 | `M03-ENUM-read-status` | 展示中文 | `unread` | 系统流转 | 普通 | 系统消息记录 |
| `ADM-03-PAGE-user-message-section-FIELD-report-status` | 举报处理状态 | enum | 否 | 引用 PRD-05 举报状态 | 展示中文 | 无 | PRD-05 流转 | 普通 | PRD-05 举报记录 |
| `ADM-03-PAGE-user-message-section-FIELD-created-time` | 创建时间 | datetime | 是 | datetime | `yyyy-MM-dd HH:mm:ss` | 无 | 不可编辑 | 普通 | 各 Tab 记录 |

#### 列表字段附加属性

| 字段 ID | 默认排序 | 是否可排序 | 列宽 | 是否固定 | 是否可拖拽调整列宽 | 溢出处理 |
|---------|----------|------------|------|----------|--------------------|----------|
| `ADM-03-PAGE-user-message-section-FIELD-created-time` | 倒序 | 是 | 160px | 否 | 否 | 空值 `-` |
| `ADM-03-PAGE-user-message-section-FIELD-conversation-status` | 无 | 否 | 120px | 否 | 否 | 状态胶囊 |

### 4.2 详情/表单字段

本区块无编辑表单。举报关联只展示 `caseNo` 并按权限跳转 PRD-05；不得在本弹窗透传案件正文。

---

## 5. 操作表

### 5.1 行级操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响（副作用） |
|---------|--------|----------|----------|----------|--------|--------|----------------|
| `ADM-03-PAGE-user-message-section-ACT-view-conversation` | 查看会话详情 | 私信会话 Tab | `ADM-03-PERM-conversation-list-view` | 否 | 打开会话详情抽屉 | 无权限时隐藏 | 记录访问日志 |
| `ADM-03-PAGE-user-message-section-ACT-view-notice` | 查看系统消息详情 | 系统消息 Tab | `ADM-03-PERM-system-message-view` | 否 | 打开系统消息详情抽屉 | 记录不存在提示 | 无 |
| `ADM-03-PAGE-user-message-section-ACT-open-report-case` | 打开举报案件 | 举报关联 Tab 且 caseNo 存在 | `community:report:list` | 否 | 跳转 PRD-05 案件详情；正文权限由案件页重新校验 | 无权限时只展示脱敏状态 | 不在本页返回正文 |

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
| 角色权限 | 任意角色进入本弹窗 | 私信/悄悄话正文 | 始终不返回正文，不渲染查看按钮；客服/运营仅见脱敏元数据 | `M03-RULE-sensitive-content-access` |
| 会话状态 | `invalid` | 详情抽屉 | 展示失效原因 | `M03-SM-conversation` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 打开模块补充弹窗或记录区查询 | 表格 loading | 等待 | 后台通用态 |
| 空态 | 当前 Tab 无记录 | 暂无记录 | 切换 Tab | 后台通用态 |
| 错误态 | 查询失败 | toast + 重试 | 重试 | 后台通用态 |
| 无权限态 | 无 Tab 权限 | Tab 隐藏或无权限提示 | 无 | `ADM-03_端内定义.md` |
| 业务态-可查看元数据 | 有列表权限 | 展示业务编号、类型、状态和时间等元数据 | 查看详情 | `ADM-03-PERM-conversation-list-view` |
| 业务态-案件关联 | 存在 PRD-05 案件且有查看权限 | 展示案件编号与跳转，不展示正文 | 打开案件 | `community:report:list` |
| 降级态 | 消息服务不可用 | 区块显示服务不可用 | 重试 | `ADM-03-STATE-message-service-down` |

---

## 8. 查询与列表

- **默认排序**：各 Tab 创建时间倒序
- **分页**：私信、悄悄话、系统消息、举报关联列表均展示分页组件，默认每页 5 条。
- **分页方式**：传统分页
- **列表轮询/实时刷新**：不需要
- **批量选择**：不支持
- **列表为空时引导**：展示暂无记录

---

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `ADM-03-AC-user-message-section-summary` | 模块补充弹窗展示消息互动统计 | 正常 | P0 |
| `ADM-03-AC-user-message-section-no-content` | 任意角色在通用弹窗不得查看正文 | 权限 | P0 |
| `ADM-03-AC-user-message-section-no-manual-edit` | 不允许手工改会话状态 | 正常 | P0 |
| `ADM-03-AC-user-message-section-whisper-link` | 已回复悄悄话可追溯匹配、会话和开场消息 | 正常 | P0 |

```text
AC-ID: ADM-03-AC-user-message-section-no-content
Given 客服、运营、审核员、风控或超级管理员打开消息互动 Tab
When  查看私信会话或悄悄话详情
Then  接口与页面只返回统计和业务元数据，不返回正文、正文片段或内容摘要，不展示正文按钮；需处理举报时只能跳转有效 PRD-05 案件并重新校验案件权限

AC-ID: ADM-03-AC-user-message-section-whisper-link
Given 一条悄悄话已通过回复完成匹配并退出双方前台申请列表
When  有权限的管理员在悄悄话记录 Tab 查询该记录
Then 仍可按 whisperNo 查询 `replied` 状态，并查看关联 matchNo、conversationNo、requestMessageNo、replyMessageNo 及对应 TIM 消息编号；不得提供删除、手工改状态或平台内容审核结果操作
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 权限矩阵 | `ADM-03_端内定义.md` | 查看权限 |
| 状态机 | `M03-SM-conversation` | 会话状态 |
| 状态机 | `M03-SM-whisper` | 悄悄话状态 |
| 规则 | `M03-RULE-whisper-to-conversation` | 回复后的前台迁移与后台关联保留 |
| 页面 | `ADM-03-PAGE-message-record-query` | 跨用户查询 |
