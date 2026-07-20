# 模块 PRD - 移动端-05 推荐模块（朋友、社区与内容互动）

> 第二层入口文档。本文件只做模块总览 + 范围 + 流程 + 数据 + 依赖 + 页面清单。
> 页面细节见 `../页面规格/`；PRD-05 模块公共定义见 `../../PRD-05_模块公共定义.md`；项目级全局定义见 `../../../全局定义/共享层_项目级.md` 与 `../../../全局定义/端专属层_移动端.md`；APP-05 端内定义见 `../APP-05_端内定义.md`。
> 本文仅描述 `docs/需求文档/一期上线目标.md` 中 PRD-05 本期移动端上线范围。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本07 | 2026-07-20 | Codex | 补齐蓝湖反向缺口：互动历史、关注粉丝、互动用户、收藏、草稿、上传状态、申请认识别名和两级屏蔽 |
| 版本06 | 2026-07-15 | Codex | 新增统一婚恋用户主页，承接关系反馈与个人动态区 |
| 版本01 | 2026-07-06 | Codex | 按一期上线目标创建移动端 PRD-05 正式版模块入口 |
| 版本02 | 2026-07-06 | Codex | 修复流程代码块，明确诚意贴列表由动态详情页诚意贴视图承接，并补充个人动态区归属说明 |
| 版本03 | 2026-07-06 | Codex | 按评审意见明确诚意贴发布复用发布页条件表单，修正 MVP-PAGE-004 话题入口映射 |
| 版本04 | 2026-07-07 | Codex | 按移动端 Demo 审查补充发布图片九宫格、悦目原比例瀑布流、更多操作对象类型和高价值交互验收口径 |
| 版本05 | 2026-07-07 | Codex | 补充家园话题入口区与话题列表页映射：MVP-PAGE-004 为热门页入口区，APP-05-PAGE-topic-list 对应 MVP-PAGE-008 |

---

## 1. 模块目标

移动端 PRD-05 承接千寻成家社区、知音悦目、诚意贴和内容互动治理。目标是让已登录用户能浏览公开社区内容，满足核心准入后参与发布、评论、点赞、关注、@、社区打招呼和私信资格判断，并能在内容或用户存在风险时提交举报。模块同时为后台内容审核、评论审核、举报处理和社区配置提供明确的数据与状态口径。

**用户故事：** 作为已登录用户，我想在千寻成家和知音场景中浏览动态、话题、悦目和诚意贴，并在满足认证条件后参与互动，以便通过公开内容建立弱关系连接。

**核心指标：** 社区内容浏览转化率、发布成功率、评论成功率、举报处理闭环率、内容审核通过时长。

---

## 2. 用户与角色

| 角色 | 在本模块中做什么 | 引用全局角色/规则 |
|------|------------------|-------------------|
| 未登录访客 | 看到登录引导 | `GLB-ROLE-visitor` |
| 已登录用户 | 浏览公开内容、提交举报 | `GLB-ROLE-app-user`、`M05-RULE-browse-gate`、`M05-RULE-report-gate` |
| 满足核心准入用户 | 发布动态/诚意贴，点赞、评论、关注、@用户 | `M05-RULE-interaction-gate` |
| 满足消息触达规则用户 | 从社区内容或用户卡片进入打招呼/私信链路 | `M05-RULE-community-greeting-entry`、`M05-RULE-community-private-entry` |
| 内容作者 | 管理本人动态，查看审核中/驳回/公开状态 | `M05-SM-content-audit` |

---

## 3. 关键业务流程

### 3.1 社区浏览流程

```
入口：千寻 -> 成家
正常路径：
  1. 用户进入关注、同城、热门或话题入口
  2. 小程序按当前 Tab 请求公开内容列表
  3. 用户浏览图文摘要、作者、话题、点赞数和评论数
  4. 点击内容进入动态详情页，点击话题进入话题详情页
分支：
  - 同城页优先使用资料城市或用户手动选择城市
  - 关注页无关注内容时展示空态和热门入口
异常：
  - 字典或配置加载失败时保留默认入口并允许重试
出口：动态详情、话题详情、`APP-05-PAGE-user-profile` 婚恋用户主页或发布页
```

