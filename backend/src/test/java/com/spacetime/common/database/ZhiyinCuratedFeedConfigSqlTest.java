package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** 知音精选动态私有配置生产迁移契约。 */
@DisplayName("知音精选动态配置数据库脚本")
class ZhiyinCuratedFeedConfigSqlTest {

    private static final String MIGRATION = "deploy/sql/prod/084_zhiyin_curated_feed_config.sql";
    private static final String WORKFLOW = ".github/workflows/deploy-backend-prod.yml";

    @Test
    @DisplayName("心灵搭子手机号必须以私有配置进入幂等生产迁移")
    void soulmatePhonesShouldBePrivateAndDeployable() throws IOException {
        Path migrationPath = resolveProjectFile(MIGRATION);
        assertThat(migrationPath).exists();
        String migration = Files.readString(migrationPath, StandardCharsets.UTF_8);

        assertThat(migration)
                .contains("community.soulmate_source_phones")
                .contains("'COMMUNITY_PRIVATE'")
                .contains("'JSON'")
                .contains("0,'ENABLED'")
                .contains("ON DUPLICATE KEY UPDATE");
        assertThat(Files.readString(resolveProjectFile(WORKFLOW), StandardCharsets.UTF_8))
                .contains(MIGRATION);
    }

    private static Path resolveProjectFile(String relativePath) {
        Path current = Path.of("").toAbsolutePath();
        while (current != null) {
            Path candidate = current.resolve(relativePath);
            if (Files.exists(candidate)) return candidate;
            current = current.getParent();
        }
        return Path.of(relativePath).toAbsolutePath();
    }
}
