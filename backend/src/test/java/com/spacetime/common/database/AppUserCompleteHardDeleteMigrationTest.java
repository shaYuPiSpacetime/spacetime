package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** App 用户完整物理删除升级迁移契约。 */
@DisplayName("App 用户完整物理删除升级迁移")
class AppUserCompleteHardDeleteMigrationTest {

    /** 最新完整删除过程迁移。 */
    private static final String MIGRATION = "deploy/sql/prod/106_app_user_complete_hard_delete.sql";

    @Test
    @DisplayName("生产发布工作流应上传并执行 106 迁移")
    void shouldDeployMigrationInProductionWorkflow() throws IOException {
        String workflow = readProjectFile(".github/workflows/deploy-backend-prod.yml");
        long mentions = workflow.lines()
                .filter(line -> line.contains("deploy/sql/prod/106_app_user_complete_hard_delete.sql"))
                .count();

        assertThat(mentions).isEqualTo(2L);
    }

    @Test
    @DisplayName("106 迁移应重建由 Spring 事务调用的清理过程")
    void shouldRecreateProcedureWithoutOwningTransaction() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("DROP PROCEDURE IF EXISTS spacetime_delete_app_user_data")
                .contains("CREATE PROCEDURE spacetime_delete_app_user_data(IN p_user_id BIGINT)")
                .contains("DELETE FROM app_user WHERE id = p_user_id AND deleted = 0")
                .doesNotContain("START TRANSACTION", "COMMIT;", "ROLLBACK;");
    }

    @Test
    @DisplayName("106 迁移应覆盖全部用户消息和 TIM 账号表")
    void shouldCoverMessageAndImData() throws IOException {
        String sql = readProjectFile(MIGRATION);
        List<String> requiredDeletes = List.of(
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

        assertThat(requiredDeletes)
                .allSatisfy(statement -> assertThat(sql).contains(statement));
    }

    @Test
    @DisplayName("106 迁移应先固化共享会话、消息和悄悄话范围")
    void shouldFreezeSharedMessageScopesBeforeDeleting() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("CREATE TEMPORARY TABLE tmp_spacetime_delete_conversations")
                .contains("WHERE user_low_id = p_user_id OR user_high_id = p_user_id")
                .contains("CREATE TEMPORARY TABLE tmp_spacetime_delete_messages")
                .contains("conversation_id IN (SELECT id FROM tmp_spacetime_delete_conversations)")
                .contains("CREATE TEMPORARY TABLE tmp_spacetime_delete_whispers")
                .contains("sender_user_id = p_user_id OR receiver_user_id = p_user_id")
                .contains("user_low_id = p_user_id OR user_high_id = p_user_id");
    }

    @Test
    @DisplayName("106 迁移应删除用户举报案件及其冻结证据")
    void shouldDeleteUserReportsAndFrozenEvidence() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("r.reported_user_id = p_user_id")
                .contains("report_id IN (SELECT id FROM tmp_spacetime_delete_reports)")
                .contains("source_biz_no COLLATE utf8mb4_unicode_ci IN")
                .contains("conversation_no COLLATE utf8mb4_unicode_ci IN");
    }

    @Test
    @DisplayName("106 迁移发现关键消息残留时应抛错回滚")
    void shouldRollbackWhenMessageResidueRemains() throws IOException {
        String sql = readProjectFile(MIGRATION);
        String residueCheck = sql.substring(
                sql.indexOf("SET v_remaining_count ="),
                sql.indexOf("IF v_remaining_count <> 0 THEN"));

        assertThat(sql)
                .contains("DECLARE v_remaining_count BIGINT DEFAULT 0")
                .contains("SET v_remaining_count =")
                .contains("SELECT COUNT(*) FROM app_message_record")
                .contains("SELECT COUNT(*) FROM app_message_conversation")
                .contains("SELECT COUNT(*) FROM app_message_whisper")
                .contains("SELECT COUNT(*) FROM app_message_delivery_outbox")
                .contains("SELECT COUNT(*) FROM community_report_evidence")
                .contains("IF v_remaining_count <> 0 THEN")
                .contains("SET MESSAGE_TEXT = '用户关联数据仍有残留，已停止删除'");
        assertThat(residueCheck)
                .contains("aggregate_id IN (SELECT id FROM tmp_spacetime_delete_messages)")
                .contains("aggregate_id IN (SELECT id FROM tmp_spacetime_delete_whispers)")
                .contains("biz_no COLLATE utf8mb4_unicode_ci IN")
                .contains("report_id IN (SELECT id FROM tmp_spacetime_delete_reports)")
                .contains("source_biz_no COLLATE utf8mb4_unicode_ci IN")
                .contains("conversation_no COLLATE utf8mb4_unicode_ci IN")
                .contains("UPPER(target_type) = 'USER'")
                .contains("CAST(p_user_id AS CHAR)");
    }

    @Test
    @DisplayName("最终残留校验的单条 SQL 不得重复打开同一临时范围表")
    void shouldNotReopenTemporaryScopeInSingleStatement() throws IOException {
        String sql = readProjectFile(MIGRATION);
        String residueCheck = sql.substring(
                sql.indexOf("SET v_remaining_count ="),
                sql.indexOf("IF v_remaining_count <> 0 THEN"));
        List<String> temporaryScopes = List.of(
                "tmp_spacetime_delete_messages",
                "tmp_spacetime_delete_whispers",
                "tmp_spacetime_delete_conversations",
                "tmp_spacetime_delete_reports");

        for (String statement : residueCheck.split(";")) {
            for (String temporaryScope : temporaryScopes) {
                assertThat(countOccurrences(statement, temporaryScope))
                        .as("单条 SQL 重复读取临时表 %s，MySQL 会报 1137 Can't reopen table", temporaryScope)
                        .isLessThanOrEqualTo(1);
            }
        }
    }

    @Test
    @DisplayName("支付回调与订单号比较应显式统一排序规则")
    void shouldUseExplicitCollationWhenMatchingPaymentOrderNumber() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("DELETE payment_log")
                .contains("FROM app_payment_notify_log payment_log")
                .contains("JOIN app_trade_order trade_order")
                .contains("payment_log.order_no COLLATE utf8mb4_unicode_ci")
                .contains("trade_order.order_no COLLATE utf8mb4_unicode_ci")
                .doesNotContain("WHERE order_no IN (\n         SELECT order_no FROM app_trade_order");
    }

    private long countOccurrences(String source, String target) {
        long count = 0;
        int start = 0;
        while ((start = source.indexOf(target, start)) >= 0) {
            count++;
            start += target.length();
        }
        return count;
    }

    /**
     * 从仓库根目录读取迁移文件。
     *
     * @param relativePath 仓库相对路径
     * @return 统一换行后的文件内容
     * @throws IOException 文件不存在或读取失败
     */
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
