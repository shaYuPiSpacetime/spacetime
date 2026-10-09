# App 用户完整物理删除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 升级后台“彻底删除用户”的数据库过程，使 App 用户及其消息、私信、悄悄话、通知、TIM 账号和举报证据在同一事务中完整删除，并可对 `U821（小乔公主）` 做可核验清理。

**Architecture:** 新增不可变生产迁移 `106`，完整重建现有 `spacetime_delete_app_user_data`，保留 Controller → Service → DAO → Mapper 调用链。迁移先固化共享消息范围，再按依赖顺序物理删除，最后执行残留计数并在非零时 `SIGNAL`，由现有 Spring 事务统一回滚。

**Tech Stack:** MySQL 8 存储过程、Spring Boot 3.4、MyBatis、JUnit 5、AssertJ、Java 21。

## Global Constraints

- 仅在 `master` 修改；不得创建或切换功能分支。
- 不修改已上线的 066/089 历史迁移，必须新增 106 迁移。
- 只接受已核验的内部用户 ID；不得按昵称或手机号模糊删除。
- `website_*` 是独立账号体系，不按相同数值 ID 删除。
- 不删除 OSS 对象、全局消息配置或追加式管理员敏感访问审计。
- 工作区其他未提交改动不得暂存、覆盖或回退。

---

### Task 1: 建立完整删除数据库契约红测

**Files:**
- Create: `backend/src/test/java/com/spacetime/common/database/AppUserCompleteHardDeleteMigrationTest.java`
- Test: `backend/src/test/java/com/spacetime/common/database/AppUserCompleteHardDeleteMigrationTest.java`

**Interfaces:**
- Consumes: 迁移路径 `deploy/sql/prod/106_app_user_complete_hard_delete.sql`。
- Produces: 对消息表覆盖、共享事实范围、残留校验和事务边界的静态契约。

- [x] **Step 1: 写入失败测试**

```java
private static final String MIGRATION = "deploy/sql/prod/106_app_user_complete_hard_delete.sql";

@Test
void shouldCoverMessageAndImData() throws IOException {
    String sql = readProjectFile(MIGRATION);
    assertThat(sql).contains(
            "DELETE FROM app_whisper",
            "DELETE FROM app_message_delivery_outbox",
            "DELETE FROM community_report_evidence",
            "DELETE FROM app_message_record",
            "DELETE FROM app_message_conversation_member",
            "DELETE FROM app_message_conversation",
            "DELETE FROM app_message_whisper",
            "DELETE FROM app_system_message",
            "DELETE FROM app_assistant_message",
            "DELETE FROM app_message_event_inbox",
            "DELETE FROM app_user_im_account");
}

@Test
void shouldRollbackWhenMessageResidueRemains() throws IOException {
    String sql = readProjectFile(MIGRATION);
    assertThat(sql)
            .contains("DECLARE v_remaining_count BIGINT DEFAULT 0")
            .contains("SET v_remaining_count =")
            .contains("IF v_remaining_count <> 0 THEN")
            .contains("SET MESSAGE_TEXT = '用户关联数据仍有残留，已停止删除'")
            .doesNotContain("START TRANSACTION", "COMMIT;", "ROLLBACK;");
}
```

- [x] **Step 2: 运行测试确认红灯**

Run: `cd backend; mvn -Dtest=AppUserCompleteHardDeleteMigrationTest test`

Expected: FAIL，提示 `106_app_user_complete_hard_delete.sql` 不存在。

---

### Task 2: 新增完整删除迁移

**Files:**
- Create: `deploy/sql/prod/106_app_user_complete_hard_delete.sql`
- Reference: `deploy/sql/prod/089_relation_visit_inbox_hard_delete.sql`
- Test: `backend/src/test/java/com/spacetime/common/database/AppUserCompleteHardDeleteMigrationTest.java`

**Interfaces:**
- Consumes: Mapper 固定调用 `CALL spacetime_delete_app_user_data(#{userId})`。
- Produces: `CREATE PROCEDURE spacetime_delete_app_user_data(IN p_user_id BIGINT)`。

- [x] **Step 1: 复制 089 的完整过程作为 106 基线**

保留 089 的推荐、商业化、关系、社区、推广、认证和用户设置清理顺序，只在新迁移中重建过程。

- [x] **Step 2: 固化消息共享范围**

```sql
DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_conversations;
CREATE TEMPORARY TABLE tmp_spacetime_delete_conversations (
    id BIGINT NOT NULL PRIMARY KEY,
    biz_no VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB;
INSERT INTO tmp_spacetime_delete_conversations (id, biz_no)
SELECT id, conversation_no
  FROM app_message_conversation
 WHERE user_low_id = p_user_id OR user_high_id = p_user_id;

DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_messages;
CREATE TEMPORARY TABLE tmp_spacetime_delete_messages (
    id BIGINT NOT NULL PRIMARY KEY,
    biz_no VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB;
INSERT INTO tmp_spacetime_delete_messages (id, biz_no)
SELECT id, message_no
  FROM app_message_record
 WHERE sender_user_id = p_user_id
    OR receiver_user_id = p_user_id
    OR conversation_id IN (SELECT id FROM tmp_spacetime_delete_conversations);
```

- [x] **Step 3: 按依赖顺序删除消息域数据**