### 3.2 内容发布与审核流程

```
入口：发布动态页、诚意贴发布入口
正常路径：
  1. 用户点击发布入口
  2. 小程序校验登录态、账号状态和 `M05-RULE-interaction-gate`
  3. 用户填写正文、通过九宫格添加图片、通过话题 chips 选择话题和 @用户
  4. 服务端校验字段、联系方式、话题有效性和图片数量
  5. 服务端提交微信内容安全校验
  6. 按 `M05-SM-content-audit` 进入公开、待人工复核或驳回
  7. 审核结果通过 PRD-03 通知中心承接
异常：
  - 未满足互动门槛：提示完成认证
  - 话题下线：提示重新选择话题
  - 内容安全服务异常：内容进入人工复核提示
出口：发布结果提示、我的动态、内容详情
```

### 3.3 内容互动流程

```
入口：信息流卡片、动态详情页（含诚意贴视图）、悦目页
正常路径：
  1. 用户点击点赞、评论、关注或 @用户
  2. 小程序校验 `M05-RULE-interaction-gate`
  3. 服务端执行幂等处理
  4. 前台更新点赞态、评论列表或关注态
  5. 服务端触发 `M05-EVT-*` 事件，由 PRD-03 承接通知
异常：
  - 内容已下架：提示内容不可见
  - 评论机审不通过：提示修改后再发
  - 重复点赞/取消点赞：按最终状态返回
```

### 3.4 举报流程

```
入口：更多操作弹窗、动态详情页（含诚意贴视图）、评论操作、用户主页
正常路径：
  1. 用户点击举报
  2. 选择举报原因，填写补充说明
  3. 提交后生成举报记录
  4. 后台举报处理页处理结果
  5. PRD-03 通知中心承接举报结果通知
异常：
  - 重复举报：提示已提交
  - 举报对象不可见：提示内容状态已变化
```

### 3.5 社区触达入口流程

```
入口：信息流作者区、动态详情作者区、个人动态区、更多操作弹窗
正常路径：
  1. 用户点击打招呼或发私信
  2. 小程序校验登录态、账号状态、目标用户状态和来源内容状态
  3. 打招呼入口进入 `APP-05-PAGE-community-greeting`，发送资格引用 `M03-RULE-whisper-send`
  4. 发私信入口进入 `APP-05-PAGE-community-private-entry`，普通私信资格引用 `M03-RULE-private-chat-open`
  5. 若可普通私信，跳转 `APP-03-PAGE-private-chat`
异常：
  - 目标用户不可见：提示对方状态已变化
  - 已有待回复悄悄话：展示等待态，不重复发送
  - 未匹配成功：展示相互喜欢后才能聊天，并提供打招呼入口
出口：悄悄话消息页、私信对话页、用户主页或举报弹窗
```

---

## 4. 核心数据模型

### 4.1 实体清单

| 实体 | 表名（建议） | 说明 | 所属模块 | 关键字段 |
|------|-------------|------|----------|----------|
| 社区内容 | `community_post` | 动态、诚意贴、悦目内容来源 | 05 | contentId, authorId, contentType, status, topicId |
| 评论 | `community_comment` | 动态/诚意贴评论和回复 | 05 | commentId, contentId, authorId, parentCommentId, status |
| 点赞 | `community_like` | 用户对内容的点赞关系 | 05 | contentId, userId, status |
| 收藏 | `community_favorite` | 用户对动态的私密收藏关系 | 05 | contentId, userId, status |
| 关注 | `community_follow` | 用户之间的社区关注关系 | 05 | followerId, targetUserId, status |
| 浏览记录 | `community_view_history` | 本人最近浏览内容 | 05 | userId, contentId, viewedAt |
| 内容偏好 | `community_content_preference` | 屏蔽当前内容或不看作者动态 | 05 | userId, actionType, targetId, status |
| 发布草稿 | `community_post_draft` | 最近一份动态/诚意贴草稿 | 05 | userId, contentType, payload, updatedAt |
| 话题 | `community_topic` 或字典 | 内容聚合维度 | 05/系统字典 | topicId, topicName, status, sort |
| 举报 | `community_report` | 举报记录 | 05 | reportId, reporterId, targetType, targetId, status |
| 审核记录 | `community_audit_record` | 内容/评论审核历史 | 05 | auditId, targetType, targetId, result, operatorId |

