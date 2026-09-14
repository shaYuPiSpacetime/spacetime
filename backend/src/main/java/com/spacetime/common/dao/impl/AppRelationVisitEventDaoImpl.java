package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.AppRelationVisitEventDao;
import com.spacetime.common.dto.RelationVisitStats;
import com.spacetime.common.entity.AppRelationVisitEvent;
import com.spacetime.common.mapper.AppRelationVisitEventMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/** 访客实际事件数据访问实现。 */
@Repository
public class AppRelationVisitEventDaoImpl extends AbstractRelationCrudDao<AppRelationVisitEvent> implements AppRelationVisitEventDao {
    /** 访客事件 Mapper。 */
    private final AppRelationVisitEventMapper visitEventMapper;

    public AppRelationVisitEventDaoImpl(AppRelationVisitEventMapper mapper) {
        super(mapper);
        this.visitEventMapper = mapper;
    }

    @Override
    public AppRelationVisitEvent selectLatestTargetVisitAtOrBefore(Long targetUserId, LocalDateTime requestTime) {
        return visitEventMapper.selectLatestTargetVisitAtOrBefore(targetUserId, requestTime);
    }

    @Override
    public Long countDistinctTargetVisitorsBetween(Long targetUserId,
                                                   LocalDateTime dayStart,
                                                   LocalDateTime dayEnd,
                                                   LocalDateTime lowerTime,
                                                   Long lowerId,
                                                   LocalDateTime upperTime,
                                                   Long upperId) {
        return visitEventMapper.countDistinctTargetVisitorsBetween(
                targetUserId, dayStart, dayEnd, lowerTime, lowerId, upperTime, upperId);
    }

    @Override
    public RelationVisitStats countTargetStats(Long targetUserId, LocalDateTime startTime) {
        return visitEventMapper.countTargetStats(targetUserId, startTime);
    }

    @Override
    public RelationVisitStats countTargetStatsAtSnapshot(Long targetUserId,
                                                         LocalDateTime startTime,
                                                         LocalDateTime requestTime,
                                                         LocalDateTime upperVisitTime,
                                                         Long upperVisitEventId) {
        return visitEventMapper.countTargetStatsAtSnapshot(
                targetUserId, startTime, requestTime, upperVisitTime, upperVisitEventId);
    }

    @Override
    public Long countDistinctVisitorsSince(LocalDateTime startTime) {
        return visitEventMapper.countDistinctVisitorsSince(startTime);
    }
}
