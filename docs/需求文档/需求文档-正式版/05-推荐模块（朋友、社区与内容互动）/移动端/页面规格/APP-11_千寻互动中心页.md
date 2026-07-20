# 页面规格 - APP-05-PAGE-interaction-center 千寻互动中心页

> 承接蓝湖“千寻互动”页面组中的评论过、点赞过、解锁过、浏览记录与获赞统计，不替代 PRD-03 通知中心。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-20 | Codex | 根据蓝湖反向缺口新增互动历史与获赞统计规格 |

## 1. 页面定位

- **入口来源**：千寻 -> 我的互动、个人主页互动统计入口。
- **核心任务**：按“评论过 / 点赞过 / 解锁过 / 浏览记录”查看本人行为历史，并查看累计获赞统计。
- **边界**：仅展示本人行为及聚合统计；实时通知、未读数与通知跳转仍由 PRD-03 承接。

## 2. 布局与 UI 画板拆分

页面由统计卡、历史类型 Tab、历史卡片列表和空态组成。

| 画板 ID | 画板名称 | 必须展示内容 | 优先级 |
|---------|----------|--------------|--------|
| `APP-05-interaction-01` | 千寻互动-评论过 | 获赞统计、评论过列表、评论摘要 | P1 |
| `APP-05-interaction-02` | 千寻互动-点赞过 | 点赞过列表、当前点赞态 | P1 |
| `APP-05-interaction-03` | 千寻互动-解锁过 | 解锁对象、解锁时间、状态 | P1 |
| `APP-05-interaction-04` | 千寻互动-浏览记录 | 最近浏览内容、浏览时间、清空入口 | P1 |
| `APP-05-interaction-05` | 千寻互动-空态 | 当前 Tab 空态和返回推荐入口 | P1 |
| `APP-05-interaction-06` | 获赞统计弹窗 | 动态获赞、评论获赞、累计获赞 | P1 |

## 3. 字段表

| 字段 ID | 字段名 | 类型 | 必填 | 规则 | 数据来源 |
|---------|--------|------|------|------|----------|
| `APP-05-PAGE-interaction-center-FIELD-history-type` | 历史类型 | enum | 是 | `commented/liked/unlocked/viewed` | 用户选择 |
| `APP-05-PAGE-interaction-center-FIELD-target-summary` | 对象摘要 | object | 是 | 内容不存在时显示“内容已不可见” | PRD-05/PRD-04 |
| `APP-05-PAGE-interaction-center-FIELD-action-time` | 行为时间 | datetime | 是 | 倒序展示 | 行为记录 |
| `APP-05-PAGE-interaction-center-FIELD-like-status` | 当前点赞态 | bool | 条件必填 | `liked` 类型展示 | PRD-05 |
| `APP-05-PAGE-interaction-center-FIELD-unlock-status` | 解锁状态 | enum | 条件必填 | 有效/已失效 | PRD-04 |
| `APP-05-PAGE-interaction-center-FIELD-received-like-counts` | 获赞统计 | object | 是 | 动态、评论、累计三项，均不小于 0 | 系统聚合 |

## 4. 操作表

| 操作 ID | 操作 | 前置条件 | 结果 | 异常处理 |
|---------|------|----------|------|----------|
| `APP-05-PAGE-interaction-center-ACT-change-tab` | 切换历史类型 | 已登录 | 刷新对应列表 | 加载失败保留当前 Tab 并重试 |
| `APP-05-PAGE-interaction-center-ACT-open-target` | 查看对象 | 对象可见 | 进入动态详情或对应解锁详情 | 对象不可见时仅保留历史摘要 |
| `APP-05-PAGE-interaction-center-ACT-toggle-like` | 取消/恢复点赞 | 类型为 liked 且对象公开 | 更新最终点赞态 | 引用 `M05-ERR-content-not-found` |
| `APP-05-PAGE-interaction-center-ACT-open-like-stats` | 查看获赞统计 | 统计加载成功 | 打开统计弹窗 | 失败提示重试 |
| `APP-05-PAGE-interaction-center-ACT-clear-history` | 清空浏览记录 | 类型为 viewed 且有记录 | 二次确认后清空本人浏览记录 | 失败不移除本地列表 |

## 5. 状态与验收

| 状态 | 页面表现 | 恢复动作 |
|------|----------|----------|
| 加载中 | 骨架屏 | 自动完成 |
| 空态 | 当前类型无记录，提供返回推荐入口 | 去推荐 |
| 对象失效 | 保留行为时间，正文替换为“内容已不可见” | 返回 |
| 网络错误 | 保留已加载内容并提示 | 重试 |

| 验收 ID | 验收标准 | 优先级 |
|---------|----------|--------|
| `APP-05-AC-interaction-tabs` | 四类历史互不混用且按行为时间倒序 | P1 |
| `APP-05-AC-interaction-stats` | 获赞统计明确区分动态获赞、评论获赞和累计获赞 | P1 |
| `APP-05-AC-interaction-clearing` | 清空浏览记录需要确认且不影响评论、点赞、解锁记录 | P1 |

## 6. 关联

- 模块规则：`M05-RULE-interaction-history`、`M05-RULE-received-like-stats`。
- 目标页面：`APP-05-PAGE-post-detail`。
- 解锁历史只引用 PRD-04 资产结果，不在 PRD-05 重建解锁状态机。

