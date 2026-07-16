# APP-08 推荐与理想型条件筛选 - 端内定义

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-16 | Codex | 建立双 Tab 页面树、移动端权限矩阵和通用状态 |

## 1. 信息架构与页面树

| 层级/入口 | 页面 ID | 页面名 | 职责 | 路由 |
|-----------|---------|--------|------|------|
| 荐 | `APP-08-PAGE-recommend-ideal` | 推荐与理想型页 | 推荐/理想型双 Tab 主入口 | `/pages/recommend/index` |
| 推荐 Tab -> 筛选图标 | `APP-08-PAGE-filter-settings` | 推荐筛选设置页 | 保存免费基础与 VIP 高级条件 | `/pages/recommend/filter/index` |
| 推荐 Tab -> 见面偏好 | `APP-08-PAGE-meeting-preference` | 见面偏好页 | 保存见面节奏和活动偏好，不参与一期筛选 | `/pages/recommend/meeting-preference/index` |
| 推荐卡片 -> 查看详情 | `APP-08-PAGE-card-detail` | 推荐卡片详情页 | 查看候选公开资料并进入关系动作 | `/pages/recommend/detail/index` |
| 推荐无下一位/额度结束 | `APP-08-PAGE-waiting` | 推荐等待页 | 承接本轮无候选、浏览额度结束及调整筛选入口 | `/pages/recommend/waiting/index` |
| 推荐 -> 回看 | `APP-08-PAGE-replay` | 推荐回看页 | 会员查看最近 3 天推荐浏览记录 | `/pages/recommend/replay/index` |
| 理想型 Tab -> 选好了 | `APP-08-PAGE-ideal-results` | 理想型结果页 | 展示模糊结果并触发单个/批量解锁 | `/pages/ideal/results/index` |
| 理想型 Tab -> 筛选记录 | `APP-08-PAGE-ideal-records` | 理想型筛选记录页 | 查看最近 20 次条件快照 | `/pages/ideal/records/index` |
| 理想型 Tab -> 历史解锁 | `APP-08-PAGE-ideal-unlocks` | 理想型历史解锁页 | 查看仍在保留期及已过期的解锁记录 | `/pages/ideal/unlocks/index` |

> 理想型不是独立一级菜单；从“荐”进入时默认打开推荐 Tab，切换 Tab 不新建页面栈。用户主页主体由 PRD-01/PRD-06 统一承接，APP-08 只传递 `sourceScene=recommend/ideal`。

## 2. 用户状态与权限矩阵

| 操作 | 未登录 | 已登录未完成核心准入 | 普通用户 | 会员 | 规则 |
|------|--------|----------------------|----------|------|------|
| 进入双 Tab 主页面 | 引导登录 | 显示 PRD-01 核心准入拦截 | 允许 | 允许 | `M08-RULE-candidate-pool` |
| 编辑位置、年龄 | 禁止 | 禁止 | 允许 | 允许 | 基础筛选 |
| 查看/编辑高级筛选 | 禁止 | 禁止 | 展示锁定并引导会员 | 允许 | `M08-RULE-vip-filter` |
| 使用理想型条件 | 禁止 | 禁止 | 允许 | 允许 | 筛选本身免费 |
| 查看理想型模糊结果 | 禁止 | 禁止 | 允许 | 允许 | `M08-RULE-ideal-blur` |
| 单个/批量解锁理想型 | 禁止 | 禁止 | 千寻币足额时允许 | 千寻币足额时允许 | 会员不免单；PRD-04 |
| 查看推荐回看 | 禁止 | 禁止 | 引导开通会员 | `three_day_replay` 启用时允许 | PRD-04 |
| 保存见面偏好 | 禁止 | 禁止 | 允许 | 允许 | 不参与筛选 |

## 3. 模块通用 UI 状态

| 状态 ID | 触发 | 通用表现 | 可执行操作 |
|---------|------|----------|------------|
| `APP-08-UI-loading` | 首屏或切换 Tab 请求中 | 对应区块骨架屏，保留顶部 Tab | 等待/返回 |
| `APP-08-UI-empty-recommend` | 推荐 0 候选 | 引用 `M08-TXT-empty-recommend`，展示调整筛选按钮 | 调整筛选/稍后重试 |
| `APP-08-UI-empty-ideal` | 理想型 0 候选 | 引用 `M08-TXT-empty-ideal`，原条件保留 | 返回修改条件 |
| `APP-08-UI-network-error` | 网络失败 | 保留上次成功内容并展示通用重试 | 重试 |
| `APP-08-UI-core-access` | 未完成核心准入 | 跳转/展示 PRD-01 核心准入拦截 | 去完善资料和认证 |
| `APP-08-UI-vip-locked` | 无高级筛选或回看权益 | 锁图标、权益说明、开通按钮 | 打开 PRD-04 VIP 引导 |
| `APP-08-UI-dictionary-degraded` | 地区/学校/标签字典不可用 | 已保存条件只读回显；禁止新保存 | 重试/返回 |
| `APP-08-UI-candidate-invalid` | 候选实时失效 | 当前卡片移除并加载下一条，不暴露原因 | 继续浏览 |

## 4. 导航与返回规则

1. 筛选设置保存成功后 `navigateBack` 到推荐 Tab，并以新版本刷新；取消返回不改值。
2. 理想型结果页返回理想型 Tab 时恢复发起筛选时的条件，不用当前快照覆盖后来保存的共享基础条件。
3. 从筛选记录进入历史结果使用原 `snapshotNo`；快照过期时只展示条件摘要。
4. 从历史解锁进入候选详情前实时校验候选有效性；失效时留在列表并提示不可查看。
5. 所有 PRD-04 付费弹窗关闭后返回原列表位置；支付失败不改变解锁态和勾选项。

## 5. 一期页面映射

| 一期编号 | 原 demo 编号 | APP-08 页面 |
|----------|--------------|-------------|
| `MVP-PAGE-022` / `MVP-PAGE-029` | `APP-PAGE-033` / `APP-PAGE-040` | `APP-08-PAGE-recommend-ideal` 两个 Tab |
| `MVP-PAGE-023` | `APP-PAGE-034` | `APP-08-PAGE-card-detail` |
| `MVP-PAGE-024` | `APP-PAGE-035` | `APP-08-PAGE-waiting` |
| `MVP-PAGE-025` | `APP-PAGE-036` | `APP-08-PAGE-replay` |
| `MVP-PAGE-026` | `APP-PAGE-037` | `APP-08-PAGE-filter-settings` |
| `MVP-PAGE-027` | `APP-PAGE-038` | `APP-08-PAGE-meeting-preference` |
| `MVP-PAGE-030` | `APP-PAGE-041` | `APP-08-PAGE-ideal-records` |
| `MVP-PAGE-031` | `APP-PAGE-042` | `APP-08-PAGE-ideal-unlocks` |
| `MVP-POP-014/015` | `APP-POP-015/016` | 取消独立弹窗，由理想型 Tab 与结果页承接 |
