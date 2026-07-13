# 页面规格 - APP-03-PAGE-whisper-message 悄悄话消息页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本03 | 2026-07-13 | Codex | 补齐匹配前资格、支付、等待、暂不回应、超时、失效、退款与回复匹配节点 |
| 版本02 | 2026-07-02 | Codex | 按评审意见补充发送方等待态操作 |
| 版本01 | 2026-07-02 | Codex | 初稿 |

- **页面 ID**：`APP-03-PAGE-whisper-message`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-03_消息、私信与通知中心.md`
- **页面路由**：`/pages/message/whisper`
- **入口来源**：推荐页推荐卡片/推荐详情（主发起入口）、社区动态/评论/用户主页未匹配态（辅助入口）、消息列表悄悄话会话、收到悄悄话通知
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端页面**：MVP-PAGE-037 / APP-PAGE-053

---

## 1. 页面定位

- **目标用户**：三重认证通过且参与悄悄话链路的用户
- **核心任务**：发起方完成资格校验与付费发送；接收方回复或暂不回应；回复后匹配并进入普通私信
- **页面类型**：详情页/卡片处理页

---

## 2. 布局（给 UI）

### 2.1 整体布局

```text
┌────────────────────────────┐
│ 返回  悄悄话                │
├────────────────────────────┤
│ 悄悄话卡片 / 等待回复提示   │
│ 状态说明 / 冷却提示         │
├────────────────────────────┤
│ 回复按钮       忽略按钮     │
└────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 顶部导航 | 顶部 | 返回、标题、更多菜单 | 否 | 否 |
| 悄悄话卡片 | 主体 | 发送人、悄悄话内容、状态、时间 | 否 | 否 |
| 操作区 | 底部 | 回复、暂不回应或等待提示 | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 回复弹窗 | 点击回复 | 底部输入弹窗 | 文本输入、发送按钮 | 取消/发送 |
| 付费确认 | 未匹配用户从发现入口点击悄悄话 | 底部输入弹窗 | 1～200 字内容、免费次数/千寻币消耗、确认支付并发送 | 取消/发送 |
| 暂不回应确认 | 点击暂不回应 | 底部确认弹窗 | 引用 `M03-TXT-whisper-not-respond-confirm`，不向发送方暴露拒绝 | 取消/确认 |
| 更多菜单 | 右上角更多 | 底部动作面板 | 查看对方主页、举报、拉黑 | 取消/遮罩 |

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-03-whisper-01` | 悄悄话消息页-接收方待处理 | 卡片、回复、忽略 | P0 |
| `APP-03-whisper-02` | 悄悄话消息页-发送方等待 | 等待对方回复 | P0 |
| `APP-03-whisper-03` | 悄悄话消息页-回复弹窗 | 回复输入 | P0 |
| `APP-03-whisper-04` | 悄悄话消息页-暂不回应确认 | 匿名拒绝、冷却提示 | P0 |
| `APP-03-whisper-05` | 悄悄话消息页-已回复 | 已匹配成功提示 | P0 |
| `APP-03-whisper-06` | 悄悄话消息页-失效态 | 不可处理 | P1 |
| `APP-03-whisper-07` | 悄悄话付费确认 | 内容、消耗方式、余额不足、支付中 | P0 |
| `APP-03-whisper-08` | 悄悄话消息页-已超时 | 本次结束、可重新发起 | P0 |
| `APP-03-whisper-09` | 悄悄话退款状态 | 退款中、已退款 | P1 |

### 2.5 编辑控件口径

| 区域 | 展现形式 | 编辑控件 | 新增/删除方式 | 保存方式 |
|------|----------|----------|----------------|----------|
| 回复弹窗 | 底部弹窗 | 多行文本输入 | 不支持删除 | 点击发送即保存 |
| 付费确认 | 底部弹窗 | 多行文本输入、消耗方式只读 | 不支持追发；关闭不保存服务端记录 | 确认支付并发送 |

---

## 3. 筛选与搜索

本页为详情页，无筛选搜索。

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
| `APP-03-PAGE-whisper-message-FIELD-content` | 悄悄话内容 | string | 是 | 1-200 字 | 内容安全检测 | 无 | 发送前可编辑 | 敏感，加密存储 | 用户输入 |
| `APP-03-PAGE-whisper-message-FIELD-whisper-status` | 悄悄话状态 | enum | 是 | `M03-ENUM-whisper-status` | 状态机流转 | `pending` | 系统流转 | 普通 | `M03-SM-whisper` |
| `APP-03-PAGE-whisper-message-FIELD-pay-type` | 消耗方式 | enum | 是 | 免费次数/千寻币 | 引用 PRD-04 | 千寻币 | 系统计算 | 普通 | PRD-04 |
| `APP-03-PAGE-whisper-message-FIELD-payment-status` | 支付状态 | enum | 是 | `M03-ENUM-whisper-payment-status` | 支付状态机流转 | `unpaid` | 系统流转 | 普通 | `M03-SM-whisper-payment` |
| `APP-03-PAGE-whisper-message-FIELD-expire-time` | 有效截止时间 | datetime | 是 | 发送时间后 7 天 | 仅 `pending` 可处理 | 无 | 系统计算 | 普通 | `M03-RULE-whisper-expire` |
| `APP-03-PAGE-whisper-message-FIELD-cooldown-expire-time` | 冷却结束时间 | datetime | 否 | datetime | `not_responded` 后必填；不向发送方展示具体处理时间 | 无 | 系统计算 | 普通 | `M03-RULE-whisper-ignore-cooldown` |
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
| `APP-03-PAGE-whisper-message-ACT-reply` | 回复 | 底部 | 接收方且状态 `pending` | `GLB-ROLE-app-user` | 否 | 状态变为 `replied`，进入普通私信 | `M03-ERR-conversation-invalid`、内容安全失败 |
| `APP-03-PAGE-whisper-message-ACT-pay-send` | 确认支付并发送 | 付费确认弹窗 | 未匹配、资格通过、内容 1～200 字 | `GLB-ROLE-app-user` | 是，展示消耗方式 | 扣费与消息创建成功后变为 `pending` | 余额不足、内容安全失败不扣费；已扣费未送达转退款 |
| `APP-03-PAGE-whisper-message-ACT-not-respond` | 暂不回应 | 底部 | 接收方且状态 `pending` | `GLB-ROLE-app-user` | 是，引用匿名拒绝文案 | 状态变为 `not_responded` | 网络失败保留 `pending`，允许重试 |
| `APP-03-PAGE-whisper-message-ACT-view-profile` | 查看对方主页 | 更多菜单 | 发送方或接收方，且对方账号正常 | `GLB-ROLE-app-user` | 否 | 跳转对方主页 | 对方异常或注销时提示不可查看 |
| `APP-03-PAGE-whisper-message-ACT-report` | 举报 | 更多菜单 | 悄悄话存在 | `GLB-ROLE-app-user` | 否 | 进入举报流程 | 提交失败提示重试 |
| `APP-03-PAGE-whisper-message-ACT-block` | 拉黑 | 更多菜单 | 未拉黑 | `GLB-ROLE-app-user` | 是 | 会话失效 | 失败提示重试 |
| `APP-03-PAGE-whisper-message-ACT-send-again-blocked` | 再发悄悄话 | 入口不展示；若从其他入口重复触发 | 发送方且同一对象存在 `pending` 悄悄话 | `GLB-ROLE-app-user` | 否 | 阻止重复发送并提示已有悄悄话待回复 | `M03-ERR-whisper-duplicate-pending` |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| `whisperStatus` | `replied` | 会话状态 | 触发匹配成功，打开普通私信 | `M03-EVT-whisper-replied` |
| `whisperStatus` | `not_responded` | 冷却时间 | 从接收方处理时间起写入 7 天冷却；发送方只显示统一结束文案 | `M03-RULE-whisper-ignore-cooldown` |
| `whisperStatus` | `expired` | 再次发送资格 | 发送满 7 天自动结束，可重新发起，不叠加冷却 | `M03-RULE-whisper-expire` |
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
| 业务态-pending-接收方 | 等待回应且当前用户为接收方 | 显示回复/暂不回应，不展示发送方追问 | 回复/暂不回应/查看主页/举报 | `M03-SM-whisper` |
| 业务态-pending-发送方 | 待回复且当前用户为发送方 | 显示等待对方回复提示，不展示普通私信输入和再次发送入口 | 查看主页/举报/拉黑 | `M03-RULE-whisper-repeat-limit` |
| 业务态-replied | 已回复 | 展示已匹配提示 | 去聊天 | `M03-SM-whisper` |
| 业务态-not-responded | 暂不回应 | 接收方显示已结束；发送方仅显示“对方暂未回应，本次悄悄话已结束” | 返回 | `M03-RULE-whisper-read-privacy` |
| 业务态-expired | 发送满 7 天未处理 | 双方显示已超时；发送方可重新发起 | 返回/重新发起 | `M03-RULE-whisper-expire` |
| 业务态-invalid | 拉黑、处罚、账号或认证异常 | 统一显示当前无法继续互动，不暴露具体原因 | 返回/查看历史 | `M03-RULE-conversation-invalid` |
| 业务态-refunding/refunded | 已扣费但未有效送达 | 显示退款进度或已退回 | 查看资产明细 | `M03-RULE-whisper-payment-refund` |
| 降级态 | PRD-02 匹配服务不可用 | 回复成功但匹配处理中提示 | 稍后查看 | PRD-02 |

---

## 8. 查询与列表

本页为单条悄悄话详情，不提供分页。历史消息进入私信对话页承接。

---

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-03-AC-whisper-reply-match` | 回复悄悄话触发匹配 | 正常 | P0 |
| `APP-03-AC-whisper-ignore-cooldown` | 忽略后 7 天冷却 | 正常 | P0 |
| `APP-03-AC-whisper-pay-before-send` | 支付成功后才创建悄悄话 | 正常 | P0 |
| `APP-03-AC-whisper-not-respond-private` | 暂不回应不暴露明确拒绝 | 正常 | P0 |
| `APP-03-AC-whisper-expire` | 7 天未处理自动结束且可重新发起 | 正常 | P0 |
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
AC-ID: APP-03-AC-whisper-not-respond-private
Given 接收方打开状态为 `pending` 的悄悄话
When  点击“暂不回应”并二次确认
Then  状态变为 `not_responded`，不匹配、不退款并进入 7 天冷却；发送方只看到统一暂未回应文案，不看到明确拒绝、已读或处理时间
```

```text
AC-ID: APP-03-AC-whisper-expire
Given 悄悄话发送后连续 7 天未被回复或暂不回应
When  系统执行到期任务
Then  状态变为 `expired`，双方不匹配且不退款；发送方可重新发起，不额外叠加冷却
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
