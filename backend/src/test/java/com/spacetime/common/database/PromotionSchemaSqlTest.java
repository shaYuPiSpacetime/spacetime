package com.spacetime.common.database;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PRD-07 新装数据库脚本契约测试。
 */
class PromotionSchemaSqlTest {

    @Test
    void schema包含新版事实表和关键唯一约束() throws IOException {
        String sql = readSchema();
        assertThat(sql)
                .contains("promotion_rule_current")
                .contains("promotion_rule_event")
                .contains("promotion_event_inbox")
                .contains("promotion_invite_counter")
                .contains("promotion_export_task")
                .contains("uk_invitee_id (invitee_id)")
                .contains("uk_reward_idempotency (idempotency_key)")
                .contains("uk_agent_month (agent_id, settlement_month)")
                .contains("biz_idempotency_key");
    }

    @Test
    void schema不再定义旧运行态字段和菜单() throws IOException {
        String sql = readSchema();
        assertThat(sql)
                .doesNotContain("frozen_before_status")
                .doesNotContain("invalid_reason")
                .doesNotContain("risk_reason")
                .doesNotContain("paid_amount")
                .doesNotContain("paid_time")
                .doesNotContain("PromotionMaterial")
                .doesNotContain("/promotion/material")
                .doesNotContain("/promotion/invite-reward/frozen");
    }

    @Test
    void schema幂等升级并包含敏感字段权限和超管授权() throws IOException {
        String sql = readSchema();
        assertThat(sql)
                .contains("information_schema.columns")
                .contains("information_schema.statistics")
                .contains("promotion:agent:sensitive")
                .contains("role.role_code = 'super_admin'")
                .doesNotContain("add column if not exists");
    }

    @Test
    void migration为单文件自包含且明确旧代理迁移边界() throws IOException {
        String sql = Files.readString(
                Path.of("docs/sql/migration-20260727-prd07-promotion-rewrite.sql"),
                StandardCharsets.UTF_8).toLowerCase();
        assertThat(sql)
                .contains("create table if not exists promotion_rule_current")
                .contains("create table if not exists promotion_event_inbox")
                .contains("create table if not exists promotion_export_task")
                .contains("promotion_agent_legacy_20260727")
                .contains("promotion_agent_qr_code_legacy_20260727")
                .contains("promotion:agent:sensitive")
                .contains("role.role_code = 'super_admin'")
                .doesNotContain("执行同目录 schema-promotion.sql")
                .doesNotContain("source schema-promotion.sql");
    }

    private String readSchema() throws IOException {
        return Files.readString(Path.of("docs/sql/schema-promotion.sql"), StandardCharsets.UTF_8)
                .toLowerCase();
    }
}
