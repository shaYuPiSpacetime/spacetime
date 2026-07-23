# 关系反馈与互动链路 - 小程序接口对接文档

> 文档状态：`IMPLEMENTED`
> 日期：2026-07-23
> 需求模块：`02-关系反馈与互动链路`
> 关联技术方案：`docs/技术方案/2026-07-16-关系反馈与互动链路-tcdesign.md`
> 实施说明：原确认项 `C02-12`“移动端接口暂缓”已由本次实施请求解除。本文列出的 11 个接口已有真实 Controller、Service 和测试，不是 Mock 契约。
> 本次交付边界：仅完成后端接口、数据库迁移、自动化测试和本文档；未编写或修改小程序前端代码。

## 1. 通用约定

| 项 | 约定 |
| --- | --- |
| Base URL | `/miniapp` |
| 登录态 Header | `X-Auth-Token: {token}` |
| 当前用户 | 从登录上下文取得，客户端不得传当前用户 ID |
| 返回体 | `R<T>`：`code=200` 成功，`msg=success`，业务数据在 `data` |
| 时间格式 | `yyyy-MM-dd HH:mm:ss`，服务端时区 `Asia/Shanghai` |
| 分页 | `page` 从 1 开始；返回 `current、size、total、pages、hasMore、records` |
| 业务编号 | 喜欢 `LIK-*`、访客 `VIS-*`、匹配 `MAT-*`、解锁 `ULK-*` |
| 幂等 | 喜欢用 `requestId`；访问用 `eventNo`；解锁确认用 `requestId + quoteToken` |
| 核心准入 | 当前用户未完成核心准入返回 `20001`；目标用户不可互动返回 `20002` |
| 一期范围 | 仅支持异性关系；不实现隐藏访问 |

### 1.1 展示状态与字段返回约定

喜欢我的和最近访客查询无论 `displayStatus=blur` 还是 `displayStatus=clear`，后端都完整返回当前记录对应的基础资料：

- `userId、avatar、nickname、age、school`
- `onlineStatus、lastActiveTime、onlineText`
- `identityCode/identityLabel`
- `industryCode/industryLabel`
- `occupationCode/occupationLabel`
- `company`
- `annualIncomeCode/annualIncomeLabel`

`displayStatus` 只表示当前用户对该记录的展示权益：`blur` 由前端渲染模糊头像并隐藏不应展示的文本，`clear` 展示清晰资料。字典字段同时返回 code 和中文 label，页面展示 label，不直接展示 code。前端不得根据字段是否为空反推解锁状态，必须以 `displayStatus` 为准。

喜欢我的列表以关系状态为唯一筛选依据，只查询
`like_status=active AND active_marker=1 AND deleted=0`。账号冻结、注销、封禁、认证失效、拉黑或取消喜欢发生时，由现有关系失效联动把喜欢记录更新为 `cancelled/invalid`；列表不再重复拼装一套账号状态判断。

最近访客、相互喜欢和匹配弹层沿用各自现有有效状态及准入投影。无论哪种列表，前端都不展示取消或失效记录。

### 1.2 在线状态约定

- 小程序不新增心跳接口。任意已通过登录鉴权的 `/miniapp/**` 请求都会刷新当前用户 Redis 活跃记录。
- `miniapp:presence:online:{userId}` 保存 5 分钟在线标记；5 分钟内持续请求会续期。
- `miniapp:presence:last-active:{userId}` 保存最近活跃时间 30 天，用于生成“1 小时前在线”等文案。
- `onlineStatus=online` 表示最近 5 分钟存在有效小程序请求；否则为 `offline`。
- `onlineText` 由后端返回：`在线`、`N分钟前在线`、`N小时前在线`、`N天前在线`或`7天前在线`。
- Redis 没有该用户活跃记录时使用 `app_user.last_login_time` 兜底；在线状态写入或读取失败不阻断关系接口。
- 这是“最近活跃”状态：关闭小程序后最多仍显示 5 分钟在线；停留页面超过 5 分钟且没有任何请求会显示离线。

## 2. 截图页面与接口对应

| 截图/交互状态 | 对应接口 | 对接说明 |
| --- | --- | --- |
| 对我心动-未开通会员 | `GET /miniapp/relation/likes-me` | 已单条解锁的有效喜欢全部优先纳入可见集合，再加入最近 10 条未解锁喜欢；该集合支持分页 |
| 对我心动-开通会员 | `GET /miniapp/relation/likes-me` | 同一接口，后端按有效会员返回每页 20 条清晰记录 |
| 首屏成功渲染 | `POST /miniapp/relation/likes-me/read` | 提交 GET 返回的 `readCursor`，只确认本次查询快照已读 |
| 点击模糊卡片“解锁 Ta 是谁” | 无网络请求 | 第一步仅展示场景弹层，不扣币、不写解锁记录 |
| 点击“只看 ta” | `POST /miniapp/asset/unlock/quote` | 获取价格、余额和 5 分钟报价令牌 |
| 第二步确认扣币 | `POST /miniapp/asset/unlock/confirm` | 成功后才扣币并返回目标 `userId`，页面把单条卡片切成清晰态 |
| 点击“解锁全部” | PRD-04 VIP 接口 | 使用 `/miniapp/vip/status`、`/packages`、`/benefits` 与支付接口，不新增 PRD-02 全量解锁接口 |
| 最近访客-未开通会员 | `GET /miniapp/relation/recent-viewers` | 返回全部已单条解锁访客和最近 10 个未解锁访客；基础资料完整返回，前端按 `displayStatus` 控制模糊/清晰 |
| 最近访客-开通会员 | `GET /miniapp/relation/recent-viewers` | 同一接口，窗口内访客全量清晰 |
| 相互喜欢 | `GET /miniapp/relation/mutual-matches` | 只返回当前有效匹配，固定为清晰态 |
| 匹配成功弹层 | `GET /miniapp/relation/match-popup/pending` | 每个用户独立查询自己待展示弹层 |
| 关闭/稍后/主页/聊天 | `POST /miniapp/relation/match-popup/{matchNo}/read` | 回传实际动作，保证同一生命周期不重复弹 |
| 进入对方婚恋主页 | PRD-05 用户主页接口 + `POST /miniapp/relation/visits` | 主页主体成功展示后再异步上报访问 |