```sql
DELETE FROM app_message_delivery_outbox
 WHERE sender_user_id = p_user_id
    OR receiver_user_id = p_user_id
    OR (aggregate_type = 'message' AND aggregate_id IN (SELECT id FROM tmp_spacetime_delete_messages));
DELETE FROM community_report_evidence
 WHERE sender_user_id = p_user_id
    OR receiver_user_id = p_user_id
    OR conversation_no COLLATE utf8mb4_unicode_ci IN (
        SELECT biz_no FROM tmp_spacetime_delete_conversations
    );
DELETE FROM app_message_record
 WHERE id IN (SELECT id FROM tmp_spacetime_delete_messages);
DELETE FROM app_message_conversation_member
 WHERE user_id = p_user_id OR peer_user_id = p_user_id
    OR conversation_id IN (SELECT id FROM tmp_spacetime_delete_conversations);
DELETE FROM app_message_conversation
 WHERE id IN (SELECT id FROM tmp_spacetime_delete_conversations);
DELETE FROM app_message_whisper
 WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id
    OR user_low_id = p_user_id OR user_high_id = p_user_id;
DELETE FROM app_whisper
 WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id;
DELETE FROM app_system_message WHERE receiver_user_id = p_user_id;
DELETE FROM app_assistant_message WHERE receiver_user_id = p_user_id;
DELETE FROM app_message_event_inbox WHERE receiver_user_id = p_user_id;
DELETE FROM app_user_im_account WHERE user_id = p_user_id;
```

- [x] **Step 4: 在删除主表前增加残留校验**

```sql
SET v_remaining_count =
      (SELECT COUNT(*) FROM app_message_record
        WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id)
    + (SELECT COUNT(*) FROM app_message_conversation
        WHERE user_low_id = p_user_id OR user_high_id = p_user_id)
    + (SELECT COUNT(*) FROM app_message_conversation_member
        WHERE user_id = p_user_id OR peer_user_id = p_user_id)
    + (SELECT COUNT(*) FROM app_message_whisper
        WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id
           OR user_low_id = p_user_id OR user_high_id = p_user_id)
    + (SELECT COUNT(*) FROM app_whisper
        WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id)
    + (SELECT COUNT(*) FROM app_system_message WHERE receiver_user_id = p_user_id)
    + (SELECT COUNT(*) FROM app_assistant_message WHERE receiver_user_id = p_user_id)
    + (SELECT COUNT(*) FROM app_user_im_account WHERE user_id = p_user_id);
IF v_remaining_count <> 0 THEN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '用户关联数据仍有残留，已停止删除';
END IF;
```

- [x] **Step 5: 清理临时表并运行绿测**

Run: `cd backend; mvn -Dtest=AppUserCompleteHardDeleteMigrationTest,AppUserAdminServiceImplTest test`

Expected: PASS，且现有删除失败回滚语义测试继续通过。

---

### Task 3: 生成测试设计与执行报告

**Files:**
- Create: `docs/测试文档/App用户完整物理删除-testcase.md`
- Create: `docs/测试文档/App用户完整物理删除-testreport.md`

**Interfaces:**
- Consumes: Task 1 的 JUnit 契约和 Task 2 的迁移。
- Produces: 本次变更的测试设计唯一来源与执行记录。

- [x] **Step 1: 写测试用例文档**

写入六条明确用例：`HD-DB-001` 消息域表覆盖、`HD-DB-002` 共享会话双向清理、`HD-DB-003` 举报证据清理、`HD-DB-004` 残留非零触发回滚、`HD-SVC-001` 非法或不存在用户拒绝、`HD-SVC-002` 数据库清理失败时不撤销登录态且不写成功审计。

- [x] **Step 2: 执行定向测试与编译**

Run: `cd backend; mvn -Dtest=AppUserCompleteHardDeleteMigrationTest,AppUserAdminServiceImplTest test`

Run: `cd backend; mvn -DskipTests package`

Expected: 两条命令均退出码 0。

- [x] **Step 3: 写测试报告**

记录测试数量、通过/失败/跳过、命令与环境限制；生产 L1 删除因缺少目标服务器授权不得伪造为通过。

---

### Task 4: 目标环境迁移与 U821 删除

**Files:**
- Use: `deploy/sql/prod/106_app_user_complete_hard_delete.sql`
- Use: 现有 `DELETE /admin/users/app/821` 管理接口。

**Interfaces:**
- Consumes: 可访问目标生产数据库或已登录管理后台、`user:app:delete` 权限。
- Produces: `U821` 全部业务数据删除和脱敏管理审计。

- [ ] **Step 1: 只读核验目标**

```sql
SELECT id, nickname, account_status, deleted
  FROM app_user
 WHERE id = 821;
```

Expected: 恰好一行，`nickname = '小乔公主'` 且 `deleted = 0`。不满足即停止。

- [ ] **Step 2: 部署 106 迁移**

通过现有生产部署流程执行迁移，不手工修改历史迁移记录。

- [ ] **Step 3: 在动作发生前再次确认并调用现有后台删除接口**

删除原因使用明确审计文案“按用户要求彻底清理测试账号及全部关联数据”。

- [ ] **Step 4: 只读验证残留为零**

验证 `app_user`、消息发送/接收方、会话双方、成员双方、TIM 账号、系统消息、助手消息和举报证据均不再含用户 821；若无法访问环境，明确标记为阻塞，不得声称已删除。
