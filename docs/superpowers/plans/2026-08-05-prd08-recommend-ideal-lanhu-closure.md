# PRD-08 推荐与理想型蓝湖 23 稿闭环实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use test-driven-development to implement this plan task-by-task. UI tasks must also follow lanhu-mcp-ui-restore page by page, and completion claims must use verification-before-completion.

**Goal:** 先把蓝湖“推荐”分组 23 张设计稿生成可执行设计描述，再以设计描述为唯一视觉基线，实现推荐、理想型筛选、回看、解锁、主页与消息入口的 9 个运行页面，接通真实后端与数据库，并在现有商业化配置中增加“解锁全部优惠比例”，形成可验证的完整闭环。

**Architecture:** 小程序采用“页面壳 + PRD-08 展示领域层 + 真实 API service”结构；用户主页和本人主页预览共用同一套纯展示组件，仅通过 mode/action slot 区分操作区。后端保持 `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper`，在 `common` 中新增推荐偏好、理想型快照、候选和浏览记录实体，`miniapp` 提供推荐、理想型、解锁报价和沟通入口 API，`admin` 只复用现有商业化配置，不新增独立推荐后台。批量解锁价格只能由服务端根据有效快照和后台优惠比例计算。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、MySQL、Redis、Taro 4、React 18、TypeScript、Zustand、Vite、Tailwind、蓝湖 MCP、微信开发者工具、miniprogram-automator、Node.js 静态门禁。

---

## 全局约束与已确认口径

1. 23 张蓝湖稿是 23 个页面/状态画板，不等于 23 条运行路由；生产实现按 9 条正式路由和可复用状态组件落地。
2. 必须先完成设计描述文件并通过静态复核，编码阶段只读取设计描述文件、导出素材和尺寸证据，不凭记忆还原蓝湖。
3. 每个设计批次都执行“基线截图 -> Token/组件映射 -> RED 门禁 -> 实现 -> 微信截图 -> 差异修复 -> 单页验收”，上一批未闭环不得铺下一批。
4. 关键首屏还原度目标不低于 97%，全部页面/状态整体不低于 95%；验收视口至少覆盖 375×812 和 390×844。
5. 按钮、Tab、输入框、弹窗操作区、底部支付条必须由真实组件绘制并绑定事件；禁止整页截图、透明热区和字符近似图标。
6. 除底部 Tab 图标外，新增静态图标统一使用 OSS 公网 URL；先保存无损 2x PNG/WebP，再执行 `cd miniapp && npm run assets:upload-icons`，源码仅引用 `miniapp/src/constants/ossIcons.ts`。
7. 推荐、理想型候选、筛选项、价格、优惠、会员状态、余额、历史记录全部来自真实 API/数据库；设计假数据只允许存在于截图测试 fixture。
8. 用户主页与主页预览共用 `ProfileDisplayPage` 和资料模块组件；本人预览不展示访客操作区，公开主页通过 action slot 展示关注、喜欢和沟通操作。
9. 沟通入口由服务端返回 `communicationMode`：未解锁为 `WHISPER`，有效解锁后为 `PRIVATE`；小程序不能再仅凭“互相喜欢”决定是否进入私信。
10. “解锁全部”表示解锁当前有效理想型快照中尚未解锁的全部候选；服务端校验候选归属、状态和安全上限，客户端不得提交价格。
11. 商业化配置新增 `commercial.ideal.batch.discount.percent`，字段名 `idealBatchDiscountPercent`，取值 0–100，表示“优惠百分比”；设计稿文案按 `优惠X%` 展示。
12. 批量应付币数：`ceil(有效未解锁候选单价合计 × (100 - 优惠百分比) / 100)`；逐条账本分摊后总和必须与报价一致，禁止负价、重复扣费和客户端篡价。
13. 工作区已有大量用户改动；不得 reset、checkout 或整体暂存。修改 `CommercialAdminServiceImpl.java`、`CommercialManagement.tsx`、`commercial.ts`、`ProfilePreviewPage.tsx` 等脏文件前必须逐段合并并保留现有变更。

## 23 稿分组与运行路由映射