> 当前仓库的 `/miniapp/profile/home-detail` 是“我的主页”接口，不能传入他人 `userId`，也不能用于截图中的“查看主页”。对方婚恋主页主体仍由 PRD-05 提供；PRD-02 只返回清晰态目标 `userId` 并记录访问。

## 3. 接口总览

| ID | Method | Path | 用途 | 状态 |
| --- | --- | --- | --- | --- |
| `MOB-02-01` | GET | `/miniapp/relation/likes-me` | 喜欢我的列表 | 已实现 |
| `MOB-02-02` | GET | `/miniapp/relation/recent-viewers` | 最近看过我的列表及统计 | 已实现 |
| `MOB-02-03` | GET | `/miniapp/relation/mutual-matches` | 相互喜欢列表 | 已实现 |
| `MOB-02-04` | POST | `/miniapp/relation/likes` | 发起喜欢 | 已实现 |
| `MOB-02-05` | DELETE | `/miniapp/relation/likes/{targetUserId}` | 取消喜欢 | 已实现 |
| `MOB-02-06` | POST | `/miniapp/relation/visits` | 婚恋主页访问上报 | 已实现 |
| `MOB-02-07` | GET | `/miniapp/relation/match-popup/pending` | 查询待展示匹配弹层 | 已实现 |
| `MOB-02-08` | POST | `/miniapp/relation/match-popup/{matchNo}/read` | 匹配弹层动作回执 | 已实现 |
| `MOB-02-09` | POST | `/miniapp/asset/unlock/quote` | 单条解锁报价，不扣币 | 已实现 |
| `MOB-02-10` | POST | `/miniapp/asset/unlock/confirm` | 二次确认并原子扣币 | 已实现 |
| `MOB-02-11` | POST | `/miniapp/relation/likes-me/read` | 首屏渲染成功后确认本次新喜欢快照已读 | 已实现 |

## 4. 通用枚举中文

### 4.1 来源场景 `sourceScene`

| code | 中文说明 |
| --- | --- |
| `fate` | 觅缘推荐 |
| `featured` | 精选推荐 |
| `ideal` | 理想型推荐 |
| `profile` | 婚恋用户主页 |
| `likes_me` | 喜欢我的列表回看主页 |
| `recent_viewers` | 最近访客列表回看主页 |

### 4.2 展示与访问模式

| 字段 | code | 中文说明 |
| --- | --- | --- |
| `displayStatus` | `blur` | 未解锁展示态；基础资料仍完整返回，由前端控制模糊样式和字段可见性 |
| `displayStatus` | `clear` | 清晰态，返回允许公开的用户资料 |
| `accessMode` | `BLUR_LIMIT` | 普通用户当前可见集合只有未解锁模糊记录 |
| `accessMode` | `MIXED` | 普通用户可见集合中存在永久清晰的单条已解锁记录 |
| `accessMode` | `VIP_ALL_CLEAR` | 会员权益有效，全量清晰 |
| `onlineStatus` | `online` | 最近 5 分钟有已鉴权小程序请求 |
| `onlineStatus` | `offline` | 最近 5 分钟没有已鉴权小程序请求 |

### 4.3 关系与动作枚举

| 字段 | code | 中文说明 |
| --- | --- | --- |
| `likeStatus` | `active` | 喜欢有效 |
| `likeStatus` | `cancelled` | 已取消喜欢；不进入对方默认列表 |
| `visitStatus` | `visible` | 最近 7 天窗口内可见 |
| `visitStatus` | `expired_window` | 已超前台展示窗口，不等于关系失效 |
| `visitStatus` | `invalid` | 关系对象已不可互动 |
| `matchStatus` | `matched` | 当前有效匹配 |
| `matchStatus` | `invalid` | 匹配已失效，不进入移动端默认列表 |
| `matchSource` | `double_like` | 双方互送爱心形成匹配 |
| `matchSource` | `featured_heart_return_like` | 精选心动后回爱心形成匹配 |
| `matchSource` | `whisper_reply` | 悄悄话回复形成匹配 |
| `popupAction` | `later` | 稍后处理 |
| `popupAction` | `close` | 主动关闭 |
| `popupAction` | `profile` | 查看主页 |
| `popupAction` | `chat` | 去聊天 |
| `popupAction` | `system_back` | 系统返回 |

## 5. 页面推荐调用顺序

### 5.1 心动页

1. 首次进入“对我心动”调用 `GET /miniapp/relation/likes-me?page=1&size=20`，不传 `snapshotCursor`。
2. 保存响应中的 `readCursor`，并用本次响应完成首屏渲染；当前页面内的 `isNew=true` 记录继续显示“新”标签。
3. 只有首屏成功渲染后才调用 `POST /miniapp/relation/likes-me/read`，请求体提交该 `readCursor`。GET 成功但渲染失败、切后台或异常退出时不要确认已读。
4. 继续加载第 2 页及以后时，必须把第 1 页的 `readCursor` 原样作为 `snapshotCursor` 回传。即使第 3 步已经确认已读，也不能改用新游标，否则列表会重排。
5. 下拉刷新或重新进入页面时从第 1 页重新查询，并且不传旧 `snapshotCursor`；后端会按最新读取位置和新快照重新计算。
6. 切换“访客”时调用 `GET /miniapp/relation/recent-viewers?page=1&size=20`。
7. 页面合适时机调用 `GET /miniapp/relation/match-popup/pending`。
8. 清晰卡片可跳 PRD-05 对方主页；模糊卡片只打开本地第一步解锁弹层。
9. 不轮询列表；下拉刷新或用户回到页面时刷新。
10. 不单独调用在线心跳；上述任一已鉴权接口都会由后端自动刷新当前用户活跃状态。

```text
GET 第1页（不传 snapshotCursor）
  -> 保存 readCursor
  -> 首屏成功渲染
  -> POST /likes-me/read（提交 readCursor，可幂等重试）
  -> GET 第2页（snapshotCursor=同一个 readCursor）
  -> ...

下拉刷新/重新进入
  -> 丢弃旧游标
  -> GET 新的第1页
```

### 5.2 单条解锁

```text
点击模糊卡片
  -> 本地展示“解锁 Ta 是谁”第一步弹层
  -> 点击“只看 ta”
  -> POST /miniapp/asset/unlock/quote
  -> 展示单价与余额的第二步确认弹层
  -> 用户确认
  -> POST /miniapp/asset/unlock/confirm
  -> code=200 后使用 targetUserId 刷新当前卡片或重拉列表
```

