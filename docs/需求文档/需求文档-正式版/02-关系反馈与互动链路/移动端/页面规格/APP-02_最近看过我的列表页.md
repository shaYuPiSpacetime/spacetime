# 页面规格 - APP-02-PAGE-recent-viewers 最近看过我的列表页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-07-02 | Codex | 明确列表页点击模糊卡片只打开单条解锁场景弹窗，扣币确认在弹窗内复用 PRD-04 |
| 版本01 | 2026-07-01 | Codex | 正式版初稿 |

- **页面 ID**：`APP-02-PAGE-recent-viewers`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-02_关系反馈与互动链路.md`
- **页面路由**：小程序路径待技术方案确定，建议 `/pages/relation/recent-viewers`
- **入口来源**：荐/婚恋反馈入口、消息快捷入口、资产中心权益入口
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
│ - 模糊态/清晰态/失效态       │
├────────────────────────────┤
│ 底部固定按钮：解锁全部访客   │
└────────────────────────────┘
```

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-02-viewers-01` | 最近看过我的-模糊列表态 | 普通用户访客列表、统计区、分组 | 缺设计稿时需补 |
| `APP-02-viewers-02` | 最近看过我的-清晰列表态 | 会员/单条已解锁卡片 | |
| `APP-02-viewers-03` | 最近看过我的-空态 | 最近 7 天无人访问 | |
| `APP-02-viewers-04` | 最近看过我的-失效态 | 卡片置灰并展示失效原因 | |

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
| `APP-02-PAGE-recent-viewers-FIELD-visit-no` | 访客记录编号 | string | 是 | 业务编号 | 前台不展示，仅追踪 | 无 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-display-status` | 展示状态 | enum | 是 | `M02-ENUM-display-status` | 状态必须可映射中文 | `blur` | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-group-key` | 分组 | enum/string | 是 | 今日/昨日/近 7 天 | 按自然日切分 | 今日 | 否 | 普通 | 系统计算 |
| `APP-02-PAGE-recent-viewers-FIELD-avatar` | 头像 | image | 是 | URL/模糊占位 | `blur` 时展示模糊或占位 | 模糊头像 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-recent-viewers-FIELD-nickname` | 昵称 | string | 条件必填 | 1-20 字 | `clear` 时展示；`blur` 时不展示 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-recent-viewers-FIELD-visit-count` | 访问次数 | int | 是 | >=1 | 展示如“访问了你 2 次” | 1 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-recent-viewers-FIELD-weak-tags` | 弱识别标签 | string[] | 否 | 同城/同乡/校友/星座/专业/985或211 | 不得组合出可唯一识别身份的信息 | 空数组 | 否 | 普通 | 系统计算 |
| `APP-02-PAGE-recent-viewers-FIELD-relation-badges` | 关系标识 | string[] | 否 | NEW/对方送过悄悄话/我送过悄悄话/已相互喜欢 | 展示图标需有无障碍文案 | 空数组 | 否 | 普通 | PRD-02/03 |
| `APP-02-PAGE-recent-viewers-FIELD-invalid-reason` | 失效原因 | enum | 条件必填 | `M02-ENUM-invalid-reason` | `displayStatus=invalid` 时必填 | 无 | 否 | 普通 | PRD-02 |

---

## 5. 操作表

| 操作 ID | 操作名 | 位置/触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|---------------|----------|----------|--------|--------|
| `APP-02-PAGE-recent-viewers-ACT-unlock-all` | 解锁全部访客 | 底部固定按钮，普通用户非会员 | 已登录且核心准入开放 | 否 | 打开 PRD-04 会员引导 | PRD-04 不可用时置灰 |
| `APP-02-PAGE-recent-viewers-ACT-unlock-one` | 单条解锁 | 点击 `displayStatus=blur` 卡片 | 已登录且核心准入开放 | 否，列表页只打开单条解锁场景弹窗；弹窗内由 PRD-04 确认扣币 | 打开 `APP-02-PAGE-single-unlock-modal`；用户在弹窗内确认扣币成功后当前记录清晰 | 余额不足/记录失效 |
| `APP-02-PAGE-recent-viewers-ACT-card-click` | 进入主页 | 点击 `displayStatus=clear` 卡片 | 已登录且核心准入开放 | 否 | 跳婚恋用户主页 | 失效时展示原因 |
| `APP-02-PAGE-recent-viewers-ACT-refresh` | 下拉刷新 | 页面顶部 | 已登录且核心准入开放 | 否 | 刷新统计和列表 | 网络失败 toast |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 当前日期 | 页面查询 | 列表范围 | 只返回最近 `M02-PARAM-visitor-visible-days=7` 天记录 | 固定参数，代码实现 |
| 会员状态 | 生效 | 展示状态 | 有效窗口内访客全量清晰 | `M04-ENUM-vip-benefit-type=visitor_list` |
| 隐藏访问记录 | 访问者开启 | 目标用户列表 | 不进入对方访客列表 | `M02-RULE-hidden-visit` |
| 访客记录 | 超过 7 天 | 前台列表 | 不展示；解锁历史由 PRD-04 追溯 | `M02-RULE-visitor-window` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入/刷新 | 骨架屏 | 无 | — |
| 空态 | 最近 7 天无访客 | 空态文案 | 去完善资料/去推荐 | `M02-TXT-viewers-empty` |
| 模糊态 | 普通未解锁 | 模糊头像 + 访问次数/标签 | 单条解锁/解锁全部 | `M02-RULE-blur-display` |
| 清晰态 | 会员或单条解锁 | 清晰用户资料 | 进入主页 | |
| 失效态 | 关系失效 | 卡片置灰 + 原因 | 查看原因 | `M02-RULE-relation-invalid` |
| 错误态 | 网络失败 | toast + 重试 | 重试 | 移动端全局态 |

---

## 8. 查询与列表

- **默认排序**：访问时间倒序，按今日、昨日、近 7 天分组。
- **展示窗口**：最近 7 天。
- **分页方式**：移动端加载更多，默认每页 20 条。
- **统计口径**：今日访客 = UV；今日浏览量 = 今日 PV；总浏览量 = 累计 PV。

---

## 9. 验收标准

```text
AC-ID: APP-02-AC-viewers-window
Given 用户存在 8 天前访客记录
When  打开最近看过我的列表
Then  列表只展示最近 7 天访客，不展示 8 天前记录

AC-ID: APP-02-AC-viewers-hidden
Given 访问者会员隐私权益有效且开启隐藏访问记录
When  访问目标用户婚恋主页
Then  目标用户最近看过我的列表不出现该访问者

AC-ID: APP-02-AC-viewers-invalid
Given 某访客关系因对方封禁失效
When  用户查看最近看过我的列表
Then  该记录置为失效态并展示失效原因
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖规则 | `M02-RULE-visit-generate` / `M02-RULE-visitor-window` / `M02-RULE-hidden-visit` | |
| 依赖商业化 | `APP-04-PAGE-paywall-modal` | 单条/全量解锁 |