| 批次 | 蓝湖画板（共 23） | 生产路由/状态 |
|---|---|---|
| A 推荐主流程（6） | 推荐、推荐-首屏、推荐-信息完善、IP所属地说明、推荐-暂无数据、推荐-三重认证弹窗 | `/pages/recommend/index`、`/pages/recommend/detail/index`、`/pages/recommend/waiting/index` 的状态组件 |
| B 上限与会员（2） | 推荐-每天推荐人员达到上限、会员中心-会员未开通，支付按钮固定下方 | `/pages/recommend/waiting/index`、现有会员页复用状态 |
| C 三天回看（2） | 三天回看、三天回看-已开通会员 | `/pages/recommend/replay/index` |
| D 偏好设置（2） | 偏好设置、偏好设置-已开通会员 | `/pages/recommend/meeting-preference/index` |
| E 理想型筛选（5） | 推荐-理想型、推荐-理想型-筛选、推荐-理想型-筛选全、推荐-理想型-筛选（地址弹窗）、推荐-理想型-筛选（年龄弹窗） | `/pages/recommend/index` 理想型 Tab、`/pages/recommend/filter/index` |
| F 理想型结果（6） | 推荐-理想型（条件选择后）、推荐-理想型（条件选择后全）、千寻币-充值（理想型）、历史解锁、历史解锁-暂无数据、什么是理想型？ | `/pages/ideal/results/index`、`/pages/ideal/records/index`、`/pages/ideal/unlocks/index`、充值页复用状态 |

---

### Task 1: 固化蓝湖 23 稿设计基线并生成设计描述

**Files:**
- Create: `docs/设计描述/08-推荐与理想型条件筛选/00-蓝湖23画板清单.md`
- Create: `docs/设计描述/08-推荐与理想型条件筛选/01-视觉Token与组件映射.md`
- Create: `docs/设计描述/08-推荐与理想型条件筛选/02-页面状态与交互描述.md`
- Create: `docs/设计描述/08-推荐与理想型条件筛选/03-素材与缺口登记.md`
- Create: `docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/设计基线/manifest.json`
- Reference: `docs/流程规范/蓝湖MCP高还原闭环流程.md`
- Reference: `docs/需求文档/需求文档-正式版/08-推荐与理想型条件筛选/PRD-08_模块公共定义.md`
- Reference: `docs/需求文档/需求文档-正式版/08-推荐与理想型条件筛选/移动端/页面规格/`

- [ ] 使用蓝湖 MCP 逐张读取 23 个画板，记录画板 ID、名称、源尺寸、导出倍率、层级、文字、颜色、圆角、阴影、间距和交互状态，不用分组总览替代逐稿分析。
- [ ] 将每张设计基线图保存到 `设计基线/001.png` 至 `023.png`，在 `manifest.json` 中建立“文件名—蓝湖 ID—画板名—批次—路由—状态”唯一映射。
- [ ] 提取并登记头像、背景、空状态、认证、筛选、性别、定位、解锁、千寻币等素材；缺少原图、字体或标注时明确标红为阻塞项，不自行重绘后宣称 1:1。
- [ ] 生成颜色、字体、rpx 换算、间距、圆角、阴影、层级和安全区 Token；明确 375×812 为主基线，390×844 只做响应式适配。
- [ ] 把 23 稿归并成 9 路由、6 批次和可复用组件，写清正常、空态、未认证、会员、弹窗、已解锁、未解锁、余额不足等状态转换。
- [ ] 只读复核设计描述：23 个画板必须全部出现且不重复，交互控件必须标注“真实组件”，素材缺口必须可追踪。

### Task 2: 冻结业务契约与技术设计

**Files:**
- Create: `docs/技术方案/2026-08-05-PRD08推荐理想型-蓝湖还原-tcdesign.md`
- Create: `docs/设计描述/08-推荐与理想型条件筛选/04-接口字段与页面绑定.md`
- Create: `docs/设计描述/08-推荐与理想型条件筛选/05-业务决策记录.md`
- Modify: `docs/需求文档/需求文档-正式版/08-推荐与理想型条件筛选/PRD-08_用户确认口径.md`

