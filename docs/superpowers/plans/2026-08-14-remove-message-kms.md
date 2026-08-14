# Remove Message KMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all application-level KMS dependencies from PRD-03 while preserving reliable event processing, evidence permissions, and access auditing.

**Architecture:** Store bounded system-event payloads and report evidence as plaintext database fields. Keep Inbox idempotency, retries, payload cleanup, report authorization, and audit logging unchanged; retain old cipher columns only as deprecated database compatibility columns.

**Tech Stack:** Java 21, Spring Boot 3.4, MyBatis-Plus, MySQL 8, JUnit 5, Mockito, AssertJ.

## Global Constraints

- Preserve `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` layering.
- Do not change miniapp frontend code.
- Do not change TIM delivery behavior.
- Every new SQL field has a Chinese comment.
- Avoid destructive migration of legacy ciphertext columns.

---

### Task 1: Lock plaintext storage contracts

**Files:**
- Modify: `backend/src/test/java/com/spacetime/common/service/MessageEventPublisherImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/common/service/ChatReportEvidenceServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/admin/service/MessageReportEvidenceAdminServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/common/database/MessageEntityStorageContractTest.java`
- Modify: `backend/src/test/java/com/spacetime/common/database/MessageSchemaSqlTest.java`

- [x] Change assertions to require `payloadJson` and evidence `contentText`.
- [x] Assert report viewing still begins and completes an audit record.
- [x] Run focused tests and verify they fail because plaintext fields/constructors do not exist yet.

### Task 2: Replace encrypted event payloads

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppMessageEventInbox.java`
- Modify: `backend/src/main/java/com/spacetime/common/service/impl/MessageEventPublisherImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/service/impl/SystemMessageEventHandler.java`
- Modify: `backend/src/main/java/com/spacetime/common/mapper/AppMessageEventInboxMapper.java`

- [x] Serialize `SystemMessageEventPayload` into `payloadJson` without Cipher.
- [x] Parse `payloadJson` in the handler.
- [x] Clear `payload_json` on success, dead-letter, and expiry.
- [x] Run publisher, Inbox, handler, and domain tests until green.

### Task 3: Replace encrypted report evidence

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/entity/CommunityReportEvidence.java`
- Modify: `backend/src/main/java/com/spacetime/common/service/impl/ChatReportEvidenceServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/MessageReportEvidenceAdminServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/dto/response/ReportEvidenceVO.java`
- Modify: `frontend/src/api/community.ts`

- [x] Store the frozen source text in `contentText`.
- [x] Read `contentText` only after case permission, reason, and audit checks.
- [x] Remove HMAC metadata from the admin contract.
- [x] Run evidence service tests until green.

### Task 4: Remove legacy Cipher dependencies

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppSystemMessage.java`
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppAssistantMessage.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappMessageServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/MessageRecordAdminServiceImpl.java`
- Delete: `backend/src/main/java/com/spacetime/common/provider/SensitiveTextCipher.java`
- Delete: `backend/src/main/java/com/spacetime/common/provider/LocalAesSensitiveTextCipher.java`
- Delete: `backend/src/main/java/com/spacetime/common/provider/ProductionSensitiveTextCipherGate.java`
- Delete: `backend/src/main/java/com/spacetime/common/model/message/EncryptedMessageContent.java`
- Delete obsolete provider tests.

- [x] Make system/assistant readers use plaintext fields only.
- [x] Remove provider classes and constructor dependencies.
- [x] Verify `prod` no longer creates a KMS failure gate.

### Task 5: Align SQL, configuration, and documentation

**Files:**
- Modify: `deploy/sql/prod/070_prd03_message_center_closure.sql`
- Create: `deploy/sql/prod/074_prd03_remove_message_kms.sql`
- Modify: `backend/src/main/resources/application.yml`
- Modify PRD-03 requirement, technical design, handoff, testcase, and test report documents containing KMS gates.

- [x] Update fresh-install schema to plaintext fields.
- [x] Add an idempotent upgrade migration for existing databases.
- [x] Remove `MESSAGE_TEXT_*` configuration and KMS gate wording.
- [x] Verify migration comments and no remaining runtime Cipher references.

### Task 6: Regression verification

- [x] Run focused PRD-03 unit and contract tests.
- [x] Run backend Maven tests.
- [x] Run frontend build because the admin API type changes.
- [x] Run `git diff --check` and inspect the final diff for secrets or unrelated changes.
