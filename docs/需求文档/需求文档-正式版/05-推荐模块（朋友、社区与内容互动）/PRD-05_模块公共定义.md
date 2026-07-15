# PRD-05 模块公共定义 - 推荐模块（朋友、社区与内容互动）

> 本文件是 PRD-05 的模块定义层，统一登记仅 PRD-05 使用、但跨移动端/管理后台/多页面复用的术语、枚举、状态机、规则、配置、通知、事件、错误码与接口约定。
> 正式版范围以 `docs/需求文档/一期上线目标.md` 为准：本期聚焦千寻成家社区、悦目、诚意贴、内容互动与后台社区互动管理。

| 版本 | 日期 | 修改人 | 变更摘要（改动须列出受影响的页面 ID） |
|------|------|--------|----------|
| 版本08 | 2026-07-15 | Codex | 新增统一婚恋用户主页，承接 PRD-02 访客、喜欢、匹配聊天及用户安全动作，影响 APP-05-PAGE-user-profile、APP-05-PAGE-user-posts |
| 版本01 | 2026-07-06 | Codex | 按一期上线目标创建 PRD-05 正式版模块公共定义，影响 APP-05/ADM-05 全部页面 |
| 版本02 | 2026-07-06 | Codex | 按第 1 轮核查收敛诚意贴详情为动态详情页视图，补充跨模块接口依赖与编号说明，影响 APP-05-PAGE-post-detail、APP-05-PAGE-sincere-list、APP-05-PAGE-user-posts、ADM-05-PAGE-comment-audit |
| 版本03 | 2026-07-06 | Codex | 按评审意见补充机审配置关闭后的人工复核路径，影响 APP-05-PAGE-post-publish、ADM-05-PAGE-community-config |
| 版本04 | 2026-07-07 | Codex | 按移动端 Demo 审查补充发布图片九宫格、悦目原比例展示和更多操作对象类型口径，影响 APP-05-PAGE-post-publish、APP-05-PAGE-yuemu、APP-05-PAGE-community-more-actions |
| 版本05 | 2026-07-07 | Codex | 按确认口径将家园话题拆为后台独立管理页，影响 APP-05-PAGE-topic-list、APP-05-PAGE-topic-detail、APP-05-PAGE-post-publish、ADM-05-PAGE-topic-manage、ADM-05-PAGE-community-config |
| 版本06 | 2026-07-07 | Codex | 按确认口径收敛 ADM-05 后台页面范围为 6 页 |
| 版本07 | 2026-07-09 | Codex | 按甲方帖子审核意见补充禁言周期、IP 封禁、话题封面图片、跨来源帖子治理和作者头像来源口径，影响 APP-05-PAGE-community-following、APP-05-PAGE-topic-list、APP-05-PAGE-topic-detail、ADM-05-PAGE-content-manage、ADM-05-PAGE-report-handle、ADM-05-PAGE-topic-manage、ADM-05-PAGE-community-config |

---

## 1. 已确认产品结论

| 编号 | 结论 | 文档落点 |
|------|------|----------|
| M05-01 | 移动端以 `千寻 -> 成家` 的社区信息流和 `千寻 -> 知音` 的悦目、诚意贴为主 | `APP-05_端内定义.md` |
| M05-02 | 社区内容浏览面向已登录用户开放；发布动态、发布诚意贴、评论、回复、点赞、关注、@用户需满足 PRD-01 核心准入规则；若 PRD-01 未落地，正式 PRD 仍以三项认证全部通过作为目标口径 | `M05-RULE-interaction-gate` |
| M05-03 | 举报动作允许已登录用户发起，不强制三项认证，用于安全治理闭环 | `M05-RULE-report-gate` |
| M05-04 | 关注仅用于社区弱关系，不影响普通私信开聊；普通私信仍由 PRD-03/关系规则控制 | `M05-RULE-follow-isolation` |
| M05-05 | 社区首页一期保留关注、同城、热门、话题入口 | `M05-CFG-community-tabs` |
| M05-06 | 悦目一期定义为图片优先的轻内容流，数据源来自已公开动态的第一张图片或专门标记为悦目的公开内容，两路合并后排序去重；前台必须按图片原始宽高比展示，并支持预览、点赞和加载更多 | `M05-RULE-yuemu-source`、`M05-RULE-yuemu-ratio` |
| M05-07 | 诚意贴为社区内容的一种内容类型，详情由动态详情页诚意贴视图承接；标题和正文有额外校验 | `M05-ENUM-content-type`、`M05-RULE-sincere-post` |
| M05-08 | 动态、诚意贴、评论均需服务端内容安全校验；微信机审异常或不确定时不直接公开，进入人工复核 | `M05-SRV-wechat-content-security`、`M05-SM-content-audit` |
| M05-09 | 动态公开口径一期统一为“机审通过后可公开，并进入人工抽检”；诚意贴为“机审通过后进入人工审核，人工通过后公开”；评论为“机审通过后公开，支持人工复核” | `M05-RULE-audit-publish` |
| M05-10 | 默认不允许联系方式；联系方式识别范围至少包含手机号、微信号、QQ、邮箱、二维码、明显谐音规避和图片内联系方式 | `M05-RULE-contact-block` |
| M05-11 | 话题由后台家园话题管理维护，用户不可临时创建话题 | `M05-CFG-topic-dict` |
| M05-12 | 点赞、评论、关注、@、审核结果、举报结果等互动通知由 PRD-03 消息通知中心承接，PRD-05 只定义事件与触发时机 | `M05-NTF-*`、`M05-EVT-*` |
| M05-13 | 后台一期采用 `社区互动管理` 菜单，包含内容管理、动态管理、评论管理、举报管理、家园话题管理和社区配置 | `ADM-05_端内定义.md` |
| M05-15 | 社区打招呼入口承接 PRD-03 悄悄话发送规则，PRD-05 只定义从社区内容/用户卡片进入时的目标用户、来源内容和准入展示 | `M05-RULE-community-greeting-entry` |
| M05-16 | 社区发私信入口仅按 PRD-03 普通私信开放规则判断；符合条件时跳转私信对话页，不符合时展示原因和打招呼入口 | `M05-RULE-community-private-entry` |
| M05-17 | 社区更多操作作为统一弹窗承接举报、屏蔽当前内容、复制链接、打招呼和发私信入口，必须按 `post/comment/user` 对象类型展示对应操作，不展示与对象无关的操作 | `M05-RULE-community-more-actions` |
| M05-18 | 移动端作者头像必须使用用户已审核通过的上传头像，禁止用姓名、姓氏首字或昵称文字替代头像；头像缺失或加载失败时仅展示平台默认头像 | `M05-RULE-author-avatar` |
| M05-19 | 家园话题封面必须使用图片资源，后台新增/编辑话题时上传封面并做图片安全校验；移动端话题入口、话题列表和话题详情不得用纯文字块替代封面图 | `M05-RULE-topic-cover-image` |
| M05-20 | 后台内容治理按内容来源场景兼容多来源帖子：一期接入成家动态、知音诚意贴；立业帖子仅预留来源枚举和字段，不在一期移动端开放 | `M05-RULE-content-source-compatible`、`M05-ENUM-content-source-scene` |
| M05-21 | 举报成立后的禁言动作必须选择禁言周期；防机器人刷帖等高风险场景支持 IP 封禁，并记录周期、范围、原因和审计日志 | `M05-RULE-mute-period`、`M05-RULE-ip-block` |
| M05-22 | 婚恋用户主页由 PRD-05 统一承接；`APP-05-PAGE-user-posts` 仅作为主页个人动态区块，不等同完整主页 | `M05-RULE-user-profile-handoff`、`APP-05-PAGE-user-profile` |

