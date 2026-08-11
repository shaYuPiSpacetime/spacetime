package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** PRD-03 消息、私信与通知中心 14 表数据库契约。 */
@DisplayName("PRD-03 消息中心数据库脚本")
class MessageSchemaSqlTest {

    private static final String MIGRATION = "deploy/sql/prod/070_prd03_message_center_closure.sql";
    private static final List<String> TABLES = List.of(
            "app_message_conversation",
            "app_message_conversation_member",
            "app_message_record",
            "app_message_whisper",
            "app_system_message",
            "app_assistant_message",
            "app_message_event_inbox",
            "app_message_delivery_outbox",
            "app_user_im_account",
            "app_message_rule_version",
            "app_message_runtime_control",
            "app_message_template_version",
            "app_message_sensitive_access_log",
            "community_report_evidence");

    @Test
    @DisplayName("迁移应创建十四张业务表且每个字段都有中文注释")
    void migrationShouldCreateFourteenCommentedTables() throws IOException {
        String sql = readProjectFile(MIGRATION);

        for (String table : TABLES) {
            assertThat(sql).contains("CREATE TABLE IF NOT EXISTS `" + table + "`");
            assertEveryColumnHasChineseComment(sql, table);
        }
    }

    @Test
    @DisplayName("正文清理应只清正文并保留消息事实")
    void messageBodyCleanupShouldBeExecutableWithoutDeletingMetadata() throws IOException {
        String sql = readProjectFile(MIGRATION);
        String record = tableSql(sql, "app_message_record");

        assertThat(record)
                .contains("`content_text` TEXT NULL")
                .contains("`receiver_read_status` VARCHAR(20) NOT NULL DEFAULT 'not_applicable'")
                .contains("not_applicable-未送达或不适用，unread-未读，read-已读")
                .contains("`receiver_read_at` DATETIME NULL COMMENT '接收方确认已读时间'")
                .contains("idx_message_record_receiver_unread")
                .contains("`content_cleared_at` DATETIME NULL")
                .contains("`purge_after` DATETIME NULL")
                .doesNotContain("content_ciphertext", "moderation_status", "moderation_provider");
        assertThat(sql)
                .contains("正文到期仅清空content_text并保留消息元数据")
                .doesNotContain("DELETE FROM `app_message_record`");
    }

    @Test
    @DisplayName("TIM 消息映射只能保存在消息主表")
    void timMessageMappingShouldHaveSingleSourceOfTruth() throws IOException {
        String sql = readProjectFile(MIGRATION);
        String record = tableSql(sql, "app_message_record");
        String whisper = tableSql(sql, "app_message_whisper");

        assertThat(record)
                .contains("`tim_message_id` VARCHAR(128) NULL")
                .contains("`tim_msg_key` VARCHAR(128) NULL")
                .contains("uk_message_record_tim_key");
        assertThat(whisper)
                .contains("`request_message_id` BIGINT")
                .contains("`reply_message_id` BIGINT")
                .doesNotContain("request_tim_message_id", "request_tim_msg_key",
                        "reply_tim_message_id", "reply_tim_msg_key", "provider_msg_key");
    }

    @Test
    @DisplayName("Inbox 临时载荷应可在成功、死信或到期后清空")
    void inboxPayloadShouldHaveBoundedLifecycle() throws IOException {
        String inbox = tableSql(readProjectFile(MIGRATION), "app_message_event_inbox");

        assertThat(inbox)
                .contains("`payload_ciphertext` MEDIUMBLOB NULL")
                .contains("`payload_expires_at` DATETIME NULL")
                .contains("`payload_cleared_at` DATETIME NULL")
                .contains("idx_message_event_inbox_payload_cleanup")
                .contains("不得包含聊天正文");
    }

