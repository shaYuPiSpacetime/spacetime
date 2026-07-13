# 页面规格 - APP-03-PAGE-whisper-message 悄悄话列表页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本05 | 2026-07-13 | Codex | 列表与详情拆页；移除前台暂不回应；到期任务自动结束并进入 7 天冷却 |
| 版本04 | 2026-07-13 | Codex | 对齐蓝湖申请我的/我申请的列表、删除交互、60字付费申请与过期反向申请 |
| 版本03 | 2026-07-13 | Codex | 补齐匹配前资格、支付、等待、暂不回应、超时、失效、退款与回复匹配节点 |
| 版本02 | 2026-07-02 | Codex | 按评审意见补充发送方等待态操作 |
| 版本01 | 2026-07-02 | Codex | 初稿 |

- **页面 ID**：`APP-03-PAGE-whisper-message`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-03_消息、私信与通知中心.md`
- **页面路由**：`/pages/message/whispers`
- **入口来源**：推荐页推荐卡片/推荐详情（主发起入口）、社区动态/评论/用户主页未匹配态（辅助入口）、消息列表悄悄话会话、收到悄悄话通知
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端页面**：MVP-PAGE-037 / APP-PAGE-053

---

## 1. 页面定位

- **目标用户**：三重认证通过且参与悄悄话链路的用户
- **核心任务**：按“申请我的/我申请的”查看申请状态并进入独立详情页
- **页面类型**：双 Tab 申请列表页

---

## 2. 布局（给 UI）

### 2.1 整体布局

```text
┌────────────────────────────┐
│ 返回  申请我的 | 我申请的   │
├────────────────────────────┤
│ 未处理申请 / 已处理申请     │
│ 左滑删除 / 全部删除         │
└────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 顶部导航 | 顶部 | 返回、标题；不展示蓝湖扫帚图标 | 否 | 否 |
| 悄悄话卡片 | 主体 | 发送人、悄悄话内容、状态、时间 | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 全部删除 | 点击分组更多 | 底部动作面板 | 删除当前用户可见的申请记录，不影响对方记录 | 取消/全部删除 |

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-03-whisper-04` | 悄悄话列表-申请我的 | 未处理/已处理、回复、状态 | P0 |
| `APP-03-whisper-06` | 悄悄话列表-我申请的 | 申请记录列表 | P0 |
| `APP-03-whisper-09` | 悄悄话列表-删除 | 左滑删除、全部删除动作面板 | P0 |

### 2.5 编辑控件口径

| 区域 | 展现形式 | 编辑控件 | 新增/删除方式 | 保存方式 |
|------|----------|----------|----------------|----------|
| 回复弹窗 | 底部弹窗 | 多行文本输入 | 不支持删除 | 点击发送即保存 |
| 付费确认 | 底部弹窗 | 多行文本输入、消耗方式只读 | 不支持追发；关闭不保存服务端记录 | 确认支付并发送 |

---

## 3. 筛选与搜索

仅提供“申请我的/我申请的”一级 Tab，不提供类型筛选和搜索。

---

## 4. 字段表

### 4.1 列表字段

本页非列表页，列表字段不适用。

### 4.2 详情/表单字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-03-PAGE-whisper-message-FIELD-whisper-no` | 悄悄话编号 | string | 是 | 业务编号 | 当前用户为发送方或接收方 | 无 | 不可编辑 | 普通 | 悄悄话记录 |
| `APP-03-PAGE-whisper-message-FIELD-sender-avatar` | 发送方头像 | image | 否 | URL | 私有图片 URL | 默认头像 | 不可编辑 | 普通 | 用户资料 |
| `APP-03-PAGE-whisper-message-FIELD-sender-nickname` | 发送方昵称 | string | 是 | 1-20 字 | 已审核 | 无 | 用户资料编辑触发 | 普通 | 用户资料 |
| `APP-03-PAGE-whisper-message-FIELD-content` | 悄悄话内容 | string | 是 | 1-60 字 | 内容安全检测 | 无 | 发送前可编辑 | 敏感，加密存储 | 用户输入 |
| `APP-03-PAGE-whisper-message-FIELD-whisper-status` | 悄悄话状态 | enum | 是 | `M03-ENUM-whisper-status` | 状态机流转 | `pending` | 系统流转 | 普通 | `M03-SM-whisper` |
| `APP-03-PAGE-whisper-message-FIELD-pay-type` | 消耗方式 | enum | 是 | 免费次数/千寻币 | 引用 PRD-04 | 千寻币 | 系统计算 | 普通 | PRD-04 |
| `APP-03-PAGE-whisper-message-FIELD-payment-status` | 支付状态 | enum | 是 | `M03-ENUM-whisper-payment-status` | 支付状态机流转 | `unpaid` | 系统流转 | 普通 | `M03-SM-whisper-payment` |
| `APP-03-PAGE-whisper-message-FIELD-expire-time` | 有效截止时间 | datetime | 是 | 发送时间后 7 天 | 仅 `pending` 可处理 | 无 | 系统计算 | 普通 | `M03-RULE-whisper-expire` |
| `APP-03-PAGE-whisper-message-FIELD-cooldown-expire-time` | 冷却结束时间 | datetime | 否 | datetime | `expired` 后必填；仅用于资格校验，不在列表展示具体时间 | 无 | 系统计算 | 普通 | `M03-RULE-whisper-expire` |
| `APP-03-PAGE-whisper-message-FIELD-reply-content` | 回复内容 | string | 条件必填 | 1-500 字 | 回复时必填，内容安全检测 | 无 | 接收方在 pending 状态编辑 | 敏感，加密存储 | 用户输入 |