- [ ] 以最新用户口径覆盖旧冲突：主页/预览共用、未解锁悄悄话、解锁后私信、解锁全部按优惠比例计价。
- [ ] 定义推荐候选门槛：三重认证通过、异性、账号开放、无双向拉黑；跨字段 AND，同字段多值 OR；排序使用最后活跃时间倒序 + 用户编号升序游标。
- [ ] 定义 17 个理想型条件的稳定 code、字典来源、普通/VIP 权限和前后端显示文案，不把中文标签作为数据库主键。
- [ ] 定义 9 条页面路由的请求、响应、空态、错误码、幂等键、分页/游标和页面字段映射。
- [ ] 定义解锁报价与确认的双阶段协议：报价返回 quoteNo、快照号、有效候选、原价、优惠比例、应付价、过期时间；确认只接受 quoteNo 和幂等键。
- [ ] 定义 `communicationMode = WHISPER | PRIVATE` 的唯一判定服务和失效规则，公开主页、推荐详情、理想型结果共用同一返回字段。
- [ ] 记录脏文件合并策略和每批允许修改的文件范围，禁止跨批次大面积重构。

### Task 3: 先写数据库与领域层 RED 测试，再落地四张核心表

**Files:**
- Create: `deploy/sql/prod/065_prd08_recommend_ideal.sql`
- Create: `backend/src/main/java/com/spacetime/common/entity/RecommendPreference.java`
- Create: `backend/src/main/java/com/spacetime/common/entity/IdealFilterSnapshot.java`
- Create: `backend/src/main/java/com/spacetime/common/entity/IdealSnapshotCandidate.java`
- Create: `backend/src/main/java/com/spacetime/common/entity/RecommendViewLog.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/RecommendPreferenceDao.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/IdealFilterSnapshotDao.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/IdealSnapshotCandidateDao.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/RecommendViewLogDao.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/impl/RecommendPreferenceDaoImpl.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/impl/IdealFilterSnapshotDaoImpl.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/impl/IdealSnapshotCandidateDaoImpl.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/impl/RecommendViewLogDaoImpl.java`
- Create: `backend/src/main/java/com/spacetime/common/mapper/RecommendPreferenceMapper.java`
- Create: `backend/src/main/java/com/spacetime/common/mapper/IdealFilterSnapshotMapper.java`
- Create: `backend/src/main/java/com/spacetime/common/mapper/IdealSnapshotCandidateMapper.java`
- Create: `backend/src/main/java/com/spacetime/common/mapper/RecommendViewLogMapper.java`
- Create: `backend/src/test/java/com/spacetime/common/dao/Prd08SchemaContractTest.java`

- [ ] 先写 `Prd08SchemaContractTest`，断言四表、唯一键、索引、快照状态、审计字段、逻辑删除字段以及优惠配置 seed；执行测试并保存 RED 证据。
- [ ] 新增 `ct_recommend_preference`、`ct_ideal_filter_snapshot`、`ct_ideal_snapshot_candidate`、`ct_recommend_view_log`，所有表具备 `BaseEntity` 对应审计/逻辑删除字段。
- [ ] 为 `(user_id)` 偏好唯一键、`snapshot_no` 唯一键、`(snapshot_id,candidate_user_id)` 候选唯一键、`(user_id,target_user_id,scene,view_date)` 浏览幂等键建立索引。
- [ ] 在迁移中写入 `commercial.ideal.batch.discount.percent=10` 默认配置，并校正 `ideal_user_unlock`、`ideal_batch_unlock` 的中文场景名称，不改动其他商业化数据。
- [ ] 实现实体、DAO、DAOImpl、Mapper，执行目标测试转 GREEN。

### Task 4: 推荐偏好、候选、等待与三天回看后端闭环

**Files:**
- Create: `backend/src/main/java/com/spacetime/miniapp/controller/RecommendController.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/RecommendService.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/impl/RecommendServiceImpl.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/request/RecommendPreferenceReq.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/request/RecommendActionReq.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/RecommendHomeVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/RecommendCandidateVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/RecommendReplayVO.java`
- Create: `backend/src/test/java/com/spacetime/miniapp/service/RecommendServiceImplTest.java`
- Create: `backend/src/test/java/com/spacetime/miniapp/controller/RecommendControllerTest.java`

