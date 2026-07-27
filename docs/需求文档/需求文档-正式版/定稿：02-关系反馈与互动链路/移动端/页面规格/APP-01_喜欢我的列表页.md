# 页面规格 - APP-02-PAGE-likes-me 喜欢我的列表页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本07 | 2026-07-23 | Codex | 普通用户改为全部已解锁加最近10条未解锁并支持分页；补充可见统计和快照分页交互 |
| 版本06 | 2026-07-23 | Codex | 新增“新喜欢”未读定义、入口角标、头像摘要、列表分组、快照已读操作及异常验收 |
| 版本05 | 2026-07-15 | Codex | 明确普通用户最多 10 条模糊记录、有效真实总数及会员分页口径 |
| 版本04 | 2026-07-10 | Codex | 按蓝湖 UI 与产品确认调整：移除前台失效态、匹配回流、筛选胶囊和曝光入口，补充喜欢行为提示文案 |
| 版本03 | 2026-07-09 | Codex | 按产品确认调整取消喜欢展示：对方取消喜欢后默认列表隐藏，不展示取消喜欢原因 |
| 版本02 | 2026-07-02 | Codex | 明确列表页点击模糊卡片只打开单条解锁场景弹窗，扣币确认在弹窗内复用 PRD-04 |
| 版本01 | 2026-07-01 | Codex | 正式版初稿 |

