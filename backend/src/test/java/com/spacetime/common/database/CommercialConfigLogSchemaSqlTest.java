package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** 商业化配置日志查询索引数据库契约。 */
@DisplayName("商业化配置日志数据库脚本")
class CommercialConfigLogSchemaSqlTest {

    private static final String BASE_SCHEMA = "deploy/sql/prod/020_business_tables.sql";
    private static final String COMMERCIAL_SCHEMA = "backend/docs/sql/schema-commercial.sql";
    private static final String COMMERCIAL_MIGRATION = "backend/docs/sql/migration-prd04-commercial.sql";
    private static final String QUERY_INDEX_MIGRATION =
            "deploy/sql/prod/083_commercial_config_log_query_index.sql";
    private static final String BACKEND_DEPLOY_WORKFLOW =
            ".github/workflows/deploy-backend-prod.yml";

    @Test
    @DisplayName("配置日志倒序分页应具备覆盖逻辑删除条件与排序字段的生产索引")
    void configLogQueryShouldHaveProductionIndex() throws IOException {
        String expectedIndex =
                "INDEX `idx_commercial_log_deleted_time_id` (`deleted`, `create_time` DESC, `id` DESC)";

        assertThat(readProjectFile(BASE_SCHEMA)).contains(expectedIndex);
        assertThat(readProjectFile(COMMERCIAL_SCHEMA)).contains(expectedIndex);
        assertThat(readProjectFile(COMMERCIAL_MIGRATION)).contains(expectedIndex);

        Path migrationPath = resolveProjectFile(QUERY_INDEX_MIGRATION);
        assertThat(migrationPath).as("应提供配置日志查询索引升级脚本").exists();
        String migration = Files.readString(migrationPath, StandardCharsets.UTF_8);
        assertThat(migration)
                .contains("information_schema.STATISTICS")
                .contains("ADD INDEX `idx_commercial_log_deleted_time_id` "
                        + "(`deleted`, `create_time` DESC, `id` DESC)");

        assertThat(readProjectFile(BACKEND_DEPLOY_WORKFLOW))
                .contains(QUERY_INDEX_MIGRATION);
    }

    private static String readProjectFile(String relativePath) throws IOException {
        return Files.readString(resolveProjectFile(relativePath), StandardCharsets.UTF_8);
    }

    private static Path resolveProjectFile(String relativePath) {
        Path current = Path.of("").toAbsolutePath();
        while (current != null) {
            Path candidate = current.resolve(relativePath);
            if (Files.exists(candidate)) {
                return candidate;
            }
            current = current.getParent();
        }
        return Path.of(relativePath).toAbsolutePath();
    }
}
