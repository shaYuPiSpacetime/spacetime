# PRD-08 推荐与理想型条件筛选蓝湖还原技术方案

| 项 | 内容 |
|---|---|
| 日期 | 2026-08-05 |
| 状态 | 已确认并开始实施 |
| 复杂度 | L4：跨数据库、后端、小程序、管理后台、支付资产与隐私 |
| 视觉基线 | 蓝湖推荐分组 23 张正式页面/状态稿 |
| 需求事实源 | PRD-08 正式版、2026-08-05 用户补充确认 |

## 1. 背景与目标

当前“荐”入口仍渲染社区聚合页，PRD-08 九个业务路由只有主入口注册，推荐偏好、理想型快照、浏览回看和批量折扣缺少完整后端。现有资产服务虽然识别理想型消费场景，但直接接收用户 ID、写死最多 5 人并按单价简单相乘，无法满足快照归属、动态折扣、报价确认和隐私要求。

本方案目标：

1. 将 23 个蓝湖画板按一页一闭环方式还原为真实 Taro 组件。
2. 建立固定条件推荐、理想型快照、三天回看、单个/全部解锁和历史记录全链路。
3. 复用 PRD-01 公开资料、PRD-02 关系、PRD-04 商业化和现有资产流水，不建设算法平台。
4. 用户主页与主页预览共用展示组件；未解锁为悄悄话，解锁有效后为私信。
5. 管理后台新增理想型批量解锁优惠比例，并让价格、折扣、上限、保留期和帮助文案动态化。

## 2. 现状与约束

### 2.1 已有可复用能力

| 能力 | 现有落点 | 复用方式 |
|---|---|---|
| 用户资料与准入 | `AppUser`、`RelationAccessProjectionService`、`AppUserAuditContentService` | 候选池和共享主页读取 |
| 喜欢、匹配、拉黑 | `AppRelationLikeDao`、`AppRelationMatchDao`、`AppUserRelationBlockDao` | 候选过滤与互动状态 |
| 千寻币与解锁记录 | `AssetServiceImpl`、`UserAssetDao`、`UserUnlockRecordDao`、`UserCoinLogDao` | 抽取报价确认公共能力 |
| 消费场景配置 | `CoinSceneConfigDao`、`ideal_user_unlock`、`ideal_batch_unlock` | 单价和保留期 |
| 商业化聚合配置 | `CommercialAdminServiceImpl`、`AppConfigDao` | 新增批量优惠比例 |
| 配置变更日志 | `CommercialConfigLog` 及六层 DAO/Mapper | 保存前后快照与变更原因 |
| 主页预览 | `ProfilePreviewPage.tsx`、`profilePreviewVisibility.ts` | 抽取共享资料组件 |
| 公开主页 | `MiniappPublicProfileServiceImpl`、`pages/heart/user.tsx` | 补统一模型和通信枚举 |

### 2.2 缺失能力

- 无 `ct_recommend_preference`、`ct_ideal_filter_snapshot`、`ct_ideal_snapshot_candidate`、`ct_recommend_view_log`。
- 无 PRD-08 Controller、Service、DAO、Mapper 与 DTO/VO。
- 无 8 个子路由和理想型筛选独立路由。
- `AssetServiceImpl` 直接扣币，没有理想型报价令牌和快照候选校验。
- `PublicProfileVO` 只有 `canEnterConversation`，当前仅匹配关系为 true。
- `miniapp/src/services/message.ts` 的真实 provider 仍未实现，仓库内也没有私信/悄悄话 Controller；通信模式切换和消息收发必须分开验收。
- 设计中的 100/200 币、9 折、人数和 90 天均为样例，不能写死。

### 2.3 架构约束

- 后端保持 Java 21、Spring Boot 3.4、MyBatis-Plus、MySQL、Redis。
- 严格使用 `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper`。
- `admin` 与 `miniapp` 不互相导入；共享实体、DAO、枚举、定价和资料投影放 `common`。
- Controller 返回精确 `R<T>`；管理接口沿用 `@RequirePermission`。
- 新实体继承 `BaseEntity`，包含审计字段和逻辑删除。
- 生产构建禁止 mock 候选、固定用户编号、固定价格或绕过核心准入。

