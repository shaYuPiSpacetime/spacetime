# 页面规格 - APP-03-PAGE-whisper-message 悄悄话列表页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本09 | 2026-08-07 | Codex | 悄悄话正文由 TIM 提供移动端展示，同时以明文归档到平台消息主表，普通平台接口不直接返回归档字段 |
| 版本08 | 2026-08-06 | Codex | 悄悄话改由后端业务校验后通过腾讯云 TIM 投递，移除平台发送前文本内容审核 |
| 版本07 | 2026-08-06 | Codex | 确认默认列表仅展示 pending 申请；回复成功后双方列表移除并转入唯一私信会话，取消已处理分组和用户删除操作 |
| 版本06 | 2026-07-31 | Codex | 对齐举报分流：列表不直接举报内容，本人发送态仅可进入主页举报用户/拉黑，收到的内容在详情页举报 |
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
- **核心任务**：按“申请我的/我申请的”查看仍待回复的申请并进入独立详情页
- **页面类型**：双 Tab 申请列表页

---

## 2. 布局（给 UI）

### 2.1 整体布局

```text
┌────────────────────────────┐
│ 返回  申请我的 | 我申请的   │
├────────────────────────────┤
│ 待回复申请卡片列表           │
│ 头像 / 昵称 / 摘要 / 时间    │
└────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 顶部导航 | 顶部 | 返回、标题；不展示蓝湖扫帚图标 | 否 | 否 |
| 悄悄话卡片 | 主体 | 对方头像、昵称、内容摘要、申请时间；数据范围固定为 `pending` | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

本页不提供删除、全部删除或“已处理申请”弹层。回复、到期或失效均由状态迁移退出默认列表。

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-03-whisper-04` | 悄悄话列表-申请我的 | 待回复申请、进入详情、空态 | P0 |
| `APP-03-whisper-06` | 悄悄话列表-我申请的 | 等待回复申请、进入详情、空态 | P0 |

### 2.5 编辑控件口径

本页仅提供列表浏览与进入详情，不直接编辑、回复、删除或支付。

---

## 3. 筛选与搜索

仅提供“申请我的/我申请的”一级 Tab，不提供类型筛选和搜索。

---

## 4. 字段表

### 4.1 列表字段

本页列表只返回 `M03-ENUM-whisper-status=pending` 的记录；`replied/expired/invalid` 不进入“申请我的/我申请的”默认列表。

### 4.2 详情/表单字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-03-PAGE-whisper-message-FIELD-whisper-no` | 悄悄话编号 | string | 是 | 业务编号 | 当前用户为发送方或接收方 | 无 | 不可编辑 | 普通 | 悄悄话记录 |
| `APP-03-PAGE-whisper-message-FIELD-sender-avatar` | 发送方头像 | image | 否 | URL | 私有图片 URL | 默认头像 | 不可编辑 | 普通 | 用户资料 |
| `APP-03-PAGE-whisper-message-FIELD-sender-nickname` | 发送方昵称 | string | 是 | 1-20 字 | 已审核 | 无 | 用户资料编辑触发 | 普通 | 用户资料 |
| `APP-03-PAGE-whisper-message-FIELD-content` | 悄悄话内容 | string | 是 | 1-60 字 | 去首尾空格后非空 | 无 | 发送前可编辑 | 敏感；移动端由 TIM 展示，平台消息主表明文归档 | TIM 自定义消息 + `app_message_record.content_text` |
| `APP-03-PAGE-whisper-message-FIELD-whisper-status` | 悄悄话状态 | enum | 是 | 本页固定 `pending` | 非 pending 数据不得由默认列表接口返回 | `pending` | 系统流转 | 普通 | `M03-SM-whisper` |
| `APP-03-PAGE-whisper-message-FIELD-pay-type` | 消耗方式 | enum | 是 | 免费次数/千寻币 | 引用 PRD-04 | 千寻币 | 系统计算 | 普通 | PRD-04 |
| `APP-03-PAGE-whisper-message-FIELD-payment-status` | 支付状态 | enum | 是 | `M03-ENUM-whisper-payment-status` | 支付状态机流转 | `unpaid` | 系统流转 | 普通 | `M03-SM-whisper-payment` |
| `APP-03-PAGE-whisper-message-FIELD-expire-time` | 有效截止时间 | datetime | 是 | 发送时间后 7 天 | 仅 `pending` 可处理 | 无 | 系统计算 | 普通 | `M03-RULE-whisper-expire` |
| `APP-03-PAGE-whisper-message-FIELD-cooldown-expire-time` | 冷却结束时间 | datetime | 否 | datetime | `expired` 后必填；仅用于资格校验，不在列表展示具体时间 | 无 | 系统计算 | 普通 | `M03-RULE-whisper-expire` |

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
| `APP-03-PAGE-whisper-message-ACT-send-again-blocked` | 再发悄悄话 | 入口不展示；若从其他入口重复触发 | 发送方且同一对象存在 `pending` 悄悄话 | `GLB-ROLE-app-user` | 否 | 阻止重复发送并提示已有悄悄话待回复 | `M03-ERR-whisper-duplicate-pending` |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| `whisperStatus` | `replied` | 双方悄悄话列表、双方私信列表、未读 | 当前申请从双方默认列表移除；双方私信列表出现同一会话；原发送方新增 1 条私信未读 | `M03-RULE-whisper-to-conversation` |
| `whisperStatus` | `expired/invalid` | 双方悄悄话列表 | 从默认列表移除；后台保留状态事实，缓存详情按结束态处理 | `M03-RULE-whisper-expire`、`M03-RULE-data-retention` |
| `paymentStatus` | `refunding/refunded` | 资产提示 | 显示退款处理中/已原路退回，不允许重复发起补偿 | `M03-RULE-whisper-payment-refund` |
| `whisperStatus` | `pending` 且当前用户为发送方 | 操作区 | 展示等待回复提示，不展示回复或再次发送入口 | `M03-RULE-whisper-repeat-limit` |
| 账号状态 | 异常 | 当前列表 | 服务端将申请转 `invalid` 并移出默认列表 | `M03-RULE-conversation-invalid` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入 | 骨架屏 | 等待 | 通用态 |
| 空态 | 当前 Tab 无 `pending` 申请 | 展示暂无待回复申请 | 返回/切换 Tab | `M03-RULE-whisper-to-conversation` |
| 错误态 | 网络失败 | toast + 重试 | 重试 | 通用态 |
| 无权限态 | 非参与用户 | 无权限提示 | 返回 | `GLB-ROLE-app-user` |
| 业务态-pending-接收方 | 等待回应且当前用户为接收方 | 列表显示“回复”，点击进入详情；无暂不回应按钮 | 查看详情 | `M03-SM-whisper` |
| 业务态-pending-发送方 | 待回复且当前用户为发送方 | 显示等待对方回复提示，不展示普通私信输入、再次发送和内容举报入口 | 查看主页，并在主页举报用户/拉黑 | `M03-RULE-whisper-repeat-limit`、`M03-RULE-report-handoff` |
| 业务态-replied/expired/invalid | 默认列表收到终态数据 | 不渲染该行并刷新当前 Tab；`replied` 时同步刷新私信列表 | 进入私信/继续浏览 | `M03-RULE-whisper-to-conversation` |
| 降级态 | 列表刷新失败 | 保留当前可见数据并提示刷新失败，不在本地猜测状态迁移 | 重试 | 通用态 |

