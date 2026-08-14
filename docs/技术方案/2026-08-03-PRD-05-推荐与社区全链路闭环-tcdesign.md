# PRD-05 推荐与社区全链路闭环技术方案设计

> 日期：2026-08-03
>
> 业务基线：`docs/需求文档/需求文档-正式版/定稿：05-推荐模块（朋友、社区与内容互动）/`
>
> UI 基线：`docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/`
>
> 历史方案：`docs/技术方案/2026-05-29-PRD-05-推荐模块（朋友、社区与内容互动）-tcdesign.md`

> **跨模块一致性更新（2026-08-07）**：聊天举报按最新版 PRD-03/TIM 契约处理。客户端只提交
> `sourceType/conversationNo/whisperNo/messageNo/timConversationId/timMessageId/timMsgKey` 白名单定位
> 字段，不提交用户 ID 或正文；PRD-03 服务端校验参与关系与 TIM 映射，PRD-05 创建工单并引用
> `community_report_evidence` 冻结证据。字段、权限和取证流程以
> `2026-07-31-消息、私信与通知中心-tcdesign.md` 为准。

## 1. 背景与目标

旧方案只覆盖帖子、评论、点赞、关注、举报和单页后台的最小闭环，且将话题放在字典、审核默认走人工、小程序保留本地 Mock/Storage 替代数据。此次按正式 PRD 升级为可运营、可治理、可审计、可恢复的完整社区闭环。

成功标准：

1. 数据库迁移保留现有数据、话题按 code 去重、重复执行不产生脏数据。
2. 普通动态、诚意贴、评论各自遵循正式机审状态机；外部服务异常按规则降级。
3. 后台六页按静态 Demo 逐页还原并接真实接口，业务操作均在详情抽屉闭环。
4. 小程序不再用本地发布回执、历史和隐藏偏好替代服务端事实。
5. PRD-03 消息域零修改；社区事件只落 Outbox，投递失败不回滚社区事务。

## 2. 范围

| 模块 | 是否涉及 | 说明 |
|---|---:|---|
| 管理后台前端 | 是 | 六页 Demo 还原、真实数据、兼容重定向 |
| 管理后台后端 | 是 | 查询、统计、详情、治理、导出、配置、审计 |
| 小程序后端 | 是 | 信息流、发布互动、个人社区数据、治理准入 |
| 小程序前端 | 是 | 保持蓝湖视觉，只替换数据源和补齐状态交互 |
| 数据库 | 是 | 058 增量迁移、备份、幂等执行 |
| 微信内容安全 | 是 | `msgSecCheck`、`mediaCheckAsync` 适配器与契约 Mock |
| PRD-03 消息域 | 否 | 只定义聊天举报解析端口与社区 Outbox 事件 |

## 3. 关键决策

| 内容 | 决策 | 来源 |
|---|---|---|
| 业务规则 | 以“定稿：05”正式 PRD 为准 | 用户确认 |
| 后台视觉与菜单 | 以静态 Demo 为准，保留正式全局壳 | 用户确认 |
| 动态显示文案 | 字典/配置接口返回，不在前端写中文状态映射 | 用户确认 |
| 普通动态机审 | 通过即公开并进入抽检池；不确定/异常转人工 | 正式 PRD |
| 诚意贴机审 | 通过后仍进入人工审核 | 正式 PRD |
| 评论机审 | 通过公开；异常提示重试，不进人工队列 | 正式 PRD |
| 聊天举报 | 仅信任 PRD-03 服务端解析；无实现时失败关闭 | 用户边界 |
| 事件通知 | 事务内写 Outbox，不实现消息消费者 | 用户边界 |
| 数据迁移 | 开发库直接执行，先备份后幂等复跑 | 用户确认 |

仓库技能中引用的旧架构文档和 2026-05-22 PRD-07 文档已不存在；本方案以当前 `TEAM_STANDARDS.md` 和 `2026-07-27-PRD-07推广裂变与邀请奖励重构-tcdesign.md` 为可用事实源。

## 4. 总体架构与调用链

```text
管理后台 React / 小程序 Taro
  → frontend/src/api/community.ts / miniapp/src/services/community.ts
  → /admin/community/* / /miniapp/community/*
  → Controller → Service → ServiceImpl
  → common 社区领域端口 → DAO → DAOImpl → Mapper
  → MySQL / Redis / OSS / 微信内容安全
```

`admin` 与 `miniapp` 不互相 import。内容安全、准入治理、状态迁移、审计和 Outbox 放在 `common`；两个端只做各自用例编排。

## 5. 数据库设计

### 5.1 变更清单