## 3. 方案比较与结论

| 方案 | 描述 | 结论 |
|---|---|---|
| 最小复用 | 客户端提交用户 ID，继续调用通用 `/asset/unlock` | 拒绝：无法证明对象属于快照，客户端可篡改集合，折扣和幂等不完整 |
| 平衡闭环 | 四张业务表 + 专用推荐/理想型接口 + 服务端报价确认 + 复用资产账本 | 采用：满足业务、隐私和审计，新增边界清晰 |
| 算法平台 | 召回、评分、模型、运营后台、异步任务 | 本期不做：与固定条件筛选确认口径冲突 |

## 4. 总体架构

```text
Taro 推荐/理想型页面
        |
        v
RecommendController / IdealController / MiniappProfileController
        |
        v
RecommendService / IdealService / MiniappPublicProfileService
        |
        +---- CandidateEligibilityService（准入、异性、阻断、曝光）
        +---- IdealPricingService（报价、折扣、确认、分摊）
        +---- ProfileDisplayProjectionService（统一公开资料与通信模式）
        +---- CommercialSettingService（只读动态配置）
        |
        v
DAO -> DAOImpl -> Mapper -> MySQL
        |
        +---- 复用 UserAsset / UserCoinLog / UserUnlockRecord

管理后台 CommercialManagement
        -> CommercialConfigController
        -> CommercialAdminServiceImpl
        -> AppConfig + CommercialConfigLog
```

## 5. 数据库设计

迁移文件：`deploy/sql/prod/065_prd08_recommend_ideal_closure.sql`。

### 5.1 `ct_recommend_preference`

| 字段 | 类型 | 约束/说明 |
|---|---|---|
| `user_id` | BIGINT | 当前用户，唯一 |
| `target_city_codes` | JSON | 1–3 个稳定城市 code |
| `allow_neighbor_city` | TINYINT | 仅推荐生效 |
| `min_age/max_age` | INT | 闭区间 |
| `min_height/max_height` | INT NULL | VIP 高级条件 |
| `min_weight/max_weight` | INT NULL | VIP 高级条件 |
| `education_codes` | JSON | 同字段 OR |
| `hometowns` | JSON | 省/市稳定 code |
| `school_codes` | JSON | 最多 10 个 |
| `major_names` | JSON | 标准化全称，最多 10 个 |
| `version` | INT | 乐观锁，从 1 开始 |

索引：`uk_user_id(user_id, deleted)`；保存时 `WHERE user_id=? AND version=? AND deleted=0` 原子更新。

### 5.2 `ct_ideal_filter_snapshot`

| 字段 | 类型 | 约束/说明 |
|---|---|---|
| `snapshot_no` | VARCHAR(40) | `IDS-` 前缀，全局唯一 |
| `user_id` | BIGINT | 快照所有者 |
| `request_id` | VARCHAR(64) | 客户端幂等键 |
| `condition_digest` | CHAR(64) | 规范化条件 SHA-256 |
| `preference_version` | INT | 发起时偏好版本 |
| `target_city_codes` | JSON | 不可变快照 |
| `min_age/max_age` | INT | 不可变快照 |
| `condition_codes` | JSON | 固定 17 条的子集 |
| `condition_payload` | JSON | 创建时中文与依赖摘要，不含候选敏感原值 |
| `result_count` | INT | 创建时命中数 |
| `status` | VARCHAR(20) | `active/expired` |
| `expires_at` | DATETIME | 默认创建后 90 天 |

索引：`uk_snapshot_no`、`uk_user_request(user_id, request_id, deleted)`、`idx_user_created(user_id, create_time)`、`idx_expire(status, expires_at)`。

### 5.3 `ct_ideal_snapshot_candidate`

| 字段 | 类型 | 约束/说明 |
|---|---|---|
| `snapshot_id` | BIGINT | 快照主键 |
| `item_no` | VARCHAR(40) | 客户端结果项编号，唯一 |
| `candidate_user_id` | BIGINT | 仅服务端使用 |
| `sort_time` | DATETIME | 候选最近活跃时间 |
| `sort_tie_breaker` | VARCHAR(40) | 稳定分页辅助 |
| `matched_condition_codes` | JSON | 只保存命中 code |