---

## 8. 查询与列表

列表按“申请我的/我申请的”双 Tab 展示，仅查询 `pending` 申请，不设置未处理/已处理二级分组。默认每次加载 20 条并支持游标分页；不支持左滑删除、全部删除或已完成申请查询。点击记录进入单条详情；若打开前状态已迁移，按服务端返回刷新并跳转私信或显示申请已结束。

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
| `APP-03-AC-whisper-list-migrate` | 回复后双方申请列表移除并转入私信 | 正常 | P0 |

```text
AC-ID: APP-03-AC-whisper-reply-match
Given 接收方打开状态为 `pending` 的悄悄话
When  输入回复内容并发送成功
Then  悄悄话状态变为 `replied`，触发 `M03-EVT-whisper-replied`；该记录立即退出双方悄悄话默认列表，双方私信列表出现同一会话，原申请与回复成为会话开场上下文，发送方新增 1 条未读
```

```text
AC-ID: APP-03-AC-whisper-list-migrate
Given A 的“我申请的”和 B 的“申请我的”都展示同一条 pending 悄悄话
When  B 回复并匹配事务成功
Then 两个 Tab 都不再返回该申请；一期不存在已完成申请列表；A、B 的私信列表指向同一 conversationNo，重复提交不得生成第二条匹配、会话或开场消息
```

```text
AC-ID: APP-03-AC-whisper-pay-before-send
Given 双方未匹配且发送方通过业务资格预校验
When  用户确认支付并发送
Then  仅在免费次数或千寻币核销、业务记录创建且 TIM 自定义消息有效投递后生成 `pending` 悄悄话；失败不扣费，已扣费但 TIM 未有效投递则进入原路退款
```

```text
AC-ID: APP-03-AC-whisper-expire
Given 悄悄话发送后连续 7 天未被回复
When  后台定时任务或延迟队列执行到期处理
Then  状态幂等变为 `expired`，双方不匹配且不退款；从到期时间起进入 7 天冷却，默认列表不再返回该记录；旧缓存或合法历史详情只显示“申请已结束”
```

```text
AC-ID: APP-03-AC-whisper-pending-sender
Given 发送方已向同一对象发送一条状态为 `pending` 的悄悄话
When  发送方进入悄悄话消息页或从其他入口再次尝试发送悄悄话
Then  页面仅展示等待回复提示和查看主页入口；用户资料/账号举报与拉黑在个人主页完成，本人发送的悄悄话不提供内容举报；重复发送被 `M03-ERR-whisper-duplicate-pending` 拦截
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖状态机 | `M03-SM-whisper` | 悄悄话状态 |
| 依赖规则 | `M03-RULE-whisper-send` | 发送资格 |
| 依赖规则 | `M03-RULE-whisper-to-conversation` | 默认列表范围与回复后迁移 |
| 关联事件 | `M03-EVT-whisper-replied` | 匹配成功 |
| 依赖模块 | PRD-04 | 扣费和免费次数 |
