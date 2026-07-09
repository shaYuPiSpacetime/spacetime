# 页面规格 - APP-02-PAGE-mutual-matches 相互喜欢列表页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本03 | 2026-07-09 | Codex | 按产品确认调整取消喜欢展示：默认列表仅展示有效匹配，取消喜欢失效记录不展示 |
| 版本02 | 2026-07-02 | Codex | 补充匹配成功后婚恋用户主页 Yo 按钮改聊天 icon 的联动验收 |
| 版本01 | 2026-07-01 | Codex | 正式版初稿 |

- **页面 ID**：`APP-02-PAGE-mutual-matches`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-02_关系反馈与互动链路.md`
- **页面路由**：小程序路径待技术方案确定，建议 `/pages/relation/mutual-matches`
- **入口来源**：匹配成功弹窗、荐/婚恋反馈入口、消息快捷入口
- **对应后台**：`ADM-02-PAGE-user-relation-section`

---

## 1. 页面定位

- **目标用户**：已形成匹配成功记录的三重认证通过用户
- **核心任务**：查看当前有效的相互喜欢关系，并进入聊天或主页；历史入口或已曝光回显中解释关系已失效
- **页面类型**：列表页

---

## 2. 布局

```text
┌────────────────────────────┐
│ 顶部导航：相互喜欢（人数）  │
├────────────────────────────┤
│ 列表卡片：头像/昵称/基础信息 │
│ 来源标识/匹配时间/状态       │
│ 操作：聊天/看主页             │
└────────────────────────────┘
```

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-02-mutual-01` | 相互喜欢-有效列表 | 有效匹配、聊天/主页按钮 | 缺设计稿时需补 |
| `APP-02-mutual-02` | 相互喜欢-空态 | 无匹配记录 | |
| `APP-02-mutual-03` | 相互喜欢-历史失效态 | 历史入口或已曝光回显展示通用失效提示 | 默认列表不展示取消喜欢导致的失效记录 |

---

## 3. 筛选与搜索

首版不提供搜索筛选；默认列表仅展示 `matchStatus=matched` 的有效匹配。`like_cancelled`、拉黑、注销、冻结、封禁、认证失效等导致的 `invalid` 记录不进入默认列表；若用户从历史会话、通知、已曝光卡片回流，则可展示通用失效提示。

---

## 4. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-02-PAGE-mutual-matches-FIELD-match-no` | 匹配编号 | string | 是 | 业务编号 | 前台不展示，仅追踪 | 无 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-mutual-matches-FIELD-match-status` | 匹配状态 | enum | 是 | `M02-ENUM-match-status` | 必须返回中文状态映射 | `matched` | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-mutual-matches-FIELD-match-source` | 匹配来源 | enum | 是 | `M02-ENUM-match-source` | 显示中文来源 | `double_like` | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-mutual-matches-FIELD-avatar` | 头像 | image | 是 | URL | 失效态可灰度展示 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-mutual-matches-FIELD-nickname` | 昵称 | string | 是 | 1-20 字 | 空值显示“用户” | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-mutual-matches-FIELD-age` | 年龄 | int | 否 | 18-60 | 空值不展示 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-mutual-matches-FIELD-height` | 身高 | int | 否 | 用户资料字段 | 空值不展示 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-mutual-matches-FIELD-match-time` | 匹配时间 | datetime | 是 | datetime | 展示相对时间或完整时间 | 无 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-mutual-matches-FIELD-can-chat` | 是否可聊天 | bool | 是 | true/false | 失效态必须 false | false | 否 | 普通 | PRD-02/03 |
| `APP-02-PAGE-mutual-matches-FIELD-invalid-reason` | 失效原因 | enum | 条件必填 | `M02-ENUM-invalid-reason` | 历史入口或已曝光回显返回 `matchStatus=invalid` 时必填；默认列表不返回 `invalid` | 无 | 否 | 普通 | PRD-02 |

---

