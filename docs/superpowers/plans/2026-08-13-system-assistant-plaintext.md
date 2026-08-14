# 系统消息与官方助手明文存储实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 系统消息和官方助手的标题、正文改为明文存储与直接展示，后台隐藏跳转动作文案，并提供可验收的演示数据。

**Architecture:** 新增 `title_text/content_text` 可空列，新生成消息只写明文；管理后台与小程序读取时优先明文，仅对历史行回退旧密文解密。私信、悄悄话及举报证据的高敏策略不变。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、MySQL、React 18、Playwright。

## Global Constraints

- 不改变私信、悄悄话和举报证据的加密/审计机制。
- 保留 App 端 `actionText` 与跳转字段，管理后台详情不展示该动作文案。
- 迁移和演示数据必须幂等。

---

### Task 1: 明文存储契约与迁移

**Files:**
- Create: `deploy/sql/prod/073_prd03_platform_message_plaintext.sql`
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppSystemMessage.java`
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppAssistantMessage.java`
- Test: `backend/src/test/java/com/spacetime/common/database/MessageEntityStorageContractTest.java`

- [ ] 先增加失败测试，要求两个实体包含 `titleText/contentText`。
- [ ] 增加可空明文列与实体字段。
- [ ] 执行契约测试并确认通过。

### Task 2: 新消息明文写入与历史数据兼容读取

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/service/impl/MessageNotificationDomainServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/MessageRecordAdminServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappMessageServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/common/service/MessageNotificationDomainServiceImplTest.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/MiniappMessageServiceImplTest.java`

- [ ] 先将测试改为断言新消息只写明文且不调用加密。
- [ ] 生成服务写入 `titleText/contentText`。
- [ ] 后台和小程序明文优先，历史密文兜底。
- [ ] 运行相关后端测试。

### Task 3: 后台展示与演示数据

**Files:**
- Modify: `frontend/src/pages/message/MessageRecordPage.tsx`
- Modify: `frontend/e2e-tests/tests/prd03-admin-closure.spec.ts`
- Create: `deploy/sql/ops/073_prd03_platform_message_plaintext_demo.sql`

- [ ] E2E 先断言标题正文可见且“查看详情”不可见。
- [ ] 后台详情移除 `actionText` 展示。
- [ ] 为可用 App 用户幂等插入系统消息、官方助手明文演示数据。
- [ ] 执行迁移、种数、后端测试、前端构建和 E2E。
