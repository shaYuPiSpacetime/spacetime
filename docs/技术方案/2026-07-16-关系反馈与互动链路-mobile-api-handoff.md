# 关系反馈与互动链路 - 移动端接口交接草案

> 文档状态：`DRAFT-DEFERRED`
> 日期：2026-07-16
> 冻结依据：`C02-12`，移动端接口本轮先不实现
> 关联技术方案：`docs/技术方案/2026-07-16-关系反馈与互动链路-tcdesign.md`
> 重要说明：本文 URL、DTO 和示例是未来实现基线，当前环境不保证存在这些路由。不得直接联调、不得用 Mock 冒充实现、不得纳入本轮完成度或验收结论。

## 1. 交付边界

### 1.1 本文包含

- 喜欢我的、最近看过我的、相互喜欢列表契约。
- 发起喜欢、取消喜欢、婚恋主页访问上报契约。
- 匹配成功弹窗待展示与用户动作回执契约。
- 喜欢/访客单条解锁的报价和第二步确认契约。
- 状态、幂等、错误码、字段可见性和前端处理建议。

### 1.2 当前不做

- 不新增 `/miniapp/relation/**` Controller、Service、DAO 调用或路由。
- 不修改小程序喜欢、访客、相互喜欢、匹配弹窗和解锁弹窗页面。
- 不执行 cURL、L1/L2/L3/L4 测试，不提供“接口已通”结论。
- 不实现隐藏访问入口、开关、字段、权益校验、过滤或 UV/PV 排除。
- 不把 `canSend`、`protectStatus` 放进 PRD-02；这两个字段归 PRD-03 会话接口。

后续启动移动端实现前，必须由用户明确将 `C02-12` 从延期改为实施，并先确认技术方案、测试用例和缺失 UI 资产。

## 2. 通用约定

| 项 | 约定 |
|----|------|
| Base URL | 未来统一使用 `/miniapp`，不使用产品草案中的 `/api/app` 前缀 |
| 鉴权 | `Authorization: Bearer <token>`；userId 从登录上下文取得，客户端不得代传当前用户 ID |
| 返回体 | `R<T>`：`code=200` 成功，`msg=success`，业务数据在 `data` |
| 时间 | `yyyy-MM-dd HH:mm:ss`，服务端时区 Asia/Shanghai |
| 业务编号 | 喜欢 `LIK-*`、访客 `VIS-*`、匹配 `MAT-*`、解锁 `ULK-*` |
| 分页 | `page` 从 1 开始；列表返回 `current,size,total,pages,records` |
| 幂等 | 喜欢用 `requestId`；访问用 `eventNo`；弹窗已读按 `matchNo+当前用户`；解锁确认用 `requestId+quoteToken` |
| 对象失效 | 默认列表不返回，不渲染失效卡片，不展示真实原因，不弹关系失效提示 |
| 性别范围 | 首版只生成和展示异性关系，继承 PRD-01 性别规则 |
| 核心准入 | 双方均需满足核心准入且账号正常，失败返回 `20001` 或 `20002` |

## 3. 枚举

### 3.1 来源场景 `sourceScene`

| code | 中文 | 使用场景 |
|------|------|----------|
| `fate` | 觅缘 | 推荐卡片 |
| `featured` | 精选 | 精选主页/卡片 |
| `ideal` | 理想型 | 理想型结果 |
| `profile` | 婚恋用户主页 | 直接进入主页 |
| `likes_me` | 喜欢我的 | 从喜欢列表回看主页 |
| `recent_viewers` | 最近看过我的 | 从访客列表回看主页 |

### 3.2 展示状态 `displayStatus`

| code | 中文 | 前端处理 |
|------|------|----------|
| `blur` | 模糊 | 只渲染弱识别信息；昵称、年龄、学校为 null |
| `clear` | 清晰 | 渲染真实头像和允许公开的资料 |

接口不会向默认前台列表返回 `invalid` 对象。

### 3.3 关系状态

| 字段 | code |
|------|------|
| `likeStatus` | `active`；取消/失效记录不进入默认列表 |
| `visitStatus` | `visible`；超 7 天或失效记录不进入默认列表 |
| `matchStatus` | `matched`；失效记录不进入默认列表 |
| `matchSource` | `double_like`、`featured_heart_return_like`、`whisper_reply` |
| `popupStatus` | `pending`、`read`；客户端通常只接收 pending |
| `unlockStatus` | `active`、`expired`、`refunded` |