### 4.2 实体关系

```
用户 1──N 社区内容
社区内容 1──N 评论
社区内容 1──N 点赞
社区内容 1──N 收藏
用户 1──N 关注
用户 1──N 浏览记录/内容偏好/发布草稿
话题 1──N 社区内容
举报 N──1 内容/评论/用户
```

### 4.3 跨模块字段引用

| 本模块使用字段 | 来源模块 | 来源实体 | 若来源模块未就绪如何处理 |
|---------------|----------|----------|-------------------------|
| 登录态与用户账号状态 | PRD-01 | 用户账号 | 引导登录或展示账号状态提示 |
| 核心准入状态 | PRD-01 | 认证状态 | 互动入口置灰或点击提示 |
| 用户资料摘要 | PRD-01 | 用户资料 | 头像/昵称缺失时展示默认头像和昵称 |
| 互动通知 | PRD-03 | 通知中心 | 事件先记录，通知失败不影响主操作 |
| 举报结果通知 | PRD-03 | 通知中心 | 后台处理结果可在举报记录中查询 |

---

## 5. 范围（本期要做）

| 需求 ID | 能力 | 优先级 | 关联页面 ID | 备注 |
|---------|------|--------|-------------|------|
| `APP-05-RULE-community-feed` | 关注、同城、热门信息流浏览 | P0 | `APP-05-PAGE-community-following`、`APP-05-PAGE-community-city`、`APP-05-PAGE-community-hot` | 登录后可浏览 |
| `APP-05-RULE-topic` | 话题入口、话题列表、话题详情和话题内容聚合 | P0 | `APP-05-PAGE-topic-list`、`APP-05-PAGE-topic-detail` | 话题来自后台配置 |
| `APP-05-RULE-publish-post` | 发布动态/诚意贴 | P0 | `APP-05-PAGE-post-publish` | 需满足互动门槛；图片九宫格展示 `x/9`；话题以 chips 单选；诚意贴通过 `contentType=sincere_post` 条件表单承接 |
| `APP-05-RULE-post-detail` | 动态详情、点赞、评论、举报 | P0 | `APP-05-PAGE-post-detail` | 评论机审通过后公开 |
| `APP-05-RULE-yuemu` | 悦目图片内容流 | P0 | `APP-05-PAGE-yuemu` | 双列瀑布流按原始宽高比展示，支持预览、点赞和加载更多 |
| `APP-05-RULE-sincere-post` | 诚意贴列表、发布与详情承接 | P0 | `APP-05-PAGE-sincere-list`、`APP-05-PAGE-post-publish`、`APP-05-PAGE-post-detail` | 发布和详情均通过 `contentType=sincere_post` 条件视图承接 |
| `APP-05-RULE-more-actions` | 社区更多操作弹窗 | P0 | `APP-05-PAGE-community-more-actions` | 按 `post/comment/user` 对象类型展示举报、屏蔽、复制链接和触达入口 |
| `APP-05-RULE-report` | 举报弹窗与举报提交 | P0 | `APP-05-PAGE-report-modal` | 已登录可提交 |
| `APP-05-RULE-community-contact` | 社区打招呼与发私信入口 | P0 | `APP-05-PAGE-community-greeting`、`APP-05-PAGE-community-private-entry` | 发送与会话规则引用 PRD-03 |
| `APP-05-RULE-user-posts` | 个人动态区 | P1 | `APP-05-PAGE-user-posts` | 本人可看审核态，他人仅看公开内容 |
| `APP-05-RULE-interaction-center` | 评论过、点赞过、解锁过、浏览记录与获赞统计 | P1 | `APP-05-PAGE-interaction-center` | 解锁历史只读引用 PRD-04 |
| `APP-05-RULE-follow-relations` | 关注、粉丝列表与统计 | P1 | `APP-05-PAGE-follow-relations` | 不改变匹配和私信资格 |
| `APP-05-RULE-post-interactors` | 动态点赞、收藏、评论用户列表 | P1 | `APP-05-PAGE-post-interactors` | 收藏用户明细仅作者可见 |
| `APP-05-RULE-content-favorite` | 动态收藏/取消收藏 | P1 | `APP-05-PAGE-post-detail` | 幂等返回最终收藏态 |
| `APP-05-RULE-publish-draft-upload` | 草稿保存恢复和图片上传状态 | P0 | `APP-05-PAGE-post-publish` | 上传成功不等于动态发布成功 |
| `APP-05-RULE-content-preference` | 屏蔽当前内容、不看 TA 动态及取消 | P0 | `APP-05-PAGE-community-more-actions` | 一期不新增独立管理页 |

