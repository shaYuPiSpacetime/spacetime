# 千寻成家真实数据接口 mobile-api-handoff

> 日期：2026-07-15  
> 前端范围：千寻成家顶部导航、关注、同城、热门、动态卡、热门话题、关注/点赞/举报/隐藏/悄悄话  
> 蓝湖基线：项目 `d9c9e50f-fee5-47ca-bd6b-ae05c0d5332b`，任务 `428e8368-c279-4369-947b-a5828487924d`

## 1. 结论

当前接口只够支撑“基础帖子列表、关注数、点赞、关注、举报”。它无法支撑蓝湖中的完整同城卡、热门话题、热门排名、关注双空态、城市切换、服务端隐藏和悄悄话资格。

前端本轮已做以下收敛：

- 生产千寻页不再接受 `variant` 查询参数强制制造热门、空态或弹窗。
- 页头头像统一读取 `/miniapp/profile/home-detail.profile.avatar`，与“我的”保持同源。
- 同城、热门、关注按场景独立缓存，并阻止过期请求覆盖当前 Tab。
- 当前后端没有丰富话题数据时，不再用“我们官宣啦、2.2 亿浏览”等设计演示数据冒充真实数据。
- 蓝湖演示数据只允许出现在独立测试 Fixture，禁止进入生产路由。

后端按本文补齐接口后，前端切换到聚合接口，才能完成真实数据闭环。

## 2. 当前接口盘点

| 接口 | 当前能力 | 是否可直接保留 |
|---|---|---|
| `GET /miniapp/community/posts` | 按 `scene/postType/topicId/page/size` 返回基础帖子 | 迁移期保留，目标由 `/feed` 替代 |
| `GET /miniapp/community/config` | 发布限制、入口 Tab、简单话题字典、举报原因 | 保留配置职责，不承载热门内容 |
| `GET /miniapp/community/following/count` | 返回有效关注人数 | 可保留；目标聚合进 Feed |
| `POST /miniapp/community/follows/{userId}` | 关注/取消关注 | 保留 |
| `POST /miniapp/community/posts/{id}/like` | 点赞/取消点赞 | 保留 |
| `POST /miniapp/community/reports` | 举报 | 保留 |
| `POST /miniapp/community/posts` | 发布动态 | 保留，但需统一内容类型 code |
| `GET /miniapp/profile/home-detail` | 当前用户资料和真实头像 | 短期继续复用 |
| 热门话题接口 | 不存在 | 必须新增 |
| 服务端隐藏动态接口 | 不存在 | 必须新增 |

当前问题：

- `HOT` 仅按点赞、评论、发布时间排序，没有热门窗口、热度分、排名和计算时间。
- `CITY` 固定使用本人资料城市，没有 `cityCode` 入参和所选城市回传。
- 帖子没有显式同时约束 `status=PUBLISHED` 与 `auditStatus=APPROVED`。
- 图片只有 URL，没有宽、高、缩略图和排序，首屏容易重排闪烁。
- 作者缺出生年份、职业、活跃文案、可联系动作和操作权限。
- 简单话题字典只有 `code/label/sort`，无法生成热门话题卡。
- “不看该动态”仅保存在本机 Storage，换设备后失效。
- Java `Long` 作为 TypeScript `number` 存在超过 JS 安全整数后的精度风险。

## 3. 公共约定

### 3.1 ID 与时间

- 所有业务 ID 在 JSON 中序列化为字符串。
- 时间统一为带时区的 ISO-8601，例如 `2026-07-15T22:00:00+08:00`。
- 数量返回整数，前端统一格式化为“万、亿”，接口不得返回 `2.2亿浏览` 这类展示文案。

### 3.2 分页

```ts
interface PageMeta {
  current: number
  size: number
  total: number
  pages: number
  hasMore: boolean
  snapshotAt: string
}
```

- `page` 默认 1。
- `size` 默认 20，最大 50。
- 热门列表首屏返回 `snapshotAt`，后续翻页原样携带，避免排名漂移。

### 3.3 可见性

信息流只返回同时满足以下条件的数据：

- 动态 `status=PUBLISHED`。
- 审核 `auditStatus=APPROVED`。
- 动态未逻辑删除，作者未删除该动态。
- 作者账号状态正常。
- 不在双方拉黑关系中。
- 当前用户未隐藏该动态。
- 作者头像使用审核通过的公开头像 `publicAvatar`。

## 4. 页面上下文接口

### 4.1 请求

```http
GET /miniapp/community/home-context
Authorization: Bearer <token>
```

### 4.2 响应

```ts
interface CommunityHomeContextVO {
  viewer: {
    userId: string
    nickname: string
    avatarUrl: string
  }
  primaryTabs: EntryVO[]
  sceneTabs: EntryVO[]
  defaultScene: FeedScene
  currentCity?: {
    code: string
    name: string
  }
  interactionGateMode: 'LOGIN_ONLY' | 'FULL_CERT'
  reportEntryEnabled: boolean
  publishEnabled: boolean
}

interface EntryVO {
  code: string
  label: string
  sort: number
  enabled: boolean
}

type FeedScene = 'FOLLOWING' | 'CITY' | 'HOT'
```