- **页面 ID**：`APP-02-PAGE-likes-me`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-02_关系反馈与互动链路.md`
- **页面路由**：小程序路径待技术方案确定，建议 `/pages/relation/likes-me`
- **入口来源**：底部 TabBar“心动”、消息快捷入口
- **对应后台**：`ADM-02-PAGE-user-relation-section`

---

## 1. 页面定位

- **目标用户**：三重认证通过的移动端用户
- **核心任务**：查看喜欢过自己的用户，并完成单条解锁、会员全量查看、主页回看
- **页面类型**：列表页

---

## 2. 布局

### 2.1 整体布局

```text
┌────────────────────────────┐
│ 顶部导航：喜欢我的          │
├────────────────────────────┤
│ 新喜欢：{newCount} 个        │
│ 最新头像摘要（最多 5 个）    │
│ 统计区：{total} 人喜欢了我   │
│ 引导文案/会员状态提示       │
├────────────────────────────┤
│ 新喜欢                       │
│ - 模糊态/清晰态 + “新”标签   │
│ 更早                         │
│ - 模糊态/清晰态              │
├────────────────────────────┤
│ 底部固定按钮：解锁全部       │
└────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 新喜欢摘要区 | 页面顶部 | `newCount>0` 时展示“{newCount} 个新喜欢”和最多 5 个最新新喜欢头像摘要；头像继续服从模糊/清晰权限 | 否 | 否 |
| 顶部统计区 | 新喜欢摘要区下方 | “{total} 人喜欢了我”、会员权益提示；不得将 `total` 描述为新喜欢数 | 否 | 否 |
| 卡片列表 | 主体 | 按“新喜欢/更早”分组展示用户卡片；新喜欢卡片增加“新”标签，卡片本身按模糊/清晰规则展示 | 否 | 否 |
| 底部操作区 | 底部固定 | 解锁全部喜欢我的人 | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 单条解锁弹窗 | 点击模糊卡片 | 复用 PRD-04 组件容器 | “解锁Ta是谁”、模糊头像、“只看ta”“解锁全部” | 由 `APP-02-PAGE-single-unlock-modal` 定义场景内容 |
| 付费引导弹窗 | 单条解锁弹窗内点击“只看ta”或列表点击“解锁全部” | 复用 PRD-04 | 单条千寻币确认/会员引导/余额不足充值承接 | 由 `APP-04-PAGE-paywall-modal` 定义 |

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-02-likes-me-01` | 喜欢我的-模糊列表态 | 普通用户未解锁列表、底部解锁全部按钮 | 缺设计稿时需补 |
| `APP-02-likes-me-02` | 喜欢我的-清晰列表态 | 会员/单条已解锁卡片 | |
| `APP-02-likes-me-03` | 喜欢我的-空态 | 无人喜欢时的引导 | |
| `APP-02-likes-me-04` | 喜欢我的-新喜欢态 | 入口数字角标、顶部新喜欢数量与头像摘要、“新喜欢/更早”分组及“新”标签；覆盖模糊与清晰卡片 | 需按 `M02-RULE-new-like-display` 补齐或核对设计稿 |

---

## 3. 筛选与搜索

本页为个人反馈列表，首版不提供搜索筛选；列表按“新喜欢、已解锁的更早喜欢、未解锁的更早喜欢”三段稳定分页/加载更多。蓝湖旧稿中的“资产殷实”“身高180”“有房有车”等筛选胶囊不纳入本期。

---

## 4. 字段表

### 4.1 列表字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-02-PAGE-likes-me-FIELD-total` | 有效喜欢总数 | int | 是 | `>=0` | 仅统计 `likeStatus=active` 且对象当前可互动的记录 | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-new-count` | 新喜欢数 | int | 是 | `0<=newCount<=total` | 按 `M02-RULE-new-like-definition` 统计；入口角标 100 及以上展示 `99+`，数据值仍返回真实数 | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-visible-total` | 当前可分页数量 | int | 是 | `0<=visibleTotal<=total` | 普通用户为全部已解锁加最近10条未解锁；VIP 等于 total | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-hidden-count` | 暂未进入列表数量 | int | 是 | `total-visibleTotal` | VIP 固定 0；普通用户只统计超出上限的未解锁记录 | 0 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-read-cursor` | 本次读取及分页快照游标 | string | 条件必填 | 服务端不透明字符串 | 存在有效喜欢时返回；首屏成功后用于已读确认，第2页起还要原样作为 `snapshotCursor` 回传 | 无 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-new-preview-avatars` | 新喜欢头像摘要 | object[] | 条件必填 | 0-5 个 `{recordNo,displayStatus,avatar,onlineStatus}` | `newCount>0` 时按喜欢时间倒序返回最多 5 个；avatar 始终返回，前端按 displayStatus 模糊或清晰展示；onlineStatus 用于绿色在线点 | 空数组 | 否 | 敏感；不导出、不本地持久化 | PRD-01 用户资料、PRD-02 展示状态 |
| `APP-02-PAGE-likes-me-FIELD-record-no` | 记录编号 | string | 是 | 业务编号 | 前台不展示，仅接口追踪 | 无 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-display-status` | 展示状态 | enum | 是 | `blur` / `clear` | APP 默认列表只返回模糊或清晰状态 | `blur` | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-avatar` | 头像 | image | 是 | 审核通过 URL | blur/clear 均返回；`blur` 时前端应用模糊样式，`clear` 时展示清晰头像 | 无 | 否 | 敏感 | PRD-01 用户资料 |
| `APP-02-PAGE-likes-me-FIELD-nickname` | 昵称 | string | 条件必填 | 1-20 字 | blur/clear 均返回；是否显示由前端根据 displayStatus 控制 | 无 | 否 | 普通 | PRD-01 用户资料 |
| `APP-02-PAGE-likes-me-FIELD-age` | 年龄 | int | 条件必填 | 18-60 | blur/clear 均返回；是否显示由前端根据 displayStatus 控制 | 无 | 否 | 普通 | PRD-01 用户资料 |
| `APP-02-PAGE-likes-me-FIELD-school` | 学校 | string | 否 | 学校字典 | blur/clear 均返回；是否显示由前端根据 displayStatus 控制 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-likes-me-FIELD-online-status` | 在线状态 | enum | 是 | `online`/`offline` | 最近5分钟存在已鉴权小程序请求为online；blur/clear均返回 | `offline` | 否 | 普通 | Redis小程序活跃状态 |
| `APP-02-PAGE-likes-me-FIELD-last-active-time` | 最近活跃时间 | datetime | 否 | datetime/null | Redis最近活跃时间，缺失时以最近登录时间兜底 | 无 | 否 | 普通 | Redis、PRD-01账户 |
| `APP-02-PAGE-likes-me-FIELD-online-text` | 在线展示文案 | string | 是 | 在线/相对时间 | 后端生成“在线”“1小时前在线”等文案 | 离线 | 否 | 普通 | PRD-02计算 |
| `APP-02-PAGE-likes-me-FIELD-identity-code` | 身份类型编码 | string | 否 | PRD-01身份字典 | blur/clear 均返回 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-likes-me-FIELD-identity-label` | 身份类型中文 | string | 否 | 在校生/职场人等 | blur/clear 均返回，与identityCode对应 | 无 | 否 | 普通 | PRD-01字典 |
| `APP-02-PAGE-likes-me-FIELD-industry-code` | 行业编码 | string | 否 | PRD-01行业字典 | blur/clear 均返回 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-likes-me-FIELD-industry-label` | 行业中文 | string | 否 | 启用字典中文 | blur/clear 均返回，与industryCode对应 | 无 | 否 | 普通 | PRD-01字典 |
| `APP-02-PAGE-likes-me-FIELD-occupation-code` | 职业/职位编码 | string | 否 | PRD-01职业字典 | blur/clear 均返回 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-likes-me-FIELD-occupation-label` | 职业/职位中文 | string | 否 | 启用字典中文 | blur/clear 均返回，与occupationCode对应 | 无 | 否 | 普通 | PRD-01字典 |
| `APP-02-PAGE-likes-me-FIELD-company` | 工作单位 | string | 否 | 2-50字 | blur/clear 均返回；是否显示由前端根据 displayStatus 控制 | 无 | 否 | 敏感 | PRD-01 |
| `APP-02-PAGE-likes-me-FIELD-annual-income-code` | 年收入区间编码 | string | 否 | PRD-01年收入字典 | blur/clear均可返回宽泛区间 | 无 | 否 | 普通 | PRD-01 |
| `APP-02-PAGE-likes-me-FIELD-annual-income-label` | 年收入区间中文 | string | 否 | 10万以下/30-50万等 | blur/clear均可展示，与annualIncomeCode对应 | 无 | 否 | 普通 | PRD-01字典 |
| `APP-02-PAGE-likes-me-FIELD-weak-tags` | 弱识别标签 | string[] | 否 | 同城/同乡/校友/同专业/985或211/兴趣标签 | 不得组合出可唯一识别身份的信息 | 空数组 | 否 | 普通 | 系统计算 |
| `APP-02-PAGE-likes-me-FIELD-liked-time` | 喜欢时间 | datetime/string | 是 | datetime 或相对时间 | 可展示相对时间，如 1 小时前 | 无 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-is-new` | 是否新喜欢 | bool | 是 | true/false | 按查询快照和 `M02-RULE-new-like-definition` 计算；true 时进入“新喜欢”分组并显示“新”标签 | false | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-group-key` | 列表排序分组 | enum | 是 | `new`/`earlier_unlocked`/`earlier_locked` | 服务端已按该分组完成稳定排序，前端不得二次重排 | 无 | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-unlock-time` | 单条解锁时间 | datetime | 否 | datetime/null | 仅存在有效单条解锁时返回；VIP 清晰但未单条解锁时为空 | 无 | 否 | 普通 | PRD-04 |
| `APP-02-PAGE-likes-me-FIELD-is-mutual` | 是否相互喜欢 | bool | 是 | true/false | true 时展示相互喜欢标识 | false | 否 | 普通 | PRD-02 |
| `APP-02-PAGE-likes-me-FIELD-like-action-copy` | 喜欢行为提示文案 | string | 否 | 1-20 字 | 仅作为弱提示，不展示强识别信息 | 对你一见钟情，秒送喜欢 | 否 | 普通 | PRD-02 |