---

## 2. 模块术语表

| 术语 ID | 统一术语 | 禁用旧称/别名 | 定义 | 是否需提升全局 |
|---------|----------|--------------|------|---------------|
| `M05-TERM-community-post` | 动态 | 帖子、Moment | 千寻成家社区中由用户发布的公开图文内容，可进入关注、同城、热门、话题等信息流 | 否 |
| `M05-TERM-sincere-post` | 诚意贴 | 交友贴、长文贴 | 带标题、正文、话题和审核门槛的长文社交内容，是社区内容的一种类型 | 否 |
| `M05-TERM-yuemu` | 悦目 | 图片墙 | 知音场景下图片优先的公开内容流，来源为审核通过的公开图片内容 | 否 |
| `M05-TERM-topic` | 话题 | 家园话题、社区标签 | 后台预置的内容聚合维度，发布动态/诚意贴时从启用话题中选择 | 否 |
| `M05-TERM-content-audit` | 内容审核 | 机审、人工审核 | 对动态、诚意贴、评论进行微信内容安全校验和人工审核/抽检的治理流程 | 否 |
| `M05-TERM-report` | 举报 | 投诉 | 用户对动态、评论、用户、悄悄话等对象提交的安全治理线索，PRD-05 承接社区内容来源 | 否 |
| `M05-TERM-follow` | 关注 | 粉丝关系 | 社区弱关系关注，不等同于匹配成功，也不开放普通私信 | 否 |
| `M05-TERM-community-greeting-entry` | 社区打招呼入口 | 社区破冰入口 | 从社区内容卡片、作者区或用户主页触发的悄悄话发送入口，发送资格、扣费和状态由 PRD-03/PRD-04 承接 | 否 |
| `M05-TERM-community-private-entry` | 社区发私信入口 | 社区聊天入口 | 从社区场景进入普通私信前的资格判断页；仅匹配成功且满足 PRD-03 规则时进入普通私信 | 否 |
| `M05-TERM-community-more-actions` | 社区更多操作 | 更多菜单 | 社区内容、评论或用户维度的底部操作弹窗，统一承接举报、屏蔽、复制链接和触达入口 | 否 |
| `M05-TERM-content-source-scene` | 内容来源场景 | 所属模块、帖子来源 | 后台治理列表用于区分内容来自成家动态、知音诚意贴或后续立业帖子等来源的稳定字段 | 否 |
| `M05-TERM-ip-block` | IP 封禁 | IP 拉黑 | 针对机器人刷帖、批量广告、异常举报等高风险行为，限制指定 IP 在周期内提交动态、评论、举报等写操作的风控动作 | 否 |

### 2.1 引用的跨模块定义