## 5. 操作表

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响 |
|---------|--------|----------|----------|----------|--------|--------|------|
| `APP-02-PAGE-mutual-matches-ACT-chat` | 聊天 | `matchStatus=matched` 且 `canChat=true` | 已登录且核心准入开放 | 否 | 跳 PRD-03 会话页 | 女性保护或会话异常由 PRD-03 提示 | 进入普通聊天链路 |
| `APP-02-PAGE-mutual-matches-ACT-profile` | 查看主页 | `matchStatus=matched` | 已登录且核心准入开放 | 否 | 跳婚恋用户主页 | 目标失效时展示原因 | 可能生成访客 |
| `APP-02-PAGE-mutual-matches-ACT-invalid-view` | 查看失效提示 | `matchStatus=invalid` 且来自历史入口、已曝光回显或会话回流 | 已登录 | 否 | 展示通用“关系已失效”提示 | 无 | 无 |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 匹配来源 | `whisper_reply` | 来源标识 | 展示“悄悄话回复”来源 | 发送/回复由 PRD-03 定义 |
| 匹配状态 | invalid + `invalidReason=like_cancelled` | 默认列表 | 默认列表隐藏该记录；历史入口仅展示通用“关系已失效” | `M02-RULE-like-cancel` |
| 匹配状态 | invalid + 非取消喜欢原因 | 操作按钮 | 默认列表隐藏该记录；历史入口或已曝光回显隐藏聊天/主页按钮，展示通用失效提示 | `M02-RULE-relation-invalid` |
| PRD-03 会话状态 | 可用 | 聊天按钮 | 可点击 | 女性保护顺序由 PRD-03 处理 |
| 匹配状态 | matched | 婚恋用户主页动作 | 对方主页 `Yo` 按钮改为聊天 icon，底部主按钮改为聊天 icon + 聊天 | `M02-RULE-profile-action-after-match` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入 | 骨架屏 | 无 | — |
| 空态 | 无相互喜欢 | 空态文案 + 去看看推荐 | 跳推荐 | `M02-TXT-mutual-empty` |
| 有效态 | `matched` | 清晰卡片 + 聊天/主页 | 聊天/主页 | `M02-SM-mutual-match` |
| 失效态 | `invalid` 且来自历史入口、已曝光回显或会话回流 | 弱化卡片 + 通用失效提示 | 查看提示 | `M02-RULE-relation-invalid`、`M02-RULE-like-cancel` |
| 错误态 | 网络失败 | toast + 重试 | 重试 | 移动端全局态 |

---

## 8. 查询与列表

- **默认排序**：仅返回有效匹配，按匹配时间倒序；失效记录不参与默认列表排序与分页。
- **失效回流**：历史会话、通知或已曝光卡片需要解释状态时，可按关系编号查询单条记录并展示通用失效提示；前台不得直接展示“对方取消喜欢/不喜欢了”。
- **分页方式**：移动端加载更多，默认每页 20 条。
- **批量选择**：不支持。

---

## 9. 验收标准

```text
AC-ID: APP-02-AC-mutual-valid
Given 用户与对方匹配状态为 matched
When  打开相互喜欢列表
Then  展示清晰资料、匹配来源、匹配时间，并提供聊天和查看主页按钮

AC-ID: APP-02-AC-mutual-like-cancel-hidden
Given 匹配记录因任一方取消喜欢失效
When  打开相互喜欢列表
Then  默认列表不展示该记录，不展示聊天或主页按钮

AC-ID: APP-02-AC-mutual-invalid-history
Given 匹配记录因拉黑、注销、冻结、封禁或认证失效不可继续互动
When  用户从历史会话、通知或已曝光卡片回流访问该关系
Then  展示通用“关系已失效”提示，不展示聊天或主页按钮，后台保留真实失效原因

AC-ID: APP-02-AC-mutual-profile-action
Given 用户与对方匹配状态为 matched
When  用户从相互喜欢列表进入对方婚恋用户主页
Then  主页中的 Yo 按钮展示为聊天 icon，底部主按钮展示为聊天 icon + 聊天
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖规则 | `M02-RULE-match-generate` / `M02-RULE-relation-invalid` / `M02-RULE-like-cancel` | |
| 依赖主页联动 | `M02-RULE-profile-action-after-match` | 匹配后主页按钮变化 |
| 依赖消息 | PRD-03 会话页、女性保护机制 | |