口径：

- 页头本人头像与“我的”页使用同一个 `ownerAvatar` 数据源。
- 接口为空或加载失败时才使用统一默认头像，禁止使用蓝湖人物素材兜底。
- 一级、二级 Tab 的文案、排序、开关由配置返回；样式仍严格按蓝湖组件实现。

短期未实现本接口前，前端继续复用：

- `/miniapp/profile/home-detail` 获取本人头像。
- `/miniapp/community/config` 获取二级 Tab 和举报配置。

## 5. 关注、同城、热门 Feed

### 5.1 请求

```http
GET /miniapp/community/feed
  ?scene=FOLLOWING|CITY|HOT
  &cityCode=330100
  &topicId=201
  &contentType=community_post|sincere_post
  &sort=LATEST|HOT_SCORE
  &page=1
  &size=20
  &snapshotAt=2026-07-15T22:00:00+08:00
```

### 5.2 响应

```ts
interface CommunityFeedVO {
  scene: FeedScene
  selectedCity?: {
    code: string
    name: string
  }
  followingUserCount: number
  emptyReason?: FeedEmptyReason
  hotMeta?: {
    windowHours: number
    calculatedAt: string
  }
  topicSection?: CommunityTopicCardVO[]
  records: CommunityPostCardVO[]
  page: PageMeta
}

type FeedEmptyReason =
  | 'NO_FOLLOWING_USERS'
  | 'FOLLOWING_NO_POSTS'
  | 'CITY_NO_POSTS'
  | 'HOT_NO_POSTS'
```

空态映射：

| emptyReason | 前端状态 |
|---|---|
| `NO_FOLLOWING_USERS` | 暂无关注的人，展示“去千寻同城看看” |
| `FOLLOWING_NO_POSTS` | 已关注用户，但暂时没有发布 |
| `CITY_NO_POSTS` | 所选城市无动态 |
| `HOT_NO_POSTS` | 热门窗口内无动态 |

前端不得再额外请求 count 后自行猜测空态。

## 6. 完整动态卡

```ts
interface CommunityPostCardVO {
  id: string
  rank?: number
  contentType: 'community_post' | 'sincere_post'
  sourceScene: 'qianxun_chengjia' | 'qianxun_zhiyin_sincere'

  author: {
    userId: string
    nickname: string
    avatarUrl: string
    genderCode?: 'MALE' | 'FEMALE'
    age?: number
    birthYear?: number
    cityCode?: string
    cityName?: string
    zodiac?: string
    profession?: string
    annualIncomeCode?: string
    annualIncomeLabel?: string
    certificationBadges: string[]
  }

  title?: string
  content: string
  canExpand: boolean
  activityText?: string

  media: Array<{
    mediaId?: string
    mediaType: 'IMAGE'
    url: string
    thumbnailUrl?: string
    width: number
    height: number
    sort: number
  }>

  topic?: {
    id: string
    code: string
    name: string
  }

  metrics: {
    likeCount: number
    commentCount: number
    viewCount: number
    hotScore?: number
  }

  viewerState: {
    liked: boolean
    followingAuthor: boolean
    ownPost: boolean
    hidden: boolean
  }

  actions: {
    contactAction?: 'WHISPER' | 'PRIVATE_MESSAGE'
    canFollow: boolean
    canLike: boolean
    canComment: boolean
    canWhisper: boolean
    canReport: boolean
    disabledReasonCode?: ActionDisabledReason
  }

  publishedAt: string
}

type ActionDisabledReason =
  | 'CORE_ACCESS_REQUIRED'
  | 'SELF_TARGET'
  | 'ACCOUNT_BLOCKED'
  | 'POST_UNAVAILABLE'
  | 'NOT_MATCHED'
  | 'WHISPER_LIMIT'
```

字段要求：

- `genderCode` 允许为空；为空时前端不显示性别图标，禁止默认男性。
- `cityName`、`annualIncomeLabel` 由服务端或统一字典聚合返回，卡片不展示原始 code。
- `birthYear` 用于蓝湖中的“93年”；不得用不精确的年龄反推出生年份。
- `profession` 用于“93年·杭州·产品经理”。
- `activityText` 是业务口径，例如“2小时前活跃”，不能直接用动态发布时间冒充在线活跃时间。
- `contactAction` 决定卡片左下显示“悄悄话”还是“私信”。
- 图片宽高用于稳定选择 1、2、3、4～9 图布局并避免 CLS。
- 本人动态可以展示，但 `canFollow=false` 且 `disabledReasonCode=SELF_TARGET`。

## 7. 热门话题

简单字典不能承载热门话题，建议新增 `community_topic` 表；字典只保留稳定枚举。

### 7.1 话题列表

```http
GET /miniapp/community/topics?recommended=true&page=1&size=20
```

```ts
interface CommunityTopicCardVO {
  id: string
  code: string
  name: string
  description?: string
  coverUrl: string
  participantAvatars: string[]
  contentCount: number
  viewCount: number
  hotScore: number
  recommended: boolean
  status: 'ENABLED' | 'DISABLED'
  sort: number
}
```