| 引用 ID | 名称 | 使用场景 |
|---------|------|----------|
| `M01-RULE-core-access` | 核心准入规则 | 发布、评论、点赞、关注、@用户资格判断 |
| `M02-SM-mutual-match` | 匹配成功状态机 | 社区发私信入口判断普通私信是否可打开 |
| `M03-RULE-private-chat-open` | 普通私信开放规则 | 社区发私信入口判断和跳转 |
| `M03-RULE-whisper-send` | 悄悄话发送规则 | 社区打招呼入口发送资格判断 |
| `M03-EVT-notification-created` | 通知创建事件 | 互动通知、审核结果和举报结果通知承接 |
| `GLB-ROLE-app-user` | App 用户 | 已登录用户浏览、举报与互动 |

---

## 3. 模块枚举

### 3.1 `M05-ENUM-content-type` 内容类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `community_post` | 动态 | 千寻成家社区普通图文动态 | 1 | 是 | 启用 |
| `sincere_post` | 诚意贴 | 知音场景下的长文社交内容 | 2 | 否 | 启用 |
| `yuemu_item` | 悦目内容 | 图片优先公开内容流条目，可由动态首图或专门标记内容生成 | 3 | 否 | 启用 |

### 3.2 `M05-ENUM-content-status` 内容状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `draft` | 草稿 | 用户编辑中，未提交 | 1 | 否 | 启用 |
| `pending_machine` | 机审中 | 服务端已提交内容安全校验 | 2 | 否 | 启用 |
| `pending_manual` | 待人工复核 | 需要人工审核或抽检 | 3 | 否 | 启用 |
| `published` | 已公开 | 前台可见 | 4 | 是 | 启用 |
| `rejected` | 已驳回 | 审核未通过，作者可按规则重发 | 5 | 否 | 启用 |
| `deleted` | 用户已删除 | 作者主动删除，前台不可见 | 6 | 否 | 启用 |
| `blocked` | 已下架 | 后台因违规下架，前台不可见 | 7 | 否 | 启用 |

### 3.3 `M05-ENUM-comment-status` 评论状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `pending_machine` | 机审中 | 评论提交后进行文本安全校验 | 1 | 否 | 启用 |
| `published` | 已公开 | 评论前台可见 | 2 | 是 | 启用 |
| `rejected` | 已驳回 | 机审或人工复核不通过 | 3 | 否 | 启用 |
| `deleted` | 用户已删除 | 评论作者删除 | 4 | 否 | 启用 |
| `blocked` | 已屏蔽 | 后台因违规屏蔽 | 5 | 否 | 启用 |

### 3.4 `M05-ENUM-report-status` 举报状态

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `pending` | 待处理 | 举报已提交，后台未处理 | 1 | 是 | 启用 |
| `processing` | 处理中 | 后台正在复核 | 2 | 否 | 启用 |
| `valid` | 举报成立 | 已执行下架、屏蔽、警告、禁言或封号等处理 | 3 | 否 | 启用 |
| `invalid` | 举报不成立 | 未发现违规或证据不足 | 4 | 否 | 启用 |
| `merged` | 已合并 | 与重复举报合并处理 | 5 | 否 | 启用 |

### 3.5 `M05-ENUM-report-target-type` 举报对象类型

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `post` | 帖子/动态/诚意贴 | 社区内容举报；后续立业帖子接入时仍使用该对象类型并通过来源场景区分 | 1 | 否 | 启用 |
| `comment` | 评论 | 评论或回复举报 | 2 | 否 | 启用 |
| `user` | 用户主页 | 用户资料、头像或主页举报 | 3 | 否 | 启用 |
| `chat` | 聊天/悄悄话 | 由 PRD-03 聊天举报接入统一举报处理 | 4 | 否 | 启用 |

### 3.6 `M05-ENUM-punish-action` 处罚动作

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `none` | 不处罚 | 举报不成立或仅记录 | 1 | 是 | 启用 |
| `block_content` | 下架内容 | 动态/诚意贴下架 | 2 | 否 | 启用 |
| `block_comment` | 屏蔽评论 | 评论不可见 | 3 | 否 | 启用 |
| `warn_user` | 警告用户 | 发送违规警告通知 | 4 | 否 | 启用 |
| `mute_user` | 禁言用户 | 按禁言周期限期禁止发布和评论 | 5 | 否 | 启用 |
| `ip_block` | IP 封禁 | 按封禁周期限制风险 IP 提交动态、评论、举报等写操作 | 6 | 否 | 启用 |
| `freeze_user` | 冻结账号 | 由用户管理执行冻结 | 7 | 否 | 启用 |

### 3.7 `M05-ENUM-content-source-scene` 内容来源场景

| 值（code） | 显示名 | 说明 | 排序 | 是否默认 | 状态 |
|------------|--------|------|------|----------|------|
| `qianxun_chengjia` | 千寻成家动态 | 成家社区普通动态、话题内容和悦目来源动态 | 1 | 是 | 启用 |
| `qianxun_zhiyin_sincere` | 千寻知音诚意贴 | 知音场景中的诚意贴内容 | 2 | 否 | 启用 |
| `liye_post_reserved` | 立业帖子 | 后续立业模块帖子接入预留；一期只保留字段和筛选口径，不开放前台入口 | 3 | 否 | 预留 |

### 3.x 枚举索引