索引：`uk_snapshot_candidate(snapshot_id, candidate_user_id, deleted)`、`uk_item_no(item_no)`、`idx_snapshot_cursor(snapshot_id, sort_time, sort_tie_breaker)`。

### 5.4 `ct_recommend_view_log`

| 字段 | 类型 | 约束/说明 |
|---|---|---|
| `event_no` | VARCHAR(40) | `RVL-` 前缀 |
| `request_id` | VARCHAR(64) | 客户端动作幂等键 |
| `user_id/candidate_user_id` | BIGINT | 浏览双方 |
| `scene` | VARCHAR(20) | `recommend/replay/ideal` |
| `filter_version` | INT NULL | 推荐来源版本 |
| `snapshot_no` | VARCHAR(40) NULL | 理想型来源 |
| `action` | VARCHAR(20) | `view/detail/skip/like/never` |
| `position` | INT NULL | 曝光位置 |
| `viewed_at` | DATETIME | 服务端时间 |

索引：`uk_user_request_action(user_id, request_id, action, deleted)`、`idx_replay(user_id, viewed_at, candidate_user_id)`。

### 5.5 既有表变更

- `app_user_unlock_record` 增加 `snapshot_no VARCHAR(40) NULL`、`snapshot_item_no VARCHAR(40) NULL`，用于理想型来源追溯。
- `app_config` 插入 `commercial.ideal.batch.discount.percent=10`。
- 不在 PRD-08 新建价格表；单价和保留期继续取 `app_coin_scene_config`。
- 065 迁移修正既有消费场景中文错位：`viewers_unlock_one=解锁访客`、`ideal_user_unlock=解锁理想型`、`ideal_batch_unlock=批量解锁理想型`。

## 6. 后端分层与代码落点

### 6.1 `common`

新增实体：

- `RecommendPreference`
- `IdealFilterSnapshot`
- `IdealSnapshotCandidate`
- `RecommendViewLog`

每个实体配套：

- `common/dao/*Dao.java`
- `common/dao/impl/*DaoImpl.java`
- `common/mapper/*Mapper.java`

新增共享服务：

- `CandidateEligibilityService`：核心准入、异性、黑名单、场景屏蔽和候选有效性。
- `CommercialSettingService`：读取批量上限、折扣、保留期和浏览额度，提供类型化默认值。
- `ProfileDisplayProjectionService`：构建公开主页模型和 `communicationMode`。
- `IdealUnlockPricingService`：报价、令牌签发、确认时重算和成本分摊。

### 6.2 `miniapp`

新增：

- `RecommendController -> RecommendService -> RecommendServiceImpl`
- `IdealController -> IdealService -> IdealServiceImpl`
- 对应 request/response DTO 与 VO。

接口以 [接口字段与页面绑定](../设计描述/08-推荐与理想型条件筛选/04-接口字段与页面绑定.md) 为唯一前端契约。

### 6.3 `admin`

复用 `CommercialConfigController` 与 `CommercialAdminServiceImpl`：

- `CommercialSettingsReq/VO` 增加 `idealBatchDiscountPercent`。
- `COMMERCIAL_SETTING_KEYS` 增加配置键，校验 0–100。
- 保存时写中文 remark“理想型批量解锁优惠比例”。
- 配置日志继续写完整 before/after JSON；前端解析新字段中文名。

## 7. 推荐查询设计

### 7.1 候选池顺序

1. 校验当前用户核心准入为 OPEN。
2. 排除本人、非异性、冻结/注销、未核心准入、未允许曝光。
3. 排除双向黑名单、不再推荐和场景屏蔽。
4. 应用目标城市、年龄。
5. 权益有效时应用身高、体重、学历、家乡、学校、专业。
6. 精确城市少于 20 且开关开启时，再使用城市邻接表补足。
7. 按最近活跃时间倒序、用户 ID 升序生成不透明游标。

候选池查询在 Mapper 中只做数据库可表达的结构化条件；关系和审核批量加载后在服务层二次校验。首版最多过取 3 页以补足 20 条，避免无界扫描。