- [ ] 先写失败测试覆盖资料/三重认证门禁、异性与拉黑过滤、偏好保存、游标稳定性、跳过/喜欢浏览日志、每日上限、普通/VIP 三天回看权限和空态。
- [ ] 实现 `GET /miniapp/recommend/home`、`GET/PUT /miniapp/recommend/preference`、`POST /miniapp/recommend/action`、`GET /miniapp/recommend/replay`。
- [ ] 候选查询仅使用数据库真实资料和审核通过图片；不符合开放状态、认证、性别或拉黑规则的用户不得进入结果。
- [ ] 推荐上限、回看天数、普通/VIP 配额从 `app_config` 读取并在运行时生效，不保留硬编码 5 或静态倒计时。
- [ ] 操作接口使用用户 + 目标 + 场景 + 日期幂等，重复点击不重复计数或写日志。
- [ ] 执行目标 Service 和 Controller 测试转 GREEN。

### Task 5: 理想型筛选、快照、结果与历史后端闭环

**Files:**
- Create: `backend/src/main/java/com/spacetime/miniapp/controller/IdealController.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/IdealService.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/impl/IdealServiceImpl.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/request/IdealFilterReq.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/IdealFilterOptionsVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/IdealSnapshotVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/IdealCandidateVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/IdealHistoryVO.java`
- Create: `backend/src/test/java/com/spacetime/miniapp/service/IdealServiceImplTest.java`
- Create: `backend/src/test/java/com/spacetime/miniapp/controller/IdealControllerTest.java`

- [ ] 先写失败测试覆盖 17 个条件、普通/VIP 字段权限、跨字段 AND/同字段 OR、地址和年龄边界、快照不可变、候选顺序、90 天保留、未解锁打码、已解锁回显和候选失效。
- [ ] 实现 `GET /miniapp/ideal/options`、`POST /miniapp/ideal/snapshots`、`GET /miniapp/ideal/snapshots/{snapshotNo}`、`GET /miniapp/ideal/records`、`GET /miniapp/ideal/unlocks`。
- [ ] 快照保存条件 JSON、条件摘要、候选顺序和关键资料摘要；历史页面读取快照，不因用户随后修改偏好而改变旧结果。
- [ ] 返回给未解锁页面的数据必须在服务端脱敏；客户端不能拿到原图、完整昵称或可逆真实资料后再做 CSS 模糊。
- [ ] 已解锁记录返回目标用户 ID、有效期、资料摘要和 `communicationMode`，可直接跳转共用主页。
- [ ] 执行目标 Service 和 Controller 测试转 GREEN。

