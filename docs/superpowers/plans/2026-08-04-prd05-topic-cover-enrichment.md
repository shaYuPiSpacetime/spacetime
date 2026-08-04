# PRD-05 家园话题封面丰富 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为家园话题补齐可公开访问的真实封面，扩充话题数量，并保证后台列表、详情编辑和小程序话题卡使用同一份封面数据。

**Architecture:** `community_topic.cover_url` 继续作为唯一封面来源，通过幂等生产迁移补齐 10 个话题；后台分页使用批量统计映射，避免话题增加后产生 N+1 查询。React 页面沿用真实 `<img>` 和现有上传回显，不引入占位背景图。

**Tech Stack:** MySQL 8、Spring Boot 3.4、MyBatis-Plus、React 18、TypeScript、Playwright。

## Global Constraints

- 封面必须是 `https://` OSS 公网 URL，不能用文字块、渐变或本地占位图替代。
- 列表、详情编辑和小程序话题卡均读取 `community_topic.cover_url`。
- 生产 SQL 必须幂等，不覆盖运营后续替换的新封面以外的自由编辑内容。
- 后台分页只能执行常量次数的关联查询，详情页才加载操作日志。
- 当前任务采用 Inline Execution；未收到本轮提交指令前不自动提交 Git。

---

### Task 1: 锁定话题封面与批量统计契约

**Files:**
- Modify: `backend/src/test/java/com/spacetime/admin/service/CommunityAdminServiceImplTest.java`
- Modify: `frontend/e2e-tests/tests/community-ui-contract.spec.ts`

**Interfaces:**
- Consumes: `CommunityAdminService#getTopicPage(CommunityTopicPageReq)`、`CommunityTopicAdminVO.coverUrl`
- Produces: 话题列表封面、批量统计和编辑回显的回归门禁

- [ ] **Step 1: 写后端失败测试**

```java
Page<?> result = communityAdminService.getTopicPage(new CommunityTopicPageReq());
assertThat(result.getRecords()).extracting("coverUrl").doesNotContainNull();
verify(communityPostDao, times(1)).selectList(any());
verify(communityExtensionDao, never()).selectAudits(any());
```

- [ ] **Step 2: 运行后端测试并确认旧实现因逐行统计失败**

Run: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -Dtest=CommunityAdminServiceImplTest test`

Expected: FAIL，`communityPostDao.selectList` 调用次数大于 1。

- [ ] **Step 3: 写 Playwright 失败测试**

```ts
await expect(page.getByRole('img', { name: '周末去哪里封面' })).toBeVisible();
await page.getByRole('button', { name: '详情' }).first().click();
await expect(page.getByRole('img', { name: '话题封面预览' })).toBeVisible();
```

- [ ] **Step 4: 运行前端契约测试确认门禁可执行**

Run: `cd frontend/e2e-tests && npx playwright test tests/community-ui-contract.spec.ts --project=chromium --reporter=list --grep '家园话题封面'`

Expected: 当前页面已有真实图片组件时通过；缺少图片回显时失败。

### Task 2: 批量查询话题统计并闭合筛选条件

**Files:**
- Modify: `backend/src/main/java/com/spacetime/admin/dto/request/CommunityTopicPageReq.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/CommunityAdminServiceImpl.java`

**Interfaces:**
- Consumes: `startTime/endTime` ISO 日期、`community_topic.id`、`community_post.topic_id`
- Produces: `toTopicAdminVOs(List<CommunityTopic>)`，一次加载帖子统计和状态字典

- [ ] **Step 1: 扩展请求字段并补齐查询语义**

```java
private LocalDate startTime;
private LocalDate endTime;
```

关键词同时匹配编码、名称和简介；默认排序为推荐降序、排序升序、更新时间降序；结束日期按次日零点排他查询。

- [ ] **Step 2: 实现批量映射**

```java
Map<Long, List<CommunityPost>> postsByTopic = communityPostDao.selectList(
    new LambdaQueryWrapper<CommunityPost>().in(CommunityPost::getTopicId, topicIds)
).stream().collect(Collectors.groupingBy(CommunityPost::getTopicId));
```

`contentCount` 为话题关联内容数，`heatValue` 为关联内容点赞数与评论数之和；列表不加载审计日志。

- [ ] **Step 3: 运行定向后端测试**

Run: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -Dtest=CommunityAdminServiceImplTest test`

Expected: PASS，全部测试零失败。

### Task 3: 补齐 10 个真实话题封面并验证三端回显

**Files:**
- Create: `deploy/sql/prod/060_prd05_topic_cover_enrichment.sql`
- Modify: `frontend/e2e-tests/tests/community-real-visual.spec.ts`
- Modify: `docs/测试文档/社区互动-PRD05-testreport.md`
- Modify: `docs/测试文档/社区互动-PRD05-UI验收报告.md`

**Interfaces:**
- Consumes: 已存在于项目 OSS 的 `camping/coffee/hiking/city/museum/cycling/bookstore/bakery/lake/greenery.webp`
- Produces: `community_topic` 中 10 个幂等话题记录，每条具备 `cover_url/display_scenes/recommended/sort/status`

- [ ] **Step 1: 验证 OSS 封面均返回 HTTP 200**

Run: `curl -fsSI <OSS_URL>`，对 10 个 URL 逐一执行。

Expected: 每个资源均为 200，且 `Content-Type` 为 `image/webp`。

- [ ] **Step 2: 编写并执行幂等迁移**

```sql
INSERT INTO community_topic (...)
VALUES (...)
ON DUPLICATE KEY UPDATE
  cover_url = VALUES(cover_url),
  display_scenes = VALUES(display_scenes),
  recommended = VALUES(recommended),
  sort = VALUES(sort),
  update_time = CURRENT_TIMESTAMP;
```

Run: 使用 `backend/.env.local` 的数据库连接执行迁移两次。

Expected: 两次执行后均为 10 条未删除话题，`cover_url IS NULL` 为 0。

- [ ] **Step 3: 增加评论详情与话题详情真实截图**

`community-real-visual.spec.ts` 在 `03-comments` 点击第一条详情并截图，在 `05-topics` 点击第一条详情并断言 `话题封面预览`。

- [ ] **Step 4: 执行完整验证并更新报告**

Run: `cd frontend && npm run build`

Run: `cd frontend/e2e-tests && npx playwright test tests/community-ui-contract.spec.ts --project=chromium --reporter=list`

Run: `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -Dtest=CommunityAdminServiceImplTest test`

Expected: 构建和测试全部通过；验收报告记录评论上下文、话题封面数量、截图路径和剩余生产部署状态。