## 4. 接口总览

| ID | Method | Path | 场景 | 当前状态 |
|----|--------|------|------|----------|
| `MOB-02-01` | GET | `/miniapp/relation/likes-me` | 喜欢我的 | `DRAFT-DEFERRED` |
| `MOB-02-02` | GET | `/miniapp/relation/recent-viewers` | 最近看过我的 | `DRAFT-DEFERRED` |
| `MOB-02-03` | GET | `/miniapp/relation/mutual-matches` | 相互喜欢 | `DRAFT-DEFERRED` |
| `MOB-02-04` | POST | `/miniapp/relation/likes` | 发起喜欢 | `DRAFT-DEFERRED` |
| `MOB-02-05` | DELETE | `/miniapp/relation/likes/{targetUserId}` | 取消喜欢 | `DRAFT-DEFERRED` |
| `MOB-02-06` | POST | `/miniapp/relation/visits` | 婚恋主页访问上报 | `DRAFT-DEFERRED` |
| `MOB-02-07` | GET | `/miniapp/relation/match-popup/pending` | 查询待展示匹配弹窗 | `DRAFT-DEFERRED` |
| `MOB-02-08` | POST | `/miniapp/relation/match-popup/{matchNo}/read` | 匹配弹窗动作回执 | `DRAFT-DEFERRED` |
| `MOB-02-09` | POST | `/miniapp/asset/unlock/quote` | 获取单条解锁报价 | `DRAFT-DEFERRED` |
| `MOB-02-10` | POST | `/miniapp/asset/unlock/confirm` | 第二步确认并扣币 | `DRAFT-DEFERRED` |

## 5. 列表接口

### 5.1 喜欢我的

`GET /miniapp/relation/likes-me?page=1&size=10`

#### 查询规则

- 只返回当前有效、对方仍可互动的入向喜欢，按 `likedTime DESC, id DESC`。
- `total` 是当前有效被喜欢真实总数，不因普通用户只展示 10 条而缩小。
- 普通用户未单条解锁：最多返回最近 10 条模糊记录；达到 10 条后 `hasMore=false`。
- 有全量清晰会员权益：每页固定 20 条，可继续加载。
- 单条解锁只影响对应记录；会员到期不影响已经单条购买的记录。
- 对方取消喜欢、拉黑、冻结、注销、封禁或认证失效后，该记录从前台移除。

`pages` 仍按真实 `total` 计算，仅用于总量展示；普通用户是否允许继续加载必须以 `hasMore` 为准，不能因为 `pages>1` 绕过 10 条上限。

#### 响应示例

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "current": 1,
    "size": 10,
    "total": 32,
    "pages": 4,
    "accessMode": "BLUR_LIMIT",
    "hasMore": false,
    "records": [
      {
        "recordNo": "LIK-20260716-000001",
        "userId": 100488,
        "displayStatus": "blur",
        "nickname": null,
        "avatar": "https://example.com/avatar-blur.png",
        "age": null,
        "school": null,
        "weakTags": ["同城", "金牛座"],
        "sourceScene": "profile",
        "isMutualLike": false,
        "likedTime": "2026-07-16 10:00:00",
        "likeActionCopy": "对你一见钟情，秒送喜欢"
      }
    ]
  }
}
```

`accessMode`：`BLUR_LIMIT` 普通模糊上限、`VIP_ALL_CLEAR` 会员全量清晰、`MIXED` 单条解锁与其他模糊项混合。

### 5.2 最近看过我的

`GET /miniapp/relation/recent-viewers?page=1&size=20`

#### 查询规则

- 只返回最近 7 天进入过当前用户婚恋主页的有效展示记录。
- 同一访问者在滚动 30 分钟内只形成/更新一条展示记录；每次真实访问都累计到 `visitCount`。
- `visitorUv7d` 按访问者 userId 去重；`visitorPv7d` 为实际访问次数总和。
- 普通用户可见性与单条/VIP 解锁规则同喜欢我的。
- 一期不存在隐藏访问数据或隐藏标识。

#### 响应示例

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "current": 1,
    "size": 20,
    "total": 8,
    "pages": 1,
    "visibleDays": 7,
    "visitorUv7d": 8,
    "visitorPv7d": 15,
    "todayVisitorUv": 1,
    "todayVisitPv": 2,
    "records": [
      {
        "recordNo": "VIS-20260716-000001",
        "userId": 100489,
        "displayStatus": "blur",
        "nickname": null,
        "avatar": "https://example.com/avatar-blur.png",
        "weakTags": ["同城", "在线 2 小时前"],
        "sourceScene": "profile",
        "groupKey": "today",
        "visitCount": 2,
        "firstVisitTime": "2026-07-16 09:20:00",
        "lastVisitTime": "2026-07-16 09:41:00",
        "hasWhisperFromThem": true,
        "hasWhisperToThem": false,
        "isMutualLike": false
      }
    ]
  }
}
```

