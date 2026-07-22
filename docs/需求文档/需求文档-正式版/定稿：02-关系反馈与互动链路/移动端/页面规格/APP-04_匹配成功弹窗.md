# 页面规格 - APP-02-PAGE-match-success-modal 匹配成功弹窗

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本05 | 2026-07-16 | Codex | 按最终确认恢复为 P0：双方各展示一次，按 matchNo + userId 记录展示/已读状态 |
| 版本04 | 2026-07-10 | Codex | 历史版本曾按蓝湖缺稿将弹窗移出范围，现已由版本05覆盖 |

- **页面 ID**：`APP-02-PAGE-match-success-modal`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-02_关系反馈与互动链路.md`
- **页面路由**：全局业务弹窗，无独立路由
- **入口来源**：双方互送爱心、精选心动后回爱心、悄悄话回复形成的新匹配生命周期
- **对应后台**：`ADM-02-PAGE-user-relation-section`
- **交付说明**：业务规则已冻结；蓝湖 UI 待补。按 `C02-12`，本轮移动端接口、页面编码、联调和验收延期

---

## 1. 页面定位

- **目标用户**：新形成有效匹配关系的双方用户
- **核心任务**：让每一方各感知一次新匹配，并可稍后处理、查看对方主页或进入聊天
- **页面类型**：异步业务弹窗

---

## 2. 布局与设计输入

```text
┌────────────────────────────┐
│ 关闭                        │
│ 双方头像 / 匹配成功主文案    │
│ 辅助文案（待蓝湖确认）        │
│ [稍后再说] [去主页] [去聊天]  │
└────────────────────────────┘
```

| 画板 ID | 画板名称 | 当前状态 | 必须覆盖 |
|---------|----------|----------|----------|
| `APP-02-match-success-01` | 匹配成功默认态 | 蓝湖缺稿 | 双方头像、主副文案、关闭、稍后再说、去主页、去聊天 |
| `APP-02-match-success-02` | 目标失效/不可进入会话态 | 蓝湖缺稿 | 不展示失效卡片；关闭弹窗并刷新关系状态 |

---

## 3. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 前台展示 | 数据来源 |
|---------|--------|------|------|----------|----------|----------|----------|
| `APP-02-PAGE-match-success-modal-FIELD-match-no` | 匹配编号 | string | 是 | MAT 业务编号 | 当前用户必须属于该匹配 | 否 | PRD-02 |
| `APP-02-PAGE-match-success-modal-FIELD-user-id` | 当前用户编号 | long | 是 | 当前登录用户 | 服务端从登录态获取，不接受客户端代传 | 否 | 登录态 |
| `APP-02-PAGE-match-success-modal-FIELD-matched-user-id` | 对方用户编号 | long | 是 | 有效用户 | 对方须仍可展示 | 否 | PRD-02/01 |
| `APP-02-PAGE-match-success-modal-FIELD-avatar` | 对方头像 | image | 是 | URL/占位图 | 仅返回可展示头像 | 是 | PRD-01 |
| `APP-02-PAGE-match-success-modal-FIELD-nickname` | 对方昵称 | string | 是 | 1-20 字 | 空值使用通用用户文案 | 是 | PRD-01 |
| `APP-02-PAGE-match-success-modal-FIELD-match-time` | 匹配时间 | datetime | 是 | datetime | 用于待展示排序 | 可选 | PRD-02 |
| `APP-02-PAGE-match-success-modal-FIELD-match-source` | 匹配来源 | enum | 是 | `M02-ENUM-match-source` | 仅用于埋点，不向用户直出 | 否 | PRD-02 |
| `APP-02-PAGE-match-success-modal-FIELD-can-enter` | 可进入会话 | bool | 是 | true/false | 只由关系/账号有效性决定；女性保护不得置 false | 否 | PRD-02 |
| `APP-02-PAGE-match-success-modal-FIELD-popup-status` | 弹窗状态 | enum | 是 | pending/shown/read | 按 `matchNo + userId` 唯一 | 否 | PRD-02 |

---

## 4. 操作表

| 操作 ID | 操作名 | 触发条件 | 服务端动作 | 成功态 | 失败态 |
|---------|--------|----------|------------|--------|--------|
| `APP-02-PAGE-match-success-modal-ACT-later` | 稍后再说 | 弹窗已实际展示 | 幂等标记当前用户已读 | 关闭弹窗 | 标记失败则提示重试并保留待处理状态 |
| `APP-02-PAGE-match-success-modal-ACT-close` | 关闭/系统返回 | 弹窗已实际展示 | 幂等标记当前用户已读 | 关闭弹窗 | 同上 |
| `APP-02-PAGE-match-success-modal-ACT-profile` | 去主页 | 对方仍可展示 | 先幂等标记已读 | 进入 PRD-05 婚恋用户主页 | 目标失效时关闭并刷新，不展示失效卡片 |
| `APP-02-PAGE-match-success-modal-ACT-chat` | 去聊天 | `canEnterConversation=true` | 先幂等标记已读 | 进入 PRD-03 私信会话页 | 关系/账号失效时关闭并刷新 |

> 女性保护只限制发送。进入会话后，PRD-03 通过 `canSend`、`protectStatus` 控制输入区，不能用女性保护把 `canEnterConversation` 置为 false。

---

## 5. 展示与已读规则

| 场景 | 是否标记已读 | 处理 |
|------|--------------|------|
| 弹窗完整数据加载且实际呈现 | 否 | 可将状态记为 shown，但仍保留待用户处理 |
| 用户点击稍后再说、关闭、系统返回 | 是 | 标记本人已读后关闭 |
| 用户点击去主页、去聊天 | 是 | 标记本人已读后导航 |
| 接口成功但弹窗未渲染 | 否 | 下次继续返回 |
| 加载失败、应用闪退或被系统异常终止 | 否 | 下次继续返回 |
| 新匹配生命周期 | 否 | 使用新 `matchNo` 为双方生成新的 pending 状态 |

双方状态完全独立：A 的已读不影响 B，B 的已读也不影响 A。

---

## 6. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户操作 |
|----------|----------|----------|----------|
| 无待展示 | 当前用户无 pending/shown 记录 | 不弹窗 | 无 |
| 加载态 | 获取对方可展示资料 | 短时 loading，未完成前不记已读 | 等待/退出 |
| 展示态 | 数据完整且对象有效 | 展示匹配成功弹窗 | 稍后、关闭、去主页、去聊天 |
| 目标失效 | 拉黑、冻结、注销、封禁、认证失效或关系失效 | 不展示失效卡片，刷新后关闭 | 无 |
| 网络错误 | 查询或标记已读失败 | toast + 重试 | 重试 |

---

## 7. 查询与幂等

- 每次只返回当前用户最早一条待处理匹配弹窗，处理后再取下一条。
- 查询按匹配时间升序，避免旧匹配长期被新匹配覆盖。
- `matchNo + userId` 唯一；重复标记已读返回成功，不重复写审计副作用。
- 客户端不得代传其他用户 ID，服务端从登录态确定当前用户。

---

## 8. 验收标准

```text
AC-ID: APP-02-AC-match-popup-both-users
Given 用户 A 与用户 B 形成新的有效匹配生命周期
When  A、B 分别下一次进入可展示弹窗的前台场景
Then  A、B 各看到一次自己的匹配成功弹窗，任一方处理不影响另一方

AC-ID: APP-02-AC-match-popup-read-by-action
Given 当前用户已实际看到匹配成功弹窗
When  用户点击稍后再说、关闭、系统返回、去主页或去聊天
Then  系统按 matchNo + 当前 userId 幂等标记已读，并执行关闭或导航

AC-ID: APP-02-AC-match-popup-interrupted
Given 当前用户存在待展示匹配弹窗
When  弹窗未渲染成功、加载失败或应用异常退出
Then  不标记已读，下次满足展示条件时仍可返回该弹窗

AC-ID: APP-02-AC-match-popup-female-protection
Given 匹配关系有效但会话处于女性保护发送限制
When  用户点击去聊天
Then  允许进入会话；PRD-03 以 canSend=false、protectStatus 限制发送
```

---

## 9. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 匹配生命周期 | `M02-RULE-match-lifecycle` | 新生命周期使用新 matchNo |
| 弹窗状态 | `M02-RULE-match-popup-user-state` | 双方独立展示与已读 |
| 婚恋主页 | `APP-05-PAGE-dating-user-profile` | 去主页承接 |
| 私信会话 | PRD-03 `APP-03-PAGE-private-chat` | 去聊天及女性保护发送限制 |
