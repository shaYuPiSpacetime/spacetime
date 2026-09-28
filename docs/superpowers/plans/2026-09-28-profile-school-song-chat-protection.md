# Profile, School, Song, and Chat Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace song search with manual song-name entry, require school dictionary selection, show both users' real chat avatars, and enforce fast client-side male one-message-per-female-reply protection restored from the local message database.

**Architecture:** Ordinary messages remain a direct miniapp-to-Tencent-IM flow. The backend conversation-detail query derives the protection state from the conversation's latest persisted user message, while the miniapp updates that state immediately after outgoing/incoming IM events. Existing school dictionary search is retained and becomes mandatory at both client and backend boundaries.

**Tech Stack:** Java 21, Spring Boot 3.4, MyBatis-Plus, JUnit 5/Mockito, React 18, TypeScript, Taro, Node test runner.

## Global Constraints

- Do not change location or hometown province/city/district behavior.
- Do not add a new school table or school provider.
- Do not add a backend request before each ordinary private message send.
- Do not require Tencent IM `C2C.CallbackBeforeSendMsg` for the new rule.
- Preserve all unrelated dirty-worktree changes and stage only files owned by each task.
- Every production change starts with a failing focused test.

---

### Task 1: Manual Favorite Song Name

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/FavoriteSongSaveReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/ProfileServiceImpl.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/impl/ProfileServiceImplTest.java`
- Modify: `miniapp/src/services/prd01.ts`
- Modify: `miniapp/src/pages/profile-edit/songs.tsx`
- Create: `miniapp/scripts/test-profile-song-school-chat-protection.cjs`

**Interfaces:**
- Consumes: existing `PUT /miniapp/profile/favorite-song`.
- Produces: request `{ songName: string }`; successful save clears legacy song ID, artist, and cover metadata.

- [ ] **Step 1: Write failing backend and miniapp tests**

```java
@Test
void shouldSaveManualSongNameAndClearProviderMetadata() {
    FavoriteSongSaveReq req = new FavoriteSongSaveReq();
    req.setSongName("  晴天  ");
    service.saveFavoriteSong(7L, req);
    assertThat(user.getFavoriteSongName()).isEqualTo("晴天");
    assertThat(user.getFavoriteSongId()).isNull();
    assertThat(user.getFavoriteSongArtist()).isNull();
    assertThat(user.getFavoriteSongCoverUrl()).isNull();
}
```

The Node contract test must assert that `songs.tsx` has a plain input/save flow and no call to `searchSongs`.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd backend; mvn -Dtest=ProfileServiceImplTest test`

Run: `cd miniapp; node --test scripts/test-profile-song-school-chat-protection.cjs`

Expected: backend rejects missing `songId`; miniapp contract still finds song search/list code.

- [ ] **Step 3: Implement the minimal song-name flow**

```java
String songName = trimToNull(req == null ? null : req.getSongName());
if (songName == null || songName.length() > 100) {
    throw new BusinessException("歌曲名称需1-100个字符");
}
user.setFavoriteSongId(null);
user.setFavoriteSongName(songName);
user.setFavoriteSongArtist(null);
user.setFavoriteSongCoverUrl(null);
```

Rewrite the miniapp page as one controlled `Input` plus one save button; keep the current page shell/navigation.

- [ ] **Step 4: Re-run focused tests and verify GREEN**

Use the commands from Step 2. Expected: PASS.

- [ ] **Step 5: Commit only Task 1 files**

```bash
git add backend/src/main/java/com/spacetime/miniapp/dto/request/FavoriteSongSaveReq.java backend/src/main/java/com/spacetime/miniapp/service/impl/ProfileServiceImpl.java backend/src/test/java/com/spacetime/miniapp/service/impl/ProfileServiceImplTest.java miniapp/src/services/prd01.ts miniapp/src/pages/profile-edit/songs.tsx miniapp/scripts/test-profile-song-school-chat-protection.cjs
git commit -m "feat(profile): support manual favorite song names"
```

### Task 2: Require a Selected School Dictionary Entry

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/dao/SchoolDictionaryDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/SchoolDictionaryDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/SchoolDictionaryService.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/SchoolDictionaryServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/ProfileServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/VerificationServiceImpl.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/SchoolDictionaryServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/impl/ProfileServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/VerificationServiceImplTest.java`
- Modify: `miniapp/src/components/SchoolSearchInput.tsx`
- Modify: `miniapp/src/pages/verification/components/BasicInfoCard.tsx`
- Modify: `miniapp/src/pages/verification/components/EducationSubmitPage.tsx`
- Modify: `miniapp/scripts/test-profile-song-school-chat-protection.cjs`

**Interfaces:**
- Produces: `SchoolDictionaryService.requireSelection(String name, String code): SchoolOptionVO`.
- Consumes: existing `school_dictionary` rows whose public code is `school_code`, falling back to `provider_uuid` for existing rows without a school code.

- [ ] **Step 1: Write failing dictionary/service/UI tests**

```java
@Test
void shouldRejectManualSchoolWithoutDictionaryCode() {
    assertThatThrownBy(() -> service.requireSelection("野鸡大学", null))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("请从搜索结果中选择学校");
}
```

Add tests for known code/name success, unknown code, and mismatched name. Add Node assertions that both basic-profile and education submit require a selected code.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd backend; mvn -Dtest=SchoolDictionaryServiceImplTest,ProfileServiceImplTest,VerificationServiceImplTest test`