### 5.3 相互喜欢

`GET /miniapp/relation/mutual-matches?page=1&size=20`

#### 查询规则

- 只返回 `matched`，按 `matchTime DESC, id DESC`。
- 同一无序用户对同时最多一条有效匹配；新来源只追加到当前生命周期。
- 取消某个爱心来源后，如果仍有 `whisper_reply` 等有效来源，匹配继续展示。
- `canEnterConversation` 只由匹配、账号、拉黑和准入状态决定。
- 女性保护不影响进入会话；进入后由 PRD-03 返回 `canSend/protectStatus`。

#### 响应示例

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "current": 1,
    "size": 20,
    "total": 5,
    "pages": 1,
    "records": [
      {
        "matchNo": "MAT-20260716-000001",
        "userId": 100490,
        "nickname": "小雨",
        "avatar": "https://example.com/avatar.png",
        "age": 26,
        "height": 165,
        "primarySource": "double_like",
        "activeSources": ["double_like", "whisper_reply"],
        "matchStatus": "matched",
        "matchTime": "2026-07-16 09:20:00",
        "canEnterConversation": true
      }
    ]
  }
}
```

## 6. 关系动作接口

### 6.1 发起喜欢

`POST /miniapp/relation/likes`

```json
{
  "requestId": "like-100281-20260716-001",
  "targetUserId": 100488,
  "sourceScene": "profile"
}
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "likeNo": "LIK-20260716-000001",
    "likeStatus": "active",
    "matched": true,
    "matchNo": "MAT-20260716-000001",
    "canEnterConversation": true
  }
}
```

规则：

- 同一 `requestId` 重试返回同一业务结果，不重复写喜欢/匹配。
- 已存在 active 喜欢但使用了新 requestId，返回 `20004`，不新建记录。
- 双向爱心命中时，在同一事务创建/复用有效匹配并追加来源。
- 目标无效、同性范围、任一方核心准入不足时不形成真实关系。

### 6.2 取消喜欢

`DELETE /miniapp/relation/likes/{targetUserId}`

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "likeStatus": "cancelled",
    "matchStatus": "matched",
    "canEnterConversation": true
  }
}
```

上述示例表示爱心来源已撤销，但仍有其他有效匹配来源。若没有任何其他来源，`matchStatus=invalid, canEnterConversation=false`。前端不得向对方展示“取消喜欢”原因。

### 6.3 婚恋主页访问上报

`POST /miniapp/relation/visits`

```json
{
  "eventNo": "visit-100281-100488-20260716T102030-01",
  "targetUserId": 100488,
  "sourceScene": "profile"
}
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "visitNo": "VIS-20260716-000001",
    "deduplicated": true,
    "visitCount": 3,
    "recordedTime": "2026-07-16 10:20:30"
  }
}
```

前端规则：

- 只有婚恋用户主页主体成功展示后才上报；社区动态详情、职业主页不调用。
- 同一次进入及其网络重试必须复用 eventNo；用户真正重新进入页面时生成新 eventNo。
- `deduplicated=true` 表示归并到已有展示记录，仍然计入一次实际 PV。
- 上报失败可以有限重试；不得因为失败而阻塞用户查看主页。

## 7. 匹配成功弹窗

### 7.1 查询待展示状态

`GET /miniapp/relation/match-popup/pending`