### Task 6: 解锁全部优惠、报价确认与商业化配置闭环

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/service/IdealUnlockPricingService.java`
- Create: `backend/src/main/java/com/spacetime/common/service/impl/IdealUnlockPricingServiceImpl.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/request/IdealUnlockQuoteReq.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/request/IdealUnlockConfirmReq.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/IdealUnlockQuoteVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/controller/AssetController.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/AssetServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/dto/request/CommercialSettingsReq.java`
- Modify: `backend/src/main/java/com/spacetime/admin/dto/response/CommercialSettingsVO.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/CommercialAdminServiceImpl.java`
- Modify: `frontend/src/api/commercial.ts`
- Modify: `frontend/src/pages/commercial/CommercialManagement.tsx`
- Create: `backend/src/test/java/com/spacetime/common/service/IdealUnlockPricingServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/AssetServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/admin/service/CommercialAdminServiceImplTest.java`
- Create: `frontend/scripts/test-prd08-commercial-discount.mjs`

- [ ] 先写失败测试覆盖 0%、10%、100%、非法比例、奇数币向上取整、已解锁候选剔除、快照串改、报价过期、重复确认、余额不足、并发确认和账本分摊总和。
- [ ] 新增 `POST /miniapp/asset/ideal/quote` 和 `POST /miniapp/asset/ideal/confirm`；报价由服务端读取有效快照、单价和优惠配置，确认在单事务中锁定资产、候选和报价。
- [ ] 对当前快照全部有效未解锁候选计算价格；服务端安全上限读取 `commercial.ideal.batch.max`，超限返回明确错误并要求重新生成受控快照，不静默截断。
- [ ] 批量扣币生成一条汇总流水和逐候选解锁记录；金额分摊余数按候选稳定顺序补齐，记录原价、优惠比例、实付和 quoteNo。
- [ ] 后台商业化配置增加中文字段“理想型解锁全部优惠比例（%）”、范围校验和变更日志前后值；保存后立即影响新报价，不影响已生成未过期报价。
- [ ] 前端显示后端返回的 `优惠X%`、原价和实付价；不在小程序本地重复计算。
- [ ] 执行后端目标测试、前端静态测试和 `npm --prefix frontend run build` 转 GREEN。

### Task 7: 主页共用组件与悄悄话/私信真实入口闭环

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/service/CommunicationEntryService.java`
- Create: `backend/src/main/java/com/spacetime/common/service/impl/CommunicationEntryServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/PublicProfileVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappPublicProfileServiceImpl.java`
- Create: `backend/src/test/java/com/spacetime/common/service/CommunicationEntryServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/MiniappPublicProfileServiceImplTest.java`
- Create: `miniapp/src/pages/profile/components/ProfileDisplayPage.tsx`
- Create: `miniapp/src/pages/profile/components/ProfileDisplaySections.tsx`
- Create: `miniapp/src/domain/profileCommunication.ts`
- Modify: `miniapp/src/pages/profile/components/ProfilePreviewPage.tsx`
- Modify: `miniapp/src/pages/heart/user.tsx`
- Modify: `miniapp/src/services/profile.ts`
- Modify: `miniapp/src/services/message.ts`
- Create: `miniapp/scripts/test-prd08-profile-communication.cjs`

- [ ] 先写后端失败测试：无解锁返回 `WHISPER`，有效理想型/关系解锁返回 `PRIVATE`，过期或退款后回到 `WHISPER`，拉黑状态禁止沟通。
- [ ] 先写小程序失败测试：公开主页和本人预览必须引用同一 `ProfileDisplayPage`；未解锁路由到悄悄话，解锁后路由到私信；旧的仅凭 matched 拦截逻辑必须消失。
- [ ] 从 `heart/user.tsx` 和 `ProfilePreviewPage.tsx` 提取共用头图、头像、认证、基础资料、标签、自我介绍和图片模块；空内容整块不显示，公开页与预览页仅差操作插槽。
- [ ] `PublicProfileVO` 返回服务端判定的 `communicationMode`、`communicationDisabledReason` 和 conversation/target 信息，不向客户端泄露判定细节。
- [ ] 将 `services/message.ts` 的 real provider 接到真实消息接口；悄悄话和私信页面壳可复用，但不得继续以 Zustand 内存 Mock 作为生产数据源。
- [ ] 对共用主页按 375×812、390×844 截图，确保两种 mode 的主体视觉完全一致，仅操作区不同。

### Task 8: 建立小程序 PRD-08 领域层、API 与路由骨架

**Files:**
- Create: `miniapp/src/services/recommend.ts`
- Create: `miniapp/src/services/ideal.ts`
- Create: `miniapp/src/domain/recommendPresentation.ts`
- Create: `miniapp/src/domain/idealPresentation.ts`
- Create: `miniapp/src/stores/recommendStore.ts`
- Create: `miniapp/src/components/recommend/RecommendTabs.tsx`
- Create: `miniapp/src/components/recommend/RecommendCandidateCard.tsx`
- Create: `miniapp/src/components/recommend/IdealCandidateCard.tsx`
- Create: `miniapp/src/components/recommend/FilterPickerSheet.tsx`
- Modify: `miniapp/src/app.config.ts`
- Create: `miniapp/scripts/test-prd08-recommend-domain.cjs`
- Create: `miniapp/scripts/test-prd08-design-contract.cjs`
- Modify: `miniapp/package.json`

