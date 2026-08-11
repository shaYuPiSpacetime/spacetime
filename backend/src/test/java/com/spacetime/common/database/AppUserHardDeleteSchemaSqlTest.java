package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** App 用户彻底删除数据库迁移契约。 */
@DisplayName("App 用户彻底删除数据库迁移")
class AppUserHardDeleteSchemaSqlTest {

    private static final String MIGRATION = "deploy/sql/prod/066_app_user_admin_hard_delete.sql";
    private static final String ROLLBACK = "deploy/sql/ops/rollback-066-app-user-admin-hard-delete.sql";

    @Test
    @DisplayName("066 迁移应创建可由后端事务调用的用户数据清理过程")
    void migrationShouldCreateTransactionSafeCleanupProcedure() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("CREATE PROCEDURE spacetime_delete_app_user_data")
                .contains("IN p_user_id BIGINT")
                .contains("WHERE id = p_user_id AND deleted = 0")
                .contains("DELETE FROM app_user WHERE id = p_user_id AND deleted = 0")
                .contains("ROW_COUNT()")
                .contains("SIGNAL SQLSTATE '45000'")
                .doesNotContain("START TRANSACTION", "COMMIT;", "ROLLBACK;");
    }

    @Test
    @DisplayName("066 迁移应覆盖账号、认证、社区、关系、商业化、推荐和推广数据")
    void migrationShouldCoverAllKnownUserDataDomains() throws IOException {
        String sql = readProjectFile(MIGRATION);
        List<String> requiredTables = List.of(
                "app_user_audit_record",
                "app_user_audit_history",
                "external_provider_task",
                "app_user_cancel_request",
                "app_user_asset",
                "app_user_coin_log",
                "app_trade_order",
                "app_refund_record",
                "app_user_unlock_record",
                "app_relation_like",
                "app_relation_visit",
                "app_relation_match",
                "community_post",
                "community_post_draft",
                "community_comment",
                "community_comment_like",
                "community_like",
                "community_follow",
                "community_report",
                "community_view_history",
                "community_content_preference",
                "community_user_restriction",
                "community_media_audit_task",
                "community_event_outbox",
                "ct_recommend_preference",
                "ct_ideal_filter_snapshot",
                "ct_ideal_snapshot_candidate",
                "ct_recommend_view_log",
                "promotion_agent_event",
                "promotion_source_trace",
                "app_user");

        assertThat(requiredTables)
                .allSatisfy(table -> assertThat(sql)
                        .as("应清理表 %s", table)
                        .contains("DELETE FROM " + table));
        assertThat(sql)
                .contains("DELETE audit_record\n      FROM community_audit_record audit_record")
                .contains("visitor_user_id = p_user_id")
                .contains("visitor_user_id = ?")
                .contains("invitee_user_id = ?")
                .contains("target_user_id = p_user_id");
    }

    @Test
    @DisplayName("066 迁移应兼容当前推广事件表不存在的生产结构")
    void migrationShouldGuardOptionalPromotionAgentEventTable() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("TABLE_NAME = 'promotion_agent_event'")
                .contains("SET @delete_sql = 'DELETE FROM promotion_agent_event WHERE user_id = ?")
                .doesNotContain("\n    DELETE FROM promotion_agent_event\n");
    }

    @Test
    @DisplayName("066 迁移应使用当前代理奖励表真实存在的被邀请人字段")
    void migrationShouldUseCurrentAgentBonusLogColumns() throws IOException {
        String sql = readProjectFile(MIGRATION);
        String currentAgentBonusDelete = sql.substring(
                sql.indexOf("DELETE FROM promotion_agent_bonus_log\n"),
                sql.indexOf("    IF EXISTS (\n", sql.indexOf("DELETE FROM promotion_agent_bonus_log\n")));

        assertThat(currentAgentBonusDelete)
                .contains("WHERE invitee_id = p_user_id")
                .doesNotContain("WHERE user_id = p_user_id");
    }

    @Test
    @DisplayName("066 迁移应在删除邀请关系前按当前字段清理来源追踪")
    void migrationShouldUseCurrentSourceTraceColumnsBeforeDeletingRelations() throws IOException {
        String sql = readProjectFile(MIGRATION);
        int sourceTraceDelete = sql.indexOf("DELETE FROM promotion_source_trace\n");
        int relationDelete = sql.indexOf("DELETE FROM promotion_invite_relation\n");
        String currentSourceTraceDelete = sql.substring(sourceTraceDelete, relationDelete);

        assertThat(sourceTraceDelete).isPositive();
        assertThat(relationDelete).isGreaterThan(sourceTraceDelete);
        assertThat(currentSourceTraceDelete)
                .contains("WHERE inviter_id = p_user_id")
                .contains("source_trace_id")
                .doesNotContain("visitor_user_id", "invitee_user_id");
    }

    @Test
    @DisplayName("066 迁移的社区审核清理不应重复打开同一临时表")
    void migrationShouldNotReopenCommunityScopeTemporaryTables() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("DELETE audit_record\n      FROM community_audit_record audit_record")
                .contains("FROM tmp_spacetime_delete_posts post_scope")
                .contains("audit_record.biz_id = post_scope.id")
                .contains("audit_record.biz_no COLLATE utf8mb4_unicode_ci = post_scope.biz_no")
                .contains("FROM tmp_spacetime_delete_comments comment_scope")
                .doesNotContain("biz_id IN (SELECT id FROM tmp_spacetime_delete_posts)\n"
                        + "                 OR biz_no IN (SELECT biz_no FROM tmp_spacetime_delete_posts)")
                .doesNotContain("biz_id IN (SELECT id FROM tmp_spacetime_delete_comments)\n"
                        + "                 OR biz_no IN (SELECT biz_no FROM tmp_spacetime_delete_comments)");
    }

    @Test
    @DisplayName("066 迁移的社区业务编号比较应统一使用 unicode 排序规则")
    void migrationShouldAlignCommunityScopeNumberCollation() throws IOException {
        String sql = readProjectFile(MIGRATION);
        String declaration = "biz_no VARCHAR(64) CHARACTER SET utf8mb4 "
                + "COLLATE utf8mb4_unicode_ci DEFAULT NULL";

        assertThat(sql.lines().filter(line -> line.contains(declaration)).count())
                .as("帖子和评论两个临时范围表都应显式对齐业务编号排序规则")
                .isEqualTo(2);
        assertThat(sql)
                .contains("audit_record.biz_no COLLATE utf8mb4_unicode_ci = post_scope.biz_no")
                .contains("audit_record.biz_no COLLATE utf8mb4_unicode_ci = comment_scope.biz_no")
                .contains("aggregate_no COLLATE utf8mb4_unicode_ci IN");
    }

    @Test
    @DisplayName("066 迁移应注册独立删除权限并仅默认授予超级管理员")
    void migrationShouldSeedDedicatedPermission() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("user:app:delete")
                .contains("parent.perms='user:app:list'")
                .contains("r.role_code='super_admin'")
                .contains("INSERT IGNORE INTO sys_role_menu");
    }

    @Test
    @DisplayName("066 回滚脚本只应撤销过程和权限，不恢复已删除业务数据")
    void rollbackShouldRemoveProcedureAndPermissionOnly() throws IOException {
        String sql = readProjectFile(ROLLBACK);

        assertThat(sql)
                .contains("DROP PROCEDURE IF EXISTS spacetime_delete_app_user_data")
                .contains("user:app:delete")
                .doesNotContain("INSERT INTO app_user");
    }

    private String readProjectFile(String relativePath) throws IOException {
        Path current = Path.of("").toAbsolutePath();
        for (int i = 0; i < 5 && current != null; i++, current = current.getParent()) {
            Path candidate = current.resolve(relativePath);
            if (Files.exists(candidate)) {
                return Files.readString(candidate, StandardCharsets.UTF_8)
                        .replace("\r\n", "\n")
                        .replace('\r', '\n');
            }
        }
        throw new IOException("项目文件不存在: " + relativePath);
    }
}