取消第一步或第二步均不调用 `confirm`，不会扣币。

### 5.3 解锁全部

1. 先调用 `GET /miniapp/vip/status`；会员已生效时直接刷新当前关系列表。
2. 未开通会员时调用 `GET /miniapp/vip/packages` 和 `GET /miniapp/vip/benefits` 展示当前套餐及权益。
3. 用户选择套餐后调用 `POST /miniapp/payment/create-order`，请求体为 `{"orderType":"vip","packageId":套餐ID}`。
4. 拉起微信支付；前端支付成功后调用 `POST /miniapp/payment/wechat/confirm/{orderId}` 主动查单补偿，也可调用 `GET /miniapp/payment/orders/{orderId}` 查询最终状态。
5. 会员状态变为 `active` 后重新请求喜欢或访客列表，后端返回 `accessMode=VIP_ALL_CLEAR`。

“解锁全部”不得遍历列表调用单条 `quote/confirm`，否则会产生多笔错误扣费。

### 5.4 进入婚恋用户主页

1. 列表始终返回目标 `userId`，但前端只有在 `displayStatus=clear` 时才开放进入主页交互；`blur` 时点击必须走解锁流程。
2. 清晰态调用 PRD-05 对方婚恋主页接口并成功展示主体。
3. 生成新的 `eventNo`，异步调用 `POST /miniapp/relation/visits`。
4. 同一次进入的网络重试必须复用同一个 `eventNo`。
5. 访问上报失败不阻塞主页浏览，可有限重试。

## 6. 后端业务口径

- 喜欢、访客和相互喜欢默认列表只返回当前可互动对象，不返回失效卡片和失效原因。
- `total` 是全部当前有效入向喜欢数；`newCount` 是其中尚未确认查看的有效喜欢数，不受会员、单条解锁和普通用户 10 条上限影响。
- 普通用户可见集合为“全部有效单条已解锁喜欢 + 最近 10 条有效未解锁喜欢”，该集合按 `size` 分页；因此单条解锁超过 10 条时仍可继续加载，不会丢失已购买记录。
- 会员可见集合为全部有效喜欢，记录全部清晰，按 `size` 分页。
- `visibleTotal` 是当前会员/解锁规则下实际可分页记录数；`hiddenCount=total-visibleTotal`；`pages` 和 `hasMore` 都按 `visibleTotal` 计算。
- 喜欢列表先展示本次快照内的“新喜欢”（按喜欢时间倒序），再展示更早的单条已解锁记录（按解锁生效时间倒序），最后展示更早的未解锁记录（按喜欢时间倒序）。
- 新喜欢顶部摘要最多返回 5 条；头像 URL 始终返回，前端根据 `displayStatus` 控制模糊或清晰样式。
- 喜欢卡片批量返回完整基础资料和在线状态；`displayStatus` 只控制前端展示，不再控制接口字段裁剪。
- 字典资料返回 code 和中文 label：`identity、industry、occupation、annualIncome` 均以 `*Code/*Label` 成对返回，历史异常 code 找不到字典时 label 暂回原 code。
- 首屏 GET 只生成查询快照，不修改已读状态；POST read 只把读取位置推进到该快照上界，并发晚到的新喜欢不会被旧游标清除。
- 最近访客只展示最近 7 天，并按访客用户聚合；普通用户可见“全部已单条解锁访客 + 最近 10 个未解锁访客”，VIP 可见全部，默认每页 20 条、最大 20 条。
- 最近访客 `total` 按窗口内有效访客用户去重，`visibleTotal` 按当前权益集合计算，`hiddenCount=total-visibleTotal`；最终统一按最近访问时间倒序，解锁时间不参与排序。
- 最近访客基础资料在 `blur/clear` 均完整返回，由前端依据 `displayStatus` 控制展示。
- 同一访问者访问同一主页，滚动 30 分钟内只更新一条展示记录；每个新 `eventNo` 仍累计一次 PV。
- `totalPv` 为历史累计访问事件数，`todayVisitorUv` 为今日去重访客数，`todayVisitPv` 为今日访问次数。
- 单条解锁永久有效，不因会员到期重新模糊；访客解锁按目标用户复用，同一访客后续新 `VIS-*` 不再次收费；对象或关系失效后前台仍移除。
- 报价有效期为 5 分钟；报价后关系失效、对象不可互动或价格改变，确认接口拒绝扣币。
- 有效会员已经拥有喜欢/访客全量清晰权益，不允许再生成单条付费报价；普通用户报价后开通会员，`confirm` 会再次复验并拒绝扣币。
- 确认扣币在数据库层增加余额条件，余额不足或并发余额变化时不会扣成负数。
- 一期没有隐藏访问入口、字段、统计排除或会员权益判断。

## 7. 不要新接入的旧接口

`POST /miniapp/asset/unlock` 仍供理想型、精选等既有批量解锁场景使用。

喜欢和访客单条解锁不得调用旧接口。后端已主动拒绝以下场景：

- `likes`
- `viewers`
- `likes_unlock_one`
- `viewers_unlock_one`

对应场景统一使用 `quote -> confirm` 两步接口，且请求必须携带具体 `LIK-*` 或 `VIS-*` 业务编号。喜欢解锁权益绑定具体 `LIK-*`；访客以 `VIS-*` 校验本次触发记录并留存审计，清晰权益按该记录对应的访客用户复用。

## 8. 接口出入参明细与示例

### 8.1 GET `/miniapp/relation/likes-me`

用途：查询当前有效的入向喜欢，返回新喜欢统计、稳定分页快照，以及普通/VIP/单条解锁混合展示结果。

入参：

| 参数 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `page` | Number | 否 | 页码，默认 1，小于 1 按 1 处理 |
| `size` | Number | 否 | 每页数量，默认 20，范围 1-20 |
| `snapshotCursor` | String | 否 | 第 1 页不传；第 2 页及以后传第 1 页返回的 `readCursor`，客户端不得解析或拼接 |

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `current` | Number | 当前页码 |
| `size` | Number | 服务端实际分页大小 |
| `total` | Number | 当前有效喜欢真实总数 |
| `newCount` | Number | 当前快照中尚未确认查看的有效喜欢真实数，不受可见上限影响 |
| `visibleTotal` | Number | 按会员和单条解锁规则实际进入分页集合的数量 |
| `hiddenCount` | Number | 普通用户暂未进入分页集合的未解锁数量，等于 `total-visibleTotal`；VIP 为 0 |
| `pages` | Number | 按 `visibleTotal/size` 计算的总页数 |
| `readCursor` | String/null | 本次查询的不透明快照游标；无任何有效喜欢时为 null |
| `newLikePreviewAvatars` | Array | 最多 5 条最新新喜欢头像摘要，结构见下表 |
| `accessMode` | String | `BLUR_LIMIT`、`MIXED`、`VIP_ALL_CLEAR` |
| `hasMore` | Boolean | 按 `visibleTotal` 判断是否可继续加载 |
| `records` | Array | 喜欢记录列表 |