---

## 5. 操作表

### 5.1 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-02-PAGE-likes-me-ACT-mark-new-read` | 确认新喜欢已读 | 首屏成功渲染后自动触发 | `newCount>0` 且存在服务端 `readCursor` | 已登录且核心准入开放 | 否 | 按 `readCursor` 幂等推进读取状态并清除入口角标；当前页面保留本次快照的“新”展示，重新进入或刷新后按最新状态计算 | 查询/渲染/提交失败均不推进游标、不清除角标；当前页面可继续浏览，下次进入或刷新重试 |
| `APP-02-PAGE-likes-me-ACT-unlock-all` | 解锁全部 | 底部固定 | 普通用户且非会员全量权益 | 已登录且核心准入开放 | 否 | 打开 `APP-04-PAGE-paywall-modal` 会员引导 | PRD-04 服务不可用时置灰 |
| `APP-02-PAGE-likes-me-ACT-refresh` | 下拉刷新 | 页面顶部 | 任意列表态 | 已登录且核心准入开放 | 否 | 刷新列表 | 网络失败 toast |

### 5.2 行级操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响 |
|---------|--------|----------|----------|----------|--------|--------|------|
| `APP-02-PAGE-likes-me-ACT-card-click` | 点击卡片 | `displayStatus=clear` | 已登录且核心准入开放 | 否 | 跳婚恋用户主页 | 目标不可访问时 toast 并刷新列表 | 可能为对方生成访客记录 |
| `APP-02-PAGE-likes-me-ACT-unlock-one` | 单条解锁 | `displayStatus=blur` | 已登录且核心准入开放 | 否，列表页只打开第一步场景弹窗 | 打开 `APP-02-PAGE-single-unlock-modal`，本操作不扣币；第二步由 PRD-04 确认成功后卡片清晰 | 记录不可解锁/PRD-04 不可用 | 本操作无资产副作用；第二步写 PRD-04 解锁记录 |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| `newCount` | 大于 0 | 入口角标/新喜欢摘要区/列表分组 | 入口显示 1-99 或 `99+`；顶部显示新喜欢摘要；`isNew=true` 记录进入“新喜欢”分组并展示“新”标签 | `M02-RULE-new-like-display` |
| `newCount` | 等于 0 | 入口角标/新喜欢摘要区/列表分组 | 隐藏入口角标与新喜欢摘要，不渲染“新喜欢/更早”分组标题，直接展示有效喜欢总数和常规列表 | `M02-RULE-new-like-display` |
| `readCursor` | 首屏成功渲染 | 喜欢收件箱读取状态 | 自动提交本次服务端快照游标；只确认游标覆盖的记录，之后到达的喜欢继续保持新喜欢 | `M02-RULE-new-like-read` |
| `readCursor` | 加载第2页及以后 | `snapshotCursor` 查询参数 | 当前页面始终回传第1页得到的同一个值；即使已读确认成功也不替换，避免重排、重复或漏项 | `M02-RULE-new-like-read` |
| 新喜欢记录 | 确认已读前取消或失效 | `newCount`/头像摘要/列表 | 从三处同步移除，不展示取消或失效提示；后台仍保留真实记录 | `M02-RULE-new-like-definition`、`M02-RULE-like-cancel` |
| 会员状态 | 生效 | 列表展示状态 | 当前有效记录全量清晰 | `M04-ENUM-vip-benefit-type=heart_list` |
| 会员状态 | 到期 | 列表展示状态 | 未单条解锁记录回退为普通模糊态；已单条解锁记录继续清晰 | `M02-RULE-vip-expiry-display` |
| 单条解锁状态 | 支付成功 | 当前卡片 | 对象与关系仍可展示时保持清晰；对象失效后前台移除 | `M02-RULE-unlock-visibility` |
| 关系状态 | `like_cancelled` | 默认列表 | 默认列表移除该记录，不展示“对方取消喜欢/不喜欢了” | `M02-RULE-like-cancel` |
| 关系状态 | 非取消喜欢异常 | 默认列表 | 默认列表隐藏不可互动对象，不展示前台失效态 | `M02-RULE-relation-invalid` |
| 是否相互喜欢 | true | 卡片标识/操作 | 展示相互喜欢标识，可优先进入聊天或主页 | 聊天由 PRD-03 判定 |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入/刷新 | 骨架屏 | 无 | — |
| 空态 | 无喜欢记录 | 空态文案 + 去完善资料/去看看推荐 | 跳资料或推荐 | `M02-TXT-likes-empty` |
| 业务态-存在新喜欢 | `newCount>0` | 入口数字角标、顶部新喜欢数量与头像摘要、“新喜欢/更早”分组及“新”标签 | 浏览、解锁或进入清晰卡片主页 | `M02-RULE-new-like-display` |
| 业务态-无新喜欢 | `newCount=0` 且 `total>0` | 隐藏入口角标、新喜欢摘要和分组标题；显示有效喜欢总数与常规列表 | 浏览、解锁或进入清晰卡片主页 | `M02-RULE-new-like-display` |
| 模糊态 | 普通未解锁 | 模糊头像 + 弱识别标签 | 单条解锁/解锁全部 | `M02-RULE-blur-display` |
| 清晰态 | 会员或单条解锁 | 头像、昵称、年龄、身份、行业、职位、工作单位、年收入、学校等清晰字段 | 进入主页 | `M02-RULE-unlock-visibility` |
| 业务隐藏 | 关系不可互动或取消喜欢 | 默认列表不返回该记录 | 无 | `M02-RULE-relation-invalid`、`M02-RULE-like-cancel` |
| 无权限态 | 未登录/未核心准入 | 登录或认证引导 | 登录/认证 | `M02-RULE-core-access` |
| 错误态 | 网络失败 | toast + 重试 | 重试 | 移动端全局态 |
| 降级态 | 已读提交失败 | 保留当前列表、入口角标和本次“新”展示，不向用户暴露技术错误 | 继续浏览；下次进入或下拉刷新时重试 | `M02-RULE-new-like-read`、`M02-ERR-relation-stat-unavailable` |

