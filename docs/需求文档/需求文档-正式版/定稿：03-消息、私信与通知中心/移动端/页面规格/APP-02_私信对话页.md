# 页面规格 - APP-03-PAGE-private-chat 私信对话页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本06 | 2026-07-31 | Codex | 增加私信内容直达举报，区分个人主页用户举报/拉黑，并补齐历史失效态与权限校验 |
| 版本05 | 2026-07-16 | Codex | 明确女性保护只限制发送：会话入口由 PRD-02 canEnterConversation 判断，页面使用 canSend/protectStatus |
| 版本04 | 2026-07-13 | Codex | 对齐蓝湖匹配横幅与安全卡；头像跳主页承接举报拉黑；悄悄话回复匹配豁免女性保护 |
| 版本03 | 2026-07-13 | Codex | 收口消息中心主入口，明确社区仅在已匹配态直达私信 |
| 版本02 | 2026-07-02 | Codex | 按评审意见整改移动端消息流展示附加属性 |
| 版本01 | 2026-07-02 | Codex | 初稿 |

- **页面 ID**：`APP-03-PAGE-private-chat`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-03_消息、私信与通知中心.md`
- **页面路由**：`/pages/message/chat`
- **入口来源**：消息中心会话列表（主入口）、悄悄话回复后的匹配成功回流、相互喜欢列表、社区动态/评论/用户主页已匹配态“发私信”（辅助入口）
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端页面**：MVP-PAGE-034 / APP-PAGE-050

---

## 1. 页面定位

- **目标用户**：三重认证通过且已匹配成功的用户
- **核心任务**：查看历史消息、发送普通文本私信，并对当前会话中的对方内容发起举报
- **页面类型**：详情页/聊天页

---

## 2. 布局（给 UI）

### 2.1 整体布局

```text
┌────────────────────────────┐
│ 返回  对方昵称        更多 │
├────────────────────────────┤
│       消息流区域           │
│  系统提示 / 文本气泡 / 时间 │
├────────────────────────────┤
│ 输入框              发送   │
└────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 顶部导航 | 顶部 | 返回、对方昵称、更多菜单 | 否 | 否 |
| 消息流 | 主体 | 时间、系统提示、左右气泡、失败状态 | 否 | 否 |
| 输入区 | 底部 | 文本输入框、发送按钮、禁发提示 | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 聊天更多操作 | 点击顶部“更多” | 底部操作弹层 | 当 `canReportChat=true` 时展示“举报聊天内容”；底部固定“取消” | 点击取消、蒙层或选择操作 |
| 统一举报弹窗 | 点击“举报聊天内容” | 复用 `APP-05-PAGE-report-modal` | 按 `targetType=chat` 展示启用的举报原因；点击原因直接提交 | 取消、提交成功或重复举报后关闭 |

点击头像或昵称进入个人主页后，可举报用户资料/账号或拉黑；本页更多菜单只承接聊天内容举报，不重复提供用户举报和拉黑。

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-03-chat-01` | 私信对话页-可发送态 | 正常聊天、输入框 | P0 |
| `APP-03-chat-02` | 私信对话页-女性保护禁发态 | 输入框置灰、保护提示 | P0 |
| `APP-03-chat-03` | 私信对话页-会话失效态 | 历史可看、输入区失效 | P0 |
| `APP-03-chat-04` | 私信对话页-头像跳主页 | 个人主页承接用户资料/账号举报与拉黑 | P0 |
| `APP-03-chat-05` | 私信对话页-发送失败 | 消息失败态和重试 | P1 |
| `APP-03-chat-06` | 私信对话页-举报聊天内容 | 更多操作、统一举报原因、提交成功/重复提示 | P0 |

### 2.5 编辑控件口径

| 区域 | 展现形式 | 编辑控件 | 新增/删除方式 | 保存方式 |
|------|----------|----------|----------------|----------|
| 输入区 | 固定底部输入 | 文本输入框、发送按钮 | 不支持删除 | 点击发送即保存 |

---

## 3. 筛选与搜索

本页为聊天详情页，不提供搜索筛选；历史消息通过上滑加载更早记录。

---

## 4. 字段表

### 4.1 列表字段

聊天消息流字段如下。

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-03-PAGE-private-chat-FIELD-conversation-no` | 会话编号 | string | 是 | 业务编号 | 当前用户必须参与该会话 | 无 | 不可编辑 | 普通 | 会话 |
| `APP-03-PAGE-private-chat-FIELD-target-nickname` | 对方昵称 | string | 是 | 1-20 字 | 已审核昵称 | 无 | 用户资料编辑触发 | 普通 | PRD-01 用户资料 |
| `APP-03-PAGE-private-chat-FIELD-message-no` | 消息编号 | string | 是 | 业务编号 | 当前会话内唯一 | 无 | 不可编辑 | 普通 | 消息记录 |
| `APP-03-PAGE-private-chat-FIELD-message-type` | 消息类型 | enum | 是 | `M03-ENUM-message-type` | 首版仅文本/系统提示 | `text` | 不可编辑 | 普通 | 消息记录 |
| `APP-03-PAGE-private-chat-FIELD-content` | 消息内容 | string | 是 | 1-500 字 | 发送前内容安全检测；超长禁止发送 | 无 | 发送前可编辑 | 敏感，加密存储，注销后匿名化 | 用户输入 |
| `APP-03-PAGE-private-chat-FIELD-send-status` | 发送状态 | enum | 是 | `M03-ENUM-send-status` | 失败可重试 | `sending` | 系统流转 | 普通 | 消息记录 |
| `APP-03-PAGE-private-chat-FIELD-created-time` | 发送时间 | datetime | 是 | datetime | 按本地展示相对或完整时间 | 无 | 不可编辑 | 普通 | 消息记录 |
| `APP-03-PAGE-private-chat-FIELD-can-send` | 是否可发送 | bool | 是 | true/false | 服务端返回为准 | false | 系统计算 | 普通 | `M03-RULE-private-chat-open` |
| `APP-03-PAGE-private-chat-FIELD-protect-status` | 保护状态 | json | 否 | `M03-RULE-female-protection` | 男性侧禁发需返回过期时间 | 无 | 系统计算 | 普通 | 会话规则 |
| `APP-03-PAGE-private-chat-FIELD-can-enter-conversation` | 可进入会话 | bool | 是 | true/false | 由 PRD-02 关系/账号有效性返回；页面已打开时应为 true | true | 系统计算 | 普通 | PRD-02 |
| `APP-03-PAGE-private-chat-FIELD-can-report-chat` | 可举报聊天内容 | bool | 是 | true/false | 当前用户已登录、账号未冻结、是会话参与方、会话存在且至少有一条对方发送的可举报文本；会话失效但历史可见时仍可为 true | false | 系统计算 | 普通 | `M03-RULE-report-handoff` |
| `APP-03-PAGE-private-chat-FIELD-report-context` | 举报上下文 | json | 条件必填 | `sourceType=private_chat`、conversationNo、可选 messageNo | 客户端只传当前页业务编号；不得上传被举报用户 ID 或消息正文 | 无 | 不可编辑 | 敏感 | `M03-RULE-report-context` |

