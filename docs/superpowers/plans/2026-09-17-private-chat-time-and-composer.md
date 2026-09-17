# Private Chat Time and Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display sparse, contextual private-chat timestamps and keep the keyboard/composer stable during repeated sends.

**Architecture:** The existing message list remains authoritative. A pure domain formatter compares adjacent timestamps using local dates. The existing Taro page uses keyboard height to reserve room for the composer and scrolls to an existing bottom anchor after sends.

**Tech Stack:** Taro 4.1.9, React 18, TypeScript, Node test runner, SCSS.

## Global Constraints

- Preserve unrelated dirty-worktree changes; do not change backend or existing moderation.
- Today is determined by device-local calendar date; the gap condition is strictly greater than 600000 milliseconds.
- Do not hide and reopen the keyboard after pressing Send.
- Do not auto-scroll when older history pages are prepended.

---

### Task 1: Contextual timestamps

**Files:** Modify `miniapp/src/domain/messageRuntime.ts`, `miniapp/src/pages/message/private-chat.tsx`, `miniapp/scripts/test-message-mobile-api-closure.cjs`.

**Interfaces:** Extend `formatPrivateChatTime(value: string, previousValue?: string, now?: Date): string`. An empty string means no timestamp label.

- [x] **Step 1: Write failing tests** for first message, same-day 10-minute and 10-minute-plus-one-second gaps, cross-day history, same-day history, and invalid values. Update the page-source assertion to require passing the preceding message timestamp.
- [x] **Step 2: Run `node --test scripts/test-message-mobile-api-closure.cjs` from `miniapp/` and confirm the new assertions fail for the old all-messages formatter.**
- [x] **Step 3: Implement local-day comparison and period text in the formatter; pass `messages[index - 1]?.sentAt` from the message map.**
- [x] **Step 4: Re-run the same test and confirm zero failures.**

### Task 2: Stable keyboard and visible latest message

**Files:** Modify `miniapp/src/pages/message/private-chat.tsx`, `miniapp/scripts/test-message-mobile-api-closure.cjs`; reuse existing layout rules in `miniapp/src/pages/message/message.scss`.

**Interfaces:** `keyboardHeight` in CSS pixels controls composer `bottom` and message viewport height; `requestScrollToLatest()` reuses the page's two existing anchors.

- [x] **Step 1: Write failing source-contract tests** requiring `holdKeyboard`, `adjustPosition={false}`, keyboard height listeners, composer/scroll style usage, and a post-send bottom-scroll request; prohibit the `setInputFocused(false)` then `setTimeout(...true...)` bounce.
- [x] **Step 2: Run the focused test and confirm it fails on the current keyboard behavior.**
- [x] **Step 3: Remove the focus bounce, keep keyboard focus, track keyboard height, reserve keyboard room in scroll/composer styles, and request bottom scroll after send and keyboard opening.**
- [x] **Step 4: Re-run focused tests; run `npm run validate:message-closure` and a WeChat build from `miniapp/`.**

### Task 3: Final review

**Files:** No further planned production files.

- [x] **Step 1: Review `git diff --check` and the scoped diff for unrelated changes or accidental regressions.**
- [x] **Step 2: Report automated results and the remaining iOS/Android real-device keyboard verification requirement.**
