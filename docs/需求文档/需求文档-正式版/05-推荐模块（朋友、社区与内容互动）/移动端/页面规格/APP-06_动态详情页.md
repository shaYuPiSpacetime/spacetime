# 页面规格 - APP-05-PAGE-post-detail 动态详情页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-06 | Codex | 创建页面规格 |
| 版本02 | 2026-07-06 | Codex | 增加 `contentType=sincere_post` 诚意贴视图承接 |
| 版本03 | 2026-07-07 | Codex | 按移动端 Demo 审查明确图片预览与评论回复入口验收 |
| 版本04 | 2026-07-20 | Codex | 按蓝湖最终稿增加申请认识和互动人数，评论排序改为最新/最早；删除收藏；图片预览无需独立画板 |

- **页面 ID**：`APP-05-PAGE-post-detail`
- **所属模块 PRD**：`模块PRD_APP-05_推荐模块（朋友、社区与内容互动）`
- **页面路由**：`/pages/qianxun/community/post-detail`
- **入口来源**：社区信息流、话题详情、悦目页、诚意贴列表页、个人动态区
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端 / 技术方案**：`MVP-PAGE-006`

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：查看完整动态或诚意贴内容并进行申请认识、点赞、评论、举报
- **页面类型**：详情页

## 2. 布局（给 UI）

### 2.1 整体布局

```
┌────────────────────┐
│ 返回       更多      │
├────────────────────┤
│ 作者信息 + 关注按钮   │
│ 正文 / 图片 / 话题    │
├────────────────────┤
│ 申请认识 点赞 评论     │
├────────────────────┤
│ 评论输入框 + 评论列表  │
└────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 作者信息 | 顶部 | 头像、昵称、时间、关注按钮 | 否 | 否 |
| 内容区 | 主体 | 正文、图片、话题；诚意贴视图额外展示标题 | 否 | 否 |
| 互动区 | 内容下方 | 申请认识、互动人数、点赞、评论、举报入口 | 否 | 否 |
| 评论区 | 底部 | 评论输入框、评论列表 | 否 | 是 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 图片预览 | 点击图片 | 全屏 | 图片轮播 | 点击关闭 |
| 更多操作弹窗 | 点击更多 | 底部弹窗 | 分享、关注/取消关注、不看 TA 动态/取消不看、举报 | 点击取消/遮罩 |
| 删除确认 | 作者点击删除 | 中央弹窗 | 确认删除 | 取消/确认 |

### 2.4 UI 画板拆分（必填）

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-05-post-detail-01` | 动态详情-主页面 | 内容详情和评论 | |
| `APP-05-post-detail-02` | 动态详情-评论输入 | 评论输入和回复态 | |
| `APP-05-post-detail-03` | 动态详情-内容下架 | 不可见状态 | |
| `APP-05-post-detail-05` | 动态详情-诚意贴视图 | `contentType=sincere_post` 时的标题、长文正文和评论 | 承接诚意贴列表点击 |

图片全屏轮播复用客户端通用图片预览组件，属于运行态能力，不单独要求 UI 画板。

### 2.5 编辑控件口径

| 区域 | 展现形式 | 编辑控件 | 新增/删除方式 | 保存方式 |
|------|----------|----------|----------------|----------|
| 评论 | 输入栏 | 单行/多行输入 | 发送/清空 | 提交即保存 |
| 本人动态 | 操作弹窗 | 删除按钮 | 删除 | 二次确认后保存 |

## 3. 筛选与搜索

### 3.1 搜索

本页不提供搜索。

### 3.2 筛选条件

| 筛选 ID | 筛选名 | 类型 | 选项来源 | 是否多选 | 默认值 | 是否可清除 |
|---------|--------|------|----------|----------|--------|------------|
| `APP-05-PAGE-post-detail-FILTER-comment-sort` | 评论排序 | 切换 | 最新/最早 | 否 | 最新 | 否 |

### 3.3 筛选交互

- 评论排序切换后只刷新评论区，不重载主体内容。

## 4. 字段表

### 4.1 列表字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-05-PAGE-post-detail-FIELD-comment-author` | 评论作者 | string | 是 | 1-20 字 | 昵称已审核 | 平台用户 | 否 | 普通 | PRD-01 用户资料 |
| `APP-05-PAGE-post-detail-FIELD-comment-content` | 评论内容 | string | 是 | 1-500 字 | 内容安全校验 | 无 | 作者可删除不可编辑 | 普通 | 用户填写 |
| `APP-05-PAGE-post-detail-FIELD-comment-time` | 评论时间 | datetime | 是 | yyyy-MM-dd HH:mm | 前端相对时间展示 | 无 | 否 | 普通 | 系统生成 |
| `APP-05-PAGE-post-detail-FIELD-comment-status` | 评论状态 | enum | 是 | `M05-ENUM-comment-status` | 仅公开评论展示 | `published` | 否 | 普通 | 系统生成 |

