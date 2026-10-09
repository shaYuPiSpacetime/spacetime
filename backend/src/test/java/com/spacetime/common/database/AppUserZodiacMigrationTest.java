package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** 用户历史星座修复迁移契约。 */
@DisplayName("用户历史星座修复迁移")
class AppUserZodiacMigrationTest {

    private static final String MIGRATION = "deploy/sql/prod/107_repair_app_user_zodiac.sql";

    @Test
    @DisplayName("生产发布工作流应上传并执行 107 迁移")
    void shouldDeployMigrationInProductionWorkflow() throws IOException {
        String workflow = readProjectFile(".github/workflows/deploy-backend-prod.yml");
        long mentions = workflow.lines().filter(line -> line.contains(MIGRATION)).count();

        assertThat(mentions).isEqualTo(2L);
    }

    @Test
    @DisplayName("迁移只修复有生日且未删除的用户")
    void shouldRepairActiveUsersFromBirthday() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("CREATE TABLE IF NOT EXISTS app_user_zodiac_backup_20261009")
                .contains("INSERT IGNORE INTO app_user_zodiac_backup_20261009")
                .contains("UPDATE app_user")
                .contains("MONTH(birthday)", "DAY(birthday)")
                .contains("THEN '双子座'")
                .contains("WHERE birthday IS NOT NULL")
                .contains("AND deleted = 0")
                .contains("SELECT ROW_COUNT() AS repaired_user_count")
                .doesNotContain("DELETE FROM", "DROP TABLE");
    }

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
