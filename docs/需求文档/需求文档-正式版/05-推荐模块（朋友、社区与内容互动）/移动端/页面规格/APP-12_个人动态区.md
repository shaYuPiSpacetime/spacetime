# 页面规格 - APP-05-PAGE-user-posts 个人动态区与他人主页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-06 | Codex | 创建页面规格 |
| 版本02 | 2026-07-06 | Codex | 明确本人/他人视图归属，并将诚意贴详情承接改为动态详情页诚意贴视图 |
| 版本03 | 2026-07-07 | Codex | 按移动端 Demo 审查补充本人视图审核态标签验收 |
| 版本04 | 2026-07-20 | Codex | 明确动态提交后不弹业务结果提示，待复核和驳回标识落在本人每条动态卡片 |
| 版本05 | 2026-07-21 | Codex | 合并原婚恋用户主页：他人视图同页展示已审核资料、认证、关系动作与公开动态，不再保留重复页面 |
| 版本06 | 2026-07-21 | Codex | 补回合并前的访客、喜欢、匹配及聊天权限拆分口径，明确女性保护不阻断进入会话 |

- **页面 ID**：`APP-05-PAGE-user-posts`
- **所属模块 PRD**：`模块PRD_APP-05_推荐模块（朋友、社区与内容互动）`
- **页面路由**：`/pages/user/posts`
- **入口来源**：我的动态、信息流/详情作者头像与昵称、喜欢/访客/互动用户列表
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端 / 技术方案**：`MVP-PAGE-057`、`MVP-PAGE-058`

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：本人查看动态审核状态并删除；他人主页查看已审核资料、关系动作与公开动态
- **页面类型**：本人列表页 / 他人主页

## 2. 布局（给 UI）

### 2.1 整体布局

```
┌────────────────────┐
│ 本人摘要 / 他人资料与认证 │
│ 关注·粉丝·获赞 / 关系动作 │
├────────────────────┤
│ 动态列表 / 审核态标签  │
└────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 用户摘要 | 顶部 | 本人展示头像、昵称和动态统计；他人展示 PRD-01 已审核资料、认证与可见标签 | 否 | 否 |
| 关系操作 | 他人主页资料区下方 | 展示喜欢/取消喜欢；未建立互动关系展示“申请认识”，已建立关系且 `canEnterConversation=true` 时展示消息动作并直达 PRD-03；同时展示关注态 | 否 | 否 |
| 动态列表 | 主体 | 内容卡片与状态标签 | 否 | 是 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 删除确认 | 本人内容点击删除 | 中央弹窗 | 确认删除 | 取消/确认 |
| 更多操作弹窗 | 他人内容点击更多 | 底部弹窗 | 举报 | 点击取消/遮罩 |

### 2.4 UI 画板拆分（必填）

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-05-user-posts-01` | 个人动态区-本人 | 审核态和删除 | |
| `APP-05-user-posts-02` | 个人动态区-他人主页 | 已审核资料、认证、关系动作与公开动态 | 复用现有他人主页 UI，完整覆盖 |
| `APP-05-user-posts-03` | 个人动态区-空态 | 无动态 | |

### 2.5 编辑控件口径

本人已发布内容仅支持删除；不支持在本页编辑正文或图片。

## 3. 筛选与搜索

### 3.1 搜索

本页不提供搜索。

### 3.2 筛选条件

| 筛选 ID | 筛选名 | 类型 | 选项来源 | 是否多选 | 默认值 | 是否可清除 |
|---------|--------|------|----------|----------|--------|------------|
| `APP-05-PAGE-user-posts-FILTER-owner` | 用户 | 路由参数 | 用户主页/我的页 | 否 | 当前用户 | 否 |

### 3.3 筛选交互

- 本人视角展示审核中、驳回、公开和已删除提示；他人视角只展示公开内容。

## 4. 字段表

