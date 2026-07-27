# 页面规格 - APP-02-PAGE-recent-viewers 最近看过我的列表页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本06 | 2026-07-23 | Codex | 最近访客按用户聚合；普通用户展示全部已解锁访客及最近 10 个未解锁访客；补充分页数量、统一排序和按访客用户解锁口径 |
| 版本05 | 2026-07-15 | Codex | 隐藏访问一期完全不开发；明确展示记录 30 分钟去重但 PV 累计 |
| 版本03 | 2026-07-10 | Codex | 按蓝湖 UI 与产品确认调整：移除前台失效态，明确会员到期回退模糊、单条解锁永久清晰 |
| 版本02 | 2026-07-02 | Codex | 明确列表页点击模糊卡片只打开单条解锁场景弹窗，扣币确认在弹窗内复用 PRD-04 |
| 版本01 | 2026-07-01 | Codex | 正式版初稿 |

- **页面 ID**：`APP-02-PAGE-recent-viewers`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-02_关系反馈与互动链路.md`
- **页面路由**：小程序路径待技术方案确定，建议 `/pages/relation/recent-viewers`
- **入口来源**：底部 TabBar“心动”、消息快捷入口、资产中心权益入口
- **对应后台**：`ADM-02-PAGE-user-relation-section`

---

## 1. 页面定位

- **目标用户**：三重认证通过的移动端用户
- **核心任务**：查看最近 7 天访问过自己婚恋主页的用户，并完成单条解锁或会员全量查看
- **页面类型**：列表页

---

## 2. 布局

```text
┌────────────────────────────┐
│ 顶部导航：最近看过我的      │
├────────────────────────────┤
│ 统计区：总浏览量/今日访客/今日浏览量 │
├────────────────────────────┤
│ 分组列表：今日/昨日/近 7 天 │
│ - 模糊态/清晰态              │
├────────────────────────────┤
│ 底部固定按钮：解锁全部访客   │
└────────────────────────────┘
```

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-02-viewers-01` | 最近看过我的-模糊列表态 | 普通用户访客列表、统计区、分组 | 缺设计稿时需补 |
| `APP-02-viewers-02` | 最近看过我的-清晰列表态 | 会员/单条已解锁卡片 | |
| `APP-02-viewers-03` | 最近看过我的-空态 | 最近 7 天无人访问 | |

---

## 3. 筛选与搜索

本页首版不提供搜索筛选；按自然日分组展示最近 7 天访客。

---

## 4. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-02-PAGE-recent-viewers-FIELD-total-pv` | 总浏览量 | int | 是 | >=0 | 累计 PV，极短时间重复刷新不计入 | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-today-uv` | 今日访客 | int | 是 | >=0 | 同一用户当天多次访问计 1 UV | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-today-pv` | 今日浏览量 | int | 是 | >=0 | 今日 PV | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-total` | 7 天有效访客总数 | long | 是 | >=0 | 按访客用户去重，不受普通用户 10 人展示上限影响 | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-visible-total` | 可分页访客数 | long | 是 | >=0 | 普通用户为全部已解锁访客 + 最近 10 个未解锁访客；VIP 为全部有效访客 | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-hidden-count` | 未进入列表人数 | long | 是 | >=0 | `total-visibleTotal` | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-visit-no` | 最近访客记录编号 | string | 是 | `VIS-*` | 前台不展示；取该访客最近一条 30 分钟展示记录，用于解锁校验和审计 | 无 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-display-status` | 展示状态 | enum | 是 | `blur` / `clear` | APP 默认列表只返回模糊或清晰状态 | `blur` | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-group-key` | 分组 | enum/string | 是 | 今日/昨日/近 7 天 | 按自然日切分 | 今日 | 否 | 普通 | 系统计算 |
| `APP-02-PAGE-recent-viewers-FIELD-avatar` | 头像 | image | 是 | URL | 后端始终返回；`blur` 时前端渲染模糊样式 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-recent-viewers-FIELD-nickname` | 昵称 | string | 是 | 1-20 字 | 后端始终返回；前端依据 `displayStatus` 决定是否展示 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-recent-viewers-FIELD-profile` | 用户基础资料 | object | 是 | 年龄、学校、在线、身份、行业、职业、公司、年收入 | 后端在 `blur/clear` 均返回，字典字段同时返回 code/label | 无 | 否 | 普通 | PRD-01/02 |
| `APP-02-PAGE-recent-viewers-FIELD-visit-count` | 7 天访问次数 | int | 是 | >=1 | 聚合同一访客最近 7 天全部 `visible` 展示记录的 PV | 1 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-first-last-time` | 首次/最近访问时间 | datetime | 是 | 最近 7 天窗口 | 同一访客在窗口内聚合后的最早与最晚时间 | 无 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-unlock-time` | 单条解锁时间 | datetime | 否 | 时间或空 | 单条解锁清晰时返回；仅 VIP 权益清晰时为空 | 空 | 否 | 普通 | PRD-04 |
| `APP-02-PAGE-recent-viewers-FIELD-weak-tags` | 弱识别标签 | string[] | 否 | 同城/同乡/校友/星座/专业/985或211 | 不得组合出可唯一识别身份的信息 | 空数组 | 否 | 普通 | 系统计算 |
| `APP-02-PAGE-recent-viewers-FIELD-relation-badges` | 关系标识 | string[] | 否 | NEW/对方送过悄悄话/我送过悄悄话/已相互喜欢 | 展示图标需有无障碍文案 | 空数组 | 否 | 普通 | PRD-02/03 |

