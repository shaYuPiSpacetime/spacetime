package com.spacetime.common.database;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

/** 评论人工兜底迁移只补配置缺口，不能覆写运营或业务数据。 */
class CommunityCommentManualFallbackMigrationTest {

    @Test
    void migration_shouldOnlyInsertMissingCommentQueueDictionaryAndCopy() throws Exception {
        Path migration = Path.of("../deploy/sql/prod/113_community_comment_manual_fallback.sql");
        String sql = Files.readString(migration);

        assertThat(sql).contains("'community_comment_status'", "'pending'", "'待人工审核'",
                "'community.copy.comment_pending'", "'评论已提交，等待人工审核'");
        assertThat(sql.split("WHERE NOT EXISTS", -1)).hasSize(3);
        assertThat(sql.toUpperCase(Locale.ROOT)).doesNotContain("UPDATE ", "DELETE ", "REPLACE ",
                "DROP ", "TRUNCATE ", "INSERT INTO COMMUNITY_COMMENT", "INSERT INTO APP_USER");
    }
}
