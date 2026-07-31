package com.spacetime.prd06;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PRD-06 增量迁移契约测试。
 */
class Prd06SchemaContractTest {

    private static final Path MIGRATION = Path.of(
            "docs/sql/migration-20260717-prd06-admin-miniapp-closure.sql");
    private static final Path INVITE_RULES_PROD_MIGRATION = Path.of(
            "../deploy/sql/prod/057_invite_rules_h5_dynamic_content.sql");

    @Test
    void migrationMustContainClosedLoopSchemaAndDemoMenus() throws Exception {
        assertThat(MIGRATION).exists();
        String sql = Files.readString(MIGRATION);

        assertThat(sql)
                .contains("content_code")
                .contains("version")
                .contains("preinitialized")
                .contains("request_no")
                .contains("risk_snapshot")
                .contains("execution_log")
                .contains("app_user_cancel_remark")
                .contains("app_user_search_summary");

        assertThat(sql)
                .contains("'内容管理配置'")
                .contains("'公告与协议'")
                .contains("'搜索屏蔽词'")
                .contains("'用户安全设置'")
                .contains("'注销申请'");
    }

    @Test
    void migrationMustHideDeletedScopeAndSeedRequiredContent() throws Exception {
        assertThat(MIGRATION).exists();
        String sql = Files.readString(MIGRATION);

        assertThat(sql)
                .contains("user_agreement")
                .contains("privacy_policy")
                .contains("privacy_summary")
                .contains("single_commitment")
                .contains("third_party_list")
                .contains("personal_info_list")
                .contains("platform_rule")
                .contains("announcement")
                .contains("invite_rules")
                .contains("'邀请规则'")
                .contains("help");

        assertThat(sql)
                .contains("搜索热词")
                .contains("反馈箱")
                .contains("visible = 0");
    }

    @Test
    void productionMigrationMustSeedDynamicInviteRulesH5AndChineseDictionary() throws Exception {
        assertThat(INVITE_RULES_PROD_MIGRATION).exists();
        String sql = Files.readString(INVITE_RULES_PROD_MIGRATION);

        assertThat(sql)
                .contains("invite_rules")
                .contains("https://admin.shikongxiehou.com/h5/invite-rules/index.html")
                .contains("content_body = NULL")
                .contains("'邀请规则'")
                .contains("'compliance_content_type'");
    }
}
