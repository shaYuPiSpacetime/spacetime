# PRD-02 模块公共定义 - 关系反馈与互动链路

> 本文件登记 PRD-02 在移动端与管理后台共用的术语、枚举、状态机、规则、代码固定参数、通知、事件、错误码与接口约定。
> 页面规格引用本文 `M02-*` ID，禁止把 PRD-02 专属定义写入全局共享层。
> 付费、订单、千寻币、会员权益统一引用 PRD-04；核心准入统一引用 PRD-01。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本04 | 2026-07-02 | Codex | 按确认口径取消 PRD-02 后台关系反馈配置页，关系反馈规则改为代码固定参数 |
| 版本03 | 2026-07-02 | Codex | 按二轮深度核查补齐模糊展示默认值、单条解锁触发边界和 PRD-05 主页联动承接提醒 |
| 版本02 | 2026-07-02 | Codex | 按核查报告补齐单条解锁弹窗场景规格、后台用户列表关系反馈字段、JSON 返回结构、异常场景清单、研发分级、主页按钮联动和女性保护归属说明 |
| 版本01 | 2026-07-01 | Codex | 由原移动端/管理后台 PRD-02 与确认问题清单转写正式版，收口访客范围、7 天展示、模糊态、悄悄话匹配、隐藏访问记录、失效展示、后台承接边界 |

---

## 1. 已确认产品结论

| 编号 | 结论 | 文档落点 |
|------|------|----------|
| M02-01 | 关系反馈链路使用 PRD-01 核心准入口径：实名、头像、学历三重认证全部通过且账号正常后，才可产生真实喜欢、访客、匹配与聊天入口 | `M02-RULE-core-access` |
| M02-02 | 来访记录只统计进入“婚恋用户主页”的访问；社区动态详情、职业主页不计入，除非最终跳转到同一个婚恋用户主页 | `M02-RULE-visit-generate` |
| M02-03 | 最近看过我的前台展示窗口为最近 7 天；PRD-04 精选主页 3 天回看不与本模块访客窗口混用 | `M02-PARAM-visitor-visible-days` |
| M02-04 | 已千寻币单条解锁的喜欢/访客记录永久保持清晰；但最近看过我的列表仍受 7 天展示窗口限制，历史解锁记录可在资产/解锁记录中追溯 | `M02-RULE-unlock-visibility`、`M04-RULE-like-viewer-unlock` |
| M02-05 | 悄悄话回复可作为匹配成功来源之一；悄悄话发送与回复流程由 PRD-03 定义，回复成功后由 PRD-02 生成匹配成功记录并开放普通聊天入口 | `M02-ENUM-match-source`、`M02-RULE-whisper-match` |
| M02-06 | 喜欢我的、最近看过我的模糊态字段固定：不展示清晰头像、昵称、年龄、学校等强识别字段；仅展示弱识别标签、在线/访问时间分组、访问次数等 | `M02-RULE-blur-display` |
| M02-07 | 隐藏访问记录是时空邂逅会员隐私权益之一，入口在隐私设置；会员到期后权益失效，后续访问恢复按普通规则记录 | `M02-RULE-hidden-visit`、`M04-ENUM-vip-benefit-type=privacy` |
| M02-08 | 拉黑、注销、冻结、封禁等导致关系记录不可用时，前台不删除历史对象，而是置为失效态并展示失效原因；后台保留记录可查 | `M02-RULE-relation-invalid` |
| M02-09 | 支持取消喜欢；取消后喜欢我的记录失效。若相互喜欢来源为双方互送爱心，取消喜欢后相互喜欢记录同步失效 | `M02-RULE-like-cancel` |
| M02-10 | 同一访客 30 分钟内访问同一婚恋用户主页只生成 1 条访客展示记录；PV 统计可继续累计 | `M02-PARAM-visit-dedup-minutes` |
| M02-11 | 管理后台首版不新增全局关系记录一级菜单；关系记录在 App 用户详情的关系记录区块/Tab 中查看 | `ADM-02-PAGE-user-relation-section` |
| M02-12 | 后台首版不开放手工制造匹配、补喜欢、恢复关系记录；关系失效由业务事件触发。若后续需要人工修正，需另立高风险需求 | `M02-RULE-admin-manual-boundary` |
| M02-13 | 女性保护机制主定义归 PRD-03；PRD-02 只在匹配成功后进入聊天链路时引用。PRD-03 必须承接保护期天数配置，原始口径默认 3 天 | `M02-RULE-female-protection-ref` |
| M02-14 | 匹配成功来源首版固定三类：双方互送爱心、精选心动后回爱心、悄悄话回复 | `M02-ENUM-match-source` |
| M02-15 | PRD-02 不重复定义支付/充值页面；喜欢/访客单条解锁与全量解锁统一唤起 PRD-04 付费引导弹窗 | `M02-RULE-paywall-handoff` |
| M02-16 | 单条解锁弹窗的 PRD-02 场景内容独立登记：喜欢我的与最近看过我的使用不同副标题，按钮固定为“只看 ta”和“解锁全部” | `APP-02-PAGE-single-unlock-modal`、`M02-RULE-single-unlock-modal-content` |
| M02-17 | 后台 App 用户管理列表需补充关系反馈搜索条件和列表字段；这是对 ADM-01 用户列表的字段增强，不新增独立关系列表 | `ADM-02-PAGE-user-list-relation-fields` |
| M02-18 | PRD-02 不提供后台关系反馈配置页；最近访客展示天数、访客去重窗口、模糊展示条数、隐藏访问记录入口开关、悄悄话触发匹配、匹配弹窗仅首次展示均按代码固定参数实现 | `M02-PARAM-*`、`M02-RULE-admin-scope` |

