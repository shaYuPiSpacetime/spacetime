# 页面规格 - APP-03-PAGE-whisper-detail 悄悄话详情页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-07-31 | Codex | 增加悄悄话内容直达举报，区分个人主页用户举报/拉黑，并补齐过期/失效历史态和本人内容限制 |
| 版本01 | 2026-07-13 | Codex | 拆分悄悄话详情、付费申请、回复匹配和到期反向申请 |

- **页面路由**：`/pages/message/whisper-detail?whisperNo={whisperNo}`
- **入口来源**：悄悄话列表；推荐页、社区或未匹配个人主页发起成功后的记录回流

## 1. 页面定位

匹配前的单条悄悄话详情。接收方只能回复或离开页面，不提供“暂不回应/拒绝”按钮；回复成功即匹配并创建普通私信会话。

## 2. 页面结构与时间线

```text
返回          悄悄话详情
对方头像 / 昵称 / 查看主页
悄悄话全文                         举报
发送成功 -> 对方查看（仅接收方自己可感知） -> 已回复并匹配
                                      或 到期自动结束
底部：回复并匹配 / 等待回复 / 去私信 / 申请认识
```

蓝湖扫帚图标删除。当前用户查看“对方发给我的”悄悄话时，内容卡片展示“举报”；点击后先展示“举报/取消”底部操作层，确认举报后打开 `APP-05-PAGE-report-modal`。当前用户查看本人发出的悄悄话时不展示内容举报。点击头像进入个人主页后，可举报用户资料/账号或拉黑。

### 2.1 举报弹层

| 弹层 | 触发方式 | 内容 | 关闭方式 |
|------|----------|------|----------|
| 举报确认操作层 | 点击悄悄话内容卡片“举报” | 举报、取消 | 点击取消、蒙层或“举报” |
| 统一举报弹窗 | 在确认操作层点击“举报” | 按 `targetType=chat` 展示启用原因，点击原因直接提交 | 取消、提交成功或重复举报后关闭 |

## 3. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-03-PAGE-whisper-detail-FIELD-whisper-no` | 悄悄话编号 | string | 是 | 业务编号 | 当前用户是发送方或接收方 | 无 | 否 | 普通 | 悄悄话申请 |
| `APP-03-PAGE-whisper-detail-FIELD-content` | 悄悄话内容 | string | 是 | 1-60 字 | 内容安全通过 | 无 | 发送前可编辑 | 敏感 | 用户输入 |
| `APP-03-PAGE-whisper-detail-FIELD-status` | 状态 | enum | 是 | `pending/replied/expired/invalid` | 按状态机流转 | pending | 否 | 普通 | `M03-SM-whisper` |
| `APP-03-PAGE-whisper-detail-FIELD-reply-content` | 回复内容 | string | 条件必填 | 1-500 字 | 接收方 pending 时可填并过内容安全 | 无 | 是 | 敏感 | 用户输入 |
| `APP-03-PAGE-whisper-detail-FIELD-expire-time` | 到期时间 | datetime | 是 | 发送后 7 天 | 服务端计算 | 无 | 否 | 普通 | 悄悄话申请 |
| `APP-03-PAGE-whisper-detail-FIELD-cooldown-expire-time` | 冷却截止 | datetime | 否 | 到期后 7 天 | 仅资格校验使用，不向对方展示具体时间 | 无 | 否 | 普通 | 悄悄话申请 |
| `APP-03-PAGE-whisper-detail-FIELD-can-report-content` | 可举报悄悄话内容 | bool | 是 | true/false | 当前用户已登录、账号未冻结、是该悄悄话接收方、目标存在且内容由对方发送；过期/失效但历史可见时仍可为 true | false | 否 | 普通 | `M03-RULE-report-handoff` |
| `APP-03-PAGE-whisper-detail-FIELD-report-context` | 举报上下文 | json | 条件必填 | `sourceType=whisper`、whisperNo、可选 messageNo | 仅传当前详情业务编号；不得上传被举报用户 ID 或正文 | 无 | 否 | 敏感 | `M03-RULE-report-context` |