### 4.1 列表字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-05-PAGE-user-posts-FIELD-content-summary` | 内容摘要 | string | 是 | 0-120 字 | 已审核或本人可见状态 | 无 | 否 | 普通 | 社区内容 |
| `APP-05-PAGE-user-posts-FIELD-images` | 图片 | image[] | 否 | 0-9 张 | 缩略图展示 | 无 | 否 | 普通 | 社区内容 |
| `APP-05-PAGE-user-posts-FIELD-status` | 状态 | enum | 是 | `M05-ENUM-content-status` | 他人只展示 `published` | `published` | 否 | 普通 | 社区内容 |
| `APP-05-PAGE-user-posts-FIELD-topic` | 话题 | enum | 否 | `M05-CFG-topic-dict` | 下线展示历史名 | 无 | 否 | 普通 | 后台配置 |
| `APP-05-PAGE-user-posts-FIELD-publish-time` | 发布时间 | datetime | 是 | yyyy-MM-dd HH:mm | 相对时间展示 | 无 | 否 | 普通 | 社区内容 |

### 4.2 他人主页字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-05-PAGE-user-posts-FIELD-profile` | 个人资料 | json | 是 | PRD-01 已审核且允许公开字段 | 按隐私范围返回 | 无 | 否 | 敏感；按字段脱敏 | PRD-01 |
| `APP-05-PAGE-user-posts-FIELD-certifications` | 认证信息 | json | 是 | PRD-01 可公开认证徽章 | 不展示审核中或驳回细节 | 空 | 否 | 普通 | PRD-01 |
| `APP-05-PAGE-user-posts-FIELD-relation-status` | 互动关系 | enum | 是 | 未建立/已建立 | 服务端最终状态 | 未建立 | 否 | 普通 | PRD-02 |
| `APP-05-PAGE-user-posts-FIELD-like-status` | 喜欢状态 | enum | 是 | 未喜欢/已喜欢 | 服务端最终状态 | 未喜欢 | 否 | 普通 | PRD-02 |
| `APP-05-PAGE-user-posts-FIELD-match-status` | 匹配状态 | enum | 是 | `M02-SM-mutual-match` | 以 PRD-02 有效匹配关系为准 | 未匹配 | 否 | 普通 | PRD-02 |
| `APP-05-PAGE-user-posts-FIELD-can-enter-conversation` | 可进入会话 | bool | 是 | true/false | 仅关系或账号失效时为 false；女性保护不得置 false | false | 否 | 普通 | PRD-02 |
| `APP-05-PAGE-user-posts-FIELD-can-send` | 当前可发送 | bool | 条件必填 | true/false | 会话可进入时由 PRD-03 返回；仅用于会话内发送控制 | false | 否 | 普通 | PRD-03 |
| `APP-05-PAGE-user-posts-FIELD-protect-status` | 女性保护状态 | json | 否 | PRD-03 定义 | 用于进入聊天后的输入区提示，不在主页阻断入口 | 无 | 否 | 普通 | PRD-03 |
| `APP-05-PAGE-user-posts-FIELD-follow-status` | 关注状态 | enum | 是 | 未关注/已关注 | 引用社区关注关系 | 未关注 | 否 | 普通 | PRD-05 |
| `APP-05-PAGE-user-posts-FIELD-stats` | 社区统计 | json | 是 | 关注数/粉丝数/获赞数 | 与列表、互动中心同源 | 0 | 否 | 普通 | PRD-05 |

#### 列表字段附加属性

| 字段 ID | 默认排序 | 是否可排序 | 列宽 | 是否固定 | 是否可拖拽调整列宽 | 溢出处理 |
|---------|----------|------------|------|----------|--------------------|----------|
| `APP-05-PAGE-user-posts-FIELD-publish-time` | desc | 否 | 自适应 | 否 | 否 | 省略号 |

### 4.3 详情/表单字段

详情由 `APP-05-PAGE-post-detail` 承接；当内容类型为 `sincere_post` 时展示诚意贴视图。

## 5. 操作表