| 枚举 ID | 中文名 | 是否后台可配 | 备注 |
|---------|--------|-------------|------|
| `M05-ENUM-content-type` | 内容类型 | 否 | 诚意贴为内容类型，不单独建平行社区 |
| `M05-ENUM-content-status` | 内容状态 | 否 | 状态机驱动 |
| `M05-ENUM-comment-status` | 评论状态 | 否 | 状态机驱动 |
| `M05-ENUM-report-status` | 举报状态 | 否 | 状态机驱动 |
| `M05-ENUM-report-target-type` | 举报对象类型 | 否 | 聊天来源由 PRD-03 接入 |
| `M05-ENUM-punish-action` | 处罚动作 | 部分 | 是否启用和角色权限由后台端内定义控制 |
| `M05-ENUM-content-source-scene` | 内容来源场景 | 否 | 后台治理兼容成家动态、知音诚意贴和后续立业帖子 |

---

## 4. 模块状态机

### 4.1 `M05-SM-content-audit` 内容审核状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| `draft` | 用户提交动态/诚意贴 | `pending_machine` | 满足 `M05-RULE-interaction-gate` 和字段校验 | 写提交记录，触发 `M05-EVT-content-submitted` |
| `pending_machine` | 机审通过且内容类型为动态/悦目来源动态 | `published` | 微信内容安全返回通过 | 前台可见，进入人工抽检池，触发 `M05-EVT-content-published` |
| `pending_machine` | 机审通过且内容类型为诚意贴 | `pending_manual` | 微信内容安全返回通过 | 进入人工审核队列 |
| `pending_machine` | 机审不通过 | `rejected` | 命中风险 | 通知作者驳回，触发 `M05-NTF-content-rejected` |
| `pending_machine` | 机审异常/不确定 | `pending_manual` | 超时、接口异常或策略不确定 | 不公开，进入人工复核 |
| `pending_manual` | 人工通过 | `published` | 审核员具备权限 | 前台可见，触发通知 |
| `pending_manual` | 人工驳回 | `rejected` | 审核员具备权限 | 通知作者驳回原因 |
| `published` | 作者删除 | `deleted` | 作者本人操作 | 前台不可见，后台保留记录 |
| `published` | 举报成立/后台下架 | `blocked` | 后台处理通过 | 前台不可见，触发处罚/通知 |
| `rejected` | 作者重新编辑提交 | `pending_machine` | 修改后重新提交 | 生成新的审核记录 |

### 4.2 `M05-SM-comment-audit` 评论状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| `pending_machine` | 机审通过 | `published` | 评论文本安全通过 | 评论可见，动态评论数 +1 |
| `pending_machine` | 机审不通过 | `rejected` | 命中风险 | 通知评论作者 |
| `pending_machine` | 机审异常/不确定 | `rejected` | 评论不进入人工队列，提示稍后重试 | 不增加评论数 |
| `published` | 作者删除 | `deleted` | 作者本人操作 | 评论不可见，评论数 -1 |
| `published` | 举报成立/后台屏蔽 | `blocked` | 后台处理通过 | 评论不可见，触发处罚/通知 |

### 4.3 `M05-SM-report` 举报处理状态机

| 起始状态 | 事件/触发 | 目标状态 | 前置条件 | 副作用 |
|----------|-----------|----------|----------|--------|
| `pending` | 审核员认领/打开处理 | `processing` | 具备举报处理权限 | 写处理日志 |
| `processing` | 举报成立 | `valid` | 选择处罚动作和处理说明 | 执行 `M05-ENUM-punish-action`，通知举报人和被处理方 |
| `processing` | 举报不成立 | `invalid` | 填写原因 | 通知举报人处理结果 |
| `pending`/`processing` | 与重复举报合并 | `merged` | 关联主举报单 | 不重复处罚 |

---

## 5. 模块业务规则

