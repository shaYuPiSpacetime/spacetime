# 生产数据库排序规则全量统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Spacetime 生产库全部 101 张业务表、全部字符列和数据库默认排序规则统一为 `utf8mb4_unicode_ci`，并修复 App 用户彻底删除过程在混合排序规则与历史推广表结构下的执行异常。

**Architecture:** 新增独立的 069 幂等迁移，通过游标只转换仍含非目标排序规则的基础表，执行期间保存并恢复 `FOREIGN_KEY_CHECKS`。066 删除过程固定使用 `utf8mb4_unicode_ci` 临时业务编号，并对历史 `utf8mb4_0900_ai_ci` 列显式转换；生产执行前做全量逻辑备份，执行后用 U121 的事务回滚演练验证完整过程但不永久删除用户。

**Tech Stack:** MySQL 8、Java 21、JUnit 5、AssertJ、Spring Boot 3.4、Shell/SSH。

## Global Constraints

- 目标排序规则固定为 `utf8mb4_unicode_ci`，不得新增 `utf8mb4_0900_ai_ci` 表或字符列。
- 生产现状为 101 张基础表、约 7.94 MiB；96 张表为 `utf8mb4_0900_ai_ci`，5 张表已为 `utf8mb4_unicode_ci`。
- 生产仅有 1 个外键，连接数值型主键，不受字符排序规则变化影响；迁移仍必须保存并恢复外键检查开关。
- 所有生产基础表均为 InnoDB；生产演练必须在显式事务内调用 066 并最终回滚。
- 生产执行前必须生成包含表结构、数据、触发器、事件和存储过程的全量逻辑备份，权限固定为 `600`。
- 不直接新增已经退役的 `promotion_agent_event` 空表；066 对该当前表和 legacy 表分别做存在性兼容。
- 不绕过管理后台永久删除 U121；本计划只做 `START TRANSACTION → CALL → ROLLBACK` 演练。
- 本轮不自动提交或推送 Git，除非用户另行明确要求。

---

### Task 1: 建立全库排序规则迁移契约

**Files:**
- Create: `backend/src/test/java/com/spacetime/common/database/DatabaseCollationSchemaSqlTest.java`
- Modify: `docs/测试文档/用户准入与资料认证初始化-testcase.md`

**Interfaces:**
- Consumes: 目标排序规则 `utf8mb4_unicode_ci`、生产基线 101 张基础表。
- Produces: 对 069 正向迁移、回滚脚本和 066 删除过程的静态契约。

- [x] **Step 1: 写失败的 069 迁移契约测试**

```java
@Test
@DisplayName("069 应把数据库、基础表和字符列统一为 utf8mb4_unicode_ci")
void migrationShouldNormalizeDatabaseAndAllBaseTables() throws IOException {
    String sql = readProjectFile("deploy/sql/prod/069_database_utf8mb4_unicode_ci.sql");
    assertThat(sql)
            .contains("ALTER DATABASE")
            .contains("TABLE_TYPE = 'BASE TABLE'")
            .contains("COLLATION_NAME <> 'utf8mb4_unicode_ci'")
            .contains("CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            .contains("SET FOREIGN_KEY_CHECKS = @previous_foreign_key_checks");
}
```

