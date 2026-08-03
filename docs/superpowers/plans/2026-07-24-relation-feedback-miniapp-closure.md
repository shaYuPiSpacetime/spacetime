# 关系反馈与互动链路小程序闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `2026-07-16-关系反馈与互动链路-mobile-api-handoff.md` 把喜欢我的、访客、相互喜欢、单条解锁、匹配弹层、主页喜欢和访问上报接入小程序真实接口。

**Architecture:** 在 `miniapp/src/services/relation.ts` 封装 PRD-02 真实接口，页面只消费服务层类型，不直接拼旧资产接口。`/pages/community/index` 负责喜欢/访客列表、游标已读、两步解锁和匹配弹层；`/pages/heart/mutual` 负责相互喜欢；`/pages/heart/user` 负责目标主页动作闭环。

**Tech Stack:** Taro 4、React 18、TypeScript、现有 `request.ts`、静态门禁脚本、微信小程序分包。

## Global Constraints

- 当前用户从登录上下文取得，客户端不得传当前用户 ID。
- 喜欢/访客单条解锁必须使用 `quote -> confirm` 两步接口，不得调用旧 `/miniapp/asset/unlock`。
- 喜欢列表首屏渲染成功后才提交 `readCursor`，后续分页必须传第 1 页 `readCursor` 作为 `snapshotCursor`。
- `displayStatus` 是前端模糊/清晰唯一判断依据，不得根据字段空值反推。
- `解锁全部` 走会员页，不遍历调用单条 confirm。
- 进入对方主页主体展示后再上报 `/miniapp/relation/visits`，同一次进入复用 `eventNo`。
- 保持小程序分包体积约束，不新增本地大图，非底部静态图标继续走 OSS。

---

### Task 1: 服务层和闭环门禁

**Files:**
- Create: `miniapp/src/services/relation.ts`
- Create: `miniapp/scripts/validate-relation-feedback-miniapp-closure.mjs`
- Modify: `miniapp/package.json`

**Interfaces:**
- Produces: `getLikesMePage(page, size, snapshotCursor?)`、`markLikesMeRead(readCursor)`、`getRecentViewersPage(page, size)`、`getMutualMatches(page, size)`、`sendRelationLike(targetUserId, sourceScene, requestId)`、`cancelRelationLike(targetUserId)`、`reportRelationVisit(targetUserId, sourceScene, eventNo)`、`getPendingMatchPopup()`、`markMatchPopupRead(matchNo, action)`、`quoteRelationUnlock(scene, targetBizType, targetBizNo)`、`confirmRelationUnlock(quoteToken, requestId)`。

- [x] **Step 1: Write the failing test**

```bash
node miniapp/scripts/validate-relation-feedback-miniapp-closure.mjs
```

Expected: FAIL，提示缺少 `miniapp/src/services/relation.ts` 或缺少真实接口调用。

- [x] **Step 2: Implement service layer**

封装 handoff 文档 11 个接口和页面所需类型。

- [x] **Step 3: Wire validation into build gates**

把门禁加入 `predev:weapp` 与 `prebuild:weapp`。

### Task 2: 心动主页列表、已读和单条解锁

**Files:**
- Modify: `miniapp/src/pages/community/index.tsx`

**Interfaces:**
- Consumes: Task 1 service functions and types.
- Produces: 真实喜欢/访客列表、首屏 `readCursor` 确认、分页 `snapshotCursor`、两步单条解锁、本地成功态、会员解锁入口。

- [x] **Step 1: Run validation red**

```bash
node miniapp/scripts/validate-relation-feedback-miniapp-closure.mjs
```

Expected: FAIL，提示心动页未使用 `getLikesMePage`、`markLikesMeRead`、`quoteRelationUnlock` 或 `confirmRelationUnlock`。

- [x] **Step 2: Implement page state**

用真实接口替换静态数组，保留蓝湖视觉骨架与 `router.params.member/tab/unlock` 调试入口。

- [x] **Step 3: Verify green**

```bash
node miniapp/scripts/validate-relation-feedback-miniapp-closure.mjs
```

Expected: PASS。

### Task 3: 相互喜欢和用户主页动作闭环

**Files:**
- Modify: `miniapp/src/pages/heart/mutual.tsx`
- Modify: `miniapp/src/pages/heart/user.tsx`

**Interfaces:**
- Consumes: Task 1 service functions.
- Produces: 相互喜欢真实列表、用户主页 `targetUserId/sourceScene` 参数读取、喜欢/取消喜欢、聊天入口、访问上报。

- [x] **Step 1: Run validation red**

```bash
node miniapp/scripts/validate-relation-feedback-miniapp-closure.mjs
```

Expected: FAIL，提示相互喜欢或用户主页未接真实接口。

- [x] **Step 2: Implement closures**

相互喜欢使用 `getMutualMatches`；主页使用 `sendRelationLike`、`cancelRelationLike`、`reportRelationVisit`。

- [x] **Step 3: Verify build**

```bash
cd miniapp && npm run build:weapp:dev
```

Expected: 构建成功，包体门禁通过。
