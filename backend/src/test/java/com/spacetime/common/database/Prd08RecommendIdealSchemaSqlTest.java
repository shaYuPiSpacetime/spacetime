package com.spacetime.common.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** PRD-08 推荐与理想型数据库迁移契约。 */
@DisplayName("PRD-08 推荐与理想型数据库迁移")
class Prd08RecommendIdealSchemaSqlTest {

    private static final String MIGRATION = "deploy/sql/prod/065_prd08_recommend_ideal_closure.sql";
    private static final List<String> TABLES = List.of(
            "ct_recommend_preference",
            "ct_ideal_filter_snapshot",
            "ct_ideal_snapshot_candidate",
            "ct_recommend_view_log");

    @Test
    @DisplayName("065 迁移应创建四张事实表并包含中文字段注释")
    void migrationShouldCreateFourCommentedFactTables() throws IOException {
        String sql = readProjectFile(MIGRATION);

        for (String table : TABLES) {
            assertThat(sql).contains("CREATE TABLE IF NOT EXISTS `" + table + "`");
            assertEveryColumnHasChineseComment(sql, table);
        }
    }

    @Test
    @DisplayName("065 迁移应包含幂等、快照、游标和解锁来源约束")
    void migrationShouldContainConfirmedKeysAndUnlockTrace() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("uk_recommend_preference_user")
                .contains("uk_ideal_snapshot_no")
                .contains("uk_ideal_snapshot_user_request")
                .contains("uk_ideal_candidate_snapshot_user")
                .contains("uk_ideal_candidate_item_no")
                .contains("idx_ideal_candidate_cursor")
                .contains("uk_recommend_view_request_action")
                .contains("idx_recommend_replay")
                .contains("snapshot_no")
                .contains("snapshot_item_no")
                .contains("information_schema.columns")
                .doesNotContain("DROP TABLE", "TRUNCATE TABLE");
    }

    @Test
    @DisplayName("065 迁移应初始化批量折扣并保留运维校验查询")
    void migrationShouldSeedDiscountAndVerificationQueries() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("commercial.ideal.batch.discount.percent")
                .contains("'10'")
                .contains("理想型批量解锁优惠比例")
                .contains("information_schema.tables")
                .contains("information_schema.statistics")
                .contains("SELECT");
    }

    @Test
    @DisplayName("065 迁移应初始化周边城市动态关系配置且不得猜测邻接城市")
    void migrationShouldSeedEmptyNeighborCityMapping() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("prd08.recommend.neighbor-city-map")
                .contains("周边城市邻接关系")
                .contains("'{}'");
    }

    @Test
    @DisplayName("065 迁移应移除阻断批量解锁的请求级唯一索引")
    void migrationShouldAllowOneRequestToWriteMultipleUnlockItems() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("uk_unlock_user_request")
                .contains("DROP INDEX uk_unlock_user_request")
                .contains("uk_user_request_target");
    }

    @Test
    @DisplayName("065 迁移应把理想型解锁唯一身份收敛为目标用户")
    void migrationShouldDeduplicateIdealUnlockByTargetUser() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("target_biz_no=CAST(target_user_id AS CHAR)")
                .contains("uk_unlock_active_target")
                .contains("unlock_scene='ideal_user_unlock'")
                .contains("active_marker=NULL");
    }

    @Test
    @DisplayName("065 迁移应补充见面偏好资料字段、动态字典和多选上限")
    void migrationShouldAddMeetingPreferenceContract() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("meeting_preference")
                .contains("preferred_activities")
                .contains("information_schema.columns")
                .contains("'meeting_preference'")
                .contains("'preferred_activity'")
                .contains("prd01.profile.preferredActivities.maxCount");
    }

    @Test
    @DisplayName("065 迁移应初始化理想型帮助中心动态正文")
    void migrationShouldSeedDynamicIdealHelpCopy() throws IOException {
        String sql = readProjectFile(MIGRATION);

        assertThat(sql)
                .contains("content.ideal.help.intro")
                .contains("content.ideal.help.result")
                .contains("content.ideal.help.unlock")
                .contains("理想型帮助中心");
    }

    private void assertEveryColumnHasChineseComment(String sql, String table) {
        int start = sql.indexOf("CREATE TABLE IF NOT EXISTS `" + table + "`");
        int end = sql.indexOf(") ENGINE=", start);
        assertThat(start).as("应存在表 %s", table).isGreaterThanOrEqualTo(0);
        assertThat(end).as("表 %s 应有完整建表语句", table).isGreaterThan(start);
        List<String> columns = sql.substring(start, end).lines()
                .map(String::trim)
                .filter(line -> line.startsWith("`"))
                .toList();
        assertThat(columns).as("表 %s 应包含字段", table).isNotEmpty();
        assertThat(columns).as("表 %s 的每个字段都必须写中文注释", table)
                .allSatisfy(line -> assertThat(line)
                        .contains(" COMMENT '")
                        .containsPattern("COMMENT '[^']*[\\u4e00-\\u9fa5][^']*'"));
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