### 1.1 本模块产出

| 产出 ID | 产出项 | 说明 | 主要承接页面/规则 |
|---------|--------|------|------------------|
| `M02-OUT-like-feedback` | 喜欢反馈记录 | 记录谁喜欢了我、来源场景、状态与失效原因 | `APP-02-PAGE-likes-me`、`M02-SM-like-record` |
| `M02-OUT-visit-feedback` | 来访反馈记录 | 记录最近 7 天谁进入过我的婚恋用户主页 | `APP-02-PAGE-recent-viewers`、`M02-SM-visit-record` |
| `M02-OUT-mutual-match` | 相互喜欢/匹配成功记录 | 记录匹配双方、匹配来源、状态与首次弹窗 | `APP-02-PAGE-mutual-matches`、`M02-SM-mutual-match` |
| `M02-OUT-single-unlock-status` | 单条解锁状态 | 记录某条喜欢/访客是否已通过千寻币单条解锁；资产与扣费由 PRD-04 承接 | `APP-02-PAGE-single-unlock-modal`、`M02-RULE-unlock-visibility` |
| `M02-OUT-all-unlock-status` | 全量查看权益状态 | 记录用户是否因时空邂逅会员权益全量清晰查看喜欢/访客 | `M04-ENUM-vip-benefit-type=heart_list/visitor_list` |
| `M02-OUT-display-paywall-rule` | 页面展示状态与付费引导规则 | 定义模糊态、清晰态、失效态、单条解锁、解锁全部之间的展示与跳转 | `M02-RULE-blur-display`、`M02-RULE-paywall-handoff` |

---

## 2. 模块术语

| 术语 ID | 统一术语 | 禁用旧称/别名 | 定义 | 是否需提升全局 |
|---------|----------|----------------|------|----------------|
| `M02-TERM-like-record` | 喜欢记录 | 心动记录（非精选场景） | 用户对另一名异性用户表达喜欢后形成的关系反馈记录 | 否 |
| `M02-TERM-visit-record` | 访客记录 | 浏览记录、看过我 | 用户进入另一名用户婚恋主页后形成的访问反馈记录 | 否 |
| `M02-TERM-mutual-match` | 相互喜欢/匹配成功 | 配对成功 | 两名用户满足匹配成功条件后形成的双向关系记录 | 否 |
| `M02-TERM-blur-display` | 模糊态 | 高斯模糊、匿名态 | 普通用户未解锁前看到的弱识别展示状态 | 否 |
| `M02-TERM-single-unlock` | 单条解锁 | 单个解锁 | 用户用千寻币解锁某一条喜欢或访客记录清晰信息 | 否 |
| `M02-TERM-all-unlock` | 全量解锁 | 解锁全部 | 用户通过时空邂逅会员权益查看喜欢名单或访客列表的全部清晰记录 | 否 |
| `M02-TERM-hidden-visit` | 隐藏访问记录 | 隐身访问 | 用户具备会员隐私权益时，访问他人婚恋主页不进入对方访客列表 | 否 |

---

## 3. 模块枚举