无待展示数据时：`data=null`，不是错误。

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "matchNo": "MAT-20260716-000001",
    "matchedUserId": 100490,
    "nickname": "小雨",
    "avatar": "https://example.com/avatar.png",
    "matchSource": "whisper_reply",
    "matchTime": "2026-07-16 09:20:00",
    "canEnterConversation": true,
    "popupStatus": "pending"
  }
}
```

### 7.2 用户动作回执

`POST /miniapp/relation/match-popup/{matchNo}/read`

```json
{
  "action": "chat"
}
```

`action` 只允许：`later`、`close`、`profile`、`chat`、`system_back`。

前端时序：

1. 请求 pending。
2. 用户资料和弹窗组件成功渲染后显示弹窗。
3. 用户主动点击“稍后再说”、关闭、主页、聊天或系统返回时调用 read。
4. read 可在导航前 await，也可可靠排队重试；重复调用幂等成功。
5. 图片/数据加载失败、弹窗未显示、应用被系统终止时不调用 read。

匹配双方各有一条独立状态；A 已读不影响 B。新的匹配生命周期使用新 matchNo，可以再次展示。

## 8. 两步单条解锁

### 8.1 UI 与扣币边界

```text
第 1 步：PRD-02“解锁 Ta 是谁”场景弹窗
  - 只看 ta -> 进入第 2 步
  - 解锁全部 -> 进入会员承接
  - 取消 -> 不请求扣币

第 2 步：PRD-04 千寻币确认弹窗
  - 先取 quote
  - 用户确认后调用 confirm
  - confirm 成功才扣币并写解锁/流水
  - 取消或关闭不扣币