---

## 5. 操作表

### 5.1 行级操作

本页无行级列表操作。

### 5.2 批量操作

本页无批量操作。

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-03-PAGE-whisper-message-ACT-open-detail` | 查看申请 | 列表行 | 当前用户是申请参与方 | `GLB-ROLE-app-user` | 否 | 进入 `APP-03-PAGE-whisper-detail` | 记录失效时刷新列表并提示 |
| `APP-03-PAGE-whisper-message-ACT-delete` | 删除 | 列表左滑 | 当前用户可见申请记录 | `GLB-ROLE-app-user` | 否 | 仅删除当前用户列表记录 | 删除失败恢复列表项 |
| `APP-03-PAGE-whisper-message-ACT-delete-all` | 全部删除 | 分组更多菜单 | 当前分组存在记录 | `GLB-ROLE-app-user` | 是 | 清空当前用户当前分组记录 | 失败保留原列表 |
| `APP-03-PAGE-whisper-message-ACT-reverse-apply` | 申请认识 | 过期详情底部 | 当前用户是原接收方且双方仍未匹配 | `GLB-ROLE-app-user` | 是 | 打开新的付费申请弹层，生成反向悄悄话 | 按新申请资格/余额错误处理 |
| `APP-03-PAGE-whisper-message-ACT-send-again-blocked` | 再发悄悄话 | 入口不展示；若从其他入口重复触发 | 发送方且同一对象存在 `pending` 悄悄话 | `GLB-ROLE-app-user` | 否 | 阻止重复发送并提示已有悄悄话待回复 | `M03-ERR-whisper-duplicate-pending` |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| `whisperStatus` | `replied` | 会话状态 | 触发匹配成功，打开普通私信 | `M03-EVT-whisper-replied` |
| `whisperStatus` | `expired` | 再次发送资格 | 发送满 7 天自动结束，并从到期时间起进入 7 天冷却 | `M03-RULE-whisper-expire` |
| `paymentStatus` | `refunding/refunded` | 资产提示 | 显示退款处理中/已原路退回，不允许重复发起补偿 | `M03-RULE-whisper-payment-refund` |
| `whisperStatus` | `pending` 且当前用户为发送方 | 操作区 | 展示等待回复提示，隐藏回复/忽略，不展示再次发送入口 | `M03-RULE-whisper-repeat-limit` |
| 账号状态 | 异常 | 操作区 | 隐藏回复/忽略，展示失效 | `M03-RULE-conversation-invalid` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入 | 骨架屏 | 等待 | 通用态 |
| 空态 | 悄悄话不存在 | 提示记录不存在 | 返回 | `M03-ERR-notification-not-found` |
| 错误态 | 网络失败 | toast + 重试 | 重试 | 通用态 |
| 无权限态 | 非参与用户 | 无权限提示 | 返回 | `GLB-ROLE-app-user` |
| 业务态-unpaid | 通过资格预校验，尚未支付 | 展示内容编辑和本次消耗 | 取消/确认支付并发送 | `M03-SM-whisper-payment` |
| 业务态-paying | 正在核销权益或扣费 | 按钮 loading，禁止重复点击 | 等待 | `M03-SM-whisper-payment` |
| 业务态-pending-接收方 | 等待回应且当前用户为接收方 | 列表显示“回复”，点击进入详情；无暂不回应按钮 | 查看详情 | `M03-SM-whisper` |
| 业务态-pending-发送方 | 待回复且当前用户为发送方 | 显示等待对方回复提示，不展示普通私信输入和再次发送入口 | 查看主页/举报/拉黑 | `M03-RULE-whisper-repeat-limit` |
| 业务态-replied | 已回复 | 展示已匹配提示 | 去聊天 | `M03-SM-whisper` |
| 业务态-invalid | 异常失效 | 列表统一弱化为“申请已结束” | 删除记录 | `M03-RULE-whisper-read-privacy` |
| 业务态-expired | 发送满 7 天未处理 | 详情时间线显示“过期自动拒绝”；原接收方显示“申请认识” | 返回/反向发起 | `M03-RULE-whisper-expire` |
| 业务态-refunding/refunded | 已扣费但未有效送达 | 不作为前台独立页面；必要时以轻提示说明权益已退回 | 返回 | `M03-RULE-whisper-payment-refund` |
| 降级态 | PRD-02 匹配服务不可用 | 回复成功但匹配处理中提示 | 稍后查看 | PRD-02 |

---

## 8. 查询与列表

列表按“申请我的/我申请的”双 Tab 展示；申请我的按未处理/已处理分组。默认每次加载 20 条，支持左滑删除和当前分组全部删除；点击记录进入单条详情。

---

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-03-AC-whisper-reply-match` | 回复悄悄话触发匹配 | 正常 | P0 |
| `APP-03-AC-whisper-pay-before-send` | 支付成功后才创建悄悄话 | 正常 | P0 |
| `APP-03-AC-whisper-expire` | 7 天未回复自动结束并进入冷却 | 正常 | P0 |
| `APP-03-AC-whisper-refund` | 已扣费但未有效送达自动退款 | 异常 | P0 |
| `APP-03-AC-whisper-invalid` | 会话失效不可回复 | 异常 | P0 |
| `APP-03-AC-whisper-pending-sender` | 发送方等待回复时不可重复发送 | 正常 | P0 |

