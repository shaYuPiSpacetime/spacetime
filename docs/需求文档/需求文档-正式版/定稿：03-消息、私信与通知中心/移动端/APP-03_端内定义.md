# APP-03 端内定义 - 消息、私信与通知中心

> 本文件登记 PRD-03 移动端内部复用的页面树、入口、权限、UI 状态与端内文案。业务规则引用 `../../PRD-03_模块公共定义.md`。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本03 | 2026-07-31 | Codex | 登记私信/悄悄话内容举报状态、分流文案与埋点 |
| 版本02 | 2026-07-13 | Codex | 明确推荐、社区与消息中心的沟通入口分流 |
| 版本01 | 2026-07-02 | Codex | 按一期上线目标建立移动端消息页面树，移除用户自助通知管理页 |

---

## 1. 移动端页面树

```text
消息
├── 消息列表
├── 私信对话
├── 官方助手
├── 悄悄话消息
├── 通知中心
├── 通知详情
└── 邀请响应
```

| 页面 ID | 页面名 | 一期编号 | demo 原编号 | 页面规格路径 | 入口 |
|---------|--------|----------|-------------|--------------|------|
| `APP-03-PAGE-message-list` | 消息列表页 | MVP-PAGE-033 | APP-PAGE-049 | `页面规格/APP-01_消息列表页.md` | 底部 Tab `消息` |
| `APP-03-PAGE-private-list` | 私信列表页 | 蓝湖补充 | - | `页面规格/APP-09_私信列表页.md` | 消息首页顶部“私信”入口 |
| `APP-03-PAGE-private-chat` | 私信对话页 | MVP-PAGE-034 | APP-PAGE-050 | `页面规格/APP-02_私信对话页.md` | 消息列表主入口、匹配成功回流、社区/用户主页已匹配态 |
| `APP-03-PAGE-official-assistant` | 官方助手聊天页 | MVP-PAGE-035 | APP-PAGE-051 | `页面规格/APP-03_官方助手聊天页.md` | 消息列表官方助手入口、首次功能说明、公众号关注引导 |
| `APP-03-PAGE-whisper-message` | 悄悄话列表页 | MVP-PAGE-037 | APP-PAGE-053 | `页面规格/APP-05_悄悄话消息页.md` | 消息首页顶部“悄悄话”入口 |
| `APP-03-PAGE-whisper-detail` | 悄悄话详情页 | 蓝湖补充 | - | `页面规格/APP-10_悄悄话详情页.md` | 悄悄话列表记录、推荐页/社区付费发起回流 |
| `APP-03-PAGE-notification-center` | 通知中心页 | MVP-PAGE-038 | APP-PAGE-054 | `页面规格/APP-06_通知中心页.md` | 消息列表右上角通知、官方消息卡片 |
| `APP-03-PAGE-notification-detail` | 通知详情页（已废弃） | MVP-PAGE-039 | APP-PAGE-055 | `页面规格/APP-07_通知详情页.md` | ID 保留，不提供入口 |
| `APP-03-PAGE-invite-response` | 邀请响应页（移交 PRD-07） | MVP-PAGE-040 | APP-PAGE-056 | `页面规格/APP-08_邀请响应页.md` | ID 保留，不提供入口 |

### 1.1 本期明确不展示页面

| 页面/能力 | 原始来源 | 一期处理方式 | 说明 |
|-----------|----------|--------------|------|
| 通知管理页 / 通知设置页 | 原 PRD-03 10.5、demo APP-PAGE-091 | 隐藏，不建页面规格 | 一期目标明确不做用户自助通知设置页 |
| 官方消息详情页 | 原 MVP-PAGE-036 / APP-PAGE-052 | 隐藏，历史链接跳通知详情 | 避免与通知详情重复 |
| 图片/语音/通话输入入口 | 原 PRD-03 可延后项 | 隐藏 | 首版只做文本、悄悄话与系统提示 |
| 黑名单管理页 | 一期边界 | 隐藏 | 聊天页保留拉黑动作，不做完整黑名单管理页 |

---

## 2. 登录态与准入