#### 列表字段附加属性

| 字段 ID | 消息流位置 | 主次层级 | 点击行为 | 手势行为 | 溢出处理 |
|---------|------------|----------|----------|----------|----------|
| `APP-03-PAGE-private-chat-FIELD-created-time` | 时间分隔条 | 辅助信息 | 不单独响应 | 上滑加载更早消息 | 按时间分组展示 |
| `APP-03-PAGE-private-chat-FIELD-content` | 左右消息气泡 | 主要信息 | 发送失败气泡可触发重试 | 长按菜单首版不提供 | 气泡内换行 |

### 4.2 详情/表单字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-03-PAGE-private-chat-FIELD-input-content` | 输入内容 | string | 是 | 1-500 字 | 去首尾空格后非空；内容安全检测 | 无 | 当前用户在可发送态编辑 | 敏感，加密存储 | 用户填写 |

---

## 5. 操作表

### 5.1 行级操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响（副作用） |
|---------|--------|----------|----------|----------|--------|--------|----------------|
| `APP-03-PAGE-private-chat-ACT-retry` | 重试发送 | 消息状态 `failed` 且会话可发送 | `GLB-ROLE-app-user` | 否 | 消息变为 `sent` | `M03-ERR-message-send-failed` | 不重复生成消息编号 |

### 5.2 批量操作