---

## 6. 范围控制

本文范围以第 5 节页面和能力为准；正式版页面规格、验收标准和 Demo 均以第 11 节页面清单为准。

---

## 7. 跨模块依赖

| 依赖项 | 依赖的模块/服务 | 依赖内容 | 若未就绪/不可用时的兜底 | 阻塞级别 |
|--------|----------------|----------|------------------------|---------|
| 用户账号 | PRD-01 | 登录态、账号状态、头像昵称 | 展示登录引导或默认头像昵称 | 阻塞 |
| 核心准入 | PRD-01 | 发布与互动资格 | 入口置灰或点击引导认证 | 阻塞互动 |
| 关系反馈 | PRD-02 | 匹配成功状态 | 发私信入口展示原因或跳转私信 | 阻塞普通私信 |
| 消息触达 | PRD-03 | 悄悄话发送、普通私信、女性保护、会话状态 | 展示 PRD-03 返回的禁用原因 | 阻塞触达 |
| 商业化资产 | PRD-04 | 悄悄话免费次数和千寻币余额 | 展示余额不足或充值引导 | 阻塞打招呼 |
| 通知中心 | PRD-03 | 互动、审核、举报通知 | 主操作成功，通知事件补偿 | 非阻塞 |
| 微信内容安全 | `M05-SRV-wechat-content-security` | 文本和图片机审 | 进入人工复核或提示重试 | 阻塞自动公开 |
| 家园话题管理 | ADM-05 | 话题字典、推荐话题、话题排序、话题启停 | 使用首批默认话题并提示后台初始化 | 非阻塞 |
| 社区配置 | ADM-05 | 举报原因、Tab、发布规则 | 使用默认配置并提示后台初始化 | 非阻塞 |

个人动态区入口位于“我的动态/用户主页”，但内容数据、状态口径和页面规格由 PRD-05 提供；通过查看对象区分 `MVP-PAGE-057` 本人视图与 `MVP-PAGE-058` 他人视图。

---

## 8. 改动影响面

| 影响对象 | 影响方式 | 是否需要同步修改 | 负责人 |
|----------|----------|-----------------|--------|
| 千寻成家入口 | 关注、同城、热门、话题入口需按 APP-05 页面树出稿 | 是 | — |
| 知音入口 | 悦目和诚意贴引用 APP-05 规则与页面规格 | 是 | — |
| 消息通知中心 | 接收 PRD-05 互动、审核和举报事件 | 是 | — |
| PRD-03 消息链路 | 社区打招呼和发私信入口需复用悄悄话、普通私信规则 | 是 | — |
| 用户主页/我的动态 | 展示本人和他人内容列表 | 是 | — |
| 后台社区互动管理 | 承接审核、举报、配置 | 是 | — |

---

## 9. 非功能性需求

### 9.1 权限