    @Test
    @DisplayName("状态枚举、幂等约束和历史保留规则应完整")
    void migrationShouldDocumentStatesAndKeepHistory() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("pending-待回复，replied-已回复并匹配，expired-已过期，invalid-已失效")
                .contains("active-可用，blocked-已拉黑，invalid-已失效")
                .contains("text-普通文本，whisper-原悄悄话，whisper_reply-悄悄话回复，system_tip-系统提示")
                .contains("uk_message_whisper_active_pair")
                .contains("uk_message_whisper_send_request")
                .contains("uk_message_whisper_reply_request")
                .contains("uk_message_conversation_match")
                .contains("uk_message_conversation_active_pair")
                .contains("uk_message_record_client")
                .contains("`active_marker` TINYINT NULL DEFAULT 1")
                .contains("0-未删除，1-已删除")
                .doesNotContain("DROP TABLE", "DELETE FROM `app_message_whisper`");
    }

    @Test
    @DisplayName("迁移应提供首版规则、十三个模板和完整后台权限种子")
    void migrationShouldSeedRuntimeConfigurationTemplatesAndPermissions() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("MSG-CFG-INIT-001")
                .contains("global_send_enabled")
                .contains("'report_result', 'report_result', 'governance'")
                .contains("'violation_result', 'violation_result', 'governance'")
                .contains("'content_review_result', 'content_review_result', 'governance'")
                .contains("'asset_result', 'asset_result', 'asset'")
                .contains("'invite_result', 'invite_result', 'invite'")
                .contains("'community_interaction_summary', 'community_interaction_summary', 'community'")
                .contains("'community_hot_topic', 'community_hot_topic', 'community'")
                .contains("'featured_content', 'featured_content', 'community'")
                .contains("'community_activity', 'community_activity', 'community'")
                .contains("'community_recall', 'community_recall', 'community'")
                .contains("'platform_announcement', 'platform_announcement', 'platform'")
                .contains("'account_security', 'account_security', 'platform'")
                .contains("'assistant_getting_started', 'getting_started', 'assistant'")
                .contains("message:summary:view", "message:conversation:list", "message:whisper:list")
                .contains("message:system:list", "message:record:list", "message:record:export")
                .contains("message:config:view", "message:config:edit")
                .contains("message:template:view", "message:template:edit")
                .contains("message:report-context:view", "message:risk-context:view")
                .contains("message:sensitive-content:view");
    }

    @Test
    @DisplayName("迁移应为已有有效匹配幂等补齐私信会话和双方成员")
    void migrationShouldBackfillExistingMatchConversations() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("迁移前已经存在的有效匹配幂等补齐私信会话")
                .contains("INSERT IGNORE INTO `app_message_conversation`")
                .contains("FROM `app_relation_match` m")
                .contains("m.match_status = 'matched' AND m.active_marker = 1")
                .contains("INSERT IGNORE INTO `app_message_conversation_member`")
                .contains("c.user_low_id, c.user_high_id")
                .contains("c.user_high_id, c.user_low_id");
    }

    private void assertEveryColumnHasChineseComment(String sql, String table) {
        String definition = tableSql(sql, table);
        List<String> columns = definition.lines()
                .map(String::trim)
                .filter(line -> line.startsWith("`"))
                .toList();
        assertThat(columns).as("消息表 %s 应包含字段", table).isNotEmpty();
        assertThat(columns).as("消息表 %s 的每个字段都必须写中文注释", table)
                .allSatisfy(line -> assertThat(line)
                        .contains(" COMMENT '")
                        .containsPattern("COMMENT '[^']*[\\u4e00-\\u9fa5][^']*'"));
    }

    private String tableSql(String sql, String table) {
        int start = sql.indexOf("CREATE TABLE IF NOT EXISTS `" + table + "`");
        int end = sql.indexOf(") ENGINE=", start);
        assertThat(start).as("应存在消息表 %s", table).isGreaterThanOrEqualTo(0);
        assertThat(end).as("消息表 %s 应有完整建表语句", table).isGreaterThan(start);
        return sql.substring(start, end);
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