`newLikePreviewAvatars[]`：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `recordNo` | String | 喜欢业务编号 |
| `displayStatus` | String | `blur` 或 `clear` |
| `avatar` | String/null | 审核通过头像 URL；blur/clear 均返回，前端根据 `displayStatus` 控制模糊样式 |
| `onlineStatus` | String | `online` 或 `offline`，用于顶部头像绿色在线点 |

`records[]`：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `recordNo` | String | 喜欢业务编号，单条解锁时作为 `targetBizNo` |
| `userId` | Number/null | 对方用户 ID，blur/clear 均返回 |
| `displayStatus` | String | `blur` 模糊、`clear` 清晰 |
| `nickname` | String/null | 昵称，blur/clear 均返回 |
| `avatar` | String/null | 审核通过头像 URL，blur/clear 均返回 |
| `age` | Number/null | 年龄，blur/clear 均返回 |
| `school` | String/null | 学校，blur/clear 均返回 |
| `onlineStatus` | String | `online` 最近5分钟活跃、`offline` 当前不在线；blur/clear 均返回 |
| `lastActiveTime` | String/null | 最近一次已鉴权小程序请求时间；无活跃记录时使用最近登录时间兜底 |
| `onlineText` | String | 后端生成的“在线”“1小时前在线”等展示文案 |
| `identityCode` | String/null | 身份类型字典 code，blur/clear 均返回，如 `STUDENT/WORKER` |
| `identityLabel` | String/null | 身份类型中文，blur/clear 均返回，如“在校生/职场人” |
| `industryCode` | String/null | 行业字典 code，blur/clear 均返回 |
| `industryLabel` | String/null | 行业中文，blur/clear 均返回 |
| `occupationCode` | String/null | 职业/职位字典 code，blur/clear 均返回 |
| `occupationLabel` | String/null | 职业/职位中文，blur/clear 均返回 |
| `company` | String/null | 工作单位，blur/clear 均返回 |
| `annualIncomeCode` | String/null | 年收入区间字典 code，blur/clear 均可返回 |
| `annualIncomeLabel` | String/null | 年收入区间中文，blur/clear 均可返回 |
| `weakTags` | Array<String> | 同城、同乡、星座等弱识别标签，最多 2 个 |
| `sourceScene` | String | 喜欢来源 |
| `isNew` | Boolean | 是否属于当前查询快照中的新喜欢；仅 `true` 显示“新”标签，前端不显示“已读”标签 |
| `groupKey` | String | `new`、`earlier_unlocked`、`earlier_locked` |
| `mutualLike` | Boolean | 当前是否已有有效相互喜欢 |
| `likedTime` | String | 喜欢生效时间 |
| `unlockTime` | String/null | 单条解锁生效时间；会员清晰但未单条解锁时仍为 null |
| `likeActionCopy` | String | 列表弱提示文案 |

