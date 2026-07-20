# 页面规格 - APP-05-PAGE-post-interactors 动态互动用户列表页

> 承接动态详情中的点赞、收藏、评论互动用户列表及统计入口。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-20 | Codex | 根据蓝湖反向缺口新增动态互动用户列表规格 |

## 1. 页面定位

- **入口来源**：动态详情的点赞数、收藏数、评论人数。
- **核心任务**：按互动类型查看用户列表，并进入用户主页或执行关注。
- **隐私边界**：收藏用户列表仅内容作者本人可见；普通浏览者只看到本人收藏态和公开收藏数（若产品配置展示）。

## 2. UI 画板拆分

| 画板 ID | 画板名称 | 必须展示内容 | 优先级 |
|---------|----------|--------------|--------|
| `APP-05-post-interactors-01` | 点赞用户列表 | 点赞人数、用户列表、关注态 | P1 |
| `APP-05-post-interactors-02` | 收藏用户列表 | 收藏人数、作者权限提示、用户列表 | P1 |
| `APP-05-post-interactors-03` | 评论用户列表 | 去重评论人数、最近评论摘要 | P1 |
| `APP-05-post-interactors-04` | 互动用户空态 | 当前类型暂无互动 | P1 |

## 3. 字段与操作

| 字段 ID | 字段名 | 类型 | 规则 |
|---------|--------|------|------|
| `APP-05-PAGE-post-interactors-FIELD-post-id` | 动态 ID | string | 必须为可访问内容 |
| `APP-05-PAGE-post-interactors-FIELD-interaction-type` | 互动类型 | enum | `liked/favorited/commented` |
| `APP-05-PAGE-post-interactors-FIELD-user-summary` | 用户摘要 | object | 头像、昵称、资料摘要、关注态 |
| `APP-05-PAGE-post-interactors-FIELD-interaction-time` | 最近互动时间 | datetime | 同一用户按最近一次去重 |
| `APP-05-PAGE-post-interactors-FIELD-interaction-count` | 互动人数 | int | 与详情统计同源 |

| 操作 ID | 操作 | 前置条件 | 结果 |
|---------|------|----------|------|
| `APP-05-PAGE-post-interactors-ACT-change-tab` | 切换互动类型 | 有权限查看 | 列表刷新 |
| `APP-05-PAGE-post-interactors-ACT-open-profile` | 查看用户主页 | 用户可见 | 进入婚恋用户主页 |
| `APP-05-PAGE-post-interactors-ACT-follow` | 关注/取消关注 | 满足互动准入 | 更新最终关注态 |

## 4. 状态与验收

| 状态 | 页面表现 |
|------|----------|
| 空态 | 显示“暂无点赞/收藏/评论用户” |
| 无收藏列表权限 | 不返回用户明细，显示仅作者可见 |
| 内容不可见 | 终止加载并返回来源页 |

| 验收 ID | 验收标准 | 优先级 |
|---------|----------|--------|
| `APP-05-AC-post-interactors-count` | 列表人数与动态详情统计一致 | P1 |
| `APP-05-AC-post-interactors-favorite-privacy` | 非作者不能获得收藏用户明细 | P0 |
| `APP-05-AC-post-interactors-dedupe` | 评论用户按用户去重并保留最近互动时间 | P1 |

## 5. 关联

- 模块规则：`M05-RULE-content-favorite`、`M05-RULE-post-interactors`。
- 来源页面：`APP-05-PAGE-post-detail`。
- 目标页面：`APP-05-PAGE-user-profile`。