- [ ] 先写领域失败测试覆盖 API 字段映射、服务端脱敏态、价格只读、筛选摘要、日期、空态、会员态、认证态和 `communicationMode` 路由。
- [ ] 注册 9 条正式路由；推荐底部 Tab 仍指向 `/pages/recommend/index`，但移除对 `QianxunFamilyPage` 的错误导出，不改社区模块自身路由。
- [ ] API service 统一处理 R<T>、游标、错误码和幂等键；store 只缓存当前页面状态，不作为推荐/解锁事实源。
- [ ] 依据设计描述实现真实图片、真实文字和真实图标组件；所有点击区域与可见元素一致且不少于 88rpx。
- [ ] 执行领域测试和设计契约静态门禁转 GREEN，再进入页面分批还原。

### Task 9: 批次 A、B——推荐主流程、上限与会员逐页闭环

**Files:**
- Modify: `miniapp/src/pages/recommend/index.tsx`
- Create: `miniapp/src/pages/recommend/detail/index.tsx`
- Create: `miniapp/src/pages/recommend/waiting/index.tsx`
- Modify: `miniapp/src/pages/heart/membership-unlock.tsx`
- Create: `miniapp/scripts/capture-prd08-recommend-ab.cjs`
- Modify: `miniapp/scripts/test-prd08-design-contract.cjs`

- [ ] 按设计描述实现“推荐、推荐首屏、信息完善、IP 所属地、暂无数据、三重认证弹窗”六态；状态由后端错误码/字段驱动。
- [ ] 推荐卡点击进入共用用户主页；喜欢、跳过、免费开聊、私信均调用真实接口并防重复点击。
- [ ] 实现每日上限等待态和会员未开通固定底部支付按钮，底部安全区、遮罩、滚动边界严格对齐蓝湖。
- [ ] 每完成一个画板状态就输出运行截图和差异清单；A 批 6 稿全部达标后再做 B 批 2 稿。
- [ ] 执行目标门禁、正式构建和微信运行截图，登记 8 稿各自还原度。

### Task 10: 批次 C、D——三天回看与偏好设置逐页闭环

**Files:**
- Create: `miniapp/src/pages/recommend/replay/index.tsx`
- Create: `miniapp/src/pages/recommend/meeting-preference/index.tsx`
- Create: `miniapp/scripts/capture-prd08-recommend-cd.cjs`
- Modify: `miniapp/scripts/test-prd08-design-contract.cjs`

- [ ] 三天回看普通态、会员态均使用真实历史接口，显示正确日期、候选状态和会员权益，不使用本地时间伪造数据。
- [ ] 偏好设置普通态、会员态使用同一表单组件，会员字段由服务端权限控制；保存失败保留用户输入并给出中文错误。
- [ ] 地址、年龄、身高、体重等选择器按设计描述实现滚轮/弹层交互，省市两级和数值边界与后端契约一致。
- [ ] 逐稿完成 4 张微信截图、像素差异修复和还原度登记。

### Task 11: 批次 E、F——理想型筛选、结果、充值与历史逐页闭环

**Files:**
- Create: `miniapp/src/pages/recommend/filter/index.tsx`
- Create: `miniapp/src/pages/ideal/results/index.tsx`
- Create: `miniapp/src/pages/ideal/records/index.tsx`
- Create: `miniapp/src/pages/ideal/unlocks/index.tsx`
- Modify: `miniapp/src/pages/coins/unlock-recharge.tsx`
- Create: `miniapp/scripts/capture-prd08-ideal-ef.cjs`
- Modify: `miniapp/scripts/test-prd08-design-contract.cjs`