普通用户示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "current": 1,
    "size": 20,
    "total": 315,
    "newCount": 59,
    "visibleTotal": 13,
    "hiddenCount": 302,
    "pages": 1,
    "readCursor": "MXw3fH58fnwyMDI2LTA3LTIyVDE0OjMwOjAwfDEwOA",
    "newLikePreviewAvatars": [
      {
        "recordNo": "LIK-8F8B9F2D",
        "displayStatus": "blur",
        "avatar": "https://cdn.example.com/avatar/108.jpg",
        "onlineStatus": "online"
      }
    ],
    "accessMode": "MIXED",
    "hasMore": false,
    "records": [
      {
        "recordNo": "LIK-8F8B9F2D",
        "userId": 108,
        "displayStatus": "blur",
        "nickname": "一只筱脑虎",
        "avatar": "https://cdn.example.com/avatar/108.jpg",
        "age": 28,
        "school": "浙江大学",
        "onlineStatus": "online",
        "lastActiveTime": "2026-07-22 14:29:00",
        "onlineText": "在线",
        "identityCode": "WORKER",
        "identityLabel": "职场人",
        "industryCode": "INTERNET",
        "industryLabel": "互联网",
        "occupationCode": "PRODUCT_MANAGER",
        "occupationLabel": "产品经理",
        "company": "星河科技",
        "annualIncomeCode": "FROM_300K_TO_500K",
        "annualIncomeLabel": "30-50万",
        "weakTags": ["同城", "金牛座"],
        "sourceScene": "featured",
        "isNew": true,
        "groupKey": "new",
        "mutualLike": false,
        "likedTime": "2026-07-22 14:30:00",
        "unlockTime": null,
        "likeActionCopy": "对你一见钟情，秒送喜欢"
      }
    ]
  }
}
```

完整基础资料示例（`blur/clear` 均返回，展示方式由 `displayStatus` 决定）：

```json
{
  "displayStatus": "clear",
  "userId": 108,
  "onlineStatus": "offline",
  "lastActiveTime": "2026-07-22 13:20:00",
  "onlineText": "1小时前在线",
  "identityCode": "WORKER",
  "identityLabel": "职场人",
  "industryCode": "INTERNET",
  "industryLabel": "互联网",
  "occupationCode": "PRODUCT_MANAGER",
  "occupationLabel": "产品经理",
  "company": "星河科技",
  "annualIncomeCode": "FROM_300K_TO_500K",
  "annualIncomeLabel": "30-50万",
  "school": "浙江大学"
}
```

分页和计数注意：

- 普通用户的“最近 10 条”只限制未解锁部分，不限制已单条解锁记录。
- `total=315` 不代表能翻 16 页；实际分页看 `visibleTotal`。
- 同一个 `readCursor` 同时承担“确认这次看到了哪里”和“后续分页固定在哪个快照”两个作用。
- 在当前页面提交 read 后，不要本地移除“新”标签；刷新或重新进入后再按新响应更新。

### 8.2 POST `/miniapp/relation/likes-me/read`

用途：喜欢我的首屏成功渲染后，幂等确认 GET 返回的查询快照已读。

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `readCursor` | String | 是 | GET `/likes-me` 返回的原始值，不得解析、改写或跨账号复用 |

```json
{
  "readCursor": "MXw3fH58fnwyMDI2LTA3LTIyVDE0OjMwOjAwfDEwOA"
}
```

成功返回：

```json
{"code":200,"msg":"success","data":null}
```

服务端处理细节：

1. 校验游标所属用户和快照上界记录，跨账号、伪造、缺失或已无法校验的游标返回 `4001`。
2. 用户没有游标行时原子插入；已有游标时只允许按 `(likedTime,id)` 单调向前推进。
3. 同一个游标重复提交幂等成功，不会重复写关系记录，也不会把游标倒退。
4. GET 与 POST 之间新到达的喜欢时间晚于本次快照上界，仍保持未读并计入下一次查询的 `newCount`。
5. `total>0、newCount=0` 时无需调用本接口，但 `readCursor` 仍应保存供当前页面后续分页使用；`total=0` 时 GET 返回 `readCursor=null`。

### 8.3 GET `/miniapp/relation/recent-viewers`

用途：查询最近 7 天访客用户列表和页面顶部统计。同一访客在最近 7 天只返回一张聚合卡片，底层 30 分钟展示记录和逐次访问事件保持不变。

入参：

| 参数 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `page` | Number | 否 | 页码，默认 1 |
| `size` | Number | 否 | 每页数量，默认 20，最大 20 |

分页与统计出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `current` | Number | 当前页，从 1 开始 |
| `size` | Number | 实际每页数量，最大 20 |
| `total` | Number | 最近 7 天有效访客去重总数，不受普通用户 10 人上限影响 |
| `visibleTotal` | Number | 当前权益下实际可分页的访客人数 |
| `hiddenCount` | Number | 未进入普通用户列表的人数，固定为 `total-visibleTotal` |
| `pages` | Number | 按 `visibleTotal/size` 计算的总页数 |
| `hasMore` | Boolean | 当前页后是否还有可见记录，按 `visibleTotal` 判断 |
| `accessMode` | String | `BLUR_LIMIT`、`MIXED`、`VIP_ALL_CLEAR` |
| `visibleDays` | Number | 前台访客展示窗口，固定 7 天 |
| `totalPv` | Number | 历史累计主页访问 PV |
| `visitorUv7d` | Number | 最近 7 天访问者去重人数 |
| `visitorPv7d` | Number | 最近 7 天实际访问次数 |
| `todayVisitorUv` | Number | 今日访客去重人数 |
| `todayVisitPv` | Number | 今日实际访问次数 |
| `records` | Array | 当前页访客用户聚合卡片 |

`records[]`：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `recordNo` | String | 该访客最近一条 30 分钟展示记录编号；单条解锁时作为 `targetBizNo`，仅用于校验和审计 |
| `userId` | Number | 访客用户 ID，`blur/clear` 均返回 |
| `displayStatus` | String | `blur` 或 `clear` |
| `nickname` | String/null | 昵称，`blur/clear` 均返回，由前端控制显隐 |
| `avatar` | String/null | 对外审核通过头像 URL，`blur/clear` 均返回；模糊效果由前端渲染 |
| `age` | Number/null | 年龄 |
| `school` | String/null | 学校 |
| `onlineStatus` | String | `online` 或 `offline`；最近 5 分钟存在已鉴权小程序请求即在线 |
| `lastActiveTime` | String/null | 最近活跃时间 |
| `onlineText` | String | 在线状态中文文案，如“在线”“5分钟前在线” |
| `identityCode/identityLabel` | String/null | 身份类型编码及中文 |
| `industryCode/industryLabel` | String/null | 行业编码及中文 |
| `occupationCode/occupationLabel` | String/null | 职业/职位编码及中文 |
| `company` | String/null | 公司 |
| `annualIncomeCode/annualIncomeLabel` | String/null | 年收入编码及中文 |
| `weakTags` | Array<String> | 弱识别标签 |
| `sourceScene` | String | 最近一条展示记录的首次访问来源 |
| `groupKey` | String | `today` 今日、`yesterday` 昨日、`recent7d` 近 7 天 |
| `visitCount` | Number | 该访客参与最近 7 天查询的全部展示记录 PV 合计 |
| `firstVisitTime` | String | 该访客参与最近 7 天查询的展示记录中最早访问时间 |
| `lastVisitTime` | String | 该访客最近一次访问时间 |
| `unlockTime` | String/null | 单条解锁生效时间；仅因 VIP 清晰且没有单条解锁时为空 |
| `mutualLike` | Boolean | 当前是否相互喜欢 |
| `relationBadges` | Array<String> | 当前可返回 `MUTUAL_LIKE`；消息徽标由 PRD-03 承接 |

可见集合与排序：

1. 基础范围只取 `visitStatus=visible、deleted=0、lastVisitTime>=当前时间-7天` 的访客记录；账号或关系失效由关系生命周期先更新状态，列表只查询有效记录。
2. 按 `visitorUserId` 聚合为一张卡片。`recordNo/sourceScene` 取最近一条展示记录，访问次数和首末时间跨该访客的窗口内展示记录聚合。
3. 普通用户可见集合为“全部有效单条已解锁访客 + 最近 10 个有效未解锁访客”；已解锁访客不占 10 个未解锁名额。
4. VIP 可见集合为最近 7 天全部有效访客，全部返回 `displayStatus=clear`。
5. 两类用户的最终分页顺序均为 `lastVisitTime DESC、最近展示记录 id DESC`。`unlockTime` 不参与排序，解锁不会让旧访客跳到列表顶部。
6. 本接口没有已读游标或分页快照。第 2 页继续传 `page+1`；若加载期间发生新访问，列表位置可能变化，下拉刷新时从第 1 页重新请求。
7. `total/visibleTotal` 是访客卡片人数；`totalPv/visitorPv7d/todayVisitPv` 是访问次数，不能混用。

`accessMode`：

| code | 含义 |
| --- | --- |
| `BLUR_LIMIT` | 普通用户当前可见集合中没有单条已解锁访客 |
| `MIXED` | 普通用户当前可见集合同时存在单条已解锁清晰访客和未解锁模糊访客 |
| `VIP_ALL_CLEAR` | 会员权益有效，窗口内全部访客清晰 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "current": 1,
    "size": 20,
    "total": 16,
    "visibleTotal": 12,
    "hiddenCount": 4,
    "pages": 1,
    "accessMode": "MIXED",
    "hasMore": false,
    "visibleDays": 7,
    "totalPv": 1171,
    "visitorUv7d": 16,
    "visitorPv7d": 36,
    "todayVisitorUv": 7,
    "todayVisitPv": 9,
    "records": [
      {
        "recordNo": "VIS-AB1290EF",
        "userId": 108,
        "displayStatus": "blur",
        "nickname": "筱脑虎",
        "avatar": "https://cdn.example.com/avatar/108.jpg",
        "age": 25,
        "school": "浙江大学",
        "onlineStatus": "online",
        "lastActiveTime": "2026-07-22 10:21:00",
        "onlineText": "在线",
        "identityCode": "student",
        "identityLabel": "学生",
        "industryCode": "internet",
        "industryLabel": "互联网",
        "occupationCode": "product_manager",
        "occupationLabel": "产品经理",
        "company": "星河科技",
        "annualIncomeCode": "income_30_50",
        "annualIncomeLabel": "30-50万",
        "weakTags": ["同城"],
        "sourceScene": "profile",
        "groupKey": "today",
        "visitCount": 6,
        "firstVisitTime": "2026-07-20 09:10:00",
        "lastVisitTime": "2026-07-22 10:20:00",
        "unlockTime": null,
        "mutualLike": false,
        "relationBadges": []
      }
    ]
  }
}
```