| 表 | 类型 | 目的 |
|---|---|---|
| `community_post` | 增量 | 业务编号、来源场景、机审、抽检、版本、审核与处理时间 |
| `community_comment` | 增量 | 业务编号、点赞数、机审结果、版本、审核时间 |
| `community_report` | 增量 | 字符串目标编号、举报编号、四类目标、证据状态/引用、合并、处罚与版本；聊天正文不直接存本表 |
| `community_report_evidence` | PRD-03 新增 | 聊天举报最小必要受控明文证据；只能在有效案件内按条访问并记录查看审计 |
| `community_topic` | 新增 | 独立话题、封面、场景、推荐、排序、启停与版本 |
| `community_comment_like` | 新增 | 评论点赞关系 |
| `community_post_draft` | 新增 | 用户+内容类型唯一草稿 |
| `community_view_history` | 新增 | 帖子浏览历史与最近访问时间 |
| `community_content_preference` | 新增 | “不看 TA 动态”作者级偏好 |
| `community_audit_record` | 新增 | 机审、人工审核、敏感查看、治理审计 |
| `community_user_restriction` | 新增 | 警告、限时禁言等用户社区限制 |
| `community_ip_block` | 新增 | IP/CIDR 封禁及生效区间 |
| `community_config_version` | 新增 | 配置快照、乐观锁、变更记录 |
| `community_export_task` | 新增 | 异步导出任务 |
| `community_event_outbox` | 新增 | 社区领域事件可靠出箱 |

所有新表包含 `id/create_time/update_time/created_by/updated_by/deleted`，实体继承 `BaseEntity`；唯一事实通过业务唯一键和逻辑删除活动标识控制。058 使用 `information_schema` 条件 DDL、幂等 `INSERT ... SELECT ... WHERE NOT EXISTS` 和确定性话题去重。

### 5.2 状态机

| 对象 | 状态 | 迁移规则 |
|---|---|---|
| 帖子 | `draft/pending_machine/pending_manual/published/rejected/deleted/blocked` | 普通帖机审通过→公开；诚意贴通过→人工；不确定/异常→人工；人工可通过/驳回；治理可下架/恢复 |
| 评论 | `pending_machine/published/rejected/deleted/blocked` | 机审通过→公开；拒绝→驳回；异常→请求失败重试，不入人工 |
| 举报 | `pending/processing/valid/invalid/merged` | 领取→处理中；处理→有效/无效；同目标同原因可合并 |
| Outbox | `pending/processing/sent/failed` | 社区事务写入；独立投递重试，不影响社区主事务 |

状态 code 和合法迁移固定；显示名、筛选项、处罚周期、举报原因和提示文案由 `/admin/community/meta`、`/miniapp/community/meta` 返回。

## 6. 后端设计

### 6.1 小程序接口

| 功能 | Method/URL | 关键返回 |
|---|---|---|
| 关注/同城/热门 | `GET /miniapp/community/posts` | 分页卡片、服务端互动状态、动态文案 |
| 话题列表/详情 | `GET /miniapp/community/topics`、`/{topicCode}` | 独立话题与内容分页 |
| 发布 | `POST /miniapp/community/posts` | `postNo/status/statusName/message` |
| 草稿 | `GET/PUT/DELETE /miniapp/community/drafts/{contentType}` | 服务端草稿及版本 |
| 评论/点赞/关注 | 现有路径兼容扩充 | 业务结果对象与真实计数 |
| 举报 | `POST /miniapp/community/reports` | `reportNo/status/statusName` |
| 个人社区数据 | `/users/{userNo}/posts`、`/me/posts` | 个人动态及审核状态 |
| 互动与关系 | `/me/interactions`、`/me/follows`、`/me/fans`、`/posts/{postNo}/interactors` | 服务端历史、统计与用户列表 |
| 浏览/隐藏 | `/me/view-history`、`/me/hidden-authors` | 服务端事实与幂等写入 |
| 元数据 | `GET /miniapp/community/meta` | 字典、配置、文案、能力开关 |

互动写操作统一校验登录、账号状态、三项认证、禁言和 IP；同城仅使用已审核资料城市。上传继续使用 OSS 直传票据，发布时后端校验对象归属、完成态和允许域名，只接受成功 URL。

### 6.2 管理端接口

| 功能 | Method/URL | 权限前缀 |
|---|---|---|
| 帖子列表/统计/详情/状态 | `/admin/community/posts/*` | `community:content:*`、`community:moments:*` |
| 评论列表/统计/详情/审核 | `/admin/community/comments/*` | `community:comment:*` |
| 举报列表/统计/详情/处理 | `/admin/community/reports/*` | `community:report:*` |
| 话题 CRUD/状态/历史 | `/admin/community/topics/*` | `community:topic:*` |
| 配置读取/版本保存/日志 | `/admin/community/configs/*` | `community:config:*` |
| 导出任务 | `/admin/community/exports/*` | 对应模块 `:export` |
| 元数据 | `GET /admin/community/meta` | 任一社区查看权限 |

Controller 均精确返回 `R<T>`，使用 `@RequirePermission`；状态写操作携带 `version`，0 行更新返回版本冲突。敏感上下文查看、配置和处罚均写 `community_audit_record`。

### 6.3 内容安全与治理

