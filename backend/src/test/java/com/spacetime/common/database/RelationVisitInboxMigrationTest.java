package com.spacetime.common.database;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** 最近访客已读游标增量迁移与发布契约。 */
class RelationVisitInboxMigrationTest {

    @Test
    void migrationDefinesPairedCursorConstraintAndSnapshotIndex() throws IOException {
        String migration = readProjectFile("deploy/sql/prod/088_relation_visit_inbox_state.sql");

        assertThat(migration)
                .contains("chk_visit_inbox_cursor_pair")
                .contains("`last_read_visit_time` IS NULL AND `last_read_visit_event_id` IS NULL")
                .contains("`last_read_visit_time` IS NOT NULL AND `last_read_visit_event_id` IS NOT NULL")
                .contains("idx_visit_event_target_deleted_time_id_visitor")
                .contains("target_user_id", "deleted", "visit_time", "id", "visitor_user_id");
    }

    @Test
    void followUpMigrationRebuildsHardDeleteProcedureWithVisitInboxCleanup() throws IOException {
        Path migrationPath = projectFile("deploy/sql/prod/089_relation_visit_inbox_hard_delete.sql");
        assertThat(migrationPath).as("必须提供独立的 089 存储过程升级迁移").exists();
        String migration = Files.readString(migrationPath, StandardCharsets.UTF_8);

        assertThat(migration)
                .contains("DROP PROCEDURE IF EXISTS spacetime_delete_app_user_data")
                .contains("CREATE PROCEDURE spacetime_delete_app_user_data")
                .contains("DELETE FROM app_relation_visit_inbox_state WHERE user_id = p_user_id")
                .contains("DELETE FROM app_user WHERE id = p_user_id AND deleted = 0");
        assertThat(migration.indexOf("DELETE FROM app_relation_visit_inbox_state"))
                .isLessThan(migration.indexOf("DELETE FROM app_user WHERE"));
    }

    @Test
    void productionWorkflowUploadsAndExecutesAllNewMigrations() throws IOException {
        String workflow = readProjectFile(".github/workflows/deploy-backend-prod.yml");

        for (int number = 87; number <= 90; number++) {
            String prefix = String.format("deploy/sql/prod/%03d_", number);
            assertThat(countOccurrences(workflow, prefix))
                    .as("迁移 %03d 应同时出现在上传清单和执行清单", number)
                    .isEqualTo(2);
        }
    }

    @Test
    void visitQueriesUseStableEventTupleAndHalfOpenDayBoundary() throws IOException {
        String visitMapper = readProjectFile(
                "backend/src/main/java/com/spacetime/common/mapper/AppRelationVisitMapper.java");
        String eventMapper = readProjectFile(
                "backend/src/main/java/com/spacetime/common/mapper/AppRelationVisitEventMapper.java");

        assertThat(visitMapper)
                .contains("upperVisitTime", "upperVisitEventId")
                .contains("e.visit_time < #{upperVisitTime}")
                .contains("e.visit_time = #{upperVisitTime} AND e.id <= #{upperVisitEventId}");
        assertThat(eventMapper)
                .contains("selectLatestTargetVisitAtOrBefore")
                .contains("visit_time <= #{requestTime}")
                .contains("countTargetStatsAtSnapshot")
                .contains("upperVisitEventId")
                .contains("dayEnd")
                .contains("visit_time &lt; #{dayEnd}");
    }

    private int countOccurrences(String source, String target) {
        int count = 0;
        for (int cursor = 0; (cursor = source.indexOf(target, cursor)) >= 0; cursor += target.length()) {
            count++;
        }
        return count;
    }

    private String readProjectFile(String relativePath) throws IOException {
        Path path = projectFile(relativePath);
        if (Files.exists(path)) {
            return Files.readString(path, StandardCharsets.UTF_8);
        }
        throw new IOException("项目文件不存在: " + relativePath);
    }

    private Path projectFile(String relativePath) {
        Path current = Path.of("").toAbsolutePath();
        for (int i = 0; i < 4 && current != null; i++, current = current.getParent()) {
            Path candidate = current.resolve(relativePath);
            if (Files.exists(candidate)) {
                return candidate;
            }
        }
        return Path.of("").toAbsolutePath().resolve(relativePath);
    }
}