```

### 8.2 获取报价

`POST /miniapp/asset/unlock/quote`

```json
{
  "scene": "likes_unlock_one",
  "targetBizType": "like",
  "targetBizNo": "LIK-20260716-000001"
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "quoteToken": "uq_01J2ZQ...",
    "scene": "likes_unlock_one",
    "targetBizType": "like",
    "targetBizNo": "LIK-20260716-000001",
    "targetUserId": 100488,
    "unitPrice": 8,
    "coinBalance": 120,
    "alreadyUnlocked": false,
    "expireAt": "2026-07-16 10:35:00"
  }
}
```

报价前校验当前用户归属、关系有效、目标仍可展示、场景已启用。quoteToken 短时有效且绑定用户、场景和具体关系记录。

### 8.3 第二步确认

`POST /miniapp/asset/unlock/confirm`

```json
{
  "requestId": "unlock-100281-LIK-20260716-000001-01",
  "quoteToken": "uq_01J2ZQ..."
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "unlockNo": "ULK-20260716-000001",
    "status": "active",
    "coinCost": 8,
    "coinBalance": 112,
    "displayStatus": "clear",
    "effectiveTime": "2026-07-16 10:31:10",
    "expireTime": null
  }
}
```

服务端必须在一个事务中再次校验 quote、关系有效性、重复解锁和余额，再原子扣币并写解锁记录与流水。相同 requestId 重试返回原结果，不重复扣币。关系在 quote 后失效时返回 `20002`，不扣币。

现有 `/miniapp/asset/unlock` 只接收 targetUserIds，不具备具体关系记录复验。未来实现时，`likes_unlock_one` 和 `viewers_unlock_one` 必须禁用旧入口，避免绕过第二步确认。

## 9. 字段可见性矩阵

| 场景 | avatar | nickname | age/school | weakTags | 关系真实失效原因 |
|------|--------|----------|------------|----------|------------------|
| 普通未解锁 | 模糊资源 | null | null | 可见 | 永不下发 |
| 单条解锁 active | 清晰 | 可见 | 按资料公开规则 | 可见 | 永不下发 |
| VIP 全量权益 active | 清晰 | 可见 | 按资料公开规则 | 可见 | 永不下发 |
| VIP 到期、未单条解锁 | 回退模糊 | null | null | 可见 | 永不下发 |
| VIP 到期、已单条解锁 | 继续清晰 | 可见 | 按资料公开规则 | 可见 | 永不下发 |
| 对方/关系失效 | 整条不返回 | 整条不返回 | 整条不返回 | 整条不返回 | 只在后台保留 |
| 访客超过 7 天 | 最近访客列表不返回 | 不返回 | 不返回 | 不返回 | 历史解锁可在资产记录查询 |

## 10. 错误码与前端处理

| 业务 code | 含义 | 是否重试 | 前端处理 |
|-----------|------|----------|----------|
| `20001` | 当前用户核心准入未开放 | 否 | 跳认证引导，不保留待提交动作 |
| `20002` | 目标用户或关系记录不可用 | 否 | 从当前列表移除并静默刷新；不展示真实原因 |
| `20004` | 已存在有效喜欢 | 否 | 刷新当前状态，避免重复 toast |
| `20005` | 访客记录已超 7 天窗口 | 否 | 移除记录，不进入扣币确认 |
| `20006` | 关系统计/列表暂不可用 | 是 | 保留当前页面，显示重试态 |
| `20007` | 匹配弹窗不存在或已处理 | 否 | 关闭弹窗，不报系统错误 |
| `4001` | 参数、分页、枚举不合法 | 否 | 阻止提交并记录前端日志 |
| `401` | 未登录或 token 失效 | 否 | 走统一登录恢复 |
| `403` | 无权限 | 否 | 走统一权限提示 |
| `5001` | 余额不足、报价过期等业务异常 | 按文案 | 余额不足进入充值；报价过期重新 quote |
| `5000` | 系统异常，包含 requestId | 是 | 展示通用失败和重试，不暴露堆栈 |

业务失败时不得把模糊卡片本地直接改为清晰，也不得乐观扣减余额。只有 confirm 成功响应可以更新解锁和余额状态。

## 11. 幂等与竞态场景

| 场景 | 服务端保证 | 前端要求 |
|------|------------|----------|
| 喜欢按钮连点 | requestId 唯一，同一用户对最多一条 active | 点击后禁用；重试复用 requestId |
| 访问上报重试 | eventNo 唯一，不重复加 PV | 同次进入复用 eventNo |
| 双方同时互送爱心 | 无序用户对唯一 active 匹配 | 接受 matched 结果，不自行创建 matchNo |
| 多来源同时触发 | source event 幂等，追加到同一 active match | 用服务端 activeSources 刷新状态 |
| 弹窗 read 重试 | matchNo+userId 幂等 | 重试使用原 action；重复成功视为完成 |
| 解锁确认连点 | requestId+具体记录幂等，余额原子扣减 | 确认中禁用按钮；超时查询/重试原 requestId |
| quote 后对象失效 | confirm 前复验，拒绝且不扣币 | 移除对象，关闭确认弹窗 |
| 会员刚到期 | 服务端按当前权益和单条解锁计算 displayStatus | 完全信任返回，不缓存永久 VIP 清晰态 |

## 12. 跨模块责任

| 能力 | 责任模块 | PRD-02 使用方式 |
|------|----------|-----------------|
| 核心准入 | PRD-01 | 双方关系生成和查询前校验 |
| 婚恋用户主页 | PRD-05 | 主页成功展示后上报 visit；主页动作调用 like/cancel |
| 会话入口 | PRD-02 | 返回 `canEnterConversation` |
| 女性保护、可发送状态 | PRD-03 | 会话内返回 `canSend/protectStatus`，PRD-02 不复制 |
| 悄悄话回复 | PRD-03 | 回复成功发内部事件，PRD-02 追加 `whisper_reply` 来源 |
| 单条解锁、会员、扣币、流水、退款 | PRD-04 | PRD-02 第一弹窗引导到 quote/confirm |
| 拉黑/注销 | PRD-06/安全模块 | 触发关系失效；解除后不恢复旧生命周期 |

## 13. 后续实现与验收门禁

启动移动端实施前必须全部满足：

- [ ] 用户确认 `2026-07-16-关系反馈与互动链路-tcdesign.md`。
- [ ] 用户明确取消 `C02-12` 的延期边界并指定实施范围。
- [ ] 基于技术方案生成并确认移动端测试用例。
- [ ] 匹配成功弹窗、列表空态和异常态 UI 资产补齐或形成明确验收基线。
- [ ] PRD-04 两步解锁 quote/confirm 与 PRD-02 同批实施。
- [ ] 后端关系表和状态机已就绪，测试数据不使用生产假数据兜底。
- [ ] 正常、异常、权限、幂等、竞态和跨模块闭环均有 L1/L2/L3 证据。
- [ ] 移动端接口完整度按正式清单达到 95% 以上，才可声明交付完成。

在上述门禁满足前，本文持续保持 `DRAFT-DEFERRED`。
