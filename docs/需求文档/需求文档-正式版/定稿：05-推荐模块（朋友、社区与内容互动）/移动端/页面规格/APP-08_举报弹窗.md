# 页面规格 - APP-05-PAGE-report-modal 举报弹窗

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本05 | 2026-08-07 | Codex | 对齐 PRD-03 TIM 举报定位编号白名单，明确客户端不提交正文或被举报用户 ID |
| 版本04 | 2026-07-31 | Codex | 扩展为社区、用户、私信和悄悄话统一举报组件，补齐聊天上下文、参与方校验和不可举报状态 |
| 版本01 | 2026-07-06 | Codex | 创建页面规格 |
| 版本02 | 2026-07-07 | Codex | 按移动端 Demo 审查明确举报原因多选和重复举报提示 |
| 版本03 | 2026-07-20 | Codex | 按蓝湖最终稿收敛为“选择举报原因”弹窗，明确重复举报幂等并取消独立重复提示画板 |

- **页面 ID**：`APP-05-PAGE-report-modal`
- **所属模块 PRD**：`模块PRD_APP-05_推荐模块（朋友、社区与内容互动）`
- **页面路由**：业务页内弹窗 `/components/report-modal`
- **入口来源**：动态详情（含诚意贴视图）、评论操作、用户主页更多操作、PRD-03 私信对话页、PRD-03 悄悄话详情页
- **对应设计稿**：[蓝湖举报原因与成功反馈画板](https://lanhuapp.com/web/#/item/project/stage?tid=428e8368-c279-4369-947b-a5828487924d&pid=d9c9e50f-fee5-47ca-bd6b-ae05c0d5332b)
- **对应移动端 / 技术方案**：`MVP-PAGE-012`、`MVP-POP-003`

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：选择举报原因并提交内容、评论、用户资料/账号或聊天内容举报
- **页面类型**：底部弹窗

## 2. 布局（给 UI）

### 2.1 整体布局

```
┌────────────────────┐
│ 选择举报原因          │
│ 原因一                │
│ 原因二                │
│ 原因三                │
│       取消            │
└────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 原因区 | 主体 | 举报原因单选列表 | 否 | 否 |
| 操作区 | 底部 | 取消 | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

本页面即弹窗；点击任一原因后直接提交，成功后关闭并复用通用成功反馈。

### 2.4 UI 画板拆分（必填）

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-05-report-01` | 举报弹窗-选择原因 | 举报原因列表、取消操作 | 点击原因直接提交，不含补充说明输入和独立提交按钮 |
| `APP-05-report-02` | 举报弹窗-提交成功 | 成功反馈 | |

重复举报复用通用 toast，不单独要求 UI 画板。

### 2.5 编辑控件口径

| 区域 | 展现形式 | 编辑控件 | 新增/删除方式 | 保存方式 |
|------|----------|----------|----------------|----------|
| 举报原因 | 单选列表 | 原因项 | 点击任一原因 | 点击后直接提交 |

## 3. 筛选与搜索

### 3.1 搜索

本弹窗无搜索。

### 3.2 筛选条件

| 筛选 ID | 筛选名 | 类型 | 选项来源 | 是否多选 | 默认值 | 是否可清除 |
|---------|--------|------|----------|----------|--------|------------|
| `APP-05-PAGE-report-modal-FILTER-reason` | 举报原因 | 单选 | `M05-CFG-report-reason-dict` | 否 | 无 | 是 |

### 3.3 筛选交互

- 点击任一举报原因即发起提交，不设置独立提交按钮。

## 4. 字段表

### 4.1 列表字段

本页无列表字段。

#### 列表字段附加属性

本页无列表字段附加属性。

### 4.2 详情/表单字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-05-PAGE-report-modal-FIELD-target-type` | 举报对象类型 | enum | 是 | `M05-ENUM-report-target-type` | 由入口传入 | 无 | 否 | 普通 | 来源页面 |
| `APP-05-PAGE-report-modal-FIELD-target-id` | 举报对象 | string | 是 | 业务编号 | 记录必须存在且当前用户有查看权；已失效/过期聊天历史仍对参与方可见时视为有查看权 | 无 | 否 | 普通 | 来源页面 |
| `APP-05-PAGE-report-modal-FIELD-context` | 来源上下文 | json | `targetType=chat` 时必填 | `M05-RULE-report-target-context` | 仅允许 `sourceType/conversationNo/whisperNo/messageNo/timConversationId/timMessageId/timMsgKey`；不得提交用户 ID 或正文；用户/帖子/评论举报不传该字段 | 无 | 否 | 敏感 | 来源页面 |
| `APP-05-PAGE-report-modal-FIELD-reason` | 举报原因 | enum | 是 | `M05-CFG-report-reason-dict` | 必须为当前 targetType 启用原因；chat 再按 sourceType 过滤 | 无 | 点击前可选择 | 普通 | 后台配置 |

## 5. 操作表

### 5.1 行级操作

本页无行级操作。

### 5.2 批量操作

本页不支持批量操作。

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-05-PAGE-report-modal-ACT-submit` | 选择原因并提交举报 | 原因列表 | 点击启用原因；聊天来源已携带合法白名单上下文 | `M05-RULE-report-gate`、`M05-RULE-report-idempotency`、`M05-RULE-report-target-context` | 否 | 关闭弹窗并提示已提交 | `M05-ERR-report-duplicate`、`M05-ERR-report-target-unavailable`、`M05-ERR-report-no-permission`、`M05-ERR-report-self-target` |
| `APP-05-PAGE-report-modal-ACT-cancel` | 取消 | 底部 | 弹窗打开 | `GLB-ROLE-app-user` | 否 | 关闭弹窗 | 无 |

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 举报原因 | 点击 | 举报请求 | 携带当前原因直接提交 | `M05-CFG-report-reason-dict` |
| 举报对象 | 来源变化 | 原因选项 | 按 targetType 加载原因 | 后台配置 |
| `targetType=chat` | 弹窗打开/提交 | 举报请求 | 按 `sourceType` 校验对应主业务编号；服务端反查参与关系、被举报用户和必要正文 | `M03-RULE-report-handoff`、`M05-RULE-report-target-context` |

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 原因加载 | loading | 无 | — |
| 空态（无数据） | 无举报原因 | 提示稍后重试 | 关闭 | `M05-CFG-report-reason-dict` |
| 空态（搜索无结果） | 本页无搜索 | 本节不适用 | — | — |
| 错误态（网络） | 提交失败 | toast + 保留表单 | 重试 | `M05-ERR-*` |
| 无权限态 | 未登录 | 登录引导 | 去登录 | `M05-RULE-report-gate` |
| 无权限态-chat | 当前用户非私信/悄悄话参与方 | 关闭弹窗并提示无权限，不展示上下文 | 返回 | `M05-ERR-report-no-permission` |
| 不可举报态-chat | 本人发送内容、官方助手/系统消息或目标记录不存在 | 关闭弹窗并提示该内容无法举报 | 返回 | `M05-ERR-report-self-target`、`M05-ERR-report-target-unavailable` |
| 业务态-pending | 举报提交成功 | 成功反馈 | 关闭 | `M05-SM-report` |
| 业务态-duplicate | 同一举报人对同类型同对象已有待处理/处理中举报 | 通用 toast“你的举报已提交，请等待处理” | 关闭 | `M05-RULE-report-idempotency`、`M05-ERR-report-duplicate` |
| 降级态 | 字典加载失败 | 默认原因不可用提示 | 重试 | `M05-CFG-report-reason-dict` |

## 8. 查询与列表

本页无列表查询。

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-05-AC-report-submit` | 已登录用户提交举报 | 正常 | P0 |
| `APP-05-AC-report-reason-submit` | 点击启用原因直接提交 | 正常 | P0 |
| `APP-05-AC-report-duplicate` | 重复举报提示已提交 | 异常 | P0 |
| `APP-05-AC-report-chat-context` | 聊天来源按白名单上下文提交 | 正常 | P0 |
| `APP-05-AC-report-chat-deny` | 非参与方、本人或官方内容不可举报 | 异常 | P0 |

```
AC-ID: APP-05-AC-report-submit
Given 用户已登录且举报对象可见
When  选择举报原因并提交
Then  系统生成 `M05-SM-report=pending` 举报记录并提示已提交
```

```
AC-ID: APP-05-AC-report-duplicate
Given 同一 `reporterId + targetType + targetId` 已存在 `pending` 或 `processing` 举报
When  用户再次点击任一举报原因
Then  不新增举报记录，关闭弹窗并复用通用 toast 提示已提交；不同对象、对象类型或举报人不命中此规则
```

```
AC-ID: APP-05-AC-report-chat-context
Given PRD-03 私信或悄悄话详情已按参与关系和内容归属展示举报入口
When  用户选择举报原因
Then  私信以 `targetType=chat`、`targetId=conversationNo` 并携带 `sourceType=private_chat/conversationNo` 提交；悄悄话以 `targetType=chat`、`targetId=whisperNo` 并携带 `sourceType=whisper/whisperNo` 提交；明确指定对方消息时可附带平台 `messageNo` 和/或 TIM `timConversationId/timMessageId/timMsgKey` 定位编号，服务端校验映射后反查正文和被举报用户；客户端不得提交用户 ID 或正文
```

```
AC-ID: APP-05-AC-report-chat-deny
Given 当前用户非目标参与方，或目标为本人发送内容、官方助手/系统消息、已不存在记录
When  用户绕过来源页面调用统一举报组件或接口
Then  不生成举报记录，返回对应无权限/本人内容/对象不可举报错误，且不回传聊天上下文
```

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块规则 | `M05-RULE-report-gate` | 举报准入 |
| 依赖的模块规则 | `M05-RULE-report-idempotency` | 同一举报人的同类型同对象在处理中去重 |
| 依赖的模块规则 | `M05-RULE-report-target-context` | 对象编号与聊天上下文白名单 |
| 依赖的跨模块规则 | `M03-RULE-report-handoff` / `M03-RULE-report-context` | 私信/悄悄话参与关系、内容归属和历史态 |
| 依赖的模块状态机 | `M05-SM-report` | 举报状态 |
| 依赖的模块配置项 | `M05-CFG-report-reason-dict` | 举报原因 |
