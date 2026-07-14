# APP User List Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove per-user database queries from APP user list assembly, split header statistics from the list endpoint, and render the main list in pages of nine.

**Architecture:** Keep the existing page-first query. Load all audit facts for the current page once, load completeness rules once, and compute each row in memory. The new stats endpoint performs count-only queries, while the frontend separates draft filters from applied filters.

**Tech Stack:** Java 21, Spring Boot 3.4, MyBatis-Plus, JUnit 5/Mockito, React 18, TypeScript, Vite, Playwright.

## Global Constraints

- Preserve `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper`.
- Do not add snapshot columns, tables, indexes, or caches in this change.
- Do not impose a fixed SQL-count ceiling; all current-page enrichments must be batched and must not grow linearly with the number of users.
- Main APP user card/table pagination is 9; certification and moderation lists remain 10.
- Preserve all existing uncommitted work and edit shared files incrementally.

---

### Task 1: Lock Backend Batch Behavior With Failing Tests

**Files:**
- Modify: `backend/src/test/java/com/spacetime/admin/service/AppUserAdminServiceImplTest.java`
- Create: `backend/src/test/java/com/spacetime/common/service/Prd01ProfileCompletenessCalculatorTest.java`

**Interfaces:**
- Produces: `ProfileCompletenessRules loadRules()` and `calculate(AppUser, ProfileCompletenessRules, Map<String, AppUserAuditRecord>, Set<String>)` expectations.
- Produces: `AppUserStatsVO getUserStats()` expectation.

- [ ] Add a list test with two users and one batch of audit rows; assert one audit DAO call, one rules load, no per-user `calculate(AppUser)` call, and correct avatar/status/photo output.
- [ ] Add a calculator test whose score rules contain avatar and album fields; assert the preloaded overload computes the score without calling `AppUserAuditService`.
- [ ] Add a stats test that expects current-user and core-access totals from two count-only DAO calls.
- [ ] Run `mvn -Dtest=AppUserAdminServiceImplTest,Prd01ProfileCompletenessCalculatorTest test` with JDK 21 and verify RED because the new interfaces do not exist.

### Task 2: Implement Backend Batch Assembly And Stats

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/service/Prd01ProfileCompletenessCalculator.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/AppUserDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/AppUserDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/AppUserAdminService.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/AppUserAdminServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/controller/AppUserController.java`
- Create: `backend/src/main/java/com/spacetime/admin/dto/response/AppUserStatsVO.java`

**Interfaces:**
- `ProfileCompletenessRules loadRules()` loads one runtime configuration snapshot.
- `int calculate(AppUser user, ProfileCompletenessRules rules, Map<String, AppUserAuditRecord> latestAudits, Set<String> effectiveAuditTypes)` performs no DAO access.
- `AppUserStatsVO getUserStats()` returns `currentUserCount` and `coreAccessAllowedCount`.

- [ ] Add `AppUserDao.count(LambdaQueryWrapper<AppUser>)` and delegate to `mapper.selectCount` in DAOImpl.
- [ ] Refactor scoring into one shared scoring loop with DAO-backed and preloaded field resolvers.
- [ ] Build current-page latest records, effective audit-type sets, public avatar, and owner album photos from one audit query.
- [ ] Normalize `CORE_ALLOWED` and `CORE_PENDING` alongside existing core-access aliases.
- [ ] Add `GET /admin/users/app/stats` with `@RequirePermission("user:app:list")` and exact `R<AppUserStatsVO>`.
- [ ] Run the focused backend tests and verify GREEN.

### Task 3: Lock And Implement Frontend Request Behavior

**Files:**
- Modify: `frontend/e2e-tests/tests/prd01-user.spec.ts`
- Modify: `frontend/src/api/userApp.ts`
- Modify: `frontend/src/pages/customers/CustomersPage.tsx`

**Interfaces:**
- `getAppUserStats(): Promise` calls `/admin/users/app/stats`.
- `APP_USER_PAGE_SIZE` is `9`.
- Draft filter changes do not issue list requests; search/reset apply a new filter snapshot.

- [ ] Add a Playwright test that observes list and stats requests, verifies no `size=1` list request, verifies `size=9`, and verifies typing alone does not request.
- [ ] Run the focused test and verify RED against the current three-list-call implementation.
- [ ] Add `AppUserStatsVO` and `getAppUserStats()` to the API module.
- [ ] Separate draft fields from `appliedFilters`, guard stale list responses with a request sequence, and use the stats endpoint.
- [ ] Use `APP_USER_PAGE_SIZE` in requests, pagination, export boundary handling, and the visible `9条/页` copy.
- [ ] Re-run the focused Playwright test and `npm.cmd run build` and verify GREEN.

### Task 4: Measure And Report

**Files:**
- Update only if test execution is requested as a formal deliverable: `docs/测试文档/APP用户管理列表查询性能优化-testreport.md`

- [ ] Run focused backend tests and frontend build.
- [ ] If the local backend and database are available, call the list and stats endpoints on the same dataset and count SQL statements from the log.
- [ ] Compare against the captured baseline of 79 SQL for `size=10` and estimated 72 SQL for `size=9`; report the new observed count without treating it as a permanent ceiling.
- [ ] Review `git diff` to ensure unrelated user changes were not reverted.