## 4. 操作表

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-03-PAGE-whisper-detail-ACT-reply` | 回复并匹配 | 底部 | 当前用户是接收方且状态 pending | `GLB-ROLE-app-user` | 否 | 回复落库、匹配和私信会话原子创建 | 内容违规提示修改；状态变化则刷新 |
| `APP-03-PAGE-whisper-detail-ACT-pay-send` | 立即申请 | 付费弹层 | 未匹配、资格通过、内容 1-60 字 | `GLB-ROLE-app-user` | 是，展示 100 千寻币或会员免费次数 | 扣费与申请创建成功 | 余额不足引导充值；失败不扣费 |
| `APP-03-PAGE-whisper-detail-ACT-open-profile` | 查看主页 | 头像/昵称 | 对方账号可访问 | `GLB-ROLE-app-user` | 否 | 进入个人主页，可举报用户资料/账号或拉黑 | 账号异常提示不可查看 |
| `APP-03-PAGE-whisper-detail-ACT-report-content` | 举报悄悄话内容 | 内容卡片“举报” | `canReportContent=true` | `GLB-ROLE-app-user`、`M05-RULE-report-gate` | 是，底部操作层点击“举报” | 打开 `APP-05-PAGE-report-modal`；选择原因后生成 `targetType=chat` 工单 | `M05-ERR-report-duplicate`、`M05-ERR-report-no-permission`、`M05-ERR-report-self-target`、`M05-ERR-report-target-unavailable` |
| `APP-03-PAGE-whisper-detail-ACT-reverse-apply` | 申请认识 | 到期详情底部 | 当前用户为原接收方、双方未匹配且冷却/资格通过 | `GLB-ROLE-app-user` | 是 | 作为新的反向悄悄话发起 | 按余额、重复 pending、冷却处理 |

## 5. 状态与验收

| 状态 | 页面表现 | 操作 |
|------|----------|------|
| pending-接收方 | 展示全文、“举报”和“回复并匹配” | 回复/举报内容/返回/查看主页 |
| pending-发送方 | 展示等待回复，不展示已读、追问和内容举报 | 返回/查看主页 |
| replied | 时间线显示已回复并匹配；原接收方仍可举报收到的历史内容 | 去私信/举报内容 |
| expired | 弱化显示申请已结束；原接收方仍可举报历史内容，满足资格时可反向申请 | 返回/举报内容/申请认识 |
| invalid | 弱化显示申请已结束；历史仍可见且当前用户为原接收方时保留举报 | 返回/举报内容 |
| paying | 按钮加载并防重复点击 | 等待 |
| 余额不足 | 不创建申请、不扣费 | 去充值/取消 |

```text
Given 接收方打开 pending 悄悄话
When  回复内容发送成功
Then  回复、PRD-02 whisper_reply 匹配和普通私信会话原子创建，并直接开放普通私信，不再触发女性保护
```

```text
Given pending 悄悄话连续 7 天未回复
When  后台定时任务或延迟队列消费到期事件
Then  状态幂等变为 expired，并从到期时间起进入 7 天冷却；客户端不展示拒绝按钮或后台任务细节
```

```text
AC-ID: APP-03-AC-whisper-content-report
Given 当前用户已登录、账号未冻结，是某条悄悄话的接收方且历史内容仍可见
When  用户点击内容卡片“举报”、在底部操作层确认并选择举报原因
Then  页面通过 `APP-05-PAGE-report-modal` 提交 `targetType=chat`、`targetId=whisperNo` 和白名单上下文；即使状态为 expired/invalid 也允许提交

AC-ID: APP-03-AC-whisper-content-report-deny
Given 当前用户是该悄悄话发送方、不是参与方，或目标记录不存在
When  页面渲染或用户绕过前端提交举报
Then  页面不展示内容举报入口，服务端拒绝提交且不返回对方或内容信息
```

## 6. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖规则 | `M03-RULE-report-handoff` / `M03-RULE-report-context` | 内容举报准入、历史态与最小上下文 |
| 复用页面组件 | `APP-05-PAGE-report-modal` | 统一举报原因、幂等和反馈 |
| 用户安全入口 | `APP-05-PAGE-user-posts` | 个人主页承接用户资料/账号举报与拉黑 |
