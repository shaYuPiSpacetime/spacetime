# APP-08 推荐与理想型条件筛选 - 端内定义

> 文档状态：**已定稿**
> 定稿日期：2026-08-10

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本05 | 2026-08-10 | Codex | 随 PRD-08 模块定稿，页面树、权限、通用状态及导航返回规则成为移动端实施基线 |
| 版本04 | 2026-08-09 | Codex | 同步蓝湖第二轮补稿：无候选去千寻同城、候选操作时失效、筛选结果恢复、悄悄话会话承接及回看失败提示 |
| 版本03 | 2026-08-09 | Codex | 按 UI 回复放开未认证浏览与筛选，只在喜欢/悄悄话时认证，并同步会员返回与网络失败口径 |
| 版本02 | 2026-08-06 | Codex | 移除见面偏好有效页面、权限与一期映射，保留废弃 ID 说明 |
| 版本01 | 2026-07-16 | Codex | 建立双 Tab 页面树、移动端权限矩阵和通用状态 |

## 1. 信息架构与页面树

| 层级/入口 | 页面 ID | 页面名 | 职责 | 路由 |
|-----------|---------|--------|------|------|
| 荐 | `APP-08-PAGE-recommend-ideal` | 推荐与理想型页 | 推荐/理想型双 Tab 主入口 | `/pages/recommend/index` |
| 推荐 Tab -> 筛选图标 | `APP-08-PAGE-filter-settings` | 推荐筛选设置页 | 保存免费基础与 VIP 高级条件 | `/pages/recommend/filter/index` |
| 推荐卡片 -> 查看详情 | `APP-08-PAGE-card-detail` | 推荐卡片详情页 | 查看候选公开资料并进入关系动作 | `/pages/recommend/detail/index` |
| 推荐无下一位/额度结束 | `APP-08-PAGE-waiting` | 推荐等待页 | 承接本轮无候选、浏览额度结束及调整筛选入口 | `/pages/recommend/waiting/index` |
| 推荐 -> 回看 | `APP-08-PAGE-replay` | 推荐回看页 | 会员查看最近 3 天推荐浏览记录 | `/pages/recommend/replay/index` |
| 理想型 Tab -> 选好了 | `APP-08-PAGE-ideal-results` | 理想型结果页 | 展示模糊结果并触发单个/批量解锁 | `/pages/ideal/results/index` |
| 理想型 Tab -> 筛选记录 | `APP-08-PAGE-ideal-records` | 理想型筛选记录页 | 查看最近 20 次条件快照 | `/pages/ideal/records/index` |
| 理想型 Tab -> 历史解锁 | `APP-08-PAGE-ideal-unlocks` | 理想型历史解锁页 | 查看仍在保留期及已过期的解锁记录 | `/pages/ideal/unlocks/index` |

> 理想型不是独立一级菜单；从“荐”进入时默认打开推荐 Tab，切换 Tab 不新建页面栈。用户主页主体由 PRD-01/PRD-06 统一承接，APP-08 只传递 `sourceScene=recommend/ideal`。

## 2. 用户状态与权限矩阵

| 操作 | 未登录 | 已登录未完成三项认证 | 普通用户 | 会员 | 规则 |
|------|--------|----------------------|----------|------|------|
| 进入双 Tab 主页面 | 引导登录 | 允许 | 允许 | 允许 | 已登录、账号正常、基础资料可用 |
| 编辑位置、年龄 | 禁止 | 允许 | 允许 | 允许 | `M08-RULE-target-city` |
| 查看/编辑高级筛选 | 禁止 | 展示字段；按会员状态决定编辑或跳会员页 | 展示字段；无权益时跳会员页 | 允许编辑 | `M08-RULE-vip-filter` |
| 使用理想型条件 | 禁止 | 允许；缺失依赖条件隐藏 | 允许 | 允许 | `M08-RULE-dependent-condition` |
| 查看理想型模糊结果 | 禁止 | 允许 | 允许 | 允许 | `M08-RULE-ideal-blur` |
| 单个/批量解锁理想型 | 禁止 | 千寻币足额时允许 | 千寻币足额时允许 | 千寻币足额时允许 | 会员不免单；PRD-04 |
| 查看推荐回看 | 禁止 | 按会员权益决定 | 引导开通会员 | `three_day_replay` 启用时允许 | PRD-04 |
| 跳过、查看详情 | 禁止 | 允许 | 允许 | 允许 | `M08-RULE-viewer-auth` |
| 喜欢、悄悄话 | 禁止 | 弹三项认证提示 | 三项认证通过后允许 | 三项认证通过后允许 | `M08-RULE-viewer-auth` |