移动端对接流程：

1. 页面进入或下拉刷新调用本接口的第 1 页，根据 `accessMode、total、visibleTotal、hiddenCount` 渲染统计和权益提示。
2. `displayStatus=blur` 的卡片仍能拿到完整基础资料，但前端必须渲染模糊样式；点击卡片先打开“解锁 Ta 是谁”场景弹层，此时不请求扣币。
3. 用户点击“只看 ta”时，以该卡片 `recordNo` 调用 8.10 quote。若返回 `alreadyUnlocked=true`，不再调用 confirm，直接刷新列表或把该 `userId` 的卡片切为 clear。
4. quote 返回正常报价后展示价格和余额；用户确认时使用稳定 `requestId` 调用 8.11 confirm。成功后按返回的 `targetUserId` 更新当前卡片，或重新请求本接口。
5. 同一访客后来生成新 `VIS-*` 时，服务端仍按访客用户识别既有权益；该卡片继续 clear，新记录 quote 也返回 `alreadyUnlocked=true`，不重复扣币。
6. “解锁全部”走 PRD-04 VIP 购买链路，会员生效后重新请求本接口；禁止逐条调用 quote/confirm。

### 8.4 GET `/miniapp/relation/mutual-matches`

用途：查询当前有效相互喜欢，支撑“相互喜欢”列表。

入参：

| 参数 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `page` | Number | 否 | 页码，默认 1 |
| `size` | Number | 否 | 每页数量，默认 20，最大 20 |

