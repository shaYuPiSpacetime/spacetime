# Private Chat Performance and Reliable Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make private chat enter/history scrolling stable and ensure every ordinary text message is persisted before Tencent IM delivery.

**Architecture:** Route ordinary text sends through the existing message record + delivery outbox pipeline. Keep TIM callbacks as idempotent final confirmation. Split the miniapp page load state and preserve scroll anchors while prepending history.

**Tech Stack:** Java 21, Spring Boot 3.4, MyBatis-Plus, JUnit 5/Mockito, Taro 4.1.9, React 18, TypeScript, Node test scripts.

## Global Constraints

- Preserve `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` boundaries.
- `admin/` and `miniapp/` must not import each other; shared message behavior stays in `common/`.
- Do not expose TIM secrets or callback tokens.
- Do not alter whisper, reporting, blocking, timestamp, or keyboard behavior.

---

### Task 1: Reliable ordinary private-message send

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/service/MessageDomainService.java`
- Modify: `backend/src/main/java/com/spacetime/common/service/impl/MessageDomainServiceImpl.java`
- Create: `backend/src/main/java/com/spacetime/common/model/message/PrivateMessageSendResult.java`
- Modify: `backend/src/test/java/com/spacetime/common/service/MessageDomainServiceImplTest.java`

**Interfaces:**
- Produces: `PrivateMessageSendResult sendPrivateMessage(Long senderUserId, String conversationNo, String clientMsgId, String content, LocalDateTime sentAt)`.

- [ ] Write tests for DB-first record/outbox creation, successful TIM mapping, idempotent replay, and unauthorized conversation.
- [ ] Run the focused test and confirm the new cases fail.
- [ ] Implement transactional preparation plus immediate existing Outbox processing.
- [ ] Run the focused test and confirm it passes.

### Task 2: Miniapp send API

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/controller/MiniappMessageController.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/MiniappMessageService.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappMessageServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/MessageSendReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/MessageSendVO.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/controller/MiniappMessageControllerContractTest.java`

**Interfaces:**
- Produces: `POST /miniapp/message/conversations/{conversationNo}/messages` with matching `Idempotency-Key` and `clientMsgId`.

- [ ] Add failing controller/service contract tests.
- [ ] Add the endpoint and response mapping.
- [ ] Run focused miniapp message tests.

### Task 3: Callback race and protocol safety

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/controller/TencentImCallbackController.java`
- Create: `backend/src/main/java/com/spacetime/common/controller/TencentImCallbackExceptionHandler.java`
- Modify: `backend/src/main/java/com/spacetime/common/service/impl/TencentImCallbackServiceImpl.java`
- Modify: `backend/src/test/java/com/spacetime/common/controller/TencentImCallbackControllerTest.java`
- Modify: `backend/src/test/java/com/spacetime/common/service/impl/TencentImCallbackServiceImplTest.java`

**Interfaces:**
- Consumes: `CloudCustomData.messageNo` emitted by `TencentInstantMessageProvider`.
- Produces: Tencent protocol JSON for controller binding failures and idempotent mapping confirmation for pre-created records.

- [ ] Add failing tests for missing query parameters and callback-before-provider race.
- [ ] Implement callback-specific exception translation and existing-record confirmation.
- [ ] Run focused callback tests.

### Task 4: Miniapp chat load and send integration

**Files:**
- Modify: `miniapp/src/services/message.ts`
- Modify: `miniapp/src/types/message.ts`
- Modify: `miniapp/src/pages/message/private-chat.tsx`
- Modify: `miniapp/src/pages/message/message.scss`
- Create/Modify: `miniapp/scripts/test-private-chat-performance.cjs`

**Interfaces:**
- Consumes: the reliable send API from Task 2.
- Produces: stable initial/latest scroll, anchored history prepend, and message-key deduplication.

- [ ] Add source-contract tests for split loading states, scroll anchoring, anchor restore, and backend send.
- [ ] Run the Node test and confirm it fails.
- [ ] Implement initial skeleton, independent history loader, scroll anchor restore, and service send.
- [ ] Run the focused test, TypeScript/build validation, and existing message closure tests.

### Task 5: Verification

**Files:**
- Update only task-specific test documentation if required by existing project gates.

- [ ] Run focused backend tests.
- [ ] Run `npm run validate:message-closure` in `miniapp`.
- [ ] Run the miniapp production build.
- [ ] Review `git diff` to ensure unrelated dirty-worktree files were not modified.