### 3.1 `M02-ENUM-relation-source-scene` 关系来源场景

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `fate` | 觅缘 | 从婚恋推荐卡片产生 | 1 | 是 | 启用 |
| `featured` | 精选 | 从精选主页/精选卡片产生 | 2 | 否 | 启用 |
| `ideal` | 理想型 | 从理想型筛选结果产生 | 3 | 否 | 启用 |
| `profile` | 婚恋用户主页 | 直接进入用户婚恋主页产生 | 4 | 否 | 启用 |
| `likes_me` | 喜欢我的 | 从喜欢我的列表回看产生 | 5 | 否 | 启用 |
| `recent_viewers` | 最近看过我的 | 从访客列表回看产生 | 6 | 否 | 启用 |

### 3.2 `M02-ENUM-display-status` 展示状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `blur` | 模糊 | 普通用户未解锁，仅展示弱识别信息 | 1 | 是 | 启用 |
| `clear` | 清晰 | 会员权益或单条解锁后展示清晰信息 | 2 | 否 | 启用 |
| `invalid` | 已失效 | 关系对象不可用，前台展示失效原因 | 3 | 否 | 启用 |

### 3.3 `M02-ENUM-like-status` 喜欢记录状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `active` | 生效中 | 喜欢真实生效且未撤回 | 1 | 是 | 启用 |
| `cancelled` | 已取消 | 发起方取消喜欢 | 2 | 否 | 启用 |
| `invalid` | 已失效 | 因拉黑、冻结、注销、封禁等失效 | 3 | 否 | 启用 |

### 3.4 `M02-ENUM-visit-status` 访客记录状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `visible` | 可展示 | 在最近看过我的窗口内可展示 | 1 | 是 | 启用 |
| `hidden_by_visitor` | 访问者已隐藏 | 访问者具备隐藏访问记录权益，不进入对方访客列表 | 2 | 否 | 启用 |
| `expired_window` | 超出展示窗口 | 超过最近 7 天，不在前台列表展示 | 3 | 否 | 启用 |
| `invalid` | 已失效 | 因账号或关系异常不可用 | 4 | 否 | 启用 |

### 3.5 `M02-ENUM-match-status` 匹配成功状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `matched` | 已匹配 | 双方关系有效，可进入普通聊天入口 | 1 | 是 | 启用 |
| `invalid` | 已失效 | 因取消喜欢、拉黑、冻结、注销、封禁等不可继续互动 | 2 | 否 | 启用 |

### 3.6 `M02-ENUM-match-source` 匹配成功来源

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `double_like` | 双方互送爱心 | A 喜欢 B 且 B 喜欢 A，双方喜欢记录均真实生效 | 1 | 是 | 启用 |
| `featured_heart_return_like` | 精选心动后回爱心 | A 在精选场景对 B 心动，B 回送爱心 | 2 | 否 | 启用 |
| `whisper_reply` | 悄悄话回复 | B 回复 A 的悄悄话后触发匹配成功 | 3 | 否 | 启用 |

### 3.7 `M02-ENUM-invalid-reason` 关系失效原因

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `like_cancelled` | 对方已取消喜欢 | 发起方取消喜欢导致记录失效 | 1 | 否 | 启用 |
| `blocked` | 已拉黑 | 任一方拉黑另一方 | 2 | 否 | 启用 |
| `account_frozen` | 账号已冻结 | 任一方账号冻结或停用 | 3 | 否 | 启用 |
| `account_deleted` | 账号已注销 | 任一方注销中或已注销 | 4 | 否 | 启用 |
| `risk_banned` | 风控封禁 | 任一方被封禁 | 5 | 否 | 启用 |
| `certification_revoked` | 认证失效 | 任一方核心准入回退 | 6 | 否 | 启用 |

---

## 4. 模块状态机

### 4.1 `M02-SM-like-record` 喜欢记录状态机

| 起始状态 | 事件/触发 | 目标状态 | 副作用 |
|----------|-----------|----------|--------|
| 无 | 用户喜欢且双方满足 `M02-RULE-core-access` | `active` | 写喜欢记录；接收方喜欢我的列表新增记录；检查是否生成匹配 |
| `active` | 发起方取消喜欢 | `cancelled` | 接收方喜欢我的记录置失效；若匹配来源为 `double_like`，匹配记录置失效 |
| `active` | 任一方拉黑/冻结/注销/封禁/认证失效 | `invalid` | 前台展示失效原因；后台保留记录 |