| 本模块涉及的权限项 | 已在全局矩阵中定义？ | 若不是，在此补充 |
|-------------------|---------------------|-----------------|
| 登录后浏览公开内容 | 是，移动端登录态基线 | 未登录引导登录 |
| 发布与互动需核心准入 | 引用 `M05-RULE-interaction-gate` | 页面按钮置灰或点击提示 |
| 举报需登录 | 引用 `M05-RULE-report-gate` | 未登录引导登录 |
| 社区触达需消息规则通过 | 引用 `M05-RULE-community-greeting-entry`、`M05-RULE-community-private-entry` | 按 PRD-03 返回原因展示等待、冷却、未匹配或保护提示 |

### 9.2 安全与合规

| 字段 | 加密存储 | 脱敏规则 | 留存时长 | 注销后处理 | 是否可导出 |
|------|---------|----------|----------|-----------|-----------|
| 举报补充说明 | 否 | 仅后台授权角色查看 | >= 1 年 | 匿名化举报人 | 按权限 |
| 评论内容 | 否 | 前台公开内容按可见范围展示 | 按内容治理策略 | 作者匿名化或内容下架 | 按权限 |
| 图片 URL | 私有存储 | 前台使用授权 URL | 按内容治理策略 | 删除或匿名化 | 按权限 |
| @用户列表 | 否 | 前台仅展示昵称 | 按内容留存策略 | 匿名化 | 否 |
| 社区触达来源 | 否 | 仅记录来源类型和业务编号 | 按消息与审计策略 | 匿名化用户编号 | 否 |

### 9.3 性能

| 场景 | 要求 |
|------|------|
| 信息流查询 | 默认 20 条/页，首屏 1 秒内返回 |
| 动态详情 | 800ms 内返回主体内容，评论可分页加载 |
| 图片加载 | 使用缩略图，原图预览按需加载 |
| 话题列表 | 支持缓存，后台配置变更后 5 分钟内生效 |

### 9.4 并发与幂等

| 需幂等的操作 | 并发场景 | 幂等方案建议 |
|-------------|----------|-------------|
| 点赞/取消点赞 | 连续点击 | 用户 + 内容唯一键，返回最终状态 |
| 收藏/取消收藏 | 连续点击 | 用户 + 内容唯一键，返回最终状态 |
| 关注/取消关注 | 连续点击 | followerId + targetUserId 唯一键 |
| 草稿保存 | 自动保存与手动保存并发 | userId + contentType 唯一草稿，按 updatedAt 覆盖 |
| 屏蔽偏好切换 | 连续点击 | userId + actionType + targetId 唯一键，返回最终状态 |
| 社区打招呼提交 | 连续点击 | 引用 `M03-RULE-whisper-repeat-limit`，同一对象待回复时阻断 |
| 发布提交 | 弱网重提 | 客户端提交 token 或内容 hash 去重 |
| 举报提交 | 重复举报 | reporterId + targetType + targetId 有效期内去重 |
| 评论提交 | 连续点击 | 短时幂等 key 防重 |

### 9.5 埋点

| 埋点事件 | 触发时机 | 关键参数 |
|----------|----------|----------|
| `community_feed_show` | 信息流曝光 | tab, cityCode, source |
| `community_post_click` | 点击内容卡片 | contentId, contentType, source |
| `community_publish_submit` | 提交发布 | contentType, topicId, imageCount |
| `community_comment_submit` | 提交评论 | contentId, hasParent |
| `community_like_click` | 点赞/取消点赞 | contentId, action |
| `community_favorite_click` | 收藏/取消收藏 | contentId, action, source |
| `community_follow_click` | 关注/取消关注 | targetUserId, action |
| `community_interaction_history_show` | 互动历史曝光 | historyType, resultCount |
| `community_draft_action` | 保存、恢复或删除草稿 | contentType, action |
| `community_upload_state_change` | 单图上传状态变化 | imageIndex, fromStatus, toStatus |
| `community_report_submit` | 提交举报 | targetType, reasonCode |
| `community_more_action_click` | 点击社区更多操作 | action, targetType, sourcePage |
| `community_greeting_submit` | 社区打招呼提交 | targetUserId, sourceType, sourceId |
| `community_private_entry_click` | 社区发私信入口点击 | targetUserId, canChat, sourceType |