Run: `cd miniapp; node --test scripts/test-profile-song-school-chat-protection.cjs`

Expected: `requireSelection` is missing and current UI permits name-only confirmation.

- [ ] **Step 3: Implement dictionary lookup and normalization**

```java
SchoolDictionary selectByCode(String code);

SchoolOptionVO requireSelection(String name, String code);
```

Lookup must match either `schoolCode` or `providerUuid`, require the normalized input name to equal the dictionary name, and return the dictionary's canonical public code and name. Use the returned values when saving the basic profile and education audit record.

- [ ] **Step 4: Enforce selected-code state in both miniapp entry points**

`SchoolSearchInput` continues clearing the code on every keystroke. Basic-profile confirmation shows `请从搜索结果中选择学校` when code is empty. Education `canSubmit` requires both non-empty name and code.

- [ ] **Step 5: Re-run focused tests and verify GREEN**

Use the commands from Step 2. Expected: PASS.

- [ ] **Step 6: Commit only Task 2 files**

```bash
git add backend/src/main/java/com/spacetime/common/dao/SchoolDictionaryDao.java backend/src/main/java/com/spacetime/common/dao/impl/SchoolDictionaryDaoImpl.java backend/src/main/java/com/spacetime/miniapp/service/SchoolDictionaryService.java backend/src/main/java/com/spacetime/miniapp/service/impl/SchoolDictionaryServiceImpl.java backend/src/main/java/com/spacetime/miniapp/service/impl/ProfileServiceImpl.java backend/src/main/java/com/spacetime/miniapp/service/impl/VerificationServiceImpl.java backend/src/test/java/com/spacetime/miniapp/service/SchoolDictionaryServiceImplTest.java backend/src/test/java/com/spacetime/miniapp/service/impl/ProfileServiceImplTest.java backend/src/test/java/com/spacetime/miniapp/service/VerificationServiceImplTest.java miniapp/src/components/SchoolSearchInput.tsx miniapp/src/pages/verification/components/BasicInfoCard.tsx miniapp/src/pages/verification/components/EducationSubmitPage.tsx miniapp/scripts/test-profile-song-school-chat-protection.cjs
git commit -m "feat(profile): require school dictionary selection"
```

