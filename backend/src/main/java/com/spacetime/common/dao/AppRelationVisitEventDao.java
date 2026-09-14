package com.spacetime.common.dao;

import com.spacetime.common.dto.RelationVisitStats;
import com.spacetime.common.entity.AppRelationVisitEvent;

import java.time.LocalDateTime;

/** 访客实际事件数据访问接口。 */
public interface AppRelationVisitEventDao extends RelationCrudDao<AppRelationVisitEvent> {
    /** 查询请求时刻以前，被访问用户最新一条实际访问事件。 */
    AppRelationVisitEvent selectLatestTargetVisitAtOrBefore(Long targetUserId, LocalDateTime requestTime);

    /** 统计自然日内、读取游标之后、响应快照之前的新访客 UV。 */
    Long countDistinctTargetVisitorsBetween(Long targetUserId,
                                            LocalDateTime dayStart,
                                            LocalDateTime dayEnd,
                                            LocalDateTime lowerTime,
                                            Long lowerId,
                                            LocalDateTime upperTime,
                                            Long upperId);

    /** 精确统计指定用户自起始时间以来的访客 UV/PV。 */
    RelationVisitStats countTargetStats(Long targetUserId, LocalDateTime startTime);

    /** 按请求时刻与事件元组上界统计固定快照内的访客 UV/PV。 */
    RelationVisitStats countTargetStatsAtSnapshot(Long targetUserId,
                                                  LocalDateTime startTime,
                                                  LocalDateTime requestTime,
                                                  LocalDateTime upperVisitTime,
                                                  Long upperVisitEventId);

    /** 统计指定时间以来全站去重访客数。 */
    Long countDistinctVisitorsSince(LocalDateTime startTime);
}
