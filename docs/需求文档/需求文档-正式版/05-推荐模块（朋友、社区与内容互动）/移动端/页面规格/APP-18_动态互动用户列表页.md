# 页面规格 - APP-05-PAGE-post-interactors 动态互动用户列表页

> 承接动态详情中的点赞、评论互动用户列表及互动人数入口。蓝湖来源为“千寻互动-互动-评论/点赞通用”。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-07-20 | Codex | 按蓝湖最终稿收敛为点赞/评论通用列表与通用空态 |
| 版本01 | 2026-07-20 | Codex | 根据蓝湖反向缺口新增动态互动用户列表规格 |

## 1. 页面定位

- **入口来源**：动态详情的互动人数、点赞数或评论人数。
- **核心任务**：按点赞或评论查看互动用户，并进入用户主页或执行关注。
- **数据口径**：点赞列表按有效点赞关系返回；评论列表按用户去重并保留最近一次评论摘要和互动时间。

## 2. UI 画板拆分

| 画板 ID | 画板名称 | 必须展示内容 | 蓝湖复用位置 | 优先级 |
|---------|----------|--------------|--------------|--------|
| `APP-05-post-interactors-01` | 点赞用户列表 | 点赞人数、用户列表、关注态 | 千寻互动-互动-点赞通用 | P1 |
| `APP-05-post-interactors-03` | 评论用户列表 | 去重评论人数、最近评论摘要 | 千寻互动-互动-评论通用 | P1 |
| `APP-05-post-interactors-04` | 互动用户通用空态 | 通用空态插图、当前 Tab 文案 | 动态情绪-暂无评论及通用空态 | P1 |

## 3. 字段与操作

| 字段 ID | 字段名 | 类型 | 规则 |
|---------|--------|------|------|
| `APP-05-PAGE-post-interactors-FIELD-post-id` | 动态 ID | string | 必须为可访问内容 |
| `APP-05-PAGE-post-interactors-FIELD-interaction-type` | 互动类型 | enum | `liked/commented` |
| `APP-05-PAGE-post-interactors-FIELD-user-summary` | 用户摘要 | object | 头像、昵称、资料摘要、关注态 |
| `APP-05-PAGE-post-interactors-FIELD-interaction-time` | 最近互动时间 | datetime | 同一用户按最近一次去重 |
| `APP-05-PAGE-post-interactors-FIELD-comment-summary` | 最近评论摘要 | string | 仅评论 Tab 展示，内容失效时隐藏 |
| `APP-05-PAGE-post-interactors-FIELD-interaction-count` | 互动人数 | int | 与详情统计同源 |

| 操作 ID | 操作 | 前置条件 | 结果 |
|---------|------|----------|------|
| `APP-05-PAGE-post-interactors-ACT-change-tab` | 切换点赞/评论 | 内容可访问 | 列表刷新 |
| `APP-05-PAGE-post-interactors-ACT-open-profile` | 查看用户主页 | 用户可见 | 进入婚恋用户主页 |
| `APP-05-PAGE-post-interactors-ACT-follow` | 关注/取消关注 | 满足互动准入 | 更新最终关注态 |

## 4. 状态与验收

| 状态 | 页面表现 |
|------|----------|
| 点赞空态 | 复用通用空态结构，文案“暂无点赞” |
| 评论空态 | 复用通用空态结构，文案“暂无评论” |
| 内容不可见 | 终止加载并返回来源页 |

| 验收 ID | 验收标准 | 优先级 |
|---------|----------|--------|
| `APP-05-AC-post-interactors-count` | 列表人数与动态详情统计一致 | P1 |
| `APP-05-AC-post-interactors-empty` | 点赞和评论使用同一空态结构，只替换当前 Tab 文案 | P1 |
| `APP-05-AC-post-interactors-dedupe` | 评论用户按用户去重并保留最近互动时间 | P1 |

## 5. 关联

- 模块规则：`M05-RULE-post-interactors`。
- 来源页面：`APP-05-PAGE-post-detail`。
- 目标页面：`APP-05-PAGE-user-profile`。
