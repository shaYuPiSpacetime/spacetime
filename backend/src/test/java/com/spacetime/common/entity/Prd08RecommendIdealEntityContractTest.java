package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** PRD-08 推荐与理想型实体映射契约。 */
@DisplayName("PRD-08 推荐与理想型实体映射")
class Prd08RecommendIdealEntityContractTest {

    @Test
    @DisplayName("四张事实表实体应继承 BaseEntity 并映射确认字段")
    void entitiesShouldMapConfirmedTablesAndFields() {
        assertEntity(RecommendPreference.class, "ct_recommend_preference",
                "userId", "targetCityCodes", "allowNeighborCity", "minAge", "maxAge",
                "minHeight", "maxHeight", "minWeight", "maxWeight", "educationCodes",
                "hometowns", "schoolCodes", "majorNames", "version");
        assertEntity(IdealFilterSnapshot.class, "ct_ideal_filter_snapshot",
                "snapshotNo", "userId", "requestId", "conditionDigest", "preferenceVersion",
                "targetCityCodes", "minAge", "maxAge", "conditionCodes", "conditionPayload",
                "resultCount", "status", "expiresAt");
        assertEntity(IdealSnapshotCandidate.class, "ct_ideal_snapshot_candidate",
                "snapshotId", "itemNo", "candidateUserId", "sortTime", "sortTieBreaker",
                "matchedConditionCodes");
        assertEntity(RecommendViewLog.class, "ct_recommend_view_log",
                "eventNo", "requestId", "userId", "candidateUserId", "scene", "filterVersion",
                "snapshotNo", "action", "position", "viewedAt");
    }

    @Test
    @DisplayName("解锁记录应包含理想型快照来源字段")
    void unlockRecordShouldExposeIdealSnapshotTrace() {
        assertFields(UserUnlockRecord.class, "snapshotNo", "snapshotItemNo");
    }

    @Test
    @DisplayName("用户资料应保存字典化见面偏好和活动编码列表")
    void appUserShouldExposeMeetingPreferenceFields() {
        assertFields(AppUser.class, "meetingPreference", "preferredActivities");
    }

    private void assertEntity(Class<?> type, String tableName, String... fields) {
        assertThat(BaseEntity.class.isAssignableFrom(type)).isTrue();
        assertThat(type.getAnnotation(TableName.class)).isNotNull();
        assertThat(type.getAnnotation(TableName.class).value()).isEqualTo(tableName);
        assertFields(type, fields);
    }

    private void assertFields(Class<?> type, String... expected) {
        Set<String> fields = Arrays.stream(type.getDeclaredFields())
                .map(java.lang.reflect.Field::getName)
                .collect(Collectors.toSet());
        assertThat(fields).contains(expected);
    }
}
