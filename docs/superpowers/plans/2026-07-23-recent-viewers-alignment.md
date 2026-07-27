# 最近访客列表对齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将最近访客后端列表调整为按访客用户聚合、普通用户“全部已解锁 + 最近 10 个未解锁”、VIP 最近 7 天全量，并按最近访问时间稳定分页。

**Architecture:** 30 分钟访问窗口、访问事件和统计事实保持不变；`AppRelationVisitMapper` 使用 MySQL 8 CTE 与窗口函数生成一人一卡的分页投影。访客解锁记录继续保存触发的 `visitNo`，权益查询按 `targetUserId` 复用，并在确认扣币事务中锁定用户资产行，避免并发重复扣费。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、MySQL 8、Redis、JUnit 5、Mockito。

## Global Constraints

- 只修改后端代码、SQL、需求/技术/测试文档，不修改小程序前端代码。
- 后端保持 `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` 分层。
- 最近访客窗口固定 7 天，底层 30 分钟访问归并和 PV/UV 统计口径不变。
- 未解锁和已解锁记录均返回完整基础资料，前端只依据 `displayStatus` 控制样式。
- 不新增“新访客”读取游标。
- 本轮不自动创建 Git 提交。

---

### Task 1: 定义访客列表数据库投影

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/dto/RelationVisitListRow.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/AppRelationVisitDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/AppRelationVisitDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/mapper/AppRelationVisitMapper.java`
- Test: `backend/src/test/java/com/spacetime/common/mapper/AppRelationVisitMapperContractTest.java`

**Produces:**
- `countRecentVisitors(Long, LocalDateTime)`
- `countVisibleRecentVisitors(Long, boolean, LocalDateTime)`
- `countUnlockedRecentVisitors(Long, LocalDateTime)`
- `selectVisibleRecentVisitors(Long, boolean, LocalDateTime, long, int)`

- [x] 先写 Mapper SQL 契约测试，要求按 `visitor_user_id` 聚合、普通用户未解锁最多 10 人、最终按 `last_visit_time,id` 倒序。
- [x] 运行契约测试并确认旧实现因接口/SQL缺失失败。
- [x] 实现 CTE 和窗口函数投影，`recordNo/sourceScene` 取最近访问窗口，次数和首末访问时间按用户聚合。
- [x] 运行 Mapper 契约测试并确认通过。

### Task 2: 调整最近访客分页与返回字段

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/RecentViewersPageVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/RecentViewerItemVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappRelationServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/MiniappRelationServiceImplTest.java`

**Produces:**
- `total`：最近 7 天有效去重访客人数。
- `visibleTotal/hiddenCount`：当前普通/VIP可分页集合数量及隐藏数量。
- `records[]`：一人一卡，统一按最近访问时间排序，包含完整资料和 `unlockTime/displayStatus`。

- [x] 先把现有访客 Service 测试改为新 DAO 契约，并新增普通用户、VIP、聚合次数、完整资料断言。
- [x] 运行测试并确认旧实现失败。
- [x] 服务改用数据库投影分页，批量加载头像、字典标签、在线状态和匹配状态。
- [x] 运行 Service 测试并确认通过。

### Task 3: 将访客解锁权益调整为用户维度

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/dao/UserAssetDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/UserAssetDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/mapper/UserAssetMapper.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/RelationUnlockServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/common/mapper/UserAssetMapperContractTest.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/RelationUnlockServiceImplTest.java`

**Produces:**
- 访客 active 解锁按 `userId + targetBizType=visit + targetUserId` 查询。
- 喜欢 active 解锁继续按 `targetBizNo` 查询。
- confirm 在检查既有权益和扣币前执行 `selectByUserIdForUpdate`。

- [x] 先新增同一访客不同 `visitNo` 复用解锁及资产行锁测试。
- [x] 运行测试并确认旧实现失败。
- [x] 修改 quote/confirm 既有权益查询，保留原始 `targetBizNo` 作为审计来源。
- [x] 增加资产行锁查询并在事务内串行化同一用户的解锁确认。
- [x] 运行解锁与资产契约测试并确认通过。

### Task 4: 同步 SQL 与对接文档

**Files:**
- Modify: `deploy/sql/prod/056_prd02_relation_feedback.sql`
- Modify: `docs/需求文档/需求文档-正式版/定稿：02-关系反馈与互动链路/PRD-02_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：02-关系反馈与互动链路/移动端/页面规格/APP-02_最近看过我的列表页.md`
- Modify: `docs/技术方案/2026-07-16-关系反馈与互动链路-tcdesign.md`
- Modify: `docs/技术方案/2026-07-16-关系反馈与互动链路-mobile-api-handoff.md`
- Modify: `docs/测试文档/关系反馈与互动链路-testcase.md`
- Modify: `docs/测试文档/关系反馈与互动链路-testreport.md`

- [x] 增加访客用户维度解锁查询索引，不新增业务字段。
- [x] 明确一人一卡、可见集合、分页统计、排序、完整资料和用户维度解锁口径。
- [x] 在 handoff 中给出列表查询、单条解锁、刷新回填的完整调用时序及出入参示例。
- [x] 更新增量测试用例和实际执行结果。

### Task 5: 回归验证

**Files:**
- Test: `backend/src/test/java/`

- [x] 运行关系模块定向测试，预期全部通过。
- [x] 运行 `mvn test`，预期无失败、无错误。
- [x] 检查 `git diff`，确认没有小程序前端代码变更，也没有覆盖无关工作区修改。