#### 列表字段附加属性

| 字段 ID | 默认排序 | 是否可排序 | 列宽 | 是否固定 | 是否可拖拽调整列宽 | 溢出处理 |
|---------|----------|------------|------|----------|--------------------|----------|
| `APP-05-PAGE-post-detail-FIELD-comment-time` | desc | 否 | 自适应 | 否 | 否 | 换行 |

### 4.2 详情/表单字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-05-PAGE-post-detail-FIELD-author` | 作者 | json | 是 | 头像/昵称/认证摘要 | 缺失展示默认 | 无 | 否 | 普通 | PRD-01 用户资料 |
| `APP-05-PAGE-post-detail-FIELD-content-type` | 内容类型 | enum | 是 | `M05-ENUM-content-type` | 必须为公开可见类型 | `community_post` | 否 | 普通 | 社区内容 |
| `APP-05-PAGE-post-detail-FIELD-sincere-title` | 诚意贴标题 | string | 条件必填 | 1-40 字 | `contentType=sincere_post` 时展示 | 无 | 否 | 普通 | 社区内容 |
| `APP-05-PAGE-post-detail-FIELD-content` | 正文 | string | 是 | 动态 1-500 字；诚意贴不少于 20 字 | 已审核公开 | 无 | 否 | 普通 | 社区内容 |
| `APP-05-PAGE-post-detail-FIELD-images` | 图片 | image[] | 否 | 0-9 张 | 私有 URL | 无 | 否 | 普通 | 社区内容 |
| `APP-05-PAGE-post-detail-FIELD-topic` | 话题 | enum | 否 | `M05-CFG-topic-dict` | 下线话题展示历史名 | 无 | 否 | 普通 | 后台配置 |
| `APP-05-PAGE-post-detail-FIELD-like-count` | 点赞数 | int | 是 | >=0 | 系统计算 | 0 | 否 | 普通 | 系统计算 |
| `APP-05-PAGE-post-detail-FIELD-interaction-count` | 互动人数 | int | 是 | >=0 | 点赞用户与评论用户合并去重 | 0 | 否 | 普通 | 系统计算 |
| `APP-05-PAGE-post-detail-FIELD-comment-input` | 评论输入 | string | 否 | 1-500 字 | 内容安全校验 | 空 | 提交前可编辑 | 普通 | 用户填写 |

## 5. 操作表

### 5.1 行级操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响（副作用） |
|---------|--------|----------|----------|----------|--------|--------|----------------|
| `APP-05-PAGE-post-detail-ACT-delete-comment` | 删除评论 | 本人评论且状态 `published` | 评论作者 | 是 | 评论不可见 | `M05-ERR-content-not-found` | 评论数 -1 |
| `APP-05-PAGE-post-detail-ACT-reply-comment` | 回复评论 | 评论状态 `published` | `M05-RULE-interaction-gate` | 否 | 输入框进入回复态 | `M05-ERR-core-access-required` | 评论回复 |

### 5.2 批量操作