本页不提供批量操作。

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-03-PAGE-private-chat-ACT-send` | 发送 | 底部 | `canSend=true` 且输入非空 | `GLB-ROLE-app-user` | 否 | 新消息入流，未读发送给对方 | `M03-ERR-private-chat-not-matched`、`M03-ERR-female-protection-blocked` |
| `APP-03-PAGE-private-chat-ACT-view-profile` | 查看主页 | 顶部头像/昵称 | 对方账号正常 | `GLB-ROLE-app-user` | 否 | 跳转用户主页；用户资料/账号举报与拉黑由主页承接 | 对方异常则提示不可查看 |
| `APP-03-PAGE-private-chat-ACT-report-chat` | 举报聊天内容 | 顶部更多菜单 | `canReportChat=true` | `GLB-ROLE-app-user`、`M05-RULE-report-gate` | 否 | 打开 `APP-05-PAGE-report-modal`；选择原因后生成 `targetType=chat` 工单 | `M05-ERR-report-duplicate`、`M05-ERR-report-no-permission`、`M05-ERR-report-target-unavailable` |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| `canSend` | false | 输入区 | 输入框置灰，展示原因 | `M03-SM-conversation` |
| 女性保护状态 | 等待女方 | 输入区 | 男性侧禁发，女方侧正常 | `M03-RULE-female-protection` |
| 匹配来源 | `whisper_reply` | 女性保护状态 | 视为接收方已发送真实回复，双方直接可聊 | `M03-EVT-whisper-replied` |
| 拉黑操作 | 成功 | 会话状态 | 转 `blocked`，刷新消息列表状态 | `M03-RULE-conversation-invalid` |
| 进入页面 | 成功加载 | 未读数 | 当前会话消息置已读 | `M03-RULE-unread` |
| `canReportChat` | true | 顶部更多菜单 | 展示“举报聊天内容”；会话是否可发送不影响该入口 | `M03-RULE-report-handoff` |
| 举报聊天内容 | 点击 | 统一举报弹窗 | 传 `targetType=chat`、`targetId=conversationNo` 和白名单 `reportContext` | `M03-RULE-report-context` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入/上滑加载 | 消息骨架或顶部 loading | 等待 | 通用态 |
| 空态 | 新会话无历史 | 系统提示“你们已成功匹配” | 发送消息 | `M03-NTF-match-success` |
| 错误态（网络） | 加载失败 | toast + 重试 | 重试 | 通用态 |
| 无权限态 | 当前用户非会话参与方 | 返回消息列表，不返回历史和举报上下文 | 返回 | `M05-ERR-report-no-permission` |
| 业务态-active | 可聊天 | 输入框可编辑 | 发送文本 | `M03-SM-conversation` |
| 业务态-protected | 女性保护 | 输入框置灰，保护提示 | 等待对方回复 | `M03-RULE-female-protection` |
| 业务态-invalid | 会话失效 | 历史可看，输入区不可用 | 查看历史/举报 | `M03-RULE-conversation-invalid` |
| 业务态-report-forbidden | 仅有本人内容、官方/系统消息或目标记录不存在 | 更多菜单不展示内容举报；绕过提交时拒绝 | 查看主页/返回 | `M03-RULE-report-handoff` |
| 降级态 | 内容安全服务超时 | 禁止发送，提示稍后重试 | 重试 | 内容安全依赖 |

---

## 8. 查询与列表

- **默认排序**：消息时间正序
- **分页**：每次加载 20 条
- **分页方式**：上滑加载更早历史
- **列表轮询/实时刷新**：技术方案确认实时通道；无实时通道时页面可见轮询
- **批量选择**：不支持
- **列表为空时引导**：展示匹配成功系统提示

---

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-03-AC-private-chat-open` | 匹配成功后进入可发送态 | 正常 | P0 |
| `APP-03-AC-female-protection` | 男性保护期内禁发 | 正常 | P0 |
| `APP-03-AC-conversation-invalid` | 拉黑后会话失效 | 异常 | P0 |
| `APP-03-AC-private-chat-report` | 从私信页举报聊天内容 | 正常 | P0 |
| `APP-03-AC-private-chat-report-history` | 会话失效但历史可见时仍可举报 | 边界 | P0 |
| `APP-03-AC-private-chat-report-deny` | 非参与方、本人/官方内容不可举报 | 异常 | P0 |

```text
AC-ID: APP-03-AC-female-protection
Given 男方和女方已匹配成功且处于保护期，女方未发送真实用户消息
When  男方进入私信对话页
Then  输入框置灰，展示 `M03-TXT-female-protection-block`，点击发送不可用

AC-ID: APP-03-AC-whisper-reply-no-protection
Given 匹配来源为 `whisper_reply` 且接收方回复已成功落库
When 双方进入普通私信
Then 回复被视为真实用户消息，双方输入框均可发送，不再命中女性保护禁发

AC-ID: APP-03-AC-protection-does-not-block-entry
Given 双方关系有效且男性处于女性保护等待期
When 男性从匹配弹窗、相互喜欢列表或婚恋用户主页进入聊天
Then canEnterConversation=true 并正常打开会话，页面以 canSend=false 和 protectStatus 置灰输入区

AC-ID: APP-03-AC-private-chat-report
Given 当前用户已登录、账号未冻结、是会话参与方，且会话中存在对方发送的文本
When  用户点击顶部更多菜单的“举报聊天内容”并选择举报原因
Then  页面通过 `APP-05-PAGE-report-modal` 提交 `targetType=chat`、`targetId=conversationNo`；服务端反查参与关系和必要消息上下文

AC-ID: APP-03-AC-private-chat-report-history
Given 会话已失效但历史仍对当前参与方可见，且存在对方发送的文本
When  用户打开更多菜单
Then  “举报聊天内容”仍可用，但输入区继续保持不可发送

AC-ID: APP-03-AC-private-chat-report-deny
Given 当前用户不是会话参与方，或目标仅为本人发送内容、官方助手/系统消息
When  页面渲染或用户绕过前端提交举报
Then  页面不展示内容举报入口，服务端分别按无权限或对象不可举报拒绝，且不泄露聊天上下文
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块状态机 | `M03-SM-conversation` | 会话状态 |
| 依赖的模块规则 | `M03-RULE-private-chat-open` / `M03-RULE-send-permission` | 会话开放与发送权限拆分 |
| 依赖的模块规则 | `M03-RULE-female-protection` | 女性保护 |
| 依赖的模块规则 | `M03-RULE-report-handoff` / `M03-RULE-report-context` | 举报路由、准入与聊天最小上下文 |
| 依赖的页面 | `APP-03-PAGE-message-list` | 返回消息列表 |
| 复用的页面组件 | `APP-05-PAGE-report-modal` | 统一举报原因与提交反馈 |
