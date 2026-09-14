package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** 动态作者禁言增量脚本静态契约测试。 */
@DisplayName("动态作者禁言生产迁移")
class CommunityPostMuteMigrationTest {

    @Test
    @DisplayName("迁移应补齐动态禁言动作、独立风控权限及超级管理员授权")
    void migrationShouldSeedPostMuteActionAndRiskPermission() throws IOException {
        Path migration = projectPath("deploy/sql/prod/090_community_post_mute_action.sql");
        assertThat(migration).exists();
        String sql = Files.readString(migration, StandardCharsets.UTF_8);

        assertThat(sql)
                .contains("community_post_action")
                .contains("mute_user")
                .contains("禁言用户")
                .contains("community:post:risk")
                .contains("community:content:list", "community:moments:list")
                .contains("role_code = 'super_admin'")
                .contains("NOT EXISTS")
                .doesNotContain("1581", "1583", "(1601", "(1602", "DELETE FROM", "DROP TABLE");
    }

    private Path projectPath(String relativePath) {
        Path current = Path.of("").toAbsolutePath();
        for (int i = 0; i < 4 && current != null; i++, current = current.getParent()) {
            Path candidate = current.resolve(relativePath);
            if (Files.exists(current.resolve("backend/pom.xml"))) {
                return candidate;
            }
        }
        return Path.of(relativePath).toAbsolutePath();
    }
}