`records[]` 出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `matchNo` | String | 匹配生命周期编号 |
| `userId` | Number | 对方用户 ID |
| `nickname` | String | 对方昵称 |
| `avatar` | String/null | 对外审核通过头像 |
| `age` | Number/null | 年龄 |
| `height` | Number/null | 身高，厘米 |
| `currentCity` | String/null | 现居城市 |
| `hometownCity` | String/null | 家乡城市 |
| `primarySource` | String | 首次形成本生命周期的来源 |
| `activeSources` | Array<String> | 当前仍有效的全部匹配来源 |
| `matchStatus` | String | 默认列表固定 `matched` |
| `matchTime` | String | 匹配建立时间 |
| `canEnterConversation` | Boolean | 是否可进入会话；发送权限由 PRD-03 再判断 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "current": 1,
    "size": 20,
    "total": 4,
    "pages": 1,
    "hasMore": false,
    "records": [
      {
        "matchNo": "MAT-89DF45A1",
        "userId": 108,
        "nickname": "筱脑虎",
        "avatar": "https://cdn.example.com/avatar/108.jpg",
        "age": 25,
        "height": 165,
        "currentCity": "杭州",
        "hometownCity": "郑州",
        "primarySource": "double_like",
        "activeSources": ["double_like"],
        "matchStatus": "matched",
        "matchTime": "2026-07-22 12:49:58",
        "canEnterConversation": true
      }
    ]
  }
}
```

### 8.5 POST `/miniapp/relation/likes`

用途：当前用户向目标用户送出喜欢；双向喜欢时自动建立或复用匹配生命周期。

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `requestId` | String | 是 | 客户端幂等键，同一次操作重试必须复用 |
| `targetUserId` | Number | 是 | 被喜欢用户 ID |
| `sourceScene` | String | 是 | 喜欢来源场景 |

```json
{
  "requestId": "like-7-108-20260722-001",
  "targetUserId": 108,
  "sourceScene": "profile"
}
```

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `likeNo` | String | 喜欢业务编号 |
| `likeStatus` | String | `active` |
| `matched` | Boolean | 本次操作后是否存在有效匹配 |
| `matchNo` | String/null | 有匹配时返回生命周期编号 |
| `matchStatus` | String/null | 有匹配时返回 `matched` |
| `canEnterConversation` | Boolean | 是否可进入会话 |

同一 `requestId` 重试返回原业务结果；已有有效喜欢却换新 `requestId` 返回 `20004`。

### 8.6 DELETE `/miniapp/relation/likes/{targetUserId}`

用途：取消当前用户对目标用户的喜欢。

入参：

| 参数 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `targetUserId` | Number | 是 | 路径参数，被取消喜欢的用户 ID |

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `likeStatus` | String | `cancelled` |
| `matched` | Boolean | 取消爱心来源后是否仍有其他有效匹配来源 |
| `matchNo` | String/null | 仍有有效匹配时返回 |
| `matchStatus` | String | `matched` 或 `invalid` |
| `canEnterConversation` | Boolean | 是否仍可进入会话 |

如果仍有 `whisper_reply` 等来源，取消喜欢不会让整个匹配失效。对方前台不会收到“取消喜欢”提示。

### 8.7 POST `/miniapp/relation/visits`

用途：对方婚恋主页主体成功展示后，上报一次实际访问。

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `eventNo` | String | 是 | 单次页面进入幂等编号；同一次进入的重试必须复用 |
| `targetUserId` | Number | 是 | 被访问用户 ID |
| `sourceScene` | String | 是 | 本次进入主页的来源 |

```json
{
  "eventNo": "visit-7-108-20260722T143000-01",
  "targetUserId": 108,
  "sourceScene": "likes_me"
}
```

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `visitNo` | String | 归并后的访客展示记录编号 |
| `deduplicated` | Boolean | true 表示幂等复用或归并进 30 分钟展示记录 |
| `visitCount` | Number | 当前展示记录累计 PV |
| `recordedTime` | String | 最近访问时间 |

### 8.8 GET `/miniapp/relation/match-popup/pending`

用途：查询当前用户最早一条待展示匹配成功弹层。

入参：无。

有数据时：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `matchNo` | String | 匹配生命周期编号 |
| `matchedUserId` | Number | 匹配对方用户 ID |
| `nickname` | String | 对方昵称 |
| `avatar` | String/null | 对方审核通过头像 |
| `matchSource` | String | 匹配主来源 |
| `matchTime` | String | 匹配时间 |
| `canEnterConversation` | Boolean | 是否可进入会话 |
| `popupStatus` | String | 固定 `pending` |

无待展示弹层时返回：

```json
{"code":200,"msg":"success","data":null}
```

接口成功返回会记录 `deliveredTime`，但不会直接标记已读。只有弹层真正显示并发生用户动作后才调用 read。

### 8.9 POST `/miniapp/relation/match-popup/{matchNo}/read`

用途：记录用户对匹配成功弹层的实际动作。

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `matchNo` | String | 是 | 路径参数，匹配生命周期编号 |
| `action` | String | 是 | `later`、`close`、`profile`、`chat`、`system_back` |

```json
{"action":"profile"}
```

成功返回：

```json
{"code":200,"msg":"success","data":null}
```

同一用户重复提交幂等成功；A 用户已读不影响 B 用户的独立弹层状态。

### 8.10 POST `/miniapp/asset/unlock/quote`

用途：校验本次触发的关系记录并获取单条解锁报价。本接口不扣币。仅普通用户可获取付费报价；有效会员调用时返回 `5001`，前端直接刷新为会员清晰态。

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `scene` | String | 是 | `likes_unlock_one` 或 `viewers_unlock_one` |
| `targetBizType` | String | 是 | `like` 或 `visit`，必须与 scene 匹配 |
| `targetBizNo` | String | 是 | 列表返回的 `LIK-*` 或 `VIS-*` 记录编号 |

```json
{
  "scene": "likes_unlock_one",
  "targetBizType": "like",
  "targetBizNo": "LIK-8F8B9F2D"
}
```

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `quoteToken` | String/null | 5 分钟报价令牌；已解锁时为空 |
| `scene` | String | 解锁场景 |
| `targetBizType` | String | 目标关系类型 |
| `targetBizNo` | String | 目标关系编号 |
| `targetUserId` | Number/null | 未解锁报价时为空；已经解锁时可返回 |
| `unitPrice` | Number | 本次单条解锁价格，单位千寻币 |
| `coinBalance` | Number | 当前千寻币余额 |
| `alreadyUnlocked` | Boolean | 是否已存在有效单条解锁 |
| `expireAt` | String/null | 报价过期时间；已解锁时为空 |

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "quoteToken": "uq_04f420b6422241f0a7cc1e3e22817a7f",
    "scene": "likes_unlock_one",
    "targetBizType": "like",
    "targetBizNo": "LIK-8F8B9F2D",
    "targetUserId": null,
    "unitPrice": 8,
    "coinBalance": 100,
    "alreadyUnlocked": false,
    "expireAt": "2026-07-22 14:35:00"
  }
}
```

访客解锁的特殊口径：

1. `targetBizNo` 必须是当前用户最近访客列表返回、仍处于 7 天窗口且状态有效的 `VIS-*`，服务端据此解析真实 `visitorUserId`，客户端不能直接提交任意 `targetUserId`。
2. 服务端按 `当前用户 + targetBizType=visit + visitorUserId` 查询既有有效权益，不按某一条 `VIS-*` 限定。
3. 如果同一访客此前已通过其他 `VIS-*` 解锁，本接口直接返回 `alreadyUnlocked=true、quoteToken=null、targetUserId=访客用户ID、expireAt=null`，不生成新报价，前端不得再调用 confirm。
4. 喜欢场景保持按具体 `LIK-*` 判断，不受访客按用户复用规则影响。

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "quoteToken": null,
    "scene": "viewers_unlock_one",
    "targetBizType": "visit",
    "targetBizNo": "VIS-NEW-8A7C",
    "targetUserId": 108,
    "unitPrice": 8,
    "coinBalance": 92,
    "alreadyUnlocked": true,
    "expireAt": null
  }
}
```

### 8.11 POST `/miniapp/asset/unlock/confirm`

用途：用户在第二步弹层确认后，复验关系、会员权益、价格与余额，原子扣币并写解锁记录和资产流水。报价后新开通会员时返回 `5001`，且不扣币。

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `requestId` | String | 是 | 本次确认扣币幂等键，网络重试必须复用 |
| `quoteToken` | String | 是 | quote 返回的 5 分钟令牌 |

幂等键按 `requestId + quoteToken` 成对绑定并写入解锁记录。同一对参数网络重试会返回原结果且不再扣币；同一 `requestId` 搭配其他 `quoteToken` 返回 `4001`，不能串用另一个用户或另一个关系记录的报价。成功记录已落库后，即使 Redis 报价过期，使用原参数重试仍可幂等返回。

确认事务先对当前用户资产行执行 `SELECT ... FOR UPDATE`，再复验关系、会员、价格、余额和既有权益。这样同一用户并发确认同一访客的不同 `VIS-*` 时，只有第一笔可扣币；后续请求在获得行锁后能看到已有访客用户权益并返回 `charged=false、coinCost=0`。

```json
{
  "requestId": "unlock-7-LIK-8F8B9F2D-001",
  "quoteToken": "uq_04f420b6422241f0a7cc1e3e22817a7f"
}
```

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `unlockNo` | String | 解锁业务编号 |
| `targetBizType` | String | `like` 或 `visit` |
| `targetBizNo` | String | 建立该权益时留存的触发关系编号；访客复用既有权益且 `charged=false` 时，可能是此前的 `VIS-*`，因此前端应按 `targetUserId` 更新卡片 |
| `targetUserId` | Number | 解锁成功后可查看的目标用户 ID |
| `status` | String | `active` |
| `coinCost` | Number | 本次实际扣币数；幂等复用或原本已解锁时为 0 |
| `coinBalance` | Number | 扣币后余额 |
| `displayStatus` | String | 固定 `clear` |
| `charged` | Boolean | 本次请求是否实际发生扣币 |
| `effectiveTime` | String | 解锁生效时间 |
| `expireTime` | String/null | 喜欢/访客单条解锁永久有效，固定为空 |

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "unlockNo": "ULK-195023180100001",
    "targetBizType": "like",
    "targetBizNo": "LIK-8F8B9F2D",
    "targetUserId": 108,
    "status": "active",
    "coinCost": 8,
    "coinBalance": 92,
    "displayStatus": "clear",
    "charged": true,
    "effectiveTime": "2026-07-22 14:30:10",
    "expireTime": null
  }
}
```

