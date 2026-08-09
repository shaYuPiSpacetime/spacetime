package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 生产数据库字符集与排序规则迁移契约。 */
@DisplayName("生产数据库排序规则统一迁移")
class DatabaseCollationSchemaSqlTest {

    private static final String MIGRATION = "deploy/sql/prod/069_database_utf8mb4_unicode_ci.sql";
    private static final String ROLLBACK = "deploy/sql/ops/rollback-069-database-utf8mb4-unicode-ci.sql";

    @Test
    @DisplayName("069 应把数据库、基础表和字符列统一为 utf8mb4_unicode_ci")
    void migrationShouldNormalizeDatabaseAndAllBaseTables() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                .contains("TABLE_TYPE = 'BASE TABLE'")
                .contains("COLLATION_NAME <> 'utf8mb4_unicode_ci'")
                .contains("CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                .doesNotContain("utf8mb4_0900_ai_ci")
                .doesNotContain("PREPARE normalize_database_stmt");
    }

    @Test
    @DisplayName("069 应可重复执行并恢复调用前的外键检查状态")
    void migrationShouldBeIdempotentAndRestoreForeignKeyChecks() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("DROP PROCEDURE IF EXISTS spacetime_normalize_database_collation")
                .contains("CREATE PROCEDURE spacetime_normalize_database_collation()")
                .contains("CALL spacetime_normalize_database_collation()")
                .contains("@previous_foreign_key_checks")
                .contains("SET FOREIGN_KEY_CHECKS = 0")
                .contains("SET FOREIGN_KEY_CHECKS = @previous_foreign_key_checks")
                .contains("DECLARE EXIT HANDLER FOR SQLEXCEPTION")
                .contains("RESIGNAL");
    }

    @Test
    @DisplayName("069 回滚应恢复迁移前 96 加 5 的表排序规则基线")
    void rollbackShouldRestorePreMigrationTableCollations() throws IOException {
        String sql = readProjectFile(ROLLBACK);
        List<String> unicodeBaselineTables = List.of(
                "app_whisper",
                "ct_ideal_filter_snapshot",
                "ct_ideal_snapshot_candidate",
                "ct_recommend_preference",
                "ct_recommend_view_log");

        assertThat(sql)
                .contains("'utf8mb4_0900_ai_ci'")
                .contains("'utf8mb4_unicode_ci'")
                .contains("` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', target_collation")
                .contains("ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                .doesNotContain("PREPARE rollback_database_stmt");
        assertThat(unicodeBaselineTables)
                .allSatisfy(table -> assertThat(sql)
                        .as("应恢复迁移前已使用 unicode 的表 %s", table)
                        .contains(table));
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