| 用户状态 | 消息列表 | 私信会话 | 悄悄话 | 通知中心 | 处理方式 |
|----------|----------|----------|--------|----------|----------|
| 未登录 | 不进入 | 不进入 | 不可发送 | 不进入 | 引导微信登录 |
| 已登录未三重认证 | 可进入，展示系统通知入口和认证引导 | 不展示用户会话 | 不可发送/回复 | 可查看 | 引用 `M03-TXT-core-access-chat-block` |
| 三重认证通过 | 可进入 | 满足匹配后可聊天 | 满足权益后可发送/回复 | 可查看 | 正常展示 |
| 冻结/封禁/注销中 | 可查看部分系统通知 | 会话置失效 | 不可处理 | 可查看处理结果 | 展示失效原因 |

---

## 3. 移动端 UI 状态

| 状态 ID | 适用页面 | 触发条件 | 页面表现 | 引用 |
|---------|----------|----------|----------|------|
| `APP-03-STATE-auth-guide` | 消息列表、私信对话、悄悄话 | 未完成三重认证 | 私信区空态 + 认证引导按钮 | `M03-RULE-message-tab-scope` |
| `APP-03-STATE-no-conversation` | 消息列表 | 无私信会话 | 空态文案 + 去成家看看入口 | `M03-TXT-no-conversation-empty` |
| `APP-03-STATE-protected` | 私信对话 | 命中女性保护机制 | 男性侧输入框置灰 + 保护提示 | `M03-RULE-female-protection` |
| `APP-03-STATE-whisper-pending` | 悄悄话详情页 | 悄悄话待回复 | 接收方展示回复；发送方仅展示等待，不提供拒绝操作 | `M03-SM-whisper` |
| `APP-03-STATE-conversation-invalid` | 私信对话、悄悄话 | 会话失效 | 历史可看，输入区置灰，展示失效原因 | `M03-RULE-conversation-invalid` |
| `APP-03-STATE-reportable-history` | 私信对话、悄悄话详情 | 会话失效/悄悄话过期或失效，但对方历史内容仍对当前参与方可见 | 保留“举报”入口；不恢复发送、回复或申请能力 | `M03-RULE-report-handoff` |
| `APP-03-STATE-report-forbidden` | 私信对话、悄悄话详情 | 仅有本人内容、官方/系统消息、目标不存在或当前用户非参与方 | 隐藏内容举报入口；绕过提交由服务端拒绝 | `M03-RULE-report-handoff` |
| `APP-03-STATE-notice-empty` | 系统消息全文页 | 无系统消息 | 展示“暂无系统消息”并可返回 | `M03-RULE-notification-scope` |

---

## 4. 端内文案

| 文案 ID | 场景 | 默认文案 | 是否后台可配 |
|---------|------|----------|--------------|
| `APP-03-TXT-message-title` | 消息 Tab 标题 | 消息 | 否 |
| `APP-03-TXT-official-card-title` | 官方消息卡片 | 官方消息 | 是，引用 `M03-CFG-notification-template-list` |
| `APP-03-TXT-notification-entry` | 通知入口 | 通知 | 否 |
| `APP-03-TXT-chat-input-placeholder` | 私信输入框 | 说点什么吧 | 否 |
| `APP-03-TXT-chat-report` | 私信/悄悄话内容举报 | 举报 | 否 |
| `APP-03-TXT-profile-report` | 个人主页用户资料/账号举报 | 举报用户 | 否 |
| `APP-03-TXT-chat-block` | 个人主页拉黑 | 拉黑 | 否 |

---

## 5. 埋点事件

| 埋点 ID | 触发时机 | 关键参数 |
|---------|----------|----------|
| `msg_tab_show` | 进入消息列表页 | userNo, authStatus |
| `msg_official_click` | 点击官方消息卡片 | unreadCount |
| `msg_conversation_click` | 点击私信会话 | conversationNo, conversationStatus |
| `msg_private_send` | 私信发送成功 | conversationNo, messageType |
| `msg_private_send_fail` | 私信发送失败 | errorCode, conversationStatus |
| `msg_whisper_reply_click` | 点击回复悄悄话 | whisperNo |
| `msg_whisper_expired_show` | 到期申请在列表或详情曝光 | whisperNo, cooldownExpireTime |
| `msg_protect_block_show` | 女性保护拦截展示 | conversationNo, protectExpireTime |
| `msg_chat_report_click` | 私信对话页点击举报聊天内容 | conversationNo, messageNo(nullable) |
| `msg_whisper_report_click` | 悄悄话详情点击举报 | whisperNo, messageNo(nullable), whisperStatus |
| `msg_report_submit_result` | 统一举报组件返回提交结果 | targetType, targetId, sourceType, result, errorCode |
| `system_message_open` | 打开系统消息全文流 | unreadCount |