| 规则 ID | 规则描述 | 涉及端/页面 | 判定逻辑 | 备注 |
|---------|----------|-------------|----------|------|
| `M05-RULE-browse-gate` | 已登录用户可浏览公开社区内容 | APP 全部内容浏览页 | 未登录引导登录；账号冻结/停用不展示互动入口 | 浏览不要求三项认证 |
| `M05-RULE-interaction-gate` | 发布、评论、回复、点赞、关注、@用户需满足核心准入 | APP 发布/详情/列表页 | `isLogin && accountNormal && M01-RULE-core-access == passed` | 若技术侧临时降级需在技术方案标明，不改变 PRD 目标口径 |
| `M05-RULE-report-gate` | 举报仅要求已登录且账号未冻结 | APP 举报弹窗 | `isLogin && accountNotFrozen` | 安全治理优先 |
| `M05-RULE-follow-isolation` | 关注不开放普通私信 | APP 关注/用户主页 | 关注只写 `FollowRelation`，不改聊天权限 | 避免与 PRD-03 冲突 |
| `M05-RULE-audit-publish` | 动态机审通过可公开并抽检，诚意贴需人工通过公开，评论机审通过公开 | APP/ADM 审核页 | 按 `M05-SM-content-audit` 和 `M05-SM-comment-audit` | 统一旧移动端/后台冲突 |
| `M05-RULE-contact-block` | 默认拦截联系方式 | 发布页/审核页 | 命中联系方式且开关关闭时阻断或驳回 | 包含文本与图片二维码 |
| `M05-RULE-topic-source` | 话题仅来自后台启用字典 | 发布页/话题页/后台家园话题管理 | 发布时必须选择启用话题，不支持用户新建；已下线话题保留历史内容展示但不可新增发布 | 本期话题来源单一 |
| `M05-RULE-post-image-grid` | 发布图片九宫格规则 | 发布页/动态详情/悦目来源 | 动态与诚意贴最多 9 图，前台展示 `x/9` 计数、缩略图、添加入口和删除入口；达到上限后隐藏添加入口 | 图片上传后仍需内容安全校验 |
| `M05-RULE-yuemu-source` | 悦目来源于审核通过的公开图片内容 | 悦目页 | 取已公开动态中的第一张图片，或取标记为悦目的独立内容条目；两路合并后按发布时间、后台置顶和内容权重排序去重 | 图片优先展示 |
| `M05-RULE-yuemu-ratio` | 悦目原比例展示规则 | 悦目页/图片预览 | 服务端返回 `coverWidth`、`coverHeight` 或 `aspectRatio`，前台按等宽双列计算卡片高度，禁止固定高度拉伸或裁掉主体信息 | 图片加载失败时展示占位图 |
| `M05-RULE-sincere-post` | 诚意贴字段与审核规则 | 诚意贴列表/动态详情页诚意贴视图/发布 | `contentType=sincere_post`，标题必填、正文不少于 20 字、话题必选、最多 9 图、人工通过后公开 | 详情复用 `APP-05-PAGE-post-detail` |
| `M05-RULE-community-more-actions` | 社区更多操作展示规则 | APP 信息流/详情/个人动态区 | 按对象类型展示举报、屏蔽当前内容、复制链接、打招呼、发私信；不可用操作隐藏或置灰并说明原因 | 弹窗内操作跳转对应页面 |
| `M05-RULE-community-greeting-entry` | 社区打招呼入口规则 | APP 社区打招呼页 | 已登录、账号正常、目标用户可见，发送资格引用 `M03-RULE-whisper-send`；来源内容仅作为上下文记录 | 不生成普通私信会话 |
| `M05-RULE-community-private-entry` | 社区发私信入口规则 | APP 社区发私信页 | 先读取 `M03-RULE-private-chat-open` 判断；允许时跳转 `APP-03-PAGE-private-chat`，不允许时展示原因并可进入打招呼页 | 避免社区入口绕过匹配规则 |
| `M05-RULE-author-avatar` | 作者头像展示规则 | APP 信息流/详情/悦目/诚意贴/个人动态区 | 作者头像取 PRD-01 用户已审核通过的上传头像 URL；禁止用姓名、姓氏首字、昵称文字作为头像；头像为空或加载失败时展示平台默认头像 | 昵称仍可展示，但不得充当头像 |
| `M05-RULE-topic-cover-image` | 话题封面图片规则 | APP 话题列表/话题详情/热门话题入口、ADM 家园话题管理 | 话题封面必须为图片资源，后台上传后生成私有资源地址并做图片安全校验；移动端使用图片缩略图展示，失败时展示平台默认封面图 | 不使用纯文字块或姓名式占位图 |
| `M05-RULE-content-source-compatible` | 多来源帖子治理兼容规则 | ADM 内容管理/评论管理/举报管理 | 治理对象以 `targetType=post/comment/user/chat` 和 `contentSourceScene` 组合区分来源；一期接入成家动态、知音诚意贴，后续立业帖子接入时复用同一审核、举报、处罚和日志链路 | 立业帖子一期不进入移动端范围 |
| `M05-RULE-mute-period` | 禁言周期规则 | ADM 举报管理/内容管理/评论管理 | 选择 `mute_user` 时必须选择禁言周期，默认候选 1 天、3 天、7 天、30 天，支持具备权限角色填写自定义结束时间；禁言生效后禁止发布动态、诚意贴和评论 | 永久封禁不在 PRD-05 直接执行，需走账号冻结 |
| `M05-RULE-ip-block` | IP 封禁规则 | ADM 举报管理/社区配置 | 防机器人刷帖、批量广告、异常高频举报等场景可选择 `ip_block`；必须填写封禁周期、风险 IP、封禁范围和原因；默认只限制写操作，不影响已登录正常浏览；风险 IP 展示需脱敏并按权限查看 | IP 地址为安全敏感数据，解除和误伤申诉需写审计 |
| `M05-RULE-user-profile-handoff` | 婚恋用户主页承接 | APP 婚恋用户主页 | 主页展示 PRD-01 已审核资料与认证信息，个人动态区引用 `APP-05-PAGE-user-posts`；进入主页通知 PRD-02 写访客，喜欢/取消喜欢和匹配状态引用 PRD-02，聊天引用 PRD-03，举报/拉黑由 PRD-05 安全动作承接 | 主页不得自行复制关系状态机 |

---

## 6. 模块配置项

