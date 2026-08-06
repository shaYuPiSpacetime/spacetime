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
                "community_audit_record",
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
                .contains("visitor_user_id = p_user_id")
                .contains("invitee_user_id = p_user_id")
                .contains("target_user_id = p_user_id");
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
                return Files.readString(candidate, StandardCharsets.UTF_8);
            }
        }
        throw new IOException("项目文件不存在: " + relativePath);
    }
}