- `CommunityContentSecurityPort` 提供文本同步检查和图片异步检查；微信实现只依赖配置和 AccessToken 提供器，测试使用契约 Fake。
- 普通帖图片异步结果未返回前保持 `pending_machine`；明确通过才进入公开/人工下一态。
- 服务超时、不确定或回调验签失败按帖子进入人工复核；评论直接返回可重试错误。
- 账号冻结复用公共账号治理能力；社区禁言和 IP 封禁由统一写准入组件校验。
- 聊天举报通过 `ChatReportContextResolver` 端口获取可信上下文；输入只接收业务/TIM 定位编号白名单，PRD-03 实现负责校验参与关系、消息归属和映射并冻结最小必要证据。默认不可用实现返回明确业务错误，绝不读取客户端正文或信任客户端用户 ID。

## 7. 管理后台前端设计

| 页面 | 路由 | 页面权限 |
|---|---|---|
| 内容管理 | `/community/content` | `community:content:list` |
| 动态管理 | `/community/moments` | `community:moments:list` |
| 评论管理 | `/community/comment-audit` | `community:comment:list` |
| 举报管理 | `/community/reports` | `community:report:list` |
| 家园话题管理 | `/community/topics` | `community:topic:list` |
| 审核规则配置 | `/community/config` | `community:config:view` |

旧 `/community/posts`、`/community/comments`、`/community/configs` 使用路由重定向。六页共用统计卡、筛选区、数据表、状态标签、分页、空/错/权限态组件；表格行只显示“详情”，审核、下架、恢复、处罚等都在抽屉完成。配置页支持脏数据保护、版本保存、高风险二次确认与变更记录。

视觉只还原 Demo 业务内容区，正式 `Sidebar` 和 `AdminTopTabs` 保留。响应式采用内容区内部横向滚动，不让根页面溢出；键盘焦点、抽屉焦点陷阱、标签对比度和表单错误提示满足 WCAG 2.1 AA 基础要求。

## 8. 小程序前端设计

- 保留现有蓝湖布局、字号、间距、图标和路由，只替换 API、状态与交互实现。
- 图片逐项维护 `queued/uploading/success/failed`；失败可单图重试，发布只提交 `success`。
- 页面退出保存服务端草稿，再进入按用户和内容类型恢复；发布成功删除草稿。
- 发布结果页和“我的动态”读取 `postNo/status/statusName/message`，不伪造本地成功记录。
- 删除本地发布回执、浏览历史、作者隐藏等业务替代数据；短期 UI 状态仍可留在组件内。
- “申请认识”和匹配后私信只调用现有 PRD-03 稳定契约，不修改消息域源文件。

## 9. 权限、安全与配置

| 项 | 设计 |
|---|---|
| Token | `X-Auth-Token`，沿用管理端/小程序前缀 |
| RBAC | 六个菜单和查看/审核/处理/导出/配置等按钮权限 |
| 动态配置 | 字典/`app_config`/配置版本聚合到 meta，不在前端维护中文枚举 |
| 并发 | 话题、举报、内容、配置状态操作使用版本号 CAS |
| 敏感信息 | 举报上下文按权限脱敏，高敏查看写审计 |
| 凭证 | `application-dev.yml` 保留，微信密钥改读私有环境变量；已泄露凭证需外部轮换 |

## 10. PRD-07 推广裂变联动影响

| 项 | 设计 |
|---|---|
| 是否触发推广事件 | 否；社区互动不是 PRD-07 奖励事实 |
| 触发事件 | 无 |
| 幂等键 | 社区 Outbox 使用 `eventType + aggregateNo + eventVersion` |
| 失败策略 | 消息投递失败不回滚社区主事务；推广域不消费社区事件 |
| 关联数据 | 不写推广奖励、代理或结算表 |
| 测试覆盖 | 验证社区操作不产生推广奖励记录，且 Outbox 防重 |

## 11. 测试方案

复杂度为 L4：跨数据库迁移、第三方内容安全、后端状态机、六页后台与小程序主流程。

| 层级 | 覆盖 |
|---|---|
| L1 | 开发环境鉴权、社区主接口、后台六域接口、配置与导出冒烟 |
| L2 | Controller 路由、精确 `R<T>`、参数、权限、聊天举报失败关闭 |
| L3 | 状态机、并发、机审四态、准入、处罚、草稿、统计、Outbox、迁移辅助逻辑 |
| L4 | 管理后台六页与小程序发布/评论/举报/草稿/互动/个人动态闭环 |

## 12. 迁移、回滚与实施顺序

1. 先补失败测试，再实现 058 和领域模型。
2. 后端接口稳定后逐页接管理后台；每页截图验收后进入下一页。
3. 小程序逐链路替换本地替代数据并运行构建门禁。
4. 备份开发库，执行 058，核对数量与话题映射；二次执行验证幂等。
5. 回滚优先恢复备份并撤销新菜单；旧兼容路由和旧接口适配在迁移期保留。

## 13. 质量自检

- [x] 业务/UI 优先级与 PRD-03 边界已由用户确认
- [x] 六层架构、精确 `R<T>`、RBAC、审计和逻辑删除已覆盖
- [x] 管理后台六页、小程序真实接口、OSS、内容安全和动态配置已覆盖
- [x] PRD-07 联动影响已说明
- [x] L1-L4、迁移幂等、截图差异和回滚均有验收口径