### 7.2 曝光与额度

- 查询候选不扣额度；卡片进入可见区后调用 `/view` 扣一次。
- `requestId` 和唯一索引保证重复曝光不重复扣。
- 权益服务失败不当成 0；返回错误态。
- 回看只读 `ct_recommend_view_log` 最近三个北京时间自然日，不扣额度。

## 8. 理想型筛选设计

### 8.1 条件执行

- 位置、年龄和每个理想型条件按 AND。
- 同一字段多值按 OR；缺失字段不命中。
- 校友、兴趣相似、感情观相合先校验本人依赖资料。
- `985/211` 只读学校稳定元数据；没有元数据不猜测。
- 住房/购车优先结构化字段；当前代码尚未形成结构化投影时仅允许稳定标签 `home_owner/car_owner` 兜底，不能解析自由文本问答。

### 8.2 快照事务

一个事务内：

1. 规范化并校验请求，计算 `conditionDigest`。
2. 通过 `userId + requestId` 查询幂等快照。
3. 查询并稳定排序候选。
4. 插入快照和全部候选项。
5. 更新快照 `resultCount`。

任何步骤失败回滚，不保留半快照。

### 8.3 隐私

- 未解锁响应只返回 `itemNo/blurAvatarUrl/ageBand/city/matchedConditionNames`。
- 模糊图由后端产生独立对象或固定脱敏占位，不能返回原图加 CDN 模糊参数。
- 候选 ID、昵称、精确年龄、生日、学校和联系方式不得进入响应或埋点。

## 9. 解锁报价与确认

### 9.1 报价

单个报价接收 `snapshotNo + itemNos`；解锁全部只接收 `snapshotNo`。服务端实时：

1. 校验快照归属和有效期。
2. 获取仍有效、未解锁、未阻断候选。
3. 校验人数不超过 `idealBatchMax`。
4. 始终读取 `ideal_user_unlock` 当前单价和保留期；`ideal_batch_unlock` 仅作为批量流水场景，再读取折扣。
5. 计算 `originalCost` 和向上取整后的 `payableCost`。
6. 生成 5 分钟报价令牌，令牌绑定用户、快照、item 集合、配置值和应付金额。

报价数据建议存 Redis；同时令牌内容使用服务端 HMAC，Redis 不可用时禁止确认，不降级为客户端价格。

### 9.2 确认事务

1. 使用 `requestId` 查既有确认结果。
2. 校验并消费 `quoteToken`，重新核对候选与配置。
3. 锁定用户资产并原子扣减应付金额。
4. 按 `floor(payable/count)` 分摊，余数从第一条开始每条 +1，保证合计相等。
5. 为每个对象写 `app_user_unlock_record` 和 `app_user_coin_log`，带 `snapshotNo/itemNo/requestId`；流水必须写稳定 `bizIdempotencyKey=ideal:{requestId}:{itemNo}`。
6. 返回原确认结果用于幂等重试，不使用“重复请求 coinCost=0”的模糊语义。

事务失败全部回滚；候选变化导致报价失效时不扣币，客户端刷新报价。

## 10. 统一主页与通信模式

### 10.1 前端组件

将 `ProfilePreviewPage.tsx` 的资料主体抽为：

- `features/profile-display/ProfileDisplay.tsx`
- `features/profile-display/profileDisplayVisibility.ts`
- `features/profile-display/types.ts`

本人预览、`pages/heart/user.tsx`、推荐详情和理想型已解锁详情共享；页面壳注入 `mode=preview|public`、导航和动作区。

### 10.2 服务端判定

`communicationMode` 判定优先级：

1. 双向阻断或目标失效：接口拒绝。
2. 当前有效匹配：`PRIVATE_MESSAGE`。
3. 当前有效理想型解锁：`PRIVATE_MESSAGE`。
4. 其他：`WHISPER`。

兼容期 `canEnterConversation = communicationMode == PRIVATE_MESSAGE`，小程序迁移完成后只依赖枚举。

### 10.3 消息收发边界

