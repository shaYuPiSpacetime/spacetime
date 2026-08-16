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
    private static final String MOBILE_CONTRACT =
            "deploy/sql/prod/071_prd03_message_mobile_contract.sql";
    private static final String ADMIN_MENU_VISIBILITY =
            "deploy/sql/prod/072_prd03_admin_menu_visibility.sql";
    private static final String REMOVE_MESSAGE_KMS =
            "deploy/sql/prod/074_prd03_remove_message_kms.sql";
    private static final String TIM_MESSAGE_LOOKUP_INDEX =
            "deploy/sql/prod/075_prd03_tim_message_lookup_index.sql";
    private static final String IM_ACCOUNT_SDK_APP_OWNERSHIP =
            "deploy/sql/prod/076_prd03_im_account_sdk_app_id.sql";
    private static final String BACKEND_DEPLOY_WORKFLOW =
            ".github/workflows/deploy-backend-prod.yml";
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
                .contains("uk_message_record_tim_key")
                .contains("idx_message_record_tim_id");
        assertThat(whisper)
                .contains("`request_message_id` BIGINT")
                .contains("`reply_message_id` BIGINT")
                .doesNotContain("request_tim_message_id", "request_tim_msg_key",
                        "reply_tim_message_id", "reply_tim_msg_key", "provider_msg_key");
    }

    @Test
    @DisplayName("TIM 消息 ID 全局定位应具备独立索引并进入生产迁移")
    void timMessageIdGlobalLookupShouldHaveStandaloneIndex() throws IOException {
        String record = tableSql(readProjectFile(MIGRATION), "app_message_record");
        Path upgradePath = resolveProjectFile(TIM_MESSAGE_LOOKUP_INDEX);
        String workflow = readProjectFile(BACKEND_DEPLOY_WORKFLOW);

        assertThat(upgradePath).as("应提供 TIM 消息 ID 独立索引升级脚本").exists();
        String upgradeSql = Files.readString(upgradePath, StandardCharsets.UTF_8);
        assertThat(record)
                .contains("KEY `idx_message_record_tim_message_id` (`tim_message_id`)");
        assertThat(upgradeSql)
                .contains("information_schema.STATISTICS")
                .contains("INDEX `idx_message_record_tim_message_id` (`tim_message_id`)");
        assertThat(workflow)
                .contains("deploy/sql/prod/075_prd03_tim_message_lookup_index.sql");
    }

    @Test
    @DisplayName("TIM 账号映射应记录 SDKAppID 归属并进入生产迁移")
    void imAccountShouldTrackSdkAppOwnership() throws IOException {
        String accountTable = tableSql(readProjectFile(MIGRATION), "app_user_im_account");
        Path upgradePath = resolveProjectFile(IM_ACCOUNT_SDK_APP_OWNERSHIP);
        String workflow = readProjectFile(BACKEND_DEPLOY_WORKFLOW);

        assertThat(accountTable)
                .contains("`sdk_app_id` BIGINT NULL COMMENT '最近一次同步成功所属的腾讯云TIM SDKAppID'");
        assertThat(upgradePath).as("应提供 TIM 账号 SDKAppID 归属升级脚本").exists();
        String upgradeSql = Files.readString(upgradePath, StandardCharsets.UTF_8);
        assertThat(upgradeSql)
                .contains("information_schema.COLUMNS")
                .contains("ADD COLUMN `sdk_app_id` BIGINT NULL")
                .doesNotContain("UPDATE `app_user_im_account` SET `sdk_app_id`");
        assertThat(workflow)
                .contains("deploy/sql/prod/076_prd03_im_account_sdk_app_id.sql");
    }

    @Test
    @DisplayName("悄悄话应保存来源快照和接收方逻辑隐藏审计")
    void whisperShouldPersistSourceAndReceiverVisibilityFacts() throws IOException {
        String sql = readProjectFile(MIGRATION);
        String whisper = tableSql(sql, "app_message_whisper");

        assertThat(whisper)
                .contains("`source_scene` VARCHAR(32) NOT NULL")
                .contains("recommendation-推荐，profile-主页，community_post-社区动态，community_comment-社区评论，whisper_reverse-反向申请")
                .contains("`source_biz_no` VARCHAR(64) NULL")
                .contains("`receiver_hidden_at` DATETIME NULL")
                .contains("`receiver_hide_type` VARCHAR(20) NULL")
                .contains("single-单条隐藏，bucket-分组全部隐藏")
                .contains("idx_message_whisper_receiver_bucket");
        assertThat(sql)
                .contains("prd03_add_column_if_missing('app_message_whisper', 'source_scene'")
                .contains("prd03_add_column_if_missing('app_message_whisper', 'receiver_hidden_at'");
    }

    @Test
    @DisplayName("举报表应保存用户上传的图片凭证URL列表")
    void reportShouldPersistEvidenceImageUrls() throws IOException {
        String sql = readProjectFile(MIGRATION);
        assertThat(sql)
                .contains("prd03_add_column_if_missing('community_report', 'evidence_image_urls_json'")
                .contains("举报人上传凭证图片URL列表JSON，最多3张");
    }

    @Test
    @DisplayName("Inbox 临时载荷应可在成功、死信或到期后清空")
    void inboxPayloadShouldHaveBoundedLifecycle() throws IOException {
        String inbox = tableSql(readProjectFile(MIGRATION), "app_message_event_inbox");

        assertThat(inbox)
                .contains("`payload_json` MEDIUMTEXT NULL")
                .contains("`payload_expires_at` DATETIME NULL")
                .contains("`payload_cleared_at` DATETIME NULL")
                .contains("idx_message_event_inbox_payload_cleanup")
                .doesNotContain("payload_ciphertext", "payload_iv", "payload_key_version", "payload_hmac");
    }

    @Test
    @DisplayName("移除 KMS 升级脚本应补充明文载荷和举报证据并保留历史列")
    void removeMessageKmsMigrationShouldBeNonDestructive() throws IOException {
        String sql = readProjectFile(REMOVE_MESSAGE_KMS).toLowerCase();

        assertThat(sql)
                .contains("'app_message_event_inbox', 'payload_json'")
                .contains("'app_system_message', 'title_text'")
                .contains("'app_system_message', 'content_text'")
                .contains("'app_assistant_message', 'title_text'")
                .contains("'app_assistant_message', 'content_text'")
                .contains("'community_report_evidence', 'content_text'")
                .contains("'community_report_evidence', 'content_ciphertext'")
                .contains("'mediumblob null comment")
                .contains("legacy_kms_payload_unsupported")
                .doesNotContain("drop column")
                .doesNotContain("delete from");
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

    @Test
    @DisplayName("移动端消息展示契约迁移应包含字段、枚举和中文注释")
    void mobileMessageContractShouldDeclareDisplaySnapshots() throws IOException {
        String baseSql = readProjectFile(MIGRATION).toLowerCase();
        String upgradeSql = readProjectFile(MOBILE_CONTRACT).toLowerCase();

        assertThat(baseSql)
                .contains("`card_type` varchar(20)", "text-纯文本", "action-行动卡片", "tip-提示卡片")
                .contains("`content_format` varchar(20)", "plain_text-纯文本", "rich_text-白名单富文本")
                .contains("`action_text` varchar(32)", "`action_text_template` varchar(32)");
        assertThat(upgradeSql)
                .contains("information_schema.columns")
                .contains("information_schema.statistics")
                .contains("'app_message_template_version', 'card_type'")
                .contains("'app_assistant_message', 'card_type'")
                .contains("'app_system_message', 'content_format'")
                .contains("'app_message_conversation_member', 'last_read_message_time'")
                .contains("'app_message_conversation_member', 'last_read_at'")
                .contains("'app_message_conversation', 'idx_message_conversation_pair_lifecycle'")
                .contains("'app_message_record', 'idx_message_record_tim_id'")
                .contains("set `content_format`", "set `action_text`");
    }

    @Test
    @DisplayName("后台补漏脚本应创建两个真实页面菜单且不创建一期外入口")
    void adminClosureShouldExposeOnlyPhaseOneMenus() throws IOException {
        String sql = readProjectFile(MIGRATION);
        String visibilitySql = readProjectFile(ADMIN_MENU_VISIBILITY);

        assertThat(sql)
                .contains("消息通知记录查询", "/operation/message-records", "message/MessageRecordPage")
                .contains("社交权限与消息配置", "/mobile-config/message-social", "message/MessageConfigPage")
                .contains("'message'", "'conversation'", "'whisper'")
                .doesNotContain("/mobile-config/user-notification-settings")
                .doesNotContain("/operation/notification-preferences")
                .doesNotContain("(830, 0,");
        assertThat(visibilitySql)
                .contains("parent_id=0 AND menu_name='运营中心' AND menu_type='M'")
                .contains("page.perms='message:record:list'")
                .contains("page.perms='message:config:view'")
                .contains("INSERT IGNORE INTO `sys_role_menu`");
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
        Path projectFile = resolveProjectFile(relativePath);
        if (Files.exists(projectFile)) {
            return Files.readString(projectFile, StandardCharsets.UTF_8);
        }
        throw new IOException("项目文件不存在: " + relativePath);
    }

    private Path resolveProjectFile(String relativePath) {
        Path current = Path.of("").toAbsolutePath();
        for (int i = 0; i < 4 && current != null; i++, current = current.getParent()) {
            Path candidate = current.resolve(relativePath);
            if (Files.exists(candidate)) {
                return candidate;
            }
        }
        return Path.of("").toAbsolutePath().resolve(relativePath);
    }
}