```text
AC-ID: APP-03-AC-whisper-reply-match
Given 接收方打开状态为 `pending` 的悄悄话
When  输入回复内容并发送成功
Then  悄悄话状态变为 `replied`，触发 `M03-EVT-whisper-replied`，页面跳转或提示进入普通私信
```

```text
AC-ID: APP-03-AC-whisper-pay-before-send
Given 双方未匹配且发送方通过资格与内容安全预校验
When  用户确认支付并发送
Then  仅在免费次数或千寻币核销成功且消息创建成功后生成 `pending` 悄悄话；失败不扣费，已扣费未有效送达则进入原路退款
```

```text
AC-ID: APP-03-AC-whisper-expire
Given 悄悄话发送后连续 7 天未被回复
When  后台定时任务或延迟队列执行到期处理
Then  状态幂等变为 `expired`，双方不匹配且不退款；从到期时间起进入 7 天冷却，移动端弱化展示“申请已结束”
```

```text
AC-ID: APP-03-AC-whisper-pending-sender
Given 发送方已向同一对象发送一条状态为 `pending` 的悄悄话
When  发送方进入悄悄话消息页或从其他入口再次尝试发送悄悄话
Then  页面仅展示等待回复提示、查看主页、举报和拉黑入口；重复发送被 `M03-ERR-whisper-duplicate-pending` 拦截
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖状态机 | `M03-SM-whisper` | 悄悄话状态 |
| 依赖规则 | `M03-RULE-whisper-send` | 发送资格 |
| 关联事件 | `M03-EVT-whisper-replied` | 匹配成功 |
| 依赖模块 | PRD-04 | 扣费和免费次数 |
