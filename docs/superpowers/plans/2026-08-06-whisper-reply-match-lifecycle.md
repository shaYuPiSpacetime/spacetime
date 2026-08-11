# Whisper Reply Match Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved lifecycle in which replying to a pending whisper atomically creates or reuses a match and private conversation, moves the request out of both pending lists, and preserves the original request and reply as chat context.

**Architecture:** Persist whispers, conversations, members, and messages in the common domain using the existing `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` layering. A transactional common-domain service owns state transitions and calls the existing `RelationDomainService` with source `whisper_reply`; the miniapp layer only authenticates, validates transport input, and maps domain rows to API VOs.

**Tech Stack:** Java 21, Spring Boot 3.4, MyBatis-Plus, MySQL 8, JUnit 5, Mockito.

## Global Constraints

- Never physically delete whisper records; terminal states clear `active_marker`.
- Default incoming and outgoing whisper lists expose delivered, unexpired `pending` rows only.
- Reply, match, conversation, opening messages, unread projection, and whisper transition run in one transaction.
- The same reply request may be retried and must return the original result without duplicate matches, conversations, or messages.
- Expired or invalid whispers cannot be replied to and never create conversations.
- One active whisper per unordered user pair, one conversation per match lifecycle, and one active conversation per unordered user pair.
- Preserve existing user changes in the dirty worktree.

---

### Task 1: Database contract and persistence model

**Files:**
- Create: `deploy/sql/prod/065_prd03_whisper_match_conversation.sql`
- Create: `backend/src/main/java/com/spacetime/common/entity/AppMessageWhisper.java`
- Create: `backend/src/main/java/com/spacetime/common/entity/AppMessageConversation.java`
- Create: `backend/src/main/java/com/spacetime/common/entity/AppMessageConversationMember.java`
- Create: `backend/src/main/java/com/spacetime/common/entity/AppMessageRecord.java`
- Create: matching enum, mapper, DAO, and DAOImpl files under `backend/src/main/java/com/spacetime/common/`
- Test: `backend/src/test/java/com/spacetime/common/database/MessageSchemaSqlTest.java`

**Interfaces:**
- Produces row-lock lookup for whisper number, pending-list query, idempotency lookup, conversation lookup, ordered message history, and member unread updates.

- [x] Write a schema test asserting all four tables, Chinese enum comments, unique constraints, and no physical-delete workflow.
- [x] Run `mvn -Dtest=MessageSchemaSqlTest test` and confirm it fails before migration creation.
- [x] Add the migration and persistence classes with exact enum comments and indexes.
- [x] Re-run the schema test and compile the backend.

### Task 2: Transactional whisper lifecycle

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/service/MessageDomainService.java`
- Create: `backend/src/main/java/com/spacetime/common/service/impl/MessageDomainServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/common/service/MessageDomainServiceImplTest.java`

**Interfaces:**
- Produces the approved `replyWhisper(...)` state transition; sending payment and IM delivery remain a separate release gate.
- Consumes `RelationDomainService.addMatchSource(..., "whisper_reply", whisperNo, repliedAt)`.

- [x] Write failing tests for successful reply, same-request retry, changed-content rejection, expired rejection, invalid rejection, and account/block denial.
- [x] Run the focused test and confirm the expected failures.
- [x] Implement row locking and the single transaction: save reply, add/reuse match, add/reuse conversation and members, append original whisper plus reply messages, set sender unread to one, and transition `pending -> replied`.
- [x] Run the focused test until green.

### Task 3: Miniapp query and command APIs

**Files:**
- Create: `backend/src/main/java/com/spacetime/miniapp/controller/MiniappMessageController.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/MiniappMessageService.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappMessageServiceImpl.java`
- Create: request/response DTOs under `backend/src/main/java/com/spacetime/miniapp/dto/`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/MiniappMessageServiceImplTest.java`

**Interfaces:**
- `GET /miniapp/message/whispers?direction=received|sent&cursor=&size=`
- `GET /miniapp/message/whispers/{whisperNo}`
- `POST /miniapp/message/whispers/{whisperNo}/reply`
- `GET /miniapp/message/conversations`
- `GET /miniapp/message/conversations/{conversationNo}`
- `POST /miniapp/message/conversations/{conversationNo}/messages`
- `POST /miniapp/message/conversations/{conversationNo}/messages/read-batch`

- [x] Write failing service tests proving default lists return pending only and replied records move to conversation history.
- [x] Run the focused test and confirm it fails.
- [x] Implement authenticated controllers, input validation, cursor paging, user summaries, conversation opening history, normal text send, and read acknowledgement.
- [x] Run focused service/controller tests until green.

### Task 4: Expiry and contract documentation

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/task/MessageWhisperExpireTask.java`
- Modify: `docs/技术方案/2026-07-31-消息、私信与通知中心-mobile-api-handoff.md`
- Test: `backend/src/test/java/com/spacetime/common/task/MessageWhisperExpireTaskTest.java`

**Interfaces:**
- Produces a scheduled CAS/bulk transition from overdue `pending` to `expired`, clearing `active_marker` without creating match or conversation.

- [x] Write the failing expiry test.
- [x] Implement the expiry DAO operation and scheduled task.
- [x] Update handoff documentation to state that default lists are pending-only, reply is acceptance, completed whispers are retained only as conversation context/history, and retries are idempotent.
- [x] Run focused tests and scan documentation for obsolete completed-list behavior.

### Task 5: Verification

**Files:**
- Update only if execution requires corrections in files created above.

- [x] Run all PRD-03 focused JUnit tests.
- [x] Run `mvn test` with JDK 21.
- [x] Inspect `git diff --check` and the scoped diff for accidental changes.
- [x] Report implemented endpoints, schema changes, test results, and any explicitly deferred PRD-03 capabilities.