### 7.2 话题详情

```http
GET /miniapp/community/topics/{topicId}
```

详情返回话题头字段及：

```ts
{
  canPublish: boolean
  disabledReasonCode?: ActionDisabledReason
}
```

话题内容继续使用：

```http
GET /miniapp/community/feed?topicId={topicId}&sort=HOT_SCORE|LATEST
```

## 8. 同城规则

```http
GET /miniapp/community/feed?scene=CITY&cityCode=330100&page=1&size=20
```

- `cityCode` 不传时使用本人资料城市。
- 响应必须回传 `selectedCity.code/name`。
- 城市切换复用现有地区字典接口，不在前端维护热门城市假数组。
- “同城全”是蓝湖长画板名称，不表示全国数据。
- 排序固定为 `publishedAt DESC, id DESC`，保证稳定分页。

## 9. 热门排序

后台配置项：

- `community.hot.window_hours`
- `community.hot.like_weight`
- `community.hot.comment_weight`
- `community.hot.view_weight`
- `community.hot.freshness_weight`
- `community.hot.topic_limit`

热门接口返回 `rank/hotScore/windowHours/calculatedAt`，稳定排序：

```text
hotScore DESC, publishedAt DESC, id DESC
```

## 10. 动作接口

### 10.1 关注

沿用：

```http
POST /miniapp/community/follows/{userId}
```

响应：

```json
{ "following": true }
```

### 10.2 点赞

沿用：

```http
POST /miniapp/community/posts/{postId}/like
```

响应：

```json
{ "liked": true, "likeCount": 11 }
```

### 10.3 隐藏动态

新增：

```http
POST   /miniapp/community/posts/{postId}/hide
DELETE /miniapp/community/posts/{postId}/hide
```

响应：

```json
{ "hidden": true }
```

前端 Storage 只能用于乐观更新，服务端才是最终数据真相。

### 10.4 举报

沿用 `POST /miniapp/community/reports`，举报原因继续读取动态配置。

### 10.5 悄悄话/私信

动态卡必须通过 `actions.contactAction/canWhisper/disabledReasonCode` 返回资格。前端不得仅凭页面类型或性别自行判断。

## 11. 枚举收敛

```text
FeedScene: FOLLOWING / CITY / HOT
FeedSort: LATEST / HOT_SCORE
ContentType: community_post / sincere_post
ContentStatus:
  draft / pending_machine / pending_manual /
  published / rejected / deleted / blocked
TopicStatus: ENABLED / DISABLED
```

当前 `community`、`normal_post` 迁移至 `community_post`。迁移期后端可兼容旧值读取，但新接口、新提交和新数据只允许正式 code。

## 12. 性能与实现要求

- 作者、话题、点赞、关注、媒体、权限必须按一页 ID 批量查询，禁止逐条 N+1。
- Feed 首屏建议 Redis 缓存热门计算结果，缓存 key 包含场景、城市、窗口和快照时间。
- 关注、点赞、隐藏采用幂等语义。
- 图片返回缩略图和原图；列表优先缩略图，预览才加载原图。
- 切换 Tab 使用 stale-while-revalidate：先展示该场景缓存，再后台刷新，不清空整页。

## 13. 联调与验收场景

后端至少准备以下真实数据场景：

1. 未关注任何用户：`NO_FOLLOWING_USERS`。
2. 已关注 3 人但无人发布：`FOLLOWING_NO_POSTS`。
3. 同城分别返回 1、2、3、4、5、6、9 图动态。
4. 同城切换城市后返回正确 `selectedCity`。
5. 热门返回 featured 话题、4 个话题入口及真实浏览数。
6. 热门返回 `rank/hotScore/calculatedAt`，翻页排序稳定。
7. 作者性别为空时不显示性别图标。
8. 本人动态不能关注自己。
9. 未认证用户点击点赞、关注、评论、悄悄话时返回明确阻断原因。
10. 隐藏后刷新、换设备均不再出现该动态。
11. 页头头像与“我的”页头像 URL 完全一致。
12. 快速切换 CITY → HOT，CITY 的慢响应不得覆盖 HOT。

## 14. 迁移顺序

1. 统一本人头像来源。
2. 上线 `/home-context` 与 `/feed`，合并关注双空态。
3. 补 `cityCode/selectedCity`。
4. 补完整动态卡字段与图片元数据。
5. 上线热门算法和丰富话题。
6. 上线服务端隐藏和悄悄话资格。
7. 移除旧 `/posts` 适配和旧内容类型兼容。

## 15. 前端切换条件

以下条件全部满足后，前端从旧 `/posts` 切到 `/feed`：

- 文档字段已在 OpenAPI/接口平台发布。
- 四种空态有真实联调数据。
- 同城、热门至少各有一页完整数据。
- `Long` 已统一为字符串。
- 图片宽高、缩略图、排序可用。
- 热门话题不再从字典拼装。
- Feed 可见性和动作权限已通过后端测试。

