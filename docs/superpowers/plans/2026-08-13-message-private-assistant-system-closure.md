# Private Chat, Assistant And System Message Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the PRD-03 backend contract for private chat, official assistant and system messages, then publish a field-complete mobile handoff document and verified test report.

**Architecture:** Tencent IM remains the real-time send, receive and roaming-history channel for ordinary private chat. The platform database remains the source of truth for conversation access, latest-message projection, unread projection, message archive and report evidence. Official assistant and system messages remain platform-native feeds and do not use TIM.

**Tech Stack:** Java 21, Spring Boot 3.4, MyBatis-Plus, MySQL, Tencent IM callbacks, JUnit 5, Mockito and MockMvc.

## Global Constraints

- Do not create or modify miniapp frontend code.
- Preserve `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper`.
- The message home and conversation list must not depend on TIM account readiness.
- Ordinary private-message history is loaded from TIM; the platform API does not expose a second chat-history feed.
- Failed messages that never reached TIM belong to the miniapp local Outbox contract and are documented only in this backend delivery.
- API DTOs and the mobile handoff document must stay field-for-field consistent.

---

### Task 1: Lock The Mobile Contract With Failing Tests

**Files:**
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/MiniappMessageServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/common/service/impl/TencentImCallbackServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/common/service/MessageNotificationDomainServiceImplTest.java`

- [ ] Add assertions for `accessMode`, chat-report context, report actions and female-protection expiry.
- [ ] Add assistant assertions for `cardType` and `actionText`.
- [ ] Add system-message assertions for `contentFormat` and `actionText`.
- [ ] Add a TIM `C2C.CallbackAfterMsgReport` test that advances platform read state by conversation and timestamp.
- [ ] Run the focused tests and verify they fail for the missing contract.

### Task 2: Implement Private Chat Contract And TIM Read Synchronization

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/MessageConversationDetailVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/MessageFemaleProtectionVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/MessageReportContextVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappMessageServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/AppMessageRecordDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/AppMessageRecordDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/mapper/AppMessageRecordMapper.java`
- Modify: `backend/src/main/java/com/spacetime/common/service/impl/TencentImCallbackServiceImpl.java`

- [ ] Return normal or safety-readonly access without exposing a second history API.
- [ ] Return chat-report availability and only the minimum trusted locator fields.
- [ ] Return the snapshotted female-protection deadline.
- [ ] Accept and verify the TIM conversation-level read callback.
- [ ] Mark sent incoming platform records at or before `LastReadTime` as read, idempotently.
- [ ] Run focused tests until green.

### Task 3: Implement Assistant And System Display Metadata

**Files:**
- Modify: message template, assistant-message and system-message entities.
- Modify: admin template publish request/response and validation.
- Modify: message materialization and miniapp response mapping.
- Modify: `deploy/sql/prod/070_prd03_message_center_closure.sql`.
- Create: `deploy/sql/prod/071_prd03_message_mobile_contract.sql`.

- [ ] Snapshot `cardType`, `contentFormat` and action text with each generated message.
- [ ] Keep old template requests compatible by applying explicit defaults.
- [ ] Validate supported enums and action-text constraints.
- [ ] Return all fields needed to render text, action and tip cards.
- [ ] Run template and miniapp service tests until green.

### Task 4: Rewrite The Mobile Handoff Document

**Files:**
- Modify: `docs/技术方案/2026-07-31-消息、私信与通知中心-mobile-api-handoff.md`

- [ ] Remove obsolete routes, duplicate explanations and fields absent from code.
- [ ] Document every request and response field in Chinese.
- [ ] Document message-home, whisper, private-chat, assistant, system-message and report flows.
- [ ] Clearly separate platform APIs, TIM SDK calls and miniapp-local Outbox responsibilities.
- [ ] Include pagination, sorting, read acknowledgement, retry, safety-readonly and error handling.

### Task 5: Verify And Report

**Files:**
- Modify: `docs/测试文档/消息私信通知中心-testcase.md`
- Modify: `docs/测试文档/消息私信通知中心-testreport.md`

- [ ] Run focused L2/L3 tests.
- [ ] Run the complete backend Maven test suite.
- [ ] Update the independent test report with exact commands and results.
- [ ] Verify `git diff -- miniapp` is empty.