### 4.2 `M02-SM-visit-record` 访客记录状态机

| 起始状态 | 事件/触发 | 目标状态 | 副作用 |
|----------|-----------|----------|--------|
| 无 | 用户进入婚恋用户主页且未命中隐藏访问记录 | `visible` | 写访客记录；对方最近看过我的可能新增或更新 |
| 无 | 用户进入婚恋用户主页且命中隐藏访问记录 | `hidden_by_visitor` | 不进入对方访客列表；可保留后台审计所需底层访问事件 |
| `visible` | 超过 `M02-PARAM-visitor-visible-days` | `expired_window` | 前台最近看过我的列表不再展示 |
| `visible` | 任一方拉黑/冻结/注销/封禁/认证失效 | `invalid` | 前台展示失效原因；后台保留记录 |

### 4.3 `M02-SM-mutual-match` 匹配成功状态机

| 起始状态 | 事件/触发 | 目标状态 | 副作用 |
|----------|-----------|----------|--------|
| 无 | 命中 `M02-ENUM-match-source` 任一来源 | `matched` | 写匹配成功记录；首次触发时展示匹配成功弹窗；主页动作变为聊天 |
| `matched` | 取消喜欢/拉黑/冻结/注销/封禁/认证失效 | `invalid` | 相互喜欢列表置失效并展示原因；后续不可普通聊天 |

---

## 5. 模块业务规则

| 规则 ID | 规则描述 | 涉及端/页面 | 判定逻辑 | 备注 |
|---------|----------|-------------|----------|------|
| `M02-RULE-core-access` | 关系反馈核心准入 | APP/ADM | 发起方、接收方均需满足 `M01-RULE-core-access` 且账号正常 | 未满足时不形成真实关系 |
| `M02-RULE-gender-scope` | 首版仅异性关系反馈 | APP | 只展示和生成异性间关系反馈 | 继承 `M01-RULE-match-gender` |
| `M02-RULE-visit-generate` | 来访记录生成 | APP | 仅进入婚恋用户主页时生成；社区动态详情、职业主页不计入 | 来源场景写入 `M02-ENUM-relation-source-scene` |
| `M02-RULE-visit-dedup` | 访客去重 | APP/ADM | 同一访客 30 分钟内访问同一目标主页，只生成 1 条展示记录；PV 可累计 | 固定参数 `M02-PARAM-visit-dedup-minutes` |
| `M02-RULE-visitor-window` | 最近看过我的展示窗口 | APP/ADM | 前台列表只展示最近 7 天内 `visible` 访客记录 | 固定参数 `M02-PARAM-visitor-visible-days` |
| `M02-RULE-blur-display` | 模糊态字段 | APP | 普通未解锁状态不展示清晰头像、昵称、年龄、学校；仅展示弱识别标签、访问分组、访问次数等 | 页面规格列字段 |
| `M02-RULE-unlock-visibility` | 单条解锁清晰可见 | APP/ADM | 单条解锁成功后该记录永久清晰；访客列表是否展示仍受 7 天窗口限制 | 付费引用 PRD-04 |
| `M02-RULE-paywall-handoff` | 付费承接 | APP | 列表页点击模糊卡片先打开 `APP-02-PAGE-single-unlock-modal` 场景弹窗；弹窗内“只看 ta”复用 `APP-04-PAGE-paywall-modal` 千寻币确认；解锁全部唤起会员引导 | 不重复定义支付页 |
| `M02-RULE-single-unlock-modal-content` | 单条解锁弹窗场景内容 | APP | 喜欢我的单条副标题为“解锁喜欢你的人”；最近看过我的单条副标题为“揭秘是谁来看过你”；按钮固定为“只看 ta”“解锁全部” | 弹窗承载组件仍复用 PRD-04 |
| `M02-RULE-match-generate` | 匹配成功生成 | APP/ADM | 命中 `double_like`、`featured_heart_return_like`、`whisper_reply` 任一来源即生成匹配记录 | 同一对用户首次匹配时弹窗 |
| `M02-RULE-profile-action-after-match` | 匹配后主页动作联动 | APP | 匹配成功后，对方婚恋用户主页中的 `Yo` 按钮改为聊天 icon，底部主按钮改为聊天 icon + 聊天 | 页面主体由用户主页/PRD-05 承接，PRD-02 输出状态 |
| `M02-RULE-whisper-match` | 悄悄话回复触发匹配 | APP/ADM | PRD-03 悄悄话被接收方回复成功后，PRD-02 生成 `whisper_reply` 匹配记录 | 避免“匹配后才能回复悄悄话”的循环 |
| `M02-RULE-hidden-visit` | 隐藏访问记录 | APP/ADM | 用户具备有效会员隐私权益且开启开关时，不进入对方访客列表 | 会员到期后开关失效 |
| `M02-RULE-relation-invalid` | 关系失效展示 | APP/ADM | 拉黑、冻结、注销、封禁、认证失效后，前台记录置为失效并展示原因，后台保留可查 | 已确认口径 |
| `M02-RULE-like-cancel` | 取消喜欢联动 | APP/ADM | 取消喜欢后喜欢记录失效；若匹配来源为双向喜欢，则匹配同步失效 | |
| `M02-RULE-female-protection-ref` | 女性保护引用边界 | APP/ADM | PRD-02 只声明匹配成功后进入聊天链路需遵守 PRD-03 女性保护机制；保护期天数、默认 3 天、发送顺序、后台配置页由 PRD-03 承接 | 发送顺序不在 PRD-02 展开 |
| `M02-RULE-admin-scope` | 后台承接范围 | ADM | 首版只在 ADM-01 App 用户管理列表字段增强和用户详情关系记录区块承接；不新增全局关系列表，不提供关系反馈配置页 | 规则参数按代码固定 |
| `M02-RULE-admin-manual-boundary` | 后台人工操作边界 | ADM | 不开放手工制造匹配、补喜欢、恢复关系记录 | 高风险需求后续另立 |

