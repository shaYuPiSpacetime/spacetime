package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** 关系反馈实体与数据库字段映射契约测试。 */
@DisplayName("关系反馈实体映射")
class RelationEntityContractTest {

    @Test
    @DisplayName("七张关系表实体应继承BaseEntity并映射确认字段")
    void relationEntitiesShouldMapConfirmedTablesAndFields() {
        assertEntity(AppRelationLike.class, "app_relation_like",
                "likeNo", "requestId", "fromUserId", "toUserId", "sourceScene", "likeStatus",
                "activeMarker", "likedTime", "cancelledTime", "invalidReason", "invalidTime");
        assertEntity(AppRelationVisit.class, "app_relation_visit",
                "visitNo", "visitorUserId", "targetUserId", "sourceScene", "visitStatus",
                "firstVisitTime", "lastVisitTime", "pvCount", "invalidReason", "invalidTime");
        assertEntity(AppRelationVisitEvent.class, "app_relation_visit_event",
                "eventNo", "visitId", "visitorUserId", "targetUserId", "sourceScene", "visitTime");
        assertEntity(AppRelationVisitCursor.class, "app_relation_visit_cursor",
                "visitorUserId", "targetUserId", "currentVisitId", "lastVisitTime");
        assertEntity(AppRelationMatch.class, "app_relation_match",
                "matchNo", "userLowId", "userHighId", "primarySource", "matchStatus",
                "activeMarker", "matchedTime", "invalidReason", "invalidTime");
        assertEntity(AppRelationMatchSource.class, "app_relation_match_source",
                "sourceNo", "matchId", "sourceType", "sourceEventNo", "sourceStatus",
                "effectiveTime", "revokedTime", "invalidReason");
        assertEntity(AppRelationMatchPopup.class, "app_relation_match_popup",
                "matchId", "matchNo", "userId", "popupStatus", "deliveredTime", "readTime",
                "readAction", "cancelledTime");
    }

    @Test
    @DisplayName("用户和解锁实体应包含确认过的增量字段")
    void existingEntitiesShouldExposeRelationDeltaFields() {
        assertFields(AppUser.class, "anonymousNo");
        assertFields(UserUnlockRecord.class, "unlockNo", "targetBizType", "targetBizNo", "refundNo", "activeMarker");
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