- 本轮先以 `communicationMode` 驱动“悄悄话/私信”真实按钮和路由，不允许已解锁仍显示悄悄话。
- 真实消息服务不能继续使用 Zustand Mock；需要后续以独立 TDD 子任务补 Controller、Service、DAO 和消息供应商适配。
- 在真实发送、接收、失败恢复和举报上下文验证前，验收报告只能标“入口闭环”，不能标“消息收发闭环”。

## 11. 小程序 UI 实施

### 11.1 基座

- 注册推荐筛选、偏好、详情、等待、回看、理想型筛选、结果、记录、解锁、帮助路由。
- 新建 `services/recommend.ts`、`services/ideal.ts`，不在组件中拼 URL。
- 建立 `features/recommend`、`features/ideal`、`features/profile-display` 公共组件。
- 状态栏和微信胶囊使用真实运行环境测量；底部 Tab 使用现有包内图标。
- 非 Tab 图标按项目规则无损上传 OSS 后由 `ossIcons.ts` 引用。

### 11.2 蓝湖批次

| 批次 | 画板 | 交付门禁 |
|---|---|---|
| A | 001–006 | 推荐主卡、共享主页、空态、IP 弹窗、认证抽屉 |
| B | 007–008 | 推荐上限、会员承接 |
| C | 009–010 | 三天回看非会员/会员 |
| D | 011–012 | 偏好设置普通/会员 |
| E | 013–017 | 理想型入口、筛选、地址和年龄弹层 |
| F | 018–023 | 结果、充值、历史解锁、空态、帮助 |

每页流程：设计基线 -> Token/组件 -> TDD -> 运行截图 -> 差异清单 -> 修复 -> 评分。关键首屏目标 >=97%，全模块 >=95%。

## 12. 管理后台前端

- `frontend/src/api/commercial.ts` 增加折扣字段。
- `CommercialManagement.tsx` 在理想型批量上限旁增加 0–100 数字输入和“优惠 N%/N 折”辅助文案。
- 保存前必须填写变更原因；日志抽屉展示中文配置项、前后值和变更原因。
- 当前上述文件已有其他未提交修改，实施时只做最小增量补丁，不覆盖用户改动。

## 13. 安全、权限与审计

- 推荐/理想型接口只允许访问本人偏好、快照、报价和历史。
- 未解锁项不返回内部用户 ID 或清晰资料。
- 日志只记条件 code、数量、快照号、业务编号，不记生日、体重、住房、购车、家乡或完整标签原值。
- 管理后台配置继续使用 `commercial:config:view/edit`。
- 报价确认、扣币、退款和失效都可由解锁记录及千寻币流水追溯。
- OSS 地址只保存公网对象 URL，不写 AccessKey、Secret、Token 或签名参数。

## 14. 性能与降级

| 项 | 目标/策略 |
|---|---|
| 推荐首屏 | P95 < 800ms；20 条；候选准入批量查询 |
| 理想型搜索 | P95 < 1500ms；单事务快照；超时不落半数据 |
| 公开资料 | 批量投影，禁止列表 N+1 查询 |
| 字典 | 版本化缓存；失败时已保存值只读，禁止提交未知 code |
| 候选有效性 | 缓存最长 60 秒，详情/解锁前实时校验 |
| 商业化 | 配置读取短缓存；保存后主动失效 |
| 报价 | Redis 5 分钟；不可用时禁止确认，不信任客户端价格 |

## 15. PRD-07 推广裂变联动影响

依据 `2026-07-27-PRD-07推广裂变与邀请奖励重构-tcdesign.md` 第 10 节：

- 推荐只读取认证结果，不触发 `profile:{userId}` 或 `verify:{userId}`。
- 理想型筛选和扣币消费不触发充值奖励。
- 余额不足后真正完成首次充值，仍由 `PaymentServiceImpl` 成功订单触发 `first-coin:{orderNo}`。
- 会员引导真正完成首次支付，仍由 `PaymentServiceImpl` 触发 `first-vip:{orderNo}`。
- PRD-08 不新增推广入箱事件；事件键、奖励幂等键和唯一键保持原实现。

## 16. 测试策略

遵循 TDD 红 -> 绿 -> 重构，并按项目 `code-test` 另行输出 testcase/testreport。