---

## 10. 页面清单

| 页面 ID | 页面名 | 页面规格文件 | 对应设计稿链接 | 对应一期页面 | 优先级 |
|---------|--------|--------------|---------------|-------------|--------|
| `APP-05-PAGE-community-following` | 成家关注信息流页 | `../页面规格/APP-01_成家关注信息流页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-001 | P0 |
| `APP-05-PAGE-community-city` | 成家同城信息流页 | `../页面规格/APP-02_成家同城信息流页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-002 | P0 |
| `APP-05-PAGE-community-hot` | 成家热门信息流页 | `../页面规格/APP-03_成家热门信息流页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-003；MVP-PAGE-004 作为本页话题入口区承接，点击进入 APP-05-PAGE-topic-list / MVP-PAGE-008 | P0 |
| `APP-05-PAGE-topic-list` | 话题列表页 | `../页面规格/APP-04_话题列表页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-008 | P0 |
| `APP-05-PAGE-post-publish` | 发布动态页 | `../页面规格/APP-05_发布动态页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-005 | P0 |
| `APP-05-PAGE-post-detail` | 动态详情页 | `../页面规格/APP-06_动态详情页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-006；MVP-PAGE-015 列表点击后由本页承接诚意贴视图 | P0 |
| `APP-05-PAGE-topic-detail` | 话题详情页 | `../页面规格/APP-07_话题详情页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-007 | P0 |
| `APP-05-PAGE-community-more-actions` | 社区更多操作弹窗 | `../页面规格/APP-15_社区更多操作弹窗.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-009 | P0 |
| `APP-05-PAGE-report-modal` | 举报弹窗 | `../页面规格/APP-08_举报弹窗.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-012/MVP-POP-003 | P0 |
| `APP-05-PAGE-community-greeting` | 社区打招呼页 | `../页面规格/APP-13_社区打招呼页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-010 | P0 |
| `APP-05-PAGE-community-private-entry` | 社区发私信页 | `../页面规格/APP-14_社区发私信页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-011 | P0 |
| `APP-05-PAGE-yuemu` | 悦目页 | `../页面规格/APP-09_悦目页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-014 | P0 |
| `APP-05-PAGE-sincere-list` | 诚意贴列表页 | `../页面规格/APP-10_诚意贴列表页.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-015 | P0 |
| `APP-05-PAGE-user-posts` | 个人动态区（本人/他人视图） | `../页面规格/APP-12_个人动态区.md` | 待补充；设计画板按页面规格第 2.4 节输出 | MVP-PAGE-057/058（通过查看对象区分） | P1 |
| `APP-05-PAGE-interaction-center` | 千寻互动中心页 | `../页面规格/APP-11_千寻互动中心页.md` | 蓝湖“千寻互动”页面组 | 蓝湖反向补充 | P1 |
| `APP-05-PAGE-follow-relations` | 关注粉丝列表页 | `../页面规格/APP-17_关注粉丝列表页.md` | 蓝湖关注/粉丝画板 | 蓝湖反向补充 | P1 |
| `APP-05-PAGE-post-interactors` | 动态互动用户列表页 | `../页面规格/APP-18_动态互动用户列表页.md` | 蓝湖动态互动用户画板 | 蓝湖反向补充 | P1 |

---

## 11. 上线 / 迁移 / 回滚

| 项 | 说明 |
|----|------|
| 存量数据如何处理 | 初始上线可为空；后台先初始化话题、举报原因和社区 Tab |
| 老版本客户端兼容 | 老版本无 APP-05 页面入口时不展示新能力 |
| 新增必填字段后老用户兼容 | 发布内容时才校验，不影响历史账号登录 |
| 灰度策略 | 可按用户比例开放发布入口，浏览入口先全量 |
| 回滚策略 | 关闭发布入口和互动入口，已公开内容保留只读 |
| 数据迁移脚本 | 首次上线需创建内容、评论、点赞、关注、举报、审核相关表 |