| 配置 ID | 配置项 | 默认值 | 类型 | 配置路径 | 修改后是否立即生效 | 高风险 |
|---------|--------|--------|------|----------|-------------------|--------|
| `M05-CFG-community-tabs` | 社区 Tab 与入口排序 | 关注/同城/热门/话题 | json | 社区互动管理 -> 社区配置 | 是 | 否 |
| `M05-CFG-topic-dict` | 话题字典 | 后台预置 | dict | 社区互动管理 -> 家园话题管理 | 是 | 否 |
| `M05-CFG-topic-display` | 家园话题入口展示配置 | 推荐/全部话题 | json | 社区互动管理 -> 家园话题管理 | 是 | 否 |
| `M05-CFG-report-reason-dict` | 举报原因字典 | 平台预置 | dict | 社区互动管理 -> 举报处理 | 是 | 否 |
| `M05-CFG-post-max-images` | 动态/诚意贴图片上限 | 9 | int | 社区互动管理 -> 社区配置 | 是 | 否 |
| `M05-CFG-post-max-text` | 动态正文上限 | 500 | int | 社区互动管理 -> 社区配置 | 是 | 否 |
| `M05-CFG-sincere-min-text` | 诚意贴正文下限 | 20 | int | 社区互动管理 -> 社区配置 | 是 | 否 |
| `M05-CFG-mention-limit` | @用户上限 | 5 | int | 社区互动管理 -> 社区配置 | 是 | 否 |
| `M05-CFG-contact-allow` | 是否允许联系方式 | false | bool | 社区互动管理 -> 社区配置 | 是 | 是 |
| `M05-CFG-machine-audit-enabled` | 微信内容安全启用 | true | bool | 社区互动管理 -> 社区配置 | 是 | 是 |
| `M05-CFG-manual-sample-rate` | 动态人工抽检比例 | 10% | int | 社区互动管理 -> 社区配置 | 是 | 否 |
| `M05-CFG-mute-period-options` | 禁言周期选项 | 1天/3天/7天/30天 | json | 社区互动管理 -> 社区配置 | 是 | 是 |
| `M05-CFG-ip-block-enabled` | IP 封禁开关 | true | bool | 社区互动管理 -> 社区配置 | 是 | 是 |
| `M05-CFG-ip-block-period-options` | IP 封禁周期选项 | 1小时/24小时/72小时/7天 | json | 社区互动管理 -> 社区配置 | 是 | 是 |
| `M05-CFG-ip-block-write-scope` | IP 封禁写操作范围 | 发布动态/发布诚意贴/评论/举报 | json | 社区互动管理 -> 社区配置 | 是 | 是 |

配置补充规则：`M05-CFG-machine-audit-enabled=false` 时，动态、诚意贴和图片内容提交后直接进入 `pending_manual`，评论提交返回稍后重试提示；该口径与 `M05-SM-content-audit` 的人工复核分支一致。

---

## 7. 模块通知、事件与文案

| 通知/事件/文案 ID | 类型 | 触发时机 / 所属场景 | 渠道 | 内容/变量/默认文案 | 是否后台可配 |
|------------------|------|---------------------|------|-------------------|--------------|
| `M05-EVT-content-submitted` | 事件 | 内容提交 | 服务端事件 | contentId, contentType, authorId | 否 |
| `M05-EVT-content-published` | 事件 | 内容公开 | 服务端事件 | contentId, contentType | 否 |
| `M05-EVT-comment-created` | 事件 | 评论公开 | 服务端事件 | commentId, postId, targetUserId | 否 |
| `M05-EVT-like-created` | 事件 | 点赞成功 | 服务端事件 | postId, actorId, authorId | 否 |
| `M05-EVT-follow-created` | 事件 | 关注成功 | 服务端事件 | followerId, targetUserId | 否 |
| `M05-EVT-report-submitted` | 事件 | 举报提交 | 服务端事件 | reportId, targetType, targetId | 否 |
| `M05-EVT-community-more-action-clicked` | 事件 | 点击社区更多操作 | 服务端/埋点事件 | action, targetType, targetId, sourcePage | 否 |
| `M05-EVT-community-greeting-entry-clicked` | 事件 | 点击社区打招呼入口 | 服务端/埋点事件 | sourceType, sourceId, targetUserId | 否 |
| `M05-EVT-community-private-entry-clicked` | 事件 | 点击社区发私信入口 | 服务端/埋点事件 | sourceType, sourceId, targetUserId, canChat | 否 |
| `M05-NTF-content-approved` | 通知 | 内容审核通过 | 站内通知/PRD-03 | 你的内容已通过审核 | 是 |
| `M05-NTF-content-rejected` | 通知 | 内容审核驳回 | 站内通知/PRD-03 | 你的内容未通过审核，原因：{reason} | 是 |
| `M05-NTF-report-result` | 通知 | 举报处理完成 | 站内通知/PRD-03 | 你的举报已处理，结果：{result} | 是 |
| `M05-NTF-like` | 通知 | 收到点赞 | 站内通知/PRD-03 | {nickname} 赞了你的动态 | 是 |
| `M05-NTF-comment` | 通知 | 收到评论/回复 | 站内通知/PRD-03 | {nickname} 评论了你的动态 | 是 |
| `M05-NTF-follow` | 通知 | 收到关注 | 站内通知/PRD-03 | {nickname} 关注了你 | 是 |
| `M05-NTF-mention` | 通知 | 被 @ | 站内通知/PRD-03 | {nickname} 在动态中提到了你 | 是 |
| `M05-TXT-core-access-tip` | 文案 | 未满足互动门槛 | APP | 完成认证后即可参与互动 | 是 |
| `M05-TXT-contact-blocked` | 文案 | 联系方式拦截 | APP | 内容中包含联系方式，请修改后再提交 | 是 |

---

## 8. 模块错误码