## 3. 模块通用 UI 状态

| 状态 ID | 触发 | 通用表现 | 可执行操作 |
|---------|------|----------|------------|
| `APP-08-UI-loading` | 首屏或切换 Tab 请求中 | 对应区块骨架屏，保留顶部 Tab | 等待/返回 |
| `APP-08-UI-empty-recommend` | 推荐 0 候选 | 复用蓝湖人物缺省插图，引用 `M08-TXT-empty-recommend` | 去千寻同城看看 |
| `APP-08-UI-empty-ideal` | 理想型 0 候选 | 引用 `M08-TXT-empty-ideal`，原条件保留 | 返回修改条件 |
| `APP-08-UI-network-error` | 推荐加载/动作网络失败 | 保留当前页面、卡片和草稿，仅 Toast“网络错误” | 再次触发原操作 |
| `APP-08-UI-interaction-auth` | 未认证用户点击喜欢/悄悄话 | 弹三项认证提示，不隐藏候选 | 稍后认证/去认证 |
| `APP-08-UI-vip-locked` | 无高级筛选或回看权益 | 锁图标、权益说明、开通按钮 | 打开 PRD-04 VIP 引导 |
| `APP-08-UI-dictionary-degraded` | 地区/学校/标签字典不可用 | 已保存条件只读回显；禁止新保存 | 重试/返回 |
| `APP-08-UI-candidate-invalid` | 候选实时失效 | 跳过时静默切换；查看、喜欢、悄悄话或更多操作时提示“该用户已注销”后切换 | 继续浏览 |

## 4. 导航与返回规则

1. 筛选设置保存成功后 `navigateBack` 到推荐 Tab，并以新版本刷新；取消返回不改值。
2. 理想型结果页返回理想型 Tab 时恢复发起筛选时的条件，不用当前快照覆盖后来保存的共享基础条件。
3. 从筛选记录进入历史结果使用原 `snapshotNo`；快照过期时只展示条件摘要。
4. 从历史解锁进入候选详情前实时校验候选有效性；失效时留在列表并提示不可查看。
5. 所有 PRD-04 付费弹窗关闭后返回原列表位置；支付失败不改变解锁态和勾选项。
6. 从筛选页进入“时空邂逅会员”后返回，必须重新查询会员权益并保留基础筛选草稿；权益生效后高级条件原地转为可编辑。
7. 从认证流程返回推荐页时停留原候选人，不自动执行此前的喜欢或悄悄话。
8. 悄悄话认证、付费和发送成功后进入 PRD-03 对应候选人的悄悄话会话页，不跳消息首页。
9. 推荐无候选时，“去千寻同城看看”进入 PRD-05 `APP-05-PAGE-community-city`；返回后仍按最近一次已保存筛选查询推荐。
10. 页面返回或重新进入时若上次筛选结果快照不存在，清除结果快照并按最近一次已保存条件重查，不恢复平台默认条件。

## 5. 一期页面映射

| 一期编号 | 原 demo 编号 | APP-08 页面 |
|----------|--------------|-------------|
| `MVP-PAGE-022` / `MVP-PAGE-029` | `APP-PAGE-033` / `APP-PAGE-040` | `APP-08-PAGE-recommend-ideal` 两个 Tab |
| `MVP-PAGE-023` | `APP-PAGE-034` | `APP-08-PAGE-card-detail` |
| `MVP-PAGE-024` | `APP-PAGE-035` | `APP-08-PAGE-waiting` |
| `MVP-PAGE-025` | `APP-PAGE-036` | `APP-08-PAGE-replay` |
| `MVP-PAGE-026` | `APP-PAGE-037` | `APP-08-PAGE-filter-settings` |
| `MVP-PAGE-030` | `APP-PAGE-041` | `APP-08-PAGE-ideal-records` |
| `MVP-PAGE-031` | `APP-PAGE-042` | `APP-08-PAGE-ideal-unlocks` |
| `MVP-POP-014/015` | `APP-POP-015/016` | 取消独立弹窗，由理想型 Tab 与结果页承接 |

> `[已废弃] APP-08-PAGE-meeting-preference / MVP-PAGE-027 / APP-PAGE-038`：2026-08-06 起移出 PRD-08，不展示入口、不注册 `/pages/recommend/meeting-preference/index`、不出 UI 稿，编号不得复用。