---

## 5. 操作表

| 操作 ID | 操作名 | 位置/触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|---------------|----------|----------|--------|--------|
| `APP-02-PAGE-recent-viewers-ACT-unlock-all` | 解锁全部访客 | 底部固定按钮，普通用户非会员 | 已登录且核心准入开放 | 否 | 打开 PRD-04 会员引导 | PRD-04 不可用时置灰 |
| `APP-02-PAGE-recent-viewers-ACT-unlock-one` | 单条解锁 | 点击 `displayStatus=blur` 卡片 | 已登录且核心准入开放 | 否，列表页只打开第一步场景弹窗 | 打开 `APP-02-PAGE-single-unlock-modal`，本操作不扣币；第二步由 PRD-04 确认成功后当前记录清晰 | 记录不可解锁/PRD-04 不可用 |
| `APP-02-PAGE-recent-viewers-ACT-card-click` | 进入主页 | 点击 `displayStatus=clear` 卡片 | 已登录且核心准入开放 | 否 | 跳婚恋用户主页 | 目标不可访问时 toast 并刷新列表 |
| `APP-02-PAGE-recent-viewers-ACT-refresh` | 下拉刷新 | 页面顶部 | 已登录且核心准入开放 | 否 | 刷新统计和列表 | 网络失败 toast |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 当前日期 | 页面查询 | 列表范围 | 只返回最近 `M02-PARAM-visitor-visible-days=7` 天记录 | 固定参数，代码实现 |
| 同一访客多条展示记录 | 页面查询 | 单张访客卡片 | 按 `visitorUserId` 聚合为 1 张卡片，累计访问次数并取窗口内最早/最近访问时间 | 不改变底层 30 分钟记录与事件事实 |
| 当前用户非会员 | 页面查询 | 可分页集合 | 全部有效单条已解锁访客 + 最近 10 个有效未解锁访客 | `total` 仍返回窗口内全部有效访客去重人数 |
| 会员状态 | 生效 | 展示状态 | 有效窗口内访客全量清晰 | `M04-ENUM-vip-benefit-type=visitor_list` |
| 会员状态 | 到期 | 展示状态 | 未单条解锁记录回退为普通模糊态；已单条解锁记录继续清晰 | `M02-RULE-vip-expiry-display` |
| 单条解锁状态 | 支付成功 | 当前访客用户 | 对象可展示时按访客用户永久保持清晰；该访客后续生成新 `VIS-*` 记录无需再次付费；列表仍受最近 7 天窗口限制 | `M02-RULE-unlock-visibility` |
| 隐藏访问记录 | 一期不提供 | 页面与接口 | 不展示入口、不判断权益、不生成隐藏状态 | `M02-RULE-hidden-visit-reserve` |
| 访客记录 | 超过 7 天 | 前台列表 | 不展示；解锁历史由 PRD-04 追溯 | `M02-RULE-visitor-window` |
| 关系状态 | 账号异常/拉黑/封禁等 | 默认列表 | 默认列表隐藏不可互动对象，不展示前台失效态 | `M02-RULE-relation-invalid` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入/刷新 | 骨架屏 | 无 | — |
| 空态 | 最近 7 天无访客 | 空态文案 | 去完善资料/去推荐 | `M02-TXT-viewers-empty` |
| 模糊态 | 普通未解锁 | 模糊头像 + 访问次数/标签 | 单条解锁/解锁全部 | `M02-RULE-blur-display` |
| 清晰态 | 会员或单条解锁 | 清晰用户资料 | 进入主页 | |
| 业务隐藏 | 关系不可互动 | 默认列表不返回该记录 | 无 | `M02-RULE-relation-invalid` |
| 错误态 | 网络失败 | toast + 重试 | 重试 | 移动端全局态 |