| 错误码 ID | HTTP code | 业务 code | 含义 | 用户提示文案 | 是否可重试 |
|-----------|-----------|-----------|------|--------------|-----------|
| `M05-ERR-login-required` | 401 | 505001 | 未登录 | 请先登录后继续 | 是 |
| `M05-ERR-core-access-required` | 403 | 505002 | 未满足互动门槛 | 完成认证后即可参与互动 | 是 |
| `M05-ERR-content-not-found` | 404 | 505003 | 内容不存在或不可见 | 内容不存在或已不可见 | 否 |
| `M05-ERR-topic-offline` | 400 | 505004 | 话题已下线 | 该话题暂不可用，请重新选择 | 是 |
| `M05-ERR-contact-blocked` | 400 | 505005 | 联系方式拦截 | 内容中包含联系方式，请修改后再提交 | 是 |
| `M05-ERR-audit-pending` | 409 | 505006 | 内容审核中 | 内容审核中，请稍后查看 | 是 |
| `M05-ERR-duplicate-like` | 409 | 505007 | 点赞幂等冲突 | 操作已处理 | 是 |
| `M05-ERR-report-duplicate` | 409 | 505008 | 重复举报 | 你的举报已提交，请等待处理 | 否 |
| `M05-ERR-audit-conflict` | 409 | 505009 | 审核并发冲突 | 记录已被其他人处理，请刷新 | 是 |
| `M05-ERR-wechat-audit-unavailable` | 503 | 505010 | 微信内容安全不可用 | 内容已进入人工复核，请等待结果 | 是 |
| `M05-ERR-community-target-unavailable` | 404 | 505011 | 社区触达目标不可用 | 对方状态已变化，暂不可操作 | 是 |

---

## 9. 模块接口草案

| 端 | 方法 | 路径 | 说明 | 关联规则/状态 |
|----|------|------|------|--------------|
| APP | GET | `/miniapp/community/feed` | 社区关注/同城/热门信息流 | `M05-RULE-browse-gate` |
| APP | GET | `/miniapp/community/topics` | 话题列表 | `M05-CFG-topic-dict` |
| APP | GET | `/miniapp/community/topic/{topicId}` | 话题详情与内容列表 | `M05-RULE-topic-source` |
| APP | POST | `/miniapp/community/posts` | 发布动态 | `M05-RULE-interaction-gate`、`M05-SM-content-audit` |
| APP | GET | `/miniapp/community/posts/{postId}` | 动态详情，含诚意贴视图 | `M05-RULE-browse-gate`、`M05-RULE-sincere-post` |
| APP | POST | `/miniapp/community/posts/{postId}/delete` | 删除本人动态 | `M05-SM-content-audit` |
| APP | POST | `/miniapp/community/comments` | 发表评论/回复 | `M05-SM-comment-audit` |
| APP | POST | `/miniapp/community/likes/toggle` | 点赞/取消点赞 | `M05-RULE-interaction-gate` |
| APP | POST | `/miniapp/community/follows/toggle` | 关注/取消关注 | `M05-RULE-follow-isolation` |
| APP | GET | `/miniapp/community/contact-entry` | 查询社区打招呼/发私信入口状态 | `M05-RULE-community-greeting-entry`、`M05-RULE-community-private-entry` |
| APP | GET | `/miniapp/community/users/{userId}/profile` | 查询统一婚恋用户主页聚合数据，资料取 PRD-01、关系取 PRD-02、动态取 PRD-05 | `M05-RULE-user-profile-handoff` |
| APP | GET | `/miniapp/community/yuemu` | 悦目内容流 | `M05-RULE-yuemu-source` |
| APP | GET | `/miniapp/community/sincere-posts` | 诚意贴列表 | `M05-RULE-sincere-post` |
| APP | POST | `/miniapp/community/reports` | 提交举报 | `M05-RULE-report-gate` |
| ADM | GET | `/admin/community/posts` | 内容审核列表 | `M05-SM-content-audit` |
| ADM | POST | `/admin/community/posts/{id}/audit` | 内容审核/下架 | `M05-SM-content-audit` |
| ADM | GET | `/admin/community/comments` | 评论审核列表 | `M05-SM-comment-audit` |
| ADM | POST | `/admin/community/comments/{id}/audit` | 评论屏蔽/恢复 | `M05-SM-comment-audit` |
| ADM | GET | `/admin/community/reports` | 举报处理列表 | `M05-SM-report` |
| ADM | POST | `/admin/community/reports/{id}/handle` | 处理举报 | `M05-SM-report` |
| ADM | GET | `/admin/community/topics` | 家园话题管理列表 | `M05-CFG-topic-dict` |
| ADM | POST | `/admin/community/topics` | 新增/编辑家园话题 | `M05-CFG-topic-dict`、`M05-CFG-topic-display` |
| ADM | POST | `/admin/community/topics/{id}/status` | 启用/停用话题 | `M05-RULE-topic-source` |
| ADM | GET | `/admin/community/configs` | 社区配置查询 | `M05-CFG-*` |
| ADM | POST | `/admin/community/configs` | 社区配置保存 | `M05-CFG-*` |

### 9.1 跨模块依赖接口

> 以下接口为 PRD-05 调用或依赖的跨模块能力，路径以对应 PRD 技术方案最终定义为准；PRD-05 不在本模块内重新定义消息、关系和资产业务规则。