### Task 3: Derive Chat Protection and Return Both Avatars

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/MessageConversationDetailVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/MessageFemaleProtectionVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappMessageServiceImpl.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/MiniappMessageServiceImplTest.java`

**Interfaces:**
- Produces: `selfAvatarUrl`, `femaleProtection.appliesToCurrentUser`, and `femaleProtection.waitingForFemaleReply` in conversation detail.
- Consumes: `AppMessageConversation.lastMessageId` and `AppMessageRecordDao.selectById`.

- [ ] **Step 1: Replace old-rule tests with failing one-message-per-reply tests**

```java
@Test
void maleShouldWaitOnlyWhenLatestMessageWasSentByMale() {
    conversation.setProtectionEnabled(1);
    conversation.setMaleUserId(1L);
    conversation.setLastMessageId(41L);
    lastMessage.setSenderUserId(1L);
    when(recordDao.selectById(41L)).thenReturn(lastMessage);
    MessageConversationDetailVO result = service.conversationDetail(1L, "CV-1");
    assertThat(result.getCanSend()).isFalse();
    assertThat(result.getSendBlockedReason()).isEqualTo("female_reply_pending");
}
```

Add cases for no last message, last sender female, current user female, expired protection, and distinct self/peer avatar URLs.

- [ ] **Step 2: Run the focused backend test and verify RED**

Run: `cd backend; mvn -Dtest=MiniappMessageServiceImplTest test`

Expected: existing first-female-message behavior fails the new assertions and `selfAvatarUrl` is absent.

- [ ] **Step 3: Implement database-derived send permission**

```java
private SendPermission sendPermission(AppMessageConversation conversation, Long userId, LocalDateTime now) {
    boolean applies = protectionActive(conversation, now)
        && Objects.equals(userId, conversation.getMaleUserId());
    AppMessageRecord last = conversation.getLastMessageId() == null
        ? null : recordDao.selectById(conversation.getLastMessageId());
    boolean waiting = applies && last != null
        && Objects.equals(last.getSenderUserId(), conversation.getMaleUserId());
    return waiting
        ? new SendPermission(true, false, "female_reply_pending")
        : new SendPermission(true, true, null);
}
```

Populate `selfAvatarUrl` from `auditContentService.publicAvatar(userId)`. Remove the old `waitingForFemaleFirstMessage` response field.

- [ ] **Step 4: Re-run focused tests and verify GREEN**

Use the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit only Task 3 files**

```bash
git add backend/src/main/java/com/spacetime/miniapp/dto/response/MessageConversationDetailVO.java backend/src/main/java/com/spacetime/miniapp/dto/response/MessageFemaleProtectionVO.java backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappMessageServiceImpl.java backend/src/test/java/com/spacetime/miniapp/service/MiniappMessageServiceImplTest.java
git commit -m "feat(message): enforce one-message-per-reply protection"
```

### Task 4: Apply Real Avatars and Immediate Chat Locking in the Miniapp

**Files:**
- Modify: `miniapp/src/types/message.ts`
- Modify: `miniapp/src/domain/messageRuntime.ts`
- Modify: `miniapp/src/pages/message/private-chat.tsx`
- Modify: `miniapp/scripts/test-message-domain.cjs`
- Modify: `miniapp/scripts/test-private-chat-performance.cjs`
- Modify: `miniapp/scripts/test-profile-song-school-chat-protection.cjs`
- Modify: `frontend/src/pages/message/MessageConfigPage.tsx`

**Interfaces:**
- Consumes: Task 3 conversation fields.
- Produces: immediate local lock after male send and immediate unlock after an incoming message.

- [ ] **Step 1: Add failing miniapp contract/runtime tests**

The tests must assert:

```js
assert.match(chat, /detail\?\.selfAvatarUrl \|\| MESSAGE_AVATAR/)
assert.match(chat, /female_reply_pending/)
assert.match(chat, /setSending\(true\)/)
assert.doesNotMatch(chat, /gateway\.sendText[\s\S]{0,300}messageService\.send/)
```

Also assert the admin copy describes one message followed by a required female reply.

- [ ] **Step 2: Run focused Node tests and verify RED**

Run: `cd miniapp; node --test scripts/test-message-domain.cjs scripts/test-private-chat-performance.cjs scripts/test-profile-song-school-chat-protection.cjs`

Expected: real self-avatar and local one-message lock assertions fail.

- [ ] **Step 3: Implement the miniapp state transitions**

- Add a `sending` guard to prevent double taps.
- On successful outgoing send, when `appliesToCurrentUser` is true, set `canSend=false`, `sendBlockedReason='female_reply_pending'`, and `waitingForFemaleReply=true`.
- On failed send, restore the original input and permission state.
- In the existing gateway incoming-message handler, set `canSend=true`, clear the reason, and set `waitingForFemaleReply=false`.
- Render outgoing avatars from `detail.selfAvatarUrl`; keep peer avatars unchanged.
- Keep `gateway.sendText` as the only ordinary-message sending call.

- [ ] **Step 4: Update admin explanatory copy**

Use: `保护期内男方每发送一条消息后，需等待女方回复才能继续发送；仅影响启用保护的新会话。`

- [ ] **Step 5: Re-run focused tests and verify GREEN**

Use the command from Step 2. Expected: PASS.

- [ ] **Step 6: Commit only Task 4 files**

```bash
git add miniapp/src/types/message.ts miniapp/src/domain/messageRuntime.ts miniapp/src/pages/message/private-chat.tsx miniapp/scripts/test-message-domain.cjs miniapp/scripts/test-private-chat-performance.cjs miniapp/scripts/test-profile-song-school-chat-protection.cjs frontend/src/pages/message/MessageConfigPage.tsx
git commit -m "fix(message): keep chat fast while waiting for replies"
```

### Task 5: Regression Verification

**Files:**
- Verify only; no production edits unless a test exposes a regression.

- [ ] **Step 1: Run focused backend tests**

Run: `cd backend; mvn -Dtest=ProfileServiceImplTest,SchoolDictionaryServiceImplTest,VerificationServiceImplTest,MiniappMessageServiceImplTest test`

Expected: PASS.

- [ ] **Step 2: Run focused miniapp tests**

Run: `cd miniapp; node --test scripts/test-profile-song-school-chat-protection.cjs scripts/test-message-domain.cjs scripts/test-private-chat-performance.cjs scripts/test-school-search-integration.cjs scripts/test-profile-edit-closure.cjs`

Expected: PASS.

- [ ] **Step 3: Build the miniapp**

Run: `cd miniapp; npm run build:weapp`

Expected: build and release gates PASS.

- [ ] **Step 4: Build the admin frontend**

Run: `cd frontend; npm run build`

Expected: PASS.

- [ ] **Step 5: Inspect final diff and working-tree ownership**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; unrelated pre-existing modifications and deletions remain untouched.
