# School Dictionary and GuGuData Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready C-end school autocomplete that searches the local database first, supplements fewer than 10 results from GuGuData, persists normalized schools, and is consumed by the miniapp education/profile forms.

**Architecture:** A `SchoolDictionaryService` coordinates a six-layer MyBatis-Plus dictionary repository, a replaceable `SchoolSearchProvider`, and a Redis ten-minute successful-query marker. The miniapp calls one backend dictionary endpoint; save requests carry an optional stable school code while retaining manual-text compatibility.

**Tech Stack:** Java 21, Spring Boot 3.4, MyBatis-Plus, MySQL, Redis, Taro 4/React/TypeScript, JUnit 5, Mockito, Node test scripts.

## Global Constraints

- Backend layering remains `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper`.
- Controllers return precise `R<T>`.
- AppKey is read only from `GUGUDATA_COLLEGE_APP_KEY` and sent by server-side Header; it never appears in committed files or test output.
- China mainland schools use the structured dictionary; Hong Kong, Macao, Taiwan, overseas, and provider misses remain manually enterable.
- Local result count 10 skips provider; fewer than 10 may call provider once per keyword per ten-minute successful-sync window.
- Provider errors return local candidates and never block manual profile or education submission.

---

### Task 1: School Dictionary Persistence

**Files:**
- Create: `deploy/sql/prod/079_prd01_school_dictionary.sql`
- Create: `backend/src/main/java/com/spacetime/common/entity/SchoolDictionary.java`
- Create: `backend/src/main/java/com/spacetime/common/mapper/SchoolDictionaryMapper.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/SchoolDictionaryDao.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/impl/SchoolDictionaryDaoImpl.java`
- Test: `backend/src/test/java/com/spacetime/common/dao/impl/SchoolDictionaryDaoImplTest.java`

**Interfaces:**
- Produces: `List<SchoolDictionary> search(String keyword, int limit)`, `void upsertAll(List<SchoolDictionary> schools)`, `SchoolDictionary selectByStableCode(String code)`.

- [ ] **Step 1: Write failing DAO tests** for exact-name-first ordering, alias matching, limit clamping, UUID upsert, and stable-code lookup.
- [ ] **Step 2: Run tests and verify RED** with `cd backend; mvn -Dtest=SchoolDictionaryDaoImplTest test` failing because the types do not exist.
- [ ] **Step 3: Add migration and six-layer persistence**. The table must include `provider_uuid`, `school_code`, `school_name`, `short_name`, `old_name`, location/classification fields, three tier booleans, `source`, `provider_updated_time`, `status`, BaseEntity audit columns, logical delete, a unique UUID index, and search indexes.
- [ ] **Step 4: Run DAO tests and verify GREEN**.

