package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 关系反馈数据库脚本静态契约测试。 */
@DisplayName("关系反馈数据库脚本")
class RelationSchemaSqlTest {

    private static final List<String> TABLES = List.of(
            "app_relation_like",
            "app_relation_like_inbox_state",
            "app_relation_visit",
            "app_relation_visit_event",
            "app_relation_visit_cursor",
            "app_relation_match",
            "app_relation_match_source",
            "app_relation_match_popup");

    @Test
    @DisplayName("基线脚本应创建八张关系表并为全部字段写中文注释")
    void schemaShouldCreateCommentedRelationTables() throws IOException {
        String sql = readProjectFile("backend/docs/sql/schema-relation.sql");

        for (String table : TABLES) {
            assertThat(sql).contains("CREATE TABLE IF NOT EXISTS `" + table + "`");
            assertThat(sql).containsPattern("(?s)CREATE TABLE IF NOT EXISTS `" + table
                    + "`.*?COMMENT='[^']*[\\u4e00-\\u9fa5][^']*'");
        }
        assertEveryRelationColumnHasChineseComment(sql);
        assertThat(sql).doesNotContain("window_started_at", "hidden_by_visitor");
        assertThat(sql).contains("COMMENT '主键ID'")
                .contains("已确认查看到的喜欢生效时间")
                .contains("已确认查看到的喜欢记录主键ID")
                .contains("COMMENT '创建时间'")
                .contains("COMMENT '更新时间'")
                .contains("COMMENT '创建人ID")
                .contains("COMMENT '更新人ID'")
                .contains("0-未删除，1-已删除");
    }

    @Test
    @DisplayName("枚举字段注释应包含编码和完整中文含义")
    void enumColumnsShouldDocumentChineseMeanings() throws IOException {
        String sql = readProjectFile("backend/docs/sql/schema-relation.sql");

        assertThat(sql)
                .contains("active-有效，cancelled-已取消，invalid-已失效")
                .contains("visible-窗口内可见，expired_window-已超展示窗口，invalid-关系已失效")
                .contains("double_like-双方互送爱心")
                .contains("featured_heart_return_like-精选心动后回爱心")
                .contains("whisper_reply-悄悄话回复")
                .contains("pending-待展示或待回执，read-已读，cancelled-展示前已取消")
                .contains("later-稍后，close-关闭，profile-查看主页，chat-去聊天，system_back-系统返回")
                .contains("blocked-任一方拉黑")
                .contains("account_deleted-账号注销")
                .contains("certification_revoked-认证失效");
    }

    @Test
    @DisplayName("生产迁移应可重复执行并包含增量字段及权限种子")
    void migrationShouldBeIdempotentAndContainConfirmedDelta() throws IOException {
        String sql = readProjectFile("deploy/sql/prod/056_prd02_relation_feedback.sql");

        assertEveryRelationColumnHasChineseComment(sql);
        List<String> incrementalColumns = sql.lines()
                .map(String::trim)
                .filter(line -> line.contains("ADD COLUMN"))
                .toList();
        assertThat(incrementalColumns).hasSize(8)
                .allSatisfy(line -> assertThat(line)
                        .contains("COMMENT ''")
                        .containsPattern("COMMENT ''[^']*[\\u4e00-\\u9fa5][^']*''"));
        assertThat(sql).contains("information_schema")
                .contains("anonymous_no")
                .contains("unlock_no")
                .contains("TABLE_NAME='app_user_unlock_record' AND COLUMN_NAME='request_id'")
                .contains("TABLE_NAME='app_user_unlock_record' AND COLUMN_NAME='quote_token'")
                .contains("app_relation_like_inbox_state")
                .contains("uk_like_inbox_user")
                .contains("target_biz_type")
                .contains("target_biz_no")
                .contains("refund_no")
                .contains("active_marker")
                .contains("uk_user_request_target")
                .contains("uk_unlock_user_request")
                .contains("idx_unlock_user_biz_status")
                .contains("idx_unlock_user_target_status")
                .contains("user:app:relation:view")
                .contains("ENABLED", "active", "DISABLED", "expired")
                .contains("active-有效，cancelled-已取消，invalid-已失效")
                .contains("visible-窗口内可见，expired_window-已超展示窗口，invalid-关系已失效")
                .contains("double_like-双方互送爱心")
                .contains("featured_heart_return_like-精选心动后回爱心")
                .contains("whisper_reply-悄悄话回复")
                .contains("pending-待展示或待回执，read-已读，cancelled-展示前已取消")
                .contains("later-稍后，close-关闭，profile-查看主页，chat-去聊天，system_back-系统返回")
                .contains("MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '解锁状态：active-有效，expired-已过期，refunded-已退款'")
                .contains("UPDATE app_relation_like")
                .contains("like_status IN ('cancelled', 'invalid')")
                .contains("UPDATE app_relation_match")
                .contains("match_status='invalid'")
                .doesNotContain("DROP TABLE", "DELETE FROM app_relation");
    }

    @Test
    @DisplayName("生产迁移应将关系查看权限授予超级管理员")
    void migrationShouldGrantRelationPermissionToSuperAdmin() throws IOException {
        String sql = readProjectFile("deploy/sql/prod/056_prd02_relation_feedback.sql");

        assertThat(sql)
                .contains("INSERT IGNORE INTO sys_role_menu (role_id, menu_id)")
                .contains("r.role_code='super_admin'")
                .contains("m.perms='user:app:relation:view'");
    }

    @Test
    @DisplayName("Relation permission should be attached to the active App user menu")
    void migrationShouldRepairRelationPermissionParent() throws IOException {
        String sql = readProjectFile("deploy/sql/prod/056_prd02_relation_feedback.sql");

        assertThat(sql)
                .contains("UPDATE sys_menu relation_menu")
                .contains("relation_menu.perms='user:app:relation:view'")
                .contains("parent.perms='user:app:list'")
                .contains("parent.status='ENABLED'")
                .contains("parent.deleted=0");
    }

    private void assertEveryRelationColumnHasChineseComment(String sql) {
        for (String table : TABLES) {
            int start = sql.indexOf("CREATE TABLE IF NOT EXISTS `" + table + "`");
            int end = sql.indexOf(") ENGINE=", start);
            assertThat(start).as("应存在关系表 %s", table).isGreaterThanOrEqualTo(0);
            assertThat(end).as("关系表 %s 应有完整建表语句", table).isGreaterThan(start);
            List<String> columns = sql.substring(start, end).lines()
                    .map(String::trim)
                    .filter(line -> line.startsWith("`"))
                    .toList();
            assertThat(columns).as("关系表 %s 应包含字段", table).isNotEmpty();
            assertThat(columns).as("关系表 %s 的每个字段都必须写中文注释", table)
                    .allSatisfy(line -> assertThat(line)
                            .contains(" COMMENT '")
                            .containsPattern("COMMENT '[^']*[\\u4e00-\\u9fa5][^']*'"));
        }
    }

    private String readProjectFile(String relativePath) throws IOException {
        Path current = Path.of("").toAbsolutePath();
        for (int i = 0; i < 4 && current != null; i++, current = current.getParent()) {
            Path candidate = current.resolve(relativePath);
            if (Files.exists(candidate)) {
                return Files.readString(candidate, StandardCharsets.UTF_8);
            }
        }
        throw new IOException("项目文件不存在: " + relativePath);
    }
}
