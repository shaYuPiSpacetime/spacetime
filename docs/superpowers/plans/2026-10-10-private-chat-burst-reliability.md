# Private Chat Burst Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 99+ message bursts ordered, complete, and reflected in the global unread badge without regressing chat scroll smoothness.

**Architecture:** Preserve TIM ordering metadata on normalized messages, keep independent platform/TIM history cursors in the retained chat session, and refresh only unread summary data on a foreground timer. Existing incremental merge and scroll anchors remain the rendering boundary.

**Tech Stack:** Taro 4, React 18, TypeScript, Zustand, Tencent LiteChat 4.4, Node test runner.

## Global Constraints

- Work only on `master` after syncing `origin/master`.
- Do not clear or replace the rendered message list during refresh or pagination.
- Do not load LiteChat SDK in the main package solely for unread badges.
- Preserve unrelated dirty worktree changes.

---

### Task 1: Stable burst ordering

**Files:**
- Modify: `miniapp/src/types/message.ts`
- Modify: `miniapp/src/im/LiteChatMessageImGateway.ts`
- Modify: `miniapp/src/domain/privateChatSession.ts`
- Test: `miniapp/scripts/test-private-chat-session.cjs`

**Interfaces:**
- Produces: optional `providerSequence` and `providerRandom` fields on `ChatMessage`.
- Consumes: Tencent message `sequence`, `random`, timestamp and stable identifiers.

- [x] Add a failing test that merges 120 same-second messages in reversed batches and expects provider sequence order.
- [x] Run `node --test scripts/test-private-chat-session.cjs` and confirm the ordering assertion fails.
- [x] Preserve TIM ordering fields and compare time, sequence, random, then stable identity.
- [x] Re-run the focused test and confirm it passes.

### Task 2: Dual-source history pagination

**Files:**
- Modify: `miniapp/src/domain/privateChatSession.ts`
- Modify: `miniapp/src/pages/message/private-chat.tsx`
- Test: `miniapp/scripts/test-private-chat-performance.cjs`

**Interfaces:**
- Produces: `timHistoryCursor` and `timHistoryCompleted` in retained session state.
- Consumes: `MessageImGateway.listHistory(timConversationId, cursor)` and platform history cursor.

- [x] Replace the old static test with a failing assertion that load-earlier can request both unfinished sources and persists the TIM cursor.
- [x] Run `node --test scripts/test-private-chat-performance.cjs` and confirm failure.
- [x] Store the first TIM page cursor during initial load, including delayed supplementation.
- [x] On scroll-to-top, fetch one page from every unfinished source in parallel, merge incrementally, and retain the anchor.
- [x] Re-run the focused test and confirm it passes.

### Task 3: Foreground unread refresh

**Files:**
- Modify: `miniapp/src/services/messagePlatformRuntime.ts`
- Modify: `miniapp/src/app.tsx`
- Create: `miniapp/scripts/test-message-platform-runtime.cjs`
- Modify: `miniapp/package.json`

**Interfaces:**
- Produces: `MessagePlatformRuntime.onBackground()` and foreground polling with request re-entry protection.
- Consumes: `messageService.getUnreadSummary()` and Zustand `applyUnread`.

- [x] Add a failing source/runtime test requiring foreground start, background stop, and no chat-history reload.
- [x] Run the focused test and confirm failure.
- [x] Add one immediate unread refresh after home load and a foreground-only interval; stop it on hide/logout.
- [x] Re-run the focused test and confirm it passes.

### Task 4: Regression verification

**Files:**
- Create: `docs/测试文档/私信突发消息可靠性-20261010-testcase.md`
- Create: `docs/测试文档/私信突发消息可靠性-20261010-testreport.md`

- [x] Run focused Node tests for session merge, chat performance, and platform runtime.
- [x] Run `npm run validate:message-closure`.
- [x] Run TypeScript/build verification if the repository environment permits it.
- [x] Record commands, counts, failures, and skipped device-only checks in the test report.