### Task 2: GuGuData Provider and Secret Configuration

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/provider/SchoolSearchProvider.java`
- Create: `backend/src/main/java/com/spacetime/common/provider/SchoolProviderItem.java`
- Create: `backend/src/main/java/com/spacetime/common/provider/impl/GuGuDataCollegeProperties.java`
- Create: `backend/src/main/java/com/spacetime/common/provider/impl/GuGuDataSchoolSearchProvider.java`
- Create: `backend/src/main/java/com/spacetime/common/provider/impl/UnavailableSchoolSearchProvider.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/resources/application-prod.yml`
- Modify: `backend/.env.local.example`
- Modify: `deploy/server.prod.env.example`
- Modify: `deploy/scripts/deploy-prod-local.sh`
- Modify privately: `backend/.env.local`
- Modify privately: `deploy/secrets/prod.env`
- Test: `backend/src/test/java/com/spacetime/common/provider/impl/GuGuDataSchoolSearchProviderTest.java`

**Interfaces:**
- Produces: `List<SchoolProviderItem> search(String keyword, int limit)`.

- [ ] **Step 1: Write failing provider tests** using a local JDK HTTP server: Header contains the configured AppKey, query uses `keywords`, page size is at most 20, business code `100` maps fields, 429/5xx/non-100/malformed JSON become a provider exception without logging secrets.
- [ ] **Step 2: Run provider tests and verify RED**.
- [ ] **Step 3: Implement provider** using Java `HttpClient`, Jackson, 2s connect timeout, 4s request timeout, `X-GUGUDATA-APPKEY`, and conditional configuration.
- [ ] **Step 4: Add environment wiring** for enabled/base URL/AppKey/timeouts. Add the supplied key only to the two ignored private env files; examples contain empty placeholders. Add production deploy validation/passthrough without echoing the value.
- [ ] **Step 5: Run provider tests and verify GREEN**.

### Task 3: Local-First C-End School Search API

**Files:**
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/SchoolOptionVO.java`
- Extend: `backend/src/main/java/com/spacetime/miniapp/service/MiniappDictService.java`
- Extend: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappDictServiceImpl.java`
- Extend: `backend/src/main/java/com/spacetime/miniapp/controller/MiniappDictController.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/impl/MiniappDictServiceImplTest.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/controller/MiniappDictControllerTest.java`

**Interfaces:**
- Produces: `List<SchoolOptionVO> schools(String keyword, Integer limit)` and `GET /miniapp/dict/schools`.

- [ ] **Step 1: Write failing L3 tests**: ten local rows skip provider; fewer than ten call provider and upsert; provider failure returns local; Redis success marker skips repeat provider call; Redis failure does not break search; provider duplicates merge by UUID/code/name.
- [ ] **Step 2: Run L3 tests and verify RED**.
- [ ] **Step 3: Implement minimal orchestration** with keyword validation (2-50 chars), limit 1-10, local-first query, provider supplementation, upsert, requery, and best-effort Redis marker `prd01:school-search:synced:<sha256(keyword)>` for ten minutes.
- [ ] **Step 4: Run L3 tests and verify GREEN**.
- [ ] **Step 5: Write failing L2 tests** for missing/one-character keyword and successful precise `R<List<SchoolOptionVO>>` response.
- [ ] **Step 6: Add Controller route and verify L2 GREEN**.

### Task 4: Stable School Code on Profile and Education Saves

**Files:**
- Modify: `deploy/sql/prod/079_prd01_school_dictionary.sql`
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppUser.java`
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppUserAuditRecord.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/BasicProfileSaveReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/EducationSubmitReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/BasicProfileVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/EducationVerifyDetailVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/ProfileServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/VerificationServiceImpl.java`
- Test: existing `ProfileServiceImplTest.java` and `VerificationServiceImplTest.java`

**Interfaces:**
- Consumes: `SchoolDictionaryDao.selectByStableCode`.
- Produces: optional `schoolCode` in both save and detail contracts.

- [ ] **Step 1: Add failing tests** proving a valid code replaces client-supplied name with the dictionary name, an unknown code is rejected, and a null code preserves manual-text compatibility.
- [ ] **Step 2: Run focused tests and verify RED**.
- [ ] **Step 3: Add nullable schema columns and minimal standardization logic**.
- [ ] **Step 4: Run focused tests and verify GREEN**.

### Task 5: Miniapp API Consumption and Shared Search Component

**Files:**
- Modify: `miniapp/src/constants/prd01ApiPaths.ts`
- Modify: `miniapp/src/types/prd01.ts`
- Modify: `miniapp/src/services/prd01.ts`
- Create: `miniapp/src/pages/verification/components/SchoolSearchInput.tsx`
- Modify: `miniapp/src/pages/verification/components/EducationSubmitPage.tsx`
- Modify: `miniapp/src/pages/profile/edit.tsx`
- Test: `miniapp/scripts/test-school-search-integration.cjs`

**Interfaces:**
- Consumes: `GET /miniapp/dict/schools?keyword&limit`.
- Produces: selected `{ code, name }`; text edits after selection emit `{ code: undefined, name: text }`.

- [ ] **Step 1: Write failing Node integration assertions** for API path, service method, two-character threshold, 300ms debounce, ten-result cap, both page integrations, and `schoolCode` save payload.
- [ ] **Step 2: Run the Node script and verify RED**.
- [ ] **Step 3: Implement the shared component and API types**, preserving current layout and manual input behavior.
- [ ] **Step 4: Run Node test and miniapp build; verify GREEN**.

### Task 6: API Handoff and Code-Test Artifacts

**Files:**
- Modify: `docs/技术方案/2026-07-07-用户准入与资料认证初始化-mobile-api-handoff.md`
- Create: `docs/测试文档/学校字典与歌曲保存-testcase.md`
- Create: `docs/测试文档/学校字典与歌曲保存-test-l1.sh`
- Create/update: `docs/测试文档/学校字典与歌曲保存-testreport.md`

**Interfaces:**
- Documents the exact school endpoint and `schoolCode` contract; records executed evidence.

- [ ] **Step 1: Update handoff** with before/after field table, school endpoint request/response examples, manual fallback, errors, and configuration names without secret values.
- [ ] **Step 2: Create testcase.md** using the repository code-test templates for L1/L2/L3 plus miniapp static integration.
- [ ] **Step 3: Derive L1 script** that loads `API_URL`/`TOKEN`, calls school search twice, verifies database persistence when DB access exists, saves a favorite song, and queries profile detail to verify persisted song fields.
- [ ] **Step 4: Execute focused Maven tests, full relevant backend tests, miniapp tests/build, and real GuGuData smoke queries** for `浙江大学`, `浙大`, and `北京大学`.
- [ ] **Step 5: Execute C-end HTTP L1 tests** against the configured local/test environment. If Token or environment data is unavailable, record the exact skipped step and use Controller/Service integration evidence without inventing credentials.
- [ ] **Step 6: Write testreport.md** with commands, counts, HTTP/business codes, sanitized response samples, first/second-query source behavior, database row evidence, and favorite-song before/after fields.
- [ ] **Step 7: Run final secret scan and git diff review**; ensure the supplied AppKey appears only in ignored private env files.
