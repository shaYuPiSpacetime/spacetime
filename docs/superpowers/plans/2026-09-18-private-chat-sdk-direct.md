# Private Chat SDK Direct Send Implementation Plan

**Goal:** Restore direct LiteChat SDK sending for ordinary private text while preserving callback-based database archiving and the improved composer interaction.

**Architecture:** The miniapp sends ordinary text through `MessageImGateway`; Tencent IM after-send callbacks remain the database source. Existing backend reliable-send APIs stay available for non-normal/fallback flows but are removed from the ordinary chat page.

**Tech Stack:** Taro React TypeScript, Tencent LiteChat, Spring Boot 3.4, JUnit 5, Node test runner.

## Global Constraints

- Keep `C2C.CallbackBeforeSendMsg`, `C2C.CallbackAfterSendMsg`, and read-report callback compatibility.
- Do not reintroduce a visible “私信连接中” status strip.
- Do not overwrite text entered after an earlier send fails.
- Do not stage or commit unrelated dirty-worktree files.

---

### Task 1: Lock direct-send behavior with regression tests

**Files:**
- Modify: `miniapp/scripts/test-private-chat-performance.cjs`
- Modify: `miniapp/scripts/test-message-mobile-api-closure.cjs`

**Interfaces:**
- Consumes: `MessageImGateway.sendText(timConversationId, content)` and `retry(timConversationId, clientMsgId)`.
- Produces: static regression gates proving the chat page uses SDK direct send and does not use the backend send endpoint.

- [x] Add assertions for `gateway.sendText`, `gateway.retry`, immediate input clearing, and absence of the connection strip.
- [x] Run `node --test scripts/test-private-chat-performance.cjs` and confirm it fails against backend-send code.
- [x] Update the implementation in Task 2.
- [x] Run `npm run validate:message-closure` and expect 36 passing tests.

### Task 2: Restore SDK direct send without regressing composer UX

**Files:**
- Modify: `miniapp/src/pages/message/private-chat.tsx`
- Modify: `miniapp/src/pages/message/message.scss`

**Interfaces:**
- Consumes: `ensureConnected(): Promise<MessageImGateway>` and the page's `timConversationId`.
- Produces: direct SDK send/retry, immediate input clearing, keyboard retention, and failure state updates.

- [x] Clear the input before the network send and keep `holdKeyboard`/`confirmHold` enabled.
- [x] Call `gateway.sendText(timConversationId, value)` and merge its returned message.
- [x] Retry with `gateway.retry`; on TIM 20003 refresh the conversation mapping and retry once.
- [x] Keep the send button available for consecutive messages and never render `chat-connection-state`.
- [x] Run `npx eslint src/pages/message/private-chat.tsx` and expect exit code 0.

### Task 3: Verify callback persistence and package

**Files:**
- Test: `backend/src/test/java/com/spacetime/common/service/TencentImCallbackServiceImplTest.java`
- Build output: `miniapp/dist/`

**Interfaces:**
- Consumes: `C2C.CallbackAfterSendMsg`, callback signature verification, and `MsgKey` idempotency.
- Produces: verified callback archive behavior and a release-ready miniapp bundle.

- [x] Run the focused Tencent callback test class with Java 21 and expect zero failures.
- [x] Run the message-domain tests and expect zero failures.
- [x] Run the direct Taro production build and the three built-artifact gates.
- [ ] Stage only files listed by this plan, commit with a conventional message, push `master`, and upload a new miniapp experience version.