---

## 6. 模块固定参数

> 本节参数为首版代码固定值，不提供 PRD-02 后台配置页、保存确认弹窗、配置日志或配置接口。若后续需要运营可调，需另立需求并重新评估权限、审计与灰度发布。

| 参数 ID | 固定参数 | 固定值 | 类型 | 实现位置 | 后台是否可改 | 备注 |
|---------|----------|--------|------|----------|--------------|------|
| `M02-PARAM-visitor-visible-days` | 最近看过我的前台展示天数 | 7 | int | 后端代码常量/查询条件 | 否 | 只影响前台最近看过我的列表窗口 |
| `M02-PARAM-visit-dedup-minutes` | 同一访客同一主页去重窗口 | 30 | int | 后端代码常量/写入去重逻辑 | 否 | 30 分钟内只生成 1 条展示记录，PV 可累计 |
| `M02-PARAM-likes-blur-limit` | 普通用户喜欢我的模糊展示条数上限 | 10 | int | 后端代码常量/列表查询 | 否 | 普通用户最多展示 10 条模糊喜欢记录 |
| `M02-PARAM-hidden-visit-enabled` | 是否允许用户开启隐藏访问记录 | true | bool | 后端代码常量/隐私权益判定 | 否 | 权益归 PRD-04，入口归 PRD-06 |
| `M02-PARAM-whisper-reply-match-enabled` | 悄悄话回复是否触发匹配成功 | true | bool | 后端代码常量/事件消费逻辑 | 否 | 悄悄话发送和回复归 PRD-03 |
| `M02-PARAM-match-popup-once` | 同一对用户首次匹配成功仅弹一次 | true | bool | 后端代码常量/弹窗已读逻辑 | 否 | 后续重复匹配不重复弹 |

> 喜欢我的单条解锁价格、最近看过我的单条解锁价格、会员全量查看权益由 PRD-04 `M04-CFG-coin-scene-price` 与 `M04-CFG-vip-benefit-list` 维护。

---

## 7. 模块通知、事件与文案

