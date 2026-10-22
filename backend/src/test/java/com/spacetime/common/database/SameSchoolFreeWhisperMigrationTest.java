package com.spacetime.common.database;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** 同校免费悄悄话增量迁移与生产发布清单契约。 */
class SameSchoolFreeWhisperMigrationTest {

    @Test
    void migrationAddsCanonicalSchoolAndWhisperSnapshotWithoutTouchingAssets() throws Exception {
        String sql = Files.readString(
                Path.of("../deploy/sql/prod/114_same_school_free_whisper.sql"),
                StandardCharsets.UTF_8);

        assertThat(sql)
                .contains("canonical_school_code", "school_code_snapshot")
                .contains("information_schema.COLUMNS")
                .contains("UPDATE school_dictionary")
                .doesNotContain("UPDATE user_asset", "INSERT INTO user_coin_log",
                        "DELETE FROM app_message_whisper");
    }

    @Test
    void productionWorkflowUploadsAndExecutesMigration() throws Exception {
        String workflow = Files.readString(
                Path.of("../.github/workflows/deploy-backend-prod.yml"),
                StandardCharsets.UTF_8);
        assertThat(countOccurrences(workflow,
                "deploy/sql/prod/114_same_school_free_whisper.sql")).isEqualTo(2);
    }

    private int countOccurrences(String source, String target) {
        int count = 0;
        for (int cursor = 0; (cursor = source.indexOf(target, cursor)) >= 0;
             cursor += target.length()) {
            count++;
        }
        return count;
    }
}