---

## 8. 查询与列表

- **默认排序**：新喜欢按喜欢时间倒序；更早的单条已解锁记录按解锁时间倒序；更早未解锁记录按喜欢时间倒序。前端按接口顺序渲染，不二次排序。
- **普通用户**：`total` 返回当前有效喜欢真实总数；可见集合为全部有效单条已解锁记录加最近 10 条有效未解锁记录，并按每页最多 20 条加载更多。
- **会员/全量清晰权益有效**：全部当前有效喜欢进入可见集合并清晰展示，默认每页 20 条。
- **分页统计**：`visibleTotal` 是实际可分页数量，`hiddenCount=total-visibleTotal`，`pages/hasMore` 按 `visibleTotal` 计算。
- **有效总数**：仅统计 `likeStatus=active` 且对象当前可互动的记录；`cancelled`、`invalid` 不计入前台 `total`。
- **新喜欢数**：`newCount` 按 `M02-RULE-new-like-definition` 返回全部当前有效未读喜欢真实数，不因普通用户只返回 10 条模糊记录而缩小，且必须满足 `0<=newCount<=total`。
- **入口角标**：`newCount=0` 隐藏；1-99 显示原数；100 及以上显示 `99+`。
- **顶部摘要**：`newCount>0` 时展示“{newCount} 个新喜欢”及最多 5 个最新新喜欢头像；头像逐条遵守模糊/清晰权限。有效总数文案固定为“{total} 人喜欢了我”。
- **已读确认**：首屏成功渲染后提交服务端不透明 `readCursor`；查询、渲染或提交失败均不清除新喜欢；当前页保留本次快照的新喜欢展示，重新进入或刷新后按最新读取状态计算。
- **稳定分页**：第 2 页及以后把同一个 `readCursor` 作为 `snapshotCursor` 回传；下拉刷新或重新进入时丢弃旧游标，从不带 `snapshotCursor` 的第 1 页重新开始。
- **批量选择**：不支持。
- **实时刷新**：不轮询，下拉刷新。
- **取消喜欢处理**：默认列表不返回 `likeStatus=cancelled` 的记录；后台仍保留 `like_cancelled` 用于客诉排查。
- **运营入口处理**：不展示“海量曝光”“10倍曝光”入口。