- [x] **Step 2: 运行测试并确认红灯**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=DatabaseCollationSchemaSqlTest test`

Expected: FAIL，错误明确指向 `069_database_utf8mb4_unicode_ci.sql` 尚不存在。

- [x] **Step 3: 在 testcase 中登记 P0 契约与生产验证用例**

新增 `L3-DB-COLLATION-001`（迁移契约）、`L1-DB-COLLATION-001`（生产只读核验）和 `L1-ADM-HARD-DELETE-001`（U121 回滚演练），明确永久删除不在自动测试范围。

---

### Task 2: 实现正向迁移与精确回滚

**Files:**
- Create: `deploy/sql/prod/069_database_utf8mb4_unicode_ci.sql`
- Create: `deploy/sql/ops/rollback-069-database-utf8mb4-unicode-ci.sql`
- Test: `backend/src/test/java/com/spacetime/common/database/DatabaseCollationSchemaSqlTest.java`

**Interfaces:**
- Consumes: `information_schema.TABLES`、`information_schema.COLUMNS`、当前数据库名 `DATABASE()`。
- Produces: 幂等过程 `spacetime_normalize_database_collation()`，执行完成后自行删除；回滚过程恢复 2026-08-08 的 96/5 表排序规则基线。

- [x] **Step 1: 实现 069 幂等游标迁移**

迁移直接变更当前数据库默认规则，并只遍历仍不符合目标的基础表。MySQL 不支持通过 `PREPARE` 执行 `ALTER DATABASE`：

```sql
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE PROCEDURE spacetime_normalize_database_collation()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE target_table VARCHAR(255);
    DECLARE table_cursor CURSOR FOR
        SELECT DISTINCT t.TABLE_NAME
          FROM information_schema.TABLES t
         WHERE t.TABLE_SCHEMA = DATABASE()
           AND t.TABLE_TYPE = 'BASE TABLE'
           AND (t.TABLE_COLLATION <> 'utf8mb4_unicode_ci'
                OR EXISTS (
                    SELECT 1 FROM information_schema.COLUMNS c
                     WHERE c.TABLE_SCHEMA = t.TABLE_SCHEMA
                       AND c.TABLE_NAME = t.TABLE_NAME
                       AND c.CHARACTER_SET_NAME IS NOT NULL
                       AND c.COLLATION_NAME <> 'utf8mb4_unicode_ci'
                ));
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    OPEN table_cursor;
    table_loop: LOOP
        FETCH table_cursor INTO target_table;
        IF done = 1 THEN LEAVE table_loop; END IF;
        SET @alter_table_sql = CONCAT(
            'ALTER TABLE `', REPLACE(target_table, '`', '``'),
            '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        );
        PREPARE normalize_table_stmt FROM @alter_table_sql;
        EXECUTE normalize_table_stmt;
        DEALLOCATE PREPARE normalize_table_stmt;
    END LOOP;
    CLOSE table_cursor;
END;
```

- [x] **Step 2: 实现回滚脚本**

回滚先把全部基础表恢复到 `utf8mb4_0900_ai_ci`，再把迁移前已是 unicode 的五张表恢复为 `utf8mb4_unicode_ci`：`app_whisper`、`ct_ideal_filter_snapshot`、`ct_ideal_snapshot_candidate`、`ct_recommend_preference`、`ct_recommend_view_log`；数据库默认规则保持迁移前的 `utf8mb4_unicode_ci`。

- [x] **Step 3: 运行契约测试并确认绿灯**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=DatabaseCollationSchemaSqlTest test`

Expected: PASS，0 failures、0 errors。

---

### Task 3: 收口 066 删除过程的 unicode 与历史表兼容

**Files:**
- Modify: `deploy/sql/prod/066_app_user_admin_hard_delete.sql`
- Modify: `backend/src/test/java/com/spacetime/common/database/AppUserHardDeleteSchemaSqlTest.java`

**Interfaces:**
- Consumes: 069 统一后的字符列规则；滚动升级期间仍可能存在的混合排序规则。
- Produces: 可在“缺少当前推广事件表”和“混合排序规则”两种生产结构中运行的 `spacetime_delete_app_user_data`。

- [x] **Step 1: 将两个临时范围表的 `biz_no` 固定为 unicode**

```sql
biz_no VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
```

- [x] **Step 2: 对业务编号比较显式使用 unicode**

```sql
audit_record.biz_no COLLATE utf8mb4_unicode_ci = post_scope.biz_no
aggregate_no COLLATE utf8mb4_unicode_ci IN (
    SELECT biz_no FROM tmp_spacetime_delete_posts
)
```

- [x] **Step 3: 保留 optional 表和临时表 reopen 防护**

`promotion_agent_event` 只允许位于 `IF EXISTS` 动态 SQL 分支；`community_audit_record` 对每个临时表仅使用一个相关 `EXISTS`。

- [x] **Step 4: 运行 066 契约测试**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=AppUserHardDeleteSchemaSqlTest test`

Expected: 9/9 PASS。

---

### Task 4: 生产备份、迁移与回滚演练

**Files:**
- Modify: `docs/测试文档/用户准入与资料认证初始化-testreport.md`

**Interfaces:**
- Consumes: 069、修正后的 066、生产 SSH 只读/运维权限。
- Produces: 全库 unicode 核验结果、U121 完整删除过程回滚证据、生产备份路径。

- [x] **Step 1: 创建生产全量逻辑备份**

在生产服务器执行 `mysqldump --single-transaction --routines --triggers --events --set-gtid-purged=OFF`，输出到 `/mnt/data/spacetime-prod/backups/database-before-20260808-069-collation.sql`，权限设为 `600` 并校验文件非空。

- [x] **Step 2: 执行 069 与修正后的 066**

先执行 `069_database_utf8mb4_unicode_ci.sql`，再执行 `066_app_user_admin_hard_delete.sql` 重建删除过程；任一步失败立即停止，不执行 U121 演练。

- [x] **Step 3: 只读核验全库统一结果**

```sql
SELECT COUNT(*) FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
   AND TABLE_COLLATION <> 'utf8mb4_unicode_ci';
SELECT COUNT(*) FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND CHARACTER_SET_NAME IS NOT NULL
   AND COLLATION_NAME <> 'utf8mb4_unicode_ci';
```

Expected: 两项均为 `0`，基础表总数仍为 `101`。

- [x] **Step 4: 对 U121 执行事务回滚演练**

```sql
START TRANSACTION;
CALL spacetime_delete_app_user_data(121);
SELECT COUNT(*) FROM app_user WHERE id = 121 AND deleted = 0;
ROLLBACK;
SELECT COUNT(*) FROM app_user WHERE id = 121 AND deleted = 0;
```

Expected: 过程无异常；事务内为 `0`，回滚后为 `1`。

- [x] **Step 5: 完整后端验证与报告**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml test`

Run: `git diff --check`

Expected: Maven `BUILD SUCCESS`；差异检查无输出；测试报告记录契约测试、生产迁移、全库只读核验、U121 回滚演练与未执行永久删除声明。

## Self-Review

- Spec coverage：覆盖数据库默认规则、全部基础表、全部字符列、066 临时表、生产备份、回滚、真实演练和测试报告。
- Placeholder scan：计划无待定实现项；生产目标表数量、数据量、目标排序规则和五张基线例外表均已明确。
- Type consistency：迁移、测试和生产核验统一使用 `utf8mb4_unicode_ci`；U121 只用于事务回滚演练，不作为自动永久删除数据。