- [ ] 实现理想型默认态、筛选态、筛选全态、地址弹窗、年龄弹窗五稿；17 个条件及会员锁态来自 `/miniapp/ideal/options`。
- [ ] 提交筛选生成真实快照；结果页未解锁卡由服务端脱敏数据渲染，单个解锁和“解锁全部”都先报价再确认。
- [ ] “解锁全部”按钮展示后端返回的原价、实付价和 `优惠X%`；配置修改后新报价实时变化，客户端不保留旧算法。
- [ ] 余额不足进入理想型充值态，支付成功后带原 quoteNo 回到确认流程；取消支付不得创建解锁记录。
- [ ] 历史筛选记录、历史解锁和暂无数据均调用真实接口；有效解锁可进入共用主页并显示 `PRIVATE`，未解锁只能进入悄悄话。
- [ ] “什么是理想型？”使用真实弹层/说明页，关闭、返回和底部安全区符合蓝湖。
- [ ] 逐稿完成 11 张微信截图、差异修复和还原度登记，E 批达标后再进入 F 批。

### Task 12: 全链路测试、SQL 验证、视觉验收与交付

**Files:**
- Create: `docs/测试文档/PRD08推荐理想型-testcase.md`
- Create: `docs/测试文档/PRD08推荐理想型-test-l1.sh`
- Create: `docs/测试文档/PRD08推荐理想型-testreport.md`
- Create: `miniapp/scripts/validate-prd08-lanhu-closure.mjs`
- Create: `miniapp/scripts/capture-prd08-all-pages.cjs`
- Create: `docs/验收报告/2026-08-05-PRD08推荐理想型-蓝湖还原-acceptance.md`
- Create: `docs/验收报告/截图证据/2026-08-05-PRD08推荐理想型-蓝湖还原/运行态/manifest.json`

- [ ] 按 code-test 流程生成独立 testcase、L1 脚本和 testreport，覆盖普通用户/VIP、资料不全/认证不全、空池/上限、17 条件、单解锁/全解锁、余额不足/支付成功、重复确认、历史和沟通模式切换。
- [ ] 执行后端目标测试：`cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test`；若本机 JDK 路径变化，使用 `JAVA_HOME=$(/usr/libexec/java_home -v 21)`，不得用不兼容 JDK 假报通过。
- [ ] 执行后台构建：`cd frontend && npm run build`。
- [ ] 执行小程序领域/门禁脚本和正式构建：`cd miniapp && npm run test:prd08 && npm run build:weapp`。
- [ ] 在具备测试数据库时执行 `065_prd08_recommend_ideal.sql`，验证四表、索引、默认优惠 10%、重复执行幂等和回滚说明；缺少数据库凭据时在报告中明确跳过，不伪造结果。
- [ ] 使用真实测试账号完整走通“推荐偏好 -> 推荐浏览 -> 三天回看 -> 理想型筛选 -> 快照 -> 单个解锁 -> 解锁全部 -> 余额不足充值 -> 历史解锁 -> 主页 -> 悄悄话/私信”。
- [ ] 为 23 张蓝湖稿分别生成 375×812 运行截图，关键页面补 390×844；`manifest.json` 一一映射设计基线和运行截图。
- [ ] 在验收报告逐页登记结构、尺寸、颜色、字体、素材、图标、交互、真实数据、还原度与遗留差异；任一关键首屏低于 97% 或整体低于 95% 不得标记完成。
- [ ] 执行限定范围 `git diff --check`，仅暂存本任务文件，保留工作区既有改动；提交与 push 需在全部测试和截图证据通过后进行。

## 完成定义

- 23 张蓝湖稿均有设计描述、基线图、运行截图、差异记录和单页还原度。
- 9 条生产路由可从真实入口访问，所有可见交互均由真实组件和真实接口驱动。
- 四张 PRD-08 核心表、推荐/理想型/历史 API、服务端脱敏、快照和浏览日志全部落库。
- 用户主页与主页预览共享同一展示组件；未解锁固定悄悄话，解锁后固定私信。
- 商业化后台可配置“解锁全部优惠比例”，变更日志显示中文配置项、变更前后和变更原因，新报价立即生效。
- 解锁报价、扣币、逐人记录、历史查看和沟通入口金额/状态一致，重复请求不重复扣费。
- 后端测试、后台构建、小程序构建、专项门禁、SQL 验证和端到端测试结果写入独立测试报告。
- 验收报告中关键首屏还原度 ≥97%，整体还原度 ≥95%，无未登记阻塞项。