| 通知/事件/文案 ID | 类型 | 触发时机 / 所属场景 | 渠道 | 内容/变量/默认文案 | 是否后台可配 |
|------------------|------|---------------------|------|-------------------|--------------|
| `M02-EVT-like-created` | 事件 | 喜欢记录真实生效 | 内部事件 | fromUserId, toUserId, sourceScene | 否 |
| `M02-EVT-visit-created` | 事件 | 访客记录真实生效 | 内部事件 | visitorUserId, targetUserId, sourceScene | 否 |
| `M02-EVT-match-created` | 事件 | 匹配成功 | 内部事件/站内信 | userAId, userBId, matchSource | 否 |
| `M02-EVT-relation-invalidated` | 事件 | 关系失效 | 内部事件 | relationType, relationId, invalidReason | 否 |
| `M02-TXT-core-access-block` | 文案 | 未完成三重认证进入关系反馈 | APP | 完成实名、头像、学历三重认证后，才可查看谁喜欢你、谁看过你，并开启真实互动 | 是 |
| `M02-TXT-likes-empty` | 文案 | 喜欢我的空态 | APP | 还没有人喜欢你，去完善资料和上传更吸引人的照片吧 | 是 |
| `M02-TXT-viewers-empty` | 文案 | 最近看过我的空态 | APP | 最近还没有人来看过你 | 是 |
| `M02-TXT-mutual-empty` | 文案 | 相互喜欢空态 | APP | 还没有相互喜欢的人 | 是 |
| `M02-TXT-relation-invalid` | 文案 | 前台关系失效态 | APP | 该关系已失效：{invalidReason} | 是 |
| `M02-TXT-match-success-title` | 文案 | 匹配成功弹窗 | APP | 你们相互喜欢啦 | 是 |
| `M02-TXT-single-unlock-title` | 文案 | 单条解锁弹窗标题 | APP | 查看对方资料 | 是 |
| `M02-TXT-like-unlock-subtitle` | 文案 | 喜欢我的单条解锁副标题 | APP | 解锁喜欢你的人 | 是 |
| `M02-TXT-viewer-unlock-subtitle` | 文案 | 最近看过我的单条解锁副标题 | APP | 揭秘是谁来看过你 | 是 |

---

## 8. 模块错误码

| 错误码 ID | HTTP code | 业务 code | 含义 | 用户提示文案 | 是否可重试 |
|-----------|-----------|-----------|------|--------------|------------|
| `M02-ERR-core-access-blocked` | 403 | 20001 | 关系反馈核心准入未开放 | 完成三重认证后才能使用关系反馈 | 否 |
| `M02-ERR-relation-target-invalid` | 409 | 20002 | 目标用户或关系记录已失效 | 该关系已失效 | 否 |
| `M02-ERR-hidden-visit-unavailable` | 403 | 20003 | 隐藏访问记录权益不可用 | 开通会员后可使用隐私权益 | 否 |
| `M02-ERR-duplicate-like` | 409 | 20004 | 重复喜欢 | 你已经喜欢过对方 | 否 |
| `M02-ERR-unlock-record-expired-window` | 409 | 20005 | 访客记录超过前台展示窗口 | 该访客记录已不在最近展示范围内 | 否 |
| `M02-ERR-relation-stat-unavailable` | 503 | 20006 | 关系统计服务不可用 | 关系数据暂不可用，请稍后重试 | 是 |

---

## 9. 模块接口草案

| 端 | 方法 | 路径 | 说明 | 关联规则/状态 |
|----|------|------|------|---------------|
| APP | GET | `/api/app/relation/likes-me` | 查询喜欢我的列表 | `M02-RULE-blur-display` |
| APP | GET | `/api/app/relation/recent-viewers` | 查询最近看过我的列表 | `M02-RULE-visitor-window` |
| APP | GET | `/api/app/relation/mutual-matches` | 查询相互喜欢列表 | `M02-SM-mutual-match` |
| APP | POST | `/api/app/relation/like` | 发起喜欢 | `M02-RULE-core-access` |
| APP | POST | `/api/app/relation/like/cancel` | 取消喜欢 | `M02-RULE-like-cancel` |
| APP | POST | `/api/app/relation/visit` | 记录婚恋主页访问 | `M02-RULE-visit-generate` |
| APP | POST | `/api/app/relation/match/popup-read` | 标记匹配成功弹窗已读 | `M02-PARAM-match-popup-once` |
| ADM | GET | `/api/admin/users/{userId}/relations/summary` | 查询用户关系反馈摘要 | `M02-RULE-admin-scope` |
| ADM | GET | `/api/admin/users/{userId}/relations/likes` | 查询用户详情喜欢记录 | `M02-SM-like-record` |
| ADM | GET | `/api/admin/users/{userId}/relations/visits` | 查询用户详情访客记录 | `M02-SM-visit-record` |
| ADM | GET | `/api/admin/users/{userId}/relations/matches` | 查询用户详情匹配记录 | `M02-SM-mutual-match` |

> 接口路径为产品草案，最终技术方案可按项目后端路由规范调整；产品规则和 ID 不随接口路径变化。
> 悄悄话发送接口归 PRD-03 定义；PRD-02 只接收“悄悄话已回复”的内部事件并生成 `whisper_reply` 匹配记录。

