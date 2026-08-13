# Message Home And Whisper API Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the message home and whisper backend contracts match the confirmed mobile interaction, then publish a field-complete handoff document backed by executable tests.

**Architecture:** Keep TIM as the real-time delivery channel and the platform database as the source of truth for business state, unread counts, billing, reporting, and list projections. Extend the existing `app_message_whisper` table with source and receiver-visibility audit fields; reuse `app_message_record`, `community_report`, and `community_report_evidence` instead of adding tables. The miniapp home remains independent from TIM account readiness, while entering a private conversation performs the TIM mapping check.

**Tech Stack:** Java 21, Spring Boot 3.4, MyBatis-Plus, MySQL, Redis, JUnit 5, Mockito, MockMvc.

## Global Constraints

- Do not add or modify miniapp frontend code.
- Preserve `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` layering.
- Controllers return precise `R<T>` values.
- Receiver deletion is per-user logical hiding, never physical deletion and never `BaseEntity.deleted=1`.
- Raw TIM message identifiers are server-side implementation details and are not returned by message home or whisper APIs.
- Every handoff request and response field must have a Chinese explanation and must exist in the final code.
- All enum values written to SQL comments must include Chinese meanings.

---

### Task 1: Freeze The Mobile Contract With Failing Tests

**Files:**
- Modify: `backend/src/test/java/com/spacetime/miniapp/controller/MiniappMessageControllerContractTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/controller/WhisperControllerTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/MiniappMessageServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/WhisperServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/MiniappOssUploadTicketServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/CommunityServiceImplTest.java`

**Interfaces:**
- Consumes: confirmed message home and whisper field contract.
- Produces: failing tests for bucket pagination, receiver hide, action flags, source binding, clean DTOs, and report evidence upload.

- [ ] Add controller contract tests for `bucket`, single hide, bucket hide-all, and exact DTO fields.
- [ ] Run the focused Maven tests and verify they fail because the APIs or fields are absent.
- [ ] Add service tests for received pending/processed, sent pending, receiver-only hide, full detail content, and action flags.
- [ ] Add source-scene quote binding and report-evidence ticket tests and verify the expected failures.

### Task 2: Implement Whisper Query And Visibility Lifecycle

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppMessageWhisper.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/AppMessageWhisperDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/AppMessageWhisperDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/MiniappMessageService.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappMessageServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/controller/MiniappMessageController.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/request/WhisperHideAllReq.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/WhisperHideVO.java`
- Modify: whisper response DTOs under `backend/src/main/java/com/spacetime/miniapp/dto/response/`.

**Interfaces:**
- Consumes: `direction`, `bucket`, opaque cursor, current user.
- Produces: receiver pending/processed pages, sender pending page, receiver-only logical hide operations, field-minimal list/detail responses.

- [ ] Add `source_scene`, `source_biz_no`, `receiver_hidden_at`, and `receiver_hide_type` entity fields.
- [ ] Implement DAO queries for received bucket pages and sender pending pages, excluding receiver-hidden records only from receiver views.
- [ ] Implement single and bucket hide updates restricted to the receiver.
- [ ] Return request content from `app_message_record.content_text`, content availability, display status, and explicit action flags.
- [ ] Remove raw TIM IDs and compatibility-only response fields from mobile whisper DTOs.
- [ ] Run focused tests until green.

### Task 3: Implement Source-Bound Create Contract

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/WhisperPrecheckReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/WhisperCreateReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/WhisperPrecheckVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/WhisperCreateVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/WhisperQuoteStore.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/WhisperServiceImpl.java`

**Interfaces:**
- Consumes: `targetUserNo`, `sourceScene`, conditional `sourceBizNo`, `quoteToken`, and text content.
- Produces: a quote bound to target and source, and a whisper fact that stores the same source snapshot.

- [ ] Validate `recommendation`, `profile`, `community_post`, `community_comment`, and `whisper_reverse`.
- [ ] Require `sourceBizNo` for community and reverse-whisper sources.
- [ ] Bind source fields into the Redis quote snapshot and reject mismatched create requests.
- [ ] Store source fields on the whisper fact and return only the documented create fields.
- [ ] Run focused tests until green.

### Task 4: Implement Report Evidence Upload And Persistence

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/controller/MiniappOssUploadTicketController.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/MiniappOssUploadTicketService.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappOssUploadTicketServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/CommunityReportCreateReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/CommunityServiceImpl.java`

**Interfaces:**
- Consumes: up to three OSS evidence URLs issued to the current user.
- Produces: a report ticket under `miniapp/{userId}/reportEvidence`, ownership/object-existence validation, and persisted evidence URL metadata in the report.

- [ ] Add `POST /miniapp/file/upload-ticket/report-evidence` with image-only validation.
- [ ] Add `evidenceImageUrls` with a three-item maximum to the report request.
- [ ] Validate ticket ownership, prefix, object existence, and one-time consumption before report insert.
- [ ] Merge image evidence metadata with the server-frozen chat evidence metadata without trusting client message content.
- [ ] Run focused tests until green.

### Task 5: Update Database Migration And Admin Projection

**Files:**
- Modify: `deploy/sql/prod/070_prd03_message_center_closure.sql`
- Modify: `backend/src/test/java/com/spacetime/common/database/MessageSchemaSqlTest.java`
- Modify: `backend/src/main/java/com/spacetime/admin/dto/response/AdminWhisperVO.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/AppUserMessageAdminServiceImpl.java`

**Interfaces:**
- Consumes: whisper source and receiver hide facts.
- Produces: idempotent migration columns/indexes with Chinese enum comments and admin-visible hide metadata.

- [ ] Add create-table fields plus `add_column_if_missing` calls for upgraded databases.
- [ ] Add receiver-list indexes that include hide and status fields.
- [ ] Expose source and hide metadata in existing admin whisper projections.
- [ ] Run database contract tests until green.

### Task 6: Rewrite Handoff And Execute Verification

**Files:**
- Modify: `docs/技术方案/2026-07-31-消息、私信与通知中心-mobile-api-handoff.md`
- Modify: `docs/测试文档/消息私信通知中心-testcase.md`
- Modify: `docs/测试文档/消息私信通知中心-testreport.md`

**Interfaces:**
- Consumes: final controllers, DTOs, enums, service branches, and test output.
- Produces: a code-aligned Chinese field dictionary, frontend integration flow, and reproducible test report.

- [ ] Rewrite message-home and whisper sections from the final code, deleting unsupported and compatibility-only fields.
- [ ] Document independent pending/processed cursors, render-then-read acknowledgement, hide behavior, reply-to-conversation transition, report upload flow, and retry/idempotency rules.
- [ ] Run focused tests, then the full backend test suite under Java 21.
- [ ] Execute available local L1 checks only with discovered environment/token/test data; mark external TIM/KMS checks as skipped when unavailable.
- [ ] Update the test report with exact commands, counts, failures, skips, and remaining external gates.