### 5.1 行级操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响（副作用） |
|---------|--------|----------|----------|----------|--------|--------|----------------|
| `APP-05-PAGE-user-posts-ACT-open-detail` | 查看详情 | 内容可见 | `GLB-ROLE-app-user` | 否 | 跳转详情 | `M05-ERR-content-not-found` | 增加浏览 |
| `APP-05-PAGE-user-posts-ACT-delete` | 删除 | 本人内容且状态可删除 | 作者本人 | 是 | 内容状态为 `deleted` | `M05-ERR-content-not-found` | 前台不可见 |
| `APP-05-PAGE-user-posts-ACT-report` | 举报 | 他人公开内容 | `M05-RULE-report-gate` | 否 | 打开举报弹窗 | `M05-ERR-login-required` | 生成举报 |

### 5.2 批量操作

本页不支持批量操作。

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-05-PAGE-user-posts-ACT-refresh` | 刷新 | 下拉 | 页面加载成功 | `GLB-ROLE-app-user` | 否 | 列表刷新 | 网络错误 toast |
| `APP-05-PAGE-user-posts-ACT-open-profile` | 进入他人主页 | 页面加载 | 目标对象可见 | `GLB-ROLE-app-user` | 否 | 展示资料、关系动作与公开动态，并通知 PRD-02 按 30 分钟窗口写访客展示记录、累计实际 PV | 对象不可用时返回来源页 |
| `APP-05-PAGE-user-posts-ACT-like` | 喜欢 | 他人主页资料区 | 未喜欢 | `M01-RULE-core-access` | 否 | 切换为已喜欢；满足条件时由 PRD-02 建立匹配 | 引用 PRD-02 错误码 |
| `APP-05-PAGE-user-posts-ACT-cancel-like` | 取消喜欢 | 他人主页资料区 | 已喜欢 | `M01-RULE-core-access` | 是 | 撤销爱心来源；存在其他有效来源时匹配继续有效 | 引用 PRD-02 错误码 |
| `APP-05-PAGE-user-posts-ACT-apply-acquaintance` | 申请认识 | 他人主页资料区 | 未建立互动关系且目标可见 | `M05-RULE-community-greeting-entry` | 否 | 进入 `APP-05-PAGE-community-greeting` | 复用 PRD-03/通用反馈 |
| `APP-05-PAGE-user-posts-ACT-chat` | 发消息 | 他人主页资料区 | 已建立互动关系且 `canEnterConversation=true` | `M05-RULE-community-contact-routing`、`M03-RULE-private-chat-open` | 否 | 直接进入 `APP-03-PAGE-private-chat`；是否可发送由 `canSend/protectStatus` 决定 | 关系或账号失效时不进入会话 |
| `APP-05-PAGE-user-posts-ACT-follow` | 关注/取消关注 | 他人主页资料区 | 目标可见 | `M05-RULE-interaction-gate` | 否 | 更新关注态与统计 | 网络错误 toast |

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 用户视角 | 进入页面 | 状态展示 | 本人展示全部可见状态，他人只展示公开 | 隐私与审核口径 |
| 删除操作 | 确认删除 | 列表 | 从列表移除或显示已删除 | 作者本人 |
| 互动关系 | 对方回复并建立关系 | 页面主操作 | 隐藏“申请认识”，展示消息动作并直达 PRD-03 | 不经过社区私信中转页 |
| `canEnterConversation` | 关系或账号状态变化 | 消息动作 | `true` 时允许进入会话，`false` 时隐藏或禁用并展示服务端原因 | 女性保护不得将其置为 `false` |
| `canSend/protectStatus` | 进入 PRD-03 会话 | 会话输入区 | 由 PRD-03 决定发送能力并展示保护提示 | 主页只透传，不自行计算 |

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入 | 骨架屏 | 无 | — |
| 空态（无数据） | 无动态 | 本人显示发布引导；他人保留资料区并在动态区展示“暂无数据” | 返回/发布 | — |
| 空态（搜索无结果） | 本页无搜索 | 本节不适用 | — | — |
| 错误态（网络） | 请求超时 | toast + 重试 | 重试 | `M05-ERR-*` |
| 无权限态 | 未登录 | 登录引导 | 去登录 | `GLB-ROLE-app-user` |
| 业务态-pending_machine/pending_manual | 本人内容待复核 | 每条动态卡片展示“待复核”标识 | 查看 | `M05-SM-content-audit` |
| 业务态-rejected | 本人内容驳回 | 每条动态卡片展示“已驳回”标识和原因入口 | 查看原因/修改后重提 | `M05-SM-content-audit` |
| 业务态-published | 内容公开 | 正常展示 | 查看/举报 | `M05-SM-content-audit` |
| 业务态-未匹配 | 无有效匹配 | 保留喜欢与申请认识操作，不展示直达消息动作 | 喜欢/申请认识 | PRD-02/PRD-03 |
| 业务态-已匹配 | 存在有效匹配且 `canEnterConversation=true` | 展示消息动作并直达会话 | 发消息/取消喜欢 | `M02-RULE-match-lifecycle` |
| 业务态-女性保护 | `canEnterConversation=true` 且 `canSend=false` | 主页仍展示消息动作 | 进入会话查看保护提示 | `M03-RULE-female-protection` |
| 业务态-对象失效 | 拉黑、冻结、注销、封禁或认证失效 | 不继续展示主页，返回来源页 | 返回 | `M02-RULE-relation-invalid` |
| 降级态 | 用户资料缺失 | 默认头像昵称 | 继续浏览 | PRD-01 |

## 8. 查询与列表

- **默认排序**：发布时间倒序
- **可选排序**：无
- **分页**：默认 20 条
- **分页方式**：加载更多
- **列表轮询/实时刷新**：不轮询
- **批量选择**：不支持
- **列表为空时的引导**：本人显示发布入口，他人显示空态

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-05-AC-user-posts-owner` | 本人查看动态状态 | 正常 | P1 |
| `APP-05-AC-user-posts-audit-tags` | 本人动态展示机审中、待复核、驳回、已公开标签 | 正常 | P1 |
| `APP-05-AC-user-posts-other` | 他人仅看公开内容 | 正常 | P1 |
| `APP-05-AC-user-posts-profile-merged` | 他人主页展示资料、认证和公开动态 | 正常 | P0 |
| `APP-05-AC-user-posts-contact-route` | 申请认识与直达私信按关系状态互斥 | 正常 | P0 |
| `APP-05-AC-user-posts-relation-actions` | 进入主页写访客，并按 PRD-02 完成喜欢、取消喜欢与匹配状态切换 | 正常 | P0 |
| `APP-05-AC-user-posts-chat-permission` | 女性保护仅影响会话内发送，不阻断进入会话 | 正常 | P0 |
| `APP-05-AC-user-posts-delete` | 本人删除动态 | 正常 | P1 |

