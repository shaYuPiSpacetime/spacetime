package com.spacetime.common.dao;

import com.spacetime.common.dto.RelationVisitStats;
import com.spacetime.common.entity.AppRelationVisitEvent;

import java.time.LocalDateTime;

/** 访客实际事件数据访问接口。 */
public interface AppRelationVisitEventDao extends RelationCrudDao<AppRelationVisitEvent> {
    /** 精确统计指定用户自起始时间以来的访客 UV/PV。 */
    RelationVisitStats countTargetStats(Long targetUserId, LocalDateTime startTime);

    /** 统计指定时间以来全站去重访客数。 */
    Long countDistinctVisitorsSince(LocalDateTime startTime);
}
