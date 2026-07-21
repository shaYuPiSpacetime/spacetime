package com.spacetime.common.dao;

import com.spacetime.common.dto.RelationVisitStats;
import com.spacetime.common.entity.AppRelationVisitEvent;

import java.time.LocalDateTime;

/** 访客实际事件数据访问接口。 */
public interface AppRelationVisitEventDao extends RelationCrudDao<AppRelationVisitEvent> {
    /** 精确统计指定用户自起始时间以来的访客 UV/PV。 */
    RelationVisitStats countTargetStats(Long targetUserId, LocalDateTime startTime);
}