### 16.1 后端

- 偏好默认、保存、版本冲突、VIP 到期保留不生效。
- 候选异性/认证/阻断/条件 AND、同字段 OR、缺失不匹配。
- 曝光幂等、额度 0 与服务失败区分、三天回看去重。
- 理想型 17 条、依赖资料、快照幂等、过期和稳定分页。
- 未解锁响应隐私契约。
- 单个/全部报价、0/10/100 折扣、向上取整、超过上限、报价过期、余额不足、并发确认和分摊合计。
- 配置保存、0–100 校验、中文日志、前后快照和变更原因。
- 解锁前 `WHISPER`、解锁后 `PRIVATE_MESSAGE`、过期后回退。

### 16.2 小程序与管理后台

- TypeScript 类型、领域函数、空模块显隐、路由契约。
- Taro 构建和 H5/微信端页面静态门禁。
- 管理后台构建、配置保存和日志抽屉。
- Playwright/真机按 A-F 批次走完整流程并截图比对。

### 16.3 推荐命令

```bash
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn test
cd frontend && npm run build
cd miniapp && npm test -- --runInBand
cd miniapp && npm run build:weapp
```

实际命令以各模块 `package.json` 和测试脚本为准；缺少真实账号、支付或字典数据的 L1/L4 项标记跳过，不伪造通过。

## 17. 迁移、发布与回滚

1. 先执行 065 迁移并校验表、索引和配置默认值。
2. 发布后端读写与兼容字段，保持旧推荐入口可回滚。
3. 发布管理后台折扣配置并验证变更日志。
4. 上传 OSS 图标并验证公网 200。
5. 按 A-F 批次发布小程序体验版，完成截图和业务验收后提交审核。

回滚：

- 回滚小程序入口和新接口路由，不删除偏好、快照、浏览或解锁记录。
- 关闭新接口不反向扣币；已完成解锁继续按记录有效期生效。
- 折扣配置保留，旧代码忽略新键。
- 数据表只在确认无历史业务后另行离线清理，发布回滚不执行 DROP。

## 18. 预计文件清单

### 后端

- `deploy/sql/prod/065_prd08_recommend_ideal_closure.sql`
- `backend/src/main/java/com/spacetime/common/entity|dao|dao/impl|mapper/` 下四套业务对象
- `backend/src/main/java/com/spacetime/common/service/` 下资格、配置、定价、主页投影服务
- `backend/src/main/java/com/spacetime/miniapp/controller|service|service/impl|dto/` 下推荐与理想型接口
- `CommercialSettingsReq/VO`、`CommercialAdminServiceImpl`
- `PublicProfileVO`、`MiniappPublicProfileServiceImpl`
- 对应 `backend/src/test/java/` 单元与契约测试

### 小程序

- `miniapp/src/services/recommend.ts`、`ideal.ts`、`profile.ts`
- `miniapp/src/features/recommend/`、`ideal/`、`profile-display/`
- `miniapp/src/pages/recommend/`、`miniapp/src/pages/ideal/`
- `miniapp/src/app.config.ts`、`miniapp/src/constants/ossIcons.ts`
- 相关领域测试、样式和验收脚本

### 管理后台与文档

- `frontend/src/api/commercial.ts`
- `frontend/src/pages/commercial/CommercialManagement.tsx`
- `frontend/src/pages/commercial/commercialConfigLog.ts`
- `docs/测试文档/PRD08推荐理想型-testcase.md`
- `docs/测试文档/PRD08推荐理想型-testreport.md`
- `docs/验收报告/2026-08-05-PRD08推荐理想型-蓝湖还原验收报告.md`

## 19. 实施门禁

- [x] 23 稿设计基线、Token、状态、素材、冲突和缺口已落盘。
- [x] 最新业务决策已回写用户确认口径。
- [x] 技术方案、接口字段与页面绑定已生成。
- [ ] 数据库与后端必须先写失败测试。
- [ ] 每个 UI 批次必须有运行截图、差异清单和评分。
- [ ] 只有全部构建、接口、流程与隐私门禁通过后，才能提交、推送和发布小程序。