### 9.1 APP 响应结构草案

#### 9.1.1 喜欢我的列表

```json
{
  "total": 32,
  "vipUnlocked": false,
  "list": [
    {
      "recordNo": "LIK-20260702-0001",
      "userId": "U100488",
      "displayStatus": "blur",
      "nickname": null,
      "avatar": "https://example.com/avatar-blur.png",
      "weakTags": ["同城", "金牛座"],
      "isMutualLike": false,
      "likedTime": "2026-07-02 10:00:00",
      "invalidReason": null
    }
  ]
}
```

#### 9.1.2 最近看过我的列表

```json
{
  "totalVisitCount": 415,
  "todayVisitorCount": 1,
  "todayViewCount": 1,
  "visibleDays": 7,
  "list": [
    {
      "visitNo": "VIS-20260702-0001",
      "userId": "U100489",
      "displayStatus": "blur",
      "groupKey": "today",
      "visitCount": 2,
      "weakTags": ["同城", "在线 2 小时前"],
      "hasWhisperFromThem": true,
      "hasWhisperToThem": false,
      "isMutualLike": false,
      "invalidReason": null
    }
  ]
}
```

#### 9.1.3 相互喜欢列表

```json
{
  "total": 5,
  "list": [
    {
      "matchNo": "MAT-20260702-0001",
      "userId": "U100490",
      "nickname": "小雨",
      "avatar": "https://example.com/avatar.png",
      "age": 26,
      "height": 165,
      "matchSource": "double_like",
      "matchStatus": "matched",
      "matchTime": "2026-07-02 09:20:00",
      "canChat": true,
      "invalidReason": null
    }
  ]
}
```

---

## 10. 与其他 PRD 的边界

| 关联 PRD | PRD-02 负责 | 对方 PRD 负责 |
|----------|-------------|---------------|
| PRD-01 用户准入 | 引用核心准入结果，决定能否形成真实关系 | 实名、头像、学历认证状态与核心准入状态计算 |
| PRD-03 消息、私信与通知中心 | 生成匹配成功和聊天入口状态 | 会话、悄悄话发送/回复、女性保护发送顺序、消息内容审核 |
| PRD-04 商业化 | 触发喜欢/访客单条解锁与会员全量查看 | 千寻币扣减、会员权益、支付、资产流水、订单、退款 |
| PRD-05 推荐模块 | 记录从推荐/精选/理想型进入主页、喜欢的来源 | 推荐列表、精选、理想型、用户主页主体展示 |
| PRD-06 安全设置 | 引用隐藏访问记录入口与账号状态 | 隐私设置页面、拉黑/屏蔽、注销流程 |

---

## 11. 集中异常与边界场景清单

| 场景 ID | 异常/边界场景 | 处理规则 | 引用 |
|---------|---------------|----------|------|
| `M02-EX-like-cancel` | 喜欢记录被撤回 | 喜欢我的记录置为失效；若匹配来源为双向喜欢，相互喜欢同步失效 | `M02-RULE-like-cancel` |
| `M02-EX-account-invalid` | 对方账号被冻结、停用、注销中或已注销 | 前台记录置为失效态并展示原因，后台保留可查 | `M02-RULE-relation-invalid` |
| `M02-EX-hidden-visit` | 对方开启隐藏访问记录且权益有效 | 不进入我的最近看过我的列表 | `M02-RULE-hidden-visit` |
| `M02-EX-single-unlock-then-vip` | 用户单条解锁后又开通会员 | 单条解锁记录继续清晰；会员期内全量清晰 | `M02-RULE-unlock-visibility`、PRD-04 |
| `M02-EX-vip-expired` | 会员到期 | 全量查看权益回退普通态；已购买单条继续清晰 | PRD-04 |
| `M02-EX-visitor-window-expired` | 最近看过我的记录超过 7 天 | 前台最近看过我的列表不展示；后台和资产/解锁记录仍可追溯 | `M02-RULE-visitor-window` |
| `M02-EX-repeat-visit` | 同一用户短时间多次访问同一主页 | 30 分钟内只生成 1 条访客展示记录，PV 可累计 | `M02-RULE-visit-dedup` |
| `M02-EX-block-after-match` | 匹配成功后对方拉黑 | 相互喜欢记录置失效并展示原因，后续不可普通聊天 | `M02-RULE-relation-invalid` |
