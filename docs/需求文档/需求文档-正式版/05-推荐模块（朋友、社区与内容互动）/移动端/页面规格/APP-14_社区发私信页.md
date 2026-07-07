# 页面规格 - APP-05-PAGE-community-private-entry 社区发私信页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-06 | Codex | 按一期上线目标补充社区发私信页 |
| 版本02 | 2026-07-07 | Codex | 按移动端 Demo 审查明确可聊天、未匹配、保护期和会话失效多状态 |

- **页面 ID**：`APP-05-PAGE-community-private-entry`
- **所属模块 PRD**：`模块PRD_APP-05_推荐模块（朋友、社区与内容互动）`
- **页面路由**：`/pages/community/private-entry`
- **入口来源**：信息流作者区、动态详情作者区、个人动态区、社区更多操作、社区打招呼成功反馈
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端 / 技术方案**：`MVP-PAGE-011`、`APP-03-PAGE-private-chat`

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：判断是否可从社区场景进入普通私信，并给出下一步动作
- **页面类型**：状态判断页/中转页

## 2. 布局（给 UI）

### 2.1 整体布局

```
┌────────────────────────┐
│ 返回  发私信            │
├────────────────────────┤
│ 目标用户卡片            │
│ 当前关系与聊天状态       │
│ 状态说明                │
│   去聊天 / 打招呼 / 返回 │
└────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 目标用户卡片 | 顶部 | 头像、昵称、认证摘要、关系状态 | 否 | 否 |
| 聊天状态 | 中部 | 是否匹配成功、会话状态、女性保护提示 | 否 | 否 |
| 状态说明 | 中部 | 可聊天/未匹配/保护期/会话失效说明 | 否 | 否 |
| 操作区 | 底部 | 去聊天、打招呼、查看主页、返回 | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 会话失效说明 | 点击失效原因 | 底部弹窗 | 失效原因、可做操作 | 知道了 |
| 更多操作 | 点击更多 | 底部动作面板 | 查看主页、举报 | 取消/遮罩 |

### 2.4 UI 画板拆分（必填）

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-05-private-entry-01` | 社区发私信页-可聊天态 | 目标用户、去聊天按钮 | P0 |
| `APP-05-private-entry-02` | 社区发私信页-未匹配态 | 规则说明、打招呼入口 | P0 |
| `APP-05-private-entry-03` | 社区发私信页-女性保护态 | 保护期说明、去聊天查看 | P0 |
| `APP-05-private-entry-04` | 社区发私信页-会话失效态 | 失效原因、返回 | P0 |
| `APP-05-private-entry-05` | 社区发私信页-目标不可用 | 目标用户异常 | P1 |

### 2.5 编辑控件口径

本页为状态判断页，不提供文本编辑控件。

## 3. 筛选与搜索

### 3.1 搜索

本页无搜索。

### 3.2 筛选条件

本页无筛选条件。

### 3.3 筛选交互

本页不涉及筛选交互。

## 4. 字段表

### 4.1 列表字段

本页无列表字段。

#### 列表字段附加属性

本页无列表字段附加属性。

### 4.2 详情/表单字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-05-PAGE-community-private-entry-FIELD-target-user-id` | 目标用户 | string | 是 | 业务编号 | 目标用户正常且可见 | 无 | 否 | 普通 | 来源页面 |
| `APP-05-PAGE-community-private-entry-FIELD-target-profile` | 目标用户摘要 | object | 是 | 头像/昵称/认证摘要 | 昵称头像取已审核版本 | 无 | 否 | 普通 | PRD-01 |
| `APP-05-PAGE-community-private-entry-FIELD-source-type` | 来源类型 | enum | 是 | post/comment/profile/yuemu/sincere | 由入口传入 | post | 否 | 普通 | 来源页面 |
| `APP-05-PAGE-community-private-entry-FIELD-source-id` | 来源对象 | string | 否 | 业务编号 | 来源存在时必填 | 无 | 否 | 普通 | 来源页面 |
| `APP-05-PAGE-community-private-entry-FIELD-match-status` | 匹配状态 | enum | 是 | `M02-SM-mutual-match` | 服务端返回为准 | 未匹配 | 否 | 普通 | PRD-02 |
| `APP-05-PAGE-community-private-entry-FIELD-can-chat` | 是否可普通私信 | bool | 是 | true/false | 引用 `M03-RULE-private-chat-open` | false | 否 | 普通 | PRD-03 |
| `APP-05-PAGE-community-private-entry-FIELD-conversation-id` | 会话编号 | string | 条件必填 | 业务编号 | canChat=true 时必填 | 无 | 否 | 普通 | PRD-03 |
| `APP-05-PAGE-community-private-entry-FIELD-block-reason` | 不可聊天原因 | enum | 否 | 未匹配/保护期/拉黑/账号异常/核心准入不足 | canChat=false 时展示 | 未匹配 | 否 | 普通 | PRD-03 |
| `APP-05-PAGE-community-private-entry-FIELD-protect-status` | 保护状态 | json | 否 | `M03-RULE-female-protection` | 命中保护时展示 | 无 | 否 | 普通 | PRD-03 |

## 5. 操作表

### 5.1 行级操作

本页无行级列表操作。

### 5.2 批量操作

