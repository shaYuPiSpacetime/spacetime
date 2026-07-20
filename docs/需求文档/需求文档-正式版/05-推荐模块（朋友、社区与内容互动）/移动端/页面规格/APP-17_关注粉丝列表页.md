# 页面规格 - APP-05-PAGE-follow-relations 关注粉丝列表页

> 承接蓝湖中的关注、粉丝及关系统计列表。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-20 | Codex | 根据蓝湖反向缺口新增关注/粉丝列表规格 |

## 1. 页面定位

- **入口来源**：婚恋用户主页关注数、粉丝数；我的互动快捷入口。
- **核心任务**：查看本人或目标用户的关注/粉丝列表，并在本人视图中关注或取消关注。
- **关系边界**：社区关注是弱关系，不改变喜欢、匹配或普通私信资格。

## 2. UI 画板拆分

| 画板 ID | 画板名称 | 必须展示内容 | 优先级 |
|---------|----------|--------------|--------|
| `APP-05-follow-relations-01` | 关注列表 | 用户头像、昵称、资料摘要、关注态 | P1 |
| `APP-05-follow-relations-02` | 粉丝列表 | 用户头像、昵称、资料摘要、回关态 | P1 |
| `APP-05-follow-relations-03` | 关系列表空态 | 关注空态或粉丝空态 | P1 |
| `APP-05-follow-relations-04` | 取消关注确认 | 目标摘要、确认与取消按钮 | P1 |

## 3. 字段与操作

| 字段 ID | 字段名 | 类型 | 规则 |
|---------|--------|------|------|
| `APP-05-PAGE-follow-relations-FIELD-relation-type` | 列表类型 | enum | `following/followers` |
| `APP-05-PAGE-follow-relations-FIELD-user-summary` | 用户摘要 | object | 头像、昵称、出生年、城市、职业、活跃描述 |
| `APP-05-PAGE-follow-relations-FIELD-follow-status` | 关注态 | enum | 未关注/已关注/互相关注 |
| `APP-05-PAGE-follow-relations-FIELD-count` | 统计数 | int | 不小于 0，服务端最终值 |

| 操作 ID | 操作 | 前置条件 | 结果 |
|---------|------|----------|------|
| `APP-05-PAGE-follow-relations-ACT-change-tab` | 切换关注/粉丝 | 已登录 | 列表刷新 |
| `APP-05-PAGE-follow-relations-ACT-open-profile` | 查看主页 | 用户可见 | 进入婚恋用户主页 |
| `APP-05-PAGE-follow-relations-ACT-follow` | 关注/回关 | 满足互动准入 | 更新关注态与统计数 |
| `APP-05-PAGE-follow-relations-ACT-unfollow` | 取消关注 | 当前已关注 | 确认后更新最终状态 |

## 4. 状态与验收

| 状态 | 页面表现 |
|------|----------|
| 空态-following | “还没有关注任何人”，提供去热门入口 |
| 空态-followers | “还没有粉丝”，不展示虚假推荐用户 |
| 用户失效 | 列表刷新后移除；已展示时禁用操作 |

| 验收 ID | 验收标准 | 优先级 |
|---------|----------|--------|
| `APP-05-AC-follow-relations-isolation` | 关注/取消关注不改变匹配和私信资格 | P0 |
| `APP-05-AC-follow-relations-count` | 列表总数与主页统计使用同一服务端口径 | P1 |
| `APP-05-AC-follow-relations-empty` | 关注与粉丝空态文案、引导动作分别定义 | P1 |

## 5. 关联

- 模块规则：`M05-RULE-follow-isolation`、`M05-RULE-follow-relations`。
- 目标页面：`APP-05-PAGE-user-profile`、`APP-05-PAGE-community-hot`。