本页不支持批量操作。

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-05-PAGE-post-detail-ACT-like` | 点赞/取消点赞 | 互动区 | 内容公开 | `M05-RULE-interaction-gate` | 否 | 点赞态更新 | `M05-ERR-core-access-required` |
| `APP-05-PAGE-post-detail-ACT-comment` | 发表评论 | 评论输入 | 内容公开且输入合法 | `M05-RULE-interaction-gate` | 否 | 评论公开或提示失败 | 内容安全失败 |
| `APP-05-PAGE-post-detail-ACT-follow` | 关注作者 | 作者区 | 作者不是本人 | `M05-RULE-interaction-gate` | 否 | 关注态更新 | `M05-ERR-core-access-required` |
| `APP-05-PAGE-post-detail-ACT-apply-acquaintance` | 申请认识 | 作者区/底部操作栏 | 作者不是本人且目标可见 | `M05-RULE-community-greeting-entry` | 否 | 进入社区打招呼页 | `M05-ERR-community-target-unavailable` |
| `APP-05-PAGE-post-detail-ACT-open-interactors` | 查看互动用户 | 互动人数 | 内容公开且互动人数大于 0 | `GLB-ROLE-app-user` | 否 | 进入点赞/评论互动用户列表 | `M05-ERR-content-not-found` |
| `APP-05-PAGE-post-detail-ACT-preview-image` | 预览图片 | 内容图片区 | 图片可见 | `GLB-ROLE-app-user` | 否 | 打开图片预览轮播 | 图片加载失败 |
| `APP-05-PAGE-post-detail-ACT-report` | 举报 | 更多弹窗 | 内容公开 | `M05-RULE-report-gate` | 否 | 打开举报弹窗 | `M05-ERR-login-required` |
| `APP-05-PAGE-post-detail-ACT-delete-post` | 删除动态 | 更多弹窗 | 本人动态 | 作者本人 | 是 | 返回列表且内容不可见 | `M05-ERR-content-not-found` |

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 评论输入 | 发送 | 评论列表/评论数 | 机审通过后插入列表并 +1 | `M05-SM-comment-audit` |
| 点赞状态 | 点击 | 点赞数 | +1 或 -1 | 幂等 |
| 内容状态 | 后台下架 | 页面主体 | 展示不可见状态 | `M05-SM-content-audit` |

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入 | 骨架屏 | 无 | — |
| 空态（无数据） | 无评论 | 评论区空态 | 发表评论 | — |
| 空态（搜索无结果） | 本页无搜索 | 本节不适用 | — | — |
| 错误态（网络） | 请求超时 | toast + 重试 | 重试 | `M05-ERR-*` |
| 无权限态 | 未登录 | 登录引导 | 去登录 | `GLB-ROLE-app-user` |
| 业务态-published | 内容公开 | 正常展示 | 点赞、评论、举报 | `M05-SM-content-audit` |
| 业务态-blocked/deleted | 内容不可见 | 不可见提示 | 返回 | `M05-SM-content-audit` |
| 降级态 | 图片加载失败 | 占位图 | 继续阅读 | — |

## 8. 查询与列表

- **默认排序**：评论按发布时间倒序
- **可选排序**：最新/最早
- **分页**：评论默认 20 条
- **分页方式**：加载更多
- **列表轮询/实时刷新**：不轮询
- **批量选择**：不支持
- **列表为空时的引导**：发表评论

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-05-AC-post-detail-show` | 展示公开动态详情 | 正常 | P0 |
| `APP-05-AC-post-detail-sincere-view` | 诚意贴列表点击后展示诚意贴视图 | 正常 | P0 |
| `APP-05-AC-post-detail-comment` | 评论机审通过后公开 | 正常 | P0 |
| `APP-05-AC-post-detail-reply` | 点击评论回复进入回复态 | 正常 | P1 |
| `APP-05-AC-post-detail-preview` | 点击图片打开预览 | 正常 | P0 |
| `APP-05-AC-post-detail-blocked` | 已下架内容不可见 | 异常 | P0 |
| `APP-05-AC-post-detail-report` | 已登录用户可举报内容 | 正常 | P0 |

```
AC-ID: APP-05-AC-post-detail-comment
Given 用户满足 `M05-RULE-interaction-gate` 且动态状态为 `published`
When  输入合法评论并提交
Then  评论按 `M05-SM-comment-audit` 处理，机审通过后出现在评论列表并触发评论事件
```

```
AC-ID: APP-05-AC-post-detail-reply
Given 评论状态为 `published`
When  用户点击该评论的回复
Then  评论输入框进入回复态并展示被回复对象，提交后按 `M05-SM-comment-audit` 处理
```

```
AC-ID: APP-05-AC-post-detail-sincere-view
Given 用户已登录且诚意贴状态为 `published`
When  从诚意贴列表点击卡片
Then  进入 `APP-05-PAGE-post-detail`，按 `contentType=sincere_post` 展示标题、长文正文、图片、评论和举报入口
```

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块枚举 | `M05-ENUM-content-type` | 区分动态与诚意贴视图 |
| 依赖的模块规则 | `M05-RULE-sincere-post` | 诚意贴字段与公开规则 |
| 依赖的模块状态机 | `M05-SM-content-audit` | 内容状态 |
| 依赖的模块状态机 | `M05-SM-comment-audit` | 评论状态 |
| 依赖的模块规则 | `M05-RULE-report-gate` | 举报准入 |
| 依赖的其他页面 | `APP-05-PAGE-report-modal` | 举报弹窗 |

## 11. 蓝湖最终补充口径

- 作者摘要展示出生年、城市、职业、活跃描述；“申请认识”是 `greeting` 的 UI 别名，进入 `APP-05-PAGE-community-greeting`。
- 互动人数按点赞用户与评论用户合并去重，点击后进入 `APP-05-PAGE-post-interactors`。
- 更多操作按 UI 稿定义分享、关注/取消关注、不看 TA 动态/取消不看和举报；不提供单条内容屏蔽。
- 本期不提供收藏能力；详情、列表、接口和统计均不出现收藏入口或字段。

验收：评论排序只提供最新/最早；互动人数与互动用户列表同源；“不看 TA 动态”只改变作者级内容偏好，不等于拉黑。