本页不支持批量操作。

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-05-PAGE-community-private-entry-ACT-open-chat` | 去聊天 | 主按钮 | `canChat=true` | `M05-RULE-community-private-entry`、`M03-RULE-private-chat-open` | 否 | 跳转 `APP-03-PAGE-private-chat` | `M03-ERR-private-chat-not-matched`、`M03-ERR-conversation-invalid` |
| `APP-05-PAGE-community-private-entry-ACT-greeting` | 打招呼 | 次按钮 | `canChat=false` 且目标用户可见 | `M05-RULE-community-greeting-entry` | 否 | 跳转社区打招呼页 | `M05-ERR-community-target-unavailable` |
| `APP-05-PAGE-community-private-entry-ACT-view-profile` | 查看主页 | 用户卡片/更多 | 目标用户正常 | `GLB-ROLE-app-user` | 否 | 跳转用户主页 | 目标不可用提示 |
| `APP-05-PAGE-community-private-entry-ACT-report` | 举报 | 更多 | 目标用户存在 | `M05-RULE-report-gate` | 否 | 打开举报弹窗 | `M05-ERR-login-required` |
| `APP-05-PAGE-community-private-entry-ACT-back` | 返回 | 顶部 | 页面打开 | `GLB-ROLE-app-user` | 否 | 返回来源页 | 无 |

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| canChat | true | 主按钮 | 展示去聊天，点击进入私信对话页 | `M03-RULE-private-chat-open` |
| canChat | false | 主按钮/说明 | 展示不可聊天原因和打招呼入口 | 具体原因由 PRD-03 返回 |
| matchStatus | matched | canChat | 继续判断核心准入、拉黑、女性保护 | PRD-02/PRD-03 |
| protectStatus | 命中保护 | 状态说明 | 展示保护提示；仍允许进入聊天页查看状态 | `M03-RULE-female-protection` |
| 目标用户状态 | 异常 | 操作区 | 禁用去聊天和打招呼，仅可返回 | `M05-ERR-community-target-unavailable` |

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入 | 骨架屏 | 等待 | 通用态 |
| 空态（无数据） | 目标用户不存在 | 目标不可用提示 | 返回 | `M05-ERR-community-target-unavailable` |
| 空态（搜索无结果） | 本页无搜索 | 本节不适用 | — | — |
| 错误态（网络） | 状态查询失败 | toast + 重试 | 重试/返回 | 通用态 |
| 无权限态 | 未登录 | 登录引导 | 去登录 | `M05-RULE-browse-gate` |
| 业务态-can-chat | 可普通私信 | 展示去聊天 | 去聊天/查看主页/举报 | `M03-RULE-private-chat-open` |
| 业务态-not-matched | 未匹配成功 | 展示规则说明和打招呼入口 | 打招呼/返回 | `M03-ERR-private-chat-not-matched` |
| 业务态-protected | 女性保护命中 | 展示保护提示 | 去聊天查看/返回 | `M03-RULE-female-protection` |
| 业务态-invalid | 会话失效 | 展示失效原因 | 查看主页/举报/返回 | `M03-RULE-conversation-invalid` |
| 降级态 | PRD-03 会话服务不可用 | 提示稍后再试 | 重试/返回 | PRD-03 |

## 8. 查询与列表

本页为单目标状态页，不提供分页、排序、批量选择或导出。

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-05-AC-community-private-open` | 匹配成功且可聊天时跳转私信 | 正常 | P0 |
| `APP-05-AC-community-private-not-matched` | 未匹配成功时展示打招呼入口 | 正常 | P0 |
| `APP-05-AC-community-private-protected` | 命中保护期时展示保护说明 | 正常 | P0 |
| `APP-05-AC-community-private-invalid` | 会话失效时不可进入发送态 | 异常 | P0 |

```
AC-ID: APP-05-AC-community-private-open
Given 用户和目标用户满足 `M03-RULE-private-chat-open`
When  用户从社区入口进入发私信页并点击去聊天
Then  页面跳转 `APP-03-PAGE-private-chat`，会话发送态由 PRD-03 私信对话页判断
```

```
AC-ID: APP-05-AC-community-private-not-matched
Given 用户和目标用户未形成 `M02-SM-mutual-match=matched`
When  用户从社区入口进入发私信页
Then  页面展示相互喜欢后才能聊天，并提供社区打招呼入口
```

```
AC-ID: APP-05-AC-community-private-protected
Given PRD-03 返回 `protectStatus` 命中保护期
When  用户从社区入口进入发私信页
Then  页面展示保护期说明和可做操作，不绕过 PRD-03 私信发送规则
```

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块规则 | `M05-RULE-community-private-entry` | 社区私信入口规则 |
| 依赖的模块规则 | `M03-RULE-private-chat-open` | 普通私信开放 |
| 依赖的模块状态机 | `M02-SM-mutual-match` | 匹配成功状态 |
| 依赖的模块规则 | `M03-RULE-female-protection` | 女性保护 |
| 依赖的其他页面 | `APP-03-PAGE-private-chat` | 普通私信对话页 |
| 依赖的其他页面 | `APP-05-PAGE-community-greeting` | 未匹配时打招呼入口 |
| 依赖的其他页面 | `APP-05-PAGE-report-modal` | 用户举报 |