---

## 9. 验收标准

```text
AC-ID: APP-02-AC-new-like-definition
Given 当前用户共有 32 条有效入向喜欢，其中 5 条尚未按 M02-RULE-new-like-read 确认查看
When  查询喜欢我的列表
Then  total=32、newCount=5，5 条记录 isNew=true；已读历史喜欢、新注册用户和相互喜欢状态不额外计入 newCount

AC-ID: APP-02-AC-new-like-display
Given newCount=5 且其中同时存在模糊态和清晰态记录
When  喜欢我的页面首屏渲染完成
Then  入口角标显示 5，顶部显示“5 个新喜欢”和最多 5 个头像摘要，列表按“新喜欢/更早”分组；接口完整返回基础资料，前端根据 displayStatus 控制头像模糊及文本展示

AC-ID: APP-02-AC-new-like-read
Given 喜欢我的首屏返回 newCount>0 和服务端 readCursor，且首屏成功渲染
When  客户端提交该 readCursor 确认已读
Then  服务端幂等推进读取状态并清除入口角标；当前页面保留本次快照的“新”展示，重新进入或刷新后这些记录不再计入 newCount

AC-ID: APP-02-AC-new-like-read-failed
Given 当前存在尚未查看的新喜欢
When  列表查询失败、首屏渲染失败、应用异常退出或已读提交失败
Then  不推进读取游标、不清除入口角标，下次进入或刷新时这些有效记录仍按新喜欢展示

AC-ID: APP-02-AC-new-like-concurrent-arrival
Given 用户已成功渲染快照 A，且提交快照 A 的 readCursor 期间收到新的有效喜欢 B
When  快照 A 确认已读成功
Then  仅快照 A 覆盖的记录变为已读，喜欢 B 继续 isNew=true 并计入 newCount

AC-ID: APP-02-AC-likes-visible-set
Given 普通用户有 30 条有效入向喜欢，其中 7 条已单条解锁、23 条未解锁
When  查询喜欢我的列表
Then  total=30、visibleTotal=17、hiddenCount=13；7条已解锁和最近10条未解锁均可分页展示，已解锁记录不因超过10条而丢失

AC-ID: APP-02-AC-likes-snapshot-pagination
Given 第1页返回快照游标 A，首屏确认已读后又到达新喜欢 B
When  客户端继续加载第2页并把 A 作为 snapshotCursor 回传
Then  第2页仍按快照 A 的 isNew 和排序口径返回，不包含 B，且与第1页不重复、不漏项；重新进入后 B 才进入新快照

AC-ID: APP-02-AC-new-like-invalid-before-read
Given 一条尚未查看的新喜欢在用户进入页面前被对方取消，或因对方账号异常失效
When  查询喜欢我的列表
Then  该记录不进入列表、newCount 或头像摘要，前台不展示取消/失效提示，后台仍保留真实原因

AC-ID: APP-02-AC-likes-blur
Given 普通用户进入喜欢我的列表，存在未解锁记录
When  页面加载完成
Then  头像按模糊态展示；前端依据 displayStatus 选择展示字段，接口返回的基础资料保持完整

AC-ID: APP-02-AC-likes-unlock-one
Given 用户千寻币余额充足且点击未解锁喜欢记录
When  在 PRD-04 弹窗确认扣币成功
Then  当前记录变为清晰态，后续再次进入仍清晰

AC-ID: APP-02-AC-likes-cancel-hidden
Given 某条喜欢记录因对方取消喜欢失效
When  用户进入喜欢我的列表
Then  默认列表不展示该卡片，不展示“对方取消喜欢/不喜欢了”

AC-ID: APP-02-AC-likes-invalid-hidden
Given 某条喜欢记录因对方注销、冻结、封禁、拉黑或认证失效不可继续互动
When  用户进入喜欢我的默认列表
Then  前台不展示该卡片，不展示失效态或关系失效弹窗，后台保留真实失效原因

AC-ID: APP-02-AC-likes-no-extra-ui
Given 蓝湖旧稿或 Demo 存在筛选胶囊、海量曝光或10倍曝光入口
When  按本 PRD 进行还原或验收
Then  喜欢我的列表不展示这些额外入口
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖规则 | `M02-RULE-core-access` / `M02-RULE-blur-display` / `M02-RULE-new-like-definition` / `M02-RULE-new-like-read` / `M02-RULE-new-like-display` / `M02-RULE-relation-invalid` / `M02-RULE-like-cancel` | |
| 依赖商业化 | `APP-04-PAGE-paywall-modal` / `M04-RULE-like-viewer-unlock` | |
| 依赖后台 | `ADM-02-PAGE-user-relation-section` | 后台查看记录 |