```
AC-ID: APP-05-AC-user-posts-other
Given 用户打开他人个人动态区
When  该用户存在不同审核状态内容
Then  页面只展示状态为 `published` 的内容
```

```
AC-ID: APP-05-AC-user-posts-contact-route
Given 用户打开他人主页
When  互动关系未建立或已建立
Then  未建立时只展示“申请认识”并进入打招呼页；已建立时隐藏“申请认识”，消息动作直接进入 PRD-03 私信对话
```

```
AC-ID: APP-05-AC-user-posts-chat-permission
Given 双方关系有效且当前用户命中女性保护发送限制
When  当前用户点击他人主页的消息动作
Then  canEnterConversation=true 并进入 PRD-03 会话，由 PRD-03 以 canSend=false、protectStatus 限制发送
```

```
AC-ID: APP-05-AC-user-posts-audit-tags
Given 内容作者打开本人动态区
When  列表存在 `pending_machine`、`pending_manual`、`rejected` 或 `published` 内容
Then  每条内容展示对应审核态标签；他人视图不得展示非公开内容
```

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块状态机 | `M05-SM-content-audit` | 内容状态 |
| 依赖的其他页面 | `APP-05-PAGE-post-detail` | 动态详情，含诚意贴视图 |
| 依赖的其他页面 | `APP-05-PAGE-report-modal` | 举报 |
| 依赖的其他页面 | `APP-05-PAGE-community-greeting` | 未建立互动关系时申请认识 |
| 依赖的其他页面 | `APP-03-PAGE-private-chat` | 已建立互动关系后直接进入会话 |
