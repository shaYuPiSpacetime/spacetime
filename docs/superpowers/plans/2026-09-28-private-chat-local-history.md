# Private Chat Local History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display durable private-chat history from `app_message_record` while keeping Tencent IM as the direct real-time transport.

**Architecture:** Add an authenticated cursor-paged miniapp history endpoint over the existing message record DAO. Load that page independently from TIM, render it first, then merge the recent TIM page with stable provider IDs; use local pages for all upward pagination.

**Tech Stack:** Java 21, Spring Boot 3.4, MyBatis-Plus, JUnit 5/Mockito, Taro React, TypeScript, Node test runner.

## Global Constraints

- Preserve `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper`.
- Ordinary text sending remains `gateway.sendText`; the history change must not put the backend in the send path.
- Preserve unrelated dirty-worktree changes.
- Do not expose internal user IDs or secrets.

---

### Task 1: Authenticated local history page

**Files:**
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/MessageHistoryItemVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/MessageHistoryPageVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/controller/MiniappMessageController.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/MiniappMessageService.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappMessageServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/MiniappMessageServiceImplTest.java`

**Interfaces:**
- Produces: `MessageHistoryPageVO conversationMessages(Long userId, String conversationNo, String cursor, int size)`.
- Produces: `GET /miniapp/message/conversations/{conversationNo}/messages?cursor=&size=`.

- [x] Add a failing service test for membership validation, descending DAO pagination, ascending response order, direction mapping, and bound next cursor.
- [x] Run the focused test and confirm failure because the method and DTOs are absent.
- [x] Implement DTOs, service mapping, bound cursor, and controller endpoint.
- [x] Run focused backend tests and confirm pass.

### Task 2: Non-blocking local/TIM merge in miniapp

**Files:**
- Modify: `miniapp/src/types/message.ts`
- Modify: `miniapp/src/services/message.ts`
- Modify: `miniapp/src/pages/message/private-chat.tsx`
- Modify: `miniapp/scripts/test-private-chat-performance.cjs`

**Interfaces:**
- Consumes: `listConversationMessages(conversationNo, cursor?, size?)`.
- Produces: local-first initial render, TIM recent merge, and local-only upward pagination.

- [x] Add failing source-contract assertions for the local history service and local-first page wiring.
- [x] Run the focused Node test and confirm failure.
- [x] Add page types/service mapping and replace TIM-only history state with local cursor state.
- [x] Keep TIM initial merge and all direct-send behavior unchanged.
- [x] Run Node regression tests, TypeScript/build checks, and inspect the focused diff.