---

## 8. 查询与列表

- **聚合粒度**：同一访客用户只返回 1 张卡片；最近一条记录提供 `recordNo/sourceScene`，窗口内全部记录聚合 `visitCount/firstVisitTime/lastVisitTime`。
- **普通用户集合**：全部有效已单条解锁访客 + 最近 10 个有效未解锁访客。
- **VIP 集合**：最近 7 天全部有效访客。
- **默认排序**：两类用户均按 `lastVisitTime DESC、最近展示记录 id DESC`；解锁时间不参与排序。页面再按今日、昨日、近 7 天分组。
- **展示窗口**：最近 7 天。
- **分页方式**：移动端加载更多，默认每页 20 条。
- **分页统计**：`total` 为窗口内有效访客去重总数；`visibleTotal` 为当前权益下可分页人数；`hiddenCount=total-visibleTotal`；`pages/hasMore` 按 `visibleTotal` 计算。
- **统计口径**：今日访客 = UV；今日浏览量 = 今日 PV；总浏览量 = 累计 PV。

---

## 9. 验收标准

```text
AC-ID: APP-02-AC-viewers-window
Given 用户存在 8 天前访客记录
When  打开最近看过我的列表
Then  列表只展示最近 7 天访客，不展示 8 天前记录

AC-ID: APP-02-AC-viewers-visit-dedup
Given 同一用户在 30 分钟内多次访问目标用户婚恋主页
When  服务端记录访问
Then  只生成或更新一条访客展示记录，PV 按实际访问次数累计；一期不判断隐藏访问权益

AC-ID: APP-02-AC-viewers-invalid-hidden
Given 某访客关系因对方封禁失效
When  用户查看最近看过我的列表
Then  默认列表不展示该记录，不展示失效态或关系失效弹窗，后台保留真实失效原因

AC-ID: APP-02-AC-viewers-vip-expired-reblur
Given 用户曾因会员权益全量清晰查看访客列表，且未单条解锁某条访客记录
When  会员到期后再次进入最近看过我的列表
Then  该记录回退为模糊态；已单条解锁记录仍保持清晰

AC-ID: APP-02-AC-viewers-visible-set
Given 普通用户最近 7 天有 15 个未解锁访客和 3 个已解锁访客
When  分页查询最近看过我的列表
Then  total=18、visibleTotal=13、hiddenCount=5；返回 3 个已解锁访客和最近 10 个未解锁访客，并统一按最近访问时间倒序

AC-ID: APP-02-AC-viewer-user-unlock
Given 用户已通过某条 VIS 记录单条解锁访客 A
And   访客 A 后续重新来访并生成新的 VIS 记录
When  用户再次查询最近看过我的列表或对新 VIS 记录请求报价
Then  访客 A 仍为 clear；报价返回 alreadyUnlocked=true，不重复扣币
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖规则 | `M02-RULE-visit-generate` / `M02-RULE-visitor-window` / `M02-RULE-hidden-visit-reserve` | |
| 依赖商业化 | `APP-04-PAGE-paywall-modal` | 单条/全量解锁 |