## 9. 错误码与前端处理

| code | 场景 | 前端处理 |
| --- | --- | --- |
| `200` | 成功 | 按 data 渲染 |
| `4001` | 参数、喜欢快照游标、场景或业务类型错误，或解锁 `requestId` 已绑定其他报价 | 游标错误时丢弃当前分页快照并从第 1 页重新查询；解锁幂等冲突时生成新的 `requestId` 并重新 quote |
| `401` | 未登录或登录过期 | 跳登录 |
| `20001` | 当前用户核心准入未开放 | 跳认证中心或准入引导 |
| `20002` | 目标用户/关系记录不可用 | toast 后刷新列表，不展示失效原因 |
| `20004` | 已存在有效喜欢 | 视为当前已喜欢并刷新关系状态 |
| `5001` | 报价过期、价格变化、场景关闭、余额不足，或会员权益已覆盖列表 | 重新 quote；余额不足时承接 PRD-04 充值；已开会员时刷新列表且不再调用单条解锁 |
| `5000` | 系统异常 | 展示通用错误并记录响应中的请求 ID |

HTTP 层沿用项目现状：多数业务错误 HTTP 状态仍为 200，以响应体 `code` 判断；鉴权拦截和明确禁止访问按全局规则处理。

## 10. 联调检查清单

- [ ] 普通用户喜欢列表抓包确认 `userId/avatar/nickname/age/school` 及扩展资料字段完整返回。
- [ ] 普通用户验证“全部已单条解锁 + 最近 10 条未解锁”均进入可见集合；解锁记录超过 10 条时可正常翻页。
- [ ] `total/newCount` 不受普通用户可见上限影响，`visibleTotal/hiddenCount/pages/hasMore` 与实际分页集合一致。
- [ ] 新喜欢摘要最多 5 条；每项均返回真实头像 URL，前端按 `displayStatus` 渲染模糊或清晰样式。
- [ ] 顶部头像摘要和卡片均校验 `onlineStatus`；不新增小程序心跳请求，任意已鉴权请求应刷新 5 分钟在线标记。
- [ ] 模糊和清晰卡片均返回身份、行业、职业、公司、年收入、学校；字典字段 code/label 对应后台启用字典。
- [ ] 前端只依据 `displayStatus` 控制模糊样式和字段展示，不依据字段是否为空判断解锁状态。
- [ ] 首屏成功渲染后才提交 `readCursor`；失败或异常退出不提交。
- [ ] read 重试幂等；GET 和 read 之间新增喜欢后，旧游标不会把新增记录标成已读。
- [ ] 第 2 页及以后始终传第 1 页 `readCursor` 作为 `snapshotCursor`，确认已读后分页不重排、不重复、不漏项。
- [ ] 下拉刷新和重新进入不传旧 `snapshotCursor`，当前页面保留“新”标签，刷新后按新状态重算。
- [ ] 会员到期后，未单条解锁记录重新模糊，已单条解锁记录仍清晰。
- [ ] 有效会员调用 quote、普通用户 quote 后开通会员再调用 confirm，均不产生单条扣币或解锁流水。
- [ ] 最近访客页分别展示 `totalPv、todayVisitorUv、todayVisitPv`，不要混用 UV/PV；分页人数使用 `visibleTotal`。
- [ ] 同一访客最近 7 天存在多条 30 分钟展示记录时只返回一张卡片，`visitCount/firstVisitTime/lastVisitTime` 聚合正确。
- [ ] 普通用户最近访客可见集合为全部已单条解锁访客加最近 10 个未解锁访客；VIP 为全部访客；`total/visibleTotal/hiddenCount/pages/hasMore` 一致。
- [ ] 最近访客无论是否解锁都返回用户 ID、头像、昵称、年龄、学校、在线、身份、行业、职业、公司和年收入，前端只按 `displayStatus` 控制展示。
- [ ] 最近访客始终按最近访问时间倒序；解锁一名较早访客后，该访客不得跳到列表顶部。
- [ ] 同一访客生成新的 `VIS-*` 后仍保持 clear；以新编号 quote 返回 `alreadyUnlocked=true`，不调用 confirm、不重复扣币。
- [ ] 同一用户并发确认同一访客的不同 `VIS-*` 时只有一笔 `charged=true`，其余返回 `charged=false` 且余额只扣一次。
- [ ] 同一次主页进入的重试复用 `eventNo`，真正重新进入才生成新值。
- [ ] 第一步解锁弹层关闭时没有 quote/confirm 副作用；第二步取消时不调用 confirm。
- [ ] confirm 网络重试复用同一个 `requestId`，确认 `charged=false、coinCost=0` 且余额不再变化。
- [ ] 不得把同一个 `requestId` 与另一个 `quoteToken` 组合重试；服务端应返回 `4001` 且余额不变。
- [ ] 将目标用户认证改为非开放后，喜欢、访客、相互喜欢和匹配弹层均不再返回该用户身份。
- [ ] quote 后等待超过 5 分钟，confirm 返回报价过期且不扣币。
- [ ] 对象取消喜欢、超访客窗口或账号异常后，confirm 拒绝扣币并刷新列表。
- [ ] 匹配弹层真正展示前不调用 read；用户动作发生后传准确 action。
- [ ] `查看主页` 使用 PRD-05 对方主页接口，不使用 `/miniapp/profile/home-detail`。
- [ ] `解锁全部` 走 PRD-04 会员购买链路，不循环调用单条 confirm。