| 来源模块 | 端 | 参考方法/路径 | PRD-05 使用场景 | 关联规则 |
|----------|----|---------------|-----------------|----------|
| PRD-03 消息、私信与通知中心 | APP | POST `/miniapp/messages/whispers` | 社区打招呼页发送悄悄话 | `M03-RULE-whisper-send`、`M05-RULE-community-greeting-entry` |
| PRD-03 消息、私信与通知中心 | APP | GET `/miniapp/messages/conversations/{conversationId}` 或普通私信打开接口 | 社区发私信页判断通过后跳转普通私信会话 | `M03-RULE-private-chat-open`、`M05-RULE-community-private-entry` |
| PRD-04 商业化 | APP | GET `/miniapp/assets/coin-balance` 或悄悄话扣费/免费次数接口 | 社区打招呼页展示千寻币余额、免费次数和余额不足提示 | `M03-RULE-whisper-send` |
| PRD-02 关系反馈 | APP | GET `/miniapp/relation/match-status` 或匹配状态查询接口 | 社区发私信页判断双方是否匹配成功 | `M02-SM-mutual-match`、`M03-RULE-private-chat-open` |

---

## 10. 第三方服务

| 服务 ID | 服务名 | 用途 | 不可用时处理 |
|---------|--------|------|--------------|
| `M05-SRV-wechat-msg-sec-check` | 微信文本内容安全识别 | 动态、诚意贴、评论文本安全校验 | 内容不直接公开，进入人工复核或提示稍后重试 |
| `M05-SRV-wechat-media-check` | 微信多媒体内容安全识别 | 动态、诚意贴图片安全校验 | 内容不直接公开，进入人工复核 |
| `M05-SRV-wechat-content-security` | 微信内容安全能力总称 | 页面规格统一引用 | 见上 |

---

## 11. 找茬问题处理结论

编号说明：`C-*` 表示跨模块或通用确认问题，`M05-*` 表示移动端 PRD-05 问题，`A05-*` 表示管理后台 PRD-05 问题；同一处理结论覆盖多个编号时在同一行合并展示。

| 找茬编号 | 等级 | 处理结论 | 正式版落点 |
|----------|------|----------|------------|
| C-11 | P1 | 同城优先使用用户资料城市/手动城市选择；不依赖 GPS 必授权，拒绝定位时展示默认城市与手动选择 | `APP-02_成家同城信息流页.md` |
| M05-01 | P0 | 按一期目标采用千寻成家/知音入口 | `APP-05_端内定义.md` |
| M05-02 | P0 | 按 PRD-01 核心准入目标口径：发布、评论、点赞、关注、@需三项认证；举报仅登录 | `M05-RULE-interaction-gate`、`M05-RULE-report-gate` |
| M05-03/A05-03 | P1 | 动态机审通过可公开并人工抽检；诚意贴需人工通过公开；评论机审通过公开 | `M05-RULE-audit-publish` |
| M05-04/A05-04 | P1 | 默认不允许联系方式，联系方式范围写入 `M05-RULE-contact-block` | `M05-RULE-contact-block` |
| M05-05 | P1 | 关注不影响私信，按钮文案不得暗示关注后聊天 | `M05-RULE-follow-isolation` |
| M05-05-EXT | P1 | 社区打招呼/发私信按 PRD-03 规则承接：打招呼走悄悄话，普通私信仅匹配成功后打开 | `M05-RULE-community-greeting-entry`、`M05-RULE-community-private-entry` |
| M05-06 | P1 | 互动通知由 PRD-03 承接，PRD-05 定义事件 | 第 7 节 |
| M05-07/A05-05 | P1 | 话题由后台家园话题管理维护，覆盖话题字典、排序、启停和推荐标记 | `M05-CFG-topic-dict`、`ADM-05-PAGE-topic-manage` |
| M05-08/M05-09/M05-10/D-08 | P0/P1 | 悦目按图片优先公开内容流定义；诚意贴为内容类型 | 第 1、2、5 节 |
| M05-11 | P1 | 诚意贴复用社区内容模型，以 `sincere_post` 类型区分 | `M05-ENUM-content-type` |
| M05-12 | P1 | 不承诺智能推荐，仅支持时间、热度、后台置顶等轻排序 | `M05-CFG-community-tabs` |
| M05-13 | P2 | 本人动态可展示审核中/驳回；他人主页仅展示已公开内容 | 移动端页面规格 |
| M05-16 | P0 | 社区入口按一期目标收敛为关注/同城/热门/话题及其关联操作入口 | `M05-CFG-community-tabs`、`M05-RULE-community-more-actions` |
| A05-01 | P0 | 后台一期采用社区互动管理页面组：内容管理、动态管理、评论管理、举报管理、家园话题管理和社区配置 | `ADM-05_端内定义.md` |
| A05-02 | P1 | 机审异常进入人工复核；后台内容审核页支持筛选机审异常 | `M05-SM-content-audit` |
| A05-06 | P1 | 处罚动作限定下架内容、屏蔽评论、警告、禁言、冻结账号；删除/资产冻结不在 PRD-05 直接执行 | `M05-ENUM-punish-action` |
| A05-08 | P1 | 处罚由举报处理触发，账号冻结引用用户管理 | `ADM-05_端内定义.md` |
| A05-09 | P1 | 家园话题进入独立话题管理；联系方式开关、举报原因、抽检比例进入社区配置 | `M05-CFG-*` |
| CLIENT-POST-AUDIT-20260709 | P1 | 甲方帖子审核意见已处理：禁言提供周期、增加 IP 封禁、话题封面使用图片、内容治理兼容知音诚意贴与后续立业帖子、移动端头像使用用户上传头像 | 第 1、3、5、6 节及 ADM/APP 页面规格 |
